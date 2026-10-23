import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// Explicit allowlist: never serve arbitrary files from the computer.
const routes = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
  ['/lab.mjs', ['lab.mjs', 'text/javascript; charset=utf-8']],
  ['/style.css', ['style.css', 'text/css; charset=utf-8']],
]);

export async function handleRequest(req, res) {
    const headers = {
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      'Cache-Control': 'no-store',
      // unsafe-inline is intentional in this lab to enable the example.
      'Content-Security-Policy': "default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; frame-src 'self' about:; img-src data:; connect-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
    };
    if (!['GET', 'HEAD'].includes(req.method)) {
      res.writeHead(405, { ...headers, Allow: 'GET, HEAD' });
      return res.end();
    }
    const route = routes.get(req.url);
    if (!route) {
      res.writeHead(404, headers);
      return res.end('Not found');
    }
    try {
      const data = await readFile(new URL(`./public/${route[0]}`, import.meta.url));
      res.writeHead(200, { ...headers, 'Content-Type': route[1] });
      res.end(req.method === 'HEAD' ? undefined : data);
    } catch {
      res.writeHead(500, headers);
      res.end('Failed to load the lab');
    }
}

export function createServer() {
  return http.createServer(handleRequest);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const server = createServer();
  server.on('error', error => { console.error(error.message); process.exitCode = 1; });
  // Loopback only: do not expose a vulnerable app on the local network.
  const port = Number(process.env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be an integer from 1 to 65535.');
  server.listen(port, '127.0.0.1', () => console.log(`Lab: http://127.0.0.1:${port} — Press Ctrl+C to stop`));
}
