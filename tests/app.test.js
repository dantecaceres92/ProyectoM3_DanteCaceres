// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { normalizePath, resolveRoute, routes, navigateTo } from '../src/app.js';
import { sendMessageToApi, API_URL } from '../src/chat.js';

describe('Router (History API)', () => {
  let container;

  beforeEach(() => {
    document.body.innerHTML = '<nav><a class="nav__link" href="/home">Inicio</a><a class="nav__link" href="/chat">Chat</a></nav><main id="view"></main>';
    container = document.getElementById('view');
    window.history.replaceState({}, '', '/');
    window.scrollTo = vi.fn(); // jsdom no implementa scrollTo
  });

  it('normaliza "/" y barras finales', () => {
    expect(normalizePath('/')).toBe('/home');
    expect(normalizePath('/about/')).toBe('/about');
    expect(normalizePath('/CHAT')).toBe('/chat');
  });

  it('resuelve las rutas existentes y devuelve 404 para las desconocidas', () => {
    expect(resolveRoute('/home')).toBe(routes['/home']);
    expect(resolveRoute('/chat')).toBe(routes['/chat']);
    expect(resolveRoute('/about')).toBe(routes['/about']);
    expect(resolveRoute('/no-existe').title).toBe('No encontrado');
  });

  it('navigateTo cambia la URL sin recargar y renderiza la vista', () => {
    navigateTo('/about', container);
    expect(window.location.pathname).toBe('/about');
    expect(container.querySelector('#about-title')).not.toBeNull();

    navigateTo('/chat', container);
    expect(window.location.pathname).toBe('/chat');
    expect(container.querySelector('#chat-form')).not.toBeNull();
    expect(document.querySelector('a[href="/chat"]').classList.contains('is-active')).toBe(true);
  });
});

describe('sendMessageToApi (fetch mockeado, sin red)', () => {
  it('envía mensaje + historial por POST y devuelve la respuesta', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ reply: 'El almuerzo es para los débiles.' }),
    });

    const history = [{ role: 'user', text: 'Hola' }];
    const reply = await sendMessageToApi('¿Almorzamos?', history, fetchMock);

    expect(reply).toBe('El almuerzo es para los débiles.');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe(API_URL);
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body)).toEqual({ message: '¿Almorzamos?', history });
  });

  it('lanza el mensaje de error del servidor cuando la respuesta no es OK', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({ error: 'Demasiadas solicitudes' }),
    });
    await expect(sendMessageToApi('hola', [], fetchMock)).rejects.toThrow('Demasiadas solicitudes');
  });

  it('lanza un error de conexión si fetch falla (sin red)', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(sendMessageToApi('hola', [], fetchMock)).rejects.toThrow(/conexión/);
  });
});
