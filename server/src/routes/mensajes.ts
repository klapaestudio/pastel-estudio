import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";

export const mensajesRouter = Router();
mensajesRouter.use(requireAuth, requireRole("ADMIN", "VENTAS", "TALLER", "FINANZAS"));

// ── Categorías ─────────────────────────────────────────────────────────
mensajesRouter.get("/categorias", async (_req, res) => {
  const list = await prisma.mensajeCategoria.findMany({
    include: { mensajes: { orderBy: { titulo: "asc" } } },
    orderBy: { orden: "asc" },
  });
  res.json(list);
});

mensajesRouter.post("/categorias", async (req, res) => {
  const { nombre, orden } = req.body;
  const c = await prisma.mensajeCategoria.create({ data: { nombre, orden: orden || 0 } });
  res.status(201).json(c);
});

mensajesRouter.put("/categorias/:id", async (req, res) => {
  const { nombre, orden } = req.body;
  const c = await prisma.mensajeCategoria.update({ where: { id: req.params.id }, data: { nombre, orden } });
  res.json(c);
});

mensajesRouter.delete("/categorias/:id", async (req, res) => {
  await prisma.mensajeCategoria.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

// ── Mensajes ───────────────────────────────────────────────────────────
mensajesRouter.post("/", async (req, res) => {
  const { categoriaId, titulo, texto } = req.body;
  const m = await prisma.mensaje.create({ data: { categoriaId, titulo, texto } });
  res.status(201).json(m);
});

mensajesRouter.put("/:id", async (req, res) => {
  const { categoriaId, titulo, texto } = req.body;
  const data: any = {};
  if (categoriaId !== undefined) data.categoriaId = categoriaId;
  if (titulo !== undefined) data.titulo = titulo;
  if (texto !== undefined) data.texto = texto;
  const m = await prisma.mensaje.update({ where: { id: req.params.id }, data });
  res.json(m);
});

mensajesRouter.delete("/:id", async (req, res) => {
  await prisma.mensaje.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

// Resuelve variables {{nombre}}, {{producto}}, {{fecha}}, {{tela}} contra un
// cliente/prospecto/producto de stock puntual, para copiar el mensaje ya completo.
mensajesRouter.post("/:id/resolver", async (req, res) => {
  const { contactoId, stockProductoId } = req.body as { contactoId?: string; stockProductoId?: string };
  const m = await prisma.mensaje.findUnique({ where: { id: req.params.id } });
  if (!m) return res.status(404).json({ error: "No encontrado" });

  const vars: Record<string, string> = { fecha: new Date().toLocaleDateString("es-AR") };
  if (contactoId) {
    const c = await prisma.contacto.findUnique({ where: { id: contactoId } });
    if (c) {
      vars.nombre = c.nombre;
      vars.producto = c.tagProductoServicio || "";
      vars.tela = c.telaColor || "";
    }
  }
  if (stockProductoId) {
    const s = await prisma.stockProducto.findUnique({ where: { id: stockProductoId }, include: { producto: true } });
    if (s) {
      vars.producto = s.producto.nombre;
      vars.tela = s.tela || "";
    }
  }

  const resuelto = m.texto.replace(/\{\{(\w+)\}\}/g, (_match, key) => vars[key] ?? `{{${key}}}`);
  res.json({ texto: resuelto });
});
