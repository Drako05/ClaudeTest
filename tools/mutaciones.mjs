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
 * Ronda: los objetos en el suelo (2026-10-18): todo botin cae al mundo, flota
 * a 0,2, se recoge con un iman, lo tirado se lanza y espera, se funden y duran.
 */
const DROPS = 'packages/sim/src/systems/drops.ts';

export default [
  // Posados a ras de suelo, no a 0,2.
  {
    nombre: 'suelo: sin flotar',
    fichero: DROPS,
    de: 'export const DROP_FLOAT = 0.2;',
    a: 'export const DROP_FLOAT = 0;',
    prueba: 'test:tests/drops.test.ts',
  },
  // El iman sin radio: se lo lleva todo, este donde este.
  {
    nombre: 'suelo: iman sin radio',
    fichero: DROPS,
    de: 'if (tick < d.pickableAt || far > PICKUP_RADIUS || inventory.room(d.item) === 0) continue;',
    a: 'if (tick < d.pickableAt || inventory.room(d.item) === 0) continue;',
    prueba: 'test:tests/drops.test.ts',
  },
  // Lo tirado se deja recoger en el acto.
  {
    nombre: 'suelo: tirar sin espera',
    fichero: DROPS,
    de: '    pickableAt: tick + THROW_DELAY_TICKS,',
    a: '    pickableAt: tick,',
    prueba: 'test:tests/drops.test.ts',
  },
  // Lo tirado sale hacia atras.
  {
    nombre: 'suelo: tirar hacia atras',
    fichero: DROPS,
    de: '    vx: dx * THROW_SPEED,',
    a: '    vx: -dx * THROW_SPEED,',
    prueba: 'test:tests/drops.test.ts',
  },
  // Tirar una herramienta la arregla.
  {
    nombre: 'suelo: tirar arregla',
    fichero: DROPS,
    de: '    wear: thrown.wear,',
    a: '    wear: freshWear(thrown.item),',
    prueba: 'test:tests/drops.test.ts',
  },
  // Dos montones iguales no se funden.
  {
    nombre: 'suelo: sin fundir',
    fichero: DROPS,
    de: '  if (stackMax(d.item) <= 1) return;',
    a: '  return;',
    prueba: 'test:tests/drops.test.ts',
  },
  // Recoger es todo o nada: si no cabe entero, no entra nada.
  {
    nombre: 'suelo: recoger todo o nada',
    fichero: DROPS,
    de: '    d.count -= inventory.addSome(d.item, d.count, d.wear);',
    a: '    d.count -= inventory.room(d.item) >= d.count ? inventory.addSome(d.item, d.count, d.wear) : 0;',
    prueba: 'test:tests/drops.test.ts',
  },
  // Saltar el tiempo deja lo que caia colgado en el aire.
  {
    nombre: 'suelo: saltar sin caer',
    fichero: 'packages/sim/src/tick.ts',
    de: '    stepDrops(state.world);',
    a: '',
    prueba: 'test:tests/drops.test.ts',
  },
  // Descartar un chunk se lleva lo que habia en el suelo.
  {
    nombre: 'suelo: se pierde al alejarse',
    fichero: 'packages/sim/src/world.ts',
    de: '        this.faunaCache.delete(key);\n      }\n    }\n  }',
    a:
      '        this.faunaCache.delete(key);\n' +
      '        for (const d of this.drops.values()) {\n' +
      '          if (toChunkCoord(Math.floor(d.x)) === chunk.cx && toChunkCoord(Math.floor(d.y)) === chunk.cy) this.drops.remove(d.id);\n' +
      '        }\n      }\n    }\n  }',
    prueba: 'test:tests/drops.test.ts',
  },
  // El icono se dibuja medio bloque por encima de donde esta.
  {
    nombre: 'suelo: dibujado fuera de sitio',
    fichero: 'packages/client/src/drops-view.ts',
    de: 'sprite.position.set(x, z + DROP_SIZE / 2 + bobOf(t, d.id), y);',
    a: 'sprite.position.set(x, z + DROP_SIZE + bobOf(t, d.id), y);',
    prueba: 'smoke:resources',
  },
];
