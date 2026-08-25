/**
 * Generacion procedural del mundo.
 *
 * Diseno clave: generateChunk es una FUNCION PURA de (semilla, cx, cy). No lee
 * ni escribe estado compartido, asi que los chunks pueden generarse en cualquier
 * orden, en paralelo, o regenerarse tras descartarlos, y el resultado es siempre
 * identico. Esto es lo que hace viable un mundo infinito con memoria acotada.
 */

import { CHUNK_SIZE, Feature, Terrain } from '@verdant/shared';
import { hash2DFloat, SimplexNoise } from './rng.js';

/** Escalas de muestreo del ruido, en tiles. Mayor = accidentes geograficos mas grandes. */
const ELEVATION_SCALE = 1 / 220;
const MOISTURE_SCALE = 1 / 160;
const TEMPERATURE_SCALE = 1 / 340;
const WARP_SCALE = 1 / 90;
const WARP_STRENGTH = 22;

/**
 * Campos de ruido del mundo. Se construye una vez por semilla y se reutiliza:
 * crear las tablas de permutacion es lo unico caro aqui.
 */
export class WorldGen {
  readonly seed: number;
  private readonly elevation: SimplexNoise;
  private readonly moisture: SimplexNoise;
  private readonly temperature: SimplexNoise;
  private readonly warpX: SimplexNoise;
  private readonly warpY: SimplexNoise;

  constructor(seed: number) {
    this.seed = seed >>> 0;
    // Semillas derivadas distintas por campo: si compartieran tabla, los campos
    // quedarian correlacionados y los biomas saldrian en bandas artificiales.
    this.elevation = new SimplexNoise(this.seed ^ 0x9e3779b1);
    this.moisture = new SimplexNoise(this.seed ^ 0x85ebca6b);
    this.temperature = new SimplexNoise(this.seed ^ 0xc2b2ae35);
    this.warpX = new SimplexNoise(this.seed ^ 0x27d4eb2d);
    this.warpY = new SimplexNoise(this.seed ^ 0x165667b1);
  }

  /**
   * Elevacion en [0, 1] para un tile del mundo.
   * Usa domain warping: se perturban las coordenadas antes de muestrear, lo que
   * rompe el aspecto "de nube" del ruido puro y produce costas y cordilleras
   * mucho mas organicas.
   */
  elevationAt(wx: number, wy: number): number {
    const wxw = this.warpX.noise2D(wx * WARP_SCALE, wy * WARP_SCALE) * WARP_STRENGTH;
    const wyw = this.warpY.noise2D(wx * WARP_SCALE + 100, wy * WARP_SCALE - 100) * WARP_STRENGTH;
    const x = (wx + wxw) * ELEVATION_SCALE;
    const y = (wy + wyw) * ELEVATION_SCALE;
    const raw = this.elevation.fbm(x, y, 5);
    return clamp01(raw * 0.5 + 0.5);
  }

  moistureAt(wx: number, wy: number): number {
    const raw = this.moisture.fbm(wx * MOISTURE_SCALE, wy * MOISTURE_SCALE, 3);
    return clamp01(raw * 0.5 + 0.5);
  }

  /**
   * Temperatura en [0, 1]. Baja con la latitud y con la altitud, como en el
   * mundo real: por eso hay nieve en las cimas aunque no estes en el norte.
   */
  temperatureAt(wx: number, wy: number, elevation: number): number {
    const base = this.temperature.fbm(wx * TEMPERATURE_SCALE, wy * TEMPERATURE_SCALE, 2) * 0.5 + 0.5;
    const latitude = Math.cos(wy / 2600) * 0.5 + 0.5;
    const altitudePenalty = Math.max(0, elevation - 0.62) * 1.6;
    return clamp01(base * 0.45 + latitude * 0.55 - altitudePenalty);
  }

  /** Clasifica un tile en bioma a partir de los tres campos. */
  terrainAt(wx: number, wy: number): Terrain {
    const e = this.elevationAt(wx, wy);
    if (e < 0.34) return Terrain.DeepWater;
    if (e < 0.42) return Terrain.Water;
    if (e < 0.46) return Terrain.Sand;

    const t = this.temperatureAt(wx, wy, e);
    if (t < 0.22) return Terrain.Snow;
    if (e > 0.78) return Terrain.Rock;

    const m = this.moistureAt(wx, wy);
    if (m > 0.56) return Terrain.Forest;
    return Terrain.Grass;
  }

  /**
   * Feature de un tile. Decidido con hash puro por-tile, no con un PRNG en
   * secuencia: asi no depende del orden en que se recorran los tiles.
   */
  featureAt(wx: number, wy: number, terrain: Terrain): Feature {
    const r = hash2DFloat(this.seed ^ 0x51ed270b, wx, wy);
    switch (terrain) {
      case Terrain.Forest:
        if (r < 0.42) return Feature.Tree;
        if (r < 0.47) return Feature.BerryBush;
        return Feature.None;
      case Terrain.Grass:
        if (r < 0.045) return Feature.Tree;
        if (r < 0.075) return Feature.BerryBush;
        if (r < 0.09) return Feature.RockNode;
        return Feature.None;
      case Terrain.Snow:
        return r < 0.05 ? Feature.Tree : Feature.None;
      case Terrain.Sand:
        return r < 0.02 ? Feature.RockNode : Feature.None;
      default:
        return Feature.None;
    }
  }
}

/** Datos crudos de un chunk recien generado, sin mutaciones aplicadas. */
export interface GeneratedChunk {
  readonly terrain: Uint8Array;
  readonly feature: Uint8Array;
}

/**
 * Genera un chunk completo. Pura respecto a (gen.seed, cx, cy).
 * Las coordenadas de chunk pueden ser negativas: el mundo es infinito en las
 * cuatro direcciones.
 */
export function generateChunk(gen: WorldGen, cx: number, cy: number): GeneratedChunk {
  const n = CHUNK_SIZE * CHUNK_SIZE;
  const terrain = new Uint8Array(n);
  const feature = new Uint8Array(n);
  const baseX = cx * CHUNK_SIZE;
  const baseY = cy * CHUNK_SIZE;

  for (let ly = 0; ly < CHUNK_SIZE; ly++) {
    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
      const wx = baseX + lx;
      const wy = baseY + ly;
      const t = gen.terrainAt(wx, wy);
      const idx = ly * CHUNK_SIZE + lx;
      terrain[idx] = t;
      feature[idx] = gen.featureAt(wx, wy, t);
    }
  }

  return { terrain, feature };
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
