// POST /api/chat  { message, history? }  -> { reply }
//
// Este endpoint es el punto donde en el futuro se conecta una IA para
// responder preguntas de clientes sobre los servicios de PineRock.
// A propósito, hoy NO llama a ningún proveedor de IA: así no hace falta
// ninguna clave todavía y el widget de la web sigue funcionando (usa una
// respuesta de reserva basada en el propio content.json, ver index.html).
//
// PARA ACTIVAR LA IA MÁS ADELANTE:
// 1. En Cloudflare Pages → Settings → Environment variables, añade un
//    secreto, por ejemplo AI_API_KEY, con la clave del proveedor que
//    elijas (nunca lo pongas en este archivo ni en ningún archivo público).
// 2. Sustituye el bloque "TODO" de aquí abajo por la llamada real a la
//    API de ese proveedor, usando env.AI_API_KEY. Esa llamada se hace
//    desde este servidor (Cloudflare Function), nunca desde el navegador,
//    así la clave nunca queda expuesta a los visitantes.
// 3. Dale contexto sobre PineRock (servicios, precios si los hay, zona de
//    trabajo) leyendo /api/content, para que las respuestas sean precisas.

export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try { body = await request.json(); } catch { body = {}; }
  const message = typeof body.message === "string" ? body.message.trim() : "";

  if (!message) {
    return new Response(JSON.stringify({ error: "Falta el mensaje." }), {
      status: 400, headers: { "Content-Type": "application/json" }
    });
  }

  if (!env.AI_API_KEY) {
    // Todavía no hay IA conectada. Se lo decimos claramente al frontend,
    // que entonces usa su propia respuesta de reserva basada en el FAQ.
    return new Response(JSON.stringify({
      configured: false,
      reply: null
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  }

  // ---- TODO: cuando actives env.AI_API_KEY, sustituye esto por la llamada real ----
  // Ejemplo orientativo (a adaptar al proveedor elegido):
  //
  // const upstream = await fetch("https://api.proveedor-ia.com/v1/chat", {
  //   method: "POST",
  //   headers: {
  //     "Content-Type": "application/json",
  //     "Authorization": "Bearer " + env.AI_API_KEY
  //   },
  //   body: JSON.stringify({
  //     messages: [
  //       { role: "system", content: "Eres el asistente de PineRock Services LLC..." },
  //       { role: "user", content: message }
  //     ]
  //   })
  // });
  // const data = await upstream.json();
  // return new Response(JSON.stringify({ configured: true, reply: data.reply }), {
  //   headers: { "Content-Type": "application/json" }
  // });

  return new Response(JSON.stringify({ configured: true, reply: null }), {
    status: 501, headers: { "Content-Type": "application/json" }
  });
}
