// functions/admin.js  ->  responde a GET /admin
// Formulario de acceso al área privada de PineRock. No contiene ninguna
// contraseña: solo envía lo que el usuario escribe a /api/login, que es
// quien compara contra la variable de entorno secreta.
import { isAuthenticated } from "./_lib/auth.js";

const LOGIN_HTML = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>Acceso privado — PineRock Services LLC</title>
<style>
:root{--blue:#013F80;--green:#31920B;--ink:#10202E;--ink-soft:#42596C;--mist:#EDF2F7;--line:#C9D7E4}
*{box-sizing:border-box}
body{margin:0;min-height:100vh;display:grid;place-items:center;background:linear-gradient(180deg,var(--mist),#fff 70%);
  font:400 16px/1.5 -apple-system,Segoe UI,Roboto,Arial,sans-serif;color:var(--ink);padding:20px}
.card{background:#fff;border:1px solid var(--line);border-radius:14px;padding:32px 28px;max-width:360px;width:100%;
  box-shadow:0 18px 40px -24px rgba(1,44,88,.55)}
h1{font-size:1.2rem;margin:0 0 6px}
p.sub{color:var(--ink-soft);font-size:.9rem;margin:0 0 22px}
label{display:block;font-weight:700;font-size:.85rem;margin-bottom:6px}
input{width:100%;padding:11px 13px;border:1.5px solid var(--line);border-radius:9px;font:inherit;margin-bottom:14px}
button{width:100%;padding:12px;border:0;border-radius:9px;background:var(--green);color:#fff;font-weight:700;cursor:pointer;font-size:1rem}
button:hover{background:#256F08}
.err{color:#B3261E;font-size:.87rem;margin:-6px 0 14px;display:none}
.err.show{display:block}
a.back{display:block;margin-top:18px;text-align:center;color:var(--blue);font-size:.85rem;text-decoration:none}
</style>
</head>
<body>
<div class="card">
  <h1>Área privada de PineRock</h1>
  <p class="sub">Acceso solo para el administrador autorizado de la web.</p>
  <form id="f">
    <label for="pw">Contraseña</label>
    <input type="password" id="pw" name="pw" autocomplete="current-password" required autofocus>
    <div class="err" id="err">Contraseña incorrecta. Inténtalo de nuevo.</div>
    <button type="submit">Entrar</button>
  </form>
  <a class="back" href="/">← Volver a la web</a>
</div>
<script>
document.getElementById('f').addEventListener('submit', async function(e){
  e.preventDefault();
  var pw = document.getElementById('pw').value;
  var err = document.getElementById('err');
  var btn = e.target.querySelector('button');
  btn.disabled = true; btn.textContent = 'Comprobando…';
  try{
    var r = await fetch('/api/login', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ password: pw })
    });
    var data = await r.json().catch(function(){ return {}; });
    if(r.ok && data.ok){
      window.location.href = '/_admin/panel.html';
    } else {
      err.classList.add('show');
      btn.disabled = false; btn.textContent = 'Entrar';
    }
  }catch(ex){
    err.textContent = 'No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.';
    err.classList.add('show');
    btn.disabled = false; btn.textContent = 'Entrar';
  }
});
</script>
</body>
</html>`;

export async function onRequestGet(context) {
  const { request, env } = context;
  const ok = await isAuthenticated(request, env);
  if (ok) {
    return Response.redirect(new URL("/_admin/panel.html", request.url).toString(), 302);
  }
  return new Response(LOGIN_HTML, {
    headers: { "Content-Type": "text/html; charset=utf-8", "X-Robots-Tag": "noindex,nofollow" }
  });
}
