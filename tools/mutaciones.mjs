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
 * Ronda: pruebas que no dependen de la velocidad de la maquina (2026-10-24).
 */
export default [
  // El anillo del hambre se queda en 100: el hambre que marca no es la del juego.
  { nombre: 'hambre: el anillo no se mueve', fichero: 'packages/client/src/hud.ts', de: "ring.setAttribute('aria-valuenow', String(Math.ceil(value)));", a: "ring.setAttribute('aria-valuenow', '100');", prueba: 'smoke:desktop' },
  // Una mata no suelta bayas: no hay pila de dos con que probar el menu.
  { nombre: 'bayas: la mata no da', fichero: 'packages/shared/src/index.ts', de: '      const n = rare ? 8 : 4;', a: '      const n = 0;', prueba: 'smoke:desktop' },
  // Sin bucle de verdad: el juego solo correria con el reloj manual.
  { nombre: 'bucle: no corre solo', fichero: 'packages/client/src/main.ts', de: '} else {\n  requestAnimationFrame(frame);\n}', a: '} else {\n}', prueba: 'smoke:desktop' },
  // La luz de un boton tocado se apaga en el acto, sin sus 150 ms.
  { nombre: 'destello: se apaga en el acto', fichero: 'packages/client/src/press-light.ts', de: '    }, Math.max(0, FLASH_MS - (performance.now() - press.since)));', a: '    }, 0);', prueba: 'smoke:mobile' },
  // El sostenido del ojo salta a los 50 ms: un toque corto de 100 abre la barra.
  // Con el reloj de verdad esto competia con la velocidad de la maquina.
  { nombre: 'ojo: sostenido demasiado corto', fichero: 'packages/client/src/fov-panel.ts', de: 'export const HOLD_MS = 500;', a: 'export const HOLD_MS = 50;', prueba: 'gestures' },
  // Todo lo que entra al cruzar un borde se construye en el mismo frame.
  { nombre: 'chunks: sin presupuesto', fichero: 'packages/client/src/main.ts', de: '    if (far > 0 && spent() >= BUILD_BUDGET_MS) {', a: '    if (false) {', prueba: 'smoke:devTools' },
];
