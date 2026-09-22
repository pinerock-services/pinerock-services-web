// POST /api/login  { password }  -> { ok:true } + cookie de sesión, o 401
import { checkPassword, makeSessionToken, setSessionCookieHeader } from "../_lib/auth.js";

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.ADMIN_PASSWORD || !env.SESSION_SECRET) {
    return new Response(
      JSON.stringify({ ok: false, error: "El acceso privado aún no está configurado en este hosting (faltan ADMIN_PASSWORD / SESSION_SECRET)." }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }

  let body;
  try { body = await request.json(); } catch { body = {}; }
  const password = typeof body.password === "string" ? body.password : "";

  const valid = await checkPassword(password, env);
  if (!valid) {
    return new Response(JSON.stringify({ ok: false }), {
      status: 401, headers: { "Content-Type": "application/json" }
    });
  }

  const token = await makeSessionToken(env);
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": setSessionCookieHeader(token)
    }
  });
}
