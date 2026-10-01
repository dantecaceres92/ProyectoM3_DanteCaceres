/**
 * utils.js — Funciones puras de transformación y validación de datos.
 * No tocan el DOM ni hacen fetch, por eso son fáciles de testear.
 */

export const MAX_MESSAGE_LENGTH = 500;

/** Datos del personaje usados por las vistas Home y About. */
export const CHARACTER = {
  name: 'Gordon Gekko',
  initials: 'GG',
  franchise: 'Wall Street (1987)',
  tagline: 'El tiburón de Wall Street te espera. El tiempo es dinero: no lo hagas esperar.',
  description:
    'Gordon Gekko es el legendario inversor ficticio de la película "Wall Street" (1987), dirigida por Oliver Stone. ' +
    'Es un "corporate raider" carismático, ambicioso y sin escrúpulos que encarna los excesos financieros de los años 80. ' +
    'Habla rápido, piensa en números y siempre busca la próxima gran jugada.',
  traits: ['Carismático', 'Implacable', 'Estratega', 'Cínico', 'Obsesionado con ganar'],
};

/**
 * Valida el texto que escribió el usuario.
 * @returns {{ valid: boolean, error: string|null, value: string }}
 */
export function validateMessage(text) {
  if (typeof text !== 'string') return { valid: false, error: 'Mensaje inválido.', value: '' };
  const value = text.trim();
  if (value === '') return { valid: false, error: 'Escribí un mensaje antes de enviar.', value };
  if (value.length > MAX_MESSAGE_LENGTH) {
    return { valid: false, error: `Máximo ${MAX_MESSAGE_LENGTH} caracteres.`, value };
  }
  return { valid: true, error: null, value };
}

/**
 * Crea un objeto mensaje normalizado para el historial local.
 * @param {'user'|'model'|'error'} role
 */
export function createMessage(role, text, date = new Date()) {
  return {
    id: `${date.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    text: String(text).trim(),
    time: formatTime(date),
  };
}

/** Formatea una fecha como HH:MM (24 h). */
export function formatTime(date) {
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

/**
 * Convierte el historial local al formato que espera nuestra API (/api/functions).
 * Descarta los mensajes de error (no son parte de la conversación real).
 */
export function toApiHistory(messages) {
  return messages
    .filter((m) => m.role === 'user' || m.role === 'model')
    .map(({ role, text }) => ({ role, text }));
}

/**
 * Parsea la respuesta JSON de nuestra API.
 * @returns {string} el texto de la respuesta del personaje
 * @throws {Error} si la respuesta no tiene el formato esperado
 */
export function parseApiResponse(data) {
  if (!data || typeof data !== 'object') throw new Error('Respuesta inválida del servidor.');
  if (data.error) throw new Error(data.error);
  if (typeof data.reply !== 'string' || data.reply.trim() === '') {
    throw new Error('El personaje no respondió. Intentá de nuevo.');
  }
  return data.reply.trim();
}
