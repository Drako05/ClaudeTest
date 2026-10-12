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
 * Ronda: la camara sin tirones (2026-10-12). Fuera el retraso de la fase C;
 * el dibujo se interpola entre ticks y la camara sube el escalon en una curva
 * (`smooth.ts`). Lo que hay que ver: que el humo note que no se interpola, que
 * la camara sube el escalon de golpe o se hunde al subirlo, y que los tests
 * del modulo puro muerden su curva.
 */
export default [
  // Sin interpolar: a 144 Hz, en los fotogramas sin tick, la camara no se mueve.
  {
    nombre: 'el dibujo no se interpola entre ticks',
    fichero: 'packages/client/src/main.ts',
    de: '  const alpha = accumulator / TICK_DT;',
    a: '  const alpha = 1;',
    prueba: 'smoke:highRefresh',
  },
  // Sin el desfase: la camara sube el escalon de golpe con el cuerpo.
  {
    nombre: 'la camara sube el escalon de golpe',
    fichero: 'packages/client/src/main.ts',
    de: '  camera.follow(px, ph + stepCam.offset, py, w, h,',
    a: '  camera.follow(px, ph, py, w, h,',
    prueba: 'smoke:relief',
  },
  // Sin `lift`: se interpola la subida Y se queda abajo, y la camara se hunde.
  {
    nombre: 'la subida del escalon se interpola',
    fichero: 'packages/client/src/main.ts',
    de: '    if (lifted) interp.lift(pid, lifted);',
    a: '    if (lifted) interp.lift(pid, 0);',
    prueba: 'smoke:relief',
  },
  // El mismo `lift`, en el modulo puro y su test.
  {
    nombre: 'lift no sube lo de antes',
    fichero: 'packages/client/src/smooth.ts',
    de: '    if (p) p.z += dz;',
    a: '    if (p) p.z += 0;',
    prueba: 'test:tests/smooth.test.ts',
  },
  // Un muelle tres veces mas blando: a los 0,1 s no ha subido.
  {
    nombre: 'el escalon tarda en subir',
    fichero: 'packages/client/src/smooth.ts',
    de: 'const SETTLE = 4.744;',
    a: 'const SETTLE = 1.5;',
    prueba: 'smoke:relief',
  },
  // La exponencial simple de la primera version: un tiron en el primer fotograma.
  {
    nombre: 'el escalon arranca de golpe',
    fichero: 'packages/client/src/smooth.ts',
    de: '    this.offset = (this.offset + carry * t) * decay;',
    a: '    this.offset = this.offset * Math.exp((-3 * t) / time);',
    prueba: 'test:tests/smooth.test.ts',
  },
];
