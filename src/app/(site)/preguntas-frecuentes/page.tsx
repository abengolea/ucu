import type { Metadata } from 'next';
import Link from 'next/link';
import { AnswerLead } from '@/components/seo/AnswerLead';
import { JsonLd } from '@/components/seo/JsonLd';
import { PageHeader } from '@/components/ui/PageHeader';
import { GEO_FAQ_ITEMS, GEO_UCU } from '@/lib/geo-answers';
import {
  breadcrumbJsonLd,
  buildPageMetadata,
  faqPageJsonLd,
} from '@/lib/seo';

const PATH = '/preguntas-frecuentes';
const DESCRIPTION = `${GEO_UCU} Acá respondemos, en la primera frase, qué es UCU, cómo denunciar, qué es un plan de ahorro y qué puede hacer un estudio de cobranzas.`;

export const metadata: Metadata = buildPageMetadata({
  title: 'Preguntas frecuentes',
  description: DESCRIPTION,
  path: PATH,
  keywords: [
    'qué es UCU',
    'cómo hacer un reclamo de consumo',
    'qué es un plan de ahorro',
    'estudio de cobranzas',
    'defensa del consumidor Argentina',
  ],
});

export default function PreguntasFrecuentesPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 lg:px-6">
      <JsonLd
        data={[
          faqPageJsonLd(GEO_FAQ_ITEMS, PATH),
          breadcrumbJsonLd([
            { name: 'Inicio', path: '/' },
            { name: 'Preguntas frecuentes', path: PATH },
          ]),
        ]}
      />
      <PageHeader
        eyebrow="Defensa del consumidor"
        title="Preguntas frecuentes"
        description={DESCRIPTION}
      />
      <div>
        {GEO_FAQ_ITEMS.map((item) => (
          <AnswerLead
            key={item.question}
            question={item.question}
            answer={item.answer}
            href={item.href}
          />
        ))}
      </div>
      <p className="mt-10 font-serif text-sm text-[var(--ink-muted)]">
        Sobre planes de ahorro hay una guía más larga:{' '}
        <Link
          href="/planes-de-ahorro-son-una-trampa/preguntas-frecuentes"
          className="font-display font-semibold text-ucu-blue hover:underline"
        >
          FAQ de la campaña
        </Link>
        .
      </p>
    </main>
  );
}
