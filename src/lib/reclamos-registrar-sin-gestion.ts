import 'server-only';

import type { StoredReclamoDocument } from '@/types/reclamos';

const DEFENSA_CONSUMIDOR_URL =
  'https://www.argentina.gob.ar/servicio/iniciar-un-reclamo-ante-defensa-del-consumidor';

export function buildRegistrarSinGestionEmail(input: {
  reclamo: Pick<StoredReclamoDocument, 'id' | 'resumen' | 'denunciante'>;
  motivoPublico?: string;
}): { subject: string; body: string } {
  const { reclamo, motivoPublico } = input;
  const nombre = `${reclamo.denunciante.nombre} ${reclamo.denunciante.apellido}`.trim() || 'Estimado/a';
  const ciudad = reclamo.denunciante.ciudadNombre?.trim();
  const provincia = reclamo.denunciante.provinciaNombre?.trim();
  const lugar = [ciudad, provincia].filter(Boolean).join(', ');

  const razones = motivoPublico?.trim()
    ? `Luego de evaluarlo, te comentamos que ${softenMotivo(motivoPublico.trim())}`
    : 'Luego de evaluarlo, por el alcance de nuestra intervención en este momento';

  const defensaLine = lugar
    ? `Te recomendamos iniciar el reclamo ante Defensa del Consumidor de tu ciudad (${lugar}), que puede intervenir de forma directa.`
    : 'Te recomendamos iniciar el reclamo ante Defensa del Consumidor de tu ciudad, que puede intervenir de forma directa.';

  const subject = `UCU — Recibimos tu reclamo #${reclamo.id}`;
  const body = `Estimado/a ${nombre},

Recibimos tu reclamo ante UCU — Usuarios y Consumidores Unidos (N.º ${reclamo.id}) y quedó registrado en nuestros sistemas${reclamo.resumen ? `: "${reclamo.resumen}"` : ''}.

${razones}, no vamos a poder gestionar tu caso de forma individual. Eso no significa que tu planteo no sea válido: tu denuncia queda incorporada y nos sirve para conocer la problemática.

${defensaLine}

Podés consultar cómo iniciar el trámite aquí:
${DEFENSA_CONSUMIDOR_URL}

Gracias por confiar en UCU.

— UCU Usuarios Protegidos`;

  return { subject, body };
}

/** Evita que un motivo interno suene como un golpe en el mail. */
function softenMotivo(motivo: string): string {
  const cleaned = motivo.replace(/\s+/g, ' ').trim();
  if (!cleaned) return 'por razones operativas';
  // Si ya viene con mayúscula inicial, lo dejamos fluir en la frase.
  return cleaned.charAt(0).toLowerCase() + cleaned.slice(1);
}
