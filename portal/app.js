// Portal de Noticias (público): consulta las noticias guardadas en MySQL.
// Se expone en el clúster por el NodePort 30000.
const express = require('express');
const mysql = require('mysql2/promise');

const app = express();

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
<html lang="es"><head><meta charset="utf-8"><title>Portal de Noticias</title>
<style>
 body{font-family:Georgia,serif;max-width:820px;margin:40px auto;padding:0 16px;background:#fffdf7}
 header{border-bottom:3px double #333;margin-bottom:24px} h1{font-size:40px;margin:0}
 article{border-bottom:1px solid #ddd;padding:16px 0} h2{margin:0 0 6px}
 .meta{color:#777;font-size:14px;font-family:Arial,sans-serif} .tag{background:#333;color:#fff;padding:2px 8px;border-radius:4px;font-size:12px}
 p.contenido{white-space:pre-wrap;line-height:1.5} small{color:#888;font-family:Arial,sans-serif}
</style></head><body>
<header><h1>Portal de Noticias</h1><small>Servido por el pod: ${esc(process.env.HOSTNAME)}</small></header>
${body}
</body></html>`;

app.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM noticias ORDER BY fecha DESC');
    const html = rows.length
      ? rows.map((n) => `<article>
          <span class="tag">${esc(n.categoria)}</span>
          <h2>${esc(n.titulo)}</h2>
          <div class="meta">Por ${esc(n.autor)} · ${new Date(n.fecha).toLocaleString('es-CO')}</div>
          <p class="contenido">${esc(n.contenido)}</p>
        </article>`).join('')
      : '<p>Todavía no hay noticias publicadas.</p>';
    res.send(page(html));
  } catch (e) {
    res.status(500).send(page(`<p>No se pudo conectar a la base de datos: ${esc(e.message)}</p>`));
  }
});

app.get('/salud', (req, res) => res.send('ok'));

const port = Number(process.env.PORT || 3000);
app.listen(port, () => console.log(`portal escuchando en el puerto ${port}`));
