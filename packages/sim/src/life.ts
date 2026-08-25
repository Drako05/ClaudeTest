/**
 * La vida vegetal del mundo.
 *
 * Modelo: cada chunk tiene una densidad de vegetacion en [0, K], donde K es su
 * capacidad de carga, derivada del bioma. La densidad evoluciona con un
 * crecimiento logistico mas un termino de migracion desde los chunks vecinos.
 *
 * Dos leyes del libro estan codificadas directamente en esa formula:
 *
 *   «Los ecosistemas tienden hacia estados dinamicos de equilibrio»
 *      -> el termino logistico converge a K y no lo supera.
 *
 *   «Las entidades vivas no surgen automaticamente, vienen de un proceso que
 *    les permita existir»
 *      -> con v = 0 el termino logistico vale EXACTAMENTE cero. Un chunk
 *         arrasado no revive por generacion espontanea; solo puede repoblarse
 *         desde vecinos que tengan vida. La ley no es un comentario, es la
 *         aritmetica: no se puede violar sin cambiar la formula.
 *
 * Y una tercera gobierna como se ejecuta:
 *
 *   «El mundo existe independientemente de cualquier observador»
 *      -> todos los chunks perturbados avanzan A LA VEZ, en pasos globales
 *         fijos, tenga el jugador cargado lo que tenga. No hay un camino
 *         "cerca del jugador" y otro "lejos": hay uno solo.
 */

import { CHUNK_SIZE, LIFE_STEP_TICKS, Terrain } from '@verdant/shared';
import type { WorldGen } from './worldgen.js';

/** Cuanto crece la vegetacion por paso, en fraccion de su capacidad. */
const GROWTH_RATE = 0.02;
/** Cuanta vida se contagia por paso desde los chunks vecinos. */
const MIGRATION_RATE = 0.004;
/** Por debajo de esta diferencia, un chunk se considera ya recuperado. */
const HEALED_EPSILON = 0.004;

/**
 * Tope de pasos que se ponen al dia de una vez. Solo entra en juego ante un
 * salto de tiempo enorme (una partida guardada muy antigua); durante el juego
 * normal cada llamada avanza cero o un paso.
 */
const MAX_CATCHUP_STEPS = 20000;

/** Cuanto contribuye cada terreno a la capacidad de carga vegetal. */
function fertility(t: Terrain): number {
  switch (t) {
    case Terrain.Forest:
      return 1;
    case Terrain.Grass:
      return 0.62;
    case Terrain.Tundra:
      return 0.22;
    case Terrain.Sand:
      return 0.05;
    default:
      return 0; // agua, roca y nieve no sostienen vegetacion
  }
}

export function chunkKeyOf(cx: number, cy: number): string {
  return `${cx},${cy}`;
}

export class WorldLife {
  /** Densidad de vegetacion de los chunks PERTURBADOS. Los ausentes estan intactos. */
  private readonly disturbed = new Map<string, number>();
  private readonly capacities = new Map<string, number>();
  /** Cuantos pasos de vida se han ejecutado desde el origen del mundo. */
  private steps = 0;

  constructor(private readonly gen: WorldGen) {}

  get disturbedCount(): number {
    return this.disturbed.size;
  }

  get stepsRun(): number {
    return this.steps;
  }

  /**
   * Capacidad de carga de un chunk, en [0, 1].
   *
   * Se estima muestreando una rejilla fija de tiles en vez de generar el chunk
   * entero. Es funcion pura de la semilla y las coordenadas, asi que vale igual
   * para un chunk cargado que para uno que nadie ha visitado nunca: sin eso, la
   * vegetacion dependeria de por donde ha pasado el jugador.
   */
  capacityOf(cx: number, cy: number): number {
    const key = chunkKeyOf(cx, cy);
    const cached = this.capacities.get(key);
    if (cached !== undefined) return cached;

    const samples = 4;
    const stride = CHUNK_SIZE / samples;
    let total = 0;
    for (let sy = 0; sy < samples; sy++) {
      for (let sx = 0; sx < samples; sx++) {
        const wx = cx * CHUNK_SIZE + Math.floor((sx + 0.5) * stride);
        const wy = cy * CHUNK_SIZE + Math.floor((sy + 0.5) * stride);
        total += fertility(this.gen.terrainAt(wx, wy));
      }
    }
    const capacity = total / (samples * samples);
    this.capacities.set(key, capacity);
    return capacity;
  }

  /** Densidad actual. Un chunk que nadie ha tocado esta en su capacidad plena. */
  vegetationOf(cx: number, cy: number): number {
    const known = this.disturbed.get(chunkKeyOf(cx, cy));
    return known !== undefined ? known : this.capacityOf(cx, cy);
  }

  /** Fraccion de la capacidad, en [0, 1]. Es lo que decide cuantas plantas hay. */
  densityOf(cx: number, cy: number): number {
    const capacity = this.capacityOf(cx, cy);
    if (capacity <= 0) return 0;
    return Math.min(1, Math.max(0, this.vegetationOf(cx, cy) / capacity));
  }

  /** Retira vida de un chunk. Es el rastro que deja recolectar. */
  disturb(cx: number, cy: number, amount: number): void {
    const capacity = this.capacityOf(cx, cy);
    if (capacity <= 0) return;
    const key = chunkKeyOf(cx, cy);
    const current = this.disturbed.get(key) ?? capacity;
    this.disturbed.set(key, Math.min(capacity, Math.max(0, current - amount)));
  }

  /** Fija la densidad directamente. Solo para tests y herramientas. */
  setVegetation(cx: number, cy: number, value: number): void {
    const capacity = this.capacityOf(cx, cy);
    this.disturbed.set(chunkKeyOf(cx, cy), Math.min(capacity, Math.max(0, value)));
  }

  /**
   * Pone la vida al dia hasta el tick indicado.
   *
   * Avanza siempre en pasos completos y globales, asi que llamar cada tick o
   * llamar una sola vez tras un largo intervalo produce el mismo resultado.
   */
  advanceTo(tick: number): void {
    const target = Math.floor(tick / LIFE_STEP_TICKS);
    let pending = target - this.steps;
    if (pending <= 0) return;
    if (pending > MAX_CATCHUP_STEPS) pending = MAX_CATCHUP_STEPS;

    for (let i = 0; i < pending; i++) this.stepOnce();
    this.steps = target;
  }

  /** Un paso de vida sobre todos los chunks perturbados a la vez. */
  private stepOnce(): void {
    if (this.disturbed.size === 0) return;

    // Se calculan todos los valores nuevos antes de aplicar ninguno: si se
    // aplicaran sobre la marcha, el resultado dependeria del orden del Map.
    const next = new Map<string, number>();

    for (const [key, v] of this.disturbed) {
      const comma = key.indexOf(',');
      const cx = Number(key.slice(0, comma));
      const cy = Number(key.slice(comma + 1));
      const capacity = this.capacityOf(cx, cy);

      if (capacity <= 0) {
        next.set(key, 0);
        continue;
      }

      const neighbours =
        (this.vegetationOf(cx + 1, cy) +
          this.vegetationOf(cx - 1, cy) +
          this.vegetationOf(cx, cy + 1) +
          this.vegetationOf(cx, cy - 1)) /
        4;

      const growth = GROWTH_RATE * v * (1 - v / capacity);
      // La migracion solo APORTA vida, nunca la resta.
      //
      // Con un termino bidireccional, un chunk fertil rodeado de terreno pobre
      // se estabilizaba por debajo de su capacidad y por tanto no se daba nunca
      // por recuperado, con lo que jamas se olvidaba y la memoria crecia sin
      // limite. Ademas implicaba que un paramo vecino MATA tu bosque, y la ley
      // habla de que la vida se propague, no de que succione.
      const migration = MIGRATION_RATE * Math.max(0, neighbours - v);
      next.set(key, Math.min(capacity, Math.max(0, v + growth + migration)));
    }

    for (const [key, v] of next) this.disturbed.set(key, v);
    this.forgetHealed();
  }

  /**
   * Olvida los chunks que ya se recuperaron del todo.
   *
   * Un chunk indistinguible de uno intacto no necesita recordarse, y sin esto
   * la memoria creceria sin limite con cada zona que el jugador toque. Solo se
   * olvida si sus vecinos tambien estan sanos: junto a una zona arrasada, la
   * migracion todavia lo afecta y perder ese dato falsearia el borde.
   */
  private forgetHealed(): void {
    for (const [key, v] of this.disturbed) {
      const comma = key.indexOf(',');
      const cx = Number(key.slice(0, comma));
      const cy = Number(key.slice(comma + 1));
      if (v < this.capacityOf(cx, cy) - HEALED_EPSILON) continue;

      const neighboursHealthy =
        this.isHealthy(cx + 1, cy) &&
        this.isHealthy(cx - 1, cy) &&
        this.isHealthy(cx, cy + 1) &&
        this.isHealthy(cx, cy - 1);
      if (neighboursHealthy) this.disturbed.delete(key);
    }
  }

  private isHealthy(cx: number, cy: number): boolean {
    const known = this.disturbed.get(chunkKeyOf(cx, cy));
    if (known === undefined) return true;
    return known >= this.capacityOf(cx, cy) - HEALED_EPSILON;
  }
}
