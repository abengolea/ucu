'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { textMatchesQuery } from '@/lib/text-search';
import type { ReclamoCausaCatalog } from '@/types/reclamos';

export default function AdminReclamosCausasPage() {
  const [causas, setCausas] = useState<ReclamoCausaCatalog[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/admin/reclamos/causas', { credentials: 'include' })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error al cargar');
        if (!cancelled) setCausas(data.causas || []);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'No se pudieron cargar las causas');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = causas.filter((causa) =>
    textMatchesQuery(`${causa.id} ${causa.descripcion}`, query)
  );

  const activas = filtered.filter((causa) => causa.activo).length;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Causas de reclamos</h1>
        <p className="mt-1 text-slate-500">
          Catálogo de motivos de reclamo sincronizado desde el sistema legacy.
          {!loading && causas.length > 0 ? (
            <span className="ml-2 text-xs text-slate-400">
              {activas} activas de {filtered.length} mostradas
            </span>
          ) : null}
        </p>
      </div>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar por ID o descripción…"
        className="mb-4 w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#1a5fb4]"
      />

      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-[#1a5fb4]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-lg font-semibold text-slate-800">No hay causas para mostrar</p>
          <p className="mt-2 text-sm text-slate-500">
            Ejecutá la sincronización de catálogos si el listado está vacío.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">ID</th>
                <th className="px-4 py-3 font-semibold">Descripción</th>
                <th className="px-4 py-3 font-semibold">Estado</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((causa) => (
                <tr key={causa.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/80">
                  <td className="px-4 py-3 font-medium text-slate-900">{causa.id}</td>
                  <td className="px-4 py-3 text-slate-700">{causa.descripcion}</td>
                  <td className="px-4 py-3">
                    {causa.activo ? (
                      <span className="rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                        Activa
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-500">
                        Inactiva
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
