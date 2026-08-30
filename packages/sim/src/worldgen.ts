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
import { levelFrom, MAX_LEVEL, OUTCROP_RISE, rampDirOf, SEA_LEVEL } from './relief.js';
import { hash2DFloat, SimplexNoise } from './rng.js';

/** Escalas de muestreo del ruido, en tiles. Mayor = accidentes geograficos mas grandes. */
const ELEVATION_SCALE = 1 / 220;
const MOISTURE_SCALE = 1 / 160;
const TEMPERATURE_SCALE = 1 / 340;
const WARP_SCALE = 1 / 90;
const WARP_STRENGTH = 22;

/**
 * Escala de las cordilleras. La mas grande de todas: una cordillera tiene que
 * medir cientos de casillas para que subirla sea un viaje y no un escalon.
 */
const RIDGE_SCALE = 1 / 300;
/**
 * Cuanto amplifica una cordillera el desnivel sobre el nivel del mar.
 *
 * Es lo que convierte un rango de seis niveles repartidos en ciento cincuenta
 * casillas —o sea, una llanura ondulada— en una ladera de verdad: multiplica por
 * igual la altura y la PENDIENTE, que era lo que faltaba.
 */
const RIDGE_GAIN = 3.5;
/**
 * A partir de que valor del campo con cresta empieza a haber cordillera.
 *
 * Alto a proposito: por debajo el mundo conserva exactamente las alturas de hoy,
 * y las montanas son accidentes localizados en vez de un rugido de fondo.
 */
const RIDGE_ONSET = 0.72;

/**
 * Escala de los salientes. Mas fina que la de las cordilleras: son accidentes
 * locales —mesetas y farallones— y no cadenas montanosas.
 */
const OUTCROP_SCALE = 1 / 110;
/**
 * A partir de que valor del campo se levanta un saliente.
 *
 * Calibrado, no elegido a ojo. Medido con `tools/analyze-world.ts` sobre tres
 * semillas: levanta el 2.6-3.8 % de la tierra y la mayor componente conexa del
 * mundo pierde como mucho 0.95 puntos contra la que ya impone el agua. Al doble
 * de salientes esa perdida se dispara a 17 puntos en una de las tres semillas,
 * que es un mundo partido en dos. Si se toca la escala de arriba, hay que
 * volver a medirlo.
 *
 * De aqui salen TODAS las paredes de dos o mas bloques: sin salientes, la
 * perdida es exactamente cero en las tres semillas, porque el campo de
 * elevacion es tan suave que dos tiles vecinos nunca se llevan dos niveles.
 */
const OUTCROP_THRESHOLD = 0.87;

/**
 * Reglas de altitud que anaden las cordilleras, ENCIMA de las que ya habia.
 *
 * Los umbrales viejos —`e > 0.70` para tierras altas y la penalizacion de
 * `max(0, e - 0.58) * 1.9`— siguen intactos y leyendo la elevacion cruda, que
 * fuera de las cordilleras vale exactamente lo mismo que antes. Asi el mundo
 * llano conserva su calibracion entera y las montanas solo suman.
 *
 * Los dos numeros de aqui salen de medir los percentiles del relieve SOBRE
 * TIERRA con `npx vite-node tools/analyze-world.ts`: p50 0.62, p90 1.10, p99
 * 1.75, maximo ~2.4. Si se toca `RIDGE_GAIN`, hay que volver a medirlos.
 */
const HIGHLAND_RELIEF = 1.05;
/** Altura a la que empieza la linea de nieve de montana. */
const SNOWLINE_ONSET = 1.0;
/** Cuanto enfria cada unidad de altura por encima de esa linea. */
const SNOWLINE_STRENGTH = 0.5;

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
  private readonly outcrop: SimplexNoise;
  private readonly ridge: SimplexNoise;

  constructor(seed: number) {
    this.seed = seed >>> 0;
    // Semillas derivadas distintas por campo: si compartieran tabla, los campos
    // quedarian correlacionados y los biomas saldrian en bandas artificiales.
    this.elevation = new SimplexNoise(this.seed ^ 0x9e3779b1);
    this.moisture = new SimplexNoise(this.seed ^ 0x85ebca6b);
    this.temperature = new SimplexNoise(this.seed ^ 0xc2b2ae35);
    this.warpX = new SimplexNoise(this.seed ^ 0x27d4eb2d);
    this.warpY = new SimplexNoise(this.seed ^ 0x165667b1);
    this.outcrop = new SimplexNoise(this.seed ^ 0x2545f491);
    this.ridge = new SimplexNoise(this.seed ^ 0x7feb352d);
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

  /**
   * Cuanta cordillera hay en un punto, de 0 a 1.
   *
   * Ruido **con cresta**: `1 - |ruido|` vale uno donde el ruido cruza el cero, y
   * los cruces por cero de un campo continuo son lineas, no manchas. De ahi
   * salen lomos afilados en vez de cerros redondos, que es lo que distingue una
   * cordillera de una duna.
   */
  ridgeAt(wx: number, wy: number): number {
    const raw = 1 - Math.abs(this.ridge.fbm(wx * RIDGE_SCALE, wy * RIDGE_SCALE, 2));
    return smoothstep(RIDGE_ONSET, 1, raw);
  }

  /**
   * Elevacion con las cordilleras ya aplicadas. Es la que manda sobre la altura
   * y sobre las decisiones de altitud del terreno.
   *
   * La amplificacion esta anclada al nivel del mar y solo actua por encima, asi
   * que **bajo el agua vale exactamente lo mismo que `elevationAt`**: las
   * costas, el agua profunda y la arena salen identicas a como estaban. Es lo
   * que reduce la recalibracion de biomas a la tierra alta en vez de al mundo
   * entero.
   */
  reliefAt(wx: number, wy: number): number {
    return this.reliefFrom(this.elevationAt(wx, wy), wx, wy);
  }

  /** Como `reliefAt`, con la elevacion base ya calculada. */
  reliefFrom(e: number, wx: number, wy: number): number {
    if (e <= SEA_LEVEL) return e;
    return SEA_LEVEL + (e - SEA_LEVEL) * (1 + RIDGE_GAIN * this.ridgeAt(wx, wy));
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
  temperatureAt(wx: number, wy: number, elevation: number, relief = elevation): number {
    const base = this.temperature.fbm(wx * TEMPERATURE_SCALE, wy * TEMPERATURE_SCALE, 2) * 0.5 + 0.5;
    const latitude = Math.cos(wy / 286) * 0.5 + 0.5;
    // Dos terminos: el de siempre, sobre la elevacion cruda, que mantiene el
    // clima del mundo llano exactamente como estaba; y la linea de nieve de
    // montana, que solo existe donde hay cordillera.
    const altitudePenalty =
      Math.max(0, elevation - 0.58) * 1.9 +
      Math.max(0, relief - SNOWLINE_ONSET) * SNOWLINE_STRENGTH;
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
    return this.terrainFrom(e, this.reliefFrom(e, wx, wy), wx, wy);
  }

  /**
   * La clasificacion propiamente dicha, con la elevacion ya calculada.
   *
   * Existe aparte porque generar un chunk necesita la elevacion **dos veces**
   * —para el terreno y para la altura— y `elevationAt` es lo mas caro del
   * generador: dos ruidos de deformacion mas un fbm de cinco octavas por tile.
   */
  terrainFrom(e: number, relief: number, wx: number, wy: number): Terrain {
    // El agua, el fondo y la arena se deciden con la elevacion CRUDA. Ahi la
    // amplificacion de cordillera vale cero por construccion, asi que la costa
    // sale identica a como estaba y su calibracion sigue en pie.
    if (e < 0.34) return Terrain.DeepWater;
    if (e < 0.42) return Terrain.Water;
    if (e < 0.455) return Terrain.Sand;

    // De aqui para arriba el relieve tiene voz: un pico de cordillera tiene que
    // ser roca y nieve, no un cerro de hierba. Pero se SUMA a la regla vieja en
    // vez de sustituirla, para no mover el mundo llano ni un tile.
    const t = this.temperatureAt(wx, wy, e, relief);

    if (e > 0.7 || relief > HIGHLAND_RELIEF) return t < 0.34 ? Terrain.Snow : Terrain.Rock;

    if (t < 0.24) return Terrain.Snow;
    if (t < 0.38) return Terrain.Tundra;

    const m = this.moistureAt(wx, wy);
    if (m > 0.55) return Terrain.Forest;
    return Terrain.Grass;
  }

  /**
   * Altura entera del tile. Negativa es agua.
   *
   * Sale de la MISMA elevacion que clasifica el terreno, asi que el relieve y
   * los biomas no pueden discrepar: una costa es una costa en los dos.
   */
  levelAt(wx: number, wy: number): number {
    return this.levelFromRelief(this.reliefAt(wx, wy), wx, wy);
  }

  /** Como `levelAt`, con el relieve ya calculado. */
  levelFromRelief(relief: number, wx: number, wy: number): number {
    const base = levelFrom(relief);
    // El agua no se levanta: un saliente en mitad del mar seria una isla que el
    // terreno no conoce, y el terreno es quien manda sobre lo que es agua.
    if (base < 0) return base;
    if (!this.isOutcrop(wx, wy)) return base;
    const raised = base + OUTCROP_RISE;
    return raised > MAX_LEVEL ? MAX_LEVEL : raised;
  }

  /** Si un tile de tierra pertenece a un saliente. */
  isOutcrop(wx: number, wy: number): boolean {
    const raw = this.outcrop.fbm(wx * OUTCROP_SCALE, wy * OUTCROP_SCALE, 2) * 0.5 + 0.5;
    return raw > OUTCROP_THRESHOLD;
  }

  /** Por donde se inclina el talud de un tile, o `NO_RAMP` si es plano. */
  rampDirAt(wx: number, wy: number): number {
    return rampDirOf(this.seed, wx, wy, this.levelAt(wx, wy), (x, y) => this.levelAt(x, y));
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

    // Los minerales van despues de la piedra y solo existen en la montana, que
    // es la unica que los trae con densidad distinta de cero.
    threshold += density.coal;
    if (roll < threshold) return Feature.CoalNode;

    threshold += density.iron;
    if (roll < threshold) return Feature.IronNode;

    threshold += density.copper;
    if (roll < threshold) return Feature.CopperNode;

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
  /** Altura entera de cada tile. Negativa es agua. */
  readonly level: Int8Array;
  /** Direccion del talud de cada tile, o `NO_RAMP`. */
  readonly rampDir: Int8Array;
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
  const level = new Int8Array(n);
  const rampDir = new Int8Array(n);
  const baseX = cx * CHUNK_SIZE;
  const baseY = cy * CHUNK_SIZE;

  // Los niveles se calculan con un tile de MARGEN alrededor del chunk. Un talud
  // mira a sus cuatro vecinos, y los del borde caen fuera: sin el margen, el
  // relieve del limite de un chunk dependeria de por donde se generase, que es
  // exactamente lo que la pureza de `generateChunk` promete que no pasa.
  //
  // La elevacion se guarda de paso: es con diferencia lo mas caro del generador
  // —dos ruidos de deformacion y un fbm de cinco octavas por tile— y la
  // necesitan tanto el terreno como la altura. Calculandola una sola vez, el
  // margen sale casi gratis.
  const side = CHUNK_SIZE + 2;
  const padded = new Int8Array(side * side);
  const elevations = new Float64Array(side * side);
  const reliefs = new Float64Array(side * side);
  for (let py = 0; py < side; py++) {
    for (let px = 0; px < side; px++) {
      const wx = baseX + px - 1;
      const wy = baseY + py - 1;
      const e = gen.elevationAt(wx, wy);
      const relief = gen.reliefFrom(e, wx, wy);
      elevations[py * side + px] = e;
      reliefs[py * side + px] = relief;
      padded[py * side + px] = gen.levelFromRelief(relief, wx, wy);
    }
  }
  const levelOf = (x: number, y: number): number => padded[(y - baseY + 1) * side + (x - baseX + 1)];

  for (let ly = 0; ly < CHUNK_SIZE; ly++) {
    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
      const wx = baseX + lx;
      const wy = baseY + ly;
      const idx = ly * CHUNK_SIZE + lx;
      const padIdx = (ly + 1) * side + (lx + 1);
      const t = gen.terrainFrom(elevations[padIdx], reliefs[padIdx], wx, wy);
      terrain[idx] = t;
      feature[idx] = gen.featureAt(wx, wy, t);
      const lvl = padded[padIdx];
      level[idx] = lvl;
      rampDir[idx] = rampDirOf(gen.seed, wx, wy, lvl, levelOf);
    }
  }

  return { terrain, feature, level, rampDir };
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** Transicion suave entre dos umbrales. Evita el corte duro de un `if`. */
function smoothstep(edge0: number, edge1: number, v: number): number {
  const t = clamp01((v - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}
