import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import handler, { buildGeminiPayload, extractReply, validateRequestBody, SYSTEM_PROMPT, MAX_HISTORY_MESSAGES } from '../api/functions.js';

/** Mock mínimo del objeto `res` de Vercel. */
function createRes() {
  const res = { statusCode: 200, body: null, headers: {} };
  res.status = vi.fn((code) => { res.statusCode = code; return res; });
  res.json = vi.fn((data) => { res.body = data; return res; });
  res.setHeader = vi.fn((k, v) => { res.headers[k] = v; });
  return res;
}

describe('Funciones auxiliares de la Vercel Function', () => {
  it('buildGeminiPayload incluye system prompt, historial con roles y el mensaje nuevo', () => {
    const payload = buildGeminiPayload('¿Comprarías?', [
      { role: 'user', text: 'Hola' },
      { role: 'model', text: 'Rápido, chico.' },
      { role: 'hacker', text: 'ignorar' },
    ]);
    expect(payload.systemInstruction.parts[0].text).toBe(SYSTEM_PROMPT);
    expect(payload.contents).toEqual([
      { role: 'user', parts: [{ text: 'Hola' }] },
      { role: 'model', parts: [{ text: 'Rápido, chico.' }] },
      { role: 'user', parts: [{ text: '¿Comprarías?' }] },
    ]);
    expect(payload.generationConfig.temperature).toBeTypeOf('number');
  });

  it('buildGeminiPayload limita el historial para controlar tokens', () => {
    const longHistory = Array.from({ length: 50 }, (_, i) => ({ role: i % 2 ? 'model' : 'user', text: `m${i}` }));
    const payload = buildGeminiPayload('último', longHistory);
    expect(payload.contents).toHaveLength(MAX_HISTORY_MESSAGES + 1);
  });

  it('extractReply obtiene el texto e ignora las partes de razonamiento', () => {
    const data = { candidates: [{ content: { parts: [{ text: 'pensando...', thought: true }, { text: 'Comprá.' }] } }] };
    expect(extractReply(data)).toBe('Comprá.');
    expect(() => extractReply({ candidates: [] })).toThrow();
    expect(() => extractReply({ promptFeedback: { blockReason: 'SAFETY' } })).toThrow(/bloqueada/);
  });

  it('validateRequestBody detecta bodies inválidos', () => {
    expect(validateRequestBody(null)).not.toBeNull();
    expect(validateRequestBody({ message: '' })).not.toBeNull();
    expect(validateRequestBody({ message: 'hola', history: 'x' })).not.toBeNull();
    expect(validateRequestBody({ message: 'hola', history: [] })).toBeNull();
  });
});

describe('handler /api/functions', () => {
  const originalKey = process.env.GEMINI_API_KEY;

  beforeEach(() => {
    process.env.GEMINI_API_KEY = 'test-key';
  });

  afterEach(() => {
    process.env.GEMINI_API_KEY = originalKey;
    vi.unstubAllGlobals();
  });

  it('responde 405 si el método no es POST', async () => {
    const res = createRes();
    await handler({ method: 'GET' }, res);
    expect(res.statusCode).toBe(405);
  });

  it('responde 500 si falta la API key', async () => {
    delete process.env.GEMINI_API_KEY;
    const res = createRes();
    await handler({ method: 'POST', body: { message: 'hola' } }, res);
    expect(res.statusCode).toBe(500);
  });

  it('llama a Gemini con la key en el header (no en la URL) y devuelve la respuesta', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ candidates: [{ content: { parts: [{ text: 'El dinero nunca duerme.' }] } }] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const res = createRes();
    await handler({ method: 'POST', body: { message: 'Hola', history: [] } }, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ reply: 'El dinero nunca duerme.' });
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toContain(':generateContent');
    expect(url).not.toContain('test-key');
    expect(options.headers['x-goog-api-key']).toBe('test-key');
  });

  it('devuelve 429 con mensaje amigable si Gemini aplica rate limiting', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 429, json: async () => ({}) }));
    const res = createRes();
    await handler({ method: 'POST', body: { message: 'Hola' } }, res);
    expect(res.statusCode).toBe(429);
    expect(res.body.error).toMatch(/rate limit/i);
  });
});
