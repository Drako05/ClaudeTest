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
 * Ronda: romper el terreno, voxel a voxel (2026-10-20).
 */
const WORLD = 'packages/sim/src/world.ts';
const GATHER = 'packages/sim/src/systems/gathering.ts';
const BOXES = 'packages/sim/src/boxes.ts';
const MESH = 'packages/client/src/terrain-mesh.ts';
const VOX = 'test:tests/voxel-edit.test.ts';
const MESH_TEST = 'test:tests/terrain-mesh.test.ts';
export default [
  // Romper no apunta nada.
  { nombre: 'voxel: romper no anota', fichero: WORLD, de: '    gone.add(vz);\n', a: '', prueba: VOX },
  // Lo roto sigue siendo solido.
  { nombre: 'voxel: lo roto es solido', fichero: WORLD, de: "    return vz < this.potentialTop(vx, vy) && !this.brokenIn(vx, vy)?.has(vz);", a: '    return vz < this.potentialTop(vx, vy);', prueba: VOX },
  // El suelo de una columna no baja por lo roto.
  { nombre: 'voxel: suelo sin huecos', fichero: WORLD, de: '    let h = Math.min(this.potentialTop(vx, vy), below);\n    const gone = this.brokenIn(vx, vy);\n    if (gone) while (gone.has(h - 1)) h--;', a: '    let h = Math.min(this.potentialTop(vx, vy), below);', prueba: VOX },
  // La vecina del borde no se entera.
  { nombre: 'voxel: vecina sin revision', fichero: WORLD, de: '    if (lx === 0) touch(cx - 1, cy);\n', a: '', prueba: VOX },
  // El fondo del agua se rompe.
  { nombre: 'voxel: fondo del agua', fichero: WORLD, de: '    if (this.isTerrainSolidAt(tx, ty)) return false;\n', a: '', prueba: VOX },
  // Lo puesto cae con su apoyo.
  { nombre: 'voxel: lo puesto cae', fichero: WORLD, de: "    return this.bases.get(`${tx},${ty}`) ?? this.settle(", a: '    return this.settle(', prueba: VOX },
  // Lo generado cae con su apoyo.
  { nombre: 'voxel: lo generado cae', fichero: WORLD, de: '(vx, vy) => this.potentialTop(vx, vy));\n  }', a: '(vx, vy) => this.columnTop(vx, vy));\n  }', prueba: VOX },
  // El dibujo de la vecina no ve lo roto.
  { nombre: 'voxel: la vecina no ve lo roto', fichero: WORLD, de: '    if (!top) return vz < potential && !gone?.has(vz) ? 1 : 0;', a: '    if (!top) return vz < potential ? 1 : 0;', prueba: MESH_TEST },
  // Dos golpes bastan.
  { nombre: 'golpe: dos golpes', fichero: GATHER, de: 'export const VOXEL_WORK = 3;', a: 'export const VOXEL_WORK = 2;', prueba: VOX },
  // El daño no se olvida.
  { nombre: 'golpe: sin olvido', fichero: GATHER, de: '  if (!d || tick - d.tick > DAMAGE_DECAY_TICKS) return 0;\n  return d.work;\n}', a: '  if (!d) return 0;\n  return d.work;\n}', prueba: VOX },
  // El terreno no gasta la herramienta.
  { nombre: 'golpe: el terreno no gasta', fichero: GATHER, de: '    touchedTile = true;\n    const key = `${v.x}', a: '    const key = `${v.x}', prueba: VOX },
  // En preciso, tambien el terreno detras de un objeto.
  { nombre: 'golpe: preciso atraviesa', fichero: GATHER, de: 'tiles.length + beasts.length === 0 ?', a: 'true ?', prueba: VOX },
  // El golpe no llega al terreno (y el humo no lo ve).
  { nombre: 'golpe: sin terreno (humo)', fichero: GATHER, de: '    voxels = swept.voxels;', a: '    voxels = [];', prueba: 'smoke:dig' },
  // Un voxel por rayo, aunque se repita.
  { nombre: 'golpe: repetidos', fichero: 'packages/sim/src/aim.ts', de: "const key = `${ray.voxel.x},${ray.voxel.y},${ray.voxel.z}`;", a: "const key = `${ray.voxel.x},${ray.voxel.y},${ray.voxel.z},${ray.length}`;", prueba: VOX },
  // El terreno no es techo.
  { nombre: 'fisica: sin techo de terreno', fichero: BOXES, de: '      ceiling = Math.min(ceiling, topOf(world.ceilingAbove(vx, vy, start)));\n', a: '', prueba: VOX },
  // El suelo no mira la cabeza: se pisa el techo.
  { nombre: 'fisica: se pisa el techo', fichero: BOXES, de: 'top = Math.max(top, columnTopIn(world, vx, vy, head));', a: 'top = Math.max(top, columnTopIn(world, vx, vy));', prueba: VOX },
  // Un escalon con techo encima se sube.
  { nombre: 'fisica: escalon sin sitio', fichero: 'packages/sim/src/systems/movement.ts', de: '  return ceilingOver(world, cx, cy, half, z) < z + bodyOf(store, id).height - 1e-9;', a: '  return false;', prueba: VOX },
  // Lo que quedo en el aire, sin cara de abajo.
  { nombre: 'malla: sin cara de abajo', fichero: MESH, de: '          if (z >= top || !solid(vx, vy, z)) continue;', a: '          continue;', prueba: MESH_TEST },
  // Sin pared hacia los huecos de la vecina.
  { nombre: 'malla: sin pared al hueco', fichero: MESH, de: '        if (nGone) for (const g of nGone) if (g < from) wall(g);\n', a: '', prueba: MESH_TEST },
  // La variante, por columna y no por voxel.
  { nombre: 'malla: variante por columna', fichero: MESH, de: 'Math.imul(vz * 8 + face, 0x9e3779b1)', a: 'Math.imul(face, 0x9e3779b1)', prueba: MESH_TEST },
  // El terreno roto no se redibuja (humo).
  { nombre: 'malla: sin rehacer (humo)', fichero: 'packages/client/src/main.ts', de: '        if (existing.terrainRevision !== chunk.terrainRevision) rebuildTerrain(existing, chunk);\n', a: '', prueba: 'smoke:dig' },
];
