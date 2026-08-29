import { describe, expect, it } from 'vitest';
import { Feature } from '@verdant/shared';
import {
  DEBRIS_PER_BURST,
  Effects,
  MAX_PARTICLES,
  progressOf,
  SLASH_SECONDS,
} from '../packages/client/src/effects.js';
import { debrisPalette, LOOKS, ROCK_FACES } from '../packages/client/src/palette.js';

/**
 * Los efectos del golpe y de lo derribado.
 *
 * Son adorno, pero el movimiento es matematica y la matematica se comprueba. Lo
 * que aqui se defiende es el enunciado del autor: cuadrados de distintos
 * tamanos, con los colores del objeto original, que se dispersan cayendo al
 * suelo.
 */

const PALETTE = debrisPalette(Feature.ForestTree);

/** Corre el efecto hasta el final en pasos de un frame a 60 Hz. */
function run(effects: Effects, seconds: number): void {
  const dt = 1 / 60;
  for (let t = 0; t < seconds; t += dt) effects.advance(dt);
}

describe('Escombros de lo recolectado', () => {
  it('un estallido suelta varios cuadrados', () => {
    const effects = new Effects(7);
    effects.spawnDebris(3, 4, PALETTE);
    expect(effects.particles).toHaveLength(DEBRIS_PER_BURST);
  });

  it('caen y se quedan en el suelo, sin atravesarlo ni rebotar', () => {
    // Es el «cayendo al suelo» del enunciado, medido: ninguna altura negativa en
    // ningun momento, y una vez posadas no vuelven a subir.
    const effects = new Effects(11);
    effects.spawnDebris(0, 0, PALETTE);

    // Menos de la vida mas corta posible, para que ninguna caduque y los indices
    // no se muevan: si no, seguir a una particula concreta seria imposible.
    const dt = 1 / 60;
    const landed = new Set<number>();
    for (let step = 0; step < 30; step++) {
      effects.advance(dt);
      expect(effects.particles).toHaveLength(DEBRIS_PER_BURST);
      effects.particles.forEach((p, i) => {
        expect(p.z, 'una particula se hundio bajo el suelo').toBeGreaterThanOrEqual(0);
        // La asercion se hace SIEMPRE, no solo cuando ya esta en el suelo: si
        // rebotara, la comprobacion no llegaria a ejecutarse nunca.
        if (landed.has(i)) expect(p.z, `la particula ${i} reboto`).toBe(0);
        if (p.z === 0) landed.add(i);
      });
    }
    expect(landed.size, 'ninguna llego a posarse').toBeGreaterThan(0);
  });

  it('todas acaban posadas antes de apagarse', () => {
    const effects = new Effects(3);
    effects.spawnDebris(0, 0, PALETTE);
    run(effects, 0.6);
    for (const p of effects.particles) {
      expect(p.z, 'sigue en el aire mas de medio segundo').toBe(0);
    }
  });

  it('se dispersan: no caen todas en el mismo sitio', () => {
    const effects = new Effects(23);
    effects.spawnDebris(10, 10, PALETTE);
    run(effects, 0.6);

    const spots = new Set(effects.particles.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`));
    expect(spots.size).toBeGreaterThan(1);
    // Y se quedan cerca de la casilla de la que salieron, no a media pantalla.
    for (const p of effects.particles) {
      expect(Math.hypot(p.x - 10.5, p.y - 10.5)).toBeLessThan(2);
    }
  });

  it('los tamanos varian', () => {
    // Sin esto, un estallido de diez cuadrados identicos pasaria igual.
    const effects = new Effects(5);
    effects.spawnDebris(0, 0, PALETTE);
    const sizes = new Set(effects.particles.map((p) => p.size));
    expect(sizes.size).toBeGreaterThan(3);
  });

  it('los colores son los del objeto original, ninguno inventado', () => {
    // El enunciado del autor al pie de la letra. Se comprueba en todas las
    // especies, no solo en una.
    const kinds: Feature[] = [Feature.RockNode, ...(Object.keys(LOOKS).map(Number) as Feature[])];
    for (const kind of kinds) {
      const palette = new Set(debrisPalette(kind));
      expect(palette.size, `${kind} no tiene paleta`).toBeGreaterThan(0);

      const effects = new Effects(99);
      effects.spawnDebris(0, 0, [...palette]);
      for (const p of effects.particles) {
        expect(palette, `color ajeno en la especie ${kind}`).toContain(p.color);
      }
    }
  });

  it('sin colores no se dibuja nada', () => {
    // Mejor no dibujar que inventarse una paleta que no es la del objeto.
    const effects = new Effects(1);
    effects.spawnDebris(0, 0, []);
    expect(effects.particles).toHaveLength(0);
  });

  it('el mismo estallido con la misma semilla da lo mismo', () => {
    const snapshot = (seed: number): string => {
      const effects = new Effects(seed);
      effects.spawnDebris(2, -3, PALETTE);
      run(effects, 0.4);
      return JSON.stringify(effects.particles);
    };
    expect(snapshot(42)).toBe(snapshot(42));
  });

  it('dos estallidos seguidos no salen identicos', () => {
    const effects = new Effects(42);
    effects.spawnDebris(0, 0, PALETTE);
    const first = effects.particles.map((p) => p.size).join(',');
    effects.clear();
    effects.spawnDebris(0, 0, PALETTE);
    const second = effects.particles.map((p) => p.size).join(',');
    expect(second).not.toBe(first);
  });

  it('todo caduca solo', () => {
    const effects = new Effects(8);
    effects.spawnDebris(0, 0, PALETTE);
    effects.spawnSlash([{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }]);
    run(effects, 3);
    expect(effects.count).toBe(0);
  });

  it('el tope aguanta una tala a toda velocidad', () => {
    // Cuatro acciones por segundo a 64x son muchos estallidos; sin tope la
    // escena se llenaria de cuadrados.
    const effects = new Effects(13);
    for (let i = 0; i < 200; i++) effects.spawnDebris(i, i, PALETTE);
    expect(effects.particles.length).toBeLessThanOrEqual(MAX_PARTICLES);
  });
});

describe('El slash de la accion', () => {
  it('cubre las tres casillas del area', () => {
    const area = [
      { x: 5, y: 5 },
      { x: 5, y: 4 },
      { x: 5, y: 6 },
    ];
    const effects = new Effects();
    effects.spawnSlash(area);
    expect(effects.slashes[0].tiles).toEqual(area);
  });

  it('no se queda con la lista de quien lo pidio', () => {
    // Si guardara la referencia, mover al jugador movería un slash ya lanzado.
    const area = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }];
    const effects = new Effects();
    effects.spawnSlash(area);
    area[0].x = 99;
    expect(effects.slashes[0].tiles[0].x).toBe(0);
  });

  it('dura lo acordado y avanza de cero a uno', () => {
    const effects = new Effects();
    effects.spawnSlash([{ x: 0, y: 0 }]);
    expect(progressOf(effects.slashes[0])).toBe(0);

    effects.advance(SLASH_SECONDS / 2);
    expect(progressOf(effects.slashes[0])).toBeCloseTo(0.5, 5);

    effects.advance(SLASH_SECONDS);
    expect(effects.slashes).toHaveLength(0);
  });

  it('un dt de cero o negativo no mueve nada', () => {
    const effects = new Effects(2);
    effects.spawnDebris(0, 0, PALETTE);
    const before = JSON.stringify(effects.particles);
    effects.advance(0);
    effects.advance(-1);
    expect(JSON.stringify(effects.particles)).toBe(before);
  });
});

describe('La paleta sale del mismo sitio que el dibujo', () => {
  it('la roca suelta sus tres caras', () => {
    expect(debrisPalette(Feature.RockNode)).toHaveLength(ROCK_FACES.length);
  });

  it('un arbusto con fruto suelta tambien el color del fruto', () => {
    const look = LOOKS[Feature.ForestPlant]!;
    const fruit = Number.parseInt(look.fruit!.slice(1), 16);
    expect(debrisPalette(Feature.ForestPlant)).toContain(fruit);
  });

  it('lo que no se puede recolectar no tiene escombros', () => {
    expect(debrisPalette(Feature.None)).toHaveLength(0);
    expect(debrisPalette(Feature.ForestTreeSapling)).toHaveLength(0);
  });
});
