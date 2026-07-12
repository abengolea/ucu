'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { textMatchesQuery } from '@/lib/text-search';
import type { ReclamoAdminBandeja, ReclamoResponsable } from '@/types/reclamos';

export type AdminReclamoListItem = {
  id: number;
  nombre: string;
  resumen: string;
  hecho?: string;
  estadoDescripcion?: string;
  idGrupoEstado?: number;
  adminBandeja?: ReclamoAdminBandeja;
  responsable?: ReclamoResponsable | null;
  createdAt: string;
  otrasEmpresas?: string;
  empresas: { id: number; nombre: string; cuit?: string | null }[];
};

type BandejaCounts = Record<ReclamoAdminBandeja, number>;

type AdminReclamosListProps = {
  mode: 'all' | 'assigned';
  title: string;
  description: string;
  emptyTitle: string;
  emptyDescription: string;
};

const tabs: { id: ReclamoAdminBandeja | 'todos'; label: string }[] = [
  { id: 'recibidos', label: 'Recibidos' },
  { id: 'gestion', label: 'En gestión' },
  { id: 'archivados', label: 'Archivados' },
  { id: 'todos', label: 'Todos' },
];

function grupoBadgeClass(idGrupoEstado?: number): string {
  if (idGrupoEstado === 3) return 'bg-slate-100 text-slate-700';
  if (idGrupoEstado === 2) return 'bg-purple-100 text-purple-800';
  return 'bg-sky-100 text-sky-800';
}

export function AdminReclamosList({
  mode,
  title,
  description,
  emptyTitle,
  emptyDescription,
}: AdminReclamosListProps) {
  const [bandeja, setBandeja] = useState<ReclamoAdminBandeja | 'todos'>(
    mode === 'assigned' ? 'todos' : 'recibidos'
  );
  const [reclamos, setReclamos] = useState<AdminReclamoListItem[]>([]);
  const [counts, setCounts] = useState<BandejaCounts>({ recibidos: 0, gestion: 0, archivados: 0 });
  const [assignedCount, setAssignedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        bandeja: mode === 'assigned' ? 'todos' : bandeja,
      });
      if (mode === 'assigned') params.set('asignado', 'mi');

      const res = await fetch(`/api/admin/reclamos?${params.toString()}`, { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
      setReclamos(data.reclamos || []);
      setCounts(data.counts || { recibidos: 0, gestion: 0, archivados: 0 });
      setAssignedCount(Number(data.assignedCount) || 0);
    } catch (err) {
      setReclamos([]);
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los reclamos');
    } finally {
      setLoading(false);
    }
  }, [mode, bandeja]);

  useEffect(() => {
    load();
  }, [load]);

  const assignedSource = mode === 'assigned' ? reclamos : [];
  const bandejaCounts =
    mode === 'assigned'
      ? {
          recibidos: assignedSource.filter((item) => item.adminBandeja === 'recibidos').length,
          gestion: assignedSource.filter((item) => item.adminBandeja === 'gestion').length,
          archivados: assignedSource.filter((item) => item.adminBandeja === 'archivados').length,
        }
      : counts;

  const visibleReclamos =
    mode === 'assigned' && bandeja !== 'todos'
      ? reclamos.filter((item) => item.adminBandeja === bandeja)
      : reclamos;

  const filtered = visibleReclamos.filter((item) => {
    if (!query.trim()) return true;
    const empresas = item.empresas
      .map((e) => `${e.cuit ?? ''} ${e.nombre}`)
      .join(' ');
    const haystack = [
      item.id,
      item.nombre,
      item.resumen,
      item.hecho ?? '',
      item.estadoDescripcion ?? '',
      empresas,
      item.otrasEmpresas ?? '',
      item.responsable?.name ?? '',
    ].join(' ');
    return textMatchesQuery(haystack, query);
  });

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
          <p className="mt-1 text-slate-500">
            {description}
            {mode === 'all' && counts.recibidos > 0 ? (
              <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                {counts.recibidos} sin asignar
              </span>
            ) : null}
            {mode === 'assigned' && assignedCount > 0 ? (
              <span className="ml-2 rounded-full bg-[#1a5fb4]/10 px-2 py-0.5 text-xs font-semibold text-[#1a5fb4]">
                {assignedCount} asignados a vos
              </span>
            ) : null}
          </p>
        </div>
        {mode === 'all' ? (
          <Link
            href="/reclamos/nuevo"
            target="_blank"
            className="rounded-lg bg-[#2d8f47] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1f6b31]"
          >
            Ver formulario público
          </Link>
        ) : null}
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {tabs.map((item) => {
          const count =
            item.id === 'todos'
              ? bandejaCounts.recibidos + bandejaCounts.gestion + bandejaCounts.archivados
              : bandejaCounts[item.id];
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setBandeja(item.id)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                bandeja === item.id
                  ? 'bg-[#1a5fb4] text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {item.label}
              <span className="ml-2 text-xs opacity-80">({count})</span>
            </button>
          );
        })}
      </div>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar por número, nombre, empresa o resumen…"
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
          <p className="text-lg font-semibold text-slate-800">{emptyTitle}</p>
          <p className="mt-2 text-sm text-slate-500">{emptyDescription}</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full table-fixed text-left text-sm">
            <colgroup>
              <col className="w-[72px]" />
              <col className="w-[160px]" />
              <col className="w-[120px]" />
              <col />
              <col className="w-[100px]" />
              {mode === 'all' ? <col className="w-[120px]" /> : null}
              <col className="w-[96px]" />
              <col className="w-[88px]" />
            </colgroup>
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Nº</th>
                <th className="px-4 py-3 font-semibold">Denunciante</th>
                <th className="px-4 py-3 font-semibold">Empresa</th>
                <th className="px-4 py-3 font-semibold">Hechos</th>
                <th className="px-4 py-3 font-semibold">Estado</th>
                {mode === 'all' ? (
                  <th className="px-4 py-3 font-semibold">Responsable</th>
                ) : null}
                <th className="px-4 py-3 font-semibold">Fecha</th>
                <th className="px-4 py-3 font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((reclamo) => (
                <tr key={reclamo.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/80">
                  <td className="px-4 py-3 align-top font-medium text-slate-900">{reclamo.id}</td>
                  <td className="px-4 py-3 align-top text-slate-700">{reclamo.nombre}</td>
                  <td className="truncate px-4 py-3 align-top text-slate-600" title={reclamo.empresas[0]?.nombre}>
                    {reclamo.empresas[0]?.nombre ?? '—'}
                  </td>
                  <td className="px-4 py-3 align-top text-slate-700">
                    {reclamo.resumen ? (
                      <p className="mb-1 text-xs font-semibold text-slate-500">{reclamo.resumen}</p>
                    ) : null}
                    <p className="whitespace-pre-wrap leading-relaxed">{reclamo.hecho || '—'}</p>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${grupoBadgeClass(reclamo.idGrupoEstado)}`}
                    >
                      {reclamo.estadoDescripcion ?? 'Consulta'}
                    </span>
                  </td>
                  {mode === 'all' ? (
                    <td className="px-4 py-3 align-top text-slate-600">
                      {reclamo.responsable?.name ?? (
                        <span className="text-amber-700">Sin asignar</span>
                      )}
                    </td>
                  ) : null}
                  <td className="px-4 py-3 align-top text-slate-500">
                    {new Date(reclamo.createdAt).toLocaleDateString('es-AR')}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <Link
                      href={`/admin/reclamos/${reclamo.id}`}
                      className="font-semibold text-[#1a5fb4] hover:underline"
                    >
                      {mode === 'assigned' || reclamo.adminBandeja !== 'recibidos'
                        ? 'Gestionar'
                        : 'Tomar'}
                    </Link>
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
