/**
 * Sondas para la prueba de humo: sitios del mundo a los que ir a mirar algo.
 *
 * Existen para que el humo no juegue a la loteria: el relieve alto y los
 * minerales son escasos a proposito —esa fue la calibracion— y esperar a
 * tropezar con uno paseando fallaria por azar y no por un fallo. Se leen del
 * GENERADOR y no del mundo, para no registrar chunks solo por mirar.
 *
 * Vinieron tal cual del cliente isometrico: son del mundo, no de la camara.
 */

import {
  Feature,
  harvestOf,
  blocksBody,
  isStation,
  isTerrainSolid,
  MINERAL_NODES,
  RESOURCE_NAMES,
  Resource,
  Terrain,
} from '@verdant/shared';
import { topOf, VOXELS_PER_TILE, type GameState, type WorldGen } from '@verdant/sim';

/**
 * Donde ponerse en una casilla para pisar su columna de esquina, la que mide
 * `tileTopAt`: el centro de esa columna de 0,5.
 */
const CORNER = 1 / (2 * VOXELS_PER_TILE);

/** La altura de la casilla si sus cuatro columnas estan a la misma, o `null`. */
function flatTop(gen: WorldGen, x: number, y: number): number | null {
  const h = gen.columnTopAt(x * VOXELS_PER_TILE, y * VOXELS_PER_TILE);
  for (let s = 1; s < VOXELS_PER_TILE * VOXELS_PER_TILE; s++) {
    const vx = x * VOXELS_PER_TILE + (s % VOXELS_PER_TILE);
    const vy = y * VOXELS_PER_TILE + Math.floor(s / VOXELS_PER_TILE);
    if (gen.columnTopAt(vx, vy) !== h) return null;
  }
  return h;
}

/** El punto mas alto que se encuentre cerca. La prueba de humo sube ahi. */
export function peakSpot(state: GameState): { stand: { x: number; y: number }; level: number } | null {
  const px = Math.floor(state.entities.x[state.playerId]);
  const py = Math.floor(state.entities.y[state.playerId]);
  const gen = state.world.gen;

  let best: { stand: { x: number; y: number }; level: number } | null = null;
  for (let y = py - 300; y <= py + 300; y += 3) {
    for (let x = px - 300; x <= px + 300; x += 3) {
      const level = topOf(gen.tileTopAt(x, y));
      if (best && level <= best.level) continue;
      best = { stand: { x: x + CORNER, y: y + CORNER }, level };
    }
  }
  return best;
}

/**
 * Sitio desde el que se ve una pared de dos o mas bloques.
 *
 * Igual que `mineralSpot`, existe para que la prueba de humo no juegue a la
 * loteria: el relieve alto es escaso a proposito —esa fue la calibracion— y
 * esperar a tropezar con uno paseando fallaria por azar y no por un fallo.
 */
export function cliffSpot(state: GameState): { stand: { x: number; y: number }; drop: number } | null {
  const px = Math.floor(state.entities.x[state.playerId]);
  const py = Math.floor(state.entities.y[state.playerId]);
  const gen = state.world.gen;

  let best: { stand: { x: number; y: number }; drop: number; d: number } | null = null;
  for (let y = py - 220; y <= py + 220; y += 2) {
    for (let x = px - 220; x <= px + 220; x += 2) {
      const level = topOf(gen.tileTopAt(x, y));
      if (level < 0) continue;
      let drop = 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        drop = Math.max(drop, topOf(gen.tileTopAt(x + dx, y + dy)) - level);
      }
      if (drop < 2) continue;
      const d = Math.max(Math.abs(x - px), Math.abs(y - py));
      if (!best || d < best.d) best = { stand: { x: x + CORNER, y: y + CORNER }, drop, d };
    }
  }
  return best ? { stand: best.stand, drop: best.drop } : null;
}

/**
 * Resumen del relieve alrededor del jugador, para la prueba de humo.
 *
 * Los numeros que interesan: que haya varias alturas —si no, el relieve no se
 * esta generando—, que haya escalones de medio bloque, que se suben andando y
 * hacen de las antiguas rampas, y que existan paredes de dos o mas bloques, que
 * es lo que el autor pidio expresamente. Por casillas, con su columna de
 * esquina. Se lee del GENERADOR y no del mundo, para no registrar chunks solo
 * por mirar.
 */
export function reliefAround(state: GameState): { levels: number; halfSteps: number; tallWalls: number } {
  const px = Math.floor(state.entities.x[state.playerId]);
  const py = Math.floor(state.entities.y[state.playerId]);
  const gen = state.world.gen;
  const seen = new Set<number>();
  let halfSteps = 0;
  let tallWalls = 0;

  for (let y = py - 40; y <= py + 40; y++) {
    for (let x = px - 40; x <= px + 40; x++) {
      const height = gen.tileTopAt(x, y);
      if (height < 0) continue;
      seen.add(height);
      let rise = 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        rise = Math.max(rise, gen.tileTopAt(x + dx, y + dy) - height);
      }
      if (rise === 1) halfSteps++;
      if (rise >= 2 * VOXELS_PER_TILE) tallWalls++;
    }
  }
  return { levels: seen.size, halfSteps, tallWalls };
}

/** Un sitio desde el que la accion alcanza algo concreto. */
export interface ReachSpot {
  /** Donde ponerse: el centro de la casilla de apoyo. */
  stand: { x: number; y: number };
  /** La casilla con lo que se busca. */
  node: { x: number; y: number };
  /** Lo que se saca de ella. */
  kind: string;
}

/**
 * La casilla mas cercana cuya feature cumpla `wanted`, junto con una casilla de
 * apoyo al SURESTE desde la que la accion la alcanza.
 *
 * Al sureste porque la mirada es la de la camara y la camara arranca mirando al
 * noroeste (`camera.ts`, rumbo de un octavo de vuelta): nada mas aparecer en el
 * centro del apoyo, esa casilla cae justo en el eje del sector del golpe (regla
 * 12). La de apoyo tiene que ser pisable, estar despejada y a la MISMA altura,
 * para que ningun escalon corte el sector por delante; y las dos tienen que ser
 * llanas —sus cuatro columnas de 0,5 a la misma altura—, que es donde la altura
 * de una casilla es un numero solo.
 */
function reachSpot(
  state: GameState,
  radius: number,
  wanted: (feature: Feature, terrain: Terrain) => boolean,
): ReachSpot | null {
  const px = Math.floor(state.entities.x[state.playerId]);
  const py = Math.floor(state.entities.y[state.playerId]);
  const gen = state.world.gen;

  let best: (ReachSpot & { d: number }) | null = null;
  for (let y = py - radius; y <= py + radius; y++) {
    for (let x = px - radius; x <= px + radius; x++) {
      const d = Math.max(Math.abs(x - px), Math.abs(y - py));
      if (best && d >= best.d) continue;
      const terrain = gen.terrainAt(x, y);
      const feature = gen.featureAt(x, y, terrain);
      if (!wanted(feature, terrain)) continue;

      const sx = x + 1;
      const sy = y + 1;
      const standTerrain = gen.terrainAt(sx, sy);
      if (isTerrainSolid(standTerrain)) continue;
      if (blocksBody(gen.featureAt(sx, sy, standTerrain))) continue;
      const top = flatTop(gen, x, y);
      if (top === null || flatTop(gen, sx, sy) !== top) continue;

      best = {
        stand: { x: sx + 0.5, y: sy + 0.5 },
        node: { x, y },
        kind: RESOURCE_NAMES[harvestOf(feature)!.resource],
        d,
      };
    }
  }
  return best ? { stand: best.stand, node: best.node, kind: best.kind } : null;
}

/**
 * Un mineral de la montana. Con el carbon al 0.00225 por casilla, buscarlo
 * paseando seria una loteria.
 */
export function mineralSpot(state: GameState): ReachSpot | null {
  return reachSpot(state, 200, (f, t) => t === Terrain.Rock && MINERAL_NODES.includes(f));
}

/**
 * Un mineral que sale con el pico de piedra: carbon o cobre. El hierro pide
 * uno de cobre (propuesta mia de la tanda 1), asi que no vale para probar que
 * el pico de piedra mina.
 */
export function stoneOreSpot(state: GameState): ReachSpot | null {
  return reachSpot(
    state,
    200,
    (f, t) => t === Terrain.Rock && (f === Feature.CoalNode || f === Feature.CopperNode),
  );
}

/** Una mata con bayas, para comer: comer es lo unico que las gasta. */
export function berrySpot(state: GameState): ReachSpot | null {
  return reachSpot(state, 120, (f) => {
    const h = harvestOf(f);
    return h !== null && h.resource === Resource.Berries;
  });
}

/** Las estaciones a `radius` casillas o menos del jugador, con su casilla. */
export function stationTilesAround(state: GameState, radius: number): Array<{ x: number; y: number; feature: Feature }> {
  const e = state.entities;
  const px = Math.floor(e.x[state.playerId]);
  const py = Math.floor(e.y[state.playerId]);
  const out: Array<{ x: number; y: number; feature: Feature }> = [];
  for (let y = py - radius; y <= py + radius; y++) {
    for (let x = px - radius; x <= px + radius; x++) {
      const feature = state.world.featureAt(x, y);
      if (isStation(feature)) out.push({ x, y, feature });
    }
  }
  return out;
}
