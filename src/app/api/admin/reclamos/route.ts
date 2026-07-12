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
  'gestion',
  'archivados',
  'todos',
]);

function mapReclamo(item: Awaited<ReturnType<typeof listAdminReclamos>>[number]) {
  return {
    id: item.id,
    nombre: `${item.denunciante.nombre} ${item.denunciante.apellido}`.trim(),
    resumen: item.resumen,
    hecho: item.hecho,
    estadoDescripcion: item.estadoDescripcion,
    idGrupoEstado: item.idGrupoEstado,
    adminBandeja: item.adminBandeja,
    responsable: item.responsable,
    causasCount: item.causas?.length ?? 0,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    empresas: item.empresas,
    otrasEmpresas: item.otrasEmpresas,
  };
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

  try {
    const assigneeContext = assignedOnly
      ? await getAssigneeMatchContext(session.email)
      : null;

    const [reclamos, counts, assignedCount] = await Promise.all([
      listAdminReclamos({
        bandeja,
        assignedToEmails: assigneeContext?.emails,
        assigneeName: assigneeContext?.name ?? session.name,
      }),
      assignedOnly ? Promise.resolve(null) : countAdminReclamosByBandeja(),
      countAssignedReclamos(session.email, session.name),
    ]);

    return NextResponse.json({
      bandeja,
      assignedOnly,
      counts: counts ?? undefined,
      assignedCount,
      reclamos: reclamos.map(mapReclamo),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Firebase no configurado' }, { status: 500 });
  }
}
