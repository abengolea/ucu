import { NextRequest, NextResponse } from 'next/server';
import { requireAdminPermission } from '@/lib/admin-session';
import { sendEmail } from '@/lib/email';
import { getAdminAuth } from '@/lib/firebase-admin';
import { listAdminUsers } from '@/lib/admin-users-store';
import { getSiteUrl } from '@/lib/seo';

type RouteContext = { params: Promise<{ id: string }> };

const PRODUCTION_SITE_URL = 'https://ucu.org.ar';

function decodeEmail(id: string): string {
  return decodeURIComponent(id).trim().toLowerCase();
}

function isUserNotFound(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: string }).code === 'auth/user-not-found'
  );
}

/** Continue URL del reset: nunca localhost (el destinatario no tiene tu máquina). */
function getPasswordResetContinueUrl(): string {
  const siteUrl = getSiteUrl();
  const isLocal =
    /localhost|127\.0\.0\.1/i.test(siteUrl) || siteUrl.startsWith('http://');
  return `${isLocal ? PRODUCTION_SITE_URL : siteUrl}/admin/login`;
}

function buildResetEmailBody(name: string, link: string, requestedBy: string): string {
  const greeting = name.trim() || 'Hola';
  return `Hola ${greeting},

Recibimos un pedido para restablecer la contraseña de tu acceso al panel de administración de UCU.

Restablecer contraseña: ${link}

Si no pediste este cambio, ignorá este mensaje. El enlace vence en unas horas.

Solicitado por: ${requestedBy}

— UCU Admin`;
}

export async function POST(request: NextRequest, context: RouteContext) {
  const session = requireAdminPermission(request, 'users:write');
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const email = decodeEmail((await context.params).id);
  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Email inválido' }, { status: 400 });
  }

  const users = await listAdminUsers();
  const user = users.find((item) => item.email === email);
  if (!user) {
    return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
  }

  const auth = getAdminAuth();
  if (!auth) {
    return NextResponse.json({ error: 'Firebase Auth no está configurado' }, { status: 500 });
  }

  try {
    try {
      await auth.getUserByEmail(email);
    } catch (err) {
      if (!isUserNotFound(err)) throw err;
      await auth.createUser({
        email,
        displayName: user.name || undefined,
        emailVerified: true,
      });
    }

    const link = await auth.generatePasswordResetLink(email, {
      url: getPasswordResetContinueUrl(),
    });

    const requestedBy = session.name?.trim() || session.email;
    try {
      await sendEmail({
        to: email,
        subject: 'UCU — Restablecé tu contraseña del panel',
        body: buildResetEmailBody(user.name, link, requestedBy),
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'No se pudo enviar el email de restablecimiento';
      return NextResponse.json(
        { error: `Link generado, pero falló el envío del mail: ${message}`, link, email, emailed: false },
        { status: 502 }
      );
    }

    return NextResponse.json({ link, email, emailed: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'No se pudo generar el link de restablecimiento';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
