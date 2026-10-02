/**
 * Las mutaciones de una ronda, en una sola orden (propuesta del agente,
 * aprobada por el autor el 2026-10-02).
 *
 * Cada comprobacion nueva se ve CAER rompiendo a proposito lo que afirma; si no
 * cae, no comprueba nada. Antes se hacia a mano, cinco pasos por mutacion, y
 * una vez se midio con el build viejo (escape P3). La lista de la ronda vive
 * en `tools/mutaciones.mjs`.
 *
 *   node tools/mutar.mjs --comprobar        # la lista aplica: segundos
 *   node tools/mutar.mjs [nombre…]          # todas, o esas, en serie y en local
 *   node tools/mutar.mjs --matriz           # nombres en JSON, para la CI
 *   node tools/mutar.mjs --solo "<nombre>"  # una: sale en verde si CAE (CI)
 *
 * Lo normal es no correrlas aqui sino en la CI, todas a la vez: se empujan a la
 * rama `pruebas` con `tools/a-pruebas.sh` (`.github/workflows/mutaciones.yml`).
 *
 * Cada mutacion se aplica, se compila si la prueba es de navegador, se corre y
 * se RESTAURA siempre, tambien con Ctrl-C. Y una mutacion cuyo build sale
 * identico al limpio es un error, no un «no cae»: no llego a lo que se mide.
 */

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { aplicar, cayoDeVerdad, motivos, orden, pasadasDelHumo, validar } from './mutar-lib.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DIST = join(ROOT, 'packages/client/dist/index.html');
/** Lo que puede tardar una prueba antes de darla por colgada. */
const LIMITE_MS = 15 * 60 * 1000;

const leer = (fichero) => {
  const ruta = join(ROOT, fichero);
  return existsSync(ruta) ? readFileSync(ruta, 'utf8') : null;
};

const lista = (await import(pathToFileURL(join(ROOT, 'tools/mutaciones.mjs')).href)).default;
const pasadas = pasadasDelHumo(readFileSync(join(ROOT, 'tools/smoke.mjs'), 'utf8'));
const args = process.argv.slice(2);

const errores = validar(lista, leer, pasadas);
if (errores.length > 0) {
  console.error(`La lista de mutaciones no aplica (${errores.length}):`);
  for (const e of errores) console.error(`  - ${e}`);
  process.exit(1);
}

if (args[0] === '--comprobar') {
  console.log(`${lista.length} mutaciones, todas aplican.`);
  process.exit(0);
}
if (args[0] === '--matriz') {
  console.log(JSON.stringify(lista.map((m) => m.nombre)));
  process.exit(0);
}

const solo = args[0] === '--solo';
const nombres = solo ? args.slice(1, 2) : args;
const elegidas = nombres.length ? lista.filter((m) => nombres.includes(m.nombre)) : lista;
const faltan = nombres.filter((n) => !lista.some((m) => m.nombre === n));
if (faltan.length > 0) {
  console.error(`No hay mutaciones con esos nombres: ${faltan.join(', ')}`);
  process.exit(1);
}

function correr(cmd) {
  const r = spawnSync(cmd[0], cmd.slice(1), { cwd: ROOT, encoding: 'utf8', timeout: LIMITE_MS, maxBuffer: 64 << 20 });
  return { codigo: r.status ?? (r.signal ? 124 : 1), salida: `${r.stdout ?? ''}${r.stderr ?? ''}` };
}

function compilar() {
  const r = correr(['npm', 'run', 'build']);
  if (r.codigo !== 0) return { error: `no compila:\n${r.salida.slice(-1200)}` };
  return { huella: createHash('sha1').update(readFileSync(DIST)).digest('hex') };
}

// El fichero tocado ahora mismo, para devolverlo a su sitio pase lo que pase.
let enCurso = null;
const restaurar = () => {
  if (!enCurso) return;
  writeFileSync(enCurso.ruta, enCurso.original);
  enCurso = null;
};
for (const senal of ['SIGINT', 'SIGTERM']) {
  process.on(senal, () => {
    restaurar();
    process.exit(130);
  });
}

const navegador = elegidas.some((m) => orden(m.prueba, pasadas).navegador);
let limpia = null;
if (navegador) {
  const b = compilar();
  if (b.error) {
    console.error(`El arbol sin mutar ${b.error}`);
    process.exit(1);
  }
  limpia = b.huella;
}

const resultados = [];
for (const m of elegidas) {
  const { cmd, navegador: conBuild } = orden(m.prueba, pasadas);
  const ruta = join(ROOT, m.fichero);
  const original = readFileSync(ruta, 'utf8');
  const inicio = Date.now();
  let r;
  enCurso = { ruta, original };
  try {
    writeFileSync(ruta, aplicar(original, m.de, m.a));
    const b = conBuild ? compilar() : {};
    if (b.error) r = { estado: 'ERROR', motivos: [b.error.split('\n')[0]] };
    else if (conBuild && b.huella === limpia) {
      r = { estado: 'ERROR', motivos: ['la mutacion no llego al build: sale identico al limpio'] };
    } else {
      const c = correr(cmd);
      if (c.codigo === 0) {
        r = { estado: 'NO CAE', motivos: ['la prueba paso con la mutacion puesta: no comprueba nada'] };
      } else if (cayoDeVerdad(c.salida, conBuild)) {
        r = { estado: 'CAE', motivos: motivos(c.salida) };
      } else {
        // En rojo, pero sin un FALLO: se rompio por otra cosa (cayoDeVerdad).
        const cola = c.salida.trim().split('\n').slice(-6).map((l) => l.trim());
        r = { estado: 'ERROR', motivos: ['la prueba se rompio sin un FALLO; no se vio morder la comprobacion', ...cola] };
      }
    }
  } finally {
    restaurar();
  }
  r.nombre = m.nombre;
  r.prueba = m.prueba;
  r.segundos = Math.round((Date.now() - inicio) / 1000);
  resultados.push(r);
  console.log(`## ${r.nombre} (${r.prueba}, ${r.segundos} s): ${r.estado}`);
  for (const l of r.motivos) console.log(`   ${l}`);
}

// Que el cliente compilado vuelva a ser el del arbol sin mutar.
if (navegador) compilar();

const malas = resultados.filter((r) => r.estado !== 'CAE');
console.log(`\n${resultados.length - malas.length} de ${resultados.length} caen.`);

if (process.env.GITHUB_STEP_SUMMARY) {
  const filas = resultados.map((r) => `| ${r.nombre} | \`${r.prueba}\` | **${r.estado}** | ${r.motivos.join('<br>').replace(/\|/g, '\\|')} |`);
  appendFileSync(
    process.env.GITHUB_STEP_SUMMARY,
    ['| Mutacion | Prueba | Resultado | Por que |', '|---|---|---|---|', ...filas, ''].join('\n'),
  );
}

process.exit(malas.length === 0 ? 0 : 1);
