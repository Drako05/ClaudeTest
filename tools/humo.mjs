/**
 * Corre a la vez las pruebas de navegador que se le pidan, o todas las de la
 * matriz de la CI, y resume lo que fallo y lo que tardo cada una. En serie
 * eran ~22 minutos (2026-10-24).
 *
 *   node tools/humo.mjs                      # todas
 *   node tools/humo.mjs desktop gestures     # algunas, por su nombre en la matriz
 *   node tools/humo.mjs --sin-build mobile   # sin construir antes
 *   HUMO_A_LA_VEZ=2 node tools/humo.mjs      # cuantas a la vez
 *
 * A la vez por defecto una por cada dos nucleos: cada una lleva su Chromium y
 * dibuja sin GPU. Como las pruebas no dependen de la velocidad de la maquina
 * (`tools/lib/navegador.mjs`), cargarla no cambia lo que dan, solo cuanto
 * tardan. La salida entera de cada una va a `screenshots/humo/<nombre>.log`.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { availableParallelism } from 'node:os';
import { join } from 'node:path';
import { ROOT, comando, construir, correr, enParalelo, fallos, todas } from './lib/pasadas.mjs';

const args = process.argv.slice(2);
const sinBuild = args.includes('--sin-build');
const pedidas = args.filter((a) => !a.startsWith('--'));
const nombres = pedidas.length ? pedidas : todas();
const malas = nombres.filter((n) => !comando(n));
if (malas.length) {
  console.error(`No existen: ${malas.join(', ')}. Las hay: ${todas().join(', ')}`);
  process.exit(1);
}
if (!sinBuild && !(await construir())) process.exit(1);

const aLaVez = Number(process.env.HUMO_A_LA_VEZ) || Math.max(1, Math.floor(availableParallelism() / 2));
const LOGS = join(ROOT, 'screenshots', 'humo');
mkdirSync(LOGS, { recursive: true });
console.log(`${nombres.length} pruebas, ${aLaVez} a la vez`);

const started = Date.now();
const resultados = await enParalelo(nombres, aLaVez, async (nombre) => {
  const r = await correr(nombre);
  writeFileSync(join(LOGS, `${nombre}.log`), r.salida);
  const mal = fallos(r.salida);
  console.log(`  ${r.codigo === 0 ? 'OK   ' : 'FALLA'} ${nombre} (${r.segundos} s)`);
  for (const l of mal) console.log(`        ${l}`);
  return { ...r, mal };
});

const caidas = resultados.filter((r) => r.codigo !== 0);
console.log(`\n${resultados.length - caidas.length} de ${resultados.length} en verde, en ${Math.round((Date.now() - started) / 1000)} s`);
if (caidas.length) {
  console.log(`Fallaron: ${caidas.map((r) => r.nombre).join(', ')} (su salida, en screenshots/humo/)`);
  process.exitCode = 1;
}
