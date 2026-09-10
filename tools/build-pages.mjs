/**
 * Monta el sitio que se publica en GitHub Pages.
 *
 * Dos juegos, no uno: el **isometrico en la raiz**, que es el que funciona, y el
 * **3D en `/3d/`**. El giro a 3D ya esta decidido (`docs/pendiente.md`) pero la
 * migracion no esta hecha, asi que sustituir uno por otro dejaria sin URL al
 * unico juego completo que hay. Cuando la migracion termine, esto se queda en
 * una sola linea.
 *
 * El 3D es un HTML autocontenido de una pieza —`vite.spike.config.ts` lo inlina
 * todo—, asi que colgarlo de un subdirectorio no le rompe ninguna ruta. Por eso
 * aqui solo hay una copia y no un segundo build con otra `base`.
 *
 * Va en un script y no en tres lineas del workflow para poder correrlo igual en
 * local: un sitio que solo se sabe montar dentro de CI no se puede comprobar
 * antes de publicarlo.
 */

import { cp, mkdir, readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
/** Lo que sube `upload-pages-artifact`. Es el `outDir` del juego isometrico. */
const SITE = join(ROOT, 'packages/client/dist');
const SPIKE = join(ROOT, 'packages/client/dist-spike/spike3d.html');
const THREE_D = join(SITE, '3d');

async function main() {
  // Ambos builds tienen que haber corrido antes: `npm run build` vacia `dist`,
  // asi que copiar el 3D primero seria copiarlo para nada.
  await assertExists(join(SITE, 'index.html'), 'npm run build');
  await assertExists(SPIKE, 'npm run spike');

  await mkdir(THREE_D, { recursive: true });
  // Como `index.html`, para que la URL sea `/3d/` y no `/3d/spike3d.html`.
  await cp(SPIKE, join(THREE_D, 'index.html'));

  const entries = await readdir(SITE);
  console.log(`sitio en ${SITE}`);
  console.log(`  raiz: ${entries.filter((e) => e !== '3d').join(', ')}`);
  console.log(`  /3d/: index.html (${(await stat(SPIKE)).size} bytes)`);
}

async function assertExists(path, howToBuild) {
  try {
    await stat(path);
  } catch {
    console.error(`Falta ${path}. Corre antes: ${howToBuild}`);
    process.exit(1);
  }
}

main();
