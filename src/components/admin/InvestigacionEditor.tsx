'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { slugify } from '@/lib/slug';
import { INVESTIGACION_AI_OPTIONS } from '@/types/investigaciones';
import type { InvestigacionDocument } from '@/types/investigaciones';

type InvestigacionEditorProps = {
  mode: 'create' | 'edit';
  initialSlug?: string;
};

type EmpresaHit = {
  id: number;
  nombre: string;
  cuit: string | null;
};

function toDatetimeLocal(iso: string): string {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function InvestigacionEditor({ mode, initialSlug }: InvestigacionEditorProps) {
  const [loadingDoc, setLoadingDoc] = useState(mode === 'edit');
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(mode === 'edit');
  const [excerpt, setExcerpt] = useState('');
  const [empresaNombre, setEmpresaNombre] = useState('');
  const [empresaId, setEmpresaId] = useState('');
  const [empresaHits, setEmpresaHits] = useState<EmpresaHit[]>([]);
  const [memberName, setMemberName] = useState('');
  const [aiName, setAiName] = useState('Claude');
  const [originalUrl, setOriginalUrl] = useState('');
  const [html, setHtml] = useState('');
  const [status, setStatus] = useState<'publish' | 'draft'>('draft');
  const [publishedAt, setPublishedAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const searchTimer = useRef<number | null>(null);

  useEffect(() => {
    if (mode === 'create' && !slugEdited) {
      setSlug(slugify(title || empresaNombre));
    }
  }, [title, empresaNombre, slugEdited, mode]);

  useEffect(() => {
    if (mode === 'create' && !publishedAt) {
      setPublishedAt(toDatetimeLocal(new Date().toISOString()));
    }
  }, [mode, publishedAt]);

  useEffect(() => {
    if (mode !== 'edit' || !initialSlug) return;

    setLoadingDoc(true);
    fetch(`/api/admin/investigaciones/${encodeURIComponent(initialSlug)}`, {
      credentials: 'include',
    })
      .then((res) => res.json())
      .then((data) => {
        const item = data.investigacion as InvestigacionDocument | undefined;
        if (!item) return;
        setTitle(item.title);
        setSlug(item.slug);
        setExcerpt(item.excerpt || '');
        setEmpresaNombre(item.empresaNombre);
        setEmpresaId(item.empresaId ? String(item.empresaId) : '');
        setMemberName(item.memberName);
        setAiName(item.aiName);
        setOriginalUrl(item.originalUrl || '');
        setHtml(item.html || '');
        setStatus(item.status === 'draft' ? 'draft' : 'publish');
        setPublishedAt(toDatetimeLocal(item.publishedAt));
      })
      .catch(() => setError('No se pudo cargar la investigación'))
      .finally(() => setLoadingDoc(false));
  }, [mode, initialSlug]);

  useEffect(() => {
    const query = empresaNombre.trim();
    if (query.length < 2) {
      setEmpresaHits([]);
      return;
    }

    if (searchTimer.current) window.clearTimeout(searchTimer.current);
    searchTimer.current = window.setTimeout(() => {
      fetch(`/api/admin/investigaciones/empresas?q=${encodeURIComponent(query)}`, {
        credentials: 'include',
      })
        .then((res) => res.json())
        .then((data) => setEmpresaHits(Array.isArray(data.empresas) ? data.empresas : []))
        .catch(() => setEmpresaHits([]));
    }, 250);

    return () => {
      if (searchTimer.current) window.clearTimeout(searchTimer.current);
    };
  }, [empresaNombre]);

  async function handleFile(file: File | null) {
    if (!file) return;
    const text = await file.text();
    setHtml(text);
    setSuccess(`Se cargó ${file.name} (${Math.round(file.size / 1024)} KB). Revisá y publicá.`);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (!html.trim()) {
      setError('Pegá el HTML o subí el archivo .html de la investigación');
      setLoading(false);
      return;
    }

    const form = new FormData();
    form.append('title', title);
    form.append('slug', slug);
    form.append('excerpt', excerpt);
    form.append('empresaNombre', empresaNombre);
    form.append('empresaId', empresaId);
    form.append('memberName', memberName);
    form.append('aiName', aiName);
    form.append('originalUrl', originalUrl);
    form.append('html', html);
    form.append('status', status);
    form.append('publishedAt', publishedAt ? new Date(publishedAt).toISOString() : '');

    const url =
      mode === 'edit' && initialSlug
        ? `/api/admin/investigaciones/${encodeURIComponent(initialSlug)}`
        : '/api/admin/investigaciones';
    const method = mode === 'edit' ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, { method, credentials: 'include', body: form });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'No se pudo guardar');
        return;
      }
      setSuccess(
        status === 'publish'
          ? 'Publicada en /investigaciones. Ya se lee en el sitio de UCU.'
          : 'Guardada como borrador.'
      );
      if (mode === 'create' && data.slug) {
        window.location.href = `/admin/investigaciones/${encodeURIComponent(data.slug)}/editar`;
      } else if (data.redirect) {
        window.location.href = data.redirect;
      }
    } catch {
      setError('Error de conexión al guardar');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!initialSlug) return;
    if (!window.confirm('¿Eliminar esta investigación?')) return;
    setDeleting(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/investigaciones/${encodeURIComponent(initialSlug)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'No se pudo eliminar');
        return;
      }
      window.location.href = '/admin/investigaciones';
    } catch {
      setError('Error de conexión al eliminar');
    } finally {
      setDeleting(false);
    }
  }

  if (loadingDoc) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-[#1a5fb4]" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            {mode === 'create' ? 'Nueva investigación' : 'Editar investigación'}
          </h1>
          <p className="mt-1 text-slate-500">
            Pegá el HTML de Claude, Gemini u otra IA. Se publica en UCU, no como link externo.
          </p>
        </div>
        {mode === 'edit' && initialSlug ? (
          <div className="flex gap-2">
            <Link
              href={`/investigaciones/${initialSlug}`}
              target="_blank"
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Ver en el sitio
            </Link>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
            >
              {deleting ? 'Eliminando…' : 'Eliminar'}
            </button>
          </div>
        ) : null}
      </div>

      <form onSubmit={handleSubmit} className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6">
          {error ? (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          ) : null}
          {success ? (
            <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">{success}</div>
          ) : null}

          <div>
            <label className="mb-1 block text-sm font-medium">Título *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-[#1a5fb4]"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">URL (slug)</label>
            <input
              value={slug}
              onChange={(e) => {
                setSlugEdited(true);
                setSlug(e.target.value);
              }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 font-mono text-sm outline-none focus:border-[#1a5fb4]"
            />
            <p className="mt-1 text-xs text-slate-500">ucu.org.ar/investigaciones/{slug || '…'}</p>
          </div>

          <div className="relative">
            <label className="mb-1 block text-sm font-medium">Empresa *</label>
            <input
              value={empresaNombre}
              onChange={(e) => {
                setEmpresaNombre(e.target.value);
                setEmpresaId('');
              }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-[#1a5fb4]"
              placeholder="Nombre de la empresa investigada"
              required
              autoComplete="off"
            />
            {empresaHits.length ? (
              <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                {empresaHits.map((hit) => (
                  <li key={hit.id}>
                    <button
                      type="button"
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                      onClick={() => {
                        setEmpresaNombre(hit.nombre);
                        setEmpresaId(String(hit.id));
                        setEmpresaHits([]);
                      }}
                    >
                      <span className="font-medium text-slate-900">{hit.nombre}</span>
                      {hit.cuit ? (
                        <span className="ml-2 text-xs text-slate-500">CUIT {hit.cuit}</span>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            {empresaId ? (
              <p className="mt-1 text-xs text-slate-500">
                Vinculada a denuncias UCU (empresa #{empresaId}).
              </p>
            ) : (
              <p className="mt-1 text-xs text-slate-500">
                Escribí para buscar en el catálogo. Si no está, dejá el nombre igual.
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Resumen</label>
            <textarea
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-[#1a5fb4]"
              placeholder="Una o dos frases para el listado público"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">HTML de la investigación *</label>
            <p className="mb-2 text-xs leading-relaxed text-slate-500">
              En Claude: Download / Copy del artefacto. Acá se pega o se sube el .html. No uses el
              editor de notas: este contenido es una página interactiva.
            </p>
            <label className="mb-3 inline-flex cursor-pointer rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
              Subir archivo .html
              <input
                type="file"
                accept=".html,.htm,text/html"
                className="hidden"
                onChange={(e) => void handleFile(e.target.files?.[0] ?? null)}
              />
            </label>
            <textarea
              value={html}
              onChange={(e) => setHtml(e.target.value)}
              rows={16}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 font-mono text-xs leading-relaxed outline-none focus:border-[#1a5fb4]"
              placeholder="<!DOCTYPE html>…"
              required
            />
            <p className="mt-1 text-xs text-slate-500">
              {html.length.toLocaleString('es-AR')} caracteres
            </p>
            <button
              type="button"
              onClick={() => setPreviewOpen((open) => !open)}
              className="mt-2 text-sm font-semibold text-[#1a5fb4] hover:underline"
            >
              {previewOpen ? 'Ocultar vista previa' : 'Vista previa en el admin'}
            </button>
            {previewOpen ? (
              <iframe
                title="Vista previa"
                className="mt-3 h-[28rem] w-full rounded-lg border border-slate-200 bg-white"
                srcDoc={html}
              />
            ) : null}
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="mb-4 font-semibold text-slate-900">Publicación</h2>
            <label className="mb-1 block text-sm font-medium text-slate-600">Estado</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as 'publish' | 'draft')}
              className="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="draft">Borrador</option>
              <option value="publish">Publicada</option>
            </select>
            <label className="mb-1 block text-sm font-medium text-slate-600">
              Fecha de publicación
            </label>
            <input
              type="datetime-local"
              value={publishedAt}
              onChange={(e) => setPublishedAt(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="mb-4 font-semibold text-slate-900">Quién y con qué IA</h2>
            <label className="mb-1 block text-sm font-medium text-slate-600">Miembro UCU *</label>
            <input
              value={memberName}
              onChange={(e) => setMemberName(e.target.value)}
              className="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              required
            />
            <label className="mb-1 block text-sm font-medium text-slate-600">IA usada *</label>
            <input
              list="investigacion-ai"
              value={aiName}
              onChange={(e) => setAiName(e.target.value)}
              className="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              required
            />
            <datalist id="investigacion-ai">
              {INVESTIGACION_AI_OPTIONS.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
            <label className="mb-1 block text-sm font-medium text-slate-600">
              Link original (opcional)
            </label>
            <input
              value={originalUrl}
              onChange={(e) => setOriginalUrl(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="https://claude.ai/artifact/…"
            />
            <p className="mt-1 text-xs text-slate-500">
              Queda como fuente. El visitante entra a la página de UCU.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[#2d8f47] px-5 py-3 text-sm font-semibold text-white hover:bg-[#1f6b31] disabled:opacity-60"
          >
            {loading ? 'Guardando…' : status === 'publish' ? 'Publicar en UCU' : 'Guardar borrador'}
          </button>
        </div>
      </form>
    </div>
  );
}
