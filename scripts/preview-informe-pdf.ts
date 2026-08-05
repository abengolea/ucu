#!/usr/bin/env node
/**
 * Regenera el PDF del informe con el diseño actual (causas + síntesis opcional).
 *
 * Uso:
 *   npx tsx scripts/preview-informe-pdf.ts
 *   npx tsx scripts/preview-informe-pdf.ts --empresa=2 --open
 *   npx tsx scripts/preview-informe-pdf.ts --empresa=2 --ai --open
 */
import Module from 'node:module';
import { exec } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

// Permitir importar módulos Next "server-only" desde CLI.
const originalLoad = (Module as unknown as { _load: (...args: unknown[]) => unknown })._load;
(Module as unknown as { _load: (...args: unknown[]) => unknown })._load = function (
  request: string,
  ...rest: unknown[]
) {
  if (request === 'server-only') return {};
  return originalLoad.call(this, request, ...rest);
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(rootDir, '.env.local') });
// Preview siempre apunta a producción en links del PDF.
process.env.NEXT_PUBLIC_APP_URL = 'https://ucu.org.ar';

function arg(name: string, fallback = ''): string {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}

function flag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

async function main() {
  const { initializeApp, cert, getApps, applicationDefault } = await import('firebase-admin/app');
  const { getFirestore } = await import('firebase-admin/firestore');
  const { buildInformePdfBuffer } = await import('../src/lib/informe-pdf');
  const {
    buildInformeStatsSnapshot,
    pickMuestrasAnonimas,
  } = await import('../src/lib/informe-data');
  const { searchReclamosIndex } = await import('../src/lib/reclamos-search-index');
  const { getGeminiApiKey, generateInformeSintesis } = await import('../src/lib/gemini');
  const { getReclamoEmpresasByIds } = await import('../src/lib/reclamos-store');

  if (!getApps().length) {
    const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    const projectId =
      process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    if (credPath && fs.existsSync(credPath)) {
      initializeApp({
        credential: cert(JSON.parse(fs.readFileSync(credPath, 'utf8'))),
        projectId,
      });
    } else if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      initializeApp({
        credential: cert({
          projectId,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
        projectId,
      });
    } else {
      initializeApp({ credential: applicationDefault(), projectId });
    }
  }
  getFirestore();

  const empresaId = Number(arg('empresa', '2'));
  const empresas = await getReclamoEmpresasByIds([empresaId]);
  const empresa = empresas[0];
  if (!empresa) throw new Error(`Empresa ${empresaId} no encontrada`);

  let snapshot = await buildInformeStatsSnapshot(empresaId);
  if (!snapshot) throw new Error('No se pudo armar el snapshot');

  if (flag('ai') && getGeminiApiKey()) {
    const search = await searchReclamosIndex({ empresaId });
    const ai = await generateInformeSintesis({
      empresaNombre: empresa.nombre,
      total: snapshot.total,
      rangoFechas: snapshot.rangoFechas,
      porCausa: snapshot.porCausa,
      muestras: pickMuestrasAnonimas(search.hits),
    });
    snapshot = { ...snapshot, sintesis: ai.sintesis, temas: ai.temas };
    console.log(`✓ Síntesis IA (${ai.temas.length} temas)`);
  } else if (flag('ai')) {
    console.log('⚠ --ai pedido pero GEMINI_API_KEY no está configurada; sigo sin síntesis.');
  }

  const pedido = {
    id: 'preview',
    codigo: arg('codigo', 'UCU-86E2-DAE4'),
    empresaId: empresa.id,
    empresaNombre: empresa.nombre,
    email: 'abengolea1@gmail.com',
    precioCents: 1000,
    moneda: 'ARS' as const,
    estado: 'ready' as const,
    statsSnapshot: snapshot,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    readyAt: '2026-08-05T21:30:00.000Z',
  };

  const outPath = path.resolve(
    arg(
      'out',
      path.join(
        process.env.USERPROFILE || rootDir,
        'Downloads',
        'informe-ucu-preview-redisenado.pdf'
      )
    )
  );

  const buffer = await buildInformePdfBuffer(pedido);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, buffer);

  console.log(`✓ PDF generado (${buffer.length} bytes)`);
  console.log(`  Empresa: ${empresa.nombre} (#${empresa.id})`);
  console.log(`  Reclamos: ${snapshot.total}`);
  console.log(`  Causas: ${snapshot.porCausa.length}`);
  console.log(`  ${outPath}`);

  if (flag('open')) {
    const cmd =
      process.platform === 'win32'
        ? `start "" "${outPath}"`
        : process.platform === 'darwin'
          ? `open "${outPath}"`
          : `xdg-open "${outPath}"`;
    exec(cmd);
    console.log('✓ Abierto');
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
