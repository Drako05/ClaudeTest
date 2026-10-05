/**
 * El plano del cuerpo de cada especie: las cajas de las que esta hecho.
 *
 * Decision del autor (2026-10-03): **los animales son de bloques**, con
 * detalle medio (de 10 a 16 cajas), y **la caja de golpe es la de su modelo**,
 * parte a parte: el cuello y la cabeza de un bisonte tienen caja; su cola, no,
 * para que el choque sea directamente en su trasero. Este fichero es el unico
 * sitio donde se dice como es un animal: el nucleo choca y golpea con las
 * partes `hit` y el cliente dibuja todas. Lo que se ve es lo que se golpea y
 * lo que choca, como el tronco de los arboles (regla 12) y las estaciones.
 *
 * Cada parte va en bloques, en el marco del animal:
 * - `x`, a lo largo de hacia donde mira (+ delante), con 0 en el centro del
 *   tronco, que es donde esta la entidad;
 * - `y`, hacia arriba desde los pies;
 * - `z`, de lado (+ a su izquierda).
 *
 * Las medidas son **dibujo mio**, con las proporciones de la especie real; se
 * escalan para que el plano mida de alto justo `animalHeight`. Que es `hit`
 * lo decidio el autor (2026-10-05): **la cabeza, el cuello, las extremidades y
 * el tronco** —con el hocico, el pecho, la joroba, la crin y la melena—; lo
 * pequeno o fino no: los cuernos y las astas, las colas cortas, las alas
 * recogidas, las orejas, la barba, el pico, y las patas de la gaviota y del
 * cangrejo, finas como un cuerno. Las pinzas del cangrejo, si.
 */

import { animalHeight, Species, Stage } from './fauna.js';

/** Que color lleva una parte; el cliente pone el de cada especie y etapa. */
export type BodyRole =
  | 'coat'
  | 'dark'
  | 'belly'
  | 'mane'
  | 'rump'
  | 'pattern'
  | 'horn'
  | 'hoof'
  | 'nose'
  | 'eye'
  | 'wing'
  | 'beak';

export interface BodyPart {
  name: string;
  role: BodyRole;
  /** Si cuenta para el golpe y para el choque con el terreno. */
  hit: boolean;
  /** Largo (a lo largo del rumbo), alto y ancho, en bloques. */
  size: readonly [number, number, number];
  /** El centro, en el marco del animal. */
  at: readonly [number, number, number];
}

/** Una parte mientras se construye el plano: `head` si va con la cabeza. */
interface Draft extends BodyPart {
  head: boolean;
}

type V3 = [number, number, number];

function part(name: string, role: BodyRole, hit: boolean, size: V3, at: V3, head = false): Draft {
  return { name, role, hit, size, at, head };
}

/** La misma parte a los dos lados, en `z` y en `-z`. */
function pair(name: string, role: BodyRole, hit: boolean, size: V3, at: V3, head = false): Draft[] {
  return [part(`${name}-izq`, role, hit, size, at, head), part(`${name}-der`, role, hit, size, [at[0], at[1], -at[2]], head)];
}

/** Cuatro patas: `x` delante y detras, `z` a cada lado. */
function legs(h: number, w: number, x: number, z: number): Draft[] {
  const out: Draft[] = [];
  for (const [i, lx] of [x, -x].entries()) {
    out.push(...pair(i === 0 ? 'pata-del' : 'pata-tras', 'coat', true, [w, h, w], [lx, h / 2, z]));
  }
  return out;
}

/** Los ojos, a los lados de una cabeza de largo `l`, alto `hh` y ancho `w` centrada en `x`, `y`. */
function eyes(x: number, y: number, l: number, hh: number, w: number): Draft[] {
  const e = Math.max(0.025, hh * 0.18);
  return pair('ojo', 'eye', false, [e, e, 0.01], [x + l * 0.15, y + hh * 0.15, w / 2 + 0.005], true);
}

/** Lo que cambia en la cria y el joven: sin cuernos ni barba de cria, como en la vida real. */
interface Young {
  infant: boolean;
  juvenile: boolean;
}

/** El plano sin escalar de cada especie. **Medidas mias**, de la especie real. */
function draft(species: Species, y: Young): Draft[] {
  const adultish = !y.infant;
  switch (species) {
    case Species.Hare:
      return [
        ...legs(0.12, 0.05, 0.13, 0.05),
        part('tronco', 'coat', true, [0.42, 0.2, 0.16], [0, 0.22, 0]),
        part('barriga', 'belly', false, [0.3, 0.02, 0.12], [0, 0.115, 0]),
        part('cabeza', 'coat', true, [0.14, 0.13, 0.12], [0.24, 0.3, 0], true),
        part('hocico', 'belly', true, [0.04, 0.06, 0.08], [0.32, 0.28, 0], true),
        ...eyes(0.24, 0.3, 0.14, 0.13, 0.12),
        ...pair('oreja', 'coat', false, [0.04, 0.16, 0.03], [0.21, 0.44, 0.035], true),
        ...pair('punta-oreja', 'dark', false, [0.042, 0.03, 0.032], [0.21, 0.51, 0.035], true),
        part('cola', 'belly', false, [0.07, 0.07, 0.07], [-0.24, 0.27, 0]),
      ];
    case Species.Bison:
      return [
        ...legs(0.7, 0.22, 0.75, 0.32),
        part('tronco', 'coat', true, [2.2, 0.9, 1.0], [0, 1.15, 0]),
        ...(y.infant ? [] : [part('joroba', 'mane', true, [0.9, 0.45, 0.9], [0.45, 1.8, 0])]),
        part('pecho', 'mane', true, [0.5, 0.95, 1.05], [0.75, 1.1, 0]),
        part('cabeza', 'mane', true, [0.55, 0.6, 0.55], [1.25, 1.0, 0], true),
        part('hocico', 'dark', true, [0.2, 0.3, 0.4], [1.62, 0.85, 0], true),
        ...eyes(1.25, 1.0, 0.55, 0.6, 0.55),
        ...(y.infant ? [] : pair('cuerno', 'horn', false, [0.08, 0.25, 0.08], [1.2, 1.4, 0.33], true)),
        ...(adultish && !y.juvenile ? [part('barba', 'mane', false, [0.1, 0.3, 0.25], [1.4, 0.6, 0], true)] : []),
        part('cola', 'dark', false, [0.06, 0.5, 0.06], [-1.13, 0.95, 0]),
      ];
    case Species.RedDeer:
      return [
        ...legs(0.75, 0.1, 0.38, 0.13),
        part('tronco', 'coat', true, [1.0, 0.45, 0.4], [0, 0.975, 0]),
        part('barriga', 'belly', false, [0.7, 0.03, 0.3], [0, 0.74, 0]),
        part('cuello', 'coat', true, [0.22, 0.45, 0.2], [0.5, 1.2, 0]),
        part('cabeza', 'coat', true, [0.35, 0.22, 0.2], [0.65, 1.32, 0], true),
        part('hocico', 'dark', true, [0.15, 0.12, 0.14], [0.88, 1.27, 0], true),
        ...eyes(0.65, 1.32, 0.35, 0.22, 0.2),
        ...pair('oreja', 'coat', false, [0.05, 0.14, 0.08], [0.55, 1.49, 0.1], true),
        part('grupa', 'rump', false, [0.02, 0.3, 0.3], [-0.51, 0.98, 0]),
        part('cola', 'dark', false, [0.08, 0.1, 0.08], [-0.53, 1.12, 0]),
        ...(y.infant
          ? [
              ...pair('motas-del', 'pattern', false, [0.25, 0.08, 0.01], [0.15, 1.05, 0.205]),
              ...pair('motas-tras', 'pattern', false, [0.25, 0.08, 0.01], [-0.22, 1.0, 0.205]),
            ]
          : []),
      ];
    case Species.Boar:
      return [
        ...legs(0.3, 0.12, 0.42, 0.17),
        part('tronco', 'coat', true, [1.3, 0.6, 0.55], [0, 0.6, 0]),
        ...(y.infant ? [] : [part('crin', 'mane', true, [0.8, 0.12, 0.2], [0.15, 0.96, 0])]),
        part('cabeza', 'coat', true, [0.45, 0.45, 0.4], [0.82, 0.6, 0], true),
        part('hocico', 'coat', true, [0.25, 0.22, 0.25], [1.15, 0.5, 0], true),
        part('disco', 'nose', false, [0.02, 0.18, 0.2], [1.285, 0.5, 0], true),
        ...eyes(0.82, 0.6, 0.45, 0.45, 0.4),
        ...pair('oreja', 'dark', false, [0.08, 0.15, 0.08], [0.72, 0.9, 0.13], true),
        ...(adultish && !y.juvenile ? pair('colmillo', 'horn', false, [0.12, 0.05, 0.05], [1.12, 0.42, 0.15], true) : []),
        part('cola', 'dark', false, [0.05, 0.3, 0.05], [-0.68, 0.65, 0]),
        ...(y.infant
          ? [
              ...pair('raya-alta', 'pattern', false, [1.0, 0.04, 0.01], [0, 0.75, 0.28]),
              ...pair('raya-baja', 'pattern', false, [1.0, 0.04, 0.01], [0, 0.6, 0.28]),
            ]
          : []),
      ];
    case Species.Reindeer:
      return [
        ...legs(0.65, 0.12, 0.42, 0.16),
        part('tronco', 'coat', true, [1.2, 0.5, 0.5], [0, 0.9, 0]),
        part('cuello', 'coat', true, [0.3, 0.45, 0.3], [0.6, 1.15, 0]),
        ...(y.infant ? [] : [part('melena', 'mane', true, [0.32, 0.3, 0.34], [0.62, 0.98, 0])]),
        part('cabeza', 'coat', true, [0.4, 0.25, 0.22], [0.8, 1.35, 0], true),
        part('hocico', 'dark', true, [0.15, 0.15, 0.18], [1.06, 1.3, 0], true),
        ...eyes(0.8, 1.35, 0.4, 0.25, 0.22),
        ...pair('oreja', 'coat', false, [0.05, 0.1, 0.08], [0.68, 1.5, 0.13], true),
        ...(y.infant
          ? []
          : [
              ...pair('asta', 'horn', false, [0.08, 0.5, 0.08], [0.72, 1.72, 0.2], true),
              ...pair('asta-delante', 'horn', false, [0.22, 0.06, 0.06], [0.84, 1.75, 0.22], true),
              ...pair('asta-punta', 'horn', false, [0.06, 0.2, 0.06], [0.62, 1.95, 0.3], true),
            ]),
        part('cola', 'rump', false, [0.06, 0.1, 0.12], [-0.63, 1.0, 0]),
      ];
    case Species.ArcticFox:
      return [
        ...legs(0.15, 0.05, 0.15, 0.05),
        part('tronco', 'coat', true, [0.45, 0.17, 0.15], [0, 0.235, 0]),
        part('cabeza', 'coat', true, [0.18, 0.15, 0.15], [0.3, 0.3, 0], true),
        part('hocico', 'coat', true, [0.1, 0.07, 0.08], [0.44, 0.27, 0], true),
        part('nariz', 'nose', false, [0.02, 0.03, 0.03], [0.5, 0.29, 0], true),
        ...eyes(0.3, 0.3, 0.18, 0.15, 0.15),
        ...pair('oreja', 'coat', false, [0.03, 0.08, 0.05], [0.27, 0.41, 0.05], true),
        part('cola', 'coat', false, [0.3, 0.12, 0.12], [-0.37, 0.22, 0]),
        part('punta-cola', 'belly', false, [0.08, 0.1, 0.1], [-0.55, 0.2, 0]),
      ];
    case Species.Ibex:
      return [
        ...legs(0.55, 0.1, 0.32, 0.12),
        part('tronco', 'coat', true, [0.85, 0.4, 0.35], [0, 0.75, 0]),
        part('barriga', 'belly', false, [0.6, 0.03, 0.25], [0, 0.54, 0]),
        part('cuello', 'coat', true, [0.2, 0.3, 0.2], [0.42, 0.95, 0]),
        part('cabeza', 'coat', true, [0.3, 0.22, 0.2], [0.56, 1.05, 0], true),
        part('hocico', 'coat', true, [0.12, 0.12, 0.14], [0.76, 1.0, 0], true),
        ...eyes(0.56, 1.05, 0.3, 0.22, 0.2),
        ...pair('oreja', 'coat', false, [0.1, 0.05, 0.05], [0.5, 1.12, 0.13], true),
        ...(y.infant
          ? []
          : [
              ...pair('cuerno', 'horn', false, [0.07, 0.3, 0.07], [0.5, 1.3, 0.07], true),
              ...pair('cuerno-atras', 'horn', false, [0.25, 0.07, 0.07], [0.36, 1.46, 0.07], true),
            ]),
        ...(adultish && !y.juvenile ? [part('barba', 'mane', false, [0.06, 0.15, 0.08], [0.64, 0.86, 0], true)] : []),
        part('cola', 'dark', false, [0.06, 0.1, 0.06], [-0.45, 0.9, 0]),
      ];
    case Species.Marmot:
      return [
        ...legs(0.08, 0.07, 0.15, 0.1),
        part('tronco', 'coat', true, [0.45, 0.26, 0.3], [0, 0.21, 0]),
        part('barriga', 'belly', false, [0.35, 0.02, 0.22], [0, 0.075, 0]),
        part('cabeza', 'coat', true, [0.18, 0.16, 0.18], [0.28, 0.3, 0], true),
        part('hocico', 'belly', true, [0.07, 0.08, 0.1], [0.4, 0.27, 0], true),
        ...eyes(0.28, 0.3, 0.18, 0.16, 0.18),
        ...pair('oreja', 'dark', false, [0.03, 0.05, 0.05], [0.24, 0.4, 0.07], true),
        part('cola', 'dark', false, [0.2, 0.07, 0.08], [-0.32, 0.16, 0]),
      ];
    case Species.Crab: {
      // Anda de lado: el caparazon ancho va a lo largo de la marcha y los ojos
      // miran a su costado (+z).
      const out: Draft[] = [
        part('caparazon', 'coat', true, [0.4, 0.14, 0.28], [0, 0.15, 0]),
        part('vientre', 'dark', false, [0.3, 0.03, 0.22], [0, 0.07, 0]),
        part('pinza-delante', 'coat', true, [0.1, 0.1, 0.12], [0.2, 0.18, 0.18], true),
        part('pinza-detras', 'coat', true, [0.1, 0.1, 0.12], [-0.2, 0.18, 0.18], true),
        part('ojo-delante', 'eye', false, [0.03, 0.08, 0.03], [0.06, 0.26, 0.11], true),
        part('ojo-detras', 'eye', false, [0.03, 0.08, 0.03], [-0.06, 0.26, 0.11], true),
      ];
      for (const side of [1, -1]) {
        for (const z of [-0.08, 0, 0.07]) {
          out.push(part(`pata-${side}-${z}`, 'dark', false, [0.14, 0.04, 0.04], [side * 0.26, 0.02, z]));
        }
      }
      return out;
    }
    case Species.Gull:
      return [
        ...pair('pata', 'hoof', false, [0.03, 0.15, 0.03], [0, 0.075, 0.05]),
        part('tronco', 'coat', true, [0.4, 0.2, 0.2], [0, 0.25, 0]),
        ...(y.infant ? [] : pair('ala', 'wing', false, [0.3, 0.12, 0.02], [-0.02, 0.28, 0.11])),
        ...(y.infant ? [] : [part('cola', 'dark', false, [0.15, 0.05, 0.15], [-0.26, 0.28, 0])]),
        part('cuello', 'coat', true, [0.08, 0.1, 0.1], [0.15, 0.38, 0]),
        part('cabeza', 'coat', true, [0.14, 0.13, 0.12], [0.18, 0.48, 0], true),
        part('pico', 'beak', false, [0.1, 0.04, 0.04], [0.3, 0.47, 0], true),
        ...eyes(0.18, 0.48, 0.14, 0.13, 0.12),
      ];
  }
}

/**
 * Cuanto crece la cabeza de una cria y de un joven, sobre lo que les toca por
 * tamano: las proporciones de cria. **Deduccion mia**, la misma del dibujo.
 */
const HEAD_GROWTH: readonly number[] = [1.3, 1.1, 1];

const cache = new Map<number, readonly BodyPart[]>();

/**
 * Las partes de un animal de una etapa, en bloques, con el alto de su plano
 * igual a `animalHeight`. Se calcula una vez por (especie, etapa).
 */
export function partsOf(species: Species, stage: Stage): readonly BodyPart[] {
  const key = species * 8 + stage;
  const hit = cache.get(key);
  if (hit) return hit;
  const drafts = draft(species, { infant: stage === Stage.Infant, juvenile: stage === Stage.Juvenile });
  // La cabeza crece alrededor del centro de la cabeza, y lo que va con ella
  // (orejas, cuernos, ojos) se separa de ese centro en la misma proporcion.
  const growth = HEAD_GROWTH[stage];
  const head = drafts.find((p) => p.name === 'cabeza');
  const grown = drafts.map((p) => {
    if (!p.head || !head || growth === 1) return p;
    const [hx, hy, hz] = head.at;
    return {
      ...p,
      size: [p.size[0] * growth, p.size[1] * growth, p.size[2] * growth] as const,
      at: [hx + (p.at[0] - hx) * growth, hy + (p.at[1] - hy) * growth, hz + (p.at[2] - hz) * growth] as const,
    };
  });
  const top = Math.max(...grown.map((p) => p.at[1] + p.size[1] / 2));
  const k = animalHeight(species, stage) / top;
  const parts: BodyPart[] = grown.map((p) => ({
    name: p.name,
    role: p.role,
    hit: p.hit,
    size: [p.size[0] * k, p.size[1] * k, p.size[2] * k],
    at: [p.at[0] * k, p.at[1] * k, p.at[2] * k],
  }));
  cache.set(key, parts);
  return parts;
}

const hitCache = new Map<number, readonly BodyPart[]>();

/** Las partes que golpean y chocan. */
export function hitPartsOf(species: Species, stage: Stage): readonly BodyPart[] {
  const key = species * 8 + stage;
  let parts = hitCache.get(key);
  if (!parts) {
    parts = partsOf(species, stage).filter((p) => p.hit);
    hitCache.set(key, parts);
  }
  return parts;
}
