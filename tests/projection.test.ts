import { describe, expect, it } from 'vitest';
import {
  depthOf,
  screenToWorld,
  TILE_H,
  TILE_W,
  worldToScreen,
} from '../packages/client/src/projection.js';

/**
 * La proyeccion es matematica pura y sin DOM, asi que se verifica en Node. Un
 * error aqui se manifestaria como un mundo torcido o como toques que apuntan al
 * tile equivocado, sintomas dificiles de diagnosticar mirando la pantalla.
 */
describe('proyeccion isometrica', () => {
  it('la inversa recupera las coordenadas originales', () => {
    for (let wx = -40; wx <= 40; wx += 3.5) {
      for (let wy = -40; wy <= 40; wy += 3.5) {
        const screen = worldToScreen(wx, wy);
        const back = screenToWorld(screen.x, screen.y);
        expect(back.x).toBeCloseTo(wx, 9);
        expect(back.y).toBeCloseTo(wy, 9);
      }
    }
  });

  it('el origen del mundo cae en el origen de pantalla', () => {
    expect(worldToScreen(0, 0)).toEqual({ x: 0, y: 0 });
  });

  it('avanzar en X va hacia la derecha y abajo; en Y, hacia la izquierda y abajo', () => {
    const east = worldToScreen(1, 0);
    expect(east.x).toBeCloseTo(TILE_W / 2, 9);
    expect(east.y).toBeCloseTo(TILE_H / 2, 9);

    const south = worldToScreen(0, 1);
    expect(south.x).toBeCloseTo(-TILE_W / 2, 9);
    expect(south.y).toBeCloseTo(TILE_H / 2, 9);
  });

  it('la diagonal del mundo produce una fila horizontal en pantalla', () => {
    // (1,1) y (2,2) estan en la misma columna de pantalla: es la firma de la
    // proyeccion isometrica y lo que hace que el mundo se vea girado 45 grados.
    expect(worldToScreen(1, 1).x).toBeCloseTo(0, 9);
    expect(worldToScreen(2, 2).x).toBeCloseTo(0, 9);
  });

  it('la profundidad ordena el dibujado como exige la vista', () => {
    const player = depthOf(10, 10);
    // Al sur o al este del jugador: se dibuja despues, lo tapa.
    expect(depthOf(11, 10)).toBeGreaterThan(player);
    expect(depthOf(10, 11)).toBeGreaterThan(player);
    // Al norte o al oeste: se dibuja antes, queda detras.
    expect(depthOf(9, 10)).toBeLessThan(player);
    expect(depthOf(10, 9)).toBeLessThan(player);
  });

  it('la profundidad es coherente con el eje vertical de pantalla', () => {
    // Mayor profundidad implica estar mas abajo en pantalla, que es lo que hace
    // que ordenar por profundidad coincida con lo que el ojo espera.
    const near = worldToScreen(4, 4);
    const far = worldToScreen(2, 2);
    expect(depthOf(4, 4)).toBeGreaterThan(depthOf(2, 2));
    expect(near.y).toBeGreaterThan(far.y);
  });
});
