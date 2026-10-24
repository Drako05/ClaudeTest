import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@verdant/sim': fileURLToPath(new URL('./packages/sim/src/index.ts', import.meta.url)),
      '@verdant/shared': fileURLToPath(new URL('./packages/shared/src/index.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // Hay tests que simulan dias de juego y tardan 20-60 s, segun la maquina.
    // Vitest 2 no hacia caer un test sincrono que pasara de su limite;
    // vitest 5 si (2026-10-24). Y en un test sincrono el limite no corta un
    // cuelgue —el bucle bloquea igual—, asi que solo haria caer los lentos.
    testTimeout: 120_000,
  },
});
