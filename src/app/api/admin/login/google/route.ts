import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebase-admin';
import { getAdminSessionConfig, setAdminSessionCookie } from '@/lib/admin-session';
import { resolveAdminSessionUser } from '@/lib/admin-users-store';

export async function POST(request: NextRequest) {
  const cfg = getAdminSessionConfig();
  if (!cfg) {
    return NextResponse.json(
      {
        error:
          'Panel admin no configurado. Completá ADMIN_PANEL_EMAIL y ADMIN_SESSION_SECRET en .env.local',
      },
      { status: 500 }
    );
  }

  const adminAuth = getAdminAuth();
  if (!adminAuth) {
    return NextResponse.json({ error: 'Firebase Admin no configurado' }, { status: 500 });
  }

  let body: { idToken?: string };
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
      return NextResponse.json({ error: 'La cuenta de Firebase no tiene email.' }, { status: 403 });
    }

    const user = await resolveAdminSessionUser(email);
    if (!user) {
      return NextResponse.json(
        { error: 'Esta cuenta no tiene permiso para acceder al panel.' },
        { status: 403 }
      );
    }

    const res = NextResponse.json({ ok: true, email: user.email });
    setAdminSessionCookie(
      res,
      user.email,
      cfg.secret,
      user.role,
      user.name,
      user.reclamosWriteScope
    );
    return res;
  } catch {
    return NextResponse.json({ error: 'No se pudo verificar la sesión' }, { status: 401 });
  }
}
