import type { Metadata } from 'next';
import { EducacionFinancieraApp } from '@/components/educacion-financiera/EducacionFinancieraApp';
import { JsonLd } from '@/components/seo/JsonLd';
import {
  breadcrumbJsonLd,
  buildPageMetadata,
  webPageJsonLd,
} from '@/lib/seo';

const PATH = '/educacion-financiera';
const DESCRIPTION =
  'Educación financiera para consumidores en Argentina: presupuesto, inflación, deudas y calculadoras de intereses, cuotas y tasa real. Herramientas prácticas de UCU.';

export const metadata: Metadata = buildPageMetadata({
  title: 'Educación financiera',
  description: DESCRIPTION,
  path: PATH,
  keywords: [
    'educación financiera',
    'calculadora de intereses',
    'tasa real',
    'presupuesto personal',
    'inflación Argentina',
    'UCU',
  ],
});

export default function EducacionFinancieraPage() {
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
          breadcrumbJsonLd([
            { name: 'Inicio', path: '/' },
            { name: 'Educación financiera', path: PATH },
          ]),
        ]}
      />
      <EducacionFinancieraApp />
    </main>
  );
}
