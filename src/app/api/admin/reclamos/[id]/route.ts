import { NextRequest, NextResponse } from 'next/server';
import { listReclamosDelegados } from '@/lib/admin-users-store';
import { requireAdminPermission } from '@/lib/admin-session';
import {
  addReclamoComentario,
  getReclamoByIdFromFirestore,
  getReclamoEstadosFromFirestore,
  getReclamoGruposEstadosFromFirestore,
  iniciarGestionReclamo,
  reasignarReclamo,
  updateReclamoDatos,
  updateReclamoEstado,
} from '@/lib/reclamos-store';
import { computeAdminBandeja } from '@/lib/reclamos-admin';
import {
  buildReclamoReplyToAddress,
  isReclamosInboundConfigured,
} from '@/lib/reclamos-email-thread';
import {
  canWriteReclamo,
  reclamoWriteForbiddenResponse,
  requireReclamoWriteAccess,
} from '@/lib/reclamos-access';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = requireAdminPermission(request, 'reclamos:read');
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { id } = await context.params;
  const reclamoId = Number(id);
  if (!Number.isFinite(reclamoId)) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  }

  try {
    const [reclamo, estados, grupos] = await Promise.all([
      getReclamoByIdFromFirestore(reclamoId),
      getReclamoEstadosFromFirestore(),
      getReclamoGruposEstadosFromFirestore(),
    ]);
    if (!reclamo) {
      return NextResponse.json({ error: 'Reclamo no encontrado' }, { status: 404 });
    }

    const canWrite = await canWriteReclamo(session, reclamo);
    const delegados = canWrite ? await listReclamosDelegados() : [];

    return NextResponse.json({
      reclamo: {
        ...reclamo,
        adminBandeja: reclamo.adminBandeja ?? computeAdminBandeja(reclamo),
      },
      estados,
      grupos,
      canWrite,
      delegados,
      emailThread: {
        inboundConfigured: isReclamosInboundConfigured(),
        replyTo: buildReclamoReplyToAddress(reclamoId),
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Error al cargar reclamo' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const reclamoId = Number(id);
  if (!Number.isFinite(reclamoId)) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  }

  const access = await requireReclamoWriteAccess(request, reclamoId);
  if (!access) {
    const session = requireAdminPermission(request, 'reclamos:write');
    if (session) return reclamoWriteForbiddenResponse();
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { session } = access;
  const body = await request.json();
  const operator = { email: session.email, name: session.name };

  try {
    if (body?.iniciarGestion === true) {
      const estados = await getReclamoEstadosFromFirestore();
      const reclamo = await iniciarGestionReclamo(reclamoId, operator, estados);
      return NextResponse.json({
        ok: true,
        reclamo: {
          ...reclamo,
          adminBandeja: reclamo.adminBandeja ?? computeAdminBandeja(reclamo),
        },
      });
    }

    if (typeof body?.comentario === 'string' && body.comentario.trim()) {
      await addReclamoComentario(reclamoId, body.comentario, operator);
      return NextResponse.json({ ok: true });
    }

    if (typeof body?.reasignarEmail === 'string' && body.reasignarEmail.trim()) {
      const email = body.reasignarEmail.trim().toLowerCase();
      const delegados = await listReclamosDelegados();
      const assignee = delegados.find((item) => item.email === email);
      if (!assignee) {
        return NextResponse.json({ error: 'Delegado no encontrado' }, { status: 400 });
      }
      const reclamo = await reasignarReclamo(reclamoId, assignee, operator);
      return NextResponse.json({
        ok: true,
        reclamo: {
          ...reclamo,
          adminBandeja: reclamo.adminBandeja ?? computeAdminBandeja(reclamo),
        },
      });
    }

    if (body?.datos && typeof body.datos === 'object') {
      try {
        const reclamo = await updateReclamoDatos(reclamoId, body.datos, operator);
        return NextResponse.json({
          ok: true,
          reclamo: {
            ...reclamo,
            adminBandeja: reclamo.adminBandeja ?? computeAdminBandeja(reclamo),
          },
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Datos inválidos';
        return NextResponse.json({ error: message }, { status: 400 });
      }
    }

    const idCasoEstado = Number(body?.idCasoEstado);
    if (!Number.isFinite(idCasoEstado)) {
      return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 });
    }

    const estados = await getReclamoEstadosFromFirestore();
    const estado = estados.find((item) => item.id === idCasoEstado);
    if (!estado) {
      return NextResponse.json({ error: 'Estado no encontrado' }, { status: 400 });
    }

    await updateReclamoEstado(
      reclamoId,
      estado.id,
      estado.descripcion.trim(),
      estado.idGrupoEstado,
      operator,
      typeof body?.nota === 'string' ? body.nota.trim() : undefined
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'No se pudo actualizar el reclamo' }, { status: 500 });
  }
}
