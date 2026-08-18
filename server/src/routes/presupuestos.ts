import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { calcItem, calcPresupuesto } from "../lib/presupuestoCalc";
import { streamPresupuestoPdf } from "../lib/presupuestoPdf";

export const presupuestosRouter = Router();
presupuestosRouter.use(requireAuth, requireRole("ADMIN", "VENTAS", "FINANZAS"));

function withCalc(p: any) {
  const calcs = p.items.map((it: any) => calcItem(it));
  const totales = calcPresupuesto(calcs, p.envioCosto, p.valoresAdicionales || []);
  return {
    ...p,
    items: p.items.map((it: any, i: number) => ({ ...it, calc: calcs[i] })),
    totales,
  };
}

const withRelations = { items: true, valoresAdicionales: { orderBy: { orden: "asc" as const } } };

presupuestosRouter.get("/", async (req, res) => {
  const { contactoId, tipo } = req.query as Record<string, string | undefined>;
  const where: any = {};
  if (contactoId) where.contactoId = contactoId;
  if (tipo) where.tipo = tipo;
  const list = await prisma.presupuesto.findMany({
    where,
    include: { ...withRelations, contacto: { select: { id: true, nombre: true } } },
    orderBy: { updatedAt: "desc" },
  });
  res.json(list.map(withCalc));
});

presupuestosRouter.get("/:id", async (req, res) => {
  const p = await prisma.presupuesto.findUnique({
    where: { id: req.params.id },
    include: { ...withRelations, contacto: true },
  });
  if (!p) return res.status(404).json({ error: "No encontrado" });
  res.json(withCalc(p));
});

// Chequeo de stock de materiales en tiempo real contra Proveedores (4.6, 4.8)
presupuestosRouter.post("/check-stock", async (req, res) => {
  const { materialIds } = req.body as { materialIds: string[] };
  const materiales = await prisma.material.findMany({ where: { id: { in: materialIds || [] } } });
  res.json(
    materiales.map((m) => ({
      id: m.id,
      nombre: m.nombre,
      stockEstado: m.stockEstado,
      alerta: m.stockEstado !== "HAY_STOCK",
    }))
  );
});

presupuestosRouter.post("/", async (req, res) => {
  const body = req.body;
  const items = (body.items || []) as any[];
  const valoresAdicionales = (body.valoresAdicionales || []) as any[];
  const p = await prisma.presupuesto.create({
    data: {
      contactoId: body.contactoId || null,
      tipo: body.tipo,
      titulo: body.titulo,
      linea: body.linea,
      servicio: body.servicio,
      alcance: body.alcance,
      estado: body.estado || "BORRADOR",
      envioTipo: body.envioTipo || "ESTIMATIVO",
      envioCosto: body.envioCosto || 0,
      plantillaPdf: body.plantillaPdf || "CLASICA",
      notas: body.notas,
      fecha: body.fecha ? new Date(body.fecha) : new Date(),
      items: { create: items.map((it, i) => ({ ...stripId(it), orden: i })) },
      valoresAdicionales: { create: valoresAdicionales.map((v, i) => ({ ...stripId(v), orden: i })) },
    },
    include: withRelations,
  });

  await syncMontoAContacto(p);
  res.status(201).json(withCalc(p));
});

presupuestosRouter.put("/:id", async (req, res) => {
  const body = req.body;
  const items = body.items as any[] | undefined;
  const valoresAdicionales = body.valoresAdicionales as any[] | undefined;

  const data: any = {};
  const fields = ["contactoId", "tipo", "titulo", "linea", "servicio", "alcance", "estado", "envioTipo", "envioCosto", "envioEstado", "plantillaPdf", "notas"];
  for (const f of fields) if (body[f] !== undefined) data[f] = body[f];
  if (body.fecha !== undefined) data.fecha = new Date(body.fecha);

  if (items) {
    await prisma.presupuestoItem.deleteMany({ where: { presupuestoId: req.params.id } });
    data.items = { create: items.map((it, i) => ({ ...stripId(it), orden: i })) };
  }
  if (valoresAdicionales) {
    await prisma.valorAdicional.deleteMany({ where: { presupuestoId: req.params.id } });
    data.valoresAdicionales = { create: valoresAdicionales.map((v, i) => ({ ...stripId(v), orden: i })) };
  }

  const p = await prisma.presupuesto.update({
    where: { id: req.params.id },
    data,
    include: withRelations,
  });

  await syncMontoAContacto(p);

  // Al marcar el presupuesto como ENVIADO, dispara la fecha de envío en el prospecto (4.5.A)
  if (body.estado === "ENVIADO" && p.contactoId) {
    await prisma.contacto.update({
      where: { id: p.contactoId },
      data: { estado: "PRESU_ENVIADO", fechaEnvioPresupuesto: new Date() },
    });
  }
  if (body.estado === "APROBADO" && p.contactoId) {
    await prisma.contacto.update({
      where: { id: p.contactoId },
      data: { estado: "PRESU_APROBADO", etapa: "CLIENTE", fechaCierrePresupuesto: new Date(), fechaUltimaCompra: new Date() },
    });
  }
  if (body.estado === "RECHAZADO" && p.contactoId) {
    await prisma.contacto.update({ where: { id: p.contactoId }, data: { estado: "PRESU_RECHAZADO" } });
  }

  res.json(withCalc(p));
});

presupuestosRouter.delete("/:id", async (req, res) => {
  await prisma.presupuesto.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

presupuestosRouter.get("/:id/pdf", async (req, res) => {
  const p = await prisma.presupuesto.findUnique({
    where: { id: req.params.id },
    include: { ...withRelations, contacto: true },
  });
  if (!p) return res.status(404).json({ error: "No encontrado" });
  const plantilla = (req.query.plantilla as string) || p.plantillaPdf;
  streamPresupuestoPdf(
    res,
    {
      titulo: p.titulo,
      contactoNombre: p.contacto?.nombre || "Consumidor final",
      fecha: p.fecha,
      items: p.items,
      envioTipo: p.envioTipo,
      envioCosto: p.envioCosto,
      notas: p.notas,
      alcance: p.alcance,
      valoresAdicionales: p.valoresAdicionales,
    },
    plantilla
  );
});

async function syncMontoAContacto(p: { contactoId: string | null; items: any[]; envioCosto: number; valoresAdicionales?: any[] }) {
  if (!p.contactoId) return;
  const calcs = p.items.map((it) => calcItem(it));
  const totales = calcPresupuesto(calcs, p.envioCosto, p.valoresAdicionales || []);
  await prisma.contacto.update({ where: { id: p.contactoId }, data: { monto: totales.total } });
}

function stripId(it: any) {
  const { id, presupuestoId, ...rest } = it;
  return rest;
}
