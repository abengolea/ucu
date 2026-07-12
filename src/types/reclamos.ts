export type ReclamoEstado = {
  id: number;
  descripcion: string;
  idGrupoEstado: number;
  activo: boolean;
};

export type ReclamoGrupoEstado = {
  id: number;
  descripcion: string;
  estado: string;
  activo: boolean;
};

export type ReclamoProvincia = {
  id: number;
  nombre: string;
  activo: boolean;
};

export type ReclamoCiudad = {
  id: number;
  nombre: string;
  codigoPostal: number;
  idProvincia: number;
  activo: boolean;
};

export type ReclamoRubro = {
  id: number;
  descripcion: string;
  activo: boolean;
};

export type ReclamoEmpresa = {
  id: number;
  nombre: string;
  nombreSearch: string;
  cuit: string | null;
  activo: boolean;
};

export type ReclamoDenunciante = {
  nombre: string;
  apellido: string;
  tipoDocumento: string;
  numeroDocumento: string;
  calle?: string;
  numero?: string;
  piso?: string;
  depto?: string;
  provinciaId: number;
  ciudadId: number;
  provinciaNombre?: string;
  ciudadNombre?: string;
  telefono: string;
  email: string;
};

export type ReclamoEmpresaRef = {
  id: number;
  nombre: string;
  cuit?: string | null;
};

export type ReclamoCausaRef = {
  id: number;
  descripcion: string;
};

export type ReclamoCausaCatalog = {
  id: number;
  descripcion: string;
  activo: boolean;
};

export type ReclamoTipo = {
  id: number;
  descripcion: string;
  activo: boolean;
};

export type ReclamoAdminBandeja = 'recibidos' | 'gestion' | 'archivados';

export type ReclamoHistorialEstado = {
  idCasoEstado: number;
  estadoDescripcion: string;
  idGrupoEstado?: number;
  changedAt: string;
  changedByEmail?: string;
  changedByName?: string;
  nota?: string;
};

export type ReclamoComentario = {
  id: string;
  texto: string;
  esInterno: boolean;
  createdAt: string;
  authorEmail: string;
  authorName: string;
};

export type ReclamoComunicacion = {
  id: string;
  direction?: 'outbound' | 'inbound';
  to: string;
  from?: string;
  subject: string;
  body: string;
  sentAt: string;
  sentByEmail: string;
  sentByName: string;
  /** true si el borrador fue generado por Gemini */
  viaIA?: boolean;
};

export type ReclamoComunicacionSugerencia = {
  reclamoId: number;
  resumen: string;
  empresas: string;
  estadoDescripcion: string;
  motivos: string[];
  score: number;
  comunicacion: Pick<ReclamoComunicacion, 'subject' | 'body' | 'sentAt' | 'viaIA'>;
};

export type ReclamoResponsable = {
  email: string;
  name: string;
  assignedAt: string;
};

export type ReclamoEnlacesExternos = {
  /** Link específico a carpeta/documento en Google Drive. */
  drive?: string;
  /** Link a conversación o proyecto en Claude. */
  claude?: string;
  /** Link a conversación en ChatGPT. */
  chatgpt?: string;
  /** Link al expediente en la MEV (etapa judicial). */
  mev?: string;
  /** Link a sentencia en Drive u otro destino. */
  sentencia?: string;
};

export type StoredReclamoDocument = {
  id: number;
  legacyGuid?: string;
  denunciante: ReclamoDenunciante;
  resumen: string;
  hecho: string;
  otrasEmpresas?: string;
  empresaIds: number[];
  empresas: ReclamoEmpresaRef[];
  causas?: ReclamoCausaRef[];
  idCasoEstado: number;
  estadoDescripcion?: string;
  idGrupoEstado?: number;
  adminBandeja?: ReclamoAdminBandeja;
  responsable?: ReclamoResponsable | null;
  historialEstados?: ReclamoHistorialEstado[];
  comentarios?: ReclamoComentario[];
  comunicaciones?: ReclamoComunicacion[];
  /** URLs cargadas manualmente por el equipo (Claude, ChatGPT, Drive, MEV). */
  enlacesExternos?: ReclamoEnlacesExternos;
  /** URL legacy sincronizada desde SQL (google_drive). */
  googleDrive?: string;
  /** URL de sentencia en Drive (origen SQL: google_drive_sentencia). */
  googleDriveSentencia?: string;
  /** Número de expediente judicial (origen SQL: numero_expendiente). */
  numeroExpediente?: string;
  idJuzgado?: number;
  idTipo: number;
  esExterno: boolean;
  documentoSearch: string;
  nombreSearch: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  syncedAt?: string;
  syncSource?: string;
};

export type ReclamoPublicView = {
  id: number;
  resumen: string;
  estadoDescripcion: string;
  idGrupoEstado: number;
  createdAt: string;
  updatedAt: string;
  empresas: ReclamoEmpresaRef[];
};

export type ReclamoFormPayload = {
  nombre: string;
  apellido: string;
  tipoDocumento: string;
  numeroDocumento: string;
  calle?: string;
  numero?: string;
  piso?: string;
  depto?: string;
  provinciaId: number;
  ciudadId: number;
  telefono: string;
  email: string;
  resumen: string;
  hecho: string;
  otrasEmpresas?: string;
  empresaIds: number[];
};

/** Campos editables desde el panel admin (parcial). */
export type ReclamoDatosUpdate = {
  denunciante?: Partial<
    Pick<
      ReclamoDenunciante,
      | 'nombre'
      | 'apellido'
      | 'tipoDocumento'
      | 'numeroDocumento'
      | 'calle'
      | 'numero'
      | 'piso'
      | 'depto'
      | 'provinciaId'
      | 'ciudadId'
      | 'telefono'
      | 'email'
    >
  >;
  resumen?: string;
  hecho?: string;
  otrasEmpresas?: string | null;
  empresaIds?: number[];
  enlacesExternos?: Partial<ReclamoEnlacesExternos> | null;
};

export type ReclamoDelegado = {
  email: string;
  name: string;
};

export type ReclamosCatalogType =
  | 'estados'
  | 'grupos_estados'
  | 'provincias'
  | 'ciudades'
  | 'rubros'
  | 'empresas';
