import { NextRequest, NextResponse } from 'next/server';
import { requireMemberApi } from '@/lib/member-session';
import {
  getCiudades,
  getDivisas,
  getEmpresas,
  getEtiquetas,
  getJuzgados,
  getProvincias,
  getReclamos,
  getRubros,
  getTiposJuicio,
} from '@/lib/observatorio';

const ALLOWED = new Set([
  'rubros',
  'provincias',
  'ciudades',
  'juzgados',
  'tipojuicio',
  'reclamos',
  'etiquetas',
  'empresas',
  'divisas',
]);

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ resource: string }> }
) {
  const access = await requireMemberApi(request);
  if (access instanceof NextResponse) return access;

  const { resource } = await context.params;

  if (!ALLOWED.has(resource)) {
    return NextResponse.json({ error: 'Recurso no permitido' }, { status: 404 });
  }

  try {
    const idProvincia = request.nextUrl.searchParams.get('idProvincia');
    const idCiudad = request.nextUrl.searchParams.get('idCiudad');

    let data: unknown;

    switch (resource) {
      case 'rubros':
        data = await getRubros();
        break;
      case 'provincias':
        data = await getProvincias();
        break;
      case 'ciudades':
        if (!idProvincia) {
          return NextResponse.json({ error: 'idProvincia requerido' }, { status: 400 });
        }
        data = await getCiudades(Number(idProvincia));
        break;
      case 'juzgados':
        if (!idCiudad) {
          return NextResponse.json({ error: 'idCiudad requerido' }, { status: 400 });
        }
        data = await getJuzgados(Number(idCiudad));
        break;
      case 'tipojuicio':
        data = await getTiposJuicio();
        break;
      case 'reclamos':
        data = await getReclamos();
        break;
      case 'etiquetas':
        data = await getEtiquetas();
        break;
      case 'empresas':
        data = await getEmpresas();
        break;
      case 'divisas':
        data = await getDivisas();
        break;
      default:
        return NextResponse.json({ error: 'Recurso no encontrado' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Error al consultar el observatorio' }, { status: 502 });
  }
}
