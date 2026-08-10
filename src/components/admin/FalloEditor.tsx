'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  SearchableMultiSelect,
  SearchableSelect,
  type SelectOption,
} from '@/components/admin/SearchableSelect';
import { formatTodayFecha } from '@/lib/observatorio-normalize';
import type { StoredFalloDocument } from '@/types/observatorio';
import type { FalloAiExtractedForm } from '@/types/fallo-ai';
import { FalloAiImport } from '@/components/admin/FalloAiImport';
import { FalloPdfUpload, type FalloPdfDuplicateInfo } from '@/components/admin/FalloPdfUpload';
import {
  DIVISA_CANASTA_CODIGO,
  DIVISA_PESOS_CODIGO,
  findDivisaIdByCodigo,
  isCanastaBasicaDivisa,
  isPesosDivisa,
} from '@/lib/observatorio-divisas-shared';

type FalloEditorProps = {
  mode: 'create' | 'edit';
  initialId?: number;
  initialFallo?: StoredFalloDocument;
  variant?: 'admin' | 'public';
};

type FormState = {
  actor: string;
  demandado: string;
  firmActor: boolean;
  personDemandado: boolean;
  resumen: string;
  fecha: string;
  status: 'publish' | 'draft';
  punitivo: string;
  moral: string;
  patrimonial: string;
  divisaId: string;
  tipoJuicioId: string;
  rubroIds: string[];
  causaIds: string[];
  etiquetaIds: string[];
  actorEmpresaIds: string[];
  demandadoEmpresaIds: string[];
  provinciaId: string;
  ciudadId: string;
  juzgadoId: string;
};

async function fetchCatalog(path: string, params?: Record<string, string>) {
  const query = params ? `?${new URLSearchParams(params).toString()}` : '';
  const response = await fetch(`/api/observatorio/datos/${path}${query}`);
  if (!response.ok) throw new Error(`No se pudo cargar ${path}`);
  return response.json();
}

function mapOptions<T>(
  items: T[],
  valueKey: keyof T,
  labelKey: keyof T
): SelectOption[] {
  return items.map((item) => ({
    value: String(item[valueKey]),
    label: String(item[labelKey]),
  }));
}

function falloToFormState(fallo: StoredFalloDocument): FormState {
  const hasActorEmpresas = (fallo.demandadoActores?.length ?? 0) > 0;
  const firmActor = hasActorEmpresas && !fallo.actor;
  const personDemandado = Boolean(fallo.demandado?.trim());

  return {
    actor: fallo.actor ?? '',
    demandado: fallo.demandado ?? '',
    firmActor,
    personDemandado,
    resumen: fallo.resumen ?? '',
    fecha: fallo.fecha ?? formatTodayFecha(),
    status: fallo.status === 'draft' ? 'draft' : 'publish',
    punitivo: fallo.punitivo ?? '0.00',
    moral: fallo.moral ?? '0.00',
    patrimonial: fallo.patrimonial ?? '0.00',
    divisaId: String(fallo.divisa?.id ?? '7'),
    tipoJuicioId: String(fallo.tipoJuicioId ?? fallo.tipoJuicio?.id ?? ''),
    rubroIds: (fallo.rubroIds ?? fallo.rubro?.map((item) => item.id) ?? []).map(String),
    causaIds: (fallo.causaIds ?? fallo.causas?.map((item) => item.id) ?? []).map(String),
    etiquetaIds: (fallo.etiquetaIds ?? fallo.etiquetas?.map((item) => item.id) ?? []).map(String),
    actorEmpresaIds: (fallo.demandadoActores?.map((item) => item.id) ?? []).map(String),
    demandadoEmpresaIds: (
      fallo.demandadoEmpresaIds ?? fallo.demandadoEmpresas?.map((item) => item.id) ?? []
    ).map(String),
    provinciaId: String(fallo.provinciaId ?? fallo.provincia?.id ?? ''),
    ciudadId: String(fallo.ciudadId ?? fallo.ciudad?.id ?? ''),
    juzgadoId: String(fallo.juzgadoId ?? fallo.juzgado?.id ?? ''),
  };
}

const emptyForm = (): FormState => ({
  actor: '',
  demandado: '',
  firmActor: false,
  personDemandado: false,
  resumen: '',
  fecha: formatTodayFecha(),
  status: 'publish',
  punitivo: '0.00',
  moral: '0.00',
  patrimonial: '0.00',
  divisaId: '7',
  tipoJuicioId: '',
  rubroIds: [],
  causaIds: [],
  etiquetaIds: [],
  actorEmpresaIds: [],
  demandadoEmpresaIds: [],
  provinciaId: '',
  ciudadId: '',
  juzgadoId: '',
});

export function FalloEditor({
  mode,
  initialId,
  initialFallo,
  variant = 'admin',
}: FalloEditorProps) {
  const isPublic = variant === 'public';
  const apiBase = isPublic ? '/api/observatorio' : '/api/admin';
  const [initializing, setInitializing] = useState(true);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [rubros, setRubros] = useState<SelectOption[]>([]);
  const [tiposJuicio, setTiposJuicio] = useState<SelectOption[]>([]);
  const [reclamos, setReclamos] = useState<SelectOption[]>([]);
  const [etiquetas, setEtiquetas] = useState<SelectOption[]>([]);
  const [empresas, setEmpresas] = useState<SelectOption[]>([]);
  const [divisas, setDivisas] = useState<SelectOption[]>([]);
  const [divisaCatalog, setDivisaCatalog] = useState<
    { id: number; codigo: string; nombre: string }[]
  >([]);
  const [provincias, setProvincias] = useState<SelectOption[]>([]);
  const [ciudades, setCiudades] = useState<SelectOption[]>([]);
  const [juzgados, setJuzgados] = useState<SelectOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [newEmpresa, setNewEmpresa] = useState('');
  const [newEtiqueta, setNewEtiqueta] = useState('');
  const [aiWarnings, setAiWarnings] = useState<string[]>([]);
  const [pendingPdf, setPendingPdf] = useState<File | null>(null);
  const [duplicatePdf, setDuplicatePdf] = useState<FalloPdfDuplicateInfo | null>(null);

  async function applyAiExtractedForm(extracted: FalloAiExtractedForm) {
    setError('');
    setSuccess('');
    setAiWarnings([]);

    let nextCiudades: SelectOption[] = [];
    let nextJuzgados: SelectOption[] = [];

    if (extracted.provinciaId) {
      try {
        const ciudadesData = await fetchCatalog('ciudades', {
          idProvincia: extracted.provinciaId,
        });
        nextCiudades = mapOptions(ciudadesData, 'id', 'nombre');
        setCiudades(nextCiudades);
      } catch {
        /* opcional */
      }
    } else {
      setCiudades([]);
    }

    if (extracted.ciudadId) {
      try {
        const juzgadosData = await fetchCatalog('juzgados', {
          idCiudad: extracted.ciudadId,
        });
        nextJuzgados = mapOptions(juzgadosData, 'id', 'nombre');
        setJuzgados(nextJuzgados);
      } catch {
        /* opcional */
      }
    } else {
      setJuzgados([]);
    }

    setForm((current) => ({
      ...current,
      ...extracted,
      status: current.status,
    }));
    setSuccess('Formulario completado con IA. Revisá los campos antes de guardar.');
  }

  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      try {
        const catalogResults = await Promise.allSettled([
          fetchCatalog('rubros'),
          fetchCatalog('tipojuicio'),
          fetchCatalog('reclamos'),
          fetchCatalog('etiquetas'),
          fetchCatalog('empresas'),
          fetchCatalog('provincias'),
          fetchCatalog('divisas'),
        ]);

        if (cancelled) return;

        const [
          rubrosResult,
          tiposResult,
          reclamosResult,
          etiquetasResult,
          empresasResult,
          provinciasResult,
          divisasResult,
        ] = catalogResults;

        if (rubrosResult.status === 'fulfilled') {
          setRubros(mapOptions(rubrosResult.value, 'id', 'rubro'));
        }
        if (tiposResult.status === 'fulfilled') {
          setTiposJuicio(
            tiposResult.value.map((item: { id: number; nombre?: string; description?: string }) => ({
              value: String(item.id),
              label: item.nombre ?? item.description ?? `Tipo ${item.id}`,
            }))
          );
        }
        if (reclamosResult.status === 'fulfilled') {
          setReclamos(mapOptions(reclamosResult.value, 'id', 'description'));
        }
        if (etiquetasResult.status === 'fulfilled') {
          setEtiquetas(mapOptions(etiquetasResult.value, 'id', 'description'));
        }
        if (empresasResult.status === 'fulfilled') {
          setEmpresas(mapOptions(empresasResult.value, 'id', 'razon_social'));
        }
        if (provinciasResult.status === 'fulfilled') {
          setProvincias(mapOptions(provinciasResult.value, 'id', 'nombre'));
        }
        if (divisasResult.status === 'fulfilled') {
          const catalog: { id: number; codigo: string; nombre: string }[] =
            divisasResult.value.map(
              (item: {
                id: number;
                codigo?: string;
                nombre?: string;
                codigoDivisa?: string;
                nombreDivisa?: string;
              }) => ({
                id: item.id,
                codigo: item.codigo ?? item.codigoDivisa ?? '',
                nombre: item.nombre ?? item.nombreDivisa ?? '',
              })
            );
          setDivisaCatalog(catalog);
          setDivisas(
            catalog.map((entry) => ({
              value: String(entry.id),
              label: `${entry.nombre} (${entry.codigo})`,
            }))
          );
        }

        const catalogFailures = catalogResults.filter((result) => result.status === 'rejected').length;
        if (catalogFailures > 0) {
          setError(
            `Algunos catálogos no cargaron (${catalogFailures}). Revisá la conexión o ejecutá la migración.`
          );
        }

        if (mode === 'edit' && initialId) {
          let fallo = initialFallo;

          if (!fallo) {
            const response = await fetch(`/api/admin/fallos/${initialId}`, {
              credentials: 'include',
            });
            const data = await response.json();
            if (!response.ok || !data.fallo) {
              throw new Error(data.error || 'No se pudo cargar el fallo');
            }
            fallo = data.fallo as StoredFalloDocument;
          }

          const nextForm = falloToFormState(fallo);

          if (nextForm.provinciaId) {
            try {
              const ciudadesData = await fetchCatalog('ciudades', {
                idProvincia: nextForm.provinciaId,
              });
              if (!cancelled) {
                setCiudades(mapOptions(ciudadesData, 'id', 'nombre'));
              }
            } catch {
              /* opcional */
            }
          }

          if (nextForm.ciudadId) {
            try {
              const juzgadosData = await fetchCatalog('juzgados', {
                idCiudad: nextForm.ciudadId,
              });
              if (!cancelled) {
                setJuzgados(mapOptions(juzgadosData, 'id', 'nombre'));
              }
            } catch {
              /* opcional */
            }
          }

          if (!cancelled) {
            setForm(nextForm);
            if (catalogFailures === 0) setError('');
          }
        }
      } catch (initError) {
        if (!cancelled) {
          setError(
            initError instanceof Error ? initError.message : 'Error al cargar el formulario'
          );
        }
      } finally {
        if (!cancelled) setInitializing(false);
      }
    }

    initialize();
    return () => {
      cancelled = true;
    };
  }, [mode, initialId, initialFallo]);

  async function handleProvinciaChange(value: string) {
    setForm((current) => ({ ...current, provinciaId: value, ciudadId: '', juzgadoId: '' }));
    setCiudades([]);
    setJuzgados([]);
    if (!value) return;
    const data = await fetchCatalog('ciudades', { idProvincia: value });
    setCiudades(mapOptions(data, 'id', 'nombre'));
  }

  async function handleCiudadChange(value: string) {
    setForm((current) => ({ ...current, ciudadId: value, juzgadoId: '' }));
    setJuzgados([]);
    if (!value) return;
    const data = await fetchCatalog('juzgados', { idCiudad: value });
    setJuzgados(mapOptions(data, 'id', 'nombre'));
  }

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function createCatalogItem(type: 'empresas' | 'etiquetas', label: string) {
    const trimmed = label.trim();
    if (!trimmed) return;

    const body =
      type === 'empresas' ? { razon_social: trimmed } : { description: trimmed };

    const response = await fetch(`${apiBase}/catalogos/${type}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || 'No se pudo crear el ítem');
      return;
    }

    const item = data.item;
    if (type === 'empresas') {
      const option = { value: String(item.id), label: item.razon_social };
      setEmpresas((current) => [...current, option].sort((a, b) => a.label.localeCompare(b.label, 'es')));
      updateForm('demandadoEmpresaIds', [...form.demandadoEmpresaIds, String(item.id)]);
      setNewEmpresa('');
    } else {
      const option = { value: String(item.id), label: item.description };
      setEtiquetas((current) => [...current, option].sort((a, b) => a.label.localeCompare(b.label, 'es')));
      updateForm('etiquetaIds', [...form.etiquetaIds, String(item.id)]);
      setNewEtiqueta('');
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (isPublic && mode === 'create' && !pendingPdf) {
      setError('Tenés que adjuntar el PDF de la sentencia para publicar el fallo.');
      setLoading(false);
      return;
    }

    if (duplicatePdf) {
      setError('Este PDF ya está cargado en el observatorio. Revisá el fallo existente.');
      setLoading(false);
      return;
    }

    const payload = {
      actor: form.actor,
      demandado: form.demandado,
      firmActor: form.firmActor,
      personDemandado: form.personDemandado,
      resumen: form.resumen,
      fecha: form.fecha,
      status: isPublic ? 'publish' : form.status,
      punitivo: form.punitivo,
      moral: form.moral,
      patrimonial: form.patrimonial,
      divisaId: form.divisaId ? Number(form.divisaId) : null,
      tipoJuicioId: form.tipoJuicioId ? Number(form.tipoJuicioId) : null,
      rubroIds: form.rubroIds.map(Number),
      causaIds: form.causaIds.map(Number),
      etiquetaIds: form.etiquetaIds.map(Number),
      actorEmpresaIds: form.actorEmpresaIds.map(Number),
      demandadoEmpresaIds: form.demandadoEmpresaIds.map(Number),
      provinciaId: form.provinciaId ? Number(form.provinciaId) : null,
      ciudadId: form.ciudadId ? Number(form.ciudadId) : null,
      juzgadoId: form.juzgadoId ? Number(form.juzgadoId) : null,
    };

    const url =
      mode === 'create' ? `${apiBase}/fallos` : `/api/admin/fallos/${initialId}`;
    const method = mode === 'create' ? 'POST' : 'PUT';

    try {
      let response: Response;

      if (pendingPdf) {
        const body = new FormData();
        body.append('payload', JSON.stringify(payload));
        body.append('pdf', pendingPdf);
        response = await fetch(url, {
          method,
          credentials: 'include',
          body,
        });
      } else {
        response = await fetch(url, {
          method,
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const data = await response.json();
      if (!response.ok) {
        if (data.duplicate && data.fallo) {
          setDuplicatePdf(data.fallo as FalloPdfDuplicateInfo);
        }
        setError(data.error || 'Error al guardar');
        return;
      }
      setSuccess(
        mode === 'create'
          ? isPublic
            ? 'Fallo publicado correctamente'
            : 'Fallo creado correctamente'
          : 'Fallo actualizado'
      );
      if (mode === 'create' && data.nroExpediente) {
        window.location.href = isPublic
          ? `/observatorio/fallo/${data.nroExpediente}`
          : `/admin/fallos/${data.nroExpediente}/editar`;
      }
    } catch {
      setError('Error de red al guardar');
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#1a5fb4]';

  const selectedDivisa = divisaCatalog.find((item) => String(item.id) === form.divisaId);
  const isPesosUnit = isPesosDivisa(selectedDivisa ?? { codigo: form.divisaId === '7' ? 'ARS' : '' });
  const isCanastaUnit = isCanastaBasicaDivisa(
    selectedDivisa ?? { codigo: form.divisaId === '163' ? 'CBA' : '' }
  );
  const showOtherDivisa = Boolean(form.divisaId) && !isPesosUnit && !isCanastaUnit;

  if (initializing) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-[#1a5fb4]" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {!isPublic ? (
        <FalloAiImport
          disabled={loading}
          excludeExpediente={mode === 'edit' ? initialId : undefined}
          existingPdfLabel={
            mode === 'edit'
              ? (initialFallo?.files?.find((file) => file.file.toLowerCase().endsWith('.pdf'))?.file ??
                null)
              : null
          }
          onPdfSelected={setPendingPdf}
          onPdfCleared={() => setPendingPdf(null)}
          onDuplicateChange={setDuplicatePdf}
          onExtracted={({ form: extracted, warnings }) => {
            setAiWarnings(warnings);
            void applyAiExtractedForm(extracted);
          }}
        />
      ) : (
        <FalloPdfUpload
          disabled={loading}
          variant="public"
          required
          excludeExpediente={mode === 'edit' ? initialId : undefined}
          onPdfSelected={setPendingPdf}
          onPdfCleared={() => setPendingPdf(null)}
          onDuplicateChange={setDuplicatePdf}
          description="Adjuntá la sentencia en PDF (obligatorio). Completá los datos del fallo manualmente y publicá."
        />
      )}

      {aiWarnings.length ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-semibold">Completar manualmente:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {aiWarnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex items-center gap-2 md:col-span-2">
          <input
            type="checkbox"
            checked={form.firmActor}
            onChange={(e) => updateForm('firmActor', e.target.checked)}
          />
          <span className="text-sm text-slate-700">Actor como persona jurídica (empresa)</span>
        </label>

        {form.firmActor ? (
          <div className="md:col-span-2">
            <SearchableMultiSelect
              label="Empresas actoras / demandantes"
              values={form.actorEmpresaIds}
              options={empresas}
              onChange={(values) => updateForm('actorEmpresaIds', values)}
              hint="Escribí el nombre de la empresa para buscarla."
            />
          </div>
        ) : (
          <label className="block md:col-span-2">
            <span className="mb-1 block text-sm font-medium text-slate-700">Actor / demandante *</span>
            <input
              value={form.actor}
              onChange={(e) => updateForm('actor', e.target.value)}
              className={inputClass}
              required={!form.firmActor}
            />
          </label>
        )}

        <label className="flex items-center gap-2 md:col-span-2">
          <input
            type="checkbox"
            checked={form.personDemandado}
            onChange={(e) => updateForm('personDemandado', e.target.checked)}
          />
          <span className="text-sm text-slate-700">Demandado como persona física</span>
        </label>

        {form.personDemandado ? (
          <label className="block md:col-span-2">
            <span className="mb-1 block text-sm font-medium text-slate-700">Demandado (persona física)</span>
            <input
              value={form.demandado}
              onChange={(e) => updateForm('demandado', e.target.value)}
              className={inputClass}
            />
          </label>
        ) : (
          <div className="md:col-span-2">
            <SearchableMultiSelect
              label="Empresas demandadas"
              values={form.demandadoEmpresaIds}
              options={empresas}
              onChange={(values) => updateForm('demandadoEmpresaIds', values)}
              hint="Escribí el nombre de la empresa para buscarla."
            />
            <div className="mt-2 flex gap-2">
              <input
                value={newEmpresa}
                onChange={(e) => setNewEmpresa(e.target.value)}
                placeholder="Nueva empresa (razón social)"
                className={inputClass}
              />
              <button
                type="button"
                onClick={() => createCatalogItem('empresas', newEmpresa)}
                className="shrink-0 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-white"
              >
                Agregar
              </button>
            </div>
          </div>
        )}

        <SearchableSelect
          label="Tipo de juicio"
          value={form.tipoJuicioId}
          options={tiposJuicio}
          onChange={(value) => updateForm('tipoJuicioId', value)}
          hint="Escribí para buscar un tipo de juicio."
        />
        <SearchableMultiSelect
          label="Rubros"
          values={form.rubroIds}
          options={rubros}
          onChange={(values) => updateForm('rubroIds', values)}
          hint="Escribí para buscar rubros."
        />
        <SearchableMultiSelect
          label="Causas de reclamo"
          values={form.causaIds}
          options={reclamos}
          onChange={(values) => updateForm('causaIds', values)}
          hint="Escribí para buscar causas de reclamo."
        />
        <div>
          <SearchableMultiSelect
            label="Etiquetas"
            values={form.etiquetaIds}
            options={etiquetas}
            onChange={(values) => updateForm('etiquetaIds', values)}
            hint="Escribí para buscar etiquetas."
          />
          <div className="mt-2 flex gap-2">
            <input
              value={newEtiqueta}
              onChange={(e) => setNewEtiqueta(e.target.value)}
              placeholder="Nueva etiqueta"
              className={inputClass}
            />
            <button
              type="button"
              onClick={() => createCatalogItem('etiquetas', newEtiqueta)}
              className="shrink-0 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-white"
            >
              Agregar
            </button>
          </div>
        </div>
        <SearchableSelect
          label="Provincia"
          value={form.provinciaId}
          options={provincias}
          onChange={handleProvinciaChange}
        />
        <SearchableSelect
          label="Ciudad"
          value={form.ciudadId}
          options={ciudades}
          onChange={handleCiudadChange}
          disabled={!form.provinciaId}
        />
        <SearchableSelect
          label="Tribunal"
          value={form.juzgadoId}
          options={juzgados}
          onChange={(value) => updateForm('juzgadoId', value)}
          disabled={!form.ciudadId}
        />
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Fecha (DD/MM/AAAA)</span>
          <input
            value={form.fecha}
            onChange={(e) => updateForm('fecha', e.target.value)}
            className={inputClass}
            placeholder="01/07/2026"
          />
        </label>
        {!isPublic ? (
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Estado</span>
            <select
              value={form.status}
              onChange={(e) => updateForm('status', e.target.value as 'publish' | 'draft')}
              className={inputClass}
            >
              <option value="publish">Publicado</option>
              <option value="draft">Borrador</option>
            </select>
          </label>
        ) : null}
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Daño patrimonial</span>
          <input
            value={form.patrimonial}
            onChange={(e) => updateForm('patrimonial', e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Daño moral</span>
          <input
            value={form.moral}
            onChange={(e) => updateForm('moral', e.target.value)}
            className={inputClass}
          />
        </label>
        <div className="block md:col-span-2">
          <span className="mb-1 block text-sm font-medium text-slate-700">Daño punitivo</span>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
            <input
              value={form.punitivo}
              onChange={(e) => updateForm('punitivo', e.target.value)}
              className={`${inputClass} sm:max-w-[220px]`}
              inputMode="decimal"
              placeholder="0.00"
              aria-label="Monto de daño punitivo"
            />
            <div
              className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1"
              role="group"
              aria-label="Unidad del daño punitivo"
            >
              <button
                type="button"
                onClick={() =>
                  updateForm(
                    'divisaId',
                    findDivisaIdByCodigo(divisaCatalog, DIVISA_PESOS_CODIGO) || '7'
                  )
                }
                className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
                  isPesosUnit
                    ? 'bg-white text-[#1a5fb4] shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Pesos
              </button>
              <button
                type="button"
                onClick={() =>
                  updateForm(
                    'divisaId',
                    findDivisaIdByCodigo(divisaCatalog, DIVISA_CANASTA_CODIGO) || '163'
                  )
                }
                className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
                  isCanastaUnit
                    ? 'bg-white text-[#1a5fb4] shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Canastas básicas
              </button>
            </div>
          </div>
          <p className="mt-1.5 text-xs text-slate-500">
            Elegí la unidad en la que se fijó el daño punitivo. Si el fallo habla de canastas
            básicas, usá esa opción (también aplica a la visualización de los montos).
          </p>
          {showOtherDivisa ? (
            <div className="mt-3 max-w-md">
              <SearchableSelect
                label="Otra unidad / moneda"
                value={form.divisaId}
                options={divisas}
                onChange={(value) => updateForm('divisaId', value)}
              />
            </div>
          ) : null}
        </div>
        <label className="block md:col-span-2">
          <span className="mb-1 flex items-center justify-between gap-3 text-sm font-medium text-slate-700">
            <span>Resumen *</span>
            {!isPublic ? (
              <span
                className={
                  form.resumen.length > 1000
                    ? 'font-semibold text-red-600'
                    : 'text-slate-500'
                }
              >
                {form.resumen.length}/1000
              </span>
            ) : null}
          </span>
          <textarea
            value={form.resumen}
            onChange={(e) => updateForm('resumen', e.target.value)}
            rows={8}
            className={inputClass}
            required
            maxLength={isPublic ? undefined : 1000}
          />
          {!isPublic ? (
            <p className="mt-1 text-xs text-slate-500">
              Ir al meollo: de qué va el caso, qué alegó la defensa de la contraria y qué resolvió el
              tribunal (con el fundamento clave). No el trámite procesal. Máximo 1000 caracteres.
            </p>
          ) : null}
        </label>
      </div>

      {success ? <p className="text-sm text-green-700">{success}</p> : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-[#2d8f47] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1f6b31] disabled:opacity-60"
        >
          {loading
            ? 'Guardando…'
            : mode === 'create'
              ? isPublic
                ? 'Publicar fallo'
                : 'Crear fallo'
              : 'Guardar cambios'}
        </button>
        <Link
          href={isPublic ? '/observatorio' : '/admin/fallos'}
          className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-white"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
