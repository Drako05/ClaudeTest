/**
 * Prueba de humo del cliente 3D en un navegador real.
 *
 * Los tests unitarios cubren la simulacion, pero no pueden decir si el juego
 * ARRANCA: si WebGL inicializa, si el bundle carga, si el bucle avanza, si los
 * controles llegan a producir Intents. Esto abre el build en Chromium headless,
 * lo juega leyendo el estado real por `window.__verdant` y guarda capturas.
 *
 * Es la heredera del humo del isometrico y se lleva todas sus comprobaciones que
 * son del JUEGO —andar, hambre, recolectar, semillas, area de cuatro casillas,
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
  return waitForLoop(page);
}

async function hold(page, key, ms) {
  await page.keyboard.down(key);
  await page.waitForTimeout(ms);
  await page.keyboard.up(key);
}

/** Gira la camara arrastrando con el raton, que es como se gira en PC. */
async function orbit(page, dx) {
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
      await page.mouse.click(CLICK.x, CLICK.y);
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

/** Un toque sobre un boton, con TouchEvent como un dedo de verdad. */
async function tapButton(page, selector, type) {
  await page.evaluate(
    ({ selector, type }) => {
      const el = document.querySelector(selector);
      const rect = el.getBoundingClientRect();
      const t = new Touch({
        identifier: 9,
        target: el,
        clientX: rect.x + rect.width / 2,
        clientY: rect.y + rect.height / 2,
      });
      const live = type === 'touchstart' ? [t] : [];
      el.dispatchEvent(
        new TouchEvent(type, { touches: live, targetTouches: live, changedTouches: [t], bubbles: true, cancelable: true }),
      );
    },
    { selector, type },
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

  const spawn = await open(page, baseUrl);
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
  check(!(await page.isVisible('#thumbPad')), 'los botones del pulgar se ven en PC');
  check(await page.isVisible('#proj'), 'el ojo de la proyeccion no se ve');
  check(await page.isVisible('#help'), 'la ayuda de teclado no se ve en PC');

  // La franja de salud y hambre se ve siempre; HUD e inventario arrancan
  // cerrados (decision del autor) y se abren con su boton.
  check(await page.isVisible('#vitals'), 'la franja de salud y hambre no se ve');
  check(await page.isVisible('#invToggle') && await page.isVisible('#hudToggle'), 'faltan los botones del inventario o del HUD');
  check(!spawn.hudOpen && !(await page.isVisible('#hud')), 'el HUD no arranca cerrado');
  check(!spawn.inventoryOpen && !(await page.isVisible('#invPanel')), 'el inventario no arranca cerrado');
  const vit = await page.evaluate(() => ({
    health: Number(document.getElementById('healthBar').getAttribute('aria-valuenow')),
    hunger: Number(document.getElementById('hungerBar').getAttribute('aria-valuenow')),
    right: document.getElementById('vitals').getBoundingClientRect().right,
  }));
  // El hambre ya corre mientras carga la pagina, asi que se pide cerca de 100.
  check(vit.health === 100 && vit.hunger >= 90, `barras de salida inesperadas: ${JSON.stringify(vit)}`);
  check(vit.right > 1280 - 30, `las barras no llegan al borde derecho (${vit.right})`);

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

  // Andar.
  const walked = await walkToOpenGround(page);
  const moved = await state(page);
  check(walked > 1, `el jugador apenas se movio: ${walked.toFixed(2)} casillas`);
  check(moved.tick > spawn.tick, 'la simulacion no avanzo');
  check(moved.hunger < spawn.hunger, 'el hambre no bajo con el tiempo');
  const hudHunger = await page.evaluate(() => document.getElementById('hungerFill').style.width);
  check(hudHunger !== '100%', `la barra de hambre del HUD no bajo (${hudHunger})`);

  // La mirada es la de la camara: la mirada del nucleo tiene que ser la de la
  // camara encajada en ocho direcciones, y girar la camara tiene que girarla.
  const dot = (s) => s.facing[0] * s.aim[0] + s.facing[1] * s.aim[1];
  const before = await state(page);
  check(dot(before) > 0.9, `la mirada no sigue a la camara: ${JSON.stringify([before.facing, before.aim])}`);
  await orbit(page, 260);
  const turned = await waitForLoop(page, 20);
  console.log(`  mirada: ${JSON.stringify(before.facing)} -> ${JSON.stringify(turned.facing)}`);
  check(
    turned.facing[0] !== before.facing[0] || turned.facing[1] !== before.facing[1],
    'girar la camara no giro la mirada',
  );
  check(dot(turned) > 0.9, `tras girar, la mirada no sigue a la camara: ${JSON.stringify([turned.facing, turned.aim])}`);
  // Y arrastrar es girar, no accionar: se decide al soltar.
  check(turned.sent.harvest === before.sent.harvest, 'arrastrar para girar acciono');

  // El area: cuatro casillas distintas —tres del anillo que tocan al jugador y
  // la que pisa, la ultima—, y lo que se alcanza es un subconjunto de ellas. La
  // reticula marca exactamente lo alcanzable.
  const tile = [Math.floor(turned.x), Math.floor(turned.y)];
  check(turned.area.length === 4, `el area no son 4 casillas: ${JSON.stringify(turned.area)}`);
  check(new Set(turned.area.map((t) => t.join(','))).size === 4, `el area repite casilla: ${JSON.stringify(turned.area)}`);
  turned.area.forEach(([tx, ty], i) => {
    const d = Math.max(Math.abs(tx - tile[0]), Math.abs(ty - tile[1]));
    check(d === (i < 3 ? 1 : 0), `casilla ${i} del area a distancia ${d}: ${tx},${ty}`);
  });
  const inArea = new Set(turned.area.map((t) => t.join(',')));
  check(turned.reach.every((t) => inArea.has(t.join(','))), 'lo alcanzable sale del area');
  check(
    turned.reticleTiles === turned.reach.length,
    `la reticula marca ${turned.reticleTiles} casillas y se alcanzan ${turned.reach.length}`,
  );

  // Un clic sin arrastrar acciona, y el barrido llega a dibujarse. Desde el
  // nacimiento, que es un rellano llano (regla 22): ahi las cuatro casillas
  // estan al alcance, y el barrido no puede faltar por culpa del paisaje.
  const beforeClick = await open(page, baseUrl);
  check(beforeClick.reach.length === 4, `en el nacimiento no se alcanzan las cuatro casillas (${beforeClick.reach.length})`);
  await page.mouse.click(CLICK.x, CLICK.y);
  await page.waitForTimeout(400);
  const afterClick = await state(page);
  check(afterClick.sent.harvest > beforeClick.sent.harvest, 'un clic no acciono');
  check(afterClick.slashesDrawn > beforeClick.slashesDrawn, 'accionar no dibujo ningun barrido');

  // Recolectar de verdad, y los escombros contados como DIBUJADOS acumulados.
  const gathered = await harvestUntil(page, (s) => sum(s.inventory) > 0);
  console.log(`  inventario tras recolectar: ${JSON.stringify(gathered.inventory)}`);
  check(sum(gathered.inventory) > 0, 'accionar no recolecto nada');
  check(gathered.debrisDrawn > 0, 'derribar no dibujo ningun escombro');
  // El inventario, con su tecla: I lo abre, muestra lo del juego, e I lo cierra.
  await page.keyboard.press('KeyI');
  await page.waitForTimeout(250);
  check(await page.isVisible('#invPanel'), 'I no abrio el inventario');
  const hudTotal = await page.evaluate(() =>
    ['wood', 'stone', 'berries', 'coal', 'iron', 'copper', 'treeSeed', 'plantSeed']
      .map((id) => Number(document.getElementById(id).textContent))
      .reduce((a, b) => a + b, 0),
  );
  const nowTotal = sum((await state(page)).inventory);
  check(hudTotal === nowTotal, `el inventario en pantalla (${hudTotal}) no es el del juego (${nowTotal})`);
  await page.screenshot({ path: join(SHOTS, '3d-01b-inventario.png') });
  await page.keyboard.press('KeyI');
  await page.waitForTimeout(150);
  check(!(await page.isVisible('#invPanel')), 'I no volvio a cerrar el inventario');
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

  // La carrera, con su estado en la ayuda.
  await page.keyboard.press('ShiftLeft');
  await page.waitForTimeout(150);
  const runLabel = await page.evaluate(
    () => getComputedStyle(document.getElementById('runState'), '::after').content,
  );
  check(runLabel.includes('ACTIVADO'), `la ayuda no dice que la carrera esta encendida (${runLabel})`);
  await page.keyboard.press('ShiftLeft');

  // El ojo: cambia de proyeccion y lo dice con su forma.
  await page.click('#proj');
  await page.waitForTimeout(200);
  const orto = await state(page);
  check(orto.projection === 'orto', `el ojo no cambio a ortografica (${orto.projection})`);
  check(await page.isVisible('#proj.flat'), 'el ojo no se entrecerro en ortografica');
  await page.keyboard.press('KeyP');
  await page.waitForTimeout(200);
  check((await state(page)).projection === 'perspectiva', 'P no volvio a la perspectiva');

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
    await page.keyboard.press('KeyE');
    await page.waitForTimeout(300);
    const fed = await state(page);
    console.log(`  comer: bayas ${withBerries.inventory[2]} -> ${fed.inventory[2]}, hambre ${withBerries.hunger.toFixed(2)} -> ${fed.hunger.toFixed(2)}`);
    check(fed.sent.eat > withBerries.sent.eat, 'E no llego a la Intent');
    check(fed.inventory[2] < withBerries.inventory[2], 'comer no gasto ninguna baya');
    check(fed.hunger > withBerries.hunger, 'comer no lleno el hambre');

    // Sembrar: hace falta una semilla, y la semilla cae con una probabilidad.
    const seeded = await harvestUntil(page, (s) => s.inventory[3] + s.inventory[4] > 0, 10);
    const seeds = seeded.inventory[3] + seeded.inventory[4];
    console.log(`  semillas tras recolectar: ${seeds}`);
    check(seeds > 0, 'recolectar no dejo ninguna semilla');
    let planted = seeded;
    for (let i = 0; i < 8 && seeds > 0; i++) {
      await page.keyboard.press('KeyF');
      await page.waitForTimeout(250);
      planted = await state(page);
      if (planted.inventory[3] + planted.inventory[4] < seeds) break;
      // A otra casilla: girar la camara cambia la apuntada.
      await orbit(page, 120);
      await hold(page, 'KeyW', 150);
    }
    check(planted.sent.plant > seeded.sent.plant, 'F no llego a la Intent');
    check(planted.inventory[3] + planted.inventory[4] < seeds, 'sembrar no consumio ninguna semilla');
  }

  // Minar: la montana se pisa y sus minerales se sacan.
  const mineral = where.mineralSpot;
  check(mineral !== null, 'no se encontro ningun mineral en el mundo de prueba');
  if (mineral) {
    const arrived = await open(page, baseUrl, `&x=${mineral.stand.x}&y=${mineral.stand.y}`);
    console.log(`  ${mineral.kind} en ${mineral.node.x},${mineral.node.y}; aparece en ${arrived.terrain} / ${arrived.biome}`);
    check(arrived.biome === 'Tierras altas', `el bioma no es el esperado: ${arrived.biome}`);
    const mined = await harvestUntil(page, (s) => s.inventory.slice(5).some((n) => n > 0), 2);
    await page.screenshot({ path: join(SHOTS, '3d-03-montana.png') });
    console.log(`  piedra ${mined.inventory[1]}, carbon/hierro/cobre ${mined.inventory.slice(5).join('/')}`);
    check(mined.inventory.slice(5).some((n) => n > 0), `no se saco ningun mineral: ${JSON.stringify(mined.inventory)}`);
    const walked = await bestWalk(page, mined);
    check(walked > 1, 'el jugador no pudo caminar dentro de la montana');
  }

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
  check(await page.evaluate(() => document.body.classList.contains('touch-active')), 'el body no entro en modo tactil');
  for (const id of ['#action', '#jump', '#run', '#eat', '#plant', '#proj']) {
    check(await page.isVisible(id), `el boton ${id} no se ve en el movil`);
  }
  check(!(await page.isVisible('#help')), 'la ayuda de teclado se ve en el movil');
  for (const id of ['#vitals', '#invToggle', '#hudToggle']) {
    check(await page.isVisible(id), `${id} no se ve en el movil`);
  }
  // El racimo cabe en la pantalla y queda ENTERO por encima de la franja de
  // salud y hambre, que llega hasta el borde derecho.
  const layout = await page.evaluate(() => ({
    pad: document.getElementById('thumbPad').getBoundingClientRect().toJSON(),
    vitals: document.getElementById('vitals').getBoundingClientRect().toJSON(),
    inv: document.getElementById('invToggle').getBoundingClientRect().toJSON(),
  }));
  const { pad, vitals, inv } = layout;
  check(pad.left > 0 && pad.right <= 390, `el racimo se sale de la pantalla: ${JSON.stringify(pad)}`);
  check(pad.bottom <= vitals.top, `el racimo pisa la franja: ${pad.bottom} > ${vitals.top}`);
  check(vitals.right > 390 - 30 && vitals.bottom <= 844, `la franja no llega al borde derecho: ${JSON.stringify(vitals)}`);
  check(inv.left < 40 && inv.top >= vitals.top - 1, `el boton del inventario no esta en la esquina: ${JSON.stringify(inv)}`);

  // Los dos paneles, al tacto. La pista de los gestos vive en el HUD.
  await page.tap('#hudToggle');
  await page.waitForTimeout(200);
  check(await page.isVisible('#hud'), 'tocar el boton no abrio el HUD en el movil');
  check(await page.isVisible('.touch-only'), 'la pista de los gestos no se ve en el movil');
  await page.tap('#hudToggle');
  await page.tap('#invToggle');
  await page.waitForTimeout(200);
  check(await page.isVisible('#invPanel'), 'tocar el boton no abrio el inventario en el movil');
  await page.screenshot({ path: join(SHOTS, '3d-04-movil.png') });
  await page.tap('#invToggle');
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

  // El joystick, abajo a la izquierda: aparece, mueve y desaparece.
  const stick = { x: 90, y: 700 };
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

  // Saltar, comer y sembrar: el toque llega a la Intent.
  const b = await state(page);
  await tap(page, '#jump');
  await page.waitForTimeout(250);
  await tap(page, '#eat');
  await page.waitForTimeout(250);
  await tap(page, '#plant');
  await page.waitForTimeout(250);
  const a = await state(page);
  console.log(`  intents: ${JSON.stringify(b.sent)} -> ${JSON.stringify(a.sent)}`);
  check(a.sent.jump > b.sent.jump, 'el boton de saltar no llego a la Intent');
  check(a.sent.eat > b.sent.eat, 'el boton de comer no llego a la Intent');
  check(a.sent.plant > b.sent.plant, 'el boton de sembrar no llego a la Intent');

  // La accion: mantener repite, cuatro por segundo. Desde el nacimiento, que es
  // un rellano llano (regla 22): ahi las cuatro casillas estan al alcance y el
  // barrido tiene que salir, sin depender de donde dejo el joystick al jugador.
  const h0 = await open(page, baseUrl);
  check(h0.reach.length === 4, `en el nacimiento no se alcanzan las cuatro casillas (${h0.reach.length})`);
  await tapButton(page, '#action', 'touchstart');
  await page.waitForTimeout(1600);
  await tapButton(page, '#action', 'touchend');
  const h1 = await waitForLoop(page, 10);
  const repeats = h1.sent.harvest - h0.sent.harvest;
  console.log(`  accion mantenida: ${repeats} acciones`);
  check(repeats >= 2, `mantener la accion no repitio (${repeats})`);
  check(h1.slashesDrawn > h0.slashesDrawn, 'la accion del movil no dibujo barrido');

  // El panel del entorno, al tacto.
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

const only = process.argv[2];
const passes = { desktopPass, resourcesPass, mobilePass, devToolsPass, lifePass, reliefPass };
try {
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
