#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import sql from 'mssql';
import admin from 'firebase-admin';
import { getReclamosSqlConfig } from './lib/reclamos-sql-config.mjs';
import {
  buildGuidToNumericMap,
  computeAdminBandeja,
  loadCausasByGuid,
  loadCausasCatalog,
  loadComentariosByGuid,
  loadEstadosMap,
  loadGruposEstados,
  loadEnlacesByGuid,
  loadHistoricoByGuid,
  loadPersonasMap,
  loadResponsablesByGuid,
  loadTiposReclamos,
  stripUndefined,
  writeCatalogBatch,
} from './lib/reclamos-sync-shared.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(rootDir, '.env.local') });

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const catalogsOnly = args.includes('--catalogs-only');
const enrichOnly = args.includes('--enrich-only');
const limitArg = args.find((arg) => arg.startsWith('--limit='));
const limit = limitArg ? Number(limitArg.split('=')[1]) : null;
const batchSize = Number(process.env.RECLAMOS_SYNC_BATCH || 200);

function initFirebase() {
  if (admin.apps.length) return admin.app();

  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (credentialsPath && fs.existsSync(credentialsPath)) {
    return admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(fs.readFileSync(credentialsPath, 'utf8'))),
    });
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Faltan credenciales Firebase Admin en .env.local');
  }

  return admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  });
}

async function syncCatalogs(db, pool) {
  console.log('Sincronizando catálogos desde SQL…');
  const [estados, grupos, causas, tipos] = await Promise.all([
    loadEstadosMap(pool),
    loadGruposEstados(pool),
    loadCausasCatalog(pool),
    loadTiposReclamos(pool),
  ]);

  console.log('Resumen catálogos SQL:', {
    estados: estados.rows.length,
    grupos: grupos.length,
    causas: causas.length,
    tipos: tipos.length,
  });

  if (dryRun) return;

  const catalogMeta = await db.collection('migration_meta').doc('reclamos_catalogs').get();
  const deletedCausaIds = catalogMeta.data()?.deletedCausaIds ?? [];

  await writeCatalogBatch(db, 'reclamos_estados', estados.rows, dryRun);
  await writeCatalogBatch(db, 'reclamos_grupos_estados', grupos, dryRun);
  await writeCatalogBatch(db, 'reclamos_causas', causas, dryRun, {
    protectAdminManaged: true,
    skipIds: deletedCausaIds,
  });
  await writeCatalogBatch(db, 'reclamos_tipos', tipos, dryRun);

  await db.collection('migration_meta').doc('reclamos_catalogs').set(
    {
      syncedAt: new Date().toISOString(),
      source: 'sql_v2',
      estadosCount: estados.rows.length,
      gruposCount: grupos.length,
      causasCount: causas.length,
      tiposCount: tipos.length,
    },
    { merge: true }
  );
}

async function enrichReclamos(db, pool) {
  console.log('Cargando datos auxiliares de SQL…');
  const [estados, personas, guidMaps] = await Promise.all([
    loadEstadosMap(pool),
    loadPersonasMap(pool),
    buildGuidToNumericMap(pool),
  ]);

  const [historicoByGuid, comentariosByGuid, responsablesByGuid, causasByGuid, enlacesByGuid] =
    await Promise.all([
      loadHistoricoByGuid(pool, estados, personas),
      loadComentariosByGuid(pool, personas),
      loadResponsablesByGuid(pool, personas),
      loadCausasByGuid(pool),
      loadEnlacesByGuid(pool),
    ]);

  console.log('Mapas cargados:', {
    reclamos: guidMaps.guidToId.size,
    historico: historicoByGuid.size,
    comentarios: comentariosByGuid.size,
    responsables: responsablesByGuid.size,
    causas: causasByGuid.size,
    enlaces: enlacesByGuid.size,
  });

  const firestoreSnap = await db.collection('reclamos').get();
  let docs = firestoreSnap.docs
    .map((doc) => doc.data())
    .filter((item) => !item.deletedAt);

  if (limit) docs = docs.slice(0, limit);
  console.log(`Enriqueciendo ${docs.length} reclamos en Firestore…`);

  let processed = 0;
  let buffer = [];

  for (const current of docs) {
    const guid = String(current.legacyGuid ?? guidMaps.idToGuid.get(current.id) ?? '')
      .toUpperCase();
    if (!guid) continue;

    const historialEstados = historicoByGuid.get(guid) ?? current.historialEstados ?? [];
    const comentarios = comentariosByGuid.get(guid) ?? [];
    const responsable = responsablesByGuid.get(guid) ?? null;
    const causas = causasByGuid.get(guid) ?? [];
    const enlaces = enlacesByGuid.get(guid);
    const estado = estados.byId.get(current.idCasoEstado);

    const patch = {
      legacyGuid: guid,
      historialEstados,
      comentarios,
      responsable,
      causas,
      googleDrive: enlaces?.googleDrive,
      googleDriveSentencia: enlaces?.googleDriveSentencia,
      numeroExpediente: enlaces?.numeroExpediente,
      idJuzgado: enlaces?.idJuzgado,
      syncedAt: new Date().toISOString(),
      syncSource: 'sql_v2',
    };

    if (estado) {
      patch.estadoDescripcion = estado.descripcion;
      patch.idGrupoEstado = estado.idGrupoEstado;
    }

    patch.adminBandeja = computeAdminBandeja({
      idCasoEstado: current.idCasoEstado,
      idGrupoEstado: patch.idGrupoEstado ?? current.idGrupoEstado,
      responsable,
    });

    buffer.push({ id: current.id, patch });
    processed += 1;

    if (buffer.length >= batchSize) {
      await writeEnrichmentBatch(db, buffer);
      console.log(`Enriquecidos ${processed}/${docs.length}`);
      buffer = [];
    }
  }

  if (buffer.length) {
    await writeEnrichmentBatch(db, buffer);
    console.log(`Enriquecidos ${processed}/${docs.length}`);
  }

  if (!dryRun) {
    await db.collection('migration_meta').doc('reclamos').set(
      {
        enrichedAt: new Date().toISOString(),
        enrichedCount: processed,
        historicoReclamos: historicoByGuid.size,
        comentariosReclamos: comentariosByGuid.size,
        responsablesReclamos: responsablesByGuid.size,
        causasReclamos: causasByGuid.size,
      },
      { merge: true }
    );
  }
}

async function writeEnrichmentBatch(db, items) {
  if (!items.length) return;
  const batch = db.batch();
  for (const item of items) {
    batch.set(
      db.collection('reclamos').doc(String(item.id)),
      stripUndefined(item.patch),
      { merge: true }
    );
  }
  if (!dryRun) await batch.commit();
}

async function main() {
  console.log(`Sync reclamos SQL → Firestore${dryRun ? ' (dry run)' : ''}`);

  const config = getReclamosSqlConfig();
  console.log(`Origen SQL: ${config.server}:${config.port}/${config.database}`);

  initFirebase();
  const db = admin.firestore();
  const pool = await sql.connect(config);

  try {
    if (!enrichOnly) {
      await syncCatalogs(db, pool);
    }
    if (!catalogsOnly) {
      await enrichReclamos(db, pool);
    }
    console.log('Sync completo.');
  } finally {
    await pool.close();
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
