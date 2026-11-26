import Link from 'next/link';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { BrandStripe } from '@/components/Logo';
import type { InvestigacionListItem } from '@/types/investigaciones';

export function InvestigacionesHero() {
  return (
    <section className="relative overflow-hidden rounded-xl bg-ucu-nav text-white">
      <BrandStripe />
      <div className="px-6 py-12 md:px-10 md:py-16">
        <p className="mb-3 font-display text-xs font-bold uppercase tracking-[0.2em] text-ucu-yellow">
          Observatorio · Empresas
        </p>
        <h1 className="mb-4 max-w-2xl font-display text-3xl font-extrabold leading-tight tracking-tight text-balance md:text-4xl">
          Observatorio de empresas
        </h1>
        <p className="max-w-xl font-serif text-base leading-relaxed text-white/80 md:text-lg">
          Análisis de empresas publicados por miembros de UCU: datos y contexto
          para entender a una compañía.
        </p>
      </div>
    </section>
  );
}

const DEFAULT_CTA = 'Abrir investigación';

function publishedLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return format(date, 'd MMM yyyy', { locale: es });
}

export function InvestigacionRow({
  item,
  preview = false,
}: {
  item: Pick<
    InvestigacionListItem,
    'slug' | 'title' | 'excerpt' | 'empresaNombre' | 'memberName' | 'aiName' | 'publishedAt' | 'ctaLabel'
  >;
  preview?: boolean;
}) {
  const href = `/investigaciones/${item.slug || 'preview'}`;
  const cta = item.ctaLabel?.trim() || DEFAULT_CTA;
  const dateLabel = publishedLabel(item.publishedAt);

  return (
    <article className="group border-b border-[var(--border)] py-6 first:pt-0 last:border-b-0 last:pb-0 md:py-7">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="font-display text-xs font-bold uppercase tracking-[0.16em] text-ucu-magenta">
          {item.empresaNombre || 'Empresa'}
        </p>
        {dateLabel ? (
          <time
            dateTime={item.publishedAt}
            className="font-display text-xs text-[var(--ink-faint)]"
          >
            {dateLabel}
          </time>
        ) : null}
      </div>
      <h2 className="mt-2 font-display text-xl font-bold tracking-tight text-[var(--ink)] md:text-2xl">
        {preview ? (
          <span>{item.title || 'Título de la investigación'}</span>
        ) : (
          <Link href={href} className="transition hover:text-ucu-blue">
            {item.title}
          </Link>
        )}
      </h2>
      {item.excerpt ? (
        <p className="mt-2 max-w-prose font-serif text-sm leading-relaxed text-[var(--ink-muted)] md:text-base">
          {item.excerpt}
        </p>
      ) : null}
      {item.memberName || item.aiName ? (
        <p className="mt-3 font-display text-xs text-[var(--ink-faint)]">
          {[item.memberName, item.aiName].filter(Boolean).join(' · ')}
        </p>
      ) : null}
      {preview ? (
        <span className="mt-3 inline-flex font-display text-sm font-semibold text-ucu-magenta">
          {cta} →
        </span>
      ) : (
        <Link
          href={href}
          className="mt-3 inline-flex font-display text-sm font-semibold text-ucu-magenta transition hover:text-[#b80063]"
        >
          {cta} →
        </Link>
      )}
    </article>
  );
}

export function InvestigacionesHomeBand({ items }: { items: InvestigacionListItem[] }) {
  return (
    <section className="mt-16 border-t border-[var(--border)] pt-14">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <p className="ucu-section-title mb-1.5">Observatorio</p>
          <h2 className="font-display text-2xl font-bold tracking-tight text-[var(--ink)] md:text-3xl">
            Empresas
          </h2>
          <p className="mt-2 max-w-xl font-serif text-[var(--ink-muted)]">
            Análisis de empresas publicados por miembros de UCU.
          </p>
        </div>
        <Link href="/observatorio" className="ucu-btn-ghost shrink-0 whitespace-nowrap">
          Observatorio →
        </Link>
      </div>
      {items.length ? (
        <InvestigacionesList items={items} />
      ) : (
        <p className="font-serif text-sm text-[var(--ink-muted)]">
          El archivo se va a completar a medida que los miembros publiquen.
        </p>
      )}
    </section>
  );
}

export function InvestigacionesList({ items }: { items: InvestigacionListItem[] }) {
  if (!items.length) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--surface-raised)] px-6 py-14 text-center">
        <p className="font-display text-lg font-semibold text-[var(--ink)]">
          Todavía no hay piezas publicadas
        </p>
        <p className="mx-auto mt-2 max-w-md font-serif text-sm text-[var(--ink-muted)]">
          Cuando un miembro publique un análisis, va a aparecer acá.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-5 md:px-8">
      {items.map((item) => (
        <InvestigacionRow key={item.slug} item={item} />
      ))}
    </div>
  );
}
