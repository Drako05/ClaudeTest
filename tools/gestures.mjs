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

// La barra del angulo de vision, con toques de verdad: sostener el ojo mas de
// 0,5 s la abre SOLO en primera persona y al soltar no cambia de vista; un toque
// corto cambia de vista y la cierra; tocar en otro sitio la cierra.
const center = (id) => page.evaluate((i) => {
  const r = document.getElementById(i).getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2, left: r.x, right: r.x + r.width };
}, id);
const probe = () => page.evaluate(() => window.__verdant);
// En el movil el ojo vive en el menu OTROS (boceto del autor): se abre antes de
// cada toque al ojo, porque tocar el mundo lo cierra.
async function ensureOthers() {
  const open = await page.evaluate(() => document.body.classList.contains('others-open'));
  if (open) return;
  const o = await center('others');
  await real('touchStart', [o]);
  await real('touchEnd', []);
  await page.waitForTimeout(250);
}
await ensureOthers();
const eye = await center('proj');
async function holdEye(ms) {
  await ensureOthers();
  await real('touchStart', [eye]);
  await page.waitForTimeout(ms);
  const during = await probe();
  await real('touchEnd', []);
  await page.waitForTimeout(300);
  return during;
}
async function tapReal(p) {
  await real('touchStart', [p]);
  await real('touchEnd', []);
  await page.waitForTimeout(300);
}
const offFp = await holdEye(1300);
check(offFp.projection !== 'primera' && !offFp.fovPanel, 'sostener el ojo fuera de la primera persona abrio la barra');
check(!(await probe()).fovPanel, 'la barra quedo abierta fuera de la primera persona');
for (let i = 0; i < 3 && (await probe()).projection !== 'primera'; i++) {
  await ensureOthers();
  await tapReal(eye);
}
check((await probe()).projection === 'primera', 'tocar el ojo no llevo a la primera persona');
// Un toque corto: 100 ms y soltar ANTES de leer el estado. Con los 0,5 s que
// abren la barra hay poco margen en headless, que va a ~5 FPS: un fotograma
// retrasa el soltar hasta 200 ms, y leer el estado con el dedo puesto tarda
// otro tanto. Con 300 ms caia a veces.
await ensureOthers();
await real('touchStart', [eye]);
await page.waitForTimeout(100);
await real('touchEnd', []);
await page.waitForTimeout(300);
const early = await probe();
check(!early.fovPanel, 'un toque corto en el ojo ya abrio la barra');
check(early.projection === 'perspectiva', 'un toque corto en el ojo no cambio de vista');
for (let i = 0; i < 3 && (await probe()).projection !== 'primera'; i++) {
  await ensureOthers();
  await tapReal(eye);
}
const holding = await holdEye(800);
const afterHold = await probe();
check(holding.fovPanel, 'sostener el ojo mas de 0,5 s en primera persona no abrio la barra');
check(afterHold.fovPanel && afterHold.projection === 'primera',
  `al soltar el ojo la barra se cerro o cambio la vista (${afterHold.projection})`);
// Arrastrar el pulgar de la barra hasta el extremo derecho.
const bar = await center('fovRange');
const from = { x: bar.left + (bar.right - bar.left) * 0.4, y: bar.y };
await real('touchStart', [from]);
for (let i = 1; i <= 10; i++) await real('touchMove', [{ x: from.x + ((bar.right - from.x) * i) / 10, y: bar.y }]);
await real('touchEnd', []);
await page.waitForTimeout(300);
const slid = await probe();
console.log(`  angulo con el dedo: ${afterHold.fpFov} -> ${slid.fpFov}, barra abierta: ${slid.fovPanel}`);
check(slid.fpFov > afterHold.fpFov && slid.fov === slid.fpFov, 'arrastrar la barra no cambio el angulo');
check(slid.fovPanel, 'arrastrar la barra la cerro');
await page.screenshot({ path: 'screenshots/movil-angulo.png' });
await tapReal({ x: 200, y: 420 });
check(!(await probe()).fovPanel, 'tocar el mundo no cerro la barra');
await holdEye(1300);
check((await probe()).fovPanel, 'la barra no volvio a abrirse');
await ensureOthers();
await tapReal(eye);
const tapped = await probe();
check(tapped.projection === 'perspectiva' && !tapped.fovPanel,
  `un toque corto con la barra abierta no cambio de vista o no la cerro (${tapped.projection}, ${tapped.fovPanel})`);
await page.evaluate(() => localStorage.removeItem('verdant.fpFov'));

// USAR y SALTAR se encienden mientras el dedo esta puesto y se apagan al
// soltar (pedido del autor), con toques de verdad.
for (const id of ['use', 'jump']) {
  const at = await center(id);
  await real('touchStart', [at]);
  await page.waitForTimeout(80);
  const lit = await page.evaluate((i) => document.getElementById(i).classList.contains('on'), id);
  await real('touchEnd', []);
  await page.waitForTimeout(400);
  const off = await page.evaluate((i) => !document.getElementById(i).classList.contains('on'), id);
  console.log(`  ${id}: encendido al tocar ${lit}, apagado al soltar ${off}`);
  check(lit && off, `el boton ${id} no se enciende al tocarlo o no se apaga al soltar`);
}

// El inventario con el dedo: arrastrar dentro de la barra con el inventario
// cerrado, arrastrar una casilla a otra y a la barra con el abierto, y mantener
// una receta 1,5 s para fabricarla (decisiones del autor). Con materiales del
// panel de desarrollo.
await page.goto(`http://127.0.0.1:${server.address().port}/?seed=3351842904&dev=1`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__verdant && window.__verdant.tick > 0, null, { timeout: 30000 });
await page.evaluate(() => document.querySelector('[data-kit="piedra"]').click());
await page.waitForTimeout(300);
const at = (sel) => page.evaluate((q) => {
  const r = document.querySelector(q).getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
}, sel);
async function dragReal(from, to) {
  await real('touchStart', [from]);
  for (let i = 1; i <= 10; i++) await real('touchMove', [{ x: from.x + ((to.x - from.x) * i) / 10, y: from.y + ((to.y - from.y) * i) / 10 }]);
  await real('touchEnd', []);
  await page.waitForTimeout(400);
}
const items = (p) => p.slots.map((s) => s.item);
// Inventario cerrado: dentro de la barra se intercambia; al vacio, nada.
const barStart = await probe();
await dragReal(await at('#hotbar .slot:nth-child(1)'), await at('#hotbar .slot:nth-child(3)'));
const barSwap = await probe();
console.log(`  barra con el inventario cerrado: ${items(barStart).slice(0, 4)} -> ${items(barSwap).slice(0, 4)}`);
check(!barSwap.inventoryOpen && barSwap.slots[2].item === barStart.slots[0].item && barSwap.slots[0].item === barStart.slots[2].item,
  'arrastrar dentro de la barra con el inventario cerrado no intercambio');
await dragReal(await at('#hotbar .slot:nth-child(1)'), { x: 195, y: 420 });
const barVoid = await probe();
check(items(barVoid).join() === items(barSwap).join() && !barVoid.discardAsk && barVoid.itemsSent.discard === barSwap.itemsSent.discard,
  'soltar la barra al vacio con el inventario cerrado tiro algo o pidio confirmacion');
// Inventario abierto: de una casilla a otra, y de la rejilla a la barra.
const invBtn = await center('invOpen');
await tapReal(invBtn);
const slotAt = (n) => at(`#invGrid .slot:nth-child(${n})`);
const beforeDrag = await probe();
const moving = beforeDrag.slots[0].item;
await dragReal(await slotAt(1), await slotAt(7));
const afterDrag = await probe();
console.log(`  arrastrar con el dedo: casilla 7 = ${afterDrag.slots[6].item}, movimientos ${beforeDrag.itemsSent.move} -> ${afterDrag.itemsSent.move}`);
check(afterDrag.itemsSent.move > beforeDrag.itemsSent.move && afterDrag.slots[6].item === moving, 'arrastrar con el dedo no movio la casilla');
await dragReal(await slotAt(7), await at('#hotbar .slot:nth-child(4)'));
const toBar = await probe();
check(toBar.slots[3].item === moving, `arrastrar de la rejilla a la barra no movio: ${items(toBar).slice(0, 8)}`);
// A recetas, con su pestana, y mantener el pico 1,5 s.
await tapReal(await at('#invTabs button:nth-child(3)'));
check((await probe()).inventoryPage === 'recetas', 'la pestana Recetas no cambio de pagina');
const result = await page.evaluate(() => {
  const r = document.querySelector('#recipeList .recipe:nth-child(2) .result').getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
});
const beforeHold = await probe();
await real('touchStart', [result]);
await page.waitForTimeout(2000);
await real('touchEnd', []);
await page.waitForTimeout(400);
const afterHold2 = await probe();
console.log(`  fabricar manteniendo: ${beforeHold.inventory[11]} -> ${afterHold2.inventory[11]} picos`);
check(afterHold2.inventory[11] === beforeHold.inventory[11] + 1, 'mantener la receta 1,5 s con el dedo no fabrico');
await page.screenshot({ path: 'screenshots/movil-recetas.png' });

// La mesa y la ropa con el dedo (tanda 2): fabricar la mesa, llevarla a la
// barra, ponerla con USAR mirando al suelo, abrirla con USAR, fabricar la bolsa
// y ponersela arrastrandola desde la barra a su hueco de PERSONAJE, que es como
// se hace en el movil (las paginas del panel van de una en una).
await page.evaluate(() => document.querySelector('[data-kit="metal"]').click());
await page.waitForTimeout(300);
const holdTouch = async (p) => {
  await real('touchStart', [p]);
  await page.waitForTimeout(2000);
  await real('touchEnd', []);
  await page.waitForTimeout(400);
};
const tabNamed = (name) => page.evaluate((n) => {
  const t = Array.from(document.querySelectorAll('#recipeTabs .slot')).find((el) => el.textContent === n);
  const r = t.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
}, name);
await tapReal(await tabNamed('Estaciones'));
await holdTouch(await at('#recipeList .recipe:nth-child(1) .result'));
check((await probe()).inventory[18] === 1, 'no se fabrico la mesa con el dedo');
await tapReal(await at('#invTabs button:nth-child(2)'));
const benchSlot = (await probe()).slots.findIndex((x) => x.item === 18);
if (benchSlot > 0) await dragReal(await slotAt(benchSlot + 1), await at('#hotbar .slot:nth-child(1)'));
await tapReal(invBtn);
await tapReal(await at('#hotbar .slot:nth-child(1)'));
const benchInHand = await probe();
check(benchInHand.slots[benchInHand.selectedSlot].item === 18, 'la mesa no quedo en la mano');
// Mirar abajo arrastrando un dedo por el mundo, hasta tener suelo a tiro.
let dy = 70;
for (let i = 0; i < 8 && (await probe()).lookZ > -0.8; i++) {
  const z0 = (await probe()).lookZ;
  await dragReal({ x: 195, y: 330 }, { x: 195, y: 330 + dy });
  if ((await probe()).lookZ > z0) dy = -dy;
}
const aimed = await probe();
console.log(`  mirando abajo: lookZ ${aimed.lookZ.toFixed(2)}, sembraria en ${JSON.stringify(aimed.plantTile)}`);
const useBtn = await center('use');
await tapReal(useBtn);
await page.waitForTimeout(300);
const benchPlaced = await probe();
console.log(`  USAR con la mesa: estaciones ${JSON.stringify(benchPlaced.stationTiles)}`);
check(benchPlaced.stationTiles.some((t) => t.feature === 24), 'USAR con el dedo no puso la mesa');
await tapReal(useBtn);
await page.waitForTimeout(300);
const benchOpen = await probe();
check(benchOpen.inventoryOpen && benchOpen.panelStation === 1 && benchOpen.inventoryPage === 'recetas',
  `USAR mirando la mesa no abrio sus recetas: ${benchOpen.inventoryOpen} ${benchOpen.panelStation} ${benchOpen.inventoryPage}`);
await tapReal(await tabNamed('Ropa'));
await holdTouch(await at('#recipeList .recipe:nth-child(1) .result'));
check((await probe()).inventory[20] === 1, 'no se fabrico la bolsa en la mesa con el dedo');
await tapReal(await at('#invTabs button:nth-child(2)'));
const bagSlot = (await probe()).slots.findIndex((x) => x.item === 20);
if (bagSlot !== 1) await dragReal(await slotAt(bagSlot + 1), await at('#hotbar .slot:nth-child(2)'));
await tapReal(await at('#invTabs button:nth-child(1)'));
await dragReal(await at('#hotbar .slot:nth-child(2)'), await at('#charGrid [data-slot="1000"]'));
const belted = await probe();
console.log(`  bolsa a la cintura: ${JSON.stringify(belted.worn)}, casillas ${belted.openSlots}`);
check(belted.worn[0] === 20 && belted.openSlots === 18, 'arrastrar la bolsa a la cintura con el dedo no la puso');
await page.screenshot({ path: 'screenshots/movil-personaje-ropa.png' });

await page.screenshot({ path: 'screenshots/movil-gestos.png' });
await browser.close();
server.close();
console.log(failures ? `GESTOS: FALLIDO (${failures})` : 'GESTOS: OK');
process.exit(failures ? 1 : 0);
