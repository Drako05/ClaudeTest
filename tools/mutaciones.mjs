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
 * Ronda: los iconos en pixelart (2026-10-17).
 */
export default [
  // Las casillas sin su icono: vuelven a no decir que hay en ellas.
  {
    nombre: 'iconos: las casillas sin su icono',
    fichero: 'packages/client/src/inventory-ui.ts',
    de: '    el.appendChild(itemIcon(item));\n',
    a: '',
    prueba: 'smoke:desktop',
  },
  // Los ingredientes con solo su «tengo/necesito».
  {
    nombre: 'iconos: los ingredientes sin su icono',
    fichero: 'packages/client/src/inventory-ui.ts',
    de: '        cell.append(itemIcon(input.item), n);',
    a: '        cell.append(n);',
    prueba: 'smoke:desktop',
  },
  // El registro con solo el texto, como antes.
  {
    nombre: 'iconos: el registro sin el icono',
    fichero: 'packages/client/src/main.ts',
    de: "      if (line.item >= 0) el.append(`${amount} `, itemIcon(line.item as Resource), ` ${name.join(' ')}`);",
    a: "      if (line.item >= 0) el.append(`${amount} ${name.join(' ')}`);",
    prueba: 'smoke:desktop',
  },
  // Los botones contados pero sin pintar: los ve la de los botones del movil.
  {
    nombre: 'iconos: los botones sin rellenar',
    fichero: 'packages/client/src/silhouette-icons.ts',
    de: '    el.innerHTML = pixelInner(buttonArt(name));',
    a: '',
    prueba: 'smoke:mobile',
  },
  // La hoja de revision sin los botones.
  {
    nombre: 'iconos: la hoja sin los botones',
    fichero: 'packages/client/src/icon-sheet.ts',
    de: "    { title: 'Botones', tone: 'buttonTone', icons: buttons },",
    a: '',
    prueba: 'smoke:devTools',
  },
  // Un color que la paleta ya no tiene.
  {
    nombre: 'iconos: un pixel fuera de la paleta',
    fichero: 'packages/client/src/item-icons.ts',
    de: "  A: '#e0405f', // base\n",
    a: '',
    prueba: 'test:tests/pixel-icons.test.ts',
  },
  // La madera con un hueco en su contorno.
  {
    nombre: 'iconos: el contorno roto',
    fichero: 'packages/client/src/item-icons.ts',
    de: "'.oefffggggfgabcbbcbco...',",
    a: "'.eefffggggfgabcbbcbco...',",
    prueba: 'test:tests/pixel-icons.test.ts',
  },
];
