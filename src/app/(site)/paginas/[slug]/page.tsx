import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { JsonLd } from '@/components/seo/JsonLd';
import { getPageBySlug } from '@/lib/content';
import { decodeHtmlEntities } from '@/lib/format';
import { rewriteContentMediaUrls } from '@/lib/media';
import {
  breadcrumbJsonLd,
  buildPageMetadata,
  excerptToDescription,
  webPageJsonLd,
} from '@/lib/seo';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPageBySlug(slug).catch(() => null);
  if (!page) return { title: 'Página no encontrada' };

  const title = decodeHtmlEntities(page.title);
  return buildPageMetadata({
    title,
    description: excerptToDescription(
      page.excerpt,
      `Información de UCU: ${title}`
    ),
    path: `/paginas/${slug}`,
    image: page.featuredImage?.url,
  });
}

export default async function PageDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = await getPageBySlug(slug).catch(() => null);
  if (!page) notFound();
  const title = decodeHtmlEntities(page.title);
  const description = excerptToDescription(page.excerpt, title);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <JsonLd
        data={[
          webPageJsonLd({
            title,
            description,
            path: `/paginas/${slug}`,
          }),
          breadcrumbJsonLd([
            { name: 'Inicio', path: '/' },
            { name: title, path: `/paginas/${slug}` },
          ]),
        ]}
      />
      <Link href="/" className="ucu-btn-ghost mb-6 inline-flex">
        ← Inicio
      </Link>
      <h1 className="ucu-title mb-8">{title}</h1>
      <div
        className="prose-ucu"
        dangerouslySetInnerHTML={{ __html: rewriteContentMediaUrls(page.content) }}
      />
    </main>
  );
}
