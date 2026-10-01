/**
 * Vercel Serverless Function: proxy seguro hacia Google Gemini AI.
 *
 * Endpoint: POST /api/functions
 * Body:     { "message": "texto del usuario", "history": [{ "role": "user"|"model", "text": "..." }] }
 * Respuesta OK:    200 { "reply": "texto del personaje" }
 * Respuesta error: 4xx/5xx { "error": "mensaje legible" }
 *
 * La API key vive SOLO aquí (process.env.GEMINI_API_KEY), nunca en el frontend.
 * El system prompt también vive en el servidor, para que el cliente no pueda alterarlo.
 */

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_MODEL = 'gemini-3.5-flash';

export const MAX_MESSAGE_LENGTH = 500;
export const MAX_HISTORY_MESSAGES = 20;

export const SYSTEM_PROMPT = `
Eres Gordon Gekko, el personaje ficticio de la película "Wall Street" (1987).
Eres un tiburón de las finanzas de Nueva York de fines de los años 80: millonario, carismático,
arrogante, implacable y obsesionado con ganar. Hablas con frases cortas, seguras y filosas,
como alguien que no tiene tiempo que perder. Usas metáforas de la guerra, la caza y los negocios.

REGLAS DE ESTILO:
- Responde SIEMPRE en el idioma en que te escribe el usuario (por defecto, español rioplatense neutro).
- Respuestas cortas, apropiadas para un chat: entre 1 y 4 oraciones como máximo.
- Nunca rompas el personaje ni menciones que eres un modelo de lenguaje, salvo que el usuario
  pregunte de forma seria y directa si está hablando con una IA; en ese caso dilo brevemente y sigue.
- Escribe frases originales con tu estilo; no recites diálogos textuales de la película.
- Puedes ser condescendiente o provocador, pero nunca insultante, discriminatorio ni vulgar.

CONOCIMIENTO Y LIMITACIONES:
- Vives mentalmente en 1987: conoces Wall Street, las adquisiciones hostiles, los "corporate raiders",
  el mercado de acciones, el lujo de Manhattan y el arte caro.
- Si te preguntan por tecnología o eventos posteriores a 1987 (internet, celulares, criptomonedas, etc.),
  reacciona con curiosidad o desdén de alguien de esa época, sin inventar datos técnicos.
- No das asesoramiento financiero real. Si el usuario pide consejo concreto sobre su dinero real,
  respondes en personaje pero dejas claro que eres un personaje de ficción y que debe consultar
  a un profesional.
- Si el usuario pide algo ilegal o dañino en la vida real, te niegas con tu estilo cínico.
`.trim();

export const GENERATION_CONFIG = {
  // Temperature: controla la "creatividad". Gemini 3.x recomienda dejarla en 1.0.
  temperature: 1.0,
  // Límite de tokens de salida (incluye el razonamiento interno del modelo).
  maxOutputTokens: 2048,
};

/**
 * Valida el body recibido. Devuelve un string con el error, o null si es válido.
 */
export function validateRequestBody(body) {
  if (!body || typeof body !== 'object') return 'El cuerpo de la petición es inválido.';
  const { message, history } = body;
  if (typeof message !== 'string' || message.trim() === '') return 'El mensaje no puede estar vacío.';
  if (message.length > MAX_MESSAGE_LENGTH) {
    return `El mensaje supera los ${MAX_MESSAGE_LENGTH} caracteres.`;
  }
  if (history !== undefined && !Array.isArray(history)) return 'El historial debe ser un arreglo.';
  return null;
}

/**
 * Transforma el historial del frontend + el mensaje nuevo al formato que espera Gemini:
 * { contents: [{ role: 'user'|'model', parts: [{ text }] }], systemInstruction, generationConfig }
 */
export function buildGeminiPayload(message, history = []) {
  const safeHistory = history
    .filter(
      (m) => m && (m.role === 'user' || m.role === 'model') && typeof m.text === 'string' && m.text.trim() !== ''
    )
    .slice(-MAX_HISTORY_MESSAGES)
    .map((m) => ({ role: m.role, parts: [{ text: m.text }] }));

  return {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [...safeHistory, { role: 'user', parts: [{ text: message.trim() }] }],
    generationConfig: GENERATION_CONFIG,
  };
}

/**
 * Extrae el texto de la respuesta JSON de Gemini.
 * Devuelve el texto o lanza un Error si la respuesta no trae contenido utilizable.
 */
export function extractReply(data) {
  if (data?.promptFeedback?.blockReason) {
    throw new Error('La respuesta fue bloqueada por los filtros de seguridad.');
  }
  const parts = data?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) throw new Error('Respuesta de Gemini sin contenido.');

  const text = parts
    .filter((p) => typeof p.text === 'string' && !p.thought)
    .map((p) => p.text)
    .join('')
    .trim();

  if (!text) throw new Error('Respuesta de Gemini vacía.');
  return text;
}

/**
 * Traduce un status HTTP de Gemini a un mensaje amigable para el usuario.
 */
export function mapGeminiError(status) {
  if (status === 429) return 'Demasiadas solicitudes (rate limit). Esperá unos segundos y reintentá.';
  if (status === 400) return 'La solicitud a Gemini es inválida.';
  if (status === 401 || status === 403) return 'Error de autenticación con Gemini. Revisá la API key del servidor.';
  if (status === 404) return 'El modelo de Gemini configurado no existe o no está disponible.';
  return 'El servicio de IA no está disponible en este momento.';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método no permitido. Usá POST.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Falta configurar GEMINI_API_KEY en el servidor.' });
  }

  const validationError = validateRequestBody(req.body);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const { message, history = [] } = req.body;
  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;

  try {
    const geminiRes = await fetch(`${GEMINI_BASE_URL}/${model}:generateContent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify(buildGeminiPayload(message, history)),
    });

    if (!geminiRes.ok) {
      return res.status(geminiRes.status === 429 ? 429 : 502).json({ error: mapGeminiError(geminiRes.status) });
    }

    const data = await geminiRes.json();
    const reply = extractReply(data);
    return res.status(200).json({ reply });
  } catch (error) {
    return res.status(502).json({ error: error.message || 'Error al comunicarse con Gemini.' });
  }
}
