import { describe, it, expect } from 'vitest';
import {
  validateMessage,
  createMessage,
  formatTime,
  toApiHistory,
  parseApiResponse,
  MAX_MESSAGE_LENGTH,
} from '../src/utils.js';

describe('validateMessage', () => {
  it('rechaza mensajes vacíos o con solo espacios', () => {
    expect(validateMessage('').valid).toBe(false);
    expect(validateMessage('    ').valid).toBe(false);
  });

  it('rechaza mensajes que superan el largo máximo', () => {
    const result = validateMessage('a'.repeat(MAX_MESSAGE_LENGTH + 1));
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/Máximo/);
  });

  it('acepta un mensaje válido y lo devuelve sin espacios extremos', () => {
    expect(validateMessage('  Hola Gekko  ')).toEqual({ valid: true, error: null, value: 'Hola Gekko' });
  });
});

describe('formatTime y createMessage', () => {
  it('formatea la hora como HH:MM', () => {
    expect(formatTime(new Date(2026, 0, 1, 9, 5))).toBe('09:05');
  });

  it('crea un mensaje normalizado con id, rol, texto y hora', () => {
    const msg = createMessage('user', '  hola  ', new Date(2026, 0, 1, 14, 30));
    expect(msg).toMatchObject({ role: 'user', text: 'hola', time: '14:30' });
    expect(typeof msg.id).toBe('string');
  });
});

describe('toApiHistory', () => {
  it('descarta mensajes de error y deja solo role/text', () => {
    const messages = [
      { id: '1', role: 'user', text: 'Hola', time: '10:00' },
      { id: '2', role: 'error', text: 'Falló', time: '10:00' },
      { id: '3', role: 'model', text: 'El tiempo es dinero.', time: '10:01' },
    ];
    expect(toApiHistory(messages)).toEqual([
      { role: 'user', text: 'Hola' },
      { role: 'model', text: 'El tiempo es dinero.' },
    ]);
  });
});

describe('parseApiResponse', () => {
  it('devuelve el texto de la respuesta', () => {
    expect(parseApiResponse({ reply: '  Compra barato.  ' })).toBe('Compra barato.');
  });

  it('lanza error si la API devolvió un error', () => {
    expect(() => parseApiResponse({ error: 'Rate limit' })).toThrow('Rate limit');
  });

  it('lanza error si la respuesta no tiene formato válido', () => {
    expect(() => parseApiResponse(null)).toThrow();
    expect(() => parseApiResponse({ reply: '' })).toThrow();
  });
});
