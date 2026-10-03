/**
 * La fauna en el nucleo: quien vive en cada chunk y por donde anda.
 *
 * **La fauna es potencial del chunk, como sus plantas** (plan aprobado por el
 * autor, 2026-10-02). `faunaOf` es pura —reglas 2 y 3—: el mismo chunk da los
 * mismos animales, en cualquier orden y por mucho que se descarte y se
 * regenere. Su muerte no vive aqui sino en el overlay de `World`, por la clave
 * de cada animal (regla 4): un animal muerto no vuelve nunca, que es la ley de
 * que la vida no surge sola. Su daño, en cambio, se olvida al recargarse
 * (decision del autor, 2026-10-03).
 *
 * **Donde esta un animal es funcion del tiempo.** Cada uno tiene un territorio
 * alrededor de su casilla de origen, y en cada periodo de paseo un punto de
 * paso que sale de un hash de su clave y del numero de periodo. Mientras se le
 * ve, anda hacia el; al cargarse su chunk, aparece donde le toca en ese
 * periodo. Visto o no, coincide en los puntos de paso, y lo que cambia entre
 * medias es la forma de llegar: la ley del observador se cumple como en las
 * plantas, estadisticamente.
 *
 * En esta tanda **solo deambulan** (decision del autor): ni huyen ni
 * reaccionan, no entran en el paso de vida y la etapa es fija hasta la
 * reproduccion.
 */

import {
  biomeOfTerrain,
  CHUNK_SIZE,
  CHUNK_TILES,
  densityPerChunk,
  Feature,
  isFeatureSolid,
  isTerrainSolid,
  meanGroup,
  Sex,
  SPECIES,
  SPECIES_COUNT,
  Species,
  Stage,
  STAGE_SHARE,
  Terrain,
  TICK_HZ,
} from '@verdant/shared';
import { hash2DFloat } from './rng.js';
import type { WorldGen } from './worldgen.js';

/** Un animal tal como lo da su chunk: quien es y de donde es. */
export interface Animal {
  /** Clave estable en todo el mundo: `cx,cy,n`. Es la del overlay. */
  readonly key: string;
  readonly species: Species;
  readonly stage: Stage;
  readonly sex: Sex;
  /** El centro de su territorio, en coordenadas del mundo. */
  readonly homeX: number;
  readonly homeY: number;
  /** Desfase de sus periodos de paseo, para que no anden todos a la vez. */
  readonly phase: number;
}

/**
 * Lo que dura un periodo de paseo: cada animal elige un punto de paso nuevo
 * cada 20 s. **Deduccion mia.**
 */
export const WANDER_PERIOD_TICKS = 20 * TICK_HZ;

/**
 * A cuantos chunks del jugador hay fauna en el mundo, materializada. Lo que
 * queda mas lejos existe igual —es potencial de su chunk—, pero no anda.
 * Con el territorio mas grande, 16 casillas, un animal de un chunk a 2 no sale
 * de los 3 que el nucleo tiene siempre cargados, asi que andar no genera
 * chunks.
 */
export const FAUNA_RADIUS_CHUNKS = 2;

/** Lo cerca que tiene que llegar a su punto de paso para pararse, en bloques. */
export const ARRIVE_DISTANCE = 0.3;

// Sales de cada sorteo, para que ninguno se parezca a otro.
const SALT_GROUPS = 0x5b1d7e43;
const SALT_HOME = 0x2c9f1a65;
const SALT_SIZE = 0x7e3b52d1;
const SALT_STAGE = 0x13a7c9e5;
const SALT_SEX = 0x6f0d2b97;
const SALT_JITTER = 0x48e6a31f;
const SALT_PHASE = 0x3d82f6bb;
const SALT_WAY_A = 0x1f9e4c27;
const SALT_WAY_R = 0x6a2d8e13;

/** True si un animal de esa especie puede pisar ese suelo. */
export function habitable(species: Species, terrain: Terrain, feature: Feature): boolean {
  return (
    biomeOfTerrain(terrain) === SPECIES[species].biome &&
    !isTerrainSolid(terrain) &&
    !isFeatureSolid(feature)
  );
}

/** La etapa que toca a un sorteo en [0, 1), con las proporciones de `STAGE_SHARE`. */
export function stageFor(roll: number): Stage {
  if (roll < STAGE_SHARE[Stage.Infant]) return Stage.Infant;
  if (roll < STAGE_SHARE[Stage.Infant] + STAGE_SHARE[Stage.Juvenile]) return Stage.Juvenile;
  return Stage.Adult;
}

/**
 * Los animales del chunk `(cx, cy)`, a partir de su terreno y su potencial.
 *
 * Pura: solo depende de la semilla y de los datos del chunk, que a su vez solo
 * dependen de `(gen, cx, cy)`. Por especie:
 * - cuantos le tocan es su densidad por chunk por la parte del chunk que es de
 *   su bioma, y se reparten en grupos de su tamano real; el decimal que sobra
 *   se sortea, asi la media es la que dice la densidad;
 * - cada grupo tiene una casilla de origen apta, y sus miembros se reparten a
 *   su alrededor;
 * - cada miembro sortea su etapa y su sexo; un grupo de dos o mas lleva al
 *   menos un adulto.
 */
export function faunaOf(
  seed: number,
  cx: number,
  cy: number,
  terrain: Uint8Array,
  feature: Uint8Array,
): Animal[] {
  const out: Animal[] = [];
  const baseX = cx * CHUNK_SIZE;
  const baseY = cy * CHUNK_SIZE;
  let n = 0;

  for (let s = 0 as Species; s < SPECIES_COUNT; s++) {
    const info = SPECIES[s];
    let biomeTiles = 0;
    const apt: number[] = [];
    for (let i = 0; i < CHUNK_TILES; i++) {
      const t = terrain[i] as Terrain;
      if (biomeOfTerrain(t) !== info.biome) continue;
      biomeTiles++;
      if (habitable(s, t, feature[i] as Feature)) apt.push(i);
    }
    if (apt.length === 0) continue;

    const expected = (densityPerChunk(s) * biomeTiles) / CHUNK_TILES / meanGroup(s);
    const whole = Math.floor(expected);
    const groups = whole + (hash2DFloat(seed ^ SALT_GROUPS, cx * 31 + s, cy) < expected - whole ? 1 : 0);

    for (let g = 0; g < groups; g++) {
      const pick = (salt: number, m: number) => hash2DFloat(seed ^ salt, cx * 4099 + s * 97 + g, cy * 4093 + m);
      const homeIdx = apt[Math.min(apt.length - 1, Math.floor(pick(SALT_HOME, 0) * apt.length))];
      const hx = homeIdx % CHUNK_SIZE;
      const hy = Math.floor(homeIdx / CHUNK_SIZE);
      const size = info.groupMin + Math.floor(pick(SALT_SIZE, 0) * (info.groupMax - info.groupMin + 1));

      const stages: Stage[] = [];
      for (let m = 0; m < size; m++) stages.push(stageFor(pick(SALT_STAGE, m)));
      if (size >= 2 && !stages.includes(Stage.Adult)) stages[0] = Stage.Adult;

      for (let m = 0; m < size; m++) {
        // Cada miembro, a hasta dos casillas del origen del grupo, si esa
        // casilla tambien es apta; si no, en el origen.
        let lx = hx;
        let ly = hy;
        if (m > 0) {
          const jx = hx + Math.floor(pick(SALT_JITTER, m * 2) * 5) - 2;
          const jy = hy + Math.floor(pick(SALT_JITTER, m * 2 + 1) * 5) - 2;
          if (jx >= 0 && jy >= 0 && jx < CHUNK_SIZE && jy < CHUNK_SIZE) {
            const j = jy * CHUNK_SIZE + jx;
            if (habitable(s, terrain[j] as Terrain, feature[j] as Feature)) {
              lx = jx;
              ly = jy;
            }
          }
        }
        out.push({
          key: `${cx},${cy},${n++}`,
          species: s,
          stage: stages[m],
          sex: pick(SALT_SEX, m) < 0.5 ? Sex.Female : Sex.Male,
          homeX: baseX + lx + 0.5,
          homeY: baseY + ly + 0.5,
          phase: Math.floor(pick(SALT_PHASE, m) * WANDER_PERIOD_TICKS),
        });
      }
    }
  }
  return out;
}

/** El periodo de paseo en que esta un animal en un tick. */
export function periodOf(animal: Animal, tick: number): number {
  return Math.floor((tick + animal.phase) / WANDER_PERIOD_TICKS);
}

/** Un numero estable por animal, de su clave, para los sorteos del paseo. */
function keyHash(key: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h | 0;
}

/**
 * El punto de paso de un animal en un periodo: el centro de un tile apto de su
 * bioma dentro de su territorio. Puro: sale del generador, no de lo cargado,
 * asi que no genera chunks ni depende de quien mire. Si en seis intentos no da
 * con uno apto, se queda en su origen.
 *
 * El centro, y no un punto cualquiera del tile: el cuerpo cabe entero en su
 * casilla sin rozar las vecinas, asi que al cargarse el chunk el animal aparece
 * EXACTAMENTE en su punto de paso. Con un punto junto a la orilla, la caja del
 * cuerpo tocaba el agua y el animal nacia en su origen y echaba a andar.
 */
export function waypointOf(gen: WorldGen, animal: Animal, period: number): { x: number; y: number } {
  const info = SPECIES[animal.species];
  const id = keyHash(animal.key);
  for (let attempt = 0; attempt < 6; attempt++) {
    const a = hash2DFloat(gen.seed ^ SALT_WAY_A, id, period * 8 + attempt) * Math.PI * 2;
    const r = Math.sqrt(hash2DFloat(gen.seed ^ SALT_WAY_R, id, period * 8 + attempt)) * info.territory;
    const x = animal.homeX + Math.cos(a) * r;
    const y = animal.homeY + Math.sin(a) * r;
    const tx = Math.floor(x);
    const ty = Math.floor(y);
    const terrain = gen.terrainAt(tx, ty);
    if (habitable(animal.species, terrain, gen.featureAt(tx, ty, terrain))) return { x: tx + 0.5, y: ty + 0.5 };
  }
  return { x: animal.homeX, y: animal.homeY };
}
