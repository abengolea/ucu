export type ModuleSection = {
  heading: string;
  text: string;
};

export type ModuleQuiz = {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
};

export type ModuleCta = {
  label: string;
  href: string;
};

export type EducationModule = {
  id: number;
  title: string;
  subtitle: string;
  urgency: string;
  icon:
    | 'clipboard'
    | 'trending-down'
    | 'credit-card'
    | 'alert'
    | 'shopping'
    | 'shield'
    | 'megaphone'
    | 'scale';
  content: {
    intro: string;
    caseStudy: {
      title: string;
      text: string;
    };
    sections: ModuleSection[];
    actions: string[];
    quiz: ModuleQuiz;
    cta?: ModuleCta;
  };
};

export const EDUCATION_MODULES: EducationModule[] = [
  {
    id: 1,
    icon: 'clipboard',
    title: 'El mapa de tu plata',
    subtitle: 'Presupuesto real',
    urgency: 'Si no sabés a dónde se va el sueldo',
    content: {
      intro:
        'Sin mapa, cualquier “ahorro” es ilusión. En Argentina el mes se come solo: el punto no es castigarte, es ver números antes de que el resumen te sorprenda.',
      caseStudy: {
        title: 'Caso: Lucía, sueldo $650.000',
        text: 'Alquila, tiene prepaga, dos hijos en colegio y usa la tarjeta “para llegar”. A fin de mes “no le sobra nada”, pero no sabe cuánto se fue en delivery, cuotas y efectivo. Anota 30 días: descubre $95.000 en gastos chicos y tres cuotas que olvidó. Recién ahí puede decidir qué cortar.',
      },
      sections: [
        {
          heading: 'Primero contá, después juzgues',
          text: 'Durante un mes registrá todo: transferencia, débito, efectivo y cuotas que ya firmaste. Separá fijos (alquiler, servicios, prepaga, transporte, cuotas) de variables (comida, salidas, ropa). El shock de ver la lista es el primer ahorro.',
        },
        {
          heading: 'Regla útil en inflación alta',
          text: 'Olvidate del 50/30/20 de manual extranjero si no te cierra. Apuntá a: 1) cubrir fijos sin refinanciar, 2) dejar un % aunque sea chico para colchón, 3) que los gustos no se paguen con deuda cara. Si el fijo ya te come el 80%, el problema no es “disciplina”: hay que renegociar gastos o ingresos.',
        },
        {
          heading: 'Usá la calculadora de ahorro',
          text: 'En Herramientas → “¿Cuánto puedo ahorrar?” cargá tu ingreso y gastos. Te estima el margen y cuánto tardarías en armar 3 meses de emergencia. Los montos de ejemplo son orientativos: usá los tuyos.',
        },
      ],
      actions: [
        'Anotá 7 días de gastos (app, planilla o cuaderno).',
        'Listá todas las cuotas vigentes y su vencimiento.',
        'Probá la calculadora de capacidad de ahorro con tus números.',
      ],
      quiz: {
        question: 'Lucía “no llega” pero no registra gastos. ¿Cuál es el primer paso útil?',
        options: [
          'Pedir un préstamo para “acomodarse”',
          'Anotar ingresos, fijos, variables y cuotas un mes',
          'Pasar todo a dólares sin mirar el presupuesto',
        ],
        correct: 1,
        explanation:
          'Sin registro no hay decisión: primero medir. El crédito o la dolarización sin mapa suelen agravar el agujero.',
      },
    },
  },
  {
    id: 2,
    icon: 'trending-down',
    title: 'Inflación en la práctica',
    subtitle: 'Poder de compra',
    urgency: 'Si tu plata “se achica” aunque no la gastes',
    content: {
      intro:
        'La inflación no es una noticia: es el impuesto silencioso sobre el efectivo parado y sobre las tasas “lindas” que en realidad pierden contra los precios.',
      caseStudy: {
        title: 'Caso: Jorge y el plazo fijo',
        text: 'Jorge pone $500.000 a 30 días porque “rinde”. La tasa nominal se ve bien en pesos, pero la inflación del período es más alta. Al vencimiento tiene más billetes… y compra menos. Recién cuando mira tasa real entiende que “ganar” en el extracto no es ganar en el súper.',
      },
      sections: [
        {
          heading: 'Tasa nominal vs. tasa real',
          text: 'Nominal: lo que te anuncian. Real: lo que te queda después de la inflación. Aprox.: nominal − inflación. Más preciso: (1+nominal)/(1+inflación) − 1. Si da negativo, tu poder de compra baja aunque el saldo suba.',
        },
        {
          heading: 'Qué mirar antes de “estacionar” plata',
          text: 'Compará el rendimiento con una inflación estimada del mismo plazo. Opciones que suelen usarse para no perder tanto: cuentas remuneradas, FCI money market, plazo fijo UVA (ajusta por CER). Ninguna es mágica ni riesgo cero: leé costos y plazos de salida.',
        },
        {
          heading: 'Dólar: herramienta, no religión',
          text: 'Muchos se cubren comprando dólar MEP por cuenta comitente (vía legal). Sirve como cobertura de largo plazo, no como excusa para no tener un colchón líquido en pesos para gastos del mes. Usá la calculadora de tasa real con tus %.',
        },
      ],
      actions: [
        'Anotá la tasa de tu plazo fijo o cuenta y una inflación mensual estimada.',
        'Corré la calculadora “¿Mi plazo fijo me gana a la inflación?”.',
        'Revisá si tenés plata “parada” en cuenta sin remunerar.',
      ],
      quiz: {
        question: 'Un plazo fijo rinde 3% mensual y la inflación del mes es 4%. ¿Qué pasó?',
        options: [
          'Ganó poder de compra',
          'Perdió poder de compra (tasa real negativa)',
          'Da igual: en pesos tiene más',
        ],
        correct: 1,
        explanation:
          'Más pesos no implica más poder de compra. Con inflación mayor a la tasa, perdés en términos reales.',
      },
    },
  },
  {
    id: 3,
    icon: 'credit-card',
    title: 'Leer el resumen de tarjeta',
    subtitle: 'TNA, CFT y trampa chica',
    urgency: 'Si el resumen te confunde o te asusta',
    content: {
      intro:
        'El resumen no es un trámite: es el contrato del mes. Ahí está escrito cuánto te cobran de verdad si no cerrás el saldo.',
      caseStudy: {
        title: 'Caso: Ana y el “mínimo conveniente”',
        text: 'Ana debía $220.000. El mínimo parecía “bajo” y lo pagó tres meses. Cuando sumó intereses, seguros y gastos, la deuda había crecido. Nadie le explicó que el % de financiación del resumen (TNA/TEA) era el precio de postergar.',
      },
      sections: [
        {
          heading: 'Tres líneas que tenés que encontrar',
          text: '1) Saldo de cierre / total a pagar. 2) Pago mínimo. 3) Tasas: financiación, punitorios, TNA, TEA y —si figura— CFT. También mirá fecha de vencimiento y fecha de cierre (comprar después del cierre empuja al próximo resumen).',
        },
        {
          heading: 'TNA, TEA y CFT en criollo',
          text: 'TNA: tasa nominal anual. TEA: efectiva anual (suele ser más alta). CFT: costo financiero total (intereses + seguros + comisiones). Para comparar un préstamo o una refinanciación, el CFT es más honesto que la “cuota linda”.',
        },
        {
          heading: 'Señales de alerta',
          text: 'Pago mínimo que casi no baja el capital; refinanciación automática; seguros que no pediste; “planes de pago” con CFT enorme. Si hay cobros dudosos o no te dan información clara, podés reclamar.',
        },
      ],
      actions: [
        'Abrí el último resumen (PDF o app) y marcá saldo, mínimo y tasas.',
        'Probá la calculadora de pago mínimo con tu saldo y tu tasa.',
        'Si hay un cargo que no reconocés, guardá el resumen y consultá un reclamo.',
      ],
      quiz: {
        question: '¿Qué dato del resumen te dice mejor el costo real de financiarte?',
        options: [
          'Solo el pago mínimo',
          'El CFT (y si no está, TNA/TEA de financiación)',
          'El diseño de la app del banco',
        ],
        correct: 1,
        explanation:
          'El mínimo es una trampa de liquidez. El costo real está en las tasas y, mejor aún, en el CFT.',
      },
      cta: {
        label: '¿Te cobraron mal? Ir a reclamos',
        href: '/reclamos',
      },
    },
  },
  {
    id: 4,
    icon: 'alert',
    title: 'La trampa del pago mínimo',
    subtitle: 'Deudas caras',
    urgency: 'Si venís pagando solo el mínimo',
    content: {
      intro:
        'Pagar el mínimo no es “estar al día”: es firmar una cuota cara todos los meses. En Argentina esas tasas pueden volatilizar cualquier presupuesto.',
      caseStudy: {
        title: 'Caso: Martín debe $100.000',
        text: 'Interés mensual alto y mínimo del 5%. Como el mínimo no cubre los intereses, la deuda crece aunque “pague todos los meses”. Cuando simula en la calculadora, entiende que necesita un plan de pago por encima del interés — o consolidar en mejores condiciones.',
      },
      sections: [
        {
          heading: 'Deuda útil vs. deuda que te come',
          text: 'Útil: te deja un activo o ingreso (hipoteca razonable, stock para un monotributo). Cara: consumo con tarjeta refinanciada, “adelantos” y planes eternos. La prioridad es matar primero la deuda con mayor tasa.',
        },
        {
          heading: 'Plan de salida práctico',
          text: '1) Dejá de sumar compras a esa tarjeta. 2) Pagá siempre más que los intereses del mes. 3) Ordená deudas: avalancha (la más cara primero) o bola de nieve (la más chica primero, por motivación). 4) Pedí al banco el CFT de cualquier refinanciación antes de firmar.',
        },
        {
          heading: 'Si no te dejan cancelar o te empujan a refinanciar',
          text: 'Pedí por escrito el detalle de deuda y tasas. Grabá/guardá ofertas. Si hay abuso, cláusulas engañosas o cobranzas agresivas, UCU puede ayudarte a reclamar.',
        },
      ],
      actions: [
        'Simulá tu caso en “¿Qué pasa si pago el mínimo?”.',
        'Fijá un monto de pago > intereses y anotalo como fijo del mes.',
        'Cortá nuevas compras en esa tarjeta hasta salir.',
      ],
      quiz: {
        question: 'El pago mínimo es menor que el interés del mes. ¿Qué conviene?',
        options: [
          'Seguir así: “al menos pago algo”',
          'Pagar más que los intereses (ideal: el total) y frenar compras nuevas',
          'Sacar otra tarjeta para pagar esta',
        ],
        correct: 1,
        explanation:
          'Si el mínimo no cubre intereses, la deuda crece. Otra tarjeta suele ser la misma trampa con otro logo.',
      },
      cta: {
        label: 'Abrir calculadora de pago mínimo',
        href: '#calculadoras-pago-minimo',
      },
    },
  },
  {
    id: 5,
    icon: 'shopping',
    title: 'Cuotas vs. contado',
    subtitle: 'El precio escondido',
    urgency: 'Si te ofrecen “sin interés” o descuento de contado',
    content: {
      intro:
        'En el comercio argentino el interés a menudo viene metido en el precio de lista. La pregunta no es “¿tengo cuotas?”, es “¿cuánto me sale cada camino?”.',
      caseStudy: {
        title: 'Caso: un televisor “12 sin interés”',
        text: 'Lista $200.000 en 12 cuotas. De contado hay 15% off. Las cuotas “sin interés” salen $200.000; el contado, $170.000. La diferencia es el costo de financiar — aunque el cartel diga cero.',
      },
      sections: [
        {
          heading: 'Regla rápida',
          text: 'Pedí siempre: precio de contado (con descuento) y precio total en cuotas. Si el contado es más barato, las cuotas tienen costo. Si son iguales, igual puede haber costo de oportunidad (esa plata podría ir al colchón o a cancelar deuda cara).',
        },
        {
          heading: 'Cuándo las cuotas sí pueden servir',
          text: 'Si el precio de contado y el de cuotas es el mismo (verdadero 0%), no te descapitalizan, y no tenés deuda de tarjeta cara pendiente. Evitá cuotas si ya vas a mínimo en la tarjeta: estás mezclando dos deudas.',
        },
        {
          heading: 'Calculalo, no lo intuyas',
          text: 'Usá “¿Cuotas o pagar de contado?”. Cargá lista, descuento, cantidad de cuotas e interés por cuota si lo hubiera. El resultado te dice quién gana en plata — no en marketing.',
        },
      ],
      actions: [
        'Antes de comprar, pedí precio contado vs. total financiado.',
        'Corré la calculadora de cuotas vs. contado.',
        'Si la diferencia es chica pero tenés deuda cara, priorizá salir de la deuda.',
      ],
      quiz: {
        question: 'Lista $200.000 en 12 cuotas; contado 15% off. ¿Qué implica?',
        options: [
          'Las cuotas son gratis porque dicen “sin interés”',
          'Financiar cuesta la diferencia respecto del contado',
          'Siempre conviene el máximo de cuotas',
        ],
        correct: 1,
        explanation:
          'El cartel “sin interés” no borra el descuento de contado perdido: esa diferencia es el costo de financiar.',
      },
    },
  },
  {
    id: 6,
    icon: 'shield',
    title: 'Colchón de emergencia',
    subtitle: 'Antes de “invertir”',
    urgency: 'Si un imprevisto te manda a la tarjeta',
    content: {
      intro:
        'El fondo de emergencia es aburrido y te salva. Sin él, cada arreglo de auto o falta de laburo termina en la tasa más cara del sistema: la tarjeta.',
      caseStudy: {
        title: 'Caso: Sofía y el dental de urgencia',
        text: 'Sin colchón, Sofía financió $180.000 en la tarjeta. En seis meses pagó mucho más. Si hubiera tenido 2–3 meses de gastos en un lugar líquido, el mismo golpe no le generaba deuda cara.',
      },
      sections: [
        {
          heading: '¿Cuánto y dónde?',
          text: 'Meta realista: 3 meses de gastos fijos (ideal 6). Tiene que ser líquido: cuenta remunerada, FCI money market, o instrumentos de corto plazo que puedas rescatar rápido. Rendimiento alto con trabas no sirve para emergencias.',
        },
        {
          heading: 'Cómo armarlo sin heroísmo',
          text: 'Automatizá un transfer el día de cobro — aunque sea chico. Subí el monto cuando canceles una cuota. No lo mezcles con “inversión” de largo plazo ni con el sueldo de la semana.',
        },
        {
          heading: 'Orden sugerido',
          text: '1) Presupuesto. 2) Frenar deuda cara. 3) Colchón mínimo. 4) Recién ahí pensar inversiones de mayor riesgo. Invertir con la tarjeta al rojo es ruleta.',
        },
      ],
      actions: [
        'Calculá 3 × tus gastos fijos mensuales.',
        'Abrí o elegí una cuenta/FCI líquido para el colchón.',
        'Programá un monto automático el día de cobro.',
      ],
      quiz: {
        question: '¿Qué prioridad tiene el fondo de emergencia?',
        options: [
          'Que rinda lo máximo posible',
          'Que sea accesible rápido cuando hace falta',
          'Que esté todo en un solo plazo fijo a 1 año',
        ],
        correct: 1,
        explanation:
          'En una emergencia necesitás liquidez. El rendimiento importa después de poder sacar la plata.',
      },
    },
  },
  {
    id: 7,
    icon: 'megaphone',
    title: 'Compromisos a largo plazo',
    subtitle: 'Planes y letras chicas',
    urgency: 'Si te ofrecen plan de ahorro, suscripción o crédito largo',
    content: {
      intro:
        'Lo que firmás hoy te puede atar años. En Argentina, los planes de ahorro automotor son uno de los conflictos más denunciados por consumidores: cuotas que se disparan, falta de transparencia y reglas difíciles de salir.',
      caseStudy: {
        title: 'Caso: el “ahorro” que no era ahorro',
        text: 'Te venden un plan como “forma de ahorrar para el 0km”. Con el tiempo la cuota se actualiza, los gastos administrativos pesan y cancelar sale caro o imposible en la práctica. No es un plazo fijo: es un contrato complejo.',
      },
      sections: [
        {
          heading: 'Preguntas antes de firmar cualquier plan',
          text: '¿Cuál es el CFT o el costo total estimado? ¿Qué pasa si dejo de pagar? ¿Puedo transferir o cancelar? ¿Quién fija las actualizaciones? ¿Hay seguros obligatorios? Si no hay respuesta clara por escrito, no firmes.',
        },
        {
          heading: 'Planes de ahorro automotor',
          text: 'UCU lleva una campaña nacional porque miles de ahorristas denuncian abusos del sistema. Si estás en un plan o te lo ofrecen, informate en la campaña antes de seguir metiendo plata.',
        },
        {
          heading: 'Otras trampas de largo plazo',
          text: 'Suscripciones que se renuevan solas, créditos con cuota “teaser”, seguros bundlados en la tarjeta. Pedí siempre el costo de salida y el medio de baja.',
        },
      ],
      actions: [
        'No firmes de apuro: pedí el contrato y leélo en casa.',
        'Si ya estás en un plan de ahorro, revisá la campaña y recursos de UCU.',
        'Guardá mails, vouchers y comprobantes de pago.',
      ],
      quiz: {
        question: 'Te ofrecen un plan de ahorro para un auto. ¿Qué es lo más sensato?',
        options: [
          'Firmar ya para “no perder la promo”',
          'Pedir contrato, costos de salida y asesorarte antes',
          'Pagar el mínimo de la tarjeta para cubrir la cuota',
        ],
        correct: 1,
        explanation:
          'Las urgencias comerciales son del vendedor. Vos necesitás el contrato y el costo de salir antes de comprometer años de ingreso.',
      },
      cta: {
        label: 'Ver campaña planes de ahorro',
        href: '/planes-de-ahorro-son-una-trampa',
      },
    },
  },
  {
    id: 8,
    icon: 'scale',
    title: 'Tus derechos (y cuándo reclamar)',
    subtitle: 'De educación a acción',
    urgency: 'Si una empresa te está perjudicando',
    content: {
      intro:
        'Educación financiera sin derechos es mitad de la historia. Como consumidor en Argentina tenés herramientas: información clara, trato digno, y vías de reclamo cuando hay abuso.',
      caseStudy: {
        title: 'Caso: un seguro que nadie pidió',
        text: 'Aparece un cargo mensual en la tarjeta. El banco dice “está en los términos”. Pedís baja y no responden. Con el resumen, el reclamo por escrito y respaldo de una organización de consumidores, el caso avanza: sin evidencia, se diluye.',
      },
      sections: [
        {
          heading: 'Derechos básicos (versión cocina)',
          text: 'Derecho a información clara y veraz; a no ser engañado con publicidad engañosa; a un trato digno; a reclamar y obtener respuesta. El precio y las condiciones tienen que poder entenderse antes de pagar.',
        },
        {
          heading: 'Armá el legajo antes de pelear',
          text: 'Resúmenes, capturas, contratos, mails, número de reclamo interno de la empresa, fechas. Sin papeles, es tu palabra contra un call center eterno.',
        },
        {
          heading: 'UCU está para eso',
          text: 'Si el banco, el comercio, la prepaga o la administradora no resuelve, podés iniciar un reclamo con Usuarios Protegidos y hacer seguimiento online. La educación termina en acción.',
        },
      ],
      actions: [
        'Identificá el problema en una frase y juntá comprobantes.',
        'Hacé el reclamo interno a la empresa y pedí número de gestión.',
        'Si no hay respuesta útil, iniciá el reclamo en UCU.',
      ],
      quiz: {
        question: 'Te cobraron un servicio que no contrataste. ¿Qué orden conviene?',
        options: [
          'Ignorarlo un par de meses',
          'Juntar pruebas, reclamar a la empresa y, si hace falta, a UCU',
          'Sacar un préstamo para “taparlo”',
        ],
        correct: 1,
        explanation:
          'Primero evidencia y reclamo formal. Taparlo con más deuda o dejar pasar el tiempo suele empeorar el caso.',
      },
      cta: {
        label: 'Iniciar o consultar un reclamo',
        href: '/reclamos',
      },
    },
  },
];

export const GLOSSARY = [
  {
    term: 'TNA',
    definition: 'Tasa Nominal Anual. Es la tasa de interés anunciada por año, sin capitalizar.',
  },
  {
    term: 'TEA',
    definition: 'Tasa Efectiva Anual. Incluye el efecto de la capitalización; suele ser más alta que la TNA.',
  },
  {
    term: 'CFT',
    definition:
      'Costo Financiero Total. Lo que realmente te cuesta un crédito: intereses, seguros, gastos y comisiones.',
  },
  {
    term: 'UVA',
    definition:
      'Unidad de Valor Adquisitivo. Se actualiza con la inflación (CER). Usada en plazos fijos e hipotecarios.',
  },
  {
    term: 'CER',
    definition: 'Coeficiente de Estabilización de Referencia. Indexa instrumentos a la inflación oficial.',
  },
  {
    term: 'Cedear',
    definition:
      'Certificado de Depósito Argentino. Representa acciones del exterior y se opera en pesos en el mercado local.',
  },
  {
    term: 'FCI',
    definition:
      'Fondo Común de Inversión. Pool de plata administrado; hay de bajo riesgo (money market) y de mayor riesgo.',
  },
  {
    term: 'Pago mínimo',
    definition:
      'El monto más bajo que acepta la tarjeta. El resto genera intereses muy altos. Conviene pagar el total.',
  },
  {
    term: 'Refinanciación',
    definition:
      'Pasar el saldo a un plan de cuotas. Pedí siempre el CFT: a veces “alivia” el mes y encarece el total.',
  },
] as const;
