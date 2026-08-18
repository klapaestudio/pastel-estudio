import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { computeProspectoFollowUp, computeClienteRecontacto, computeDeadlineAviso } from "../lib/followup";

export const panelRouter = Router();
panelRouter.use(requireAuth, requireRole("ADMIN", "VENTAS", "FINANZAS", "TALLER"));

// Panel de control (4.2): cruza CRM, Facturación, Proveedores y Agenda.
// Los tres sistemas de follow up (deadlines / prospectos / clientes) se computan
// por separado, cada uno con su propio disparador — no comparten lógica.
panelRouter.get("/alertas", async (_req, res) => {
  const [pagosProveedores, cuotasPendientes, clientesConEntrega, prospectos, clientes, presupuestosAprobados, materialesAlerta, config] =
    await Promise.all([
      prisma.pagoProveedor.findMany({ where: { pagada: false }, include: { proveedor: true }, orderBy: { fechaVencimiento: "asc" } }),
      prisma.cuota.findMany({
        where: { pagada: false },
        include: { cobro: { include: { contacto: { select: { id: true, nombre: true } } } } },
        orderBy: { fecha: "asc" },
      }),
      prisma.contacto.findMany({ where: { etapa: "CLIENTE", fechaEntrega: { not: null } }, include: { etiquetas: true } }),
      prisma.contacto.findMany({ where: { etapa: "PROSPECTO" }, include: { etiquetas: true } }),
      prisma.contacto.findMany({ where: { etapa: "CLIENTE" }, include: { etiquetas: true } }),
      prisma.presupuesto.findMany({
        where: { estado: "APROBADO", envioEstado: { not: "DESPACHADO" } },
        include: { contacto: { select: { id: true, nombre: true } } },
      }),
      prisma.material.findMany({ where: { stockEstado: { in: ["QUEDANDO_SIN_STOCK", "SIN_STOCK"] } } }),
      prisma.configuracionGeneral.findUnique({ where: { id: "default" } }),
    ]);

  const intervaloDefault = config?.intervaloRecontactoDefaultMeses ?? 6;

  // 1) A quién le debe ella
  const debeAProveedores = pagosProveedores;

  // 2) Quién le debe a ella
  const leDebenACobrar = cuotasPendientes;

  // 3) Entregas pendientes (deadlines por tipo de producto)
  const entregasPendientes = clientesConEntrega
    .map((c) => ({
      contacto: { id: c.id, nombre: c.nombre, fechaEntrega: c.fechaEntrega },
      aviso: computeDeadlineAviso(c.fechaEntrega, c.etiquetas.map((e) => e.tipoProducto)),
    }))
    .filter((x) => x.aviso.activo);

  // 4) Envíos pendientes (pedidos cerrados a coordinar/despachar)
  const enviosPendientes = presupuestosAprobados;

  // 5) Follow up de PROSPECTOS (persigue respuesta a presupuesto enviado) — propio sistema
  const followUpProspectos = prospectos
    .map((p) => ({
      contacto: { id: p.id, nombre: p.nombre, estado: p.estado, fechaEnvioPresupuesto: p.fechaEnvioPresupuesto },
      followUp: computeProspectoFollowUp(p),
      manualPendiente: p.followUpManualFecha && p.followUpManualFecha <= new Date() ? p.followUpManualFecha : null,
    }))
    .filter((x) => x.followUp.hitosVencidos.length > 0 || x.followUp.alertaSinNovedades || x.manualPendiente);

  // 6) Follow up de CLIENTES (recontacto post-venta) — propio sistema, no se mezcla con el de arriba
  const followUpClientes = clientes
    .map((c) => ({
      contacto: { id: c.id, nombre: c.nombre, fechaUltimaCompra: c.fechaUltimaCompra },
      recontacto: computeClienteRecontacto({
        fechaUltimaCompra: c.fechaUltimaCompra,
        recontactoMarcadoFecha: c.recontactoMarcadoFecha,
        intervaloRecontactoMeses: c.intervaloRecontactoMeses,
        intervaloDefault,
      }),
    }))
    .filter((x) => x.recontacto.vencido);

  res.json({
    debeAProveedores,
    leDebenACobrar,
    entregasPendientes,
    enviosPendientes,
    followUpProspectos,
    followUpClientes,
    materialesAlerta,
  });
});
