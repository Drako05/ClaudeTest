/**
 * Que una prueba no dependa de la velocidad de la maquina (el autor,
 * 2026-10-24): la corre dos veces, una normal y otra con la CPU del navegador
 * frenada (`SMOKE_LENTO`, por defecto 4 veces), y compara lo que imprimen
 * linea a linea —sus `FALLO` y sus numeros—. Si algo cambia, lo senala.
 *
 *   node tools/determinismo.mjs desktop gestures   # por su nombre en la matriz
 *   node tools/determinismo.mjs                    # todas (tarda)
 *   DETERMINISMO_LENTO=6 node tools/determinismo.mjs mobile
 *
 * No se comparan lo que solo dice cuanto tardo: la duracion de cada pasada y
 * el puerto del servidor. No construye: se corre tras `npm run build` o
 * `tools/humo.mjs`.
 */

import { availableParallelism } from 'node:os';
import { comando, correr, enParalelo, todas } from './lib/pasadas.mjs';

const pedidas = process.argv.slice(2);
const nombres = pedidas.length ? pedidas : todas();
const malas = nombres.filter((n) => !comando(n));
if (malas.length) {
  console.error(`No existen: ${malas.join(', ')}. Las hay: ${todas().join(', ')}`);
  process.exit(1);
}
const lento = String(Number(process.env.DETERMINISMO_LENTO) || 4);
const aLaVez = Math.max(1, Math.floor(availableParallelism() / 2));

/** Lo que imprime, sin lo que solo mide el tiempo. */
const limpia = (salida) =>
  salida
    .split('\n')
    .map((l) => l.trimEnd())
    .filter((l) => l && !/^\s*\(\w+: \d+ s, reloj/.test(l) && !/^probando http/.test(l));

const tareas = nombres.flatMap((n) => [{ n, env: {} }, { n, env: { SMOKE_LENTO: lento } }]);
const salidas = await enParalelo(tareas, aLaVez, ({ n, env }) => correr(n, env));

let distintas = 0;
for (let i = 0; i < nombres.length; i++) {
  const [normal, frenada] = [salidas[2 * i], salidas[2 * i + 1]];
  const a = limpia(normal.salida);
  const b = limpia(frenada.salida);
  const diff = [];
  for (let k = 0; k < Math.max(a.length, b.length); k++) {
    if (a[k] !== b[k]) diff.push(`    normal: ${a[k] ?? '(nada)'}\n    ${lento}x lento: ${b[k] ?? '(nada)'}`);
  }
  const igual = diff.length === 0 && normal.codigo === frenada.codigo;
  if (!igual) distintas++;
  console.log(`  ${igual ? 'IGUAL ' : 'CAMBIA'} ${nombres[i]} (${normal.segundos} s normal, ${frenada.segundos} s a ${lento}x lento)`);
  for (const d of diff.slice(0, 8)) console.log(d);
  if (diff.length > 8) console.log(`    ... y ${diff.length - 8} lineas mas`);
}
console.log(`\n${nombres.length - distintas} de ${nombres.length} dan lo mismo a ${lento}x lento`);
if (distintas) process.exitCode = 1;
