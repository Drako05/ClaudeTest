/**
 * Efectos visuales: el slash de la accion y los escombros de lo derribado.
 *
 * Puro y sin DOM ni three.js, como `terrain-mesh.ts` y `biome-edges.ts`: aqui
 * vive el movimiento —donde esta cada cosa y cuanto le queda de vida— y
 * `effects-view.ts` solo lo dibuja. Asi la fisica de las particulas se comprueba en
 * Node, que es donde se pueden medir numeros.
 *
 * Nada de esto existe para la simulacion. Es adorno del cliente y el nucleo no
 * se entera, igual que no se entera del registro de eventos.
 */

import { mulberry32 } from '@verdant/sim';

/** Cuanto dura el barrido del slash, en segundos. */
export const SLASH_SECONDS = 0.22;
/** Cuanto tarda un escombro en apagarse una vez posado. */
export const DEBRIS_SECONDS = 0.85;
/** Escombros por objeto derribado. */
export const DEBRIS_PER_BURST = 10;
/**
 * Tope de escombros vivos.
 *
 * Manteniendo pulsado se acciona cuatro veces por segundo, y las herramientas de
 * desarrollo llegan a 64x. Sin tope, un rato de tala a toda velocidad llenaria
 * la escena de cuadrados.
 */
export const MAX_PARTICLES = 240;

/**
 * Gravedad en NIVELES por segundo al cuadrado.
 *
 * La altura de un escombro se mide con la misma vara que el relieve del mundo,
 * porque comparten eje: si se midiera en casillas, los escombros de una meseta
 * caerian por debajo de ella hasta el nivel del mar.
 */
const GRAVITY = 36;
/** Impulso vertical de salida, en niveles por segundo. */
const RISE = 3;
/** Dispersion horizontal, en casillas por segundo. */
const SPREAD = 1.9;

export interface Particle {
  /** Posicion en el mundo, en casillas. */
  x: number;
  y: number;
  /** Altura en el mundo, en niveles. */
  z: number;
  /** Altura del suelo bajo el escombro: donde se posa y se queda. */
  floor: number;
  vx: number;
  vy: number;
  vz: number;
  /** Lado del cuadrado, en pixeles de pantalla. */
  size: number;
  color: number;
  /** Segundos que lleva vivo y los que dura en total. */
  age: number;
  ttl: number;
  /** True hasta el primer `advance`; ver la regla del fotograma alli. */
  fresh: boolean;
}

export interface Slash {
  /**
   * Las casillas del ANILLO que barre el arco, en el orden que las da
   * `actionArea`. La que se pisa no entra: se recolecta, pero no se barre.
   */
  tiles: ReadonlyArray<{ x: number; y: number }>;
  age: number;
  ttl: number;
  /** True hasta el primer `advance`; ver la regla del fotograma alli. */
  fresh: boolean;
}

export class Effects {
  private readonly live: Particle[] = [];
  private readonly slashList: Slash[] = [];
  /** Cada estallido avanza la semilla, para que dos seguidos no sean iguales. */
  private seed: number;

  constructor(seed = 0x9e3779b9) {
    this.seed = seed >>> 0;
  }

  get particles(): readonly Particle[] {
    return this.live;
  }

  get slashes(): readonly Slash[] {
    return this.slashList;
  }

  get count(): number {
    return this.live.length + this.slashList.length;
  }

  /** Recuentos por separado. Solo para verificacion. */
  get tally(): { particles: number; slashes: number } {
    return { particles: this.live.length, slashes: this.slashList.length };
  }

  /** Un barrido sobre las casillas del anillo que se alcanzan. */
  spawnSlash(tiles: ReadonlyArray<{ x: number; y: number }>): void {
    this.slashList.push({
      tiles: tiles.map((t) => ({ x: t.x, y: t.y })),
      age: 0,
      ttl: SLASH_SECONDS,
      fresh: true,
    });
  }

  /**
   * El estallido de un objeto derribado: cuadrados de distintos tamanos con los
   * colores del propio objeto, que se dispersan y caen al suelo.
   *
   * Sin colores no hay estallido: mejor no dibujar nada que inventarse una
   * paleta que no es la del objeto.
   */
  spawnDebris(
    tileX: number,
    tileY: number,
    colors: readonly number[],
    floor = 0,
  ): void {
    if (colors.length === 0) return;

    const random = mulberry32(this.seed);
    this.seed = (this.seed + 0x6d2b79f5) >>> 0;

    for (let i = 0; i < DEBRIS_PER_BURST; i++) {
      if (this.live.length >= MAX_PARTICLES) {
        // Se sacrifica el mas viejo: lo que acaba de pasar interesa mas.
        this.live.shift();
      }
      const angle = random() * Math.PI * 2;
      const speed = SPREAD * (0.35 + random() * 0.65);
      this.live.push({
        // Reparto dentro de la casilla, no todos desde el centro exacto.
        x: tileX + 0.25 + random() * 0.5,
        y: tileY + 0.25 + random() * 0.5,
        z: floor + 0.5 + random() * 1.2,
        floor,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        vz: RISE * (0.6 + random() * 0.8),
        // Pequenos pero visibles: por debajo de esto se pierden sobre la hierba.
        size: 2.4 + random() * 4.6,
        color: colors[Math.floor(random() * colors.length) % colors.length],
        age: 0,
        ttl: DEBRIS_SECONDS * (0.7 + random() * 0.6),
        fresh: true,
      });
    }
  }

  /**
   * Adelanta los efectos.
   *
   * Las particulas caen y se POSAN: al tocar el suelo se quedan quietas y se
   * apagan ahi, sin rebotar. Es el «cayendo al suelo» del enunciado, y es la
   * razon de que la altura sea una magnitud propia y no una posicion de pantalla
   * ya proyectada.
   *
   * **Un efecto recien nacido sobrevive a este primer paso, dure lo que dure el
   * fotograma.** Sin esa garantia, un efecto mas corto que un fotograma nace y
   * muere sin llegar a dibujarse nunca: el bucle corre todos los ticks de golpe
   * —y es dentro de ellos donde se lanza el slash—, luego envejece los efectos
   * **una sola vez** con el frame entero, y solo despues dibuja. Con
   * `SLASH_SECONDS = 0.22` eso quiere decir que por debajo de 4,5 FPS el slash
   * **no se ve jamas**. No es una carrera ni mala suerte: es un corte exacto, y
   * el runner de CI vive justo encima de el (4-4,9 FPS renderizando por
   * software), asi que la prueba de humo pasaba o fallaba segun el humor de la
   * maquina. `tests/effects.test.ts` fija las dos mitades del corte.
   *
   * Alargar el slash habria tapado el fallo tocando un numero de sensacion, que
   * es del autor. Esto no toca ninguno: el efecto dura lo mismo y solo se le
   * garantiza el fotograma en el que se le ve.
   */
  advance(dt: number): void {
    if (dt <= 0) return;

    for (let i = this.live.length - 1; i >= 0; i--) {
      const p = this.live[i];
      if (p.fresh) {
        p.fresh = false;
        continue;
      }
      p.age += dt;
      if (p.age >= p.ttl) {
        this.live.splice(i, 1);
        continue;
      }

      if (p.z > p.floor) {
        p.vz -= GRAVITY * dt;
        p.z += p.vz * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.z <= p.floor) {
          // Posado: ni atraviesa el suelo ni rebota.
          p.z = p.floor;
          p.vx = 0;
          p.vy = 0;
          p.vz = 0;
        }
      }
    }

    for (let i = this.slashList.length - 1; i >= 0; i--) {
      const s = this.slashList[i];
      if (s.fresh) {
        s.fresh = false;
        continue;
      }
      s.age += dt;
      if (s.age >= s.ttl) this.slashList.splice(i, 1);
    }
  }

  clear(): void {
    this.live.length = 0;
    this.slashList.length = 0;
  }
}

/** Cuanto ha avanzado un efecto, de 0 a 1. */
export function progressOf(effect: { age: number; ttl: number }): number {
  return Math.min(1, Math.max(0, effect.age / effect.ttl));
}
