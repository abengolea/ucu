import { NextRequest, NextResponse } from 'next/server';
import { requireAdminPermission } from '@/lib/admin-session';
import { getGeminiApiKey, parseReclamoSearchInstruction } from '@/lib/gemini';
import {
  getSearchIndexMeta,
  mergeParsedFilters,
  searchReclamosIndex,
} from '@/lib/reclamos-search-index';
import type { ReclamoSearchFilters } from '@/types/reclamos-search';

function readManualFilters(body: Record<string, unknown>): Partial<ReclamoSearchFilters> {
  const manual: Partial<ReclamoSearchFilters> = {};

  if (typeof body.empresaId === 'number' && body.empresaId > 0) {
    manual.empresaId = body.empresaId;
  }
  if (typeof body.empresaQuery === 'string' && body.empresaQuery.trim()) {
    manual.empresaQuery = body.empresaQuery.trim();
  }
  if (typeof body.dateFrom === 'string' && body.dateFrom.trim()) {
    manual.dateFrom = body.dateFrom.trim();
  }
  if (typeof body.dateTo === 'string' && body.dateTo.trim()) {
    manual.dateTo = body.dateTo.trim();
  }
  if (body.idGrupoEstado === 3 || body.idGrupoEstado === null) {
    manual.idGrupoEstado = body.idGrupoEstado === 3 ? 3 : undefined;
  }

  return manual;
}

export async function GET(request: NextRequest) {
  if (!requireAdminPermission(request, 'reclamos:read')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const meta = await getSearchIndexMeta();
    return NextResponse.json({
      indexedAt: meta?.indexedAt ?? null,
      count: meta?.count ?? 0,
      geminiConfigured: Boolean(getGeminiApiKey()),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'No se pudo leer el índice' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!requireAdminPermission(request, 'reclamos:read')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const body = (await request.json()) as Record<string, unknown>;
  const instruction = typeof body.instruction === 'string' ? body.instruction.trim() : '';
  const manual = readManualFilters(body);

  if (!instruction && !manual.empresaId && !manual.empresaQuery) {
    return NextResponse.json(
      { error: 'Escribí una instrucción o seleccioná una empresa' },
      { status: 400 }
    );
  }

  try {
    const meta = await getSearchIndexMeta();
    if (!meta?.count) {
      return NextResponse.json(
        {
          error:
            'El índice de búsqueda está vacío. Ejecutá npm run build:reclamos-index en el servidor.',
        },
        { status: 503 }
      );
    }

    let filters: ReclamoSearchFilters = { ...manual };
    let interpretacion = 'Búsqueda con filtros manuales';

    if (instruction) {
      if (!getGeminiApiKey()) {
        return NextResponse.json(
          {
            error:
              'La instrucción con IA no está disponible: falta el secreto GEMINI_API_KEY en el servidor. Podés buscar solo con el filtro de empresa.',
          },
          { status: 503 }
        );
      }
      const parsed = await parseReclamoSearchInstruction(instruction);
      interpretacion = parsed.interpretacion;
      filters = await mergeParsedFilters(parsed.filters, manual);
    } else {
      filters = await mergeParsedFilters({}, manual);
    }

    const result = await searchReclamosIndex(filters, interpretacion);

    return NextResponse.json({
      interpretacion,
      hits: result.hits.slice(0, 500),
      stats: result.stats,
      filtersApplied: result.filtersApplied,
      truncated: result.hits.length > 500,
    });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : 'Error en la búsqueda';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
