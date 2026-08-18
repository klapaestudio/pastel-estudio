import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { computeProspectoFollowUp, computeClienteRecontacto } from "../lib/followup";

export const contactosRouter = Router();
contactosRouter.use(requireAuth, requireRole("ADMIN", "VENTAS", "FINANZAS"));

async function getIntervaloDefault(): Promise<number> {
  const config = await prisma.configuracionGeneral.findUnique({ where: { id: "default" } });
  return config?.intervaloRecontactoDefaultMeses ?? 6;
}

function enrich(c: any, intervaloDefault: number) {
  if (c.etapa === "PROSPECTO") {
    return { ...c, followUp: computeProspectoFollowUp(c) };
  }
  return {
    ...c,
    recontacto: computeClienteRecontacto({
      fechaUltimaCompra: c.fechaUltimaCompra,
      recontactoMarcadoFecha: c.recontactoMarcadoFecha,
      intervaloRecontactoMeses: c.intervaloRecontactoMeses,
      intervaloDefault,
    }),
  };
}

// GET /api/contactos?etapa=PROSPECTO&tipoProducto=COLECCION&linea=&servicio=&estado=&q=
contactosRouter.get("/", async (req, res) => {
  const { etapa, tipoProducto, linea, servicio, estado, q } = req.query as Record<string, string | undefined>;

  const where: any = {};
  if (etapa) where.etapa = etapa;
  if (estado) where.estado = estado;
  if (q) where.nombre = { contains: q };
  if (tipoProducto || linea || servicio) {
    where.etiquetas = {
      some: {
        ...(tipoProducto ? { tipoProducto } : {}),
        ...(linea ? { linea } : {}),
        ...(servicio ? { servicio } : {}),
      },
    };
  }

  const contactos = await prisma.contacto.findMany({
    where,
    include: { etiquetas: true, presupuestos: { select: { id: true, titulo: true, estado: true, plantillaPdf: true, tipo: true } } },
    orderBy: { updatedAt: "desc" },
  });
  const intervaloDefault = await getIntervaloDefault();
  res.json(contactos.map((c) => enrich(c, intervaloDefault)));
});

contactosRouter.get("/:id", async (req, res) => {
  const c = await prisma.contacto.findUnique({
    where: { id: req.params.id },
    include: {
      etiquetas: true,
      presupuestos: { include: { items: true } },
      cobros: { include: { cuotas: true } },
      tareas: true,
      archivos: true,
      etapasProyecto: { orderBy: { orden: "asc" } },
    },
  });
  if (!c) return res.status(404).json({ error: "No encontrado" });
  const intervaloDefault = await getIntervaloDefault();
  res.json(enrich(c, intervaloDefault));
});

contactosRouter.post("/", async (req, res) => {
  const body = req.body;
  const etiquetas = (body.etiquetas || []) as { tipoProducto: string; linea?: string; servicio?: string }[];

  const c = await prisma.contacto.create({
    data: {
      etapa: body.etapa || "PROSPECTO",
      nombre: body.nombre,
      telefono: body.telefono,
      ciudad: body.ciudad,
      provincia: body.provincia,
      perfil: body.perfil,
      origen: body.origen || "WHATSAPP_INSTAGRAM",
      notas: body.notas,
      tagProductoServicio: body.tagProductoServicio,
      telaColor: body.telaColor,
      monto: body.monto ?? 0,
      fechaPrimerContacto: body.fechaPrimerContacto ? new Date(body.fechaPrimerContacto) : new Date(),
      fechaEnvioPresupuesto: body.fechaEnvioPresupuesto ? new Date(body.fechaEnvioPresupuesto) : null,
      estado: body.estado || "A_PRESUPUESTAR",
      fechaCierrePresupuesto: body.fechaCierrePresupuesto ? new Date(body.fechaCierrePresupuesto) : null,
      fechaEntrega: body.fechaEntrega ? new Date(body.fechaEntrega) : null,
      fechaUltimaCompra: body.fechaUltimaCompra ? new Date(body.fechaUltimaCompra) : null,
      intervaloRecontactoMeses: body.intervaloRecontactoMeses ?? null,
      etiquetas: { create: etiquetas.map((e) => ({ tipoProducto: e.tipoProducto, linea: e.linea, servicio: e.servicio })) },
    },
    include: { etiquetas: true },
  });
  res.status(201).json(c);
});

contactosRouter.put("/:id", async (req, res) => {
  const body = req.body;
  const existing = await prisma.contacto.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "No encontrado" });

  const data: any = {};
  const directFields = [
    "nombre", "telefono", "ciudad", "provincia", "perfil", "origen", "notas",
    "tagProductoServicio", "telaColor", "monto", "estado", "intervaloRecontactoMeses",
  ];
  for (const f of directFields) if (body[f] !== undefined) data[f] = body[f];

  const dateFields = ["fechaPrimerContacto", "fechaEnvioPresupuesto", "fechaCierrePresupuesto", "fechaEntrega", "fechaUltimaCompra"];
  for (const f of dateFields) if (body[f] !== undefined) data[f] = body[f] ? new Date(body[f]) : null;

  // Transición automática Prospecto → Cliente cuando se aprueba el presupuesto (4.5.A)
  if (existing.etapa === "PROSPECTO" && (data.estado === "PRESU_APROBADO" || body.estado === "PRESU_APROBADO")) {
    data.etapa = "CLIENTE";
    data.fechaCierrePresupuesto = data.fechaCierrePresupuesto ?? new Date();
    data.fechaUltimaCompra = data.fechaUltimaCompra ?? new Date();
  }

  if (Array.isArray(body.etiquetas)) {
    await prisma.etiqueta.deleteMany({ where: { contactoId: existing.id } });
    data.etiquetas = { create: body.etiquetas.map((e: any) => ({ tipoProducto: e.tipoProducto, linea: e.linea, servicio: e.servicio })) };
  }

  const c = await prisma.contacto.update({ where: { id: req.params.id }, data, include: { etiquetas: true } });
  res.json(c);
});

contactosRouter.delete("/:id", async (req, res) => {
  await prisma.contacto.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

// Marca "follow up realizado" — detiene el ciclo automático de avisos del prospecto
contactosRouter.post("/:id/followup-realizado", async (req, res) => {
  const c = await prisma.contacto.update({
    where: { id: req.params.id },
    data: { followUpRealizado: true, followUpRealizadoFecha: new Date() },
  });
  res.json(c);
});

// Carga/limpia una fecha de follow up manual (en paralelo al ciclo automático)
contactosRouter.post("/:id/followup-manual", async (req, res) => {
  const { fecha } = req.body as { fecha: string | null };
  const c = await prisma.contacto.update({
    where: { id: req.params.id },
    data: { followUpManualFecha: fecha ? new Date(fecha) : null },
  });
  res.json(c);
});

// Marca el aviso de recontacto de cliente como "contactado" — reinicia el conteo del intervalo
contactosRouter.post("/:id/recontacto-hecho", async (req, res) => {
  const c = await prisma.contacto.update({
    where: { id: req.params.id },
    data: { recontactoMarcadoFecha: new Date() },
  });
  res.json(c);
});
