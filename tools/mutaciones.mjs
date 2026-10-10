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
 * Ronda: fisicas, fases A, B y C (2026-10-10): el jugador pisa el terreno con
 * la huella entera, baja cayendo, choca la cabeza y anda con inercia; los
 * animales chocan con todas sus cajas, saltan a su paso y tienen inercia; la
 * camara persigue los ojos con retraso y mira al punto de mira. Y la vista
 * normal de `slash`, que ahora cuenta solo los rumbos con la camara libre.
 */
export default [
  {
    nombre: 'el terreno se mide en el centro',
    fichero: 'packages/sim/src/boxes.ts',
    de: 'if (half <= 0) return [voxelOf(c), voxelOf(c)];',
    a: 'if (half <= 99) return [voxelOf(c), voxelOf(c)];',
    prueba: 'test:tests/body-physics.test.ts',
  },
  {
    nombre: 'una pared bajo la huella sube el cuerpo de golpe',
    fichero: 'packages/sim/src/boxes.ts',
    de: 'return rest > upTo || rest === -Infinity ? z : rest;',
    a: 'return rest === -Infinity ? z : rest;',
    prueba: 'test:tests/body-physics.test.ts',
  },
  {
    nombre: 'bajar medio bloque vuelve a ser de golpe',
    fichero: 'packages/sim/src/systems/jump.ts',
    de: 'if (store.z[id] <= ground + 1e-9) {',
    a: 'if (store.z[id] <= ground + 0.5) {',
    prueba: 'test:tests/body-physics.test.ts',
  },
  {
    nombre: 'sin inercia: la velocidad cambia de golpe',
    fichero: 'packages/sim/src/systems/movement.ts',
    de: 'if (gap <= reach + 1e-9) {',
    a: 'if (gap <= reach + 99) {',
    prueba: 'test:tests/body-physics.test.ts',
  },
  {
    nombre: 'contra una pared se acumula velocidad',
    fichero: 'packages/sim/src/systems/movement.ts',
    de: 'else store.vx[id] = 0;',
    a: 'else void 0;',
    prueba: 'test:tests/body-physics.test.ts',
  },
  {
    nombre: 'la cabeza atraviesa el techo',
    fichero: 'packages/sim/src/systems/jump.ts',
    de: 'if (top > ceiling) {',
    a: 'if (top > ceiling + 99) {',
    prueba: 'test:tests/body-physics.test.ts',
  },
  {
    nombre: 'lo que queda sobre la cabeza estorba de lado',
    fichero: 'packages/sim/src/boxes.ts',
    de: 'b.z0 < head &&',
    a: 'b.z0 < Infinity &&',
    prueba: 'test:tests/body-physics.test.ts',
  },
  {
    nombre: 'las partes del animal no cuentan su altura sobre los pies',
    fichero: 'packages/sim/src/boxes.ts',
    de: 'const lift = p.cz - p.hh - z;',
    a: 'const lift = 0;',
    prueba: 'test:tests/fauna-body.test.ts',
  },
  {
    nombre: 'el animal choca con margen de sobra',
    fichero: 'packages/sim/src/body.ts',
    de: 'if (partsRest(world, [b], feet) > feet + margin + 1e-6) clashes++;',
    a: 'if (partsRest(world, [b], feet) > feet + margin + 99) clashes++;',
    prueba: 'test:tests/fauna-body.test.ts',
  },
  {
    nombre: 'el animal salta con impulso de mas',
    fichero: 'packages/sim/src/systems/movement.ts',
    de: 'if (!rehearseJump(world, store, id, speed, dt, keep)) return false;',
    a: 'if (!rehearseJump(world, store, id, speed * 3, dt, keep)) return false;',
    prueba: 'test:tests/fauna-body.test.ts',
  },
  {
    nombre: 'el animal arranca sin inercia',
    fichero: 'packages/sim/src/systems/movement.ts',
    de: 'const pace = Math.min(speed, before + accel);',
    a: 'const pace = speed;',
    prueba: 'test:tests/fauna-body.test.ts',
  },
  {
    nombre: 'el animal se para en seco al llegar',
    fichero: 'packages/sim/src/systems/movement.ts',
    de: 'before - (speed / INERTIA_TIME) * dt), dt, keep),',
    a: 'before - 99), dt, keep),',
    prueba: 'test:tests/fauna-body.test.ts',
  },
  // Fase C: la camara con retraso, mirando al punto de mira.
  {
    nombre: 'la camara va sin retraso',
    fichero: 'packages/client/src/camera-lag.ts',
    de: 'const k = lag <= 0 || gap > CAMERA_SNAP ? 1 : 1 - Math.exp(-Math.max(0, dt) / lag);',
    a: 'const k = 1;',
    prueba: 'test:tests/camera-lag.test.ts',
  },
  {
    nombre: 'la camara no salta al aparecer lejos',
    fichero: 'packages/client/src/camera-lag.ts',
    de: 'const k = lag <= 0 || gap > CAMERA_SNAP ? 1 :',
    a: 'const k = lag <= 0 ? 1 :',
    prueba: 'test:tests/camera-lag.test.ts',
  },
  {
    nombre: 'la camara mira a sus ojos rezagados, no al punto de mira',
    fichero: 'packages/client/src/camera.ts',
    de: 'camera.lookAt(this.aim);',
    a: 'camera.lookAt(this.eyes);',
    prueba: 'test:tests/camera-lag.test.ts',
  },
  {
    nombre: 'la primera persona mira por su linea, no al punto de mira',
    fichero: 'packages/client/src/camera.ts',
    de: 'this.firstPerson.lookAt(this.aim);',
    a: 'this.firstPerson.lookAt(this.eyes.clone().add(look));',
    prueba: 'test:tests/camera-lag.test.ts',
  },
  {
    nombre: 'el punto de mira sale de los ojos rezagados',
    fichero: 'packages/client/src/camera.ts',
    de: 'const point = aimPoint(target, look,',
    a: 'const point = aimPoint(this.eyes, look,',
    prueba: 'test:tests/camera-lag.test.ts',
  },
  {
    nombre: 'en el juego la camara va sin retraso',
    fichero: 'packages/client/src/main.ts',
    de: '  camera.lag = dev.cameraLag;',
    a: '  camera.lag = 0;',
    prueba: 'smoke:relief',
  },
  // La vista normal de `slash` cuenta solo los rumbos con la camara libre y su
  // suelo baja a 5 pixeles: tiene que seguir cayendo con lo que vigila.
  {
    nombre: 'barrido recortado por el frustum',
    fichero: 'packages/client/src/effects-view.ts',
    de: 'Ocho mallas no valen un recorte.\n      mesh.frustumCulled = false;',
    a: 'Ocho mallas no valen un recorte.\n      mesh.frustumCulled = true;',
    prueba: 'slash',
  },
  {
    nombre: 'el barrido de tercera persona no tiene ancho',
    fichero: 'packages/client/src/effects.ts',
    de: 'export const SLASH_HALF_WIDTH = 0.06;',
    a: 'export const SLASH_HALF_WIDTH = 0;',
    prueba: 'slash',
  },
];
