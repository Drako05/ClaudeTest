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
 * Ronda: una caja por objeto, que golpea y choca, con alto; el cuerpo se apoya
 * y choca con su huella; las patas de los animales con caja (2026-10-05).
 */
export default [
  {
    nombre: 'el tronco vuelve a la casilla entera',
    fichero: 'packages/sim/src/boxes.ts',
    de: '    half = trunk.width / 2;',
    a: '    half = 0.5;',
    prueba: 'test:tests/object-boxes.test.ts',
  },
  {
    nombre: 'el choque por el centro y no por la huella',
    fichero: 'packages/sim/src/systems/movement.ts',
    de: '  return squareFloor(world, cx, cy, BODY_RADIUS) > feet + margin;',
    a: '  return squareFloor(world, cx, cy, 0) > feet + margin;',
    prueba: 'test:tests/object-boxes.test.ts',
  },
  {
    nombre: 'el apoyo por el centro y no por la huella',
    fichero: 'packages/sim/src/boxes.ts',
    de: '  if (store.kind[id] === EntityKind.Player) return squareFloor(world, x, y, BODY_RADIUS, upTo);',
    a: '  if (store.kind[id] === EntityKind.Player) return squareFloor(world, x, y, 0, upTo);',
    prueba: 'test:tests/object-boxes.test.ts',
  },
  {
    nombre: 'una caja alta sube el cuerpo de golpe',
    fichero: 'packages/sim/src/systems/jump.ts',
    de: '  const ground = footing(world, store, id, store.z[id] + STEP_UP);',
    a: '  const ground = footing(world, store, id);',
    prueba: 'test:tests/object-boxes.test.ts',
  },
  {
    nombre: 'el arbusto choca',
    fichero: 'packages/shared/src/index.ts',
    de: '  return isInert(f) || lifeKindOf(f) === LifeKind.Tree || isStation(f);',
    a: '  return isInert(f) || lifeKindOf(f) !== null || isStation(f);',
    prueba: 'test:tests/object-boxes.test.ts',
  },
  {
    nombre: 'las patas sin caja',
    fichero: 'packages/shared/src/fauna-body.ts',
    de: "    out.push(...pair(i === 0 ? 'pata-del' : 'pata-tras', 'coat', true, [w, h, w], [lx, h / 2, z]));",
    a: "    out.push(...pair(i === 0 ? 'pata-del' : 'pata-tras', 'coat', false, [w, h, w], [lx, h / 2, z]));",
    prueba: 'test:tests/fauna-body.test.ts',
  },
  {
    nombre: 'los animales no ven las cajas de los objetos',
    fichero: 'packages/sim/src/body.ts',
    de: '          o.z1 > base + 1e-6 &&',
    a: '          false &&',
    prueba: 'test:tests/fauna-body.test.ts',
  },
  {
    nombre: 'las cajas del panel con los colores viejos',
    fichero: 'packages/client/src/debug-boxes.ts',
    de: '      if (blocksBody(world.featureAt(tx, ty))) {',
    a: '      if (false) {',
    prueba: 'test:tests/debug-boxes.test.ts',
  },
  {
    nombre: 'las cajas del humo al reves',
    fichero: 'packages/client/src/debug-boxes.ts',
    de: '      if (blocksBody(world.featureAt(tx, ty))) {',
    a: '      if (!blocksBody(world.featureAt(tx, ty))) {',
    prueba: 'smoke:devTools',
  },
];
