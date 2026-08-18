import { FOLLOWUP_PROSPECTO_DIAS, DEADLINE_AVISOS_DIAS } from "./enums";

const DAY_MS = 1000 * 60 * 60 * 24;

export function daysBetween(from: Date, to: Date): number {
  const a = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const b = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((b - a) / DAY_MS);
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

// ── 1) Follow up de PROSPECTOS (persigue respuesta a un presupuesto enviado) ──
// Independiente del follow up de clientes: no comparte estado ni disparador.

export interface ProspectoFollowUp {
  activo: boolean;
  diasTranscurridos: number | null;
  hitosVencidos: number[]; // milestones (3/7/15) ya alcanzados y no silenciados
  proximoHito: number | null;
  alertaSinNovedades: boolean; // marcó "realizado" pero sigue sin respuesta
}

export function computeProspectoFollowUp(c: {
  estado: string;
  fechaEnvioPresupuesto: Date | null;
  followUpRealizado: boolean;
  followUpRealizadoFecha: Date | null;
}): ProspectoFollowUp {
  const activo = c.estado === "PRESU_ENVIADO" && !!c.fechaEnvioPresupuesto;
  if (!activo) {
    return { activo: false, diasTranscurridos: null, hitosVencidos: [], proximoHito: null, alertaSinNovedades: false };
  }
  const hoy = new Date();
  const dias = daysBetween(c.fechaEnvioPresupuesto as Date, hoy);
  const hitosVencidos: number[] = [];
  for (const hito of FOLLOWUP_PROSPECTO_DIAS) {
    const fechaHito = addDays(c.fechaEnvioPresupuesto as Date, hito);
    const detenido = c.followUpRealizado && !!c.followUpRealizadoFecha && c.followUpRealizadoFecha <= fechaHito;
    if (dias >= hito && !detenido) hitosVencidos.push(hito);
  }
  const proximoHito = FOLLOWUP_PROSPECTO_DIAS.find((h) => dias < h) ?? null;
  const alertaSinNovedades =
    c.followUpRealizado && !!c.followUpRealizadoFecha && daysBetween(c.followUpRealizadoFecha, hoy) >= 7;

  return { activo, diasTranscurridos: dias, hitosVencidos, proximoHito, alertaSinNovedades };
}

// ── 2) Follow up de CLIENTES (relación post-venta / recontacto) ──────────
// Independiente del de prospectos: propio disparador (intervalo desde última compra
// o desde el último "contactado"), propio check de resuelto.

export interface ClienteRecontacto {
  vencido: boolean;
  fechaBase: Date | null;
  fechaVencimiento: Date | null;
  diasDesdeVencimiento: number | null;
}

export function computeClienteRecontacto(c: {
  fechaUltimaCompra: Date | null;
  recontactoMarcadoFecha: Date | null;
  intervaloRecontactoMeses: number | null;
  intervaloDefault: number;
}): ClienteRecontacto {
  const fechaBase = [c.recontactoMarcadoFecha, c.fechaUltimaCompra]
    .filter((d): d is Date => !!d)
    .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
  if (!fechaBase) return { vencido: false, fechaBase: null, fechaVencimiento: null, diasDesdeVencimiento: null };

  const meses = c.intervaloRecontactoMeses ?? c.intervaloDefault;
  const fechaVencimiento = addMonths(fechaBase, meses);
  const hoy = new Date();
  const dias = daysBetween(fechaVencimiento, hoy);
  return { vencido: dias >= 0, fechaBase, fechaVencimiento, diasDesdeVencimiento: dias >= 0 ? dias : null };
}

// ── 3) Deadlines de entrega (Objetos y Arquitectura) ──────────────────────

export interface DeadlineAviso {
  activo: boolean;
  diasRestantes: number | null;
  hitoMasUrgente: number | null; // menor umbral cruzado (mayor urgencia)
  vencida: boolean;
}

export function computeDeadlineAviso(fechaEntrega: Date | null, tiposProducto: string[]): DeadlineAviso {
  if (!fechaEntrega || tiposProducto.length === 0) {
    return { activo: false, diasRestantes: null, hitoMasUrgente: null, vencida: false };
  }
  const hoy = new Date();
  const diasRestantes = daysBetween(hoy, fechaEntrega);
  const umbrales = Array.from(
    new Set(tiposProducto.flatMap((t) => DEADLINE_AVISOS_DIAS[t] ?? []))
  ).sort((a, b) => a - b);

  const cruzados = umbrales.filter((u) => diasRestantes <= u);
  const hitoMasUrgente = cruzados.length ? Math.min(...cruzados) : null;
  return {
    activo: cruzados.length > 0,
    diasRestantes,
    hitoMasUrgente,
    vencida: diasRestantes < 0,
  };
}
