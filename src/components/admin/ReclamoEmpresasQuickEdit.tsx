'use client';

import { useEffect, useState } from 'react';
import { Loader2, Pencil, X } from 'lucide-react';

type EmpresaOption = { id: number; nombre: string; cuit?: string | null };

export type ReclamoEmpresasQuickEditTarget = {
  id: number;
  empresas: EmpresaOption[];
  empresaIds?: number[];
  otrasEmpresas?: string | null;
};

function isPlaceholderEmpresa(nombre: string): boolean {
  const n = nombre.trim().toLowerCase();
  return n === 'otra' || n === 'otras' || n === 'otra empresa' || n === 'otras empresas';
}

async function searchEmpresas(q: string): Promise<EmpresaOption[]> {
  const res = await fetch(`/api/reclamos/catalogos/empresas?q=${encodeURIComponent(q)}`);
  if (!res.ok) throw new Error('No se pudo buscar empresas');
  return res.json();
}

export function ReclamoEmpresasQuickEdit({
  reclamo,
  onClose,
  onSaved,
}: {
  reclamo: ReclamoEmpresasQuickEditTarget;
  onClose: () => void;
  onSaved: () => void;
}) {
  const initial = reclamo.empresas.filter((e) => !isPlaceholderEmpresa(e.nombre));
  const [selected, setSelected] = useState<EmpresaOption[]>(initial);
  const [otrasEmpresas, setOtrasEmpresas] = useState(reclamo.otrasEmpresas ?? '');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<EmpresaOption[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hadPlaceholder =
    reclamo.empresas.some((e) => isPlaceholderEmpresa(e.nombre)) ||
    Boolean(reclamo.otrasEmpresas?.trim());

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    const timer = window.setTimeout(() => {
      searchEmpresas(q)
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  function toggle(empresa: EmpresaOption) {
    setSelected((current) => {
      const exists = current.some((item) => item.id === empresa.id);
      if (exists) return current.filter((item) => item.id !== empresa.id);
      if (current.length >= 5) return current;
      return [...current, empresa];
    });
  }

  async function handleSave() {
    if (!selected.length) {
      setError('Elegí al menos una empresa del catálogo');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/reclamos/${reclamo.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          datos: {
            empresaIds: selected.map((e) => e.id),
            otrasEmpresas: otrasEmpresas.trim() || null,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo guardar');
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-2 rounded-xl border border-[#1a5fb4]/25 bg-[#1a5fb4]/5 p-3 text-left shadow-sm">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#1a5fb4]">
            Edición rápida · empresas
          </p>
          {hadPlaceholder ? (
            <p className="mt-1 text-xs text-slate-600">
              Sacá “OTRA” y elegí la empresa real del catálogo.
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-slate-500 hover:bg-white hover:text-slate-800"
          aria-label="Cerrar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mb-2 flex flex-wrap gap-1.5">
        {selected.length === 0 ? (
          <span className="text-xs text-amber-800">Ninguna empresa del catálogo</span>
        ) : (
          selected.map((empresa) => (
            <button
              key={empresa.id}
              type="button"
              onClick={() => toggle(empresa)}
              className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-[#1a5fb4] ring-1 ring-[#1a5fb4]/20"
            >
              {empresa.nombre} ×
            </button>
          ))
        )}
      </div>

      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar empresa registrada…"
        className="field-input w-full text-sm"
        autoFocus
      />

      {query.trim().length >= 2 ? (
        <div className="mt-1 max-h-36 overflow-y-auto rounded-lg border border-slate-200 bg-white">
          {searching ? (
            <p className="flex items-center gap-2 px-3 py-2 text-xs text-slate-500">
              <Loader2 className="h-3 w-3 animate-spin" /> Buscando…
            </p>
          ) : results.length === 0 ? (
            <p className="px-3 py-2 text-xs text-slate-500">Sin resultados</p>
          ) : (
            results.map((empresa) => {
              const active = selected.some((item) => item.id === empresa.id);
              return (
                <button
                  key={empresa.id}
                  type="button"
                  onClick={() => toggle(empresa)}
                  className={`block w-full border-b border-slate-100 px-3 py-2 text-left text-xs last:border-0 hover:bg-slate-50 ${
                    active ? 'bg-[#1a5fb4]/5 font-semibold text-[#1a5fb4]' : 'text-slate-700'
                  }`}
                >
                  {empresa.cuit ? `${empresa.cuit} — ` : ''}
                  {empresa.nombre}
                </button>
              );
            })
          )}
        </div>
      ) : null}

      <label className="mt-2 block text-xs text-slate-600">
        Otras empresas (texto libre, opcional)
        <input
          type="text"
          value={otrasEmpresas}
          onChange={(e) => setOtrasEmpresas(e.target.value)}
          className="field-input mt-1 w-full text-sm"
          placeholder="Solo si no está en el catálogo"
        />
      </label>

      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || selected.length === 0}
          className="rounded-lg bg-[#1a5fb4] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#004a80] disabled:opacity-50"
        >
          {saving ? 'Guardando…' : 'Guardar empresas'}
        </button>
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

export function QuickEditEmpresasButton({
  onClick,
  disabled,
}: {
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-[#1a5fb4] hover:underline disabled:opacity-50"
    >
      <Pencil className="h-3 w-3" />
      Editar empresas
    </button>
  );
}
