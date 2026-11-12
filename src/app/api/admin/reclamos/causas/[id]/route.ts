import { NextRequest, NextResponse } from 'next/server';
import { requireAdminPermission } from '@/lib/admin-session';
import { deleteReclamoCausa, updateReclamoCausa } from '@/lib/reclamos-store';

type RouteContext = { params: Promise<{ id: string }> };

function parseCausaId(raw: string): number | null {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) return null;
  return id;
}

function causaErrorStatus(message: string): number {
  if (
    message.includes('requerida') ||
    message.includes('inválido') ||
    message.includes('Ya existe') ||
    message.includes('demasiado') ||
    message.includes('superar')
  ) {
    return 400;
  }
  if (message.includes('no existe')) return 404;
  return 500;
}

export async function PUT(request: NextRequest, context: RouteContext) {
  if (!requireAdminPermission(request, 'reclamos:write')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const id = parseCausaId((await context.params).id);
  if (!id) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  }

  let body: { descripcion?: unknown; activo?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  try {
    const causa = await updateReclamoCausa(id, {
      descripcion: typeof body.descripcion === 'string' ? body.descripcion : undefined,
      activo: typeof body.activo === 'boolean' ? body.activo : undefined,
    });
    return NextResponse.json({ causa });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : 'No se pudo actualizar la causa';
    return NextResponse.json({ error: message }, { status: causaErrorStatus(message) });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  if (!requireAdminPermission(request, 'reclamos:write')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const id = parseCausaId((await context.params).id);
  if (!id) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  }

  try {
    await deleteReclamoCausa(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : 'No se pudo eliminar la causa';
    return NextResponse.json({ error: message }, { status: causaErrorStatus(message) });
  }
}
