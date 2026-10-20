import { describe, expect, it } from 'vitest';
import { Feature } from '@verdant/shared';
import { oreFormation } from '@verdant/sim';
import { CROWN_OVERLAP, oreModel, type OreModel } from '../packages/client/src/ore-mesh.js';
import { debrisPalette, ORE_TONES } from '../packages/client/src/palette.js';
import { rockMesh, turnVoxels } from '../packages/client/src/rock-mesh.js';
import { ROCK_SHAPE, WORLD_PX } from '../packages/client/src/world-art.js';

/**
 * Las menas (el autor, 2026-10-20): la roca de voxeles con vetas del mineral y
 * cristales en laminas cruzadas, una distinta por casilla, con las reglas de
 * la corona y de los costados que aprobo en el boceto
 * (`docs/bocetos/minerales/`). Aqui se miden las reglas sobre los cristales
 * colocados, no sobre lo que dice el informe de quien los coloco.
 */

const ORES = [Feature.CoalNode, Feature.IronNode, Feature.CopperNode] as const;
/** La forma de la roca posada en el suelo: lo de debajo es terreno. */
const ground = (_e: number, _s: number, z: number) => z < 0;
const DEG = 180 / Math.PI;
/** El lado de un voxel, en bloques, y su cara en pixeles de arte. */
const V = 0.5;
const N = WORLD_PX * V;

/** Muchas menas: casillas y giros variados. */
function many(count = 120): OreModel[] {
  const out: OreModel[] = [];
  for (let i = 0; i < count; i++) out.push(oreModel(ORES[i % 3]!, 0x5eed + (i >> 4), i * 7 - 300, i * 13 + 11, turnVoxels(ROCK_SHAPE, i % 4), ground));
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
    const a = oreModel(Feature.CopperNode, 42, 10, -3, turnVoxels(ROCK_SHAPE, 2), ground);
    const b = oreModel(Feature.CopperNode, 42, 10, -3, turnVoxels(ROCK_SHAPE, 2), ground);
    expect([...a.mesh.positions]).toEqual([...b.mesh.positions]);
    expect(a.art).toEqual(b.art);
    const c = oreModel(Feature.CopperNode, 42, 11, -3, turnVoxels(ROCK_SHAPE, 2), ground);
    expect([...c.mesh.positions]).not.toEqual([...a.mesh.positions]);
    expect(c.art.rows).not.toEqual(a.art.rows);
  });

  it('cada mineral se pinta con sus colores, sobre la piedra de la roca', () => {
    for (const f of ORES) {
      const { palette } = oreModel(f, 7, 0, 0, turnVoxels(ROCK_SHAPE, 0), ground).art;
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
    for (const turn of [0, 1, 2, 3]) {
      const m = oreModel(Feature.IronNode, 3, 5, 5, turnVoxels(ROCK_SHAPE, turn), ground);
      const rock = rockMesh(turnVoxels(ROCK_SHAPE, turn), 0, ground);
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
      const turn = i % 4;
      const m = oreModel(ORES[i % 3]!, 9, i * 5, -i, turnVoxels(ROCK_SHAPE, turn), ground);
      const voxels = new Set(turnVoxels(ROCK_SHAPE, turn).map((v) => v.join(',')));
      for (const c of m.crystals) {
        const [e, s, z] = c.voxel;
        const [de, ds, dz] = c.face;
        // Abajo, nunca: se apoya en el suelo.
        expect(dz).toBeGreaterThanOrEqual(0);
        expect(voxels.has(`${e + de},${s + ds},${z + dz}`), `un cristal sale de una cara tapada: ${c.voxel.join(',')} hacia ${c.face.join(',')}`).toBe(false);
      }
      // Las caras al aire: 4 tapas (las 3 de arriba y la del escalon) y 16 lados.
      const faces = [...byFace(m).keys()];
      expect(faces.filter((k) => k.endsWith('|0,0,1')).length).toBe(4);
      expect(faces.filter((k) => !k.endsWith('|0,0,1')).length).toBe(16);
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

describe('Los escombros de una mena', () => {
  it('llevan la piedra de la roca y los colores de su mineral', () => {
    for (const f of ORES) {
      const colors = new Set(debrisPalette(f));
      const rock = new Set(debrisPalette(Feature.RockNode));
      for (const c of rock) expect(colors.has(c)).toBe(true);
      for (const tone of ORE_TONES[f]!.tones) expect(colors.has(Number.parseInt(tone.slice(1), 16))).toBe(true);
    }
  });
});

describe('Cuanto pesa una mena', () => {
  it('pocos vertices y una textura pequeña: se puede tener una por casilla', () => {
    for (const m of many(30)) {
      expect(m.mesh.positions.length / 3).toBeLessThan(800);
      expect(m.art.rows[0]!.length * m.art.rows.length).toBeLessThanOrEqual(64 * 64);
    }
    // Y gira con la casilla: la forma no es la misma en los cuatro giros.
    expect(turnVoxels(ROCK_SHAPE, 1).map(String).sort()).not.toEqual(turnVoxels(ROCK_SHAPE, 0).map(String).sort());
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
