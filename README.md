# 📈 Chat con Gordon Gekko

Single Page Application para chatear con **Gordon Gekko**, el personaje ficticio de la película *Wall Street* (1987), usando **Google Gemini AI** a través de **Vercel Serverless Functions**.

Proyecto Integrador — Módulo 3 · Full Stack 

🔗 **Aplicación desplegada:** https://proyectom3-dantecaceres.vercel.app/home

---

## 🎭 Personaje elegido

**Gordon Gekko** es el legendario *corporate raider* de la película *Wall Street* (1987), dirigida por Oliver Stone. Es carismático, ambicioso, implacable y cínico: encarna los excesos financieros de los años 80 en Nueva York.

Lo elegí porque tiene una **personalidad muy distintiva** (habla corto, seguro y provocador) que se presta para un chat entretenido sobre negocios, inversiones y ambición.

**Cómo se definió la personalidad (system prompt)** — `api/functions.js`:
- Habla como Gekko: frases cortas, filosas, metáforas de guerra y negocios.
- Respuestas de **1 a 4 oraciones** (apropiadas para chat).
- Responde en el idioma del usuario.
- "Vive" en 1987: ante tecnología moderna (internet, cripto) reacciona como alguien de esa época.
- **No da asesoramiento financiero real**: si se lo piden, aclara que es un personaje de ficción.
- No rompe el personaje, salvo que el usuario pregunte seriamente si habla con una IA.

---

## ✨ Funcionalidades

| Requisito | Implementación |
|---|---|
| Rutas `/home`, `/chat`, `/about` | Router propio con **History API** (`pushState`, `popstate`) en `src/app.js` |
| Navegación sin recargar + back/forward | Links con `data-link` interceptados; `popstate` re-renderiza |
| Diferenciación visual de mensajes | Burbujas doradas (usuario, derecha) vs. verdes con avatar (personaje, izquierda) |
| Estado "escribiendo..." | Indicador animado mientras se espera a Gemini; input y botón deshabilitados |
| Manejo de errores | Mensajes de error visibles en el chat (red, rate limit 429, API key, modelo, respuesta vacía/bloqueada) |
| Historial en sesión | En memoria (`src/chat.js`): se conserva al navegar entre vistas, se pierde al recargar |
| Scroll automático | `scrollIntoView` al último mensaje |
| API key segura | La key solo existe en la Vercel Function (`process.env.GEMINI_API_KEY`) |
| Responsive mobile-first | 3 tamaños: mobile (<768px), tablet (≥768px), desktop (≥1024px) con Flexbox, Grid y media queries |
| Tests | 23 tests unitarios con **Vitest** y `fetch` mockeado (sin red) |

**Extras:** contador de caracteres (máx. 500), Enter para enviar / Shift+Enter salto de línea, menú hamburguesa en mobile, vista 404, accesibilidad (`aria-live`, `aria-current`, skip-link), protección XSS (se renderiza con `textContent`).

---

## 🗂️ Estructura del proyecto

```
├── api/
│   └── functions.js      # Vercel Serverless Function: proxy seguro a Gemini + system prompt
├── src/
│   ├── index.html        # HTML base de la SPA
│   ├── styles.css        # Estilos mobile-first
│   ├── app.js            # Lógica principal y routing (History API)
│   ├── chat.js           # Lógica del chat: fetching + renderizado
│   └── utils.js          # Funciones puras de transformación/validación de datos
├── tests/
│   ├── utils.test.js     # Tests de utils (validación, transformación, parseo)
│   ├── app.test.js       # Tests del router y del fetch al backend (mockeado)
│   └── api.test.js       # Tests de la Vercel Function (Gemini mockeado)
├── docs/screenshots/     # Capturas de pantalla
├── .env.example          # Variables necesarias (sin valores reales)
├── .gitignore
├── vercel.json           # Sirve /src como sitio y redirige rutas de la SPA a index.html
├── package.json
└── README.md
```

**Separación de responsabilidades:**
1. **Fetching** → `sendMessageToApi()` en `src/chat.js` (frontend → `/api/functions`) y `handler()` en `api/functions.js` (servidor → Gemini).
2. **Transformación / parseo** → `src/utils.js` (`toApiHistory`, `parseApiResponse`, `createMessage`) y `buildGeminiPayload` / `extractReply` en la función.
3. **Renderizado** → `renderMessage()` y `mountChat()` en `src/chat.js`, vistas en `src/app.js`.

### Flujo de una petición

```
Navegador (src/chat.js)
   │  POST /api/functions  { message, history }
   ▼
Vercel Function (api/functions.js)  ← lee GEMINI_API_KEY de variables de entorno
   │  POST generativelanguage.googleapis.com/.../{modelo}:generateContent
   │  { systemInstruction, contents[roles user/model], generationConfig }
   ▼
Google Gemini  →  { candidates[0].content.parts[].text }
   ▼
Vercel Function  →  { reply }  →  Navegador renderiza la burbuja
```

---

## ⚙️ Requisitos

- [Node.js](https://nodejs.org/) 18 o superior
- Cuenta en [Vercel](https://vercel.com) y la CLI: `npm install -g vercel`
- API key de Gemini (gratis) en [Google AI Studio](https://aistudio.google.com/apikey)

## 💻 Ejecutar en local

```bash
# 1. Clonar el repositorio
git clone https://github.com/TU-USUARIO/TU-REPO.git
cd TU-REPO

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
#    Editar .env y pegar tu GEMINI_API_KEY

# 4. Ejecutar con Vercel (levanta el frontend y la serverless function juntos)
vercel dev
#    (la primera vez pide loguearte y vincular el proyecto: aceptar las opciones por defecto)
```

Abrir http://localhost:3000

> ⚠️ No uses Live Server ni abras el `index.html` directo: la función `/api/functions` solo corre con `vercel dev` o en Vercel.

## 🧪 Ejecutar tests

```bash
npm test            # corre todos los tests una vez
npm run test:watch  # modo watch
```

Los tests **no usan red**: `fetch` se mockea con `vi.fn()` / `vi.stubGlobal`.

## 🚀 Desplegar a Vercel

1. Subir el código a un repositorio de GitHub (el `.env` real **no** se sube, está en `.gitignore`).
2. En [vercel.com](https://vercel.com) → **Add New… → Project** → importar el repositorio.
3. **Framework Preset:** `Other`. No hace falta comando de build (la carpeta de salida `src` ya está definida en `vercel.json`).
4. En **Environment Variables** agregar:
   - `GEMINI_API_KEY` = tu API key
   - (opcional) `GEMINI_MODEL` = `gemini-3.5-flash`
5. Click en **Deploy**.
6. Verificar en producción: navegar `/home`, `/chat`, `/about`, recargar en `/chat` (debe cargar igual), enviar un mensaje y probar back/forward.

Cada `git push` a `main` vuelve a desplegar automáticamente.

---

## 📸 Demo del chat con Gordon GEKKO

Link: https://drive.google.com/file/d/1EmRssrI0iY8m12m1BYlo5ejV4RCdfQ0w/view?usp=sharing
---

## 🧠 Conceptos aplicados

- **Roles y mensajes:** cada turno se envía a Gemini como `{ role: 'user' | 'model', parts: [{ text }] }`. La API es *stateless*: en cada petición se reenvía el historial (limitado a los últimos 20 mensajes) para que el personaje mantenga el contexto.
- **System prompt:** va en `systemInstruction` y vive en el servidor, así el usuario no puede modificarlo desde el navegador.
- **Tokens:** el costo y el límite de la API se miden en tokens; por eso se limita el largo del mensaje (500 caracteres), el historial (20 mensajes) y `maxOutputTokens`.
- **Temperature:** controla la aleatoriedad/creatividad de las respuestas (se usa 1.0, el valor recomendado para Gemini 3.x).
- **Rate limiting:** si Gemini responde `429`, la función devuelve un mensaje amigable y el usuario puede reintentar.
- **¿Por qué no exponer la API key?** Todo lo que llega al navegador (JS, requests) es visible en DevTools. Si la key estuviera en el frontend, cualquiera podría copiarla y consumir la cuota. La Vercel Function actúa como **proxy**: el navegador nunca ve la key.

---

## 🤖 Registro del uso de AI

| Herramienta | Para qué se usó | Qué revisé / modifiqué yo |
|---|---|---|
| Claude (Anthropic) | Estructura inicial del proyecto, router con History API, Vercel Function, estilos mobile-first, tests con Vitest y borrador de este README | <!-- Completar: qué entendiste, qué cambiaste, qué probaste --> |
| <!-- otra herramienta --> | | |

**Prompts / decisiones relevantes:**
- Se pidió seguir la consigna del PI (rutas, estados, errores, seguridad de la key, tests, responsive).
- Se eligió un personaje **ficticio** (Gordon Gekko) en lugar de una persona real, para cumplir la consigna y evitar atribuirle frases inventadas a alguien real.
- <!-- Agregar: errores que encontraste y cómo los resolviste, sugerencias de la AI que descartaste y por qué -->

**Criterio aplicado:** revisé que la API key nunca llegue al cliente, que los tests corran sin red y que la app funcione en los 3 tamaños con DevTools.

---

## ⚠️ Aviso

Gordon Gekko es un personaje de ficción. Sus respuestas son generadas por IA con fines de entretenimiento y **no constituyen asesoramiento financiero**.
