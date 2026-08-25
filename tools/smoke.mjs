/**
 * Prueba de humo del cliente en un navegador real.
 *
 * Los tests unitarios cubren la simulacion, pero no pueden decir si el juego
 * ARRANCA: si WebGL inicializa, si el bundle carga, si el bucle avanza, si los
 * controles llegan a producir Intents. Esto abre el build en Chromium headless,
 * lo juega unos segundos leyendo el estado real por window.__verdant, y guarda
 * capturas.
 *
 * Hace dos pasadas: escritorio con teclado y movil con eventos tactiles.
 *
 *   npm run build && node tools/smoke.mjs
 *   VERDANT_URL=https://... node tools/smoke.mjs   # verifica un despliegue
 *   VERDANT_DIST=../ruta/al/build node tools/smoke.mjs
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
/** Medianoche: el dia dura 8 minutos, asi que hay que saltar hasta la noche. */
const NIGHT_TICK = 0;

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

const failures = [];
function fail(msg) {
  console.error(`  FALLO: ${msg}`);
  failures.push(msg);
}

function check(condition, msg) {
  if (!condition) fail(msg);
}

/** Vigila errores de consola y excepciones no capturadas de una pagina. */
function watchProblems(page, label) {
  page.on('console', (m) => {
    if (m.type() === 'error') fail(`${label} console: ${m.text()}`);
  });
  page.on('pageerror', (e) => fail(`${label} pageerror: ${e.message}`));
}

/**
 * Espera a que el bucle de juego haya corrido de verdad, no solo a que cargue.
 *
 * Se mide el AVANCE del contador, no su valor absoluto. Comparar contra un
 * numero fijo dejo de funcionar en cuanto los mundos empezaron a nacer ya
 * entrados en la manana: el contador nacia por encima del umbral y la espera se
 * daba por cumplida en el primer frame, sin haber dibujado nada todavia.
 */
async function waitForLoop(page) {
  await page.waitForFunction(
    () => {
      if (!window.__verdant) return false;
      if (window.__smokeBaseTick === undefined) {
        window.__smokeBaseTick = window.__verdant.tick;
        return false;
      }
      return window.__verdant.tick - window.__smokeBaseTick > 90;
    },
    null,
    { timeout: 20000 },
  );
  return page.evaluate(() => window.__verdant);
}

/**
 * Despacha un evento tactil sintetico con varios dedos.
 *
 * Playwright solo ofrece taps de un dedo, y aqui hace falta arrastrar el
 * joystick y pellizcar con dos, asi que se construyen Touch/TouchEvent a mano.
 *
 * `points` son todos los dedos apoyados; `changed` los que provocan este evento.
 */
async function touchEvent(page, type, points, changed = points) {
  await page.evaluate(
    ({ type, points, changed }) => {
      const make = (p) => {
        const target = p.selector ? document.querySelector(p.selector) : document.body;
        if (!target) throw new Error(`sin destino para el toque: ${p.selector}`);
        return new Touch({
          identifier: p.id,
          target,
          clientX: p.x,
          clientY: p.y,
          pageX: p.x,
          pageY: p.y,
        });
      };
      const live = points.map(make);
      const moved = changed.map(make);
      const target = changed[0]?.selector
        ? document.querySelector(changed[0].selector)
        : document.body;
      target.dispatchEvent(
        new TouchEvent(type, {
          touches: live,
          targetTouches: live,
          changedTouches: moved,
          bubbles: true,
          cancelable: true,
        }),
      );
    },
    { type, points, changed },
  );
}

/** Atajo de un solo dedo. */
async function touch(page, type, { id = 1, x, y, selector }) {
  const point = { id, x, y, selector };
  const live = type === 'touchend' || type === 'touchcancel' ? [] : [point];
  await touchEvent(page, type, live, [point]);
}

// ---------------------------------------------------------------- escritorio

async function desktopPass(browser, baseUrl) {
  console.log('\n== escritorio (teclado) ==');
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  watchProblems(page, 'escritorio');

  await page.goto(`${baseUrl}/?seed=${SEED}`, { waitUntil: 'load' });
  const spawn = await waitForLoop(page);
  console.log('  estado inicial:', JSON.stringify(spawn));

  check(spawn.seed === SEED, `la semilla de la URL no se respeto (${spawn.seed})`);
  check(!spawn.clock.startsWith('00:'), `un mundo nuevo no deberia empezar a medianoche (${spawn.clock})`);
  check(spawn.objects > 50, `apenas se dibujaron objetos en la escena (${spawn.objects})`);
  check(spawn.chunks > 0, 'no se cargo ningun chunk');
  check(spawn.health === 100, `salud inicial inesperada: ${spawn.health}`);

  await page.screenshot({ path: join(SHOTS, '01-spawn.png') });

  await page.keyboard.down('KeyD');
  await page.waitForTimeout(1600);
  await page.keyboard.up('KeyD');

  const moved = await waitForLoop(page);
  check(moved.x > spawn.x + 1, `el jugador no avanzo (${spawn.x} -> ${moved.x})`);
  check(moved.tick > spawn.tick, 'la simulacion no avanzo');
  check(moved.hunger < spawn.hunger, 'el hambre no bajo con el tiempo');

  await page.screenshot({ path: join(SHOTS, '02-explorando.png') });

  // Mantener espacio debe encadenar recolecciones sin soltar la tecla.
  await page.keyboard.down('Space');
  for (const key of ['KeyW', 'KeyD', 'KeyS', 'KeyA']) {
    await page.keyboard.down(key);
    await page.waitForTimeout(450);
    await page.keyboard.up(key);
  }
  await page.keyboard.up('Space');

  const gathered = await waitForLoop(page);
  console.log('  inventario tras recolectar:', JSON.stringify(gathered.inventory));
  const total = gathered.inventory.reduce((a, b) => a + b, 0);
  check(total > 0, 'mantener Espacio no recolecto nada');

  // El zoom por teclado tiene que cambiar el encuadre de verdad, no solo no fallar.
  const beforeZoom = (await waitForLoop(page)).tilesOnScreen;
  for (let i = 0; i < 7; i++) await page.keyboard.press('Minus');
  await page.waitForTimeout(300);
  const zoomedOut = (await waitForLoop(page)).tilesOnScreen;
  check(zoomedOut > beforeZoom, `alejar no cambio el zoom (${beforeZoom} -> ${zoomedOut})`);

  for (let i = 0; i < 4; i++) await page.keyboard.press('Equal');
  await page.waitForTimeout(300);
  const zoomedIn = (await waitForLoop(page)).tilesOnScreen;
  check(zoomedIn < zoomedOut, `acercar no cambio el zoom (${zoomedOut} -> ${zoomedIn})`);

  for (let i = 0; i < 5; i++) await page.keyboard.press('Minus');
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(SHOTS, '03-mundo-amplio.png') });

  // El mundo de noche. Se abre con ?t= porque un dia dura ocho minutos reales y
  // esperarlo en una prueba de humo no tiene sentido.
  await page.goto(`${baseUrl}/?seed=${SEED}&t=${NIGHT_TICK}`, { waitUntil: 'load' });
  await page.evaluate(() => delete window.__smokeBaseTick);
  const night = await waitForLoop(page);
  console.log(`  hora nocturna: ${night.clock}`);
  check(night.clock.startsWith('00:'), `no arranco a medianoche (${night.clock})`);
  await page.screenshot({ path: join(SHOTS, '07-noche.png') });

  await page.close();
}

// --------------------------------------------------------------------- movil

async function mobilePass(browser, baseUrl) {
  console.log('\n== movil (tactil, 390x844 @3x) ==');
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  watchProblems(page, 'movil');

  await page.goto(`${baseUrl}/?seed=${SEED}`, { waitUntil: 'load' });
  const spawn = await waitForLoop(page);
  console.log('  estado inicial:', JSON.stringify(spawn));

  // Los controles deben revelarse solos en un dispositivo de puntero grueso.
  const controlsVisible = await page.isVisible('#btnHarvest');
  check(controlsVisible, 'los botones tactiles no aparecieron en un dispositivo tactil');
  check(
    await page.evaluate(() => document.body.classList.contains('touch-active')),
    'el body no entro en modo tactil',
  );

  await page.screenshot({ path: join(SHOTS, '04-movil-spawn.png') });

  // REGRESION del fallo reportado: el joystick nacia en cualquier punto de la
  // pantalla. Un arrastre en la mitad DERECHA no debe crear joystick ni mover.
  const beforeRight = await waitForLoop(page);
  await touch(page, 'touchstart', { x: 300, y: 640 });
  await touch(page, 'touchmove', { x: 360, y: 640 });
  await page.waitForTimeout(500);
  const afterRight = await waitForLoop(page);
  await touch(page, 'touchend', { x: 360, y: 640 });
  check(
    !(await page.isVisible('#stick.active')),
    'el joystick aparecio al tocar la mitad derecha',
  );
  check(
    Math.abs(afterRight.x - beforeRight.x) < 1e-6 && Math.abs(afterRight.y - beforeRight.y) < 1e-6,
    'tocar la mitad derecha movio al jugador',
  );

  // REGRESION del fallo reportado: el zoom no funcionaba en movil porque el
  // primer dedo se quedaba con el joystick y el pellizco nunca se activaba.
  const zoomStart = (await waitForLoop(page)).tilesOnScreen;
  let a = { id: 11, x: 140, y: 500 };
  let b = { id: 12, x: 250, y: 500 };
  await touchEvent(page, 'touchstart', [a], [a]);
  await touchEvent(page, 'touchstart', [a, b], [b]);
  for (let step = 1; step <= 6; step++) {
    a = { ...a, x: 140 - step * 12 };
    b = { ...b, x: 250 + step * 12 };
    await touchEvent(page, 'touchmove', [a, b], [a, b]);
  }
  await page.waitForTimeout(150);
  const zoomedIn = (await waitForLoop(page)).tilesOnScreen;
  await touchEvent(page, 'touchend', [b], [a]);
  await touchEvent(page, 'touchend', [], [b]);
  console.log(`  pellizco: ${zoomStart.toFixed(1)} -> ${zoomedIn.toFixed(1)} tiles`);
  check(zoomedIn < zoomStart, `separar los dedos no acerco la camara (${zoomStart} -> ${zoomedIn})`);

  // Y el gesto contrario tiene que alejar.
  a = { id: 21, x: 60, y: 500 };
  b = { id: 22, x: 330, y: 500 };
  await touchEvent(page, 'touchstart', [a], [a]);
  await touchEvent(page, 'touchstart', [a, b], [b]);
  for (let step = 1; step <= 6; step++) {
    a = { ...a, x: 60 + step * 18 };
    b = { ...b, x: 330 - step * 18 };
    await touchEvent(page, 'touchmove', [a, b], [a, b]);
  }
  await page.waitForTimeout(150);
  const zoomedOut = (await waitForLoop(page)).tilesOnScreen;
  await touchEvent(page, 'touchend', [b], [a]);
  await touchEvent(page, 'touchend', [], [b]);
  check(zoomedOut > zoomedIn, `juntar los dedos no alejo la camara (${zoomedIn} -> ${zoomedOut})`);

  // Arrastrar el joystick tiene que llegar hasta la simulacion.
  //
  // Aqui NO se mide la escala analogica: el jugador choca con arboles y agua,
  // asi que la distancia recorrida no es proporcional a la deflexion y una
  // comprobacion de ese tipo mediria colisiones, no el joystick. La escala
  // analogica se verifica sin colisiones en tests/simulation.test.ts, sobre una
  // zona abierta. Lo que corresponde comprobar aqui es la integracion: que el
  // toque produce una Intent y que el mundo reacciona.
  const originX = 110;
  const originY = 640;
  await touch(page, 'touchstart', { x: originX, y: originY });
  await touch(page, 'touchmove', { x: originX + 22, y: originY });
  await page.waitForTimeout(700);
  const partial = await waitForLoop(page);

  // La captura se toma CON el dedo apoyado: es el unico momento en que el
  // joystick esta en pantalla, y sin esto nunca se verificaria que se dibuja.
  check(
    await page.isVisible('#stick.active'),
    'el joystick no aparecio al apoyar el dedo',
  );
  await page.screenshot({ path: join(SHOTS, '05-movil-joystick.png') });

  await touch(page, 'touchend', { x: originX + 22, y: originY });
  check(
    !(await page.isVisible('#stick.active')),
    'el joystick sigue visible tras levantar el dedo',
  );

  const partialDistance = Math.hypot(partial.x - spawn.x, partial.y - spawn.y);
  console.log(`  deflexion parcial: ${partialDistance.toFixed(2)} tiles recorridos`);
  check(partialDistance > 0.2, `el joystick no movio al jugador (${partialDistance})`);

  // Una deflexion por debajo de la zona muerta no debe mover nada: es lo que
  // evita que el pulgar simplemente apoyado haga derivar al personaje.
  const still = await waitForLoop(page);
  await touch(page, 'touchstart', { x: originX, y: originY });
  await touch(page, 'touchmove', { x: originX + 5, y: originY });
  await page.waitForTimeout(500);
  const drifted = await waitForLoop(page);
  await touch(page, 'touchend', { x: originX + 5, y: originY });
  check(
    Math.abs(drifted.x - still.x) < 1e-6 && Math.abs(drifted.y - still.y) < 1e-6,
    `la zona muerta no aguanta: derivo ${(drifted.x - still.x).toFixed(4)} tiles`,
  );

  // Mantener pulsado el boton de recolectar mientras se camina con el joystick:
  // es el uso real, y ejercita a la vez la repeticion y los dos dedos.
  await touch(page, 'touchstart', { id: 2, x: 330, y: 760, selector: '#btnHarvest' });
  for (const [dx, dy] of [
    [0, -80],
    [80, 0],
    [0, 80],
    [-80, 0],
  ]) {
    await touch(page, 'touchstart', { x: originX, y: originY });
    await touch(page, 'touchmove', { x: originX + dx, y: originY + dy });
    await page.waitForTimeout(600);
    await touch(page, 'touchend', { x: originX + dx, y: originY + dy });
  }
  await touch(page, 'touchend', { id: 2, x: 330, y: 760, selector: '#btnHarvest' });

  const gathered = await waitForLoop(page);
  console.log('  inventario tras recolectar:', JSON.stringify(gathered.inventory));
  const total = gathered.inventory.reduce((a, b) => a + b, 0);
  check(total > 0, 'mantener el boton de recolectar no dio nada');

  await page.screenshot({ path: join(SHOTS, '06-movil-recolectando.png') });

  // Soltar el joystick debe detener al jugador por completo.
  const before = await waitForLoop(page);
  await page.waitForTimeout(500);
  const after = await waitForLoop(page);
  check(
    Math.abs(after.x - before.x) < 1e-6 && Math.abs(after.y - before.y) < 1e-6,
    'el jugador sigue moviendose tras soltar el joystick',
  );

  await context.close();
}

// ---------------------------------------------------------------------- main

const remote = process.env.VERDANT_URL;
const { server, port } = remote ? { server: null, port: 0 } : await serve(DIST);
const baseUrl = remote ?? `http://127.0.0.1:${port}`;
console.log(`probando ${baseUrl}`);

// Al verificar un despliegue remoto puede haber un proxy de salida obligatorio.
const proxyUrl = remote ? (process.env.HTTPS_PROXY ?? process.env.https_proxy) : undefined;
const browser = await chromium.launch(proxyUrl ? { proxy: { server: proxyUrl } } : {});

try {
  await desktopPass(browser, baseUrl);
  await mobilePass(browser, baseUrl);
} finally {
  await browser.close();
  server?.close();
}

console.log('');
if (failures.length) {
  console.log(`HUMO: FALLIDO (${failures.length})`);
  process.exitCode = 1;
} else {
  console.log('HUMO: OK — sin errores de consola ni excepciones');
}
