import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PostList } from '@/components/PostCard';
import { JsonLd } from '@/components/seo/JsonLd';
import { PageHeader } from '@/components/ui/PageHeader';
import { getCategory, getPostsByCategory } from '@/lib/content';
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
  const category = await getCategory(slug).catch(() => null);
  if (!category) {
    return { title: 'Categoría no encontrada' };
  }

  const name = decodeHtmlEntities(category.name);
  const description = truncateMeta(
    category.description ||
      `Publicaciones de UCU sobre ${name}: defensa del consumidor, alertas y recursos prácticos.`
  );

  return buildPageMetadata({
    title: name,
    description,
    path: `/categoria/${slug}`,
    keywords: [name, 'defensa del consumidor', 'UCU', 'Argentina'],
  });
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [category, posts] = await Promise.all([
    getCategory(slug).catch(() => null),
    getPostsByCategory(slug, 100).catch(() => []),
  ]);

  if (!category) notFound();

  const name = decodeHtmlEntities(category.name);
  const description =
    category.description ||
    `${posts.length} publicaciones en esta categoría sobre defensa del consumidor.`;

  return (
    <main className="mx-auto max-w-6xl px-4 py-12 lg:px-6">
      <JsonLd
        data={[
          collectionPageJsonLd({
            title: name,
            description,
            path: `/categoria/${slug}`,
          }),
          breadcrumbJsonLd([
            { name: 'Inicio', path: '/' },
            { name: 'Categorías', path: '/categorias' },
            { name: name, path: `/categoria/${slug}` },
          ]),
        ]}
      />
      <PageHeader title={name} description={description} />
      <PostList posts={posts} />
    </main>
  );
}
