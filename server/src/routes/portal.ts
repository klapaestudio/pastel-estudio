import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";

export const portalRouter = Router();

// ── Gestión interna (staff) de biblioteca/avance del proyecto de un cliente ─
const staffRouter = Router();
staffRouter.use(requireAuth, requireRole("ADMIN", "VENTAS"));

staffRouter.post("/contactos/:id/archivos", async (req, res) => {
  const { nombre, tipo, fileData } = req.body;
  const a = await prisma.archivoProyecto.create({
    data: { contactoId: req.params.id, nombre, tipo, fileData },
  });
  res.status(201).json(a);
});

staffRouter.delete("/archivos/:id", async (req, res) => {
  await prisma.archivoProyecto.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

staffRouter.post("/contactos/:id/etapas", async (req, res) => {
  const { nombre, orden, completada, fecha } = req.body;
  const e = await prisma.etapaProyecto.create({
    data: { contactoId: req.params.id, nombre, orden: orden || 0, completada: !!completada, fecha: fecha ? new Date(fecha) : null },
  });
  res.status(201).json(e);
});

staffRouter.put("/etapas/:id", async (req, res) => {
  const { nombre, orden, completada, fecha } = req.body;
  const data: any = {};
  if (nombre !== undefined) data.nombre = nombre;
  if (orden !== undefined) data.orden = orden;
  if (completada !== undefined) data.completada = completada;
  if (fecha !== undefined) data.fecha = fecha ? new Date(fecha) : null;
  const e = await prisma.etapaProyecto.update({ where: { id: req.params.id }, data });
  res.json(e);
});

staffRouter.delete("/etapas/:id", async (req, res) => {
  await prisma.etapaProyecto.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

portalRouter.use("/admin", staffRouter);

// ── Portal del cliente de arquitectura (4.13) — acceso propio, scoped a su Contacto ─
const clienteRouter = Router();
clienteRouter.use(requireAuth, requireRole("CLIENTE"));

async function myContactoId(req: any): Promise<string> {
  return req.auth!.contactoId as string;
}

clienteRouter.get("/mi-proyecto", async (req, res) => {
  const contactoId = await myContactoId(req);
  const c = await prisma.contacto.findUnique({
    where: { id: contactoId },
    include: {
      archivos: true,
      etapasProyecto: { orderBy: { orden: "asc" } },
      presupuestos: { where: { tipo: "ARQUITECTURA", estado: "APROBADO" }, include: { items: true } },
      cobros: { include: { cuotas: { orderBy: { numero: "asc" } } } },
      etiquetas: true,
    },
  });
  if (!c) return res.status(404).json({ error: "Proyecto no encontrado" });
  res.json(c);
});

portalRouter.use("/cliente", clienteRouter);
