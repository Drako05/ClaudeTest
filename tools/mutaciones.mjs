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
 * Ronda: las correcciones a los iconos (2026-10-17): fabricar N, el mantener
 * de 1 s, la durabilidad, las categorias con icono y los botones cuadrados.
 */
export default [
  // El + sin tope: sigue habilitado pasado lo que alcanza.
  {
    nombre: 'correcciones: el + sin tope',
    fichero: 'packages/client/src/inventory-ui.ts',
    de: '      more.disabled = !stacks || times >= most;',
    a: '      more.disabled = !stacks;',
    prueba: 'smoke:stations',
  },
  // El nucleo fabrica una aunque se pidan N.
  {
    nombre: 'correcciones: fabricar una aunque se pidan N',
    fichero: 'packages/sim/src/tick.ts',
    de: 'craftNear(world, entities, playerId, inventory, intent.craft, intent.craftTimes)',
    a: 'craftNear(world, entities, playerId, inventory, intent.craft)',
    prueba: 'smoke:stations',
  },
  // tryCraft no multiplica: lo mira el test.
  {
    nombre: 'correcciones: tryCraft ignora las veces',
    fichero: 'packages/sim/src/systems/gathering.ts',
    de: '  const n = Math.floor(times);',
    a: '  const n = 1;',
    prueba: 'test:tests/craft-times.test.ts',
  },
  // El tope sin mirar el sitio.
  {
    nombre: 'correcciones: el tope no mira el sitio',
    fichero: 'packages/sim/src/systems/gathering.ts',
    de: '  while (n > 0 && !fits(n)) n--;',
    a: '',
    prueba: 'test:tests/craft-times.test.ts',
  },
  // La barra de desgaste tambien con la herramienta entera.
  {
    nombre: 'correcciones: la barra a desgaste entero',
    fichero: 'packages/client/src/inventory-ui.ts',
    de: '      if (wear >= tool.uses) {',
    a: '      if (false) {',
    prueba: 'smoke:stations',
  },
  // El mantener otra vez de 1,5 s.
  {
    nombre: 'correcciones: mantener 1,5 s',
    fichero: 'packages/client/src/inventory-ui.ts',
    de: 'export const CRAFT_HOLD_MS = 1000;',
    a: 'export const CRAFT_HOLD_MS = 1500;',
    prueba: 'smoke:stations',
  },
  // Las categorias con su nombre escrito, sin icono.
  {
    nombre: 'correcciones: las categorias sin icono',
    fichero: 'packages/client/src/inventory-ui.ts',
    de: "        if (art) tab.appendChild(pixelIcon(art, 'catIcon'));",
    a: '        if (art) tab.textContent = cat;',
    prueba: 'smoke:stations',
  },
  // Los botones redondos otra vez.
  {
    nombre: 'correcciones: los botones redondos',
    fichero: 'packages/client/index.html',
    de: '      #proj, #thumbPad button, .round { border-radius: 12px; }',
    a: '      #proj, #thumbPad button, .round { border-radius: 50%; }',
    prueba: 'smoke:desktop',
  },
  // El arco de antes: con cajas, sus esquinas se pisan.
  {
    nombre: 'correcciones: el arco de 84 con botones cuadrados',
    fichero: 'packages/client/index.html',
    de: '      :root { --modeb: 44px; --arc: 102px; }',
    a: '      :root { --modeb: 44px; --arc: 84px; }',
    prueba: 'smoke:mobile',
  },
  // Auditoria: un color que ya no usa nadie, en la paleta.
  {
    nombre: 'auditoria: un color huerfano en la paleta',
    fichero: 'packages/client/src/item-icons.ts',
    de: "  o: '#1d1a26', // contorno\n",
    a: "  o: '#1d1a26', // contorno\n  '#': '#ff00ff',\n",
    prueba: 'test:tests/pixel-icons.test.ts',
  },
];
