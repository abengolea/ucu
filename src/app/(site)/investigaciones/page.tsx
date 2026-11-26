import type { Metadata } from 'next';
import Link from 'next/link';
import { InvestigacionesHero, InvestigacionesList } from '@/components/investigaciones/InvestigacionesIndex';
import { JsonLd } from '@/components/seo/JsonLd';
import { GEO_INVESTIGACIONES } from '@/lib/geo-answers';
import { getPublishedInvestigaciones } from '@/lib/investigaciones';
import {
  breadcrumbJsonLd,
  buildPageMetadata,
  webPageJsonLd,
} from '@/lib/seo';
import { isFirebaseConfigured } from '@/lib/utils';

const PATH = '/investigaciones';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = buildPageMetadata({
  title: 'Observatorio de empresas',
  description: GEO_INVESTIGACIONES,
  path: PATH,
  keywords: [
    'investigaciones UCU',
    'análisis de empresas',
    'defensa del consumidor',
    'inteligencia artificial',
    'denuncias de consumo',
    'UCU',
  ],
});

export default async function InvestigacionesPage() {
  let items: Awaited<ReturnType<typeof getPublishedInvestigaciones>> = [];
  let error: string | null = null;

  if (!isFirebaseConfigured()) {
    error = 'La sección todavía no está conectada.';
  } else {
    try {
      items = await getPublishedInvestigaciones(80);
    } catch {
      error = 'No pudimos cargar las investigaciones en este momento.';
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-12 lg:px-6">
      <JsonLd
        data={[
          webPageJsonLd({
            title: 'Observatorio de empresas',
            description: GEO_INVESTIGACIONES,
            path: PATH,
            type: 'CollectionPage',
          }),
          breadcrumbJsonLd([
            { name: 'Inicio', path: '/' },
            { name: 'Observatorio', path: '/observatorio' },
            { name: 'Empresas', path: PATH },
          ]),
        ]}
      />
      <Link href="/observatorio" className="ucu-btn-ghost mb-5 inline-flex">
        ← Observatorio
      </Link>
      <InvestigacionesHero />

      <section className="mt-12">
        <div className="mb-8 border-b border-[var(--border)] pb-5">
          <h2 className="font-display text-2xl font-bold tracking-tight text-[var(--ink)] md:text-3xl">
            {items.length
              ? `${items.length} investigación${items.length === 1 ? '' : 'es'} publicada${items.length === 1 ? '' : 's'}`
              : 'Archivo'}
          </h2>
        </div>

        {error ? (
          <div className="rounded-xl border border-ucu-yellow/30 bg-ucu-yellow/10 p-6 font-serif text-[var(--ink)]">
            {error}
          </div>
        ) : (
          <InvestigacionesList items={items} />
        )}
      </section>
    </main>
  );
}
