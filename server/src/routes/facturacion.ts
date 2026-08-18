import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";

export const facturacionRouter = Router();
facturacionRouter.use(requireAuth, requireRole("ADMIN", "FINANZAS"));

facturacionRouter.get("/cobros", async (req, res) => {
  const { contactoId } = req.query as Record<string, string | undefined>;
  const list = await prisma.cobro.findMany({
    where: contactoId ? { contactoId } : {},
    include: { cuotas: { orderBy: { numero: "asc" } }, contacto: { select: { id: true, nombre: true } } },
    orderBy: { createdAt: "desc" },
  });
  res.json(list);
});

facturacionRouter.post("/cobros", async (req, res) => {
  const { contactoId, concepto, categoria, gananciaTotal, cuotas } = req.body as {
    contactoId: string;
    concepto: string;
    categoria?: string;
    gananciaTotal?: number;
    cuotas: { numero: number; fecha: string; monto: number; costos?: number; gastos?: number }[];
  };

  // Costos y gastos se cargan una sola vez por venta (regla 4.10)
  const cuotasConCostos = (cuotas || []).filter((c) => (c.costos || 0) > 0 || (c.gastos || 0) > 0);
  if (cuotasConCostos.length > 1) {
    return res.status(400).json({ error: "Los costos y gastos solo se cargan una vez por venta, no en varias cuotas" });
  }

  const cobro = await prisma.cobro.create({
    data: {
      contactoId,
      concepto,
      categoria,
      gananciaTotal: gananciaTotal || 0,
      cuotas: {
        create: (cuotas || []).map((c) => ({
          numero: c.numero,
          fecha: new Date(c.fecha),
          monto: c.monto || 0,
          costos: c.costos || 0,
          gastos: c.gastos || 0,
        })),
      },
    },
    include: { cuotas: true },
  });
  res.status(201).json(cobro);
});

facturacionRouter.put("/cobros/:id", async (req, res) => {
  const { concepto, categoria, gananciaTotal } = req.body;
  const c = await prisma.cobro.update({
    where: { id: req.params.id },
    data: { concepto, categoria, gananciaTotal },
  });
  res.json(c);
});

facturacionRouter.delete("/cobros/:id", async (req, res) => {
  await prisma.cobro.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

facturacionRouter.post("/cobros/:id/cuotas", async (req, res) => {
  const { numero, fecha, monto, costos, gastos } = req.body;
  if ((costos || 0) > 0 || (gastos || 0) > 0) {
    const existentes = await prisma.cuota.findMany({ where: { cobroId: req.params.id } });
    if (existentes.some((c) => c.costos > 0 || c.gastos > 0)) {
      return res.status(400).json({ error: "Ya hay costos/gastos cargados en otra cuota de esta venta" });
    }
  }
  const cuota = await prisma.cuota.create({
    data: { cobroId: req.params.id, numero, fecha: new Date(fecha), monto: monto || 0, costos: costos || 0, gastos: gastos || 0 },
  });
  res.status(201).json(cuota);
});

facturacionRouter.put("/cuotas/:id", async (req, res) => {
  const { fecha, monto, costos, gastos, pagada } = req.body;
  const data: any = {};
  if (fecha !== undefined) data.fecha = new Date(fecha);
  if (monto !== undefined) data.monto = monto;
  if (pagada !== undefined) data.pagada = pagada;

  if ((costos || 0) > 0 || (gastos || 0) > 0) {
    const cuota = await prisma.cuota.findUnique({ where: { id: req.params.id } });
    if (cuota) {
      const otras = await prisma.cuota.findMany({ where: { cobroId: cuota.cobroId, id: { not: cuota.id } } });
      if (otras.some((c) => c.costos > 0 || c.gastos > 0)) {
        return res.status(400).json({ error: "Ya hay costos/gastos cargados en otra cuota de esta venta" });
      }
    }
  }
  if (costos !== undefined) data.costos = costos;
  if (gastos !== undefined) data.gastos = gastos;

  const c = await prisma.cuota.update({ where: { id: req.params.id }, data });
  res.json(c);
});

facturacionRouter.delete("/cuotas/:id", async (req, res) => {
  await prisma.cuota.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

// Cobros con cuotas pendientes de cobro (para el panel de control 4.2 "quién le debe a ella")
facturacionRouter.get("/cuotas-pendientes", async (_req, res) => {
  const cuotas = await prisma.cuota.findMany({
    where: { pagada: false },
    include: { cobro: { include: { contacto: { select: { id: true, nombre: true } } } } },
    orderBy: { fecha: "asc" },
  });
  res.json(cuotas);
});

// ── ARCA (facturación electrónica) ────────────────────────────────────────
facturacionRouter.get("/arca/config", async (_req, res) => {
  const config = await prisma.arcaConfig.findUnique({ where: { id: "default" } });
  res.json(config ?? { id: "default", cuitEstudio: null, cuentaVinculada: false, puntoVentaDefault: null });
});

facturacionRouter.put("/arca/config", async (req, res) => {
  const { cuitEstudio, cuentaVinculada, puntoVentaDefault } = req.body;
  const config = await prisma.arcaConfig.upsert({
    where: { id: "default" },
    create: { id: "default", cuitEstudio, cuentaVinculada: !!cuentaVinculada, puntoVentaDefault },
    update: { cuitEstudio, cuentaVinculada: !!cuentaVinculada, puntoVentaDefault },
  });
  res.json(config);
});

// Emite comprobante reutilizando monto/cliente/fecha ya cargados en la cuota (4.10).
// Stub: no llama a la API real de ARCA (requiere credenciales fiscales del estudio),
// pero deja el flujo completo listo para conectar el proveedor de facturación electrónica.
facturacionRouter.post("/cuotas/:id/emitir-comprobante", async (req, res) => {
  const { tipoComprobante, puntoVenta } = req.body as { tipoComprobante: string; puntoVenta: string };
  const config = await prisma.arcaConfig.findUnique({ where: { id: "default" } });
  if (!config?.cuentaVinculada) {
    return res.status(400).json({ error: "Vinculá la cuenta fiscal con ARCA antes de emitir comprobantes" });
  }
  const cuota = await prisma.cuota.update({
    where: { id: req.params.id },
    data: {
      comprobanteEmitido: true,
      comprobanteTipo: tipoComprobante,
      comprobantePuntoVenta: puntoVenta,
      comprobanteNumero: `${puntoVenta}-${Date.now().toString().slice(-8)}`,
    },
  });
  res.json(cuota);
});
