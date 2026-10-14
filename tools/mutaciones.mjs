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
 * Ronda: los empujes entre cuerpos (el autor, 2026-10-14, fase 3 de la fisica
 * al estilo Minecraft): segun el tamaño, poco a poco, sin meter a nadie en una
 * pared.
 */
export default [
  // El tick sin empujes.
  {
    nombre: 'empujes: el tick no empuja',
    fichero: 'packages/sim/src/tick.ts',
    de: '  pushBodies(world, entities, state.fauna, playerId);',
    a: '',
    prueba: 'test:tests/push.test.ts',
  },
  // Sin masa: cada uno se lleva la mitad, sea cual sea su tamaño.
  {
    nombre: 'empujes: sin masa',
    fichero: 'packages/sim/src/systems/push.ts',
    de: '      const shareA = mass[j]! / (mass[i]! + mass[j]!);',
    a: '      const shareA = 0.5;',
    prueba: 'test:tests/push.test.ts',
  },
  // De golpe: se separan en un tick.
  {
    nombre: 'empujes: de golpe',
    fichero: 'packages/sim/src/systems/push.ts',
    de: '      const speed = PUSH_SPEED * overlap;',
    a: '      const speed = (overlap * reach) / dt;',
    prueba: 'test:tests/push.test.ts',
  },
  // Un empuje que no mira el choque: mete en el agua y saca del bioma.
  {
    nombre: 'empujes: atraviesan paredes',
    fichero: 'packages/sim/src/systems/movement.ts',
    de: '  if (dx !== 0 && !blocked(world, store, id, store.x[id] + dx, store.y[id], feet, margin, keep)) store.x[id] += dx;',
    a: '  if (dx !== 0) store.x[id] += dx;',
    prueba: 'test:tests/push.test.ts',
  },
  // El barrido corta antes de tiempo: solo mira su propia caja, no la mas ancha.
  {
    nombre: 'empujes: el barrido corta antes de tiempo',
    fichero: 'packages/sim/src/systems/push.ts',
    de: '      if (dx >= half[i]! + widest) break;',
    a: '      if (dx >= half[i]! + half[i]!) break;',
    prueba: 'test:tests/push.test.ts',
  },
];
