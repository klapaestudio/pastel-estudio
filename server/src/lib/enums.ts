// Valores válidos para los campos "de tipo cerrado" (SQLite no soporta enums nativos).

export const ROLES = ["ADMIN", "VENTAS", "TALLER", "FINANZAS", "CLIENTE"] as const;
export type Role = (typeof ROLES)[number];

export const TIPO_PRODUCTO = ["COLECCION", "PERSONALIZADO", "ARQUITECTURA"] as const;
export type TipoProducto = (typeof TIPO_PRODUCTO)[number];

export const LINEA_ARQUITECTURA = ["RESIDENCIAL", "COMERCIAL"] as const;
export const SERVICIO_ARQUITECTURA = ["ASESORAMIENTO", "PROYECTO_INTEGRAL", "PROYECTO_OBRA"] as const;

export const PERFIL_PROSPECTO = ["PARTICULAR", "ARQUITECTO", "DISENADOR"] as const;

export const ESTADO_PROSPECTO = [
  "A_PRESUPUESTAR",
  "PRESU_ENVIADO",
  "PRESU_APROBADO",
  "PRESU_RECHAZADO",
  "PRESU_POSTERGADO",
] as const;

export const ORIGEN_CONTACTO = ["TIENDA_NUBE", "WHATSAPP_INSTAGRAM"] as const;

export const ESTADO_STOCK_MATERIAL = ["HAY_STOCK", "QUEDANDO_SIN_STOCK", "SIN_STOCK"] as const;

export const TIPO_EMBALAJE = ["DOBLE", "SIMPLE"] as const;

export const MANO_OBRA_ESTADO = ["DEFINIDO", "ESTIMATIVO"] as const;

export const TIPO_PRESUPUESTO = ["OBJETO_COLECCION", "OBJETO_PERSONALIZADO", "ARQUITECTURA"] as const;

export const ESTADO_PRESUPUESTO = ["BORRADOR", "ENVIADO", "APROBADO", "RECHAZADO"] as const;

export const PLANTILLA_PDF = ["CLASICA", "MINIMAL", "ACENTO"] as const;

export const TIPO_PROVEEDOR = ["MATERIAL", "MANO_OBRA", "TRANSPORTE"] as const;

export const TIPO_TAREA_AGENDA = ["INTERNA", "CLIENTE_RESERVABLE"] as const;

export const CRONOMETRO_ESTADO = ["PARADO", "CORRIENDO", "PAUSADO"] as const;

// Deadlines de aviso por tipo de producto (4.2)
export const DEADLINE_AVISOS_DIAS: Record<string, number[]> = {
  COLECCION: [15, 3],
  PERSONALIZADO: [15, 3],
  ARQUITECTURA: [7],
};

// Follow up automático de prospectos (4.5.A)
export const FOLLOWUP_PROSPECTO_DIAS = [3, 7, 15] as const;
