/**
 * Mundo infinito por chunks.
 *
 * Los chunks se generan bajo demanda y se descartan cuando quedan lejos. Lo que
 * el jugador cambia NO vive en el chunk (que es cache desechable) sino en
 * overlays aparte que sobreviven al descarte.
 *
 * El mundo depende del tiempo: una planta recolectada vuelve al cabo de un rato
 * y la vegetacion de una zona sube o baja. Por eso `World` lleva su instante
 * actual (`setNow`), fijado desde el tick. Ocultarlo seria mentir sobre el
 * modelo: el estado del mundo es funcion del tiempo, no una foto fija.
 */

import {
  CHUNK_MASK,
  CHUNK_SHIFT,
  CHUNK_SIZE,
  Feature,
  Terrain,
  isFeatureSolid,
  isPlant,
  isTerrainSolid,
  regrowTicksOf,
} from '@verdant/shared';
import { WorldLife } from './life.js';
import { hash2DFloat } from './rng.js';
import { generateChunk, WorldGen } from './worldgen.js';

export interface Chunk {
  readonly cx: number;
  readonly cy: number;
  readonly terrain: Uint8Array;
  /** Potencial de features: donde PUEDE haber algo, ya con las mutaciones aplicadas. */
  readonly feature: Uint8Array;
  /** Sube cada vez que lo visible cambia; el renderer lo usa para invalidar cache. */
  revision: number;
  /** Densidad vegetal cuantizada la ultima vez que se aviso al renderer. */
  densityQuantum: number;
}

/** Division entera hacia abajo, correcta para negativos. */
export function toChunkCoord(worldCoord: number): number {
  return worldCoord >> CHUNK_SHIFT;
}

export function localCoord(worldCoord: number): number {
  return worldCoord & CHUNK_MASK;
}

export function chunkKey(cx: number, cy: number): string {
  return `${cx},${cy}`;
}

/** En cuantos escalones se cuantiza la densidad para decidir si repintar. */
const DENSITY_QUANTA = 48;

export class World {
  readonly seed: number;
  readonly gen: WorldGen;
  readonly life: WorldLife;

  private readonly chunks = new Map<string, Chunk>();
  /** Cambios permanentes: clave de chunk -> (indice local -> feature). */
  private readonly overrides = new Map<string, Map<number, Feature>>();
  /** Instante en que se recolecto cada tile renovable, por clave de tile. */
  private readonly harvestedAt = new Map<string, number>();
  private now = 0;

  constructor(seed: number) {
    this.seed = seed >>> 0;
    this.gen = new WorldGen(this.seed);
    this.life = new WorldLife(this.gen);
  }

  get loadedChunkCount(): number {
    return this.chunks.size;
  }

  get currentTick(): number {
    return this.now;
  }

  /** Fija el instante del mundo y pone la vida al dia. Lo llama el tick. */
  setNow(tick: number): void {
    this.now = tick;
    this.life.advanceTo(tick);
    this.refreshVisibleLife();
  }

  getChunk(cx: number, cy: number): Chunk {
    const key = chunkKey(cx, cy);
    const existing = this.chunks.get(key);
    if (existing) return existing;

    const raw = generateChunk(this.gen, cx, cy);
    const feature = new Uint8Array(raw.feature);
    const ov = this.overrides.get(key);
    if (ov) {
      for (const [idx, f] of ov) feature[idx] = f;
    }

    const chunk: Chunk = {
      cx,
      cy,
      terrain: raw.terrain,
      feature,
      revision: 0,
      densityQuantum: this.densityQuantumOf(cx, cy),
    };
    this.chunks.set(key, chunk);
    return chunk;
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

  terrainAt(wx: number, wy: number): Terrain {
    const chunk = this.getChunk(toChunkCoord(wx), toChunkCoord(wy));
    return chunk.terrain[localCoord(wy) * CHUNK_SIZE + localCoord(wx)] as Terrain;
  }

  featureAt(wx: number, wy: number): Feature {
    const cx = toChunkCoord(wx);
    const cy = toChunkCoord(wy);
    const chunk = this.getChunk(cx, cy);
    const idx = localCoord(wy) * CHUNK_SIZE + localCoord(wx);
    return this.effectiveFeature(chunk, idx, wx, wy);
  }

  /**
   * Que hay REALMENTE en un tile ahora mismo.
   *
   * El array del chunk solo guarda el potencial. Sobre el se aplican dos filtros
   * que dependen del tiempo: si se recolecto hace poco, aun no ha vuelto; y si
   * la vegetacion de la zona ha bajado, las plantas ralean.
   *
   * Tanto lo que se ve como lo que estorba el paso salen de aqui: si el dibujo y
   * la colision usaran criterios distintos, se chocaria con arboles invisibles.
   */
  private effectiveFeature(chunk: Chunk, idx: number, wx: number, wy: number): Feature {
    const potential = chunk.feature[idx] as Feature;
    if (potential === Feature.None) return Feature.None;

    const harvested = this.harvestedAt.get(`${wx},${wy}`);
    if (harvested !== undefined && this.now - harvested < regrowTicksOf(potential)) {
      return Feature.None;
    }

    if (isPlant(potential)) {
      const density = this.life.densityOf(chunk.cx, chunk.cy);
      // El umbral por tile es fijo, asi que al recuperarse la zona reaparecen
      // las mismas plantas y en el mismo orden en que se perdieron.
      if (hash2DFloat(this.seed ^ 0x5bf03635, wx, wy) >= density) return Feature.None;
    }

    return potential;
  }

  /** Cambio permanente del potencial de un tile. */
  setFeature(wx: number, wy: number, f: Feature): void {
    const cx = toChunkCoord(wx);
    const cy = toChunkCoord(wy);
    const idx = localCoord(wy) * CHUNK_SIZE + localCoord(wx);
    const key = chunkKey(cx, cy);

    let ov = this.overrides.get(key);
    if (!ov) {
      ov = new Map();
      this.overrides.set(key, ov);
    }
    ov.set(idx, f);

    const chunk = this.chunks.get(key);
    if (chunk) {
      chunk.feature[idx] = f;
      chunk.revision++;
    }
  }

  /**
   * Registra que un tile renovable acaba de recolectarse.
   *
   * Ademas de vaciar el tile, resta vida al chunk: talar en exceso una zona
   * tiene consecuencia regional, no solo en la casilla tocada.
   */
  recordHarvest(wx: number, wy: number, feature: Feature, vegetationCost: number): void {
    this.harvestedAt.set(`${wx},${wy}`, this.now);
    if (isPlant(feature)) {
      this.life.disturb(toChunkCoord(wx), toChunkCoord(wy), vegetationCost);
    }
    const chunk = this.chunks.get(chunkKey(toChunkCoord(wx), toChunkCoord(wy)));
    if (chunk) chunk.revision++;
  }

  isSolidAt(wx: number, wy: number): boolean {
    const cx = toChunkCoord(wx);
    const cy = toChunkCoord(wy);
    const chunk = this.getChunk(cx, cy);
    const idx = localCoord(wy) * CHUNK_SIZE + localCoord(wx);
    return (
      isTerrainSolid(chunk.terrain[idx] as Terrain) ||
      isFeatureSolid(this.effectiveFeature(chunk, idx, wx, wy))
    );
  }

  private densityQuantumOf(cx: number, cy: number): number {
    return Math.round(this.life.densityOf(cx, cy) * DENSITY_QUANTA);
  }

  /**
   * Avisa al renderer cuando la vegetacion cambia lo bastante como para que se
   * vea. Se compara la densidad cuantizada y no el valor exacto: si no, cada
   * paso de vida obligaria a rehacer los sprites de todos los chunks.
   */
  private refreshVisibleLife(): void {
    for (const chunk of this.chunks.values()) {
      const quantum = this.densityQuantumOf(chunk.cx, chunk.cy);
      if (quantum === chunk.densityQuantum) continue;
      chunk.densityQuantum = quantum;
      chunk.revision++;
    }
  }

  /** Tile transitable mas cercano al origen, en espiral. Evita nacer en el mar. */
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
