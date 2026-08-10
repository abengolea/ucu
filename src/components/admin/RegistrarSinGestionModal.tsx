'use client';

import { useMemo, useState } from 'react';
import { Loader2, Sparkles, X } from 'lucide-react';
import {
  MOTIVOS_REGISTRAR_SIN_GESTION,
  PLANTILLA_REGISTRAR_SIN_GESTION,
  buildHistorialDesdeMotivos,
  buildIntencionDesdeMotivos,
} from '@/lib/reclamos-registrar-sin-gestion-motivos';

export type RegistrarSinGestionTarget = {
  id: number;
  nombre: string;
  ciudadNombre?: string | null;
  provinciaNombre?: string | null;
  email?: string | null;
};

type Props = {
  reclamo: RegistrarSinGestionTarget;
  onClose: () => void;
  onDone: (result?: { emailedTo?: string }) => void;
};

export function RegistrarSinGestionModal({ reclamo, onClose, onDone }: Props) {
  const [selected, setSelected] = useState<string[]>(['sin_delegacion']);
  const [notaExtra, setNotaExtra] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [viaIA, setViaIA] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const localidad = useMemo(() => {
    return [reclamo.ciudadNombre, reclamo.provinciaNombre].filter(Boolean).join(', ');
  }, [reclamo.ciudadNombre, reclamo.provinciaNombre]);

  function toggleMotivo(id: string) {
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  }

  async function handleGenerarIA() {
    if (!selected.length && !notaExtra.trim()) {
      setError('Elegí al menos un motivo o escribí una nota para la IA');
      return;
    }
    setGenerating(true);
    setError(null);
    try {
      const intencion = buildIntencionDesdeMotivos(selected, notaExtra, localidad);
      const res = await fetch(`/api/admin/reclamos/${reclamo.id}/ai-draft`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plantilla: PLANTILLA_REGISTRAR_SIN_GESTION,
          intencion,
          usarCasosSimilares: false,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo generar el borrador');
      setSubject(typeof data.subject === 'string' ? data.subject : '');
      setBody(typeof data.body === 'string' ? data.body : '');
      setViaIA(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al generar con IA');
    } finally {
      setGenerating(false);
    }
  }

  async function handleEnviar() {
    if (!subject.trim() || !body.trim()) {
      setError('Generá o escribí el asunto y el cuerpo del mail antes de enviar');
      return;
    }
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/reclamos/${reclamo.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registrarSinGestion: true,
          motivo: buildHistorialDesdeMotivos(selected, notaExtra),
          subject: subject.trim(),
          body: body.trim(),
          viaIA,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo registrar sin gestión');
      onDone({ emailedTo: data.emailedTo });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="registrar-sin-gestion-title"
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl"
      >
        <div className="sticky top-0 flex items-start justify-between gap-3 border-b border-slate-100 bg-white px-5 py-4">
          <div>
            <h2
              id="registrar-sin-gestion-title"
              className="text-lg font-bold text-slate-900"
            >
              Registrar sin gestión
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Reclamo #{reclamo.id} · {reclamo.nombre}
              {localidad ? ` · ${localidad}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-slate-800">Motivo (podés marcar varios)</p>
            <p className="mt-1 text-xs text-slate-500">
              Se usan para armar el mail con IA. El tono evita que suene a rechazo humillante.
            </p>
            <div className="mt-3 space-y-2">
              {MOTIVOS_REGISTRAR_SIN_GESTION.map((motivo) => {
                const checked = selected.includes(motivo.id);
                return (
                  <label
                    key={motivo.id}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5 text-sm ${
                      checked
                        ? 'border-amber-300 bg-amber-50'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleMotivo(motivo.id)}
                      className="mt-0.5"
                    />
                    <span className="text-slate-800">{motivo.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <label className="block text-sm">
            <span className="font-semibold text-slate-800">Nota extra para la IA (opcional)</span>
            <textarea
              value={notaExtra}
              onChange={(e) => setNotaExtra(e.target.value)}
              rows={2}
              placeholder="Ej. el denunciante vive en una localidad sin cobertura; sugerir oficina municipal…"
              className="field-input mt-1 w-full"
            />
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleGenerarIA}
              disabled={generating || sending}
              className="inline-flex items-center gap-2 rounded-lg bg-[#1a5fb4] px-4 py-2 text-sm font-semibold text-white hover:bg-[#004a80] disabled:opacity-60"
            >
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {generating ? 'Redactando…' : 'Redactar con IA'}
            </button>
            {viaIA ? (
              <span className="self-center text-xs font-medium text-[#1a5fb4]">
                Borrador generado — revisalo antes de enviar
              </span>
            ) : null}
          </div>

          <label className="block text-sm">
            <span className="font-semibold text-slate-800">Asunto</span>
            <input
              type="text"
              value={subject}
              onChange={(e) => {
                setSubject(e.target.value);
                setViaIA(false);
              }}
              className="field-input mt-1 w-full"
              placeholder="Usá “Redactar con IA” o escribí el asunto…"
            />
          </label>

          <label className="block text-sm">
            <span className="font-semibold text-slate-800">Mensaje</span>
            <textarea
              value={body}
              onChange={(e) => {
                setBody(e.target.value);
                setViaIA(false);
              }}
              rows={12}
              className="field-input mt-1 w-full font-mono text-[13px] leading-relaxed"
              placeholder="El cuerpo del mail al denunciante…"
            />
          </label>

          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}
        </div>

        <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-white px-5 py-4">
          <p className="text-xs text-slate-500">
            Al confirmar se archiva el caso y se envía el mail
            {reclamo.email ? ` a ${reclamo.email}` : ''}.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={sending}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleEnviar}
              disabled={sending || generating || !subject.trim() || !body.trim()}
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
            >
              {sending ? 'Enviando…' : 'Enviar y archivar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
