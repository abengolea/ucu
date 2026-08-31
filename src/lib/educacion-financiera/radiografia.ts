export type RadiographyDimensionId = 'impulse' | 'credit' | 'knowledge';

export type RadiographyQuestion = {
  id: string;
  text: string;
  dimension: RadiographyDimensionId;
  /** Si true, "siempre" es riesgoso y se invierte el puntaje. */
  reverse: boolean;
};

export const LIKERT_LABELS = ['Nunca', 'Rara vez', 'A veces', 'Seguido', 'Siempre'] as const;

export const RADIOGRAPHY_QUESTIONS: RadiographyQuestion[] = [
  {
    id: 'q1',
    text: 'Compro productos porque están en oferta, aunque no los hubiera pensado comprar.',
    dimension: 'impulse',
    reverse: true,
  },
  {
    id: 'q2',
    text: 'Ante una oferta “por tiempo limitado”, siento que tengo que decidir ya.',
    dimension: 'impulse',
    reverse: true,
  },
  {
    id: 'q3',
    text: 'Puedo postergar una compra que deseo si no entra en el presupuesto.',
    dimension: 'impulse',
    reverse: false,
  },
  {
    id: 'q4',
    text: 'Comparo precios antes de una compra importante.',
    dimension: 'impulse',
    reverse: false,
  },
  {
    id: 'q5',
    text: 'Uso la tarjeta o un préstamo para pagar gastos del mes (comida, servicios, alquiler).',
    dimension: 'credit',
    reverse: true,
  },
  {
    id: 'q6',
    text: 'Pago solo el mínimo de la tarjeta o refinancio sin mirar bien el costo.',
    dimension: 'credit',
    reverse: true,
  },
  {
    id: 'q7',
    text: 'Sé cuánto debo en total (tarjeta, cuotas y préstamos).',
    dimension: 'credit',
    reverse: false,
  },
  {
    id: 'q8',
    text: 'Evito mirar el resumen o las cuentas cuando sé que gasté de más.',
    dimension: 'credit',
    reverse: true,
  },
  {
    id: 'q9',
    text: 'Antes de financiar, verifico el Costo Financiero Total (CFT) o al menos la tasa.',
    dimension: 'knowledge',
    reverse: false,
  },
  {
    id: 'q10',
    text: 'Sé distinguir, aunque sea a grandes rasgos, entre tasa nominal, efectiva y CFT.',
    dimension: 'knowledge',
    reverse: false,
  },
  {
    id: 'q11',
    text: 'Conozco aproximadamente cuánto gasto por mes (efectivo, débito y tarjeta).',
    dimension: 'knowledge',
    reverse: false,
  },
  {
    id: 'q12',
    text: 'Tengo (o estoy armando) un colchón para emergencias.',
    dimension: 'knowledge',
    reverse: false,
  },
  {
    id: 'q13',
    text: 'Elijo cuotas “sin interés” sin comparar el precio de contado.',
    dimension: 'impulse',
    reverse: true,
  },
  {
    id: 'q14',
    text: 'Si me ofrecen un préstamo “rápido”, miro la cuota y firmo sin calcular el total.',
    dimension: 'credit',
    reverse: true,
  },
];

export const DIMENSION_META: Record<
  RadiographyDimensionId,
  { label: string; blurb: string }
> = {
  impulse: {
    label: 'Control de impulsos y compras',
    blurb: 'Cómo reaccionás ante ofertas, cuotas y la urgencia de comprar.',
  },
  credit: {
    label: 'Uso del crédito y endeudamiento',
    blurb: 'Si el crédito te ordena el mes o te lo come.',
  },
  knowledge: {
    label: 'Conocimiento práctico',
    blurb: 'Presupuesto, CFT, tasas y hábitos de seguimiento.',
  },
};

export type DimensionResult = {
  id: RadiographyDimensionId;
  score: number;
  zone: 'ok' | 'watch' | 'alert';
  strengths: string;
  risks: string;
  tip: string;
};

export type RadiographyProfile = {
  id: string;
  title: string;
  summary: string;
  moduleIds: number[];
  calculatorHint: 'ahorro' | 'tarjeta' | 'cuotas' | 'tasa-real';
};

export type RadiographyResult = {
  completedAt: string;
  answers: Record<string, number>;
  dimensions: DimensionResult[];
  profile: RadiographyProfile;
  consent: true;
};

function zoneFor(score: number): DimensionResult['zone'] {
  if (score >= 70) return 'ok';
  if (score >= 45) return 'watch';
  return 'alert';
}

function scoreQuestion(value: number, reverse: boolean): number {
  const v = Math.min(4, Math.max(0, value));
  return reverse ? 4 - v : v;
}

function dimensionCopy(
  id: RadiographyDimensionId,
  score: number,
): Pick<DimensionResult, 'strengths' | 'risks' | 'tip'> {
  if (id === 'impulse') {
    if (score >= 70) {
      return {
        strengths: 'Podés frenar compras y comparar antes de decidir.',
        risks: 'Igual conviene revisar cuotas “sin interés” cuando hay descuento de contado.',
        tip: 'Mantené la regla: si no estaba en la lista, esperá 24 horas.',
      };
    }
    if (score >= 45) {
      return {
        strengths: 'A veces planificás; otras te gana la oferta.',
        risks: 'Las promociones y las cuotas pueden empujar gastos no previstos.',
        tip: 'Antes de la próxima compra grande, abrí la calculadora de cuotas vs. contado.',
      };
    }
    return {
      strengths: 'Reconocés que las ofertas te mueven: eso ya es un punto de partida.',
      risks: 'Decisiones rápidas + financiación suelen salir caras.',
      tip: 'Los próximos 30 días: cero cuotas nuevas sin comparar CFT o precio de contado.',
    };
  }
  if (id === 'credit') {
    if (score >= 70) {
      return {
        strengths: 'Tenés mirada sobre lo que debés y no usás el crédito como sueldo.',
        risks: 'Un imprevisto sin colchón puede empujar al mínimo.',
        tip: 'Repasá el módulo de intereses para no firmar a ciegas.',
      };
    }
    if (score >= 45) {
      return {
        strengths: 'Hay algo de control, pero el crédito todavía aparece en el día a día.',
        risks: 'Mínimos y refinanciaciones pueden crecer sin que lo notes.',
        tip: 'Listá todas las deudas y simulá el pago mínimo con tu tasa.',
      };
    }
    return {
      strengths: 'Estás mirando el problema: es el primer paso para ordenarlo.',
      risks: 'Endeudamiento para gastos corrientes y poca visibilidad del costo total.',
      tip: 'Priorizá el módulo de sobreendeudamiento y la calculadora de pago mínimo.',
    };
  }
  // knowledge
  if (score >= 70) {
    return {
      strengths: 'Manejas conceptos útiles (gastos, CFT, colchón).',
      risks: 'El riesgo es dejar de practicarlos cuando apura el mes.',
      tip: 'Usá las plantillas para dejar el hábito asentado.',
    };
  }
  if (score >= 45) {
    return {
      strengths: 'Sabés algunas cosas; faltan otras para decidir con números.',
      risks: 'Firmar mirando solo la cuota es el punto débil más común.',
      tip: 'Empezá por presupuesto + “Cómo se calculan los intereses”.',
    };
  }
  return {
    strengths: 'Podés aprender rápido si lo atás a tu caso real.',
    risks: 'Sin mapa de gastos ni lectura de tasas, el mercado decide por vos.',
    tip: 'Hacé la plantilla de presupuesto esta semana y el módulo de tasas.',
  };
}

function pickProfile(dims: Record<RadiographyDimensionId, number>): RadiographyProfile {
  const { impulse, credit, knowledge } = dims;
  const lowest = (Object.entries(dims) as [RadiographyDimensionId, number][]).sort(
    (a, b) => a[1] - b[1],
  )[0][0];

  if (credit < 45 && credit <= impulse && credit <= knowledge) {
    return {
      id: 'endeudado',
      title: 'Tendencia a sostener el mes con crédito',
      summary:
        'Tus respuestas sugieren que el crédito aparece en gastos corrientes o que cuesta ver el costo total de lo que debés. No es un diagnóstico: es una orientación para ordenar deudas y tasas antes de seguir financiando.',
      moduleIds: [8, 7, 3, 1],
      calculatorHint: 'tarjeta',
    };
  }
  if (impulse < 45 && impulse <= credit) {
    return {
      id: 'impulsivo',
      title: 'Tendencia a decidir rápido ante ofertas y cuotas',
      summary:
        'Tus respuestas muestran inclinación a compras o financiaciones impulsadas por descuentos y urgencia. La idea no es culparte: es entrenar pausas y comparar el precio real.',
      moduleIds: [1, 7, 3, 8],
      calculatorHint: 'cuotas',
    };
  }
  if (knowledge < 45) {
    return {
      id: 'desorientado',
      title: 'Hábitos a construir: mapa y números claros',
      summary:
        'Declarás poca visibilidad de gastos, CFT o colchón. El recorrido más útil empieza por presupuesto e intereses, con calculadoras al lado.',
      moduleIds: [1, 7, 2, 3],
      calculatorHint: 'ahorro',
    };
  }
  if (lowest === 'credit' && credit < 70) {
    return {
      id: 'credito-atencion',
      title: 'Crédito bajo control relativo, con zona de atención',
      summary:
        'No todo está desbordado, pero el crédito sigue siendo un punto sensible. Conviene reforzar lectura de tasas y plan de salida si hay saldos.',
      moduleIds: [7, 3, 8],
      calculatorHint: 'tarjeta',
    };
  }
  if (impulse >= 70 && credit >= 70 && knowledge >= 60) {
    return {
      id: 'organizado',
      title: 'Hábitos relativamente ordenados',
      summary:
        'Tus respuestas apuntan a más planificación que impulso. Igual sirve profundizar inflación, tasa real e inversiones básicas para no perder poder de compra.',
      moduleIds: [2, 5, 7],
      calculatorHint: 'tasa-real',
    };
  }
  return {
    id: 'mixto',
    title: 'Perfil mixto: afinar el eslabón más débil',
    summary:
      'No hay un solo patrón extremo. Te conviene seguir el módulo ligado a tu dimensión más baja y practicar con una calculadora esta semana.',
    moduleIds:
      lowest === 'impulse' ? [1, 7, 3] : lowest === 'credit' ? [8, 7, 3] : [1, 7, 2],
    calculatorHint: lowest === 'credit' ? 'tarjeta' : lowest === 'impulse' ? 'cuotas' : 'ahorro',
  };
}

export function computeRadiography(answers: Record<string, number>): RadiographyResult {
  const buckets: Record<RadiographyDimensionId, number[]> = {
    impulse: [],
    credit: [],
    knowledge: [],
  };

  for (const q of RADIOGRAPHY_QUESTIONS) {
    const raw = answers[q.id];
    if (raw === undefined || Number.isNaN(raw)) continue;
    buckets[q.dimension].push(scoreQuestion(raw, q.reverse));
  }

  const scores = {} as Record<RadiographyDimensionId, number>;
  (Object.keys(buckets) as RadiographyDimensionId[]).forEach((id) => {
    const arr = buckets[id];
    const avg = arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    scores[id] = Math.round((avg / 4) * 100);
  });

  const dimensions: DimensionResult[] = (Object.keys(DIMENSION_META) as RadiographyDimensionId[]).map(
    (id) => {
      const score = scores[id];
      return {
        id,
        score,
        zone: zoneFor(score),
        ...dimensionCopy(id, score),
      };
    },
  );

  return {
    completedAt: new Date().toISOString(),
    answers,
    dimensions,
    profile: pickProfile(scores),
    consent: true,
  };
}

export const RADIOGRAPHY_STORAGE_KEY = 'ucu-edu-financiera-radiografia-v1';

export function loadRadiography(): RadiographyResult | null {
  try {
    const raw = localStorage.getItem(RADIOGRAPHY_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as RadiographyResult;
  } catch {
    return null;
  }
}

export function saveRadiography(result: RadiographyResult) {
  localStorage.setItem(RADIOGRAPHY_STORAGE_KEY, JSON.stringify(result));
}

export function clearRadiography() {
  localStorage.removeItem(RADIOGRAPHY_STORAGE_KEY);
}
