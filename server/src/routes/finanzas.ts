import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { daysBetween } from "../lib/followup";

export const finanzasRouter = Router();
finanzasRouter.use(requireAuth, requireRole("ADMIN", "FINANZAS"));

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

// Dashboard de finanzas (4.11): cruza Facturación y CRM.
finanzasRouter.get("/resumen", async (_req, res) => {
  const [cuotas, cobros, contactos, gastosGenerales, retiros] = await Promise.all([
    prisma.cuota.findMany({ include: { cobro: { include: { contacto: true } } } }),
    prisma.cobro.findMany({ include: { contacto: true } }),
    prisma.contacto.findMany({ where: { etapa: "CLIENTE" }, include: { etiquetas: true } }),
    prisma.gastoGeneral.findMany(),
    prisma.retiroSocia.findMany(),
  ]);

  // Facturación mensual, gastos, costos, ganancia por mes
  const porMes: Record<string, { facturacion: number; costos: number; gastos: number; cantidad: number }> = {};
  for (const c of cuotas) {
    const k = monthKey(c.fecha);
    porMes[k] ??= { facturacion: 0, costos: 0, gastos: 0, cantidad: 0 };
    porMes[k].facturacion += c.monto;
    porMes[k].costos += c.costos;
    porMes[k].gastos += c.gastos;
    porMes[k].cantidad += 1;
  }
  const gastosGeneralesPorMes: Record<string, number> = {};
  for (const g of gastosGenerales) {
    const k = monthKey(g.fecha);
    gastosGeneralesPorMes[k] = (gastosGeneralesPorMes[k] || 0) + g.monto;
  }
  const retirosPorMes: Record<string, number> = {};
  for (const r of retiros) {
    const k = monthKey(r.fecha);
    retirosPorMes[k] = (retirosPorMes[k] || 0) + r.monto;
  }

  const meses = Array.from(new Set([...Object.keys(porMes), ...Object.keys(gastosGeneralesPorMes)])).sort();
  const facturacionMensual = meses.map((m) => ({ mes: m, total: round2(porMes[m]?.facturacion || 0) }));
  const gastosMensual = meses.map((m) => ({
    mes: m,
    total: round2((porMes[m]?.gastos || 0) + (gastosGeneralesPorMes[m] || 0)),
  }));
  const costosMensual = meses.map((m) => ({ mes: m, total: round2(porMes[m]?.costos || 0) }));
  const gananciaMensual = meses.map((m) => ({
    mes: m,
    total: round2((porMes[m]?.facturacion || 0) - (porMes[m]?.costos || 0) - (porMes[m]?.gastos || 0) - (gastosGeneralesPorMes[m] || 0)),
  }));
  const retirosMensual = Object.keys(retirosPorMes)
    .sort()
    .map((m) => ({ mes: m, total: round2(retirosPorMes[m]) }));

  // Ticket promedio por mes (por cobro, no por cuota)
  const cobrosPorMes: Record<string, number[]> = {};
  const cobroTotales: Record<string, number> = {};
  for (const c of cuotas) {
    cobroTotales[c.cobroId] = (cobroTotales[c.cobroId] || 0) + c.monto;
  }
  for (const cobro of cobros) {
    const k = monthKey(cobro.createdAt);
    cobrosPorMes[k] ??= [];
    cobrosPorMes[k].push(cobroTotales[cobro.id] || 0);
  }
  const ticketPromedioMensual = Object.keys(cobrosPorMes)
    .sort()
    .map((m) => ({ mes: m, promedio: round2(cobrosPorMes[m].reduce((s, v) => s + v, 0) / cobrosPorMes[m].length) }));

  // Ventas / rentabilidad por categoría
  const porCategoria: Record<string, { monto: number; ganancia: number }> = {};
  for (const cobro of cobros) {
    const cat = cobro.categoria || "Sin categoría";
    porCategoria[cat] ??= { monto: 0, ganancia: 0 };
    porCategoria[cat].monto += cobroTotales[cobro.id] || 0;
    porCategoria[cat].ganancia += cobro.gananciaTotal;
  }
  const ventasPorCategoria = Object.entries(porCategoria)
    .map(([categoria, v]) => ({
      categoria,
      monto: round2(v.monto),
      ganancia: round2(v.ganancia),
      rentabilidad: v.monto > 0 ? round2((v.ganancia / v.monto) * 100) : 0,
    }))
    .sort((a, b) => b.monto - a.monto);

  // A qué tipo de cliente le vende más (perfil)
  const porPerfil: Record<string, number> = {};
  for (const cobro of cobros) {
    const perfil = cobro.contacto.perfil || "Sin dato";
    porPerfil[perfil] = (porPerfil[perfil] || 0) + (cobroTotales[cobro.id] || 0);
  }
  const ventasPorPerfilCliente = Object.entries(porPerfil)
    .map(([perfil, monto]) => ({ perfil, monto: round2(monto) }))
    .sort((a, b) => b.monto - a.monto);

  // Qué es lo que más se vende (por etiqueta tipoProducto de los clientes con cobros)
  const porTipoProducto: Record<string, number> = {};
  for (const c of contactos) {
    const totalCliente = cobros
      .filter((cb) => cb.contactoId === c.id)
      .reduce((s, cb) => s + (cobroTotales[cb.id] || 0), 0);
    for (const et of c.etiquetas) {
      porTipoProducto[et.tipoProducto] = (porTipoProducto[et.tipoProducto] || 0) + totalCliente;
    }
  }
  const masVendido = Object.entries(porTipoProducto)
    .map(([tipoProducto, monto]) => ({ tipoProducto, monto: round2(monto) }))
    .sort((a, b) => b.monto - a.monto);

  // Rentabilidad general del negocio
  const totalFacturacion = round2(cuotas.reduce((s, c) => s + c.monto, 0));
  const totalCostos = round2(cuotas.reduce((s, c) => s + c.costos, 0));
  const totalGastosGenerales = round2(gastosGenerales.reduce((s, g) => s + g.monto, 0));
  const totalGastos = round2(cuotas.reduce((s, c) => s + c.gastos, 0) + totalGastosGenerales);
  const totalGanancia = round2(totalFacturacion - totalCostos - totalGastos);
  const rentabilidadGeneral = totalFacturacion > 0 ? round2((totalGanancia / totalFacturacion) * 100) : 0;
  const totalCobrado = round2(cuotas.filter((c) => c.pagada).reduce((s, c) => s + c.monto, 0));
  const totalMeDeben = round2(cuotas.filter((c) => !c.pagada).reduce((s, c) => s + c.monto, 0));

  // Cobrado este mes (cuotas pagadas cuya fecha cae en el mes actual)
  const hoy = new Date();
  const mesActual = monthKey(hoy);
  const cobradoEsteMes = round2(
    cuotas.filter((c) => c.pagada && monthKey(c.fecha) === mesActual).reduce((s, c) => s + c.monto, 0)
  );

  // Falta cobrar: todas las cuotas pendientes de ingresar, pasadas o futuras
  const faltaCobrar = totalMeDeben;

  // Clientes atrasados: clientes con al menos una cuota pendiente ya vencida
  const atrasadosPorContacto: Record<
    string,
    { contactoId: string; nombre: string; monto: number; cuotasAtrasadas: number; diasAtrasoMax: number }
  > = {};
  for (const c of cuotas) {
    if (c.pagada || c.fecha >= hoy) continue;
    const contacto = c.cobro.contacto;
    const dias = daysBetween(c.fecha, hoy);
    atrasadosPorContacto[contacto.id] ??= { contactoId: contacto.id, nombre: contacto.nombre, monto: 0, cuotasAtrasadas: 0, diasAtrasoMax: 0 };
    atrasadosPorContacto[contacto.id].monto += c.monto;
    atrasadosPorContacto[contacto.id].cuotasAtrasadas += 1;
    atrasadosPorContacto[contacto.id].diasAtrasoMax = Math.max(atrasadosPorContacto[contacto.id].diasAtrasoMax, dias);
  }
  const clientesAtrasados = Object.values(atrasadosPorContacto)
    .map((a) => ({ ...a, monto: round2(a.monto) }))
    .sort((a, b) => b.diasAtrasoMax - a.diasAtrasoMax);

  res.json({
    facturacionMensual,
    gastosMensual,
    costosMensual,
    gananciaMensual,
    retirosMensual,
    ticketPromedioMensual,
    ventasPorCategoria,
    ventasPorPerfilCliente,
    masVendido,
    cobradoEsteMes,
    faltaCobrar,
    clientesAtrasados,
    rentabilidadGeneral: {
      facturacion: totalFacturacion,
      costos: totalCostos,
      gastos: totalGastos,
      ganancia: totalGanancia,
      rentabilidadPorcentaje: rentabilidadGeneral,
      cobrado: totalCobrado,
      meDeben: totalMeDeben,
    },
  });
});
