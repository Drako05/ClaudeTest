/**
 * Mide si el barrido del 3D se VE, contando pixeles blancos del lienzo.
 *
 * Por que pixeles y no `__verdant.slashesDrawn`: ese contador cuenta lo que se
 * MANDA a la escena, y mandar no es llegar a pantalla. Un barrido recortado por
 * el frustum o tapado por una pared lo incrementa igual, asi que no distingue
 * «no se lanza» de «se lanza y no se ve» —que era justo el fallo—. Es la misma
 * leccion que ya costo meses con el slash, un escalon mas abajo.
 *
 * El numero que vale es la DIFERENCIA entre accionando y quieto: asi da igual
 * que el terreno tenga nieve o que la interfaz lleve texto claro.
 *
 * Y se mantiene pulsado el boton en vez de perseguir un barrido con sondeos: un
 * barrido dura 0.22 s, una captura tarda mas que eso, y manteniendo se acciona
 * cuatro veces por segundo —hay uno vivo el ~88 % del tiempo—. Perseguirlo seria
 * echarlo a suertes.
 *
 *   npm run slash
 */

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { inflateSync } from 'node:zlib';

const WIDTH = 1280;
const HEIGHT = 720;

/**
 * La zona del lienzo donde se mira, en pixeles.
 *
 * Centrada y sin bordes a proposito: el HUD vive arriba a la izquierda y el
 * racimo de botones abajo a la derecha, y el de accion se ilumina en `#f4f9ff`
 * justo cuando se le mantiene pulsado. Contarlo seria medir el boton.
 */
const BOX = { x0: 320, y0: 120, x1: 960, y1: 520 };

/** Cuanto tiene que subir un canal para contar como aclarado por el efecto. */
const LIFT = 12;

const file = fileURLToPath(new URL('../packages/client/dist/index.html', import.meta.url));
const html = await readFile(file);
const server = createServer((_, res) => {
  res.setHeader('content-type', 'text/html');
  res.end(html);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

const browser = await chromium.launch();
// `hasTouch` sin `isMobile`: hace falta un dedo de verdad para que aparezca el
// racimo del pulgar —en PC esta oculto—, pero se quiere la maquetacion de
// escritorio, que es donde se mide. Ver el toque de mas abajo.
const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT }, hasTouch: true });

// Se finge un puntero FINO, que es lo unico que `controls.ts` consulta.
//
// Con `hasTouch` a secas Chromium ya declara puntero grueso y el racimo del
// pulgar aparece al cargar, asi que la via del primer toque —la que sostiene a un
// portatil tactil, que declara puntero fino— no se probaria nunca. Anulando la
// consulta solo queda esa, y lo de abajo la mide de verdad.
await page.addInitScript(() => {
  const real = window.matchMedia.bind(window);
  window.matchMedia = (q) => (q.includes('pointer') ? { ...real(q), matches: false } : real(q));
});
const problems = [];
page.on('console', (m) => { if (m.type() === 'error') problems.push(m.text()); });
page.on('pageerror', (e) => problems.push(String(e)));

await page.goto(`http://127.0.0.1:${port}/?seed=12345`, { waitUntil: 'load' });
await page.waitForTimeout(3500);

const spawn = await page.evaluate(() => window.__verdant);
console.log(`nace en ${spawn.x.toFixed(1)}, ${spawn.y.toFixed(1)}`);

// El boton de accion esta oculto hasta que haya un dedo de por medio, asi que se
// da uno. Con el puntero fingido fino de arriba, esto mide exactamente la via del
// primer toque: tiene que salir «oculto al cargar, visible tras tocar».
const padBefore = await page.isVisible('#thumbPad');
await page.touchscreen.tap(WIDTH / 2, HEIGHT / 2);
await page.waitForTimeout(300);
const padAfter = await page.isVisible('#thumbPad');
console.log(`racimo del pulgar: ${padBefore ? 'visible' : 'oculto'} al cargar, ${padAfter ? 'visible' : 'oculto'} tras tocar`);
if (!padAfter) {
  console.log('NO se revelan los botones al tocar; la medida no valdria');
  await browser.close();
  server.close();
  process.exit(1);
}

// 1. Un golpe DIBUJADO aqui, y se le deja morir. Es lo que planta la esfera
//    envolvente: three.js la calcula la primera vez que la malla se dibuja, y si
//    luego no se invalida se queda clavada ahi para el resto de la partida.
//
//    Tiene que haberse dibujado de verdad, no solo lanzado: un area de una sola
//    casilla no traza arco, la malla no llega a hacerse visible y la esfera se
//    planta mas tarde y en otro sitio. Ahi la medida salia unas veces 0 y otras
//    77 sin tocar una linea, que es una prueba que decide a suertes.
let planted = await probe();
for (let tries = 0; tries < 6 && !planted; tries++) {
  await push(['KeyD', 'KeyS', 'KeyA', 'KeyW'][tries % 4], 600);
  planted = await probe();
}
if (!planted) {
  console.log('NO se ha podido plantar el primer golpe; la medida no valdria');
  await browser.close();
  server.close();
  process.exit(1);
}
const origin = await page.evaluate(() => window.__verdant);
console.log(`primer golpe dibujado en ${origin.x.toFixed(1)}, ${origin.y.toFixed(1)}`);
await page.waitForTimeout(400);

// 2. Lejos de aqui. En ortografica el encuadre mide trece casillas de
//    semialtura, asi que hay que salir de eso para que el recorte muerda.
//
//    Se prueba direccion por direccion en vez de empujar hacia un lado fijo:
//    este mundo es empinado y desde el nacimiento solo una de las cuatro se
//    recorre, saltando. Empujar a ciegas es lo que dejaba a la prueba de humo
//    pasando por el motivo equivocado, y aqui daba 2.9 casillas.
await page.keyboard.down('Shift');
let best = { key: 'KeyD', gain: -1 };
for (const key of ['KeyW', 'KeyS', 'KeyA', 'KeyD']) {
  const from = await page.evaluate(() => window.__verdant);
  await push(key, 1200);
  const to = await page.evaluate(() => window.__verdant);
  const gain = Math.hypot(to.x - from.x, to.y - from.y);
  if (gain > best.gain) best = { key, gain };
}
// Y se insiste hasta salir de veras del encuadre: trece casillas es la
// semialtura en ortografica, asi que por debajo de dieciocho la medida no
// probaria el recorte y pasaria por el motivo equivocado. Con un mundo tan
// empinado, un solo empujon se queda corto la mitad de las veces.
let walked = 0;
for (let tries = 0; tries < 6 && walked < 18; tries++) {
  await push(best.key, 5000);
  const now = await page.evaluate(() => window.__verdant);
  walked = Math.hypot(now.x - origin.x, now.y - origin.y);
}
await page.keyboard.up('Shift');
await page.waitForTimeout(500);

const there = await page.evaluate(() => window.__verdant);
console.log(`camina hacia ${best.key} y acaba a ${walked.toFixed(1)} casillas del primer golpe, en ${there.x.toFixed(1)}, ${there.y.toFixed(1)}`);
if (walked < 18) console.log('AVISO: no se ha alejado lo bastante; el recorte por frustum no queda probado');

// 3. Y un sitio donde la accion alcance de verdad.
//
//    En terreno escalonado el area llega a UNA casilla de las tres —solo alcanza
//    las de la altura propia—, y con una sola casilla no hay arco que trazar. Sin
//    esta comprobacion la medida daria cero por el motivo equivocado, que es
//    justo el error que este proyecto ya se comio una vez.
let reaches = await probe();
for (let tries = 0; tries < 8 && !reaches; tries++) {
  await push(['KeyD', 'KeyS', 'KeyA', 'KeyW'][tries % 4], 700);
  reaches = await probe();
}
if (!reaches) {
  console.log('NO se ha encontrado sitio con alcance completo; la medida no valdria');
  await browser.close();
  server.close();
  process.exit(1);
}
const spot = await page.evaluate(() => window.__verdant);
console.log(`acciona con alcance completo en ${spot.x.toFixed(1)}, ${spot.y.toFixed(1)}, altura ${spot.z.toFixed(1)}`);

const results = [];
for (const view of ['normal', 'camara baja', 'de cerca, girando']) {
  if (view === 'camara baja') {
    // Arrastrar hacia arriba baja la elevacion, que es lo que aplastaba la
    // cinta cuando se ensanchaba en el plano del suelo.
    await drag(0, 320);
  }
  if (view === 'de cerca, girando') {
    await drag(0, -320);
    // Acercarse estrecha el encuadre ortografico —la semialtura es la mitad de
    // la distancia—, y girar mueve de sitio el punto donde se dio el PRIMER
    // golpe. Las dos cosas juntas son lo que hace caer una esfera envolvente
    // congelada: quieta y de frente, ese punto se queda dentro del frustum, que
    // en ortografica tiene 1300 unidades de fondo.
    for (let i = 0; i < 20; i++) await page.mouse.wheel(0, -120);
    await page.waitForTimeout(600);
  }

  // En la vista giratoria se mide en cuatro rumbos y se guarda el PEOR: la
  // pregunta no es «se ve desde algun sitio» sino «hay algun sitio desde el que
  // desaparezca». Un minimo en cero es el barrido esfumandose.
  const turns = view === 'de cerca, girando' ? 4 : 1;
  let worst = null;
  let noise = 0;
  let sent = 0;
  let gathered = 0;
  let pitch = 0;
  for (let turn = 0; turn < turns; turn++) {
    if (turn > 0) await drag(-262, 0);
    pitch = (await page.evaluate(() => window.__verdant)).pitch;

    // Quieto el jugador y quieta la camara, dos fotogramas seguidos son
    // IDENTICOS. Asi que la referencia es una captura en reposo y lo que se mide
    // es lo que el efecto anade encima: el ruido de comparar dos capturas en
    // reposo dice cuanto vale cero.
    const reference = decodePng(await page.screenshot());
    noise = Math.max(noise, (await sample(reference, 2)).max);

    const before = await page.evaluate(() => window.__verdant);
    await page.hover('#action');
    await page.mouse.down();
    await page.waitForTimeout(300);
    const hitting = await sample(reference, 8);
    await page.mouse.up();
    const after = await page.evaluate(() => window.__verdant);
    await page.waitForTimeout(500);

    // Una captura por tanda y no cuatro: la del fotograma con mas barrido a la
    // vista, que es la que decide si esto se ve o no.
    if (view === 'normal') await writeFile(new URL('../screenshots/slash.png', import.meta.url), hitting.best);

    if (worst === null || hitting.max < worst) worst = hitting.max;
    sent += after.slashesDrawn - before.slashesDrawn;
    gathered += after.gathered - before.gathered;
  }

  results.push({ view, pitch, noise, lit: worst, sent, gathered });
}

console.log('');
console.log('vista               elevacion  ruido  pixeles aclarados  barridos mandados  recogido');
for (const r of results) {
  console.log(
    `${r.view.padEnd(19)} ${r.pitch.toFixed(2).padStart(9)} ` +
    `${String(r.noise).padStart(6)} ${String(r.lit).padStart(18)} ` +
    `${String(r.sent).padStart(18)} ${String(r.gathered).padStart(9)}`,
  );
}
console.log('');
console.log('«pixeles aclarados» es el barrido llegando a pantalla; en la vista giratoria,');
console.log('el PEOR de los cuatro rumbos. Con «recogido» a cero no hay escombros de por');
console.log('medio y todo lo aclarado es del barrido.');
console.log('');
console.log(problems.length ? `PROBLEMAS: ${problems.slice(0, 5).join(' | ')}` : 'sin errores de consola');

await browser.close();
server.close();

/** Un arrastre sobre el mundo, que es como se gira la camara. */
async function drag(dx, dy) {
  await page.mouse.move(760, 300);
  await page.mouse.down();
  await page.mouse.move(760 + dx, 300 + dy, { steps: 14 });
  await page.mouse.up();
  await page.waitForTimeout(700);
}

/** Empuja en una direccion saltando, que aqui es la unica forma de avanzar. */
async function push(key, ms) {
  await page.keyboard.down(key);
  for (let t = 0; t < ms; t += 400) {
    await page.keyboard.press('Space');
    await page.waitForTimeout(400);
  }
  await page.keyboard.up(key);
  await page.waitForTimeout(250);
}

/**
 * ¿Alcanza la accion las tres casillas desde aqui?
 *
 * `slashesDrawn` no sirve para afirmar que se VE, pero si para esto: solo sube
 * cuando el area da al menos dos casillas, o sea cuando hay arco que trazar.
 */
async function probe() {
  const before = await page.evaluate(() => window.__verdant.slashesDrawn);
  await page.hover('#action');
  await page.mouse.down();
  await page.waitForTimeout(700);
  await page.mouse.up();
  await page.waitForTimeout(400);
  const after = await page.evaluate(() => window.__verdant.slashesDrawn);
  return after > before;
}

/** Varias capturas seguidas contra la referencia; se queda con el maximo. */
async function sample(reference, times) {
  const counts = [];
  let best = null;
  for (let i = 0; i < times; i++) {
    const png = await page.screenshot();
    const lit = brightened(reference, decodePng(png));
    if (best === null || lit > Math.max(...counts)) best = png;
    counts.push(lit);
    await page.waitForTimeout(110);
  }
  return {
    max: Math.max(...counts),
    mean: Math.round(counts.reduce((a, b) => a + b, 0) / counts.length),
    counts,
    best,
  };
}

/**
 * Pixeles que el efecto ha ACLARADO respecto a la escena en reposo.
 *
 * Se pide que suban los tres canales a la vez porque el barrido es blanco y
 * blanco sobre cualquier color sube los tres. Contar «casi blanco» a secas no
 * valia: el trazo es translucido —`alpha = (1-t) * 0.85`— asi que mezclado con
 * hierba da un verde palido que no se acerca al blanco ni de lejos. Esa primera
 * version daba cero con el barrido perfectamente visible.
 */
function brightened(reference, shot) {
  const { width } = shot;
  let n = 0;
  for (let y = BOX.y0; y < BOX.y1; y++) {
    for (let x = BOX.x0; x < BOX.x1; x++) {
      const i = (y * width + x) * 4;
      if (
        shot.data[i] - reference.data[i] >= LIFT &&
        shot.data[i + 1] - reference.data[i + 1] >= LIFT &&
        shot.data[i + 2] - reference.data[i + 2] >= LIFT
      ) n++;
    }
  }
  return n;
}

/**
 * Decodifica el PNG de la captura a RGBA.
 *
 * Playwright entrega PNG y aqui hace falta el pixel crudo. Leerlo desde el
 * navegador con `toDataURL` no vale: el lienzo de WebGL va sin
 * `preserveDrawingBuffer`, asi que fuera del frame en que se dibujo esta
 * vacio. Solo se cubre lo que Chromium produce: 8 bits, sin entrelazar.
 */
function decodePng(buffer) {
  let pos = 8;
  let width = 0;
  let height = 0;
  let colorType = 0;
  const chunks = [];
  while (pos < buffer.length) {
    const length = buffer.readUInt32BE(pos);
    const type = buffer.toString('ascii', pos + 4, pos + 8);
    const body = buffer.subarray(pos + 8, pos + 8 + length);
    if (type === 'IHDR') {
      width = body.readUInt32BE(0);
      height = body.readUInt32BE(4);
      if (body[8] !== 8) throw new Error(`PNG de ${body[8]} bits, no previsto`);
      colorType = body[9];
      if (body[12] !== 0) throw new Error('PNG entrelazado, no previsto');
    } else if (type === 'IDAT') {
      chunks.push(body);
    } else if (type === 'IEND') {
      break;
    }
    pos += 12 + length;
  }

  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : 0;
  if (!channels) throw new Error(`PNG de tipo ${colorType}, no previsto`);
  const raw = inflateSync(Buffer.concat(chunks));
  const stride = width * channels;
  const out = Buffer.alloc(width * height * 4);
  let prev = Buffer.alloc(stride);

  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = Buffer.from(raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)));
    for (let i = 0; i < stride; i++) {
      const a = i >= channels ? line[i - channels] : 0;
      const b = prev[i];
      const c = i >= channels ? prev[i - channels] : 0;
      if (filter === 1) line[i] = (line[i] + a) & 0xff;
      else if (filter === 2) line[i] = (line[i] + b) & 0xff;
      else if (filter === 3) line[i] = (line[i] + ((a + b) >> 1)) & 0xff;
      else if (filter === 4) line[i] = (line[i] + paeth(a, b, c)) & 0xff;
      else if (filter !== 0) throw new Error(`filtro PNG ${filter} desconocido`);
    }
    for (let x = 0; x < width; x++) {
      const s = x * channels;
      const d = (y * width + x) * 4;
      out[d] = line[s];
      out[d + 1] = line[s + 1];
      out[d + 2] = line[s + 2];
      out[d + 3] = channels === 4 ? line[s + 3] : 255;
    }
    prev = line;
  }
  return { width, height, data: out };
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}
