# PineRock Services LLC — sitio web con panel privado

Sitio bilingüe (ES/EN) con:

- **Web pública** (`index.html`): el diseño no ha cambiado, lee todo su contenido de `content.json` y ahora incluye una sección de **preguntas/chat** para clientes.
- **Panel privado de administración**, protegido con contraseña, desde donde se edita cualquier texto, servicio, precio, teléfono, WhatsApp y la **galería de proyectos** (varias fotos por proyecto), sin tocar código.
- **Backend serverless** (Cloudflare Pages Functions) que guarda los cambios en vivo y valida el login — la contraseña **no está escrita en ningún archivo**, se configura como variable secreta en Cloudflare.

---

## 🔒 Cómo funciona el acceso privado (sin contraseñas en el código)

- La contraseña vive **solo** en Cloudflare, como variable de entorno secreta (`ADMIN_PASSWORD`). Ningún archivo de este proyecto la contiene.
- `/admin` muestra un formulario de login. Al enviarlo, `/api/login` compara la contraseña con la variable secreta (comparación seguded por HMAC, no en texto plano) y, si coincide, entrega una cookie de sesión firmada (`SESSION_SECRET`, otra variable secreta) válida 12 horas.
- `/_admin/panel.html` (el editor real) está bloqueado por `functions/_middleware.js`: si no hay una cookie de sesión válida, ni siquiera se entrega el archivo — redirige a `/admin`.
- Los visitantes normales de la web **no ven ningún enlace** al panel; solo quien conozca `tudominio.com/admin` y la contraseña puede entrar.
- Guardar cambios (`POST /api/content`) y subir fotos (`POST /api/upload`) vuelven a comprobar la cookie de sesión en el servidor — aunque alguien adivinara la URL del panel, no podría guardar nada sin haber iniciado sesión.

**Tienes que crear tú la contraseña** (ver más abajo, paso "Configurar el área privada"): nadie más la conoce, ni siquiera queda en este chat.

---

## Contenido de la carpeta

| Archivo / carpeta | Qué es |
|---|---|
| `index.html` | La web pública. Lee `content.json` (o `/api/content` si el backend está activo) y ahora incluye la sección de chat. |
| `content.json` | Contenido de fábrica (respaldo estático). Una vez guardes cambios desde el panel, la versión "viva" pasa a estar en Cloudflare KV. |
| `functions/` | El backend (Cloudflare Pages Functions): login, sesión, guardar contenido, subir fotos, servir fotos, y el endpoint de chat. |
| `functions/admin.js` | Sirve el formulario de `/admin`. |
| `functions/_middleware.js` | Bloquea `/_admin/*` a quien no tenga sesión válida. |
| `functions/api/login.js`, `logout.js`, `session.js` | Login, logout y comprobación de sesión. |
| `functions/api/content.js` | Lee/guarda el contenido de la web (KV, con respaldo en `content.json`). |
| `functions/api/upload.js`, `functions/media/[[path]].js` | Subida y entrega de fotos de la galería. |
| `functions/api/chat.js` | Endpoint del chat — hoy responde "todavía sin IA conectada"; preparado para activarla (ver abajo). |
| `_admin/panel.html` | El editor visual real. Solo accesible con sesión iniciada. |
| `assets/`, `brand/`, `404.html`, `favicon.ico`, `site.webmanifest` | Igual que antes: iconos, logo, página de error. |
| `robots.txt`, `sitemap.xml`, `_headers`, `wrangler.toml` | Configuración técnica y de buscadores. |
| `netlify.toml` | Solo relevante si en el futuro alguien aloja **la parte pública** en Netlify (ver limitación más abajo). |

---

## ⚠️ Importante: esto necesita Cloudflare Pages (no cualquier hosting gratuito)

El panel privado, el guardado en vivo y la subida de fotos usan **Cloudflare Pages Functions** + **KV** (almacenamiento clave-valor de Cloudflare). Es la pieza que hace posible tener login sin exponer contraseñas y guardar cambios sin necesidad de subir archivos a mano.

- **Cloudflare Pages**: funciona todo — web pública, panel privado, login, galería editable, chat con respaldo local.
- **Netlify / GitHub Pages**: la web pública funciona igual (leyendo `content.json`), pero **el panel de administración y el login no funcionan** ahí — esos hostings no ejecutan este tipo de funciones ni tienen este KV. Si en el futuro quieres el panel en otro sitio, habría que adaptar `functions/` a su formato equivalente.

Por eso la recomendación pasa a ser, sin alternativa relevante: **Cloudflare Pages**, gratis, sin tarjeta de crédito.

---

## Publicar por primera vez

### 1. Crear el proyecto en Cloudflare Pages

1. Crea una cuenta gratuita en `dash.cloudflare.com`.
2. **Workers & Pages → Create → Pages → Upload assets** (o conecta un repositorio de GitHub si prefieres historial de cambios — sube esta carpeta completa tal cual).
3. Nombra el proyecto, por ejemplo `pinerock-services`. Tu web quedará en `https://pinerock-services.pages.dev`.
4. Sube **todo el contenido** de esta carpeta (`index.html`, `functions/`, `_admin/`, `content.json`, etc. — todo junto, sin dejar nada fuera).
5. Deploy. La **web pública** ya funciona en ese momento. El panel privado todavía no, hasta el paso 2.

### 2. Configurar el área privada (una sola vez)

En el proyecto, dentro de Cloudflare Pages:

**a) Crear el almacenamiento (KV):**
- **Workers & Pages → KV → Create a namespace** → nómbralo, por ejemplo, `pinerock_kv`.
- Vuelve a tu proyecto Pages → **Settings → Functions → KV namespace bindings → Add binding**.
- Variable name: `PINEROCK_KV` (exactamente así, en mayúsculas). Namespace: el que acabas de crear.

**b) Crear la contraseña y la clave de firma (secretos, nunca visibles):**
- **Settings → Environment variables → Add variable**, y marca **Encrypt** en ambas:
  - `ADMIN_PASSWORD` → la contraseña que tú elijas para entrar al panel.
  - `SESSION_SECRET` → un texto largo y aleatorio (por ejemplo, 40 caracteres al azar; puedes generarlo en `1password.com/password-generator` o similar). No es una contraseña que uses tú: solo sirve para firmar la sesión.
- Guarda y vuelve a desplegar el proyecto (Cloudflare lo pide tras cambiar variables — botón **Retry deployment** o sube de nuevo los archivos).

**c) Probarlo:**
- Ve a `https://tu-proyecto.pages.dev/admin`, escribe la contraseña que pusiste en `ADMIN_PASSWORD`.
- Deberías entrar al panel y ver el contenido actual de la web.

Sin este paso 2, `/admin` seguirá mostrando el formulario de login pero rechazará cualquier contraseña (por seguridad, no por error) hasta que existan esas dos variables.

### 3. Dominio propio (opcional)

Se compra aparte (10-15 USD/año). **Custom domains → Set up a domain** dentro del proyecto Pages. Gratis conectarlo, con HTTPS incluido.

---

## Usar el panel del día a día

1. Entra en `tudominio.com/admin` (o `tu-proyecto.pages.dev/admin`) con la contraseña.
2. Cambia lo que necesites en cualquiera de las pestañas: Contacto, Portada, Servicios, Piedra alemana, Cómo funciona, Galería, Ventajas, Preguntas frecuentes, Pie de página.
3. En la **galería**, añade proyectos con «+ Añadir proyecto», arrastra sus fotos (se optimizan y suben solas), reordénalas o bórralas con los botones de cada tarjeta.
4. Pulsa **«💾 Guardar en la web»**: los cambios quedan publicados al instante, sin subir ningún archivo.
5. **«⬇ Copia de seguridad»** descarga un `content.json` con fecha, útil como histórico por si algún día quieres volver a una versión anterior (para restaurarla, se importa con «📂 Importar content.json» y se vuelve a guardar).
6. **«Cerrar sesión»** al terminar, sobre todo si usas un ordenador compartido.

---

## El chat de preguntas para clientes

En la web pública, sección **«Pregúntanos»**: los visitantes escriben una pregunta y reciben respuesta al instante.

- **Ahora mismo** no hay ninguna IA conectada (a propósito: así no hace falta ninguna clave todavía). El chat responde localmente, buscando la mejor coincidencia dentro de tus propios Servicios y Preguntas frecuentes (`content.json`); si no encuentra nada razonable, invita a escribir por WhatsApp.
- **Para conectar una IA en el futuro:**
  1. Elige un proveedor (Anthropic, OpenAI, etc.) y consigue una clave de API.
  2. En Cloudflare Pages → **Settings → Environment variables**, añade un secreto `AI_API_KEY` con esa clave (marca **Encrypt**). Nunca se escribe en ningún archivo ni llega al navegador del visitante.
  3. Edita `functions/api/chat.js`: dentro ya hay un bloque comentado que indica exactamente dónde poner la llamada real a la API, usando `env.AI_API_KEY` — esa llamada ocurre en el servidor de Cloudflare, nunca en el navegador de quien visita la web.
  4. Vuelve a desplegar. El chat empezará a usar la IA automáticamente; si algún día fallara la conexión, sigue teniendo la respuesta local como red de seguridad.

---

## Actualizar la web más adelante

- **Contenido, precios, teléfono, WhatsApp, galería:** todo desde `/admin`, sin tocar archivos.
- **Cambios de diseño:** hay que editar `index.html` (el CSS y la estructura) y volver a desplegar esa versión del archivo en Cloudflare Pages.
- **`content.json`** (el archivo estático incluido aquí) es solo el contenido de fábrica / respaldo de arranque: una vez guardas algo desde el panel, la web usa la versión guardada en KV con prioridad. Si algún día quieres "resetear" al contenido de fábrica, bórralo desde el panel campo a campo, o importa este `content.json` original con «📂 Importar content.json» y guarda.

---

## Migrar a otro hosting en el futuro

- **La web pública** (`index.html`, `assets/`, `content.json`) es 100% portable: funciona en cualquier hosting estático (Netlify, GitHub Pages, Vercel, un servidor propio...), copiando la carpeta.
- **El panel privado y el chat con IA** dependen de Cloudflare Pages Functions + KV tal como están escritos. Para moverlos a otro proveedor con funciones serverless (Vercel, Netlify Functions, AWS Lambda...) habría que reescribir los archivos de `functions/` con la sintaxis de ese proveedor — la lógica (login con HMAC, sesión firmada, KV de contenido y fotos) se puede trasladar, pero el código en sí es específico de Cloudflare.

**Guarda siempre una copia de esta carpeta fuera del hosting** (disco externo, Google Drive, Dropbox) y, si migras, exporta también el contenido actual desde el panel («⬇ Copia de seguridad») antes de cambiar de proveedor, por si el KV no se puede llevar tal cual.

---

## Comprobaciones después de publicar

- [ ] La web pública se ve bien en móvil, tablet y ordenador, en ambos idiomas.
- [ ] `/admin` pide contraseña y la rechaza si está mal escrita.
- [ ] Con la contraseña correcta, entra al panel y ve el contenido actual.
- [ ] Añadir/editar un proyecto de la galería con foto y guardar se refleja en la web pública al recargarla.
- [ ] El chat de «Pregúntanos» responde algo razonable a una pregunta típica (aunque sea con la respuesta local).
- [ ] «Cerrar sesión» y volver a intentar abrir `/_admin/panel.html` directamente te redirige a `/admin` en vez de mostrar el panel.
