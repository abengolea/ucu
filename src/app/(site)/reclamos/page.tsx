import type { Metadata } from 'next';
import { DenunciasStatsBanner } from '@/components/reclamos/DenunciasStatsBanner';
import { PresentarDenunciaCard } from '@/components/reclamos/PresentarDenunciaCard';
import { JsonLd } from '@/components/seo/JsonLd';
import { PageHeader } from '@/components/ui/PageHeader';
import { GEO_RECLAMO } from '@/lib/geo-answers';
import { breadcrumbJsonLd, buildPageMetadata, webPageJsonLd } from '@/lib/seo';

const DESCRIPTION = GEO_RECLAMO;

export const metadata: Metadata = buildPageMetadata({
  title: 'Usuarios Protegidos — Denuncias',
  description: DESCRIPTION,
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
      <JsonLd
        data={[
          webPageJsonLd({
            title: 'Denuncias de consumo',
            description: DESCRIPTION,
            path: '/reclamos',
          }),
          breadcrumbJsonLd([
            { name: 'Inicio', path: '/' },
            { name: 'Denuncias', path: '/reclamos' },
          ]),
        ]}
      />
      <PageHeader
        eyebrow="Usuarios Protegidos"
        title="Denuncias de consumo"
        description={GEO_RECLAMO}
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
