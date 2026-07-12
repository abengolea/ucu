import { NextRequest, NextResponse } from 'next/server';
import { getGeminiApiKey } from '@/lib/gemini';
import {
  reclamoWriteForbiddenResponse,
  requireReclamoWriteAccess,
} from '@/lib/reclamos-access';
import { findSimilarReclamoComunicaciones } from '@/lib/reclamos-similar';
import { requireAdminPermission } from '@/lib/admin-session';

export async function GET(
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

  try {
    const sugerencias = await findSimilarReclamoComunicaciones(access.reclamo);
    return NextResponse.json({
      sugerencias,
      geminiConfigured: Boolean(getGeminiApiKey()),
    });
  } catch (error) {
    console.error('[sugerencias]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'No se pudieron cargar sugerencias' },
      { status: 500 }
    );
  }
}
