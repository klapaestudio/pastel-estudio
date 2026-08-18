import "dotenv/config";
import express from "express";
import cors from "cors";
import { authRouter } from "./routes/auth";
import { usersRouter } from "./routes/users";
import { contactosRouter } from "./routes/contactos";
import { presupuestosRouter } from "./routes/presupuestos";
import { proveedoresRouter } from "./routes/proveedores";
import { productosRouter } from "./routes/productos";
import { mensajesRouter } from "./routes/mensajes";
import { facturacionRouter } from "./routes/facturacion";
import { panelRouter } from "./routes/panel";
import { finanzasRouter } from "./routes/finanzas";
import { agendaRouter } from "./routes/agenda";
import { portalRouter } from "./routes/portal";
import { configRouter } from "./routes/config";
import { gastosRouter } from "./routes/gastos";

const app = express();
app.use(cors());
app.use(express.json({ limit: "15mb" }));

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRouter);
app.use("/api/usuarios", usersRouter);
app.use("/api/contactos", contactosRouter);
app.use("/api/presupuestos", presupuestosRouter);
app.use("/api/proveedores", proveedoresRouter);
app.use("/api/productos", productosRouter);
app.use("/api/mensajes", mensajesRouter);
app.use("/api/facturacion", facturacionRouter);
app.use("/api/panel", panelRouter);
app.use("/api/finanzas", finanzasRouter);
app.use("/api/agenda", agendaRouter);
app.use("/api/portal", portalRouter);
app.use("/api/config", configRouter);
app.use("/api/gastos", gastosRouter);

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: err?.message || "Error interno" });
});

const PORT = Number(process.env.PORT) || 4000;
app.listen(PORT, () => {
  console.log(`Pastel Studio API escuchando en http://localhost:${PORT}`);
});
