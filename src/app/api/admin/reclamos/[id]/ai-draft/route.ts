import { NextRequest, NextResponse } from 'next/server';
import { generateEmailDraftForReclamo } from '@/lib/gemini';
import {
  reclamoWriteForbiddenResponse,
  requireReclamoWriteAccess,
} from '@/lib/reclamos-access';
import { findSimilarReclamoComunicaciones } from '@/lib/reclamos-similar';
import { requireAdminPermission } from '@/lib/admin-session';

export async function POST(
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

  const { reclamo } = access;

  const body = await request.json();
  const plantilla = typeof body?.plantilla === 'string' ? body.plantilla : 'Actualización del caso';
  const intencion = typeof body?.intencion === 'string' ? body.intencion.trim() : '';
  const usarCasosSimilares = body?.usarCasosSimilares !== false;

  const d = reclamo.denunciante;
  const nombreConsumidor = `${d.nombre} ${d.apellido}`;
  const empresas = reclamo.empresas.map((e) => e.nombre).join(', ') || reclamo.otrasEmpresas || '(sin empresa)';

  try {
    const similares = usarCasosSimilares
      ? await findSimilarReclamoComunicaciones(reclamo, 3)
      : [];

    const draft = await generateEmailDraftForReclamo({
      reclamoId,
      nombreConsumidor,
      estadoActual: reclamo.estadoDescripcion ?? 'Consulta',
      resumen: reclamo.resumen,
      hecho: reclamo.hecho,
      empresas,
      plantilla,
      intencion: intencion || undefined,
      ejemplosSimilares: similares.map((item) => ({
        reclamoId: item.reclamoId,
        resumen: item.resumen,
        empresas: item.empresas,
        estado: item.estadoDescripcion,
        subject: item.comunicacion.subject,
        body: item.comunicacion.body,
      })),
    });

    return NextResponse.json({
      ok: true,
      ...draft,
      casosSimilaresUsados: similares.length,
    });
  } catch (error) {
    console.error('[ai-draft]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al generar borrador' },
      { status: 500 }
    );
  }
}
