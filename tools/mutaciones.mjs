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
 * Ronda: pruebas mas rapidas, fase 3 (2026-10-10): el humo con el reloj manual
 * (`?reloj=manual`, `clock.ts`). Lo que hay que ver es que las comprobaciones
 * siguen mordiendo sin el reloj de verdad: un reloj que no avanza no puede
 * pasar, la pasada de 144 Hz sigue viendo el fallo que vigila con frames
 * fingidos de 1/144 s, y lo que dependia del ritmo de fotogramas (la camara
 * rezagada) se sigue midiendo.
 */
export default [
  // Un reloj manual que no avanza el juego: ningun tick, y el humo lo dice.
  {
    nombre: 'el reloj manual no avanza el juego',
    fichero: 'packages/client/src/main.ts',
    de: '          runFrame(clock.now(), false);',
    a: '          runFrame(last, false);',
    prueba: 'smoke:life',
  },
  // El fallo que vigila la pasada de 144 Hz: los pestillos recogidos en todos
  // los frames, tambien en los que no corren tick, se pierden.
  {
    nombre: 'a 144 Hz se recogen los pestillos en frames sin tick',
    fichero: 'packages/client/src/main.ts',
    de: '  const collect = accumulator >= TICK_DT || scaled === 0;',
    a: '  const collect = true;',
    prueba: 'smoke:highRefresh',
  },
  // La camara rezagada, que con el headless lento daba 0,19 y ahora se mide a
  // 60 Hz exactos: sin retraso tiene que seguir cayendo.
  {
    nombre: 'en el juego la camara va sin retraso',
    fichero: 'packages/client/src/main.ts',
    de: '  camera.lag = dev.cameraLag;',
    a: '  camera.lag = 0;',
    prueba: 'smoke:relief',
  },
];
