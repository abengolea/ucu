import type { Metadata } from 'next';
import { PageHeader } from '@/components/ui/PageHeader';
import { VerificarInformeClient } from '@/components/reclamos/VerificarInformeClient';
import { buildPageMetadata } from '@/lib/seo';

type Props = { params: Promise<{ codigo: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { codigo } = await params;
  return buildPageMetadata({
    title: `Verificar ${codigo.toUpperCase()}`,
    description: 'Validación de informe de reclamos emitido por UCU.',
    path: `/verificar/${codigo}`,
  });
}

export default async function VerificarCodigoPage({ params }: Props) {
  const { codigo } = await params;

  return (
    <main className="mx-auto max-w-4xl px-4 py-12 lg:px-6">
      <PageHeader
        eyebrow="Certificación"
        title="Verificar informe"
        description="Si el código es válido, certificamos la emisión. También podés volver y arrastrar el PDF para validarlo por su huella digital."
        backHref="/verificar"
        backLabel="Otro código"
      />
      <VerificarInformeClient initialCodigo={codigo.toUpperCase()} />
    </main>
  );
}
