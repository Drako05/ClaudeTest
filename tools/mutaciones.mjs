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
 * Ronda: los iconos a un multiplo entero de su rejilla (2026-10-17).
 */
export default [
  // USAR con su icono a 32 px, como antes: solo se ve en el movil.
  {
    nombre: 'multiplo de 24: USAR a 32 px',
    fichero: 'packages/client/index.html',
    de: '      #use svg { width: 48px; height: 48px; }',
    a: '      #use svg { width: 32px; height: 32px; }',
    prueba: 'smoke:mobile',
  },
  // Las casillas otra vez encogiendo el icono a lo que cabe (la barra de PC
  // lo dejaba en 46).
  {
    nombre: 'multiplo de 24: el icono encoge con la casilla',
    fichero: 'packages/client/index.html',
    de: '      .slot .itemIcon, .slot .equipIcon { flex: none; width: 48px; height: 48px; }',
    a: '      .slot .itemIcon, .slot .equipIcon { flex: none; width: min(48px, 100%); height: min(48px, 100%); }',
    prueba: 'smoke:desktop',
  },
];
