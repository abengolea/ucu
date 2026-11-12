'use client';

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useAdminUser } from '@/components/admin/AdminAuth';
import { RequirePermission } from '@/components/admin/AdminPermissionGuard';
import type { ReclamoCausaCatalog } from '@/types/reclamos';

type EstadoFiltro = 'todas' | 'activas' | 'inactivas';
type FormState = {
  descripcion: string;
  activo: boolean;
};

const EMPTY_FORM: FormState = { descripcion: '', activo: true };

export default function AdminReclamosCausasPage() {
  const user = useAdminUser();
  const canWrite = user.permissions.includes('reclamos:write');
  const [causas, setCausas] = useState<ReclamoCausaCatalog[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoFiltro>('todas');
  const [rubroFiltro, setRubroFiltro] = useState('todos');
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const descripcionRef = useRef<HTMLInputElement>(null);

  async function loadCausas(options: { silent?: boolean } = {}) {
    if (!options.silent) setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/reclamos/causas', { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al cargar');
      setCausas(Array.isArray(data.causas) ? data.causas : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar las causas');
    } finally {
      if (!options.silent) setLoading(false);
    }
  }

  useEffect(() => {
    loadCausas();
  }, []);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
    setError(null);
  }

  function openEdit(causa: ReclamoCausaCatalog) {
    setEditingId(causa.id);
    setForm({ descripcion: causa.descripcion, activo: causa.activo !== false });
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
        editingId != null ? `/api/admin/reclamos/causas/${editingId}` : '/api/admin/reclamos/causas';
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
      await loadCausas({ silent: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(causa: ReclamoCausaCatalog) {
    if (!canWrite) return;
    const confirmed = window.confirm(
      `¿Eliminar la causa «${causa.descripcion}»?\nLos reclamos ya tipificados conservan este motivo.`
    );
    if (!confirmed) return;

    setDeletingId(causa.id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/reclamos/causas/${causa.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al eliminar');
      if (editingId === causa.id) {
        setShowForm(false);
        setEditingId(null);
        setForm(EMPTY_FORM);
      }
      await loadCausas({ silent: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar');
    } finally {
      setDeletingId(null);
    }
  }

  const rubros = useMemo(() => {
    const names = new Set<string>();
    for (const causa of causas) {
      if (causa.rubro?.trim()) names.add(causa.rubro.trim());
    }
    return [...names].sort((a, b) => a.localeCompare(b, 'es'));
  }, [causas]);

  const filtered = useMemo(() => {
    const haystackQuery = query.trim().toLowerCase();
    return causas.filter((causa) => {
      if (estadoFiltro === 'activas' && !causa.activo) return false;
      if (estadoFiltro === 'inactivas' && causa.activo) return false;
      if (rubroFiltro === 'sin-rubro' && causa.rubro?.trim()) return false;
      if (rubroFiltro !== 'todos' && rubroFiltro !== 'sin-rubro' && causa.rubro !== rubroFiltro) {
        return false;
      }
      if (!haystackQuery) return true;
      const keywords = (causa.keywords ?? []).join(' ');
      return `${causa.id} ${causa.descripcion} ${causa.rubro ?? ''} ${keywords}`
        .toLowerCase()
        .includes(haystackQuery);
    });
  }, [causas, query, estadoFiltro, rubroFiltro]);

  const activas = causas.filter((causa) => causa.activo).length;
  const inactivas = causas.length - activas;

  return (
    <RequirePermission permission="reclamos:read">
      <div>
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Causas de reclamos</h1>
            <p className="mt-1 text-slate-500">
              Motivos para tipificar reclamos. Podés agregar, editar o dar de baja cada causa.
            </p>
            {!loading && causas.length > 0 ? (
              <p className="mt-1 text-xs text-slate-400">
                {activas} activas · {inactivas} inactivas · {causas.length} en total
                {filtered.length !== causas.length ? ` · ${filtered.length} mostradas` : ''}
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
              Nueva causa
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
                  {editingId != null ? `Editar causa #${editingId}` : 'Nueva causa'}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Las causas inactivas quedan en el catálogo pero no se ofrecen al tipificar.
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
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="causa-descripcion">
                Descripción
              </label>
              <input
                ref={descripcionRef}
                id="causa-descripcion"
                required
                maxLength={200}
                value={form.descripcion}
                onChange={(e) => setForm((current) => ({ ...current, descripcion: e.target.value }))}
                className="w-full max-w-2xl rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#1a5fb4]"
                placeholder="Ej. Incumplimiento de garantía"
              />
            </div>
            <label className="mt-4 flex w-fit cursor-pointer items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.activo}
                onChange={(e) => setForm((current) => ({ ...current, activo: e.target.checked }))}
                className="rounded border-slate-300 text-[#1a5fb4] focus:ring-[#1a5fb4]"
              />
              Causa activa
            </label>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={saving || !form.descripcion.trim()}
                className="rounded-lg bg-[#2d8f47] px-5 py-2 text-sm font-semibold text-white hover:bg-[#1f6b31] disabled:opacity-60"
              >
                {saving ? 'Guardando…' : editingId != null ? 'Guardar cambios' : 'Crear causa'}
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
            placeholder="Buscar por ID, descripción, rubro o palabras clave…"
            className="w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#1a5fb4]"
          />
          {rubros.length ? (
            <select
              value={rubroFiltro}
              onChange={(e) => setRubroFiltro(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#1a5fb4]"
            >
              <option value="todos">Todos los rubros</option>
              <option value="sin-rubro">Catálogo original</option>
              {rubros.map((rubro) => (
                <option key={rubro} value={rubro}>
                  {rubro}
                </option>
              ))}
            </select>
          ) : null}
          <div className="flex rounded-lg border border-slate-200 bg-white p-0.5 text-sm">
            {(
              [
                { id: 'todas', label: 'Todas' },
                { id: 'activas', label: 'Activas' },
                { id: 'inactivas', label: 'Inactivas' },
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
            <p className="text-lg font-semibold text-slate-800">No hay causas para mostrar</p>
            <p className="mt-2 text-sm text-slate-500">
              {causas.length === 0
                ? 'Creá la primera causa o ejecutá la sincronización de catálogos si el listado está vacío.'
                : 'Probá con otra búsqueda o cambiá el filtro de estado o rubro.'}
            </p>
            {canWrite && causas.length === 0 ? (
              <button
                type="button"
                onClick={openCreate}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#1a5fb4] px-4 py-2 text-sm font-semibold text-white hover:bg-[#134a8a]"
              >
                <Plus className="h-4 w-4" />
                Nueva causa
              </button>
            ) : null}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full min-w-[880px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">ID</th>
                  <th className="px-4 py-3 font-semibold">Descripción</th>
                  <th className="px-4 py-3 font-semibold">Rubro</th>
                  <th className="px-4 py-3 font-semibold">Estado</th>
                  {canWrite ? (
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Acciones</th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {filtered.map((causa) => (
                  <tr
                    key={causa.id}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50/80"
                  >
                    <td className="px-4 py-3 font-medium text-slate-900">{causa.id}</td>
                    <td className="px-4 py-3 text-slate-700">
                      <span>{causa.descripcion}</span>
                      {causa.source === 'admin' ? (
                        <span className="ml-2 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-[#1a5fb4]">
                          Editada acá
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {causa.rubro?.trim() ? causa.rubro : '—'}
                    </td>
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
                    {canWrite ? (
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(causa)}
                            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[#1a5fb4] hover:bg-blue-50"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(causa)}
                            disabled={deletingId === causa.id}
                            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-red-600 hover:bg-red-50 disabled:opacity-60"
                          >
                            {deletingId === causa.id ? (
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
