/**
 * Generacion procedural del mundo.
 *
 * Diseno clave: generateChunk es una FUNCION PURA de (semilla, cx, cy). No lee
 * ni escribe estado compartido, asi que los chunks pueden generarse en cualquier
 * orden, en paralelo, o regenerarse tras descartarlos, y el resultado es siempre
 * identico. Esto es lo que hace viable un mundo infinito con memoria acotada.
 */

import {
  biomeOfTerrain,
  CHUNK_SIZE,
  densityFor,
  Feature,
  LifeKind,
  RARE_CHANCE,
  rareOf,
  speciesFor,
  Terrain,
} from '@verdant/shared';
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
   * Temperatura en [0, 1]. Combina ruido, latitud y altitud.
   *
   * Los pesos y el periodo de latitud estan calibrados contra la distribucion
   * real medida de los campos, no elegidos a ojo: una version anterior tenia el
   * umbral de nieve en 0.22 cuando la temperatura minima real era 0.35, asi que
   * la nieve sencillamente no existia en el mundo. Si se tocan las escalas de
   * ruido hay que volver a medir los percentiles y recalibrar los umbrales.
   *
   * El periodo de latitud (~1800 tiles por ciclo completo) esta elegido para que
   * el jugador atraviese bandas climaticas caminando cientos de tiles, no miles.
   */
  temperatureAt(wx: number, wy: number, elevation: number): number {
    const base = this.temperature.fbm(wx * TEMPERATURE_SCALE, wy * TEMPERATURE_SCALE, 2) * 0.5 + 0.5;
    const latitude = Math.cos(wy / 286) * 0.5 + 0.5;
    const altitudePenalty = Math.max(0, elevation - 0.58) * 1.9;
    // El ruido pesa mas que la latitud para que haya parches frios y calidos a
    // ambos lados del ecuador, en vez de bandas horizontales perfectas.
    return clamp01((base - 0.5) * 1.5 + 0.5 * 0.42 + latitude * 0.58 - altitudePenalty);
  }

  /**
   * Clasifica un tile en bioma a partir de los tres campos.
   *
   * Umbrales derivados de los percentiles reales de cada campo (ver
   * tools/analyze-world.ts). Cambiar una escala de ruido invalida estos numeros.
   */
  terrainAt(wx: number, wy: number): Terrain {
    const e = this.elevationAt(wx, wy);
    if (e < 0.34) return Terrain.DeepWater;
    if (e < 0.42) return Terrain.Water;
    if (e < 0.455) return Terrain.Sand;

    const t = this.temperatureAt(wx, wy, e);

    // Tierras altas: el frio de altitud decide entre cumbre nevada y roca desnuda.
    if (e > 0.70) return t < 0.34 ? Terrain.Snow : Terrain.Rock;

    if (t < 0.24) return Terrain.Snow;
    if (t < 0.38) return Terrain.Tundra;

    const m = this.moistureAt(wx, wy);
    if (m > 0.55) return Terrain.Forest;
    return Terrain.Grass;
  }

  /**
   * Feature de un tile.
   *
   * Decidido con un hash puro por-tile, no con un PRNG en secuencia: asi no
   * depende del orden en que se recorran los tiles y cualquier tile puede
   * evaluarse aislado.
   *
   * Las frecuencias salen de `densityFor`, en @verdant/shared, que es la MISMA
   * tabla que usa el sistema de equilibrio para saber cuanta vida deberia haber.
   * Si el generador tuviera la suya propia, el mundo naceria desequilibrado en
   * cuanto las dos se separasen.
   */
  featureAt(wx: number, wy: number, terrain: Terrain): Feature {
    const density = densityFor(terrain);
    const roll = hash2DFloat(this.seed ^ 0x51ed270b, wx, wy);
    const biome = biomeOfTerrain(terrain);

    let threshold = density.tree;
    if (roll < threshold) return this.speciesAt(biome, LifeKind.Tree, wx, wy);

    threshold += density.plant;
    if (roll < threshold) return this.speciesAt(biome, LifeKind.Plant, wx, wy);

    threshold += density.rock;
    if (roll < threshold) return Feature.RockNode;

    return Feature.None;
  }

  /**
   * Especie concreta que corresponde a un bioma, comun o rara.
   *
   * El mundo nace equilibrado, asi que se gana sus variantes raras desde el
   * primer momento: la rareza al generar usa la misma probabilidad que la que
   * gobierna lo que brota despues en un bioma sano.
   */
  private speciesAt(
    biome: ReturnType<typeof biomeOfTerrain>,
    kind: LifeKind,
    wx: number,
    wy: number,
  ): Feature {
    const species = speciesFor(biome, kind);
    if (species === Feature.None) return Feature.None;
    const rare = hash2DFloat(this.seed ^ 0x2f9a13c7, wx, wy);
    return rare < RARE_CHANCE ? rareOf(species) : species;
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
