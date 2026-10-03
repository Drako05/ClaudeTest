/**
 * Los modelos de bloques de la fauna (decision del autor, 2026-10-03).
 *
 * Cada (especie, etapa) es una sola geometria con todas las cajas de su plano
 * (`fauna-body.ts` de `shared`), el mismo que usa el nucleo para golpear y
 * chocar: lo que se ve es lo que se golpea. Cada caja lleva el color de su
 * papel —pelaje, vientre, crin, cuernos— para su especie y su etapa, con la
 * librea real de cada cria: el cervato moteado, el rayon con rayas, el zorrito
 * pardo, el bisonte rojizo, el pollo de gaviota pardo. **Colores mios**, de la
 * especie real.
 *
 * Van en `MeshLambertMaterial` con colores por vertice, como el terreno, y con
 * normales planas: la luz es la del mundo, asi que un animal que gira cambia de
 * cara iluminada como cambiaria un bloque.
 *
 * Estaticos de momento (decision del autor): se desplazan y giran, pero el
 * modelo no se mueve.
 */

import { BufferGeometry, Color, Float32BufferAttribute } from 'three';
import { partsOf, Species, Stage, type BodyRole } from '@verdant/shared';

type Palette = Record<BodyRole, string>;

const EYE = '#14100c';

/** Los colores del adulto de cada especie. */
function adultPalette(species: Species): Partial<Palette> {
  switch (species) {
    case Species.Hare:
      return { coat: '#9c7650', dark: '#5a4028', belly: '#d8c8a8' };
    case Species.Bison:
      return { coat: '#5b3a22', dark: '#2a1a0e', belly: '#4a3020', mane: '#3d2615', horn: '#1a1410' };
    case Species.RedDeer:
      return { coat: '#9a5a32', dark: '#5a3018', belly: '#c8a07a', rump: '#e8dcc0' };
    case Species.Boar:
      return { coat: '#4a3a30', dark: '#241a14', belly: '#5a4a3e', mane: '#2e241c', horn: '#f0ead8', nose: '#3a2a24' };
    case Species.Reindeer:
      return { coat: '#8a7a68', dark: '#4a3e32', belly: '#d8d0c0', mane: '#ece4d4', rump: '#e4dccc', horn: '#d8ccb0' };
    case Species.ArcticFox:
      return { coat: '#f0f0ec', dark: '#9aa0a8', belly: '#ffffff', nose: '#222222' };
    case Species.Ibex:
      return { coat: '#8a7258', dark: '#4a3a2a', belly: '#c8b498', horn: '#5a4a3a', mane: '#4a3a2a' };
    case Species.Marmot:
      return { coat: '#8a6a48', dark: '#4a3420', belly: '#b89870' };
    case Species.Crab:
      return { coat: '#4a6a2a', dark: '#2e4418' };
    case Species.Gull:
      return { coat: '#f6f6f2', dark: '#18181a', wing: '#9aa4ac', beak: '#e8c030', hoof: '#e0c040' };
  }
}

/** Lo que cambia en la cria (`Infant`) y el joven de cada especie. */
function stagePalette(species: Species, stage: Stage): Partial<Palette> {
  if (stage === Stage.Adult) return {};
  const infant = stage === Stage.Infant;
  switch (species) {
    case Species.Bison:
      return infant ? { coat: '#b0602a', belly: '#a05a28', mane: '#b0602a' } : { coat: '#7a4a28' };
    case Species.RedDeer:
      return infant ? { coat: '#a8683a', pattern: '#f0e4c8' } : {};
    case Species.Boar:
      return infant ? { coat: '#8a6040', pattern: '#d8b888', mane: '#8a6040' } : { coat: '#7a5034', mane: '#7a5034' };
    case Species.Reindeer:
      return infant ? { coat: '#7a5a3a', belly: '#9a7a5a', mane: '#7a5a3a' } : {};
    case Species.ArcticFox:
      return infant ? { coat: '#6a5444', dark: '#3a2e24', belly: '#8a7462' } : { coat: '#b4b0a8' };
    case Species.Ibex:
      return infant ? { coat: '#a08a70' } : {};
    case Species.Crab:
      return { coat: infant ? '#7a9a4a' : '#5a7a32' };
    case Species.Gull:
      return infant
        ? { coat: '#b8a890', dark: '#6a5a48', beak: '#3a3430', hoof: '#5a5048' }
        : { coat: '#8a7a68', dark: '#3a3028', wing: '#6e604e', beak: '#2a2420' };
    default:
      return {};
  }
}

/** Los colores de cada papel de un animal de una etapa. */
export function paletteOf(species: Species, stage: Stage): Palette {
  const p = { ...adultPalette(species), ...stagePalette(species, stage) };
  const coat = p.coat ?? '#808080';
  const dark = p.dark ?? coat;
  return {
    coat,
    dark,
    belly: p.belly ?? coat,
    mane: p.mane ?? coat,
    rump: p.rump ?? p.belly ?? coat,
    pattern: p.pattern ?? coat,
    horn: p.horn ?? dark,
    hoof: p.hoof ?? dark,
    nose: p.nose ?? dark,
    eye: EYE,
    wing: p.wing ?? coat,
    beak: p.beak ?? dark,
  };
}

/** Las seis caras de una caja: normal, y sus cuatro esquinas en signos de (x, y, z). */
const FACES: ReadonlyArray<{ n: [number, number, number]; c: ReadonlyArray<[number, number, number]> }> = [
  { n: [1, 0, 0], c: [[1, -1, 1], [1, -1, -1], [1, 1, -1], [1, 1, 1]] },
  { n: [-1, 0, 0], c: [[-1, -1, -1], [-1, -1, 1], [-1, 1, 1], [-1, 1, -1]] },
  { n: [0, 1, 0], c: [[-1, 1, 1], [1, 1, 1], [1, 1, -1], [-1, 1, -1]] },
  { n: [0, -1, 0], c: [[-1, -1, -1], [1, -1, -1], [1, -1, 1], [-1, -1, 1]] },
  { n: [0, 0, 1], c: [[-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]] },
  { n: [0, 0, -1], c: [[1, -1, -1], [-1, -1, -1], [-1, 1, -1], [1, 1, -1]] },
];

/**
 * La geometria de un animal de una etapa, en su marco: `x` hacia donde mira,
 * `y` arriba desde los pies, `z` a su izquierda. Sin indices, con normales
 * planas por cara y el color de cada parte por vertice.
 */
export function animalGeometry(species: Species, stage: Stage): BufferGeometry {
  const palette = paletteOf(species, stage);
  const positions: number[] = [];
  const normals: number[] = [];
  const colors: number[] = [];
  const color = new Color();
  for (const part of partsOf(species, stage)) {
    color.set(palette[part.role]);
    const [hx, hy, hz] = [part.size[0] / 2, part.size[1] / 2, part.size[2] / 2];
    const [cx, cy, cz] = part.at;
    for (const face of FACES) {
      const corners = face.c.map(([sx, sy, sz]) => [cx + sx * hx, cy + sy * hy, cz + sz * hz]);
      for (const i of [0, 1, 2, 0, 2, 3]) {
        positions.push(...corners[i]);
        normals.push(...face.n);
        colors.push(color.r, color.g, color.b);
      }
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new Float32BufferAttribute(normals, 3));
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}
