'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  SearchableMultiSelect,
  SearchableSelect,
  type SelectOption,
} from '@/components/admin/SearchableSelect';
import type {
  CiudadOption,
  EmpresaOption,
  EtiquetaOption,
  FalloSearchParams,
  JuzgadoOption,
  ProvinciaOption,
  ReclamoOption,
  RubroOption,
  TipoJuicioOption,
} from '@/types/observatorio';

type FormState = {
  actor: string;
  rubro: string[];
  tipoJuicio: string;
  causas: string[];
  etiquetas: string[];
  demandado: string[];
  idProvincia: string;
  idCiudad: string;
  idTribunal: string;
};

function toFormState(params: FalloSearchParams): FormState {
  return {
    actor: params.actor ?? '',
    rubro: (params.rubro ?? []).map(String),
    tipoJuicio: params.tipoJuicio ? String(params.tipoJuicio) : '',
    causas: (params.causas ?? []).map(String),
    etiquetas: (params.etiquetas ?? []).map(String),
    demandado: (params.demandado ?? []).map(String),
    idProvincia: params.idProvincia ? String(params.idProvincia) : '',
    idCiudad: params.idCiudad ? String(params.idCiudad) : '',
    idTribunal: params.idTribunal ? String(params.idTribunal) : '',
  };
}

function toQuery(form: FormState): string {
  const query = new URLSearchParams();

  if (form.actor.trim()) query.set('actor', form.actor.trim());
  for (const value of form.rubro) query.append('rubro', value);
  if (form.tipoJuicio) query.set('tipoJuicio', form.tipoJuicio);
  for (const value of form.causas) query.append('causas', value);
  for (const value of form.etiquetas) query.append('etiquetas', value);
  for (const value of form.demandado) query.append('demandado', value);
  if (form.idProvincia) query.set('idProvincia', form.idProvincia);
  if (form.idCiudad) query.set('idCiudad', form.idCiudad);
  if (form.idTribunal) query.set('idTribunal', form.idTribunal);

  const serialized = query.toString();
  return serialized ? `?${serialized}` : '';
}

async function fetchDatos<T>(path: string, params?: Record<string, string>): Promise<T> {
  const query = params ? `?${new URLSearchParams(params).toString()}` : '';
  const response = await fetch(`/api/observatorio/datos/${path}${query}`, {
    credentials: 'include',
  });
  if (!response.ok) throw new Error(`Error al cargar ${path}`);
  return response.json() as Promise<T>;
}

export function FalloSearchForm({ initialParams }: { initialParams: FalloSearchParams }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() => toFormState(initialParams));
  const [loading, setLoading] = useState(true);

  const [rubros, setRubros] = useState<SelectOption[]>([]);
  const [tiposJuicio, setTiposJuicio] = useState<SelectOption[]>([]);
  const [reclamos, setReclamos] = useState<SelectOption[]>([]);
  const [etiquetas, setEtiquetas] = useState<SelectOption[]>([]);
  const [empresas, setEmpresas] = useState<SelectOption[]>([]);
  const [provincias, setProvincias] = useState<SelectOption[]>([]);
  const [ciudades, setCiudades] = useState<SelectOption[]>([]);
  const [juzgados, setJuzgados] = useState<SelectOption[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadCatalogs() {
      try {
        const [rubrosData, tiposData, reclamosData, etiquetasData, empresasData, provinciasData] =
          await Promise.all([
            fetchDatos<RubroOption[]>('rubros'),
            fetchDatos<TipoJuicioOption[]>('tipojuicio'),
            fetchDatos<ReclamoOption[]>('reclamos'),
            fetchDatos<EtiquetaOption[]>('etiquetas'),
            fetchDatos<EmpresaOption[]>('empresas'),
            fetchDatos<ProvinciaOption[]>('provincias'),
          ]);

        if (cancelled) return;

        setRubros(rubrosData.map((item) => ({ value: String(item.id), label: item.rubro })));
        setTiposJuicio(tiposData.map((item) => ({ value: String(item.id), label: item.nombre })));
        setReclamos(
          reclamosData.map((item) => ({
            value: String(item.id),
            label: item.description,
          }))
        );
        setEtiquetas(
          etiquetasData.map((item) => ({
            value: String(item.id),
            label: item.description,
          }))
        );
        setEmpresas(
          empresasData.map((item) => ({
            value: String(item.id),
            label: item.razon_social,
          }))
        );
        setProvincias(provinciasData.map((item) => ({ value: String(item.id), label: item.nombre })));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadCatalogs();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!form.idProvincia) {
      setCiudades([]);
      return;
    }

    let cancelled = false;
    fetchDatos<CiudadOption[]>('ciudades', { idProvincia: form.idProvincia })
      .then((data) => {
        if (!cancelled) {
          setCiudades(data.map((item) => ({ value: String(item.id), label: item.nombre })));
        }
      })
      .catch(() => {
        if (!cancelled) setCiudades([]);
      });

    return () => {
      cancelled = true;
    };
  }, [form.idProvincia]);

  useEffect(() => {
    if (!form.idCiudad) {
      setJuzgados([]);
      return;
    }

    let cancelled = false;
    fetchDatos<JuzgadoOption[]>('juzgados', { idCiudad: form.idCiudad })
      .then((data) => {
        if (!cancelled) {
          setJuzgados(data.map((item) => ({ value: String(item.id), label: item.nombre })));
        }
      })
      .catch(() => {
        if (!cancelled) setJuzgados([]);
      });

    return () => {
      cancelled = true;
    };
  }, [form.idCiudad]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => {
      const next = { ...current, [key]: value };
      if (key === 'idProvincia') {
        next.idCiudad = '';
        next.idTribunal = '';
      }
      if (key === 'idCiudad') {
        next.idTribunal = '';
      }
      return next;
    });
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    router.push(`/observatorio/buscar${toQuery(form)}`);
  }

  function handleReset() {
    setForm(toFormState({}));
    router.push('/observatorio/buscar');
  }

  const inputClass =
    'w-full min-w-0 max-w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-[#1a5fb4] focus:ring-2 focus:ring-[#1a5fb4]/20 disabled:bg-slate-50 disabled:text-slate-400';

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full min-w-0 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-[#2d8f47]">Buscador</p>
        <h2 className="text-2xl font-bold text-slate-900">Filtrar fallos</h2>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Cargando filtros…</p>
      ) : (
        <div className="grid min-w-0 gap-4">
          <label className="block min-w-0">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Actor / demandante</span>
            <input
              type="text"
              value={form.actor}
              onChange={(event) => updateField('actor', event.target.value)}
              placeholder="Nombre del actor"
              className={inputClass}
            />
          </label>

          <SearchableMultiSelect
            label="Rubro"
            values={form.rubro}
            options={rubros}
            onChange={(values) => updateField('rubro', values)}
            placeholder="Escribí para buscar rubros…"
            hint="Podés elegir varios rubros."
          />
          <SearchableSelect
            label="Tipo de juicio"
            value={form.tipoJuicio}
            options={tiposJuicio}
            onChange={(value) => updateField('tipoJuicio', value)}
            placeholder="Escribí para buscar…"
            hint="Escribí para filtrar opciones."
          />
          <SearchableMultiSelect
            label="Causa de reclamo"
            values={form.causas}
            options={reclamos}
            onChange={(values) => updateField('causas', values)}
            placeholder="Escribí para buscar causas…"
            hint="Podés elegir varias causas."
          />
          <SearchableMultiSelect
            label="Etiqueta"
            values={form.etiquetas}
            options={etiquetas}
            onChange={(values) => updateField('etiquetas', values)}
            placeholder="Escribí para buscar etiquetas…"
            hint="Podés elegir varias etiquetas."
          />
          <SearchableMultiSelect
            label="Empresa demandada"
            values={form.demandado}
            options={empresas}
            onChange={(values) => updateField('demandado', values)}
            placeholder="Escribí razón social…"
            hint="Podés elegir varias empresas."
          />
          <SearchableSelect
            label="Provincia"
            value={form.idProvincia}
            options={provincias}
            onChange={(value) => updateField('idProvincia', value)}
            placeholder="Escribí para buscar…"
            hint="Escribí para filtrar provincias."
          />
          <SearchableSelect
            label="Ciudad"
            value={form.idCiudad}
            options={ciudades}
            onChange={(value) => updateField('idCiudad', value)}
            disabled={!form.idProvincia}
            placeholder={form.idProvincia ? 'Escribí para buscar…' : 'Elegí una provincia primero'}
            hint={form.idProvincia ? 'Escribí para filtrar ciudades.' : undefined}
          />
          <SearchableSelect
            label="Tribunal"
            value={form.idTribunal}
            options={juzgados}
            onChange={(value) => updateField('idTribunal', value)}
            disabled={!form.idCiudad}
            placeholder={form.idCiudad ? 'Escribí para buscar…' : 'Elegí una ciudad primero'}
            hint={form.idCiudad ? 'Escribí para filtrar tribunales.' : undefined}
          />
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="submit"
          className="rounded-full bg-[#1a5fb4] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#154a8c]"
        >
          Buscar
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="rounded-full border border-slate-200 px-6 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Limpiar
        </button>
      </div>
    </form>
  );
}
