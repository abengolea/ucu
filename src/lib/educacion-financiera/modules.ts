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

export type EducationModule = {
  id: number;
  title: string;
  subtitle: string;
  icon: 'coins' | 'clipboard' | 'shield' | 'trending-down' | 'credit-card' | 'trending-up';
  content: {
    intro: string;
    sections: ModuleSection[];
    quiz: ModuleQuiz;
  };
};

export const EDUCATION_MODULES: EducationModule[] = [
  {
    id: 1,
    icon: 'coins',
    title: '¿Qué es el dinero?',
    subtitle: 'Los cimientos',
    content: {
      intro:
        'El dinero es una herramienta que usamos todos los días. Entender cómo funciona es el primer paso para tomar mejores decisiones.',
      sections: [
        {
          heading: 'Funciones del dinero',
          text: 'El dinero cumple tres funciones: medio de intercambio (comprás y vendés), unidad de cuenta (ponés precio a las cosas) y reserva de valor (ahorrás para después). En Argentina, la inflación afecta especialmente esta última función.',
        },
        {
          heading: 'El peso argentino hoy',
          text: 'Argentina convive con inflación alta. Esto significa que $1.000 hoy compran menos que hace un año. Por eso es clave entender cómo proteger el valor de tu plata.',
        },
        {
          heading: 'Ingreso vs. gasto',
          text: 'Tu ingreso es toda la plata que entra (sueldo, changas, ventas). Tu gasto es todo lo que sale. La diferencia es tu capacidad de ahorro. Si gastás más de lo que ganás, estás en problemas.',
        },
      ],
      quiz: {
        question: '¿Cuál de estas funciones del dinero se ve más afectada por la inflación?',
        options: ['Medio de intercambio', 'Unidad de cuenta', 'Reserva de valor'],
        correct: 2,
        explanation:
          'La inflación hace que el dinero pierda poder de compra con el tiempo, afectando directamente su función como reserva de valor.',
      },
    },
  },
  {
    id: 2,
    icon: 'clipboard',
    title: 'Tu presupuesto personal',
    subtitle: 'Organizá tu plata',
    content: {
      intro:
        'Un presupuesto no es una restricción, es un mapa. Te muestra a dónde va tu plata para que vos decidas si querés que vaya ahí.',
      sections: [
        {
          heading: 'La regla 50/30/20 adaptada',
          text: 'En países estables se recomienda 50% necesidades, 30% gustos, 20% ahorro. En Argentina, con inflación alta, muchos necesitan ajustar: 60% necesidades, 25% gustos, 15% ahorro. Lo importante es que exista una proporción para ahorro.',
        },
        {
          heading: 'Gastos fijos vs. variables',
          text: 'Fijos: alquiler, servicios, transporte, cuota del colegio. Variables: comida, salidas, ropa. Anotá todo durante un mes. La mayoría se sorprende al ver en qué gasta.',
        },
        {
          heading: 'Herramientas gratuitas',
          text: 'Podés usar una planilla de Excel, Google Sheets, o apps como Mobills o Wallet. También sirve un cuaderno. Lo importante es el hábito de registrar, no la herramienta.',
        },
      ],
      quiz: {
        question: '¿Qué porcentaje mínimo deberías intentar destinar al ahorro?',
        options: [
          '0% — con inflación no tiene sentido',
          '10-15% — algo siempre se puede guardar',
          '50% — hay que ahorrar la mitad',
        ],
        correct: 1,
        explanation:
          'Aunque la inflación es alta, destinar entre un 10% y 15% al ahorro (protegiéndolo de la inflación) es fundamental para construir un colchón financiero.',
      },
    },
  },
  {
    id: 3,
    icon: 'shield',
    title: 'Fondo de emergencia',
    subtitle: 'Tu red de seguridad',
    content: {
      intro:
        'Antes de pensar en invertir, necesitás un colchón para imprevistos. Es tu primera línea de defensa financiera.',
      sections: [
        {
          heading: '¿Cuánto necesitás?',
          text: 'El ideal es tener entre 3 y 6 meses de gastos fijos cubiertos. Si ganás $500.000 y gastás $400.000 por mes, tu fondo debería ser entre $1.200.000 y $2.400.000. Empezá de a poco.',
        },
        {
          heading: '¿Dónde guardarlo?',
          text: 'Tiene que ser líquido (que lo puedas sacar rápido) y que no pierda tanto valor. Opciones: cuenta remunerada, FCI money market (fondos comunes de inversión de corto plazo), o plazo fijo UVA a 90 días.',
        },
        {
          heading: 'Armalo de a poco',
          text: 'No necesitás juntarlo todo de una. Automatizá una transferencia apenas cobrás. $10.000 por mes ya suman $120.000 en un año, más los intereses.',
        },
      ],
      quiz: {
        question: '¿Qué característica es la más importante para tu fondo de emergencia?',
        options: ['Que rinda mucho', 'Que sea líquido y accesible', 'Que esté en dólares'],
        correct: 1,
        explanation:
          'Lo más importante del fondo de emergencia es poder acceder a él rápidamente cuando lo necesités. La liquidez es prioridad sobre el rendimiento.',
      },
    },
  },
  {
    id: 4,
    icon: 'trending-down',
    title: 'Inflación y cómo protegerte',
    subtitle: 'El desafío argentino',
    content: {
      intro:
        'La inflación es el aumento sostenido de los precios. En Argentina es un fenómeno crónico que afecta todas tus decisiones financieras.',
      sections: [
        {
          heading: 'Tasa de interés real',
          text: 'Si un plazo fijo te da 5% mensual pero la inflación es 6%, estás perdiendo 1% de poder de compra. La tasa real = tasa nominal − inflación. Si es negativa, tu plata se achica.',
        },
        {
          heading: 'Instrumentos que ajustan por inflación',
          text: 'El plazo fijo UVA ajusta por CER (inflación). Los bonos CER del Estado también. Los FCI que invierten en estos instrumentos son otra opción accesible desde apps como Mercado Pago, Ualá o tu banco.',
        },
        {
          heading: 'Dolarización del ahorro',
          text: 'Muchos argentinos ahorran en dólares. Podés comprar dólar MEP de forma legal a través de una cuenta comitente (en un banco o broker como IOL, Balanz, etc). Es una forma de proteger el valor de tus ahorros.',
        },
      ],
      quiz: {
        question: 'Si un plazo fijo rinde 4% mensual y la inflación es 5%, ¿qué pasa con tu plata?',
        options: ['Gana poder de compra', 'Pierde poder de compra', 'Se mantiene igual'],
        correct: 1,
        explanation:
          'Con una tasa real negativa (4% − 5% = −1%), tu dinero pierde poder de compra aunque nominalmente tengas más pesos.',
      },
    },
  },
  {
    id: 5,
    icon: 'credit-card',
    title: 'Deudas y crédito',
    subtitle: 'Usá el crédito a tu favor',
    content: {
      intro:
        'Las deudas no son malas en sí mismas. Lo que importa es el tipo de deuda, la tasa y si podés pagarla.',
      sections: [
        {
          heading: 'Deuda buena vs. deuda mala',
          text: 'Deuda buena: te genera un ingreso o un activo (ej: crédito hipotecario, préstamo para tu negocio). Deuda mala: financia consumo que no podés pagar (ej: pagar el mínimo de la tarjeta para comprar cosas que no necesitás).',
        },
        {
          heading: 'La trampa del pago mínimo',
          text: 'Si pagás solo el mínimo de la tarjeta de crédito, el resto acumula intereses altísimos (pueden superar el 150% anual). Un gasto de $100.000 puede terminar costándote $250.000 o más.',
        },
        {
          heading: 'Cómo salir de deudas',
          text: 'Método bola de nieve: ordená tus deudas de menor a mayor y pagá primero la más chica. Cada deuda que eliminás te libera plata para la siguiente. También podés negociar con el banco una refinanciación.',
        },
      ],
      quiz: {
        question: '¿Cuál es la peor estrategia con la tarjeta de crédito?',
        options: [
          'Pagar el total cada mes',
          'Pagar solo el mínimo siempre',
          'Usarla para compras en cuotas sin interés',
        ],
        correct: 1,
        explanation:
          'Pagar solo el mínimo genera intereses sobre el saldo, que en Argentina pueden ser extremadamente altos. Siempre conviene pagar el total.',
      },
    },
  },
  {
    id: 6,
    icon: 'trending-up',
    title: 'Primeras inversiones',
    subtitle: 'Hacé crecer tu plata',
    content: {
      intro:
        'Una vez que tenés presupuesto, fondo de emergencia y sin deudas caras, podés empezar a invertir. No necesitás ser millonario para arrancar.',
      sections: [
        {
          heading: '¿Dónde empezar?',
          text: 'Abrí una cuenta comitente en un broker (IOL, Balanz, PPI, Cocos Capital, etc.) o usá la sección de inversiones de Mercado Pago o tu banco. Desde ahí podés acceder a fondos, bonos, acciones y cedears.',
        },
        {
          heading: 'Opciones para principiantes',
          text: 'FCI Money Market: riesgo muy bajo, liquidez inmediata. Plazo fijo UVA: protege contra inflación. Cedears: acciones de empresas del exterior que cotizan en pesos en Argentina. Obligaciones Negociables: deuda de empresas, suelen pagar en dólares.',
        },
        {
          heading: 'Diversificar',
          text: 'No pongas todos los huevos en la misma canasta. Una cartera simple podría ser: 40% en pesos (FCI/plazo fijo UVA), 40% en dólares (dólar MEP, cedears), 20% en renta variable local o internacional.',
        },
      ],
      quiz: {
        question: '¿Qué son los Cedears?',
        options: [
          'Bonos del gobierno argentino',
          'Certificados que representan acciones extranjeras',
          'Plazos fijos especiales',
        ],
        correct: 1,
        explanation:
          'Los Cedears (Certificados de Depósito Argentinos) permiten invertir en acciones de empresas del exterior (Apple, Google, etc.) operando en pesos desde Argentina.',
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
    definition: 'Unidad de Valor Adquisitivo. Se actualiza con la inflación (CER). Usada en plazos fijos e hipotecarios.',
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
    definition: 'Fondo Común de Inversión. Pool de plata administrado; hay de bajo riesgo (money market) y de mayor riesgo.',
  },
  {
    term: 'Pago mínimo',
    definition:
      'El monto más bajo que acepta la tarjeta. El resto genera intereses muy altos. Conviene pagar el total.',
  },
] as const;
