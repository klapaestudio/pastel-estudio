import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";

export const configRouter = Router();
configRouter.use(requireAuth);

configRouter.get("/general", async (_req, res) => {
  const c = await prisma.configuracionGeneral.upsert({
    where: { id: "default" },
    create: { id: "default" },
    update: {},
  });
  res.json(c);
});

configRouter.put("/general", requireRole("ADMIN"), async (req, res) => {
  const { intervaloRecontactoDefaultMeses } = req.body;
  const c = await prisma.configuracionGeneral.upsert({
    where: { id: "default" },
    create: { id: "default", intervaloRecontactoDefaultMeses },
    update: { intervaloRecontactoDefaultMeses },
  });
  res.json(c);
});
