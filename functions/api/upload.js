// POST /api/upload  { filename, contentType, dataBase64 } -> { ok:true, url }
// Guarda la imagen en el KV namespace (env.PINEROCK_KV) bajo la clave
// "media:<filename>" y devuelve la URL pública (/media/<filename>) desde
// la que la web y el panel pueden leerla. Requiere sesión de administrador.
import { isAuthenticated } from "../_lib/auth.js";

function base64ToBytes(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function safeName(name) {
  return String(name || "foto.jpg").toLowerCase().replace(/[^a-z0-9.\-_]/g, "-").slice(0, 120);
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
    return new Response(JSON.stringify({ ok: false, error: "Falta configurar el almacenamiento (KV namespace PINEROCK_KV)." }), {
      status: 503, headers: { "Content-Type": "application/json" }
    });
  }

  let body;
  try { body = await request.json(); } catch {
    return new Response(JSON.stringify({ ok: false, error: "Petición inválida." }), {
      status: 400, headers: { "Content-Type": "application/json" }
    });
  }

  const filename = safeName(body.filename);
  const contentType = typeof body.contentType === "string" ? body.contentType : "image/jpeg";
  if (!body.dataBase64 || typeof body.dataBase64 !== "string") {
    return new Response(JSON.stringify({ ok: false, error: "Falta la imagen." }), {
      status: 400, headers: { "Content-Type": "application/json" }
    });
  }

  let bytes;
  try { bytes = base64ToBytes(body.dataBase64); } catch {
    return new Response(JSON.stringify({ ok: false, error: "La imagen no se pudo decodificar." }), {
      status: 400, headers: { "Content-Type": "application/json" }
    });
  }
  // Límite razonable por foto (4 MB) para no agotar cuota gratuita de KV.
  if (bytes.byteLength > 4 * 1024 * 1024) {
    return new Response(JSON.stringify({ ok: false, error: "La foto pesa demasiado (máximo 4 MB, comprímela antes)." }), {
      status: 413, headers: { "Content-Type": "application/json" }
    });
  }

  const key = "media:" + filename;
  await env.PINEROCK_KV.put(key, bytes.buffer, { metadata: { contentType } });

  return new Response(JSON.stringify({ ok: true, url: "/media/" + filename }), {
    headers: { "Content-Type": "application/json" }
  });
}
