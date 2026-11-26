export const CAMPAIGN_CHANGE_ORG_URL = 'https://chng.it/76QxvkcJ7B';

export const CAMPAIGN_SPOTIFY_PLAYLIST =
  'https://open.spotify.com/embed/playlist/0vRPwedOcvnLUntby6ccq1?utm_source=generator';

export const campaignDemands = [
  'Solución general e inmediata a los conflictos de aumento de precios',
  'La eliminación del prorrateo en el derecho de admisión, para luego descontarlo al momento de la liquidación',
  'La prohibición de otorgar facilidades, diferimientos y bonificaciones al inicio de los planes que crean una falsa idea de cuotas bajas',
  'Cesar con la práctica de imponer seguros con precios mayores a los que ofrece el mercado',
  'Liquidaciones claras, concretas y detalladas, con publicación en la web',
  'Control efectivo en tiempo real de las gestiones de cobro efectuadas por las administradoras',
  'Liquidaciones complementarias por sumas actualizadas correspondientes al valor de la unidad al momento del recupero',
  'Multas por rescisión y/o renuncia proporcionales al porcentaje de cobranza',
  'Supresión del rubro «débitos/créditos» en las cuotas, por información clara y precisa sobre lo que nos están cobrando',
  'Entrega de ejemplar de solicitud de adhesión al ahorrista (suscripto, firmado y sellado) por la concesionaria',
  'Cumplimiento irrestricto de los plazos de entrega',
] as const;

export const campaignActions = [
  {
    title: 'Convocatorias de afectados',
    description:
      'Completá tus datos para que podamos identificar las problemáticas que aquejan a los ahorristas de planes de ahorro.',
    href: '/reclamos/nuevo',
    cta: 'Denunciar tu caso',
  },
  {
    title: 'Acciones colectivas',
    description:
      'Demandas colectivas en trámite tendientes a solucionar problemas generalizados en perjuicio de los ahorristas.',
    href: '/categoria/acciones-colectivas',
    cta: 'Ver acciones',
  },
  {
    title: 'Fallos relevantes',
    description:
      'Los fallos más importantes en materia de planes de ahorro, disponibles en nuestro observatorio.',
    href: '/observatorio/fallos',
    cta: 'Ir a los fallos',
  },
  {
    title: 'Curso online para abogados',
    description:
      'Práctico y dinámico, con toda la información útil para defender a los usuarios argentinos de este sistema tan perjudicial.',
    href: '/paginas/curso-ucu-planes-de-ahorro',
    cta: 'Conocer el curso',
  },
  {
    title: 'Noticias y recursos',
    description:
      'Artículos, modelos de denuncia y alertas sobre prácticas abusivas en el sistema de planes de ahorro.',
    href: '/categoria/planes-de-ahorros',
    cta: 'Ver publicaciones',
  },
] as const;

export const campaignTestimonials = [
  {
    quote: 'El sistema de planes de ahorro merece una inmediata reforma integral.',
    author: 'Diego González Vila',
  },
  {
    quote:
      'Difícilmente se puede encontrar en el derecho argentino un sistema contractual tan perjudicial para los consumidores de nuestro país.',
    author: 'Adrian Bengolea — Director de UCU',
  },
  {
    quote:
      'No es cierto que si no te cumplen lo prometido la responsabilidad es solo de la concesionaria. El plan de ahorro debe responder.',
    author: 'UCU',
  },
] as const;

export type FaqItem = { question: string; answer: string };
export type FaqSection = { title: string; items: FaqItem[] };

export const campaignFaqSections: FaqSection[] = [
  {
    title: 'Contratación',
    items: [
      {
        question: 'Estoy por firmar un plan de ahorro, ¿qué cuidados debo tener?',
        answer:
          'En este tipo de contrataciones hay que tener mucho cuidado con los anexos que nos hacen firmar. En esa documentación se esconden muchas trampas del sistema. También te aconsejamos denunciar expresamente un beneficiario en el seguro de vida que se contrata (esposo/a y/o algún hijo).',
      },
      {
        question: 'Me engañaron al ofrecerme el plan, ¿qué puedo hacer?',
        answer:
          'Si la contratación fue telefónica o vía web, podés arrepentirte enviando una notificación fehaciente a la empresa administradora de planes. También podés plantear la nulidad del contrato por engaño, en base al artículo 37 de la Ley de Defensa del Consumidor. En ambos casos, consultá con un abogado.',
      },
      {
        question: '¿Tengo que pedir copia de todo lo que firmo?',
        answer:
          'Sí, absolutamente. También aconsejamos pedir por escrito (o vía mail) las condiciones especiales que te ofrezcan. Muchas veces las ofertas quedan en palabras que luego no son cumplidas.',
      },
      {
        question: '¿Qué es el derecho de admisión?',
        answer:
          'Es como una especie de «entrada» que cobran las administradoras de planes de ahorro para ingresar al sistema. En la mayoría de los casos equivale al 3% del valor del auto. Las empresas intentan ocultarlo a través del prorrateo. Desde UCU sostenemos la ilegalidad de este rubro, aunque todavía no existen antecedentes judiciales que así lo hayan declarado.',
      },
    ],
  },
  {
    title: 'Entrega del auto',
    items: [
      {
        question: '¿Cuánto puede demorar la entrega de mi unidad adjudicada?',
        answer:
          'La demora viene estipulada en el contrato de adhesión. En la gran mayoría el plazo es de 60 días desde la aceptación de la unidad. Si demora más de lo acordado, se genera a favor del adjudicatario una indemnización por cada día de demora, calculada según una fórmula incluida en el contrato. Entendemos que esa indemnización predispuesta no es la única que se puede pedir ante el incumplimiento.',
      },
      {
        question: '¿Cómo cuento el plazo para la entrega de la unidad?',
        answer:
          'Se cuenta desde que se acompaña la carpeta con toda la documentación requerida por la concesionaria al momento de la adjudicación. El día que solicitás tu unidad es el día 1. Aconsejamos siempre solicitar recibo de la entrega de la documentación (remito de entrega de unidad) para poder contar los plazos con exactitud.',
      },
      {
        question: '¿El plazo de entrega se amplía si se pide cambio de modelo?',
        answer:
          'No. La normativa vigente establece que la prórroga no es automática: deben existir razones objetivas. Las empresas muchas veces no lo cumplen, por lo que se puede reclamar la entrega una vez vencido el plazo inicial.',
      },
      {
        question: '¿Puedo elegir la compañía de seguros para mi unidad adjudicada?',
        answer:
          'La concesionaria debe poner a disposición cinco compañías de seguros para que elijas libremente. La gran mayoría de los planes de ahorro no cumplen con esta obligación. También hemos advertido sobreprecios en los seguros contratados a través del plan.',
      },
      {
        question: '¿Cómo reclamo la indemnización por demora de entrega de unidad?',
        answer:
          'Al retirar tu unidad se firma un remito de entrega de unidad. Consigná con puño y letra: «en disconformidad», «hago expresa reserva de reclamar indemnización por demora» o «reserva de art.…» según el contrato. Tener presente la fecha en que se cumplieron los 60 o 120 días. Luego presentá una nota solicitando la indemnización a la administradora en la concesionaria.',
      },
      {
        question: 'Cuando retiro mi unidad o km, ¿qué es lo que debo pagar?',
        answer:
          'Los únicos conceptos que deben cobrarte son: flete de entrega de unidad, patentamiento e inscripción de prenda (si corresponde) y seguro de traslado de la unidad. Bajo ninguna circunstancia pueden cobrarte conceptos distintos. Si pagaste de más porque necesitabas retirar, podés pedir la restitución de la diferencia.',
      },
      {
        question: '¿Cómo controlar si me están cobrando gastos de entrega excesivos?',
        answer:
          'Cuando adjudicás tu unidad, la administradora envía carta con los precios de gastos de entrega. Estos deben coincidir con lo que pretende cobrarte la concesionaria. Si no es así y aducen otras gestiones, están cometiendo abuso.',
      },
    ],
  },
  {
    title: 'Aumentos y precios',
    items: [
      {
        question: '¿Existen las cuotas fijas en este tipo de planes?',
        answer:
          'Cuando escuchamos «cuota fija» debemos presumir que nos intentan engañar. No existen cuotas fijas en este tipo de planes: las cuotas se actualizan con el aumento del valor de la unidad de ahorro.',
      },
      {
        question: '¿Qué hacer ante los aumentos de precios?',
        answer:
          'Los aumentos de precios son un tema muy complejo. Hay que analizar bien las razones. Si al poco tiempo de ingresar al sistema ves un salto inesperado en el valor de las cuotas, iniciá un reclamo de inmediato a través de un abogado o en defensa del consumidor de tu ciudad.',
      },
      {
        question: '¿Cuál es el único caso en que no pueden aumentar la cuota?',
        answer:
          'Cuando la administradora decide cambiar el bien tipo (por ejemplo deja de fabricar un modelo). Debe existir notificación fehaciente al suscriptor y su aceptación. Sin eso, no pueden aumentar el valor de la cuota; si rescinden el contrato deben reintegrar e indemnizar por incumplimiento.',
      },
    ],
  },
  {
    title: 'Mora en el pago de cuotas',
    items: [
      {
        question: '¿Me pueden secuestrar la unidad?',
        answer:
          'En el juicio de ejecución prendaria las administradoras suelen pedir el secuestro, medida cuestionable si el deudor comparece y exhibe voluntad de arreglar. Hay que analizar cuántas cuotas adeuda: si son pocas, el pedido de secuestro puede ser abusivo. Solo debería proceder en casos extremos.',
      },
      {
        question: 'Me remataron la unidad, ¿qué debo tener en cuenta?',
        answer:
          'Con el dinero del remate la empresa debe cancelar los gastos de remate y la deuda del ahorrista. Si queda saldo, debe reintegrarse al consumidor. Exigí la liquidación. Resulta ilegal que no se haga la transferencia del vehículo rematado.',
      },
      {
        question: '¿Qué me puede pasar si tengo el auto y dejo de pagar?',
        answer:
          'Entrás en mora: empezás a pagar intereses por el retraso y podés recibir un juicio de ejecución prendaria.',
      },
      {
        question: '¿Me pueden reclamar la totalidad de las cuotas o solo las adeudadas?',
        answer:
          'Aunque los contratos estipulan la caída de la totalidad de las cuotas ante atraso, desde UCU entendemos que esa cláusula es abusiva y puede plantearse ante la justicia, explicando que estás en condiciones de abonar las cuotas atrasadas más intereses.',
      },
    ],
  },
  {
    title: 'Liquidación final',
    items: [
      {
        question: 'Si dejo de pagar mi plan, ¿puedo retirar los fondos?',
        answer:
          'Sí. Si pagaste más de tres cuotas te corresponden los fondos una vez finalizado el plan (puede haber varios años de espera). La administradora tiene 40 días para ponerlos a tu disposición y debe notificarte.',
      },
      {
        question: '¿Qué conceptos me pueden descontar en la liquidación del plan?',
        answer:
          'Según el art. 25.3.4 de la Resolución IGJ 8/15, las entidades administradoras solo pueden deducir del haber de reintegro los conceptos expresamente previstos en la normativa. Cualquier otro descuento debe analizarse con criterio.',
      },
      {
        question: '¿Por qué me reconocen solo un porcentaje del haber neto?',
        answer:
          'Las empresas administradoras —en violación a la normativa— descuentan de los haberes netos las sumas no recuperadas por mora de otros ahorristas. Queda la posibilidad de acción legal o esperar las liquidaciones complementarias.',
      },
      {
        question: '¿Qué son las liquidaciones complementarias?',
        answer:
          'Son las sumas puestas a disposición correspondientes al dinero adeudado por deudores del grupo que sacaron el auto y no pagaron en tiempo y forma sus créditos prendarios.',
      },
      {
        question: '¿Por qué me descuentan derecho de admisión y/o sellados?',
        answer:
          'Probablemente al ingresar firmaste anexos autorizando el pago prorrateado a lo largo del plan. Si quedaron cuotas sin abonar, la administradora las descuenta al liquidar. Desde UCU sostenemos que es una práctica abusiva.',
      },
      {
        question: 'No me enviaron la liquidación final, ¿qué puedo hacer?',
        answer:
          'Intimá de inmediato a la empresa administradora. Este derecho no puede restringirse: hace al derecho de información de los consumidores.',
      },
      {
        question: '¿Hay una sanción por la falta de pago en tiempo?',
        answer:
          'La Resolución IGJ 8/15 prevé que los fondos no puestos a disposición en forma fehaciente devengan interés compensatorio más interés punitorio adicional hasta cumplir con la notificación fehaciente.',
      },
      {
        question: '¿Qué es el fondo de multas?',
        answer:
          'Es una suma que se forma con las multas cobradas a renunciantes y rescindidos (entre 2% y 4% sobre la liquidación final al cierre del grupo).',
      },
      {
        question: '¿Me corresponde cobrar el fondo de multas?',
        answer:
          'El fondo se reparte entre quienes fueron adjudicados del vehículo, lo cual resulta discriminatorio frente a quienes abonaron todo y no retiraron unidad. Los ahorristas pueden iniciar reclamo judicial.',
      },
      {
        question: '¿Qué hacer si no me pagaron el fondo de multas?',
        answer:
          'Enviá una intimación solicitando la liquidación y el pago correspondiente. Ante silencio, iniciá reclamo judicial con daños y perjuicios.',
      },
      {
        question: '¿Qué son los remanentes y cómo puedo cobrarlos?',
        answer:
          'Es cualquier suma que quede en el patrimonio del grupo luego de cancelar las deudas por el pago de haberes a los ahorristas.',
      },
    ],
  },
];
