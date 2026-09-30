/**
 * Prueba de humo del cliente 3D en un navegador real.
 *
 * Los tests unitarios cubren la simulacion, pero no pueden decir si el juego
 * ARRANCA: si WebGL inicializa, si el bundle carga, si el bucle avanza, si los
 * controles llegan a producir Intents. Esto abre el build en Chromium headless,
 * lo juega leyendo el estado real por `window.__verdant` y guarda capturas.
 *
 * Es la heredera del humo del isometrico y se lleva todas sus comprobaciones que
 * son del JUEGO —andar, hambre, recolectar, semillas, golpe (regla 12),
 * barrido y escombros, joystick, pinza, carrera, salto, paredes, cima, mineral,
 * panel de desarrollo— mas una por cada cosa que se traslado del isometrico:
 * comer, sembrar, mirada de la camara, muerte y reinicio, HUD, reloj, panel del
 * entorno, ayuda, noche, reticula, zoom por teclado y bordes de chunk y bioma.
 * Se quedan fuera las que solo tenian sentido con aquella camara: caras
 * dibujadas, cuatro vistas, pie en su rombo, atenuacion y silueta.
 *
 * Reparto con los tests unitarios: aqui se verifica INTEGRACION —que un toque
 * llega a una Intent y el mundo reacciona—; los numeros exactos se miden alli.
 *
 *   npm run smoke
 *   VERDANT_URL=https://drako05.github.io/ClaudeTest npm run smoke   # un despliegue
 *
 * Ojo con los FPS de aqui: se renderiza por software, sin GPU.
 */

import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const PAGE = fileURLToPath(new URL('../packages/client/dist/index.html', import.meta.url));
const SHOTS = fileURLToPath(new URL('../screenshots', import.meta.url));
const SEED = 12345;
const DAY_TICKS = 8 * 60 * 60;
const HOUR_TICKS = DAY_TICKS / 24;
/** Un sitio del lienzo libre de paneles, para clicar sobre el mundo. */
const CLICK = { x: 900, y: 470 };

// ------------------------------------------------------------------ utilidades

const failures = [];
function check(condition, msg) {
  if (!condition) {
    console.error(`  FALLO: ${msg}`);
    failures.push(msg);
  }
}

function watchProblems(page, label) {
  page.on('console', (m) => {
    if (m.type() === 'error') check(false, `${label} console: ${m.text()}`);
  });
  page.on('pageerror', (e) => check(false, `${label} pageerror: ${e.message}`));
}

/** El estado, sin lo que no se puede serializar. */
function state(page) {
  return page.evaluate(() => {
    const { spots, ...rest } = window.__verdant;
    return rest;
  });
}

/** Los sitios del mundo a los que ir a mirar algo. Caros: se piden aparte. */
function spots(page) {
  return page.evaluate(() => window.__verdant.spots());
}

/**
 * Espera a que el bucle haya corrido de verdad, no solo a que cargue: se mide el
 * AVANCE del reloj, que un mundo puede nacer ya entrado en la manana.
 */
async function waitForLoop(page, ticks = 90) {
  await page.evaluate(() => delete window.__smokeBaseTick);
  await page.waitForFunction(
    (n) => {
      if (!window.__verdant) return false;
      if (window.__smokeBaseTick === undefined) {
        window.__smokeBaseTick = window.__verdant.tick;
        return false;
      }
      return window.__verdant.tick - window.__smokeBaseTick > n;
    },
    ticks,
    { timeout: 30000 },
  );
  return state(page);
}

async function open(page, baseUrl, query) {
  await page.goto(`${baseUrl}/?seed=${SEED}${query ?? ''}`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__verdant, null, { timeout: 30000 });
  await play(page);
  return waitForLoop(page);
}

/**
 * En PC el juego arranca en pausa hasta que un clic captura el cursor
 * (`pointer-lock.ts`). El headless de Chromium SI captura; lo que no hace es
 * soltar con Esc, asi que para soltar se usa `document.exitPointerLock()`.
 */
async function play(page) {
  const s = await state(page);
  if (!s.paused) return;
  await page.mouse.click(CLICK.x, CLICK.y);
  await page.waitForFunction(() => window.__verdant && !window.__verdant.paused, null, { timeout: 5000 });
}

/**
 * Golpea. Con el cursor capturado, el clic se manda a mano al lienzo: en
 * headless cada `mouse.down`/`up` capturado lleva pegado un movimiento espurio
 * —medido, del tamano de la posicion del raton— que giraria la vista. En un
 * navegador de verdad un clic no mueve.
 */
async function strike(page) {
  if (!(await state(page)).pointerLocked) return page.mouse.click(CLICK.x, CLICK.y);
  await page.evaluate(() => {
    const canvas = document.getElementById('view');
    for (const type of ['pointerdown', 'pointerup']) {
      canvas.dispatchEvent(new PointerEvent(type, { pointerId: 1, pointerType: 'mouse', button: 0, bubbles: true }));
    }
  });
}

/**
 * Usar lo de la mano: clic derecho. Capturado, a mano al lienzo, por lo mismo
 * que `strike`.
 */
async function useClick(page) {
  if (!(await state(page)).pointerLocked) return page.mouse.click(CLICK.x, CLICK.y, { button: 'right' });
  await page.evaluate(() => {
    const canvas = document.getElementById('view');
    for (const type of ['pointerdown', 'pointerup']) {
      canvas.dispatchEvent(new PointerEvent(type, { pointerId: 1, pointerType: 'mouse', button: 2, bubbles: true }));
    }
  });
}

/** Pone en la mano la casilla con ese objeto, si esta en la barra. */
async function toHand(page, item) {
  const slot = (await state(page)).slots.findIndex((s) => s.item === item);
  if (slot >= 0 && slot < 4) await page.keyboard.press(`Digit${slot + 1}`);
  await page.waitForTimeout(200);
  return slot;
}

async function release(page) {
  await page.evaluate(() => document.exitPointerLock());
  await page.waitForFunction(() => window.__verdant.paused, null, { timeout: 5000 });
}

/**
 * Mueve el raton capturado: la vista va con el cursor. Los `movementX`
 * sinteticos del headless se anulan con el salto de vuelta al centro (medido),
 * asi que se mandan a mano. Primero uno a cero, que es el que se descarta tras
 * capturar.
 */
async function look(page, dx, dy) {
  await page.evaluate(([mx, my]) => {
    const send = (x, y) =>
      document.dispatchEvent(new MouseEvent('mousemove', { movementX: x, movementY: y, bubbles: true }));
    send(0, 0);
    for (let i = 0; i < 8; i++) send(mx / 8, my / 8);
  }, [dx, dy]);
}

async function hold(page, key, ms) {
  await page.keyboard.down(key);
  await page.waitForTimeout(ms);
  await page.keyboard.up(key);
}

/**
 * Gira la camara a la derecha lo mismo que arrastrar `dx` pixeles: con el
 * cursor capturado, moviendo el raton; si no (panel de desarrollo), arrastrando.
 */
async function orbit(page, dx) {
  if ((await state(page)).pointerLocked) return look(page, dx * 2.4, 0);
  await page.mouse.move(CLICK.x, CLICK.y);
  await page.mouse.down();
  await page.mouse.move(CLICK.x + dx, CLICK.y, { steps: 8 });
  await page.mouse.up();
}

const sum = (xs) => xs.reduce((a, b) => a + b, 0);

/**
 * Anda hasta moverse de verdad, probando direcciones: con agua, arboles y
 * paredes, empenarse en una sola mide el mapa y no el juego.
 */
async function walkToOpenGround(page, ms = 1400) {
  const start = await state(page);
  let last = start;
  for (const key of ['KeyW', 'KeyD', 'KeyS', 'KeyA', 'KeyD', 'KeyW']) {
    await hold(page, key, ms);
    last = await waitForLoop(page, 30);
    if (Math.hypot(last.x - start.x, last.y - start.y) > 1.5) break;
  }
  return Math.hypot(last.x - start.x, last.y - start.y);
}

/** Cuanto se anda en la mejor de las cuatro direcciones, volviendo al sitio. */
async function bestWalk(page, from, ms = 700) {
  let best = 0;
  for (const key of ['KeyW', 'KeyD', 'KeyS', 'KeyA']) {
    await hold(page, key, ms);
    const now = await waitForLoop(page, 30);
    best = Math.max(best, Math.hypot(now.x - from.x, now.y - from.y));
    const back = { KeyW: 'KeyS', KeyS: 'KeyW', KeyA: 'KeyD', KeyD: 'KeyA' }[key];
    await hold(page, back, ms);
    await waitForLoop(page, 30);
  }
  return best;
}

/**
 * Golpea con clics sueltos mientras cambia de sitio y de rumbo, hasta que
 * `done` diga basta. La mirada es la de la camara, asi que para golpear otro
 * lado hay que GIRARLA; y un clic es una accion, porque mantener el raton es
 * arrastrar la vista.
 */
async function harvestUntil(page, done, rounds = 8) {
  let now = await state(page);
  for (let round = 0; round < rounds && !done(now); round++) {
    for (let i = 0; i < 3; i++) {
      await strike(page);
      await page.waitForTimeout(260);
    }
    now = await waitForLoop(page, 20);
    if (done(now)) break;
    if (round % 2 === 1) await orbit(page, 160);
    await hold(page, 'KeyW', 500);
  }
  return waitForLoop(page, 20);
}

/** Un evento de puntero tactil sobre el lienzo, que es lo que escucha el 3D. */
async function pointers(page, points) {
  await page.evaluate((pts) => {
    const canvas = document.getElementById('view');
    for (const p of pts) {
      canvas.dispatchEvent(
        new PointerEvent(p.type, {
          pointerId: p.id,
          pointerType: 'touch',
          isPrimary: p.id === 1,
          clientX: p.x,
          clientY: p.y,
          bubbles: true,
        }),
      );
    }
  }, points);
}

/**
 * Un toque sobre un boton, con TouchEvent como un dedo de verdad. `dx`/`dy`
 * desplazan el dedo desde el centro del boton, para arrastrarlo con `touchmove`.
 */
async function tapButton(page, selector, type, dx = 0, dy = 0) {
  await page.evaluate(
    ({ selector, type, dx, dy }) => {
      const el = document.querySelector(selector);
      const rect = el.getBoundingClientRect();
      const t = new Touch({
        identifier: 9,
        target: el,
        clientX: rect.x + rect.width / 2 + dx,
        clientY: rect.y + rect.height / 2 + dy,
      });
      const live = type === 'touchend' || type === 'touchcancel' ? [] : [t];
      el.dispatchEvent(
        new TouchEvent(type, { touches: live, targetTouches: live, changedTouches: [t], bubbles: true, cancelable: true }),
      );
    },
    { selector, type, dx, dy },
  );
}

async function tap(page, selector) {
  await tapButton(page, selector, 'touchstart');
  await page.waitForTimeout(60);
  await tapButton(page, selector, 'touchend');
}

// ------------------------------------------------------------------ escritorio

async function desktopPass(browser, baseUrl) {
  console.log('\n== escritorio (teclado y raton) ==');
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  watchProblems(page, 'escritorio');

  // Arranca en pausa: sin cursor capturado el juego se detiene, con el aviso.
  await page.goto(`${baseUrl}/?seed=${SEED}`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__verdant, null, { timeout: 30000 });
  await page.waitForTimeout(600);
  const idle = await state(page);
  await page.waitForTimeout(500);
  const idleLater = await state(page);
  const idleHint = await page.textContent('#pauseHint');
  console.log(`  al cargar: pausa ${idle.paused}, aviso «${idleHint}», ticks ${idle.tick} -> ${idleLater.tick}`);
  check(idle.mouseMode, 'el escritorio no se reconoce como PC con raton');
  check(idle.paused && (await page.isVisible('#pause')), 'no arranca en pausa con el aviso');
  check(idleHint === 'Haz clic para jugar', `el aviso de arranque dice «${idleHint}»`);
  check(idleLater.tick === idle.tick, 'en pausa el tiempo avanza');
  const spawn = await open(page, baseUrl);
  check(spawn.pointerLocked && !spawn.paused, 'el clic no capturo el cursor');
  check(!(await page.isVisible('#pause')), 'el aviso de pausa sigue tras capturar');
  check(spawn.sent.harvest === 0, 'el clic que captura el cursor golpeo');
  // El salto espurio del primer movimiento tras capturar se descarta.
  check(
    spawn.yaw === idle.yaw && spawn.pitch === idle.pitch,
    `capturar el cursor giro la vista (${idle.yaw.toFixed(2)} -> ${spawn.yaw.toFixed(2)})`,
  );
  console.log(`  nace en ${spawn.x}, ${spawn.y}, nivel ${spawn.level}, ${spawn.biome}, ${spawn.clock}`);
  check(spawn.seed === SEED, `la semilla de la URL no se respeto (${spawn.seed})`);
  check(!spawn.clock.startsWith('00:'), `un mundo nuevo no deberia empezar a medianoche (${spawn.clock})`);
  check(spawn.chunks > 0, 'no se cargo ningun chunk');
  check(spawn.triangles > 1000, `apenas hay terreno mallado (${spawn.triangles} triangulos)`);
  check(spawn.health === 100, `salud inicial inesperada: ${spawn.health}`);
  check(spawn.alive && !spawn.deadShown, 'se nace muerto');
  const around = await spots(page);
  check(around.relief.levels > 1, `el terreno sale a una sola altura: ${around.relief.levels}`);

  // Los controles de PC: el racimo del pulgar oculto, el ojo y la ayuda a la vista.
  // El tronco desnudo de los arboles, MEDIDO del dibujo. Cada especie tiene el
  // suyo, y la unica regla comun es del autor: nunca menos de 2 bloques, para
  // que el jugador pase por debajo de la copa. Con el arte de antes de alargarlo,
  // el tronco que asomaba medio 0,8.
  const tr = spawn.trunks;
  check(tr.n > 50, `apenas se colocaron arboles (${tr.n})`);
  check(tr.min >= 1.9, `hay troncos de menos de 2 bloques: ${tr.min.toFixed(2)}`);
  // Y cada arbol con la forma de su especie real (`tree-shapes.ts`): ancho:alto
  // de la copa a un 15 % del de la especie y de 3 a 5 bloques de alto como pidio
  // el autor; tronco desnudo dentro del rango de su especie; y el canto de
  // arriba del tronco sin asomar por la copa.
  check(spawn.crowns.length === 6, `faltan especies de arbol: ${spawn.crowns.length}`);
  for (const c of spawn.crowns) {
    check(
      Math.abs(c.ratio / c.esperado - 1) <= 0.15,
      `${c.especie}: ancho:alto ${c.ratio.toFixed(2)}, su especie pide ${c.esperado.toFixed(2)}`,
    );
    check(c.alto >= 2.8 && c.alto <= 5.2, `${c.especie}: copa de ${c.alto.toFixed(2)} bloques de alto`);
    check(
      c.troncoMin >= c.rango[0] - 0.15 && c.troncoMax <= c.rango[1] + 0.15,
      `${c.especie}: tronco ${c.troncoMin.toFixed(2)}-${c.troncoMax.toFixed(2)}, ` +
        `su especie pide ${c.rango[0].toFixed(2)}-${c.rango[1].toFixed(2)}`,
    );
    check(c.asoma === 0, `${c.especie}: el tronco asoma por la copa (${c.asoma} pixeles)`);
  }
  // El grosor, coherente con las especies: el roble el mas grueso, la picea negra
  // la mas fina.
  const thick = [...spawn.crowns].sort((a, b) => a.grosor - b.grosor);
  check(
    thick[0].especie.startsWith('Picea negra') && thick[5].especie.startsWith('Roble'),
    `grosores fuera de orden: ${thick.map((c) => `${c.especie.split(' (')[0]} ${c.grosor.toFixed(2)}`).join(', ')}`,
  );
  // Se mira un BOTON y no `#thumbPad`: el contenedor mide 0x0 desde que cada
  // boton va fijado por su cuenta, asi que «no se ve» era verdad siempre y la
  // comprobacion no podia fallar.
  for (const id of ['#action', '#use', '#jump', '#run']) {
    check(!(await page.isVisible(id)), `el boton ${id} del pulgar se ve en PC`);
  }
  check(await page.isVisible('#proj'), 'el ojo de la proyeccion no se ve');
  // La ayuda de teclado vive dentro del boton de informacion (pedido del
  // autor, 2026-09-30): cerrado el HUD no se ve.
  check(!(await page.isVisible('#help')) && (await page.evaluate(() => !!document.querySelector('#hud #help'))),
    'la ayuda de teclado no esta dentro del panel de informacion');

  // La barra de abajo de PC, segun el boceto del autor: MODO, la caja con el
  // anillo del hambre, la barra de la mano y el de la salud, e INVENTARIO. La
  // caja, centrada al pixel; MODO e INVENTARIO, del mismo tamano.
  check(await page.isVisible('#hudToggle'), 'falta el boton del HUD');
  check(!(await page.isVisible('#others')), 'en PC se ve OTROS, que es del movil');
  const bar = await page.evaluate(() => {
    const r = (id) => document.getElementById(id).getBoundingClientRect().toJSON();
    return { box: r('barBox'), hotbar: r('hotbar'), mode: r('modeBar'), inv: r('invOpen'), hunger: r('hungerRing'), health: r('healthRing') };
  });
  const mid = (r) => r.x + r.width / 2;
  console.log(`  barra de abajo: caja centrada en ${mid(bar.box).toFixed(1)}, MODO ${bar.mode.width}x${bar.mode.height}, INVENTARIO ${bar.inv.width}x${bar.inv.height}`);
  check(Math.abs(mid(bar.box) - 640) <= 1 && Math.abs(mid(bar.hotbar) - 640) <= 1, `la barra de la mano no esta centrada: ${mid(bar.box)}, ${mid(bar.hotbar)}`);
  check(bar.mode.right <= bar.box.left && bar.inv.left >= bar.box.right, 'MODO no queda a la izquierda o INVENTARIO a la derecha de la caja');
  check(bar.mode.width === bar.inv.width && bar.mode.height === bar.inv.height && bar.inv.width > 0, 'MODO e INVENTARIO no miden lo mismo');
  check(bar.hunger.right <= bar.hotbar.left && bar.health.left >= bar.hotbar.right, 'los anillos no flanquean la barra de la mano');
  check(!spawn.hudOpen && !(await page.isVisible('#hud')), 'el HUD no arranca cerrado');
  check(!spawn.inventoryOpen && !(await page.isVisible('#invPanel')), 'el inventario no arranca cerrado');
  const vit = await page.evaluate(() => ({
    health: Number(document.getElementById('healthRing').getAttribute('aria-valuenow')),
    hunger: Number(document.getElementById('hungerRing').getAttribute('aria-valuenow')),
    arc: document.getElementById('hungerArc').getAttribute('stroke-dasharray'),
  }));
  // El hambre ya corre mientras carga la pagina, asi que se pide cerca de 100.
  check(vit.health === 100 && vit.hunger >= 90 && !!vit.arc, `anillos de salida inesperados: ${JSON.stringify(vit)}`);

  // Los botones se pulsan con el cursor suelto, o sea en pausa: capturado, el
  // clic va al lienzo y golpea.
  await release(page);
  await page.click('#hudToggle');
  await page.waitForTimeout(250);
  const hud = await page.evaluate(() => ({
    clock: document.getElementById('clock').textContent,
    day: document.getElementById('day').textContent,
    seed: document.getElementById('seed').textContent,
  }));
  console.log(`  HUD: ${JSON.stringify(hud)}`);
  check((await state(page)).hudOpen && await page.isVisible('#hud'), 'el boton no abrio el HUD');
  check(!(await page.isVisible('.touch-only')), 'la pista tactil se ve en PC');
  check(/^\d\d:\d\d$/.test(hud.clock), `el reloj del HUD no marca la hora: ${hud.clock}`);
  check(hud.day === '1', `el HUD no marca el dia 1: ${hud.day}`);
  check(hud.seed === String(SEED), `el HUD no marca la semilla: ${hud.seed}`);
  await mkdir(SHOTS, { recursive: true });
  await page.screenshot({ path: join(SHOTS, '3d-01-spawn.png') });
  await page.click('#hudToggle');
  check(!(await page.isVisible('#hud')), 'el boton no volvio a cerrar el HUD');
  await play(page);

  // Andar.
  const walked = await walkToOpenGround(page);
  const moved = await state(page);
  check(walked > 1, `el jugador apenas se movio: ${walked.toFixed(2)} casillas`);
  check(moved.tick > spawn.tick, 'la simulacion no avanzo');
  check(moved.hunger < spawn.hunger, 'el hambre no bajo con el tiempo');
  const hudHunger = await page.evaluate(() => Number(document.getElementById('hungerRing').getAttribute('aria-valuenow')));
  check(hudHunger < 100, `el anillo del hambre no bajo (${hudHunger})`);

  // La mirada es la de la camara (regla 5): el rumbo y la inclinacion del
  // nucleo son los de la camara, y girarla los gira.
  const dot = (s) => s.facing[0] * s.aim[0] + s.facing[1] * s.aim[1];
  const before = await state(page);
  check(dot(before) > 0.99, `la mirada no sigue a la camara: ${JSON.stringify([before.facing, before.aim])}`);
  check(
    Math.abs(before.lookZ - Math.sin(before.pitch)) < 1e-3,
    `la inclinacion del nucleo (${before.lookZ.toFixed(3)}) no es la de la camara (${before.pitch.toFixed(3)})`,
  );
  await orbit(page, 260);
  const turned = await waitForLoop(page, 20);
  console.log(`  raton capturado: rumbo ${before.yaw.toFixed(2)} -> ${turned.yaw.toFixed(2)}`);
  console.log(`  mirada: ${JSON.stringify(before.facing)} -> ${JSON.stringify(turned.facing)}`);
  check(
    turned.facing[0] !== before.facing[0] || turned.facing[1] !== before.facing[1],
    'girar la camara no giro la mirada',
  );
  check(dot(turned) > 0.99, `tras girar, la mirada no sigue a la camara: ${JSON.stringify([turned.facing, turned.aim])}`);
  // Y mover el raton es mirar, no accionar.
  check(turned.sent.harvest === before.sent.harvest, 'mover el raton acciono');

  // Lo que el golpe alcanza (regla 12) esta delante y al alcance: todo objeto
  // cuyo hitbox toca el sector cae en una casilla a menos de 2,5 bloques mas su
  // media diagonal, hacia donde se mira. Los numeros exactos del sector los
  // miden los tests del nucleo; aqui, que el que llega al juego es ese. Y la
  // reticula marca exactamente eso.
  for (const [tx, ty] of turned.reach) {
    const dx = tx + 0.5 - turned.x;
    const dy = ty + 0.5 - turned.y;
    const d = Math.hypot(dx, dy);
    // El alcance es el del nucleo (2,5 desde el 2026-09-29): con el 2 de antes
    // esta comprobacion habria dado por malo un golpe legitimo a 2,3.
    check(d <= 2.5 + Math.SQRT1_2 + 1e-6, `se alcanza la casilla ${tx},${ty}, a ${d.toFixed(2)}`);
    check(d < 0.8 || (dx * turned.aim[0] + dy * turned.aim[1]) / d > 0, `se alcanza la casilla ${tx},${ty}, que queda detras`);
  }
  // La reticula ya no marca lo que se alcanza (pedido del autor): marca donde
  // toca la mirada, el suelo o una pared.
  check(!turned.plantTile || turned.reticle === 'suelo', `mirando al suelo la reticula marca ${turned.reticle}`);

  // Mirar hacia arriba en tercera persona (pedido del autor): la camara baja
  // por detras, y la colision la para antes del suelo. Con el raton capturado,
  // subir el raton es mirar arriba en las tres vistas.
  await look(page, 0, -900);
  const lookingUp = await waitForLoop(page, 20);
  console.log(
    `  mirando arriba: inclinacion ${lookingUp.pitch.toFixed(2)}, camara a ${lookingUp.camDistance.toFixed(2)}, ` +
      `${lookingUp.camClearance.toFixed(2)} sobre el suelo`,
  );
  check(lookingUp.pitch > 0.3, `arrastrar no subio la mirada (${lookingUp.pitch.toFixed(2)})`);
  check(lookingUp.lookZ > 0, 'el nucleo no recibio la mirada hacia arriba');
  check(lookingUp.camClearance > 0.05, `la camara se metio bajo el suelo (${lookingUp.camClearance.toFixed(2)})`);

  // Un clic sin arrastrar acciona, y el barrido llega a dibujarse: sale siempre,
  // haya algo que golpear o no.
  const beforeClick = await open(page, baseUrl);
  await strike(page);
  await page.waitForTimeout(400);
  const afterClick = await state(page);
  check(afterClick.sent.harvest > beforeClick.sent.harvest, 'un clic no acciono');
  check(afterClick.slashesDrawn > beforeClick.slashesDrawn, 'accionar no dibujo ningun barrido');

  // Recolectar de verdad, y los escombros contados como DIBUJADOS acumulados.
  // Delante de una mata buscada a proposito (`?x=&y=`), no paseando: con el cono
  // de la regla 12, pegado al borde de una casilla solo caen una o dos delante,
  // y buscar algo que golpear andando a ciegas dejo de acertar. Una comprobacion
  // que pasa por suerte es peor que una que falla.
  const bush = (await spots(page)).berrySpot;
  check(bush !== null, 'no se encontro ninguna mata que golpear');
  if (bush) await open(page, baseUrl, `&x=${bush.stand.x}&y=${bush.stand.y}`);
  const gathered = await harvestUntil(page, (s) => sum(s.inventory) > 0);
  console.log(`  inventario tras recolectar: ${JSON.stringify(gathered.inventory)}`);
  check(sum(gathered.inventory) > 0, 'accionar no recolecto nada');
  check(gathered.debrisDrawn > 0, 'derribar no dibujo ningun escombro');
  // El registro de objetos anota lo que entro, y nunca mas de cinco lineas.
  console.log(`  registro de objetos: ${JSON.stringify(gathered.feed)}`);
  check(gathered.feed.length > 0 && gathered.feed.length <= 5 && gathered.feed.every((t) => /^[+-]\d+ \S/.test(t)),
    `el registro de objetos no anoto lo recolectado: ${JSON.stringify(gathered.feed)}`);
  // Lo que dice y lo que se pinta, leidos a la vez: una linea vive 3 s.
  const painted = await page.evaluate(() => [window.__verdant.feed.length, document.querySelectorAll('#pickupFeed div').length]);
  check(painted[0] === painted[1], `el registro no se pinta: ${painted}`);
  // La cruz, en el centro exacto de la pantalla.
  const cross = await page.evaluate(() => document.getElementById('crosshair').getBoundingClientRect().toJSON());
  check(await page.isVisible('#crosshair') && Math.abs(cross.x + cross.width / 2 - 640) <= 1 && Math.abs(cross.y + cross.height / 2 - 360) <= 1,
    `la cruz no esta en el centro: ${JSON.stringify(cross)}`);
  // La rueda recorre la barra de la mano y ya no hace zoom; da la vuelta.
  const wheel = (dy) => page.evaluate((d) => document.getElementById('view').dispatchEvent(
    new WheelEvent('wheel', { deltaY: d, deltaMode: 0, bubbles: true, cancelable: true })), dy);
  const w0 = await state(page);
  await wheel(100);
  await page.waitForTimeout(200);
  const w1 = await state(page);
  // Dos muescas seguidas: se iluminan las dos casillas por las que pasa, no
  // solo la de llegada (pedido del autor). Se lee el ACUMULADO de casillas
  // encendidas, en orden, y se espera a que llegue: nada de contar lo que se
  // ve en una ventana de tiempo, que en una maquina cargada cae a suertes
  // (escape 13, dos veces).
  await wheel(-100);
  await wheel(-100);
  const n0 = w0.hotbarPasses.length;
  await page.waitForFunction((n) => window.__verdant.hotbarPasses.length >= n, n0 + 3, { timeout: 5000 }).catch(() => {});
  const w2 = await state(page);
  const lit = w2.hotbarPasses.slice(n0);
  const passed = [(w0.selectedSlot + 1) % 4, w0.selectedSlot, (w0.selectedSlot + 3) % 4];
  console.log(`  rueda: casilla ${w0.selectedSlot + 1} -> ${w1.selectedSlot + 1} -> ${w2.selectedSlot + 1}, iluminadas al pasar ${lit.map((i) => i + 1)}`);
  check(w1.selectedSlot === (w0.selectedSlot + 1) % 4 && w2.selectedSlot === (w0.selectedSlot + 3) % 4,
    'la rueda no recorre la barra de la mano');
  check(lit.join() === passed.join(),
    `la rueda no ilumino las casillas ${passed.map((i) => i + 1)} por las que paso: ${lit.map((i) => i + 1)}`);
  check(w2.distance === w0.distance, 'la rueda sigue haciendo zoom');
  // El inventario, con su tecla: E lo abre, muestra lo del juego, y E lo
  // cierra. Abrirlo suelta el cursor y NO pausa (decision del autor).
  await page.keyboard.press('KeyE');
  await page.waitForTimeout(250);
  check(await page.isVisible('#invPanel'), 'E no abrio el inventario');
  const invOpen = await state(page);
  check(!invOpen.pointerLocked && !invOpen.paused, 'abrir el inventario no solto el cursor o pauso');
  // Con el inventario abierto solo se anda (pedido del autor): un clic en el
  // mundo no golpea ni usa.
  // Sobre un punto del mundo que el panel no tape: en el centro el clic caeria
  // en el panel y la comprobacion no podria fallar.
  const world = await page.evaluate(() => {
    for (let y = 200; y < 600; y += 40) {
      for (let x = 20; x < 1260; x += 40) if (document.elementFromPoint(x, y)?.id === 'view') return { x, y };
    }
    return null;
  });
  check(world !== null, 'el inventario tapa el mundo entero: no hay donde clicar');
  if (world) {
    await page.mouse.click(world.x, world.y);
    await page.mouse.click(world.x, world.y, { button: 'right' });
  }
  await page.waitForTimeout(300);
  const clickedOpen = await state(page);
  check(clickedOpen.sent.harvest === invOpen.sent.harvest && clickedOpen.sent.use === invOpen.sent.use,
    'con el inventario abierto un clic golpeo o uso');
  // El menu del navegador no sale nunca, tampoco sobre el panel (lo vio el
  // autor al abrir una estacion con el clic derecho).
  check(await page.evaluate(() => {
    const ev = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
    document.getElementById('invPanel').dispatchEvent(ev);
    return ev.defaultPrevented;
  }), 'el clic derecho sobre el panel deja salir el menu del navegador');
  check((await page.locator('#recipeList .recipe').count()) === 2, 'el recetario no lista las dos herramientas de piedra');
  check((await page.locator('#charGrid .slot.equip').count()) === 10, 'faltan las casillas de equipables');
  // Las casillas: la suma de lo que pintan es lo que hay (las herramientas
  // no llevan numero, llevan desgaste).
  const hudTotal = await page.evaluate(() =>
    Array.from(document.querySelectorAll('#invGrid .slot em'))
      .map((el) => Number(el.textContent))
      .reduce((a, b) => a + b, 0),
  );
  const nowSlots = (await state(page)).slots;
  const nowTotal = sum(nowSlots.filter((s) => s.item >= 0 && s.item < 10).map((s) => s.count));
  check(hudTotal === nowTotal, `el inventario en pantalla (${hudTotal}) no es el del juego (${nowTotal})`);
  check(sum(gathered.inventory.slice(0, 10)) > 0 && gathered.inventory[9] > 0, 'un arbusto no dio fibra');
  // La descripcion: tocar un objeto la muestra y tocar una casilla vacia la
  // limpia.
  const desc = () => page.evaluate(() => document.getElementById('selDesc').textContent.trim());
  check((await desc()) === '' && (await page.locator('#invGrid .slot.picked').count()) === 0,
    'al abrir el inventario ya habia algo seleccionado');
  const full = nowSlots.findIndex((s) => s.item >= 0);
  const empty = nowSlots.findIndex((s) => s.item < 0);
  await page.click(`#invGrid .slot:nth-child(${full + 1})`);
  await page.waitForTimeout(200);
  const shown = await desc();
  await page.click(`#invGrid .slot:nth-child(${empty + 1})`);
  await page.waitForTimeout(200);
  console.log(`  descripcion: «${shown.slice(0, 30)}…» -> «${await desc()}»`);
  check(shown !== '' && (await desc()) === '', 'tocar una casilla vacia no limpio la descripcion');
  await page.screenshot({ path: join(SHOTS, '3d-01b-inventario.png') });
  // Esc lo cierra sin pausar. Y SIN poder recapturar, que es lo que pasa en un
  // Chrome de verdad —Esc no cuenta como gesto— y el headless no reproduce: se
  // le quita la captura a mano para probar justo ese caso.
  await page.evaluate(() => {
    window.__lockBackup = HTMLCanvasElement.prototype.requestPointerLock;
    HTMLCanvasElement.prototype.requestPointerLock = () => Promise.reject(new Error('sin gesto'));
  });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  const escClosed = await state(page);
  await page.evaluate(() => { HTMLCanvasElement.prototype.requestPointerLock = window.__lockBackup; });
  check(!(await page.isVisible('#invPanel')), 'Esc no cerro el inventario');
  console.log(`  Esc sin poder recapturar: pausa ${escClosed.paused}, cursor suelto sin pausa ${escClosed.cursorFree}`);
  check(!escClosed.paused && escClosed.cursorFree, 'cerrar el inventario con Esc pauso el juego');
  // Y al reabrirlo no queda nada seleccionado.
  await page.keyboard.press('KeyE');
  await page.waitForTimeout(250);
  check((await desc()) === '' && (await page.locator('#invGrid .slot.picked').count()) === 0,
    'al reabrir el inventario seguia seleccionada la casilla de antes');
  await page.keyboard.press('KeyE');
  await page.waitForTimeout(150);
  check(!(await page.isVisible('#invPanel')), 'E no volvio a cerrar el inventario');
  // Y los efectos se apagan solos.
  await page.waitForTimeout(1800);
  const settled = await state(page);
  check(
    settled.effects.particles === 0 && settled.effects.slashes === 0,
    `los efectos no se apagaron (${JSON.stringify(settled.effects)})`,
  );

  // Zoom con + y -.
  const z0 = (await state(page)).distance;
  for (let i = 0; i < 4; i++) await page.keyboard.press('Minus');
  await page.waitForTimeout(300);
  const z1 = (await state(page)).distance;
  for (let i = 0; i < 6; i++) await page.keyboard.press('Equal');
  await page.waitForTimeout(300);
  const z2 = (await state(page)).distance;
  console.log(`  zoom: ${z0.toFixed(1)} -> ${z1.toFixed(1)} -> ${z2.toFixed(1)}`);
  check(z1 > z0, `- no alejo la camara (${z0} -> ${z1})`);
  check(z2 < z1, `+ no acerco la camara (${z1} -> ${z2})`);

  // El panel del entorno.
  await release(page);
  await page.click('#statsToggle');
  check(await page.isVisible('#statsPanel'), 'el panel del entorno no se desplego');
  await page.waitForTimeout(300);
  const bars = await page.evaluate(() => ({
    biome: document.querySelectorAll('#biomeBars .statRow').length,
    chunk: document.querySelectorAll('#chunkBars .statRow').length,
    name: document.getElementById('biomeName').textContent,
    reward: document.getElementById('rewardState').textContent,
  }));
  const here = await state(page);
  console.log(`  panel: ${bars.name}, ${bars.biome} barras de bioma, ${bars.chunk} de chunk`);
  check(bars.biome === 3 && bars.chunk === 3, `barras inesperadas: ${JSON.stringify(bars)}`);
  check(bars.name === here.biome, `el panel anuncia ${bars.name} pisando ${here.biome}`);
  check(bars.reward.length > 10, 'el panel no explica el estado de las recompensas');
  await page.screenshot({ path: join(SHOTS, '3d-02-panel.png') });
  await page.click('#statsToggle');
  check(!(await page.isVisible('#statsPanel')), 'el panel no se replego al volver a pulsar');
  await play(page);

  // CTRL mantenido suelta el cursor sin pausar, y al soltarlo se recaptura
  // (decision del autor, 2026-09-30).
  await page.keyboard.down('Control');
  await page.waitForTimeout(300);
  const ctrlHeld = await state(page);
  await page.keyboard.up('Control');
  await page.waitForTimeout(400);
  const ctrlUp = await state(page);
  console.log(`  CTRL: capturado ${ctrlHeld.pointerLocked} -> ${ctrlUp.pointerLocked}, pausa ${ctrlHeld.paused}`);
  check(!ctrlHeld.pointerLocked && !ctrlHeld.paused, 'mantener CTRL no solto el cursor o pauso');
  check(ctrlUp.pointerLocked, 'soltar CTRL no volvio a capturar el cursor');
  // TAB cambia el modo de golpe, y el boton MODO lo dice con su icono.
  const modeIcon = () => page.evaluate(() =>
    getComputedStyle(document.querySelector('#modeBar .mode-precise')).display !== 'none');
  const m0 = await state(page);
  await page.keyboard.press('Tab');
  await page.waitForTimeout(250);
  const m1 = await state(page);
  const icon1 = await modeIcon();
  await page.keyboard.press('Tab');
  await page.waitForTimeout(250);
  const m2 = await state(page);
  console.log(`  TAB: preciso ${m0.precise} -> ${m1.precise} -> ${m2.precise}`);
  check(!m0.precise && m1.precise && !m2.precise && icon1 && !(await modeIcon()), 'TAB no alterna el modo de golpe o su icono');

  // La barra de la mano: siempre a la vista, y las teclas 1-4 eligen casilla.
  check(await page.isVisible('#hotbar'), 'la barra de la mano no se ve en PC');
  const beforeSelect = await state(page);
  await page.keyboard.press('Digit3');
  await page.waitForTimeout(250);
  const selected = await state(page);
  check(selected.itemsSent.select > beforeSelect.itemsSent.select, 'la tecla 3 no llego a la Intent');
  check(selected.selectedSlot === 2, `la tecla 3 no eligio la casilla 3 (${selected.selectedSlot})`);
  await page.keyboard.press('Digit1');

  // La carrera, con su estado en la ayuda.
  await page.keyboard.press('ShiftLeft');
  await page.waitForTimeout(150);
  const runLabel = await page.evaluate(
    () => getComputedStyle(document.getElementById('runState'), '::after').content,
  );
  check(runLabel.includes('ACTIVADO'), `la ayuda no dice que la carrera esta encendida (${runLabel})`);
  await page.keyboard.press('ShiftLeft');

  // Soltar el cursor pone el juego en pausa (decision del autor). Esc lo
  // suelta en un navegador de verdad; en headless se suelta a mano.
  const inGame = await state(page);
  await page.keyboard.press('KeyE');
  await page.waitForTimeout(250);
  await page.keyboard.press('KeyE');
  await page.waitForTimeout(250);
  const closed = await state(page);
  check(closed.pointerLocked || closed.paused, 'al cerrar el inventario ni se capturo el cursor ni se pauso');
  if (closed.paused) await play(page);
  await release(page);
  const esc = await state(page);
  await page.waitForTimeout(500);
  const escLater = await state(page);
  const escHint = await page.textContent('#pauseHint');
  console.log(`  soltar el cursor: pausa ${esc.paused}, aviso «${escHint}», ticks ${esc.tick} -> ${escLater.tick}`);
  check(esc.paused && (await page.isVisible('#pause')), 'soltar el cursor no puso la pausa con su aviso');
  check(escHint === 'Haz clic para continuar', `el aviso de pausa dice «${escHint}»`);
  check(escLater.tick === esc.tick, 'en pausa el juego siguio corriendo');
  await strike(page);
  await page.waitForTimeout(300);
  const resumed = await state(page);
  check(resumed.pointerLocked && !resumed.paused, 'un clic en la pantalla no reanudo');
  check(resumed.sent.harvest === inGame.sent.harvest, 'el clic que reanuda golpeo');
  // El panel de desarrollo suelta el cursor pero no pausa.
  await page.keyboard.press('F3');
  await page.waitForTimeout(300);
  const devOpen = await state(page);
  check(devOpen.dev && !devOpen.pointerLocked && !devOpen.paused, 'F3 no solto el cursor o puso la pausa');
  await page.keyboard.press('F3');
  await page.waitForTimeout(300);
  const devClosed = await state(page);
  check(devClosed.pointerLocked || devClosed.paused, 'al cerrar F3 ni se capturo el cursor ni se pauso');
  if (!devClosed.paused) await release(page);

  // Con el cursor suelto (en pausa) se pulsan los botones.
  // El ojo recorre las tres vistas y lo dice con su forma: perspectiva →
  // isometrica (entrecerrado) → primera persona (con mira) → perspectiva.
  await page.click('#proj');
  await page.waitForTimeout(200);
  const orto = await state(page);
  check(orto.projection === 'orto', `el ojo no cambio a isometrica (${orto.projection})`);
  // El raton paso por el ojo en perspectiva: la barra del angulo es solo de la
  // primera persona.
  check(orto.fovPanel === false, 'la barra del angulo se abrio fuera de la primera persona');
  check(await page.isVisible('#proj.flat'), 'el ojo no se entrecerro en isometrica');
  await page.click('#proj');
  await page.waitForTimeout(300);
  const fp = await state(page);
  check(fp.projection === 'primera', `el ojo no cambio a primera persona (${fp.projection})`);
  check(await page.isVisible('#proj.fp'), 'el ojo no lleva la mira en primera persona');
  check(fp.playerVisible === false, 'en primera persona se ve el cuerpo del personaje');
  // La barra del angulo: sale al PASAR el raton por el ojo, sin clic; salir
  // no la cierra, y cualquier accion —una tecla, un clic fuera— si.
  const fovShown = async () => (await state(page)).fovPanel && (await page.isVisible('#fovPanel'));
  await page.mouse.move(CLICK.x, CLICK.y);
  await page.hover('#proj');
  await page.waitForTimeout(250);
  check(await fovShown(), 'pasar el raton por el ojo en primera persona no abrio la barra');
  check((await page.textContent('#fovValue')) === '70°', 'la barra no arranca en 70°');
  await page.locator('#fovRange').fill('90');
  const wide = await state(page);
  const wideLabel = await page.textContent('#fovValue');
  console.log(`  angulo de vision: 70 -> ${wide.fpFov} (${wideLabel}), en uso ${wide.fov}`);
  check(wide.fov === 90 && wide.fpFov === 90, `la barra no cambio el campo de vision (${wide.fov})`);
  check(wideLabel === '90°', `el numero de la barra no siguio al angulo (${wideLabel})`);
  await page.screenshot({ path: join(SHOTS, '3d-02c-angulo.png') });
  await page.mouse.move(CLICK.x, CLICK.y);
  await page.waitForTimeout(250);
  check(await fovShown(), 'la barra se cerro al sacar el raton del ojo');
  await page.keyboard.press('KeyQ');
  await page.waitForTimeout(250);
  check(!(await fovShown()), 'una tecla no cerro la barra del angulo');
  await page.hover('#proj');
  await page.waitForTimeout(250);
  check(await fovShown(), 'la barra no volvio a abrirse con el raton');
  await strike(page);
  await page.waitForTimeout(250);
  check(!(await fovShown()), 'un clic fuera no cerro la barra del angulo');
  check(!(await state(page)).paused, 'el clic en la pantalla no reanudo tras la barra');
  // El barrido tiene que llegar a dibujarse tambien desde los ojos. Desde el
  // nacimiento, con las casillas al alcance (regla 22).
  const fpStart = await open(page, baseUrl);
  await page.keyboard.press('KeyP');
  await page.keyboard.press('KeyP');
  await page.waitForTimeout(300);
  const fpAgain = await state(page);
  check(fpAgain.projection === 'primera', 'P no llevo a la primera persona');
  check(fpAgain.fov === 90, `el angulo elegido no se recordo al recargar (${fpAgain.fov})`);
  await page.evaluate(() => localStorage.removeItem('verdant.fpFov'));
  await strike(page);
  await page.waitForTimeout(400);
  const fpHit = await state(page);
  check(fpHit.slashesDrawn > fpStart.slashesDrawn, 'en primera persona el barrido no se dibujo');
  await page.screenshot({ path: join(SHOTS, '3d-02b-primera-persona.png') });
  await page.keyboard.press('KeyP');
  await page.waitForTimeout(200);
  const back = await state(page);
  check(back.projection === 'perspectiva', 'P no volvio a la perspectiva');
  check(back.playerVisible === true, 'al salir de la primera persona el cuerpo no volvio');

  await page.close();
}

// ------------------------------------------------------ comer, sembrar, mineral

/**
 * Lo que depende de tener algo delante: comer bayas, sembrar sus semillas y
 * minar. Se abre directamente en el sitio con `?x=&y=`, que buscarlo paseando
 * seria una loteria.
 */
async function resourcesPass(browser, baseUrl) {
  console.log('\n== recursos (comer, sembrar, minar) ==');
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  watchProblems(page, 'recursos');

  await open(page, baseUrl);
  const where = await spots(page);

  // Comer: una mata delante, un golpe, y E se come una baya.
  const berry = where.berrySpot;
  check(berry !== null, 'no se encontro ninguna mata con bayas');
  if (berry) {
    await open(page, baseUrl, `&x=${berry.stand.x}&y=${berry.stand.y}`);
    const withBerries = await harvestUntil(page, (s) => s.inventory[2] > 0, 3);
    console.log(`  mata en ${berry.node.x},${berry.node.y}: ${withBerries.inventory[2]} bayas`);
    check(withBerries.inventory[2] > 0, 'golpear la mata no dio bayas');
    check(withBerries.hunger < 100, 'el hambre no habia bajado, y con ella llena no se come');
    // Comer es usar la baya en la mano: clic derecho (decision del autor).
    await toHand(page, 2);
    await useClick(page);
    await page.waitForTimeout(300);
    const fed = await state(page);
    console.log(`  comer: bayas ${withBerries.inventory[2]} -> ${fed.inventory[2]}, hambre ${withBerries.hunger.toFixed(2)} -> ${fed.hunger.toFixed(2)}`);
    check(fed.sent.use > withBerries.sent.use, 'el clic derecho no llego a la Intent');
    check(fed.inventory[2] < withBerries.inventory[2], 'comer no gasto ninguna baya');
    check(fed.hunger > withBerries.hunger, 'comer no lleno el hambre');

    // Un arbusto a mano da fibra ademas de bayas (etapa 1).
    check(withBerries.inventory[9] > 0, `el arbusto no dio fibra: ${JSON.stringify(withBerries.inventory)}`);

    // Sembrar: hace falta una semilla, y la semilla cae con una probabilidad
    // —y ya solo de arbustos, porque un arbol a mano no cae—. Que siembre lo
    // miden los tests del nucleo; aqui, que F llega a la Intent.
    const seeded = await harvestUntil(page, (s) => s.inventory[3] + s.inventory[4] > 0, 4);
    const seeds = seeded.inventory[3] + seeded.inventory[4];
    console.log(`  semillas tras recolectar: ${seeds}`);
    let planted = seeded;
    // Se siembra donde la mirada toca el suelo, a menos de 2,5 bloques en
    // horizontal (regla 12): con los ojos a 1,75 hay que mirar unos 35 grados
    // hacia abajo, justo lo que da la camara de arranque; se baja algo mas para
    // sembrar con margen. Bajar el raton baja la mirada.
    await look(page, 0, 120);
    await page.waitForTimeout(300);
    // Sembrar es usar la semilla en la mano: clic derecho. F ya no hace nada.
    const beforeF = await state(page);
    await page.keyboard.press('KeyF');
    await page.waitForTimeout(250);
    check((await state(page)).sent.use === beforeF.sent.use, 'la tecla F sigue haciendo algo');
    await toHand(page, seeded.inventory[3] > 0 ? 3 : 4);
    for (let i = 0; i < 8; i++) {
      await useClick(page);
      await page.waitForTimeout(250);
      planted = await state(page);
      if (seeds === 0 || planted.inventory[3] + planted.inventory[4] < seeds) break;
      // A otra casilla: girar la camara cambia la apuntada.
      await orbit(page, 120);
      await hold(page, 'KeyW', 150);
    }
    check(planted.sent.use > seeded.sent.use, 'el clic derecho no llego a la Intent');
    if (seeds > 0) {
      check(planted.inventory[3] + planted.inventory[4] < seeds, 'sembrar no consumio ninguna semilla');
    }
  }

  // Minar: la montana se pisa y sus minerales se sacan.
  // Con el pico de piedra se mina carbon o cobre; el hierro pide uno mejor.
  const mineral = where.stoneOreSpot ?? where.mineralSpot;
  check(mineral !== null, 'no se encontro ningun mineral en el mundo de prueba');
  if (mineral) {
    // Con el panel de desarrollo abierto (cursor libre, sin pausa): sus
    // «Materiales de piedra» dan lo justo para fabricar, y fabricar se prueba de
    // verdad, con el panel y su boton.
    const arrived = await open(page, baseUrl, `&x=${mineral.stand.x}&y=${mineral.stand.y}&dev=1`);
    console.log(`  ${mineral.kind} en ${mineral.node.x},${mineral.node.y}; aparece en ${arrived.terrain} / ${arrived.biome}`);
    check(arrived.biome === 'Tierras altas', `el bioma no es el esperado: ${arrived.biome}`);
    const ores = (s) => s.inventory[5] + s.inventory[6] + s.inventory[7];
    // A mano, un mineral no da nada, y sin aviso: el autor quito todos los
    // avisos en pantalla (2026-09-29).
    await strike(page);
    await page.waitForTimeout(300);
    const byHand = await state(page);
    check(ores(byHand) === 0, 'un mineral se saco a mano');
    check((await page.locator('#toast').count()) === 0, 'sigue habiendo avisos en pantalla');
    // Fabricar el pico de piedra desde el panel.
    await page.click('[data-kit="piedra"]');
    await page.keyboard.press('KeyE');
    await page.waitForTimeout(300);
    // Arrastrar mueve: la rama de la casilla 1 a la 6.
    const center = async (sel) => {
      const r = await page.locator(sel).boundingBox();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    };
    const drag = async (from, to, steps = 8) => {
      await page.mouse.move(from.x, from.y);
      await page.mouse.down();
      await page.mouse.move(to.x, to.y, { steps });
      await page.mouse.up();
      await page.waitForTimeout(300);
    };
    const kit = await state(page);
    await drag(await center('#invGrid .slot:nth-child(1)'), await center('#invGrid .slot:nth-child(6)'));
    const moved = await state(page);
    check(moved.itemsSent.move > kit.itemsSent.move, 'arrastrar no llego a la Intent');
    check(moved.slots[5].item === 8 && moved.slots[0].item === -1, `arrastrar no movio la rama: ${JSON.stringify(moved.slots.slice(0, 6))}`);
    // Y de vuelta sobre la piedra: distintos, se intercambian.
    await drag(await center('#invGrid .slot:nth-child(6)'), await center('#invGrid .slot:nth-child(2)'));
    const swapped = await state(page);
    check(swapped.slots[1].item === 8 && swapped.slots[5].item === 1, 'arrastrar sobre otro objeto no los intercambio');
    // Fabricar: mantener 1,5 s el resultado. Soltar antes no fabrica.
    const pickRow = '#recipeList .recipe:nth-child(2) .result';
    const beforeCraft = await state(page);
    const at = await center(pickRow);
    await page.mouse.move(at.x, at.y);
    await page.mouse.down();
    await page.waitForTimeout(500);
    await page.mouse.up();
    await page.waitForTimeout(300);
    check((await state(page)).itemsSent.craft === beforeCraft.itemsSent.craft, 'soltar antes de 1,5 s fabrico');
    await page.mouse.down();
    await page.waitForTimeout(1900);
    await page.mouse.up();
    await page.waitForTimeout(400);
    const made = await state(page);
    const pickSlot = made.slots.findIndex((s) => s.item === 11);
    console.log(`  pico fabricado en la casilla ${pickSlot + 1}; registro ${JSON.stringify(made.feed)}`);
    check(made.feed.includes('+1 Pico de piedra') && made.feed.some((t) => t.startsWith('-')),
      `el registro no anoto lo fabricado y lo gastado: ${JSON.stringify(made.feed)}`);
    check(made.feed.length <= 5, 'el registro paso de cinco lineas');
    check(made.itemsSent.craft > beforeCraft.itemsSent.craft, 'mantener 1,5 s no fabrico');
    // La carga acaba en el borde derecho de los ingredientes, no en el del panel.
    const rowEdge = await page.evaluate(() => {
      const row = document.querySelector('#recipeList .recipe:nth-child(2)');
      return { row: row.getBoundingClientRect().right, ing: row.querySelector('.ingredients').getBoundingClientRect().right };
    });
    check(Math.abs(rowEdge.row - rowEdge.ing) < 1, `la fila de la receta no acaba en los ingredientes: ${JSON.stringify(rowEdge)}`);
    check(pickSlot >= 0, 'el pico no llego al inventario');
    // Tirar: una piedra, arrastrada fuera del panel, pide confirmacion.
    // Cancelar no tira; aceptar, si.
    const stoneSlot = made.slots.findIndex((s) => s.item === 1);
    const stoneFrom = await center(`#invGrid .slot:nth-child(${stoneSlot + 1})`);
    await drag(stoneFrom, { x: 30, y: 30 });
    const asked = await state(page);
    check(asked.discardAsk && (await page.isVisible('#discardAsk')), 'soltar fuera del panel no pidio confirmacion');
    check(asked.inventory[1] > 0 && asked.itemsSent.discard === made.itemsSent.discard, 'se tiro antes de confirmar');
    await page.click('#discardNo');
    await page.waitForTimeout(250);
    const kept = await state(page);
    check(!kept.discardAsk && kept.inventory[1] > 0 && kept.itemsSent.discard === made.itemsSent.discard, 'cancelar tiro la piedra');
    await drag(stoneFrom, { x: 30, y: 30 });
    console.log(`  confirmar al tirar: «${await page.textContent('#discardText')}»`);
    await page.click('#discardYes');
    await page.waitForTimeout(300);
    const thrown = await state(page);
    check(thrown.itemsSent.discard > made.itemsSent.discard && thrown.inventory[1] === 0, 'confirmar no tiro la piedra');
    // Con el inventario abierto, de la rejilla a la barra de la mano: el pico,
    // a su cuarta casilla.
    if (pickSlot !== 3) {
      await drag(await center(`#invGrid .slot:nth-child(${pickSlot + 1})`), await center('#hotbar .slot:nth-child(4)'));
      const toBar = await state(page);
      check(toBar.slots[3].item === 11, `arrastrar a la barra no movio el pico: ${JSON.stringify(toBar.slots.slice(0, 4))}`);
    }
    await page.screenshot({ path: join(SHOTS, '3d-03b-inventario-fabricar.png') });
    await page.keyboard.press('KeyE');
    await page.waitForTimeout(200);
    await toHand(page, 11);
    // Con el pico, golpe a golpe: el hierro pide uno mejor, lo demas sale.
    const iron = mineral.kind.includes('hierro');
    let mined = await state(page);
    for (let i = 0; i < 10 && ores(mined) === 0; i++) {
      await strike(page);
      await page.waitForTimeout(260);
      mined = await state(page);
    }
    await page.screenshot({ path: join(SHOTS, '3d-03-montana.png') });
    const pickNow = mined.slots.findIndex((s) => s.item === 11);
    console.log(`  con pico: carbon/hierro/cobre ${mined.inventory.slice(5, 8).join('/')}, usos ${mined.slots[pickNow]?.wear}, esquirlas ${mined.chipsDrawn}`);
    check(mined.chipsDrawn > 0, 'golpear sin romper no solto esquirlas');
    if (iron) check(ores(mined) === 0, 'el hierro salio con el pico de piedra');
    else check(ores(mined) > 0, `con pico no se saco ningun mineral: ${JSON.stringify(mined.inventory)}`);
    check(iron || (mined.slots[pickNow]?.wear ?? 40) < 40, 'el pico no se desgasto al minar');
    const walked = await bestWalk(page, mined);
    check(walked > 1, 'el jugador no pudo caminar dentro de la montana');
  }

  await page.close();
}

// ------------------------------------------------------------------ estaciones

/**
 * La tanda 2: mesa y horno, fundir, herramientas de metal y ropa, jugado con
 * el raton y el panel. Decisiones del autor que se afirman: la estacion se
 * coloca con USAR llevandola en la mano, USAR mirandola abre el panel con SUS
 * recetas —que con E no salen—, el panel se cierra al alejarse, y la ropa se
 * arrastra a su hueco y abre casillas. Los numeros —cuantos golpes, que pico
 * mina que— los miden `tests/stations.test.ts`.
 *
 * Desde el nacimiento, que es un rellano llano (regla 22): la mesa va a la
 * casilla de delante y el horno a la de al lado, sin talud que lo impida.
 */
async function stationsPass(browser, baseUrl) {
  console.log('\n== estaciones (mesa, horno, metales, ropa) ==');
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  watchProblems(page, 'estaciones');

  // «Materiales de metal» del panel de desarrollo, y a jugar con el cursor.
  await open(page, baseUrl, '&dev=1');
  await page.click('[data-kit="metal"]');
  await page.keyboard.press('F3');
  await page.waitForTimeout(300);
  await play(page);
  const kit = await state(page);
  check(kit.inventory[0] >= 12 && kit.inventory[7] >= 10, `«Materiales de metal» no dio lo suyo: ${JSON.stringify(kit.inventory)}`);

  const center = async (sel) => {
    const r = await page.locator(sel).boundingBox();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  };
  const drag = async (from, to) => {
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(to.x, to.y, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(300);
  };
  const tabs = () => page.evaluate(() => Array.from(document.querySelectorAll('#recipeTabs .slot:not(.off)')).map((t) => t.textContent));
  const category = (name) =>
    page.evaluate((n) => Array.from(document.querySelectorAll('#recipeTabs .slot')).find((t) => t.textContent === n)?.click(), name);
  /** Mantener 1,9 s el resultado de la receta n de la lista. */
  const craft = async (n) => {
    const at = await center(`#recipeList .recipe:nth-child(${n}) .result`);
    await page.mouse.move(at.x, at.y);
    await page.mouse.down();
    await page.waitForTimeout(1900);
    await page.mouse.up();
    await page.waitForTimeout(300);
  };
  /** A la cuarta casilla de la barra y a la mano, si no estaba en la barra. */
  const toBar = async (item) => {
    const slot = (await state(page)).slots.findIndex((x) => x.item === item);
    if (slot >= 4) await drag(await center(`#invGrid .slot:nth-child(${slot + 1})`), await center('#hotbar .slot:nth-child(4)'));
  };

  // Con E, las recetas de mano: mesa y horno, sin fundir ni ropa.
  await page.keyboard.press('KeyE');
  await page.waitForTimeout(300);
  const handTabs = await tabs();
  console.log(`  con E: ${handTabs.join(', ')} («${await page.textContent('#recipeTitle')}»)`);
  check((await state(page)).panelStation === 0, 'con E el panel no es el de mano');
  check(handTabs.includes('Estaciones') && !handTabs.includes('Fundicion') && !handTabs.includes('Ropa'),
    `con E salen recetas de estacion: ${handTabs}`);
  await category('Estaciones');
  await craft(1);
  await craft(2);
  const built = await state(page);
  check(built.inventory[18] === 1 && built.inventory[19] === 1, `no se fabricaron la mesa y el horno: ${JSON.stringify(built.inventory)}`);
  await toBar(18);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  await play(page);

  // Mirando a lo largo de un eje, para que la mesa y el horno caigan en las
  // casillas de delante y de detras, y andar contra el horno de frente: en
  // diagonal el cuerpo resbala por la esquina y lo rodea.
  const angle = async () => {
    const a = (await state(page)).aim;
    return Math.atan2(a[1], a[0]);
  };
  const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  const a0 = await angle();
  const axis = Math.round(a0 / (Math.PI / 2)) * (Math.PI / 2);
  await look(page, wrap(axis - a0) / 0.0025, 0);
  await page.waitForTimeout(200);
  // El signo del raton frente al angulo no importa: si giro al reves, se deshace.
  if (Math.abs(wrap((await angle()) - axis)) > 0.05) await look(page, (-2 * wrap(axis - a0)) / 0.0025, 0);
  await page.waitForTimeout(200);
  check(Math.abs(wrap((await angle()) - axis)) < 0.05, 'no se pudo encarar la vista a un eje');

  // Colocar: la mesa en la mano, mirando al suelo de delante, clic derecho.
  await look(page, 0, 150);
  await page.waitForTimeout(200);
  await toHand(page, 18);
  const before = await state(page);
  await useClick(page);
  await page.waitForTimeout(400);
  const placed = await state(page);
  console.log(`  colocar la mesa: mesas ${before.inventory[18]} -> ${placed.inventory[18]}, en ${JSON.stringify(placed.stationTiles)}, cajas dibujadas ${placed.stationsDrawn}`);
  check(placed.inventory[18] === 0 && placed.stationTiles.some((t) => t.feature === 24), 'USAR con la mesa en la mano no la coloco');
  check(placed.stationsDrawn > before.stationsDrawn, 'la mesa colocada no se dibujo');

  // El horno, detras: media vuelta (0,0025 rad por pixel), lejos de la mesa.
  await look(page, 1257, 0);
  await page.waitForTimeout(200);
  await toHand(page, 19);
  await useClick(page);
  await page.waitForTimeout(400);
  const both = await state(page);
  check(both.inventory[19] === 0 && both.stationTiles.some((t) => t.feature === 25), 'USAR con el horno en la mano no lo coloco');
  await page.screenshot({ path: join(SHOTS, '3d-10-horno.png') });

  // Abrir el horno mirandolo: su panel, con sus recetas. Fundir 5 de cobre.
  await useClick(page);
  await page.waitForTimeout(400);
  const furnace = await state(page);
  const furnaceTabs = await tabs();
  console.log(`  usar el horno: panel ${furnace.inventoryOpen ? 'abierto' : 'cerrado'}, «${await page.textContent('#recipeTitle')}», ${furnaceTabs}`);
  check(furnace.inventoryOpen && furnace.panelStation === 2, 'USAR mirando el horno no abrio su panel');
  check(furnaceTabs.join() === 'Fundicion', `el horno ensena otras recetas: ${furnaceTabs}`);
  for (let i = 0; i < 5; i++) await craft(1);
  const smelted = await state(page);
  console.log(`  fundir: lingotes de cobre ${smelted.inventory[12]}; registro ${JSON.stringify(smelted.feed)}`);
  check(smelted.inventory[12] === 5, `no se fundieron 5 lingotes de cobre: ${smelted.inventory[12]}`);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  await play(page);

  // Estorba: andar contra el horno no mete el cuerpo en su casilla.
  await hold(page, 'KeyW', 900);
  const pushed = await state(page);
  const oven = both.stationTiles.find((t) => t.feature === 25);
  if (oven) {
    // El cuerpo mide 0,34 de radio: dentro de la casilla si esta a menos de
    // 0,5 + 0,34 del centro en los dos ejes.
    const gap = Math.max(Math.abs(pushed.x - (oven.x + 0.5)), Math.abs(pushed.y - (oven.y + 0.5)));
    console.log(`  andar contra el horno: a ${gap.toFixed(2)} de su centro`);
    // Como una pared de terreno, se para con el centro del cuerpo en su borde.
    check(gap >= 0.5, `el cuerpo se metio en el horno: a ${gap.toFixed(2)} de su centro`);
  }

  // La mesa, a la espalda: pico de cobre y mochila.
  await look(page, -1257, 0);
  await page.waitForTimeout(200);
  await useClick(page);
  await page.waitForTimeout(400);
  const bench = await state(page);
  const benchTabs = await tabs();
  console.log(`  usar la mesa: «${await page.textContent('#recipeTitle')}», ${benchTabs}`);
  check(bench.inventoryOpen && bench.panelStation === 1, 'USAR mirando la mesa no abrio su panel');
  check(benchTabs.join() === 'Herramientas,Ropa', `la mesa ensena otras recetas: ${benchTabs}`);
  await craft(2);
  await category('Ropa');
  await craft(2);
  const made = await state(page);
  check(made.inventory[15] === 1, 'no se fabrico el pico de cobre en la mesa');
  check(made.inventory[21] === 1, 'no se fabrico la mochila en la mesa');

  // La mochila, arrastrada a su hueco: 22 casillas.
  const bag = made.slots.findIndex((x) => x.item === 21);
  if (bag >= 0) {
    await drag(await center(`#invGrid .slot:nth-child(${bag + 1})`), await center('#charGrid [data-slot="1001"]'));
    const dressed = await state(page);
    const shown = await page.evaluate(() => Array.from(document.querySelectorAll('#invGrid .slot')).filter((el) => !el.hidden).length);
    console.log(`  mochila puesta: ${dressed.worn}, casillas ${dressed.openSlots}, a la vista ${shown}`);
    check(dressed.worn[1] === 21 && dressed.openSlots === 22, `la mochila no se equipo: ${JSON.stringify(dressed.worn)}, ${dressed.openSlots}`);
    check(shown === 22, `la rejilla no ensena las casillas de la mochila: ${shown}`);
    check(dressed.feed.every((t) => !t.includes('Mochila') || t.startsWith('+')), `equiparse la anoto como perdida: ${dressed.feed}`);
    await page.screenshot({ path: join(SHOTS, '3d-11-panel-mesa.png') });
  }

  // Alejarse mas de 3 casillas cierra el panel de la mesa. De lado: detras
  // esta el horno.
  // El rellano del nacimiento es pequeno y lo rodean escalones: se prueba a
  // cada lado, saltando, hasta pasar de 3 casillas.
  const near = await state(page);
  const bench0 = near.stationTiles.find((t) => t.feature === 24);
  let away = near;
  for (const key of ['KeyA', 'KeyD', 'KeyS']) {
    await page.keyboard.down(key);
    for (let i = 0; i < 6 && away.inventoryOpen; i++) {
      await page.keyboard.press('Space');
      await page.waitForTimeout(400);
      away = await state(page);
    }
    await page.keyboard.up(key);
    if (!away.inventoryOpen) break;
  }
  if (bench0) console.log(`  a ${Math.hypot(away.x - bench0.x - 0.5, away.y - bench0.y - 0.5).toFixed(1)} de la mesa`);
  console.log(`  alejarse ${Math.hypot(away.x - near.x, away.y - near.y).toFixed(1)} casillas: panel ${away.inventoryOpen ? 'abierto' : 'cerrado'}`);
  check(!away.inventoryOpen && away.panelStation === 0, 'alejarse de la mesa no cerro su panel');

  await page.close();
}

// ------------------------------------------------------------------------ movil

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

  const spawn = await open(page, baseUrl);
  // El movil no entra en el raton capturado: ni modo raton ni pausa.
  check(!spawn.mouseMode && !spawn.paused && !(await page.isVisible('#pause')), 'el movil arranco en pausa');
  check(await page.evaluate(() => document.body.classList.contains('touch-active')), 'el body no entro en modo tactil');
  // El boceto del autor: arriba OTROS, la barra e INVENTARIO; abajo USAR y el
  // ATAQUE, con CORRER y SALTAR encima. Ni COMER ni SEMBRAR.
  for (const id of ['#action', '#jump', '#run', '#use', '#others', '#invOpen', '#modeTouch']) {
    check(await page.isVisible(id), `el boton ${id} no se ve en el movil`);
  }
  check(!(await page.isVisible('#modeBar')), 'en el movil se ve el MODO de PC');
  check((await page.locator('#eat, #plant').count()) === 0, 'siguen los botones de comer o sembrar');
  check(!(await page.isVisible('#proj')) && !(await page.isVisible('#hudToggle')), 'el ojo o el HUD se ven sin abrir OTROS');
  check(!(await page.isVisible('#help')), 'la ayuda de teclado se ve en el movil');
  for (const id of ['#hungerRing', '#healthRing', '#hotbar']) {
    check(await page.isVisible(id), `${id} no se ve en el movil`);
  }
  // La barra de la mano, arriba en el movil: tocar una casilla la elige.
  const beforeTap = await state(page);
  await page.tap('#hotbar .slot:nth-child(2)');
  await page.waitForTimeout(300);
  const tapped = await state(page);
  check(tapped.itemsSent.select > beforeTap.itemsSent.select && tapped.selectedSlot === 1,
    `tocar la casilla 2 de la barra no la eligio (${tapped.selectedSlot})`);
  const bar = await page.evaluate(() => document.getElementById('hotbar').getBoundingClientRect().toJSON());
  check(bar.top < 100 && bar.left >= 0 && bar.right <= 390, `la barra del movil no cabe arriba: ${JSON.stringify(bar)}`);
  check(Math.abs((bar.left + bar.right) / 2 - 390 / 2) <= 1, `la barra del movil no esta centrada: ${JSON.stringify(bar)}`);
  // El racimo cabe en la pantalla, y los anillos de salud y hambre van abajo a
  // la izquierda.
  const rect = (id) => page.evaluate((i) => document.getElementById(i).getBoundingClientRect().toJSON(), id);
  const [atk, use, jump, run, hungerR, healthR, others, invOpen] = await Promise.all(
    ['action', 'use', 'jump', 'run', 'hungerRing', 'healthRing', 'others', 'invOpen'].map(rect),
  );
  check(atk.right <= 390 && atk.bottom <= 844 && atk.right > 390 - 30, `el ataque no esta en la esquina: ${JSON.stringify(atk)}`);
  check(use.right <= atk.left, 'USAR no esta a la izquierda del ataque');
  check(Math.abs(use.bottom - atk.bottom) < 1, `USAR no apoya en el borde de abajo del ataque: ${use.bottom} / ${atk.bottom}`);
  check(jump.bottom <= atk.top && run.bottom <= jump.top, 'correr y saltar no estan en columna encima del ataque');
  check(Math.abs(jump.right - atk.right) < 1 && Math.abs(run.right - atk.right) < 1,
    `correr y saltar no van al borde derecho del ataque: ${run.right} / ${jump.right} / ${atk.right}`);
  check(bar.left >= others.right + 8 && bar.right <= invOpen.left - 8, 'la barra de la mano pisa OTROS o INVENTARIO');
  // MODO: mas pequeno que USAR, en la diagonal de arriba a la izquierda del
  // ataque y sin pisar a nadie (decision del autor).
  const mode = await rect('modeTouch');
  const overlap = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
  check(mode.width < use.width, `MODO no es mas pequeno que USAR: ${mode.width} / ${use.width}`);
  check(mode.right <= atk.left + 4 && mode.bottom <= atk.top + 4, `MODO no esta arriba a la izquierda del ataque: ${JSON.stringify(mode)}`);
  check(![use, jump, run, atk].some((r) => overlap(mode, r)), 'MODO pisa otro boton');
  // Solo iconos: ningun boton lleva rotulo, y cada uno lleva su nombre para
  // el lector de pantalla.
  const labels = await page.evaluate(() =>
    ['action', 'use', 'jump', 'run', 'others', 'invOpen', 'modeTouch'].map((id) => {
      const b = document.getElementById(id);
      return { id, text: b.textContent.replace(/[\s\u00bb\u2191]/g, ''), label: b.getAttribute('aria-label'), svg: !!b.querySelector('svg') };
    }),
  );
  check(labels.every((l) => l.text === '' && l.label), `hay botones con rotulo: ${JSON.stringify(labels)}`);
  check(labels.filter((l) => l.svg).length === 5, 'USAR, ATAQUE, OTROS, INVENTARIO o MODO no llevan su icono');
  // La cruz tambien en el movil, y el registro colgando de INVENTARIO.
  check(await page.isVisible('#crosshair'), 'la cruz no se ve en el movil');
  const feedR = await rect('pickupFeed');
  check(feedR.top >= invOpen.bottom && feedR.top - invOpen.bottom < 16 && Math.abs(feedR.right - invOpen.right) < 1,
    `el registro no va justo debajo de INVENTARIO: ${JSON.stringify(feedR)}`);
  // Los anillos: uno al lado del otro en la esquina de abajo a la izquierda,
  // apoyados en el borde de abajo de ATAQUE y USAR, de tamano entre los dos, y
  // sin pisar USAR (decisiones del autor, 2026-09-30).
  console.log(`  anillos: ${hungerR.width}px en ${hungerR.left},${hungerR.bottom} y ${healthR.left},${healthR.bottom}; ATAQUE abajo en ${atk.bottom}`);
  check(hungerR.left < 20 && hungerR.right <= healthR.left, `los anillos no van juntos en la esquina de la izquierda: ${JSON.stringify([hungerR, healthR])}`);
  check([hungerR, healthR].every((r) => Math.abs(r.bottom - atk.bottom) <= 1), 'los anillos no apoyan en el borde de abajo de ATAQUE');
  check(hungerR.width > use.width && hungerR.width < atk.width, `los anillos no miden entre USAR y ATAQUE: ${hungerR.width}`);
  check(healthR.right <= use.left && !overlap(healthR, mode), 'los anillos pisan USAR o MODO');
  check((await page.locator('#vitals').count()) === 0, 'siguen las barras de salud y hambre');
  check(others.left < 40 && others.top < 40 && invOpen.right > 350 && invOpen.top < 40, 'OTROS o INVENTARIO no estan arriba en las esquinas');

  // OTROS despliega el ojo, el HUD y el entorno. La pista de los gestos vive
  // en el HUD.
  await page.tap('#others');
  await page.waitForTimeout(200);
  check(await page.isVisible('#proj') && await page.isVisible('#hudToggle') && await page.isVisible('#statsToggle'),
    'OTROS no desplego el ojo, el HUD y el entorno');
  // En columna, debajo de el, y en ese orden.
  const [eyeR, hudR, envR] = await Promise.all(['proj', 'hudToggle', 'statsToggle'].map(rect));
  const mid = (r) => (r.left + r.right) / 2;
  check(eyeR.top >= others.bottom && hudR.top >= eyeR.bottom && envR.top >= hudR.bottom,
    'OTROS no despliega en columna debajo de el');
  check([eyeR, hudR, envR].every((r) => Math.abs(mid(r) - mid(others)) < 2), 'la columna de OTROS no va alineada bajo el');
  await page.tap('#hudToggle');
  await page.waitForTimeout(200);
  check(await page.isVisible('#hud'), 'tocar el boton no abrio el HUD en el movil');
  check(await page.isVisible('.touch-only'), 'la pista de los gestos no se ve en el movil');
  await page.tap('#hudToggle');
  // El inventario: se abre sin pausar, y sus pestanas cambian de pagina.
  await page.tap('#invOpen');
  await page.waitForTimeout(200);
  check(await page.isVisible('#invPanel'), 'tocar el boton no abrio el inventario en el movil');
  check(!(await state(page)).paused, 'abrir el inventario en el movil pauso');
  await page.screenshot({ path: join(SHOTS, '3d-04-movil.png') });
  check((await page.locator('.pageNav').count()) === 0, 'siguen las flechas del inventario');
  const tabsOf = () => page.evaluate(() =>
    Array.from(document.querySelectorAll('#invTabs button')).map((b) => {
      const r = b.getBoundingClientRect();
      return { name: b.textContent, on: b.classList.contains('on'), left: r.left, right: r.right };
    }),
  );
  const panelR = await rect('invPanel');
  const tabs0 = await tabsOf();
  check(tabs0.map((t) => t.name).join('|') === 'Personaje|Inventario|Recetas', `las pestanas no son las tres: ${JSON.stringify(tabs0)}`);
  const widths = tabs0.map((t) => t.right - t.left);
  check(Math.abs(tabs0[0].left - panelR.left) < 2 && Math.abs(tabs0[2].right - panelR.right) < 2 && Math.max(...widths) - Math.min(...widths) < 1,
    `las pestanas no reparten el ancho del panel en tres: ${JSON.stringify({ panelR, tabs0 })}`);
  const pages = [(await state(page)).inventoryPage];
  for (const n of [3, 1, 2]) {
    await page.tap(`#invTabs button:nth-child(${n})`);
    const now = await tabsOf();
    const lit = now.filter((t) => t.on).map((t) => t.name);
    check(lit.length === 1 && lit[0] === now[n - 1].name && now.map((t) => t.name).join() === tabs0.map((t) => t.name).join(),
      `la pestana ${n} no se ilumino sola o se movieron: ${JSON.stringify(now)}`);
    pages.push((await state(page)).inventoryPage);
  }
  console.log(`  paginas del inventario: ${pages.join(' -> ')}`);
  // La distribucion de cada pagina (pedido del autor, 2026-09-29): el contenido
  // pegado a las pestanas, la zona de lo seleccionado fija y centrada abajo, a
  // la misma altura en PERSONAJE e INVENTARIO, y nada que deslizar salvo la
  // rejilla o la lista de recetas.
  const layout = async (n) => {
    await page.tap(`#invTabs button:nth-child(${n})`);
    await page.waitForTimeout(100);
    return page.evaluate(() => {
      const r = (el) => (el ? el.getBoundingClientRect().toJSON() : null);
      const panel = document.getElementById('invPanel');
      const cur = panel.querySelector('.invPage.current');
      return {
        panel: r(panel), tabs: r(document.getElementById('invTabs')),
        first: r(cur.querySelector('#charGrid, #invGrid, #recipeTabs')),
        list: r(cur.querySelector('#charGrid, #invGrid, #recipeList')),
        sel: r(cur.querySelector('.selected')),
        overflow: getComputedStyle(panel).overflowY,
        scrolls: panel.scrollHeight > panel.clientHeight + 1,
      };
    });
  };
  const [lp, li, lr] = [await layout(1), await layout(2), await layout(3)];
  await page.tap('#invTabs button:nth-child(2)');
  const midX = (b) => (b.left + b.right) / 2;
  for (const [name, l] of [['personaje', lp], ['inventario', li], ['recetas', lr]]) {
    check(l.overflow === 'hidden' && !l.scrolls, `la pagina ${name} desliza el panel entero`);
    check(l.first.top - l.tabs.bottom < 16, `la pagina ${name} no arranca pegada a las pestanas: ${l.first.top - l.tabs.bottom}`);
    check(Math.abs(midX(l.list) - midX(l.panel)) < 2, `lo de la pagina ${name} no esta centrado`);
  }
  for (const [name, l] of [['personaje', lp], ['inventario', li]]) {
    check(Math.abs(l.panel.bottom - l.sel.bottom) < 16 && Math.abs(midX(l.sel) - midX(l.panel)) < 2,
      `la zona de lo seleccionado de ${name} no va centrada al pie del panel`);
  }
  check(Math.abs(lp.sel.top - li.sel.top) < 1 && Math.abs(lp.sel.left - li.sel.left) < 1,
    'la zona de descripcion de PERSONAJE no encaja con la de INVENTARIO');
  check(pages.join() === 'inventario,recetas,personaje,inventario', `las pestanas no recorren las paginas: ${pages}`);
  await page.tap('#invOpen');
  check(!(await page.isVisible('#invPanel')), 'tocar otra vez no cerro el inventario');

  // Un dedo a la derecha gira la camara: ni joystick ni movimiento.
  const beforeLook = await state(page);
  await pointers(page, [{ type: 'pointerdown', id: 1, x: 300, y: 400 }]);
  for (let i = 1; i <= 10; i++) await pointers(page, [{ type: 'pointermove', id: 1, x: 300 - i * 8, y: 400 }]);
  check(!(await page.isVisible('#stick.on')), 'el joystick aparecio con un dedo de camara');
  await pointers(page, [{ type: 'pointerup', id: 1, x: 220, y: 400 }]);
  const afterLook = await waitForLoop(page, 20);
  check(Math.abs(afterLook.yaw - beforeLook.yaw) > 0.05, 'un dedo sobre el mundo no giro la camara');
  check(Math.hypot(afterLook.x - beforeLook.x, afterLook.y - beforeLook.y) < 1e-6, 'girar la camara movio al jugador');
  check(afterLook.sent.harvest === beforeLook.sent.harvest, 'en tactil, tocar el mundo acciono');

  // La pinza: separar acerca, juntar aleja.
  const pinch = async (from, to) => {
    await pointers(page, [
      { type: 'pointerdown', id: 3, x: 195 - from, y: 300 },
      { type: 'pointerdown', id: 4, x: 195 + from, y: 300 },
    ]);
    for (let i = 1; i <= 10; i++) {
      const d = from + ((to - from) * i) / 10;
      await pointers(page, [
        { type: 'pointermove', id: 3, x: 195 - d, y: 300 },
        { type: 'pointermove', id: 4, x: 195 + d, y: 300 },
      ]);
    }
    await pointers(page, [
      { type: 'pointerup', id: 3, x: 195 - to, y: 300 },
      { type: 'pointerup', id: 4, x: 195 + to, y: 300 },
    ]);
    await page.waitForTimeout(200);
    return (await state(page)).distance;
  };
  const d0 = (await state(page)).distance;
  const d1 = await pinch(30, 110);
  const d2 = await pinch(110, 30);
  console.log(`  pinza: ${d0.toFixed(1)} -> ${d1.toFixed(1)} -> ${d2.toFixed(1)}`);
  check(d1 < d0, 'separar dos dedos no acerco la camara');
  check(d2 > d1, 'juntar dos dedos no alejo la camara');

  // En primera persona la pinza es un catalejo: estrecha mientras dura y, al
  // soltar, vuelve (decision del autor). Se mide el campo de vision durante y
  // despues, con los dedos todavia apoyados en el primer caso.
  await page.tap('#others');
  await page.tap('#proj');
  await page.tap('#proj');
  await page.waitForTimeout(300);
  check((await state(page)).projection === 'primera', 'tocar el ojo dos veces no llevo a la primera persona');
  const fov0 = (await state(page)).fov;
  await pointers(page, [
    { type: 'pointerdown', id: 5, x: 165, y: 300 },
    { type: 'pointerdown', id: 6, x: 225, y: 300 },
  ]);
  for (let i = 1; i <= 10; i++) {
    await pointers(page, [
      { type: 'pointermove', id: 5, x: 165 - i * 8, y: 300 },
      { type: 'pointermove', id: 6, x: 225 + i * 8, y: 300 },
    ]);
  }
  await page.waitForTimeout(400);
  const fovHeld = (await state(page)).fov;
  await pointers(page, [
    { type: 'pointerup', id: 5, x: 85, y: 300 },
    { type: 'pointerup', id: 6, x: 305, y: 300 },
  ]);
  await page.waitForTimeout(1200);
  const fovAfter = (await state(page)).fov;
  console.log(`  catalejo: ${fov0} -> ${fovHeld.toFixed(1)} (apoyado) -> ${fovAfter.toFixed(1)} (soltado)`);
  check(fovHeld < fov0, 'en primera persona la pinza no estrecho el campo de vision');
  check(fovAfter === fov0, `al soltar la pinza el catalejo no volvio (${fovAfter})`);
  // La pinza toco fuera de OTROS y lo cerro: se vuelve a abrir.
  if (!(await page.isVisible('#proj'))) await page.tap('#others');
  await page.tap('#proj');

  // La zona del joystick (decision del autor, 2026-09-30): desde el borde
  // izquierdo hasta el derecho del anillo de salud, y desde abajo hasta la
  // mitad de CORRER. Se mide de la pagina, y fuera de ella —aunque sea el
  // cuadrante de antes— un dedo gira la camara y no saca el joystick.
  const zone = await page.evaluate(() => {
    const ring = document.getElementById('healthRing').getBoundingClientRect();
    const run = document.getElementById('run').getBoundingClientRect();
    return { right: ring.right, top: run.top + run.height / 2, w: innerWidth, h: innerHeight };
  });
  console.log(`  zona del joystick: x < ${zone.right.toFixed(0)}, y > ${zone.top.toFixed(0)}`);
  const outside = [
    { x: zone.right + 6, y: zone.h - 40 },
    { x: 40, y: zone.top - 6 },
  ];
  check(outside.every((p) => p.x < zone.w / 2 && p.y > zone.h / 2),
    `los puntos de fuera no caen en el cuadrante de antes: ${JSON.stringify(outside)}`);
  for (const p of outside) {
    await pointers(page, [{ type: 'pointerdown', id: 1, ...p }]);
    await pointers(page, [{ type: 'pointermove', id: 1, x: p.x + 26, y: p.y - 26 }]);
    await page.waitForTimeout(200);
    const shown = await page.isVisible('#stick.on');
    await pointers(page, [{ type: 'pointerup', id: 1, x: p.x + 26, y: p.y - 26 }]);
    check(!shown, `el joystick salio fuera de su zona, en ${p.x.toFixed(0)},${p.y.toFixed(0)}`);
  }

  // El joystick, dentro de su zona: aparece, mueve y desaparece.
  const stick = { x: Math.round(zone.right / 2), y: Math.round((zone.top + zone.h) / 2) };
  const beforeStick = await state(page);
  await pointers(page, [{ type: 'pointerdown', id: 1, ...stick }]);
  await pointers(page, [{ type: 'pointermove', id: 1, x: stick.x + 26, y: stick.y - 26 }]);
  await page.waitForTimeout(800);
  check(await page.isVisible('#stick.on'), 'el joystick no aparecio al apoyar el pulgar');
  await pointers(page, [{ type: 'pointerup', id: 1, x: stick.x + 26, y: stick.y - 26 }]);
  const afterStick = await waitForLoop(page, 20);
  check(!(await page.isVisible('#stick.on')), 'el joystick sigue visible tras levantar el dedo');
  const stickDistance = Math.hypot(afterStick.x - beforeStick.x, afterStick.y - beforeStick.y);
  console.log(`  joystick: ${stickDistance.toFixed(2)} casillas`);
  check(stickDistance > 0.2, `el joystick no movio al jugador (${stickDistance})`);

  // La zona muerta: el pulgar apoyado sin querer no hace derivar.
  const still = await state(page);
  await pointers(page, [{ type: 'pointerdown', id: 1, ...stick }]);
  await pointers(page, [{ type: 'pointermove', id: 1, x: stick.x + 5, y: stick.y }]);
  await page.waitForTimeout(500);
  await pointers(page, [{ type: 'pointerup', id: 1, x: stick.x + 5, y: stick.y }]);
  const drifted = await waitForLoop(page, 10);
  check(Math.hypot(drifted.x - still.x, drifted.y - still.y) < 1e-6, 'la zona muerta no aguanta');

  // Correr: interruptor con luz.
  await tap(page, '#run');
  await page.waitForTimeout(150);
  const on = await state(page);
  const lit = await page.isVisible('#run.on');
  await tap(page, '#run');
  await page.waitForTimeout(150);
  const off = await state(page);
  console.log(`  correr: ${spawn.running} -> ${on.running} -> ${off.running} (luz: ${lit})`);
  check(spawn.running === false, 'se empieza corriendo');
  check(on.running === true && lit, 'el boton de correr no la encendio o no lo muestra');
  check(off.running === false, 'el boton de correr no la apago al segundo toque');

  // Saltar y usar: el toque llega a la Intent.
  const b = await state(page);
  await tap(page, '#jump');
  await page.waitForTimeout(250);
  await tap(page, '#use');
  await page.waitForTimeout(250);
  const a = await state(page);
  console.log(`  intents: ${JSON.stringify(b.sent)} -> ${JSON.stringify(a.sent)}`);
  check(a.sent.jump > b.sent.jump, 'el boton de saltar no llego a la Intent');
  check(a.sent.use > b.sent.use, 'el boton de usar no llego a la Intent');

  // La accion: mantener repite, cuatro por segundo. Desde el nacimiento, que es
  // un rellano llano (regla 22): ahi todo el cono esta al alcance, sin depender
  // de donde dejo el joystick al jugador.
  const h0 = await open(page, baseUrl);
  await tapButton(page, '#action', 'touchstart');
  await page.waitForTimeout(1600);
  // Y sin soltar, ese mismo dedo se arrastra: gira la camara y la accion sigue
  // repitiendo (pedido del autor).
  const holding = await state(page);
  for (let i = 1; i <= 16; i++) await tapButton(page, '#action', 'touchmove', -i * 10, -i * 2);
  await page.waitForTimeout(800);
  const draggedHold = await state(page);
  await tapButton(page, '#action', 'touchend', -160, -32);
  const h1 = await waitForLoop(page, 10);
  const repeats = h1.sent.harvest - h0.sent.harvest;
  const whileTurning = draggedHold.sent.harvest - holding.sent.harvest;
  const turnedBy = draggedHold.yaw - holding.yaw;
  console.log(`  accion mantenida: ${repeats} acciones; arrastrando el dedo, giro ${turnedBy.toFixed(2)} rad y ${whileTurning} acciones`);
  check(repeats >= 2, `mantener la accion no repitio (${repeats})`);
  check(h1.slashesDrawn > h0.slashesDrawn, 'la accion del movil no dibujo barrido');
  check(Math.abs(turnedBy) > 0.1, 'arrastrar el dedo de la accion no giro la camara');
  check(whileTurning > 0, 'la accion dejo de repetir mientras se arrastraba el dedo');
  check(draggedHold.distance === holding.distance, 'arrastrar el dedo de la accion cambio el zoom');

  // El panel del entorno, al tacto, desde OTROS.
  if (!(await page.isVisible('#statsToggle'))) await page.tap('#others');
  await page.tap('#statsToggle');
  check(await page.isVisible('#statsPanel'), 'el panel no se abrio al tocarlo en movil');
  await page.screenshot({ path: join(SHOTS, '3d-05-movil-panel.png') });
  await page.tap('#statsToggle');

  // Soltado todo, el jugador se queda quieto.
  const rest0 = await waitForLoop(page, 10);
  await page.waitForTimeout(500);
  const rest1 = await waitForLoop(page, 10);
  check(Math.hypot(rest1.x - rest0.x, rest1.y - rest0.y) < 1e-6, 'el jugador sigue moviendose sin mando');

  await context.close();
}

// -------------------------------------------------------- panel de desarrollo

async function devToolsPass(browser, baseUrl) {
  console.log('\n== herramientas de desarrollo (?dev=1) ==');
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  watchProblems(page, 'desarrollo');

  const start = await open(page, baseUrl, '&dev=1');
  check(start.dev === true, 'el panel no se activo con ?dev=1');
  check(await page.isVisible('#devPanel'), 'el panel de desarrollo no es visible');

  // Bordes de chunk y de bioma.
  await page.click('[data-toggle="chunks"]');
  await page.click('[data-toggle="biomes"]');
  const withBorders = await waitForLoop(page, 20);
  console.log(`  bordes: ${withBorders.gridChunks} chunks con rejilla, ${withBorders.borderSegments} segmentos de bioma`);
  check(withBorders.gridChunks > 0, 'la rejilla de chunks no dibujo nada');
  check(withBorders.borderSegments > 0, 'el contorno de biomas no dibujo ni un segmento');
  check(withBorders.misplacedBorders === 0, `${withBorders.misplacedBorders} contornos fuera de su chunk`);
  await page.screenshot({ path: join(SHOTS, '3d-06-bordes.png') });

  // Y sobreviven a cambiar de chunk, saltando por el camino.
  const chunkOf = (s) => [Math.floor(s.x) >> 5, Math.floor(s.y) >> 5].join(',');
  let walked = withBorders;
  for (const key of ['KeyW', 'KeyD', 'KeyS', 'KeyA']) {
    for (let burst = 0; burst < 3 && chunkOf(walked) === chunkOf(withBorders); burst++) {
      await page.keyboard.down(key);
      for (let i = 0; i < 4; i++) {
        await page.waitForTimeout(650);
        await page.keyboard.press('Space');
      }
      await page.keyboard.up(key);
      walked = await waitForLoop(page, 20);
    }
    if (chunkOf(walked) !== chunkOf(withBorders)) break;
  }
  console.log(`  chunk ${chunkOf(withBorders)} -> ${chunkOf(walked)}, segmentos ${walked.borderSegments}`);
  check(chunkOf(walked) !== chunkOf(withBorders), 'el jugador no llego a cambiar de chunk');
  check(walked.borderSegments > 0 && walked.gridChunks > 0, 'los bordes desaparecieron al cambiar de chunk');
  check(walked.misplacedBorders === 0, 'contornos fuera de su chunk tras caminar');

  // Apagarlos los retira.
  await page.click('[data-toggle="chunks"]');
  await page.click('[data-toggle="biomes"]');
  const off = await waitForLoop(page, 10);
  check(off.gridChunks === 0 && off.borderSegments === 0, 'apagar los bordes no los retiro');

  // Pausa: el reloj se para de verdad.
  await page.click('[data-toggle="pause"]');
  await page.waitForTimeout(200);
  const paused = await state(page);
  check(paused.timeScale === 0, `pausar no dejo la escala a cero (${paused.timeScale})`);
  await page.waitForTimeout(700);
  const stillPaused = await state(page);
  check(stillPaused.tick === paused.tick, `el tiempo avanzo en pausa (${paused.tick} -> ${stillPaused.tick})`);

  // +1 h exacta, y el registro la anota tal cual.
  await page.click('[data-jump="1200"]');
  await page.waitForTimeout(200);
  const afterJump = await state(page);
  console.log(`  +1 h: ${stillPaused.clock} -> ${afterJump.clock}`);
  check(afterJump.tick - stillPaused.tick === HOUR_TICKS, `el salto no adelanto una hora exacta (${afterJump.tick - stillPaused.tick})`);
  const jumpLine = await page.evaluate(() => document.getElementById('devLog').textContent);
  check(jumpLine.includes('+1 h'), `el registro no anoto el salto (${JSON.stringify(jumpLine)})`);

  // Congelada por defecto: un dia entero no gasta hambre.
  check(afterJump.survivalFrozen === true, 'el panel no arranco con la supervivencia congelada');
  await page.click('[data-jump="28800"]');
  await page.waitForTimeout(300);
  const afterDay = await state(page);
  check(afterDay.hunger === afterJump.hunger, `saltar un dia gasto hambre estando congelada (${afterJump.hunger} -> ${afterDay.hunger})`);

  // Velocidad: a 16x el reloj corre mucho mas que a 1x.
  await page.click('[data-speed="16"]');
  const fast0 = await state(page);
  await page.waitForTimeout(1000);
  const fast1 = await state(page);
  await page.click('[data-speed="1"]');
  const slow0 = await state(page);
  await page.waitForTimeout(1000);
  const slow1 = await state(page);
  console.log(`  ticks por segundo: 16x ${fast1.tick - fast0.tick}, 1x ${slow1.tick - slow0.tick}`);
  check(fast1.tick - fast0.tick > 3 * (slow1.tick - slow0.tick), 'a 16x el reloj no corrio mas');

  // Descongelada, el hambre vuelve a bajar.
  await page.click('[data-toggle="survival"]');
  await page.waitForTimeout(800);
  const thawed = await state(page);
  check(thawed.survivalFrozen === false, 'el conmutador no se apago');
  check(thawed.hunger < afterDay.hunger, 'apagar la congelacion no devolvio el hambre');
  await page.click('[data-toggle="survival"]');

  // Registro: recolectar deja constancia.
  await harvestUntil(page, (s) => sum(s.inventory) > 0);
  await page.waitForTimeout(300);
  const log = await page.evaluate(() => document.getElementById('devLog').textContent);
  console.log(`  registro: ${JSON.stringify(log.split('\n')[0] ?? '')}`);
  check(log.split('\n').length > 1, 'recolectar no dejo ninguna linea en el registro');

  // F3 cierra y devuelve todo a su sitio.
  await page.keyboard.press('F3');
  await page.waitForTimeout(150);
  const closed = await state(page);
  check(closed.dev === false, 'F3 no cerro el panel');
  check(closed.timeScale === 1, `al cerrar el tiempo no volvio a 1x (${closed.timeScale})`);
  check(closed.survivalFrozen === false, 'al cerrar el personaje siguio siendo inmortal');
  check(!(await page.isVisible('#devPanel')), 'el panel sigue visible tras cerrarlo');

  await page.close();
}

// ------------------------------------------------------------- muerte y noche

async function lifePass(browser, baseUrl) {
  console.log('\n== muerte, reinicio y noche ==');
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  watchProblems(page, 'vida');

  /** Mata al personaje saltando dias con la supervivencia descongelada. */
  async function die() {
    await page.evaluate(() => delete window.__smokeBaseTick);
    if (!(await state(page)).dev) await page.keyboard.press('F3');
    await page.click('[data-toggle="survival"]');
    let now = await state(page);
    for (let i = 0; i < 6 && now.alive; i++) {
      await page.click('[data-jump="28800"]');
      await page.waitForTimeout(300);
      now = await state(page);
    }
    await page.keyboard.press('F3');
    await page.waitForTimeout(300);
    return state(page);
  }

  await open(page, baseUrl, '&dev=1');
  const dead = await die();
  console.log(`  tras saltar dias sin comer: salud ${dead.health}, hambre ${dead.hunger}`);
  check(!dead.alive, 'saltar dias sin comer no mato al personaje');
  check(dead.deadShown && (await page.isVisible('#dead')), 'al morir no aparecio el aviso');
  await page.screenshot({ path: join(SHOTS, '3d-07-muerte.png') });

  // R empieza un mundo nuevo, con semilla nueva y reflejada en la URL.
  await page.keyboard.press('KeyR');
  const reborn = await waitForLoop(page, 30);
  const urlSeed = new URL(page.url()).searchParams.get('seed');
  console.log(`  R: semilla ${dead.seed} -> ${reborn.seed} (URL ${urlSeed}), salud ${reborn.health}`);
  check(reborn.alive && reborn.health === 100, 'R no devolvio la vida');
  check(reborn.seed !== dead.seed, 'R no cambio de mundo');
  check(urlSeed === String(reborn.seed), 'la URL no lleva la semilla nueva');
  check(!(await page.isVisible('#dead')), 'el aviso de muerte sigue tras reiniciar');
  check(reborn.triangles > 1000 && reborn.chunks > 0, 'el mundo nuevo no se mallo');

  // Y el boton del aviso hace lo mismo.
  const deadAgain = await die();
  check(!deadAgain.alive, 'no se pudo volver a morir');
  await page.click('#restart');
  const reborn2 = await waitForLoop(page, 30);
  check(reborn2.alive && reborn2.seed !== deadAgain.seed, 'el boton de reiniciar no empezo un mundo nuevo');

  // La noche: la vela azul a medianoche y nada a mediodia.
  const night = await open(page, baseUrl, '&t=0');
  const tint = await page.evaluate(() => getComputedStyle(document.getElementById('sky')).backgroundColor);
  console.log(`  medianoche: ${night.clock}, vela ${night.night.toFixed(2)} (${tint})`);
  check(night.clock.startsWith('00:'), `no arranco a medianoche (${night.clock})`);
  check(night.night > 0.4, `la noche no oscurece (${night.night})`);
  check(tint !== 'rgba(0, 0, 0, 0)' && tint !== 'transparent', `la vela de la noche no se pinta (${tint})`);
  await page.screenshot({ path: join(SHOTS, '3d-08-noche.png') });
  const noon = await open(page, baseUrl, `&t=${DAY_TICKS / 2}`);
  check(noon.night === 0, `a mediodia sigue habiendo vela (${noon.night})`);

  await page.close();
}

// ---------------------------------------------------------------------- relieve

async function reliefPass(browser, baseUrl) {
  console.log('\n== relieve (paredes, salto, carrera y cima) ==');
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  watchProblems(page, 'relieve');

  await open(page, baseUrl);
  const { cliffSpot: spot, peakSpot: peak } = await spots(page);
  check(spot !== null, 'no se encontro ninguna pared de dos bloques');
  if (spot) {
    console.log(`  pared de ${spot.drop} bloques en ${spot.stand.x},${spot.stand.y}`);
    const at = `&x=${spot.stand.x}&y=${spot.stand.y}`;
    const arrived = await open(page, baseUrl, at);
    const relief = (await spots(page)).relief;
    console.log(`  al pie: nivel ${arrived.level}, ${relief.levels} alturas, ${relief.tallWalls} al pie de un muro`);
    check(relief.tallWalls > 0, 'no hay paredes de dos bloques donde deberia haberlas');
    check(relief.ramps > 0, 'no hay ni un talud por el que subir');
    await page.screenshot({ path: join(SHOTS, '3d-09-relieve.png') });

    const moved = await bestWalk(page, arrived);
    console.log(`  camino ${moved.toFixed(2)} casillas junto a la pared`);
    check(moved > 1, 'el jugador no pudo andar en ninguna direccion junto a la pared');
    check(moved < 30, `no camino, se teletransporto: ${moved.toFixed(1)}`);

    // Andando no se sube un muro: lo mas que se gana sin saltar es un nivel.
    let peor = null;
    for (const key of ['KeyW', 'KeyA', 'KeyS', 'KeyD']) {
      const antes = await open(page, baseUrl, at);
      await hold(page, key, 900);
      const despues = await waitForLoop(page, 30);
      const subida = despues.level - antes.level;
      if (!peor || subida > peor.subida) peor = { key, subida };
    }
    console.log(`  contra la pared: lo mas que se sube andando es ${peor.subida} nivel(es)`);
    check(peor.subida <= 1, `andar salvo un muro sin saltar: subio ${peor.subida} niveles`);

    // Al pie de la pared, mirando casi de frente en ocho rumbos: la reticula
    // enmarca la cara de la pared en alguno (pedido del autor, 2026-09-30).
    await open(page, baseUrl, at);
    await look(page, 0, -200);
    const marks = [];
    for (let i = 0; i < 8; i++) {
      await page.waitForTimeout(150);
      marks.push((await state(page)).reticle);
      await look(page, 314, 0);
    }
    console.log(`  reticula al girar al pie de la pared: ${marks.join(', ')}`);
    check(marks.includes('pared'), 'mirando a la pared la reticula no enmarca su cara');

    // El salto: despega, levanta mas de un bloque y vuelve al suelo.
    const antesDelSalto = await open(page, baseUrl, at);
    await page.keyboard.press('Space');
    await page.waitForTimeout(1500);
    const trasCaer = await state(page);
    console.log(`  salto: ${trasCaer.jumps - antesDelSalto.jumps} despegue(s), hasta ${trasCaer.airPeak.toFixed(2)} niveles`);
    check(trasCaer.jumps > antesDelSalto.jumps, 'Espacio no despego al personaje');
    check(trasCaer.airPeak > 1, `el salto no levanto ni un bloque: ${trasCaer.airPeak}`);
    check(trasCaer.grounded, 'el personaje se quedo flotando tras saltar');

    // Correr: la VELOCIDAD que da el nucleo, no la distancia, que la contesta
    // el paisaje.
    await open(page, baseUrl, at);
    const pushSpeed = async () => {
      await page.keyboard.down('KeyD');
      let best = 0;
      for (let i = 0; i < 6; i++) {
        await page.waitForTimeout(120);
        best = Math.max(best, (await state(page)).speed);
      }
      await page.keyboard.up('KeyD');
      return best;
    };
    const vAndando = await pushSpeed();
    await page.keyboard.press('ShiftLeft');
    await page.waitForTimeout(150);
    const trasShift = (await state(page)).running;
    const vCorriendo = await pushSpeed();
    await page.keyboard.press('ShiftLeft');
    await page.waitForTimeout(150);
    const trasSegundo = (await state(page)).running;
    console.log(`  correr: ${vAndando.toFixed(2)} -> ${vCorriendo.toFixed(2)} casillas/s`);
    check(trasShift === true && trasSegundo === false, 'Shift no se comporta como interruptor');
    check(vAndando > 0, 'andando la velocidad salio cero');
    check(vCorriendo > vAndando * 1.15, `correr no acelero: ${vAndando} vs ${vCorriendo}`);
  }

  // La cima.
  check(peak !== null, 'no se encontro ninguna cima');
  if (peak) {
    const onTop = await open(page, baseUrl, `&x=${peak.stand.x}&y=${peak.stand.y}`);
    console.log(`  cima: nivel ${onTop.level}, ${onTop.terrain}`);
    check(onTop.level > 15, `la cima no era tan alta: nivel ${onTop.level}`);
    for (let i = 0; i < 4; i++) await page.keyboard.press('Minus');
    await page.waitForTimeout(500);
    await page.screenshot({ path: join(SHOTS, '3d-10-cima.png') });
  }

  await page.close();
}

// ------------------------------------------------------------------------- main

async function serve() {
  const html = await readFile(PAGE);
  const server = createServer((req, res) => {
    if ((req.url ?? '/').split('?')[0] !== '/') {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(html);
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  return server;
}

const remote = process.env.VERDANT_URL?.replace(/\/$/, '');
const server = remote ? null : await serve();
const baseUrl = remote ?? `http://127.0.0.1:${server.address().port}`;
console.log(`probando ${baseUrl}`);

const proxyUrl = remote ? (process.env.HTTPS_PROXY ?? process.env.https_proxy) : undefined;
const browser = await chromium.launch(proxyUrl ? { proxy: { server: proxyUrl } } : {});

/**
 * Pantalla de 144 Hz: ninguna pulsacion se pierde.
 *
 * La simulacion va a 60 Hz y la pantalla a lo que de. A mas de 60 Hz muchos
 * frames no llevan tick, y el bucle recogia los pestillos en todos: los de un
 * frame sin tick se tiraban en silencio (el autor: «a veces ataco o salto y no
 * lo hace»). El headless va a unos 13 FPS, donde todo frame lleva tick y el
 * fallo no existe, asi que aqui el reloj de `requestAnimationFrame` se finge a
 * 144 Hz: cada frame avanza 1/144 s, vaya el navegador como vaya. Antes del
 * arreglo se perdia mas de la mitad.
 */
async function highRefreshPass(browser, baseUrl) {
  console.log('\n== pantalla de 144 Hz (pulsaciones que no se pierden) ==');
  const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
  watchProblems(page, 'refresco alto');
  await page.addInitScript(() => {
    const real = window.requestAnimationFrame.bind(window);
    let t = null;
    window.requestAnimationFrame = (cb) =>
      real((now) => {
        t = t === null ? now : t + 1000 / 144;
        cb(t);
      });
  });
  // Arriba al centro: en una ventana pequena la ayuda de teclado tapa el medio.
  const clickAt = { x: 320, y: 110 };
  await page.goto(`${baseUrl}/?seed=${SEED}`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__verdant, null, { timeout: 30000 });
  await page.mouse.click(clickAt.x, clickAt.y);
  await page.waitForFunction(() => window.__verdant && !window.__verdant.paused, null, { timeout: 5000 });
  const afterTick = (t0, n) =>
    page.waitForFunction(([base, k]) => window.__verdant.tick >= base + k, [t0, n], { timeout: 60000 });

  // Golpes: uno por tick, cada uno esperando a que pase un tick para que dos
  // no caigan en el mismo pestillo.
  const STRIKES = 30;
  const s0 = await state(page);
  for (let i = 0; i < STRIKES; i++) {
    const t = (await state(page)).tick;
    await strike(page);
    await afterTick(t, 1);
  }
  const s1 = await state(page);
  const struck = s1.sent.harvest - s0.sent.harvest;

  // Saltos en el sitio, en el rellano del nacimiento (regla 22), esperando a
  // aterrizar entre uno y otro: el vuelo dura 0,4 s y se esperan 0,7.
  const JUMPS = 5;
  for (let i = 0; i < JUMPS; i++) {
    const t = (await state(page)).tick;
    await page.keyboard.press('Space');
    await afterTick(t, 42);
  }
  const s2 = await state(page);
  const jumped = s2.jumps - s1.jumps;
  console.log(`  golpes ${struck}/${STRIKES}, saltos ${jumped}/${JUMPS}`);
  check(struck === STRIKES, `a 144 Hz se perdieron ${STRIKES - struck} de ${STRIKES} golpes`);
  check(jumped === JUMPS, `a 144 Hz se perdieron ${JUMPS - jumped} de ${JUMPS} saltos`);
  await page.close();
}

const only = process.argv[2];
const passes = { desktopPass, resourcesPass, stationsPass, mobilePass, devToolsPass, lifePass, reliefPass, highRefreshPass };
try {
  // Pedir una pasada que no existe no puede salir en verde: con la CI
  // repartida en una casilla por pasada, una errata en el nombre seria una
  // casilla verde que no prueba nada.
  if (only && !Object.keys(passes).some((name) => name.startsWith(only))) {
    failures.push(`no hay ninguna pasada que empiece por «${only}»; las hay: ${Object.keys(passes).join(', ')}`);
  }
  for (const [name, pass] of Object.entries(passes)) {
    if (only && !name.startsWith(only)) continue;
    await pass(browser, baseUrl);
  }
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
