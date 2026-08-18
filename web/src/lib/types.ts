export type Role = "ADMIN" | "VENTAS" | "TALLER" | "FINANZAS" | "CLIENTE";

export interface AuthUser {
  id: string;
  email: string;
  nombre: string;
  role: Role;
  contactoId: string | null;
}

export type TipoProducto = "COLECCION" | "PERSONALIZADO" | "ARQUITECTURA";
export type LineaArquitectura = "RESIDENCIAL" | "COMERCIAL";
export type ServicioArquitectura = "ASESORAMIENTO" | "PROYECTO_INTEGRAL" | "PROYECTO_OBRA";
export type PerfilProspecto = "PARTICULAR" | "ARQUITECTO" | "DISENADOR";
export type EstadoProspecto = "A_PRESUPUESTAR" | "PRESU_ENVIADO" | "PRESU_APROBADO" | "PRESU_RECHAZADO" | "PRESU_POSTERGADO";

export interface Etiqueta {
  id: string;
  tipoProducto: TipoProducto;
  linea?: LineaArquitectura | null;
  servicio?: ServicioArquitectura | null;
}

export interface Contacto {
  id: string;
  etapa: "PROSPECTO" | "CLIENTE";
  nombre: string;
  telefono?: string | null;
  ciudad?: string | null;
  provincia?: string | null;
  perfil?: PerfilProspecto | null;
  origen: "TIENDA_NUBE" | "WHATSAPP_INSTAGRAM";
  notas?: string | null;
  tagProductoServicio?: string | null;
  telaColor?: string | null;
  monto?: number | null;
  fechaPrimerContacto?: string | null;
  fechaEnvioPresupuesto?: string | null;
  estado: EstadoProspecto;
  followUpRealizado: boolean;
  followUpRealizadoFecha?: string | null;
  followUpManualFecha?: string | null;
  fechaCierrePresupuesto?: string | null;
  fechaEntrega?: string | null;
  fechaUltimaCompra?: string | null;
  intervaloRecontactoMeses?: number | null;
  recontactoMarcadoFecha?: string | null;
  etiquetas: Etiqueta[];
  presupuestos?: { id: string; titulo: string; estado: string; plantillaPdf: string; tipo: string }[];
  followUp?: {
    activo: boolean;
    diasTranscurridos: number | null;
    hitosVencidos: number[];
    proximoHito: number | null;
    alertaSinNovedades: boolean;
  };
  recontacto?: {
    vencido: boolean;
    fechaBase: string | null;
    fechaVencimiento: string | null;
    diasDesdeVencimiento: number | null;
  };
}

export interface PresupuestoItem {
  id?: string;
  orden?: number;
  producto: string;
  medidas?: string | null;
  tela?: string | null;
  color?: string | null;
  cantidadTela: number;
  precioTelaMetro: number;
  manoObraEstructura: number;
  manoObraTapiceria: number;
  manoObraEstado: "DEFINIDO" | "ESTIMATIVO";
  materialesCosto: number;
  costoDiseno: number;
  honorariosCosto: number;
  gastosVarios: number;
  unidades: number;
  precioUnidad: number;
  observaciones?: string | null;
  imagenReferenciaData?: string | null;
  calc?: { costoTela: number; costoUnitario: number; subtotalVenta: number; margenUnitario: number; margenTotal: number };
}

export interface ValorAdicional {
  id?: string;
  concepto: string;
  monto: number;
  orden?: number;
}

export interface Presupuesto {
  id: string;
  contactoId?: string | null;
  contacto?: { id: string; nombre: string } | null;
  tipo: "OBJETO_COLECCION" | "OBJETO_PERSONALIZADO" | "ARQUITECTURA";
  titulo: string;
  linea?: string | null;
  servicio?: string | null;
  alcance?: string | null;
  estado: "BORRADOR" | "ENVIADO" | "APROBADO" | "RECHAZADO";
  envioTipo: "ESTIMATIVO" | "DEFINIDO";
  envioCosto: number;
  envioEstado: "PENDIENTE" | "COORDINADO" | "DESPACHADO";
  plantillaPdf: "CLASICA" | "MINIMAL" | "ACENTO";
  notas?: string | null;
  fecha: string;
  items: PresupuestoItem[];
  valoresAdicionales: ValorAdicional[];
  totales?: { subtotalVenta: number; margenTotal: number; totalValoresAdicionales: number; costoTotal: number; total: number };
}
