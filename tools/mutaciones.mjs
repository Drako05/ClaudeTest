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
 * Ronda: fauna, primera tanda (2026-10-02).
 */
export default [
  {
    nombre: 'PV sin raiz cubica',
    fichero: 'packages/shared/src/fauna.ts',
    de: 'Math.round(REFERENCE_HIT_POINTS * Math.cbrt(massKg / REFERENCE_MASS_KG))',
    a: 'Math.round(REFERENCE_HIT_POINTS * Math.sqrt(massKg / REFERENCE_MASS_KG))',
    prueba: 'test:tests/fauna.test.ts',
  },
  {
    nombre: 'los muertos vuelven',
    fichero: 'packages/sim/src/systems/wander.ts',
    de: '        if (index.has(animal.key) || world.isFaunaDead(animal.key)) continue;',
    a: '        if (index.has(animal.key)) continue;',
    prueba: 'test:tests/world-laws.test.ts',
  },
  {
    nombre: 'el daño se olvida',
    fichero: 'packages/sim/src/systems/gathering.ts',
    de: '    world.setFaunaDamage(animal.key, store.maxHealth[a] - left);',
    a: '',
    prueba: 'test:tests/fauna.test.ts',
  },
  {
    nombre: 'botin a medias',
    fichero: 'packages/sim/src/systems/gathering.ts',
    de: "  if (!inventory.fits(loot)) return 'full';",
    a: '',
    prueba: 'test:tests/fauna.test.ts',
  },
  {
    nombre: 'sale de su bioma',
    fichero: 'packages/sim/src/systems/wander.ts',
    de: '        biomeOfTerrain(world.terrainAt(Math.floor(x), Math.floor(y))) === info.biome,',
    a: '        biomeOfTerrain(world.terrainAt(Math.floor(x), Math.floor(y))) !== -1,',
    prueba: 'test:tests/fauna.test.ts',
  },
  {
    nombre: 'saltar no la asienta',
    fichero: 'packages/sim/src/tick.ts',
    de: '  settleFauna(state.world, state.entities, state.fauna, state.tick);',
    a: '',
    prueba: 'test:tests/fauna.test.ts',
  },
  {
    nombre: 'piel sin nombrar',
    fichero: 'packages/shared/src/index.ts',
    de: 'export const AWAITING_USE: readonly Resource[] = [Resource.Hide, Resource.Feather, Resource.Shell];',
    a: 'export const AWAITING_USE: readonly Resource[] = [Resource.Feather, Resource.Shell];',
    prueba: 'test:tests/world-laws.test.ts',
  },
  {
    nombre: 'fauna fuera de escena',
    fichero: 'packages/client/src/fauna-view.ts',
    de: '        this.scene.add(sprite);',
    a: '',
    prueba: 'smoke:fauna',
  },
  {
    nombre: 'dibujo a ojo',
    fichero: 'packages/client/src/fauna-view.ts',
    de: '  const perPx = animalHeight(species, stage) / ink;',
    a: '  const perPx = animalHeight(species, stage) / (art.figure * DETAIL);',
    prueba: 'smoke:fauna',
  },
  {
    nombre: 'fauna quieta',
    fichero: 'packages/sim/src/systems/wander.ts',
    de: '      walkAt(world, store, id, dx, dy, info.speed, TICK_DT, (x, y) =>',
    a: '      walkAt(world, store, id, dx, dy, 0, TICK_DT, (x, y) =>',
    prueba: 'smoke:fauna',
  },
  {
    nombre: 'caza sin esquirlas',
    fichero: 'packages/client/src/main.ts',
    de: '        effects.spawnChips(hit.x - 0.5, hit.y - 0.5, colors, hit.z, animalHeight(hit.species, hit.stage));',
    a: '        void animalHeight;',
    prueba: 'smoke:fauna',
  },
  {
    nombre: 'el horno sin cocina',
    fichero: 'packages/shared/src/index.ts',
    de: "    category: 'Cocina',",
    a: "    category: 'Fundicion',",
    prueba: 'smoke:stations',
  },
  {
    nombre: 'la asada no alimenta',
    fichero: 'packages/shared/src/index.ts',
    de: '  if (item === Resource.CookedMeat) return 35;',
    a: '  if (item === Resource.CookedMeat) return 0.001;',
    prueba: 'smoke:stations',
  },
];
