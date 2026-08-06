'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Link2, Loader2 } from 'lucide-react';
import { slugify } from '@/lib/slug';
import { resolveMediaUrl } from '@/lib/media';
import type { ContentDocument } from '@/types/content';

type Category = {
  slug: string;
  name: string;
};

type PostEditorProps = {
  mode: 'create' | 'edit';
  initialSlug?: string;
};

function toDatetimeLocal(iso: string): string {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function base64ToFile(base64: string, filename: string, contentType: string): File {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], filename, { type: contentType });
}

export function PostEditor({ mode, initialSlug }: PostEditorProps) {
  const [loadingPost, setLoadingPost] = useState(mode === 'edit');
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(mode === 'edit');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [status, setStatus] = useState<'publish' | 'draft'>('publish');
  const [publishedAt, setPublishedAt] = useState('');
  const [originalLink, setOriginalLink] = useState('');
  const [sourceName, setSourceName] = useState('');
  const [importUrl, setImportUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [featuredImage, setFeaturedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [removeFeaturedImage, setRemoveFeaturedImage] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetch('/api/admin/categories', { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => setCategories(data.categories || []));
  }, []);

  useEffect(() => {
    if (mode !== 'edit' || !initialSlug) return;

    setLoadingPost(true);
    fetch(`/api/admin/posts/${encodeURIComponent(initialSlug)}`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        const post = data.post as ContentDocument | undefined;
        if (!post) return;
        setTitle(post.title);
        setSlug(post.slug);
        setExcerpt(post.excerpt || '');
        setContent(post.content || '');
        setTags(post.tags?.map((t) => t.name).join(', ') || '');
        setStatus(post.status === 'draft' ? 'draft' : 'publish');
        setPublishedAt(toDatetimeLocal(post.publishedAt));
        setSelectedCategories(post.categorySlugs || []);
        setOriginalLink(post.originalLink || '');
        setSourceName(post.sourceName || '');
        setExistingImageUrl(resolveMediaUrl(post.featuredImage?.url));
      })
      .catch(() => setError('No se pudo cargar la nota'))
      .finally(() => setLoadingPost(false));
  }, [mode, initialSlug]);

  useEffect(() => {
    if (mode === 'create' && !slugEdited) {
      setSlug(slugify(title));
    }
  }, [title, slugEdited, mode]);

  useEffect(() => {
    if (mode === 'create' && !publishedAt) {
      setPublishedAt(toDatetimeLocal(new Date().toISOString()));
    }
  }, [mode, publishedAt]);

  function toggleCategory(slugValue: string) {
    setSelectedCategories((prev) =>
      prev.includes(slugValue) ? prev.filter((s) => s !== slugValue) : [...prev, slugValue]
    );
  }

  function handleImageChange(file: File | null) {
    setFeaturedImage(file);
    setRemoveFeaturedImage(false);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(file ? URL.createObjectURL(file) : null);
  }

  async function handleImportFromUrl() {
    const url = importUrl.trim();
    if (!url) {
      setError('Pegá la URL de la nota del diario');
      return;
    }

    setImporting(true);
    setError('');
    setSuccess('');
    setImportWarnings([]);

    try {
      const res = await fetch('/api/admin/posts/import-url', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'No se pudo importar la nota');
        return;
      }

      const article = data.article as {
        title: string;
        excerpt: string;
        content: string;
        sourceName: string;
        url: string;
        warnings?: string[];
        image?: { base64: string; contentType: string; filename: string } | null;
      };

      setTitle(article.title);
      setExcerpt(article.excerpt || '');
      setContent(article.content || '');
      setOriginalLink(article.url);
      setSourceName(article.sourceName || '');
      setImportWarnings(Array.isArray(article.warnings) ? article.warnings : []);
      if (mode === 'create') {
        setSlugEdited(false);
        setStatus('draft');
      }

      if (article.image?.base64) {
        handleImageChange(
          base64ToFile(article.image.base64, article.image.filename, article.image.contentType)
        );
      }

      setSuccess(
        `Importado desde ${article.sourceName}. Quedó como borrador: revisá el texto y pasá el estado a Publicada para subirla al sitio.`
      );
    } catch {
      setError('Error de conexión al importar');
    } finally {
      setImporting(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    const form = new FormData();
    form.append('title', title);
    form.append('slug', slug);
    form.append('excerpt', excerpt);
    form.append('content', content);
    form.append('tags', tags);
    form.append('status', status);
    form.append('publishedAt', publishedAt ? new Date(publishedAt).toISOString() : '');
    form.append('categorySlugs', JSON.stringify(selectedCategories));
    form.append('originalLink', originalLink);
    form.append('sourceName', sourceName);
    form.append('removeFeaturedImage', String(removeFeaturedImage));
    if (featuredImage) form.append('featuredImage', featuredImage);

    const url =
      mode === 'edit' && initialSlug
        ? `/api/admin/posts/${encodeURIComponent(initialSlug)}`
        : '/api/admin/posts';
    const method = mode === 'edit' ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, { method, credentials: 'include', body: form });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'No se pudo guardar la nota');
        return;
      }

      const savedSlug = String(data.slug || slug || initialSlug || '');
      const isDraft = status === 'draft';
      setSuccess(
        mode === 'edit'
          ? isDraft
            ? 'Borrador actualizado'
            : 'Nota actualizada'
          : isDraft
            ? 'Borrador guardado'
            : 'Nota publicada'
      );
      setTimeout(() => {
        if (isDraft && savedSlug) {
          window.location.href = `/admin/posts/${encodeURIComponent(savedSlug)}/editar`;
          return;
        }
        if (mode === 'edit' && data.slug && data.slug !== initialSlug) {
          window.location.href = `/admin/posts/${encodeURIComponent(data.slug)}/editar`;
          return;
        }
        if (mode === 'edit') {
          window.location.reload();
          return;
        }
        window.location.href = data.url || '/admin';
      }, 600);
    } catch {
      setError('Error de conexión al guardar');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (mode !== 'edit' || !initialSlug) return;
    if (!window.confirm('¿Eliminar esta nota? Esta acción no se puede deshacer.')) return;

    setDeleting(true);
    setError('');

    try {
      const res = await fetch(`/api/admin/posts/${encodeURIComponent(initialSlug)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'No se pudo eliminar');
        return;
      }
      window.location.href = '/admin';
    } catch {
      setError('Error al eliminar');
    } finally {
      setDeleting(false);
    }
  }

  const filteredCategories = categories.filter((category) =>
    category.name.toLowerCase().includes(categoryFilter.toLowerCase())
  );

  const imagePreview = previewUrl || (!removeFeaturedImage ? existingImageUrl : null);

  if (loadingPost) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[#1a5fb4]" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/admin" className="text-sm text-[#1a5fb4] hover:underline">
            ← Volver al panel
          </Link>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            {mode === 'edit' ? 'Editar nota' : 'Nueva nota'}
          </h1>
          {mode === 'edit' && initialSlug ? (
            <p className="mt-1 text-sm text-slate-500">
              /posts/{slug || initialSlug}
            </p>
          ) : null}
        </div>
        {mode === 'edit' && initialSlug ? (
          <div className="flex gap-2">
            <Link
              href={`/posts/${slug || initialSlug}`}
              target="_blank"
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Ver publicada
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

      <div className="mb-6 rounded-2xl border border-sky-200 bg-sky-50/70 p-5">
        <div className="mb-3 flex items-center gap-2">
          <Link2 className="h-4 w-4 text-sky-800" />
          <h2 className="text-sm font-semibold text-sky-950">Importar desde diario</h2>
        </div>
        <p className="mb-3 text-sm text-sky-900/80">
          Pegá el link de la nota: copiamos título, texto, foto y fuente para que la hagas propia.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={importUrl}
            onChange={(e) => setImportUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void handleImportFromUrl();
              }
            }}
            placeholder="https://www.iprofesional.com/..."
            className="w-full flex-1 rounded-lg border border-sky-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1a5fb4]"
          />
          <button
            type="button"
            onClick={() => void handleImportFromUrl()}
            disabled={importing}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#1a5fb4] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#154a8a] disabled:opacity-60"
          >
            {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {importing ? 'Detectando…' : 'Detectar y copiar'}
          </button>
        </div>
        {importWarnings.length ? (
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-amber-900">
            {importWarnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        ) : null}
      </div>

      <form onSubmit={handleSubmit} className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6">
          {error ? (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          ) : null}
          {success ? (
            <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
              {success}
            </div>
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
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Extracto</label>
            <textarea
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-[#1a5fb4]"
              placeholder="Resumen corto para listados"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Contenido *</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={18}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 font-mono text-sm outline-none focus:border-[#1a5fb4]"
              placeholder="HTML de WordPress o texto plano"
              required
            />
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
              <option value="publish">Publicada</option>
              <option value="draft">Borrador</option>
            </select>
            <label className="mb-1 block text-sm font-medium text-slate-600">
              Fecha de publicación
            </label>
            <input
              type="datetime-local"
              value={publishedAt}
              onChange={(e) => setPublishedAt(e.target.value)}
              className="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center rounded-lg bg-[#1a5fb4] py-3 text-sm font-semibold text-white hover:bg-[#154a8a] disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : status === 'draft' ? (
                mode === 'edit' ? 'Guardar borrador' : 'Guardar como borrador'
              ) : mode === 'edit' ? (
                'Actualizar nota'
              ) : (
                'Publicar nota'
              )}
            </button>
            {status === 'draft' ? (
              <p className="mt-3 text-xs leading-relaxed text-slate-500">
                Los borradores no se ven en el sitio. Cambiá el estado a{' '}
                <strong>Publicada</strong> para verla en /posts.
              </p>
            ) : null}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="mb-4 font-semibold text-slate-900">Fuente</h2>
            <label className="mb-1 block text-sm font-medium text-slate-600">Medio</label>
            <input
              value={sourceName}
              onChange={(e) => setSourceName(e.target.value)}
              placeholder="iProfesional"
              className="mb-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#1a5fb4]"
            />
            <label className="mb-1 block text-sm font-medium text-slate-600">Link original</label>
            <input
              value={originalLink}
              onChange={(e) => setOriginalLink(e.target.value)}
              placeholder="https://..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#1a5fb4]"
            />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="mb-4 font-semibold text-slate-900">Imagen destacada</h2>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleImageChange(e.target.files?.[0] || null)}
              className="mb-3 w-full text-sm"
            />
            {imagePreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imagePreview} alt="Vista previa" className="mb-3 w-full rounded-lg object-cover" />
            ) : null}
            {existingImageUrl && !previewUrl ? (
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={removeFeaturedImage}
                  onChange={(e) => setRemoveFeaturedImage(e.target.checked)}
                />
                Quitar imagen destacada
              </label>
            ) : null}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="mb-4 font-semibold text-slate-900">Categorías</h2>
            <input
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              placeholder="Buscar categoría…"
              className="mb-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <div className="max-h-56 space-y-2 overflow-y-auto text-sm">
              {filteredCategories.map((category) => (
                <label key={category.slug} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(category.slug)}
                    onChange={() => toggleCategory(category.slug)}
                  />
                  {category.name}
                </label>
              ))}
            </div>
            <p className="mt-3 text-xs text-slate-500">
              {selectedCategories.length} seleccionada(s)
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="mb-4 font-semibold text-slate-900">Etiquetas</h2>
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="Separadas por coma"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>
      </form>
    </div>
  );
}
