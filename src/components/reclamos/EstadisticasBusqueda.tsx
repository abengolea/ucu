'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type EmpresaHit = { id: number; nombre: string; cuit: string | null };

export function EstadisticasBusqueda() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<EmpresaHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
              onChange={(e) => setQuery(e.target.value)}
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
                  onClick={() => router.push(`/empresas/${hit.id}`)}
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

      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 font-serif text-sm text-red-800"
        >
          {error}
        </div>
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
