/**
 * Los gestos, medidos en un navegador de verdad.
 *
 * `tests/gestures.test.ts` afirma la regla; esto comprueba que la regla llega
 * viva hasta el lienzo. Son dos capas distintas: la logica pura no sabe nada de
 * `pointerdown`, y el cableado del DOM no sabe nada de duenos de dedos.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const file = fileURLToPath(new URL('../packages/client/dist/index.html', import.meta.url));
const html = await readFile(file);
const server = createServer((_, res) => { res.setHeader('content-type', 'text/html'); res.end(html); });
await new Promise((r) => server.listen(0, '127.0.0.1', r));

let failures = 0;
const check = (ok, msg) => { if (!ok) { failures++; console.log(`  FALLO: ${msg}`); } };

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
});
page.on('pageerror', (e) => { failures++; console.log(`  EXCEPCION: ${e}`); });
await page.goto(`http://127.0.0.1:${server.address().port}/?seed=3351842904`, { waitUntil: 'load' });
await page.waitForTimeout(2500);

/** Un gesto multitáctil crudo, que es lo único que reproduce dos pulgares. */
async function touches(points) {
  await page.evaluate((pts) => {
    const canvas = document.getElementById('view');
    for (const p of pts) {
      canvas.dispatchEvent(new PointerEvent(p.type, {
        pointerId: p.id, pointerType: 'touch', isPrimary: p.id === 1,
        clientX: p.x, clientY: p.y, bubbles: true,
      }));
    }
  }, points);
}

const before = await page.evaluate(() => window.__verdant);

// Los dos pulgares del autor: uno andando abajo a la izquierda, otro girando.
await touches([{ type: 'pointerdown', id: 1, x: 80, y: 700 }, { type: 'pointerdown', id: 2, x: 300, y: 400 }]);
for (let i = 1; i <= 24; i++) {
  await touches([
    { type: 'pointermove', id: 1, x: 80 + i * 2, y: 700 - i * 2 },
    { type: 'pointermove', id: 2, x: 300 - i * 5, y: 400 + i * 2 },
  ]);
}
await page.waitForTimeout(500);
const after = await page.evaluate(() => window.__verdant);

console.log(`  distancia ${before.distance.toFixed(2)} -> ${after.distance.toFixed(2)}`);
console.log(`  giro ${before.yaw.toFixed(2)} -> ${after.yaw.toFixed(2)}`);
console.log(`  posicion ${before.x.toFixed(1)},${before.y.toFixed(1)} -> ${after.x.toFixed(1)},${after.y.toFixed(1)}`);
check(after.distance === before.distance, `andar y girar movio el zoom: ${before.distance} -> ${after.distance}`);
check(Math.abs(after.yaw - before.yaw) > 0.05, 'la camara no giro');
check(Math.hypot(after.x - before.x, after.y - before.y) > 0.5, 'el personaje no anduvo');

await touches([{ type: 'pointerup', id: 1, x: 128, y: 652 }, { type: 'pointerup', id: 2, x: 180, y: 448 }]);
await page.waitForTimeout(300);

// Y ahora una pinza de verdad: dos dedos, los dos en zona de camara.
const preZoom = await page.evaluate(() => window.__verdant);
await touches([{ type: 'pointerdown', id: 3, x: 200, y: 300 }, { type: 'pointerdown', id: 4, x: 260, y: 300 }]);
for (let i = 1; i <= 14; i++) {
  await touches([
    { type: 'pointermove', id: 3, x: 200 - i * 8, y: 300 },
    { type: 'pointermove', id: 4, x: 260 + i * 8, y: 300 },
  ]);
}
await page.waitForTimeout(400);
const postZoom = await page.evaluate(() => window.__verdant);
await touches([{ type: 'pointerup', id: 3, x: 88, y: 300 }, { type: 'pointerup', id: 4, x: 372, y: 300 }]);

console.log(`  pinza: distancia ${preZoom.distance.toFixed(2)} -> ${postZoom.distance.toFixed(2)}`);
check(postZoom.distance < preZoom.distance, 'separar dos dedos de camara no acerco la vista');
check(Math.abs(postZoom.yaw - preZoom.yaw) < 0.01, 'la pinza giro la camara ademas de hacer zoom');

// El dedo de la accion: se aprieta ACCION y, sin soltar, se arrastra ese mismo
// dedo. Tiene que girar la camara y la accion tiene que seguir repitiendo.
//
// Esta va con toques de VERDAD (CDP `Input.dispatchTouchEvent`), no con
// `PointerEvent` sinteticos: entran por la tuberia de gestos del navegador, que
// es la que decide si un dedo nacido en un boton puede seguir moviendo algo o
// se lo queda el navegador. Los sinteticos se saltan justo eso.
const cdp = await page.context().newCDPSession(page);
const btn = await page.evaluate(() => {
  const r = document.getElementById('action').getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
});
const real = (type, points) =>
  cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points.map((p) => ({ x: p.x, y: p.y, id: 7 })) });
const preHold = await page.evaluate(() => window.__verdant);
await real('touchStart', [btn]);
await page.waitForTimeout(400);
const heldStill = await page.evaluate(() => window.__verdant);
for (let i = 1; i <= 16; i++) await real('touchMove', [{ x: btn.x - i * 10, y: btn.y - i * 2 }]);
await page.waitForTimeout(700);
const dragged = await page.evaluate(() => window.__verdant);
await real('touchEnd', []);
await page.waitForTimeout(300);
const released = await page.evaluate(() => window.__verdant);
const turned = dragged.yaw - heldStill.yaw;
const kept = dragged.sent.harvest - heldStill.sent.harvest;
console.log(`  accion arrastrada: giro ${turned.toFixed(2)} rad, ${kept} acciones mientras giraba`);
check(Math.abs(heldStill.yaw - preHold.yaw) < 1e-9, 'apretar la accion sin arrastrar giro la camara');
check(Math.abs(turned) > 0.1, 'arrastrar el dedo de la accion no giro la camara');
check(kept > 0, 'la accion dejo de repetir mientras se arrastraba el dedo');
check(dragged.distance === heldStill.distance, 'arrastrar el dedo de la accion cambio el zoom');
// Y al soltar, la accion se detiene de verdad.
await page.waitForTimeout(800);
const stopped = await page.evaluate(() => window.__verdant);
check(stopped.sent.harvest === released.sent.harvest, 'la accion siguio repitiendo tras soltar el dedo');

await page.screenshot({ path: 'screenshots/movil-gestos.png' });
await browser.close();
server.close();
console.log(failures ? `GESTOS: FALLIDO (${failures})` : 'GESTOS: OK');
process.exit(failures ? 1 : 0);
