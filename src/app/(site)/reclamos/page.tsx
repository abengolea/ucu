import type { Metadata } from 'next';
import { DenunciasStatsBanner } from '@/components/reclamos/DenunciasStatsBanner';
import { PresentarDenunciaCard } from '@/components/reclamos/PresentarDenunciaCard';
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

      <div
        className="mb-10 grid items-stretch gap-5 md:grid-cols-2"
        aria-label="Acciones de denuncias"
      >
        <PresentarDenunciaCard />
        <DenunciasStatsBanner compact className="h-full" />
      </div>

      <section className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-6">
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
