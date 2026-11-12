import { NextRequest, NextResponse } from 'next/server';
import { requireAdminPermission } from '@/lib/admin-session';
import { createReclamoCausa, getReclamoCausasFromFirestore } from '@/lib/reclamos-store';

function causaErrorStatus(message: string): number {
  if (
    message.includes('requerida') ||
    message.includes('inválido') ||
    message.includes('Ya existe') ||
    message.includes('superar')
  ) {
    return 400;
  }
  if (message.includes('no existe')) return 404;
  return 500;
}

export async function GET(request: NextRequest) {
  if (!requireAdminPermission(request, 'reclamos:read')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const causas = await getReclamoCausasFromFirestore();
    return NextResponse.json({ causas });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'No se pudieron cargar las causas' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!requireAdminPermission(request, 'reclamos:write')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  let body: { descripcion?: unknown; activo?: unknown; rubro?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  try {
    const causa = await createReclamoCausa({
      descripcion: typeof body.descripcion === 'string' ? body.descripcion : '',
      activo: body.activo !== false,
      rubro: typeof body.rubro === 'string' ? body.rubro : '',
    });
    return NextResponse.json({ causa }, { status: 201 });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : 'No se pudo crear la causa';
    return NextResponse.json({ error: message }, { status: causaErrorStatus(message) });
  }
}
