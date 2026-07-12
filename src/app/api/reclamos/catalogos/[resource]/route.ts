import { NextRequest, NextResponse } from 'next/server';
import {
  getReclamoCiudadesFromFirestore,
  getReclamoEstadosFromFirestore,
  getReclamoProvinciasFromFirestore,
  searchReclamoEmpresasFromFirestore,
} from '@/lib/reclamos-store';

const ALLOWED = new Set(['provincias', 'ciudades', 'estados', 'empresas']);

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ resource: string }> }
) {
  const { resource } = await context.params;

  if (!ALLOWED.has(resource)) {
    return NextResponse.json({ error: 'Recurso no permitido' }, { status: 404 });
  }

  try {
    const idProvincia = request.nextUrl.searchParams.get('idProvincia');
    const q = request.nextUrl.searchParams.get('q') ?? '';

    switch (resource) {
      case 'provincias':
        return NextResponse.json(await getReclamoProvinciasFromFirestore());
      case 'ciudades':
        if (!idProvincia) {
          return NextResponse.json({ error: 'idProvincia requerido' }, { status: 400 });
        }
        return NextResponse.json(await getReclamoCiudadesFromFirestore(Number(idProvincia)));
      case 'estados':
        return NextResponse.json(await getReclamoEstadosFromFirestore());
      case 'empresas': {
        const query = q.trim();
        if (!query) {
          return NextResponse.json([]);
        }
        return NextResponse.json(await searchReclamoEmpresasFromFirestore(query));
      }
      default:
        return NextResponse.json({ error: 'Recurso no encontrado' }, { status: 404 });
    }
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Catálogo no disponible' }, { status: 503 });
  }
}
