import 'server-only';

import { createHash, randomBytes } from 'node:crypto';
import { getAdminDb } from '@/lib/firebase-admin';
import type {
  InformeEstado,
  InformePedido,
  InformeStatsSnapshot,
  InformeVerificacionPublica,
} from '@/types/informes';

const COLLECTION = 'informes_pedidos';

function dbOrThrow() {
  const db = getAdminDb();
  if (!db) throw new Error('Firebase Admin no configurado.');
  return db;
}

export function generateInformeCodigo(): string {
  const raw = randomBytes(5).toString('hex').toUpperCase();
  return `UCU-${raw.slice(0, 4)}-${raw.slice(4, 8)}`;
}

export async function createInformePedido(input: {
  empresaId: number;
  empresaNombre: string;
  email: string;
  precioCents: number;
  statsSnapshot: InformeStatsSnapshot;
}): Promise<InformePedido> {
  const db = dbOrThrow();
  const now = new Date().toISOString();
  const ref = db.collection(COLLECTION).doc();
  const pedido: InformePedido = {
    id: ref.id,
    codigo: generateInformeCodigo(),
    empresaId: input.empresaId,
    empresaNombre: input.empresaNombre,
    email: input.email.trim().toLowerCase(),
    precioCents: input.precioCents,
    moneda: 'ARS',
    estado: 'pending_payment',
    statsSnapshot: input.statsSnapshot,
    createdAt: now,
    updatedAt: now,
  };
  await ref.set(pedido);
  return pedido;
}

export async function getInformeById(id: string): Promise<InformePedido | null> {
  const db = dbOrThrow();
  const snap = await db.collection(COLLECTION).doc(id).get();
  if (!snap.exists) return null;
  return snap.data() as InformePedido;
}

export async function getInformeByCodigo(codigo: string): Promise<InformePedido | null> {
  const db = dbOrThrow();
  const normalized = codigo.trim().toUpperCase();
  const snap = await db.collection(COLLECTION).where('codigo', '==', normalized).limit(1).get();
  if (snap.empty) return null;
  return snap.docs[0].data() as InformePedido;
}

export async function getInformeByPdfHash(pdfHash: string): Promise<InformePedido | null> {
  const db = dbOrThrow();
  const normalized = pdfHash.trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(normalized)) return null;
  const snap = await db.collection(COLLECTION).where('pdfHash', '==', normalized).limit(1).get();
  if (snap.empty) return null;
  return snap.docs[0].data() as InformePedido;
}

export async function getInformeByPreferenceId(
  preferenceId: string
): Promise<InformePedido | null> {
  const db = dbOrThrow();
  const snap = await db
    .collection(COLLECTION)
    .where('mpPreferenceId', '==', preferenceId)
    .limit(1)
    .get();
  if (snap.empty) return null;
  return snap.docs[0].data() as InformePedido;
}

export async function getInformeByPaymentId(paymentId: string): Promise<InformePedido | null> {
  const db = dbOrThrow();
  const snap = await db
    .collection(COLLECTION)
    .where('mpPaymentId', '==', paymentId)
    .limit(1)
    .get();
  if (snap.empty) return null;
  return snap.docs[0].data() as InformePedido;
}

export async function updateInformePedido(
  id: string,
  patch: Partial<InformePedido>
): Promise<InformePedido> {
  const db = dbOrThrow();
  const ref = db.collection(COLLECTION).doc(id);
  const updatedAt = new Date().toISOString();
  await ref.set({ ...patch, updatedAt }, { merge: true });
  const snap = await ref.get();
  return snap.data() as InformePedido;
}

export function toVerificacionPublica(pedido: InformePedido): InformeVerificacionPublica {
  const ready = pedido.estado === 'ready' && Boolean(pedido.pdfHash);
  const pdfUrl = ready
    ? `/api/informes/download/${encodeURIComponent(pedido.codigo)}?inline=1`
    : null;
  return {
    valido: ready,
    codigo: pedido.codigo,
    empresaNombre: pedido.empresaNombre,
    empresaId: pedido.empresaId,
    emitidoAt: pedido.readyAt || pedido.paidAt || pedido.updatedAt,
    totalReclamos: pedido.statsSnapshot.total,
    rangoFechas: pedido.statsSnapshot.rangoFechas,
    pdfHash: ready ? pedido.pdfHash ?? null : null,
    pdfUrl,
    emisor: 'Usuarios y Consumidores Unidos (UCU)',
    disclaimer:
      'Documento estadístico de reclamos recibidos por UCU. No constituye sentencia judicial ni determina responsabilidad legal.',
  };
}

export function hashPdfBuffer(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

export function isTerminalEstado(estado: InformeEstado): boolean {
  return estado === 'ready' || estado === 'failed';
}
