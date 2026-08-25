/**
 * Build alternativo: todo el juego en un unico index.html autocontenido.
 *
 * Sirve para compartir o jugar el prototipo sin servidor ni despliegue: un solo
 * fichero que se abre y funciona. El build normal (vite.config.ts) sigue siendo
 * el de produccion, con los chunks separados y cacheables.
 */
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  base: './',
  plugins: [viteSingleFile()],
  resolve: {
    alias: {
      '@verdant/sim': fileURLToPath(new URL('./../sim/src/index.ts', import.meta.url)),
      '@verdant/shared': fileURLToPath(new URL('./../shared/src/index.ts', import.meta.url)),
    },
  },
  build: {
    outDir: 'dist-single',
    emptyOutDir: true,
    target: 'es2022',
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
  },
});
