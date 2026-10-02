/**
 * Las estaciones de fabricacion en el mundo (tanda 2): la mesa de trabajo y el
 * horno.
 *
 * Son features del overlay (regla 4) que solo pone el jugador. Lo que decide
 * este modulo es **donde sirven**: una receta de estacion solo se fabrica con
 * esa estacion al alcance, y el panel de la estacion se cierra al salir de el
 * (decision del autor). El nucleo y el cliente preguntan lo mismo, a esta
 * misma funcion, para que lo que el panel deja intentar sea exactamente lo que
 * el nucleo acepta.
 */

import { featureOfStation, Station } from '@verdant/shared';
import { STRIKE_RANGE, type Hitbox, type Vec3 } from './aim.js';
import type { World } from './world.js';

/** Distancia del punto `p` a la caja `box`: cero si esta dentro. */
export function distanceToBox(p: Vec3, box: Hitbox): number {
  const dx = Math.max(box.x0 - p.x, 0, p.x - box.x1);
  const dy = Math.max(box.y0 - p.y, 0, p.y - box.y1);
  const dz = Math.max(box.z0 - p.z, 0, p.z - box.z1);
  return Math.hypot(dx, dy, dz);
}

/**
 * True si hay una estacion de ese tipo **al alcance**: desde los ojos `eye`
 * hasta el punto mas cercano de su caja (`boxAt`, su hitbox) hay
 * `STRIKE_RANGE` o menos. Decision del autor (2026-10-01): se mide **hasta la
 * cara**, sea cual sea la forma de la estacion, y la distancia de cierre es
 * **siempre la del alcance**: asi lo que se abre mirandolo siempre se puede
 * usar. Antes se media al centro de su casilla con un 3 aparte, y con el
 * alcance a 3 se abria desde un poco mas lejos y se cerraba en el acto. A
 * mano, siempre.
 */
export function stationNear(
  world: World,
  eye: Vec3,
  station: Station,
  boxAt: (tx: number, ty: number) => Hitbox | null,
): boolean {
  if (station === Station.Hand) return true;
  const feature = featureOfStation(station);
  const r = STRIKE_RANGE;
  for (let ty = Math.floor(eye.y - r) - 1; ty <= Math.floor(eye.y + r) + 1; ty++) {
    for (let tx = Math.floor(eye.x - r) - 1; tx <= Math.floor(eye.x + r) + 1; tx++) {
      if (world.featureAt(tx, ty) !== feature) continue;
      const box = boxAt(tx, ty);
      if (box && distanceToBox(eye, box) <= r) return true;
    }
  }
  return false;
}
