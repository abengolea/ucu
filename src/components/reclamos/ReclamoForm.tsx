'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

type SelectOption = { value: string; label: string };
type EmpresaOption = { id: number; nombre: string; cuit?: string | null };

async function fetchCatalog<T>(path: string, params?: Record<string, string>): Promise<T> {
  const query = params ? `?${new URLSearchParams(params).toString()}` : '';
  const response = await fetch(`/api/reclamos/catalogos/${path}${query}`);
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || `No se pudo cargar ${path}`);
  }
  return response.json();
}

export function ReclamoForm() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<number | null>(null);

  const [provincias, setProvincias] = useState<SelectOption[]>([]);
  const [ciudades, setCiudades] = useState<SelectOption[]>([]);
  const [empresas, setEmpresas] = useState<EmpresaOption[]>([]);
  const [empresaQuery, setEmpresaQuery] = useState('');
  const [empresasLoading, setEmpresasLoading] = useState(false);
  const [selectedEmpresas, setSelectedEmpresas] = useState<EmpresaOption[]>([]);

  const [form, setForm] = useState({
    nombre: '',
    apellido: '',
    tipoDocumento: 'DNI',
    numeroDocumento: '',
    calle: '',
    numero: '',
    piso: '',
    depto: '',
    provinciaId: '',
    ciudadId: '',
    telefono: '',
    email: '',
    resumen: '',
    hecho: '',
    otrasEmpresas: '',
  });

  useEffect(() => {
    fetchCatalog<Array<{ id: number; nombre: string }>>('provincias')
      .then((items) =>
        setProvincias(items.map((item) => ({ value: String(item.id), label: item.nombre })))
      )
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!form.provinciaId) {
      setCiudades([]);
      return;
    }

    fetchCatalog<Array<{ id: number; nombre: string }>>('ciudades', {
      idProvincia: form.provinciaId,
    })
      .then((items) =>
        setCiudades(items.map((item) => ({ value: String(item.id), label: item.nombre })))
      )
      .catch((err: Error) => setError(err.message));
  }, [form.provinciaId]);

  useEffect(() => {
    const query = empresaQuery.trim();
    if (!query) {
      setEmpresas([]);
      setEmpresasLoading(false);
      return;
    }

    setEmpresasLoading(true);
    const timer = setTimeout(() => {
      fetchCatalog<EmpresaOption[]>('empresas', { q: query })
        .then(setEmpresas)
        .catch(() => setEmpresas([]))
        .finally(() => setEmpresasLoading(false));
    }, 250);
    return () => clearTimeout(timer);
  }, [empresaQuery]);

  function updateField(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function toggleEmpresa(empresa: EmpresaOption) {
    setSelectedEmpresas((current) => {
      const exists = current.some((item) => item.id === empresa.id);
      if (exists) return current.filter((item) => item.id !== empresa.id);
      if (current.length >= 5) return current;
      return [...current, empresa];
    });
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/reclamos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          provinciaId: Number(form.provinciaId),
          ciudadId: Number(form.ciudadId),
          empresaIds: selectedEmpresas.map((item) => item.id),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo enviar el reclamo');
      setSuccessId(data.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-[#1a5fb4]" />
      </div>
    );
  }

  if (successId) {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 p-8 text-center">
        <h2 className="text-2xl font-bold text-green-900">Reclamo registrado</h2>
        <p className="mt-3 text-green-800">
          Tu número de reclamo es <strong className="text-3xl">{successId}</strong>
        </p>
        <p className="mt-2 text-sm text-green-700">
          Guardalo junto con tu documento para consultar el estado en cualquier momento.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href={`/reclamos/consultar?id=${successId}`}
            className="rounded-lg bg-[#1a5fb4] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#004a80]"
          >
            Consultar estado
          </Link>
          <Link href="/reclamos" className="rounded-lg border border-green-300 px-5 py-2.5 text-sm font-semibold text-green-900">
            Volver
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-slate-900">Mis datos personales</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Nombre" required>
            <input className="field-input" value={form.nombre} onChange={(e) => updateField('nombre', e.target.value)} required />
          </Field>
          <Field label="Apellido" required>
            <input className="field-input" value={form.apellido} onChange={(e) => updateField('apellido', e.target.value)} required />
          </Field>
          <Field label="Tipo de documento" required>
            <select className="field-input" value={form.tipoDocumento} onChange={(e) => updateField('tipoDocumento', e.target.value)} required>
              {['DNI', 'LC', 'LE', 'CI', 'PASAPORTE'].map((tipo) => (
                <option key={tipo} value={tipo}>{tipo}</option>
              ))}
            </select>
          </Field>
          <Field label="Documento" required>
            <input className="field-input" value={form.numeroDocumento} onChange={(e) => updateField('numeroDocumento', e.target.value)} required />
          </Field>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-slate-900">Datos de contacto</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Provincia" required>
            <select
              className="field-input"
              value={form.provinciaId}
              onChange={(e) => {
                updateField('provinciaId', e.target.value);
                updateField('ciudadId', '');
              }}
              required
            >
              <option value="">Seleccionar…</option>
              {provincias.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Ciudad" required>
            <select className="field-input" value={form.ciudadId} onChange={(e) => updateField('ciudadId', e.target.value)} required disabled={!form.provinciaId}>
              <option value="">Seleccionar…</option>
              {ciudades.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Calle">
            <input className="field-input" value={form.calle} onChange={(e) => updateField('calle', e.target.value)} />
          </Field>
          <Field label="Número">
            <input className="field-input" value={form.numero} onChange={(e) => updateField('numero', e.target.value)} />
          </Field>
          <Field label="Piso">
            <input className="field-input" value={form.piso} onChange={(e) => updateField('piso', e.target.value)} />
          </Field>
          <Field label="Depto">
            <input className="field-input" value={form.depto} onChange={(e) => updateField('depto', e.target.value)} />
          </Field>
          <Field label="Teléfono" required>
            <input className="field-input" value={form.telefono} onChange={(e) => updateField('telefono', e.target.value)} required />
          </Field>
          <Field label="Email" required>
            <input type="email" className="field-input" value={form.email} onChange={(e) => updateField('email', e.target.value)} required />
          </Field>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-slate-900">Contanos qué te pasó</h2>
        <div className="space-y-4">
          <Field label="Resumen (máx. 150 caracteres)" required>
            <input className="field-input" maxLength={150} value={form.resumen} onChange={(e) => updateField('resumen', e.target.value)} required />
          </Field>
          <Field label="Hechos (máx. 1500 caracteres)" required>
            <textarea className="field-input min-h-32" maxLength={1500} value={form.hecho} onChange={(e) => updateField('hecho', e.target.value)} required />
          </Field>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-slate-900">Empresa/s denunciada/s</h2>
        <Field label="Buscar empresa (hasta 5)">
          <input
            className="field-input"
            placeholder="Escribí nombre o CUIT para buscar…"
            value={empresaQuery}
            onChange={(e) => setEmpresaQuery(e.target.value)}
          />
          <p className="mt-1 text-xs text-slate-500">
            Escribí al menos 2 caracteres. Los resultados aparecen mientras buscás.
          </p>
        </Field>
        {selectedEmpresas.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
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
        )}
        {empresaQuery.trim().length > 0 && (
          <div className="mt-3 max-h-48 overflow-y-auto rounded-lg border border-slate-200">
            {empresasLoading ? (
              <div className="flex items-center justify-center gap-2 px-4 py-6 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Buscando…
              </div>
            ) : empresas.length === 0 ? (
              <p className="px-4 py-3 text-sm text-slate-500">
                No se encontraron empresas. Podés indicarlas abajo en &quot;Otras empresas&quot;.
              </p>
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
        <Field label="Otras empresas (si no están en la lista)">
          <input className="field-input" value={form.otrasEmpresas} onChange={(e) => updateField('otrasEmpresas', e.target.value)} />
        </Field>
      </section>

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-xl bg-[#2d8f47] px-6 py-3 text-sm font-semibold text-white hover:bg-[#1f6b31] disabled:opacity-60"
      >
        {submitting ? 'Enviando…' : 'Enviar reclamo'}
      </button>
    </form>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-slate-700">
        {label}{required ? ' *' : ''}
      </span>
      {children}
    </label>
  );
}
