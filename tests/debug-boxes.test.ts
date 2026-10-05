import { describe, expect, it } from 'vitest';
import { animalBoxes, BODY_RADIUS, createGame, EYE_HEIGHT, hitboxAt, type OrientedBox } from '@verdant/sim';
import { blocksBody, Feature } from '@verdant/shared';
import { BOX_RADIUS, boxEdges, collectBoxes } from '../packages/client/src/debug-boxes.js';

/**
 * Las cajas del panel de desarrollo (pedido del autor, 2026-10-05): que cada
 * caja salga con sus 12 aristas en su sitio, y que cada cosa caiga en su clase
 * —rojo golpe, cian choque, amarillo las dos—.
 */

/** Los puntos (x, alto, y) de una lista de aristas de three. */
function points(data: number[]): Array<[number, number, number]> {
  const out: Array<[number, number, number]> = [];
  for (let i = 0; i < data.length; i += 3) out.push([data[i], data[i + 1], data[i + 2]]);
  return out;
}

describe('Cajas de depuracion', () => {
  it('una caja alineada da 12 aristas, en sus limites y con el alto en y', () => {
    const out: number[] = [];
    boxEdges(out, { x0: 1, x1: 2, y0: 5, y1: 7, z0: 3, z1: 4.5 });
    expect(out.length).toBe(12 * 2 * 3);
    const p = points(out);
    expect(Math.min(...p.map((q) => q[0]))).toBe(1);
    expect(Math.max(...p.map((q) => q[0]))).toBe(2);
    expect(Math.min(...p.map((q) => q[1]))).toBe(3);
    expect(Math.max(...p.map((q) => q[1]))).toBe(4.5);
    expect(Math.min(...p.map((q) => q[2]))).toBe(5);
    expect(Math.max(...p.map((q) => q[2]))).toBe(7);
  });

  it('una caja girada 90 grados cambia el largo por el ancho', () => {
    const box = (ux: number, uy: number): OrientedBox => ({ cx: 0, cy: 0, cz: 1, ux, uy, hl: 2, hw: 0.5, hh: 1 });
    const spanX = (b: OrientedBox) => {
      const out: number[] = [];
      boxEdges(out, b);
      const xs = points(out).map((q) => q[0]);
      return Math.max(...xs) - Math.min(...xs);
    };
    expect(spanX(box(1, 0))).toBeCloseTo(4);
    expect(spanX(box(0, 1))).toBeCloseTo(1);
  });

  it('un arbol junto al jugador: su tronco en amarillo, la caja que golpea y choca; un arbusto, en rojo', () => {
    const state = createGame(1);
    const { entities, playerId, world } = state;
    const tx = Math.floor(entities.x[playerId]) + 2;
    const ty = Math.floor(entities.y[playerId]);
    world.setFeature(tx, ty, Feature.MeadowTree);
    const trunk = hitboxAt(world, tx, ty)!;
    const boxes = collectBoxes(state);
    // Una sola caja, la del tronco, entre las amarillas; y nada de la casilla
    // entera de antes, en ningun color.
    const has = (data: number[], x: number, h: number, y: number) =>
      points(data).some((q) => Math.abs(q[0] - x) < 1e-6 && Math.abs(q[1] - h) < 1e-6 && Math.abs(q[2] - y) < 1e-6);
    expect(has(boxes.both, trunk.x0, trunk.z1, trunk.y0)).toBe(true);
    expect(has(boxes.hit, trunk.x0, trunk.z1, trunk.y0)).toBe(false);
    for (const data of [boxes.hit, boxes.solid, boxes.both]) expect(has(data, tx, trunk.z1, ty)).toBe(false);
    // Un arbusto solo se golpea: en rojo.
    world.setFeature(tx, ty + 2, Feature.MeadowPlant);
    const bush = hitboxAt(world, tx, ty + 2)!;
    expect(has(collectBoxes(state).hit, bush.x0, bush.z1, bush.y0)).toBe(true);
  });

  it('una estacion va en amarillo, no en rojo ni en cian', () => {
    const state = createGame(1);
    const { entities, playerId, world } = state;
    const before = collectBoxes(state).counts;
    world.setFeature(Math.floor(entities.x[playerId]) + 2, Math.floor(entities.y[playerId]), Feature.Workbench);
    const after = collectBoxes(state).counts;
    expect(after.both - before.both).toBe(1);
  });

  it('el jugador: su huella de choque, de los pies a los ojos', () => {
    const state = createGame(1);
    const { entities, playerId } = state;
    const x = entities.x[playerId];
    const z = entities.z[playerId];
    const p = points(collectBoxes(state).solid);
    expect(p.some((q) => Math.abs(q[0] - (x - BODY_RADIUS)) < 1e-6 && Math.abs(q[1] - (z + EYE_HEIGHT)) < 1e-6)).toBe(true);
  });

  it('los animales cercanos van en amarillo, una caja por parte que golpea', () => {
    const state = createGame(1);
    const { entities, playerId } = state;
    // Junto al primer animal: al nacer no hay ninguno a menos de 12 casillas.
    const first = state.fauna.values().next().value!;
    entities.x[playerId] = entities.x[first] + 2;
    entities.y[playerId] = entities.y[first];
    const near = [...state.fauna.values()].filter(
      (id) => Math.abs(entities.x[id] - entities.x[playerId]) <= BOX_RADIUS &&
        Math.abs(entities.y[id] - entities.y[playerId]) <= BOX_RADIUS,
    );
    const parts = near.reduce((n, id) => n + animalBoxes(entities, id).length, 0);
    // Sin animales cerca esto seria 0 = 0 y no probaria nada.
    expect(parts).toBeGreaterThan(0);
    // El amarillo: las partes de los animales y las cajas de los objetos que
    // chocan (troncos, rocas, minerales).
    const { world } = state;
    const px = Math.floor(entities.x[playerId]);
    const py = Math.floor(entities.y[playerId]);
    let objects = 0;
    for (let ty = py - BOX_RADIUS; ty <= py + BOX_RADIUS; ty++) {
      for (let tx = px - BOX_RADIUS; tx <= px + BOX_RADIUS; tx++) {
        if (hitboxAt(world, tx, ty) && blocksBody(world.featureAt(tx, ty))) objects++;
      }
    }
    expect(collectBoxes(state).counts.both).toBe(parts + objects);
  });
});
