// Local storefront preview only: never expose backend files, credentials or repository metadata.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const types = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.json':'application/json', '.xml':'application/xml', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.png':'image/png', '.webp':'image/webp', '.svg':'image/svg+xml', '.ico':'image/x-icon', '.woff2':'font/woff2' };
http.createServer((request, response) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname); } catch { response.writeHead(400).end(); return; }
  const segments = pathname.replace(/\\/g, '/').split('/').filter(Boolean);
  if (segments.some(segment => segment.startsWith('.') || ['marketplace-backend','node_modules','scripts'].includes(segment))) { response.writeHead(404).end(); return; }
  const file = path.resolve(root, '.' + pathname, pathname.endsWith('/') ? 'index.html' : '');
  if (!file.startsWith(root + path.sep) || !types[path.extname(file)] || !fs.existsSync(file) || !fs.statSync(file).isFile()) { response.writeHead(404).end(); return; }
  response.writeHead(200, { 'Content-Type':types[path.extname(file)], 'Cache-Control':'no-store' });
  fs.createReadStream(file).pipe(response);
}).listen(4173, '127.0.0.1', () => console.log('Cyclify local preview: http://127.0.0.1:4173'));
