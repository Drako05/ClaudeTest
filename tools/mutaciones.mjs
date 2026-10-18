/**
 * Las mutaciones de la ronda en curso: cada comprobacion nueva, rota a
 * proposito para verla CAER (`tools/mutar.mjs`). Se reescribe en cada ronda;
 * la de antes queda en la historia de git.
 *
 * Cada una: `nombre` (unico; es el nombre del trabajo en la CI), `fichero`,
 * `de` (texto que tiene que aparecer EXACTAMENTE una vez), `a` (lo que lo
 * rompe) y `prueba`:
 * - `smoke:<pasada>`: una pasada de `tools/smoke.mjs`, por su prefijo;
 * - `gestures` o `slash`: esas herramientas;
 * - `slash:<parte>`: una parte del barrido (`tools/slash-partes.mjs`);
 * - `test:<fichero>`: un fichero de vitest.
 *
 * Ronda: el estandar de los botones (2026-10-18): todo lo que se pulsa es un
 * `.btn`, blanco, que se ilumina al pulsarlo y baja lo de dentro.
 */
export default [
  // Una pestana del movil que no es un `.btn`.
  {
    nombre: 'botones: una pestana sin el estandar',
    fichero: 'packages/client/index.html',
    de: '<button class="btn" type="button" role="tab" data-page="personaje">',
    a: '<button type="button" role="tab" data-page="personaje">',
    prueba: 'smoke:mobile',
  },
  // El + y el - sin el estandar.
  {
    nombre: 'botones: + y - sin el estandar',
    fichero: 'packages/client/src/inventory-ui.ts',
    de: "        b.className = 'btn';",
    a: '',
    prueba: 'smoke:desktop',
  },
  // Las pestanas, otra vez con el texto apagado.
  {
    nombre: 'botones: el texto de las pestanas, gris',
    fichero: 'packages/client/index.html',
    de: 'text-align: center; touch-action: manipulation;',
    a: 'text-align: center; touch-action: manipulation; color: rgba(232, 238, 247, .38);',
    prueba: 'smoke:mobile',
  },
  // Encendido ya no se ilumina (la categoria elegida, la pestana elegida).
  {
    nombre: 'botones: encendido sin luz',
    fichero: 'packages/client/index.html',
    de: '.btn:is(:active, .pressed, .on, .open):not(:disabled, .off) {',
    a: '.btn:is(:active, .pressed, .open):not(:disabled, .off) {',
    prueba: 'smoke:desktop',
  },
  // Tocar un boton no lo enciende.
  {
    nombre: 'botones: el toque sin luz',
    fichero: 'packages/client/src/press-light.ts',
    de: "      el.classList.add('pressed');",
    a: '',
    prueba: 'smoke:mobile',
  },
  // La luz de un toque se apaga en el acto: un toque rapido no se ve.
  {
    nombre: 'botones: la luz sin sus 150 ms',
    fichero: 'packages/client/src/press-light.ts',
    de: 'Math.max(0, FLASH_MS - (performance.now() - press.since))',
    a: '0',
    prueba: 'smoke:mobile',
  },
  // El texto suelto en su span, sin caja: no baja al pulsar.
  {
    nombre: 'botones: el texto no baja',
    fichero: 'packages/client/index.html',
    de: '.btn > span { display: inline-block; }',
    a: '.btn > span { }',
    prueba: 'smoke:stations',
  },
];
