import type {
  ReclamoAdminBandeja,
  ReclamoHistorialEstado,
  ReclamoResponsable,
  StoredReclamoDocument,
} from '@/types/reclamos';

export const RECLAMO_ESTADO_CONSULTA = 1;
export const RECLAMO_ESTADO_CARTA_DOCUMENTO = 2;
export const RECLAMO_GRUPO_ARCHIVADO = 3;

export function computeAdminBandeja(
  doc: Pick<
    StoredReclamoDocument,
    'idCasoEstado' | 'idGrupoEstado' | 'responsable' | 'asignacionPendiente'
  >
): ReclamoAdminBandeja {
  if (doc.idGrupoEstado === RECLAMO_GRUPO_ARCHIVADO) return 'archivados';
  if (doc.asignacionPendiente?.email) return 'espera_aceptacion';
  if (doc.idCasoEstado === RECLAMO_ESTADO_CONSULTA && !doc.responsable) return 'recibidos';
  return 'gestion';
}

export function buildHistorialEntry(
  idCasoEstado: number,
  estadoDescripcion: string,
  idGrupoEstado: number | undefined,
  changedBy?: { email: string; name: string },
  nota?: string
): ReclamoHistorialEstado {
  const entry: ReclamoHistorialEstado = {
    idCasoEstado,
    estadoDescripcion,
    changedAt: new Date().toISOString(),
  };
  if (idGrupoEstado !== undefined) entry.idGrupoEstado = idGrupoEstado;
  if (changedBy?.email) entry.changedByEmail = changedBy.email;
  if (changedBy?.name) entry.changedByName = changedBy.name;
  if (nota) entry.nota = nota;
  return entry;
}

export function buildResponsable(
  email: string,
  name: string
): ReclamoResponsable {
  return {
    email,
    name,
    assignedAt: new Date().toISOString(),
  };
}

export function resolveAdminBandeja(doc: StoredReclamoDocument): ReclamoAdminBandeja {
  return doc.adminBandeja ?? computeAdminBandeja(doc);
}

export function resolveArchivadoEstado(
  estados: { id: number; descripcion: string; idGrupoEstado: number }[]
): { id: number; descripcion: string; idGrupoEstado: number } | null {
  const archivados = estados.filter((item) => item.idGrupoEstado === RECLAMO_GRUPO_ARCHIVADO);
  if (!archivados.length) return null;

  const preferido = archivados.find((item) =>
    item.descripcion.toLowerCase().includes('archiv')
  );
  return preferido ?? archivados[0];
}
