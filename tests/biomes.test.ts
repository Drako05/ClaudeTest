import { describe, expect, it } from 'vitest';
import { reachableArea, World } from '@verdant/sim';
import {
  BiomeKind,
  biomeOfTerrain,
  densityFor,
  Feature,
  harvestOf,
  HIGHLAND_ROCK,
  isTerrainSolid,
  lifeKindOf,
  MINERAL_NODES,
  rareOf,
  saplingOf,
  MINERAL_SHARE,
  Resource,
  ROCK_ELSEWHERE,
  speciesFor,
  Terrain,
} from '@verdant/shared';

/**
 * Los biomas que faltaban: el frio y la montana.
 *
 * Dos deudas y un fallo. El fallo lo reporto el autor: no se podia entrar en la
 * montana. Las deudas: tundra y nieve se hacian pasar por pradera, y la roca no
 * tenia nada que ofrecer.
 */

describe('La montana se puede pisar', () => {
  it('la roca ya no es terreno solido', () => {
    // El fallo reportado, como regresion. La roca estaba en la lista de solidos,
    // asi que el bioma entero era un muro contra el que se chocaba.
    expect(isTerrainSolid(Terrain.Rock)).toBe(false);
    // El agua si sigue deteniendo, que es lo unico que debe hacerlo.
    expect(isTerrainSolid(Terrain.Water)).toBe(true);
    expect(isTerrainSolid(Terrain.DeepWater)).toBe(true);
  });

  it('se puede caminar por dentro de la montana', () => {
    const world = new World(12345);
    // Un punto de roca con roca alrededor: el interior, no el borde.
    let inside: { x: number; y: number } | null = null;
    for (let y = -200; y < 200 && !inside; y += 3) {
      for (let x = -200; x < 200; x += 3) {
        if (world.terrainAt(x, y) !== Terrain.Rock) continue;
        const solid = [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ].some(([dx, dy]) => isTerrainSolid(world.terrainAt(x + dx, y + dy)));
        if (!solid) {
          inside = { x, y };
          break;
        }
      }
    }
    expect(inside, 'no se encontro interior de montana en el mundo de prueba').not.toBeNull();

    // Alcanzable a pie desde ahi: si la roca fuera solida esto seria una celda.
    expect(reachableArea(world, inside!.x, inside!.y, 30)).toBeGreaterThan(100);
  });
});

describe('El frio es un bioma propio', () => {
  it('tundra y nieve son Tundra, no Pradera', () => {
    // La mentira que arregla esto: el panel anunciaba «Pradera» pisando nieve.
    expect(biomeOfTerrain(Terrain.Tundra)).toBe(BiomeKind.Tundra);
    expect(biomeOfTerrain(Terrain.Snow)).toBe(BiomeKind.Tundra);
    // Y la hierba sigue siendo pradera.
    expect(biomeOfTerrain(Terrain.Grass)).toBe(BiomeKind.Meadow);
  });

  it('tiene arbol y planta propios, con sus variantes raras', () => {
    const tree = speciesFor(BiomeKind.Tundra, 0);
    const plant = speciesFor(BiomeKind.Tundra, 1);
    expect(tree).toBe(Feature.TundraTree);
    expect(plant).toBe(Feature.TundraPlant);
    // Y no son las de pradera disfrazadas.
    expect(tree).not.toBe(speciesFor(BiomeKind.Meadow, 0));
    expect(plant).not.toBe(speciesFor(BiomeKind.Meadow, 1));
  });

  it('sus plantas dan bayas, como las demas', () => {
    // Decision del autor: un solo alimento en todo el mundo.
    expect(harvestOf(Feature.TundraPlant)?.resource).toBe(Resource.Berries);
    expect(harvestOf(Feature.TundraTree)?.resource).toBe(Resource.Wood);
  });

  it('la nieve sostiene arboles pero no plantas', () => {
    // Es la franja extrema del bioma: se ralea sola al subir, sin reglas aparte.
    const snow = densityFor(Terrain.Snow);
    expect(snow.tree).toBeGreaterThan(0);
    expect(snow.plant).toBe(0);
  });

  it('cada planta esta en el bioma de su especie, sin cruces', () => {
    // La comprobacion de verdad: la feature de cada tile tiene que ser la
    // especie de SU bioma, comun o rara. Un arbol de pradera sobre nieve o uno
    // de tundra sobre hierba falla aqui.
    const world = new World(31337);
    world.setNow(0);
    let checked = 0;
    const cold = new Set<Feature>();
    for (let y = -120; y < 120; y += 2) {
      for (let x = -120; x < 120; x += 2) {
        const feature = world.featureAt(x, y);
        const kind = lifeKindOf(feature);
        if (kind === null) continue;

        const biome = world.biomeAt(x, y);
        const own = speciesFor(biome, kind);
        const allowed = [own, rareOf(own), saplingOf(own)];
        expect(
          allowed,
          `especie ajena en (${x}, ${y}): bioma ${biome}, feature ${feature}`,
        ).toContain(feature);
        if (biome === BiomeKind.Tundra) cold.add(feature);
        checked++;
      }
    }
    expect(checked, 'no se encontro vida en el mundo de prueba').toBeGreaterThan(100);
    expect(cold.size, 'no se encontro vida de tundra').toBeGreaterThan(0);
  });
});

describe('Las densidades acordadas con el autor', () => {
  it('la piedra baja al 60 % fuera de la montana', () => {
    expect(densityFor(Terrain.Grass).rock).toBeCloseTo(0.015 * ROCK_ELSEWHERE, 10);
    expect(densityFor(Terrain.Tundra).rock).toBeCloseTo(0.03 * ROCK_ELSEWHERE, 10);
    expect(densityFor(Terrain.Sand).rock).toBeCloseTo(0.02 * ROCK_ELSEWHERE, 10);
    expect(ROCK_ELSEWHERE).toBe(0.6);
  });

  it('en la montana la piedra sale como los arboles en pradera', () => {
    // La referencia que fijo el autor, no un numero suelto.
    expect(densityFor(Terrain.Rock).rock).toBe(densityFor(Terrain.Grass).tree);
    expect(densityFor(Terrain.Rock).rock).toBe(HIGHLAND_ROCK);
  });

  it('los minerales suman el 10 % de esa piedra, repartidos 5 / 2.5 / 2.5', () => {
    const d = densityFor(Terrain.Rock);
    expect(d.coal).toBeCloseTo(HIGHLAND_ROCK * 0.05, 12);
    expect(d.iron).toBeCloseTo(HIGHLAND_ROCK * 0.025, 12);
    expect(d.copper).toBeCloseTo(HIGHLAND_ROCK * 0.025, 12);
    expect(d.coal + d.iron + d.copper).toBeCloseTo(HIGHLAND_ROCK * 0.1, 12);
    expect(MINERAL_SHARE.coal + MINERAL_SHARE.iron + MINERAL_SHARE.copper).toBeCloseTo(0.1, 12);
  });

  it('fuera de la montana no hay minerales en ningun terreno', () => {
    for (const t of [Terrain.Grass, Terrain.Forest, Terrain.Tundra, Terrain.Snow, Terrain.Sand]) {
      const d = densityFor(t);
      expect(d.coal + d.iron + d.copper, `terreno ${t}`).toBe(0);
    }
  });

  it('la montana no tiene vegetacion', () => {
    const d = densityFor(Terrain.Rock);
    expect(d.tree).toBe(0);
    expect(d.plant).toBe(0);
  });
});

describe('Los minerales en el mundo generado', () => {
  it('solo aparecen sobre roca', () => {
    const world = new World(12345);
    let found = 0;
    for (let y = -200; y < 200; y += 2) {
      for (let x = -200; x < 200; x += 2) {
        const feature = world.gen.featureAt(x, y, world.gen.terrainAt(x, y));
        if (!MINERAL_NODES.includes(feature)) continue;
        expect(world.gen.terrainAt(x, y), `mineral fuera de la montana en (${x}, ${y})`).toBe(
          Terrain.Rock,
        );
        found++;
      }
    }
    expect(found, 'no se genero ni un mineral en el mundo de prueba').toBeGreaterThan(0);
  });

  it('los tres existen y el carbon es el mas comun', () => {
    const world = new World(12345);
    const counts = new Map<Feature, number>();
    for (let y = -300; y < 300; y++) {
      for (let x = -300; x < 300; x++) {
        const feature = world.gen.featureAt(x, y, world.gen.terrainAt(x, y));
        if (MINERAL_NODES.includes(feature)) {
          counts.set(feature, (counts.get(feature) ?? 0) + 1);
        }
      }
    }
    for (const node of MINERAL_NODES) {
      expect(counts.get(node) ?? 0, `no salio ${node}`).toBeGreaterThan(0);
    }
    // El carbon lleva el doble de indice que los otros dos.
    expect(counts.get(Feature.CoalNode)!).toBeGreaterThan(counts.get(Feature.IronNode)!);
    expect(counts.get(Feature.CoalNode)!).toBeGreaterThan(counts.get(Feature.CopperNode)!);
  });
});

describe('El botin de los minerales', () => {
  const ranges: ReadonlyArray<readonly [Feature, Resource, number, number]> = [
    [Feature.CoalNode, Resource.Coal, 2, 5],
    [Feature.IronNode, Resource.Iron, 1, 2],
    [Feature.CopperNode, Resource.Copper, 2, 3],
  ];

  for (const [node, resource, min, max] of ranges) {
    it(`${Resource[resource]} da entre ${min} y ${max}`, () => {
      const yield_ = harvestOf(node)!;
      expect(yield_.resource).toBe(resource);
      expect(yield_.amount).toBe(min);
      expect(yield_.max).toBe(max);
      // Sin semilla y fuera del equilibrio: son inertes, como la piedra.
      expect(yield_.seed).toBeNull();
      expect(yield_.inert).toBe(true);
    });
  }

  it('la piedra sigue siendo inerte y de cantidad fija', () => {
    const stone = harvestOf(Feature.RockNode)!;
    expect(stone.amount).toBe(stone.max);
    expect(stone.inert).toBe(true);
  });

  it('lo vivo no es inerte y por tanto si cobra el bonus', () => {
    for (const f of [Feature.ForestTree, Feature.TundraPlant, Feature.MeadowTreeRare]) {
      expect(harvestOf(f)!.inert, `${f}`).toBe(false);
    }
  });
});
