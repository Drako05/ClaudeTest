/**
 * Mundo infinito por chunks.
 *
 * Los chunks se generan bajo demanda y se descartan cuando quedan lejos. Las
 * modificaciones del jugador (un arbol talado, por ejemplo) NO viven en el chunk
 * sino en un overlay aparte, porque el chunk puede descartarse y regenerarse en
 * cualquier momento. El overlay es pequeno, persiste, y es exactamente lo que
 * habria que sincronizar por red en multijugador.
 */

import {
  CHUNK_MASK,
  CHUNK_SHIFT,
  CHUNK_SIZE,
  Feature,
  Terrain,
  isFeatureSolid,
  isTerrainSolid,
} from '@verdant/shared';
import { generateChunk, WorldGen } from './worldgen.js';

export interface Chunk {
  readonly cx: number;
  readonly cy: number;
  readonly terrain: Uint8Array;
  /** Ya incluye el overlay de mutaciones aplicado. */
  readonly feature: Uint8Array;
  /** Sube cada vez que el chunk cambia; el renderer lo usa para invalidar cache. */
  revision: number;
}

/** Division entera hacia abajo, correcta para negativos (>> no sirve con Math.floor). */
export function toChunkCoord(worldCoord: number): number {
  return worldCoord >> CHUNK_SHIFT;
}

export function localCoord(worldCoord: number): number {
  return worldCoord & CHUNK_MASK;
}

export function chunkKey(cx: number, cy: number): string {
  return `${cx},${cy}`;
}

export class World {
  readonly seed: number;
  readonly gen: WorldGen;

  private readonly chunks = new Map<string, Chunk>();
  /** clave de chunk -> (indice local -> feature). Sobrevive al descarte de chunks. */
  private readonly overrides = new Map<string, Map<number, Feature>>();

  constructor(seed: number) {
    this.seed = seed >>> 0;
    this.gen = new WorldGen(this.seed);
  }

  get loadedChunkCount(): number {
    return this.chunks.size;
  }

  /** Genera el chunk si no esta cargado y lo devuelve. */
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

    const chunk: Chunk = { cx, cy, terrain: raw.terrain, feature, revision: 0 };
    this.chunks.set(key, chunk);
    return chunk;
  }

  /** Carga todos los chunks en un radio (en chunks) alrededor de un tile. */
  ensureAround(wx: number, wy: number, radiusChunks: number): void {
    const ccx = toChunkCoord(Math.floor(wx));
    const ccy = toChunkCoord(Math.floor(wy));
    for (let dy = -radiusChunks; dy <= radiusChunks; dy++) {
      for (let dx = -radiusChunks; dx <= radiusChunks; dx++) {
        this.getChunk(ccx + dx, ccy + dy);
      }
    }
  }

  /** Descarta chunks fuera del radio. Las mutaciones se conservan en el overlay. */
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

  /** Itera los chunks actualmente en memoria (para el renderer). */
  eachLoadedChunk(fn: (chunk: Chunk) => void): void {
    for (const chunk of this.chunks.values()) fn(chunk);
  }

  terrainAt(wx: number, wy: number): Terrain {
    const chunk = this.getChunk(toChunkCoord(wx), toChunkCoord(wy));
    return chunk.terrain[localCoord(wy) * CHUNK_SIZE + localCoord(wx)] as Terrain;
  }

  featureAt(wx: number, wy: number): Feature {
    const chunk = this.getChunk(toChunkCoord(wx), toChunkCoord(wy));
    return chunk.feature[localCoord(wy) * CHUNK_SIZE + localCoord(wx)] as Feature;
  }

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

  /** True si el tile bloquea el movimiento, por terreno o por feature. */
  isSolidAt(wx: number, wy: number): boolean {
    const cx = toChunkCoord(wx);
    const cy = toChunkCoord(wy);
    const chunk = this.getChunk(cx, cy);
    const idx = localCoord(wy) * CHUNK_SIZE + localCoord(wx);
    return (
      isTerrainSolid(chunk.terrain[idx] as Terrain) ||
      isFeatureSolid(chunk.feature[idx] as Feature)
    );
  }

  /**
   * Busca el tile transitable mas cercano al origen dado, en espiral.
   * Se usa para no aparecer dentro del mar o de una montana al iniciar partida.
   */
  findSpawn(originX = 0, originY = 0, maxRadius = 400): { x: number; y: number } {
    for (let r = 0; r <= maxRadius; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          // Solo el borde del cuadrado de radio r: el interior ya se probo.
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
