import type { FalloFormPayload } from '@/types/observatorio';

export function parseFalloFormPayload(body: unknown): FalloFormPayload | null {
  if (!body || typeof body !== 'object') return null;
  const data = body as Record<string, unknown>;

  const readString = (key: string) => String(data[key] ?? '');
  const readNumberArray = (key: string) =>
    Array.isArray(data[key])
      ? data[key].map((value) => Number(value)).filter((value) => Number.isFinite(value))
      : [];
  const readNullableNumber = (key: string) => {
    const value = data[key];
    if (value == null || value === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const readBool = (key: string) => Boolean(data[key]);

  return {
    actor: readString('actor'),
    demandado: readString('demandado'),
    firmActor: readBool('firmActor'),
    personDemandado: readBool('personDemandado'),
    actorEmpresaIds: readNumberArray('actorEmpresaIds'),
    demandadoEmpresaIds: readNumberArray('demandadoEmpresaIds'),
    divisaId: readNullableNumber('divisaId'),
    resumen: readString('resumen'),
    fecha: readString('fecha'),
    tipoJuicioId: readNullableNumber('tipoJuicioId'),
    rubroIds: readNumberArray('rubroIds'),
    causaIds: readNumberArray('causaIds'),
    etiquetaIds: readNumberArray('etiquetaIds'),
    provinciaId: readNullableNumber('provinciaId'),
    ciudadId: readNullableNumber('ciudadId'),
    juzgadoId: readNullableNumber('juzgadoId'),
    punitivo: readString('punitivo') || '0.00',
    moral: readString('moral') || '0.00',
    patrimonial: readString('patrimonial') || '0.00',
    status: data.status === 'draft' ? 'draft' : 'publish',
  };
}

export function validateFalloFormPayload(payload: FalloFormPayload): string | null {
  if (!payload.resumen.trim()) {
    return 'El resumen es obligatorio';
  }
  if (payload.resumen.trim().length > 1000) {
    return 'El resumen no puede superar 1000 caracteres';
  }
  if (payload.firmActor) {
    if (!payload.actorEmpresaIds.length) {
      return 'Seleccioná al menos una empresa como actor';
    }
  } else if (!payload.actor.trim()) {
    return 'El actor es obligatorio';
  }
  return null;
}
