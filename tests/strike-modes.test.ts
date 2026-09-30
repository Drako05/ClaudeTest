import { describe, expect, it } from 'vitest';
import { createGame, step, type GameState } from '@verdant/sim';
import { emptyIntent, Feature, type Intent } from '@verdant/shared';

/**
 * Los dos modos de golpe (decision del autor, 2026-09-30): el **barrido** de la
 * regla 12, que tumba todo lo que toca el sector, y el **preciso**, que golpea
 * solo el primer objetivo del centro de la mira que este al alcance.
 */

function atSpawn(): { state: GameState; tx: number; ty: number } {
  const state = createGame(12345);
  const e = state.entities;
  const id = state.playerId;
  const tx = Math.floor(e.x[id]);
  const ty = Math.floor(e.y[id]);
  e.x[id] = tx + 0.5;
  e.y[id] = ty + 0.5;
  for (let dy = -3; dy <= 3; dy++) {
    for (let dx = -3; dx <= 3; dx++) state.world.setFeature(tx + dx, ty + dy, Feature.None);
  }
  return { state, tx, ty };
}

function hit(state: GameState, over: Partial<Intent>): void {
  step(state, { ...emptyIntent(), harvest: true, aimX: 1, aimY: 0, aimZ: Math.sin((-30 * Math.PI) / 180), ...over });
}

/** Dos matas: una delante, en el centro de la mira, y otra en diagonal. */
function twoBushes(): { state: GameState; tx: number; ty: number } {
  const s = atSpawn();
  s.state.world.setFeature(s.tx + 1, s.ty, Feature.MeadowPlant);
  s.state.world.setFeature(s.tx + 1, s.ty - 1, Feature.MeadowPlant);
  return s;
}

describe('Los modos de golpe', () => {
  it('el barrido tumba las dos matas del sector', () => {
    const { state, tx, ty } = twoBushes();
    hit(state, { precise: false });
    expect(state.world.featureAt(tx + 1, ty)).toBe(Feature.None);
    expect(state.world.featureAt(tx + 1, ty - 1)).toBe(Feature.None);
  });

  it('el preciso solo la del centro de la mira', () => {
    const { state, tx, ty } = twoBushes();
    hit(state, { precise: true });
    expect(state.world.featureAt(tx + 1, ty)).toBe(Feature.None);
    expect(state.world.featureAt(tx + 1, ty - 1)).toBe(Feature.MeadowPlant);
  });

  it('el preciso no llega a lo que queda detras del primero, ni fuera del centro', () => {
    const { state, tx, ty } = atSpawn();
    state.world.setFeature(tx + 1, ty, Feature.RockNode);
    state.world.setFeature(tx + 2, ty, Feature.MeadowPlant);
    // A mano la roca no cae, y tapa la mata de detras.
    hit(state, { precise: true });
    expect(state.world.featureAt(tx + 2, ty)).toBe(Feature.MeadowPlant);
    // Mirando a un lado, donde no hay nada, no golpea nada.
    state.world.setFeature(tx + 1, ty, Feature.None);
    hit(state, { precise: true, aimX: 0, aimY: 1 });
    expect(state.world.featureAt(tx + 2, ty)).toBe(Feature.MeadowPlant);
  });
});
