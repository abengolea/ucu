'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';

type StatusPayload = {
  pedidoId: string;
  codigo: string;
  estado: string;
  empresaNombre: string;
  downloadUrl: string | null;
  verifyUrl: string;
  errorMessage?: string | null;
};

export function PagoStatusClient() {
  const params = useSearchParams();
  const status = params.get('status') || 'pending';
  const pedidoId = params.get('pedido') || '';
  const paymentId = params.get('payment_id') || params.get('collection_id') || '';

  const [data, setData] = useState<StatusPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [polling, setPolling] = useState(true);

  useEffect(() => {
    if (!pedidoId) {
      setError('Falta el identificador del pedido.');
      setPolling(false);
      return;
    }

    let cancelled = false;
    let attempts = 0;

    async function tick() {
      attempts += 1;
      try {
        const qs = paymentId ? `?payment_id=${encodeURIComponent(paymentId)}` : '';
        const res = await fetch(`/api/informes/status/${encodeURIComponent(pedidoId)}${qs}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'No se pudo consultar el pedido');
        if (cancelled) return;
        setData(json as StatusPayload);
        if (json.estado === 'ready' || json.estado === 'failed' || attempts >= 20) {
          setPolling(false);
          return;
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Error');
          if (attempts >= 5) setPolling(false);
        }
      }
    }

    tick();
    const id = setInterval(() => {
      if (!cancelled) tick();
    }, 2500);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [pedidoId, paymentId]);

  const failed = status === 'failure' || data?.estado === 'failed';
  const ready = data?.estado === 'ready';

  return (
    <div className="space-y-6">
      {failed ? (
        <div className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-5">
          <XCircle className="h-6 w-6 shrink-0 text-red-600" />
          <div>
            <h2 className="font-display text-lg font-bold text-red-900">Pago no completado</h2>
            <p className="mt-1 font-serif text-sm text-red-800">
              {data?.errorMessage ||
                'Podés volver a intentar desde la búsqueda de estadísticas.'}
            </p>
          </div>
        </div>
      ) : ready ? (
        <div className="flex gap-3 rounded-xl border border-green-200 bg-green-50 p-5">
          <CheckCircle2 className="h-6 w-6 shrink-0 text-green-700" />
          <div className="space-y-3">
            <h2 className="font-display text-lg font-bold text-green-900">Informe listo</h2>
            <p className="font-serif text-sm text-green-900">
              Código <strong className="font-display">{data.codigo}</strong> —{' '}
              {data.empresaNombre}
            </p>
            <div className="flex flex-wrap gap-3">
              {data.downloadUrl ? (
                <a href={data.downloadUrl} className="ucu-btn-primary">
                  Descargar PDF
                </a>
              ) : null}
              <Link href={data.verifyUrl} className="ucu-btn-secondary">
                Ver certificado
              </Link>
            </div>
            <p className="font-serif text-xs text-green-800">
              También te enviamos el link por email.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-5">
          <Loader2 className="h-6 w-6 shrink-0 animate-spin text-ucu-blue" />
          <div>
            <h2 className="font-display text-lg font-bold text-[var(--ink)]">
              {status === 'pending' ? 'Pago pendiente' : 'Confirmando pago…'}
            </h2>
            <p className="mt-1 font-serif text-sm text-[var(--ink-muted)]">
              {polling
                ? 'Estamos generando tu informe certificado. Esto puede tardar unos segundos.'
                : 'Si el pago ya se acreditó, revisá tu email o volvé a esta página en un momento.'}
            </p>
            {data?.codigo ? (
              <p className="mt-2 font-display text-sm text-[var(--ink)]">
                Código: {data.codigo}
              </p>
            ) : null}
          </div>
        </div>
      )}

      {error ? (
        <p className="font-serif text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      <Link href="/reclamos/estadisticas" className="ucu-btn-ghost inline-flex">
        ← Volver a estadísticas
      </Link>
    </div>
  );
}
