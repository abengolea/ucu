import type { Metadata } from 'next';
import Link from 'next/link';
import { FalloList } from '@/components/observatorio/FalloCard';
import { FalloPagination } from '@/components/observatorio/FalloPagination';
import { FalloSearchForm } from '@/components/observatorio/FalloSearchForm';
import { getFallos, parseSearchParams } from '@/lib/observatorio';
import { buildPageMetadata } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = buildPageMetadata({
  title: 'Buscar fallos',
  description:
    'Buscador de fallos jurisprudenciales en defensa del consumidor. Filtrá por actor, demandado, expediente y más en el Observatorio UCU.',
  path: '/observatorio/buscar',
});

export default async function ObservatorioBuscarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedParams = await searchParams;
  const filters = parseSearchParams(resolvedParams);

  let result: Awaited<ReturnType<typeof getFallos>> | null = null;
  let error: string | null = null;

  try {
    result = await getFallos(filters);
  } catch {
    error = 'No pudimos obtener los resultados del buscador.';
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8">
        <Link href="/observatorio" className="mb-4 inline-block text-sm text-[#1a5fb4] hover:underline">
          ← Volver al observatorio
        </Link>
        <div className="mb-4 flex flex-wrap items-center gap-4">
          <Link
            href="/observatorio/nuevo"
            className="inline-flex items-center rounded-lg bg-[#2d8f47] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1f6b31]"
          >
            + Cargar un fallo
          </Link>
        </div>
        <p className="text-sm font-semibold uppercase tracking-wide text-[#2d8f47]">
          Observatorio
        </p>
        <h1 className="text-4xl font-bold text-slate-900">Buscar fallos</h1>
        {result ? (
          <p className="mt-2 text-slate-600">
            {result.totalRows} fallo{result.totalRows === 1 ? '' : 's'} encontrados
          </p>
        ) : null}
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
        <div className="min-w-0">
          <FalloSearchForm initialParams={filters} />
        </div>

        <div className="min-w-0">
          {error ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
              {error}
            </div>
          ) : (
            <>
              <FalloList fallos={result?.data ?? []} />
              {result ? (
                <div className="mt-8">
                  <FalloPagination
                    currentPage={result.currentPage}
                    totalPages={result.totalPages}
                    params={filters}
                  />
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
