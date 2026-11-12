import { NextRequest, NextResponse } from 'next/server';
import { requireAdminPermission } from '@/lib/admin-session';
import { createReclamoRubro, listReclamoRubrosForAdmin } from '@/lib/reclamos-store';

function rubroErrorStatus(message: string): number {
  if (
    message.includes('requerido') ||
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
    const rubros = await listReclamoRubrosForAdmin();
    return NextResponse.json({ rubros });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'No se pudieron cargar los rubros' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!requireAdminPermission(request, 'reclamos:write')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  let body: { descripcion?: unknown; activo?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  try {
    const rubro = await createReclamoRubro({
      descripcion: typeof body.descripcion === 'string' ? body.descripcion : '',
      activo: body.activo !== false,
    });
    return NextResponse.json({ rubro }, { status: 201 });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : 'No se pudo crear el rubro';
    return NextResponse.json({ error: message }, { status: rubroErrorStatus(message) });
  }
}
