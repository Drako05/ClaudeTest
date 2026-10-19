/**
 * La roca de voxeles (el autor, 2026-10-19: las rocas y los minerales,
 * «bloque de voxeles», no laminas cruzadas): voxeles de 0,5 con la textura de
 * su piedra, en pixelart a 12 pixeles por cara (guia de arte, directriz 7).
 *
 * **Puro**: devuelve arrays planos, como `terrain-mesh.ts`, para comprobarlo
 * en Node. Su forma es `ROCK_SHAPE` de `world-art.ts`; el juego la gira un
 * cuarto de vuelta por casilla, con la casilla y no con azar vivo (regla 2), y
 * el giro se hace **aqui**, sobre los voxeles, y no girando la malla: la luz va
 * horneada por cara y tiene que seguir viniendo del noroeste.
 *
 * La luz de cada cara es la de las estaciones (`stations-view.ts`): arriba
 * entera, oeste y norte al 95 %, este y sur al 74 %. No lleva cara de abajo:
 * se apoya en la columna mas baja de su casilla (`objectBase`) y no se ve.
 */

/** Un voxel: [este, sur, arriba], en medios bloques. */
export type Voxel = readonly [number, number, number];

/** Geometria lista para subir a la GPU, en arrays planos. */
export interface RockMesh {
  readonly positions: Float32Array;
  readonly uvs: Float32Array;
  readonly colors: Float32Array;
  readonly indices: Uint32Array;
}

const LIGHT = { top: 1, lit: 0.95, shade: 0.74 };

/**
 * Las caras posibles de un voxel: hacia donde mira (en voxeles), su luz, y
 * sus cuatro esquinas en fracciones del voxel [x, y, z] (z es el sur, como en
 * three.js), de arriba a la izquierda a abajo a la izquierda vistas de frente.
 */
const FACES: readonly { d: Voxel; light: number; corners: readonly (readonly [number, number, number])[] }[] = [
  { d: [0, 0, 1], light: LIGHT.top, corners: [[0, 1, 0], [1, 1, 0], [1, 1, 1], [0, 1, 1]] },
  { d: [-1, 0, 0], light: LIGHT.lit, corners: [[0, 1, 0], [0, 1, 1], [0, 0, 1], [0, 0, 0]] },
  { d: [0, -1, 0], light: LIGHT.lit, corners: [[1, 1, 0], [0, 1, 0], [0, 0, 0], [1, 0, 0]] },
  { d: [1, 0, 0], light: LIGHT.shade, corners: [[1, 1, 1], [1, 1, 0], [1, 0, 0], [1, 0, 1]] },
  { d: [0, 1, 0], light: LIGHT.shade, corners: [[0, 1, 1], [1, 1, 1], [1, 0, 1], [0, 0, 1]] },
];

/** Gira los voxeles de una huella de 2 × 2 un cuarto de vuelta `turn` veces. */
export function turnVoxels(voxels: readonly Voxel[], turn: number): Voxel[] {
  return voxels.map(([e, s, z]) => {
    let x = e;
    let y = s;
    for (let k = 0; k < ((turn % 4) + 4) % 4; k++) [x, y] = [1 - y, x];
    return [x, y, z] as const;
  });
}

/**
 * La malla de una roca: su pie en el centro de la casilla (`0, 0, 0`), una
 * huella de 1 × 1. Cada cara lleva el cuarto de tesela que le toca por su
 * sitio en la roca, para que la piedra case de un voxel al siguiente.
 */
export function rockMesh(shape: readonly Voxel[], turn: number): RockMesh {
  const voxels = turnVoxels(shape, turn);
  const has = (x: number, y: number, z: number) => voxels.some(([a, b, c]) => a === x && b === y && c === z);
  const positions: number[] = [];
  const uvs: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const V = 0.5;
  for (const [e, s, z] of voxels) {
    for (const face of FACES) {
      if (has(e + face.d[0], s + face.d[1], z + face.d[2])) continue;
      const base = positions.length / 3;
      // El cuarto de tesela: a lo ancho, por su sitio en la huella; a lo alto,
      // la mitad de arriba para el voxel de arriba.
      const across = face.d[0] !== 0 ? s : e;
      const fx = (across % 2) * V;
      const fy = face.d[2] !== 0 ? (s % 2) * V : (1 - (z % 2)) * V;
      face.corners.forEach(([cx, cy, cz], i) => {
        positions.push((e + cx) * V - 0.5, (z + cy) * V, (s + cz) * V - 0.5);
        colors.push(face.light, face.light, face.light);
        // De arriba a la izquierda, en el sentido de las agujas del reloj.
        const u = fx + (i === 1 || i === 2 ? V : 0);
        const v = fy + (i >= 2 ? V : 0);
        uvs.push(u, 1 - v);
      });
      indices.push(base, base + 3, base + 1, base + 1, base + 3, base + 2);
    }
  }
  return {
    positions: new Float32Array(positions),
    uvs: new Float32Array(uvs),
    colors: new Float32Array(colors),
    indices: new Uint32Array(indices),
  };
}
