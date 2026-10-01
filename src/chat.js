/**
 * chat.js — Lógica específica del chat.
 * Separación de responsabilidades:
 *   1) Fetching:        sendMessageToApi()
 *   2) Transformación:  funciones de utils.js (toApiHistory, parseApiResponse, createMessage)
 *   3) Renderizado:     renderMessage(), renderTyping(), mountChat()
 */
import { createMessage, parseApiResponse, toApiHistory, validateMessage, CHARACTER } from './utils.js';

export const API_URL = '/api/functions';

/** Historial en memoria: se conserva al navegar entre vistas, se pierde al recargar. */
const state = {
  messages: [],
  isLoading: false,
};

export function getMessages() {
  return [...state.messages];
}

export function resetChat() {
  state.messages = [];
  state.isLoading = false;
}

/* ---------------------------------------------------------------- */
/* 1) FETCHING                                                       */
/* ---------------------------------------------------------------- */

/**
 * Envía el mensaje + historial a la Vercel Function y devuelve el texto de respuesta.
 * @throws {Error} con un mensaje legible si algo falla (red, HTTP o formato).
 */
export async function sendMessageToApi(message, history = [], fetchFn = fetch) {
  let response;
  try {
    response = await fetchFn(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history }),
    });
  } catch {
    throw new Error('No hay conexión con el servidor. Revisá tu internet.');
  }

  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error(`Error del servidor (${response.status}).`);
  }

  if (!response.ok) {
    throw new Error(data?.error || `Error del servidor (${response.status}).`);
  }

  return parseApiResponse(data);
}

/* ---------------------------------------------------------------- */
/* 3) RENDERIZADO                                                    */
/* ---------------------------------------------------------------- */

/** Crea el nodo DOM de un mensaje. Usa textContent para evitar inyección de HTML (XSS). */
export function renderMessage(message) {
  const item = document.createElement('li');
  item.className = `message message--${message.role}`;

  if (message.role === 'model') {
    const avatar = document.createElement('span');
    avatar.className = 'message__avatar';
    avatar.setAttribute('aria-hidden', 'true');
    avatar.textContent = CHARACTER.initials;
    item.appendChild(avatar);
  }

  const bubble = document.createElement('div');
  bubble.className = 'message__bubble';

  const author = document.createElement('span');
  author.className = 'sr-only';
  author.textContent = message.role === 'user' ? 'Vos dijiste:' : message.role === 'model' ? `${CHARACTER.name} dijo:` : 'Error:';

  const text = document.createElement('p');
  text.className = 'message__text';
  text.textContent = message.text;

  const time = document.createElement('span');
  time.className = 'message__time';
  time.textContent = message.time;

  bubble.append(author, text, time);
  item.appendChild(bubble);
  return item;
}

function renderTyping() {
  const item = document.createElement('li');
  item.className = 'message message--model message--typing';
  item.id = 'typing-indicator';
  item.innerHTML = `
    <span class="message__avatar" aria-hidden="true">${CHARACTER.initials}</span>
    <div class="message__bubble">
      <span class="typing">${CHARACTER.name} está escribiendo<span class="typing__dots"><i></i><i></i><i></i></span></span>
    </div>`;
  return item;
}

function scrollToBottom(list) {
  list.lastElementChild?.scrollIntoView?.({ behavior: 'smooth', block: 'end' });
}

/**
 * Conecta la vista /chat (ya insertada en el DOM) con la lógica.
 * Se llama cada vez que el router renderiza la vista de chat.
 */
export function mountChat(root = document) {
  const list = root.querySelector('#messages');
  const form = root.querySelector('#chat-form');
  const input = root.querySelector('#chat-input');
  const button = root.querySelector('#chat-send');
  const counter = root.querySelector('#chat-counter');
  if (!list || !form || !input || !button) return;

  // Re-render del historial (al volver a /chat desde otra vista).
  state.messages.forEach((m) => list.appendChild(renderMessage(m)));
  scrollToBottom(list);

  // Se busca la lista "en vivo" cada vez: si el usuario navega y vuelve a /chat
  // mientras espera una respuesta, el mensaje aparece en la vista nueva.
  const currentList = () => root.querySelector('#messages');

  const setLoading = (loading) => {
    state.isLoading = loading;
    const liveList = currentList();
    const liveForm = root.querySelector('#chat-form');
    if (liveForm) {
      liveForm.setAttribute('aria-busy', String(loading));
      liveForm.querySelector('#chat-send').disabled = loading;
      liveForm.querySelector('#chat-input').disabled = loading;
    }
    if (!liveList) return;
    const typing = liveList.querySelector('#typing-indicator');
    if (loading && !typing) liveList.appendChild(renderTyping());
    if (!loading && typing) typing.remove();
    scrollToBottom(liveList);
  };

  const addMessage = (message) => {
    if (message.role !== 'error') state.messages.push(message);
    const liveList = currentList();
    if (!liveList) return;
    // El indicador de "escribiendo" siempre debe quedar al final.
    const typing = liveList.querySelector('#typing-indicator');
    liveList.insertBefore(renderMessage(message), typing);
    scrollToBottom(liveList);
  };

  // Si había una respuesta en curso al salir de /chat, se restaura el estado de carga.
  if (state.isLoading) setLoading(true);

  input.addEventListener('input', () => {
    if (counter) counter.textContent = `${input.value.length}/${input.maxLength}`;
  });

  // Enter envía, Shift+Enter hace salto de línea.
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      form.requestSubmit();
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (state.isLoading) return;

    const { valid, error, value } = validateMessage(input.value);
    if (!valid) {
      addMessage(createMessage('error', error));
      return;
    }

    const history = toApiHistory(state.messages);
    addMessage(createMessage('user', value));
    input.value = '';
    if (counter) counter.textContent = `0/${input.maxLength}`;
    setLoading(true);

    try {
      const reply = await sendMessageToApi(value, history);
      addMessage(createMessage('model', reply));
    } catch (err) {
      addMessage(createMessage('error', err.message));
    } finally {
      setLoading(false);
      root.querySelector('#chat-input')?.focus();
    }
  });

  input.focus();
}
