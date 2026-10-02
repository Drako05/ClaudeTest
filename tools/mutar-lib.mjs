/**
 * Lo puro de las mutaciones (`tools/mutar.mjs`): aplicar una, validar la lista
 * y traducir su `prueba` a una orden. Sin tocar disco ni lanzar nada, para
 * afirmarlo en Node (`tests/mutar.test.ts`).
 *
 * Una mutacion es romper a proposito lo que una comprobacion afirma y mirar
 * que la comprobacion CAE. Si no cae, no comprueba nada (lente B de la
 * auditoria). Cada ronda escribe las suyas en `tools/mutaciones.mjs`.
 */

/**
 * El texto con la mutacion puesta. `de` tiene que aparecer EXACTAMENTE una
 * vez: si no aparece, la lista se quedo vieja; si aparece mas, no se sabe
 * cual se rompe.
 */
export function aplicar(texto, de, a) {
  if (!de) throw new Error('`de` esta vacio');
  if (de === a) throw new Error('`de` y `a` son iguales: no rompe nada');
  const veces = texto.split(de).length - 1;
  if (veces === 0) throw new Error('`de` no aparece en el fichero');
  if (veces > 1) throw new Error(`\`de\` aparece ${veces} veces; tiene que ser unico`);
  return texto.replace(de, () => a);
}

/** Las pasadas del humo, leidas de `tools/smoke.mjs` (`const passes = { … }`). */
export function pasadasDelHumo(smoke) {
  const m = /const passes = \{([^}]*)\}/.exec(smoke);
  if (!m) return [];
  return m[1].split(',').map((s) => s.trim().replace(/Pass$/, '')).filter(Boolean);
}

/**
 * La orden de una `prueba`, y si necesita el cliente compilado:
 * - `smoke:<pasada>`: una pasada del humo, por el prefijo de su nombre;
 * - `gestures` y `slash`: sus herramientas;
 * - `test:<fichero>`: un fichero de vitest, sin navegador.
 */
export function orden(prueba, pasadas) {
  if (typeof prueba !== 'string') throw new Error('falta `prueba`');
  if (prueba.startsWith('smoke:')) {
    const pasada = prueba.slice('smoke:'.length);
    if (!pasada || !pasadas.some((p) => p.startsWith(pasada))) {
      throw new Error(`no hay pasada del humo que empiece por «${pasada}»; hay: ${pasadas.join(', ')}`);
    }
    return { cmd: ['node', 'tools/smoke.mjs', pasada], navegador: true };
  }
  if (prueba === 'gestures') return { cmd: ['node', 'tools/gestures.mjs'], navegador: true };
  if (prueba === 'slash') return { cmd: ['node', 'tools/slash.mjs'], navegador: true };
  if (prueba.startsWith('test:')) {
    const fichero = prueba.slice('test:'.length);
    if (!fichero) throw new Error('`test:` sin fichero');
    return { cmd: ['npx', 'vitest', 'run', fichero], navegador: false };
  }
  throw new Error(`prueba desconocida «${prueba}»: smoke:<pasada>, gestures, slash o test:<fichero>`);
}

/**
 * Los errores de la lista entera, vacia si esta bien. `leer(fichero)` da su
 * texto o `null` si no existe. Cada error dice de que mutacion es.
 */
export function validar(lista, leer, pasadas) {
  const errores = [];
  if (!Array.isArray(lista)) return ['`tools/mutaciones.mjs` no exporta una lista'];
  const vistos = new Set();
  lista.forEach((m, i) => {
    const quien = m?.nombre ? `«${m.nombre}»` : `la ${i + 1}.ª`;
    if (!m?.nombre) errores.push(`${quien}: sin nombre`);
    else if (vistos.has(m.nombre)) errores.push(`${quien}: nombre repetido`);
    else vistos.add(m.nombre);
    try {
      orden(m?.prueba, pasadas);
    } catch (e) {
      errores.push(`${quien}: ${e.message}`);
    }
    const texto = m?.fichero ? leer(m.fichero) : null;
    if (texto === null) {
      errores.push(`${quien}: no existe el fichero «${m?.fichero}»`);
      return;
    }
    try {
      aplicar(texto, m.de, m.a);
    } catch (e) {
      errores.push(`${quien}: ${e.message} (${m.fichero})`);
    }
  });
  return errores;
}

/** Las lineas que explican por que cayo: los `FALLO` del humo y lo que falla en vitest. */
export function motivos(salida, max = 4) {
  return salida
    .split('\n')
    .filter((l) => /FALLO|Error|✗|×|FAIL\b/.test(l))
    .map((l) => l.trim())
    .slice(0, max);
}
