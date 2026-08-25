/**
 * Convierte el build de un solo fichero en un fragmento publicable como Artifact.
 *
 * El sistema de Artifacts envuelve el contenido en su propio esqueleto
 * <!doctype html><head></head><body>, asi que hay que entregar el contenido
 * pelado: nada de doctype, html, head ni body propios. Ademas el <title> tiene
 * que quedar dentro de los primeros 8 KB, de ahi que se emita antes que el
 * script de medio megabyte.
 *
 *   npm run build:single && node tools/make-artifact.mjs
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = fileURLToPath(new URL('../packages/client/dist-single/index.html', import.meta.url));
const OUT = fileURLToPath(new URL('../packages/client/dist-single/artifact.html', import.meta.url));

const html = await readFile(SRC, 'utf8');

function between(source, open, close) {
  const start = source.indexOf(open);
  const end = source.indexOf(close);
  if (start === -1 || end === -1) throw new Error(`No se encontro ${open}...${close}`);
  return source.slice(start + open.length, end);
}

const head = between(html, '<head>', '</head>');
const body = between(html, '<body>', '</body>');

// Del head solo interesan los estilos y el script; los meta los pone el host.
const styles = [...head.matchAll(/<style>[\s\S]*?<\/style>/g)].map((m) => m[0]).join('\n');
const scripts = [...head.matchAll(/<script[\s\S]*?<\/script>/g)].map((m) => m[0]).join('\n');

if (!styles) throw new Error('No se encontraron estilos en el head');
if (!scripts) throw new Error('No se encontro el script del juego en el head');

// Nombre corto: el titulo identifica la pagina, no la describe.
const out = ['<title>Verdant</title>', styles, body.trim(), scripts].join('\n');

await mkdir(dirname(OUT), { recursive: true });
await writeFile(OUT, out, 'utf8');

console.log(`artifact.html escrito: ${(out.length / 1024).toFixed(0)} KB`);
for (const tag of ['<!doctype', '<html', '<head', '<body']) {
  if (out.toLowerCase().includes(tag)) throw new Error(`El fragmento contiene ${tag}, no debe`);
}
console.log('sin etiquetas envolventes: OK');
