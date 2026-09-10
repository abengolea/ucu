import { NextRequest, NextResponse } from 'next/server';
import { requireAdminPermission } from '@/lib/admin-session';
import { getAssigneeMatchContext } from '@/lib/admin-assignee-identity';
import {
  countAdminReclamosByBandeja,
  countAssignedReclamos,
  listAdminReclamos,
} from '@/lib/reclamos-store';
import type { ReclamoAdminBandeja } from '@/types/reclamos';

const BANDEJAS = new Set<ReclamoAdminBandeja | 'todos'>([
  'recibidos',
  'espera_aceptacion',
  'gestion',
  'archivados',
  'todos',
]);

function normalizeOtrasEmpresas(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || null;
  }
  if (Array.isArray(value)) {
    const trimmed = value.map((item) => String(item).trim()).filter(Boolean).join(', ');
    return trimmed || null;
  }
  return null;
}

function mapReclamo(item: Awaited<ReturnType<typeof listAdminReclamos>>[number]) {
  const empresas = Array.isArray(item.empresas) ? item.empresas : [];
  const denunciante = item.denunciante;
  const nombre = denunciante
    ? `${denunciante.nombre ?? ''} ${denunciante.apellido ?? ''}`.trim()
    : '';

  return {
    id: item.id,
    nombre: nombre || `Reclamo #${item.id}`,
    email: denunciante?.email ?? null,
    provinciaId: denunciante?.provinciaId ?? null,
    ciudadId: denunciante?.ciudadId ?? null,
    ciudadNombre: denunciante?.ciudadNombre ?? null,
    provinciaNombre: denunciante?.provinciaNombre ?? null,
    resumen: item.resumen ?? '',
    hecho: item.hecho ?? '',
    estadoDescripcion: item.estadoDescripcion,
    idGrupoEstado: item.idGrupoEstado,
    adminBandeja: item.adminBandeja,
    responsable: item.responsable,
    asignacionPendiente: item.asignacionPendiente ?? null,
    causasCount: item.causas?.length ?? 0,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    empresaIds: item.empresaIds ?? empresas.map((e) => e.id),
    empresas,
    otrasEmpresas: normalizeOtrasEmpresas(item.otrasEmpresas),
  };
}

function parseOptionalId(value: string | null): number | undefined {
  if (!value) return undefined;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

export async function GET(request: NextRequest) {
  const session = requireAdminPermission(request, 'reclamos:read');
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const bandejaParam = request.nextUrl.searchParams.get('bandeja') ?? 'recibidos';
  const bandeja = BANDEJAS.has(bandejaParam as ReclamoAdminBandeja | 'todos')
    ? (bandejaParam as ReclamoAdminBandeja | 'todos')
    : 'recibidos';
  const assignedOnly = request.nextUrl.searchParams.get('asignado') === 'mi';
  const responsableQuery = (request.nextUrl.searchParams.get('responsable') ?? '').trim();
  const provinciaId = parseOptionalId(request.nextUrl.searchParams.get('provinciaId'));
  const ciudadId = parseOptionalId(request.nextUrl.searchParams.get('ciudadId'));
  const assignedFilterActive = assignedOnly || Boolean(responsableQuery);
  const locationFilterActive = Boolean(provinciaId) || Boolean(ciudadId);

  try {
    const assigneeContext = assignedOnly
      ? await getAssigneeMatchContext(session.email)
      : null;

    const [reclamos, counts, assignedCount] = await Promise.all([
      listAdminReclamos({
        bandeja,
        assignedToEmails: assigneeContext?.emails,
        assigneeName: assigneeContext?.name ?? session.name,
        responsableQuery: responsableQuery || undefined,
        provinciaId,
        ciudadId,
      }),
      assignedFilterActive || locationFilterActive
        ? Promise.resolve(null)
        : countAdminReclamosByBandeja(),
      countAssignedReclamos(session.email, session.name),
    ]);

    return NextResponse.json({
      bandeja,
      assignedOnly,
      responsable: responsableQuery || null,
      provinciaId: provinciaId ?? null,
      ciudadId: ciudadId ?? null,
      counts: counts ?? undefined,
      assignedCount,
      reclamos: reclamos.map(mapReclamo),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Firebase no configurado' }, { status: 500 });
  }
}
