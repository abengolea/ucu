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
  'Curso gratuito de educación financiera para consumidores argentinos: presupuesto, crédito, tasas de interés, sobreendeudamiento, cuentas y medios de pago. Con calculadoras, plantillas y fuentes oficiales (BCRA, CNV, UCU).';

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
