import { NextRequest, NextResponse } from 'next/server';
import { requireAdminPermission } from '@/lib/admin-session';
import { searchReclamoEmpresasFromFirestore } from '@/lib/reclamos-store';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  if (!requireAdminPermission(request, 'posts:read')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const q = (request.nextUrl.searchParams.get('q') ?? '').trim();
  if (q.length < 2) {
    return NextResponse.json({ empresas: [] });
  }

  try {
    const empresas = await searchReclamoEmpresasFromFirestore(q, 8);
    return NextResponse.json({
      empresas: empresas.map((empresa) => ({
        id: empresa.id,
        nombre: empresa.nombre,
        cuit: empresa.cuit ?? null,
      })),
    });
  } catch (error) {
    console.error('[admin/investigaciones/empresas]', error);
    return NextResponse.json({ error: 'Búsqueda no disponible' }, { status: 503 });
  }
}
