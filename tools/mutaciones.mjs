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
 * Ronda: la auditoria al cerrar los iconos en pixelart (2026-10-17).
 */
export default [
  // El registro con solo el texto: la comprobacion se mudo al observador que
  // ve nacer la linea.
  {
    nombre: 'auditoria: el registro sin el icono, visto al nacer',
    fichero: 'packages/client/src/main.ts',
    de: "      if (line.item >= 0) el.append(`${amount} `, itemIcon(line.item as Resource), ` ${name.join(' ')}`);",
    a: "      if (line.item >= 0) el.append(`${amount} ${name.join(' ')}`);",
    prueba: 'smoke:desktop',
  },
  // La pupila grande, encogida otra vez debajo de la mira.
  {
    nombre: 'auditoria: la pupila grande en primera persona',
    fichero: 'packages/client/index.html',
    de: '      #proj.fp .eye-pupil { display: none; }',
    a: '      #proj.fp .eye-pupil { transform: scale(.55); transform-origin: 12px 12px; }',
    prueba: 'smoke:desktop',
  },
];
