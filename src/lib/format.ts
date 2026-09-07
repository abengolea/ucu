export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x?[0-9a-fA-F]+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const NAMED_HTML_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: '\u00A0',
  iexcl: '¡',
  cent: '¢',
  pound: '£',
  curren: '¤',
  yen: '¥',
  brvbar: '¦',
  sect: '§',
  uml: '¨',
  copy: '©',
  ordf: 'ª',
  laquo: '«',
  not: '¬',
  shy: '\u00AD',
  reg: '®',
  macr: '¯',
  deg: '°',
  plusmn: '±',
  sup2: '²',
  sup3: '³',
  acute: '´',
  micro: 'µ',
  para: '¶',
  middot: '·',
  cedil: '¸',
  sup1: '¹',
  ordm: 'º',
  raquo: '»',
  frac14: '¼',
  frac12: '½',
  frac34: '¾',
  iquest: '¿',
  Agrave: 'À',
  Aacute: 'Á',
  Acirc: 'Â',
  Atilde: 'Ã',
  Auml: 'Ä',
  Aring: 'Å',
  AElig: 'Æ',
  Ccedil: 'Ç',
  Egrave: 'È',
  Eacute: 'É',
  Ecirc: 'Ê',
  Euml: 'Ë',
  Igrave: 'Ì',
  Iacute: 'Í',
  Icirc: 'Î',
  Iuml: 'Ï',
  ETH: 'Ð',
  Ntilde: 'Ñ',
  Ograve: 'Ò',
  Oacute: 'Ó',
  Ocirc: 'Ô',
  Otilde: 'Õ',
  Ouml: 'Ö',
  times: '×',
  Oslash: 'Ø',
  Ugrave: 'Ù',
  Uacute: 'Ú',
  Ucirc: 'Û',
  Uuml: 'Ü',
  Yacute: 'Ý',
  THORN: 'Þ',
  szlig: 'ß',
  agrave: 'à',
  aacute: 'á',
  acirc: 'â',
  atilde: 'ã',
  auml: 'ä',
  aring: 'å',
  aelig: 'æ',
  ccedil: 'ç',
  egrave: 'è',
  eacute: 'é',
  ecirc: 'ê',
  euml: 'ë',
  igrave: 'ì',
  iacute: 'í',
  icirc: 'î',
  iuml: 'ï',
  eth: 'ð',
  ntilde: 'ñ',
  ograve: 'ò',
  oacute: 'ó',
  ocirc: 'ô',
  otilde: 'õ',
  ouml: 'ö',
  divide: '÷',
  oslash: 'ø',
  ugrave: 'ù',
  uacute: 'ú',
  ucirc: 'û',
  uuml: 'ü',
  yacute: 'ý',
  thorn: 'þ',
  yuml: 'ÿ',
  OElig: 'Œ',
  oelig: 'œ',
  Scaron: 'Š',
  scaron: 'š',
  Yuml: 'Ÿ',
  fnof: 'ƒ',
  circ: 'ˆ',
  tilde: '˜',
  ensp: '\u2002',
  emsp: '\u2003',
  thinsp: '\u2009',
  ndash: '–',
  mdash: '—',
  lsquo: '‘',
  rsquo: '’',
  sbquo: '‚',
  ldquo: '“',
  rdquo: '”',
  bdquo: '„',
  dagger: '†',
  Dagger: '‡',
  permil: '‰',
  lsaquo: '‹',
  rsaquo: '›',
  euro: '€',
  hellip: '…',
  bull: '•',
  trade: '™',
};

const CASE_INSENSITIVE_ENTITIES = new Set(['amp', 'lt', 'gt', 'quot', 'apos', 'nbsp']);

function decodeNamedEntity(name: string): string | undefined {
  if (NAMED_HTML_ENTITIES[name]) return NAMED_HTML_ENTITIES[name];
  const lower = name.toLowerCase();
  if (CASE_INSENSITIVE_ENTITIES.has(lower)) return NAMED_HTML_ENTITIES[lower];
  return undefined;
}

function decodeHtmlEntitiesOnce(text: string): string {
  return text.replace(
    /&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z][a-zA-Z0-9]+);/g,
    (entity, body: string) => {
      if (body[0] === '#') {
        const code =
          body[1] === 'x' || body[1] === 'X'
            ? parseInt(body.slice(2), 16)
            : Number(body.slice(1));
        if (Number.isFinite(code) && code >= 0 && code <= 0x10ffff) {
          try {
            return String.fromCodePoint(code);
          } catch {
            return entity;
          }
        }
        return entity;
      }
      return decodeNamedEntity(body) ?? entity;
    }
  );
}

export function decodeHtmlEntities(text: string): string {
  let current = text;
  for (let i = 0; i < 3; i += 1) {
    const next = decodeHtmlEntitiesOnce(current);
    if (next === current) break;
    current = next;
  }
  return current;
}
