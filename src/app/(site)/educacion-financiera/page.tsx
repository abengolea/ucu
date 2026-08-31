import type { Metadata } from 'next';
import { EducacionFinancieraApp } from '@/components/educacion-financiera/EducacionFinancieraApp';
import { JsonLd } from '@/components/seo/JsonLd';
import { EDUCATION_MODULES, educationModulePath } from '@/lib/educacion-financiera/modules';
import { GEO_EDUCACION } from '@/lib/geo-answers';
import {
  breadcrumbJsonLd,
  buildPageMetadata,
  getSiteUrl,
  webPageJsonLd,
} from '@/lib/seo';

const PATH = '/educacion-financiera';
const DESCRIPTION = GEO_EDUCACION;

export const metadata: Metadata = buildPageMetadata({
  title: 'Educación financiera',
  description: DESCRIPTION,
  path: PATH,
  keywords: [
    'educación financiera',
    'curso gratuito',
    'presupuesto personal',
    'pago mínimo tarjeta',
    'defensa del consumidor',
    'BCRA',
    'UCU',
  ],
});

const SECTIONS = new Set(['home', 'curso', 'calculadoras', 'radiografia']);

export default async function EducacionFinancieraPage({
  searchParams,
}: {
  searchParams: Promise<{ seccion?: string }>;
}) {
  const { seccion } = await searchParams;
  const initialSection = SECTIONS.has(seccion || '')
    ? (seccion as 'home' | 'curso' | 'calculadoras' | 'radiografia')
    : 'home';

  return (
    <main>
      <JsonLd
        data={[
          webPageJsonLd({
            title: 'Educación financiera',
            description: DESCRIPTION,
            path: PATH,
            type: 'WebPage',
          }),
          {
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: 'Curso de educación financiera UCU',
            numberOfItems: EDUCATION_MODULES.length,
            itemListElement: EDUCATION_MODULES.map((mod, index) => ({
              '@type': 'ListItem',
              position: index + 1,
              name: mod.title,
              url: `${getSiteUrl()}${educationModulePath(mod)}`,
            })),
          },
          breadcrumbJsonLd([
            { name: 'Inicio', path: '/' },
            { name: 'Educación financiera', path: PATH },
          ]),
        ]}
      />
      <EducacionFinancieraApp initialSection={initialSection} />
    </main>
  );
}
