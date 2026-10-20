// Sirve la pagina del boceto y saca una captura por mineral y tamano:
// `node docs/bocetos/minerales/render.mjs` (despues de `npm install`).
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';

const dir = new URL('.', import.meta.url).pathname;
const files = {
  '/': [dir + 'index.html', 'text/html'],
  '/three.module.js': [new URL('../../../node_modules/three/build/three.module.js', import.meta.url).pathname, 'text/javascript'],
};
const server = createServer(async (req, res) => {
  const [file, type] = files[req.url.split('?')[0]] ?? [];
  if (!file) { res.statusCode = 404; return res.end(); }
  res.setHeader('content-type', type);
  res.end(await readFile(file));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const browser = await chromium.launch();
for (const [m, size] of [['cobre', 1], ['carbon', 1], ['cobre', 0.5], ['carbon', 0.5]]) {
  const page = await browser.newPage({ viewport: { width: 1000, height: 900 } });
  page.on('pageerror', (e) => console.log('error', String(e)));
  await page.goto(`http://127.0.0.1:${server.address().port}/?m=${m}&s=${size}`);
  await page.waitForSelector('body[data-ready="1"]', { timeout: 30000 });
  await page.waitForTimeout(500);
  const name = `${dir}${m}-${String(size).replace('.', '')}.png`;
  await page.screenshot({ path: name, fullPage: true });
  console.log('ok', name);
}
await browser.close();
server.close();
