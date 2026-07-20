import type { Metadata } from 'next';
import Link from 'next/link';
import { FalloEditor } from '@/components/admin/FalloEditor';
import { buildPageMetadata } from '@/lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Cargar fallo',
  description:
    'Colaborá con el Observatorio UCU publicando un fallo jurisprudencial en defensa del consumidor. Sin registro previo.',
  path: '/observatorio/nuevo',
});

export default function ObservatorioNuevoFalloPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10 lg:px-6">
      <Link
        href="/observatorio"
        className="mb-6 inline-block font-display text-sm font-semibold text-ucu-blue transition hover:text-ucu-magenta"
      >
        ← Volver al observatorio
      </Link>

      <div className="mb-8">
        <p className="font-display text-xs font-bold uppercase tracking-[0.2em] text-ucu-green">
          Observatorio
        </p>
        <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-[var(--ink)] md:text-4xl">
          Cargar un nuevo fallo
        </h1>
        <p className="mt-3 max-w-prose font-serif text-base leading-relaxed text-[var(--ink-muted)]">
          El observatorio es un proyecto comunitario. Podés sumar antecedentes jurisprudenciales sin
          registrarte ni iniciar sesión. Completá los datos del fallo y adjuntá el PDF de la sentencia.
        </p>
      </div>

      <div className="ucu-card p-6 md:p-8">
        <FalloEditor mode="create" variant="public" />
      </div>
    </main>
  );
}
