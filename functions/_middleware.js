// functions/_middleware.js
// Se ejecuta en TODAS las peticiones. Su única función aquí es impedir que
// alguien sin sesión válida pueda descargar el panel de administración
// (/_admin/*), que es donde vive el editor real. Sin esto, cualquiera
// podría intentar acceder al archivo directamente aunque no esté enlazado.
import { isAuthenticated } from "./_lib/auth.js";

export async function onRequest(context) {
  const { request, next, env } = context;
  const url = new URL(request.url);

  if (url.pathname.startsWith("/_admin/")) {
    const ok = await isAuthenticated(request, env);
    if (!ok) {
      return Response.redirect(new URL("/admin", url).toString(), 302);
    }
  }

  return next();
}
