import type { Metadata } from 'next';
import { PageHeader } from '@/components/ui/PageHeader';
import { EstadisticasBusqueda } from '@/components/reclamos/EstadisticasBusqueda';
import { JsonLd } from '@/components/seo/JsonLd';
import { GEO_ESTADISTICAS } from '@/lib/geo-answers';
import { breadcrumbJsonLd, buildPageMetadata, webPageJsonLd } from '@/lib/seo';

const DESCRIPTION = GEO_ESTADISTICAS;

export const metadata: Metadata = buildPageMetadata({
  title: 'Estadísticas de denuncias por empresa',
  description: DESCRIPTION,
  path: '/reclamos/estadisticas',
  keywords: [
    'estadísticas denuncias',
    'denuncias por empresa',
    'informe consumidor',
    'UCU',
  ],
});

export default function EstadisticasPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 lg:px-6">
      <JsonLd
        data={[
          webPageJsonLd({
            title: 'Estadísticas de denuncias por empresa',
            description: DESCRIPTION,
            path: '/reclamos/estadisticas',
          }),
          breadcrumbJsonLd([
            { name: 'Inicio', path: '/' },
            { name: 'Denuncias', path: '/reclamos' },
            { name: 'Estadísticas', path: '/reclamos/estadisticas' },
          ]),
        ]}
      />
      <PageHeader
        eyebrow="Datos públicos"
        title="Estadísticas de denuncias"
        description={GEO_ESTADISTICAS}
        backHref="/reclamos"
        backLabel="Denuncias"
      />

      <EstadisticasBusqueda />

      <section className="mt-12 border-t border-[var(--border)] pt-8">
        <h2 className="font-display text-sm font-bold uppercase tracking-wide text-[var(--ink)]">
          Cómo funciona
        </h2>
        <ol className="mt-4 space-y-3 font-serif text-sm leading-relaxed text-[var(--ink-muted)]">
          <li>
            <span className="font-display font-semibold text-[var(--ink)]">1.</span> Buscás la
            empresa y ves el total agregado (sin datos personales).
          </li>
          <li>
            <span className="font-display font-semibold text-[var(--ink)]">2.</span> Si pedís el
            informe, pagás por Mercado Pago.
          </li>
          <li>
            <span className="font-display font-semibold text-[var(--ink)]">3.</span> Recibís un PDF
            con código UCU-XXXX-XXXX verificable en esta web.
          </li>
        </ol>
      </section>
    </main>
  );
}
