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
 * - `test:<fichero>`: un fichero de vitest.
 *
 * Ronda: ajustes de la fauna (2026-10-03).
 */
export default [
  {
    nombre: 'el animal recargado no se cura',
    fichero: 'packages/sim/src/systems/wander.ts',
    de: '        store.health[id] = full;',
    a: '        store.health[id] = full - 5;',
    prueba: 'test:tests/fauna.test.ts',
  },
  {
    nombre: 'el daño de un arbol no se olvida',
    fichero: 'packages/sim/src/tick.ts',
    de: '  forgetUnloadedDamage(state.work, world);',
    a: '  void forgetUnloadedDamage;',
    prueba: 'test:tests/fauna.test.ts',
  },
  {
    nombre: 'el golpe no deja impacto en el animal',
    fichero: 'packages/sim/src/systems/gathering.ts',
    de: '    swing.impacts.push(at);\n    const hit = hitAnimal(',
    a: '    const hit = hitAnimal(',
    prueba: 'test:tests/fauna.test.ts',
  },
  {
    nombre: 'impacto que muere sin verse',
    fichero: 'packages/client/src/effects.ts',
    de: '    // El impacto, con la misma garantia que el barrido: dura menos que un\n    // fotograma de una maquina lenta.\n    for (let i = this.impactList.length - 1; i >= 0; i--) {\n      const s = this.impactList[i];\n      if (s.fresh) {\n        s.fresh = false;\n        continue;\n      }',
    a: '    // El impacto, con la misma garantia que el barrido: dura menos que un\n    // fotograma de una maquina lenta.\n    for (let i = this.impactList.length - 1; i >= 0; i--) {\n      const s = this.impactList[i];\n      s.fresh = false;',
    prueba: 'test:tests/effects.test.ts',
  },
  {
    nombre: 'el cliente no lanza impactos',
    fichero: 'packages/client/src/main.ts',
    de: '    for (const p of state.lastImpacts) effects.spawnImpact({ x: p.x, y: p.z, z: p.y });',
    a: '    void state.lastImpacts;',
    prueba: 'smoke:fauna',
  },
  {
    nombre: 'impactos sin dibujar',
    fichero: 'packages/client/src/effects-view.ts',
    de: '      mesh.visible = alpha > 0;\n      if (mesh.visible) this.impactsDrawn++;',
    a: '      mesh.visible = false;\n      if (mesh.visible) this.impactsDrawn++;',
    prueba: 'smoke:desktop',
  },
  {
    nombre: 'animales con esquirlas',
    fichero: 'packages/client/src/main.ts',
    de: '    for (const hit of state.lastAnimalHits) if (hit.killed) animalsKilled++;',
    a: '    for (const hit of state.lastAnimalHits) { if (hit.killed) animalsKilled++; effects.spawnChips(hit.x, hit.y, [0xffffff], hit.z); }',
    prueba: 'smoke:fauna',
  },
  {
    nombre: 'sprite sin la profundidad del cuerpo',
    fichero: 'packages/client/src/sprite-depth.ts',
    de: "      .replace(PROJECT_LINE, DEPTH_FROM_CORE);",
    a: "      .replace(PROJECT_LINE, PROJECT_LINE);",
    prueba: 'smoke:fauna',
  },
  {
    nombre: 'sprite adelantado de mas',
    fichero: 'packages/client/src/sprite-depth.ts',
    de: '  return Math.max(halfLength, halfBody);',
    // Lo justo para pasar por delante del bloque de la sonda (cara a 3, camara
    // a 5): con mas, el punto quedaria detras de la camara y el sprite caeria
    // por otra razon.
    a: '  return Math.max(halfLength, halfBody) + 2.2;',
    prueba: 'smoke:fauna',
  },
];
