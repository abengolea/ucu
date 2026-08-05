import type { Metadata } from 'next';
import { PageHeader } from '@/components/ui/PageHeader';
import { VerificarInformeClient } from '@/components/reclamos/VerificarInformeClient';
import { buildPageMetadata } from '@/lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Verificar informe de reclamos',
  description:
    'Validá que un informe PDF de estadísticas de reclamos fue emitido por Usuarios y Consumidores Unidos (UCU).',
  path: '/verificar',
  keywords: ['verificar informe', 'certificado UCU', 'reclamos'],
});

export default function VerificarPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-12 lg:px-6">
      <PageHeader
        eyebrow="Certificación"
        title="Verificar informe"
        description="Arrastrá el PDF o ingresá el código UCU-XXXX-XXXX. Si es auténtico, certificamos la emisión y mostramos la huella digital del documento."
      />
      <VerificarInformeClient />
    </main>
  );
}
