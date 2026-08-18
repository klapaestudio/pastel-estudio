export function fmtMoney(n: number | null | undefined): string {
  return `$ ${Number(n || 0).toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-AR");
}

export function toInputDate(d: string | Date | null | undefined): string {
  if (!d) return "";
  const date = new Date(d);
  return date.toISOString().slice(0, 10);
}

export const TIPO_PRODUCTO_LABEL: Record<string, string> = {
  COLECCION: "Colección",
  PERSONALIZADO: "Personalizado",
  ARQUITECTURA: "Arquitectura",
};

export const LINEA_LABEL: Record<string, string> = {
  RESIDENCIAL: "Residencial",
  COMERCIAL: "Comercial",
};

export const SERVICIO_LABEL: Record<string, string> = {
  ASESORAMIENTO: "Asesoramiento",
  PROYECTO_INTEGRAL: "Proyecto integral",
  PROYECTO_OBRA: "Proyecto + obra",
};

export const PERFIL_LABEL: Record<string, string> = {
  PARTICULAR: "Particular",
  ARQUITECTO: "Arquitecto",
  DISENADOR: "Diseñador",
};

export const ESTADO_PROSPECTO_LABEL: Record<string, string> = {
  A_PRESUPUESTAR: "A presupuestar",
  PRESU_ENVIADO: "Presu enviado",
  PRESU_APROBADO: "Presu aprobado",
  PRESU_RECHAZADO: "Presu rechazado",
  PRESU_POSTERGADO: "Presu postergado",
};

export function etiquetaLabel(e: { tipoProducto: string; linea?: string | null; servicio?: string | null }): string {
  let label = TIPO_PRODUCTO_LABEL[e.tipoProducto] || e.tipoProducto;
  if (e.tipoProducto === "ARQUITECTURA" && (e.linea || e.servicio)) {
    const extra = [e.linea ? LINEA_LABEL[e.linea] : null, e.servicio ? SERVICIO_LABEL[e.servicio] : null].filter(Boolean).join(" · ");
    if (extra) label += ` (${extra})`;
  }
  return label;
}
