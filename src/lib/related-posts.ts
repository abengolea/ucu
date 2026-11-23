import { decodeHtmlEntities } from '@/lib/format';
import type { ContentDocument, ContentTerm } from '@/types/content';

export type RelatedPostMatch = {
  post: ContentDocument;
  score: number;
  sharedTags: ContentTerm[];
  sharedCategories: ContentTerm[];
};

const TITLE_STOPWORDS = new Set([
  'ante',
  'antecedentes',
  'argentina',
  'asi',
  'como',
  'consumo',
  'consumidor',
  'consumidores',
  'contra',
  'cuando',
  'desde',
  'despues',
  'entre',
  'esta',
  'este',
  'esto',
  'estos',
  'hacia',
  'hasta',
  'nota',
  'noticias',
  'para',
  'pero',
  'por',
  'porque',
  'que',
  'segun',
  'sobre',
  'todos',
  'todas',
  'tras',
  'ucu',
  'una',
  'unas',
  'unos',
]);

function uniqueTerms(terms: ContentTerm[]): ContentTerm[] {
  const seen = new Set<string>();
  const result: ContentTerm[] = [];
  for (const term of terms) {
    if (!term.slug || seen.has(term.slug)) continue;
    seen.add(term.slug);
    result.push(term);
  }
  return result;
}

export function termsFromPost(
  terms: ContentTerm[] | undefined,
  slugs: string[] | undefined
): ContentTerm[] {
  if (terms?.length) return uniqueTerms(terms);
  return uniqueTerms((slugs ?? []).map((slug) => ({ slug, name: slug.replace(/-/g, ' ') })));
}

export function titleTokens(title: string): Set<string> {
  const normalized = decodeHtmlEntities(title)
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');

  return new Set(
    normalized
      .split(/[^\p{L}\p{N}]+/u)
      .filter((token) => token.length > 3 && !TITLE_STOPWORDS.has(token))
  );
}

export function rankRelatedPosts(
  current: ContentDocument,
  candidates: ContentDocument[],
  limit = 4
): RelatedPostMatch[] {
  const currentTagSlugs = new Set(termsFromPost(current.tags, current.tagSlugs).map((term) => term.slug));
  const currentCatSlugs = new Set(
    termsFromPost(current.categories, current.categorySlugs).map((term) => term.slug)
  );
  const currentTitle = titleTokens(current.title);
  const matches: RelatedPostMatch[] = [];

  for (const candidate of candidates) {
    if (!candidate?.slug || candidate.slug === current.slug) continue;
    if (candidate.status && candidate.status !== 'publish') continue;

    const tags = termsFromPost(candidate.tags, candidate.tagSlugs);
    const categories = termsFromPost(candidate.categories, candidate.categorySlugs);
    const sharedTags = tags.filter((tag) => currentTagSlugs.has(tag.slug));
    const sharedCategories = categories.filter((category) => currentCatSlugs.has(category.slug));

    let score = sharedTags.length * 3 + sharedCategories.length * 2;
    let titleHits = 0;
    for (const token of titleTokens(candidate.title)) {
      if (currentTitle.has(token)) titleHits += 1;
    }
    score += Math.min(titleHits, 2);

    const published = new Date(candidate.publishedAt).getTime();
    if (Number.isFinite(published)) {
      const ageYears = (Date.now() - published) / (1000 * 60 * 60 * 24 * 365.25);
      if (ageYears < 2) score += 2;
      else if (ageYears < 5) score += 1;
    }

    if (score <= 0) continue;

    matches.push({ post: candidate, score, sharedTags, sharedCategories });
  }

  matches.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return new Date(b.post.publishedAt).getTime() - new Date(a.post.publishedAt).getTime();
  });

  const seen = new Set<string>();
  const ranked: RelatedPostMatch[] = [];
  for (const match of matches) {
    if (seen.has(match.post.slug)) continue;
    seen.add(match.post.slug);
    ranked.push(match);
    if (ranked.length >= limit) break;
  }

  return ranked;
}

export function fillRelatedFallback(
  ranked: RelatedPostMatch[],
  fallback: ContentDocument[],
  currentSlug: string,
  limit: number
): RelatedPostMatch[] {
  const filled = [...ranked];
  const seen = new Set(filled.map((match) => match.post.slug));
  seen.add(currentSlug);

  for (const post of fallback) {
    if (filled.length >= limit) break;
    if (!post?.slug || seen.has(post.slug)) continue;
    if (post.status && post.status !== 'publish') continue;
    seen.add(post.slug);
    filled.push({
      post,
      score: 0,
      sharedTags: [],
      sharedCategories: [],
    });
  }

  return filled.slice(0, limit);
}
