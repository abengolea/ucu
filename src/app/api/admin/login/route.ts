import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminPassword } from '@/lib/admin-password';
import { getAdminSessionConfig, isAllowedAdminEmail, setAdminSessionCookie } from '@/lib/admin-session';
import { getAdminUserAuthRecord, upgradeAdminPassword } from '@/lib/admin-users-store';
import { verifyFirebaseEmailPassword } from '@/lib/firebase-password-auth';

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

  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!email || !password.trim()) {
    return NextResponse.json({ error: 'Credenciales incorrectas' }, { status: 401 });
  }

  const user = await getAdminUserAuthRecord(email);
  if (!user) {
    return NextResponse.json({ error: 'Esta cuenta no tiene permiso para acceder al panel.' }, { status: 403 });
  }

  let valid = await verifyAdminPassword(password, user);
  let usedFirebasePassword = false;
  const usedBootstrap =
    !valid &&
    Boolean(cfg.password) &&
    password.trim() === cfg.password &&
    isAllowedAdminEmail(email);

  if (usedBootstrap) {
    valid = true;
  }

  if (!valid) {
    usedFirebasePassword = await verifyFirebaseEmailPassword(email, password);
    valid = usedFirebasePassword;
  }

  if (!valid) {
    return NextResponse.json({ error: 'Credenciales incorrectas' }, { status: 401 });
  }

  if (
    (usedFirebasePassword || (!user.passwordHash && user.legacyPasswordHash && !usedBootstrap)) &&
    !usedBootstrap
  ) {
    await upgradeAdminPassword(email, password);
  }

  const res = NextResponse.json({ ok: true });
  setAdminSessionCookie(
    res,
    user.email,
    cfg.secret,
    user.role,
    user.name,
    user.reclamosWriteScope
  );
  return res;
}
