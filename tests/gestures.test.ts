import { describe, expect, it } from 'vitest';
import {
  Gestures,
  PINCH_THRESHOLD,
  STICK_DEAD,
  STICK_RADIUS,
  TAP_SLOP,
} from '../packages/client/src/gestures.js';

/**
 * De quien es cada dedo.
 *
 * Nace de un fallo que reporto el autor jugando en el movil: mover la camara y
 * el personaje a la vez cambiaba el zoom. La causa era que la pinza se calculaba
 * sobre TODOS los dedos del lienzo, asi que un dedo en el joystick mas otro en
 * la camara se leian como una pinza.
 *
 * Es una regla sobre quien manda sobre que dedo, y eso o se afirma en un test o
 * no se afirma: en el navegador solo se nota jugando con dos pulgares, que es
 * justo lo que ninguna prueba automatica hace.
 */

const W = 390;
const H = 844;

/** Un punto del cuadrante inferior izquierdo, que es la zona del joystick. */
const STICK_SPOT = { x: 80, y: 700 };
/** Un punto de la zona de camara: derecha. */
const LOOK_SPOT = { x: 300, y: 500 };
/** Otro de camara: arriba a la izquierda, que NO es zona de joystick. */
const LOOK_UPPER_LEFT = { x: 80, y: 200 };

function fresh(): Gestures {
  return new Gestures(W, H);
}

describe('Cada dedo elige dueno al nacer', () => {
  it('el cuadrante inferior izquierdo es del joystick', () => {
    const g = fresh();
    expect(g.roleFor(STICK_SPOT.x, STICK_SPOT.y, true)).toBe('stick');
  });

  it('el resto de la pantalla es de la camara, incluida la izquierda de arriba', () => {
    const g = fresh();
    // Reservar la mitad izquierda entera —lo que hacia antes— dejaba sin sitio
    // para girar la camara hacia ese lado.
    expect(g.roleFor(LOOK_UPPER_LEFT.x, LOOK_UPPER_LEFT.y, true)).toBe('look');
    expect(g.roleFor(LOOK_SPOT.x, LOOK_SPOT.y, true)).toBe('look');
  });

  it('con raton todo es camara: para andar ya esta el teclado', () => {
    const g = fresh();
    expect(g.roleFor(STICK_SPOT.x, STICK_SPOT.y, false)).toBe('look');
  });

  it('solo un dedo lleva el joystick; el segundo de la zona mira', () => {
    const g = fresh();
    g.down(1, STICK_SPOT.x, STICK_SPOT.y, true);
    expect(g.roleFor(STICK_SPOT.x + 10, STICK_SPOT.y + 10, true)).toBe('look');
  });

  it('un dedo no cambia de dueno aunque se salga de su zona', () => {
    const g = fresh();
    g.down(1, STICK_SPOT.x, STICK_SPOT.y, true);
    // Se arrastra hasta la zona de camara: sigue siendo joystick.
    g.move(1, LOOK_SPOT.x, LOOK_SPOT.y);
    expect(g.takeOrbit()).toEqual({ dx: 0, dy: 0 });
    const stick = g.stick();
    expect(Math.hypot(stick.x, stick.y)).toBeGreaterThan(0);
  });
});

describe('El joystick', () => {
  it('anda en la direccion en que se arrastra', () => {
    const g = fresh();
    g.down(1, STICK_SPOT.x, STICK_SPOT.y, true);
    g.move(1, STICK_SPOT.x + STICK_RADIUS, STICK_SPOT.y);
    expect(g.stick().x).toBeCloseTo(1, 6);
    expect(g.stick().y).toBeCloseTo(0, 6);
  });

  it('no pasa de uno por mucho que se estire', () => {
    const g = fresh();
    g.down(1, STICK_SPOT.x, STICK_SPOT.y, true);
    g.move(1, STICK_SPOT.x + STICK_RADIUS * 6, STICK_SPOT.y + STICK_RADIUS * 6);
    const s = g.stick();
    expect(Math.hypot(s.x, s.y)).toBeCloseTo(1, 6);
  });

  it('tiene zona muerta: apoyar el pulgar no echa a andar', () => {
    const g = fresh();
    g.down(1, STICK_SPOT.x, STICK_SPOT.y, true);
    g.move(1, STICK_SPOT.x + STICK_RADIUS * STICK_DEAD * 0.5, STICK_SPOT.y);
    expect(g.stick()).toEqual({ x: 0, y: 0 });
  });

  it('soltar lo deja a cero', () => {
    const g = fresh();
    g.down(1, STICK_SPOT.x, STICK_SPOT.y, true);
    g.move(1, STICK_SPOT.x + STICK_RADIUS, STICK_SPOT.y);
    g.up(1);
    expect(g.stick()).toEqual({ x: 0, y: 0 });
  });
});

describe('La camara', () => {
  it('un dedo fuera de la zona del joystick gira, y no mueve al personaje', () => {
    const g = fresh();
    g.down(1, LOOK_SPOT.x, LOOK_SPOT.y, true);
    g.move(1, LOOK_SPOT.x + 40, LOOK_SPOT.y - 12);
    expect(g.takeOrbit()).toEqual({ dx: 40, dy: -12 });
    expect(g.stick()).toEqual({ x: 0, y: 0 });
  });

  it('el giro se consume: pedirlo dos veces no lo cuenta dos veces', () => {
    const g = fresh();
    g.down(1, LOOK_SPOT.x, LOOK_SPOT.y, true);
    g.move(1, LOOK_SPOT.x + 30, LOOK_SPOT.y);
    expect(g.takeOrbit().dx).toBe(30);
    expect(g.takeOrbit().dx).toBe(0);
  });
});

describe('La pinza no se dispara sola', () => {
  it('andar y girar a la vez NO hace zoom', () => {
    // El fallo del autor, tal cual: un pulgar en el joystick y otro girando la
    // camara. Antes eran dos toques sobre el lienzo y se leian como pinza.
    const g = fresh();
    g.down(1, STICK_SPOT.x, STICK_SPOT.y, true);
    g.down(2, LOOK_SPOT.x, LOOK_SPOT.y, true);

    for (let i = 1; i <= 20; i++) {
      g.move(1, STICK_SPOT.x + i * 3, STICK_SPOT.y - i * 2);
      g.move(2, LOOK_SPOT.x - i * 4, LOOK_SPOT.y + i);
    }

    expect(g.takeZoom(), 'el zoom se movio sin que nadie lo pidiera').toBe(1);
    // Y las dos cosas que si se pidieron siguen funcionando.
    expect(Math.hypot(g.stick().x, g.stick().y)).toBeGreaterThan(0);
    expect(g.takeOrbit().dx).toBeLessThan(0);
  });

  it('dos dedos de camara si hacen zoom', () => {
    const g = fresh();
    g.down(1, 200, 400, true);
    g.down(2, 300, 400, true);
    // Un pellizco continuo, como el de un dedo de verdad. El primer paso fija la
    // referencia y el segundo cruza el umbral, asi que el zoom empieza al
    // tercero: separar los dedos acerca la camara.
    for (let i = 1; i <= 10; i++) g.move(2, 300 + i * PINCH_THRESHOLD * 2, 400);
    expect(g.takeZoom()).toBeLessThan(1);
  });

  it('mientras se pellizca, la camara no gira', () => {
    // Sin esto, pellizcar arrastra la vista al mismo tiempo y marea.
    const g = fresh();
    g.down(1, 200, 400, true);
    g.down(2, 300, 400, true);
    g.takeOrbit();
    g.move(1, 150, 420);
    g.move(2, 350, 380);
    expect(g.takeOrbit()).toEqual({ dx: 0, dy: 0 });
  });

  it('dos dedos quietos no mueven el zoom', () => {
    const g = fresh();
    g.down(1, 200, 400, true);
    g.down(2, 300, 400, true);
    // Un temblor de pocos pixeles, por debajo del umbral.
    for (let i = 0; i < 12; i++) {
      g.move(1, 200 + (i % 2), 400);
      g.move(2, 300 - (i % 2), 400);
    }
    expect(g.takeZoom()).toBe(1);
  });

  it('levantar un dedo de la pinza no da un salto de zoom', () => {
    const g = fresh();
    g.down(1, 200, 400, true);
    g.down(2, 400, 400, true);
    g.move(2, 300, 400);
    g.takeZoom();
    g.up(2);
    g.down(3, 380, 400, true);
    // El primer movimiento tras rehacer la pinza solo fija la referencia.
    g.move(3, 370, 400);
    expect(g.takeZoom()).toBe(1);
  });
});

/**
 * Clic contra arrastre.
 *
 * En el 3D la camara se gira arrastrando con el raton, y el autor quiso la
 * accion en el clic izquierdo: las dos cosas comparten boton, asi que hay que
 * distinguirlas. Se decide al SOLTAR, porque hasta entonces no se sabe cual de
 * las dos era.
 */
describe('Un clic no es un arrastre', () => {
  const fresh = () => new Gestures(800, 600);

  it('soltar sin haberse movido es un clic', () => {
    const g = fresh();
    g.down(1, 400, 300, false);
    const out = g.up(1);
    expect(out?.tap).toBe(true);
    expect(out?.isTouch).toBe(false);
  });

  it('un temblor de pocos pixeles sigue siendo un clic', () => {
    const g = fresh();
    g.down(1, 400, 300, false);
    g.move(1, 400 + TAP_SLOP - 1, 300);
    expect(g.up(1)?.tap).toBe(true);
  });

  it('pasado el umbral ya es arrastre, y gira la camara', () => {
    const g = fresh();
    g.down(1, 400, 300, false);
    g.move(1, 400 + TAP_SLOP + 40, 300);
    expect(g.up(1)?.tap).toBe(false);
    // Y lo que hizo fue girar: el arrastre acumulo giro.
    expect(g.takeOrbit().dx).not.toBe(0);
  });

  it('ir y volver al origen sigue siendo arrastre', () => {
    // Se mide el maximo alejamiento, no la distancia final: si no, arrastrar la
    // camara y devolverla contaria como clic y accionaria sin querer.
    const g = fresh();
    g.down(1, 400, 300, false);
    g.move(1, 500, 300);
    g.move(1, 400, 300);
    expect(g.up(1)?.tap).toBe(false);
  });

  it('un dedo dice que es un dedo, para que no accione como el raton', () => {
    const g = fresh();
    g.down(1, 700, 100, true);
    const out = g.up(1);
    expect(out?.isTouch).toBe(true);
    expect(out?.tap).toBe(true);
  });

  it('soltar un puntero que no existe no inventa nada', () => {
    expect(fresh().up(99)).toBeNull();
  });
});

/**
 * El dedo del boton de accion: apretar y, sin soltar, arrastrar ese mismo dedo
 * gira la camara (pedido del autor). Nace fuera del lienzo, con su propio dueno.
 */
describe('El dedo de la accion gira la camara', () => {
  const BUTTON = { x: 330, y: 760 };

  it('arrastrado, gira lo mismo que un dedo de camara', () => {
    const accion = fresh();
    accion.downAction('accion:0', BUTTON.x, BUTTON.y);
    accion.move('accion:0', BUTTON.x - 10, BUTTON.y);
    accion.takeOrbit(); // lo de antes del umbral no cuenta
    accion.move('accion:0', BUTTON.x - 70, BUTTON.y - 20);

    const camara = fresh();
    camara.down(1, LOOK_SPOT.x, LOOK_SPOT.y, true);
    camara.move(1, LOOK_SPOT.x - 60, LOOK_SPOT.y - 20);

    expect(accion.takeOrbit()).toEqual(camara.takeOrbit());
  });

  it('por debajo del umbral no gira: el pulgar que solo mantiene tiembla', () => {
    const g = fresh();
    g.downAction('accion:0', BUTTON.x, BUTTON.y);
    g.move('accion:0', BUTTON.x + TAP_SLOP - 1, BUTTON.y);
    expect(g.takeOrbit()).toEqual({ dx: 0, dy: 0 });
  });

  it('pasado el umbral gira desde donde esta, sin dar un salto', () => {
    const g = fresh();
    g.downAction('accion:0', BUTTON.x, BUTTON.y);
    g.move('accion:0', BUTTON.x + TAP_SLOP + 2, BUTTON.y);
    // Solo el trozo de este paso, no los TAP_SLOP + 2 desde el origen.
    expect(g.takeOrbit().dx).toBe(TAP_SLOP + 2);
    g.move('accion:0', BUTTON.x + TAP_SLOP + 12, BUTTON.y);
    expect(g.takeOrbit().dx).toBe(10);
  });

  it('con un dedo de camara a la vez NO hace pinza: el zoom no cambia', () => {
    // Si contara como dedo de camara, los dos se leerian como una pinza.
    const g = fresh();
    g.downAction('accion:0', BUTTON.x, BUTTON.y);
    g.down(1, LOOK_UPPER_LEFT.x, LOOK_UPPER_LEFT.y, true);
    // Uno en horizontal y otro en vertical: la distancia entre ellos cambia de
    // sobra para ser una pinza, y cada uno deja su giro en un eje.
    for (let i = 1; i <= 10; i++) {
      g.move('accion:0', BUTTON.x - i * 12, BUTTON.y);
      g.move(1, LOOK_UPPER_LEFT.x, LOOK_UPPER_LEFT.y + i * 12);
    }
    expect(g.takeZoom()).toBe(1);
    // Y los dos giran: el de la accion en x, el de camara en y.
    const orbit = g.takeOrbit();
    expect(orbit.dx).toBeLessThan(0);
    expect(orbit.dy).toBe(120);
  });

  it('no mueve al personaje ni se lleva el joystick', () => {
    const g = fresh();
    g.downAction('accion:0', BUTTON.x, BUTTON.y);
    g.down(2, STICK_SPOT.x, STICK_SPOT.y, true);
    g.move('accion:0', BUTTON.x - 80, BUTTON.y);
    expect(g.stickCenter()).toEqual(STICK_SPOT);
    expect(g.stick()).toEqual({ x: 0, y: 0 });
  });

  it('soltarlo dice que era el dedo de la accion, para que nadie accione otra vez', () => {
    const g = fresh();
    g.downAction('accion:0', BUTTON.x, BUTTON.y);
    expect(g.up('accion:0')?.role).toBe('actionLook');
  });
});
