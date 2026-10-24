/**
 * Limite de un test que simula mucho tiempo de juego (dias de hambre, el
 * rebrote, la fauna de un mundo de verdad): tarda 20-35 s, y siempre tardo
 * eso. Vitest 2 no hacia caer un test sincrono que pasara de sus 5 s; vitest 5
 * si (2026-10-24). Solo lo llevan esos tests: los demas siguen con 5 s, y uno
 * que se cuelgue sigue cayendo.
 */
export const LARGO = 60_000;
