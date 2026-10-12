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
 * Ronda: la vista «de cerca» de `slash` vuelve a tener puerta (2026-10-12,
 * pedido del autor: «si no puede fallar, no tiene sentido la prueba»). Se
 * queda solo si caza algo: los dos fallos del barrido de siempre.
 */
export default [
  // Para lo que se hizo: una esfera envolvente congelada, que cae acercandose
  // y girando.
  {
    nombre: 'barrido recortado por el frustum, de cerca',
    fichero: 'packages/client/src/effects-view.ts',
    de: 'Ocho mallas no valen un recorte.\n      mesh.frustumCulled = false;',
    a: 'Ocho mallas no valen un recorte.\n      mesh.frustumCulled = true;',
    prueba: 'slash:cerca',
  },
  {
    nombre: 'el barrido de tercera persona no tiene ancho, de cerca',
    fichero: 'packages/client/src/effects.ts',
    de: 'export const SLASH_HALF_WIDTH = 0.06;',
    a: 'export const SLASH_HALF_WIDTH = 0;',
    prueba: 'slash:cerca',
  },
];
