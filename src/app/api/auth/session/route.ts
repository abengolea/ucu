import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebase-admin';
import {
  clearMemberSessionCookie,
  getMemberSessionSecret,
  getViewerFromRequest,
  setMemberSessionCookie,
} from '@/lib/member-session';
import { upsertMember } from '@/lib/members-store';
import type { MemberAuthProvider } from '@/types/members';

function decodeProvider(decoded: { firebase?: { sign_in_provider?: string } }): MemberAuthProvider {
  return decoded.firebase?.sign_in_provider === 'password' ? 'password' : 'google';
}

export async function GET(request: NextRequest) {
  const viewer = await getViewerFromRequest(request);
  if (!viewer) {
    return NextResponse.json({ viewer: null }, { status: 401 });
  }
  return NextResponse.json({
    viewer: {
      email: viewer.email,
      name: viewer.name,
      source: viewer.source,
    },
  });
}

export async function POST(request: NextRequest) {
  if (!getMemberSessionSecret()) {
    return NextResponse.json(
      { error: 'Registro no configurado. Falta ADMIN_SESSION_SECRET.' },
      { status: 500 }
    );
  }

  const adminAuth = getAdminAuth();
  if (!adminAuth) {
    return NextResponse.json({ error: 'Firebase Auth no está configurado.' }, { status: 500 });
  }

  let body: { idToken?: string; name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const idToken = typeof body.idToken === 'string' ? body.idToken.trim() : '';
  if (!idToken) {
    return NextResponse.json({ error: 'Token requerido' }, { status: 400 });
  }

  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    const email = decoded.email?.trim().toLowerCase();
    if (!email) {
      return NextResponse.json(
        { error: 'La cuenta no tiene un email asociado.' },
        { status: 403 }
      );
    }

    const name =
      (typeof body.name === 'string' ? body.name.trim() : '') ||
      decoded.name?.trim() ||
      email.split('@')[0] ||
      email;
    const provider = decodeProvider(decoded);

    await upsertMember({
      uid: decoded.uid,
      email,
      name,
      provider,
    });

    const res = NextResponse.json({ ok: true, email, name });
    await setMemberSessionCookie(res, {
      uid: decoded.uid,
      email,
      name,
      provider,
    });
    return res;
  } catch {
    return NextResponse.json({ error: 'No se pudo verificar la sesión' }, { status: 401 });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  clearMemberSessionCookie(res);
  return res;
}
