import type { ReclamoSearchStats } from '@/types/reclamos-search';

export type InformeEstado = 'pending_payment' | 'paid' | 'ready' | 'failed';

export type InformeCausaCount = {
  causa: string;
  count: number;
};

/** Snapshot del informe pago: total + causas (+ síntesis IA opcional). */
export type InformeStatsSnapshot = {
  total: number;
  rangoFechas: { desde: string | null; hasta: string | null };
  porCausa: InformeCausaCount[];
  sintesis?: string | null;
  temas?: string[] | null;
};

export type PublicEmpresaStats = {
  empresaId: number;
  empresaNombre: string;
  empresaCuit?: string | null;
  stats: Pick<ReclamoSearchStats, 'total' | 'rangoFechas'>;
  cachedAt: string;
};

export type InformePedido = {
  id: string;
  codigo: string;
  empresaId: number;
  empresaNombre: string;
  email: string;
  precioCents: number;
  moneda: 'ARS';
  estado: InformeEstado;
  statsSnapshot: InformeStatsSnapshot;
  mpPreferenceId?: string | null;
  mpPaymentId?: string | null;
  mpStatus?: string | null;
  pdfPath?: string | null;
  pdfHash?: string | null;
  pdfBytes?: number | null;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
  paidAt?: string | null;
  readyAt?: string | null;
};

export type InformeVerificacionPublica = {
  valido: boolean;
  codigo: string;
  empresaNombre: string;
  empresaId: number;
  emitidoAt: string;
  totalReclamos: number;
  rangoFechas: { desde: string | null; hasta: string | null };
  pdfHash: string | null;
  /** URL pública del PDF (inline) para embeber en la verificación. */
  pdfUrl: string | null;
  emisor: string;
  disclaimer: string;
};
