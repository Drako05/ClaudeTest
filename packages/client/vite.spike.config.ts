/**
 * Build del spike de 3D, en un unico fichero autocontenido.
 *
 * Va aparte del juego a proposito: el spike es de usar y tirar y **no debe
 * entrar en el build de produccion**. Publicandolo como Artifact propio, la URL
 * del juego que funciona sigue intacta mientras se juzga el experimento.
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
