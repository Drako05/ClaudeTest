import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
const html = await readFile('packages/client/dist/index.html');
const server = createServer((_, res) => { res.setHeader('content-type', 'text/html'); res.end(html); });
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const b = await chromium.launch();
const mobile = process.argv[3] === 'movil';
const p = mobile
  ? await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
  : await b.newPage({ viewport: { width: 1280, height: 720 } });
const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
await p.goto(`http://127.0.0.1:${server.address().port}/?seed=12345&dev=1`);
await p.waitForFunction(() => window.__verdant && window.__verdant.tick > 8200, null, { timeout: 60000 });
await p.click('[data-kit="piedra"]');
await p.keyboard.press('F3');
await p.waitForTimeout(300);
if (mobile) await p.tap('#invOpen'); else await p.keyboard.press('KeyE');
await p.waitForTimeout(600);
await p.screenshot({ path: process.argv[2] });
console.log('errores', errs);
await b.close(); server.close();
