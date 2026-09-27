/**
 * La sombra de un elemento, recortada por casillas y pegada al suelo de cada una.
 *
 * Antes la sombra era un cuadrado plano a la altura del PIE, y un arbol al borde
 * de un desnivel dejaba media sombra flotando en el aire, sobre el hueco. Lo que
 * pidio el autor es que caiga sobre **la siguiente superficie valida, por abajo
 * que este**: asi que el cuadrado se parte por las casillas que pisa y cada trozo
 * se apoya en la superficie de la suya.
 *
 * Dentro de una casilla el suelo es lineal —plano, o un talud que sube de un
 * borde al otro (`groundHeight`)—, asi que **un cuadrilatero por trozo es
 * exacto**: no hace falta subdividir. Y una sombra que cabe entera en su casilla
 * sigue costando un solo cuadrilatero, como antes.
 *
 * **Puro**: sin three.js ni DOM, para poder afirmarlo en Node.
 */

/** Altura de la superficie en un punto `(fx, fy)` ∈ [0, 1] de la casilla. */
export type Surface = (tx: number, ty: number, fx: number, fy: number) => number;

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
): void {
  const x0 = cx - side / 2;
  const x1 = cx + side / 2;
  const z0 = cz - side / 2;
  const z1 = cz + side / 2;
  for (let tz = Math.floor(z0); tz < z1; tz++) {
    const rz0 = Math.max(z0, tz);
    const rz1 = Math.min(z1, tz + 1);
    if (rz1 - rz0 < 1e-9) continue;
    for (let tx = Math.floor(x0); tx < x1; tx++) {
      const rx0 = Math.max(x0, tx);
      const rx1 = Math.min(x1, tx + 1);
      if (rx1 - rx0 < 1e-9) continue;
      const base = out.positions.length / 3;
      // Mismo orden que la tapa del terreno: antihorario visto desde arriba.
      for (const [x, z] of [[rx0, rz0], [rx0, rz1], [rx1, rz1], [rx1, rz0]]) {
        out.positions.push(x, surface(tx, tz, x - tx, z - tz) + lift, z);
        out.uvs.push((x - x0) / side, (z - z0) / side);
      }
      out.indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
  }
}
