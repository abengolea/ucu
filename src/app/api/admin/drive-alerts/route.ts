import { NextRequest, NextResponse } from 'next/server';
import { requireAdminPermission } from '@/lib/admin-session';
import {
  getDrivePollingState,
  listDriveChangeAlerts,
  updateDriveChangeAlertStatus,
} from '@/lib/drive-watch-store';

export async function GET(request: NextRequest) {
  const session = requireAdminPermission(request, 'reclamos:read');
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const statusParam = request.nextUrl.searchParams.get('status') || 'open';
  const status =
    statusParam === 'all' || statusParam === 'closed' || statusParam === 'open'
      ? statusParam
      : 'open';

  const [alerts, polling] = await Promise.all([
    listDriveChangeAlerts({ status, limit: 300 }),
    getDrivePollingState(),
  ]);

  return NextResponse.json({ alerts, polling });
}

export async function PATCH(request: NextRequest) {
  const session = requireAdminPermission(request, 'reclamos:write');
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const body = (await request.json()) as { id?: string; status?: string };
  if (!body.id || (body.status !== 'ignored' && body.status !== 'reviewed')) {
    return NextResponse.json({ error: 'id y status (ignored|reviewed) requeridos' }, { status: 400 });
  }

  const updated = await updateDriveChangeAlertStatus(body.id, body.status, {
    email: session.email,
    name: session.name,
  });

  if (!updated) {
    return NextResponse.json({ error: 'Aviso no encontrado' }, { status: 404 });
  }

  return NextResponse.json({ alert: updated });
}
