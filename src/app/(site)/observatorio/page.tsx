import type { Metadata } from 'next';
import { FalloList, ObservatorioHero } from '@/components/observatorio/FalloCard';
import { JsonLd } from '@/components/seo/JsonLd';
import { SectionHeader } from '@/components/ui/PageHeader';
import { getFallos } from '@/lib/observatorio';
import { breadcrumbJsonLd, buildPageMetadata, webPageJsonLd } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = buildPageMetadata({
  title: 'Observatorio de fallos de consumo',
  description:
    'Base de antecedentes jurisprudenciales en defensa del consumidor: buscá y consultá fallos compilados por Usuarios y Consumidores Unidos.',
  path: '/observatorio',
  keywords: [
    'observatorio de fallos',
    'jurisprudencia consumidor',
    'fallos defensa del consumidor',
    'UCU',
  ],
});

export default async function ObservatorioPage() {
  let fallos: Awaited<ReturnType<typeof getFallos>> | null = null;
  let error: string | null = null;

  try {
    fallos = await getFallos({ page: 1, offset: 5 });
  } catch {
    error = 'No pudimos conectar con el observatorio en este momento.';
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-12 lg:px-6">
      <JsonLd
        data={[
          webPageJsonLd({
            title: 'Observatorio de fallos de consumo',
            description:
              'Base de antecedentes jurisprudenciales en defensa del consumidor: buscá y consultá fallos compilados por Usuarios y Consumidores Unidos.',
            path: '/observatorio',
            type: 'CollectionPage',
          }),
          breadcrumbJsonLd([
            { name: 'Inicio', path: '/' },
            { name: 'Observatorio', path: '/observatorio' },
          ]),
        ]}
      />
      <ObservatorioHero />

      <section className="mt-14">
        <SectionHeader
          eyebrow="Base jurisprudencial"
          title="Últimos fallos ingresados"
          href="/observatorio/buscar"
          linkLabel="Ver todos →"
        />

        {error ? (
          <div className="rounded-xl border border-ucu-yellow/30 bg-ucu-yellow/10 p-6 font-serif text-[var(--ink)]">
            {error}
          </div>
        ) : (
          <FalloList fallos={fallos?.data ?? []} />
        )}
      </section>
    </main>
  );
}
