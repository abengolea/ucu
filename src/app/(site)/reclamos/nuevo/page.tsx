import type { Metadata } from 'next';
import Link from 'next/link';
import { ReclamoForm } from '@/components/reclamos/ReclamoForm';
import { GEO_RECLAMO } from '@/lib/geo-answers';
import { buildPageMetadata } from '@/lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Nuevo reclamo',
  description: GEO_RECLAMO,
  path: '/reclamos/nuevo',
});

export default function NuevoReclamoPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-8">
        <Link href="/reclamos" className="text-sm font-semibold text-[#1a5fb4] hover:underline">
          ← Volver a reclamos
        </Link>
        <h1 className="mt-3 text-3xl font-bold text-slate-900">Realizá tu reclamo</h1>
        <p className="mt-2 max-w-prose text-slate-700">
          {GEO_RECLAMO} Completá los campos; al finalizar recibís un número de seguimiento.
        </p>
      </div>
      <ReclamoForm />
    </main>
  );
}
