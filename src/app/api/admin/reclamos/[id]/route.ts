import { NextRequest, NextResponse } from 'next/server';
import { listReclamosDelegados } from '@/lib/admin-users-store';
import { requireAdminPermission } from '@/lib/admin-session';
import {
  aceptarAsignacionReclamo,
  addReclamoComentario,
  archivarReclamo,
  cancelarAsignacionPendiente,
  getReclamoByIdFromFirestore,
  getReclamoEstadosFromFirestore,
  getReclamoGruposEstadosFromFirestore,
  iniciarGestionReclamo,
  reasignarReclamo,
  rechazarAsignacionReclamo,
  registrarSinGestionReclamo,
  updateReclamoDatos,
  updateReclamoEstado,
} from '@/lib/reclamos-store';
import { computeAdminBandeja } from '@/lib/reclamos-admin';
import {
  canDecideAsignacion,
  canWriteReclamo,
  reclamoWriteForbiddenResponse,
  requireReclamoWriteAccess,
  requireReclamoWriteOrAsignacionAccess,
} from '@/lib/reclamos-access';

function withBandeja(reclamo: NonNullable<Awaited<ReturnType<typeof getReclamoByIdFromFirestore>>>) {
  return {
    ...reclamo,
    adminBandeja: reclamo.adminBandeja ?? computeAdminBandeja(reclamo),
  };
}

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

    const [canWrite, canDecide] = await Promise.all([
      canWriteReclamo(session, reclamo),
      canDecideAsignacion(session, reclamo),
    ]);
    const delegados = canWrite ? await listReclamosDelegados() : [];

    return NextResponse.json({
      reclamo: withBandeja(reclamo),
      estados,
      grupos,
      canWrite,
      canDecideAsignacion: canDecide,
      delegados,
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

  const body = await request.json();
  const isAsignacionDecision =
    body?.aceptarAsignacion === true || body?.rechazarAsignacion === true;

  const access = isAsignacionDecision
    ? await requireReclamoWriteOrAsignacionAccess(request, reclamoId)
    : await requireReclamoWriteAccess(request, reclamoId);

  if (!access) {
    const session = requireAdminPermission(request, 'reclamos:write');
    if (session) return reclamoWriteForbiddenResponse();
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { session } = access;
  const operator = { email: session.email, name: session.name };

  try {
    if (body?.aceptarAsignacion === true) {
      if (!(await canDecideAsignacion(session, access.reclamo))) {
        return NextResponse.json(
          { error: 'Solo el delegado propuesto puede aceptar esta asignación' },
          { status: 403 }
        );
      }
      const estados = await getReclamoEstadosFromFirestore();
      const { reclamo, emailError } = await aceptarAsignacionReclamo(
        reclamoId,
        operator,
        estados
      );
      return NextResponse.json({
        ok: true,
        reclamo: withBandeja(reclamo),
        emailError: emailError ?? null,
      });
    }

    if (body?.rechazarAsignacion === true) {
      if (!(await canDecideAsignacion(session, access.reclamo))) {
        return NextResponse.json(
          { error: 'Solo el delegado propuesto puede rechazar esta asignación' },
          { status: 403 }
        );
      }
      const motivo =
        typeof body?.motivo === 'string' && body.motivo.trim()
          ? body.motivo.trim()
          : undefined;
      const { reclamo, emailError } = await rechazarAsignacionReclamo(
        reclamoId,
        operator,
        motivo
      );
      return NextResponse.json({
        ok: true,
        reclamo: withBandeja(reclamo),
        emailError: emailError ?? null,
      });
    }

    if (body?.cancelarAsignacion === true) {
      const reclamo = await cancelarAsignacionPendiente(reclamoId, operator);
      return NextResponse.json({ ok: true, reclamo: withBandeja(reclamo) });
    }

    if (body?.iniciarGestion === true) {
      const estados = await getReclamoEstadosFromFirestore();
      const reclamo = await iniciarGestionReclamo(reclamoId, operator, estados);
      return NextResponse.json({ ok: true, reclamo: withBandeja(reclamo) });
    }

    if (body?.archivar === true) {
      const motivo =
        typeof body?.motivo === 'string' && body.motivo.trim()
          ? body.motivo.trim()
          : 'Reclamo archivado';
      const reclamo = await archivarReclamo(reclamoId, operator, motivo);
      return NextResponse.json({ ok: true, reclamo: withBandeja(reclamo) });
    }

    if (body?.registrarSinGestion === true) {
      const motivo =
        typeof body?.motivo === 'string' && body.motivo.trim()
          ? body.motivo.trim()
          : undefined;
      const subject =
        typeof body?.subject === 'string' && body.subject.trim()
          ? body.subject.trim()
          : undefined;
      const mailBody =
        typeof body?.body === 'string' && body.body.trim() ? body.body.trim() : undefined;
      if ((subject && !mailBody) || (!subject && mailBody)) {
        return NextResponse.json(
          { error: 'Para enviar un borrador propio hacen falta asunto y cuerpo' },
          { status: 400 }
        );
      }
      try {
        const { reclamo, emailedTo } = await registrarSinGestionReclamo(reclamoId, operator, {
          motivo,
          subject,
          body: mailBody,
          viaIA: body?.viaIA === true,
        });
        return NextResponse.json({
          ok: true,
          reclamo: withBandeja(reclamo),
          emailedTo,
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'No se pudo registrar sin gestión';
        return NextResponse.json({ error: message }, { status: 400 });
      }
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
      const estados = await getReclamoEstadosFromFirestore();
      try {
        const { reclamo, emailError } = await reasignarReclamo(
          reclamoId,
          assignee,
          operator,
          estados
        );
        return NextResponse.json({
          ok: true,
          reclamo: withBandeja(reclamo),
          emailError: emailError ?? null,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'No se pudo asignar';
        return NextResponse.json({ error: message }, { status: 400 });
      }
    }

    if (body?.datos && typeof body.datos === 'object') {
      try {
        const reclamo = await updateReclamoDatos(reclamoId, body.datos, operator);
        return NextResponse.json({ ok: true, reclamo: withBandeja(reclamo) });
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
    const message = error instanceof Error ? error.message : 'No se pudo actualizar el reclamo';
    if (
      message.includes('asignación') ||
      message.includes('delegado') ||
      message.includes('pendiente')
    ) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return NextResponse.json({ error: 'No se pudo actualizar el reclamo' }, { status: 500 });
  }
}
