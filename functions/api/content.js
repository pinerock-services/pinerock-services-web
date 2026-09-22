// GET  /api/content  -> devuelve el content.json actual (público: lo lee la web)
// POST /api/content  -> guarda un content.json nuevo (requiere sesión de administrador)
//
// El contenido "vivo" se guarda en un KV namespace de Cloudflare (env.PINEROCK_KV,
// clave "content"). Si esa clave todavía no existe (primer despliegue, antes de
// que el administrador guarde nada), se sirve el content.json estático que
// viene con el proyecto, para que la web nunca se quede vacía.
import { isAuthenticated } from "../_lib/auth.js";

const KV_KEY = "content";

export async function onRequestGet(context) {
  const { env, request } = context;
  try {
    if (env.PINEROCK_KV) {
      const stored = await env.PINEROCK_KV.get(KV_KEY);
      if (stored) {
        return new Response(stored, {
          headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
        });
      }
    }
  } catch (e) {
    // si el KV falla, seguimos y devolvemos el respaldo estático
  }

  // Respaldo: el content.json de fábrica incluido en el despliegue.
  const fallbackUrl = new URL("/content.json", request.url);
  const res = await env.ASSETS.fetch(fallbackUrl);
  return new Response(res.body, {
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  const ok = await isAuthenticated(request, env);
  if (!ok) {
    return new Response(JSON.stringify({ ok: false, error: "No autenticado." }), {
      status: 401, headers: { "Content-Type": "application/json" }
    });
  }

  if (!env.PINEROCK_KV) {
    return new Response(JSON.stringify({
      ok: false,
      error: "Falta configurar el almacenamiento (KV namespace PINEROCK_KV) en este hosting."
    }), { status: 503, headers: { "Content-Type": "application/json" } });
  }

  let body;
  try { body = await request.text(); JSON.parse(body); } catch {
    return new Response(JSON.stringify({ ok: false, error: "El contenido enviado no es un JSON válido." }), {
      status: 400, headers: { "Content-Type": "application/json" }
    });
  }

  await env.PINEROCK_KV.put(KV_KEY, body);
  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" }
  });
}
