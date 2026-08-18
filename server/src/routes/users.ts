import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { ROLES } from "../lib/enums";

export const usersRouter = Router();
usersRouter.use(requireAuth, requireRole("ADMIN"));

usersRouter.get("/", async (_req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, nombre: true, role: true, activo: true, contactoId: true, createdAt: true },
    orderBy: { nombre: "asc" },
  });
  res.json(users);
});

usersRouter.post("/", async (req, res) => {
  const { email, password, nombre, role, contactoId } = req.body;
  if (!email || !password || !nombre || !role) return res.status(400).json({ error: "Faltan campos" });
  if (!ROLES.includes(role)) return res.status(400).json({ error: "Rol inválido" });
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email: email.toLowerCase().trim(), passwordHash, nombre, role, contactoId: contactoId || null },
  });
  res.status(201).json({ id: user.id });
});

usersRouter.put("/:id", async (req, res) => {
  const { nombre, role, activo, contactoId, password } = req.body;
  const data: any = {};
  if (nombre !== undefined) data.nombre = nombre;
  if (role !== undefined) {
    if (!ROLES.includes(role)) return res.status(400).json({ error: "Rol inválido" });
    data.role = role;
  }
  if (activo !== undefined) data.activo = activo;
  if (contactoId !== undefined) data.contactoId = contactoId || null;
  if (password) data.passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.update({ where: { id: req.params.id }, data });
  res.json({ ok: true });
});

usersRouter.delete("/:id", async (req, res) => {
  await prisma.user.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});
