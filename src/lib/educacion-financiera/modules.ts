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

export type OfficialResource = {
  label: string;
  href: string;
  source: string;
};

export type EducationModule = {
  id: number;
  title: string;
  subtitle: string;
  urgency: string;
  icon:
    | 'clipboard'
    | 'piggy'
    | 'credit-card'
    | 'wallet'
    | 'trending-up'
    | 'receipt'
    | 'percent'
    | 'alert';
  content: {
    intro: string;
    caseStudy: { title: string; text: string };
    sections: ModuleSection[];
    actions: string[];
    resources: OfficialResource[];
    quiz: ModuleQuiz;
    cta?: ModuleCta;
  };
};

export const EDUCATION_MODULES: EducationModule[] = [
  {
    id: 1,
    icon: 'clipboard',
    title: 'Salud financiera y presupuesto',
    subtitle: 'Ordená el mes',
    urgency: 'Si no sabés a dónde se va el sueldo',
    content: {
      intro:
        'La salud financiera empieza por ver números sin juzgarte. Distinguir ingresos, gastos fijos, variables y “hormiga” es el primer paso para decidir, no para castigarte.',
      caseStudy: {
        title: 'Caso: Lucía y los gastos hormiga',
        text: 'Sueldo estable, alquiler y prepaga al día. “No le sobra nada”, pero no registra. En 30 días aparece: delivery, suscripciones y efectivo sin control por casi $90.000. Recién con la planilla puede cortar tres ítems y armar un margen mínimo.',
      },
      sections: [
        {
          heading: 'Ingresos, necesidades y deseos',
          text: 'Separá ingresos periódicos (sueldo, jubilación, changa fija) de esporádicos. Clasificá gastos en necesidades, deseos y obligaciones (cuotas, deudas). Lo que no se nombra, se come solo.',
        },
        {
          heading: 'Gastos hormiga',
          text: 'Son montos chicos y repetidos: café, apps, envíos, “una compra más”. No son pecados: son datos. Sumalos un mes y decidí cuáles vale la pena mantener.',
        },
        {
          heading: 'Plantilla + calculadora',
          text: 'Completá la plantilla de presupuesto de este curso y usá la calculadora “¿Cuánto puedo ahorrar?”. Los ejemplos son orientativos: cargá tus montos reales.',
        },
      ],
      actions: [
        'Descargá/imprimí la plantilla de presupuesto y completala con el mes actual.',
        'Listá fijos, variables y cuotas vigentes.',
        'Probá la calculadora de capacidad de ahorro.',
      ],
      resources: [
        {
          label: 'Presupuesto e inclusión financiera (Ministerio de Economía)',
          href: 'https://www.argentina.gob.ar/economia/inclusion-financiera',
          source: 'Ministerio de Economía',
        },
        {
          label: 'Educación financiera BCRA',
          href: 'https://www.bcra.gob.ar/BCRAyVos/Educacion_Financiera.asp',
          source: 'BCRA',
        },
      ],
      quiz: {
        question: '¿Cuál es el primer paso útil si “no llegás” pero no registrás gastos?',
        options: [
          'Pedir un préstamo para acomodarte',
          'Anotar ingresos, fijos, variables y gastos hormiga un mes',
          'Pasar todo a dólares sin mirar el presupuesto',
        ],
        correct: 1,
        explanation:
          'Sin registro no hay decisión. El crédito o la dolarización sin mapa suelen agravar el agujero.',
      },
    },
  },
  {
    id: 2,
    icon: 'piggy',
    title: 'Ahorro y metas',
    subtitle: 'Fondo y horizonte',
    urgency: 'Si querés ahorrar pero se te escapa',
    content: {
      intro:
        'Ahorrar no es “lo que sobra”: es una decisión con meta y plazo. Antes de invertir, conviene tener capacidad de ahorro identificada y un colchón líquido.',
      caseStudy: {
        title: 'Caso: metas de Sofía',
        text: 'Quiere “ahorrar más” sin fecha. Separa tres horizontes: emergencia (3 meses de fijos), un electrodoméstico en 8 meses, y un objetivo a 3 años. Recién ahí el monto mensual deja de ser abstracto.',
      },
      sections: [
        {
          heading: 'Guardar, ahorrar e invertir',
          text: 'Guardar: plata disponible ya. Ahorrar: apartar con meta. Invertir: asumir riesgo a cambio de posible rentabilidad. Mezclar los tres sin orden suele terminar en la tarjeta.',
        },
        {
          heading: 'Fondo de emergencia',
          text: 'Meta realista: 3 meses de gastos fijos (ideal 6), en algo líquido (cuenta remunerada, FCI money market). Rendimiento alto con trabas no sirve para imprevistos.',
        },
        {
          heading: 'Automatizá el día de cobro',
          text: 'Un transfer automático —aunque sea chico— gana a la buena voluntad de fin de mes. Subí el monto cuando canceles una cuota.',
        },
      ],
      actions: [
        'Escribí 3 metas (corto / mediano / largo) con monto y plazo.',
        'Calculá 3 × tus gastos fijos para el colchón.',
        'Programá un ahorro automático el día de cobro.',
      ],
      resources: [
        {
          label: 'Inclusión financiera: ahorro',
          href: 'https://www.argentina.gob.ar/economia/inclusion-financiera',
          source: 'Ministerio de Economía',
        },
        {
          label: 'Comparador de tasas de plazo fijo (BCRA)',
          href: 'https://www.bcra.gob.ar/BCRAyVos/Comparador_de_tasas.asp',
          source: 'BCRA',
        },
      ],
      quiz: {
        question: '¿Qué prioridad tiene el fondo de emergencia?',
        options: [
          'Que rinda lo máximo posible',
          'Que sea accesible rápido cuando hace falta',
          'Dejarlo todo a un año sin poder tocarlo',
        ],
        correct: 1,
        explanation:
          'En una emergencia necesitás liquidez. El rendimiento importa después de poder sacar la plata.',
      },
    },
  },
  {
    id: 3,
    icon: 'credit-card',
    title: 'Deuda, crédito e historial',
    subtitle: 'Pagar sin ahogarte',
    urgency: 'Si venís refinanciando o pagando el mínimo',
    content: {
      intro:
        'El crédito puede ser herramienta o trampa. La clave es sostenibilidad: cuánto del ingreso se va en deudas, qué tasa pagás y qué dice tu historial.',
      caseStudy: {
        title: 'Caso: Martín y el mínimo',
        text: 'Debe en la tarjeta y paga solo el mínimo. El interés del mes supera lo que abona: la deuda crece “estando al día”. Con la calculadora y el CFT de una refinanciación entiende el costo real.',
      },
      sections: [
        {
          heading: 'Regla prudencial orientativa',
          text: 'Como guía general de educación financiera, conviene que el endeudamiento no se coma una porción excesiva del ingreso (en materiales oficiales suele mencionarse un umbral prudencial cercano al 40% de los ingresos mensuales). Si estás arriba, priorizá bajar deuda cara antes de nuevas cuotas.',
        },
        {
          heading: 'Leer el resumen: TNA, TEA, CFT y mínimo',
          text: 'Buscá saldo, pago mínimo, tasas de financiación y —si figura— CFT. El mínimo no es “estar bien”: es el piso que acepta el emisor. Usá la calculadora de pago mínimo con tu tasa (mensual o TNA del resumen).',
        },
        {
          heading: 'Historial y Central de Deudores',
          text: 'Conocer tu situación crediticia ayuda a negociar y a detectar errores. El BCRA publica información de la Central de Deudores y canales para consultar/rectificar. Si hay consumos desconocidos, impugnálos y guardá el reclamo.',
        },
      ],
      actions: [
        'Sumá cuotas del mes y comparalas con tu ingreso (¿cuánto % te comen?).',
        'Simulá “¿Qué pasa si pago el mínimo?” con tu resumen.',
        'Completá la plantilla de plan de deuda.',
      ],
      resources: [
        {
          label: 'Central de Deudores (BCRA)',
          href: 'https://www.bcra.gob.ar/BCRAyVos/Situacion_Crediticia.asp',
          source: 'BCRA',
        },
        {
          label: 'Protección al usuario de servicios financieros',
          href: 'https://www.bcra.gob.ar/BCRAyVos/Usuarios_Financieros.asp',
          source: 'BCRA',
        },
      ],
      quiz: {
        question: 'El pago mínimo es menor que el interés del mes. ¿Qué conviene?',
        options: [
          'Seguir así: al menos pago algo',
          'Pagar más que los intereses (ideal: el total) y frenar compras nuevas',
          'Sacar otra tarjeta para pagar esta',
        ],
        correct: 1,
        explanation:
          'Si el mínimo no cubre intereses, la deuda crece. Otra tarjeta suele repetir la misma trampa.',
      },
      cta: {
        label: 'Abrir calculadora de pago mínimo',
        href: '#calculadoras-pago-minimo',
      },
    },
  },
  {
    id: 4,
    icon: 'wallet',
    title: 'Cuentas y medios de pago',
    subtitle: 'Elegir y operar seguro',
    urgency: 'Si mezclás banco, billetera y no sabés costos',
    content: {
      intro:
        'Caja de ahorro, cuenta de pago, débito, crédito, CVU/CBU/Alias y billeteras: la meta es elegir con información y operar sin regalar claves.',
      caseStudy: {
        title: 'Caso: elegir entre banco y billetera',
        text: 'Ana cobra el sueldo en un banco con costos poco claros y usa una billetera para transferencias. Arma una ficha: comisiones, límites, atención al usuario y cómo cerrar la cuenta. Recién ahí decide dónde dejar el sueldo y el colchón.',
      },
      sections: [
        {
          heading: 'Cuenta bancaria vs. cuenta de pago',
          text: 'Ambas permiten recibir y enviar dinero, pero cambian costos, protección, red de extracción y reglas. Compará con datos del BCRA (comisiones) y leé el contrato antes de “aceptar todo”.',
        },
        {
          heading: 'CBU, CVU y Alias',
          text: 'Identifican tu cuenta para acreditar. El Alias facilita transferencias; no lo compartas en formularios dudosos. Verificá siempre el destinatario antes de confirmar.',
        },
        {
          heading: 'Seguridad básica',
          text: 'Ni el banco ni un organismo te piden clave, token ni datos por WhatsApp/mail. Homebanking y apps: enlaces oficiales, no los del mensaje urgente.',
        },
      ],
      actions: [
        'Anotá qué cuentas/billeteras usás y para qué.',
        'Revisá comisiones en el comparador del BCRA.',
        'Activá alertas de movimiento en tu app.',
      ],
      resources: [
        {
          label: 'Comparador de comisiones bancarias (BCRA)',
          href: 'https://www.bcra.gob.ar/BCRAyVos/Comparador_de_Comisiones.asp',
          source: 'BCRA',
        },
        {
          label: 'Usuarios financieros BCRA',
          href: 'https://www.bcra.gob.ar/BCRAyVos/Usuarios_Financieros.asp',
          source: 'BCRA',
        },
      ],
      quiz: {
        question: 'Te llega un WhatsApp “del banco” pidiendo tu clave por un supuesto bloqueo. ¿Qué hacés?',
        options: [
          'La paso para desbloquear rápido',
          'No la paso: ingreso solo por la app/web oficial y denuncio si hace falta',
          'La paso pero cambio la clave después',
        ],
        correct: 1,
        explanation:
          'Bancos y organismos no piden claves por mensajería. Es una señal clásica de fraude.',
      },
    },
  },
  {
    id: 5,
    icon: 'trending-up',
    title: 'Inversiones básicas',
    subtitle: 'Riesgo y protección',
    urgency: 'Si te prometen renta alta “sin riesgo”',
    content: {
      intro:
        'Invertir no es un atajo mágico. A mayor rentabilidad esperada, mayor riesgo. Lo regulado y lo no regulado no son lo mismo: la CNV es la brújula del inversor.',
      caseStudy: {
        title: 'Caso: la promesa del 10% semanal',
        text: 'Un “finfluencer” ofrece plataforma “garantizada”. No figura como agente autorizado. La regla: si suena imposible, es sospechosa. Consultá alertas CNV antes de transferir.',
      },
      sections: [
        {
          heading: 'Ahorro vs. inversión',
          text: 'Primero colchón y deudas caras. Después, instrumentos acordes a tu plazo y tolerancia al riesgo: plazo fijo, FCI, etc. Nadie puede garantizar alta renta sin riesgo.',
        },
        {
          heading: 'Herramientas oficiales',
          text: 'Compará tasas de plazo fijo en el BCRA. Para entender derechos y fraudes, usá la Guía de Protección al Inversor y alertas de la CNV.',
        },
        {
          heading: 'Señales de alerta',
          text: 'Presión para depositar ya, referidos, “oportunidad única”, apps no autorizadas, contratos confusos. Preferí canales regulados y preguntá antes de firmar.',
        },
      ],
      actions: [
        'Corré la calculadora de tasa real con un ejemplo tuyo.',
        'Leé un resumen de la guía CNV de protección al inversor.',
        'Anotá 3 señales de oferta sospechosa.',
      ],
      resources: [
        {
          label: 'CNV — Protección al público inversor',
          href: 'https://www.argentina.gob.ar/cnv',
          source: 'CNV',
        },
        {
          label: 'Comparador de tasas de plazo fijo (BCRA)',
          href: 'https://www.bcra.gob.ar/BCRAyVos/Comparador_de_tasas.asp',
          source: 'BCRA',
        },
      ],
      quiz: {
        question: '¿Qué principio ayuda a evaluar una inversión?',
        options: [
          'Alta renta prometida = siempre conviene',
          'A mayor rentabilidad esperada, mayor riesgo',
          'Si lo recomienda un influencer, está regulado',
        ],
        correct: 1,
        explanation:
          'Rentabilidad y riesgo van juntos. Las promesas “seguras y altísimas” son una bandera roja.',
      },
    },
  },
  {
    id: 6,
    icon: 'receipt',
    title: 'Impuestos y comprobantes',
    subtitle: 'Leer el ticket',
    urgency: 'Si no entendés IVA ni monotributo básico',
    content: {
      intro:
        'No hace falta ser contador: sí saber leer un ticket, qué es consumidor final y cuándo una changa puede requerir monotributo. ARCA concentra guías y simuladores oficiales.',
      caseStudy: {
        title: 'Caso: el precio “sin impuestos”',
        text: 'En el local el precio “de góndola” no coincide con lo que entiende Paula sobre impuestos. Con transparencia fiscal en el comprobante puede ver el desglose de IVA y otros tributos nacionales indirectos.',
      },
      sections: [
        {
          heading: 'Factura, ticket y transparencia fiscal',
          text: 'Pedí comprobante. En muchos casos el ticket detalla IVA y otros impuestos. Eso ayuda a entender el precio final y a reclamar si no te dan documentación.',
        },
        {
          heading: 'Consumidor final',
          text: 'Cuando comprás para uso personal, operás como consumidor final. Guardá tickets de compras relevantes (garantía, reclamos, deducciones si correspondiera).',
        },
        {
          heading: 'Monotributo (noción básica)',
          text: 'Si tenés actividad independiente o secundaria, puede aplicar monotributo. Usá el simulador y las guías de ARCA; para tu caso puntual, consultá un profesional.',
        },
      ],
      actions: [
        'Revisá un ticket reciente y ubicá IVA / totales.',
        'Explorá una guía paso a paso de ARCA (clave fiscal o facturación).',
        'Si tienes changas regulares, mirá el simulador de monotributo (opcional).',
      ],
      resources: [
        {
          label: 'ARCA (ex AFIP) — sitio oficial',
          href: 'https://www.afip.gob.ar/',
          source: 'ARCA',
        },
        {
          label: 'Argentina.gob.ar — trámites y guías',
          href: 'https://www.argentina.gob.ar/',
          source: 'Estado nacional',
        },
      ],
      quiz: {
        question: '¿Para qué sirve mirar el desglose de impuestos en un comprobante?',
        options: [
          'Para no pagar nunca IVA',
          'Para entender el precio final y tener respaldo ante un reclamo',
          'Solo le importa a las empresas',
        ],
        correct: 1,
        explanation:
          'El comprobante es información y prueba. Entender el desglose mejora decisiones y reclamos.',
      },
    },
  },
  {
    id: 7,
    icon: 'percent',
    title: 'Cómo se calculan los intereses',
    subtitle: 'TNA, TEA y CFT en criollo',
    urgency: 'Si firmás cuotas sin saber qué tasa estás pagando',
    content: {
      intro:
        'Mucha gente se endeuda “sin ton ni son”: mira la cuota, no el costo. Si no sabés convertir TNA a mensual ni qué es el CFT, el banco decide por vos. Este módulo es para leer números antes de firmar.',
      caseStudy: {
        title: 'Caso: “son solo $40.000 por mes”',
        text: 'Diego acepta un préstamo porque la cuota “le entra”. No pregunta TNA ni CFT. A los meses suma lo pagado y descubre que el capital apenas bajó: casi todo fue interés y gastos. Recién ahí entiende que la cuota linda no es el precio.',
      },
      sections: [
        {
          heading: 'Cuota ≠ costo',
          text: 'La cuota te dice cuánto sale del bolsillo cada mes. El costo te lo dicen la tasa y el CFT: cuánto terminás pagando de más por usar plata prestada. Nunca compares solo cuotas entre dos créditos: compará CFT (o, si no está, TNA/TEA + gastos).',
        },
        {
          heading: 'De anual a mensual (regla práctica)',
          text: 'Si el resumen o el contrato muestran TNA (anual), una aproximación educativa es dividir por 12 para tener un % mensual orientativo. Ejemplo: TNA 120% ≈ 10% mensual. No es la fórmula bancaria exacta de todos los productos, pero te ordena la cabeza antes de firmar. En la calculadora de pago mínimo podés cargar tasa mensual o anual (TNA).',
        },
        {
          heading: 'TNA, TEA y CFT — para qué sirve cada una',
          text: 'TNA: tasa nominal anual (la “cara” del aviso). TEA: efectiva anual (suele ser más alta; incluye capitalización). CFT: costo financiero total (intereses + seguros + comisiones). Si te ofrecen refinanciar, pedí el CFT por escrito. Si solo te muestran la cuota, pedí el resto.',
        },
        {
          heading: 'Intereses compensatorios y punitorios',
          text: 'Compensatorios: lo que cobrás por financiar el saldo. Punitorios: castigo por mora. En tarjeta, mirá ambos en el resumen. Si solo pagás el mínimo, los compensatorios pueden comerse tu pago y la deuda no baja.',
        },
      ],
      actions: [
        'Agarrá un resumen o un contrato y marcá TNA / TEA / CFT (lo que figure).',
        'Convertí la TNA a un % mensual aproximado (÷ 12) y anotalo.',
        'Simulá tu saldo en la calculadora de pago mínimo con esa tasa.',
      ],
      resources: [
        {
          label: 'Usuarios financieros BCRA',
          href: 'https://www.bcra.gob.ar/BCRAyVos/Usuarios_Financieros.asp',
          source: 'BCRA',
        },
        {
          label: 'Comparador de tasas de plazo fijo (para contrastar “qué es una tasa”)',
          href: 'https://www.bcra.gob.ar/BCRAyVos/Comparador_de_tasas.asp',
          source: 'BCRA',
        },
      ],
      quiz: {
        question: 'Te muestran solo la cuota de un préstamo. ¿Qué pedís antes de firmar?',
        options: [
          'Nada: si la cuota entra, está bien',
          'TNA/TEA y, sobre todo, el CFT (costo total)',
          'Solo la cantidad de cuotas',
        ],
        correct: 1,
        explanation:
          'Sin tasa y CFT estás comprando a ciegas. La cuota es el ritmo de pago, no el precio del crédito.',
      },
      cta: {
        label: 'Probar calculadora de pago mínimo / intereses',
        href: '#calculadoras-pago-minimo',
      },
    },
  },
  {
    id: 8,
    icon: 'alert',
    title: 'Salir del sobreendeudamiento',
    subtitle: 'Frenar la bola de nieve',
    urgency: 'Si las deudas te pasan el sueldo y no sabés por dónde empezar',
    content: {
      intro:
        'Endeudarse sin calcular tasas es el problema; el siguiente es ordenar la salida. Acá no hablamos de “tips motivacionales”: hablamos de cortar sangrado, priorizar intereses caros y armar un plan con números.',
      caseStudy: {
        title: 'Caso: tres deudas y cero plan',
        text: 'Carla tiene tarjeta al mínimo, un personal y cuotas del súper. Paga “lo que puede” sin mirar tasas. Cuando lista saldos, CFT y cuotas, ve que la tarjeta se come el margen. Congela compras, paga más que el interés de la tarjeta y recién después ataca el resto.',
      },
      sections: [
        {
          heading: 'Señales de que estás sobreendeudado',
          text: 'Usás una deuda para pagar otra; el mínimo es tu techo; no sabés el CFT de lo que debés; más del ~40% del ingreso se va en cuotas; pedís adelantos o “préstamos rápidos” para llegar. Si te suena familiar, el plan empieza hoy — no el mes que viene.',
        },
        {
          heading: 'Orden de ataque (con tasas, no con intuición)',
          text: '1) Listá cada deuda: saldo, tasa/CFT, cuota, mínimo. 2) Cortá el grifo: nada de compras nuevas en la más cara. 3) Pagá siempre más que los intereses de la deuda más cara (o el total si podés). 4) Avalancha (mayor tasa primero) o bola de nieve (más chica primero). Usá la plantilla de deudas del curso.',
        },
        {
          heading: 'Trampa de “soluciones” que empeoran',
          text: 'Sacar otra tarjeta para pagar esta; refinanciar sin mirar el CFT nuevo; créditos “en 15 minutos” a tasas brutales; planes eternos que bajan la cuota y alargan el dolor. Si te ofrecen alivio, pedí números: total a pagar y CFT.',
        },
        {
          heading: 'Cuando el problema ya es abuso o no te dejan salir',
          text: 'Si hay cargos que no reconocés, refinanciación forzada o te niegan información de deuda/tasas, pedí todo por escrito y pedí ayuda: protección al usuario financiero (BCRA) y reclamo en UCU. El foco sigue siendo tu plata y tus tasas — no un trámite genérico.',
        },
      ],
      actions: [
        'Completá la plantilla de plan de deudas con saldos y tasas.',
        'Elegí la deuda más cara y fijá un pago > intereses este mes.',
        'Corré las calculadoras de pago mínimo y de capacidad de ahorro con tus números.',
      ],
      resources: [
        {
          label: 'Central de Deudores (BCRA)',
          href: 'https://www.bcra.gob.ar/BCRAyVos/Situacion_Crediticia.asp',
          source: 'BCRA',
        },
        {
          label: 'Usuarios financieros BCRA',
          href: 'https://www.bcra.gob.ar/BCRAyVos/Usuarios_Financieros.asp',
          source: 'BCRA',
        },
        {
          label: 'Reclamos UCU (cobros / créditos abusivos)',
          href: '/reclamos',
          source: 'UCU',
        },
      ],
      quiz: {
        question: 'Tenés varias deudas y poco margen. ¿Qué es lo más sensato primero?',
        options: [
          'Sacar un préstamo nuevo para “unificar” sin mirar el CFT',
          'Listar tasas/CFT, cortar compras en la más cara y pagar más que sus intereses',
          'Pagar solo mínimos en todas “para estar al día”',
        ],
        correct: 1,
        explanation:
          'Sin listar tasas seguís a ciegas. Los mínimos en deudas caras suelen ser la forma más lenta y cara de “estar al día”.',
      },
      cta: {
        label: 'Ir a calculadoras (pago mínimo y ahorro)',
        href: '#calculadoras-pago-minimo',
      },
    },
  },
];
