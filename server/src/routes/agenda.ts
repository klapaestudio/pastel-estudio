import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";

export const agendaRouter = Router();
agendaRouter.use(requireAuth, requireRole("ADMIN", "VENTAS", "TALLER", "FINANZAS"));

agendaRouter.get("/tareas", async (req, res) => {
  const { desde, hasta, tipo } = req.query as Record<string, string | undefined>;
  const where: any = {};
  if (tipo) where.tipo = tipo;
  if (desde || hasta) {
    where.fechaInicio = {};
    if (desde) where.fechaInicio.gte = new Date(desde);
    if (hasta) where.fechaInicio.lte = new Date(hasta);
  }
  const list = await prisma.tareaAgenda.findMany({
    where,
    include: { contacto: { select: { id: true, nombre: true } } },
    orderBy: { fechaInicio: "asc" },
  });
  res.json(list);
});

agendaRouter.post("/tareas", async (req, res) => {
  const { titulo, tipo, contactoId, fechaInicio, fechaFin, todoElDia, prioridad, ubicacion, notas } = req.body;
  const t = await prisma.tareaAgenda.create({
    data: {
      titulo,
      tipo: tipo || "INTERNA",
      contactoId: contactoId || null,
      fechaInicio: new Date(fechaInicio),
      fechaFin: new Date(fechaFin),
      todoElDia: !!todoElDia,
      prioridad: prioridad || "MEDIA",
      ubicacion,
      notas,
    },
  });
  res.status(201).json(t);
});

agendaRouter.put("/tareas/:id", async (req, res) => {
  const body = req.body;
  const data: any = {};
  for (const f of ["titulo", "tipo", "ubicacion", "notas", "prioridad"]) if (body[f] !== undefined) data[f] = body[f];
  if (body.contactoId !== undefined) data.contactoId = body.contactoId || null;
  if (body.fechaInicio !== undefined) data.fechaInicio = new Date(body.fechaInicio);
  if (body.fechaFin !== undefined) data.fechaFin = new Date(body.fechaFin);
  if (body.todoElDia !== undefined) data.todoElDia = !!body.todoElDia;
  const t = await prisma.tareaAgenda.update({ where: { id: req.params.id }, data });
  res.json(t);
});

agendaRouter.delete("/tareas/:id", async (req, res) => {
  await prisma.tareaAgenda.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

// ── Cronómetro (play / pausa / stop) por tarea (4.12) ─────────────────────
agendaRouter.post("/tareas/:id/cronometro/play", async (req, res) => {
  const t = await prisma.tareaAgenda.update({
    where: { id: req.params.id },
    data: { cronometroEstado: "CORRIENDO", cronometroInicioTs: new Date() },
  });
  res.json(t);
});

agendaRouter.post("/tareas/:id/cronometro/pausa", async (req, res) => {
  const t = await prisma.tareaAgenda.findUnique({ where: { id: req.params.id } });
  if (!t) return res.status(404).json({ error: "No encontrada" });
  const acumulado = t.cronometroInicioTs ? Math.floor((Date.now() - t.cronometroInicioTs.getTime()) / 1000) : 0;
  const updated = await prisma.tareaAgenda.update({
    where: { id: req.params.id },
    data: { cronometroEstado: "PAUSADO", cronometroSegundos: t.cronometroSegundos + acumulado, cronometroInicioTs: null },
  });
  res.json(updated);
});

agendaRouter.post("/tareas/:id/cronometro/stop", async (req, res) => {
  const t = await prisma.tareaAgenda.findUnique({ where: { id: req.params.id } });
  if (!t) return res.status(404).json({ error: "No encontrada" });
  const acumulado = t.cronometroEstado === "CORRIENDO" && t.cronometroInicioTs
    ? Math.floor((Date.now() - t.cronometroInicioTs.getTime()) / 1000)
    : 0;
  const updated = await prisma.tareaAgenda.update({
    where: { id: req.params.id },
    data: { cronometroEstado: "PARADO", cronometroSegundos: t.cronometroSegundos + acumulado, cronometroInicioTs: null },
  });
  res.json(updated);
});

// ── Franjas bloqueadas (agenda de clientes) ───────────────────────────────
agendaRouter.get("/franjas-bloqueadas", async (_req, res) => {
  const list = await prisma.franjaBloqueada.findMany({ orderBy: { fecha: "asc" } });
  res.json(list);
});

agendaRouter.post("/franjas-bloqueadas", async (req, res) => {
  const { fecha, horaInicio, horaFin, motivo } = req.body;
  const f = await prisma.franjaBloqueada.create({ data: { fecha: new Date(fecha), horaInicio, horaFin, motivo } });
  res.status(201).json(f);
});

agendaRouter.delete("/franjas-bloqueadas/:id", async (req, res) => {
  await prisma.franjaBloqueada.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});
