/**
 * Las estaciones de fabricacion en el mundo (tanda 2): la mesa de trabajo y el
 * horno.
 *
 * Son features del overlay (regla 4) que solo pone el jugador. Lo que decide
 * este modulo es **donde sirven**: una receta de estacion solo se fabrica con
 * esa estacion a menos de `STATION_RANGE` casillas (plan aprobado), y el panel
 * de la estacion se cierra al alejarse (decision del autor). El nucleo y el
 * cliente preguntan lo mismo, a esta misma funcion, para que lo que el panel
 * deja intentar sea exactamente lo que el nucleo acepta.
 */

import { featureOfStation, Station, STATION_RANGE } from '@verdant/shared';
import type { World } from './world.js';

/**
 * True si hay una estacion de ese tipo a `STATION_RANGE` o menos del punto
 * `(x, y)`, medido **al centro de su casilla** (propuesta mia). A mano, siempre.
 */
export function stationNear(world: World, x: number, y: number, station: Station): boolean {
  if (station === Station.Hand) return true;
  const feature = featureOfStation(station);
  const r = STATION_RANGE;
  for (let ty = Math.floor(y - r); ty <= Math.floor(y + r); ty++) {
    for (let tx = Math.floor(x - r); tx <= Math.floor(x + r); tx++) {
      if (world.featureAt(tx, ty) !== feature) continue;
      if (Math.hypot(tx + 0.5 - x, ty + 0.5 - y) <= r) return true;
    }
  }
  return false;
}
