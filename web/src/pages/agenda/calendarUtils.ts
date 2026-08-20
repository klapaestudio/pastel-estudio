import { addDays, addMonths, addWeeks, endOfMonth, endOfWeek, format, isSameMonth, startOfMonth, startOfWeek } from "date-fns";
import { es } from "date-fns/locale";

export type Vista = "dia" | "semana" | "mes";

export const HORA_INICIO_GRILLA = 8; // 8am
export const HORA_FIN_GRILLA = 21; // 9pm
export const HORAS_GRILLA = Array.from(
  { length: HORA_FIN_GRILLA - HORA_INICIO_GRILLA + 1 },
  (_, i) => HORA_INICIO_GRILLA + i
);

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function rangoVista(vista: Vista, cursor: Date): { desde: Date; hasta: Date } {
  if (vista === "dia") return { desde: cursor, hasta: cursor };
  if (vista === "semana") {
    return { desde: startOfWeek(cursor, { weekStartsOn: 1 }), hasta: endOfWeek(cursor, { weekStartsOn: 1 }) };
  }
  const inicioMes = startOfMonth(cursor);
  const finMes = endOfMonth(cursor);
  return { desde: startOfWeek(inicioMes, { weekStartsOn: 1 }), hasta: endOfWeek(finMes, { weekStartsOn: 1 }) };
}

export function diasDeSemana(cursor: Date): Date[] {
  const inicio = startOfWeek(cursor, { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, i) => addDays(inicio, i));
}

export function diasDeMes(cursor: Date): Date[] {
  const { desde, hasta } = rangoVista("mes", cursor);
  const dias: Date[] = [];
  let d = desde;
  while (d.getTime() <= hasta.getTime()) {
    dias.push(d);
    d = addDays(d, 1);
  }
  return dias;
}

export function tituloPeriodo(vista: Vista, cursor: Date): string {
  if (vista === "dia") return cap(format(cursor, "EEEE d 'de' MMMM 'de' yyyy", { locale: es }));
  if (vista === "mes") return cap(format(cursor, "MMMM yyyy", { locale: es }));
  const { desde, hasta } = rangoVista("semana", cursor);
  const texto = isSameMonth(desde, hasta)
    ? `${format(desde, "d", { locale: es })}–${format(hasta, "d 'de' MMMM yyyy", { locale: es })}`
    : `${format(desde, "d 'de' MMM", { locale: es })} – ${format(hasta, "d 'de' MMM yyyy", { locale: es })}`;
  return cap(texto);
}

export function avanzar(vista: Vista, cursor: Date, dir: 1 | -1): Date {
  if (vista === "dia") return addDays(cursor, dir);
  if (vista === "semana") return addWeeks(cursor, dir);
  return addMonths(cursor, dir);
}

// Asigna "carriles" a tareas con horario que se superponen en un mismo día, para
// poder mostrarlas lado a lado en la grilla horaria en vez de tapadas unas con otras.
export function asignarLanes(
  tareas: { id: string; fechaInicio: string; fechaFin: string }[]
): Record<string, { lane: number; lanes: number }> {
  const ordenadas = [...tareas].sort((a, b) => new Date(a.fechaInicio).getTime() - new Date(b.fechaInicio).getTime());
  const lanesEnd: number[] = [];
  const laneDe: Record<string, number> = {};
  for (const t of ordenadas) {
    const inicio = new Date(t.fechaInicio).getTime();
    const fin = new Date(t.fechaFin).getTime();
    let lane = lanesEnd.findIndex((end) => end <= inicio);
    if (lane === -1) {
      lane = lanesEnd.length;
      lanesEnd.push(fin);
    } else {
      lanesEnd[lane] = fin;
    }
    laneDe[t.id] = lane;
  }
  const resultado: Record<string, { lane: number; lanes: number }> = {};
  for (const t of ordenadas) {
    const inicio = new Date(t.fechaInicio).getTime();
    const fin = new Date(t.fechaFin).getTime();
    const solapadas = ordenadas.filter(
      (o) => new Date(o.fechaInicio).getTime() < fin && new Date(o.fechaFin).getTime() > inicio
    );
    const lanesSolapadas = Math.max(...solapadas.map((o) => laneDe[o.id])) + 1;
    resultado[t.id] = { lane: laneDe[t.id], lanes: lanesSolapadas };
  }
  return resultado;
}

// Posición (top/height en px) de un bloque con horario dentro de la grilla del día.
export function bloquePosicion(t: { fechaInicio: string; fechaFin: string }, rowH: number): { top: number; height: number } {
  const inicio = new Date(t.fechaInicio);
  const fin = new Date(t.fechaFin);
  const minInicio = Math.max(0, inicio.getHours() * 60 + inicio.getMinutes() - HORA_INICIO_GRILLA * 60);
  const minFinRaw = fin.getHours() * 60 + fin.getMinutes() - HORA_INICIO_GRILLA * 60;
  const totalMin = (HORA_FIN_GRILLA - HORA_INICIO_GRILLA) * 60;
  const minFin = Math.min(totalMin, minFinRaw <= 0 ? minInicio + 30 : minFinRaw);
  const top = (minInicio / 60) * rowH;
  const height = Math.max(20, ((minFin - minInicio) / 60) * rowH);
  return { top, height };
}
