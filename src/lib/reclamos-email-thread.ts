import 'server-only';

import type { StoredReclamoDocument } from '@/types/reclamos';

const RECLAMO_TAG_RE = /\[Reclamo\s*#(\d+)\]/i;
const PLUS_ADDRESS_RE = /reclamo\+(\d+)@/i;
const DASH_ADDRESS_RE = /reclamo-(\d+)@/i;

export function getReclamosInboundDomain(): string | null {
  return process.env.RECLAMOS_INBOUND_DOMAIN?.trim() || null;
}

export function isReclamosInboundConfigured(): boolean {
  return Boolean(getReclamosInboundDomain());
}

export function buildReclamoReplyToAddress(reclamoId: number): string | null {
  const domain = getReclamosInboundDomain();
  if (!domain) return null;
  return `reclamo+${reclamoId}@${domain}`;
}

export function ensureReclamoSubjectTag(subject: string, reclamoId: number): string {
  const trimmed = subject.trim();
  if (RECLAMO_TAG_RE.test(trimmed)) return trimmed;
  return `[Reclamo #${reclamoId}] ${trimmed}`;
}

export function parseReclamoIdFromAddresses(addresses: string[]): number | null {
  for (const raw of addresses) {
    const address = raw.toLowerCase();
    const plusMatch = address.match(PLUS_ADDRESS_RE);
    if (plusMatch?.[1]) return Number(plusMatch[1]) || null;
    const dashMatch = address.match(DASH_ADDRESS_RE);
    if (dashMatch?.[1]) return Number(dashMatch[1]) || null;
  }
  return null;
}

export function parseReclamoIdFromSubject(subject: string): number | null {
  const match = subject.match(RECLAMO_TAG_RE);
  if (!match?.[1]) return null;
  const id = Number(match[1]);
  return Number.isFinite(id) && id > 0 ? id : null;
}

export function extractEmailAddress(value: string): string {
  const trimmed = value.trim();
  const match = trimmed.match(/<([^>]+)>/);
  return (match?.[1] ?? trimmed).trim().toLowerCase();
}

export function extractDisplayName(value: string): string | null {
  const trimmed = value.trim();
  const match = trimmed.match(/^(.+?)\s*<[^>]+>$/);
  const name = match?.[1]?.replace(/^"|"$/g, '').trim();
  return name || null;
}

export function normalizeInboundEmailBody(text: string | null | undefined, html: string | null | undefined): string {
  const plain = (text ?? '').trim();
  if (plain) return stripQuotedReply(plain);

  if (!html?.trim()) return '';
  const withoutTags = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"');
  return stripQuotedReply(withoutTags.replace(/\n{3,}/g, '\n\n').trim());
}

function stripQuotedReply(body: string): string {
  const lines = body.split('\n');
  const cleaned: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (/^on .+wrote:$/i.test(trimmed)) break;
    if (/^-{2,}\s*original message\s*-{2,}$/i.test(trimmed)) break;
    if (/^from:\s/i.test(trimmed) && cleaned.length > 2) break;
    if (trimmed.startsWith('>')) continue;
    cleaned.push(line);
  }

  return cleaned.join('\n').trim();
}

export function resolveReclamoIdFromInboundEmail(input: {
  to: string[];
  cc?: string[];
  bcc?: string[];
  receivedFor?: string[];
  subject: string;
  from: string;
  reclamos: StoredReclamoDocument[];
}): number | null {
  const allAddresses = [
    ...input.to,
    ...(input.cc ?? []),
    ...(input.bcc ?? []),
    ...(input.receivedFor ?? []),
  ];

  const fromAddress = extractEmailAddress(input.from);
  const byAddress = parseReclamoIdFromAddresses(allAddresses);
  if (byAddress) return byAddress;

  const bySubject = parseReclamoIdFromSubject(input.subject);
  if (bySubject) return bySubject;

  const candidates = input.reclamos.filter(
    (reclamo) => extractEmailAddress(reclamo.denunciante.email) === fromAddress
  );
  if (candidates.length === 1) return candidates[0].id;

  return null;
}
