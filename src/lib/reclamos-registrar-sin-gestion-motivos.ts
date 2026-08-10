/** Motivos prefijados para "Registrar sin gestión" (texto al consumidor + prompt IA). */
export type MotivoSinGestion = {
  id: string;
  label: string;
  /** Frase corta para el historial interno */
  historial: string;
  /** Intención para la IA / tono al consumidor */
  intencion: string;
};

export const MOTIVOS_REGISTRAR_SIN_GESTION: MotivoSinGestion[] = [
  {
    id: 'sin_delegacion',
    label: 'No tenemos delegación en esa localidad',
    historial: 'Sin delegación en la localidad',
    intencion:
      'Explicar con empatía que UCU no cuenta con delegación o cobertura operativa en la localidad del denunciante, por lo que no podemos gestionar el reclamo de forma individual. La denuncia queda registrada. Recomendar iniciar el reclamo ante Defensa del Consumidor de su ciudad.',
  },
  {
    id: 'delegado_sin_tiempo',
    label: 'El delegado no puede atenderlo por agenda/tiempo',
    historial: 'Delegado sin disponibilidad de agenda',
    intencion:
      'Explicar que, por disponibilidad de agenda del equipo/delegado en este momento, no vamos a poder acompañar la gestión individual del reclamo. Validar que el planteo quedó registrado. Recomendar Defensa del Consumidor de su ciudad como vía directa.',
  },
  {
    id: 'requiere_intervencion_local',
    label: 'Requiere intervención local (Defensa del Consumidor)',
    historial: 'Requiere intervención local',
    intencion:
      'Explicar que este tipo de reclamo necesita intervención de la autoridad local de Defensa del Consumidor, y que UCU registra la denuncia pero no gestionará el caso de forma individual. Orientar a iniciar el trámite en su ciudad.',
  },
  {
    id: 'fuera_alcance',
    label: 'Fuera del alcance actual de acompañamiento de UCU',
    historial: 'Fuera de alcance de acompañamiento',
    intencion:
      'Explicar con cuidado que, por el alcance actual del acompañamiento de UCU, no podremos gestionar este caso en particular de forma individual. Dejar claro que la denuncia queda incorporada y no se invalida el reclamo. Recomendar Defensa del Consumidor.',
  },
  {
    id: 'otra_via_en_curso',
    label: 'Ya tiene o conviene otra vía (organismo / mediación)',
    historial: 'Corresponde otra vía o ya hay trámite',
    intencion:
      'Explicar que, por las características del caso, corresponde o conviene avanzar por otra vía (por ejemplo Defensa del Consumidor u organismo competente), y que UCU registra la denuncia pero no hará gestión individual. Mantener tono respetuoso y orientativo.',
  },
  {
    id: 'falta_documentacion',
    label: 'No se puede avanzar sin documentación esencial',
    historial: 'Falta documentación esencial',
    intencion:
      'Explicar que, con la información disponible, no es posible avanzar en una gestión individual desde UCU. Indicar que la denuncia queda registrada. Sugerir reunir documentación y canalizar el reclamo ante Defensa del Consumidor de su ciudad. No culpar al consumidor.',
  },
  {
    id: 'volumen_prioridades',
    label: 'No podemos tomarlo por volumen/prioridades del momento',
    historial: 'Sin capacidad operativa en este momento',
    intencion:
      'Explicar con honestidad y respeto que, por el volumen de casos y las prioridades operativas actuales, UCU no podrá gestionar este reclamo de forma individual. La denuncia queda registrada. Recomendar Defensa del Consumidor de su ciudad.',
  },
];

export const PLANTILLA_REGISTRAR_SIN_GESTION =
  'Registrar sin gestión (Defensa del Consumidor)';

export function buildIntencionDesdeMotivos(
  motivoIds: string[],
  notaExtra?: string,
  localidad?: string
): string {
  const selected = MOTIVOS_REGISTRAR_SIN_GESTION.filter((m) => motivoIds.includes(m.id));
  const partes = selected.map((m) => m.intencion);
  if (localidad?.trim()) {
    partes.push(`Localidad del denunciante: ${localidad.trim()}.`);
  }
  if (notaExtra?.trim()) {
    partes.push(`Notas adicionales del operador: ${notaExtra.trim()}.`);
  }
  partes.push(
    'El mail debe: 1) acusar recibo y decir que la denuncia quedó registrada; 2) explicar con tono empático que no gestionaremos el caso individualmente; 3) recomendar iniciar reclamo en Defensa del Consumidor de su ciudad; 4) incluir el link oficial si corresponde; 5) no sonar a rechazo humillante ni echar culpas.'
  );
  return partes.join('\n\n');
}

export function buildHistorialDesdeMotivos(motivoIds: string[], notaExtra?: string): string {
  const labels = MOTIVOS_REGISTRAR_SIN_GESTION.filter((m) => motivoIds.includes(m.id)).map(
    (m) => m.historial
  );
  const base = labels.length ? labels.join('; ') : 'Registrado sin gestión';
  const extra = notaExtra?.trim();
  return extra ? `${base} — ${extra}` : base;
}
