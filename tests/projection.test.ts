import { afterEach, describe, expect, it } from 'vitest';
import {
  currentView,
  depthOf,
  depthRowOf,
  screenToWorld,
  setView,
  TILE_H,
  TILE_W,
  toViewSpace,
  toWorldSpace,
  VIEW_COUNT,
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

/**
 * Las cuatro vistas.
 *
 * La camara gira en cuartos de vuelta porque con una sola vista la cara oculta de
 * una montana es inexplorable: lo que hay al otro lado lo tapa la montana misma.
 * Todo lo demas del dibujo se apoya en que estas tres funciones sigan siendo
 * coherentes entre si en las cuatro, asi que es lo primero que hay que defender.
 */
describe('Girar la camara', () => {
  afterEach(() => setView(0));

  it('cuatro cuartos de vuelta vuelven al punto de partida', () => {
    for (let i = 0; i < VIEW_COUNT; i++) {
      expect(currentView()).toBe(i);
      setView(currentView() + 1);
    }
    expect(currentView()).toBe(0);
  });

  it('girar hacia atras tambien da la vuelta entera', () => {
    setView(-1);
    expect(currentView()).toBe(VIEW_COUNT - 1);
  });

  it('en las cuatro vistas, pantalla y mundo siguen siendo inversas', () => {
    for (let v = 0; v < VIEW_COUNT; v++) {
      setView(v);
      for (const [wx, wy] of [[0, 0], [3, -7], [-12.5, 4.25], [100, 100]] as const) {
        const s = worldToScreen(wx, wy);
        const back = screenToWorld(s.x, s.y);
        expect(back.x, `vista ${v}`).toBeCloseTo(wx, 10);
        expect(back.y, `vista ${v}`).toBeCloseTo(wy, 10);
      }
    }
  });

  it('cada vista mira desde una esquina distinta', () => {
    // El mismo tile tiene que caer en un sitio distinto de la pantalla en cada
    // vista; si dos coincidieran, girar no serviria para ver nada nuevo.
    const seen = new Set<string>();
    for (let v = 0; v < VIEW_COUNT; v++) {
      setView(v);
      const s = worldToScreen(5, 2);
      seen.add(`${s.x},${s.y}`);
    }
    expect(seen.size).toBe(VIEW_COUNT);
  });

  it('lo que esta mas cerca de la camara tiene mas profundidad, en las cuatro', () => {
    // Es la regla de la que vive el orden de dibujado entero: mayor profundidad
    // se dibuja despues. Lo que cambia con la vista es QUE direccion se acerca.
    for (let v = 0; v < VIEW_COUNT; v++) {
      setView(v);
      const here = worldToScreen(0, 0);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const there = worldToScreen(dx, dy);
        const closer = there.y > here.y;
        expect(depthOf(dx, dy) > depthOf(0, 0), `vista ${v}, direccion ${dx},${dy}`).toBe(closer);
      }
    }
  });

  it('la fila de una entidad no cambia mientras no cambie de casilla', () => {
    // El fallo que esto cierra: se usaba la posicion CONTINUA redondeada, asi que
    // en (10.5, 10.5) el personaje caia una fila por delante de su propia casilla
    // y se dibujaba encima del arbol y del bloque que tenia justo delante. Y como
    // dependia de los decimales, aparecia y desaparecia al caminar.
    for (let v = 0; v < VIEW_COUNT; v++) {
      setView(v);
      const expected = depthOf(10, 10);
      for (const f of [0.01, 0.25, 0.5, 0.75, 0.99]) {
        expect(depthRowOf(10 + f, 10 + f), `vista ${v}, desplazamiento ${f}`).toBe(expected);
      }
    }
  });

  it('una direccion de vista se convierte a mundo y vuelve', () => {
    for (let v = 0; v < VIEW_COUNT; v++) {
      setView(v);
      for (const [x, y] of [[1, 0], [0, -1], [0.7, -0.7]] as const) {
        const w = toWorldSpace(x, y);
        const back = toViewSpace(w.x, w.y);
        expect(back.x, `vista ${v}`).toBeCloseTo(x, 10);
        expect(back.y, `vista ${v}`).toBeCloseTo(y, 10);
      }
    }
  });
});
