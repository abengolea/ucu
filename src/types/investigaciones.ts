export const INVESTIGACION_AI_OPTIONS = [
  'Claude',
  'Gemini',
  'ChatGPT',
  'Copilot',
  'Perplexity',
  'Otra',
] as const;

export type InvestigacionAiName = (typeof INVESTIGACION_AI_OPTIONS)[number] | string;

export type InvestigacionStatus = 'publish' | 'draft';

export type InvestigacionDocument = {
  slug: string;
  title: string;
  excerpt: string;
  empresaNombre: string;
  empresaId: number | null;
  memberName: string;
  aiName: string;
  originalUrl?: string;
  html: string;
  htmlStoragePath?: string;
  isFullDocument: boolean;
  status: InvestigacionStatus;
  publishedAt: string;
  modifiedAt: string;
};

export type InvestigacionListItem = Omit<
  InvestigacionDocument,
  'html' | 'htmlStoragePath' | 'isFullDocument'
>;
