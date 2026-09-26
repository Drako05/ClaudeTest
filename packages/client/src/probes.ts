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
  type Feature,
  harvestOf,
  isFeatureSolid,
  isTerrainSolid,
  MINERAL_NODES,
  RESOURCE_NAMES,
  Resource,
  Terrain,
} from '@verdant/shared';
import type { GameState } from '@verdant/sim';

/** El punto mas alto que se encuentre cerca. La prueba de humo sube ahi. */
export function peakSpot(state: GameState): { stand: { x: number; y: number }; level: number } | null {
  const px = Math.floor(state.entities.x[state.playerId]);
  const py = Math.floor(state.entities.y[state.playerId]);
  const gen = state.world.gen;

  let best: { stand: { x: number; y: number }; level: number } | null = null;
  for (let y = py - 300; y <= py + 300; y += 3) {
    for (let x = px - 300; x <= px + 300; x += 3) {
      const level = gen.levelAt(x, y);
      if (best && level <= best.level) continue;
      best = { stand: { x: x + 0.5, y: y + 0.5 }, level };
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
      const level = gen.levelAt(x, y);
      if (level < 0) continue;
      let drop = 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        drop = Math.max(drop, gen.levelAt(x + dx, y + dy) - level);
      }
      if (drop < 2) continue;
      const d = Math.max(Math.abs(x - px), Math.abs(y - py));
      if (!best || d < best.d) best = { stand: { x: x + 0.5, y: y + 0.5 }, drop, d };
    }
  }
  return best ? { stand: best.stand, drop: best.drop } : null;
}

/**
 * Resumen del relieve alrededor del jugador, para la prueba de humo.
 *
 * Los tres numeros que interesan: que haya varias alturas —si no, el relieve no
 * se esta generando—, que haya taludes por los que subir y que existan paredes
 * de dos o mas bloques, que es lo que el autor pidio expresamente. Se lee del
 * GENERADOR y no del mundo, para no registrar chunks solo por mirar.
 */
export function reliefAround(state: GameState): { levels: number; ramps: number; tallWalls: number } {
  const px = Math.floor(state.entities.x[state.playerId]);
  const py = Math.floor(state.entities.y[state.playerId]);
  const gen = state.world.gen;
  const seen = new Set<number>();
  let ramps = 0;
  let tallWalls = 0;

  for (let y = py - 40; y <= py + 40; y++) {
    for (let x = px - 40; x <= px + 40; x++) {
      const level = gen.levelAt(x, y);
      if (level < 0) continue;
      seen.add(level);
      if (gen.rampDirAt(x, y) >= 0) ramps++;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        if (gen.levelAt(x + dx, y + dy) - level >= 2) {
          tallWalls++;
          break;
        }
      }
    }
  }
  return { levels: seen.size, ramps, tallWalls };
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
 * apoyo, la casilla apuntada es justo esa. La de apoyo tiene que ser pisable,
 * estar despejada y a la MISMA altura, porque la accion solo alcanza la altura
 * propia (regla 21); y ninguna de las dos puede ser talud, que es donde la
 * altura de una casilla deja de ser un numero solo.
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
      if (isFeatureSolid(gen.featureAt(sx, sy, standTerrain))) continue;
      if (gen.levelAt(sx, sy) !== gen.levelAt(x, y)) continue;
      if (gen.rampDirAt(sx, sy) >= 0 || gen.rampDirAt(x, y) >= 0) continue;

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

/** Una mata con bayas, para comer: comer es lo unico que las gasta. */
export function berrySpot(state: GameState): ReachSpot | null {
  return reachSpot(state, 120, (f) => {
    const h = harvestOf(f);
    return h !== null && h.resource === Resource.Berries;
  });
}
