/**
 * API publica del nucleo de simulacion.
 *
 * INVARIANTE DEL PROYECTO: nada bajo packages/sim puede tocar el DOM, canvas,
 * WebGL, PixiJS ni Math.random. Este modulo debe poder ejecutarse tal cual en
 * Node (servidor autoritativo y tests) y en el navegador. Hay un test que
 * verifica esto automaticamente y falla si alguien rompe la regla.
 */

export * from './rng.js';
export * from './worldgen.js';
export * from './world.js';
export * from './entities.js';
export * from './tick.js';
export * from './debug.js';
export * from './systems/movement.js';
export * from './systems/survival.js';
export * from './systems/gathering.js';
