import 'server-only';

import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase-admin';
import { buildReclamoDocumentFromForm, resolveEmpresaRefs, type ReclamoCatalogLookups } from '@/lib/reclamos-normalize';
import { normalizeExternalUrl } from '@/lib/reclamos-display';
import type {
  ReclamoCiudad,
  ReclamoComunicacion,
  ReclamoDatosUpdate,
  ReclamoDenunciante,
  ReclamoEmpresa,
  ReclamoEmpresaRef,
  ReclamoEnlacesExternos,
  ReclamoEstado,
  ReclamoFormPayload,
  ReclamoGrupoEstado,
  ReclamoProvincia,
  ReclamoRubro,
  ReclamosCatalogType,
  ReclamoAdminBandeja,
  ReclamoCausaCatalog,
  StoredReclamoDocument,
} from '@/types/reclamos';
import {
  buildHistorialEntry,
  buildResponsable,
  computeAdminBandeja,
  RECLAMO_ESTADO_CARTA_DOCUMENTO,
  RECLAMO_ESTADO_CONSULTA,
} from '@/lib/reclamos-admin';
import { reclamoAssignedToIdentity } from '@/lib/admin-assignee-identity';
import {
  getReclamosInboundDomain,
} from '@/lib/reclamos-email-thread';
import { normalizeSearchText, scoreTextMatch } from '@/lib/text-search';

const CATALOG_COLLECTIONS: Record<ReclamosCatalogType, string> = {
  estados: 'reclamos_estados',
  grupos_estados: 'reclamos_grupos_estados',
  provincias: 'reclamos_provincias',
  ciudades: 'reclamos_ciudades',
  rubros: 'reclamos_rubros',
  empresas: 'reclamos_empresas',
};

function dbOrThrow() {
  const db = getAdminDb();
  if (!db) throw new Error('Firebase Admin no configurado.');
  return db;
}

function isFirestoreFieldValue(value: unknown): boolean {
  return Boolean(
    value &&
      typeof value === 'object' &&
      '_methodName' in value &&
      typeof (value as { _methodName?: unknown })._methodName === 'string'
  );
}

function omitUndefinedDeep<T>(value: T): T {
  if (value === undefined) return value;
  if (value === null || typeof value !== 'object') return value;
  if (isFirestoreFieldValue(value)) return value;
  if (Array.isArray(value)) {
    return value.map((item) => omitUndefinedDeep(item)) as T;
  }

  const output: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (child !== undefined) {
      output[key] = omitUndefinedDeep(child);
    }
  }
  return output as T;
}

function setOptionalTopLevelField(
  patch: Record<string, unknown>,
  key: string,
  value: string | null | undefined
) {
  const trimmed = (value ?? '').trim();
  patch[key] = trimmed ? trimmed : FieldValue.delete();
}

function setOptionalNestedTextField(
  target: ReclamoDenunciante,
  key: 'calle' | 'numero' | 'piso' | 'depto',
  value: string | undefined
) {
  const trimmed = value?.trim();
  if (trimmed) target[key] = trimmed;
  else delete target[key];
}

export async function hasReclamosCatalogsInFirestore(): Promise<boolean> {
  try {
    const db = getAdminDb();
    if (!db) return false;
    const meta = await db.collection('migration_meta').doc('reclamos_catalogs').get();
    return meta.exists;
  } catch {
    return false;
  }
}

async function readCatalog<T extends { id: number }>(collection: string): Promise<T[]> {
  const snap = await dbOrThrow().collection(collection).get();
  return snap.docs
    .map((doc) => doc.data() as T)
    .sort((a, b) => a.id - b.id);
}

export async function getReclamoEstadosFromFirestore(): Promise<ReclamoEstado[]> {
  return readCatalog<ReclamoEstado>(CATALOG_COLLECTIONS.estados);
}

export async function getReclamoGruposEstadosFromFirestore(): Promise<ReclamoGrupoEstado[]> {
  return readCatalog<ReclamoGrupoEstado>(CATALOG_COLLECTIONS.grupos_estados);
}

export async function getReclamoProvinciasFromFirestore(): Promise<ReclamoProvincia[]> {
  return readCatalog<ReclamoProvincia>(CATALOG_COLLECTIONS.provincias);
}

export async function getReclamoCiudadesFromFirestore(
  idProvincia: number
): Promise<ReclamoCiudad[]> {
  const snap = await dbOrThrow()
    .collection(CATALOG_COLLECTIONS.ciudades)
    .where('idProvincia', '==', idProvincia)
    .get();

  return snap.docs
    .map((doc) => doc.data() as ReclamoCiudad)
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}

export async function getReclamoRubrosFromFirestore(): Promise<ReclamoRubro[]> {
  return readCatalog<ReclamoRubro>(CATALOG_COLLECTIONS.rubros);
}

export async function searchReclamoEmpresasFromFirestore(
  query: string,
  limit = 30
): Promise<ReclamoEmpresa[]> {
  const normalized = normalizeSearchText(query);
  const db = dbOrThrow();

  if (!normalized) {
    const snap = await db
      .collection(CATALOG_COLLECTIONS.empresas)
      .orderBy('nombreSearch')
      .limit(limit)
      .get();
    return snap.docs.map((doc) => doc.data() as ReclamoEmpresa);
  }

  const snap = await db.collection(CATALOG_COLLECTIONS.empresas).get();

  return snap.docs
    .map((doc) => doc.data() as ReclamoEmpresa)
    .map((empresa) => ({
      empresa,
      score: scoreTextMatch(`${empresa.nombre} ${empresa.cuit ?? ''}`, normalized),
    }))
    .filter((entry) => entry.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score || a.empresa.nombre.localeCompare(b.empresa.nombre, 'es')
    )
    .slice(0, limit)
    .map((entry) => entry.empresa);
}

export async function getReclamoEmpresasByIds(ids: number[]): Promise<ReclamoEmpresa[]> {
  if (!ids.length) return [];
  const db = dbOrThrow();
  const refs = ids.map((id) => db.collection(CATALOG_COLLECTIONS.empresas).doc(String(id)));
  const snaps = await db.getAll(...refs);
  return snaps.filter((snap) => snap.exists).map((snap) => snap.data() as ReclamoEmpresa);
}

export async function loadCatalogLookupsForReclamo(
  payload: ReclamoFormPayload
): Promise<ReclamoCatalogLookups> {
  const [provincias, ciudades, empresas, estados] = await Promise.all([
    getReclamoProvinciasFromFirestore(),
    getReclamoCiudadesFromFirestore(payload.provinciaId),
    getReclamoEmpresasByIds(payload.empresaIds),
    getReclamoEstadosFromFirestore(),
  ]);

  return {
    provincias: new Map(provincias.map((item) => [item.id, item])),
    ciudades: new Map(ciudades.map((item) => [item.id, item])),
    empresas: new Map(empresas.map((item) => [item.id, item])),
    estados: new Map(estados.map((item) => [item.id, item])),
  };
}

export async function reserveNextReclamoId(): Promise<number> {
  const db = dbOrThrow();
  const metaRef = db.collection('migration_meta').doc('reclamos');

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(metaRef);
    const current = snap.exists ? Number(snap.data()?.nextId ?? 1) : 1;
    const nextId = Number.isFinite(current) && current > 0 ? current : 1;
    tx.set(metaRef, { nextId: nextId + 1, updatedAt: new Date().toISOString() }, { merge: true });
    return nextId;
  });
}

export async function saveReclamoDocument(doc: StoredReclamoDocument): Promise<void> {
  await dbOrThrow()
    .collection('reclamos')
    .doc(String(doc.id))
    .set(omitUndefinedDeep(doc), { merge: true });
}

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || undefined;
  }
  return undefined;
}

export function normalizeStoredReclamo(data: StoredReclamoDocument): StoredReclamoDocument {
  return {
    ...data,
    otrasEmpresas: normalizeOptionalString(data.otrasEmpresas),
    empresas: Array.isArray(data.empresas)
      ? data.empresas.map((empresa) => ({
          id: Number(empresa.id) || 0,
          nombre: typeof empresa.nombre === 'string' ? empresa.nombre : String(empresa.nombre ?? ''),
          cuit: normalizeOptionalString(empresa.cuit) ?? null,
        }))
      : [],
  };
}

export async function getReclamoByIdFromFirestore(id: number): Promise<StoredReclamoDocument | null> {
  const snap = await dbOrThrow().collection('reclamos').doc(String(id)).get();
  if (!snap.exists) return null;
  const data = snap.data() as StoredReclamoDocument;
  if (data.deletedAt) return null;
  return normalizeStoredReclamo(data);
}

export async function findReclamoByIdAndDocumento(
  id: number,
  numeroDocumento: string
): Promise<StoredReclamoDocument | null> {
  const doc = await getReclamoByIdFromFirestore(id);
  if (!doc) return null;
  const search = numeroDocumento.replace(/\D/g, '');
  if (!search || doc.documentoSearch !== search) return null;
  return doc;
}

export type AdminReclamoCounts = Record<ReclamoAdminBandeja, number>;

export type ListAdminReclamosOptions = {
  bandeja?: ReclamoAdminBandeja | 'todos';
  limit?: number;
  assignedToEmails?: string[];
  assigneeName?: string;
};

export async function countAdminReclamosByBandeja(): Promise<AdminReclamoCounts> {
  const snap = await dbOrThrow().collection('reclamos').get();
  const counts: AdminReclamoCounts = { recibidos: 0, gestion: 0, archivados: 0 };

  for (const doc of snap.docs) {
    const data = doc.data() as StoredReclamoDocument;
    if (data.deletedAt) continue;
    const bandeja = data.adminBandeja ?? computeAdminBandeja(data);
    counts[bandeja] += 1;
  }

  return counts;
}

function matchesAssignee(
  reclamo: StoredReclamoDocument,
  emails: string[],
  assigneeName?: string
): boolean {
  return reclamoAssignedToIdentity(reclamo, emails, assigneeName);
}

export async function countAssignedReclamos(
  loginEmail: string,
  assigneeName?: string
): Promise<number> {
  const { getAssigneeMatchContext } = await import('@/lib/admin-assignee-identity');
  const { emails, name } = await getAssigneeMatchContext(loginEmail);
  const snap = await dbOrThrow().collection('reclamos').get();
  let count = 0;

  for (const doc of snap.docs) {
    const data = doc.data() as StoredReclamoDocument;
    if (data.deletedAt) continue;
    if (matchesAssignee(data, emails, assigneeName ?? name)) count += 1;
  }

  return count;
}

export async function getReclamoCausasFromFirestore(): Promise<ReclamoCausaCatalog[]> {
  return readCatalog<ReclamoCausaCatalog>('reclamos_causas');
}

export async function listAdminReclamos(
  options: ListAdminReclamosOptions = {}
): Promise<StoredReclamoDocument[]> {
  const { bandeja = 'todos', limit = 300, assignedToEmails, assigneeName } = options;
  const assignedFilter = Boolean(assignedToEmails?.length);
  const fetchLimit = assignedFilter
    ? Math.max(limit, 5000)
    : bandeja === 'todos'
      ? limit
      : Math.max(limit * 4, 800);

  const snap = assignedFilter
    ? await dbOrThrow().collection('reclamos').get()
    : await dbOrThrow()
        .collection('reclamos')
        .orderBy('createdAt', 'desc')
        .limit(fetchLimit)
        .get();

  let items = snap.docs
    .map((doc) => doc.data() as StoredReclamoDocument)
    .filter((item) => !item.deletedAt)
    .map((item) => ({
      ...item,
      adminBandeja: item.adminBandeja ?? computeAdminBandeja(item),
    }));

  if (bandeja !== 'todos') {
    items = items.filter((item) => item.adminBandeja === bandeja);
  }

  if (assignedToEmails?.length) {
    items = items.filter((item) => matchesAssignee(item, assignedToEmails, assigneeName));
  }

  items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return items.slice(0, limit);
}

export async function updateReclamoEstado(
  id: number,
  idCasoEstado: number,
  estadoDescripcion: string,
  idGrupoEstado?: number,
  changedBy?: { email: string; name: string },
  nota?: string
): Promise<void> {
  const db = dbOrThrow();
  const ref = db.collection('reclamos').doc(String(id));
  const snap = await ref.get();
  if (!snap.exists) throw new Error('Reclamo no encontrado');

  const current = snap.data() as StoredReclamoDocument;
  const historial = current.historialEstados ?? [];
  const entry = buildHistorialEntry(
    idCasoEstado,
    estadoDescripcion,
    idGrupoEstado,
    changedBy,
    nota
  );

  const patch: Partial<StoredReclamoDocument> = {
    idCasoEstado,
    estadoDescripcion,
    idGrupoEstado: idGrupoEstado ?? undefined,
    historialEstados: [...historial, entry],
    updatedAt: new Date().toISOString(),
  };
  patch.adminBandeja = computeAdminBandeja({
    idCasoEstado,
    idGrupoEstado,
    responsable: current.responsable,
  });

  await ref.set(patch, { merge: true });
}

export async function iniciarGestionReclamo(
  id: number,
  operator: { email: string; name: string },
  estados: ReclamoEstado[]
): Promise<StoredReclamoDocument> {
  const db = dbOrThrow();
  const ref = db.collection('reclamos').doc(String(id));
  const snap = await ref.get();
  if (!snap.exists) throw new Error('Reclamo no encontrado');

  const current = snap.data() as StoredReclamoDocument;
  const historial = current.historialEstados ?? [];
  const responsable = buildResponsable(operator.email, operator.name);

  historial.push(
    buildHistorialEntry(
      current.idCasoEstado,
      current.estadoDescripcion ?? 'Consulta',
      current.idGrupoEstado,
      operator,
      'Gestión iniciada — caso asignado'
    )
  );

  let idCasoEstado = current.idCasoEstado;
  let estadoDescripcion = current.estadoDescripcion ?? 'Consulta';
  let idGrupoEstado = current.idGrupoEstado;

  if (current.idCasoEstado === RECLAMO_ESTADO_CONSULTA) {
    const next = estados.find((item) => item.id === RECLAMO_ESTADO_CARTA_DOCUMENTO);
    if (next) {
      idCasoEstado = next.id;
      estadoDescripcion = next.descripcion.trim();
      idGrupoEstado = next.idGrupoEstado;
      historial.push(
        buildHistorialEntry(
          idCasoEstado,
          estadoDescripcion,
          idGrupoEstado,
          operator,
          'Avance automático a Carta Documento'
        )
      );
    }
  }

  const updated: Partial<StoredReclamoDocument> = {
    responsable,
    idCasoEstado,
    estadoDescripcion,
    idGrupoEstado,
    historialEstados: historial,
    updatedAt: new Date().toISOString(),
  };
  updated.adminBandeja = computeAdminBandeja({
    idCasoEstado,
    idGrupoEstado,
    responsable,
  });

  await ref.set(updated, { merge: true });
  const fresh = await ref.get();
  return fresh.data() as StoredReclamoDocument;
}

export async function addReclamoComentario(
  id: number,
  texto: string,
  author: { email: string; name: string }
): Promise<void> {
  const db = dbOrThrow();
  const ref = db.collection('reclamos').doc(String(id));
  const snap = await ref.get();
  if (!snap.exists) throw new Error('Reclamo no encontrado');

  const current = snap.data() as StoredReclamoDocument;
  const comentarios = current.comentarios ?? [];
  comentarios.unshift({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    texto: texto.trim(),
    esInterno: true,
    createdAt: new Date().toISOString(),
    authorEmail: author.email,
    authorName: author.name,
  });

  await ref.set(
    {
      comentarios,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}

export async function addReclamoComunicacion(
  id: number,
  comunicacion: Omit<ReclamoComunicacion, 'id'>
): Promise<void> {
  const db = dbOrThrow();
  const ref = db.collection('reclamos').doc(String(id));
  const snap = await ref.get();
  if (!snap.exists) throw new Error('Reclamo no encontrado');

  const current = snap.data() as StoredReclamoDocument;
  const comunicaciones = current.comunicaciones ?? [];
  comunicaciones.unshift({
    direction: 'outbound',
    ...comunicacion,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  });

  await ref.set(
    { comunicaciones, updatedAt: new Date().toISOString() },
    { merge: true }
  );
}

export async function addReclamoComunicacionEntrante(
  id: number,
  comunicacion: {
    from: string;
    subject: string;
    body: string;
    sentAt?: string;
    sentByName?: string;
  }
): Promise<void> {
  const db = dbOrThrow();
  const ref = db.collection('reclamos').doc(String(id));
  const snap = await ref.get();
  if (!snap.exists) throw new Error('Reclamo no encontrado');

  const current = normalizeStoredReclamo(snap.data() as StoredReclamoDocument);
  const comunicaciones = current.comunicaciones ?? [];
  const from = comunicacion.from.trim().toLowerCase();

  comunicaciones.unshift({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    direction: 'inbound',
    from,
    to: getReclamosInboundDomain() ? `reclamo+${id}@${getReclamosInboundDomain()}` : 'reclamos@ucu',
    subject: comunicacion.subject.trim(),
    body: comunicacion.body.trim(),
    sentAt: comunicacion.sentAt ?? new Date().toISOString(),
    sentByEmail: from,
    sentByName: comunicacion.sentByName?.trim() || 'Consumidor',
  });

  await ref.set(
    { comunicaciones, updatedAt: new Date().toISOString() },
    { merge: true }
  );
}

export async function findReclamoIdsByDenuncianteEmail(email: string, limit = 5): Promise<number[]> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return [];

  const snap = await dbOrThrow()
    .collection('reclamos')
    .where('denunciante.email', '==', normalized)
    .limit(limit)
    .get();

  return snap.docs
    .map((doc) => (doc.data() as StoredReclamoDocument).id)
    .filter((id) => Number.isFinite(id));
}

export async function createReclamoFromPublicForm(
  payload: ReclamoFormPayload
): Promise<StoredReclamoDocument> {
  const catalogs = await loadCatalogLookupsForReclamo(payload);
  const id = await reserveNextReclamoId();
  const doc = buildReclamoDocumentFromForm(id, payload, catalogs);
  await saveReclamoDocument(doc);
  return doc;
}

export async function reasignarReclamo(
  id: number,
  assignee: { email: string; name: string },
  operator: { email: string; name: string }
): Promise<StoredReclamoDocument> {
  const db = dbOrThrow();
  const ref = db.collection('reclamos').doc(String(id));
  const snap = await ref.get();
  if (!snap.exists) throw new Error('Reclamo no encontrado');

  const current = snap.data() as StoredReclamoDocument;
  const historial = current.historialEstados ?? [];
  const prevName = current.responsable?.name ?? 'sin asignar';
  const responsable = buildResponsable(assignee.email, assignee.name);

  historial.push(
    buildHistorialEntry(
      current.idCasoEstado,
      current.estadoDescripcion ?? 'Consulta',
      current.idGrupoEstado,
      operator,
      `Caso reasignado de ${prevName} a ${assignee.name}`
    )
  );

  const updated: Partial<StoredReclamoDocument> = {
    responsable,
    historialEstados: historial,
    updatedAt: new Date().toISOString(),
  };
  updated.adminBandeja = computeAdminBandeja({
    idCasoEstado: current.idCasoEstado,
    idGrupoEstado: current.idGrupoEstado,
    responsable,
  });

  await ref.set(updated, { merge: true });
  const fresh = await ref.get();
  return fresh.data() as StoredReclamoDocument;
}

function validateReclamoDatosUpdate(update: ReclamoDatosUpdate): string | null {
  if (update.resumen !== undefined) {
    const resumen = update.resumen.trim();
    if (!resumen) return 'El resumen es obligatorio';
    if (resumen.length > 150) return 'El resumen no puede superar 150 caracteres';
  }
  if (update.hecho !== undefined) {
    const hecho = update.hecho.trim();
    if (!hecho) return 'Los hechos son obligatorios';
    if (hecho.length > 1500) return 'Los hechos no pueden superar 1500 caracteres';
  }
  if (update.empresaIds !== undefined) {
    if (!Array.isArray(update.empresaIds) || update.empresaIds.length === 0) {
      return 'Debe haber al menos una empresa denunciada';
    }
    if (update.empresaIds.length > 5) return 'Máximo 5 empresas del catálogo';
  }
  if (update.denunciante?.email !== undefined && !update.denunciante.email.trim().includes('@')) {
    return 'Email inválido';
  }
  if (update.enlacesExternos !== undefined && update.enlacesExternos !== null) {
    for (const value of Object.values(update.enlacesExternos)) {
      if (value === null || value === undefined) continue;
      try {
        normalizeExternalUrl(String(value));
      } catch (err) {
        return err instanceof Error ? err.message : 'URL inválida';
      }
    }
  }
  return null;
}

function mergeEnlacesExternos(
  current: ReclamoEnlacesExternos | undefined,
  update: Partial<ReclamoEnlacesExternos> | null | undefined
): ReclamoEnlacesExternos | undefined {
  if (update === undefined) return current;
  if (update === null) return undefined;

  const merged: ReclamoEnlacesExternos = { ...(current ?? {}) };
  for (const [key, value] of Object.entries(update) as [keyof ReclamoEnlacesExternos, string | null][]) {
    if (value === null || value === undefined || !String(value).trim()) {
      delete merged[key];
      continue;
    }
    merged[key] = normalizeExternalUrl(String(value));
  }

  return Object.keys(merged).length ? merged : undefined;
}

export async function updateReclamoDatos(
  id: number,
  update: ReclamoDatosUpdate,
  _operator: { email: string; name: string }
): Promise<StoredReclamoDocument> {
  const validationError = validateReclamoDatosUpdate(update);
  if (validationError) throw new Error(validationError);

  const db = dbOrThrow();
  const ref = db.collection('reclamos').doc(String(id));
  const snap = await ref.get();
  if (!snap.exists) throw new Error('Reclamo no encontrado');

  const current = snap.data() as StoredReclamoDocument;
  const patch: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
  };

  if (update.denunciante && Object.keys(update.denunciante).length > 0) {
    const merged: ReclamoDenunciante = { ...current.denunciante, ...update.denunciante };
    const provinciaId = merged.provinciaId;
    const ciudadId = merged.ciudadId;

    if (update.denunciante.provinciaId !== undefined || update.denunciante.ciudadId !== undefined) {
      const [provincias, ciudades] = await Promise.all([
        getReclamoProvinciasFromFirestore(),
        getReclamoCiudadesFromFirestore(provinciaId),
      ]);
      const provincia = provincias.find((item) => item.id === provinciaId);
      const ciudad = ciudades.find((item) => item.id === ciudadId);
      merged.provinciaNombre = provincia?.nombre;
      merged.ciudadNombre = ciudad?.nombre;
    }

    if (update.denunciante.nombre !== undefined) merged.nombre = update.denunciante.nombre.trim();
    if (update.denunciante.apellido !== undefined) merged.apellido = update.denunciante.apellido.trim();
    if (update.denunciante.tipoDocumento !== undefined) {
      merged.tipoDocumento = update.denunciante.tipoDocumento.trim();
    }
    if (update.denunciante.numeroDocumento !== undefined) {
      merged.numeroDocumento = update.denunciante.numeroDocumento.trim();
    }
    if (update.denunciante.telefono !== undefined) merged.telefono = update.denunciante.telefono.trim();
    if (update.denunciante.email !== undefined) merged.email = update.denunciante.email.trim().toLowerCase();
    if (update.denunciante.calle !== undefined) {
      setOptionalNestedTextField(merged, 'calle', update.denunciante.calle);
    }
    if (update.denunciante.numero !== undefined) {
      setOptionalNestedTextField(merged, 'numero', update.denunciante.numero);
    }
    if (update.denunciante.piso !== undefined) {
      setOptionalNestedTextField(merged, 'piso', update.denunciante.piso);
    }
    if (update.denunciante.depto !== undefined) {
      setOptionalNestedTextField(merged, 'depto', update.denunciante.depto);
    }

    patch.denunciante = omitUndefinedDeep(merged);
    patch.nombreSearch = `${merged.nombre} ${merged.apellido}`.trim().toLowerCase();
    patch.documentoSearch = merged.numeroDocumento.replace(/\D/g, '');
  }

  if (update.resumen !== undefined) patch.resumen = update.resumen.trim();
  if (update.hecho !== undefined) patch.hecho = update.hecho.trim();

  if (update.otrasEmpresas !== undefined) {
    setOptionalTopLevelField(patch, 'otrasEmpresas', update.otrasEmpresas);
  }

  if (update.empresaIds !== undefined) {
    const empresasCatalog = await getReclamoEmpresasByIds(update.empresaIds);
    const lookups = {
      provincias: new Map(),
      ciudades: new Map(),
      empresas: new Map(empresasCatalog.map((item) => [item.id, item])),
      estados: new Map(),
    };
    const empresas: ReclamoEmpresaRef[] = resolveEmpresaRefs(update.empresaIds, lookups);
    if (empresas.length !== update.empresaIds.length) {
      throw new Error('Una o más empresas no existen en el catálogo');
    }
    patch.empresaIds = update.empresaIds;
    patch.empresas = empresas;
  }

  if (update.enlacesExternos !== undefined) {
    const enlacesExternos = mergeEnlacesExternos(current.enlacesExternos, update.enlacesExternos);
    patch.enlacesExternos = enlacesExternos ?? FieldValue.delete();
  }

  await ref.set(omitUndefinedDeep(patch), { merge: true });
  const fresh = await ref.get();
  return normalizeStoredReclamo(fresh.data() as StoredReclamoDocument);
}
