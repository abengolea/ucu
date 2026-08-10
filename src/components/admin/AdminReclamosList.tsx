'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Archive, Loader2 } from 'lucide-react';
import { useAdminUser } from '@/components/admin/AdminAuth';
import type {
  ReclamoAdminBandeja,
  ReclamoCiudad,
  ReclamoProvincia,
  ReclamoResponsable,
} from '@/types/reclamos';

export type AdminReclamoListItem = {
  id: number;
  nombre: string;
  provinciaId?: number | null;
  ciudadId?: number | null;
  ciudadNombre?: string | null;
  provinciaNombre?: string | null;
  resumen: string;
  hecho?: string;
  estadoDescripcion?: string;
  idGrupoEstado?: number;
  adminBandeja?: ReclamoAdminBandeja;
  responsable?: ReclamoResponsable | null;
  createdAt: string;
  empresas: { id: number; nombre: string; cuit?: string | null }[];
};

function formatLocalidad(reclamo: AdminReclamoListItem): string {
  const ciudad = reclamo.ciudadNombre?.trim();
  const provincia = reclamo.provinciaNombre?.trim();
  if (ciudad && provincia) return `${ciudad}, ${provincia}`;
  return ciudad || provincia || '—';
}

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
  const user = useAdminUser();
  const canWriteReclamos = user.permissions.includes('reclamos:write');
  const writeScopeAll = user.reclamosWriteScope === 'all';

  const [bandeja, setBandeja] = useState<ReclamoAdminBandeja | 'todos'>(
    mode === 'assigned' ? 'todos' : 'recibidos'
  );
  const [responsableInput, setResponsableInput] = useState('');
  const [responsableQuery, setResponsableQuery] = useState('');
  const [provinciaId, setProvinciaId] = useState('');
  const [ciudadId, setCiudadId] = useState('');
  const [provincias, setProvincias] = useState<ReclamoProvincia[]>([]);
  const [ciudades, setCiudades] = useState<ReclamoCiudad[]>([]);
  const [reclamos, setReclamos] = useState<AdminReclamoListItem[]>([]);
  const [counts, setCounts] = useState<BandejaCounts>({ recibidos: 0, gestion: 0, archivados: 0 });
  const [assignedCount, setAssignedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [archivingId, setArchivingId] = useState<number | null>(null);

  const filterByResponsable = mode === 'all' && Boolean(responsableQuery);
  const filterByLocation = Boolean(provinciaId) || Boolean(ciudadId);
  const apiBandeja: ReclamoAdminBandeja | 'todos' =
    mode === 'assigned' || filterByResponsable || filterByLocation ? 'todos' : bandeja;

  useEffect(() => {
    if (mode !== 'all') return;
    const handle = window.setTimeout(() => {
      const next = responsableInput.trim();
      setResponsableQuery(next);
    }, 300);
    return () => window.clearTimeout(handle);
  }, [responsableInput, mode]);

  useEffect(() => {
    if (responsableQuery && bandeja === 'recibidos') {
      setBandeja('todos');
    }
  }, [responsableQuery, bandeja]);

  useEffect(() => {
    if (filterByLocation && bandeja === 'recibidos') {
      setBandeja('todos');
    }
  }, [filterByLocation, bandeja]);

  useEffect(() => {
    fetch('/api/reclamos/catalogos/provincias')
      .then((res) => (res.ok ? res.json() : []))
      .then((data: ReclamoProvincia[]) => setProvincias(Array.isArray(data) ? data : []))
      .catch(() => setProvincias([]));
  }, []);

  useEffect(() => {
    if (!provinciaId) {
      setCiudades([]);
      setCiudadId('');
      return;
    }
    setCiudadId('');
    fetch(`/api/reclamos/catalogos/ciudades?idProvincia=${encodeURIComponent(provinciaId)}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data: ReclamoCiudad[]) => setCiudades(Array.isArray(data) ? data : []))
      .catch(() => setCiudades([]));
  }, [provinciaId]);

  function canArchiveReclamo(reclamo: AdminReclamoListItem): boolean {
    if (!canWriteReclamos || reclamo.adminBandeja === 'archivados') return false;
    if (writeScopeAll) return true;
    const email = reclamo.responsable?.email?.toLowerCase();
    return Boolean(email && email === user.email.toLowerCase());
  }

  async function handleArchivar(reclamo: AdminReclamoListItem) {
    const esDuplicado = window.confirm(
      `¿Archivar el reclamo #${reclamo.id} de ${reclamo.nombre}?\n\nSe moverá a la bandeja Archivados. Usá esto para duplicados o reclamos que no corresponde gestionar.`
    );
    if (!esDuplicado) return;

    setArchivingId(reclamo.id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/reclamos/${reclamo.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          archivar: true,
          motivo: 'Reclamo archivado — duplicado o sin gestión',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo archivar');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo archivar el reclamo');
    } finally {
      setArchivingId(null);
    }
  }

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ bandeja: apiBandeja });
      if (mode === 'assigned') {
        params.set('asignado', 'mi');
      } else if (responsableQuery) {
        params.set('responsable', responsableQuery);
      }
      if (provinciaId) params.set('provinciaId', provinciaId);
      if (ciudadId) params.set('ciudadId', ciudadId);

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
  }, [mode, apiBandeja, responsableQuery, provinciaId, ciudadId]);

  useEffect(() => {
    load();
  }, [load]);

  const clientBandejaSource =
    mode === 'assigned' || filterByResponsable || filterByLocation ? reclamos : [];
  const bandejaCounts =
    mode === 'assigned' || filterByResponsable || filterByLocation
      ? {
          recibidos: clientBandejaSource.filter((item) => item.adminBandeja === 'recibidos').length,
          gestion: clientBandejaSource.filter((item) => item.adminBandeja === 'gestion').length,
          archivados: clientBandejaSource.filter((item) => item.adminBandeja === 'archivados')
            .length,
        }
      : counts;

  const visibleReclamos =
    (mode === 'assigned' || filterByResponsable || filterByLocation) && bandeja !== 'todos'
      ? reclamos.filter((item) => item.adminBandeja === bandeja)
      : reclamos;

  const filtered = visibleReclamos.filter((item) => {
    const empresas = item.empresas.map((e) => e.nombre).join(' ');
    const haystack =
      `${item.id} ${item.nombre} ${formatLocalidad(item)} ${item.resumen} ${item.hecho ?? ''} ${item.estadoDescripcion ?? ''} ${empresas} ${item.responsable?.name ?? ''}`.toLowerCase();
    return haystack.includes(query.toLowerCase());
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

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por número, nombre, empresa o resumen…"
          className="w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#1a5fb4]"
        />
        <label className="flex w-full max-w-[200px] flex-col gap-1 text-sm text-slate-600">
          <span className="font-semibold text-slate-700">Provincia</span>
          <select
            value={provinciaId}
            onChange={(e) => setProvinciaId(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#1a5fb4]"
          >
            <option value="">Todas</option>
            {provincias.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="flex w-full max-w-[200px] flex-col gap-1 text-sm text-slate-600">
          <span className="font-semibold text-slate-700">Ciudad</span>
          <select
            value={ciudadId}
            onChange={(e) => setCiudadId(e.target.value)}
            disabled={!provinciaId}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#1a5fb4] disabled:bg-slate-50"
          >
            <option value="">{provinciaId ? 'Todas' : 'Elegí provincia…'}</option>
            {ciudades.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </label>
        {mode === 'all' ? (
          <label className="flex w-full max-w-xs flex-col gap-1 text-sm text-slate-600">
            <span className="font-semibold text-slate-700">Responsable</span>
            <input
              value={responsableInput}
              onChange={(e) => setResponsableInput(e.target.value)}
              placeholder="Ej. bengolea, sin asignar…"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#1a5fb4]"
            />
          </label>
        ) : null}
        {filterByLocation ? (
          <button
            type="button"
            onClick={() => {
              setProvinciaId('');
              setCiudadId('');
            }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Limpiar ubicación
          </button>
        ) : null}
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
              <col className="w-[150px]" />
              <col className="w-[160px]" />
              <col className="w-[120px]" />
              <col />
              <col className="w-[100px]" />
              {mode === 'all' ? <col className="w-[120px]" /> : null}
              <col className="w-[96px]" />
              <col className="w-[120px]" />
            </colgroup>
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Nº</th>
                <th className="px-4 py-3 font-semibold">Denunciante</th>
                <th className="px-4 py-3 font-semibold">Localidad</th>
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
                  <td className="px-4 py-3 align-top text-slate-600">
                    <span className="whitespace-normal break-words">{formatLocalidad(reclamo)}</span>
                  </td>
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
                    <div className="flex flex-col gap-1.5">
                      <Link
                        href={`/admin/reclamos/${reclamo.id}`}
                        className="font-semibold text-[#1a5fb4] hover:underline"
                      >
                        {mode === 'assigned' || reclamo.adminBandeja !== 'recibidos'
                          ? 'Gestionar'
                          : 'Tomar'}
                      </Link>
                      {canArchiveReclamo(reclamo) ? (
                        <button
                          type="button"
                          onClick={() => handleArchivar(reclamo)}
                          disabled={archivingId === reclamo.id}
                          className="flex items-center gap-1 text-left text-xs font-semibold text-slate-500 hover:text-slate-800 disabled:opacity-60"
                        >
                          {archivingId === reclamo.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Archive className="h-3 w-3" />
                          )}
                          Archivar
                        </button>
                      ) : null}
                    </div>
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
