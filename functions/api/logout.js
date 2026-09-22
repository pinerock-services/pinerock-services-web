// POST /api/logout -> borra la cookie de sesión
import { clearSessionCookieHeader } from "../_lib/auth.js";

export async function onRequestPost() {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": clearSessionCookieHeader()
    }
  });
}
