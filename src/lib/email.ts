import 'server-only';

import { Resend } from 'resend';

function getResend(): Resend {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key || key.startsWith('re_REEMPLAZAR')) {
    throw new Error('RESEND_API_KEY no configurada en .env.local');
  }
  return new Resend(key);
}

function getFromEmail(): string {
  return (
    process.env.RESEND_FROM_EMAIL?.trim() ||
    'UCU Usuarios Protegidos <reclamos@consumidoresprotegidos.com.ar>'
  );
}

export type SendEmailOptions = {
  to: string;
  subject: string;
  body: string;
  replyTo?: string;
  headers?: Record<string, string>;
  tags?: { name: string; value: string }[];
};

export async function sendEmail(opts: SendEmailOptions): Promise<void> {
  const resend = getResend();
  const html = bodyToHtml(opts.body);
  const { error } = await resend.emails.send({
    from: getFromEmail(),
    to: opts.to,
    subject: opts.subject,
    html,
    text: opts.body,
    replyTo: opts.replyTo,
    headers: opts.headers,
    tags: opts.tags,
  });
  if (error) throw new Error(error.message);
}

export function isResendConfigured(): boolean {
  const key = process.env.RESEND_API_KEY?.trim();
  return Boolean(key && !key.startsWith('re_REEMPLAZAR'));
}

// Convierte texto plano con saltos de línea a HTML simple con el estilo UCU
function bodyToHtml(text: string): string {
  const lines = text
    .split('\n')
    .map((line) => `<p style="margin:0 0 8px 0;line-height:1.6">${escapeHtml(line) || '&nbsp;'}</p>`)
    .join('');

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:system-ui,-apple-system,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%">
        <!-- Header -->
        <tr>
          <td style="background:#1a5fb4;border-radius:12px 12px 0 0;padding:20px 28px">
            <p style="margin:0;font-size:18px;font-weight:700;color:#fff">UCU — Usuarios Consumidores Unidos</p>
            <p style="margin:4px 0 0;font-size:13px;color:#bfdbfe">Área de Reclamos · Usuarios Protegidos</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="background:#fff;padding:28px;font-size:14px;color:#1e293b">
            ${lines}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;border-radius:0 0 12px 12px;padding:16px 28px;border-top:1px solid #e2e8f0">
            <p style="margin:0;font-size:12px;color:#64748b">
              UCU · San Nicolás de los Arroyos, Buenos Aires ·
              <a href="https://consumidoresprotegidos.com.ar" style="color:#1a5fb4">consumidoresprotegidos.com.ar</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
