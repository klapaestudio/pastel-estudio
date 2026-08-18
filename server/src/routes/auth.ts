import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { requireAuth, signToken } from "../middleware/auth";
import { Role } from "../lib/enums";

export const authRouter = Router();

authRouter.post("/login", async (req, res) => {
  const { email, password } = req.body as { email: string; password: string };
  if (!email || !password) return res.status(400).json({ error: "Falta email o contraseña" });

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (!user || !user.activo) return res.status(401).json({ error: "Credenciales inválidas" });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Credenciales inválidas" });

  const token = signToken({ userId: user.id, role: user.role as Role, contactoId: user.contactoId });
  res.json({
    token,
    user: { id: user.id, email: user.email, nombre: user.nombre, role: user.role, contactoId: user.contactoId },
  });
});

authRouter.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.auth!.userId } });
  if (!user) return res.status(404).json({ error: "Usuario no encontrado" });
  res.json({ id: user.id, email: user.email, nombre: user.nombre, role: user.role, contactoId: user.contactoId });
});
