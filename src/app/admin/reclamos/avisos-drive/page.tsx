'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ExternalLink, Loader2 } from 'lucide-react';
import type { DriveChangeAlert, DrivePollingState } from '@/types/drive-watch';

export default function AdminAvisosDrivePage() {
  const [alerts, setAlerts] = useState<DriveChangeAlert[]>([]);
  const [polling, setPolling] = useState<DrivePollingState | null>(null);
  const [status, setStatus] = useState<'open' | 'closed' | 'all'>('open');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/drive-alerts?status=${status}`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al cargar');
      setAlerts(data.alerts || []);
      setPolling(data.polling || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los avisos');
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  async function mark(alertId: string, next: 'ignored' | 'reviewed') {
    setBusyId(alertId);
    try {
      const res = await fetch('/api/admin/drive-alerts', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: alertId, status: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo actualizar');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Avisos de Drive</h1>
        <p className="mt-1 max-w-2xl text-slate-500">
          Cambios en expedientes vinculados que el filtro local marcó como relevantes (hitos de
          estado o datos del caso). Revisalos juntos, sin mirar archivos sin movimiento.
        </p>
        {polling?.lastPolledAt ? (
          <p className="mt-2 text-xs text-slate-400">
            Último chequeo: {new Date(polling.lastPolledAt).toLocaleString('es-AR')} · procesados{' '}
            {polling.filesProcessed ?? '—'} · avisos nuevos {polling.alertsCreated ?? 0}
          </p>
        ) : (
          <p className="mt-2 text-xs text-amber-700">
            Todavía no hubo corridas. En el servidor:{' '}
            <code className="rounded bg-amber-50 px-1">npm run drive:watch:bootstrap</code> y luego{' '}
            <code className="rounded bg-amber-50 px-1">npm run drive:watch</code>.
          </p>
        )}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {(
          [
            ['open', 'Pendientes'],
            ['closed', 'Cerrados'],
            ['all', 'Todos'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setStatus(value)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              status === value
                ? 'bg-[#1a5fb4] text-white'
                : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-[#1a5fb4]" />
        </div>
      ) : alerts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-lg font-semibold text-slate-800">No hay avisos</p>
          <p className="mt-2 text-sm text-slate-500">
            Cuando el watcher detecte cambios relevantes, aparecen acá.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {alerts.map((alert) => (
            <article
              key={alert.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        alert.tier === 'high'
                          ? 'bg-red-50 text-red-700'
                          : 'bg-amber-50 text-amber-800'
                      }`}
                    >
                      {alert.tier === 'high' ? 'Alta' : 'Media'} · score {alert.relevanceScore}
                    </span>
                    <Link
                      href={`/admin/reclamos/${alert.reclamoId}`}
                      className="text-sm font-semibold text-[#1a5fb4] hover:underline"
                    >
                      Reclamo #{alert.reclamoId}
                    </Link>
                  </div>
                  <h2 className="mt-1 text-base font-semibold text-slate-900">{alert.fileName}</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Detectado {alert.detectedAt ? new Date(alert.detectedAt).toLocaleString('es-AR') : '—'}
                    {alert.lastActivityAt && alert.lastActivityAt !== alert.detectedAt
                      ? ` · última actividad ${new Date(alert.lastActivityAt).toLocaleString('es-AR')}`
                      : ''}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {alert.driveUrl ? (
                    <a
                      href={alert.driveUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      Ver en Drive <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  ) : null}
                  {(alert.status === 'open' || alert.status === 'needs_review') && (
                    <>
                      <button
                        type="button"
                        disabled={busyId === alert.id}
                        onClick={() => void mark(alert.id, 'ignored')}
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                      >
                        Ignorar
                      </button>
                      <button
                        type="button"
                        disabled={busyId === alert.id}
                        onClick={() => void mark(alert.id, 'reviewed')}
                        className="rounded-lg bg-[#1a5fb4] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#164e94] disabled:opacity-50"
                      >
                        Marcar revisado
                      </button>
                    </>
                  )}
                </div>
              </div>

              {alert.matchedSignals.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {alert.matchedSignals.map((signal) => (
                    <span
                      key={signal}
                      className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
                    >
                      {signal}
                    </span>
                  ))}
                </div>
              ) : null}

              {alert.diffSnippet ? (
                <pre className="mt-3 max-h-48 overflow-auto rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-slate-700 whitespace-pre-wrap">
                  {alert.diffSnippet}
                </pre>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
