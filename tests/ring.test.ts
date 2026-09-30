import { describe, expect, it } from 'vitest';
import { RING_LENGTH, ringDash } from '../packages/client/src/ring.js';

/**
 * El anillo se vacia en sentido horario (boceto del autor): lo gastado es el
 * hueco entre las 12 y donde empieza el color. En un circulo girado -90 grados
 * el trazo avanza en sentido horario desde las 12, asi que el color tiene que
 * empezar en `gastado` y acabar justo al completar la vuelta.
 */
describe('Los anillos de salud y hambre', () => {
  /** Donde empieza y acaba el color, en fraccion de vuelta desde las 12. */
  const span = (value: number) => {
    const { dasharray, dashoffset } = ringDash(value);
    const shown = Number(dasharray.split(' ')[0]);
    const start = -dashoffset / RING_LENGTH;
    return { start, end: start + shown / RING_LENGTH };
  };

  it('lleno, el color da la vuelta entera', () => {
    expect(span(100).start).toBeCloseTo(0);
    expect(span(100).end).toBeCloseTo(1);
  });

  it('gastado un cuarto, el hueco va de las 12 a las 3: sentido horario', () => {
    expect(span(75).start).toBeCloseTo(0.25);
    expect(span(75).end).toBeCloseTo(1);
  });

  it('vacio, no queda color, y los valores fuera de rango se recortan', () => {
    expect(Number(ringDash(0).dasharray.split(' ')[0])).toBe(0);
    expect(span(-20).start).toBeCloseTo(1);
    expect(span(140).start).toBeCloseTo(0);
  });
});
