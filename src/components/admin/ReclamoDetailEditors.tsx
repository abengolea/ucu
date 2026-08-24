'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Pencil, X, Check } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type {
  ReclamoDatosUpdate,
  ReclamoDelegado,
  ReclamoProvincia,
  ReclamoCiudad,
  StoredReclamoDocument,
} from '@/types/reclamos';

type EmpresaOption = { id: number; nombre: string; cuit?: string | null };

async function fetchCatalog<T>(resource: string, params?: Record<string, string>): Promise<T> {
  const search = new URLSearchParams(params);
  const qs = search.toString();
  const res = await fetch(`/api/reclamos/catalogos/${resource}${qs ? `?${qs}` : ''}`);
  if (!res.ok) throw new Error('Catálogo no disponible');
  return res.json();
}

function Panel({
  title,
  canEdit,
  editing,
  onEdit,
  onCancel,
  children,
}: {
  title: string;
  canEdit: boolean;
  editing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
        {canEdit && !editing ? (
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#1a5fb4] hover:bg-[#1a5fb4]/5"
          >
            <Pencil className="h-3.5 w-3.5" />
            Editar
          </button>
        ) : null}
        {editing ? (
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100"
          >
            <X className="h-3.5 w-3.5" />
            Cancelar
          </button>
        ) : null}
      </div>
      {children}
    </div>
  );
}

function SaveBar({
  saving,
  error,
  onSave,
}: {
  saving: boolean;
  error: string | null;
  onSave: () => void;
}) {
  return (
    <div className="mt-4 border-t border-slate-100 pt-4">
      {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}
      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="inline-flex items-center gap-2 rounded-lg bg-[#1a5fb4] px-4 py-2 text-sm font-semibold text-white hover:bg-[#004a80] disabled:opacity-60"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
        {saving ? 'Guardando…' : 'Guardar cambios'}
      </button>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <p className="text-sm text-slate-700">
      <strong>{label}:</strong> {value}
    </p>
  );
}

function FieldInput({
  label,
  value,
  onChange,
  type = 'text',
  maxLength,
  rows,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  maxLength?: number;
  rows?: number;
}) {
  const className = 'field-input mt-1';
  return (
    <label className="block text-sm text-slate-700">
      <span className="font-semibold">{label}</span>
      {rows ? (
        <textarea
          className={className}
          rows={rows}
          maxLength={maxLength}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          className={className}
          type={type}
          maxLength={maxLength}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </label>
  );
}

type EditorProps = {
  reclamoId: string;
  canWrite: boolean;
  onUpdated: (reclamo: StoredReclamoDocument) => void;
};

export function ReclamoResponsableCard({
  reclamo,
  delegados,
  canWrite,
  canDecideAsignacion = false,
  reclamoId,
  onUpdated,
}: EditorProps & {
  reclamo: StoredReclamoDocument;
  delegados: ReclamoDelegado[];
  canDecideAsignacion?: boolean;
}) {
  const pendiente = reclamo.asignacionPendiente ?? null;
  const [selectedEmail, setSelectedEmail] = useState(
    reclamo.asignacionPendiente?.email ?? reclamo.responsable?.email ?? ''
  );
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deciding, setDeciding] = useState(false);
  const [rejectMotivo, setRejectMotivo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const selectedDelegado = useMemo(
    () => delegados.find((d) => d.email === selectedEmail) ?? null,
    [delegados, selectedEmail]
  );

  const filteredDelegados = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return delegados;
    return delegados.filter(
      (d) => d.name.toLowerCase().includes(q) || d.email.toLowerCase().includes(q)
    );
  }, [delegados, query]);

  useEffect(() => {
    setSelectedEmail(pendiente?.email ?? reclamo.responsable?.email ?? '');
    setQuery('');
    setOpen(false);
  }, [reclamo.responsable?.email, pendiente?.email]);

  function selectDelegado(delegado: ReclamoDelegado) {
    setSelectedEmail(delegado.email);
    setQuery(`${delegado.name} (${delegado.email})`);
    setOpen(false);
  }

  async function handleReasignar() {
    if (!selectedEmail) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/admin/reclamos/${reclamoId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reasignarEmail: selectedEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo reasignar');
      if (data.reclamo) onUpdated(data.reclamo);
      if (typeof data.emailError === 'string' && data.emailError) {
        setError(data.emailError);
      } else if (data.reclamo?.asignacionPendiente?.email) {
        setNotice(
          `Se envió un mail a ${data.reclamo.asignacionPendiente.email} para que acepte el caso.`
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setSaving(false);
    }
  }

  async function patchAsignacion(body: Record<string, unknown>) {
    setDeciding(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/admin/reclamos/${reclamoId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo actualizar la asignación');
      if (data.reclamo) onUpdated(data.reclamo);
      if (typeof data.emailError === 'string' && data.emailError) {
        setError(data.emailError);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setDeciding(false);
    }
  }

  const pendingEmail = pendiente?.email ?? '';
  const isResend = Boolean(pendiente && selectedEmail && selectedEmail === pendingEmail);
  const changed =
    isResend ||
    (selectedEmail !== (reclamo.responsable?.email ?? '') && selectedEmail !== pendingEmail);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-lg font-bold text-slate-900">Responsable</h2>

      {pendiente ? (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">Espera aceptación</p>
          <p className="mt-1 font-semibold text-slate-900">{pendiente.name}</p>
          <p className="text-sm text-slate-500">{pendiente.email}</p>
          <p className="mt-2 text-xs text-slate-500">
            Propuesto por {pendiente.proposedByName} el{' '}
            {format(new Date(pendiente.proposedAt), "d MMM yyyy HH:mm", { locale: es })}
          </p>
          {reclamo.responsable ? (
            <p className="mt-2 text-xs text-slate-600">
              Responsable actual (sigue vigente hasta que se acepte):{' '}
              <strong>{reclamo.responsable.name}</strong>
            </p>
          ) : null}

          {canDecideAsignacion ? (
            <div className="mt-4 space-y-3 border-t border-amber-200 pt-3">
              <p className="text-sm text-amber-900">
                Te asignaron este caso. Aceptalo para tomarlo o rechazalo para devolverlo al equipo.
              </p>
              <textarea
                value={rejectMotivo}
                onChange={(e) => setRejectMotivo(e.target.value)}
                rows={2}
                placeholder="Motivo del rechazo (opcional)…"
                className="field-input w-full"
              />
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => patchAsignacion({ aceptarAsignacion: true })}
                  disabled={deciding}
                  className="w-full rounded-lg bg-[#2d8f47] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1f6b31] disabled:opacity-50"
                >
                  {deciding ? 'Guardando…' : 'Aceptar caso'}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    patchAsignacion({
                      rechazarAsignacion: true,
                      motivo: rejectMotivo.trim() || undefined,
                    })
                  }
                  disabled={deciding}
                  className="w-full rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                >
                  Rechazar asignación
                </button>
              </div>
            </div>
          ) : null}

          {canWrite && !canDecideAsignacion ? (
            <button
              type="button"
              onClick={() => patchAsignacion({ cancelarAsignacion: true })}
              disabled={deciding}
              className="mt-3 w-full rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-white disabled:opacity-50"
            >
              {deciding ? 'Cancelando…' : 'Cancelar propuesta'}
            </button>
          ) : null}
        </div>
      ) : reclamo.responsable ? (
        <div className="mb-4">
          <p className="font-semibold text-slate-900">{reclamo.responsable.name}</p>
          <p className="text-sm text-slate-500">{reclamo.responsable.email}</p>
          <p className="mt-2 text-xs text-slate-500">
            Asignado el{' '}
            {format(new Date(reclamo.responsable.assignedAt), "d MMM yyyy HH:mm", { locale: es })}
          </p>
        </div>
      ) : (
        <p className="mb-4 text-sm text-amber-700">
          Sin responsable. Podés asignar un delegado abajo o usar &quot;Iniciar gestión&quot; para
          tomarlo vos.
        </p>
      )}

      {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}
      {notice ? <p className="mb-3 text-sm text-emerald-700">{notice}</p> : null}

      {canWrite && delegados.length > 0 ? (
        <div className="border-t border-slate-100 pt-4">
          <label className="block text-sm font-semibold text-slate-700">
            {pendiente || reclamo.responsable ? 'Reasignar a' : 'Asignar a'}
            <div className="relative mt-1">
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setOpen(true);
                  if (!e.target.value.trim()) setSelectedEmail('');
                }}
                onFocus={() => setOpen(true)}
                onBlur={() => {
                  window.setTimeout(() => setOpen(false), 150);
                }}
                placeholder="Escribí nombre o email para buscar…"
                className="field-input w-full"
                autoComplete="off"
              />
              {open ? (
                <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                  {filteredDelegados.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-slate-500">Sin resultados</p>
                  ) : (
                    filteredDelegados.map((d) => {
                      const active = d.email === selectedEmail;
                      return (
                        <button
                          key={d.email}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => selectDelegado(d)}
                          className={`block w-full border-b border-slate-100 px-4 py-2.5 text-left text-sm last:border-0 hover:bg-slate-50 ${
                            active ? 'bg-[#1a5fb4]/5 font-semibold text-[#1a5fb4]' : 'text-slate-700'
                          }`}
                        >
                          <span className="block">{d.name}</span>
                          <span className="block text-xs text-slate-500">{d.email}</span>
                        </button>
                      );
                    })
                  )}
                </div>
              ) : null}
            </div>
          </label>
          {selectedDelegado && query ? (
            <p className="mt-2 text-xs text-slate-500">
              Seleccionado: <strong>{selectedDelegado.name}</strong>
            </p>
          ) : null}
          <p className="mt-2 text-xs text-slate-500">
            Al asignar se envía un mail al delegado para que acepte o rechace. Mientras tanto el
            caso queda en &quot;Espera aceptación&quot; y también te avisamos por email cuando
            decida.
          </p>
          <button
            type="button"
            onClick={handleReasignar}
            disabled={!selectedEmail || !changed || saving || deciding}
            className="mt-3 w-full rounded-lg border border-[#1a5fb4] px-4 py-2 text-sm font-semibold text-[#1a5fb4] hover:bg-[#1a5fb4]/5 disabled:opacity-50"
          >
            {saving
              ? isResend
                ? 'Reenviando mail…'
                : 'Asignando…'
              : isResend
                ? 'Reenviar mail al delegado'
                : pendiente || reclamo.responsable
                  ? 'Proponer reasignación'
                  : 'Asignar caso'}
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function ReclamoDenuncianteSection({ reclamo, canWrite, reclamoId, onUpdated }: EditorProps & { reclamo: StoredReclamoDocument }) {
  const d = reclamo.denunciante;
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [provincias, setProvincias] = useState<ReclamoProvincia[]>([]);
  const [ciudades, setCiudades] = useState<ReclamoCiudad[]>([]);
  const [form, setForm] = useState({
    nombre: d.nombre,
    apellido: d.apellido,
    tipoDocumento: d.tipoDocumento,
    numeroDocumento: d.numeroDocumento,
    calle: d.calle ?? '',
    numero: d.numero ?? '',
    piso: d.piso ?? '',
    depto: d.depto ?? '',
    provinciaId: String(d.provinciaId),
    ciudadId: String(d.ciudadId),
    telefono: d.telefono,
    email: d.email,
  });

  const resetForm = useCallback(() => {
    setForm({
      nombre: d.nombre,
      apellido: d.apellido,
      tipoDocumento: d.tipoDocumento,
      numeroDocumento: d.numeroDocumento,
      calle: d.calle ?? '',
      numero: d.numero ?? '',
      piso: d.piso ?? '',
      depto: d.depto ?? '',
      provinciaId: String(d.provinciaId),
      ciudadId: String(d.ciudadId),
      telefono: d.telefono,
      email: d.email,
    });
  }, [d]);

  useEffect(() => {
    if (!editing) resetForm();
  }, [editing, resetForm]);

  useEffect(() => {
    if (!editing) return;
    fetchCatalog<ReclamoProvincia[]>('provincias').then(setProvincias).catch(() => setProvincias([]));
  }, [editing]);

  useEffect(() => {
    if (!editing || !form.provinciaId) return;
    fetchCatalog<ReclamoCiudad[]>('ciudades', { idProvincia: form.provinciaId })
      .then(setCiudades)
      .catch(() => setCiudades([]));
  }, [editing, form.provinciaId]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    const datos: ReclamoDatosUpdate = {
      denunciante: {
        nombre: form.nombre,
        apellido: form.apellido,
        tipoDocumento: form.tipoDocumento,
        numeroDocumento: form.numeroDocumento,
        calle: form.calle,
        numero: form.numero,
        piso: form.piso,
        depto: form.depto,
        provinciaId: Number(form.provinciaId),
        ciudadId: Number(form.ciudadId),
        telefono: form.telefono,
        email: form.email,
      },
    };
    try {
      const res = await fetch(`/api/admin/reclamos/${reclamoId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ datos }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo guardar');
      if (data.reclamo) onUpdated(data.reclamo);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Panel
      title="Denunciante"
      canEdit={canWrite}
      editing={editing}
      onEdit={() => setEditing(true)}
      onCancel={() => { setEditing(false); setError(null); }}
    >
      {editing ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <FieldInput label="Nombre" value={form.nombre} onChange={(v) => setForm((f) => ({ ...f, nombre: v }))} />
          <FieldInput label="Apellido" value={form.apellido} onChange={(v) => setForm((f) => ({ ...f, apellido: v }))} />
          <FieldInput label="Tipo doc." value={form.tipoDocumento} onChange={(v) => setForm((f) => ({ ...f, tipoDocumento: v }))} />
          <FieldInput label="Nº documento" value={form.numeroDocumento} onChange={(v) => setForm((f) => ({ ...f, numeroDocumento: v }))} />
          <FieldInput label="Calle" value={form.calle} onChange={(v) => setForm((f) => ({ ...f, calle: v }))} />
          <FieldInput label="Número" value={form.numero} onChange={(v) => setForm((f) => ({ ...f, numero: v }))} />
          <FieldInput label="Piso" value={form.piso} onChange={(v) => setForm((f) => ({ ...f, piso: v }))} />
          <FieldInput label="Depto" value={form.depto} onChange={(v) => setForm((f) => ({ ...f, depto: v }))} />
          <label className="block text-sm text-slate-700 sm:col-span-2">
            <span className="font-semibold">Provincia</span>
            <select
              className="field-input mt-1"
              value={form.provinciaId}
              onChange={(e) => setForm((f) => ({ ...f, provinciaId: e.target.value, ciudadId: '' }))}
            >
              <option value="">Seleccionar…</option>
              {provincias.map((p) => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm text-slate-700 sm:col-span-2">
            <span className="font-semibold">Ciudad</span>
            <select
              className="field-input mt-1"
              value={form.ciudadId}
              onChange={(e) => setForm((f) => ({ ...f, ciudadId: e.target.value }))}
              disabled={!form.provinciaId}
            >
              <option value="">Seleccionar…</option>
              {ciudades.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </label>
          <FieldInput label="Teléfono" value={form.telefono} onChange={(v) => setForm((f) => ({ ...f, telefono: v }))} />
          <FieldInput label="Email" value={form.email} onChange={(v) => setForm((f) => ({ ...f, email: v }))} type="email" />
          <SaveBar saving={saving} error={error} onSave={handleSave} />
        </div>
      ) : (
        <>
          <Info label="Nombre" value={`${d.nombre} ${d.apellido}`} />
          <Info label="Documento" value={`${d.tipoDocumento} ${d.numeroDocumento}`} />
          {(d.calle || d.numero) ? (
            <Info label="Domicilio" value={[d.calle, d.numero, d.piso && `Piso ${d.piso}`, d.depto && `Depto ${d.depto}`].filter(Boolean).join(' ')} />
          ) : null}
          <Info label="Ubicación" value={`${d.ciudadNombre ?? '—'}, ${d.provinciaNombre ?? '—'}`} />
          <Info label="Teléfono" value={d.telefono} />
          <Info label="Email" value={d.email} />
        </>
      )}
    </Panel>
  );
}

export function ReclamoHechosSection({ reclamo, canWrite, reclamoId, onUpdated }: EditorProps & { reclamo: StoredReclamoDocument }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resumen, setResumen] = useState(reclamo.resumen);
  const [hecho, setHecho] = useState(reclamo.hecho);

  useEffect(() => {
    if (!editing) {
      setResumen(reclamo.resumen);
      setHecho(reclamo.hecho);
    }
  }, [editing, reclamo.resumen, reclamo.hecho]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/reclamos/${reclamoId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ datos: { resumen, hecho } }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo guardar');
      if (data.reclamo) onUpdated(data.reclamo);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Panel
      title="Hechos"
      canEdit={canWrite}
      editing={editing}
      onEdit={() => setEditing(true)}
      onCancel={() => { setEditing(false); setError(null); }}
    >
      {editing ? (
        <div className="space-y-3">
          <FieldInput label="Resumen (máx. 150)" value={resumen} onChange={setResumen} maxLength={150} />
          <FieldInput label="Hechos (máx. 1500)" value={hecho} onChange={setHecho} maxLength={1500} rows={8} />
          <SaveBar saving={saving} error={error} onSave={handleSave} />
        </div>
      ) : (
        <>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Resumen</p>
          <p className="mb-4 text-sm font-medium text-slate-800">{reclamo.resumen}</p>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Relato</p>
          <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">{reclamo.hecho}</p>
        </>
      )}
    </Panel>
  );
}

export function ReclamoEmpresasSection({ reclamo, canWrite, reclamoId, onUpdated }: EditorProps & { reclamo: StoredReclamoDocument }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otrasEmpresas, setOtrasEmpresas] = useState(reclamo.otrasEmpresas ?? '');
  const [selectedEmpresas, setSelectedEmpresas] = useState<EmpresaOption[]>(
    reclamo.empresas.map((e) => ({ id: e.id, nombre: e.nombre, cuit: e.cuit }))
  );
  const [empresaQuery, setEmpresaQuery] = useState('');
  const [empresas, setEmpresas] = useState<EmpresaOption[]>([]);
  const [empresasLoading, setEmpresasLoading] = useState(false);

  useEffect(() => {
    if (!editing) {
      setOtrasEmpresas(reclamo.otrasEmpresas ?? '');
      setSelectedEmpresas(reclamo.empresas.map((e) => ({ id: e.id, nombre: e.nombre, cuit: e.cuit })));
    }
  }, [editing, reclamo.otrasEmpresas, reclamo.empresas]);

  useEffect(() => {
    if (!editing) return;
    const query = empresaQuery.trim();
    if (query.length < 2) {
      setEmpresas([]);
      return;
    }
    setEmpresasLoading(true);
    const timer = setTimeout(() => {
      fetchCatalog<EmpresaOption[]>('empresas', { q: query })
        .then(setEmpresas)
        .catch(() => setEmpresas([]))
        .finally(() => setEmpresasLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [editing, empresaQuery]);

  function toggleEmpresa(empresa: EmpresaOption) {
    setSelectedEmpresas((current) => {
      const exists = current.some((item) => item.id === empresa.id);
      if (exists) return current.filter((item) => item.id !== empresa.id);
      if (current.length >= 5) return current;
      return [...current, empresa];
    });
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/reclamos/${reclamoId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          datos: {
            otrasEmpresas: otrasEmpresas.trim() || null,
            empresaIds: selectedEmpresas.map((e) => e.id),
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo guardar');
      if (data.reclamo) onUpdated(data.reclamo);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Panel
      title="Empresas denunciadas"
      canEdit={canWrite}
      editing={editing}
      onEdit={() => setEditing(true)}
      onCancel={() => { setEditing(false); setError(null); }}
    >
      {editing ? (
        <div className="space-y-3">
          <div>
            <p className="text-sm font-semibold text-slate-700">Empresas seleccionadas</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {selectedEmpresas.map((empresa) => (
                <button
                  key={empresa.id}
                  type="button"
                  onClick={() => toggleEmpresa(empresa)}
                  className="rounded-full bg-[#1a5fb4]/10 px-3 py-1 text-sm font-medium text-[#1a5fb4]"
                >
                  {empresa.nombre} ×
                </button>
              ))}
            </div>
          </div>
          <FieldInput
            label="Buscar empresa (hasta 5)"
            value={empresaQuery}
            onChange={setEmpresaQuery}
          />
          {empresaQuery.trim().length >= 2 && (
            <div className="max-h-40 overflow-y-auto rounded-lg border border-slate-200">
              {empresasLoading ? (
                <p className="px-4 py-3 text-sm text-slate-500">Buscando…</p>
              ) : empresas.length === 0 ? (
                <p className="px-4 py-3 text-sm text-slate-500">Sin resultados</p>
              ) : (
                empresas.map((empresa) => {
                  const selected = selectedEmpresas.some((item) => item.id === empresa.id);
                  return (
                    <button
                      key={empresa.id}
                      type="button"
                      onClick={() => toggleEmpresa(empresa)}
                      className={`block w-full border-b border-slate-100 px-4 py-2 text-left text-sm last:border-0 hover:bg-slate-50 ${selected ? 'bg-[#1a5fb4]/5 font-semibold text-[#1a5fb4]' : 'text-slate-700'}`}
                    >
                      {empresa.cuit ? `${empresa.cuit} — ` : ''}{empresa.nombre}
                    </button>
                  );
                })
              )}
            </div>
          )}
          <FieldInput label="Otras empresas" value={otrasEmpresas} onChange={setOtrasEmpresas} />
          <SaveBar saving={saving} error={error} onSave={handleSave} />
        </div>
      ) : (
        <>
          <ul className="list-inside list-disc text-sm text-slate-700">
            {reclamo.empresas.map((empresa) => (
              <li key={empresa.id}>
                {empresa.cuit ? `${empresa.cuit} — ` : ''}{empresa.nombre}
              </li>
            ))}
          </ul>
          {reclamo.otrasEmpresas ? (
            <p className="mt-3 text-sm text-slate-600">
              <strong>Otras:</strong> {reclamo.otrasEmpresas}
            </p>
          ) : null}
        </>
      )}
    </Panel>
  );
}
