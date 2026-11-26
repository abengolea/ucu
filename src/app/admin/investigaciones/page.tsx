'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Loader2 } from 'lucide-react';
import { RequirePermission } from '@/components/admin/AdminPermissionGuard';
import { decodeHtmlEntities } from '@/lib/format';

type AdminInvestigacion = {
  slug: string;
  title: string;
  empresaNombre: string;
  aiName: string;
  memberName: string;
  status: string;
  publishedAt: string;
};

export default function AdminInvestigacionesPage() {
  const [items, setItems] = useState<AdminInvestigacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    fetch('/api/admin/investigaciones', { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => setItems(data.investigaciones || []))
      .finally(() => setLoading(false));
  }, []);

  const needle = query.toLowerCase();
  const filtered = items.filter((item) =>
    `${item.title} ${item.empresaNombre} ${item.memberName} ${item.aiName}`
      .toLowerCase()
      .includes(needle)
  );

  return (
    <RequirePermission permission="posts:read">
      <div>
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Investigaciones</h1>
            <p className="mt-1 text-slate-500">
              {items.length} {items.length === 1 ? 'pieza' : 'piezas'} · se publican en /investigaciones
            </p>
          </div>
          <Link
            href="/admin/investigaciones/nueva"
            className="rounded-lg bg-[#2d8f47] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1f6b31]"
          >
            + Nueva investigación
          </Link>
        </div>

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por empresa, título o miembro…"
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
                  <th className="px-4 py-3 font-semibold">Empresa</th>
                  <th className="px-4 py-3 font-semibold">Título</th>
                  <th className="px-4 py-3 font-semibold">IA</th>
                  <th className="px-4 py-3 font-semibold">Estado</th>
                  <th className="px-4 py-3 font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.slug} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 font-medium text-slate-900">{item.empresaNombre}</td>
                    <td className="px-4 py-3 text-slate-700">{decodeHtmlEntities(item.title)}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {item.aiName}
                      {item.memberName ? ` · ${item.memberName}` : ''}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          item.status === 'publish'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {item.status === 'publish' ? 'Publicada' : 'Borrador'}
                      </span>
                      <div className="mt-1 text-xs text-slate-400">
                        {format(new Date(item.publishedAt), 'd MMM yyyy', { locale: es })}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-3">
                        <Link
                          href={`/admin/investigaciones/${encodeURIComponent(item.slug)}/editar`}
                          className="font-semibold text-[#1a5fb4] hover:underline"
                        >
                          Editar
                        </Link>
                        {item.status === 'publish' ? (
                          <Link
                            href={`/investigaciones/${item.slug}`}
                            className="text-slate-500 hover:text-[#1a5fb4]"
                            target="_blank"
                          >
                            Ver
                          </Link>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
                {!filtered.length ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                      Todavía no hay investigaciones. Creá la primera pegando un HTML.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </RequirePermission>
  );
}
