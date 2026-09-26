/**
 * Monta el sitio que se publica en GitHub Pages.
 *
 * El juego en la raiz, tal cual sale de `npm run build`: un HTML autocontenido
 * de una pieza, asi que no tiene rutas que romper.
 *
 * Y **`/3d/` como redireccion a la raiz.** Mientras convivieron los dos
 * clientes, el 3D vivio ahi; el autor lo tiene enlazado y guardado en el
 * telefono, y retirar el isometrico no es motivo para romperle el acceso. La
 * redireccion conserva la consulta y el ancla, para que `/3d/?seed=123` siga
 * abriendo ese mundo.
 *
 * Va en un script y no en el workflow para poder correrlo igual en local: un
 * sitio que solo se sabe montar dentro de CI no se puede comprobar antes de
 * publicarlo.
 */

import { mkdir, readdir, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
/** Lo que sube `upload-pages-artifact`: el `outDir` del cliente. */
const SITE = join(ROOT, 'packages/client/dist');

const REDIRECT = `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <title>Verdant</title>
    <meta http-equiv="refresh" content="0; url=../" />
    <script>location.replace('../' + location.search + location.hash);</script>
  </head>
  <body><a href="../">Verdant se mudo a la raiz</a></body>
</html>
`;

async function main() {
  try {
    await stat(join(SITE, 'index.html'));
  } catch {
    console.error(`Falta ${join(SITE, 'index.html')}. Corre antes: npm run build`);
    process.exit(1);
  }
  await mkdir(join(SITE, '3d'), { recursive: true });
  await writeFile(join(SITE, '3d', 'index.html'), REDIRECT);

  const size = (await stat(join(SITE, 'index.html'))).size;
  console.log(`sitio en ${SITE}`);
  console.log(`  raiz: ${(await readdir(SITE)).join(', ')} (index.html ${size} bytes)`);
  console.log('  /3d/: redireccion a la raiz');
}

main();
