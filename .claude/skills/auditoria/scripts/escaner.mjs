#!/usr/bin/env node
/**
 * Barrido mecanico de la auditoria (fase 1 de `SKILL.md`).
 *
 * Solo lee y avisa: nada de lo que imprime es un veredicto. Cada hallazgo lo
 * juzga el agente, porque buena parte son falsos positivos razonables (un
 * nombre de three.js citado en un comentario, una seccion de historia que
 * nombra a proposito lo que se retiro). Lo que si garantiza es que lo mecanico
 * se mira ENTERO y siempre igual, que es justo lo que una lectura a ojo no hace.
 *
 *   node .claude/skills/auditoria/scripts/escaner.mjs            el repo
 *   node .claude/skills/auditoria/scripts/escaner.mjs --root X   otro arbol
 *   node .claude/skills/auditoria/scripts/escaner.mjs --autoprueba
 *
 * `--autoprueba` siembra un fallo de cada tipo en un arbol de mentira y exige
 * que cada categoria lo encuentre: una comprobacion que no puede fallar es peor
 * que ninguna, y eso vale tambien para esta herramienta.
 *
 * Sin dependencias: Node puro, para que corra en un contenedor recien creado.
 */

import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SKILL = resolve(HERE, '..');
const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', 'screenshots', 'coverage', '.vite']);
/** Nunca se toca ni se juzga: es texto literal del autor. */
const SACRED = 'docs/el-libro-del-mundo.md';
/** Secciones de un md que son historia: lo retirado puede aparecer ahi a proposito. */
const HISTORY_HEADING = /HECH[OA]|SUSTITUID|ARREGLAD|APARCAD|Auditor|revisado|Decision tomada|retira|Lo que se midio|Lo que aparecio/i;

// ---------------------------------------------------------------- utilidades

function walk(root, dir = root, out = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(root, full, out);
    else out.push(relative(root, full).split('\\').join('/'));
  }
  return out;
}

/** Quita comentarios de TS/JS de forma aproximada: basta para buscar usos reales. */
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:'"`\\])\/\/[^\n]*/g, '$1');
}

/** Las lineas de un md con el titulo de la seccion en que caen. */
function mdLines(text) {
  // El titulo de la seccion y el de su seccion de nivel 2: una subseccion
  // («### Donde toca») es historia si su capitulo lo es.
  let section = '';
  let heading = '';
  return text.split('\n').map((line, i) => {
    const h = /^(#{1,4})\s+(.*)/.exec(line);
    if (h) {
      heading = h[2];
      if (h[1].length <= 2) section = h[2];
    }
    return { n: i + 1, line, heading: `${section} / ${heading}` };
  });
}

/**
 * Lo que ya se juzgo y es correcto (`references/ignorar.md`): nombres de APIs
 * del navegador, de la historia del isometrico… Cada uno con su motivo, para
 * que el siguiente sepa por que no es un fallo.
 */
function parseIgnored(md) {
  // nombre -> ficheros donde se ignora («En: `a`, `b`»); sin «En:», en todos.
  const out = new Map();
  for (const line of md.split('\n')) {
    const m = /^-\s+`([^`]+)`\s+[—-](.*)$/.exec(line);
    if (!m) continue;
    const scope = /\bEn:\s*(.*)$/.exec(m[2]);
    out.set(m[1], scope ? [...scope[1].matchAll(/`([^`]+)`/g)].map((s) => s[1]) : []);
  }
  return out;
}

function isIgnored(ignored, name, file) {
  const scope = ignored.get(name);
  return scope !== undefined && (scope.length === 0 || scope.includes(file));
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ---------------------------------------------------------------- el barrido

export function scan(root) {
  const all = walk(root);
  // El libro no se juzga, pero existe: citarlo no es una ruta rota.
  const files = all.filter((f) => f !== SACRED && !f.startsWith('.claude/skills/'));
  // Las listas son las del arbol auditado si las trae (la autoprueba siembra
  // las suyas), y si no las de esta skill.
  const localRefs = join(root, '.claude/skills/auditoria/references');
  const refs = existsSync(localRefs) ? localRefs : join(SKILL, 'references');
  const ignoredFile = join(refs, 'ignorar.md');
  const ignored = existsSync(ignoredFile) ? parseIgnored(readFileSync(ignoredFile, 'utf8')) : new Map();
  const read = (f) => readFileSync(join(root, f), 'utf8');
  const isText = (f) => /\.(ts|mjs|js|html|md|yml|yaml|json|css)$/.test(f) && !f.endsWith('package-lock.json');
  const text = new Map(files.filter(isText).map((f) => [f, read(f)]));
  const docs = [...text.keys()].filter((f) => f.endsWith('.md'));
  const code = [...text.keys()].filter((f) => /\.(ts|mjs|js)$/.test(f));
  const html = [...text.keys()].filter((f) => f.endsWith('.html'));
  const basenames = new Set(all.map((f) => basename(f)));
  // Todo el codigo sin comentarios, para saber si un nombre existe DE VERDAD.
  const liveCode = code.map((f) => stripComments(text.get(f))).join('\n') +
    html.map((f) => text.get(f)).join('\n');

  const report = {
    rutas: [],
    identificadores: [],
    css: [],
    ids: [],
    exports: [],
    soloInternos: [],
    retirados: [],
    scripts: [],
    fueraDeCi: [],
    matriz: [],
    docSuelta: [],
    sinIndice: [],
    usuarios: [],
  };

  // 1. Rutas citadas entre comillas invertidas que no existen.
  const cited = [];
  for (const f of docs) {
    for (const { n, line } of mdLines(text.get(f))) {
      for (const m of line.matchAll(/`([^`\s]+)`/g)) cited.push({ f, n, tok: m[1] });
    }
  }
  for (const f of code) {
    text.get(f).split('\n').forEach((line, i) => {
      if (!/\/\/|\*/.test(line)) return;
      for (const m of line.matchAll(/`([^`\s]+)`/g)) cited.push({ f, n: i + 1, tok: m[1] });
    });
  }
  for (const { f, n, tok } of cited) {
    const clean = tok.replace(/[.,;:)]+$/, '');
    if (!/\.(ts|mjs|js|md|html|yml|json)$/.test(clean)) continue;
    if (/[*{}<>$]/.test(clean) || clean.startsWith('http')) continue;
    const asPath = clean.includes('/');
    const candidates = asPath
      ? [clean, `packages/${clean}`, `packages/client/src/${clean.replace(/^client\//, '')}`,
         `packages/sim/src/${clean.replace(/^sim\//, '')}`, `packages/shared/src/${clean.replace(/^shared\//, '')}`,
         `packages/client/${clean}`]
      : [];
    const ok = asPath
      ? candidates.some((c) => existsSync(join(root, c))) || files.some((x) => x.endsWith('/' + clean))
      : basenames.has(clean);
    if (!ok && !isIgnored(ignored, clean, f)) report.rutas.push(`${f}:${n}  \`${clean}\``);
  }

  // 2. Identificadores citados que no aparecen en el codigo vivo.
  const seen = new Set();
  for (const { f, n, tok } of cited) {
    const m = /^([A-Za-z_$][\w$]*)(\(\))?$/.exec(tok.replace(/[.,;:]+$/, ''));
    if (!m) continue;
    const id = m[1];
    // Solo lo que parece un nombre de codigo: camelCase, PascalCase con
    // minusculas dentro, o CONSTANTE_CON_GUION.
    if (id.length < 4 || !(/[a-z][A-Z]/.test(id) || /^[A-Z][A-Z0-9]*_[A-Z0-9_]+$/.test(id))) continue;
    if (new RegExp(`\\b${escapeRe(id)}\\b`).test(liveCode)) continue;
    const key = `${id}@${f}`;
    if (seen.has(key) || isIgnored(ignored, id, f)) continue;
    seen.add(key);
    report.identificadores.push(`${f}:${n}  \`${id}\``);
  }

  // 3. Selectores CSS de los <style> sin elemento, y 4. ids pedidos que no hay.
  for (const f of html) {
    const src = text.get(f);
    const style = (src.match(/<style>([\s\S]*?)<\/style>/) ?? [, ''])[1].replace(/\/\*[\s\S]*?\*\//g, ' ');
    const body = src.replace(/<style>[\s\S]*?<\/style>/, '');
    const js = code.filter((c) => c.startsWith(dirname(f))).map((c) => text.get(c)).join('\n');
    const known = body + '\n' + js;
    // Las reglas: lo que va antes de cada `{`. Asi no se confunden con valores
    // (colores, decimales) que viven dentro de las llaves.
    const selectors = [...style.matchAll(/([^{}]+)\{/g)].map((m) => m[1]);
    const ids = new Set();
    const classes = new Set();
    for (const sel of selectors) {
      for (const m of sel.matchAll(/#([A-Za-z][\w-]*)/g)) ids.add(m[1]);
      for (const m of sel.matchAll(/\.([A-Za-z][\w-]*)/g)) classes.add(m[1]);
    }
    for (const id of ids) {
      const re = new RegExp(`(id=["']${escapeRe(id)}["']|['"\`]#?${escapeRe(id)}['"\`]|#${escapeRe(id)}\\b)`);
      if (!re.test(known)) report.css.push(`${f}  #${id}`);
    }
    for (const c of classes) {
      if (!new RegExp(`\\b${escapeRe(c)}\\b`).test(known)) report.css.push(`${f}  .${c}`);
    }
    // 4. ids que el JS pide y no estan en el HTML ni se crean en el JS.
    const htmlIds = new Set([...body.matchAll(/id=["']([\w-]+)["']/g)].map((m) => m[1]));
    for (const c of code.filter((x) => x.startsWith(dirname(f)))) {
      text.get(c).split('\n').forEach((line, i) => {
        for (const m of line.matchAll(/(?:getElementById|byId(?:<[^>]*>)?)\(\s*['"]([\w-]+)['"]\s*\)/g)) {
          const id = m[1];
          const created = new RegExp(`\\.id\\s*=\\s*['"]${escapeRe(id)}['"]|id=["']${escapeRe(id)}["']`).test(js);
          if (!htmlIds.has(id) && !created) report.ids.push(`${c}:${i + 1}  #${id}`);
        }
      });
    }
  }

  // 5. Exports que nadie importa ni usa fuera de su fichero.
  const pkgCode = code.filter((f) => f.startsWith('packages/'));
  for (const f of pkgCode) {
    for (const m of text.get(f).matchAll(/^export\s+(?:declare\s+)?(?:async\s+)?(?:function|const|let|class|interface|type|enum)\s+([A-Za-z_$][\w$]*)/gm)) {
      const name = m[1];
      const re = new RegExp(`\\b${escapeRe(name)}\\b`);
      const usedElsewhere = code.some((other) => other !== f && re.test(stripComments(text.get(other))));
      if (!usedElsewhere) {
        const uses = (stripComments(text.get(f)).match(new RegExp(`\\b${escapeRe(name)}\\b`, 'g')) ?? []).length;
        // Lo que nadie usa es codigo muerto; lo que solo usa su fichero es,
        // como mucho, un export de mas: se cuenta aparte y no inunda el informe.
        if (uses > 1) report.soloInternos.push(`${f}  ${name}`);
        else report.exports.push(`${f}  ${name}  (NADIE lo usa)`);
      }
    }
  }

  // 6. Terminos retirados (`references/retirados.md`), con su seccion.
  const retiredFile = join(refs, 'retirados.md');
  const retired = existsSync(retiredFile) ? parseRetired(readFileSync(retiredFile, 'utf8')) : [];
  for (const { re, what, allowed } of retired) {
    for (const [f, src] of text) {
      if (allowed.some((a) => f === a || f.startsWith(a))) continue;
      const lines = f.endsWith('.md') ? mdLines(src) : src.split('\n').map((line, i) => ({ n: i + 1, line, heading: '' }));
      for (const { n, line, heading } of lines) {
        if (!re.test(line)) continue;
        const history = f === 'docs/isometrico.md' || HISTORY_HEADING.test(heading) || /\*Luego\*/.test(line);
        report.retirados.push(`${history ? '[historia] ' : ''}${f}:${n}  /${re.source}/ (${what})`);
      }
    }
  }

  // 7. Scripts de package.json y pasos de CI que apuntan a ficheros que no hay.
  const runs = [];
  if (text.has('package.json')) {
    const scripts = JSON.parse(text.get('package.json')).scripts ?? {};
    for (const [k, v] of Object.entries(scripts)) runs.push({ where: `package.json:${k}`, cmd: v });
  }
  const ci = [...text.keys()].filter((f) => f.startsWith('.github/workflows/'));
  for (const f of ci) runs.push({ where: f, cmd: text.get(f) });
  for (const { where, cmd } of runs) {
    for (const m of cmd.matchAll(/node\s+([\w./-]+\.(?:mjs|js|ts))/g)) {
      if (!existsSync(join(root, m[1]))) report.scripts.push(`${where}  ${m[1]}`);
    }
  }

  // 8. Herramientas que la CI no ejecuta: la podredumbre solo la ve correrlas.
  const ciText = ci.map((f) => text.get(f)).join('\n');
  const tools = files.filter((x) => /^tools\/[\w-]+\.(mjs|ts)$/.test(x));
  const enCi = new Set(tools.filter((f) => ciText.includes(f)));
  // Lo que importa una herramienta que corre en la CI tambien corre: sus
  // modulos (`tools/mutar-lib.mjs`, la lista de mutaciones) no son podredumbre.
  for (let crecio = true; crecio; ) {
    crecio = false;
    for (const f of tools) {
      if (enCi.has(f)) continue;
      const base = f.slice('tools/'.length);
      if ([...enCi].some((g) => (text.get(g) ?? '').includes(`./${base}`) || (text.get(g) ?? '').includes(`tools/${base}`))) {
        enCi.add(f);
        crecio = true;
      }
    }
  }
  for (const f of tools) if (!enCi.has(f)) report.fueraDeCi.push(f);

  // 9. Pasadas del humo sin casilla en la matriz de la CI, y casillas sin
  // pasada. La CI lanza cada pasada por el prefijo de su nombre; una pasada
  // nueva que no se anade a la matriz no corre nunca en CI, y nadie se entera.
  const smoke = text.get('tools/smoke.mjs');
  const matrix = /pasada:\s*\[([^\]]*)\]/.exec(ciText);
  if (smoke && matrix) {
    const passes = [...(/const passes = \{([^}]*)\}/.exec(smoke)?.[1] ?? '').matchAll(/(\w+)/g)].map((m) => m[1]);
    const cells = matrix[1].split(',').map((s) => s.trim().replace(/['"]/g, '')).filter(Boolean);
    for (const p of passes) {
      if (!cells.some((c) => p.startsWith(c))) report.matriz.push(`tools/smoke.mjs  ${p} no tiene casilla en la matriz de CI`);
    }
    for (const c of cells) {
      // Las casillas de herramientas propias, no del humo.
      if (!['gestures', 'slash'].includes(c) && !passes.some((p) => p.startsWith(c))) report.matriz.push(`CI  la casilla «${c}» no coincide con ninguna pasada`);
    }
  }

  // 10. Comentarios de documentacion sueltos: dos `/** */` seguidos, sin codigo
  // entre ellos. El primero no documenta nada —el editor y TypeScript se lo
  // atribuyen al segundo, o a nadie— y suele ser un resto: lo que explicaba se
  // movio o se sustituyo y el comentario se quedo (el de `rollFor` encima de
  // `tiltOf`; «el movimiento analogico existe» encima de los tests que lo
  // sustituyeron). La cabecera del fichero —su primer bloque, vaya antes o
  // despues de los imports— no cuenta: la sigue la doc de lo primero que hay.
  for (const f of code) {
    const lines = text.get(f).split('\n');
    let open = -1;
    let lastClose = -1;
    let lastStart = -1;
    let blocks = 0;
    for (let i = 0; i < lines.length; i++) {
      const t = lines[i].trim();
      if (open < 0 && t.startsWith('/**')) {
        const between = lastClose >= 0 ? lines.slice(lastClose + 1, i) : null;
        if (between && between.every((l) => l.trim() === '') && blocks > 1) {
          report.docSuelta.push(`${f}:${lastStart + 1}  documenta lo mismo que el bloque de la linea ${i + 1}`);
        }
        open = i;
        blocks++;
      }
      if (open >= 0 && t.includes('*/')) {
        lastStart = open;
        lastClose = i;
        open = -1;
      } else if (open < 0 && t !== '' && !t.startsWith('/**')) {
        lastClose = -1;
      }
    }
  }

  // 12. Usuarios citados que no lo usan: una frase «lo usa» o «lo usan» de un
  // modulo que nombra un fichero (`fauna-view.ts`) que no lo importa. Es como
  // se pudrio la cabecera de `sprite-depth.ts`, que siguio diciendo que la
  // usaban los animales cuando ya eran de bloques (escape 22): el nombre del
  // fichero seguia existiendo, asi que la categoria 1 no lo veia.
  const byBase = new Map(code.map((f) => [basename(f), f]));
  for (const f of code) {
    const src = text.get(f);
    const self = basename(f).replace(/\.(ts|mjs|js)$/, '');
    for (const m of src.matchAll(/\blo usan?\b([^.]*(?:\.(?!\s)[^.]*)*)/gi)) {
      for (const n of m[1].matchAll(/`([\w-]+\.(?:ts|mjs|js))`/g)) {
        const user = byBase.get(n[1]);
        if (!user || user === f) continue;
        if (!new RegExp(`from\\s+['"][^'"]*\\b${escapeRe(self)}(\\.js|\\.ts|\\.mjs)?['"]`).test(text.get(user))) {
          report.usuarios.push(`${f}  dice que lo usa \`${n[1]}\`, que no lo importa`);
        }
      }
    }
  }

  // 11. Documentos de `docs/` que el indice de `CLAUDE.md` no nombra. Desde el
  // 2026-10-02 `CLAUDE.md` lleva solo lo operativo y cada parte del juego vive
  // en su documento: uno que el indice no nombra no lo lee nadie antes de
  // tocar su parte, y lo que cuenta se pierde igual que si no estuviera.
  const claude = text.get('CLAUDE.md');
  if (claude) {
    for (const f of all.filter((p) => /^docs\/[^/]+\.md$/.test(p))) {
      if (!claude.includes(`\`${f}\``)) report.sinIndice.push(`${f}  no sale en el indice de CLAUDE.md`);
    }
  }

  return report;
}

function parseRetired(md) {
  const out = [];
  for (const line of md.split('\n')) {
    const m = /^-\s+`([^`]+)`\s+[—-]\s+(.*)$/.exec(line);
    if (!m) continue;
    const allowed = [];
    const perm = /Permitido en:\s*(.*)$/.exec(m[2]);
    if (perm) for (const p of perm[1].matchAll(/`([^`]+)`/g)) allowed.push(p[1]);
    out.push({ re: new RegExp(m[1], 'i'), what: m[2].replace(/\s*Permitido en:.*$/, '').slice(0, 70), allowed });
  }
  return out;
}

// ---------------------------------------------------------------- informe

const TITLES = {
  rutas: 'Rutas citadas que no existen',
  identificadores: 'Nombres citados que no estan en el codigo vivo',
  css: 'Selectores CSS sin elemento',
  ids: 'Ids que el JS pide y el HTML no tiene',
  exports: 'Exports que nadie usa (codigo muerto)',
  retirados: 'Terminos retirados (ver references/retirados.md)',
  scripts: 'Scripts y pasos de CI que apuntan a ficheros inexistentes',
  fueraDeCi: 'Herramientas que la CI no ejecuta: correrlas a mano (lente C)',
  matriz: 'Pasadas del humo y casillas de la matriz de CI que no casan',
  docSuelta: 'Comentarios de documentacion sueltos, sin nada que documentar (lente E)',
  sinIndice: 'Documentos de docs/ que el indice de CLAUDE.md no nombra (lente F)',
  usuarios: 'Ficheros citados como usuarios de un modulo que no lo importan (lente E)',
};

function print(report) {
  let total = 0;
  for (const [key, title] of Object.entries(TITLES)) {
    const items = report[key];
    total += items.length;
    console.log(`\n## ${title}: ${items.length}`);
    for (const it of items) console.log(`  ${it}`);
  }
  // Los exports que solo usa su propio fichero no son un fallo: se cuentan, y
  // `--detalle` los lista para la lente I (estructura) si hace falta.
  console.log(`\n(${report.soloInternos.length} exports solo se usan en su propio fichero; --detalle los lista.)`);
  if (process.argv.includes('--detalle')) for (const it of report.soloInternos) console.log(`  ${it}`);
  console.log(`\n${total} avisos. Ninguno es un veredicto: cada uno se juzga (SKILL.md, fase 1).`);
}

// ---------------------------------------------------------------- autoprueba

function selfTest() {
  const root = mkdtempSync(join(tmpdir(), 'escaner-'));
  const put = (p, s) => {
    mkdirSync(dirname(join(root, p)), { recursive: true });
    writeFileSync(join(root, p), s);
  };
  put('package.json', JSON.stringify({ scripts: { roto: 'node tools/no-existe.mjs', bien: 'node tools/bien.mjs' } }));
  put('tools/bien.mjs', "import './lib-usada.mjs';\nexport {};\n");
  put('tools/lib-usada.mjs', 'export {};\n');
  put('tools/suelta.mjs', 'export {};\n');
  put('.github/workflows/ci.yml', 'matrix:\n  pasada: [alfa, fantasma, gestures, slash]\nsteps:\n  - run: node tools/bien.mjs\n  - run: node tools/smoke.mjs\n');
  put('tools/smoke.mjs', 'const passes = { alfaPass, betaPass };\n');
  put('packages/client/index.html',
    '<style>#vivo { color: #fff; } #muerto { top: 0; } .viva { x: 1; } .clase-sin-uso { x: 2.5; }</style>\n' +
    '<div id="vivo" class="viva"></div>\n');
  put('packages/client/src/main.ts',
    "const a = document.getElementById('vivo');\nconst b = document.getElementById('fantasma');\n" +
    "import { usada } from './lib.js';\nusada();\n// ver `funcionRetirada` y `existeDeVerdad`\nexisteDeVerdad();\n" +
    'function existeDeVerdad() {}\n');
  // Una cabecera seguida de la doc de su primera funcion (bien), y una doc
  // suelta encima de otra (mal).
  put('packages/client/src/docs.ts',
    '/**\n * Cabecera.\n */\n\n/** Bien. */\nfunction bien() {}\n\n' +
    '/**\n * Suelta: lo que explicaba se fue.\n */\n/** La de verdad. */\nfunction otra() {}\nbien(); otra();\n');
  // Dice que la usan dos: `main.ts` si la importa, `docs.ts` no.
  put('packages/client/src/lib.ts',
    '/**\n * Lo usan `main.ts` y `docs.ts`.\n */\nexport function usada() {}\nexport function huerfana() {}\n');
  put('docs/notas.md',
    '# Notas\n\nVer `packages/client/src/main.ts` y `docs/fantasma.md`.\n' +
    'La vieja `wheelZoom` se fue.\n\n## Algo — SUSTITUIDO\n\nAntes era `wheelZoom`.\n');
  // Un retirado que aparece en codigo vivo y en historia, y un ignorado con
  // ambito: fuera de su fichero tiene que seguir saliendo.
  put('packages/client/src/zoom.ts', 'export const x = 1;\nlet wheelZoom = 1;\nx; wheelZoom;\n// ver `nombreJuzgado`\n');
  put('docs/otra.md', '# Otra\n\nCita `nombreJuzgado` aqui tambien.\n');
  // El indice nombra un documento y se deja el otro.
  put('CLAUDE.md', '# Notas\n\n| Si tocas | Lee |\n|---|---|\n| Algo | `docs/notas.md` |\n');
  put('.claude/skills/auditoria/references/retirados.md', '- `wheelZoom` — la rueda hacia zoom\n');
  put('.claude/skills/auditoria/references/ignorar.md', '- `nombreJuzgado` — juzgado. En: `docs/otra.md`.\n');
  const report = scan(root);
  rmSync(root, { recursive: true, force: true });
  const expect = [
    ['rutas', (r) => r.rutas.length === 1 && r.rutas[0].includes('docs/fantasma.md')],
    ['identificadores', (r) => r.identificadores.some((x) => x.includes('funcionRetirada')) &&
      !r.identificadores.some((x) => x.includes('existeDeVerdad'))],
    ['css', (r) => r.css.some((x) => x.includes('#muerto')) && r.css.some((x) => x.includes('.clase-sin-uso')) &&
      !r.css.some((x) => x.includes('#vivo') || x.includes('.viva') || x.includes('#fff'))],
    ['ids', (r) => r.ids.length === 1 && r.ids[0].includes('#fantasma')],
    ['exports', (r) => r.exports.length === 1 && r.exports[0].includes('huerfana')],
    ['scripts', (r) => r.scripts.length === 1 && r.scripts[0].includes('no-existe')],
    ['fuera de CI', (r) => r.fueraDeCi.includes('tools/suelta.mjs') && !r.fueraDeCi.includes('tools/lib-usada.mjs') &&
      !r.fueraDeCi.includes('tools/bien.mjs')],
    ['matriz', (r) => r.matriz.length === 2 && r.matriz.some((x) => x.includes('betaPass')) &&
      r.matriz.some((x) => x.includes('fantasma'))],
    ['retirados', (r) => r.retirados.some((x) => !x.startsWith('[historia]') && x.includes('zoom.ts')) &&
      r.retirados.some((x) => x.startsWith('[historia]') && x.includes('notas.md'))],
    ['doc suelta', (r) => r.docSuelta.length === 1 && r.docSuelta[0].includes('docs.ts:8')],
    ['sin indice', (r) => r.sinIndice.length === 1 && r.sinIndice[0].includes('docs/otra.md')],
    ['usuarios', (r) => r.usuarios.length === 1 && r.usuarios[0].includes('`docs.ts`')],
    ['ignorados con ambito', (r) => r.identificadores.some((x) => x.includes('zoom.ts') && x.includes('nombreJuzgado')) &&
      !r.identificadores.some((x) => x.includes('otra.md'))],
  ];
  let bad = 0;
  for (const [name, ok] of expect) {
    const pass = ok(report);
    if (!pass) bad++;
    console.log(`${pass ? 'OK   ' : 'FALLO'} ${name}`);
  }
  console.log(bad ? `AUTOPRUEBA: FALLIDA (${bad})` : 'AUTOPRUEBA: OK — cada categoria encuentra su fallo sembrado');
  process.exit(bad ? 1 : 0);
}

// ---------------------------------------------------------------- entrada

const args = process.argv.slice(2);
if (args.includes('--autoprueba')) selfTest();
else {
  const i = args.indexOf('--root');
  const root = i >= 0 ? resolve(args[i + 1]) : resolve(SKILL, '../../..');
  print(scan(root));
}
