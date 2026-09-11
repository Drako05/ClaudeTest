import { describe, expect, it } from 'vitest';
import { createGame, reachableArea, World } from '@verdant/sim';
import { densityOfKind, LifeKind, lifeKindOf, Terrain } from '@verdant/shared';

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

  /**
   * El nacimiento tiene que ser JUGABLE, no solo pisable.
   *
   * Sale de dos fallos reales encadenados. Primero, cuando la altura empezo a
   * estorbar, la semilla de prueba nacia entre el mar y un escalon de dos
   * bloques: cuatro casillas andables. Y al exigir un rellano llano para
   * arreglarlo aparecio el segundo, mas sutil — **en este mundo lo llano son
   * las mesetas y las mesetas son roca**, asi que cinco de nueve semillas
   * pasaron a nacer en piedra pelada a nivel 16, sin nada que comer y con el
   * hambre corriendo desde el primer tick. Ninguno de los dos lo vio un test:
   * el primero lo vio la prueba de humo y el segundo, la CI.
   */
  it.each(SEEDS)('semilla %i: se nace en un sitio donde se puede jugar', (seed) => {
    const game = createGame(seed);
    const world = game.world;
    const sx = Math.floor(game.entities.x[game.playerId]);
    const sy = Math.floor(game.entities.y[game.playerId]);
    const level = world.levelAt(sx, sy);

    // Un rellano: las ocho vecinas pisables y al mismo nivel. De ahi salen a la
    // vez que se pueda andar en cualquier direccion y que las tres casillas del
    // area de accion esten al alcance.
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        expect(world.levelAt(sx + dx, sy + dy), `vecina ${dx},${dy} a otro nivel`).toBe(level);
        expect(world.isSolidAt(sx + dx, sy + dy), `vecina ${dx},${dy} solida`).toBe(false);
      }
    }

    // Y terreno que sostenga vida: es de donde sale la comida.
    const kinds = [LifeKind.Tree, LifeKind.Plant];
    const terrain = world.terrainAt(sx, sy);
    expect(
      kinds.some((k) => densityOfKind(terrain, k) > 0),
      `se nace en ${Terrain[terrain]}, donde no crece nada`,
    ).toBe(true);
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
