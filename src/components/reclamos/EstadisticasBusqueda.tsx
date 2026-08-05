'use client';

import { useEffect, useRef, useState } from 'react';
import { FileText, Loader2, Search, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

type EmpresaHit = { id: number; nombre: string; cuit: string | null };

type StatsResult = {
  empresaId: number;
  empresaNombre: string;
  total: number;
  rangoFechas: { desde: string | null; hasta: string | null };
  mensaje: string;
  informe: {
    disponible: boolean;
    precioCents: number;
    precioLabel: string;
    pagosConfigurados: boolean;
    requiereMinimo: number;
    incluye?: string;
  };
};

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return y && m && d ? `${d}/${m}/${y}` : iso;
}

export function EstadisticasBusqueda() {
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<EmpresaHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<StatsResult | null>(null);
  const [email, setEmail] = useState('');
  const [showCheckout, setShowCheckout] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setHits([]);
      setSearching(false);
      return;
    }

    const t = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setSearching(true);
      setError(null);

      try {
        const res = await fetch(`/api/estadisticas/buscar?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'No se pudo buscar');
        setHits(Array.isArray(data) ? data : []);
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Error de búsqueda');
        setHits([]);
      } finally {
        setSearching(false);
      }
    }, 350);

    return () => {
      clearTimeout(t);
      abortRef.current?.abort();
    };
  }, [query]);

  async function selectEmpresa(empresa: EmpresaHit) {
    setQuery(empresa.nombre);
    setHits([]);
    setLoadingStats(true);
    setError(null);
    setStats(null);
    setShowCheckout(false);

    try {
      const res = await fetch(`/api/estadisticas/empresa/${empresa.id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudieron cargar las estadísticas');
      setStats(data as StatsResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setLoadingStats(false);
    }
  }

  async function startCheckout(event: React.FormEvent) {
    event.preventDefault();
    if (!stats) return;
    setCheckoutLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/informes/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ empresaId: stats.empresaId, email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo iniciar el pago');
      if (!data.initPoint) throw new Error('Mercado Pago no devolvió URL de pago');
      window.location.href = data.initPoint as string;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar el pago');
      setCheckoutLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="relative">
        <label className="block">
          <span className="mb-2 block font-display text-sm font-semibold text-[var(--ink)]">
            Buscar empresa
          </span>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ink-faint)]" />
            <input
              className="field-input w-full pl-10"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setStats(null);
                setShowCheckout(false);
              }}
              placeholder="Ej. Telecom, Edenor, Banco…"
              autoComplete="off"
              spellCheck={false}
            />
            {searching ? (
              <Loader2 className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-ucu-blue" />
            ) : null}
          </div>
        </label>

        {hits.length > 0 ? (
          <ul
            className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] shadow-lg"
            role="listbox"
          >
            {hits.map((hit) => (
              <li key={hit.id}>
                <button
                  type="button"
                  className="flex w-full flex-col items-start gap-0.5 px-4 py-3 text-left transition hover:bg-[var(--surface-muted)]"
                  onClick={() => selectEmpresa(hit)}
                >
                  <span className="font-display text-sm font-semibold text-[var(--ink)]">
                    {hit.nombre}
                  </span>
                  {hit.cuit ? (
                    <span className="font-serif text-xs text-[var(--ink-muted)]">CUIT {hit.cuit}</span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {loadingStats ? (
        <div className="flex items-center justify-center gap-2 py-12 text-ucu-blue">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="font-display text-sm font-medium">Consultando reclamos…</span>
        </div>
      ) : null}

      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 font-serif text-sm text-red-800"
        >
          {error}
        </div>
      ) : null}

      {stats ? (
        <section className="space-y-6 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-6 md:p-8">
          <div>
            <p className="ucu-eyebrow mb-2">Resultado</p>
            <h2 className="font-display text-2xl font-bold tracking-tight text-[var(--ink)]">
              {stats.mensaje}
            </h2>
            {stats.total > 0 ? (
              <p className="mt-2 font-serif text-sm text-[var(--ink-muted)]">
                Período observado: {formatDate(stats.rangoFechas.desde)} —{' '}
                {formatDate(stats.rangoFechas.hasta)}
              </p>
            ) : null}
          </div>

          {stats.total > 0 ? (
            <div className="rounded-lg bg-[var(--surface-muted)] px-5 py-4">
              <p className="font-display text-[0.65rem] font-bold uppercase tracking-[0.12em] text-[var(--ink-faint)]">
                Reclamos registrados
              </p>
              <p className="mt-1 font-display text-3xl font-bold text-[var(--ink)]">{stats.total}</p>
              <p className="mt-2 font-serif text-sm text-[var(--ink-muted)]">
                El informe pago incluye el desglose por causas tipificadas y una lectura
                clara para el consumidor.
              </p>
            </div>
          ) : null}

          {stats.total > 0 ? (
            <div className="border-t border-[var(--border)] pt-6">
              {!showCheckout ? (
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex gap-3">
                    <div className="mt-0.5 text-ucu-magenta">
                      <FileText className="h-5 w-5" strokeWidth={1.75} />
                    </div>
                    <div>
                      <p className="font-display text-sm font-bold text-[var(--ink)]">
                        ¿Querés el informe oficial?
                      </p>
                      <p className="mt-1 max-w-md font-serif text-sm text-[var(--ink-muted)]">
                        PDF con causas tipificadas, lectura para el consumidor y código
                        verificable en ucu.org.ar
                        {stats.informe.pagosConfigurados
                          ? ` — ${stats.informe.precioLabel}`
                          : ''}
                        .
                      </p>
                    </div>
                  </div>
                  {stats.informe.disponible ? (
                    <button
                      type="button"
                      className="ucu-btn-primary shrink-0"
                      onClick={() => setShowCheckout(true)}
                    >
                      Emitir informe
                    </button>
                  ) : (
                    <p className="font-serif text-sm text-[var(--ink-muted)]">
                      {stats.informe.pagosConfigurados
                        ? 'Informe no disponible para este resultado.'
                        : 'Pagos en configuración. Pronto podrás emitir el informe online.'}
                    </p>
                  )}
                </div>
              ) : (
                <form onSubmit={startCheckout} className="space-y-4">
                  <p className="font-display text-sm font-bold text-[var(--ink)]">
                    Te enviamos el PDF a tu email después del pago ({stats.informe.precioLabel})
                  </p>
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-[var(--ink)]">Email</span>
                    <input
                      type="email"
                      required
                      className="field-input w-full max-w-md"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="tu@email.com"
                    />
                  </label>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="submit"
                      disabled={checkoutLoading}
                      className="ucu-btn-primary disabled:opacity-60"
                    >
                      {checkoutLoading ? 'Redirigiendo a Mercado Pago…' : 'Pagar con Mercado Pago'}
                    </button>
                    <button
                      type="button"
                      className="ucu-btn-ghost"
                      onClick={() => setShowCheckout(false)}
                      disabled={checkoutLoading}
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : null}

          <p className="flex items-start gap-2 font-serif text-xs leading-relaxed text-[var(--ink-muted)]">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ucu-green" />
            Estadística de reclamos recibidos por UCU. No constituye sentencia ni determina
            responsabilidad legal.
          </p>
        </section>
      ) : null}

      <p className="font-serif text-sm text-[var(--ink-muted)]">
        ¿Ya tenés un informe?{' '}
        <Link href="/verificar" className="font-display font-semibold text-ucu-blue hover:underline">
          Validá el código acá
        </Link>
        .
      </p>
    </div>
  );
}
