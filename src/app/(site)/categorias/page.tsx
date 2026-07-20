import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/PageHeader';
import { getCategories } from '@/lib/content';
import { buildPageMetadata } from '@/lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Categorías',
  description:
    'Temas de defensa del consumidor: alertas de fraude, acciones colectivas, planes de ahorro y más publicaciones de UCU.',
  path: '/categorias',
});

export default async function CategoriesPage() {
  const categories = await getCategories();

  return (
    <main className="mx-auto max-w-6xl px-4 py-12 lg:px-6">
      <PageHeader
        eyebrow="Temas"
        title="Categorías"
        description={`${categories.length} categorías sobre defensa del consumidor.`}
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => (
          <Link
            key={category.slug}
            href={`/categoria/${category.slug}`}
            className="group ucu-card-interactive ucu-accent-top p-5 md:p-6"
          >
            <h2 className="font-display text-lg font-bold tracking-tight text-ucu-blue transition group-hover:text-[#004a80]">
              {category.name}
            </h2>
            {category.description ? (
              <p className="mt-2 line-clamp-3 font-serif text-sm leading-relaxed text-[var(--ink-muted)]">
                {category.description}
              </p>
            ) : null}
          </Link>
        ))}
      </div>
    </main>
  );
}
