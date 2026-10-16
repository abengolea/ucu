import { NextRequest, NextResponse } from 'next/server';
import { requireMemberApi } from '@/lib/member-session';
import {
  createEmpresaInFirestore,
  createEtiquetaInFirestore,
} from '@/lib/observatorio-store';

const ALLOWED = new Set(['empresas', 'etiquetas']);

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ type: string }> }
) {
  const access = await requireMemberApi(request);
  if (access instanceof NextResponse) return access;

  const { type } = await context.params;
  if (!ALLOWED.has(type)) {
    return NextResponse.json({ error: 'Tipo no permitido' }, { status: 404 });
  }

  const body = await request.json();

  try {
    if (type === 'empresas') {
      const razon_social = String(body.razon_social ?? '').trim();
      if (!razon_social) {
        return NextResponse.json({ error: 'Razón social requerida' }, { status: 400 });
      }
      const empresa = await createEmpresaInFirestore({
        razon_social,
        cuit: body.cuit ? String(body.cuit) : undefined,
      });
      return NextResponse.json({ ok: true, item: empresa });
    }

    const description = String(body.description ?? '').trim();
    if (!description) {
      return NextResponse.json({ error: 'Descripción requerida' }, { status: 400 });
    }
    const etiqueta = await createEtiquetaInFirestore(description);
    return NextResponse.json({ ok: true, item: etiqueta });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'No se pudo crear el ítem' }, { status: 500 });
  }
}
