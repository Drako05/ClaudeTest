/**
 * Mundo infinito por chunks, con la vida como poblacion de instancias.
 *
 * REGLA CENTRAL: lo que hay en un tile es `override ?? potencial`, y esa es la
 * UNICA fuente de verdad. La usan por igual el dibujo, la colision y la
 * recoleccion. Antes el renderer leia el potencial crudo mientras la colision
 * consultaba otra cosa, y por eso un arbol recolectado seguia dibujado aunque ya
 * no existiera para el juego.
 *
 * La vida no es un filtro sobre el potencial sino un conjunto de INSTANCIAS: al
 * recolectar, la planta desaparece de su tile y el ecosistema decide mas tarde
 * en que otro tile brota una nueva.
 */

import {
  BIOME_MAX_CHUNKS,
  BiomeKind,
  biomeOfTerrain,
  CHUNK_SIZE,
  CHUNK_TILES,
  COLONIZATION_SEED,
  DENSITY_CAP,
  densityOfKind,
  Feature,
  growthStep,
  isFeatureSolid,
  isOvercrowded,
  isSapling,
  isTerrainSolid,
  LIFE_KIND_COUNT,
  LIFE_STEP_TICKS,
  MATURATION_TICKS,
  LifeKind,
  lifeKindOf,
  maturesInto,
  mortalityStep,
  RARE_CHANCE,
  rareOf,
  speciesFor,
  Terrain,
  withinEquilibrium,
} from '@verdant/shared';
import { collectBiome, type BiomeStats } from './biome.js';
import { chunkKey, localCoord, toChunkCoord } from './coords.js';
import { hash2D, hash2DFloat } from './rng.js';
import { generateChunk, WorldGen } from './worldgen.js';

export interface Chunk {
  readonly cx: number;
  readonly cy: number;
  readonly terrain: Uint8Array;
  /** Potencial pristino del generador. Los cambios viven en los overrides. */
  readonly feature: Uint8Array;
  /** Sube cuando lo visible cambia; el renderer lo usa para invalidar cache. */
  revision: number;
}

/** Contabilidad de vida de un chunk. Persiste aunque el chunk se descarte. */
interface ChunkRecord {
  /** Bioma dominante del chunk. No cambia nunca, asi que se calcula una sola vez. */
  readonly biome: BiomeKind;
  /** Cuanta vida de cada tipo deberia haber. Es el equilibrio con el que nacio. */
  readonly reference: Float64Array;
  /** Instancias vivas ahora mismo, por tipo. */
  readonly count: Int32Array;
  /** Estado continuo de la poblacion, que es lo que evoluciona. */
  readonly pop: Float64Array;
}

export { chunkKey, localCoord, toChunkCoord } from './coords.js';

export class World {
  readonly seed: number;
  readonly gen: WorldGen;

  private readonly chunks = new Map<string, Chunk>();
  private readonly overrides = new Map<string, Map<number, Feature>>();
  private readonly records = new Map<string, ChunkRecord>();
  /** Brotes sembrados y el instante en que se plantaron, por clave de tile. */
  private readonly saplings = new Map<string, number>();
  /** Estadisticas de bioma memorizadas; se vacian cuando algo cambia. */
  private readonly biomeCache = new Map<string, BiomeStats>();

  private now = 0;
  private lifeSteps = 0;

  constructor(seed: number) {
    this.seed = seed >>> 0;
    this.gen = new WorldGen(this.seed);
  }

  get loadedChunkCount(): number {
    return this.chunks.size;
  }

  get trackedChunkCount(): number {
    return this.records.size;
  }

  get currentTick(): number {
    return this.now;
  }

  // ---------------------------------------------------------------- chunks

  getChunk(cx: number, cy: number): Chunk {
    const key = chunkKey(cx, cy);
    const existing = this.chunks.get(key);
    if (existing) return existing;

    const raw = generateChunk(this.gen, cx, cy);
    const chunk: Chunk = {
      cx,
      cy,
      terrain: raw.terrain,
      feature: new Uint8Array(raw.feature),
      revision: 0,
    };
    this.chunks.set(key, chunk);
    this.ensureRecord(chunk);
    return chunk;
  }

  /**
   * Crea la contabilidad de un chunk la primera vez que se genera.
   *
   * El referente sale de la MISMA tabla de densidades que uso el generador, asi
   * que el recuento real cae de forma natural alrededor de el: el chunk nace
   * dentro de su rango, no clavado en el centro, que es lo que pidio el autor.
   */
  private ensureRecord(chunk: Chunk): ChunkRecord {
    const key = chunkKey(chunk.cx, chunk.cy);
    const existing = this.records.get(key);
    if (existing) {
      // Ya existia: el chunk vuelve a cargarse y hay que reconciliar sus tiles.
      this.reconcile(chunk, existing);
      return existing;
    }

    const reference = new Float64Array(LIFE_KIND_COUNT);
    const histogram = new Int32Array(8);
    for (let i = 0; i < CHUNK_TILES; i++) {
      const terrain = chunk.terrain[i] as Terrain;
      reference[LifeKind.Tree] += densityOfKind(terrain, LifeKind.Tree);
      reference[LifeKind.Plant] += densityOfKind(terrain, LifeKind.Plant);
      histogram[biomeOfTerrain(terrain)]++;
    }

    let biome = BiomeKind.Ocean;
    for (let b = 1; b < histogram.length; b++) {
      if (histogram[b] > histogram[biome]) biome = b as BiomeKind;
    }

    const count = new Int32Array(LIFE_KIND_COUNT);
    for (let i = 0; i < CHUNK_TILES; i++) {
      const kind = lifeKindOf(this.featureAtIndex(chunk, i));
      if (kind !== null) count[kind]++;
    }

    const pop = new Float64Array(LIFE_KIND_COUNT);
    for (let k = 0; k < LIFE_KIND_COUNT; k++) pop[k] = count[k];

    const record: ChunkRecord = { biome, reference, count, pop };
    this.records.set(key, record);
    return record;
  }

  ensureAround(wx: number, wy: number, radiusChunks: number): void {
    const ccx = toChunkCoord(Math.floor(wx));
    const ccy = toChunkCoord(Math.floor(wy));
    for (let dy = -radiusChunks; dy <= radiusChunks; dy++) {
      for (let dx = -radiusChunks; dx <= radiusChunks; dx++) {
        this.getChunk(ccx + dx, ccy + dy);
      }
    }
  }

  pruneFar(wx: number, wy: number, keepRadiusChunks: number): void {
    const ccx = toChunkCoord(Math.floor(wx));
    const ccy = toChunkCoord(Math.floor(wy));
    for (const [key, chunk] of this.chunks) {
      if (
        Math.abs(chunk.cx - ccx) > keepRadiusChunks ||
        Math.abs(chunk.cy - ccy) > keepRadiusChunks
      ) {
        this.chunks.delete(key);
      }
    }
  }

  eachLoadedChunk(fn: (chunk: Chunk) => void): void {
    for (const chunk of this.chunks.values()) fn(chunk);
  }

  /** True si el chunk ha llegado a generarse alguna vez. */
  isTracked(cx: number, cy: number): boolean {
    return this.records.has(chunkKey(cx, cy));
  }

  // ----------------------------------------------------------------- tiles

  terrainAt(wx: number, wy: number): Terrain {
    const chunk = this.getChunk(toChunkCoord(wx), toChunkCoord(wy));
    return chunk.terrain[localCoord(wy) * CHUNK_SIZE + localCoord(wx)] as Terrain;
  }

  /** Lo que hay realmente en un tile. Unica fuente de verdad. */
  featureAt(wx: number, wy: number): Feature {
    const chunk = this.getChunk(toChunkCoord(wx), toChunkCoord(wy));
    return this.featureAtIndex(chunk, localCoord(wy) * CHUNK_SIZE + localCoord(wx));
  }

  private featureAtIndex(chunk: Chunk, idx: number): Feature {
    const ov = this.overrides.get(chunkKey(chunk.cx, chunk.cy));
    const overridden = ov?.get(idx);
    return overridden !== undefined ? overridden : (chunk.feature[idx] as Feature);
  }

  /**
   * Vuelca en `out` lo que hay realmente en cada tile del chunk.
   *
   * Existe para que el renderer dibuje exactamente lo mismo que ve la colision:
   * un solo recorrido y una sola consulta al overlay.
   */
  readFeatures(chunk: Chunk, out: Uint8Array): void {
    out.set(chunk.feature);
    const ov = this.overrides.get(chunkKey(chunk.cx, chunk.cy));
    if (!ov) return;
    for (const [idx, feature] of ov) out[idx] = feature;
  }

  isSolidAt(wx: number, wy: number): boolean {
    const chunk = this.getChunk(toChunkCoord(wx), toChunkCoord(wy));
    const idx = localCoord(wy) * CHUNK_SIZE + localCoord(wx);
    return (
      isTerrainSolid(chunk.terrain[idx] as Terrain) ||
      isFeatureSolid(this.featureAtIndex(chunk, idx))
    );
  }

  /** Cambia lo que hay en un tile y mantiene la contabilidad al dia. */
  setFeature(wx: number, wy: number, next: Feature): void {
    const cx = toChunkCoord(wx);
    const cy = toChunkCoord(wy);
    const key = chunkKey(cx, cy);
    const chunk = this.getChunk(cx, cy);
    const idx = localCoord(wy) * CHUNK_SIZE + localCoord(wx);

    const before = this.featureAtIndex(chunk, idx);
    if (before === next) return;

    let ov = this.overrides.get(key);
    if (!ov) {
      ov = new Map();
      this.overrides.set(key, ov);
    }
    ov.set(idx, next);

    const record = this.records.get(key);
    if (record) {
      const wasKind = lifeKindOf(before);
      const isKind = lifeKindOf(next);
      if (wasKind !== null) record.count[wasKind]--;
      if (isKind !== null) record.count[isKind]++;
      // La poblacion continua sigue al recuento real cuando cambia por accion
      // directa: recolectar o sembrar mueve el ecosistema, no solo el tile.
      for (let k = 0; k < LIFE_KIND_COUNT; k++) record.pop[k] = record.count[k];
    }

    chunk.revision++;
    this.biomeCache.clear();
  }

  /** Siembra un brote, que madurara a adulto pasado su tiempo. */
  plantSapling(wx: number, wy: number, sapling: Feature): void {
    this.setFeature(wx, wy, sapling);
    this.saplings.set(`${wx},${wy}`, this.now);
  }

  // ------------------------------------------------------------------ vida

  setNow(tick: number): void {
    this.now = tick;
    this.matureSaplings();
    this.advanceLife(tick);
  }

  private matureSaplings(): void {
    if (this.saplings.size === 0) return;
    for (const [key, plantedAt] of this.saplings) {
      if (this.now - plantedAt < MATURATION_TICKS) continue;
      const comma = key.indexOf(',');
      const wx = Number(key.slice(0, comma));
      const wy = Number(key.slice(comma + 1));
      const adult = maturesInto(this.featureAt(wx, wy));
      if (adult !== Feature.None) this.setFeature(wx, wy, adult);
      this.saplings.delete(key);
    }
  }

  /**
   * Adelanta la vida en pasos globales fijos.
   *
   * Avanzan TODOS los chunks conocidos a la vez, este cargado lo que este: es lo
   * que hace que ponerse al dia de golpe y simular continuamente den el mismo
   * resultado, y por tanto lo que sostiene la ley del observador.
   */
  private advanceLife(tick: number): void {
    const target = Math.floor(tick / LIFE_STEP_TICKS);
    if (target <= this.lifeSteps) return;
    const pending = Math.min(target - this.lifeSteps, 20000);
    for (let i = 0; i < pending; i++) this.lifeStep();
    this.lifeSteps = target;
  }

  private lifeStep(): void {
    for (const [key, record] of this.records) {
      const comma = key.indexOf(',');
      const cx = Number(key.slice(0, comma));
      const cy = Number(key.slice(comma + 1));

      for (const kind of [LifeKind.Tree, LifeKind.Plant]) {
        const reference = record.reference[kind];
        if (reference <= 0) {
          record.pop[kind] = 0;
          continue;
        }

        let v = record.pop[kind];
        if (v > reference) {
          v -= mortalityStep(v, reference);
        } else {
          // Cero es un punto fijo de la logistica: sin este empujon desde una
          // fuente cercana, un chunk arrasado no volveria a crecer nunca.
          if (v <= 0 && this.hasNearbySource(cx, cy, kind)) {
            v = reference * COLONIZATION_SEED;
          }
          v += growthStep(v, reference);
        }
        record.pop[kind] = Math.max(0, Math.min(reference * DENSITY_CAP * 2, v));
      }
    }

    // Materializar solo lo cargado: lo demas se reconcilia al volver a cargarse.
    for (const chunk of this.chunks.values()) {
      const record = this.records.get(chunkKey(chunk.cx, chunk.cy));
      if (record) this.reconcile(chunk, record);
    }
    this.biomeCache.clear();
  }

  /** True si hay vida de ese tipo en el chunk o en alguno de sus ocho vecinos. */
  private hasNearbySource(cx: number, cy: number, kind: LifeKind): boolean {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const record = this.records.get(chunkKey(cx + dx, cy + dy));
        if (record) {
          if (record.count[kind] > 0 || record.pop[kind] > 0) return true;
        } else if (this.pristineSupports(cx + dx, cy + dy, kind)) {
          // Un chunk que nadie ha visitado sigue intacto: si su terreno sostiene
          // esa vida, la tiene.
          return true;
        }
      }
    }
    return false;
  }

  /** Muestreo barato y puro: no obliga a generar el chunk entero. */
  private pristineSupports(cx: number, cy: number, kind: LifeKind): boolean {
    for (let sy = 0; sy < 4; sy++) {
      for (let sx = 0; sx < 4; sx++) {
        const wx = cx * CHUNK_SIZE + sx * 8 + 4;
        const wy = cy * CHUNK_SIZE + sy * 8 + 4;
        if (densityOfKind(this.gen.terrainAt(wx, wy), kind) > 0) return true;
      }
    }
    return false;
  }

  /** Ajusta las instancias del chunk hasta que coincidan con su poblacion. */
  private reconcile(chunk: Chunk, record: ChunkRecord): void {
    for (const kind of [LifeKind.Tree, LifeKind.Plant]) {
      const target = Math.round(record.pop[kind]);
      let guard = CHUNK_TILES;
      while (record.count[kind] < target && guard-- > 0) {
        if (!this.sprout(chunk, record, kind)) break;
      }
      guard = CHUNK_TILES;
      while (record.count[kind] > target && guard-- > 0) {
        if (!this.wither(chunk, record, kind)) break;
      }
    }
  }

  /**
   * Hace brotar una planta en un tile apto del chunk.
   *
   * El tile puede ser cualquiera del chunk que sostenga esa vida y este libre.
   * No hace falta que sea contiguo a otra planta: como razono el autor, en un
   * bosque real las semillas viajan con el viento y los animales, asi que basta
   * con que haya un origen plausible cerca, y de eso ya se encarga
   * `hasNearbySource` antes de que la poblacion crezca.
   */
  private sprout(chunk: Chunk, record: ChunkRecord, kind: LifeKind): boolean {
    const start = hash2D(this.seed ^ 0x7ab3d19f, chunk.cx * 73856093 + chunk.cy, this.lifeSteps + record.count[kind]) % CHUNK_TILES;
    for (let n = 0; n < CHUNK_TILES; n++) {
      const idx = (start + n) % CHUNK_TILES;
      const terrain = chunk.terrain[idx] as Terrain;
      if (densityOfKind(terrain, kind) <= 0) continue;
      if (this.featureAtIndex(chunk, idx) !== Feature.None) continue;

      const species = speciesFor(biomeOfTerrain(terrain), kind);
      if (species === Feature.None) continue;

      const wx = chunk.cx * CHUNK_SIZE + (idx % CHUNK_SIZE);
      const wy = chunk.cy * CHUNK_SIZE + Math.floor(idx / CHUNK_SIZE);
      const balanced = this.isBiomeBalanced(chunk.cx, chunk.cy);
      const roll = hash2DFloat(this.seed ^ 0x3c79a5b1, wx, wy + this.lifeSteps);
      const grown = balanced && roll < RARE_CHANCE ? rareOf(species) : species;

      this.applyInstance(chunk, record, idx, grown);
      return true;
    }
    return false;
  }

  /** Retira una instancia por competencia. */
  private wither(chunk: Chunk, record: ChunkRecord, kind: LifeKind): boolean {
    const start = hash2D(this.seed ^ 0x1d5c9e33, chunk.cx * 19349663 + chunk.cy, this.lifeSteps + record.count[kind]) % CHUNK_TILES;
    for (let n = 0; n < CHUNK_TILES; n++) {
      const idx = (start + n) % CHUNK_TILES;
      const feature = this.featureAtIndex(chunk, idx);
      if (lifeKindOf(feature) !== kind) continue;
      this.applyInstance(chunk, record, idx, Feature.None);
      return true;
    }
    return false;
  }

  /** Escribe una instancia sin tocar la poblacion continua, que ya la dicto. */
  private applyInstance(chunk: Chunk, record: ChunkRecord, idx: number, next: Feature): void {
    const key = chunkKey(chunk.cx, chunk.cy);
    let ov = this.overrides.get(key);
    if (!ov) {
      ov = new Map();
      this.overrides.set(key, ov);
    }
    const before = this.featureAtIndex(chunk, idx);
    ov.set(idx, next);

    const wasKind = lifeKindOf(before);
    const isKind = lifeKindOf(next);
    if (wasKind !== null) record.count[wasKind]--;
    if (isKind !== null) record.count[isKind]++;

    if (isSapling(before)) {
      const wx = chunk.cx * CHUNK_SIZE + (idx % CHUNK_SIZE);
      const wy = chunk.cy * CHUNK_SIZE + Math.floor(idx / CHUNK_SIZE);
      this.saplings.delete(`${wx},${wy}`);
    }
    chunk.revision++;
  }

  // ------------------------------------------------------------ estadisticas

  /** Bioma dominante de un chunk ya generado. */
  biomeKindOf(cx: number, cy: number): BiomeKind {
    return this.records.get(chunkKey(cx, cy))?.biome ?? BiomeKind.Ocean;
  }

  referenceOf(cx: number, cy: number, kind: LifeKind): number {
    return this.records.get(chunkKey(cx, cy))?.reference[kind] ?? 0;
  }

  countOf(cx: number, cy: number, kind: LifeKind): number {
    return this.records.get(chunkKey(cx, cy))?.count[kind] ?? 0;
  }

  populationOf(cx: number, cy: number, kind: LifeKind): number {
    return this.records.get(chunkKey(cx, cy))?.pop[kind] ?? 0;
  }

  /** Fija la poblacion directamente. Solo para tests y herramientas. */
  setPopulation(cx: number, cy: number, kind: LifeKind, value: number): void {
    const chunk = this.getChunk(cx, cy);
    const record = this.records.get(chunkKey(cx, cy));
    if (!record) return;
    record.pop[kind] = Math.max(0, value);
    this.reconcile(chunk, record);
    this.biomeCache.clear();
  }

  /** True si el chunk esta saturado: por encima de su tope de densidad. */
  isChunkOvercrowded(cx: number, cy: number): boolean {
    const record = this.records.get(chunkKey(cx, cy));
    if (!record) return false;
    for (const kind of [LifeKind.Tree, LifeKind.Plant]) {
      if (isOvercrowded(record.count[kind], record.reference[kind])) return true;
    }
    return false;
  }

  /** Estadisticas del bioma al que pertenece un chunk, memorizadas por tick. */
  biomeStats(cx: number, cy: number): BiomeStats {
    const key = chunkKey(cx, cy);
    const cached = this.biomeCache.get(key);
    if (cached) return cached;
    const stats = collectBiome(this, cx, cy, BIOME_MAX_CHUNKS);
    this.biomeCache.set(key, stats);
    return stats;
  }

  isBiomeBalanced(cx: number, cy: number): boolean {
    return this.biomeStats(cx, cy).balanced;
  }

  /** True si el chunk esta dentro de su rango para todos los tipos de vida. */
  isChunkBalanced(cx: number, cy: number): boolean {
    const record = this.records.get(chunkKey(cx, cy));
    if (!record) return true;
    for (const kind of [LifeKind.Tree, LifeKind.Plant]) {
      if (!withinEquilibrium(record.count[kind], record.reference[kind])) return false;
    }
    return true;
  }

  findSpawn(originX = 0, originY = 0, maxRadius = 400): { x: number; y: number } {
    for (let r = 0; r <= maxRadius; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          const x = originX + dx;
          const y = originY + dy;
          if (!this.isSolidAt(x, y)) return { x: x + 0.5, y: y + 0.5 };
        }
      }
    }
    return { x: originX + 0.5, y: originY + 0.5 };
  }
}
