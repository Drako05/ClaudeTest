/**
 * Build del cliente 3D, en un unico fichero autocontenido.
 *
 * Va aparte del isometrico a proposito, y ya no porque esto fuera un
 * experimento: son **dos clientes del mismo juego** conviviendo mientras dure
 * la migracion, cada uno con su entrada y su bundle. `npm run build:pages` los
 * publica juntos — el isometrico en la raiz y este en `/3d/`.
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
    outDir: 'dist-spike',
    emptyOutDir: true,
    target: 'es2022',
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
    rollupOptions: { input: fileURLToPath(new URL('./spike3d.html', import.meta.url)) },
  },
});
