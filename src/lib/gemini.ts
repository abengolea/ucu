import 'server-only';

const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';

export function getGeminiModel(): string {
  return process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
}

function getGeminiApiUrl(): string {
  return `https://generativelanguage.googleapis.com/v1beta/models/${getGeminiModel()}:generateContent`;
}

export function getGeminiApiKey(): string | null {
  return process.env.GEMINI_API_KEY?.trim() || null;
}

type GeminiPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

async function callGeminiParts(
  systemInstruction: string,
  parts: GeminiPart[],
  options?: { json?: boolean }
): Promise<string> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY no configurada en .env.local');
  }

  const body: Record<string, unknown> = {
    systemInstruction: { parts: [{ text: systemInstruction }] as GeminiPart[] },
    contents: [{ role: 'user', parts }],
    generationConfig: {
      temperature: options?.json ? 0.2 : 0.4,
      ...(options?.json ? { responseMimeType: 'application/json' } : {}),
    },
  };

  const response = await fetch(`${getGeminiApiUrl()}?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = (await response.json()) as {
    error?: { message?: string };
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };

  if (!response.ok) {
    throw new Error(data.error?.message || `Gemini respondió ${response.status}`);
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) throw new Error('Gemini no devolvió texto');
  return text;
}

async function callGemini(
  systemInstruction: string,
  userPrompt: string,
  options?: { json?: boolean }
): Promise<string> {
  return callGeminiParts(systemInstruction, [{ text: userPrompt }], options);
}

export type FalloAiRawExtraction = {
  actor: string | null;
  firmActor: boolean;
  actorEmpresas: string[];
  demandado: string | null;
  personDemandado: boolean;
  demandadoEmpresas: string[];
  fecha: string | null;
  tipoJuicio: string | null;
  rubros: string[];
  causas: string[];
  etiquetas: string[];
  provincia: string | null;
  ciudad: string | null;
  juzgado: string | null;
  punitivo: string | null;
  moral: string | null;
  patrimonial: string | null;
  divisaCodigo: string | null;
  resumen: string;
  pendienteManual: string[];
};

export async function extractFalloFromPdf(
  pdfBase64: string,
  catalogHints: {
    rubros: string[];
    tiposJuicio: string[];
    reclamos: string[];
    etiquetas: string[];
    provincias: string[];
    divisas: string[];
  }
): Promise<FalloAiRawExtraction> {
  const system = `Sos un asistente jurídico del Observatorio de Fallos de Usuarios y Consumidores Unidos (UCU), asociación de defensa del consumidor en Argentina.
Analizás sentencias y fallos judiciales en materia de defensa del consumidor para cargarlos en una base de datos pública.
Reglas:
- Extraé solo datos que figuren explícitamente en el documento; no inventes.
- Si un dato no está claro, devolvé null o array vacío y agregá una nota en pendienteManual.
- firmActor=true si el actor/demandante es empresa; personDemandado=true si el demandado es persona física.
- Montos en formato decimal con punto (ej. "15000.00"); si no hay monto, null.
- fecha en formato DD/MM/AAAA si se puede determinar.
- rubros, causas, etiquetas y tipoJuicio: usá nombres del catálogo provisto cuando correspondan; si no hay match claro, proponé el más cercano o dejá vacío.
- resumen: OBLIGATORIO. Máximo 400 caracteres. Debe ir al centro de la decisión, al corazón del caso: qué se decidió, por qué importa para el consumidor, sin abrir con fórmulas procesales ni citas extensas. Tono claro y directo.
- pendienteManual: lista breve de campos que no pudiste completar con certeza.
Respondé SOLO JSON válido.`;

  const userPrompt = `Analizá el PDF adjunto (sentencia/fallo judicial argentino) y extraé los datos para el observatorio.

Catálogos de referencia (preferí estos nombres exactos cuando apliquen):
- Rubros: ${catalogHints.rubros.join(' | ')}
- Tipos de juicio: ${catalogHints.tiposJuicio.join(' | ')}
- Causas de reclamo: ${catalogHints.reclamos.slice(0, 120).join(' | ')}${catalogHints.reclamos.length > 120 ? ' …' : ''}
- Etiquetas: ${catalogHints.etiquetas.slice(0, 120).join(' | ')}${catalogHints.etiquetas.length > 120 ? ' …' : ''}
- Provincias: ${catalogHints.provincias.join(' | ')}
- Divisas: ${catalogHints.divisas.join(' | ')}

Forma JSON:
{
  "actor": "nombre persona física demandante o null",
  "firmActor": false,
  "actorEmpresas": ["razón social si actor es empresa"],
  "demandado": "nombre persona física demandada o null",
  "personDemandado": false,
  "demandadoEmpresas": ["razón social empresa demandada"],
  "fecha": "DD/MM/AAAA o null",
  "tipoJuicio": "nombre del catálogo o null",
  "rubros": ["..."],
  "causas": ["..."],
  "etiquetas": ["..."],
  "provincia": "nombre o null",
  "ciudad": "nombre o null",
  "juzgado": "nombre del tribunal o null",
  "punitivo": "0.00 o null",
  "moral": "0.00 o null",
  "patrimonial": "0.00 o null",
  "divisaCodigo": "ARS u otro código o null",
  "resumen": "máximo 400 caracteres, corazón del caso",
  "pendienteManual": ["campo X: motivo"]
}`;

  const raw = await callGeminiParts(
    system,
    [
      { inlineData: { mimeType: 'application/pdf', data: pdfBase64 } },
      { text: userPrompt },
    ],
    { json: true }
  );

  const parsed = JSON.parse(raw) as Partial<FalloAiRawExtraction>;
  return {
    actor: parsed.actor ?? null,
    firmActor: Boolean(parsed.firmActor),
    actorEmpresas: Array.isArray(parsed.actorEmpresas) ? parsed.actorEmpresas.map(String) : [],
    demandado: parsed.demandado ?? null,
    personDemandado: Boolean(parsed.personDemandado),
    demandadoEmpresas: Array.isArray(parsed.demandadoEmpresas)
      ? parsed.demandadoEmpresas.map(String)
      : [],
    fecha: parsed.fecha ?? null,
    tipoJuicio: parsed.tipoJuicio ?? null,
    rubros: Array.isArray(parsed.rubros) ? parsed.rubros.map(String) : [],
    causas: Array.isArray(parsed.causas) ? parsed.causas.map(String) : [],
    etiquetas: Array.isArray(parsed.etiquetas) ? parsed.etiquetas.map(String) : [],
    provincia: parsed.provincia ?? null,
    ciudad: parsed.ciudad ?? null,
    juzgado: parsed.juzgado ?? null,
    punitivo: parsed.punitivo ?? null,
    moral: parsed.moral ?? null,
    patrimonial: parsed.patrimonial ?? null,
    divisaCodigo: parsed.divisaCodigo ?? null,
    resumen: String(parsed.resumen ?? '').trim(),
    pendienteManual: Array.isArray(parsed.pendienteManual)
      ? parsed.pendienteManual.map(String)
      : [],
  };
}

export async function generateEmailDraftForReclamo(input: {
  reclamoId: number;
  nombreConsumidor: string;
  estadoActual: string;
  resumen: string;
  hecho?: string;
  empresas: string;
  plantilla: string;
  intencion?: string;
  ejemplosSimilares?: {
    reclamoId: number;
    resumen: string;
    empresas: string;
    estado: string;
    subject: string;
    body: string;
  }[];
}): Promise<{ subject: string; body: string }> {
  const system = `Sos redactor institucional de UCU (Usuarios y Consumidores Unidos), asociación de defensa del consumidor de Argentina.
Redactás emails para consumidores que presentaron reclamos en el sistema "Usuarios Protegidos".
Reglas:
- Español formal, cordial, argentino (tuteo formal: "usted")
- Tono institucional, empático, claro
- Mencioná el número de reclamo y la empresa denunciada
- No inventés información que no te den
- Si el operador indica intención o palabras sueltas, transformalas en un mensaje completo y profesional
- Si hay ejemplos de casos similares, usalos solo como referencia de tono y estructura; adaptá al caso actual
- El email incluye al final la firma institucional de UCU
- Respondé SOLO JSON con "subject" y "body" (texto plano con saltos de línea \\n)`;

  const ejemplos =
    input.ejemplosSimilares?.length ?
      input.ejemplosSimilares
        .map(
          (ejemplo, index) =>
            `Ejemplo ${index + 1} (reclamo #${ejemplo.reclamoId}, ${ejemplo.estado}, ${ejemplo.empresas}):
Asunto: ${ejemplo.subject}
Cuerpo:
${ejemplo.body}`
        )
        .join('\n\n')
    : 'Sin ejemplos de casos similares.';

  const prompt = `Generá un email para el consumidor según estos datos:
- Número de reclamo: #${input.reclamoId}
- Nombre del consumidor: ${input.nombreConsumidor}
- Estado actual del caso: ${input.estadoActual}
- Resumen del reclamo: ${input.resumen}
- Hechos del reclamo: ${input.hecho?.trim() || '(no provistos)'}
- Empresa(s) denunciada(s): ${input.empresas}
- Tipo de comunicación solicitada: ${input.plantilla}
- Intención del operador (palabras sueltas o idea a comunicar): ${input.intencion?.trim() || 'Redactar según la plantilla indicada'}

Respuestas enviadas en casos similares (solo referencia, no copies datos personales ni números de otros reclamos):
${ejemplos}

Devolvé JSON: { "subject": "...", "body": "..." }`;

  const raw = await callGemini(system, prompt, { json: true });
  const parsed = JSON.parse(raw) as { subject?: string; body?: string };
  if (!parsed.subject || !parsed.body) throw new Error('Respuesta de IA inválida');
  return { subject: parsed.subject, body: parsed.body };
}

export type ParsedReclamoSearchInstruction = {
  interpretacion: string;
  filters: {
    empresaQuery?: string;
    keywords?: string[];
    dateFrom?: string;
    dateTo?: string;
    idGrupoEstado?: number;
    causaKeywords?: string[];
  };
};

export async function parseReclamoSearchInstruction(
  instruction: string
): Promise<ParsedReclamoSearchInstruction> {
  const system = `Sos un asistente del área legal de Usuarios y Consumidores Unidos (UCU).
Interpretás pedidos de búsqueda sobre reclamos de consumidores para contestar oficios judiciales o administrativos.
Respondé SOLO JSON válido con esta forma:
{
  "interpretacion": "breve explicación en español de qué se buscará",
  "filters": {
    "empresaQuery": "nombre de empresa denunciada si se menciona, o null",
    "keywords": ["palabras clave del tema en minúsculas"],
    "dateFrom": "YYYY-MM-DD o null",
    "dateTo": "YYYY-MM-DD o null",
    "idGrupoEstado": null o 3 si piden archivados,
    "causaKeywords": ["términos de motivo/causa si los hay"]
  }
}
Reglas:
- idGrupoEstado 3 = archivados; null = todos los grupos salvo que digan explícitamente archivados/activos.
- keywords: términos útiles para buscar en resumen/hechos (sin stopwords).
- Si no hay fecha, dateFrom y dateTo en null.
- empresaQuery: nombre comercial tal como lo diría un operador (ej. "Mercado Libre", "Garbarino").`;

  const raw = await callGemini(system, instruction, { json: true });
  const parsed = JSON.parse(raw) as ParsedReclamoSearchInstruction;
  if (!parsed.interpretacion || !parsed.filters) {
    throw new Error('Respuesta de IA inválida');
  }
  return parsed;
}

export type ParsedFalloSearchInstruction = {
  interpretacion: string;
  filters: {
    empresaQuery?: string;
    actorQuery?: string;
    keywords?: string[];
    dateFrom?: string;
    dateTo?: string;
    rubroKeywords?: string[];
    causaKeywords?: string[];
    etiquetaKeywords?: string[];
    provinciaQuery?: string;
    tipoJuicioQuery?: string;
    status?: 'publish' | 'draft' | 'all';
  };
};

export async function parseFalloSearchInstruction(
  instruction: string
): Promise<ParsedFalloSearchInstruction> {
  const system = `Sos un asistente del Observatorio de Fallos de Usuarios y Consumidores Unidos (UCU).
Interpretás pedidos de búsqueda sobre sentencias judiciales en defensa del consumidor.
Respondé SOLO JSON válido con esta forma:
{
  "interpretacion": "breve explicación en español de qué se buscará",
  "filters": {
    "empresaQuery": "empresa demandada si se menciona, o null",
    "actorQuery": "actor/demandante si se menciona, o null",
    "keywords": ["palabras clave del tema en minúsculas"],
    "dateFrom": "YYYY-MM-DD o null",
    "dateTo": "YYYY-MM-DD o null",
    "rubroKeywords": ["rubro del consumo si aplica"],
    "causaKeywords": ["causa de reclamo si aplica"],
    "etiquetaKeywords": ["etiquetas temáticas si aplica"],
    "provinciaQuery": "provincia o jurisdicción si se menciona, o null",
    "tipoJuicioQuery": "tipo de juicio si se menciona, o null",
    "status": "publish" | "all" | null
  }
}
Reglas:
- keywords: 2 a 5 términos sustantivos del tema (sin stopwords). NUNCA incluyas "fallo", "fallos", "sentencia" ni "contra".
- Preferí frases en singular: "plan de ahorro", "administrador", "daño moral".
- rubroKeywords/causaKeywords: mismo criterio; si el tema es planes de ahorro usá "plan de ahorro" o "administrador de plan de ahorro".
- Si no hay fecha, dateFrom y dateTo en null.
- empresaQuery: razón social tal como la diría un operador (ej. "Telefónica", "Mercado Libre").
- status null o "publish" = solo publicados; "all" si piden incluir borradores.`;

  const raw = await callGemini(system, instruction, { json: true });
  const parsed = JSON.parse(raw) as ParsedFalloSearchInstruction;
  if (!parsed.interpretacion || !parsed.filters) {
    throw new Error('Respuesta de IA inválida');
  }
  return parsed;
}

export async function generateContestacionBorrador(input: {
  instruction: string;
  interpretacion: string;
  stats: {
    total: number;
    porEstado: Record<string, number>;
    porGrupo: Record<string, number>;
    rangoFechas: { desde: string | null; hasta: string | null };
  };
  casos: { id: number; resumen: string; empresas: string; estado: string; fecha: string }[];
}): Promise<string> {
  const system = `Sos redactor jurídico de Usuarios y Consumidores Unidos (UCU), asociación de defensa del consumidor en Argentina.
Redactás borradores de contestación de oficios (judiciales, fiscales, Defensa del Consumidor) sobre reclamos registrados en el sistema Usuarios Protegidos.
Reglas:
- Español formal argentino, tono institucional UCU.
- Citá cifras exactas de los datos provistos; no inventes casos ni números.
- No incluyas DNI, email, teléfono ni domicilios de denunciantes.
- Podés referir casos por número (#id) y resumen.
- Estructura: encabezado breve, antecedentes, relación de hechos/cifras, conclusión.
- Solo texto plano, sin markdown ni HTML.`;

  const userPrompt = `Pedido del operador:
${input.instruction}

Interpretación de la búsqueda:
${input.interpretacion}

Estadísticas:
- Total de reclamos encontrados: ${input.stats.total}
- Por estado: ${JSON.stringify(input.stats.porEstado)}
- Por grupo: ${JSON.stringify(input.stats.porGrupo)}
- Rango de fechas de los casos: ${input.stats.rangoFechas.desde ?? '—'} a ${input.stats.rangoFechas.hasta ?? '—'}

Muestra de casos (referencia, sin datos personales):
${input.casos.map((c) => `#${c.id} | ${c.fecha} | ${c.estado} | ${c.empresas} | ${c.resumen}`).join('\n')}

Redactá el borrador de contestación de oficio listo para revisar y editar.`;

  return callGemini(system, userPrompt);
}
