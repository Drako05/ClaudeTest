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
 * Ronda: `mobile` pasa al reloj manual (2026-10-13). Las comprobaciones de la
 * pasada que dependen de que el juego corra entre toques —la accion mantenida,
 * el catalejo que vuelve y el sostenido de TAP— tienen que seguir cayendo con
 * el reloj manual; si no, esperan a un juego parado y no comprueban nada.
 */
export default [
  // La accion mantenida repite cada 15 ticks: a 600 no repite en los 2,4 s.
  {
    nombre: 'mobile: la accion mantenida no repite',
    fichero: 'packages/client/src/main.ts',
    de: 'const ACTION_REPEAT_TICKS = 15;',
    a: 'const ACTION_REPEAT_TICKS = 600;',
    prueba: 'smoke:mobile',
  },
  // El catalejo vuelve con el `dt` del frame: a 8 s no vuelve en 1,2.
  {
    nombre: 'mobile: el catalejo no vuelve al soltar',
    fichero: 'packages/client/src/camera.ts',
    de: 'const SPYGLASS_RELAX = 0.08;',
    a: 'const SPYGLASS_RELAX = 8;',
    prueba: 'smoke:mobile',
  },
  // El sostenido de TAP no se reconoce nunca: el dedo nunca lleva `HOLD_MS`.
  {
    nombre: 'mobile: el sostenido de TAP no se reconoce',
    fichero: 'packages/client/src/controls.ts',
    de: 'if (this.gestures.promoteHold(id, performance.now())) {',
    a: 'if (this.gestures.promoteHold(id, -1e9)) {',
    prueba: 'smoke:mobile',
  },
];
