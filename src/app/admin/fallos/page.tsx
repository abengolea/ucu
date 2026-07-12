'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import { textMatchesQuery } from '@/lib/text-search';
import { useAdminUser } from '@/components/admin/AdminAuth';

type AdminFallo = {
  nroExpediente: number;
  actor: string | null;
  resumen: string;
  fecha: string;
  status: string;
};

export default function AdminFallosPage() {
  const user = useAdminUser();
  const canDelete = user.permissions.includes('fallos:write');
  const [fallos, setFallos] = useState<AdminFallo[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadFallos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/fallos', { credentials: 'include' });
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
      setFallos(data.fallos || []);
    } catch (err) {
      setFallos([]);
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los fallos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFallos();
  }, [loadFallos]);

  async function handleDelete(nroExpediente: number) {
    if (!window.confirm(`¿Eliminar el fallo EXP. ${nroExpediente}? Esta acción no se puede deshacer.`)) {
      return;
    }

    setDeletingId(nroExpediente);
    setError(null);
    try {
      const res = await fetch(`/api/admin/fallos?id=${nroExpediente}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
      setFallos((prev) => prev.filter((f) => f.nroExpediente !== nroExpediente));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar el fallo');
    } finally {
      setDeletingId(null);
    }
  }

  const filtered = fallos.filter((fallo) =>
    textMatchesQuery(`${fallo.nroExpediente} ${fallo.actor ?? ''} ${fallo.resumen}`, query)
  );

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Fallos del observatorio</h1>
          <p className="mt-1 text-slate-500">{fallos.length} fallos en total</p>
        </div>
        <Link
          href="/admin/fallos/nuevo"
          className="rounded-lg bg-[#2d8f47] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1f6b31]"
        >
          + Nuevo fallo
        </Link>
      </div>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar por expediente, actor o resumen…"
        className="mb-4 w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#1a5fb4]"
      />

      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-[#1a5fb4]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-lg font-semibold text-slate-800">No hay fallos cargados todavía</p>
          <p className="mt-2 text-sm text-slate-500">
            Ejecutá <code>npm run migrate:observatorio</code> para importar desde el observatorio actual.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Expediente</th>
                <th className="px-4 py-3 font-semibold">Actor</th>
                <th className="px-4 py-3 font-semibold">Estado</th>
                <th className="px-4 py-3 font-semibold">Fecha</th>
                <th className="px-4 py-3 font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((fallo) => (
                <tr key={fallo.nroExpediente} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-slate-900">{fallo.nroExpediente}</td>
                  <td className="px-4 py-3 text-slate-700">{fallo.actor || '—'}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        fallo.status === 'publish'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {fallo.status === 'publish' ? 'Publicado' : 'Borrador'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{fallo.fecha}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/admin/fallos/${fallo.nroExpediente}/editar`}
                        className="font-semibold text-[#1a5fb4] hover:underline"
                      >
                        Editar
                      </Link>
                      <Link
                        href={`/observatorio/fallo/${fallo.nroExpediente}`}
                        className="text-slate-500 hover:text-[#1a5fb4]"
                        target="_blank"
                      >
                        Ver
                      </Link>
                      {canDelete ? (
                        <button
                          type="button"
                          onClick={() => handleDelete(fallo.nroExpediente)}
                          disabled={deletingId === fallo.nroExpediente}
                          title="Eliminar fallo"
                          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                        >
                          {deletingId === fallo.nroExpediente ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
