// Sistema de Noticias (administración): permite registrar noticias en MySQL.
// Se expone en el clúster por el NodePort 30001.
const express = require('express');
const mysql = require('mysql2/promise');

const app = express();
app.use(express.urlencoded({ extended: true }));

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 5,
});

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const page = (body) => `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><title>Sistema de Noticias - Admin</title>
<style>
 body{font-family:Arial,sans-serif;max-width:760px;margin:40px auto;padding:0 16px;background:#f4f6f8}
 h1{color:#1f3b57} form,.item{background:#fff;padding:16px;border-radius:8px;margin-bottom:12px;box-shadow:0 1px 3px #0002}
 input,textarea,select{width:100%;padding:8px;margin:6px 0 12px;box-sizing:border-box}
 button{background:#1f6feb;color:#fff;border:0;padding:10px 18px;border-radius:6px;cursor:pointer}
 .ok{background:#d4edda;padding:10px;border-radius:6px} .err{background:#f8d7da;padding:10px;border-radius:6px}
 small{color:#666}
</style></head><body>
<h1>Sistema de Noticias &mdash; Registro</h1>
<p><small>Pod: ${esc(process.env.HOSTNAME)}</small></p>
${body}
</body></html>`;

const form = `
<form method="POST" action="/noticias">
  <label>Título</label><input name="titulo" required maxlength="200">
  <label>Categoría</label>
  <select name="categoria"><option>General</option><option>Tecnología</option><option>Deportes</option><option>Cultura</option><option>Economía</option></select>
  <label>Autor</label><input name="autor" required maxlength="100">
  <label>Contenido</label><textarea name="contenido" rows="6" required></textarea>
  <button type="submit">Registrar noticia</button>
</form>`;

async function listado() {
  const [rows] = await pool.query('SELECT id, titulo, categoria, autor, fecha FROM noticias ORDER BY fecha DESC LIMIT 20');
  if (!rows.length) return '<p>No hay noticias registradas.</p>';
  return '<h2>Noticias registradas</h2>' + rows
    .map((n) => `<div class="item"><b>#${n.id} ${esc(n.titulo)}</b><br><small>${esc(n.categoria)} · ${esc(n.autor)} · ${new Date(n.fecha).toLocaleString('es-CO')}</small></div>`)
    .join('');
}

app.get('/', async (req, res) => {
  let msg = '';
  if (req.query.ok) msg = '<p class="ok">Noticia registrada correctamente.</p>';
  try {
    res.send(page(msg + form + (await listado())));
  } catch (e) {
    res.status(500).send(page(form + `<p class="err">No se pudo conectar a la base de datos: ${esc(e.message)}</p>`));
  }
});

app.post('/noticias', async (req, res) => {
  const { titulo, categoria, autor, contenido } = req.body;
  try {
    await pool.query('INSERT INTO noticias (titulo, categoria, autor, contenido) VALUES (?, ?, ?, ?)', [titulo, categoria, autor, contenido]);
    res.redirect('/?ok=1');
  } catch (e) {
    res.status(500).send(page(`<p class="err">Error guardando la noticia: ${esc(e.message)}</p><a href="/">Volver</a>`));
  }
});

app.get('/salud', (req, res) => res.send('ok'));

const port = Number(process.env.PORT || 3000);
app.listen(port, () => console.log(`noticias-admin escuchando en el puerto ${port}`));
