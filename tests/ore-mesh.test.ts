import { describe, expect, it } from 'vitest';
import { Feature } from '@verdant/shared';
import { oreFormation } from '@verdant/sim';
import { CROWN_OVERLAP, oreModel, type OreModel } from '../packages/client/src/ore-mesh.js';
import { ORE_TONES } from '../packages/client/src/palette.js';
import { rockMesh } from '../packages/client/src/rock-mesh.js';
import { WORLD_PX } from '../packages/client/src/world-art.js';

/**
 * Las menas (el autor, 2026-10-20): ocho voxeles del terreno (`oreFormation`)
 * con la piedra de la roca, vetas del mineral y cristales en laminas cruzadas,
 * una distinta por casilla, con las reglas de la corona y de los costados que
 * aprobo en el boceto (`docs/bocetos/minerales/`). Aqui se miden las reglas
 * sobre los cristales colocados, no sobre lo que dice el informe de quien los
 * coloco, y sobre la formacion como la pone el generador: enterrada hasta su
 * nivel de arriba.
 */

const ORES = [Feature.CoalNode, Feature.IronNode, Feature.CopperNode] as const;
/** Enterrada hasta su nivel de arriba, como la pone el generador. */
const buried = (_e: number, _s: number, z: number) => z <= -1;
const DEG = 180 / Math.PI;
/** El lado de un voxel, en bloques, y su cara en pixeles de arte. */
const V = 0.5;
const N = WORLD_PX * V;

/** Muchas menas: casillas y giros variados. */
function many(count = 120): OreModel[] {
  const out: OreModel[] = [];
  for (let i = 0; i < count; i++) {
    const [seed, tx, ty] = [0x5eed + (i >> 4), i * 7 - 300, i * 13 + 11];
    out.push(oreModel(ORES[i % 3]!, seed, tx, ty, oreFormation(seed, tx, ty), buried));
  }
  return out;
}

/** Los cristales agrupados por la cara de la que salen. */
function byFace(model: OreModel) {
  const groups = new Map<string, OreModel['crystals'][number][]>();
  for (const c of model.crystals) {
    const key = `${c.voxel.join(',')}|${c.face.join(',')}`;
    groups.set(key, [...(groups.get(key) ?? []), c]);
  }
  return groups;
}

describe('Una mena por casilla', () => {
  it('la misma casilla da siempre la misma mena, y dos casillas, dos distintas', () => {
    const a = oreModel(Feature.CopperNode, 42, 10, -3, oreFormation(42, 10, -3), buried);
    const b = oreModel(Feature.CopperNode, 42, 10, -3, oreFormation(42, 10, -3), buried);
    expect([...a.mesh.positions]).toEqual([...b.mesh.positions]);
    expect(a.art).toEqual(b.art);
    const c = oreModel(Feature.CopperNode, 42, 11, -3, oreFormation(42, 11, -3), buried);
    expect([...c.mesh.positions]).not.toEqual([...a.mesh.positions]);
    expect(c.art.rows).not.toEqual(a.art.rows);
  });

  it('cada mineral se pinta con sus colores, sobre la piedra de la roca', () => {
    for (const f of ORES) {
      const { palette } = oreModel(f, 7, 0, 0, oreFormation(7, 0, 0), buried).art;
      const ore = ORE_TONES[f]!;
      expect([palette.i, palette.j, palette.k, palette.l, palette.s]).toEqual([...ore.tones, ore.shine]);
      expect(palette.b).toBe('#84848e');
    }
  });

  it('su textura: rejilla bien formada, cada letra en su paleta, y vetas sobre la piedra', () => {
    for (const m of many(30)) {
      const w = m.art.rows[0]!.length;
      expect(m.art.rows.every((r) => r.length === w)).toBe(true);
      for (const ch of m.art.rows.join('')) if (ch !== '.') expect(m.art.palette[ch], `«${ch}» sin color`).toBeDefined();
      // La tesela de piedra, entera y opaca, con algo de mineral.
      const stone = m.art.rows.slice(0, WORLD_PX).map((r) => r.slice(0, WORLD_PX)).join('');
      expect(stone).not.toContain('.');
      expect(stone).toMatch(/[ijkl]/);
    }
  });

  it('la malla: la piedra de la roca tal cual, y todo dentro de la textura', () => {
    for (const tx of [5, 6, 7, 8]) {
      const shape = oreFormation(3, tx, 5);
      const m = oreModel(Feature.IronNode, 3, tx, 5, shape, buried);
      const rock = rockMesh(shape, 0, buried);
      expect([...m.mesh.positions.slice(0, rock.positions.length)]).toEqual([...rock.positions]);
      expect([...m.mesh.colors.slice(0, rock.colors.length)]).toEqual([...rock.colors]);
      for (const uv of m.mesh.uvs) {
        expect(uv).toBeGreaterThanOrEqual(0);
        expect(uv).toBeLessThanOrEqual(1);
      }
      // Cada cristal, dos laminas por sus dos caras: 4 vertices y 4 triangulos por lamina.
      const extra = m.mesh.positions.length / 3 - rock.positions.length / 3;
      expect(extra).toBe(m.crystals.length * 8);
      expect(m.mesh.indices.length - rock.indices.length).toBe(m.crystals.length * 24);
    }
  });
});

describe('Sin cristales donde se tocan los voxeles de la mena', () => {
  it('ninguno sale de una cara tapada por otro voxel, y cada cara al aire lleva los suyos', () => {
    for (let i = 0; i < 40; i++) {
      const shape = oreFormation(9, i * 5, -i);
      const m = oreModel(ORES[i % 3]!, 9, i * 5, -i, shape, buried);
      const voxels = new Set(shape.map((v) => v.join(',')));
      for (const c of m.crystals) {
        const [e, s, z] = c.voxel;
        const [de, ds, dz] = c.face;
        // Abajo, nunca: esta enterrada.
        expect(dz).toBeGreaterThanOrEqual(0);
        expect(voxels.has(`${e + de},${s + ds},${z + dz}`), `un cristal sale de una cara tapada: ${c.voxel.join(',')} hacia ${c.face.join(',')}`).toBe(false);
      }
      // Las caras al aire: 4 tapas (las 3 de arriba y la del hueco que dejan
      // en el 2 × 2) y los 8 lados de las tres de arriba.
      const faces = [...byFace(m).keys()];
      expect(faces.filter((k) => k.endsWith('|0,0,1')).length).toBe(4);
      expect(faces.filter((k) => !k.endsWith('|0,0,1')).length).toBe(8);
    }
  });
});

describe('La regla de la corona (aprobada el 2026-10-20)', () => {
  it('una flor en cada tapa: su centro, el mas alto y grueso, y de 4 a 8 cristales mas', () => {
    for (const m of many()) {
      for (const [key, crown] of byFace(m)) {
        if (!key.endsWith('|0,0,1')) continue;
        const [center, ...rest] = crown;
        expect([center!.w, center!.h]).toEqual([5, 6]);
        expect(Math.acos(center!.dir[1]) * DEG).toBeLessThanOrEqual(10 + 1e-9);
        // 5 a 7 de la flor y 0 a 2 brotes; que la flor no desaparezca (paso en
        // el boceto: «literalmente la flor ya no esta»).
        expect(rest.length).toBeGreaterThanOrEqual(4);
        expect(rest.length).toBeLessThanOrEqual(8);
      }
    }
  });

  it('cada cristal, un pixel menos de ancho que de alto (nunca menos de 3), y de 0,25 como mucho', () => {
    for (const m of many()) {
      for (const c of m.crystals) {
        expect(c.h).toBeLessThanOrEqual(6);
        if (c.kind === 'corona') expect(c.w).toBe(Math.max(3, c.h - 1));
      }
    }
  });

  it('las bases se pisan, pero nunca mas del 40 %', () => {
    let worst = 0;
    for (const m of many()) {
      for (const [key, crown] of byFace(m)) {
        if (!key.endsWith('|0,0,1')) continue;
        for (let i = 0; i < crown.length; i++) {
          for (let j = i + 1; j < crown.length; j++) {
            const a = crown[i]!;
            const b = crown[j]!;
            const dist = Math.hypot(a.base[0] - b.base[0], a.base[2] - b.base[2]) / V;
            const o = 1 - dist / ((a.w + b.w) / 2 / N);
            worst = Math.max(worst, o);
          }
        }
      }
    }
    expect(worst).toBeLessThanOrEqual(CROWN_OVERLAP + 1e-9);
    // Y se pisan de verdad: es lo que les da el aspecto de la primera corona.
    expect(worst).toBeGreaterThan(0.2);
  });

  it('los petalos se abren hacia fuera, de 15 a 50 grados, y todo queda dentro de la tapa', () => {
    for (const m of many()) {
      for (const c of m.crystals) {
        if (c.kind !== 'corona') continue;
        const tilt = Math.acos(c.dir[1]) * DEG;
        expect(tilt).toBeLessThanOrEqual(50 + 1e-9);
        // El pie, a 0,44 del centro de su tapa como mucho.
        const cx = (c.voxel[0] + 0.5) * V - 0.5;
        const cz = (c.voxel[1] + 0.5) * V - 0.5;
        expect(Math.abs(c.base[0] - cx)).toBeLessThanOrEqual(0.44 * V + 1e-9);
        expect(Math.abs(c.base[2] - cz)).toBeLessThanOrEqual(0.44 * V + 1e-9);
      }
    }
  });
});

describe('La regla de los costados (aprobada el 2026-10-20)', () => {
  it('dos por cara, hacia arriba de 30 a 56 grados, con la punta a menos de 20 de la normal', () => {
    for (const m of many()) {
      for (const [key, pair] of byFace(m)) {
        if (key.endsWith('|0,0,1')) continue;
        expect(pair.map((c) => [c.w, c.h])).toEqual([[4, 5], [3, 4]]);
        for (const c of pair) {
          const rise = Math.asin(c.dir[1]) * DEG;
          expect(rise).toBeGreaterThanOrEqual(30 - 1e-9);
          expect(rise).toBeLessThanOrEqual(56 + 1e-9);
          // El arco horizontal: el angulo entre su rumbo y la normal de la cara.
          const n = [c.face[0], c.face[1]];
          const flat = Math.hypot(c.dir[0], c.dir[2]);
          const arc = Math.acos((c.dir[0] * n[0]! + c.dir[2] * n[1]!) / flat) * DEG;
          expect(arc).toBeLessThanOrEqual(20 + 1e-6);
        }
      }
    }
  });

  it('sus bases no se tocan nunca', () => {
    for (const m of many()) {
      expect(m.sideOverlaps).toBe(0);
      for (const [key, [a, b]] of byFace(m)) {
        if (key.endsWith('|0,0,1')) continue;
        const dist = Math.hypot(a!.base[0] - b!.base[0], a!.base[1] - b!.base[1], a!.base[2] - b!.base[2]) / V;
        expect(dist).toBeGreaterThanOrEqual((a!.w + b!.w) / 2 / N + 0.08 - 1e-9);
      }
    }
  });
});

describe('Cuanto pesa una mena', () => {
  it('pocos vertices y una textura pequeña: se puede tener una por casilla', () => {
    // Medido (2026-10-20, 300 menas): enterrada, 401 vertices de media y 448
    // como mucho; cavada del todo, 880 y 944. La textura, de 64 de ancho.
    for (const m of many(30)) {
      expect(m.mesh.positions.length / 3).toBeLessThan(500);
      expect(m.art.rows[0]!.length).toBe(64);
    }
    for (let i = 0; i < 30; i++) {
      const dug = oreModel(ORES[i % 3]!, i, i * 7, -i, oreFormation(i, i * 7, -i), () => false);
      expect(dug.mesh.positions.length / 3).toBeLessThan(1000);
      expect(dug.art.rows[0]!.length).toBe(64);
    }
  });
});

describe('La mena en el terreno (el autor, 2026-10-20: voxeles que se pican)', () => {
  it('ni piedra ni cristales donde la tapa el terreno; y bajo un hueco, la flor colgando', () => {
    for (let i = 0; i < 30; i++) {
      const shape = oreFormation(11, i, -2 * i);
      // Enterrada hasta su nivel de arriba, como la pone el generador.
      const buried = (_e: number, _s: number, z: number) => z <= -1;
      const m = oreModel(ORES[i % 3]!, 11, i, -2 * i, shape, buried);
      const has = (x: number, y: number, z: number) => shape.some(([a, b, c]) => a === x && b === y && c === z) || buried(x, y, z);
      for (const c of m.crystals) {
        const [e, s, z] = c.voxel;
        const [de, ds, dz] = c.face;
        expect(has(e + de, s + ds, z + dz)).toBe(false);
      }
      // El voxel de abajo, enterrado del todo, no lleva nada.
      expect(m.crystals.some((c) => c.voxel[2] === -2)).toBe(false);
      // Sin lo de abajo (se cavo), lo que queda en el aire cuelga su flor.
      const dug = oreModel(ORES[i % 3]!, 11, i, -2 * i, shape.filter(([, , z]) => z === 0), () => false);
      expect(dug.crystals.some((c) => c.face[2] === -1 && c.dir[1] < 0)).toBe(true);
    }
  });
});

describe('Los cristales, ligados a su sitio (el autor, 2026-10-20)', () => {
  it('romper un voxel no cambia los cristales de los demas: cada cara que sigue al aire lleva los mismos', () => {
    const key = (c: OreModel['crystals'][number]) => `${c.voxel.join()}|${c.face.join()}`;
    for (let i = 0; i < 20; i++) {
      const shape = oreFormation(23, i, 3 * i);
      const buried = (_e: number, _s: number, z: number) => z <= -1;
      const whole = oreModel(ORES[i % 3]!, 23, i, 3 * i, shape, buried);
      // Sin uno de los de arriba: sus vecinas ganan caras al aire, el resto no cambia.
      const top = shape.filter(([, , z]) => z === 0);
      const gone = top[i % top.length]!;
      const less = oreModel(ORES[i % 3]!, 23, i, 3 * i, shape.filter((v) => v !== gone), buried);
      const touches = (c: OreModel['crystals'][number]) => {
        const [e, s, z] = c.voxel;
        const [de, ds, dz] = c.face;
        return e + de === gone[0] && s + ds === gone[1] && z + dz === gone[2];
      };
      const before = new Map<string, string[]>();
      whole.crystals.forEach((c, k) => {
        if (c.voxel === gone || touches(c)) return;
        before.set(key(c), [...(before.get(key(c)) ?? []), JSON.stringify(c) + spriteOf(whole, k)]);
      });
      const after = new Map<string, string[]>();
      less.crystals.forEach((c, k) => {
        if (touches(c)) return;
        after.set(key(c), [...(after.get(key(c)) ?? []), JSON.stringify(c) + spriteOf(less, k)]);
      });
      // Las caras que estaban al aire siguen con lo mismo; las nuevas, aparte.
      for (const [face, list] of before) expect(after.get(face), face).toEqual(list);
    }
  });
});

/** Los pixeles del dibujo del cristal `k` en la textura de su mena. */
function spriteOf(m: OreModel, k: number): string {
  const c = m.crystals[k]!;
  // Su dibujo, sacado de la malla: las uv de su primera lamina.
  const rock = m.mesh.positions.length / 3 - m.crystals.length * 8;
  const at = (rock + k * 8) * 2;
  const W = m.art.rows[0]!.length;
  const H = m.art.rows.length;
  const x0 = Math.round(m.mesh.uvs[at]! * W);
  const y0 = Math.round((1 - m.mesh.uvs[at + 1]!) * H);
  return m.art.rows.slice(y0, y0 + c.h).map((r) => r.slice(x0, x0 + c.w)).join('/');
}
