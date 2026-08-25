import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  // Rutas relativas: asi el build funciona igual en la raiz de un dominio que
  // bajo el subdirectorio /<repo>/ de GitHub Pages.
  base: './',
  resolve: {
    alias: {
      '@verdant/sim': fileURLToPath(new URL('../sim/src/index.ts', import.meta.url)),
      '@verdant/shared': fileURLToPath(new URL('../shared/src/index.ts', import.meta.url)),
    },
  },
  build: { outDir: 'dist', emptyOutDir: true, target: 'es2022' },
});
