/** Primeras frases citables: la respuesta va antes del contexto. */

export const GEO_UCU =
  'UCU (Usuarios y Consumidores Unidos) es una ONG argentina de defensa del consumidor: no es un banco, una fintech ni un estudio jurídico comercial.';

export const GEO_HOME =
  'UCU es la red pública de defensa del consumidor en Argentina: presentá una denuncia gratuita, consultá cuántos reclamos hay contra una empresa y leé fallos y alertas.';

export const GEO_RECLAMO =
  'Una denuncia de consumo en UCU es gratuita: la registramos y, si el caso lo amerita, te contactamos para orientarte. No inicia un juicio por sí sola.';

export const GEO_PLAN_AHORRO =
  'Un plan de ahorro automotor no es un crédito: es un sistema de capitalización en grupo donde la cuota se mueve con el precio del auto y las reglas de la administradora.';

export const GEO_OBSERVATORIO =
  'El Observatorio UCU es una base pública de fallos judiciales sobre defensa del consumidor en Argentina, con resumen, tribunal, rubro y demandado.';

export const GEO_ESTADISTICAS =
  'UCU publica el total de denuncias de consumo recibidas contra cada empresa. El número es gratuito; el desglose por causas sale en un PDF certificable.';

export const GEO_EDUCACION =
  'Educación financiera de UCU es un curso gratuito para consumidores argentinos: presupuesto, crédito, tasas y sobreendeudamiento, con calculadoras y fuentes oficiales (BCRA, CNV).';

export const GEO_COBRANZAS =
  'Un estudio de cobranzas puede intimar una deuda cierta y exigir pago, pero no puede amenazar, hostigar, informar datos falsos ni afectar tu honor: la Ley 24.240 y normas de BCRA limitan esas prácticas.';

export type GeoFaqItem = {
  question: string;
  answer: string;
  href?: string;
};

export const GEO_FAQ_ITEMS: GeoFaqItem[] = [
  {
    question: '¿Qué es UCU?',
    answer: `${GEO_UCU} Ayuda a entender derechos, denunciar abusos y tomar mejores decisiones de consumo en todo el país.`,
    href: '/quienes-somos',
  },
  {
    question: '¿Cómo hago un reclamo de consumo en Argentina?',
    answer: `${GEO_RECLAMO} También podés reclamar primero a la empresa por escrito y, si no hay respuesta, ir a COPREC o a UCU.`,
    href: '/reclamos',
  },
  {
    question: '¿Qué es un plan de ahorro automotor?',
    answer: `${GEO_PLAN_AHORRO} UCU sostiene que el sistema es una trampa para el ahorrista y pide una reforma integral.`,
    href: '/planes-de-ahorro-son-una-trampa',
  },
  {
    question: '¿Qué puede hacer un estudio de cobranzas?',
    answer: GEO_COBRANZAS,
    href: '/categoria/alertas-de-fraude',
  },
  {
    question: '¿Qué es el Observatorio de fallos UCU?',
    answer: GEO_OBSERVATORIO,
    href: '/observatorio',
  },
  {
    question: '¿UCU publica denuncias por empresa?',
    answer: GEO_ESTADISTICAS,
    href: '/reclamos/estadisticas',
  },
];
