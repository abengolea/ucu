export const MEMBER_LOGIN_PATH = '/ingresar';
export const MEMBER_REGISTER_PATH = '/registrarse';
export const MEMBER_RECOVER_PATH = '/ingresar/recuperar';

const AUTH_PATHS = [MEMBER_LOGIN_PATH, MEMBER_REGISTER_PATH, MEMBER_RECOVER_PATH];

export function isAuthPath(pathname: string): boolean {
  return AUTH_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export function isProtectedPagePath(pathname: string): boolean {
  if (pathname === '/observatorio' || pathname.startsWith('/observatorio/')) return true;
  if (pathname === '/reclamos/estadisticas' || pathname.startsWith('/reclamos/estadisticas/')) {
    return true;
  }
  if (pathname === '/empresas' || pathname.startsWith('/empresas/')) return true;
  return false;
}

export function isProtectedApiPath(pathname: string): boolean {
  if (pathname.startsWith('/api/observatorio/')) return true;
  if (pathname.startsWith('/api/estadisticas/')) return true;
  if (pathname === '/api/informes/checkout') return true;
  return false;
}

/** Evita open redirects: solo rutas internas del sitio. */
export function safeNextPath(raw: string | null | undefined): string {
  if (!raw) return '/';
  const value = raw.trim();
  if (!value.startsWith('/')) return '/';
  if (value.startsWith('//') || value.includes('://')) return '/';
  if (value.includes('\\')) return '/';
  if (isAuthPath(value)) return '/';
  return value;
}

export function loginUrl(nextPath?: string | null): string {
  const next = safeNextPath(nextPath);
  if (next === '/') return MEMBER_LOGIN_PATH;
  return `${MEMBER_LOGIN_PATH}?next=${encodeURIComponent(next)}`;
}

export function authGateCopy(nextPath?: string | null): {
  eyebrow: string;
  title: string;
  description: string;
} {
  const next = safeNextPath(nextPath);
  if (next.startsWith('/observatorio')) {
    return {
      eyebrow: 'Observatorio de fallos',
      title: 'Registrate para consultar la jurisprudencia',
      description:
        'El Observatorio UCU reúne fallos de consumo con resumen, tribunal y demandado. Es gratuito: ingresá con Google o con email y contraseña.',
    };
  }
  if (next.startsWith('/reclamos/estadisticas') || next.startsWith('/empresas/')) {
    return {
      eyebrow: 'Estadísticas de denuncias',
      title: 'Registrate para consultar denuncias por empresa',
      description:
        'Ves el total de reclamos que recibió UCU contra cada empresa. Es gratuito: ingresá con Google o con email y contraseña.',
    };
  }
  return {
    eyebrow: 'Cuenta UCU',
    title: 'Ingresá para continuar',
    description:
      'Con una cuenta gratuita podés consultar el Observatorio de fallos y las estadísticas de denuncias por empresa.',
  };
}
