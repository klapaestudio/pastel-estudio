import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";

export const productosRouter = Router();
productosRouter.use(requireAuth, requireRole("ADMIN", "TALLER", "FINANZAS", "VENTAS"));

function stockEstadoAgregado(materiales: { material: { stockEstado: string } }[]): string {
  if (materiales.some((m) => m.material.stockEstado === "SIN_STOCK")) return "SIN_STOCK";
  if (materiales.some((m) => m.material.stockEstado === "QUEDANDO_SIN_STOCK")) return "QUEDANDO_SIN_STOCK";
  return "HAY_STOCK";
}

// Actualización en cadena (4.7): costo/ganancia siempre se calculan a partir de
// Productos estándar en el momento de leer — nunca quedan desactualizados.
function withCalc(p: any) {
  const costoMateriales = p.materiales.reduce((s: number, m: any) => s + m.cantidad * m.material.costoActualizado, 0);
  const costoCalculado = round2(p.manoObraEstructura + p.manoObraTapiceria + costoMateriales);
  const gananciaCalculada = round2(p.precioVenta - costoCalculado);
  return {
    ...p,
    costoCalculado,
    gananciaCalculada,
    stockMaterialesEstado: stockEstadoAgregado(p.materiales),
  };
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

productosRouter.get("/", async (_req, res) => {
  const list = await prisma.productoEstandar.findMany({
    include: { materiales: { include: { material: true } }, stock: true },
    orderBy: { nombre: "asc" },
  });
  res.json(list.map(withCalc));
});

productosRouter.get("/:id", async (req, res) => {
  const p = await prisma.productoEstandar.findUnique({
    where: { id: req.params.id },
    include: { materiales: { include: { material: true } }, stock: true },
  });
  if (!p) return res.status(404).json({ error: "No encontrado" });
  res.json(withCalc(p));
});

productosRouter.post("/", async (req, res) => {
  const body = req.body;
  const materiales = (body.materiales || []) as { materialId: string; cantidad: number }[];
  const p = await prisma.productoEstandar.create({
    data: {
      nombre: body.nombre,
      descripcion: body.descripcion,
      medidas: body.medidas,
      manoObraEstructura: body.manoObraEstructura || 0,
      manoObraTapiceria: body.manoObraTapiceria || 0,
      precioVenta: body.precioVenta || 0,
      moldeFileNombre: body.moldeFileNombre,
      moldeFileData: body.moldeFileData,
      materiales: { create: materiales.map((m) => ({ materialId: m.materialId, cantidad: m.cantidad })) },
    },
    include: { materiales: { include: { material: true } }, stock: true },
  });
  res.status(201).json(withCalc(p));
});

productosRouter.put("/:id", async (req, res) => {
  const body = req.body;
  const data: any = {};
  const fields = ["nombre", "descripcion", "medidas", "manoObraEstructura", "manoObraTapiceria", "precioVenta", "moldeFileNombre", "moldeFileData"];
  for (const f of fields) if (body[f] !== undefined) data[f] = body[f];

  if (Array.isArray(body.materiales)) {
    await prisma.productoEstandarMaterial.deleteMany({ where: { productoEstandarId: req.params.id } });
    data.materiales = { create: body.materiales.map((m: any) => ({ materialId: m.materialId, cantidad: m.cantidad })) };
  }

  const p = await prisma.productoEstandar.update({
    where: { id: req.params.id },
    data,
    include: { materiales: { include: { material: true } }, stock: true },
  });
  res.json(withCalc(p));
});

productosRouter.delete("/:id", async (req, res) => {
  await prisma.productoEstandar.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

// ── Stock de productos terminados (unidades ya fabricadas) (4.7) ─────────
productosRouter.post("/:id/stock", async (req, res) => {
  const { cantidad, tela, embalaje, mensajePredefinido } = req.body;
  const s = await prisma.stockProducto.create({
    data: { productoEstandarId: req.params.id, cantidad: cantidad || 0, tela, embalaje: embalaje || "SIMPLE", mensajePredefinido },
  });
  res.status(201).json(s);
});

productosRouter.put("/stock/:stockId", async (req, res) => {
  const { cantidad, tela, embalaje, mensajePredefinido } = req.body;
  const data: any = {};
  if (cantidad !== undefined) data.cantidad = cantidad;
  if (tela !== undefined) data.tela = tela;
  if (embalaje !== undefined) data.embalaje = embalaje;
  if (mensajePredefinido !== undefined) data.mensajePredefinido = mensajePredefinido;
  const s = await prisma.stockProducto.update({ where: { id: req.params.stockId }, data });
  res.json(s);
});

productosRouter.delete("/stock/:stockId", async (req, res) => {
  await prisma.stockProducto.delete({ where: { id: req.params.stockId } });
  res.json({ ok: true });
});

// Listado global de fichas de stock (para "Vista para talleres" y consulta rápida)
productosRouter.get("/stock/all", async (_req, res) => {
  const list = await prisma.stockProducto.findMany({ include: { producto: true }, orderBy: { updatedAt: "desc" } });
  res.json(list);
});
