// Minimal static server for the Stripe e2e harness.
//   /build/...  -> www/build/ (output of `pnpm run build`)
//   /e2e/...    -> e2e/stripe/pages/ (harness pages)
//   /e2e/health -> 200, used by Playwright to wait for the server
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const wwwRoot = resolve(here, '../../www');
const pagesRoot = resolve(here, 'pages');
const port = Number(process.env.STRIPE_E2E_PORT ?? 4321);

try {
  await stat(join(wwwRoot, 'build', 'stripe-elements.esm.js'));
} catch {
  console.error(`www/build/stripe-elements.esm.js not found. Run \`pnpm run build\` first.`);
  process.exit(1);
}

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
};

/** Resolve a URL path inside a root directory; undefined if it escapes the root. */
const inside = (root, urlPath) => {
  const target = resolve(root, '.' + normalize(decodeURIComponent(urlPath)));

  return target === root || target.startsWith(root + sep) ? target : undefined;
};

const server = createServer(async (req, res) => {
  const { pathname } = new URL(req.url ?? '/', 'http://localhost');

  if (pathname === '/e2e/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain' }).end('ok');

    return;
  }

  const file = pathname.startsWith('/e2e/') ? inside(pagesRoot, pathname.slice('/e2e'.length)) : inside(wwwRoot, pathname);

  try {
    if (file == null) {
      throw new Error('outside root');
    }

    const path = (await stat(file)).isDirectory() ? join(file, 'index.html') : file;
    const body = await readFile(path);

    res.writeHead(200, { 'Content-Type': TYPES[extname(path)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' }).end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' }).end(`not found: ${pathname}`);
  }
});

server.listen(port, 'localhost', () => {
  console.log(`stripe e2e harness: http://localhost:${port}/e2e/ (www: ${wwwRoot})`);
});
