import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
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
      `Investigación UCU sobre ${item.empresaNombre}, asistida por ${item.aiName}.`
    ),
    path: `/investigaciones/${item.slug}`,
    type: 'article',
    publishedTime: item.publishedAt,
    modifiedTime: item.modifiedAt,
    authors: [item.memberName],
    keywords: [
      item.empresaNombre,
      'investigación UCU',
      item.aiName,
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
            authorName: item.memberName,
            section: 'Observatorio de empresas',
            tags: [item.empresaNombre, item.aiName],
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
          <p className="font-display text-xs text-[var(--ink-muted)]">
            {item.memberName} · {item.aiName} ·{' '}
            <time dateTime={item.publishedAt}>
              {format(new Date(item.publishedAt), "d MMM yyyy", { locale: es })}
            </time>
            {' · '}
            investigación asistida por IA, no es un dictamen jurídico
          </p>
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
