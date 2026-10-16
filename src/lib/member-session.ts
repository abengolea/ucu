import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { redirect } from 'next/navigation';
import {
  ADMIN_SESSION_COOKIE,
  getAdminSessionConfig,
  requireAdminSession,
  verifyAdminSessionToken,
} from '@/lib/admin-session';
import { signHmacToken, verifyHmacToken } from '@/lib/hmac-token';
import { loginUrl } from '@/lib/member-paths';
import type { MemberAuthProvider, MemberViewer } from '@/types/members';

export const MEMBER_SESSION_COOKIE = 'ucu_member_sess';
export const MEMBER_SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 30;

type MemberTokenPayload = {
  u: string;
  e: string;
  n: string;
  p: 'g' | 'w';
  exp: number;
};

function providerToToken(provider: MemberAuthProvider): 'g' | 'w' {
  return provider === 'google' ? 'g' : 'w';
}

function providerFromToken(value: unknown): MemberAuthProvider {
  return value === 'g' ? 'google' : 'password';
}

export function getMemberSessionSecret(): string | null {
  const secret =
    process.env.MEMBER_SESSION_SECRET?.trim() || process.env.ADMIN_SESSION_SECRET?.trim();
  return secret || null;
}

function adminViewer(email: string, name: string): MemberViewer {
  return {
    uid: `admin:${email}`,
    email,
    name,
    provider: 'admin',
    source: 'admin',
  };
}

async function parseMemberToken(raw: string | undefined): Promise<MemberViewer | null> {
  const secret = getMemberSessionSecret();
  if (!secret || !raw) return null;
  const json = await verifyHmacToken(raw, secret);
  if (!json) return null;
  try {
    const data = JSON.parse(json) as Partial<MemberTokenPayload>;
    if (!data.exp || data.exp < Math.floor(Date.now() / 1000)) return null;
    const email = data.e?.trim().toLowerCase();
    const uid = data.u?.trim();
    if (!email || !uid) return null;
    return {
      uid,
      email,
      name: data.n?.trim() || email.split('@')[0] || email,
      provider: providerFromToken(data.p),
      source: 'member',
    };
  } catch {
    return null;
  }
}

function parseAdminCookie(raw: string | undefined): MemberViewer | null {
  const cfg = getAdminSessionConfig();
  if (!cfg || !raw) return null;
  const session = verifyAdminSessionToken(raw, cfg.secret);
  if (!session) return null;
  return adminViewer(session.email, session.name);
}

export async function getViewer(): Promise<MemberViewer | null> {
  const jar = await cookies();
  const member = await parseMemberToken(jar.get(MEMBER_SESSION_COOKIE)?.value);
  if (member) return member;
  return parseAdminCookie(jar.get(ADMIN_SESSION_COOKIE)?.value);
}

export async function getViewerFromRequest(request: NextRequest): Promise<MemberViewer | null> {
  const member = await parseMemberToken(request.cookies.get(MEMBER_SESSION_COOKIE)?.value);
  if (member) return member;
  const admin = requireAdminSession(request);
  if (admin) return adminViewer(admin.email, admin.name);
  return null;
}

export async function requireMemberPage(nextPath: string): Promise<MemberViewer> {
  const viewer = await getViewer();
  if (viewer) return viewer;
  redirect(loginUrl(nextPath));
}

export async function requireMemberApi(request: NextRequest): Promise<MemberViewer | NextResponse> {
  const viewer = await getViewerFromRequest(request);
  if (viewer) return viewer;
  return NextResponse.json(
    {
      error: 'Necesitás ingresar o registrarte para continuar.',
      code: 'AUTH_REQUIRED',
    },
    { status: 401 }
  );
}

export async function signMemberSession(input: {
  uid: string;
  email: string;
  name: string;
  provider: MemberAuthProvider;
}): Promise<string> {
  const secret = getMemberSessionSecret();
  if (!secret) {
    throw new Error('Sesión de usuarios no configurada');
  }
  const payload: MemberTokenPayload = {
    u: input.uid,
    e: input.email.trim().toLowerCase(),
    n: input.name.trim() || input.email.split('@')[0] || input.email,
    p: providerToToken(input.provider),
    exp: Math.floor(Date.now() / 1000) + MEMBER_SESSION_MAX_AGE_SEC,
  };
  return signHmacToken(JSON.stringify(payload), secret);
}

export async function setMemberSessionCookie(
  response: NextResponse,
  input: {
    uid: string;
    email: string;
    name: string;
    provider: MemberAuthProvider;
  }
): Promise<void> {
  const token = await signMemberSession(input);
  response.cookies.set(MEMBER_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: MEMBER_SESSION_MAX_AGE_SEC,
  });
}

export function clearMemberSessionCookie(response: NextResponse): void {
  response.cookies.set(MEMBER_SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

