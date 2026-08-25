import { describe, expect, it } from 'vitest';
import { createGame, reachableArea, World } from '@verdant/sim';
import { LifeKind, lifeKindOf, Terrain } from '@verdant/shared';

const SEEDS = [12345, 7, 999, 4242, 31337];

/**
 * Estos tests protegen la CALIDAD del mundo generado, no su correccion.
 *
 * Nacieron de un fallo real: los umbrales de bioma estaban fuera del rango que
 * de verdad producian los campos de ruido, asi que la nieve tenia frecuencia
 * cero y la roca menos del 1%. El codigo era "correcto" y los tests de
 * determinismo pasaban; el mundo era simplemente aburrido. Sin una medida
 * explicita, una regresion asi vuelve a pasar desapercibida.
 */
describe('calidad del mundo generado', () => {
  it.each(SEEDS)('semilla %i: todos los biomas aparecen', (seed) => {
    const world = new World(seed);
    const counts = new Map<Terrain, number>();
    const R = 260;
    let total = 0;
    for (let y = -R; y < R; y += 2) {
      for (let x = -R; x < R; x += 2) {
        const t = world.terrainAt(x, y);
        counts.set(t, (counts.get(t) ?? 0) + 1);
        total++;
      }
    }

    const biomes: Terrain[] = [
      Terrain.DeepWater,
      Terrain.Water,
      Terrain.Sand,
      Terrain.Grass,
      Terrain.Forest,
      Terrain.Rock,
      Terrain.Snow,
      Terrain.Tundra,
    ];

    for (const biome of biomes) {
      const share = (counts.get(biome) ?? 0) / total;
      expect(share, `el bioma ${Terrain[biome]} ocupa ${(share * 100).toFixed(2)}%`).toBeGreaterThan(
        0.002,
      );
    }
  });

  it.each(SEEDS)('semilla %i: el jugador no aparece encerrado', (seed) => {
    const game = createGame(seed);
    const world = game.world;
    const sx = Math.floor(game.entities.x[game.playerId]);
    const sy = Math.floor(game.entities.y[game.playerId]);
    // Ventana de 200x200 = 40000 tiles. Exigimos al menos 5000 alcanzables:
    // espacio de sobra para explorar sin exigir que el continente sea perfecto.
    expect(reachableArea(world, sx, sy, 100)).toBeGreaterThan(5000);
  });

  it.each(SEEDS)('semilla %i: el bosque es transitable, no un muro', (seed) => {
    const world = new World(seed);
    let forest = 0;
    let blocked = 0;
    const R = 260;
    for (let y = -R; y < R; y += 2) {
      for (let x = -R; x < R; x += 2) {
        if (world.terrainAt(x, y) !== Terrain.Forest) continue;
        forest++;
        if (lifeKindOf(world.featureAt(x, y)) === LifeKind.Tree) blocked++;
      }
    }
    expect(forest).toBeGreaterThan(100);
    // Por encima de ~1/3 de tiles bloqueados el bosque deja de ser un lugar por
    // el que moverse y pasa a ser una pared solida con huecos.
    expect(blocked / forest).toBeLessThan(0.34);
  });

  it.each(SEEDS)('semilla %i: hay comida alcanzable cerca del spawn', (seed) => {
    const game = createGame(seed);
    let bushes = 0;
    const sx = Math.floor(game.entities.x[game.playerId]);
    const sy = Math.floor(game.entities.y[game.playerId]);
    for (let y = sy - 60; y < sy + 60; y++) {
      for (let x = sx - 60; x < sx + 60; x++) {
        if (lifeKindOf(game.world.featureAt(x, y)) === LifeKind.Plant) bushes++;
      }
    }
    expect(bushes, 'sin bayas cerca el jugador muere de hambre sin opciones').toBeGreaterThan(10);
  });
});
