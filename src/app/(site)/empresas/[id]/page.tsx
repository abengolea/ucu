import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { InformeCheckout } from '@/components/reclamos/InformeCheckout';
import { JsonLd } from '@/components/seo/JsonLd';
import { PageHeader } from '@/components/ui/PageHeader';
import {
  formatPrecioArs,
  getInformePrecioCents,
  getPublicEmpresaStats,
  INFORME_MIN_CASOS,
} from '@/lib/empresa-stats-public';
import { isMercadoPagoConfigured } from '@/lib/mercadopago';
import {
  breadcrumbJsonLd,
  buildPageMetadata,
  datasetJsonLd,
  truncateMeta,
} from '@/lib/seo';

export const revalidate = 900;

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return y && m && d ? `${d}/${m}/${y}` : iso;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const stats = await getPublicEmpresaStats(Number(id)).catch(() => null);
  if (!stats) {
    return { title: 'Empresa no encontrada' };
  }

  const total = stats.stats.total;
  const description = truncateMeta(
    total > 0
      ? `UCU registró ${total} denuncia${total === 1 ? '' : 's'} de consumo contra ${stats.empresaNombre}. Consultá el total público e informate con un PDF certificable.`
      : `UCU no tiene denuncias de consumo registradas contra ${stats.empresaNombre} en su base pública.`
  );

  return buildPageMetadata({
    title: `Denuncias contra ${stats.empresaNombre}`,
    description,
    path: `/empresas/${id}`,
    keywords: [
      stats.empresaNombre,
      'denuncias de consumo',
      'reclamos',
      'estadísticas UCU',
      'defensa del consumidor',
    ],
  });
}

export default async function EmpresaPublicPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const empresaId = Number(id);
  if (!Number.isFinite(empresaId) || empresaId <= 0) notFound();

  const stats = await getPublicEmpresaStats(empresaId);
  if (!stats) notFound();

  const total = stats.stats.total;
  const precioCents = await getInformePrecioCents();
  const puedeInforme = total >= INFORME_MIN_CASOS;
  const path = `/empresas/${empresaId}`;
  const title = `Denuncias contra ${stats.empresaNombre}`;
  const lead =
    total > 0
      ? `UCU registró ${total} denuncia${total === 1 ? '' : 's'} de consumo contra ${stats.empresaNombre}.`
      : `UCU no tiene denuncias de consumo registradas contra ${stats.empresaNombre} en su base pública.`;

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 lg:px-6">
      <JsonLd
        data={[
          datasetJsonLd({
            title,
            description: lead,
            path,
            variableMeasured: 'Denuncias de consumo registradas por UCU',
            measurement: 'Conteo de reclamos recibidos por Usuarios y Consumidores Unidos',
            dateModified: stats.cachedAt,
          }),
          breadcrumbJsonLd([
            { name: 'Inicio', path: '/' },
            { name: 'Estadísticas de denuncias', path: '/reclamos/estadisticas' },
            { name: stats.empresaNombre, path },
          ]),
        ]}
      />

      <PageHeader
        eyebrow="Datos públicos"
        title={title}
        description={lead}
        backHref="/reclamos/estadisticas"
        backLabel="Buscar otra empresa"
      />

      {total > 0 ? (
        <section className="space-y-6 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-6 md:p-8">
          <div className="rounded-lg bg-[var(--surface-muted)] px-5 py-4">
            <p className="font-display text-[0.65rem] font-bold uppercase tracking-[0.12em] text-[var(--ink-faint)]">
              Reclamos registrados
            </p>
            <p className="mt-1 font-display text-3xl font-bold text-[var(--ink)]">{total}</p>
            <p className="mt-2 font-serif text-sm text-[var(--ink-muted)]">
              Período observado: {formatDate(stats.stats.rangoFechas.desde)} —{' '}
              {formatDate(stats.stats.rangoFechas.hasta)}
            </p>
            {stats.empresaCuit ? (
              <p className="mt-1 font-serif text-xs text-[var(--ink-faint)]">
                CUIT {stats.empresaCuit}
              </p>
            ) : null}
          </div>

          <InformeCheckout
            empresaId={empresaId}
            disponible={puedeInforme && isMercadoPagoConfigured()}
            precioLabel={formatPrecioArs(precioCents)}
            pagosConfigurados={isMercadoPagoConfigured()}
          />
        </section>
      ) : (
        <p className="font-serif text-sm text-[var(--ink-muted)]">
          Si tuviste un problema con esta empresa, podés{' '}
          <Link href="/reclamos/nuevo" className="font-display font-semibold text-ucu-blue hover:underline">
            presentar una denuncia
          </Link>
          .
        </p>
      )}
    </main>
  );
}
