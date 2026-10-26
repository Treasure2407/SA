// Local preview: `node dev.mjs` → http://localhost:5174. Rebuilds on every page load.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from './build.mjs';

const root = join(fileURLToPath(new URL('.', import.meta.url)), 'dist');
const port = Number(process.argv[2]) || 5174;
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.mp4': 'video/mp4' };

createServer(async (req, res) => {
  let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (path.endsWith('/')) {
    path += 'index.html';
    try { await build(); } catch (err) { res.writeHead(500).end(`Build failed:\n${err.stack}`); return; }
  }
  let file = normalize(join(root, path));
  if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
  try { if ((await stat(file)).isDirectory()) file = join(file, 'index.html'); } catch {}
  let body;
  try { body = await readFile(file); } catch { res.writeHead(404).end('Not found'); return; }
  res.writeHead(200, { 'Content-Type': types[extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' }).end(body);
}).listen(port, () => console.log(`Showreel preview on http://localhost:${port}`));
