import Link from 'next/link';
import { formatDemandado, formatMonto } from '@/lib/observatorio';
import type { FalloDocument } from '@/types/observatorio';
import { BrandStripe } from '@/components/Logo';

export function FalloCard({ fallo }: { fallo: FalloDocument }) {
  const monto = formatMonto(fallo);
  const demandado = formatDemandado(fallo);

  return (
    <article className="ucu-card-interactive p-5 md:p-6">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold tracking-tight text-[var(--ink)]">
            <Link href={`/observatorio/fallo/${fallo.nroExpediente}`} className="transition hover:text-ucu-blue">
              {fallo.actor || 'Actor no especificado'}
            </Link>
          </h2>
          <p className="mt-1 font-serif text-sm text-[var(--ink-muted)]">
            <span className="font-medium text-[var(--ink)]">Demandado:</span> {demandado}
          </p>
        </div>
        <div className="text-right font-display text-sm text-[var(--ink-faint)]">
          <p>{fallo.fecha}</p>
          {fallo.juzgado?.nombre ? <p className="max-w-[220px]">{fallo.juzgado.nombre}</p> : null}
        </div>
      </div>

      {fallo.rubro.length ? (
        <div className="mb-3 flex flex-wrap gap-2">
          {fallo.rubro.map((item) => (
            <span key={item.id} className="ucu-tag">
              {item.nombre}
            </span>
          ))}
        </div>
      ) : null}

      {fallo.resumen ? (
        <p className="line-clamp-3 font-serif text-sm leading-relaxed text-[var(--ink-muted)]">{fallo.resumen}</p>
      ) : (
        <p className="font-serif text-sm italic text-[var(--ink-faint)]">Sin resumen disponible.</p>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-4">
        <div className="flex flex-wrap gap-2">
          {fallo.etiquetas.slice(0, 3).map((tag) => (
            <span
              key={tag.id}
              className="rounded-md bg-[var(--surface-muted)] px-2.5 py-0.5 font-display text-xs text-[var(--ink-muted)]"
            >
              {tag.nombre}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-4 font-display text-sm">
          {monto ? <span className="font-semibold text-ucu-blue">{monto}</span> : null}
          <Link
            href={`/observatorio/fallo/${fallo.nroExpediente}`}
            className="font-semibold text-ucu-magenta transition hover:text-[#b80063]"
          >
            Ver detalle →
          </Link>
        </div>
      </div>
    </article>
  );
}

export function FalloList({ fallos }: { fallos: FalloDocument[] }) {
  if (!fallos.length) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--surface-raised)] p-12 text-center">
        <p className="font-display text-lg font-semibold text-[var(--ink)]">No se encontraron resultados</p>
        <p className="mt-2 font-serif text-sm text-[var(--ink-muted)]">
          Probá con otros filtros o volvé al buscador.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {fallos.map((fallo) => (
        <FalloCard key={fallo.nroExpediente} fallo={fallo} />
      ))}
    </div>
  );
}

export function ObservatorioHero() {
  return (
    <section className="relative overflow-hidden rounded-xl bg-ucu-nav text-white">
      <BrandStripe />
      <div className="px-6 py-12 md:px-10 md:py-16">
        <p className="mb-3 font-display text-xs font-bold uppercase tracking-[0.2em] text-ucu-yellow">
          UCU · Jurisprudencia
        </p>
        <h1 className="mb-4 max-w-2xl font-display text-3xl font-extrabold leading-tight tracking-tight md:text-4xl">
          Observatorio de fallos de consumo
        </h1>
        <p className="mb-8 max-w-xl font-serif text-base leading-relaxed text-white/80 md:text-lg">
          El Observatorio UCU es una base pública de fallos judiciales sobre defensa del
          consumidor en Argentina, con resumen, tribunal, rubro y demandado.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/observatorio/buscar" className="ucu-btn-primary">
            Buscar fallos
          </Link>
          <Link
            href="/observatorio/nuevo"
            className="inline-flex items-center justify-center rounded-lg border-2 border-white/30 bg-white/10 px-5 py-2.5 font-display text-sm font-semibold text-white transition hover:border-white/50 hover:bg-white/20"
          >
            Cargar un fallo
          </Link>
        </div>
      </div>
    </section>
  );
}
