export type Rol = "admin" | "socio" | "abogado" | "asistente";

export interface Perfil {
  id: string;
  despacho_id: string;
  nombre: string;
  email: string;
  rol: Rol;
  inpreabogado: string | null;
  tarifa_hora: number | null;
}

export const MATERIAS: Record<string, string> = {
  civil: "Civil",
  mercantil: "Mercantil",
  penal: "Penal",
  laboral: "Laboral",
  familia: "Familia",
  lopnna: "Protección NNA (LOPNNA)",
  contencioso_administrativo: "Contencioso administrativo",
  constitucional: "Constitucional",
  tributario: "Tributario",
  agrario: "Agrario",
  transito: "Tránsito",
  maritimo: "Marítimo",
  otro: "Otro",
};

export const ESTADOS_CASO: Record<string, string> = {
  prospecto: "Prospecto",
  abierto: "Abierto",
  en_tramite: "En trámite",
  en_sentencia: "En espera de sentencia",
  apelacion: "Apelación",
  casacion: "Casación",
  ejecucion: "Ejecución",
  cerrado: "Cerrado",
  archivado: "Archivado",
};

export const TIPOS_ACTUACION: Record<string, string> = {
  escrito: "Escrito",
  diligencia: "Diligencia",
  audiencia: "Audiencia",
  auto: "Auto",
  sentencia: "Sentencia",
  notificacion: "Notificación",
  citacion: "Citación",
  prueba: "Prueba",
  reunion_cliente: "Reunión con cliente",
  nota: "Nota",
  llamada: "Llamada",
  otro: "Otro",
};

export const TIPOS_PLAZO: Record<string, string> = {
  lapso_procesal: "Lapso procesal",
  audiencia: "Audiencia",
  vencimiento_recurso: "Vencimiento de recurso",
  prescripcion: "Prescripción / caducidad",
  reunion: "Reunión",
  pago: "Pago",
  otro: "Otro",
};

export const SALAS_TSJ: Record<string, string> = {
  constitucional: "Sala Constitucional",
  politico_administrativa: "Sala Político-Administrativa",
  electoral: "Sala Electoral",
  casacion_civil: "Sala de Casación Civil",
  casacion_penal: "Sala de Casación Penal",
  casacion_social: "Sala de Casación Social",
  plena: "Sala Plena",
};

export const ROLES_EN_CASO: Record<string, string> = {
  responsable: "Responsable",
  colaborador: "Colaborador",
  consultor: "Consultor",
  pasante: "Pasante",
};

export const ESTADOS_FACTURA: Record<string, string> = {
  borrador: "Borrador",
  emitida: "Emitida",
  pagada: "Pagada",
  parcial: "Pago parcial",
  vencida: "Vencida",
  anulada: "Anulada",
};

export const METODOS_PAGO: Record<string, string> = {
  transferencia: "Transferencia",
  pago_movil: "Pago móvil",
  zelle: "Zelle",
  efectivo: "Efectivo",
  binance: "Binance / USDT",
  punto_venta: "Punto de venta",
  otro: "Otro",
};
