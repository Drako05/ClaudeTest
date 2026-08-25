import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const SIM_SRC = fileURLToPath(new URL('../packages/sim/src', import.meta.url));

/**
 * Este test es el guardian de la decision de arquitectura mas importante del
 * proyecto: el nucleo de simulacion no puede depender del navegador. Si se
 * rompe, se pierden de golpe el servidor autoritativo, el port nativo y la
 * posibilidad de testear headless. Falla ruidosamente a proposito.
 */
const FORBIDDEN = [
  /\bwindow\b/,
  /\bdocument\b/,
  /\bnavigator\b/,
  /\brequestAnimationFrame\b/,
  /\bHTMLCanvasElement\b/,
  /\bMath\s*\.\s*random\b/,
  /from\s+['"]pixi\.js['"]/,
];

function tsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...tsFiles(full));
    else if (entry.endsWith('.ts')) out.push(full);
  }
  return out;
}

/** Quita comentarios: solo interesa el codigo real, no lo que digan los docs. */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

describe('pureza del nucleo de simulacion', () => {
  const files = tsFiles(SIM_SRC);

  it('encuentra los ficheros del nucleo', () => {
    expect(files.length).toBeGreaterThan(5);
  });

  it.each(files)('%s no referencia el navegador ni Math.random', (file) => {
    const code = stripComments(readFileSync(file, 'utf8'));
    for (const pattern of FORBIDDEN) {
      expect(code, `${file} viola la regla ${pattern}`).not.toMatch(pattern);
    }
  });
});
