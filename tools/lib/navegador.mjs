/**
 * Lo comun de las pruebas en navegador (`smoke.mjs`, `gestures.mjs`,
 * `slash.mjs`): servir el build, abrir el juego y dejar pasar el tiempo.
 *
 * **Ninguna prueba depende de lo rapido que vaya la maquina** (el autor,
 * 2026-10-24: «Trata que nada dependa de que tan rapido corre la maquina
 * donde se ejecuta»). Hay dos relojes, y los dos los mueve la prueba:
 *
 * - **el del juego**, el reloj manual del cliente (`?reloj=manual`,
 *   `clock.ts`): el bucle no corre solo, y `window.__reloj.avanzar` lo avanza
 *   frame a frame sin dibujar;
 * - **el de la interfaz**, el reloj fingido de Playwright (`page.clock`): los
 *   `setTimeout`, `requestAnimationFrame`, `performance.now` y `Date` de la
 *   pagina estan parados, y solo corren cuando la prueba los adelanta. Asi el
 *   destello de un boton, el sostenido de TAP o la barra del ojo saltan cuando
 *   la prueba lo dice, no cuando la maquina llega.
 *
 * Una espera es siempre una de dos: `elapse` (pasa el tiempo, en los dos
 * relojes) o una condicion (`until`). Los limites de tiempo real que quedan
 * —cargar la pagina, «no se cumplio en 30 s»— solo deciden cuanto tarda la
 * prueba, nunca si pasa.
 *
 * `SMOKE_LENTO=<n>` frena la CPU del navegador n veces, para ver en local que
 * una maquina mas lenta que la CI da lo mismo (`tools/determinismo.mjs`).
 */

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const PAGE = fileURLToPath(new URL('../../packages/client/dist/index.html', import.meta.url));

/** Sirve el build en un puerto libre de 127.0.0.1. */
export async function serve() {
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
  return { server, baseUrl: `http://127.0.0.1:${server.address().port}` };
}

/** Lo que `SMOKE_LENTO` frena la CPU, o 1. */
export const SLOWDOWN = Math.max(1, Number(process.env.SMOKE_LENTO) || 1);

/** Lo que pasa en la interfaz antes de cada clic o toque de Playwright. */
const BETWEEN_CLICKS_MS = 200;

/** Las paginas ya preparadas, y las que llevan el reloj de la interfaz fingido. */
const prepared = new WeakSet();
const faked = new WeakSet();

/**
 * Prepara una pagina ANTES de abrirla: el reloj de la interfaz fingido y
 * parado, y la CPU frenada si lo pide `SMOKE_LENTO`. Sin `fake` (la
 * comprobacion del bucle de verdad), solo lo segundo. Una vez por pagina: lo
 * preparado sigue al recargarla.
 */
export async function prepare(page, { fake = true } = {}) {
  if (prepared.has(page)) return;
  prepared.add(page);
  if (fake) {
    const start = Date.UTC(2026, 0, 1);
    await page.clock.install({ time: start });
    await page.clock.pauseAt(start + 1000);
    faked.add(page);
    // Entre dos clics de una persona pasa algo de tiempo. Con el reloj de la
    // interfaz parado no pasaba nada: la luz del boton anterior (`.pressed`,
    // que dura 150 ms) seguia puesta y su icono, bajado 2 px, tapaba el
    // siguiente. Antes de cada clic o toque de Playwright pasan 200 ms de
    // interfaz, lo que tarda un dedo en ir de un boton a otro.
    for (const name of ['click', 'tap', 'dblclick']) {
      const act = page[name].bind(page);
      page[name] = async (...args) => {
        await page.clock.runFor(BETWEEN_CLICKS_MS);
        return act(...args);
      };
    }
  }
  if (SLOWDOWN > 1) {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: SLOWDOWN });
  }
}

/** Si esta pagina va con el reloj manual del juego. */
export const manual = (page) => page.url().includes('reloj=manual');

/** Cada cuanto se alternan los dos relojes al pasar el tiempo. */
const STEP_MS = 100;

/**
 * Deja pasar `ms` milisegundos. Con el reloj manual, el juego avanza en frames
 * de `1/hz` s (sin dibujar, que es lo que cuesta) y la interfaz con el; los dos
 * se alternan de `STEP_MS` en `STEP_MS`, para que un temporizador de interfaz
 * que salta a mitad (el sostenido de TAP) mueva el juego desde ahi. Se cuentan
 * frames enteros, como `avanzar`: a 144 Hz un tramo de 100 ms no es un numero
 * entero de frames. Con el reloj de verdad, espera. Devuelve el tick.
 */
export async function elapse(page, ms, hz = 60) {
  if (!manual(page)) {
    await uiRun(page, ms);
    return page.evaluate(() => window.__verdant?.tick);
  }
  const frames = Math.round((ms * hz) / 1000);
  const perStep = Math.max(1, Math.round((STEP_MS * hz) / 1000));
  let tick = await page.evaluate(() => window.__verdant.tick);
  let uiDone = 0;
  for (let done = 0; done < frames; ) {
    const n = Math.min(perStep, frames - done);
    done += n;
    if (faked.has(page)) {
      const uiNow = Math.round((done * 1000) / hz);
      await page.clock.runFor(uiNow - uiDone);
      uiDone = uiNow;
    }
    tick = await page.evaluate(([m, h]) => window.__reloj.avanzar(m, { hz: h }), [(n * 1000) / hz, hz]);
  }
  return tick;
}

/**
 * Pasa solo el tiempo de la interfaz, sin mover el juego: lo que dura un dedo
 * sobre un boton antes de soltarlo. Sin reloj fingido, espera de verdad.
 */
export async function uiRun(page, ms) {
  if (faked.has(page)) await page.clock.runFor(ms);
  else await page.waitForTimeout(ms);
}

/**
 * Espera a que `fn` (evaluada en la pagina) sea cierta. Con el reloj manual
 * deja pasar el tiempo de 100 en 100 ms mientras tanto, hasta `timeout` ms DE
 * JUEGO; si no llega, lanza como lo haria `waitForFunction`.
 */
export async function until(page, fn, arg, { timeout = 30000 } = {}) {
  if (!manual(page) && !faked.has(page)) return page.waitForFunction(fn, arg, { timeout });
  for (let t = 0; ; t += 100) {
    if (await page.evaluate(fn, arg)) return;
    if (t >= timeout) throw new Error(`until: no se cumplio en ${timeout} ms de juego: ${fn}`);
    await elapse(page, 100);
  }
}

/** Dibuja un fotograma, si el bucle no lo hace solo. Antes de cada captura. */
export async function draw(page) {
  if (manual(page)) await page.evaluate(() => window.__reloj.dibujar());
}

/**
 * Espera a que el navegador suelte el `:active` de un toque. Lo quita con su
 * propio temporizador, de tiempo real, que el reloj fingido no mueve: se
 * espera a que pase, no un plazo. El tope solo decide cuanto se espera.
 */
export async function uiQuiet(page) {
  await page
    .waitForFunction(() => !document.querySelector('body :active'), null, { timeout: 10000, polling: 20 })
    .catch(() => {});
}
