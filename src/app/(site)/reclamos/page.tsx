import type { Metadata } from 'next';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { DenunciasStatsBanner } from '@/components/reclamos/DenunciasStatsBanner';
import { PageHeader } from '@/components/ui/PageHeader';
import { buildPageMetadata } from '@/lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Usuarios Protegidos — Denuncias',
  description:
    'Presentá tu denuncia de consumo en forma gratuita. UCU la registra y, según el caso, puede contactarte para asesorarte u orientarte.',
  path: '/reclamos',
  keywords: [
    'denuncia de consumo',
    'reclamo de consumo',
    'estadísticas denuncias',
    'Usuarios Protegidos',
    'UCU',
  ],
});

export default function ReclamosPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-12 lg:px-6">
      <PageHeader
        eyebrow="Usuarios Protegidos"
        title="Denuncias de consumo"
        description="Sistema gratuito para presentar tu denuncia y registrarla ante UCU. Es un mensaje que llega a la organización: según el caso, podemos contactarte para asesorarte, orientarte o dar respuesta. El registro queda como base de datos institucional."
        className="text-center [&_h1]:mx-auto [&_p]:mx-auto"
      />

      <div className="mb-8">
        <DenunciasStatsBanner compact />
      </div>

      <article className="ucu-card-interactive ucu-accent-top mx-auto max-w-xl p-7">
        <div className="mb-5 inline-flex rounded-md bg-ucu-magenta/10 p-3 text-ucu-magenta">
          <AlertTriangle className="h-6 w-6" strokeWidth={1.75} />
        </div>
        <h2 className="font-display text-xl font-bold tracking-tight text-[var(--ink)]">
          Presentar una denuncia
        </h2>
        <p className="mt-3 font-serif text-sm leading-relaxed text-[var(--ink-muted)]">
          Completá el formulario con tus datos, contanos qué pasó y seleccioná las empresas
          denunciadas. Nos llega tu mensaje; si corresponde, te contactamos nosotros.
        </p>
        <Link href="/reclamos/nuevo" className="ucu-btn-primary mt-6">
          Presentar denuncia
        </Link>
      </article>

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
