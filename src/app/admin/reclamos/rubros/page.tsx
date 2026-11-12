'use client';

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useAdminUser } from '@/components/admin/AdminAuth';
import { RequirePermission } from '@/components/admin/AdminPermissionGuard';
import type { ReclamoRubro } from '@/types/reclamos';

type EstadoFiltro = 'todos' | 'activos' | 'inactivos';
type FormState = {
  descripcion: string;
  activo: boolean;
};

const EMPTY_FORM: FormState = { descripcion: '', activo: true };

export default function AdminReclamosRubrosPage() {
  const user = useAdminUser();
  const canWrite = user.permissions.includes('reclamos:write');
  const [rubros, setRubros] = useState<ReclamoRubro[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoFiltro>('todos');
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const descripcionRef = useRef<HTMLInputElement>(null);

  async function loadRubros(options: { silent?: boolean } = {}) {
    if (!options.silent) setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/reclamos/rubros', { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al cargar');
      setRubros(Array.isArray(data.rubros) ? data.rubros : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los rubros');
    } finally {
      if (!options.silent) setLoading(false);
    }
  }

  useEffect(() => {
    loadRubros();
  }, []);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
    setError(null);
  }

  function openEdit(rubro: ReclamoRubro) {
    setEditingId(rubro.id);
    setForm({ descripcion: rubro.descripcion, activo: rubro.activo !== false });
    setShowForm(true);
    setError(null);
  }

  function closeForm() {
    if (saving) return;
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  useEffect(() => {
    if (!showForm) return;
    descripcionRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !saving) closeForm();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showForm, saving]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canWrite) return;
    setSaving(true);
    setError(null);

    try {
      const url =
        editingId != null ? `/api/admin/reclamos/rubros/${editingId}` : '/api/admin/reclamos/rubros';
      const res = await fetch(url, {
        method: editingId != null ? 'PUT' : 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          descripcion: form.descripcion,
          activo: form.activo,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar');
      setShowForm(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
      await loadRubros({ silent: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(rubro: ReclamoRubro) {
    if (!canWrite) return;
    const count = rubro.causasCount ?? 0;
    const confirmed = window.confirm(
      count
        ? `¿Eliminar el rubro «${rubro.descripcion}»?\n${count} causa${count === 1 ? '' : 's'} conservan este nombre hasta que las reasignes.`
        : `¿Eliminar el rubro «${rubro.descripcion}»?`
    );
    if (!confirmed) return;

    setDeletingId(rubro.id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/reclamos/rubros/${rubro.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al eliminar');
      if (editingId === rubro.id) {
        setShowForm(false);
        setEditingId(null);
        setForm(EMPTY_FORM);
      }
      await loadRubros({ silent: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar');
    } finally {
      setDeletingId(null);
    }
  }

  const filtered = useMemo(() => {
    const haystackQuery = query.trim().toLowerCase();
    return rubros
      .filter((rubro) => {
        if (estadoFiltro === 'activos' && !rubro.activo) return false;
        if (estadoFiltro === 'inactivos' && rubro.activo) return false;
        if (!haystackQuery) return true;
        return `${rubro.id} ${rubro.descripcion}`.toLowerCase().includes(haystackQuery);
      })
      .sort((a, b) => {
        if (Boolean(a.activo) !== Boolean(b.activo)) return a.activo === false ? 1 : -1;
        const byCausas = (b.causasCount ?? 0) - (a.causasCount ?? 0);
        if (byCausas) return byCausas;
        return a.descripcion.localeCompare(b.descripcion, 'es');
      });
  }, [rubros, query, estadoFiltro]);

  const activos = rubros.filter((rubro) => rubro.activo).length;
  const inactivos = rubros.length - activos;

  return (
    <RequirePermission permission="reclamos:read">
      <div>
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Rubros de reclamos</h1>
            <p className="mt-1 text-slate-500">
              Agrupan las causas. Si cambiás el nombre, se actualiza en todas las causas de ese rubro.
            </p>
            {!loading && rubros.length > 0 ? (
              <p className="mt-1 text-xs text-slate-400">
                {activos} activos · {inactivos} inactivos · {rubros.length} en total
                {filtered.length !== rubros.length ? ` · ${filtered.length} mostrados` : ''}
              </p>
            ) : null}
          </div>
          {canWrite ? (
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-[#1a5fb4] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#134a8a]"
            >
              <Plus className="h-4 w-4" />
              Nuevo rubro
            </button>
          ) : null}
        </div>

        {error ? (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {showForm && canWrite ? (
          <form
            onSubmit={handleSubmit}
            className="mb-6 rounded-2xl border border-slate-200 bg-white p-5"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {editingId != null ? `Editar rubro #${editingId}` : 'Nuevo rubro'}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Los rubros inactivos quedan en el catálogo pero no se ofrecen al tipificar causas.
                </p>
              </div>
              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-60"
                aria-label="Cerrar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="rubro-descripcion">
                Nombre
              </label>
              <input
                ref={descripcionRef}
                id="rubro-descripcion"
                required
                maxLength={120}
                value={form.descripcion}
                onChange={(e) => setForm((current) => ({ ...current, descripcion: e.target.value }))}
                className="w-full max-w-2xl rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#1a5fb4]"
                placeholder="Ej. Bancos, tarjetas y fraudes"
              />
            </div>
            <label className="mt-4 flex w-fit cursor-pointer items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.activo}
                onChange={(e) => setForm((current) => ({ ...current, activo: e.target.checked }))}
                className="rounded border-slate-300 text-[#1a5fb4] focus:ring-[#1a5fb4]"
              />
              Rubro activo
            </label>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={saving || !form.descripcion.trim()}
                className="rounded-lg bg-[#2d8f47] px-5 py-2 text-sm font-semibold text-white hover:bg-[#1f6b31] disabled:opacity-60"
              >
                {saving ? 'Guardando…' : editingId != null ? 'Guardar cambios' : 'Crear rubro'}
              </button>
              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                className="rounded-lg border border-slate-200 px-5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
              >
                Cancelar
              </button>
            </div>
          </form>
        ) : null}

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por ID o nombre…"
            className="w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#1a5fb4]"
          />
          <div className="flex rounded-lg border border-slate-200 bg-white p-0.5 text-sm">
            {(
              [
                { id: 'todos', label: 'Todos' },
                { id: 'activos', label: 'Activos' },
                { id: 'inactivos', label: 'Inactivos' },
              ] as const
            ).map((filtro) => (
              <button
                key={filtro.id}
                type="button"
                onClick={() => setEstadoFiltro(filtro.id)}
                className={`rounded-md px-3 py-1.5 font-medium ${
                  estadoFiltro === filtro.id
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {filtro.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-[#1a5fb4]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <p className="text-lg font-semibold text-slate-800">No hay rubros para mostrar</p>
            <p className="mt-2 text-sm text-slate-500">
              {rubros.length === 0
                ? 'Creá el primer rubro para agrupar las causas de reclamo.'
                : 'Probá con otra búsqueda o cambiá el filtro de estado.'}
            </p>
            {canWrite && rubros.length === 0 ? (
              <button
                type="button"
                onClick={openCreate}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#1a5fb4] px-4 py-2 text-sm font-semibold text-white hover:bg-[#134a8a]"
              >
                <Plus className="h-4 w-4" />
                Nuevo rubro
              </button>
            ) : null}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">ID</th>
                  <th className="px-4 py-3 font-semibold">Nombre</th>
                  <th className="px-4 py-3 font-semibold">Causas</th>
                  <th className="px-4 py-3 font-semibold">Estado</th>
                  {canWrite ? (
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Acciones</th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {filtered.map((rubro) => (
                  <tr
                    key={rubro.id}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50/80"
                  >
                    <td className="px-4 py-3 font-medium text-slate-900">{rubro.id}</td>
                    <td className="px-4 py-3 text-slate-700">
                      <span>{rubro.descripcion}</span>
                      {rubro.source === 'admin' ? (
                        <span className="ml-2 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-[#1a5fb4]">
                          Editado acá
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      {(rubro.causasCount ?? 0) > 0 ? (
                        <Link
                          href={`/admin/reclamos/causas?rubro=${encodeURIComponent(rubro.descripcion)}`}
                          className="font-medium text-[#1a5fb4] hover:underline"
                        >
                          {rubro.causasCount}
                        </Link>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {rubro.activo ? (
                        <span className="rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                          Activo
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-500">
                          Inactivo
                        </span>
                      )}
                    </td>
                    {canWrite ? (
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(rubro)}
                            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[#1a5fb4] hover:bg-blue-50"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(rubro)}
                            disabled={deletingId === rubro.id}
                            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-red-600 hover:bg-red-50 disabled:opacity-60"
                          >
                            {deletingId === rubro.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                            Eliminar
                          </button>
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </RequirePermission>
  );
}
