/**
 * app.js — Lógica principal y routing de la SPA (History API).
 * Rutas: /home, /chat, /about. "/" redirige a /home. Cualquier otra ruta → vista 404.
 */
import { CHARACTER } from './utils.js';
import { mountChat } from './chat.js';

/* ---------------------------------------------------------------- */
/* VISTAS (cada una devuelve el HTML de la sección)                  */
/* ---------------------------------------------------------------- */

function HomeView() {
  return `
    <section class="view home" aria-labelledby="home-title">
      <div class="hero">
        <div class="hero__avatar" aria-hidden="true">${CHARACTER.initials}</div>
        <p class="eyebrow">${CHARACTER.franchise}</p>
        <h1 id="home-title" class="hero__title">Chateá con <span>${CHARACTER.name}</span></h1>
        <p class="hero__tagline">${CHARACTER.tagline}</p>
        <a href="/chat" class="btn btn--primary" data-link>Empezar a chatear</a>
      </div>

      <div class="cards">
        <article class="card">
          <h2 class="card__title">¿Quién es?</h2>
          <p>${CHARACTER.description}</p>
        </article>
        <article class="card">
          <h2 class="card__title">Personalidad</h2>
          <ul class="tags">
            ${CHARACTER.traits.map((t) => `<li class="tag">${t}</li>`).join('')}
          </ul>
        </article>
        <article class="card">
          <h2 class="card__title">Ideas para preguntarle</h2>
          <ul class="list">
            <li>¿Cuál es tu regla de oro para invertir?</li>
            <li>¿Qué opinás de las criptomonedas?</li>
            <li>¿Cómo cerrás un negocio difícil?</li>
          </ul>
        </article>
      </div>
    </section>`;
}

function ChatView() {
  return `
    <section class="view chat" aria-labelledby="chat-title">
      <header class="chat__header">
        <span class="chat__avatar" aria-hidden="true">${CHARACTER.initials}</span>
        <div>
          <h1 id="chat-title" class="chat__name">${CHARACTER.name}</h1>
          <p class="chat__status"><span class="dot" aria-hidden="true"></span> En línea · ${CHARACTER.franchise}</p>
        </div>
      </header>

      <ul id="messages" class="chat__messages" aria-live="polite" aria-label="Conversación">
        <li class="chat__empty">Escribí tu primer mensaje. Gekko no tiene todo el día.</li>
      </ul>

      <form id="chat-form" class="chat__form" autocomplete="off">
        <label for="chat-input" class="sr-only">Mensaje</label>
        <textarea id="chat-input" class="chat__input" rows="1" maxlength="500"
          placeholder="Escribí tu mensaje..." required></textarea>
        <button id="chat-send" class="btn btn--primary chat__send" type="submit" aria-label="Enviar mensaje">
          <span class="chat__send-text">Enviar</span>
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M3 20.5 21 12 3 3.5 3 10l12 2-12 2z"/></svg>
        </button>
        <span id="chat-counter" class="chat__counter" aria-hidden="true">0/500</span>
      </form>
    </section>`;
}

function AboutView() {
  return `
    <section class="view about" aria-labelledby="about-title">
      <h1 id="about-title">Sobre el proyecto</h1>
      <div class="cards">
        <article class="card">
          <h2 class="card__title">El proyecto</h2>
          <p>Prueba de concepto para <strong>ComicSansCon</strong>: una Single Page Application que permite
          conversar con un personaje ficticio usando <strong>Google Gemini AI</strong>. Desarrollado como
          Proyecto Integrador del Módulo 3 del bootcamp Full Stack de Henry.</p>
        </article>
        <article class="card">
          <h2 class="card__title">El personaje</h2>
          <p>${CHARACTER.description}</p>
          <p class="muted">Es un personaje de ficción: sus respuestas no son asesoramiento financiero.</p>
        </article>
        <article class="card">
          <h2 class="card__title">Tecnologías</h2>
          <ul class="tags">
            <li class="tag">HTML5</li><li class="tag">CSS3 (mobile-first)</li>
            <li class="tag">JavaScript (ES Modules)</li><li class="tag">History API</li>
            <li class="tag">Fetch + async/await</li><li class="tag">Vercel Functions</li>
            <li class="tag">Google Gemini</li><li class="tag">Vitest</li>
          </ul>
        </article>
        <article class="card">
          <h2 class="card__title">Seguridad</h2>
          <p>La API key de Gemini nunca llega al navegador: el frontend llama a <code>/api/functions</code>,
          una Vercel Serverless Function que lee la clave desde variables de entorno y hace de proxy.</p>
        </article>
      </div>
      <a href="/chat" class="btn btn--primary" data-link>Ir al chat</a>
    </section>`;
}

function NotFoundView() {
  return `
    <section class="view notfound">
      <h1>404</h1>
      <p>Esta página no cotiza en bolsa.</p>
      <a href="/home" class="btn btn--primary" data-link>Volver al inicio</a>
    </section>`;
}

/* ---------------------------------------------------------------- */
/* ROUTER                                                            */
/* ---------------------------------------------------------------- */

export const routes = {
  '/home': { title: 'Inicio', view: HomeView },
  '/chat': { title: 'Chat', view: ChatView, onMount: mountChat },
  '/about': { title: 'Acerca de', view: AboutView },
};

/** Normaliza una ruta: quita la barra final y redirige "/" a "/home". */
export function normalizePath(path) {
  if (!path || path === '/' || path === '/index.html') return '/home';
  const clean = path.length > 1 ? path.replace(/\/+$/, '') : path;
  return clean.toLowerCase();
}

/** Devuelve la configuración de la ruta, o la de 404 si no existe. */
export function resolveRoute(path) {
  const normalized = normalizePath(path);
  return routes[normalized] || { title: 'No encontrado', view: NotFoundView };
}

/** Renderiza en el contenedor la vista correspondiente a la URL actual. */
export function render(container = document.getElementById('app')) {
  if (!container) return;
  const path = normalizePath(window.location.pathname);
  const route = resolveRoute(path);

  container.innerHTML = route.view();
  document.title = `${route.title} | Chat con ${CHARACTER.name}`;

  // Marca el link activo en la navegación.
  document.querySelectorAll('.nav__link').forEach((link) => {
    const active = link.getAttribute('href') === path;
    link.classList.toggle('is-active', active);
    if (active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });

  route.onMount?.(document);
}

/** Navega sin recargar la página usando History API. */
export function navigateTo(path, container) {
  const target = normalizePath(path);
  if (target !== window.location.pathname) {
    window.history.pushState({}, '', target);
  }
  render(container);
  window.scrollTo?.(0, 0);
}

/** Inicializa el router: links con data-link, botones atrás/adelante y ruta inicial. */
export function initRouter() {
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[data-link]');
    if (!link) return;
    // Permite abrir en otra pestaña con Ctrl/Cmd+click.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    document.querySelector('.nav')?.classList.remove('is-open');
    navigateTo(link.getAttribute('href'));
  });

  window.addEventListener('popstate', () => render());

  // Menú hamburguesa en mobile.
  const toggle = document.querySelector('.nav__toggle');
  toggle?.addEventListener('click', () => {
    const nav = document.querySelector('.nav');
    const open = nav.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(open));
  });

  // Si entran a "/", reemplazamos la URL por "/home" sin agregar una entrada al historial.
  const initial = normalizePath(window.location.pathname);
  if (initial !== window.location.pathname) window.history.replaceState({}, '', initial);
  render();
}

// Arranca solo en el navegador real (en los tests no existe #app).
if (typeof document !== 'undefined' && document.getElementById('app')) {
  initRouter();
}
