import type { Metadata } from 'next';
import Link from 'next/link';
import { FaqAccordion } from '@/components/campaign/FaqAccordion';
import { JsonLd } from '@/components/seo/JsonLd';
import { PageHeader } from '@/components/ui/PageHeader';
import { campaignFaqSections } from '@/lib/campaign-planes-ahorro';
import {
  breadcrumbJsonLd,
  buildPageMetadata,
  faqPageJsonLd,
} from '@/lib/seo';

const FAQ_PATH = '/planes-de-ahorro-son-una-trampa/preguntas-frecuentes';
const FAQ_DESCRIPTION =
  'Respuestas claras sobre contratación, entrega de unidades, aumentos, mora y liquidación final en planes de ahorro automotor. Guía de UCU para ahorristas.';

export const metadata: Metadata = buildPageMetadata({
  title: 'Preguntas frecuentes — Planes de ahorro',
  description: FAQ_DESCRIPTION,
  path: FAQ_PATH,
  keywords: [
    'planes de ahorro preguntas frecuentes',
    'planes de ahorro automotor',
    'aumentos cuota plan de ahorro',
    'liquidación final plan de ahorro',
    'UCU',
  ],
});

export default function CampanaFaqPage() {
  const faqItems = campaignFaqSections.flatMap((section) => section.items);

  return (
    <main className="mx-auto max-w-4xl px-4 py-12 lg:px-6">
      <JsonLd
        data={[
          faqPageJsonLd(faqItems, FAQ_PATH),
          breadcrumbJsonLd([
            { name: 'Inicio', path: '/' },
            {
              name: 'Planes de ahorro',
              path: '/planes-de-ahorro-son-una-trampa',
            },
            { name: 'Preguntas frecuentes', path: FAQ_PATH },
          ]),
        ]}
      />
      <PageHeader
        eyebrow="Campaña · Planes de ahorro"
        title="Preguntas frecuentes"
        description="Información práctica para ahorristas sobre contratación, entrega del auto, aumentos de precios, mora y liquidación final."
        backHref="/planes-de-ahorro-son-una-trampa"
        backLabel="Volver a la campaña"
      />
      <FaqAccordion sections={campaignFaqSections} />
      <section className="mt-12 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-6 text-center">
        <p className="font-serif text-sm text-[var(--ink-muted)]">
          ¿No encontrás respuesta a tu consulta?
        </p>
        <Link href="/reclamos/nuevo" className="ucu-btn-primary mt-4 inline-flex">
          Contactanos con tu caso
        </Link>
      </section>
    </main>
  );
}
