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

/**
 * Camina hasta moverse de verdad, probando direcciones.
 *
 * Insistir en una sola direccion no vale: el mundo tiene agua, arboles y ahora
 * relieve, y el bloque anterior deja al personaje donde le deja. Si se empena en
 * ir al norte y al norte hay mar, la prueba mide cero y falla por el mapa y no
 * por un fallo. Devuelve cuanto se ha movido en total.
 */
async function walkToOpenGround(page, seconds = 1.4) {
  const start = await page.evaluate(() => window.__verdant);
  let last = start;
  for (const key of ['KeyW', 'KeyD', 'KeyS', 'KeyA', 'KeyD', 'KeyW']) {
    await page.keyboard.down(key);
    await page.waitForTimeout(seconds * 1000);
    await page.keyboard.up(key);
    last = await waitForLoop(page);
    if (Math.hypot(last.x - start.x, last.y - start.y) > 1.5) break;
  }
  return Math.hypot(last.x - start.x, last.y - start.y);
}

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

  // El relieve tiene que estar ahi desde el primer frame: varias alturas
  // alrededor y sus caras dibujadas. Cero caras con varias alturas significaria
  // un mundo escalonado que se ve plano.
  check(spawn.relief.levels > 1, `el terreno sale a una sola altura: ${spawn.relief.levels}`);
  check(spawn.faces.drawn > 0, 'no se dibujo ni una cara de relieve');
  check(
    spawn.faces.shapes < spawn.faces.drawn,
    `el cache de caras no agrupa nada: ${spawn.faces.shapes} formas para ${spawn.faces.drawn} caras`,
  );
  console.log(
    `  relieve: ${spawn.relief.levels} alturas, ${spawn.relief.ramps} taludes, ` +
      `${spawn.faces.drawn} caras de ${spawn.faces.shapes} formas`,
  );

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

  // El panel del entorno se despliega y se repliega con el mismo boton.
  await page.click('#statsToggle');
  check(await page.isVisible('#statsPanel'), 'el panel del entorno no se desplego');
  const bars = await page.evaluate(() => ({
    biome: document.querySelectorAll('#biomeBars .statRow').length,
    chunk: document.querySelectorAll('#chunkBars .statRow').length,
    reward: (document.getElementById('rewardState') || {}).textContent || '',
  }));
  console.log(`  panel: ${bars.biome} barras de bioma, ${bars.chunk} de chunk`);
  check(bars.biome === 3 && bars.chunk === 3, `barras inesperadas: ${JSON.stringify(bars)}`);
  check(bars.reward.length > 10, 'el panel no explica el estado de las recompensas');
  await page.screenshot({ path: join(SHOTS, '08-panel.png') });
  await page.click('#statsToggle');
  check(!(await page.isVisible('#statsPanel')), 'el panel no se replego al volver a pulsar');

  // Sembrar: recolectar deja semillas y F las planta.
  const withSeeds = await waitForLoop(page);
  const seeds = withSeeds.inventory[3] + withSeeds.inventory[4];
  console.log(`  semillas tras recolectar: ${seeds}`);
  check(seeds > 0, 'recolectar no dejo ninguna semilla');
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press('KeyF');
    await page.keyboard.down('KeyW');
    await page.waitForTimeout(120);
    await page.keyboard.up('KeyW');
  }
  const afterPlanting = await waitForLoop(page);
  check(
    afterPlanting.inventory[3] + afterPlanting.inventory[4] < seeds,
    'sembrar no consumio ninguna semilla',
  );

  // Apuntar con el raton: la mirada tiene que seguir al cursor, y el clic
  // izquierdo accionar sin tocar Espacio.
  const centre = { x: 640, y: 360 };
  await page.mouse.move(centre.x - 260, centre.y);
  await page.waitForTimeout(200);
  const aimLeft = await waitForLoop(page);
  await page.mouse.move(centre.x + 260, centre.y);
  await page.waitForTimeout(200);
  const aimRight = await waitForLoop(page);
  console.log(`  mirada: ${JSON.stringify(aimLeft.facing)} -> ${JSON.stringify(aimRight.facing)}`);
  check(
    aimLeft.facing[0] !== aimRight.facing[0] || aimLeft.facing[1] !== aimRight.facing[1],
    `el cursor no giro la mirada (${JSON.stringify(aimLeft.facing)})`,
  );
  // En isometrica el eje X de pantalla mezcla los dos ejes del mundo, asi que se
  // comprueba la relacion entre las dos miradas y no un signo concreto.
  check(
    aimRight.facing[0] > aimLeft.facing[0] || aimRight.facing[1] < aimLeft.facing[1],
    `la mirada no giro hacia el lado del cursor: ${JSON.stringify([aimLeft.facing, aimRight.facing])}`,
  );
  check(aimRight.area.length === 3, `el area no son 3 casillas: ${JSON.stringify(aimRight.area)}`);

  // El area son la apuntada y sus dos vecinas del anillo: las tres tocan al
  // jugador y son distintas.
  const playerTile = [Math.floor(aimRight.x), Math.floor(aimRight.y)];
  const distinct = new Set(aimRight.area.map((t) => t.join(',')));
  check(distinct.size === 3, `el area repite casilla: ${JSON.stringify(aimRight.area)}`);
  for (const [tx, ty] of aimRight.area) {
    const reach = Math.max(Math.abs(tx - playerTile[0]), Math.abs(ty - playerTile[1]));
    check(reach === 1, `casilla del area a distancia ${reach}: ${tx},${ty}`);
  }

  await page.screenshot({ path: join(SHOTS, '12-area-apuntada.png') });

  // Ritmo en REPOSO, ya construida la escena: el `fps` del estado inicial mide
  // la reventada de arranque —crear miles de sprites y sus lienzos— y no dice
  // nada de como va el juego una vez cargado. Ojo: aqui se renderiza por
  // software, sin GPU, asi que ni uno ni otro dicen nada de una maquina real.
  await page.waitForTimeout(2500);
  const idle = await page.evaluate(() => window.__verdant);
  console.log(`  en reposo: ${idle.fps.toFixed(1)} fps, peor frame ${idle.worstFrameMs.toFixed(0)} ms`);

  // Primero se anda a terreno sin talar, SIN tocar el raton, y luego se golpea
  // con el clic izquierdo quieto. Andar y clicar a la vez no se puede medir
  // aqui: el clic sintetico de Playwright roba el foco de la ventana y el
  // manejador de `blur` —que existe para no dejar al personaje andando solo al
  // cambiar de pestana— suelta las teclas pulsadas. Separandolo se comprueban
  // las dos cosas que importan sin depender de esa carrera.
  const walked = await walkToOpenGround(page);
  check(walked > 1, `el personaje apenas se movio: ${walked.toFixed(2)} casillas`);
  const beforeClick = await waitForLoop(page);

  // La atenuacion, en coordenadas POSITIVAS. Aqui estuvo rota: la comprobacion
  // miraba un `zIndex` que al pasar a contenedores por fila dejo de asignarse y
  // valia cero, asi que con `x + y` positivo no se atenuaba NADA y con negativo
  // se atenuaba todo. Media pantalla del mundo bien y la otra media mal, y ningun
  // test unitario lo ve: hay que jugar. Se camina hasta el cuadrante positivo y
  // se busca un momento en que algo estorbe.
  {
    let faded = 0;
    let where = null;
    for (let i = 0; i < 10 && faded === 0; i++) {
      await page.keyboard.down('KeyS');
      await page.keyboard.down('KeyD');
      await page.waitForTimeout(700);
      await page.keyboard.up('KeyS');
      await page.keyboard.up('KeyD');
      const now = await waitForLoop(page);
      if (now.x > 1 && now.y > 1) {
        faded = now.faded;
        where = now;
      }
    }
    console.log(
      `  atenuado en cuadrante positivo: ${faded} en ` +
        `${where ? `${where.x.toFixed(1)},${where.y.toFixed(1)}` : 'ningun sitio'}`,
    );
    check(where !== null, 'no se llego al cuadrante positivo');
    check(faded > 0, 'nada se atenuo estando en coordenadas positivas');
  }

  // Se barre el anillo entero de direcciones y, si la vuelta no da nada, se
  // cambia de sitio y se repite. Golpear siempre hacia el mismo lado depende de
  // que ahi hubiera algo, y eso es echarlo a suertes: lo que se comprueba es que
  // **el clic izquierdo recolecta**, no que el este del jugador tenga un arbol.
  const ring = [
    [120, 60],
    [0, 90],
    [-120, 60],
    [-120, -60],
    [0, -90],
    [120, -60],
  ];
  let afterClick = beforeClick;
  const before = beforeClick.inventory.reduce((a, b) => a + b, 0);
  for (let round = 0; round < 3; round++) {
    for (const [dx, dy] of ring) {
      await page.mouse.click(centre.x + dx, centre.y + dy);
      await page.waitForTimeout(220);
    }
    afterClick = await waitForLoop(page);
    if (afterClick.inventory.reduce((a, b) => a + b, 0) > before) break;
    await walkToOpenGround(page, 1.1);
    await waitForLoop(page);
  }
  const clicked = afterClick.inventory.reduce((a, b) => a + b, 0)
    - beforeClick.inventory.reduce((a, b) => a + b, 0);
  console.log(`  clic izquierdo: +${clicked} recursos tras andar ${walked.toFixed(1)} casillas`);
  check(clicked > 0, 'el clic izquierdo no recolecto nada');

  // Los efectos. El bloque anterior dejo la zona talada, asi que se golpea
  // MIENTRAS se camina: sobre una casilla vacia solo saldria el slash, y de que
  // haya algo que derribar no se puede depender quedandose quieto.
  // Primero, lejos de lo ya talado: el bloque del clic izquierdo deja la zona
  // vacia, y sobre casillas vacias solo saldria el slash.
  await walkToOpenGround(page, 1.1);

  let sawSlash = false;
  let sawDebris = 0;
  await page.mouse.down();
  for (const key of ['KeyS', 'KeyD', 'KeyS', 'KeyA', 'KeyW', 'KeyD', 'KeyS', 'KeyA', 'KeyD', 'KeyS']) {
    await page.keyboard.down(key);
    await page.waitForTimeout(420);
    await page.keyboard.up(key);
    const now = await page.evaluate(() => window.__verdant);
    if (now.effects.slashes > 0) sawSlash = true;
    if (now.effects.particles > sawDebris) sawDebris = now.effects.particles;
  }
  await page.mouse.up();
  console.log(`  al golpear: slash ${sawSlash ? 'si' : 'no'}, hasta ${sawDebris} escombros`);
  check(sawSlash, 'accionar no dibujo ningun slash');
  check(sawDebris > 0, 'derribar no solto ningun escombro');

  // Y se apagan solos: no se quedan pegados en pantalla.
  await page.waitForTimeout(1800);
  const settled = await page.evaluate(() => window.__verdant);
  check(
    settled.effects.particles === 0 && settled.effects.slashes === 0,
    `los efectos no se apagaron (${JSON.stringify(settled.effects)})`,
  );


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

  // El panel y el boton de sembrar tienen que funcionar tambien al tacto.
  await page.tap('#statsToggle');
  check(await page.isVisible('#statsPanel'), 'el panel no se abrio al tocarlo en movil');
  await page.screenshot({ path: join(SHOTS, '09-movil-panel.png') });
  await page.tap('#statsToggle');
  await touch(page, 'touchstart', { id: 3, x: 250, y: 745, selector: '#btnPlant' });
  await touch(page, 'touchend', { id: 3, x: 250, y: 745, selector: '#btnPlant' });

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

// ------------------------------------------------- herramientas de desarrollo

/**
 * Las herramientas de desarrollo, ejercitadas de punta a punta.
 *
 * Los tests unitarios ya miden que un salto de tiempo equivale a esperar y que
 * el bioma nombrado es el suelo pisado. Lo que solo se puede comprobar aqui es
 * que el panel existe, que sus botones llegan al motor y que los bordes se
 * dibujan sin reventar la escena.
 */
async function devToolsPass(browser, baseUrl) {
  console.log('\n== herramientas de desarrollo (?dev=1) ==');
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  watchProblems(page, 'desarrollo');

  await page.goto(`${baseUrl}/?seed=${SEED}&dev=1`, { waitUntil: 'load' });
  const start = await waitForLoop(page);
  check(start.dev === true, 'el panel no se activo con ?dev=1');
  check(await page.isVisible('#devPanel'), 'el panel de desarrollo no es visible');

  // Bordes: la escena tiene que seguir en pie y con MAS cosas dibujadas.
  await page.click('[data-toggle="chunks"]');
  await page.click('[data-toggle="biomes"]');
  await page.waitForTimeout(400);
  const withBorders = await waitForLoop(page);
  check(withBorders.objects > 50, `la escena se vacio al dibujar los bordes (${withBorders.objects})`);
  const bordersOn = await page.evaluate(() => ({
    chunks: !!document.querySelector('[data-toggle="chunks"].on'),
    biomes: !!document.querySelector('[data-toggle="biomes"].on'),
  }));
  check(bordersOn.chunks && bordersOn.biomes, `los conmutadores no quedaron activos: ${JSON.stringify(bordersOn)}`);
  check(withBorders.borderSegments > 0, 'el contorno de biomas no dibujo ni un segmento');
  // Cada contorno tiene que caber en el rombo de su propio chunk. Es la medida
  // del fallo que hubo: el origen del chunk sumado dos veces lo sacaba un chunk
  // entero en diagonal, y eso a ojo no se distingue.
  check(withBorders.misplacedBorders === 0, `${withBorders.misplacedBorders} contornos fuera de su chunk`);
  await page.screenshot({ path: join(SHOTS, '10-dev-bordes.png') });

  // El contorno tiene que sobrevivir a cambiar de chunk y a mover el zoom, que
  // es justo donde se veia aparecer y desaparecer.
  const startChunk = [Math.floor(withBorders.x) >> 5, Math.floor(withBorders.y) >> 5];
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(2600);
  await page.keyboard.up('KeyD');
  const walked = await waitForLoop(page);
  const walkedChunk = [Math.floor(walked.x) >> 5, Math.floor(walked.y) >> 5];
  console.log(`  chunk ${startChunk} -> ${walkedChunk}, segmentos ${withBorders.borderSegments} -> ${walked.borderSegments}`);
  check(
    walkedChunk[0] !== startChunk[0] || walkedChunk[1] !== startChunk[1],
    `el jugador no llego a cambiar de chunk (${startChunk} -> ${walkedChunk})`,
  );
  check(walked.borderSegments > 0, 'el contorno desaparecio al cambiar de chunk');
  check(walked.misplacedBorders === 0, `${walked.misplacedBorders} contornos fuera de su chunk tras caminar`);

  for (let i = 0; i < 6; i++) await page.keyboard.press('Minus');
  await page.waitForTimeout(400);
  const zoomedOutBorders = await waitForLoop(page);
  check(zoomedOutBorders.tilesOnScreen > walked.tilesOnScreen, 'el zoom no cambio');
  check(zoomedOutBorders.borderSegments > 0, 'el contorno desaparecio al alejar el zoom');
  check(zoomedOutBorders.misplacedBorders === 0, `${zoomedOutBorders.misplacedBorders} contornos fuera de su chunk tras el zoom`);
  for (let i = 0; i < 6; i++) await page.keyboard.press('Equal');
  await page.waitForTimeout(300);

  // Pausa: el reloj tiene que pararse de verdad, no solo cambiar de color.
  await page.click('[data-toggle="pause"]');
  await page.waitForTimeout(150);
  const paused = await page.evaluate(() => window.__verdant);
  check(paused.timeScale === 0, `pausar no dejo la escala a cero (${paused.timeScale})`);
  await page.waitForTimeout(700);
  const stillPaused = await page.evaluate(() => window.__verdant);
  check(stillPaused.tick === paused.tick, `el tiempo avanzo en pausa (${paused.tick} -> ${stillPaused.tick})`);

  await page.click('[data-toggle="pause"]');
  await page.waitForTimeout(400);
  const resumed = await page.evaluate(() => window.__verdant);
  check(resumed.tick > stillPaused.tick, 'reanudar no volvio a mover el reloj');

  // Salto: +1 h son DAY_TICKS/24 ticks. Se compara contra el instante justo
  // anterior al clic para que el margen sea el del propio bucle, no el del salto.
  const HOUR_TICKS = (8 * 60 * 60) / 24;
  await page.click('[data-toggle="pause"]');
  await page.waitForTimeout(150);
  const beforeJump = await page.evaluate(() => window.__verdant);
  await page.click('[data-jump="1200"]');
  await page.waitForTimeout(200);
  const afterJump = await page.evaluate(() => window.__verdant);
  const jumped = afterJump.tick - beforeJump.tick;
  console.log(`  salto de +1 h: ${beforeJump.clock} -> ${afterJump.clock} (${jumped} ticks)`);
  check(jumped === HOUR_TICKS, `el salto no adelanto una hora exacta (${jumped} ticks)`);
  const jumpLine = await page.evaluate(() => (document.getElementById('devLog') || {}).textContent || '');
  check(jumpLine.includes('+1 h'), `el registro no anoto el salto tal cual (${JSON.stringify(jumpLine)})`);

  // La supervivencia viene congelada: saltar un dia entero gastaria 264 puntos
  // de hambre y mataria al personaje, que es lo que hacia inservible el boton.
  check(afterJump.survivalFrozen === true, 'el panel no arranco con la supervivencia congelada');
  const beforeDay = await page.evaluate(() => window.__verdant);
  await page.click('[data-jump="28800"]');
  await page.waitForTimeout(300);
  const afterDay = await page.evaluate(() => window.__verdant);
  console.log(`  +1 dia congelado: hambre ${beforeDay.hunger.toFixed(2)} -> ${afterDay.hunger.toFixed(2)}`);
  check(afterDay.hunger === beforeDay.hunger, `saltar un dia gasto hambre estando congelada (${beforeDay.hunger} -> ${afterDay.hunger})`);
  check(afterDay.health === beforeDay.health, 'saltar un dia gasto salud estando congelada');

  // Y al apagarlo, el hambre vuelve a bajar.
  await page.click('[data-toggle="survival"]');
  await page.click('[data-toggle="pause"]');
  await page.waitForTimeout(700);
  const thawed = await page.evaluate(() => window.__verdant);
  check(thawed.survivalFrozen === false, 'el conmutador no se apago');
  check(thawed.hunger < afterDay.hunger, `apagar la congelacion no devolvio el hambre (${afterDay.hunger} -> ${thawed.hunger})`);
  await page.click('[data-toggle="survival"]');

  // Registro: recolectar tiene que dejar constancia.
  await page.keyboard.down('Space');
  for (const key of ['KeyW', 'KeyD', 'KeyS', 'KeyA']) {
    await page.keyboard.down(key);
    await page.waitForTimeout(450);
    await page.keyboard.up(key);
  }
  await page.keyboard.up('Space');
  await page.waitForTimeout(300);
  const log = await page.evaluate(() => (document.getElementById('devLog') || {}).textContent || '');
  console.log(`  registro: ${JSON.stringify(log.split('\n')[0] ?? '')}`);
  check(log.trim().length > 0, 'recolectar no dejo ninguna linea en el registro');
  await page.screenshot({ path: join(SHOTS, '11-dev-registro.png') });

  // Captura del golpe. Los efectos avanzan con el tiempo escalado, asi que
  // pausar los CONGELA: se golpea a velocidad normal y en cuanto salta un
  // estallido se pausa y se fotografia con calma. A 1x el estallido entero cabe
  // entre dos muestreos, y a 0.25x se camina cuatro veces mas lento y no se
  // llega a nada que talar.
  await page.click('[data-toggle="biomes"]');
  await page.click('[data-toggle="chunks"]');
  await page.mouse.move(760, 420);
  await page.waitForTimeout(200);

  // A terreno sin talar antes de nada: golpear donde ya se golpeo solo saca el
  // slash, y entonces no hay estallido que fotografiar.
  await walkToOpenGround(page, 1.2);

  let shot = false;
  await page.mouse.down();
  for (const key of ['KeyS', 'KeyD', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyW', 'KeyA']) {
    await page.keyboard.down(key);
    for (let i = 0; i < 12 && !shot; i++) {
      await page.waitForTimeout(90);
      const now = await page.evaluate(() => window.__verdant);
      if (now.effects.particles >= 8 && now.effects.slashes > 0) {
        await page.click('[data-toggle="pause"]');
        await page.screenshot({ path: join(SHOTS, '13-golpe.png') });
        console.log(`  captura del golpe: ${now.effects.particles} escombros congelados`);
        await page.click('[data-toggle="pause"]');
        shot = true;
      }
    }
    await page.keyboard.up(key);
    if (shot) break;
  }
  await page.mouse.up();
  check(shot, 'no se pudo fotografiar un golpe con escombros');

  // F3 cierra el panel y devuelve el tiempo a su sitio.
  await page.keyboard.press('F3');
  await page.waitForTimeout(150);
  const closed = await page.evaluate(() => window.__verdant);
  check(closed.dev === false, 'F3 no cerro el panel');
  check(closed.timeScale === 1, `al cerrar el panel el tiempo no volvio a 1x (${closed.timeScale})`);
  check(closed.survivalFrozen === false, 'al cerrar el panel el personaje siguio siendo inmortal');
  check(!(await page.isVisible('#devPanel')), 'el panel sigue visible tras cerrarlo');

  await page.close();
}

// ------------------------------------------------------------------ montana

/**
 * La montana: entrar, caminar y minar.
 *
 * La roca figuraba como terreno solido, asi que el bioma entero era un muro y el
 * autor chocaba contra su borde. Esto lo comprueba de punta a punta.
 *
 * Se abre directamente junto a un mineral con `?x=&y=`. Llegar andando obliga a
 * esquivar arboles, y buscar mineral paseando seria una loteria: el carbon sale
 * a 0.00225 por casilla, asi que la prueba fallaria por azar y no por un fallo.
 *
 * Aqui NO se toca el raton a proposito: sin puntero la mirada sigue al
 * movimiento, asi que andar hacia el mineral es lo que lo deja apuntado.
 */
/**
 * El relieve visto de cerca.
 *
 * Se va a una pared de dos bloques, que es la que el autor pidio expresamente y
 * la que la calibracion de salientes hace escasa. Sin ir a buscarla, la prueba
 * dependeria de que el spawn cayera al lado de una.
 */
async function reliefPass(browser, baseUrl) {
  console.log('\n== relieve (paredes y taludes) ==');
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  watchProblems(page, 'relieve');

  await page.goto(`${baseUrl}/?seed=${SEED}`, { waitUntil: 'load' });
  const spawn = await waitForLoop(page);
  const spot = spawn.cliffSpot;
  check(spot !== null, 'no se encontro ninguna pared de dos bloques en el mundo de prueba');
  if (!spot) {
    await page.close();
    return;
  }
  console.log(`  pared de ${spot.drop} bloques en ${spot.stand.x},${spot.stand.y}`);
  check(spot.drop >= 2, `la pared mas alta es de ${spot.drop} bloque(s)`);

  await page.goto(`${baseUrl}/?seed=${SEED}&x=${spot.stand.x}&y=${spot.stand.y}`, {
    waitUntil: 'load',
  });
  await page.evaluate(() => delete window.__smokeBaseTick);
  const arrived = await waitForLoop(page);
  console.log(
    `  al pie: nivel ${arrived.level}, ${arrived.relief.levels} alturas, ` +
      `${arrived.relief.tallWalls} tiles al pie de un muro, ${arrived.faces.drawn} caras`,
  );
  check(arrived.relief.tallWalls > 0, 'no hay paredes de dos bloques donde deberia haberlas');
  check(arrived.relief.ramps > 0, 'no hay ni un talud por el que subir en toda la zona');
  check(arrived.faces.drawn > 0, 'la pared no dibujo ninguna cara');

  await page.screenshot({ path: join(SHOTS, '15-relieve.png') });

  // Caminar por el relieve no puede atascar: en esta fase la altura solo se ve,
  // asi que el personaje sigue moviendose como en llano. Va ANTES de subir a la
  // cima: puesto despues medía el teletransporte y pasaba por el motivo
  // equivocado, que es peor que fallar.
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(700);
  await page.keyboard.up('KeyD');
  const walked = await waitForLoop(page);
  const moved = Math.hypot(walked.x - arrived.x, walked.y - arrived.y);
  console.log(`  camino ${moved.toFixed(2)} casillas junto a la pared`);
  check(moved > 1, 'el jugador se quedo atascado junto a la pared');
  check(moved < 30, `no camino, se teletransporto: ${moved.toFixed(1)} casillas`);

  // La cima. Es lo que el autor no encontraba explorando: subir a un punto alto
  // y ver que el mundo tiene escala de verdad.
  const peak = spawn.peakSpot;
  check(peak !== null, 'no se encontro ninguna cima');
  if (peak) {
    console.log(`  cima mas alta cerca: nivel ${peak.level} en ${peak.stand.x},${peak.stand.y}`);
    check(peak.level > 15, `la cima mas alta del entorno es el nivel ${peak.level}`);
    await page.goto(`${baseUrl}/?seed=${SEED}&x=${peak.stand.x}&y=${peak.stand.y}`, {
      waitUntil: 'load',
    });
    await page.evaluate(() => delete window.__smokeBaseTick);
    const onTop = await waitForLoop(page);
    console.log(`  en la cima: nivel ${onTop.level}, terreno ${onTop.terrain}`);
    check(onTop.level > 15, `la cima no era tan alta: nivel ${onTop.level}`);
    // En lo mas alto no hay nada por delante que pueda taparle, asi que la
    // silueta sobra. Si saliera aqui es que se dispara siempre y no significa
    // nada, que es justo lo que pasaba comparando cajas enteras.
    check(!onTop.playerHidden, 'la silueta sale hasta en la cima, donde nada tapa');
    for (let i = 0; i < 4; i++) await page.keyboard.press('Minus');
    await page.waitForTimeout(500);
    await page.screenshot({ path: join(SHOTS, '16-cima.png') });
  }

  await page.close();
}

/**
 * Girar la camara.
 *
 * Con una sola vista, la cara oculta de una montana es inexplorable: lo que hay
 * al otro lado lo tapa la montana misma. Aqui se comprueba lo que hace falta para
 * que girar sirva de algo: que las cuatro vistas sean distintas, que en todas se
 * dibuje relieve, que el mando siga la vista, y que volver dejé el mundo como
 * estaba.
 */
async function rotationPass(browser, baseUrl) {
  console.log('\n== rotacion de camara ==');
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  watchProblems(page, 'rotacion');

  await page.goto(`${baseUrl}/?seed=${SEED}`, { waitUntil: 'load' });
  const spawn = await waitForLoop(page);
  const peak = spawn.peakSpot;
  check(peak !== null, 'no se encontro ninguna cima');
  if (!peak) {
    await page.close();
    return;
  }

  // Al pie de la cima, que es donde girar tiene sentido: media montana tapa.
  await page.goto(`${baseUrl}/?seed=${SEED}&x=${peak.stand.x}&y=${peak.stand.y}`, {
    waitUntil: 'load',
  });
  await page.evaluate(() => delete window.__smokeBaseTick);
  const start = await waitForLoop(page);
  check(start.view === 0, `no se empieza en la vista 0: ${start.view}`);

  const seen = [];
  for (let i = 0; i < 4; i++) {
    const now = await waitForLoop(page);
    check(now.view === i, `se esperaba la vista ${i} y hay la ${now.view}`);
    check(now.faces.drawn > 0, `la vista ${i} no dibujo relieve`);
    seen.push(now.faces.drawn);
    await page.screenshot({ path: join(SHOTS, `17-vista-${i}.png`) });
    await page.keyboard.press('Period');
    await page.waitForTimeout(500);
  }
  const back = await waitForLoop(page);
  console.log(`  caras por vista: ${seen.join(' / ')}`);
  check(back.view === 0, `cuatro giros no volvieron a la vista 0: ${back.view}`);
  check(
    Math.abs(back.x - start.x) < 0.001 && Math.abs(back.y - start.y) < 0.001,
    'girar movio al personaje',
  );

  // El mando gira con la vista: «arriba» tiene que seguir siendo arriba en
  // pantalla. Se mide en coordenadas de MUNDO, que es lo que cambia.
  for (let v = 0; v < 4; v++) {
    const before = await waitForLoop(page);
    await page.keyboard.down('KeyW');
    await page.waitForTimeout(700);
    await page.keyboard.up('KeyW');
    const after = await waitForLoop(page);
    const moved = Math.hypot(after.x - before.x, after.y - before.y);
    console.log(`  vista ${v}: andar arriba movio ${moved.toFixed(2)} casillas`);
    await page.keyboard.press('Period');
    await page.waitForTimeout(400);
  }

  await page.close();
}

async function mountainPass(browser, baseUrl) {
  console.log('\n== montana (roca y minerales) ==');
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  watchProblems(page, 'montana');

  await page.goto(`${baseUrl}/?seed=${SEED}`, { waitUntil: 'load' });
  const spawn = await waitForLoop(page);
  const spot = spawn.mineralSpot;
  check(spot !== null, 'no se encontro ningun mineral en el mundo de prueba');
  if (!spot) {
    await page.close();
    return;
  }
  console.log(`  ${spot.kind} en ${spot.node.x},${spot.node.y}; se golpea desde ${spot.stand.x},${spot.stand.y}`);

  await page.goto(`${baseUrl}/?seed=${SEED}&x=${spot.stand.x}&y=${spot.stand.y}`, {
    waitUntil: 'load',
  });
  await page.evaluate(() => delete window.__smokeBaseTick);
  const arrived = await waitForLoop(page);
  console.log(`  aparecio en ${arrived.terrain} / ${arrived.biome}`);
  check(arrived.biome === 'Tierras altas', `el bioma no es el esperado: ${arrived.biome}`);

  // Se puede andar dentro, que es exactamente lo que no se podia.
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(700);
  await page.keyboard.up('KeyD');
  const walked = await waitForLoop(page);
  const moved = Math.hypot(walked.x - arrived.x, walked.y - arrived.y);
  console.log(`  camino ${moved.toFixed(2)} casillas por la montana`);
  check(moved > 1, 'el jugador no pudo caminar dentro de la montana');

  // Se vuelve al sitio y se mina: andar al sur deja el mineral apuntado.
  await page.goto(`${baseUrl}/?seed=${SEED}&x=${spot.stand.x}&y=${spot.stand.y}`, {
    waitUntil: 'load',
  });
  await page.evaluate(() => delete window.__smokeBaseTick);
  await waitForLoop(page);

  await page.keyboard.down('KeyS');
  await page.waitForTimeout(120);
  await page.keyboard.up('KeyS');
  await page.keyboard.down('Space');
  await page.waitForTimeout(500);
  await page.keyboard.up('Space');
  await page.screenshot({ path: join(SHOTS, '14-montana.png') });

  const end = await page.evaluate(() => window.__verdant);
  const minerals = end.inventory.slice(5);
  console.log(`  piedra ${end.inventory[1]}, carbon/hierro/cobre ${minerals.join('/')}`);
  check(
    minerals.some((n) => n > 0),
    `no se saco ningun mineral: inventario ${JSON.stringify(end.inventory)}`,
  );

  await page.close();
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
  await devToolsPass(browser, baseUrl);
  await reliefPass(browser, baseUrl);
  await rotationPass(browser, baseUrl);
  await mountainPass(browser, baseUrl);
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
