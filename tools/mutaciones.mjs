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
 * Ronda: el golpe que se para, la pala, las menas de voxeles y la rejilla de
 * 0,5 (2026-10-20).
 */
const AIM = 'packages/sim/src/aim.ts';
const WORLD = 'packages/sim/src/world.ts';
const GATHER = 'packages/sim/src/systems/gathering.ts';
const SHARED = 'packages/shared/src/index.ts';
const VOX = 'test:tests/voxel-edit.test.ts';
const ORE = 'test:tests/ore-voxels.test.ts';
const STRIKE = 'test:tests/strike.test.ts';
const STATIONS = 'test:tests/stations.test.ts';
export default [
  // El rayo sigue tras la primera caja: golpea lo de detras.
  { nombre: 'golpe: atraviesa cajas', fichero: AIM, de: 'if (t !== null && t < ray.length) ray = { dir, length: t, voxel: null, tile: { x, y }, body: null };', a: 'if (t !== null && t < ray.length) ray = { dir, length: ray.length, voxel: ray.voxel, tile: { x, y }, body: null };', prueba: STRIKE },
  // Los cuerpos no paran el golpe.
  { nombre: 'golpe: atraviesa cuerpos', fichero: AIM, de: 'if (t !== null && t < ray.length) ray = { dir, length: t, voxel: null, tile: null, body: id };', a: '', prueba: STRIKE },
  // La roca, con pala.
  { nombre: 'pala: la roca con pala', fichero: SHARED, de: '    case Terrain.Rock:\n      return { tool: ToolKind.Pickaxe, tier: 1, work: 3 };', a: '    case Terrain.Rock:\n      return { tool: ToolKind.Shovel, tier: 1, work: 3 };', prueba: VOX },
  // La arena no se rompe.
  { nombre: 'pala: sin arena', fichero: SHARED, de: '    case Terrain.Sand:\n    case Terrain.Grass:', a: '    case Terrain.Grass:', prueba: VOX },
  // Cualquier herramienta rompe cualquier suelo.
  { nombre: 'pala: cualquier herramienta', fichero: GATHER, de: 'const power = stats && stats.kind === need.tool && stats.tier >= need.tier ? stats.power : 0;', a: 'const power = stats ? Math.max(1, stats.power) : 0;', prueba: VOX },
  // El poder no resta.
  { nombre: 'pala: el poder no resta', fichero: GATHER, de: 'const power = stats && stats.kind === need.tool && stats.tier >= need.tier ? stats.power : 0;', a: 'const power = stats && stats.kind === need.tool && stats.tier >= need.tier ? 1 : 0;', prueba: VOX },
  // Sin aviso de pala.
  { nombre: 'pala: sin aviso', fichero: GATHER, de: "need.tool === ToolKind.Shovel ? 'needShovel'", a: "false ? 'needShovel'", prueba: VOX },
  // El carbon suelta de 0 a 1.
  { nombre: 'menas: carbon pobre', fichero: GATHER, de: '(ore === Feature.CoalNode ? 1 : 0)', a: '0', prueba: ORE },
  // La casilla no se vacia con el ultimo voxel.
  { nombre: 'menas: casilla sin vaciar', fichero: GATHER, de: '    if (world.oreFormationAt(tx, ty)?.voxels.length === 0) world.setFeature(tx, ty, Feature.None);\n', a: '', prueba: ORE },
  // El voxel de mena pide lo de la roca.
  { nombre: 'menas: trabajo de roca', fichero: SHARED, de: '  if (ore !== Feature.None) return workOf(ore);', a: '  if (ore === Feature.None - 1) return workOf(ore);', prueba: ORE },
  // Sin el voxel de abajo.
  { nombre: 'menas: sin el de abajo', fichero: 'packages/sim/src/ore-shape.ts', de: '  const out: OreVoxel[] = [[...corner(bottom), -2]];', a: '  const out: OreVoxel[] = [];', prueba: ORE },
  // El nivel de arriba no asoma.
  { nombre: 'menas: no asoma', fichero: 'packages/sim/src/worldgen.ts', de: 'height[col(s)] = Math.max(height[col(s)]!, base + 1);', a: 'height[col(s)] = Math.max(height[col(s)]!, base);', prueba: ORE },
  // El generador puro no ve la mena.
  { nombre: 'menas: generador ciego', fichero: 'packages/sim/src/worldgen.ts', de: '    return Math.max(h, base + 1);', a: '    return h;', prueba: ORE },
  // La mena sigue teniendo caja.
  { nombre: 'menas: con caja', fichero: 'packages/sim/src/boxes.ts', de: ' || !harvestOf(feature) || isOre(feature)) return null;', a: ' || !harvestOf(feature)) return null;', prueba: ORE },
  // Cristales tambien donde la tapa el terreno.
  { nombre: 'menas: cristales enterrados', fichero: 'packages/client/src/ore-mesh.ts', de: 'voxels.some(([a, b, c]) => a === x && b === y && c === z) || covered(x, y, z);', a: 'voxels.some(([a, b, c]) => a === x && b === y && c === z);', prueba: 'test:tests/ore-mesh.test.ts' },
  // Sin flor colgando.
  { nombre: 'menas: sin flor colgando', fichero: 'packages/client/src/ore-mesh.ts', de: '    if (!has(e, s, z - 1)) crowns.push(crown(r, voxel, [cx, z * V, cz], crystals, true));\n', a: '', prueba: 'test:tests/ore-mesh.test.ts' },
  // El terreno dibuja tambien la mena.
  { nombre: 'menas: el terreno las tapa', fichero: 'packages/client/src/terrain-mesh.ts', de: '        if (!solid(vx, vy, z) || solid(vx, vy, z + 1) || ore(z)) return;', a: '        if (!solid(vx, vy, z) || solid(vx, vy, z + 1)) return;', prueba: 'test:tests/terrain-mesh.test.ts' },
  // La caja de la estacion no se corre.
  { nombre: 'rejilla: caja sin correr', fichero: 'packages/sim/src/boxes.ts', de: '  const cx = tx + 0.5 + ox;', a: '  const cx = tx + 0.5;\n  void ox;', prueba: STATIONS },
  // Lo que pisa no queda cubierto.
  { nombre: 'rejilla: sin cubrir', fichero: WORLD, de: '      if (cx !== tx || cy !== ty) this.covered.set(`${cx},${cy}`, key);\n', a: '', prueba: STATIONS },
  // Se pone sobre un objeto de una casilla que pisa.
  { nombre: 'rejilla: pisa objetos', fichero: GATHER, de: '    if (world.featureAt(tx, ty) !== Feature.None || world.isCovered(tx, ty)) return null;', a: '    if (world.isCovered(tx, ty)) return null;', prueba: STATIONS },
  // La caja corrida no se busca en la casilla de al lado.
  { nombre: 'rejilla: sin margen', fichero: 'packages/sim/src/boxes.ts', de: 'const SHIFT = 0.5;', a: 'const SHIFT = 0;', prueba: STATIONS },
  // Siempre en la rejilla de casillas.
  { nombre: 'rejilla: de casillas', fichero: GATHER, de: '  const snap = (v: number) => Math.round(v / VOXEL) * VOXEL;', a: '  const snap = (v: number) => Math.round(v - 0.5) + 0.5;', prueba: STATIONS },
  // A mano rompe la roca (humo).
  { nombre: 'pala: a mano (humo)', fichero: GATHER, de: 'const power = stats && stats.kind === need.tool && stats.tier >= need.tier ? stats.power : 0;', a: 'const power = 1;', prueba: 'smoke:dig' },
];
