export type PretestQuestion = {
  id: string;
  question: string;
  options: string[];
  correct: number;
  tip: string;
};

export const PRETEST_QUESTIONS: PretestQuestion[] = [
  {
    id: 'p1',
    question: '¿Qué conviene hacer primero si “no sabés a dónde se va la plata”?',
    options: [
      'Pedir un préstamo personal',
      'Registrar ingresos y gastos un tiempo',
      'Invertir en lo que rinda más',
    ],
    correct: 1,
    tip: 'Sin registro no hay mapa. Empezá por el módulo de presupuesto.',
  },
  {
    id: 'p2',
    question: 'Si el pago mínimo de la tarjeta es menor que el interés del mes…',
    options: [
      'La deuda puede seguir creciendo',
      'Estás cancelando el capital rápido',
      'El banco te bonifica intereses',
    ],
    correct: 0,
    tip: 'Es la trampa clásica del mínimo. Mirá el módulo de deuda y la calculadora.',
  },
  {
    id: 'p3',
    question: 'Un banco o un organismo público…',
    options: [
      'Puede pedirte la clave por WhatsApp si es urgente',
      'Nunca te pide claves ni tokens por mensajería',
      'Solo la AFIP/ARCA puede pedirte la clave por SMS',
    ],
    correct: 1,
    tip: 'Señal de fraude financiero. Repasá cuentas/medios de pago y el módulo de sobreendeudamiento.',
  },
  {
    id: 'p4',
    question: '“A mayor rentabilidad esperada…”',
    options: ['Menor riesgo', 'Mayor riesgo', 'Riesgo cero si es en dólares'],
    correct: 1,
    tip: 'Principio básico de inversiones. Ver módulo de protección al inversor.',
  },
  {
    id: 'p5',
    question: 'El CFT de un crédito sirve para…',
    options: [
      'Saber solo la cuota mensual',
      'Comparar el costo total (intereses, seguros, gastos)',
      'Calcular el IVA del ticket',
    ],
    correct: 1,
    tip: 'Pedí siempre el CFT antes de firmar una refinanciación.',
  },
  {
    id: 'p6',
    question: 'Ante un cobro indebido, el orden sensato es…',
    options: [
      'Ignorarlo',
      'Juntar pruebas, reclamar a la empresa y luego al canal oficial / UCU',
      'Pagar con otra tarjeta para “cerrar el tema”',
    ],
    correct: 1,
    tip: 'El módulo final te arma la ruta de reclamo.',
  },
];

export type CourseTemplate = {
  id: string;
  title: string;
  description: string;
  filename: string;
  body: string;
};

export const COURSE_TEMPLATES: CourseTemplate[] = [
  {
    id: 'presupuesto',
    title: 'Plantilla de presupuesto mensual',
    description: 'Ingresos, fijos, variables y margen del mes.',
    filename: 'ucu-plantilla-presupuesto.txt',
    body: `UCU — Plantilla de presupuesto mensual
Completá con tus números. Los ejemplos son orientativos.

INGRESOS
- Sueldo / jubilación / changa fija: $________
- Otros ingresos del mes: $________
TOTAL INGRESOS: $________

GASTOS FIJOS
- Alquiler / expensas: $________
- Servicios (luz, gas, agua, internet): $________
- Prepaga / obra social: $________
- Transporte: $________
- Cuotas (tarjeta, préstamos, colegio…): $________
- Otros fijos: $________
TOTAL FIJOS: $________

GASTOS VARIABLES
- Comida / supermercado: $________
- Delivery / salidas: $________
- Suscripciones: $________
- Otros: $________
TOTAL VARIABLES: $________

RESUMEN
Ingresos − (fijos + variables) = margen $________
¿Hay ahorro automático programado? Sí / No — monto $________

Próximas 3 decisiones del mes:
1) ________
2) ________
3) ________

Herramienta online: /educacion-financiera (calculadora de ahorro)
`,
  },
  {
    id: 'deuda',
    title: 'Plan de salida de deudas',
    description: 'Listado de deudas, tasas y orden de ataque.',
    filename: 'ucu-plantilla-deudas.txt',
    body: `UCU — Plan de salida de deudas

Regla orientativa: mirá qué % de tu ingreso se va en cuotas.
Ingreso mensual: $________
Total cuotas del mes: $________
% del ingreso: ________%

DEUDAS (una por fila)
1) Acreedor: ________ | Saldo: $________ | Tasa/CFT: ________ | Cuota: $________ | Mínimo: $________
2) Acreedor: ________ | Saldo: $________ | Tasa/CFT: ________ | Cuota: $________ | Mínimo: $________
3) Acreedor: ________ | Saldo: $________ | Tasa/CFT: ________ | Cuota: $________ | Mínimo: $________

Estrategia (elegí una):
[ ] Avalancha: primero la de mayor tasa
[ ] Bola de nieve: primero la más chica

Compromiso de pago este mes (debe ser > intereses si es tarjeta): $________
¿Corté compras nuevas en esa tarjeta? Sí / No

Si hay consumos desconocidos o cobros indebidos: guardá resumen y reclamá.
UCU reclamos: /reclamos
Calculadora pago mínimo: /educacion-financiera
`,
  },
  {
    id: 'antifraude',
    title: 'Checklist antifraude',
    description: 'Señales de alerta y qué hacer si sospechás una estafa.',
    filename: 'ucu-checklist-antifraude.txt',
    body: `UCU — Checklist de seguridad financiera

ANTES DE TRANSFERIR O DAR DATOS
[ ] ¿Me pedís clave, token o código por WhatsApp/mail/SMS? → NO lo des
[ ] ¿El link llegó por mensaje urgente? → Entrá por la app/web oficial, no por el link
[ ] ¿Prometen renta alta “sin riesgo”? → Desconfiá y consultá CNV
[ ] ¿Verifiqué CBU/CVU/Alias del destinatario?
[ ] ¿Es un supuesto agente de banco/ANSES/ARCA? → Cortá y llamá vos al número oficial

SI YA PASÓ ALGO RARO
[ ] Cambié claves desde el canal oficial
[ ] Bloqueé tarjeta / denuncié en la entidad
[ ] Guardé capturas, mails y números de gestión
[ ] Reclamé a la empresa por escrito
[ ] Si hace falta: Defensa del Consumidor / UCU / BCRA / CNV / SSN según el caso

Contactos útiles en el curso: /educacion-financiera (módulo Fraudes y derechos)
Reclamos UCU: /reclamos
`,
  },
];
