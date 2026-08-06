/**
 * Shared helpers for Drive change detection (MVP).
 * Used by scripts/poll-drive-changes.mjs
 */

export function trim(value) {
  return String(value ?? '').trim();
}

export function normalizeText(raw) {
  return String(raw ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[^\S\n]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    .trim()
    .toLowerCase();
}

export function parseDriveResourceFromUrl(url) {
  const raw = trim(url);
  if (!raw) return null;

  try {
    const u = new URL(raw);
    const path = u.pathname;

    let m = path.match(/\/(?:document|presentation|spreadsheets)\/d\/([^/]+)/i);
    if (m) {
      return { id: m[1], kind: 'google_workspace' };
    }

    m = path.match(/\/file\/d\/([^/]+)/i);
    if (m) {
      return { id: m[1], kind: 'file' };
    }

    m = path.match(/\/folders\/([^/]+)/i);
    if (m) {
      return { id: m[1], kind: 'folder' };
    }

    const idParam = u.searchParams.get('id');
    if (idParam) {
      return { id: idParam, kind: 'unknown' };
    }
  } catch {
    return null;
  }

  return null;
}

export const HITO_PATTERNS = {
  'Carta Documento': [
    /carta\s+doc(?:umento)?/i,
    /\bc\.?d\.?\b(?!\s*rom)/i,
    /se\s+envi[oó]\s+(?:la\s+)?carta/i,
    /notificaci[oó]n\s+fehaciente/i,
  ],
  Mediación: [
    /mediaci[oó]n/i,
    /audiencia\s+de\s+mediaci[oó]n/i,
    /centro\s+de\s+mediaci[oó]n/i,
    /secmed|secom|cuamep/i,
  ],
  'Demanda en preparación': [
    /demanda\s+en\s+preparaci[oó]n/i,
    /preparando?\s+(?:la\s+)?demanda/i,
    /redact\w+\s+(?:la\s+)?demanda/i,
  ],
  'Demanda presentada': [
    /demanda\s+present\w+/i,
    /se\s+present[oó]\s+(?:la\s+)?demanda/i,
    /ingres[oó]\s+(?:la\s+)?demanda/i,
    /juzgado\s+(?:n[°º]?\s*)?\d+/i,
    /\bexpte\.?\s*[a-z]?[-\d]+\/\d{2,4}/i,
    /car[aá]tula/i,
  ],
  'Demanda notificada': [
    /demanda\s+notificad\w+/i,
    /notificaci[oó]n\s+(?:de\s+)?(?:la\s+)?demanda/i,
    /c[eé]dula\s+(?:de\s+)?notificaci[oó]n/i,
    /traslado\s+de\s+demanda/i,
  ],
  'Abierto a prueba': [
    /apertura\s+(?:del?\s+)?per[ií]odo\s+de\s+prueba/i,
    /abierto?\s+(?:el?\s+)?(?:per[ií]odo\s+de\s+)?prueba/i,
    /ofrecimiento\s+de\s+prueba/i,
  ],
  Sentencia: [
    /sentenci\w+/i,
    /\bfallo\b/i,
    /se\s+dict[oó]\s+sentencia/i,
    /hizo\s+lugar/i,
  ],
  Apelación: [
    /apelaci[oó]n/i,
    /recurso\s+de\s+apelaci[oó]n/i,
    /se\s+apel[oó]/i,
    /c[aá]mara\s+(?:de\s+)?apelaciones/i,
  ],
  'Diligencia preliminar': [
    /diligencia\s+preliminar/i,
    /medida\s+cautelar/i,
    /inhibici[oó]n\s+general/i,
    /\bembargo\b/i,
    /anotaci[oó]n\s+de\s+litis/i,
  ],
  'Acuerdo transaccional': [
    /acuerdo\s+transaccional/i,
    /acuerdo\s+extrajudicial/i,
    /transacci[oó]n\b/i,
    /se\s+lleg[oó]\s+a\s+(?:un\s+)?acuerdo/i,
    /arribar(?:on)?\s+a\s+(?:un\s+)?acuerdo/i,
  ],
  'Sentencia firme': [
    /sentencia\s+firme/i,
    /cosa\s+juzgada/i,
    /ejecutoriada/i,
  ],
  'Acuerdo conciliatorio': [
    /conciliaci[oó]n/i,
    /acuerdo\s+conciliatorio/i,
    /acta\s+de\s+conciliaci[oó]n/i,
    /se\s+concili[oó]/i,
  ],
  'Desinterés del reclamante': [
    /desinter[eé]s/i,
    /desiste\b/i,
    /desistimiento/i,
    /abandona\s+(?:el\s+)?reclamo/i,
    /perdi[oó]\s+contacto/i,
    /sin\s+respuesta\s+del\s+cliente/i,
  ],
  'Consulta efectuada': [
    /consulta\s+efectuada/i,
    /solo\s+(?:fue\s+)?una?\s+consulta/i,
    /no\s+inici[oó]\s+reclamo/i,
  ],
  'Sanción firme': [
    /sanci[oó]n\s+firme/i,
    /multa\s+firme/i,
  ],
  'Rechazo denuncia': [
    /rechaz[oó]\s+(?:la\s+)?denuncia/i,
    /denuncia\s+rechazada/i,
    /improcedente\b/i,
  ],
  Archivo: [/se\s+archiv[oó]/i, /\barchiv\w+\b/i, /cerr[oó]\s+(?:el\s+)?caso/i],
};

export const STRUCTURAL_PATTERNS = {
  expediente: /expte\.?\s*[a-z]?\s*[-\d.]+\/\d{2,4}|n[°º]\s*\d{4,}[-\/]\d{2,4}|causa\s+[a-z]?\s*\d{4,}/i,
  monto: /\$\s*[\d.,]{4,}|\b\d[\d.,]{3,}\s*(?:pesos|ars)/i,
  dni: /d\.?n\.?i\.?\s*[:\-]?\s*\d{7,8}/i,
};

function toParagraphs(text) {
  return normalizeText(text)
    .split(/\n{2,}/)
    .map((p) => p.replace(/\n/g, ' ').trim())
    .filter(Boolean);
}

/**
 * Simple paragraph LCS-ish diff: classify as added/removed/unchanged/modified.
 */
export function diffParagraphs(prevRaw, currRaw) {
  const prev = toParagraphs(prevRaw);
  const curr = toParagraphs(currRaw);

  const prevSet = new Map();
  for (const p of prev) prevSet.set(p, (prevSet.get(p) || 0) + 1);
  const currSet = new Map();
  for (const p of curr) currSet.set(p, (currSet.get(p) || 0) + 1);

  const unchanged = [];
  const added = [];
  const removed = [];

  for (const [p, count] of currSet) {
    const shared = Math.min(count, prevSet.get(p) || 0);
    for (let i = 0; i < shared; i++) unchanged.push(p);
    for (let i = shared; i < count; i++) added.push(p);
  }
  for (const [p, count] of prevSet) {
    const shared = Math.min(count, currSet.get(p) || 0);
    for (let i = shared; i < count; i++) removed.push(p);
  }

  // Pair near-duplicates as modified (same prefix)
  const modified = [];
  const leftoverAdded = [...added];
  const leftoverRemoved = [...removed];
  const usedAdded = new Set();
  const usedRemoved = new Set();

  for (let ri = 0; ri < leftoverRemoved.length; ri++) {
    const before = leftoverRemoved[ri];
    let bestAj = -1;
    let bestScore = 0;
    for (let aj = 0; aj < leftoverAdded.length; aj++) {
      if (usedAdded.has(aj)) continue;
      const after = leftoverAdded[aj];
      const score = paragraphSimilarity(before, after);
      if (score > bestScore) {
        bestScore = score;
        bestAj = aj;
      }
    }
    if (bestAj >= 0 && bestScore >= 0.55) {
      modified.push({ before, after: leftoverAdded[bestAj] });
      usedAdded.add(bestAj);
      usedRemoved.add(ri);
    }
  }

  const finalAdded = leftoverAdded.filter((_, i) => !usedAdded.has(i));
  const finalRemoved = leftoverRemoved.filter((_, i) => !usedRemoved.has(i));

  const changedCount = finalAdded.length + finalRemoved.length + modified.length;
  const denom = Math.max(prev.length, curr.length, 1);
  const percentChanged = (changedCount / denom) * 100;

  return {
    added: finalAdded,
    removed: finalRemoved,
    modified,
    unchanged,
    percentChanged,
    paragraphsAdded: finalAdded.length,
    paragraphsModified: modified.length,
    paragraphsRemoved: finalRemoved.length,
  };
}

function paragraphSimilarity(a, b) {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const ta = new Set(a.split(/\s+/).filter((t) => t.length > 2));
  const tb = new Set(b.split(/\s+/).filter((t) => t.length > 2));
  if (!ta.size || !tb.size) return 0;
  let hit = 0;
  for (const t of ta) if (tb.has(t)) hit += 1;
  return hit / Math.max(ta.size, tb.size);
}

function keywordInText(patterns, text) {
  return patterns.some((p) => p.test(text));
}

/**
 * Score only NEW/MODIFIED paragraphs. If keyword also present in modified.before, skip hito score.
 */
export function scoreChanges(diff, filename = '') {
  let score = 0;
  const matched = [];

  const newChunks = [];
  for (const p of diff.added || []) newChunks.push({ text: p, before: null });
  for (const m of diff.modified || []) newChunks.push({ text: m.after, before: m.before });

  const changedText = newChunks.map((c) => c.text).join('\n');

  for (const [hito, patterns] of Object.entries(HITO_PATTERNS)) {
    let hit = false;
    for (const chunk of newChunks) {
      if (!keywordInText(patterns, chunk.text)) continue;
      if (chunk.before && keywordInText(patterns, chunk.before)) continue;
      hit = true;
      break;
    }
    if (hit) {
      score += 10;
      matched.push(`hito:${hito}`);
    }
  }

  for (const [hito, patterns] of Object.entries(HITO_PATTERNS)) {
    if (keywordInText(patterns, filename)) {
      score += 5;
      matched.push(`filename:${hito}`);
    }
  }

  if (STRUCTURAL_PATTERNS.expediente.test(changedText)) {
    score += 5;
    matched.push('expediente-nuevo');
  }
  if (STRUCTURAL_PATTERNS.monto.test(changedText)) {
    score += 3;
    matched.push('monto-nuevo');
  }
  if (STRUCTURAL_PATTERNS.dni.test(changedText)) {
    score += 3;
    matched.push('dni-nuevo');
  }

  if (diff.percentChanged > 30) {
    score += 2;
    matched.push('diff:large');
  } else if (diff.percentChanged > 8) {
    score += 1;
    matched.push('diff:medium');
  }

  const lowerName = String(filename || '').toLowerCase();
  if (lowerName.endsWith('.pdf')) {
    score = Math.max(score, 3);
    matched.push('pdf:always-review');
  }

  // First snapshot empty → treat as large change already via percentChanged

  let action = 'skip';
  if (score >= 10) action = 'alert_high';
  else if (score >= 3) action = 'needs_review';

  return { score, matched, action };
}

export function buildDiffSnippet(diff, maxChars = 3000) {
  const parts = [];
  for (const p of diff.added || []) parts.push(`+ ${p}`);
  for (const m of diff.modified || []) {
    parts.push(`~ antes: ${m.before}`);
    parts.push(`~ ahora: ${m.after}`);
  }
  for (const p of (diff.removed || []).slice(0, 5)) parts.push(`- ${p}`);
  return parts.join('\n').slice(0, maxChars);
}

export const MIME_GOOGLE_DOC = 'application/vnd.google-apps.document';
const MIME_GOOGLE_FOLDER = 'application/vnd.google-apps.folder';
export const MIME_DOCX =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
export const MIME_DOC = 'application/msword';
export const MIME_PDF = 'application/pdf';

export function classifyMime(mimeType) {
  if (mimeType === MIME_GOOGLE_DOC) return 'google_doc';
  if (mimeType === MIME_DOCX || mimeType === MIME_DOC) return 'docx';
  if (mimeType === MIME_PDF) return 'pdf';
  if (mimeType === MIME_GOOGLE_FOLDER) return 'folder';
  return 'other';
}

export function isWatchableMime(mimeType) {
  const kind = classifyMime(mimeType);
  return kind === 'google_doc' || kind === 'docx' || kind === 'pdf';
}
