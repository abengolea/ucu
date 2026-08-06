export type ContentAuthor = {
  login: string;
  name: string;
  email?: string;
};

export type ContentTerm = {
  slug: string;
  name: string;
};

export type FeaturedImage = {
  url: string;
  alt?: string;
};

export type ContentDocument = {
  wpId: number;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  status: string;
  publishedAt: string;
  modifiedAt: string;
  author: ContentAuthor;
  categories: ContentTerm[];
  tags: ContentTerm[];
  categorySlugs: string[];
  tagSlugs: string[];
  featuredImage: FeaturedImage | null;
  type: 'post' | 'page';
  originalLink?: string;
  sourceName?: string;
};

export type CategoryDocument = {
  wpTermId: number;
  slug: string;
  name: string;
  description?: string;
};

export type TagDocument = {
  wpTermId: number;
  slug: string;
  name: string;
};

export type AuthorDocument = {
  wpAuthorId: number;
  login: string;
  name: string;
  email?: string;
};

export type MediaDocument = {
  wpId: number;
  originalUrl: string;
  url: string;
  filename: string;
  mimeType?: string;
};
