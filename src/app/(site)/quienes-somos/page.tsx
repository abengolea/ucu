import type { Metadata } from 'next';
import Link from 'next/link';
import { JsonLd } from '@/components/seo/JsonLd';
import { PageHeader } from '@/components/ui/PageHeader';
import { GEO_UCU } from '@/lib/geo-answers';
import {
  breadcrumbJsonLd,
  buildPageMetadata,
  organizationJsonLd,
  webPageJsonLd,
} from '@/lib/seo';

const PATH = '/quienes-somos';
const DESCRIPTION = `${GEO_UCU} Sede en San Nicolás de los Arroyos; trabaja en todo el país.`;

export const metadata: Metadata = buildPageMetadata({
  title: 'Quiénes somos',
  description: DESCRIPTION,
  path: PATH,
  keywords: [
    'Usuarios y Consumidores Unidos',
    'qué es UCU',
    'ONG defensa del consumidor',
    'San Nicolás',
  ],
});

export default function QuienesSomosPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 lg:px-6">
      <JsonLd
        data={[
          webPageJsonLd({
            title: 'Quiénes somos',
            description: DESCRIPTION,
            path: PATH,
            type: 'AboutPage',
          }),
          organizationJsonLd(),
          breadcrumbJsonLd([
            { name: 'Inicio', path: '/' },
            { name: 'Quiénes somos', path: PATH },
          ]),
        ]}
      />
      <PageHeader eyebrow="Institucional" title="Quiénes somos" description={GEO_UCU} />

      <div className="space-y-6 font-serif text-base leading-relaxed text-[var(--ink)]">
        <p>
          UCU registra denuncias de consumo, publica estadísticas por empresa, compila fallos
          en el Observatorio y lleva adelante la campaña nacional «Planes de ahorro son una
          trampa». Asociación Civil, registro nº 21.
        </p>
        <p>
          Sede: Belgrano 163 bis, San Nicolás de los Arroyos, Buenos Aires. Teléfono +54 9
          0336-4457314. Correo info@ucu.org.ar. Atención a consumidores de todo el país.
        </p>
        <p>
          Si tenés un problema de consumo,{' '}
          <Link href="/reclamos/nuevo" className="font-display font-semibold text-ucu-blue hover:underline">
            presentá la denuncia
          </Link>{' '}
          o leé las{' '}
          <Link href="/preguntas-frecuentes" className="font-display font-semibold text-ucu-blue hover:underline">
            preguntas frecuentes
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
