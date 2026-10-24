/**
 * Las pruebas de navegador que hay, con el mismo nombre que su casilla en la
 * matriz de la CI (`.github/workflows/ci.yml`): cada pasada del humo, `gestures`
 * y cada parte del barrido como `slash-<parte>`. Y como se lanza cada una, y
 * como se corren varias a la vez. Lo usan `tools/humo.mjs` y
 * `tools/determinismo.mjs`.
 */

import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { pasadasDelHumo } from '../mutar-lib.mjs';
import { SLASH_PARTS } from '../slash-partes.mjs';

export const ROOT = fileURLToPath(new URL('../../', import.meta.url));

/** Todas, en el orden de la matriz. */
export function todas() {
  const smoke = readFileSync(new URL('../smoke.mjs', import.meta.url), 'utf8');
  return [...pasadasDelHumo(smoke), 'gestures', ...SLASH_PARTS.map((p) => `slash-${p}`)];
}

/** El comando de una, o `null` si no existe. */
export function comando(nombre) {
  if (nombre === 'gestures') return ['node', 'tools/gestures.mjs'];
  if (nombre.startsWith('slash-')) {
    const parte = nombre.slice('slash-'.length);
    return SLASH_PARTS.includes(parte) ? ['node', 'tools/slash.mjs', parte] : null;
  }
  return todas().includes(nombre) ? ['node', 'tools/smoke.mjs', nombre] : null;
}

/** Corre una y devuelve su salida entera, su codigo y lo que tardo. */
export function correr(nombre, env = {}) {
  const [cmd, ...args] = comando(nombre);
  const started = Date.now();
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { cwd: ROOT, env: { ...process.env, ...env } });
    let salida = '';
    child.stdout.on('data', (d) => (salida += d));
    child.stderr.on('data', (d) => (salida += d));
    child.on('close', (codigo) => resolve({ nombre, codigo: codigo ?? 1, salida, segundos: Math.round((Date.now() - started) / 1000) }));
  });
}

/** Corre las tareas de `hacer` de `cuantas` en `cuantas`, en el orden dado. */
export async function enParalelo(tareas, cuantas, hacer) {
  const resultados = new Array(tareas.length);
  let siguiente = 0;
  const obrero = async () => {
    while (siguiente < tareas.length) {
      const i = siguiente++;
      resultados[i] = await hacer(tareas[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(cuantas, tareas.length) }, obrero));
  return resultados;
}

/** Las lineas que dicen que algo fallo. */
export const fallos = (salida) => salida.split('\n').filter((l) => /FALLO|EXCEPCION|Error:/.test(l)).map((l) => l.trim());

/** Construye el cliente, que es lo que prueban todas. */
export function construir() {
  return new Promise((resolve) => {
    // Como una sola orden: en Windows `npm` es un `.cmd` y va por la shell.
    const child = spawn('npm run build', { cwd: ROOT, shell: true, stdio: 'inherit' });
    child.on('close', (codigo) => resolve(codigo === 0));
  });
}
