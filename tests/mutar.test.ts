/**
 * Lo puro de las mutaciones (`tools/mutar-lib.mjs`): una lista que no aplica
 * tiene que decirlo antes de gastar una tanda de CI, y una prueba mal escrita
 * no puede convertirse en una orden que pasa sin probar nada.
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
// @ts-expect-error: modulo de las herramientas, en JavaScript.
import { aplicar, cayoDeVerdad, motivos, orden, pasadasDelHumo, validar } from '../tools/mutar-lib.mjs';

const PASADAS = ['desktop', 'resources', 'stations', 'mobile'];

describe('Aplicar una mutacion', () => {
  it('cambia el texto, una sola vez y tal cual (sin interpretar $)', () => {
    expect(aplicar('a = 1;\nb = 2;', 'b = 2;', 'b = $1;')).toBe('a = 1;\nb = $1;');
  });

  it('si el texto no aparece, o aparece dos veces, es error', () => {
    expect(() => aplicar('a = 1;', 'b = 2;', 'x')).toThrow(/no aparece/);
    expect(() => aplicar('x; x;', 'x;', 'y;')).toThrow(/2 veces/);
  });

  it('una mutacion que no cambia nada es error', () => {
    expect(() => aplicar('a = 1;', 'a = 1;', 'a = 1;')).toThrow(/iguales/);
  });
});

describe('La prueba de cada mutacion', () => {
  it('cada tipo da su orden, y solo el navegador pide compilar', () => {
    expect(orden('smoke:desk', PASADAS)).toEqual({ cmd: ['node', 'tools/smoke.mjs', 'desk'], navegador: true });
    expect(orden('gestures', PASADAS).navegador).toBe(true);
    expect(orden('slash', PASADAS).cmd).toEqual(['node', 'tools/slash.mjs']);
    expect(orden('slash:baja', PASADAS)).toEqual({ cmd: ['node', 'tools/slash.mjs', 'baja'], navegador: true });
    expect(orden('test:tests/x.test.ts', PASADAS)).toEqual({
      cmd: ['npx', 'vitest', 'run', 'tests/x.test.ts'],
      navegador: false,
    });
  });

  it('una pasada que no existe o una prueba desconocida son error', () => {
    expect(() => orden('smoke:nada', PASADAS)).toThrow(/no hay pasada/);
    expect(() => orden('smoke:', PASADAS)).toThrow(/no hay pasada/);
    expect(() => orden('humo', PASADAS)).toThrow(/desconocida/);
    expect(() => orden('test:', PASADAS)).toThrow(/sin fichero/);
    // Por nombre exacto, no por prefijo: `slash:` a secas no puede ser «todas».
    expect(() => orden('slash:nada', PASADAS)).toThrow(/no hay parte/);
    expect(() => orden('slash:', PASADAS)).toThrow(/no hay parte/);
  });

  it('las pasadas se leen del propio humo', () => {
    expect(pasadasDelHumo('const passes = { desktopPass, lifePass };')).toEqual(['desktop', 'life']);
    const humo = pasadasDelHumo(readFileSync(new URL('../tools/smoke.mjs', import.meta.url), 'utf8'));
    expect(humo).toContain('desktop');
    expect(humo).toContain('highRefresh');
  });
});

describe('Validar la lista', () => {
  const ficheros: Record<string, string> = { 'a.ts': 'const x = 1;\n' };
  const leer = (f: string) => ficheros[f] ?? null;
  const buena = { nombre: 'x', fichero: 'a.ts', de: 'x = 1', a: 'x = 2', prueba: 'smoke:desktop' };

  it('una lista que aplica no da errores', () => {
    expect(validar([buena], leer, PASADAS)).toEqual([]);
  });

  it('cada fallo dice de que mutacion es', () => {
    const errores = validar(
      [
        buena,
        { ...buena },
        { ...buena, nombre: 'y', fichero: 'b.ts' },
        { ...buena, nombre: 'z', de: 'x = 9' },
        { ...buena, nombre: 'w', prueba: 'smoke:nada' },
      ],
      leer,
      PASADAS,
    );
    expect(errores).toHaveLength(4);
    expect(errores[0]).toMatch(/«x».*repetido/);
    expect(errores[1]).toMatch(/«y».*no existe/);
    expect(errores[2]).toMatch(/«z».*no aparece/);
    expect(errores[3]).toMatch(/«w».*no hay pasada/);
  });

  it('la lista de la ronda aplica sobre el arbol de hoy', async () => {
    // @ts-expect-error: modulo de las herramientas, en JavaScript.
    const lista = (await import('../tools/mutaciones.mjs')).default;
    const raiz = new URL('../', import.meta.url);
    const leerDeVerdad = (f: string) => {
      try {
        return readFileSync(new URL(f, raiz), 'utf8');
      } catch {
        return null;
      }
    };
    const humo = pasadasDelHumo(readFileSync(new URL('../tools/smoke.mjs', import.meta.url), 'utf8'));
    expect(validar(lista, leerDeVerdad, humo)).toEqual([]);
  });
});

describe('Por que cayo', () => {
  it('cae de verdad solo si la comprobacion lo dice, no si la prueba revienta', () => {
    expect(cayoDeVerdad('  FALLO: no se arranca en primera persona', true)).toBe(true);
    // Lo que paso la primera vez en la CI: `slash` sin su carpeta de capturas.
    expect(cayoDeVerdad("Error: ENOENT: no such file or directory, open 'screenshots/slash.png'", true)).toBe(false);
    expect(cayoDeVerdad(' × un test\nAssertionError: expected 1 to be 3', false)).toBe(true);
    expect(cayoDeVerdad('SyntaxError: Unexpected token', false)).toBe(false);
  });

  it('se queda con los FALLO del humo y los fallos de vitest', () => {
    const salida = 'ok\n  FALLO: no se arranca en primera persona\nnada\n × un test\n FAIL tests/x.test.ts\n';
    expect(motivos(salida)).toEqual(['FALLO: no se arranca en primera persona', '× un test', 'FAIL tests/x.test.ts']);
  });
});
