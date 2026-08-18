import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";

export const proveedoresRouter = Router();
proveedoresRouter.use(requireAuth, requireRole("ADMIN", "TALLER", "FINANZAS", "VENTAS"));

// ── Proveedores ────────────────────────────────────────────────────────
proveedoresRouter.get("/", async (req, res) => {
  const { tipo } = req.query as Record<string, string | undefined>;
  const list = await prisma.proveedor.findMany({
    where: tipo ? { tipo } : {},
    include: { materiales: true, manoObraTarifas: true },
    orderBy: { nombre: "asc" },
  });
  res.json(list);
});

proveedoresRouter.post("/", async (req, res) => {
  const { nombre, tipo, ciudad, telefono, contacto, notas } = req.body;
  const p = await prisma.proveedor.create({ data: { nombre, tipo, ciudad, telefono, contacto, notas } });
  res.status(201).json(p);
});

proveedoresRouter.put("/:id", async (req, res) => {
  const { nombre, tipo, ciudad, telefono, contacto, notas } = req.body;
  const p = await prisma.proveedor.update({
    where: { id: req.params.id },
    data: { nombre, tipo, ciudad, telefono, contacto, notas },
  });
  res.json(p);
});

proveedoresRouter.delete("/:id", async (req, res) => {
  await prisma.proveedor.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

// ── Materiales (costos + alarma de stock) ────────────────────────────────
proveedoresRouter.get("/materiales/all", async (req, res) => {
  const { stockEstado } = req.query as Record<string, string | undefined>;
  const list = await prisma.material.findMany({
    where: stockEstado ? { stockEstado } : {},
    include: { proveedor: true },
    orderBy: { nombre: "asc" },
  });
  res.json(list);
});

proveedoresRouter.post("/materiales", async (req, res) => {
  const { nombre, unidad, costoActualizado, proveedorId, stockEstado, stockCantidad } = req.body;
  const m = await prisma.material.create({
    data: { nombre, unidad, costoActualizado: costoActualizado || 0, proveedorId: proveedorId || null, stockEstado: stockEstado || "HAY_STOCK", stockCantidad },
  });
  res.status(201).json(m);
});

proveedoresRouter.put("/materiales/:id", async (req, res) => {
  const { nombre, unidad, costoActualizado, proveedorId, stockEstado, stockCantidad } = req.body;
  const data: any = {};
  if (nombre !== undefined) data.nombre = nombre;
  if (unidad !== undefined) data.unidad = unidad;
  if (costoActualizado !== undefined) data.costoActualizado = costoActualizado;
  if (proveedorId !== undefined) data.proveedorId = proveedorId || null;
  if (stockEstado !== undefined) data.stockEstado = stockEstado;
  if (stockCantidad !== undefined) data.stockCantidad = stockCantidad;
  const m = await prisma.material.update({ where: { id: req.params.id }, data });
  res.json(m);
});

proveedoresRouter.delete("/materiales/:id", async (req, res) => {
  await prisma.material.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

// Materiales que entraron en "quedando sin stock" o "sin stock" — para el panel de control
proveedoresRouter.get("/materiales/alertas", async (_req, res) => {
  const list = await prisma.material.findMany({
    where: { stockEstado: { in: ["QUEDANDO_SIN_STOCK", "SIN_STOCK"] } },
    orderBy: { updatedAt: "desc" },
  });
  res.json(list);
});

// ── Mano de obra tercerizada ──────────────────────────────────────────────
proveedoresRouter.get("/mano-obra/all", async (_req, res) => {
  const list = await prisma.manoObraTarifa.findMany({ include: { proveedor: true } });
  res.json(list);
});

proveedoresRouter.post("/mano-obra", async (req, res) => {
  const { proveedorId, tipoTrabajo, costo } = req.body;
  const t = await prisma.manoObraTarifa.create({ data: { proveedorId: proveedorId || null, tipoTrabajo, costo: costo || 0 } });
  res.status(201).json(t);
});

proveedoresRouter.put("/mano-obra/:id", async (req, res) => {
  const { proveedorId, tipoTrabajo, costo } = req.body;
  const t = await prisma.manoObraTarifa.update({
    where: { id: req.params.id },
    data: { proveedorId: proveedorId || null, tipoTrabajo, costo },
  });
  res.json(t);
});

proveedoresRouter.delete("/mano-obra/:id", async (req, res) => {
  await prisma.manoObraTarifa.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

// ── Pagos a proveedores ("a quién le debe ella" — 4.2) ────────────────────
proveedoresRouter.get("/pagos/all", async (req, res) => {
  const { pagada } = req.query as Record<string, string | undefined>;
  const where: any = {};
  if (pagada !== undefined) where.pagada = pagada === "true";
  const list = await prisma.pagoProveedor.findMany({ where, include: { proveedor: true }, orderBy: { fechaVencimiento: "asc" } });
  res.json(list);
});

proveedoresRouter.post("/pagos", async (req, res) => {
  const { proveedorId, concepto, monto, fechaVencimiento } = req.body;
  const p = await prisma.pagoProveedor.create({
    data: { proveedorId, concepto, monto: monto || 0, fechaVencimiento: new Date(fechaVencimiento) },
  });
  res.status(201).json(p);
});

proveedoresRouter.put("/pagos/:id", async (req, res) => {
  const { concepto, monto, fechaVencimiento, pagada } = req.body;
  const data: any = {};
  if (concepto !== undefined) data.concepto = concepto;
  if (monto !== undefined) data.monto = monto;
  if (fechaVencimiento !== undefined) data.fechaVencimiento = new Date(fechaVencimiento);
  if (pagada !== undefined) {
    data.pagada = pagada;
    data.fechaPago = pagada ? new Date() : null;
  }
  const p = await prisma.pagoProveedor.update({ where: { id: req.params.id }, data });
  res.json(p);
});

proveedoresRouter.delete("/pagos/:id", async (req, res) => {
  await prisma.pagoProveedor.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});
