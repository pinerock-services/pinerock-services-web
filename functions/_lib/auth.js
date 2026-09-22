// functions/_lib/auth.js
// Utilidades de autenticación para el área privada de PineRock Services.
//
// IMPORTANTE: aquí NO hay ninguna contraseña ni clave secreta escrita.
// Todo se lee de variables de entorno (secrets) que se configuran en el
// panel de Cloudflare Pages: env.ADMIN_PASSWORD y env.SESSION_SECRET.
// Si esas variables no existen todavía, el login se rechaza de forma
// segura (nadie puede entrar) hasta que el propietario las configure.

const COOKIE_NAME = "pinerock_admin";
const SESSION_HOURS = 12;

function toHex(buf) {
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function hmac(secret, message) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return toHex(sig);
}

// Comparación en tiempo constante para no filtrar información por temporización.
function timingSafeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) {
    // Aun si difieren en longitud, recorremos algo para no filtrar por tiempo de forma obvia.
    let dummy = 0;
    for (let i = 0; i < Math.max(a?.length || 0, b?.length || 0, 16); i++) dummy |= i;
    return false;
  }
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function checkPassword(candidate, env) {
  if (!env.ADMIN_PASSWORD || !env.SESSION_SECRET) return false;
  if (!candidate) return false;
  // Comparamos HMACs en vez de las cadenas directas: ni siquiera en memoria
  // se comparan las contraseñas en claro caracter a caracter de forma trivial.
  const a = await hmac(env.SESSION_SECRET, "pw:" + candidate);
  const b = await hmac(env.SESSION_SECRET, "pw:" + env.ADMIN_PASSWORD);
  return timingSafeEqual(a, b);
}

export async function makeSessionToken(env) {
  const expires = Date.now() + SESSION_HOURS * 60 * 60 * 1000;
  const payload = String(expires);
  const sig = await hmac(env.SESSION_SECRET, "session:" + payload);
  return payload + "." + sig;
}

export async function verifySessionToken(token, env) {
  if (!token || !env.SESSION_SECRET) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [payload, sig] = parts;
  const expected = await hmac(env.SESSION_SECRET, "session:" + payload);
  if (!timingSafeEqual(sig, expected)) return false;
  const expires = Number(payload);
  if (!Number.isFinite(expires) || Date.now() > expires) return false;
  return true;
}

export function getCookie(request, name) {
  const header = request.headers.get("Cookie") || "";
  const match = header.match(new RegExp("(?:^|;\\s*)" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[1]) : null;
}

export function setSessionCookieHeader(token) {
  const maxAge = SESSION_HOURS * 60 * 60;
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Strict`;
}

export function clearSessionCookieHeader() {
  return `${COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`;
}

export async function isAuthenticated(request, env) {
  const token = getCookie(request, COOKIE_NAME);
  return verifySessionToken(token, env);
}

export const COOKIE = COOKIE_NAME;
