import { NextRequest, NextResponse } from 'next/server';
import { verifyHmacToken } from '@/lib/hmac-token';
import {
  isProtectedApiPath,
  isProtectedPagePath,
  loginUrl,
} from '@/lib/member-paths';

const MEMBER_COOKIE = 'ucu_member_sess';
const ADMIN_COOKIE = 'ucu_admin_sess';

function sessionSecret(): string | null {
  return (
    process.env.MEMBER_SESSION_SECRET?.trim() ||
    process.env.ADMIN_SESSION_SECRET?.trim() ||
    null
  );
}

function adminSecret(): string | null {
  return process.env.ADMIN_SESSION_SECRET?.trim() || null;
}

async function tokenIsLive(raw: string | undefined, secret: string | null): Promise<boolean> {
  if (!raw || !secret) return false;
  const json = await verifyHmacToken(raw, secret);
  if (!json) return false;
  try {
    const data = JSON.parse(json) as { exp?: number; e?: string };
    if (!data.e || !data.exp || data.exp < Math.floor(Date.now() / 1000)) return false;
    return true;
  } catch {
    return false;
  }
}

async function hasViewer(request: NextRequest): Promise<boolean> {
  if (await tokenIsLive(request.cookies.get(MEMBER_COOKIE)?.value, sessionSecret())) {
    return true;
  }
  return tokenIsLive(request.cookies.get(ADMIN_COOKIE)?.value, adminSecret());
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const protectedPage = isProtectedPagePath(pathname);
  const protectedApi = isProtectedApiPath(pathname);
  if (!protectedPage && !protectedApi) {
    return NextResponse.next();
  }

  if (await hasViewer(request)) {
    return NextResponse.next();
  }

  if (protectedApi) {
    return NextResponse.json(
      {
        error: 'Necesitás ingresar o registrarte para continuar.',
        code: 'AUTH_REQUIRED',
      },
      { status: 401 }
    );
  }

  const next = `${pathname}${request.nextUrl.search}`;
  return NextResponse.redirect(new URL(loginUrl(next), request.url));
}

export const config = {
  matcher: [
    '/observatorio',
    '/observatorio/:path*',
    '/reclamos/estadisticas',
    '/reclamos/estadisticas/:path*',
    '/empresas/:path*',
    '/api/observatorio/:path*',
    '/api/estadisticas/:path*',
    '/api/informes/checkout',
  ],
};
