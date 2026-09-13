import { describe, expect, it } from 'vitest';
import { BufferGeometry, Vector3 } from 'three';
import { ribbon } from '../packages/client/src/spike3d/effects-view.js';

/**
 * La cinta del barrido en 3D.
 *
 * Lo que se afirma aqui es **una sola propiedad**, y es la que el isometrico
 * tenia gratis: el trazo mide lo mismo se mire desde donde se mire. Alli la
 * camara no se mueve y 3 px son 3 px; aqui la elevacion la lleva el jugador y
 * baja hasta 0.08 rad, asi que una cinta tumbada en el plano del suelo se ve de
 * canto y desaparece.
 *
 * Va en un test de Node y no en la medida del navegador porque es un NUMERO, que
 * es el reparto de siempre en este proyecto: el navegador verifica integracion
 * —`tools/spike-slash.mjs` cuenta pixeles de verdad en pantalla— y los tests
 * unitarios verifican cuentas.
 */

const HALF = 0.06;

/** Los tres centros de casilla de un area de accion, en llano. */
const PATH = [
  { x: 10, y: 1, z: 10 },
  { x: 11, y: 1, z: 10 },
  { x: 11, y: 1, z: 11 },
];

/** Una camara mirando al centro del trazo desde esa elevacion. */
function eyeAt(pitch: number, yaw = 0.7): Vector3 {
  const cos = Math.cos(pitch);
  return new Vector3(
    11 + Math.sin(yaw) * cos * 30,
    1 + Math.sin(pitch) * 30,
    10 + Math.cos(yaw) * cos * 30,
  );
}

/** Los dos bordes de la cinta en cada punto, tal y como quedan en el buffer. */
function edges(eye: Vector3): Array<{ upper: Vector3; lower: Vector3; centre: Vector3 }> {
  const geometry = new BufferGeometry();
  ribbon(geometry, PATH, eye, HALF);
  const p = geometry.getAttribute('position');
  const out = [];
  for (let i = 0; i < PATH.length; i++) {
    const upper = new Vector3(p.getX(i * 2), p.getY(i * 2), p.getZ(i * 2));
    const lower = new Vector3(p.getX(i * 2 + 1), p.getY(i * 2 + 1), p.getZ(i * 2 + 1));
    out.push({ upper, lower, centre: new Vector3(PATH[i].x, PATH[i].y, PATH[i].z) });
  }
  return out;
}

describe('la cinta del barrido', () => {
  it('mantiene el mismo ancho aparente mire la camara desde donde mire', () => {
    // De rozar el horizonte a mirar desde el cenit —todo el recorrido que
    // `OrbitCamera` permite— y dando la vuelta entera en rumbo, porque el ancho
    // de una cinta depende de LAS DOS cosas y no solo de la elevacion.
    for (const pitch of [0.08, 0.3, 0.62, 1.0, 1.45]) {
      for (let yaw = 0; yaw < Math.PI * 2; yaw += Math.PI / 6) {
        const eye = eyeAt(pitch, yaw);
        for (const { upper, lower, centre } of edges(eye)) {
          const width = upper.clone().sub(lower);
          const toEye = eye.clone().sub(centre).normalize();
          // Lo que se ve del ancho es su parte perpendicular a la linea de vision.
          const apparent = width.clone().sub(toEye.clone().multiplyScalar(width.dot(toEye)));
          expect(apparent.length()).toBeCloseTo(HALF * 2, 5);
        }
      }
    }
  });

  it('reparte el ancho a los dos lados del centro de la casilla', () => {
    // Nada de esto puede correr el trazo de sitio: el barrido marca las casillas
    // que la accion afecta, y marcar la de al lado seria mentir.
    for (const { upper, lower, centre } of edges(eyeAt(0.62))) {
      expect(upper.clone().add(lower).multiplyScalar(0.5).distanceTo(centre)).toBeCloseTo(0, 6);
    }
  });

  it('no deja de tener ancho cuando el trazo apunta a la camara', () => {
    // Caso degenerado: avance y vision paralelos anulan el producto vectorial.
    // Sin la salida de emergencia la cinta saldria de ancho cero o con NaN.
    const along = [
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 0, z: 0 },
      { x: 2, y: 0, z: 0 },
    ];
    const geometry = new BufferGeometry();
    ribbon(geometry, along, new Vector3(50, 0, 0), HALF);
    const p = geometry.getAttribute('position');
    for (let i = 0; i < along.length; i++) {
      const upper = new Vector3(p.getX(i * 2), p.getY(i * 2), p.getZ(i * 2));
      const lower = new Vector3(p.getX(i * 2 + 1), p.getY(i * 2 + 1), p.getZ(i * 2 + 1));
      expect(Number.isFinite(upper.x)).toBe(true);
      expect(upper.distanceTo(lower)).toBeCloseTo(HALF * 2, 6);
    }
  });

  it('documenta por que no vale tumbarla en el plano del suelo', () => {
    // No es una regresion: es la aritmetica que obligo al cambio, escrita para
    // que no haya que volver a descubrirla.
    //
    // Y corrige de paso lo que yo habia razonado mal. Una cinta horizontal NO se
    // aplasta siempre que se baje la camara: se aplasta cuando su ancho cae a lo
    // largo del rumbo desde el que se mira, y entonces se multiplica por el seno
    // de la elevacion. Mirada desde el rumbo perpendicular conserva el ancho
    // entero. O sea que el defecto **depende de hacia donde mires**, que es
    // exactamente por que la medida del navegador se queda con el PEOR de cuatro
    // rumbos en vez de con uno.
    const pitch = 0.08;
    const centre = new Vector3(PATH[1].x, PATH[1].y, PATH[1].z);
    // El ancho que daba la version vieja: perpendicular en XZ al avance.
    const flat = new Vector3(-(PATH[2].z - PATH[0].z), 0, PATH[2].x - PATH[0].x)
      .normalize()
      .multiplyScalar(HALF * 2);

    const ratios: number[] = [];
    for (let yaw = 0; yaw < Math.PI * 2; yaw += Math.PI / 24) {
      const toEye = eyeAt(pitch, yaw).sub(centre).normalize();
      const apparent = flat.clone().sub(toEye.clone().multiplyScalar(flat.dot(toEye)));
      ratios.push(apparent.length() / (HALF * 2));
    }

    // Hay rumbos desde los que se ve entera...
    expect(Math.max(...ratios)).toBeGreaterThan(0.98);
    // ...y rumbos desde los que practicamente no queda nada, que es el sintoma.
    // Medido en el navegador a esa elevacion: 13 pixeles aclarados contra 104.
    expect(Math.min(...ratios)).toBeLessThan(0.15);
  });
});
