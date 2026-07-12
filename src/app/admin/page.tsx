'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Loader2 } from 'lucide-react';
import { RequirePermission, useDefaultAdminRoute } from '@/components/admin/AdminPermissionGuard';
import { decodeHtmlEntities } from '@/lib/format';
import { textMatchesQuery } from '@/lib/text-search';
import { useRouter } from 'next/navigation';

type AdminPost = {
  slug: string;
  title: string;
  status: string;
  publishedAt: string;
};

export default function AdminHomePage() {
  const router = useRouter();
  const defaultRoute = useDefaultAdminRoute();
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (defaultRoute !== '/admin') {
      router.replace(defaultRoute);
    }
  }, [defaultRoute, router]);

  useEffect(() => {
    fetch('/api/admin/posts', { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => setPosts(data.posts || []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = posts.filter((post) =>
    textMatchesQuery(decodeHtmlEntities(post.title), query)
  );

  return (
    <RequirePermission permission="posts:read">
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Notas</h1>
          <p className="mt-1 text-slate-500">{posts.length} publicaciones en total</p>
        </div>
        <Link
          href="/admin/posts/nueva"
          className="rounded-lg bg-[#2d8f47] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1f6b31]"
        >
          + Nueva nota
        </Link>
      </div>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar por título…"
        className="mb-4 w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#1a5fb4]"
      />

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-[#1a5fb4]" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Título</th>
                <th className="px-4 py-3 font-semibold">Estado</th>
                <th className="px-4 py-3 font-semibold">Fecha</th>
                <th className="px-4 py-3 font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((post) => (
                <tr key={post.slug} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {decodeHtmlEntities(post.title)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        post.status === 'publish'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {post.status === 'publish' ? 'Publicada' : 'Borrador'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {format(new Date(post.publishedAt), 'd MMM yyyy', { locale: es })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-3">
                      <Link
                        href={`/admin/posts/${encodeURIComponent(post.slug)}/editar`}
                        className="font-semibold text-[#1a5fb4] hover:underline"
                      >
                        Editar
                      </Link>
                      <Link
                        href={`/posts/${post.slug}`}
                        className="text-slate-500 hover:text-[#1a5fb4]"
                        target="_blank"
                      >
                        Ver
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
    </RequirePermission>
  );
}
