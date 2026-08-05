import Link from 'next/link';
import { BarChart3 } from 'lucide-react';
import { getSearchIndexMeta } from '@/lib/reclamos-search-index';

function formatCount(n: number): string {
  return new Intl.NumberFormat('es-AR').format(n);
}

export async function DenunciasStatsBanner({
  compact = false,
}: {
  compact?: boolean;
}) {
  const meta = await getSearchIndexMeta();
  const total = meta?.count && meta.count > 0 ? meta.count : null;

  return (
    <section
      className={
        compact
          ? 'overflow-hidden rounded-2xl border border-ucu-blue/20 bg-gradient-to-br from-ucu-blue/[0.08] via-[var(--surface-raised)] to-ucu-green/10'
          : 'border-b border-[var(--border)] bg-[var(--surface-raised)]'
      }
    >
      <div
        className={
          compact
            ? 'px-6 py-7 sm:px-8 sm:py-8'
            : 'mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:justify-between lg:px-6 lg:py-12'
        }
      >
        <div className="flex gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-ucu-blue text-white">
            <BarChart3 className="h-6 w-6" strokeWidth={1.75} aria-hidden />
          </div>
          <div>
            <p className="font-display text-xs font-bold uppercase tracking-[0.16em] text-ucu-blue">
              Estadísticas de denuncias
            </p>
            {total ? (
              <p className="mt-1 font-display text-3xl font-extrabold tracking-tight text-[var(--ink)] sm:text-4xl">
                {formatCount(total)}{' '}
                <span className="text-xl font-bold text-[var(--ink-muted)] sm:text-2xl">
                  denuncias registradas
                </span>
              </p>
            ) : (
              <p className="mt-1 font-display text-2xl font-bold tracking-tight text-[var(--ink)]">
                Datos públicos por empresa
              </p>
            )}
            <p className="mt-2 max-w-xl font-serif text-sm leading-relaxed text-[var(--ink-muted)] sm:text-base">
              Consultá cuántas denuncias recibió UCU contra una empresa. El total
              es público; el informe certificable se genera a pedido.
            </p>
          </div>
        </div>
        <div className={compact ? 'mt-5 flex flex-wrap gap-3' : 'flex shrink-0 flex-wrap gap-3'}>
          <Link href="/reclamos/estadisticas" className="ucu-btn-primary">
            Buscar empresa
          </Link>
          <Link href="/reclamos/nuevo" className="ucu-btn-secondary">
            Presentar denuncia
          </Link>
        </div>
      </div>
    </section>
  );
}
