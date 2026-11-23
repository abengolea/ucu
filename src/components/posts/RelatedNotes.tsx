import Link from 'next/link';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { decodeHtmlEntities, stripHtml } from '@/lib/format';
import { resolveMediaUrl } from '@/lib/media';
import type { RelatedPostMatch } from '@/lib/related-posts';
import type { ContentDocument, ContentTerm } from '@/types/content';

function excerptText(post: ContentDocument, max = 140): string {
  const raw = post.excerpt || post.content;
  const text = decodeHtmlEntities(stripHtml(raw));
  if (text.length <= max) return text;
  return `${text.slice(0, max).trimEnd()}…`;
}

function overlapLabel(match: RelatedPostMatch): ContentTerm | null {
  return match.sharedTags[0] || match.sharedCategories[0] || null;
}

function moreFromPost(post: ContentDocument): { href: string; label: string } | null {
  const category = post.categories[0];
  if (category?.slug) {
    return { href: `/categoria/${category.slug}`, label: decodeHtmlEntities(category.name) };
  }
  const tag = post.tags[0];
  if (tag?.slug) {
    return { href: `/etiqueta/${tag.slug}`, label: decodeHtmlEntities(tag.name) };
  }
  return { href: '/posts', label: 'todas las notas' };
}

function RelatedNoteLink({
  match,
  featured = false,
}: {
  match: RelatedPostMatch;
  featured?: boolean;
}) {
  const title = decodeHtmlEntities(match.post.title);
  const href = `/posts/${match.post.slug}`;
  const imageUrl = resolveMediaUrl(match.post.featuredImage?.url);
  const overlap = overlapLabel(match);
  const category = match.post.categories[0];

  if (featured) {
    return (
      <article className="ucu-card-interactive overflow-hidden">
        <Link
          href={href}
          className="group grid gap-0 sm:grid-cols-[11.5rem_1fr] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ucu-blue"
        >
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt=""
              className="h-44 w-full object-cover sm:h-full sm:min-h-[10.5rem]"
            />
          ) : (
            <div className="flex h-28 items-center justify-center bg-[var(--surface-muted)] sm:h-full sm:min-h-[10.5rem]">
              <span className="font-display text-xs font-bold tracking-[0.18em] text-[var(--ink-faint)]">
                UCU
              </span>
            </div>
          )}
          <div className="flex flex-col p-5">
            <p className="mb-2 font-display text-xs font-semibold text-ucu-blue">
              {overlap
                ? decodeHtmlEntities(overlap.name)
                : category
                  ? decodeHtmlEntities(category.name)
                  : 'Otra nota'}
            </p>
            <h3 className="text-balance font-display text-xl font-bold leading-snug tracking-tight text-[var(--ink)] transition group-hover:text-ucu-blue">
              {title}
            </h3>
            <p className="mt-2 line-clamp-2 font-serif text-sm leading-relaxed text-[var(--ink-muted)]">
              {excerptText(match.post)}
            </p>
            <span className="mt-4 font-display text-sm font-semibold text-ucu-magenta">
              Leer esta nota →
            </span>
          </div>
        </Link>
      </article>
    );
  }

  return (
    <article className="border-t border-[var(--border)] pt-4 first:border-t-0 first:pt-0">
      <Link href={href} className="group block rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ucu-blue">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
          <h3 className="text-balance font-display text-base font-bold leading-snug tracking-tight text-[var(--ink)] transition group-hover:text-ucu-blue">
            {title}
          </h3>
          <time
            dateTime={match.post.publishedAt}
            className="shrink-0 font-display text-xs text-[var(--ink-faint)]"
          >
            {format(new Date(match.post.publishedAt), 'd MMM yyyy', { locale: es })}
          </time>
        </div>
        <p className="mt-1 font-serif text-sm text-[var(--ink-muted)]">
          {overlap
            ? `También sobre ${decodeHtmlEntities(overlap.name)}`
            : category
              ? decodeHtmlEntities(category.name)
              : 'Publicación reciente'}
        </p>
      </Link>
    </article>
  );
}

export function RelatedNotes({
  current,
  related,
}: {
  current: ContentDocument;
  related: RelatedPostMatch[];
}) {
  if (!related.length) return null;

  const more = moreFromPost(current);
  const [featured, ...rest] = related;
  const hasOverlap = related.some(
    (match) => match.sharedTags.length > 0 || match.sharedCategories.length > 0
  );

  return (
    <nav
      className="mt-14 border-t border-[var(--border)] pt-10"
      aria-labelledby="related-notes-heading"
    >
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2
            id="related-notes-heading"
            className="font-display text-2xl font-bold tracking-tight text-[var(--ink)]"
          >
            Seguí leyendo
          </h2>
          <p className="mt-1 max-w-prose font-serif text-sm leading-relaxed text-[var(--ink-muted)]">
            {hasOverlap && more
              ? `Otras notas de UCU sobre ${more.label}.`
              : 'Otras publicaciones recientes de defensa del consumidor.'}
          </p>
        </div>
        {more ? (
          <Link href={more.href} className="ucu-btn-ghost shrink-0">
            Ver más →
          </Link>
        ) : null}
      </div>

      <div className="space-y-6">
        <RelatedNoteLink match={featured} featured />
        {rest.length ? (
          <div className="space-y-4">
            {rest.map((match) => (
              <RelatedNoteLink key={match.post.slug} match={match} />
            ))}
          </div>
        ) : null}
      </div>
    </nav>
  );
}
