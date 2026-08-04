'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { FileText, Loader2, Search, Sparkles } from 'lucide-react';
import { useAdminUser } from '@/components/admin/AdminAuth';
import type { ReclamoSearchHit, ReclamoSearchStats } from '@/types/reclamos-search';

type IndexMeta = {
  indexedAt: string | null;
  count: number;
  geminiConfigured: boolean;
};

export default function ContestacionOficiosPage() {
  const user = useAdminUser();
  const canWrite = user.permissions.includes('reclamos:write');

  const [meta, setMeta] = useState<IndexMeta | null>(null);
  const [instruction, setInstruction] = useState('');
  const [empresaQuery, setEmpresaQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [soloArchivados, setSoloArchivados] = useState(false);

  const [searching, setSearching] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [interpretacion, setInterpretacion] = useState<string | null>(null);
  const [hits, setHits] = useState<ReclamoSearchHit[]>([]);
  const [stats, setStats] = useState<ReclamoSearchStats | null>(null);
  const [truncated, setTruncated] = useState(false);

  const [borrador, setBorrador] = useState('');

  const loadMeta = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/reclamos/contestacion/buscar', { credentials: 'include' });
      const data = await res.json();
      if (res.ok) setMeta(data);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    loadMeta();
  }, [loadMeta]);

  async function handleSearch(event: React.FormEvent) {
    event.preventDefault();
    setSearching(true);
    setError(null);
    setBorrador('');
    setInterpretacion(null);
    setHits([]);
    setStats(null);

    try {
      const res = await fetch('/api/admin/reclamos/contestacion/buscar', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instruction,
          empresaQuery: empresaQuery.trim() || undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          idGrupoEstado: soloArchivados ? 3 : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`);

      setInterpretacion(data.interpretacion ?? null);
      setHits(data.hits ?? []);
      setStats(data.stats ?? null);
      setTruncated(Boolean(data.truncated));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setSearching(false);
    }
  }

  async function handleGenerateBorrador() {
    if (!canWrite || !stats || !hits.length) return;
    setGenerating(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/reclamos/contestacion/borrador', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instruction,
          interpretacion,
          stats,
          hits,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
      setBorrador(data.borrador ?? '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div>
      <div className="mb-8">
        <Link href="/admin/reclamos" className="text-sm font-semibold text-[#1a5fb4] hover:underline">
          ← Reclamos
        </Link>
        <div className="mt-3 flex flex-wrap items-start gap-3">
          <div className="rounded-lg bg-[#1a5fb4]/10 p-2.5 text-[#1a5fb4]">
            <FileText className="h-6 w-6" strokeWidth={1.75} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Contestación de oficios</h1>
            <p className="mt-1 max-w-2xl text-slate-500">
              Describí qué reclamos necesitás localizar. La IA interpreta la consigna, busca en el
              índice y puede redactar un borrador de respuesta formal (texto editable).
            </p>
          </div>
        </div>
      </div>

      {meta && (
        <div className="mb-6 flex flex-wrap gap-3 text-sm">
          <span
            className={`rounded-full px-3 py-1 font-medium ${
              meta.count > 0 ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
            }`}
          >
            Índice: {meta.count.toLocaleString('es-AR')} reclamos
            {meta.indexedAt
              ? ` · actualizado ${format(new Date(meta.indexedAt), "d MMM yyyy HH:mm", { locale: es })}`
              : ' · sin indexar'}
          </span>
          {meta.geminiConfigured ? (
            <span className="rounded-full bg-sky-100 px-3 py-1 font-medium text-sky-800">
              Gemini configurado
            </span>
          ) : null}
        </div>
      )}

      {meta?.count === 0 && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          El índice está vacío. En la terminal del proyecto ejecutá:{' '}
          <code className="rounded bg-amber-100 px-1">npm run build:reclamos-index</code>
        </div>
      )}

      <form onSubmit={handleSearch} className="mb-8 space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-slate-800">
            Instrucción para la IA
          </span>
          <textarea
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            rows={4}
            placeholder="Ej.: Todos los reclamos contra Mercado Libre por incumplimiento de entrega entre 2022 y 2024, incluyendo archivados…"
            className="field-input min-h-28"
          />
        </label>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Empresa (opcional)</span>
            <input
              className="field-input"
              value={empresaQuery}
              onChange={(e) => setEmpresaQuery(e.target.value)}
              placeholder="Nombre comercial…"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Desde</span>
            <input
              type="date"
              className="field-input"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Hasta</span>
            <input
              type="date"
              className="field-input"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </label>
          <label className="flex items-end gap-2 pb-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={soloArchivados}
              onChange={(e) => setSoloArchivados(e.target.checked)}
              className="rounded border-slate-300"
            />
            Solo archivados
          </label>
        </div>

        <button
          type="submit"
          disabled={
            searching ||
            (!empresaQuery.trim() && !instruction.trim()) ||
            (Boolean(instruction.trim()) && !empresaQuery.trim() && !meta?.geminiConfigured)
          }
          className="inline-flex items-center gap-2 rounded-lg bg-[#1a5fb4] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#004a80] disabled:opacity-60"
        >
          {searching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          {searching ? 'Buscando…' : 'Buscar reclamos'}
        </button>
      </form>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {interpretacion && (
        <div className="mb-6 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
          <strong>Interpretación:</strong> {interpretacion}
        </div>
      )}

      {stats && (
        <section className="mb-8">
          <h2 className="mb-4 text-lg font-bold text-slate-900">
            Resultados ({stats.total.toLocaleString('es-AR')} reclamos)
            {truncated ? ' — mostrando los primeros 500' : ''}
          </h2>

          <div className="mb-4 flex flex-wrap gap-2">
            {Object.entries(stats.porEstado).map(([estado, count]) => (
              <span key={estado} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                {estado}: {count}
              </span>
            ))}
          </div>

          {hits.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-600">
              No se encontraron reclamos con esos criterios.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Nº</th>
                    <th className="px-4 py-3 font-semibold">Empresa</th>
                    <th className="px-4 py-3 font-semibold">Resumen</th>
                    <th className="px-4 py-3 font-semibold">Estado</th>
                    <th className="px-4 py-3 font-semibold">Fecha</th>
                    <th className="px-4 py-3 font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {hits.slice(0, 100).map((hit) => (
                    <tr key={hit.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/80">
                      <td className="px-4 py-3 font-medium">{hit.id}</td>
                      <td className="max-w-[200px] truncate px-4 py-3" title={hit.empresaNombres.join(', ')}>
                        {hit.empresaNombres.join(', ') || '—'}
                      </td>
                      <td className="max-w-xs truncate px-4 py-3" title={hit.resumen}>
                        {hit.resumen}
                      </td>
                      <td className="px-4 py-3">{hit.estadoDescripcion}</td>
                      <td className="px-4 py-3 text-slate-500">
                        {format(new Date(hit.createdAt), 'd MMM yyyy', { locale: es })}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/reclamos/${hit.id}`}
                          className="font-semibold text-[#1a5fb4] hover:underline"
                        >
                          Ver
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {hits.length > 100 && (
                <p className="border-t border-slate-100 px-4 py-2 text-xs text-slate-500">
                  Mostrando 100 de {hits.length} en pantalla.
                </p>
              )}
            </div>
          )}

          {canWrite && hits.length > 0 && (
            <button
              type="button"
              onClick={handleGenerateBorrador}
              disabled={generating}
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#2d8f47] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1f6b31] disabled:opacity-60"
            >
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {generating ? 'Generando borrador…' : 'Generar borrador de contestación'}
            </button>
          )}
        </section>
      )}

      {(borrador || generating) && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-2 text-lg font-bold text-slate-900">Borrador de contestación</h2>
          <p className="mb-4 text-sm text-slate-500">
            Texto editable. Revisá cifras y redacción antes de usar en un oficio oficial.
          </p>
          <textarea
            value={borrador}
            onChange={(e) => setBorrador(e.target.value)}
            rows={18}
            className="field-input min-h-80 font-serif leading-relaxed"
            placeholder={generating ? 'Generando…' : ''}
            disabled={generating}
          />
        </section>
      )}
    </div>
  );
}
