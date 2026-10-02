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
 * - `test:<fichero>`: un fichero de vitest.
 *
 * Ronda: tanda 2, 7.ª ronda de ajustes (2026-10-02).
 */
export default [
  {
    nombre: 'arranque en perspectiva',
    fichero: 'packages/client/src/camera.ts',
    de: "  projection: Projection = 'primera';",
    a: "  projection: Projection = 'perspectiva';",
    prueba: 'smoke:desktop',
  },
  {
    nombre: 'panel con max-height',
    fichero: 'packages/client/index.html',
    de: '        height: calc(4 * 66px + 3 * 8px + 2px); overflow-y: auto;',
    a: '        max-height: calc(4 * 66px + 3 * 8px + 2px); overflow-y: auto;',
    prueba: 'smoke:stations',
  },
  {
    nombre: 'Esc captura al apoyar',
    fichero: 'packages/client/src/main.ts',
    de: '    escToCapture = true;\n    return;',
    a: '    escToCapture = true;\n    mouseLook.capture();\n    return;',
    prueba: 'smoke:desktop',
  },
  {
    nombre: 'Esc sin red',
    fichero: 'packages/client/src/pointer-lock.ts',
    de: '      if (!this.releasing) this.free = performance.now() < this.softUntil;',
    a: '      if (!this.releasing) this.free = false;',
    prueba: 'smoke:desktop',
  },
  {
    nombre: 'frente sin guardar',
    fichero: 'packages/sim/src/systems/gathering.ts',
    de: '  world.setStationFacing(x, y, facingToward(x, y, px, py));',
    a: '  void facingToward;',
    prueba: 'smoke:stations',
  },
  {
    nombre: 'frente dibujado por hash',
    fichero: 'packages/client/src/main.ts',
    de: 'stations.spawn(feature, wx, wy, ground, seed, state.world.stationFacingAt(wx, wy))',
    a: 'stations.spawn(feature, wx, wy, ground, seed, null)',
    prueba: 'smoke:stations',
  },
  {
    nombre: 'frente del lado contrario',
    fichero: 'packages/sim/src/stations.ts',
    de: '  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 1 : 3;',
    a: '  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 3 : 1;',
    prueba: 'test:tests/stations.test.ts',
  },
  {
    nombre: 'sin tecla I',
    fichero: 'packages/client/src/controls.ts',
    de: "          document.getElementById('hudToggle')?.click();",
    a: '',
    prueba: 'smoke:desktop',
  },
  {
    nombre: 'pausa sin bloquear teclas',
    fichero: 'packages/client/src/main.ts',
    de: "      if (!pauseEl.classList.contains('show')) return;\n      e.stopImmediatePropagation();",
    a: '      return;\n      e.stopImmediatePropagation();',
    prueba: 'smoke:desktop',
  },
  {
    nombre: 'botones toman foco',
    fichero: 'packages/client/src/main.ts',
    de: "  if (e.target instanceof Element && e.target.closest('button')) e.preventDefault();",
    a: '',
    prueba: 'smoke:desktop',
  },
  {
    // Del dia que `slash` entro en la CI: el fallo historico del barrido, que
    // se mandaba dibujar y no se veia. Sin el, la casilla no prueba nada.
    nombre: 'barrido recortado por el frustum',
    fichero: 'packages/client/src/effects-view.ts',
    de: '      mesh.frustumCulled = false;',
    a: '      mesh.frustumCulled = true;',
    prueba: 'slash',
  },
  {
    nombre: 'registro sube',
    fichero: 'packages/client/src/pickup-feed.ts',
    de: '  return -(l.fromTop + FEED_RISE - riseOf(l));',
    a: '  return -(l.fromTop + riseOf(l));',
    prueba: 'smoke:desktop',
  },
];
