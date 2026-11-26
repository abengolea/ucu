import type { Metadata } from 'next';
import {
  ObservatorioDoors,
  ObservatorioHubHero,
} from '@/components/observatorio/ObservatorioHub';
import { JsonLd } from '@/components/seo/JsonLd';
import { GEO_OBSERVATORIO } from '@/lib/geo-answers';
import { breadcrumbJsonLd, buildPageMetadata, webPageJsonLd } from '@/lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Observatorio UCU',
  description: GEO_OBSERVATORIO,
  path: '/observatorio',
  keywords: [
    'observatorio UCU',
    'observatorio de fallos',
    'observatorio de empresas',
    'jurisprudencia consumidor',
    'investigaciones UCU',
  ],
});

export default function ObservatorioHubPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-12 lg:px-6">
      <JsonLd
        data={[
          webPageJsonLd({
            title: 'Observatorio UCU',
            description: GEO_OBSERVATORIO,
            path: '/observatorio',
            type: 'WebPage',
          }),
          breadcrumbJsonLd([
            { name: 'Inicio', path: '/' },
            { name: 'Observatorio', path: '/observatorio' },
          ]),
        ]}
      />
      <ObservatorioHubHero />
      <section className="mt-6 md:mt-8" aria-label="Puertas del Observatorio">
        <ObservatorioDoors />
      </section>
    </main>
  );
}
