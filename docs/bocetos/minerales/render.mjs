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
// La hoja de coronas del voxel: seis sorteos de cada mineral, de lado, desde
// arriba y desde abajo, para ver que la flor se mantiene con la variedad.
for (const m of ['cobre', 'carbon']) {
  const cells = [];
  for (let seed = 0; seed < 6; seed++) {
    const page = await browser.newPage({ viewport: { width: 1000, height: 900 } });
    await page.goto(`http://127.0.0.1:${server.address().port}/?m=${m}&s=0.5&semilla=${seed}&vistas=0,3,4`);
    await page.waitForSelector('body[data-ready="1"]', { timeout: 30000 });
    cells.push({
      imgs: await page.$$eval('#out img', (imgs) => imgs.map((i) => i.src)),
      corona: await page.$eval('body', (b) => b.dataset.corona),
      abajo: await page.$eval('body', (b) => b.dataset.abajo),
      solapes: await page.$eval('body', (b) => b.dataset.solapes),
    });
    console.log(`  ${m} sorteo ${seed + 1}: arriba ${cells.at(-1).corona}, abajo ${cells.at(-1).abajo}, solapes en los lados ${cells.at(-1).solapes}`);
    await page.close();
  }
  const sheet = await browser.newPage({ viewport: { width: 1000, height: 900 } });
  await sheet.setContent(`<body style="margin:0;background:#1b2130;color:#e8eef7;font:600 15px monospace">
    <h1 style="font-size:18px;margin:12px">${m === 'cobre' ? 'Cobre' : 'Carbon'}: seis coronas sorteadas (voxel de 0,5), de lado, desde arriba y desde abajo</h1>
    <div style="display:grid;grid-template-columns:repeat(3,300px);gap:10px;padding:0 12px 12px">
    ${cells.map((c, i) => `<figure style="margin:0">${c.imgs.map((src) => `<img src="${src}" width="300" height="300" style="display:block">`).join('')}<figcaption>sorteo ${i + 1}<br>arriba: ${c.corona}<br>abajo: ${c.abajo}<br>solapes en los lados: ${c.solapes}</figcaption></figure>`).join('')}
    </div></body>`);
  const name = `${dir}coronas-${m}.png`;
  await sheet.screenshot({ path: name, fullPage: true });
  await sheet.close();
  console.log('ok', name);
}
await browser.close();
server.close();
