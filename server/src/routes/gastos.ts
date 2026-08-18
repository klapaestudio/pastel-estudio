import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";

export const gastosRouter = Router();
gastosRouter.use(requireAuth, requireRole("ADMIN", "FINANZAS"));

gastosRouter.get("/generales", async (_req, res) => {
  res.json(await prisma.gastoGeneral.findMany({ orderBy: { fecha: "desc" } }));
});
gastosRouter.post("/generales", async (req, res) => {
  const { concepto, categoria, monto, fecha } = req.body;
  const g = await prisma.gastoGeneral.create({ data: { concepto, categoria, monto: monto || 0, fecha: new Date(fecha) } });
  res.status(201).json(g);
});
gastosRouter.put("/generales/:id", async (req, res) => {
  const { concepto, categoria, monto, fecha } = req.body;
  const data: any = {};
  if (concepto !== undefined) data.concepto = concepto;
  if (categoria !== undefined) data.categoria = categoria;
  if (monto !== undefined) data.monto = monto;
  if (fecha !== undefined) data.fecha = new Date(fecha);
  res.json(await prisma.gastoGeneral.update({ where: { id: req.params.id }, data }));
});
gastosRouter.delete("/generales/:id", async (req, res) => {
  await prisma.gastoGeneral.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

gastosRouter.get("/retiros", async (_req, res) => {
  res.json(await prisma.retiroSocia.findMany({ orderBy: { fecha: "desc" } }));
});
gastosRouter.post("/retiros", async (req, res) => {
  const { socia, monto, notas, fecha } = req.body;
  const r = await prisma.retiroSocia.create({ data: { socia, monto: monto || 0, notas, fecha: new Date(fecha) } });
  res.status(201).json(r);
});
gastosRouter.put("/retiros/:id", async (req, res) => {
  const { socia, monto, notas, fecha } = req.body;
  const data: any = {};
  if (socia !== undefined) data.socia = socia;
  if (monto !== undefined) data.monto = monto;
  if (notas !== undefined) data.notas = notas;
  if (fecha !== undefined) data.fecha = new Date(fecha);
  res.json(await prisma.retiroSocia.update({ where: { id: req.params.id }, data }));
});
gastosRouter.delete("/retiros/:id", async (req, res) => {
  await prisma.retiroSocia.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});
