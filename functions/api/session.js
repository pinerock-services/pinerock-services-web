// GET /api/session -> { authenticated: true|false }
import { isAuthenticated } from "../_lib/auth.js";

export async function onRequestGet(context) {
  const ok = await isAuthenticated(context.request, context.env);
  return new Response(JSON.stringify({ authenticated: ok }), {
    headers: { "Content-Type": "application/json" }
  });
}
