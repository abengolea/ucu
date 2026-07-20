import type { Metadata } from 'next';
import Link from 'next/link';
import { ReclamoConsultaForm } from '@/components/reclamos/ReclamoConsultaForm';
import { buildPageMetadata } from '@/lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Consultar reclamo',
  description:
    'Consultá el estado de tu reclamo de consumo con el número de caso y tu documento. Sistema Usuarios Protegidos de UCU.',
  path: '/reclamos/consultar',
});

export default async function ConsultarReclamoPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-8">
        <Link href="/reclamos" className="text-sm font-semibold text-[#1a5fb4] hover:underline">
          ← Volver a reclamos
        </Link>
        <h1 className="mt-3 text-3xl font-bold text-slate-900">Consultar reclamo</h1>
        <p className="mt-2 text-slate-600">
          Ingresá el número de reclamo y tu documento para ver el estado actual.
        </p>
      </div>
      <ReclamoConsultaForm initialId={params.id ?? ''} />
    </main>
  );
}
