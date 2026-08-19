// Endpoint temporal para cargar los datos de ejemplo en un ambiente donde no hay
// acceso directo a la base (p.ej. SQLite sobre un volumen de Railway). Sacar este
// archivo y su mount en index.ts una vez usado — ver seedDemoData() en lib/seedDemo.ts
// para la lógica real (100% aditiva, no toca datos existentes).

import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth";
import { seedDemoData } from "../lib/seedDemo";

export const adminSeedRouter = Router();
adminSeedRouter.use(requireAuth, requireRole("ADMIN"));

adminSeedRouter.post("/seed-demo", async (_req, res) => {
  try {
    const msg = await seedDemoData();
    res.json({ ok: true, msg });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message || "Error corriendo el seed de demo" });
  }
});
