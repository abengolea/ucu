import Link from 'next/link';
import { formatDemandado } from '@/lib/observatorio';
import { linkedFalloPath } from '@/lib/linked-fallo';
import type { FalloDocument } from '@/types/observatorio';

export function LinkedFalloBox({ fallo }: { fallo: FalloDocument }) {
  const demandado = formatDemandado(fallo);
  const href = linkedFalloPath(fallo.nroExpediente);
  const heading = fallo.actor
    ? `${fallo.actor}${demandado !== 'Sin especificar' ? ` c/ ${demandado}` : ''}`
    : demandado !== 'Sin especificar'
      ? demandado
      : `Expediente ${fallo.nroExpediente}`;

  return (
    <aside
      className="ucu-accent-top mt-10 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-5 py-5 sm:px-6"
      aria-label="Fallo relacionado del Observatorio"
    >
      <p className="font-display text-xs font-semibold text-ucu-blue">
        Fallo en el Observatorio
      </p>
      <h2 className="mt-2 text-balance font-display text-lg font-bold leading-snug tracking-tight text-[var(--ink)]">
        {heading}
      </h2>
      <p className="mt-1 font-display text-sm text-[var(--ink-muted)]">
        Exp. {fallo.nroExpediente}
        {fallo.fecha ? ` · ${fallo.fecha}` : ''}
        {fallo.juzgado?.nombre ? ` · ${fallo.juzgado.nombre}` : ''}
      </p>
      {fallo.resumen ? (
        <p className="mt-3 line-clamp-3 font-serif text-sm leading-relaxed text-[var(--ink-muted)]">
          {fallo.resumen}
        </p>
      ) : null}
      <Link href={href} className="ucu-btn-ghost mt-4">
        Leer el fallo →
      </Link>
    </aside>
  );
}
