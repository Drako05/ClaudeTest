import { describe, expect, it } from 'vitest';
import {
  cameraAngle,
  sectorOf,
  View,
  VIEW_HYSTERESIS_DEG,
  viewOfSector,
} from '../packages/client/src/fauna-facing.js';
import { nearestOnBox, rayAabb, rayBodyBox, type BodyBox } from '../packages/client/src/body-ray.js';

/** El dibujo de un animal que mira a +x con la camara en el angulo `deg`. */
function viewAt(deg: number, previous: number | null = null) {
  const a = (deg * Math.PI) / 180;
  const sector = sectorOf(cameraAngle(1, 0, Math.cos(a), Math.sin(a)), previous);
  return { sector, ...viewOfSector(sector) };
}

describe('el dibujo de un animal segun desde donde se le mira', () => {
  it('ocho direcciones: cinco dibujos, tres de ellos en los dos espejos', () => {
    expect(viewAt(0)).toMatchObject({ view: View.Front, mirror: false });
    expect(viewAt(45)).toMatchObject({ view: View.FrontQuarter, mirror: false });
    expect(viewAt(-45)).toMatchObject({ view: View.FrontQuarter, mirror: true });
    expect(viewAt(90)).toMatchObject({ view: View.Side, mirror: false });
    expect(viewAt(-90)).toMatchObject({ view: View.Side, mirror: true });
    expect(viewAt(135)).toMatchObject({ view: View.BackQuarter, mirror: false });
    expect(viewAt(-135)).toMatchObject({ view: View.BackQuarter, mirror: true });
    expect(viewAt(180)).toMatchObject({ view: View.Back, mirror: false });
    expect(viewAt(-179)).toMatchObject({ view: View.Back, mirror: false });
    const seen = new Set<number>();
    for (let d = -180; d < 180; d += 5) seen.add(viewAt(d).sector);
    expect(seen.size).toBe(8);
  });

  it('de perfil, la cabeza va hacia el lado de la pantalla al que anda', () => {
    // Un animal que anda hacia +x visto desde +y (la camara al sur, mirando
    // al norte): en three.js, +x es la derecha de esa camara.
    expect(viewOfSector(sectorOf(cameraAngle(1, 0, 0, 1), null))).toEqual({ view: View.Side, mirror: false });
    expect(viewOfSector(sectorOf(cameraAngle(-1, 0, 0, 1), null))).toEqual({ view: View.Side, mirror: true });
  });

  it('con histeresis: no cambia a 1° del borde y si pasado el margen', () => {
    const edge = 22.5;
    expect(viewAt(edge + 1, 0).sector).toBe(0);
    expect(viewAt(edge + VIEW_HYSTERESIS_DEG - 0.5, 0).sector).toBe(0);
    expect(viewAt(edge + VIEW_HYSTERESIS_DEG + 1, 0).sector).toBe(1);
    // Y de vuelta igual: desde el sector 1 hace falta pasar el borde por el otro lado.
    expect(viewAt(edge - 1, 1).sector).toBe(1);
    expect(viewAt(edge - VIEW_HYSTERESIS_DEG - 1, 1).sector).toBe(0);
    // Por la espalda, donde el angulo da la vuelta.
    expect(viewAt(-178, 4).sector).toBe(4);
    expect(viewAt(178, 4).sector).toBe(4);
  });

  it('un animal parado no cambia de dibujo si la camara no se mueve', () => {
    let previous: number | null = null;
    for (let i = 0; i < 10; i++) previous = viewAt(67, previous).sector;
    expect(previous).toBe(viewAt(67).sector);
  });
});

describe('la caja del cuerpo', () => {
  const box: BodyBox = {
    center: [0, 0.5, 0],
    facingX: 1,
    facingZ: 0,
    halfLength: 1,
    halfHeight: 0.5,
    halfWidth: 0.25,
  };

  it('el rayo entra por la cara de su lado, girada con el rumbo', () => {
    // De frente por el costado (+z): entra a medio ancho.
    expect(rayBodyBox([0, 0.5, 5], [0, 0, -1], box)).toBeCloseTo(4.75);
    // A lo largo: entra a medio largo.
    expect(rayBodyBox([5, 0.5, 0], [-1, 0, 0], box)).toBeCloseTo(4);
    // Girada 90°, lo largo pasa al costado.
    const turned = { ...box, facingX: 0, facingZ: 1 };
    expect(rayBodyBox([0, 0.5, 5], [0, 0, -1], turned)).toBeCloseTo(4);
    expect(rayBodyBox([5, 0.5, 0], [-1, 0, 0], turned)).toBeCloseTo(4.75);
  });

  it('un rayo que no la toca no da nada, y su punto mas cercano es del cuerpo', () => {
    const o: [number, number, number] = [0, 3, 5];
    const d: [number, number, number] = [0, 0, -1];
    expect(rayBodyBox(o, d, box)).toBeNull();
    const q = nearestOnBox(o, d, box);
    expect(q[1]).toBeCloseTo(1);
    expect(Math.abs(q[2])).toBeLessThanOrEqual(0.25 + 1e-9);
  });

  it('las cajas del terreno', () => {
    expect(rayAabb([0.5, 5, 0.5], [0, -1, 0], [0, 0, 0], [1, 1, 1])).toBeCloseTo(4);
    expect(rayAabb([2, 5, 0.5], [0, -1, 0], [0, 0, 0], [1, 1, 1])).toBeNull();
  });
});
