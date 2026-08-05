import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { PagoStatusClient } from '@/components/reclamos/PagoStatusClient';
import { buildPageMetadata } from '@/lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Estado del informe',
  description: 'Confirmación de pago e informe de reclamos UCU.',
  path: '/reclamos/estadisticas/pago',
  noIndex: true,
});

export default function PagoInformePage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12 lg:px-6">
      <PageHeader
        eyebrow="Informe"
        title="Tu pedido"
        description="Confirmamos el pago con Mercado Pago y generamos el PDF certificado."
        backHref="/reclamos/estadisticas"
        backLabel="Estadísticas"
      />
      <Suspense
        fallback={
          <p className="font-serif text-sm text-[var(--ink-muted)]">Cargando estado…</p>
        }
      >
        <PagoStatusClient />
      </Suspense>
    </main>
  );
}
