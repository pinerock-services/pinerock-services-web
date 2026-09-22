// GET /media/<archivo> -> sirve una foto guardada desde el panel de administración.
// Es de lectura pública a propósito: son las fotos de la galería de la web,
// pensadas para que las vea cualquier visitante. Solo GUARDAR pasa por login.
export async function onRequestGet(context) {
  const { env, params } = context;
  const path = Array.isArray(params.path) ? params.path.join("/") : params.path;

  if (!env.PINEROCK_KV) {
    return new Response("Almacenamiento no configurado.", { status: 503 });
  }

  const key = "media:" + path;
  const result = await env.PINEROCK_KV.getWithMetadata(key, { type: "arrayBuffer" });
  if (!result || !result.value) {
    return new Response("No encontrado", { status: 404 });
  }

  const contentType = (result.metadata && result.metadata.contentType) || "application/octet-stream";
  return new Response(result.value, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable"
    }
  });
}
