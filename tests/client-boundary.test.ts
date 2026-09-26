import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * El cliente, entero, cuelga de su entrada.
 *
 * Se recorre el grafo de imports desde `main.ts`, siguiendo solo los relativos
 * —los paquetes del nucleo se cruzan por su nombre y no son del cliente—, y se
 * afirman dos cosas:
 *
 * - **Nada huerfano.** Todo fichero de `src` se alcanza desde la entrada. Un
 *   modulo que nadie importa es un resto: asi se comprobo que al retirar el
 *   isometrico no quedo nada suyo colgando.
 * - **Nada de PixiJS**, que era el motor del isometrico.
 */

const ROOT = resolve(__dirname, '..');
const CLIENT = join(ROOT, 'packages/client/src');
const ENTRY = join(CLIENT, 'main.ts');

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

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? sources(join(dir, e.name)) : e.name.endsWith('.ts') ? [join(dir, e.name)] : [],
  );
}

describe('el cliente cuelga de su entrada', () => {
  const graph = reach(ENTRY);

  it('recorre algo de verdad', () => {
    // Sin esto, un fallo del patron dejaria el grafo en la entrada sola y el
    // test de huerfanos fallaria por el motivo equivocado.
    expect(graph.size).toBeGreaterThan(10);
    expect([...graph.keys()].some((f) => f.endsWith('art.ts'))).toBe(true);
  });

  it('no queda ningun fichero huerfano', () => {
    const orphans = sources(CLIENT).filter((f) => !graph.has(f)).map((f) => relative(ROOT, f));
    expect(orphans).toEqual([]);
  });

  it('no importa pixi.js', () => {
    const users = [...graph].filter(([, specs]) => specs.some((s) => s.startsWith('pixi')));
    expect(users.map(([f]) => relative(ROOT, f))).toEqual([]);
  });
});
