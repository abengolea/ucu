import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { Resend } from 'resend';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.join(root, '.env.local') });

const to = process.argv[2] || 'abengolea1@gmail.com';
const key = process.env.RESEND_API_KEY?.trim();
const from =
  process.env.RESEND_FROM_EMAIL?.trim() ||
  'UCU Usuarios Protegidos <reclamos@ucu.org.ar>';
const replyTo = process.env.RESEND_REPLY_TO?.trim() || undefined;

if (!key || key.startsWith('re_REEMPLAZAR')) {
  console.error('RESEND_API_KEY no configurada en .env.local');
  process.exit(1);
}

const stamp = new Date().toISOString();
const resend = new Resend(key);
const body = `Hola,

Este es un mail de prueba del sistema UCU (Usuarios Protegidos).

Enviado: ${stamp}

Si lo recibiste, Resend está funcionando con esta API key y este From.

Saludos,
Equipo UCU`;

console.log('Enviando prueba…');
console.log('  Desde:', from);
console.log('  Hacia:', to);
if (replyTo) console.log('  Reply-To:', replyTo);
console.log('  Key:', `${key.slice(0, 5)}… (${key.length} chars)`);

const { data, error } = await resend.emails.send({
  from,
  to,
  subject: `UCU — Prueba de envío ${stamp.slice(11, 19)} UTC`,
  text: body,
  html: `<p>${body.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>')}</p>`,
  ...(replyTo ? { replyTo } : {}),
});

if (error) {
  console.error('Resend rechazó el envío:', error.message || error);
  process.exit(1);
}

const id = data?.id;
if (!id) {
  console.error('Resend no devolvió ID de mensaje');
  process.exit(1);
}

console.log('Aceptado por Resend. ID:', id);

let last = null;
for (let i = 0; i < 6; i += 1) {
  await new Promise((resolve) => setTimeout(resolve, i === 0 ? 1500 : 2500));
  const retrieved = await resend.emails.get(id);
  if (retrieved.error) {
    console.error('No se pudo consultar el estado:', retrieved.error.message || retrieved.error);
    break;
  }
  last = retrieved.data;
  const event = last?.last_event || '(sin evento)';
  console.log(`  [${i + 1}] last_event=${event}`);
  if (['delivered', 'bounced', 'complained', 'failed'].includes(event)) break;
}

if (last) {
  console.log('');
  console.log('Estado final');
  console.log('  last_event:', last.last_event);
  console.log('  created_at:', last.created_at);
  console.log('  subject:', last.subject);
  console.log('  to:', Array.isArray(last.to) ? last.to.join(', ') : last.to);
}

const event = last?.last_event;
if (event === 'delivered') {
  console.log('\nResend marca el mail como entregado. Revisá inbox y spam de Gmail.');
} else if (event === 'bounced' || event === 'failed' || event === 'complained') {
  console.log('\nResend no lo entregó. Revisá dominio verificado (ucu.org.ar) y el From.');
} else if (event === 'sent' || event === 'delivery_delayed') {
  console.log('\nResend lo aceptó pero todavía no confirma entrega. Esperá 1-2 minutos y revisá spam.');
} else {
  console.log('\nNo hay confirmación de entrega todavía. El ID sirve para buscarlo en resend.com/emails.');
}
