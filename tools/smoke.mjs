/**
 * Prueba de humo del cliente en un navegador real.
 *
 * Los tests unitarios cubren la simulacion, pero no pueden decir si el juego
 * ARRANCA: si WebGL inicializa, si el bundle carga, si el bucle avanza. Esto
 * abre el build en Chromium headless, lo juega unos segundos leyendo el estado
 * real por window.__verdant, y guarda capturas.
 *
 *   npm run build && node tools/smoke.mjs
 */

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

// VERDANT_DIST permite verificar tambien el build de un solo fichero.
const DIST = process.env.VERDANT_DIST
  ? fileURLToPath(new URL(process.env.VERDANT_DIST, import.meta.url))
  : fileURLToPath(new URL('../packages/client/dist', import.meta.url));
const SHOTS = fileURLToPath(new URL('../screenshots', import.meta.url));
const SEED = 12345;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
};

function serve(root) {
  const server = createServer(async (req, res) => {
    const urlPath = decodeURIComponent((req.url ?? '/').split('?')[0]);
    const rel = normalize(urlPath === '/' ? '/index.html' : urlPath).replace(/^(\.\.[/\\])+/, '');
    const file = join(root, rel);
    if (!file.startsWith(root) || !existsSync(file)) {
      res.writeHead(404).end('not found');
      return;
    }
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
    res.end(await readFile(file));
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}

function fail(msg) {
  console.error(`FALLO: ${msg}`);
  process.exitCode = 1;
}

// VERDANT_URL verifica un despliegue ya publicado en vez del build local.
const remote = process.env.VERDANT_URL;
const { server, port } = remote ? { server: null, port: 0 } : await serve(DIST);
const baseUrl = remote ?? `http://127.0.0.1:${port}`;
// Al verificar un despliegue remoto puede haber un proxy de salida obligatorio.
const proxyUrl = remote ? (process.env.HTTPS_PROXY ?? process.env.https_proxy) : undefined;
const browser = await chromium.launch(proxyUrl ? { proxy: { server: proxyUrl } } : {});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

const problems = [];
page.on('console', (m) => {
  if (m.type() === 'error') problems.push(`console: ${m.text()}`);
});
page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));

console.log(`probando ${baseUrl}`);
await page.goto(`${baseUrl}/?seed=${SEED}`, { waitUntil: 'load' });

// Esperar a que el bucle haya corrido de verdad, no solo a que cargue el HTML.
await page.waitForFunction(() => window.__verdant && window.__verdant.tick > 90, null, {
  timeout: 20000,
});

const spawn = await page.evaluate(() => window.__verdant);
console.log('estado inicial:', JSON.stringify(spawn));

if (spawn.seed !== SEED) fail(`la semilla de la URL no se respeto (${spawn.seed})`);
if (spawn.chunks <= 0) fail('no se cargo ningun chunk');
if (spawn.health !== 100) fail(`salud inicial inesperada: ${spawn.health}`);

await page.screenshot({ path: join(SHOTS, '01-spawn.png') });

// Caminar hacia el este y comprobar que la posicion cambia de verdad.
await page.keyboard.down('KeyD');
await page.waitForTimeout(1600);
await page.keyboard.up('KeyD');

const moved = await page.evaluate(() => window.__verdant);
console.log('tras caminar:', JSON.stringify(moved));
if (!(moved.x > spawn.x + 1)) fail(`el jugador no avanzo (${spawn.x} -> ${moved.x})`);
if (moved.tick <= spawn.tick) fail('la simulacion no avanzo');
if (!(moved.hunger < spawn.hunger)) fail('el hambre no bajo con el tiempo');

await page.screenshot({ path: join(SHOTS, '02-explorando.png') });

// Recolectar por el camino: barrido corto pulsando espacio en varias direcciones.
for (const key of ['KeyW', 'KeyD', 'KeyS', 'KeyA']) {
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press('Space');
    await page.keyboard.down(key);
    await page.waitForTimeout(120);
    await page.keyboard.up(key);
  }
}
const gathered = await page.evaluate(() => window.__verdant);
console.log('inventario tras recolectar:', JSON.stringify(gathered.inventory));

// Vista amplia, util para juzgar la generacion del mundo de un vistazo.
for (let i = 0; i < 7; i++) await page.keyboard.press('Minus');
await page.waitForTimeout(500);
await page.screenshot({ path: join(SHOTS, '03-mundo-amplio.png') });

if (problems.length) {
  for (const p of problems) fail(p);
} else {
  console.log('sin errores de consola ni excepciones');
}

await browser.close();
server?.close();

console.log(process.exitCode ? 'HUMO: FALLIDO' : 'HUMO: OK');
