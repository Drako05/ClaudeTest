/**
 * Mundo infinito por chunks, con la vida como poblacion de instancias.
 *
 * REGLA CENTRAL: lo que hay en un tile es `override ?? potencial`, y esa es la
 * UNICA fuente de verdad. La usan por igual el dibujo, la colision y la
 * recoleccion.
 *
 * La contabilidad de vida va por **(chunk, bioma, tipo)**, no por chunk. Un
 * chunk mixto de bosque y pradera lleva cuentas separadas para cada uno: si no,
 * sus arboles de bosque y los de pradera se sumarian bajo un mismo referente, y
 * el panel podria anunciar un bioma distinto del suelo que pisa el jugador.
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
  LIFE_SLOTS,
  LIFE_STEP_TICKS,
  lifeSlot,
  LifeKind,
  lifeKindOf,
  LIVING_BIOMES,
  LIVING_KINDS,
  MATURATION_TICKS,
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

export { chunkKey, localCoord, toChunkCoord } from './coords.js';

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
  /** Cuanta vida deberia haber, por (bioma, tipo). Es el equilibrio de origen. */
  readonly reference: Float64Array;
  /** Instancias vivas ahora mismo. */
  readonly count: Int32Array;
  /** Estado continuo de la poblacion, que es lo que evoluciona. */
  readonly pop: Float64Array;
  /** Biomas presentes en el chunk, como mascara de bits. */
  biomes: number;
  /**
   * Que casillas tenian vida al EMPEZAR el paso actual.
   *
   * La colonizacion mira a los vecinos, y los vecinos cambian dentro del mismo
   * paso: sin esta foto fija, que un chunk arrasado reviva o no dependeria del
   * orden en que se generaron los chunks, es decir, de por donde paseo el
   * jugador. Con ella, un paso de vida lee un estado congelado y escribe en
   * otro, que es lo que exige la ley del observador.
   */
  readonly live: Uint8Array;
}

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
   * dentro de su rango y no clavado en el centro.
   */
  private ensureRecord(chunk: Chunk): ChunkRecord {
    const key = chunkKey(chunk.cx, chunk.cy);
    const existing = this.records.get(key);
    if (existing) {
      this.reconcile(chunk, existing);
      return existing;
    }

    const reference = new Float64Array(LIFE_SLOTS);
    const count = new Int32Array(LIFE_SLOTS);
    const pop = new Float64Array(LIFE_SLOTS);
    let biomes = 0;

    for (let i = 0; i < CHUNK_TILES; i++) {
      const terrain = chunk.terrain[i] as Terrain;
      const biome = biomeOfTerrain(terrain);
      biomes |= 1 << biome;
      for (const kind of LIVING_KINDS) {
        reference[lifeSlot(biome, kind)] += densityOfKind(terrain, kind);
      }
      const kind = lifeKindOf(this.featureAtIndex(chunk, i));
      if (kind !== null) count[lifeSlot(biome, kind)]++;
    }

    for (let s = 0; s < LIFE_SLOTS; s++) pop[s] = count[s];

    const live = new Uint8Array(LIFE_SLOTS);
    for (let s = 0; s < LIFE_SLOTS; s++) live[s] = pop[s] > 0 || count[s] > 0 ? 1 : 0;

    const record: ChunkRecord = { reference, count, pop, biomes, live };
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

  /** True si el chunk contiene algun tile de ese bioma. */
  hasBiome(cx: number, cy: number, biome: BiomeKind): boolean {
    const record = this.records.get(chunkKey(cx, cy));
    return record ? (record.biomes & (1 << biome)) !== 0 : false;
  }

  // ----------------------------------------------------------------- tiles

  terrainAt(wx: number, wy: number): Terrain {
    const chunk = this.getChunk(toChunkCoord(wx), toChunkCoord(wy));
    return chunk.terrain[localCoord(wy) * CHUNK_SIZE + localCoord(wx)] as Terrain;
  }

  /**
   * Bioma del suelo que hay en un tile.
   *
   * Es lo que decide el bioma que se anuncia al jugador: el del terreno que
   * pisa, no el predominante de su chunk. Antes se usaba el del chunk y por eso
   * el panel podia decir bosque estando sobre hierba.
   */
  biomeAt(wx: number, wy: number): BiomeKind {
    return biomeOfTerrain(this.terrainAt(wx, wy));
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
    const chunk = this.getChunk(cx, cy);
    const idx = localCoord(wy) * CHUNK_SIZE + localCoord(wx);
    const record = this.records.get(chunkKey(cx, cy));
    const biome = biomeOfTerrain(chunk.terrain[idx] as Terrain);

    if (!this.writeTile(chunk, idx, next, biome)) return;

    // La poblacion continua sigue al recuento real cuando cambia por accion
    // directa: recolectar o sembrar mueve el ecosistema, no solo el tile.
    if (record) {
      for (const kind of LIVING_KINDS) {
        const slot = lifeSlot(biome, kind);
        record.pop[slot] = record.count[slot];
      }
    }
    this.biomeCache.clear();
  }

  /**
   * Escribe un tile y ajusta los recuentos. Devuelve false si no cambio nada.
   *
   * El bioma al que se imputa el cambio es el del TERRENO del tile, no el de la
   * especie: asi lo que se planta y lo que brota siempre cuentan en el mismo
   * sitio, sin que puedan descuadrarse.
   */
  private writeTile(chunk: Chunk, idx: number, next: Feature, biome: BiomeKind): boolean {
    const key = chunkKey(chunk.cx, chunk.cy);
    const before = this.featureAtIndex(chunk, idx);
    if (before === next) return false;

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
      if (wasKind !== null) record.count[lifeSlot(biome, wasKind)]--;
      if (isKind !== null) record.count[lifeSlot(biome, isKind)]++;
    }

    if (isSapling(before)) {
      const wx = chunk.cx * CHUNK_SIZE + (idx % CHUNK_SIZE);
      const wy = chunk.cy * CHUNK_SIZE + Math.floor(idx / CHUNK_SIZE);
      this.saplings.delete(`${wx},${wy}`);
    }

    chunk.revision++;
    return true;
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
    // Foto fija de donde hay vida antes de tocar nada: ver `ChunkRecord.live`.
    for (const record of this.records.values()) {
      for (let s = 0; s < LIFE_SLOTS; s++) {
        record.live[s] = record.pop[s] > 0 || record.count[s] > 0 ? 1 : 0;
      }
    }

    for (const [key, record] of this.records) {
      const comma = key.indexOf(',');
      const cx = Number(key.slice(0, comma));
      const cy = Number(key.slice(comma + 1));

      for (const biome of LIVING_BIOMES) {
        if ((record.biomes & (1 << biome)) === 0) continue;
        for (const kind of LIVING_KINDS) {
          const slot = lifeSlot(biome, kind);
          const reference = record.reference[slot];
          if (reference <= 0) {
            record.pop[slot] = 0;
            continue;
          }

          let v = record.pop[slot];
          if (v > reference) {
            v -= mortalityStep(v, reference);
          } else {
            // Cero es un punto fijo de la logistica: sin este empujon desde una
            // fuente cercana, un chunk arrasado no volveria a crecer nunca.
            if (v <= 0 && this.hasNearbySource(cx, cy, biome, kind)) {
              v = reference * COLONIZATION_SEED;
            }
            v += growthStep(v, reference);
          }
          record.pop[slot] = Math.max(0, Math.min(reference * DENSITY_CAP * 2, v));
        }
      }
    }

    // Materializar solo lo cargado: lo demas se reconcilia al volver a cargarse.
    for (const chunk of this.chunks.values()) {
      const record = this.records.get(chunkKey(chunk.cx, chunk.cy));
      if (record) this.reconcile(chunk, record);
    }
    this.biomeCache.clear();
  }

  /**
   * True si habia vida de ese bioma y tipo en el chunk o en alguno de sus
   * vecinos al empezar el paso. Se lee de la foto fija, nunca del estado en
   * curso.
   */
  private hasNearbySource(cx: number, cy: number, biome: BiomeKind, kind: LifeKind): boolean {
    const slot = lifeSlot(biome, kind);
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const record = this.records.get(chunkKey(cx + dx, cy + dy));
        if (record) {
          if (record.live[slot] !== 0) return true;
        } else if (this.pristineSupports(cx + dx, cy + dy, biome, kind)) {
          // Un chunk que nadie ha visitado sigue intacto: si su terreno sostiene
          // esa vida, la tiene.
          return true;
        }
      }
    }
    return false;
  }

  /** Muestreo barato y puro: no obliga a generar el chunk entero. */
  private pristineSupports(
    cx: number,
    cy: number,
    biome: BiomeKind,
    kind: LifeKind,
  ): boolean {
    for (let sy = 0; sy < 4; sy++) {
      for (let sx = 0; sx < 4; sx++) {
        const terrain = this.gen.terrainAt(cx * CHUNK_SIZE + sx * 8 + 4, cy * CHUNK_SIZE + sy * 8 + 4);
        if (biomeOfTerrain(terrain) === biome && densityOfKind(terrain, kind) > 0) return true;
      }
    }
    return false;
  }

  /** Ajusta las instancias del chunk hasta que coincidan con su poblacion. */
  private reconcile(chunk: Chunk, record: ChunkRecord): void {
    for (const biome of LIVING_BIOMES) {
      if ((record.biomes & (1 << biome)) === 0) continue;
      for (const kind of LIVING_KINDS) {
        const slot = lifeSlot(biome, kind);
        const target = Math.round(record.pop[slot]);
        let guard = CHUNK_TILES;
        while (record.count[slot] < target && guard-- > 0) {
          if (!this.sprout(chunk, record, biome, kind)) break;
        }
        guard = CHUNK_TILES;
        while (record.count[slot] > target && guard-- > 0) {
          if (!this.wither(chunk, record, biome, kind)) break;
        }
      }
    }
  }

  /**
   * Hace brotar una planta en un tile apto del chunk.
   *
   * Puede ser cualquier tile del chunk de ESE bioma que sostenga esa vida y este
   * libre. No hace falta que sea contiguo a otra planta: como razono el autor,
   * en un bosque real las semillas viajan con el viento y los animales, asi que
   * basta con que haya un origen plausible cerca, y de eso ya se encarga
   * `hasNearbySource` antes de que la poblacion crezca.
   */
  private sprout(
    chunk: Chunk,
    record: ChunkRecord,
    biome: BiomeKind,
    kind: LifeKind,
  ): boolean {
    const slot = lifeSlot(biome, kind);
    const start =
      hash2D(
        this.seed ^ 0x7ab3d19f,
        chunk.cx * 73856093 + chunk.cy,
        this.lifeSteps + record.count[slot] + slot,
      ) % CHUNK_TILES;

    for (let n = 0; n < CHUNK_TILES; n++) {
      const idx = (start + n) % CHUNK_TILES;
      const terrain = chunk.terrain[idx] as Terrain;
      if (biomeOfTerrain(terrain) !== biome) continue;
      if (densityOfKind(terrain, kind) <= 0) continue;
      if (this.featureAtIndex(chunk, idx) !== Feature.None) continue;

      const species = speciesFor(biome, kind);
      if (species === Feature.None) continue;

      const wx = chunk.cx * CHUNK_SIZE + (idx % CHUNK_SIZE);
      const wy = chunk.cy * CHUNK_SIZE + Math.floor(idx / CHUNK_SIZE);
      const balanced = this.isBiomeBalanced(chunk.cx, chunk.cy, biome);
      const roll = hash2DFloat(this.seed ^ 0x3c79a5b1, wx, wy + this.lifeSteps);
      const grown = balanced && roll < RARE_CHANCE ? rareOf(species) : species;

      this.writeTile(chunk, idx, grown, biome);
      return true;
    }
    return false;
  }

  /** Retira una instancia por competencia. */
  private wither(
    chunk: Chunk,
    record: ChunkRecord,
    biome: BiomeKind,
    kind: LifeKind,
  ): boolean {
    const slot = lifeSlot(biome, kind);
    const start =
      hash2D(
        this.seed ^ 0x1d5c9e33,
        chunk.cx * 19349663 + chunk.cy,
        this.lifeSteps + record.count[slot] + slot,
      ) % CHUNK_TILES;

    for (let n = 0; n < CHUNK_TILES; n++) {
      const idx = (start + n) % CHUNK_TILES;
      if (biomeOfTerrain(chunk.terrain[idx] as Terrain) !== biome) continue;
      if (lifeKindOf(this.featureAtIndex(chunk, idx)) !== kind) continue;
      this.writeTile(chunk, idx, Feature.None, biome);
      return true;
    }
    return false;
  }

  // ------------------------------------------------------------ estadisticas

  referenceOf(cx: number, cy: number, biome: BiomeKind, kind: LifeKind): number {
    return this.records.get(chunkKey(cx, cy))?.reference[lifeSlot(biome, kind)] ?? 0;
  }

  countOf(cx: number, cy: number, biome: BiomeKind, kind: LifeKind): number {
    return this.records.get(chunkKey(cx, cy))?.count[lifeSlot(biome, kind)] ?? 0;
  }

  populationOf(cx: number, cy: number, biome: BiomeKind, kind: LifeKind): number {
    return this.records.get(chunkKey(cx, cy))?.pop[lifeSlot(biome, kind)] ?? 0;
  }

  /** Fija la poblacion directamente. Solo para tests y herramientas. */
  setPopulation(
    cx: number,
    cy: number,
    biome: BiomeKind,
    kind: LifeKind,
    value: number,
  ): void {
    const chunk = this.getChunk(cx, cy);
    const record = this.records.get(chunkKey(cx, cy));
    if (!record) return;
    record.pop[lifeSlot(biome, kind)] = Math.max(0, value);
    this.reconcile(chunk, record);
    this.biomeCache.clear();
  }

  /** True si el chunk esta saturado en ese bioma. */
  isChunkOvercrowded(cx: number, cy: number, biome: BiomeKind): boolean {
    const record = this.records.get(chunkKey(cx, cy));
    if (!record) return false;
    for (const kind of LIVING_KINDS) {
      const slot = lifeSlot(biome, kind);
      if (isOvercrowded(record.count[slot], record.reference[slot])) return true;
    }
    return false;
  }

  /** True si el chunk esta dentro de su rango en ese bioma. */
  isChunkBalanced(cx: number, cy: number, biome: BiomeKind): boolean {
    const record = this.records.get(chunkKey(cx, cy));
    if (!record) return true;
    for (const kind of LIVING_KINDS) {
      const slot = lifeSlot(biome, kind);
      if (!withinEquilibrium(record.count[slot], record.reference[slot])) return false;
    }
    return true;
  }

  /** Estadisticas del bioma indicado, memorizadas hasta que algo cambie. */
  biomeStats(cx: number, cy: number, biome: BiomeKind): BiomeStats {
    const key = `${cx},${cy},${biome}`;
    const cached = this.biomeCache.get(key);
    if (cached) return cached;
    const stats = collectBiome(this, cx, cy, biome, BIOME_MAX_CHUNKS);
    this.biomeCache.set(key, stats);
    return stats;
  }

  isBiomeBalanced(cx: number, cy: number, biome: BiomeKind): boolean {
    return this.biomeStats(cx, cy, biome).balanced;
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
