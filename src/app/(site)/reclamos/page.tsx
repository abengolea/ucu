import type { Metadata } from 'next';
import Link from 'next/link';
import { AlertTriangle, Search } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { buildPageMetadata } from '@/lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Usuarios Protegidos — Reclamos',
  description:
    'Realizá tu reclamo de consumo gratis y seguí su estado online con Usuarios Protegidos, el sistema de UCU hasta la conciliación con la empresa.',
  path: '/reclamos',
  keywords: [
    'reclamo de consumo',
    'Usuarios Protegidos',
    'denuncia consumidor',
    'conciliación consumidor',
    'UCU',
  ],
});

export default function ReclamosPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-12 lg:px-6">
      <PageHeader
        eyebrow="Usuarios Protegidos"
        title="Gestión de reclamos"
        description="Sistema gratuito para realizar tu reclamo y darle seguimiento por internet hasta la instancia de conciliación con la empresa denunciada."
        className="text-center [&_h1]:mx-auto [&_p]:mx-auto"
      />

      <div className="grid gap-6 md:grid-cols-2">
        <article className="ucu-card-interactive ucu-accent-top p-7">
          <div className="mb-5 inline-flex rounded-md bg-ucu-magenta/10 p-3 text-ucu-magenta">
            <AlertTriangle className="h-6 w-6" strokeWidth={1.75} />
          </div>
          <h2 className="font-display text-xl font-bold tracking-tight text-[var(--ink)]">
            Realizar un reclamo
          </h2>
          <p className="mt-3 font-serif text-sm leading-relaxed text-[var(--ink-muted)]">
            Completá el formulario con tus datos, contanos qué pasó y seleccioná las empresas
            denunciadas.
          </p>
          <Link href="/reclamos/nuevo" className="ucu-btn-primary mt-6">
            Realizar reclamo
          </Link>
        </article>

        <article className="ucu-card-interactive ucu-accent-top p-7">
          <div className="mb-5 inline-flex rounded-md bg-ucu-blue/10 p-3 text-ucu-blue">
            <Search className="h-6 w-6" strokeWidth={1.75} />
          </div>
          <h2 className="font-display text-xl font-bold tracking-tight text-[var(--ink)]">
            Consultar estado
          </h2>
          <p className="mt-3 font-serif text-sm leading-relaxed text-[var(--ink-muted)]">
            Ingresá tu número de reclamo y documento para ver en qué estado se encuentra tu caso.
          </p>
          <Link href="/reclamos/consultar" className="ucu-btn-secondary mt-6">
            Consultar reclamo
          </Link>
        </article>
      </div>

      <section className="mt-10 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-6">
        <h3 className="font-display text-sm font-bold uppercase tracking-wide text-[var(--ink)]">
          Contacto
        </h3>
        <p className="mt-2 font-serif text-sm text-[var(--ink-muted)]">
          +54 9 0336-4457314 · info@ucu.org.ar
        </p>
        <p className="font-serif text-sm text-[var(--ink-muted)]">
          Belgrano 163 bis, San Nicolás de los Arroyos, Buenos Aires
        </p>
      </section>
    </main>
  );
}
