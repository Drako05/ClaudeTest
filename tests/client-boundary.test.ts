import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * El 3D no alcanza nada del isometrico.
 *
 * Se recorre el grafo de imports desde la entrada del 3D, siguiendo solo los
 * relativos —los paquetes del nucleo se cruzan por su nombre y no son del
 * cliente—, y se afirma que ningun fichero alcanzado es de la lista isometrica
 * ni importa `pixi.js`. Es lo que prueba que el isometrico se puede borrar sin
 * que el 3D se entere.
 */

const ROOT = resolve(__dirname, '..');
const CLIENT = join(ROOT, 'packages/client/src');
const ENTRY = join(CLIENT, 'spike3d/main.ts');

const ISOMETRIC = [
  'main.ts',
  'input.ts',
  'renderer.ts',
  'projection.ts',
  'terrain-draw.ts',
  'relief-faces.ts',
  'biome-edges.ts',
  'tiles.ts',
].map((f) => join(CLIENT, f));

const IMPORT = /(?:import|export)\s[^'"]*?from\s+['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

function reach(entry: string): Map<string, string[]> {
  const seen = new Map<string, string[]>();
  const queue = [entry];
  while (queue.length) {
    const file = queue.pop()!;
    if (seen.has(file)) continue;
    const specs: string[] = [];
    for (const m of readFileSync(file, 'utf8').matchAll(IMPORT)) specs.push(m[1] ?? m[2]);
    seen.set(file, specs);
    for (const spec of specs) {
      if (!spec.startsWith('.')) continue;
      const target = resolve(dirname(file), spec.replace(/\.js$/, '.ts'));
      if (!existsSync(target)) throw new Error(`${relative(ROOT, file)} importa ${spec}, que no existe`);
      queue.push(target);
    }
  }
  return seen;
}

describe('frontera del cliente 3D', () => {
  const graph = reach(ENTRY);

  it('recorre algo de verdad', () => {
    // Sin esto, un fallo del patron dejaria el grafo en la entrada sola y el
    // test pasaria sin comprobar nada.
    expect(graph.size).toBeGreaterThan(8);
    expect([...graph.keys()].some((f) => f.endsWith('art.ts'))).toBe(true);
  });

  it('no alcanza ningun fichero del isometrico', () => {
    const hits = ISOMETRIC.filter((f) => graph.has(f)).map((f) => relative(ROOT, f));
    expect(hits).toEqual([]);
  });

  it('no importa pixi.js', () => {
    const users = [...graph].filter(([, specs]) => specs.some((s) => s.startsWith('pixi')));
    expect(users.map(([f]) => relative(ROOT, f))).toEqual([]);
  });

  it('el propio test ve un import isometrico si lo hay', () => {
    // Contraste: desde la entrada del isometrico el mismo recorrido tiene que
    // encontrarlos. Si no, la comprobacion de arriba no podria fallar.
    const iso = reach(join(CLIENT, 'main.ts'));
    expect(iso.has(join(CLIENT, 'projection.ts'))).toBe(true);
  });
});
