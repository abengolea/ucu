import Link from 'next/link';
import { BrandStripe } from '@/components/Logo';

const DOORS = [
  {
    href: '/observatorio/fallos',
    index: '01',
    eyebrow: 'Jurisprudencia',
    title: 'Observatorio de fallos de consumo',
    body: 'Sentencias sobre defensa del consumidor en Argentina: resumen, tribunal, rubro y demandado. Consulta gratuita con registro.',
    cta: 'Entrar a los fallos',
    note: 'Pedimos cuenta para consultar',
    accent: 'yellow' as const,
  },
  {
    href: '/investigaciones',
    index: '02',
    eyebrow: 'Empresas',
    title: 'Observatorio de empresas',
    body: 'Análisis de compañías publicados por miembros de UCU, con datos y contexto. Consulta gratuita con registro.',
    cta: 'Ver las empresas',
    note: 'Pedimos cuenta para consultar',
    accent: 'magenta' as const,
  },
];

const accentBar = {
  yellow: 'bg-ucu-yellow',
  magenta: 'bg-ucu-magenta',
};

const accentIndex = {
  yellow: 'text-ucu-yellow',
  magenta: 'text-ucu-magenta',
};

export function ObservatorioHubHero() {
  return (
    <section className="relative overflow-hidden rounded-xl bg-ucu-nav text-white">
      <BrandStripe />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage: `
            linear-gradient(115deg, transparent 48%, oklch(52% 0.14 245) 48%, oklch(52% 0.14 245) 48.4%, transparent 48.4%),
            repeating-linear-gradient(90deg, transparent, transparent 71px, oklch(100% 0 0 / 0.04) 71px, oklch(100% 0 0 / 0.04) 72px)
          `,
        }}
        aria-hidden
      />
      <div className="relative px-6 py-12 md:px-10 md:py-16">
        <p className="mb-3 font-display text-xs font-bold uppercase tracking-[0.2em] text-ucu-yellow">
          UCU · Observatorio
        </p>
        <h1 className="mb-4 max-w-2xl font-display text-3xl font-extrabold leading-[1.08] tracking-tight text-balance md:text-5xl">
          Observatorio
        </h1>
        <p className="max-w-xl font-serif text-base leading-relaxed text-white/80 md:text-lg">
          Fallos judiciales de consumo y análisis de empresas.
        </p>
      </div>
    </section>
  );
}

export function ObservatorioDoors() {
  return (
    <div className="grid gap-4 md:grid-cols-2 md:gap-5">
      {DOORS.map((door) => (
        <Link
          key={door.href}
          href={door.href}
          className="group relative flex min-h-[22rem] flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-7 transition hover:border-[var(--border-strong)] hover:shadow-[0_12px_40px_-24px_oklch(32%_0.04_245_/_0.45)] md:p-9"
        >
          <span
            className={`absolute inset-y-0 left-0 w-1.5 ${accentBar[door.accent]}`}
            aria-hidden
          />
          <p
            className={`font-display text-xs font-bold uppercase tracking-[0.2em] ${accentIndex[door.accent]}`}
          >
            {door.index} · {door.eyebrow}
          </p>
          <h2 className="mt-5 max-w-[16ch] font-display text-[1.65rem] font-extrabold leading-[1.12] tracking-tight text-[var(--ink)] md:text-[1.85rem]">
            {door.title}
          </h2>
          <p className="mt-4 max-w-prose flex-1 font-serif text-[0.95rem] leading-relaxed text-[var(--ink-muted)]">
            {door.body}
          </p>
          <div className="mt-8 flex flex-wrap items-end justify-between gap-3">
            <span className="font-display text-sm font-semibold text-ucu-magenta transition group-hover:text-[#b80063]">
              {door.cta} →
            </span>
            <span className="font-display text-[0.65rem] font-bold uppercase tracking-[0.16em] text-[var(--ink-faint)]">
              {door.note}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
