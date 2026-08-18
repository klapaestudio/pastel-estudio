// Migra los datos reales de la v1 (Flask + SQLite en data/pastel.db, en la raíz del
// proyecto) al nuevo modelo Prisma. Se corre una sola vez. Usa node:sqlite (built-in,
// Node 22+) para no depender de compilar better-sqlite3 en Windows.
import path from "path";
import { DatabaseSync } from "node:sqlite";
import { prisma } from "../src/lib/prisma";

const LEGACY_DB_PATH = path.resolve(__dirname, "../../data/pastel.db");

function estadoPresupuesto(old: string | null): string {
  const map: Record<string, string> = {
    Borrador: "BORRADOR",
    Enviado: "ENVIADO",
    Aprobado: "APROBADO",
    Rechazado: "RECHAZADO",
  };
  return map[old || ""] || "BORRADOR";
}

function envioTipo(old: string | null): string {
  return (old || "").toUpperCase() === "DEFINITIVO" || (old || "").toUpperCase() === "DEFINIDO" ? "DEFINIDO" : "ESTIMATIVO";
}

async function main() {
  const db = new DatabaseSync(LEGACY_DB_PATH, { readOnly: true });
  console.log(`Leyendo base legacy en ${LEGACY_DB_PATH}`);

  const clients = db.prepare("SELECT * FROM clients").all() as any[];
  const presupuestos = db.prepare("SELECT * FROM presupuestos").all() as any[];
  const items = db.prepare("SELECT * FROM presupuesto_items").all() as any[];
  const lineas = db.prepare("SELECT * FROM producto_lineas").all() as any[];
  const variantes = db.prepare("SELECT * FROM producto_variantes").all() as any[];
  const stock = db.prepare("SELECT * FROM stock").all() as any[];
  const ingresos = db.prepare("SELECT * FROM finance_ingresos").all() as any[];
  const gastos = db.prepare("SELECT * FROM finance_gastos").all() as any[];
  const pagosProveedores = db.prepare("SELECT * FROM finance_pagos_proveedores").all() as any[];
  const retiros = db.prepare("SELECT * FROM finance_retiros").all() as any[];

  console.log(
    `Legacy: ${clients.length} clientes, ${presupuestos.length} presupuestos, ${lineas.length} líneas/${variantes.length} variantes, ${stock.length} stock, ${ingresos.length} ingresos, ${gastos.length} gastos, ${pagosProveedores.length} pagos a proveedores, ${retiros.length} retiros.`
  );

  // ── Clientes ──────────────────────────────────────────────────────────
  const contactoIdByLegacyClientId = new Map<number, string>();
  for (const c of clients) {
    const notasParts = [c.contacto ? `Contacto: ${c.contacto}` : null, c.email ? `Email: ${c.email}` : null, c.notas].filter(Boolean);
    const created = await prisma.contacto.create({
      data: {
        etapa: "CLIENTE",
        nombre: c.nombre,
        telefono: c.telefono,
        notas: notasParts.join(" — ") || null,
        origen: "WHATSAPP_INSTAGRAM",
        createdAt: new Date(c.created_at),
        // Etiqueta por defecto: el catálogo v1 era íntegramente de objetos a medida.
        etiquetas: { create: [{ tipoProducto: "PERSONALIZADO" }] },
      },
    });
    contactoIdByLegacyClientId.set(c.id, created.id);
  }

  // Contacto placeholder para movimientos financieros sin cliente asociado
  let consumidorFinalId: string | null = null;
  async function getConsumidorFinalId(): Promise<string> {
    if (consumidorFinalId) return consumidorFinalId;
    const c = await prisma.contacto.create({
      data: { etapa: "CLIENTE", nombre: "Consumidor final (migración)", origen: "TIENDA_NUBE" },
    });
    consumidorFinalId = c.id;
    return c.id;
  }

  // ── Productos estándar (a partir de líneas × variantes) ──────────────────
  const productoIdByLegacyVarianteId = new Map<number, string>();
  for (const linea of lineas) {
    const variantesDeLinea = variantes.filter((v) => v.linea_id === linea.id);
    for (const v of variantesDeLinea) {
      const material = await prisma.material.create({
        data: { nombre: `Tela ${v.nombre} (${linea.modelo})`, unidad: "m", costoActualizado: v.tela_precio_metro || 0 },
      });
      const producto = await prisma.productoEstandar.create({
        data: {
          nombre: `${linea.modelo} — ${v.nombre}`,
          medidas: linea.medidas,
          manoObraEstructura: linea.mano_obra_costo || 0,
          precioVenta: v.precio_final || 0,
          materiales: { create: [{ materialId: material.id, cantidad: linea.cantidad_tela || 0 }] },
        },
      });
      productoIdByLegacyVarianteId.set(v.id, producto.id);
    }
  }

  // ── Stock de productos terminados ─────────────────────────────────────
  for (const s of stock) {
    // Intenta matchear por nombre; si no matchea, crea una ficha de producto genérica.
    const match = variantes.find((v) => s.producto?.includes(v.nombre));
    let productoId = match ? productoIdByLegacyVarianteId.get(match.id) : undefined;
    if (!productoId) {
      const generico = await prisma.productoEstandar.create({ data: { nombre: s.producto || "Producto (migración)" } });
      productoId = generico.id;
    }
    await prisma.stockProducto.create({
      data: { productoEstandarId: productoId, cantidad: s.cantidad || 0, tela: s.tela, updatedAt: new Date(s.updated_at) },
    });
  }

  // ── Presupuestos + items ─────────────────────────────────────────────
  for (const p of presupuestos) {
    const contactoId = contactoIdByLegacyClientId.get(p.client_id);
    if (!contactoId) continue;
    const itemsDelPresupuesto = items.filter((i) => i.presupuesto_id === p.id);
    await prisma.presupuesto.create({
      data: {
        contactoId,
        tipo: "OBJETO_PERSONALIZADO",
        titulo: p.titulo,
        estado: estadoPresupuesto(p.estado),
        envioTipo: envioTipo(p.envio_tipo),
        envioCosto: p.envio_costo || 0,
        notas: p.notas,
        fecha: new Date(p.fecha),
        createdAt: new Date(p.created_at),
        items: {
          create: itemsDelPresupuesto.map((it, idx) => ({
            orden: it.orden ?? idx,
            producto: it.producto,
            medidas: it.medidas,
            tela: it.tela,
            cantidadTela: it.cantidad_tela || 0,
            precioTelaMetro: it.precio_tela_metro || 0,
            manoObraEstructura: it.mano_obra_costo || 0,
            manoObraEstado: (it.mano_obra_estado || "Estimativo").toUpperCase() === "DEFINIDO" ? "DEFINIDO" : "ESTIMATIVO",
            materialesCosto: (it.insumos_cantidad || 0) * (it.insumos_valor_unitario || 0),
            unidades: it.unidades || 1,
            precioUnidad: it.precio_unidad || 0,
          })),
        },
      },
    });
  }

  // ── Ingresos → Cobro + Cuota única ────────────────────────────────────
  for (const i of ingresos) {
    const contactoId = i.client_id ? contactoIdByLegacyClientId.get(i.client_id) ?? (await getConsumidorFinalId()) : await getConsumidorFinalId();
    await prisma.cobro.create({
      data: {
        contactoId,
        concepto: i.concepto,
        categoria: i.categoria,
        createdAt: new Date(i.fecha),
        cuotas: { create: [{ numero: 1, fecha: new Date(i.fecha), monto: i.monto || 0, pagada: true }] },
      },
    });
  }

  // ── Gastos generales ───────────────────────────────────────────────────
  for (const g of gastos) {
    await prisma.gastoGeneral.create({
      data: { concepto: g.concepto, categoria: g.categoria, monto: g.monto || 0, fecha: new Date(g.fecha) },
    });
  }

  // ── Pagos a proveedores (ya realizados) ────────────────────────────────
  const proveedorIdByNombre = new Map<string, string>();
  for (const pg of pagosProveedores) {
    const nombre = pg.proveedor || "Proveedor (migración)";
    let proveedorId = proveedorIdByNombre.get(nombre);
    if (!proveedorId) {
      const prov = await prisma.proveedor.create({ data: { nombre, tipo: "MATERIAL" } });
      proveedorId = prov.id;
      proveedorIdByNombre.set(nombre, proveedorId);
    }
    await prisma.pagoProveedor.create({
      data: {
        proveedorId,
        concepto: pg.concepto || "Pago",
        monto: pg.monto || 0,
        fechaVencimiento: new Date(pg.fecha),
        pagada: true,
        fechaPago: new Date(pg.fecha),
      },
    });
  }

  // ── Retiros de socias ──────────────────────────────────────────────────
  for (const r of retiros) {
    await prisma.retiroSocia.create({ data: { socia: r.socia, monto: r.monto || 0, notas: r.notas, fecha: new Date(r.fecha) } });
  }

  db.close();
  console.log("Migración completa.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
