import { NextRequest, NextResponse } from 'next/server';
import { requireAdminPermission } from '@/lib/admin-session';
import { getGeminiApiKey, parseFalloSearchInstruction } from '@/lib/gemini';
import {
  getFallosSearchIndexMeta,
  mergeParsedFalloFilters,
  searchFallosIndex,
} from '@/lib/fallos-search-index';
import type { FalloSearchFilters } from '@/types/fallos-search';

function readManualFilters(body: Record<string, unknown>): Partial<FalloSearchFilters> {
  const manual: Partial<FalloSearchFilters> = {};

  if (typeof body.empresaId === 'number' && body.empresaId > 0) {
    manual.empresaId = body.empresaId;
  }
  if (typeof body.empresaQuery === 'string' && body.empresaQuery.trim()) {
    manual.empresaQuery = body.empresaQuery.trim();
  }
  if (typeof body.actorQuery === 'string' && body.actorQuery.trim()) {
    manual.actorQuery = body.actorQuery.trim();
  }
  if (typeof body.dateFrom === 'string' && body.dateFrom.trim()) {
    manual.dateFrom = body.dateFrom.trim();
  }
  if (typeof body.dateTo === 'string' && body.dateTo.trim()) {
    manual.dateTo = body.dateTo.trim();
  }
  if (body.status === 'publish' || body.status === 'draft' || body.status === 'all') {
    manual.status = body.status;
  }

  return manual;
}

function mapParsedFilters(
  parsed: Awaited<ReturnType<typeof parseFalloSearchInstruction>>['filters']
): FalloSearchFilters {
  return {
    empresaQuery: parsed.empresaQuery ?? undefined,
    actorQuery: parsed.actorQuery ?? undefined,
    keywords: parsed.keywords?.filter(Boolean),
    dateFrom: parsed.dateFrom ?? undefined,
    dateTo: parsed.dateTo ?? undefined,
    rubroKeywords: parsed.rubroKeywords?.filter(Boolean),
    causaKeywords: parsed.causaKeywords?.filter(Boolean),
    etiquetaKeywords: parsed.etiquetaKeywords?.filter(Boolean),
    status: parsed.status === 'all' ? 'all' : parsed.status === 'draft' ? 'draft' : 'publish',
  };
}

export async function GET(request: NextRequest) {
  if (!requireAdminPermission(request, 'fallos:read')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const meta = await getFallosSearchIndexMeta();
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
  if (!requireAdminPermission(request, 'fallos:read')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const body = (await request.json()) as Record<string, unknown>;
  const instruction = typeof body.instruction === 'string' ? body.instruction.trim() : '';
  const manual = readManualFilters(body);

  if (!instruction && !manual.empresaId && !manual.empresaQuery && !manual.actorQuery) {
    return NextResponse.json(
      { error: 'Escribí una instrucción o indicá empresa o actor' },
      { status: 400 }
    );
  }

  try {
    const meta = await getFallosSearchIndexMeta();
    if (!meta?.count) {
      return NextResponse.json(
        {
          error:
            'El índice de búsqueda está vacío. Ejecutá npm run build:fallos-index en el servidor.',
        },
        { status: 503 }
      );
    }

    let filters: FalloSearchFilters = { status: 'publish', ...manual };
    let interpretacion = 'Búsqueda con filtros manuales';

    if (instruction) {
      if (!getGeminiApiKey()) {
        return NextResponse.json(
          {
            error:
              'La instrucción con IA no está disponible: falta el secreto GEMINI_API_KEY en el servidor. Podés buscar con los filtros de empresa o actor.',
          },
          { status: 503 }
        );
      }
      const parsed = await parseFalloSearchInstruction(instruction);
      interpretacion = parsed.interpretacion;
      filters = await mergeParsedFalloFilters(mapParsedFilters(parsed.filters), manual);
    } else {
      filters = await mergeParsedFalloFilters({}, manual);
    }

    const result = await searchFallosIndex(filters, interpretacion);

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
