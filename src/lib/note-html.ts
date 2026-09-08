const BLOCK_TAG =
  /<(p|div|h[1-6]|ul|ol|li|blockquote|table|article|section|figure|pre)\b/i;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function looksLikeHtmlBlocks(content: string): boolean {
  return BLOCK_TAG.test(content) || /<br\s*\/?>/i.test(content);
}

export function paragraphsFromPlainText(text: string): string {
  const normalized = text.replace(/\r\n?/g, '\n').replace(/\u00a0/g, ' ').trim();
  if (!normalized) return '';

  const blankSeparated = normalized.split(/\n\s*\n+/).map((block) => block.trim()).filter(Boolean);

  if (blankSeparated.length > 1) {
    return blankSeparated
      .map((block) => `<p>${escapeHtml(block).replace(/\n/g, '<br>')}</p>`)
      .join('');
  }

  const lines = normalized.split('\n').map((line) => line.trim()).filter(Boolean);
  if (lines.length <= 1) {
    return `<p>${escapeHtml(normalized)}</p>`;
  }

  const averageLength = lines.reduce((sum, line) => sum + line.length, 0) / lines.length;
  const looksWrapped =
    averageLength < 70 && lines.filter((line) => /[.!?…"»)]\s*$/.test(line)).length < lines.length * 0.4;

  if (looksWrapped) {
    return `<p>${escapeHtml(lines.join(' '))}</p>`;
  }

  return lines.map((line) => `<p>${escapeHtml(line)}</p>`).join('');
}

/** Convierte texto plano con párrafos en HTML, sin tocar notas que ya vienen marcadas. */
export function ensureNoteHtml(content: string): string {
  const trimmed = content.trim();
  if (!trimmed) return '';
  if (looksLikeHtmlBlocks(trimmed)) return trimmed;
  return paragraphsFromPlainText(trimmed);
}

export function normalizePastedHtml(html: string): string {
  const fragment = html
    .replace(/<!--StartFragment-->/gi, '')
    .replace(/<!--EndFragment-->/gi, '')
    .replace(/<(meta|xml)[^>]*>/gi, '')
    .trim();

  if (!looksLikeHtmlBlocks(fragment) && fragment.length) {
    const textOnly = fragment.replace(/<[^>]+>/g, '\n').replace(/&nbsp;/gi, ' ');
    return paragraphsFromPlainText(textOnly);
  }

  return fragment.replace(/(<br\s*\/?>\s*){2,}/gi, '</p><p>');
}
