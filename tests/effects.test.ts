import { describe, expect, it } from 'vitest';
import { Feature } from '@verdant/shared';
import { EYE_HEIGHT, STRIKE_RANGE, strike } from '@verdant/sim';
import {
  DEBRIS_PER_BURST,
  Effects,
  MAX_PARTICLES,
  progressOf,
  SLASH_SECONDS,
  slashEdge,
  stabLine,
  CHIPS_PER_HIT,
  desaturate,
} from '../packages/client/src/effects.js';

describe('La estocada del modo preciso', () => {
  it('va recta de un extremo al otro: del borde de la pantalla a lo golpeado', () => {
    const from = { x: 1, y: 2, z: 3 };
    const to = { x: 4, y: 0, z: 7 };
    const line = stabLine(from, to);
    expect(line[0]).toEqual(from);
    expect(line[line.length - 1]).toEqual(to);
    // Todos los puntos en la recta: el del medio, en el medio.
    const mid = line[Math.floor(line.length / 2)];
    expect(mid.x).toBeCloseTo(2.5);
    expect(mid.y).toBeCloseTo(1);
    expect(mid.z).toBeCloseTo(5);
  });
});
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

  it('se posan en la cima del tile, no en el plano cero', () => {
    // Con relieve, la altura de un escombro se mide con la misma vara que el
    // terreno. Sin suelo propio, talar en una meseta tiraria la madera al mar.
    const effects = new Effects(17);
    effects.spawnDebris(0, 0, PALETTE, 3);
    for (const p of effects.particles) {
      expect(p.z, 'nace por debajo de la meseta').toBeGreaterThanOrEqual(3);
    }
    run(effects, 0.6);
    for (const p of effects.particles) {
      expect(p.z, 'se hundio por debajo de la meseta').toBe(3);
    }
    expect(effects.particles.length).toBeGreaterThan(0);
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
    effects.spawnSlash([{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }]);
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
  it('recorre el borde del area real: el extremo de cada rayo del golpe', () => {
    // Un golpe de verdad del nucleo, con el suelo cortando los rayos de un lado.
    const eye = { x: 10.5, y: 3.5, z: 20 + EYE_HEIGHT };
    const ground = (_x: number, y: number) => (y > 4.2 ? 21.6 : 20);
    const hit = strike(eye, 1, 0, -0.3, ground, () => null);
    const edge = slashEdge(eye, hit.rays);
    expect(edge).toHaveLength(hit.rays.length);
    hit.rays.forEach((ray, i) => {
      // En coordenadas de three.js: `y` es la altura y `z` el eje sur.
      expect(edge[i].x).toBeCloseTo(eye.x + ray.dir.x * ray.length, 9);
      expect(edge[i].y).toBeCloseTo(eye.z + ray.dir.z * ray.length, 9);
      expect(edge[i].z).toBeCloseTo(eye.y + ray.dir.y * ray.length, 9);
    });
    // Los rayos que no tocan suelo llegan a los 2,5 bloques del alcance; los del
    // lado del escalon se quedan antes.
    expect(Math.max(...hit.rays.map((r) => r.length))).toBeCloseTo(STRIKE_RANGE, 9);
    expect(Math.min(...hit.rays.map((r) => r.length))).toBeLessThan(STRIKE_RANGE);
  });

  it('no se queda con la lista de quien lo pidio', () => {
    // Si guardara la referencia, mover al jugador movería un slash ya lanzado.
    const points = [{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }];
    const effects = new Effects();
    effects.spawnSlash(points);
    points[0] = { x: 99, y: 0, z: 0 };
    expect(effects.slashes[0].points[0].x).toBe(0);
  });

  it('dura lo acordado y avanza de cero a uno', () => {
    const effects = new Effects();
    effects.spawnSlash([{ x: 0, y: 0, z: 0 }]);
    expect(progressOf(effects.slashes[0])).toBe(0);

    // El primer paso es el fotograma regalado: nace y se dibuja sin envejecer.
    effects.advance(1 / 60);
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

/**
 * El fallo que llevaba semanas mandando correos de CI.
 *
 * No era una carrera ni mala suerte del muestreo: era un corte exacto. El bucle
 * de `main.ts` corre todos los ticks pendientes de golpe —y dentro de ellos nace
 * el slash—, luego llama a `advance` **una sola vez** con el frame entero, y solo
 * despues dibuja. Un frame mas largo que `SLASH_SECONDS` mataba el slash entre su
 * nacimiento y el dibujo, asi que por debajo de 4,5 FPS no se veia **jamas**. El
 * runner de CI corre a 4-4,9 FPS renderizando por software, o sea a caballo del
 * corte, y de ahi que unas veces pasara y otras no.
 */
describe('Un efecto nace y se ve, por lento que vaya el fotograma', () => {
  it('el slash sobrevive a un fotograma mas largo que su propia vida', () => {
    const effects = new Effects();
    effects.spawnSlash([{ x: 0, y: 0, z: 0 }]);

    // El peor fotograma medido en CI: 840 ms, casi cuatro vidas del slash.
    effects.advance(0.84);
    expect(effects.slashes).toHaveLength(1);
    expect(progressOf(effects.slashes[0])).toBe(0);

    // Y no es inmortal: al siguiente paso se apaga como siempre.
    effects.advance(0.84);
    expect(effects.slashes).toHaveLength(0);
  });

  it('los escombros tambien, que caducan mas tarde pero caducan', () => {
    const effects = new Effects(7);
    effects.spawnDebris(0, 0, PALETTE);
    effects.advance(5);
    expect(effects.particles.length).toBe(DEBRIS_PER_BURST);
    effects.advance(5);
    expect(effects.particles).toHaveLength(0);
  });

  it('a los dos lados del corte de 4,5 FPS se ve igual', () => {
    // Modelo del bucle de `main.ts`: golpear, envejecer con el frame entero, y
    // solo entonces mirar, que es cuando dibuja el renderizador.
    const seen = (frame: number): boolean => {
      const effects = new Effects();
      effects.spawnSlash([{ x: 0, y: 0, z: 0 }]);
      effects.advance(frame);
      return effects.slashes.length > 0;
    };
    expect(seen(SLASH_SECONDS - 0.001)).toBe(true);
    expect(seen(SLASH_SECONDS + 0.001)).toBe(true);
    expect(seen(0.84)).toBe(true);
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

describe('Las esquirlas de un golpe que no rompe', () => {
  it('son menos, mas pequenas y mas apagadas que los escombros de romper', () => {
    const fx = new Effects();
    fx.spawnDebris(0, 0, [0xff0000]);
    fx.spawnChips(0, 0, [0xff0000]);
    const debris = fx.particles.filter((p) => !p.chip);
    const chips = fx.particles.filter((p) => p.chip);
    expect(debris).toHaveLength(DEBRIS_PER_BURST);
    expect(chips).toHaveLength(CHIPS_PER_HIT);
    expect(CHIPS_PER_HIT).toBeLessThan(DEBRIS_PER_BURST);
    expect(Math.max(...chips.map((p) => p.size))).toBeLessThan(Math.min(...debris.map((p) => p.size)));
    // El rojo puro, apagado: menos distancia entre canales.
    const c = chips[0].color;
    const spread = ((c >> 16) & 0xff) - (c & 0xff);
    expect(spread).toBeLessThan(255);
    expect(spread).toBeGreaterThan(0);
    expect(desaturate(0x808080, 0.4)).toBe(0x808080);
  });
});
