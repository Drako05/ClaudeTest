/**
 * La sombra de un elemento, recortada por casillas y pegada al suelo de cada una.
 *
 * Antes la sombra era un cuadrado plano a la altura del PIE, y un arbol al borde
 * de un desnivel dejaba media sombra flotando en el aire, sobre el hueco. Lo que
 * pidio el autor es que caiga sobre **la siguiente superficie valida, por abajo
 * que este**: asi que el cuadrado se parte por las celdas que pisa y cada trozo
 * se apoya en la superficie de la suya.
 *
 * Las celdas son las columnas de 0,5 del terreno de voxeles (`cell`), y cada
 * una es plana, asi que **un cuadrilatero por trozo es exacto**: no hace falta
 * subdividir.
 *
 * **Puro**: sin three.js ni DOM, para poder afirmarlo en Node.
 */

/** Altura de la superficie de la celda (`cx`, `cy`), en coordenadas de celda. */
export type Surface = (cx: number, cy: number) => number;

export interface PatchBuffers {
  positions: number[];
  uvs: number[];
  indices: number[];
}

/**
 * Los trozos de UNA sombra cuadrada de lado `side` centrada en `(cx, cz)`,
 * anadidos a `out`. `lift` la separa del suelo lo justo para no pelear en
 * profundidad con el terreno.
 *
 * Las UV van de 0 a 1 sobre el cuadrado ENTERO, no sobre cada trozo: asi la
 * mancha se lee continua aunque este partida en escalones.
 */
export function addShadowPatches(
  cx: number,
  cz: number,
  side: number,
  surface: Surface,
  lift: number,
  out: PatchBuffers,
  cell = 1,
): void {
  const x0 = cx - side / 2;
  const x1 = cx + side / 2;
  const z0 = cz - side / 2;
  const z1 = cz + side / 2;
  for (let tz = Math.floor(z0 / cell); tz * cell < z1; tz++) {
    const rz0 = Math.max(z0, tz * cell);
    const rz1 = Math.min(z1, (tz + 1) * cell);
    if (rz1 - rz0 < 1e-9) continue;
    for (let tx = Math.floor(x0 / cell); tx * cell < x1; tx++) {
      const rx0 = Math.max(x0, tx * cell);
      const rx1 = Math.min(x1, (tx + 1) * cell);
      if (rx1 - rx0 < 1e-9) continue;
      const base = out.positions.length / 3;
      const y = surface(tx, tz) + lift;
      // Mismo orden que la tapa del terreno: antihorario visto desde arriba.
      for (const [x, z] of [[rx0, rz0], [rx0, rz1], [rx1, rz1], [rx1, rz0]]) {
        out.positions.push(x, y, z);
        out.uvs.push((x - x0) / side, (z - z0) / side);
      }
      out.indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
  }
}
