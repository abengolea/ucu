import type { ReclamoAdminBandeja } from '@/types/reclamos';

export type AdminReclamosListMode = 'all' | 'assigned';

export type AdminReclamosFilters = {
  bandeja: ReclamoAdminBandeja | 'todos';
  query: string;
  responsableInput: string;
  provinciaId: string;
  ciudadId: string;
};

const BANDEJAS = new Set<ReclamoAdminBandeja | 'todos'>([
  'recibidos',
  'espera_aceptacion',
  'gestion',
  'archivados',
  'todos',
]);

const STORAGE_PREFIX = 'ucu:admin-reclamos-filters:';
const RETURN_HREF_KEY = 'ucu:admin-reclamos-return';

const PARAM_KEYS = ['bandeja', 'q', 'responsable', 'provinciaId', 'ciudadId'] as const;

export function defaultAdminReclamosFilters(mode: AdminReclamosListMode): AdminReclamosFilters {
  return {
    bandeja: mode === 'assigned' ? 'todos' : 'recibidos',
    query: '',
    responsableInput: '',
    provinciaId: '',
    ciudadId: '',
  };
}

export function hasActiveAdminReclamosFilters(filters: AdminReclamosFilters): boolean {
  return (
    Boolean(filters.query.trim()) ||
    Boolean(filters.responsableInput.trim()) ||
    Boolean(filters.provinciaId) ||
    Boolean(filters.ciudadId)
  );
}

export function parseAdminReclamosFilters(
  search: string,
  mode: AdminReclamosListMode
): AdminReclamosFilters | null {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  if (!PARAM_KEYS.some((key) => params.has(key))) return null;

  const defaults = defaultAdminReclamosFilters(mode);
  const bandejaRaw = params.get('bandeja');
  return {
    bandeja:
      bandejaRaw && BANDEJAS.has(bandejaRaw as ReclamoAdminBandeja | 'todos')
        ? (bandejaRaw as ReclamoAdminBandeja | 'todos')
        : defaults.bandeja,
    query: params.get('q') ?? '',
    responsableInput: params.get('responsable') ?? '',
    provinciaId: params.get('provinciaId') ?? '',
    ciudadId: params.get('ciudadId') ?? '',
  };
}

export function adminReclamosFiltersToSearch(
  filters: AdminReclamosFilters,
  mode: AdminReclamosListMode
): string {
  const defaults = defaultAdminReclamosFilters(mode);
  const params = new URLSearchParams();
  if (filters.bandeja !== defaults.bandeja) params.set('bandeja', filters.bandeja);
  if (filters.query.trim()) params.set('q', filters.query.trim());
  if (mode === 'all' && filters.responsableInput.trim()) {
    params.set('responsable', filters.responsableInput.trim());
  }
  if (filters.provinciaId) params.set('provinciaId', filters.provinciaId);
  if (filters.ciudadId) params.set('ciudadId', filters.ciudadId);
  return params.toString();
}

export function readAdminReclamosFilters(mode: AdminReclamosListMode): AdminReclamosFilters | null {
  if (typeof window === 'undefined') return null;

  const fromUrl = parseAdminReclamosFilters(window.location.search, mode);
  if (fromUrl) return fromUrl;

  try {
    const raw = sessionStorage.getItem(`${STORAGE_PREFIX}${mode}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AdminReclamosFilters>;
    const defaults = defaultAdminReclamosFilters(mode);
    const bandeja =
      parsed.bandeja && BANDEJAS.has(parsed.bandeja) ? parsed.bandeja : defaults.bandeja;
    return {
      bandeja,
      query: typeof parsed.query === 'string' ? parsed.query : '',
      responsableInput: typeof parsed.responsableInput === 'string' ? parsed.responsableInput : '',
      provinciaId: typeof parsed.provinciaId === 'string' ? parsed.provinciaId : '',
      ciudadId: typeof parsed.ciudadId === 'string' ? parsed.ciudadId : '',
    };
  } catch {
    return null;
  }
}

export function persistAdminReclamosFilters(
  mode: AdminReclamosListMode,
  filters: AdminReclamosFilters,
  pathname: string
): void {
  if (typeof window === 'undefined') return;

  try {
    const defaults = defaultAdminReclamosFilters(mode);
    const shouldStore =
      hasActiveAdminReclamosFilters(filters) || filters.bandeja !== defaults.bandeja;
    if (shouldStore) {
      sessionStorage.setItem(`${STORAGE_PREFIX}${mode}`, JSON.stringify(filters));
    } else {
      sessionStorage.removeItem(`${STORAGE_PREFIX}${mode}`);
    }
  } catch {
    // sessionStorage puede fallar en modo privado
  }

  const query = adminReclamosFiltersToSearch(filters, mode);
  const href = query ? `${pathname}?${query}` : pathname;
  const current = `${window.location.pathname}${window.location.search}`;
  if (current !== href && window.location.pathname === pathname) {
    window.history.replaceState(window.history.state, '', href);
  }

  try {
    sessionStorage.setItem(RETURN_HREF_KEY, href);
  } catch {
    // ignore
  }
}

export function getAdminReclamosReturnHref(): string {
  if (typeof window === 'undefined') return '/admin/reclamos';
  try {
    const stored = sessionStorage.getItem(RETURN_HREF_KEY);
    if (stored && isSafeAdminReclamosReturnHref(stored)) return stored;
  } catch {
    // ignore
  }
  return '/admin/reclamos';
}

function isSafeAdminReclamosReturnHref(href: string): boolean {
  const [path] = href.split('?');
  return path === '/admin/reclamos' || path === '/admin/reclamos/asignados';
}
