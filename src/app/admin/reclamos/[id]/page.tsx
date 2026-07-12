'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { Loader2, Sparkles, Send, Clock, Lightbulb } from 'lucide-react';
import { useAdminUser } from '@/components/admin/AdminAuth';
import type {
  ReclamoAdminBandeja,
  ReclamoComunicacion,
  ReclamoDelegado,
  ReclamoEstado,
  ReclamoGrupoEstado,
  StoredReclamoDocument,
  ReclamoComunicacionSugerencia,
} from '@/types/reclamos';
import {
  ReclamoDenuncianteSection,
  ReclamoEmpresasSection,
  ReclamoHechosSection,
  ReclamoResponsableCard,
} from '@/components/admin/ReclamoDetailEditors';
import { ReclamoEnlacesRapidos } from '@/components/admin/ReclamoEnlacesRapidos';
import { formatReclamoTitulo } from '@/lib/reclamos-display';

export default function AdminReclamoDetailPage() {
  const params = useParams<{ id: string }>();
  const reclamoId = params.id;
  const user = useAdminUser();
  const [canWrite, setCanWrite] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reclamo, setReclamo] = useState<StoredReclamoDocument | null>(null);
  const [delegados, setDelegados] = useState<ReclamoDelegado[]>([]);
  const [estados, setEstados] = useState<ReclamoEstado[]>([]);
  const [grupos, setGrupos] = useState<ReclamoGrupoEstado[]>([]);
  const [estadoId, setEstadoId] = useState('');
  const [notaEstado, setNotaEstado] = useState('');
  const [comentario, setComentario] = useState('');

  // Comunicaciones
  const PLANTILLAS = [
    'Acuse de recibo',
    'Carta Documento enviada',
    'Solicitar documentación',
    'Resolución favorable',
    'Archivo del caso',
    'Personalizado',
  ];
  const [plantilla, setPlantilla] = useState(PLANTILLAS[0]);
  const [intencion, setIntencion] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailViaIA, setEmailViaIA] = useState(false);
  const [generatingDraft, setGeneratingDraft] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailSuccess, setEmailSuccess] = useState(false);
  const [sugerencias, setSugerencias] = useState<ReclamoComunicacionSugerencia[]>([]);
  const [loadingSugerencias, setLoadingSugerencias] = useState(false);
  const [sugerenciasError, setSugerenciasError] = useState<string | null>(null);
  const [casosSimilaresUsados, setCasosSimilaresUsados] = useState(0);
  const [inboundConfigured, setInboundConfigured] = useState(false);
  const [replyToAddress, setReplyToAddress] = useState<string | null>(null);
  const [showInboundForm, setShowInboundForm] = useState(false);
  const [inboundSubject, setInboundSubject] = useState('');
  const [inboundBody, setInboundBody] = useState('');
  const [savingInbound, setSavingInbound] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/reclamos/${reclamoId}`, { credentials: 'include' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo cargar');
      if (data.reclamo) {
        setReclamo(data.reclamo);
        setEstadoId(String(data.reclamo.idCasoEstado));
      }
      setCanWrite(Boolean(data.canWrite));
      setDelegados(data.delegados || []);
      setEstados(data.estados || []);
      setGrupos(data.grupos || []);
      setInboundConfigured(Boolean(data.emailThread?.inboundConfigured));
      setReplyToAddress(typeof data.emailThread?.replyTo === 'string' ? data.emailThread.replyTo : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setLoading(false);
    }
  }, [reclamoId]);

  useEffect(() => {
    load();
  }, [load]);

  const loadSugerencias = useCallback(async () => {
    if (!canWrite) return;
    setLoadingSugerencias(true);
    setSugerenciasError(null);
    try {
      const res = await fetch(`/api/admin/reclamos/${reclamoId}/sugerencias`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudieron cargar sugerencias');
      setSugerencias(data.sugerencias || []);
    } catch (err) {
      setSugerencias([]);
      setSugerenciasError(err instanceof Error ? err.message : 'Error al cargar sugerencias');
    } finally {
      setLoadingSugerencias(false);
    }
  }, [canWrite, reclamoId]);

  useEffect(() => {
    if (canWrite) {
      void loadSugerencias();
    }
  }, [canWrite, loadSugerencias]);

  const estadosPorGrupo = useMemo(() => {
    const map = new Map<number, ReclamoEstado[]>();
    for (const estado of estados) {
      const list = map.get(estado.idGrupoEstado) ?? [];
      list.push(estado);
      map.set(estado.idGrupoEstado, list);
    }
    return map;
  }, [estados]);

  const esRecibido = reclamo?.adminBandeja === 'recibidos';

  function handleReclamoUpdated(updated: StoredReclamoDocument) {
    setReclamo(updated);
    setEstadoId(String(updated.idCasoEstado));
    void fetch(`/api/admin/reclamos/${reclamoId}`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (data.reclamo) setReclamo(data.reclamo);
        setCanWrite(Boolean(data.canWrite));
        setDelegados(data.delegados || []);
      })
      .catch(() => undefined);
  }

  async function handleIniciarGestion() {
    if (!canWrite) return;
    setStarting(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/reclamos/${reclamoId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ iniciarGestion: true }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo iniciar la gestión');
      if (data.reclamo) {
        handleReclamoUpdated(data.reclamo);
      } else {
        await load();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setStarting(false);
    }
  }

  async function handleSaveEstado() {
    if (!canWrite) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/reclamos/${reclamoId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idCasoEstado: Number(estadoId),
          nota: notaEstado.trim() || undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo guardar');
      await load();
      setNotaEstado('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setSaving(false);
    }
  }

  async function handleGenerateDraft() {
    if (!reclamo) return;
    setGeneratingDraft(true);
    setEmailError(null);
    setEmailViaIA(false);
    try {
      const res = await fetch(`/api/admin/reclamos/${reclamoId}/ai-draft`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plantilla, intencion: intencion.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al generar borrador');
      setEmailSubject(data.subject ?? '');
      setEmailBody(data.body ?? '');
      setCasosSimilaresUsados(Number(data.casosSimilaresUsados) || 0);
      setEmailViaIA(true);
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setGeneratingDraft(false);
    }
  }

  async function handleRegisterInbound(e: React.FormEvent) {
    e.preventDefault();
    if (!inboundSubject.trim() || !inboundBody.trim()) return;
    setSavingInbound(true);
    setEmailError(null);
    try {
      const res = await fetch(`/api/admin/reclamos/${reclamoId}/comunicaciones`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          direction: 'inbound',
          subject: inboundSubject,
          body: inboundBody,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo registrar la respuesta');
      setInboundSubject('');
      setInboundBody('');
      setShowInboundForm(false);
      await load();
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setSavingInbound(false);
    }
  }

  async function handleSendEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!reclamo || !emailSubject.trim() || !emailBody.trim()) return;
    setSendingEmail(true);
    setEmailError(null);
    setEmailSuccess(false);
    try {
      const res = await fetch(`/api/admin/reclamos/${reclamoId}/comunicaciones`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: emailSubject, body: emailBody, viaIA: emailViaIA }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al enviar');
      setEmailSuccess(true);
      setEmailSubject('');
      setEmailBody('');
      setIntencion('');
      setEmailViaIA(false);
      setCasosSimilaresUsados(0);
      await load();
      await loadSugerencias();
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setSendingEmail(false);
    }
  }

  async function handleAddComentario(e: React.FormEvent) {
    e.preventDefault();
    if (!canWrite || !comentario.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/reclamos/${reclamoId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comentario }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo guardar el comentario');
      setComentario('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-[#1a5fb4]" />
      </div>
    );
  }

  if (!reclamo) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <p className="text-lg font-semibold text-slate-800">Reclamo no encontrado</p>
        <Link href="/admin/reclamos" className="mt-4 inline-block text-[#1a5fb4] hover:underline">
          Volver al listado
        </Link>
      </div>
    );
  }

  const historial = [...(reclamo.historialEstados ?? [])].reverse();
  const comentarios = reclamo.comentarios ?? [];
  const editorProps = { reclamoId, canWrite, onUpdated: handleReclamoUpdated };

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/admin/reclamos" className="text-sm font-semibold text-[#1a5fb4] hover:underline">
            ← Reclamos
          </Link>
          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Reclamo #{reclamo.id}
          </p>
          <h1 className="mt-1 text-2xl font-bold leading-tight text-slate-900 sm:text-3xl">
            {formatReclamoTitulo(reclamo)}
          </h1>
          <p className="mt-2 text-slate-500">{reclamo.resumen}</p>
          <ReclamoEnlacesRapidos reclamo={reclamo} {...editorProps} />
          <div className="mt-3 flex flex-wrap gap-2">
            <BandejaBadge bandeja={reclamo.adminBandeja ?? 'gestion'} />
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
              {reclamo.estadoDescripcion ?? 'Consulta'}
            </span>
          </div>
        </div>

        {esRecibido && canWrite ? (
          <button
            type="button"
            onClick={handleIniciarGestion}
            disabled={starting}
            className="rounded-lg bg-[#2d8f47] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1f6b31] disabled:opacity-60"
          >
            {starting ? 'Asignando…' : 'Iniciar gestión'}
          </button>
        ) : null}
      </div>

      {error ? (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {!canWrite && user.permissions.includes('reclamos:read') ? (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Vista de solo lectura: este reclamo no está asignado a tu usuario.
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <section className="space-y-6">
          <ReclamoDenuncianteSection reclamo={reclamo} {...editorProps} />
          <ReclamoHechosSection reclamo={reclamo} {...editorProps} />
          <ReclamoEmpresasSection reclamo={reclamo} {...editorProps} />

          {reclamo.causas?.length ? (
            <Panel title="Causas / motivos">
              <ul className="list-inside list-disc text-sm text-slate-700">
                {reclamo.causas.map((causa) => (
                  <li key={causa.id}>{causa.descripcion}</li>
                ))}
              </ul>
            </Panel>
          ) : null}

          <Panel title="Historial de estados">
            {historial.length === 0 ? (
              <p className="text-sm text-slate-500">Sin movimientos registrados todavía.</p>
            ) : (
              <ol className="space-y-4">
                {historial.map((item, index) => (
                  <li key={`${item.changedAt}-${item.idCasoEstado}-${index}`} className="relative pl-6">
                    <span className="absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full bg-[#1a5fb4]" />
                    <p className="text-sm font-semibold text-slate-900">{item.estadoDescripcion}</p>
                    <p className="text-xs text-slate-500">
                      {format(new Date(item.changedAt), "d MMM yyyy HH:mm", { locale: es })}
                      {item.changedByName ? ` · ${item.changedByName}` : ''}
                    </p>
                    {item.nota ? <p className="mt-1 text-sm text-slate-600">{item.nota}</p> : null}
                  </li>
                ))}
              </ol>
            )}
          </Panel>

          <Panel title="Notas internas">
            {comentarios.length === 0 ? (
              <p className="mb-4 text-sm text-slate-500">Todavía no hay notas del equipo.</p>
            ) : (
              <div className="mb-4 space-y-3">
                {comentarios.map((item) => (
                  <article key={item.id} className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">
                      {item.authorName} · {format(new Date(item.createdAt), "d MMM yyyy HH:mm", { locale: es })}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{item.texto}</p>
                  </article>
                ))}
              </div>
            )}

            {canWrite ? (
              <form onSubmit={handleAddComentario} className="space-y-3">
                <textarea
                  value={comentario}
                  onChange={(e) => setComentario(e.target.value)}
                  rows={3}
                  placeholder="Agregar nota interna visible solo para el equipo…"
                  className="field-input"
                />
                <button
                  type="submit"
                  disabled={saving || !comentario.trim()}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  Guardar nota
                </button>
              </form>
            ) : null}
          </Panel>

          {canWrite ? (
            <ComunicacionesPanel
              reclamo={reclamo}
              plantillas={PLANTILLAS}
              plantilla={plantilla}
              onPlantilla={setPlantilla}
              intencion={intencion}
              onIntencion={setIntencion}
              sugerencias={sugerencias}
              loadingSugerencias={loadingSugerencias}
              sugerenciasError={sugerenciasError}
              casosSimilaresUsados={casosSimilaresUsados}
              inboundConfigured={inboundConfigured}
              replyToAddress={replyToAddress}
              showInboundForm={showInboundForm}
              onToggleInboundForm={() => setShowInboundForm((value) => !value)}
              inboundSubject={inboundSubject}
              onInboundSubject={setInboundSubject}
              inboundBody={inboundBody}
              onInboundBody={setInboundBody}
              savingInbound={savingInbound}
              onRegisterInbound={handleRegisterInbound}
              subject={emailSubject}
              onSubject={setEmailSubject}
              body={emailBody}
              onBody={setEmailBody}
              viaIA={emailViaIA}
              onClearIA={() => {
                setEmailViaIA(false);
                setCasosSimilaresUsados(0);
              }}
              generating={generatingDraft}
              sending={sendingEmail}
              error={emailError}
              success={emailSuccess}
              onClearSuccess={() => setEmailSuccess(false)}
              onGenerateDraft={handleGenerateDraft}
              onSend={handleSendEmail}
            />
          ) : null}
        </section>

        <section className="space-y-6">
          <ReclamoResponsableCard
            reclamo={reclamo}
            delegados={delegados}
            {...editorProps}
          />

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-slate-900">Avanzar estado</h2>
            {canWrite ? (
              <>
                <select
                  value={estadoId}
                  onChange={(e) => setEstadoId(e.target.value)}
                  className="field-input"
                >
                  {grupos.map((grupo) => {
                    const opciones = estadosPorGrupo.get(grupo.id) ?? [];
                    if (!opciones.length) return null;
                    return (
                      <optgroup key={grupo.id} label={grupo.descripcion}>
                        {opciones.map((estado) => (
                          <option key={estado.id} value={estado.id}>
                            {estado.descripcion.trim()}
                          </option>
                        ))}
                      </optgroup>
                    );
                  })}
                </select>
                <textarea
                  value={notaEstado}
                  onChange={(e) => setNotaEstado(e.target.value)}
                  rows={2}
                  placeholder="Nota opcional para el historial…"
                  className="field-input mb-3 mt-4"
                />
                <button
                  type="button"
                  onClick={handleSaveEstado}
                  disabled={saving || esRecibido}
                  className="w-full rounded-lg bg-[#1a5fb4] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#004a80] disabled:opacity-60"
                >
                  {saving ? 'Guardando…' : 'Actualizar estado'}
                </button>
                {esRecibido ? (
                  <p className="mt-3 text-xs text-slate-500">
                    Primero iniciá la gestión para asignarte el caso y avanzar el workflow.
                  </p>
                ) : null}
              </>
            ) : (
              <p className="text-sm text-slate-500">No tenés permiso para modificar estados.</p>
            )}
            <p className="mt-4 text-xs text-slate-500">
              Creado: {new Date(reclamo.createdAt).toLocaleString('es-AR')}
            </p>
          </div>

          <TiempoEnEstadoWidget reclamo={reclamo} />
        </section>
      </div>
    </div>
  );
}

function BandejaBadge({ bandeja }: { bandeja: ReclamoAdminBandeja }) {
  const styles: Record<ReclamoAdminBandeja, string> = {
    recibidos: 'bg-amber-100 text-amber-800',
    gestion: 'bg-sky-100 text-sky-800',
    archivados: 'bg-slate-100 text-slate-700',
  };
  const labels: Record<ReclamoAdminBandeja, string> = {
    recibidos: 'Recibido',
    gestion: 'En gestión',
    archivados: 'Archivado',
  };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles[bandeja]}`}>
      {labels[bandeja]}
    </span>
  );
}

function TiempoEnEstadoWidget({ reclamo }: { reclamo: StoredReclamoDocument }) {
  const esArchivado = reclamo.adminBandeja === 'archivados';
  if (esArchivado) return null;

  const ultimoCambio = reclamo.historialEstados?.length
    ? reclamo.historialEstados[reclamo.historialEstados.length - 1].changedAt
    : reclamo.createdAt;

  const dias = differenceInDays(new Date(), new Date(ultimoCambio));
  const alerta = dias >= 7;
  const advertencia = !alerta && dias >= 3;

  const colorBorder = alerta ? 'border-red-200' : advertencia ? 'border-amber-200' : 'border-slate-200';
  const colorBg = alerta ? 'bg-red-50' : advertencia ? 'bg-amber-50' : 'bg-white';
  const colorDias = alerta ? 'text-red-600' : advertencia ? 'text-amber-600' : 'text-slate-700';
  const colorText = alerta ? 'text-red-700' : advertencia ? 'text-amber-700' : 'text-slate-500';

  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${colorBorder} ${colorBg}`}>
      <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-slate-900">
        <Clock className="h-4 w-4" />
        Tiempo en estado
      </h2>
      <p className={`text-3xl font-extrabold ${colorDias}`}>
        {dias === 0 ? 'Hoy' : `${dias} día${dias !== 1 ? 's' : ''}`}
      </p>
      <p className={`mt-1 text-xs ${colorText}`}>
        En &quot;{reclamo.estadoDescripcion ?? 'Consulta'}&quot; desde{' '}
        {format(new Date(ultimoCambio), "d MMM yyyy", { locale: es })}
      </p>
      {alerta && (
        <p className="mt-2 text-xs font-semibold text-red-700">⚠ Caso sin actividad hace más de una semana</p>
      )}
      {advertencia && !alerta && (
        <p className="mt-2 text-xs font-semibold text-amber-700">⚡ Sin actividad en los últimos {dias} días</p>
      )}
    </div>
  );
}

type ComunicacionesPanelProps = {
  reclamo: StoredReclamoDocument;
  plantillas: string[];
  plantilla: string;
  onPlantilla: (v: string) => void;
  intencion: string;
  onIntencion: (v: string) => void;
  sugerencias: ReclamoComunicacionSugerencia[];
  loadingSugerencias: boolean;
  sugerenciasError: string | null;
  casosSimilaresUsados: number;
  inboundConfigured: boolean;
  replyToAddress: string | null;
  showInboundForm: boolean;
  onToggleInboundForm: () => void;
  inboundSubject: string;
  onInboundSubject: (v: string) => void;
  inboundBody: string;
  onInboundBody: (v: string) => void;
  savingInbound: boolean;
  onRegisterInbound: (e: React.FormEvent) => void;
  subject: string;
  onSubject: (v: string) => void;
  body: string;
  onBody: (v: string) => void;
  viaIA: boolean;
  onClearIA: () => void;
  generating: boolean;
  sending: boolean;
  error: string | null;
  success: boolean;
  onClearSuccess: () => void;
  onGenerateDraft: () => void;
  onSend: (e: React.FormEvent) => void;
};

function ComunicacionesPanel({
  reclamo,
  plantillas,
  plantilla,
  onPlantilla,
  intencion,
  onIntencion,
  sugerencias,
  loadingSugerencias,
  sugerenciasError,
  casosSimilaresUsados,
  inboundConfigured,
  replyToAddress,
  showInboundForm,
  onToggleInboundForm,
  inboundSubject,
  onInboundSubject,
  inboundBody,
  onInboundBody,
  savingInbound,
  onRegisterInbound,
  subject,
  onSubject,
  body,
  onBody,
  viaIA,
  onClearIA,
  generating,
  sending,
  error,
  success,
  onClearSuccess,
  onGenerateDraft,
  onSend,
}: ComunicacionesPanelProps) {
  const comunicaciones = reclamo.comunicaciones ?? [];
  const emailDestino = reclamo.denunciante.email;

  return (
    <div className="overflow-hidden rounded-2xl border-2 border-[#1a5fb4]/20 bg-[#f0f6ff] shadow-sm">
      <div className="border-b border-[#1a5fb4]/10 bg-[#e8f0fb] px-5 py-4">
        <h2 className="flex items-center gap-2 text-base font-bold text-[#0d3a6e]">
          <Send className="h-4 w-4" />
          Comunicar al consumidor
          <span className="ml-1 rounded-full bg-[#1a5fb4] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
            Email
          </span>
        </h2>
        <p className="mt-0.5 text-xs text-[#1a5fb4]">
          Se envía a: <strong>{emailDestino}</strong>
          {replyToAddress ? (
            <span className="mt-1 block text-[11px] text-slate-600">
              Las respuestas del consumidor llegan a: <code className="rounded bg-white/70 px-1">{replyToAddress}</code>
            </span>
          ) : null}
        </p>
      </div>

      <div className="space-y-4 p-5">
        {!inboundConfigured ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            Para capturar respuestas automáticamente, configurá{' '}
            <code className="rounded bg-amber-100 px-1">RECLAMOS_INBOUND_DOMAIN</code> y el webhook de Resend.
            Mientras tanto, podés pegar manualmente la respuesta del consumidor abajo.
          </div>
        ) : (
          <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-800">
            Las respuestas por email del consumidor se registran automáticamente en este hilo.
          </div>
        )}
        <div>
          <label className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <Lightbulb className="h-3.5 w-3.5" />
            ¿Qué querés comunicar?
          </label>
          <textarea
            value={intencion}
            onChange={(e) => {
              onIntencion(e.target.value);
              onClearIA();
            }}
            rows={3}
            placeholder="Escribí palabras sueltas o la idea del mensaje. Ej.: avisar que enviamos carta documento, pedir factura, informar resolución favorable…"
            className="field-input text-sm"
          />
          <p className="mt-1 text-[11px] text-slate-500">
            Gemini redactará el mensaje formal a partir de esta intención y de casos similares.
          </p>
        </div>

        {/* Plantillas rápidas */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Plantilla rápida
          </p>
          <div className="flex flex-wrap gap-2">
            {plantillas.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => { onPlantilla(p); onClearIA(); }}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                  plantilla === p
                    ? 'border-[#1a5fb4] bg-[#1a5fb4] text-white'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-violet-200 bg-violet-50/70 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-violet-800">
              <Sparkles className="h-3.5 w-3.5" />
              Modelos de casos similares
            </p>
            {loadingSugerencias ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-600" />
            ) : null}
          </div>

          {sugerenciasError ? (
            <p className="text-xs text-red-700">{sugerenciasError}</p>
          ) : loadingSugerencias ? (
            <p className="text-xs text-violet-700">Buscando contestaciones parecidas…</p>
          ) : sugerencias.length === 0 ? (
            <p className="text-xs text-violet-700">
              Todavía no hay emails enviados en casos parecidos a este. Igual podés redactar con Gemini usando tu intención.
            </p>
          ) : (
            <div className="space-y-2">
              {sugerencias.map((item) => (
                <SugerenciaComunicacionCard
                  key={`${item.reclamoId}-${item.comunicacion.sentAt}`}
                  item={item}
                  onUsar={() => {
                    onSubject(item.comunicacion.subject);
                    onBody(item.comunicacion.body);
                    onClearIA();
                  }}
                />
              ))}
            </div>
          )}
        </div>

        <form onSubmit={onSend} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Asunto</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => { onSubject(e.target.value); onClearIA(); }}
              placeholder="Asunto del email…"
              className="field-input"
              required
            />
          </div>

          <div>
            <label className="mb-1 flex items-center justify-between text-xs font-semibold text-slate-600">
              Mensaje
              {viaIA && (
                <span className="flex items-center gap-1 text-[10px] font-semibold text-[#1a5fb4]">
                  <Sparkles className="h-3 w-3" />
                  Generado con Gemini
                  {casosSimilaresUsados > 0 ? ` · ${casosSimilaresUsados} caso(s) similar(es)` : ''}
                </span>
              )}
            </label>
            <textarea
              value={body}
              onChange={(e) => { onBody(e.target.value); onClearIA(); }}
              rows={8}
              placeholder="Escribí el mensaje o usá Gemini para generar un borrador…"
              className="field-input font-mono text-xs"
              required
            />
          </div>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </p>
          )}
          {success && (
            <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs font-semibold text-green-700">
              ✓ Email enviado correctamente a {emailDestino}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => { onClearSuccess(); onGenerateDraft(); }}
              disabled={generating}
              className="flex items-center gap-2 rounded-lg bg-slate-700 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {generating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              {generating ? 'Generando…' : 'Redactar con Gemini'}
            </button>

            <button
              type="submit"
              disabled={sending || !subject.trim() || !body.trim()}
              className="flex items-center gap-2 rounded-lg bg-[#1a5fb4] px-4 py-2 text-xs font-semibold text-white hover:bg-[#004a80] disabled:opacity-60"
            >
              {sending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              {sending ? 'Enviando…' : 'Enviar email'}
            </button>
          </div>
        </form>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <button
            type="button"
            onClick={onToggleInboundForm}
            className="text-xs font-semibold text-slate-700 hover:text-[#1a5fb4]"
          >
            {showInboundForm ? '▲ Ocultar' : '▼ Registrar respuesta del consumidor manualmente'}
          </button>
          {showInboundForm ? (
            <form onSubmit={onRegisterInbound} className="mt-3 space-y-3">
              <p className="text-[11px] text-slate-500">
                Si la respuesta llegó a la casilla general, pegala acá para no perder el hilo.
              </p>
              <input
                type="text"
                value={inboundSubject}
                onChange={(e) => onInboundSubject(e.target.value)}
                placeholder="Asunto del email del consumidor…"
                className="field-input text-sm"
                required
              />
              <textarea
                value={inboundBody}
                onChange={(e) => onInboundBody(e.target.value)}
                rows={5}
                placeholder="Pegá acá el texto de la respuesta del consumidor…"
                className="field-input font-mono text-xs"
                required
              />
              <button
                type="submit"
                disabled={savingInbound || !inboundSubject.trim() || !inboundBody.trim()}
                className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                {savingInbound ? 'Guardando…' : 'Guardar respuesta en el hilo'}
              </button>
            </form>
          ) : null}
        </div>

        {/* Historial de comunicaciones */}
        {comunicaciones.length > 0 && (
          <div className="border-t border-slate-200 pt-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Hilo de comunicación ({comunicaciones.length})
            </p>
            <div className="space-y-2">
              {[...comunicaciones].reverse().map((c) => (
                <ComunicacionItem key={c.id} c={c} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SugerenciaComunicacionCard({
  item,
  onUsar,
}: {
  item: ReclamoComunicacionSugerencia;
  onUsar: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <article className="rounded-lg border border-violet-200 bg-white">
      <div className="flex items-start justify-between gap-3 px-3 py-2.5">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="min-w-0 flex-1 text-left"
        >
          <p className="text-xs font-semibold text-slate-800">
            Reclamo #{item.reclamoId} · {item.empresas}
          </p>
          <p className="mt-0.5 truncate text-[11px] text-slate-500">{item.comunicacion.subject}</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {item.motivos.map((motivo) => (
              <span
                key={motivo}
                className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-medium text-violet-800"
              >
                {motivo}
              </span>
            ))}
          </div>
        </button>
        <button
          type="button"
          onClick={onUsar}
          className="shrink-0 rounded-lg border border-violet-300 px-2.5 py-1.5 text-[11px] font-semibold text-violet-800 hover:bg-violet-100"
        >
          Usar modelo
        </button>
      </div>
      {open ? (
        <div className="border-t border-violet-100 px-3 py-2.5">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            {item.estadoDescripcion} · {format(new Date(item.comunicacion.sentAt), "d MMM yyyy", { locale: es })}
          </p>
          <p className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-slate-600">
            {item.comunicacion.body}
          </p>
        </div>
      ) : null}
    </article>
  );
}

function ComunicacionItem({ c }: { c: ReclamoComunicacion }) {
  const [open, setOpen] = useState(false);
  const isInbound = c.direction === 'inbound';

  return (
    <article
      className={`rounded-xl border bg-white ${
        isInbound ? 'border-emerald-200 bg-emerald-50/40' : 'border-slate-200'
      }`}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-slate-800">{c.subject}</p>
          <p className="mt-0.5 text-[11px] text-slate-400">
            {isInbound ? `← ${c.from ?? c.sentByEmail}` : `→ ${c.to}`} ·{' '}
            {format(new Date(c.sentAt), "d MMM yyyy HH:mm", { locale: es })}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              isInbound ? 'bg-emerald-100 text-emerald-800' : 'bg-sky-100 text-sky-800'
            }`}
          >
            {isInbound ? 'Consumidor' : 'UCU'}
          </span>
          {c.viaIA && !isInbound ? (
            <span className="flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-[#1a5fb4]">
              <Sparkles className="h-2.5 w-2.5" /> IA
            </span>
          ) : null}
          {!isInbound ? (
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">
              Enviado
            </span>
          ) : null}
          <span className="text-xs text-slate-400">{open ? '▲' : '▼'}</span>
        </div>
      </button>
      {open && (
        <div className="border-t border-slate-100 px-4 py-3">
          <p className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-slate-600">
            {c.body}
          </p>
          <p className="mt-2 text-[10px] text-slate-400">
            {isInbound ? 'Respuesta de' : 'Enviado por'} {c.sentByName}
          </p>
        </div>
      )}
    </article>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-lg font-bold text-slate-900">{title}</h2>
      {children}
    </div>
  );
}
