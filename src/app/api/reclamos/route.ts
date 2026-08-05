import { NextRequest, NextResponse } from 'next/server';
import { createReclamoFromPublicForm } from '@/lib/reclamos-store';
import { sendEmail } from '@/lib/email';
import type { ReclamoFormPayload } from '@/types/reclamos';

function parsePayload(body: unknown): ReclamoFormPayload | null {
  if (!body || typeof body !== 'object') return null;
  const data = body as Record<string, unknown>;

  const readString = (key: string) => String(data[key] ?? '').trim();
  const readNumber = (key: string) => {
    const value = Number(data[key]);
    return Number.isFinite(value) ? value : 0;
  };
  const readNumberArray = (key: string) =>
    Array.isArray(data[key])
      ? data[key].map((value) => Number(value)).filter((value) => Number.isFinite(value) && value > 0)
      : [];

  return {
    nombre: readString('nombre'),
    apellido: readString('apellido'),
    tipoDocumento: readString('tipoDocumento'),
    numeroDocumento: readString('numeroDocumento'),
    calle: readString('calle') || undefined,
    numero: readString('numero') || undefined,
    piso: readString('piso') || undefined,
    depto: readString('depto') || undefined,
    provinciaId: readNumber('provinciaId'),
    ciudadId: readNumber('ciudadId'),
    telefono: readString('telefono'),
    email: readString('email'),
    resumen: readString('resumen'),
    hecho: readString('hecho'),
    otrasEmpresas: readString('otrasEmpresas') || undefined,
    empresaIds: readNumberArray('empresaIds'),
  };
}

function validatePayload(payload: ReclamoFormPayload): string | null {
  if (!payload.nombre) return 'El nombre es obligatorio';
  if (!payload.apellido) return 'El apellido es obligatorio';
  if (!payload.tipoDocumento) return 'El tipo de documento es obligatorio';
  if (!payload.numeroDocumento) return 'El documento es obligatorio';
  if (!payload.provinciaId) return 'Seleccioná una provincia';
  if (!payload.ciudadId) return 'Seleccioná una ciudad';
  if (!payload.telefono) return 'El teléfono es obligatorio';
  if (!payload.email) return 'El email es obligatorio';
  if (!payload.resumen || payload.resumen.length > 150) {
    return 'El resumen es obligatorio (máx. 150 caracteres)';
  }
  if (!payload.hecho || payload.hecho.length > 1500) {
    return 'Los hechos son obligatorios (máx. 1500 caracteres)';
  }
  if (!payload.empresaIds.length && !payload.otrasEmpresas) {
    return 'Seleccioná al menos una empresa o indicá otras empresas';
  }
  if (payload.empresaIds.length > 5) {
    return 'Podés seleccionar hasta 5 empresas';
  }
  return null;
}

export async function POST(request: NextRequest) {
  const payload = parsePayload(await request.json());
  if (!payload) {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
  }

  const validationError = validatePayload(payload);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  try {
    const reclamo = await createReclamoFromPublicForm(payload);

    // Email de confirmación — no bloqueante (no falla el registro si el email falla)
    sendEmail({
      to: payload.email,
      subject: `UCU — Recibimos tu reclamo #${reclamo.id}`,
      body: buildConfirmacionBody(reclamo.id, payload),
    }).catch((err) => console.error('[email confirmacion]', err));

    return NextResponse.json({
      ok: true,
      id: reclamo.id,
      message: 'Reclamo registrado correctamente',
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'No se pudo registrar el reclamo' }, { status: 500 });
  }
}

function buildConfirmacionBody(id: number, payload: ReclamoFormPayload): string {
  const siteUrl = process.env.RECLAMOS_SITE_URL || 'https://consumidoresprotegidos.com.ar';
  return `Estimado/a ${payload.nombre} ${payload.apellido},

Hemos recibido correctamente su reclamo ante UCU — Usuarios y Consumidores Unidos.

Número de reclamo: #${id}
Resumen: ${payload.resumen}

Su denuncia llegó a UCU y quedó registrada. Nuestro equipo la revisará; si corresponde, nos pondremos en contacto con usted por este medio.

Ante cualquier consulta puede comunicarse con nosotros respondiendo este email o llamando al (0336) 442-XXXX.

Muchas gracias por confiar en UCU.

UCU — Usuarios y Consumidores Unidos
San Nicolás de los Arroyos, Buenos Aires
${siteUrl}`;
}
