import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { InvestigacionFrame } from '@/components/investigaciones/InvestigacionFrame';
import { JsonLd } from '@/components/seo/JsonLd';
import { getInvestigacionBySlug } from '@/lib/investigaciones';
import {
  articleJsonLd,
  breadcrumbJsonLd,
  buildPageMetadata,
  excerptToDescription,
} from '@/lib/seo';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const item = await getInvestigacionBySlug(slug).catch(() => null);
  if (!item) return { title: 'Investigación no encontrada' };

  return buildPageMetadata({
    title: item.title,
    description: excerptToDescription(
      item.excerpt,
      `Investigación UCU sobre ${item.empresaNombre}.`
    ),
    path: `/investigaciones/${item.slug}`,
    type: 'article',
    publishedTime: item.publishedAt,
    modifiedTime: item.modifiedAt,
    authors: ['Usuarios y Consumidores Unidos'],
    keywords: [
      item.empresaNombre,
      'investigación UCU',
      'defensa del consumidor',
    ],
  });
}

export default async function InvestigacionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const item = await getInvestigacionBySlug(slug).catch(() => null);
  if (!item) notFound();

  const path = `/investigaciones/${item.slug}`;
  const description = excerptToDescription(
    item.excerpt,
    `Investigación UCU sobre ${item.empresaNombre}.`
  );

  return (
    <main>
      <JsonLd
        data={[
          articleJsonLd({
            title: item.title,
            description,
            path,
            publishedAt: item.publishedAt,
            modifiedAt: item.modifiedAt,
            authorName: 'Usuarios y Consumidores Unidos',
            section: 'Observatorio de empresas',
            tags: [item.empresaNombre],
          }),
          breadcrumbJsonLd([
            { name: 'Inicio', path: '/' },
            { name: 'Observatorio', path: '/observatorio' },
            { name: 'Empresas', path: '/investigaciones' },
            { name: item.title, path },
          ]),
        ]}
      />

      <header className="border-b border-[var(--border)] bg-[var(--surface-raised)]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3 lg:px-6">
          <Link href="/investigaciones" className="ucu-btn-ghost">
            ← Empresas
          </Link>
          <h1 className="sr-only">{item.title}</h1>
          {item.empresaId ? (
            <Link
              href={`/empresas/${item.empresaId}`}
              className="font-display text-xs font-semibold text-ucu-blue transition hover:text-[#004a80]"
            >
              Denuncias UCU →
            </Link>
          ) : null}
        </div>
      </header>

      <div className="border-b border-[var(--border)] bg-[var(--surface)]">
        <InvestigacionFrame slug={item.slug} title={item.title} />
      </div>
    </main>
  );
}
