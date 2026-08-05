import 'server-only';

import { Resend } from 'resend';

function getResend(): Resend {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key || key.startsWith('re_REEMPLAZAR')) {
    throw new Error('RESEND_API_KEY no configurada en el entorno del servidor');
  }
  return new Resend(key);
}

function getFromEmail(): string {
  return (
    process.env.RESEND_FROM_EMAIL?.trim() ||
    'UCU Usuarios Protegidos <reclamos@ucu.org.ar>'
  );
}

/** Dirección donde el consumidor debe responder (no usar From si no es buzón real). */
export function buildReplyToAddress(reclamoId?: number): string | undefined {
  const inboundDomain = process.env.RESEND_INBOUND_DOMAIN?.trim();
  if (inboundDomain && reclamoId) {
    const local = process.env.RESEND_INBOUND_LOCAL_PART?.trim() || 'reclamos';
    return `${local}+${reclamoId}@${inboundDomain}`;
  }

  return process.env.RESEND_REPLY_TO?.trim() || undefined;
}

export type SendEmailOptions = {
  to: string;
  subject: string;
  body: string;
  reclamoId?: number;
};

export async function sendEmail(opts: SendEmailOptions): Promise<{ id: string }> {
  const resend = getResend();
  const html = bodyToHtml(opts.body, opts.subject);
  const replyTo = buildReplyToAddress(opts.reclamoId);

  const { data, error } = await resend.emails.send({
    from: getFromEmail(),
    to: opts.to,
    subject: opts.subject,
    html,
    text: opts.body,
    ...(replyTo ? { replyTo } : {}),
  });

  if (error) throw new Error(error.message);
  if (!data?.id) throw new Error('Resend no devolvió ID de mensaje');
  return { id: data.id };
}

export async function fetchReceivedEmailContent(emailId: string): Promise<{
  text?: string | null;
  html?: string | null;
  from?: string;
  subject?: string;
}> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) throw new Error('RESEND_API_KEY no configurada');

  const response = await fetch(`https://api.resend.com/emails/receiving/${emailId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  const payload = (await response.json()) as {
    text?: string | null;
    html?: string | null;
    from?: string;
    subject?: string;
    message?: string;
  };

  if (!response.ok) {
    throw new Error(payload.message || `No se pudo obtener el email recibido (${response.status})`);
  }

  return payload;
}

export function parseReclamoIdFromReplyAddress(addresses: string[]): number | null {
  for (const raw of addresses) {
    const email = raw.includes('<') ? raw.match(/<([^>]+)>/)?.[1] ?? raw : raw;
    const match = email.trim().match(/^reclamos\+(\d+)@/i);
    if (match) return Number(match[1]);
  }
  return null;
}

export function parseReclamoIdFromSubject(subject: string): number | null {
  const match = subject.match(/#(\d{1,8})\b/);
  if (!match) return null;
  const id = Number(match[1]);
  return Number.isFinite(id) ? id : null;
}

export function parseSenderName(fromHeader: string): { email: string; name: string } {
  const match = fromHeader.match(/^(.*?)<([^>]+)>$/);
  if (match) {
    return {
      name: match[1].trim().replace(/^"|"$/g, '') || match[2].trim(),
      email: match[2].trim(),
    };
  }
  return { name: fromHeader.trim(), email: fromHeader.trim() };
}

function linkifyText(text: string): string {
  const urlPattern = /https?:\/\/[^\s]+/g;
  let cursor = 0;
  let html = '';

  for (const match of text.matchAll(urlPattern)) {
    const index = match.index ?? 0;
    const url = match[0];
    html += escapeHtml(text.slice(cursor, index));
    html += `<a href="${escapeHtml(url)}" style="color:#0066b3;font-weight:600;text-decoration:underline;text-decoration-color:#b8d8ed;text-underline-offset:3px">${escapeHtml(url)}</a>`;
    cursor = index + url.length;
  }

  return html + escapeHtml(text.slice(cursor));
}

function renderEmailBody(text: string): string {
  return text
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return '<div style="height:12px;line-height:12px">&nbsp;</div>';

      const action = trimmed.match(
        /^(Descargar PDF|Validar emisión):\s+(https?:\/\/\S+)$/i
      );
      if (action) {
        const isPrimary = action[1].toLocaleLowerCase('es-AR').startsWith('descargar');
        return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:4px 0 10px">
          <tr>
            <td style="border-radius:6px;background:${isPrimary ? '#0066b3' : '#ffffff'};border:1px solid ${isPrimary ? '#0066b3' : '#b8c7d3'}">
              <a href="${escapeHtml(action[2])}" style="display:inline-block;padding:12px 18px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1;font-weight:700;color:${isPrimary ? '#ffffff' : '#0066b3'};text-decoration:none">
                ${escapeHtml(action[1])}
              </a>
            </td>
          </tr>
        </table>`;
      }

      if (/^Hola[,!:]?$/i.test(trimmed)) {
        return `<p style="margin:0 0 14px;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.7;color:#30343b">${escapeHtml(trimmed)}</p>`;
      }

      if (/^—\s*/.test(trimmed)) {
        return `<p style="margin:8px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;font-weight:700;color:#3f4b55">${escapeHtml(trimmed)}</p>`;
      }

      return `<p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.7;color:#30343b">${linkifyText(trimmed)}</p>`;
    })
    .join('');
}

// Plantilla transaccional compatible con clientes de correo y alineada con la web UCU.
function bodyToHtml(text: string, subject: string): string {
  const content = renderEmailBody(text);
  const safeSubject = escapeHtml(subject);

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${safeSubject}</title>
</head>
<body style="margin:0;padding:0;background:#f5f8fa;font-family:Arial,Helvetica,sans-serif">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">
    Comunicación institucional de Usuarios y Consumidores Unidos.
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;background:#f5f8fa">
    <tr><td align="center">
      <table role="presentation" width="620" cellpadding="0" cellspacing="0" style="width:100%;max-width:620px;margin:0 auto">
        <tr><td height="32" style="height:32px">&nbsp;</td></tr>
        <tr>
          <td style="font-size:0;line-height:0">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td width="25%" height="5" style="height:5px;background:#0066b3">&nbsp;</td>
                <td width="25%" height="5" style="height:5px;background:#e6007e">&nbsp;</td>
                <td width="25%" height="5" style="height:5px;background:#fdb913">&nbsp;</td>
                <td width="25%" height="5" style="height:5px;background:#8bc53f">&nbsp;</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="background:#0066b3;padding:24px 34px">
            <img src="https://ucu.org.ar/brand/logo-ucu-white.png" width="136" alt="UCU — Usuarios y Consumidores Unidos" style="display:block;width:136px;max-width:100%;height:auto;border:0">
            <p style="margin:12px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;font-weight:600;letter-spacing:.04em;color:#d8ebf8">
              Defensa y protección de las personas consumidoras
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#ffffff;padding:36px 34px 38px;border-left:1px solid #dce3e8;border-right:1px solid #dce3e8">
            <h1 style="margin:0 0 26px;font-family:Arial,Helvetica,sans-serif;font-size:24px;line-height:1.25;font-weight:700;letter-spacing:-.02em;color:#30343b">
              ${safeSubject}
            </h1>
            ${content}
          </td>
        </tr>
        <tr>
          <td style="background:#edf4f8;padding:20px 34px;border:1px solid #dce3e8;border-radius:0 0 8px 8px">
            <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.7;color:#596773">
              <strong style="color:#30343b">Usuarios y Consumidores Unidos</strong><br>
              San Nicolás de los Arroyos, Buenos Aires<br>
              <a href="https://ucu.org.ar" style="color:#0066b3;font-weight:700;text-decoration:none">ucu.org.ar</a>
            </p>
          </td>
        </tr>
        <tr><td height="32" style="height:32px">&nbsp;</td></tr>
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
