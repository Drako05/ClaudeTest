/**
 * Build del cliente, en un unico fichero autocontenido.
 *
 * Todo inlinado en `dist/index.html`: se abre y funciona, sin rutas que se
 * rompan al colgarlo de un subdirectorio como el de GitHub Pages.
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
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2022',
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
    rollupOptions: { input: fileURLToPath(new URL('./index.html', import.meta.url)) },
  },
});
