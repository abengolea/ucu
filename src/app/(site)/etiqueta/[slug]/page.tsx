import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PostList } from '@/components/PostCard';
import { JsonLd } from '@/components/seo/JsonLd';
import { PageHeader } from '@/components/ui/PageHeader';
import { getPostsByTag, getTag } from '@/lib/content';
import { decodeHtmlEntities } from '@/lib/format';
import {
  breadcrumbJsonLd,
  buildPageMetadata,
  collectionPageJsonLd,
  truncateMeta,
} from '@/lib/seo';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tag = await getTag(slug).catch(() => null);
  if (!tag) {
    return { title: 'Etiqueta no encontrada' };
  }

  const name = decodeHtmlEntities(tag.name);
  const description = truncateMeta(
    `Publicaciones de UCU etiquetadas con ${name}: defensa del consumidor, alertas y recursos prácticos.`
  );

  return buildPageMetadata({
    title: name,
    description,
    path: `/etiqueta/${slug}`,
    keywords: [name, 'defensa del consumidor', 'UCU', 'Argentina'],
  });
}

export default async function TagPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [tag, posts] = await Promise.all([
    getTag(slug).catch(() => null),
    getPostsByTag(slug, 100).catch(() => []),
  ]);

  if (!tag) notFound();

  const name = decodeHtmlEntities(tag.name);
  const description = `${posts.length} ${
    posts.length === 1 ? 'publicación' : 'publicaciones'
  } sobre ${name}.`;

  return (
    <main className="mx-auto max-w-6xl px-4 py-12 lg:px-6">
      <JsonLd
        data={[
          collectionPageJsonLd({
            title: name,
            description,
            path: `/etiqueta/${slug}`,
          }),
          breadcrumbJsonLd([
            { name: 'Inicio', path: '/' },
            { name: 'Noticias', path: '/posts' },
            { name: name, path: `/etiqueta/${slug}` },
          ]),
        ]}
      />
      <PageHeader
        eyebrow="Tema"
        backHref="/posts"
        backLabel="Volver a notas"
        title={name}
        description={description}
      />
      <PostList posts={posts} />
    </main>
  );
}
