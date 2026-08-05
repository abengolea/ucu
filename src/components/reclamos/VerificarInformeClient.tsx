'use client';

import { useEffect, useRef, useState } from 'react';
import {
  BadgeCheck,
  CheckCircle2,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  Search,
  ShieldCheck,
  Upload,
  XCircle,
} from 'lucide-react';
import type { InformeVerificacionPublica } from '@/types/informes';

const MAX_PDF_BYTES = 8 * 1024 * 1024;

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return y && m && d ? `${d}/${m}/${y}` : iso;
}

function formatHashGroups(hash: string): string {
  return hash.replace(/(.{8})(?=.)/g, '$1 ').trim();
}

async function sha256Hex(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function VerificarInformeClient({ initialCodigo = '' }: { initialCodigo?: string }) {
  const [codigo, setCodigo] = useState(initialCodigo);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<InformeVerificacionPublica | null>(null);
  const [invalidMessage, setInvalidMessage] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const [droppedName, setDroppedName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function resetOutcome() {
    setError(null);
    setResult(null);
    setInvalidMessage(null);
    setPdfLoading(true);
  }

  async function verifyByCodigo(valueRaw: string) {
    const value = valueRaw.trim().toUpperCase();
    if (!value) return;

    setLoading(true);
    resetOutcome();
    setDroppedName(null);

    try {
      const res = await fetch(`/api/informes/verificar/${encodeURIComponent(value)}`);
      const data = await res.json();
      if (res.status === 404 || data.valido === false) {
        setInvalidMessage(data.error || 'Código no válido.');
        return;
      }
      if (!res.ok) throw new Error(data.error || 'No se pudo verificar');
      setResult(data as InformeVerificacionPublica);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setLoading(false);
    }
  }

  async function verifyByFile(file: File) {
    const isPdf =
      file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      setError('Solo se aceptan archivos PDF.');
      setResult(null);
      setInvalidMessage(null);
      return;
    }
    if (file.size > MAX_PDF_BYTES) {
      setError('El archivo supera el límite de 8 MB.');
      setResult(null);
      setInvalidMessage(null);
      return;
    }

    setLoading(true);
    resetOutcome();
    setDroppedName(file.name);

    try {
      const hash = await sha256Hex(file);
      const res = await fetch('/api/informes/verificar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hash }),
      });
      const data = await res.json();
      if (res.status === 404 || data.valido === false) {
        setInvalidMessage(data.error || 'El PDF no pudo verificarse.');
        return;
      }
      if (!res.ok) throw new Error(data.error || 'No se pudo verificar');
      setResult(data as InformeVerificacionPublica);
      if (typeof data.codigo === 'string') {
        setCodigo(data.codigo);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (initialCodigo.trim()) {
      void verifyByCodigo(initialCodigo);
    }
    // Solo al montar con código en la URL
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    await verifyByCodigo(codigo);
  }

  function onDrop(event: React.DragEvent) {
    event.preventDefault();
    setDragOver(false);
    const file = event.dataTransfer.files?.[0];
    if (file) void verifyByFile(file);
  }

  return (
    <div className="space-y-8">
      <section
        onDragEnter={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragOver(false);
        }}
        onDrop={onDrop}
        className={[
          'rounded-2xl border-2 border-dashed px-5 py-10 text-center transition sm:px-8',
          dragOver
            ? 'border-ucu-blue bg-ucu-blue/10'
            : 'border-[var(--border-strong)] bg-[var(--surface-raised)]',
        ].join(' ')}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void verifyByFile(file);
            e.target.value = '';
          }}
        />
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-ucu-blue/10 text-ucu-blue">
          {loading && droppedName ? (
            <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
          ) : (
            <Upload className="h-6 w-6" aria-hidden />
          )}
        </div>
        <h2 className="mt-4 font-display text-lg font-bold text-[var(--ink)]">
          Arrastrá el PDF acá
        </h2>
        <p className="mx-auto mt-2 max-w-md font-serif text-sm leading-relaxed text-[var(--ink-muted)]">
          Calculamos la huella SHA-256 en tu navegador y la comparamos con los informes
          emitidos por UCU. El archivo no se sube a nuestros servidores.
        </p>
        <button
          type="button"
          disabled={loading}
          onClick={() => fileInputRef.current?.click()}
          className="ucu-btn-primary mt-5 disabled:opacity-60"
        >
          {loading && droppedName ? 'Verificando PDF…' : 'Elegir archivo PDF'}
        </button>
        {droppedName ? (
          <p className="mt-3 font-display text-xs text-[var(--ink-muted)]">
            Archivo: {droppedName}
          </p>
        ) : null}
      </section>

      <div className="relative">
        <div className="absolute inset-x-0 top-1/2 border-t border-[var(--border)]" aria-hidden />
        <p className="relative mx-auto w-fit bg-[var(--surface)] px-3 font-display text-xs font-bold uppercase tracking-[0.14em] text-[var(--ink-muted)]">
          o con el código
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-3 sm:flex-row sm:items-end"
      >
        <label className="block flex-1">
          <span className="mb-1 block font-display text-sm font-semibold text-[var(--ink)]">
            Código de verificación
          </span>
          <input
            className="field-input w-full uppercase tracking-wider"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            placeholder="UCU-XXXX-XXXX"
            required
            spellCheck={false}
          />
        </label>
        <button type="submit" disabled={loading} className="ucu-btn-secondary disabled:opacity-60">
          {loading && !droppedName ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Verificando…
            </span>
          ) : (
            <span className="inline-flex items-center gap-2">
              <Search className="h-4 w-4" /> Verificar código
            </span>
          )}
        </button>
      </form>

      {error ? (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      {invalidMessage ? (
        <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-5">
          <XCircle className="h-6 w-6 shrink-0 text-amber-700" />
          <div>
            <h2 className="font-display text-lg font-bold text-amber-950">No verificado</h2>
            <p className="mt-1 font-serif text-sm text-amber-900">{invalidMessage}</p>
            {droppedName ? (
              <ul className="mt-3 space-y-1 font-serif text-sm text-amber-900">
                <li>
                  Si el archivo fue reimpreso, editado o reexportado desde otro programa, su huella
                  cambia aunque el contenido se vea igual.
                </li>
                <li>
                  Verificalo con el código impreso en el pie del informe (formato UCU-XXXX-XXXX) o
                  descargá de nuevo el PDF original desde el correo de UCU.
                </li>
              </ul>
            ) : null}
          </div>
        </div>
      ) : null}

      {result?.valido ? (
        <div className="space-y-5">
          <div className="overflow-hidden rounded-2xl border border-ucu-blue/25 bg-gradient-to-br from-ucu-blue/10 via-[var(--surface-raised)] to-ucu-green/10">
            <div className="flex flex-col gap-4 border-b border-ucu-blue/15 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div className="flex gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ucu-blue text-white">
                  <BadgeCheck className="h-6 w-6" aria-hidden />
                </div>
                <div>
                  <p className="font-display text-xs font-bold uppercase tracking-[0.14em] text-ucu-blue">
                    Certificado auténtico
                  </p>
                  <h2 className="font-display text-xl font-bold text-[var(--ink)] sm:text-2xl">
                    Emitido por {result.emisor}
                  </h2>
                  <p className="mt-1 font-serif text-sm text-[var(--ink-muted)]">
                    {droppedName
                      ? 'El PDF que cargaste coincide con la huella digital registrada por UCU.'
                      : 'Este PDF fue generado automáticamente por UCU y su huella digital coincide con nuestros registros.'}
                  </p>
                </div>
              </div>
              <div className="inline-flex items-center gap-2 self-start rounded-full bg-ucu-green/15 px-3 py-1.5 font-display text-xs font-bold uppercase tracking-wide text-ucu-green sm:self-center">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
                Verificado
              </div>
            </div>

            <dl className="grid gap-4 px-5 py-4 font-serif text-sm text-[var(--ink)] sm:grid-cols-3 sm:px-6">
              <div>
                <dt className="font-display text-xs font-bold uppercase tracking-wide text-[var(--ink-muted)]">
                  Empresa
                </dt>
                <dd className="mt-0.5 font-display font-semibold">{result.empresaNombre}</dd>
              </div>
              <div>
                <dt className="font-display text-xs font-bold uppercase tracking-wide text-[var(--ink-muted)]">
                  Emitido
                </dt>
                <dd className="mt-0.5">{formatDate(result.emitidoAt)}</dd>
              </div>
              <div>
                <dt className="font-display text-xs font-bold uppercase tracking-wide text-[var(--ink-muted)]">
                  Reclamos en el informe
                </dt>
                <dd className="mt-0.5 font-display font-semibold">{result.totalReclamos}</dd>
              </div>
            </dl>
          </div>

          {result.pdfHash ? (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-ucu-magenta/10 text-ucu-magenta">
                  <CheckCircle2 className="h-5 w-5" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-display text-base font-bold text-[var(--ink)]">
                    Huella digital del PDF (SHA-256)
                  </h3>
                  <p className="mt-1 font-serif text-sm text-[var(--ink-muted)]">
                    Cualquier copia alterada del archivo tendrá un hash distinto.
                  </p>
                  <div className="mt-4 rounded-xl border border-dashed border-ucu-blue/30 bg-ucu-blue/[0.04] px-4 py-3">
                    <p className="break-all font-mono text-[11px] leading-relaxed tracking-wide text-[var(--ink)] sm:text-xs">
                      {formatHashGroups(result.pdfHash)}
                    </p>
                  </div>
                  <p className="mt-3 font-display text-xs text-[var(--ink-muted)]">
                    Referencia interna: {result.codigo}
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {result.pdfUrl ? (
            <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--surface-raised)] px-4 py-3 sm:px-5">
                <div className="flex min-w-0 items-center gap-2">
                  <FileText className="h-4 w-4 shrink-0 text-ucu-blue" aria-hidden />
                  <div className="min-w-0">
                    <p className="truncate font-display text-sm font-semibold text-[var(--ink)]">
                      Informe certificado — {result.empresaNombre}
                    </p>
                    <p className="font-serif text-xs text-[var(--ink-muted)]">
                      Vista del PDF emitido por UCU
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <a
                    href={result.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 font-display text-xs font-semibold text-[var(--ink)] transition hover:border-ucu-blue hover:text-ucu-blue"
                  >
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                    Abrir
                  </a>
                  <a
                    href={`/api/informes/download/${encodeURIComponent(result.codigo)}`}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-ucu-blue px-3 py-1.5 font-display text-xs font-semibold text-white transition hover:bg-ucu-blue/90"
                  >
                    <Download className="h-3.5 w-3.5" aria-hidden />
                    Descargar
                  </a>
                </div>
              </div>

              <div className="relative h-[min(78vh,920px)] bg-[var(--surface)]">
                {pdfLoading ? (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--surface)]/80">
                    <Loader2 className="h-8 w-8 animate-spin text-ucu-blue" aria-hidden />
                    <span className="sr-only">Cargando PDF…</span>
                  </div>
                ) : null}
                <iframe
                  key={result.pdfUrl}
                  src={`${result.pdfUrl}#view=FitH`}
                  title={`Informe certificado UCU — ${result.codigo}`}
                  className="h-full w-full border-0 bg-white"
                  onLoad={() => setPdfLoading(false)}
                />
              </div>
            </div>
          ) : null}

          <p className="font-serif text-xs leading-relaxed text-[var(--ink-muted)]">{result.disclaimer}</p>
        </div>
      ) : null}
    </div>
  );
}
