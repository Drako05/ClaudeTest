import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const file = fileURLToPath(new URL('../packages/client/dist/index.html', import.meta.url));
const html = await readFile(file);
const server = createServer((_, res) => { res.setHeader('content-type', 'text/html'); res.end(html); });
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const problems = [];
page.on('console', (m) => { if (m.type() === 'error') problems.push(m.text()); });
page.on('pageerror', (e) => problems.push(String(e)));

await page.goto(`http://127.0.0.1:${port}/?seed=12345`, { waitUntil: 'load' });
await page.waitForTimeout(3500);
console.log('HUD:', await page.textContent('#hud'));

// Las proporciones, medidas del dibujo y no de una captura: es la unica forma de
// afirmar «el jugador mide 1,8 bloques» en vez de que lo parezca.
const sizes = await page.evaluate(() => window.__verdant.sizes);
console.log(
  'PROPORCIONES (bloques):',
  Object.entries(sizes).map(([k, v]) => `${k} ${v.toFixed(2)}`).join(' · '),
);

await page.screenshot({ path: 'screenshots/01-perspectiva.png' });

// Girar la camara: arrastre en la mitad derecha.
for (const [i, dx] of [[1, 260], [2, 260], [3, 260]]) {
  await page.mouse.move(900, 400);
  await page.mouse.down();
  await page.mouse.move(900 - dx, 380, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(900);
  await page.screenshot({ path: `screenshots/0${i + 1}-giro.png` });
}

// El ojo, que es lo que hay en un telefono: la tecla P no existe alli. Su estado
// se lee del `title` y de la clase, no del texto: es un icono y no lleva ninguno.
const eye = async () =>
  `${await page.getAttribute('#proj', 'title')} · ${(await page.getAttribute('#proj', 'class')) || 'ojo abierto'}`;
console.log('OJO:', await eye());
await page.click('#proj');
await page.waitForTimeout(900);
console.log('HUD:', await page.textContent('#hud'));
console.log('OJO:', await eye());
await page.screenshot({ path: 'screenshots/05-orto.png' });
await page.click('#proj');
await page.waitForTimeout(700);
console.log('OJO de vuelta:', await eye());

console.log(problems.length ? `PROBLEMAS: ${problems.slice(0, 5).join(' | ')}` : 'sin errores de consola');
await browser.close();
server.close();
