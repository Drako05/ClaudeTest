/**
 * El paso del dia: que tinte lleva la pantalla a cada hora.
 *
 * Es el del isometrico tal cual, con sus mismos numeros: la noche entra en azul
 * frio y el amanecer y el ocaso pasan por un ambar calido, que es lo que hace
 * legible el paso del tiempo sin mirar el reloj. La luz la da `daylight` del
 * nucleo, asi que el reloj y el tinte no pueden separarse.
 *
 * **Se aplica como una vela sobre la pantalla, no bajando las luces.** Es lo
 * que hacia el isometrico, y en el 3D ademas es lo unico que funciona: las aspas
 * y el jugador usan `MeshBasicMaterial`, que no se ilumina (ver
 * `billboards.ts`), asi que al bajar el sol el terreno se oscureceria y los
 * arboles seguirian a pleno dia. Una vela los tine a todos por igual —terreno,
 * aspas, agua, cielo y barrido—, y cuesta nada.
 *
 * Puro y sin DOM, para comprobarlo en Node.
 */

import { daylight } from '@verdant/sim';

/** El azul de la noche y el ambar de las transiciones. */
export const NIGHT = 0x0a1a3c;
export const AMBER = 0x6b3a12;
/** Opacidad de la vela en plena noche. */
export const NIGHT_ALPHA = 0.52;

export interface SkyTint {
  /** Color de la vela, `0xRRGGBB`. */
  readonly color: number;
  /** Cuanto tapa, de 0 (pleno dia) a `NIGHT_ALPHA`. */
  readonly alpha: number;
}

export function skyTint(tick: number): SkyTint {
  const light = daylight(tick);
  if (light >= 0.999) return { color: NIGHT, alpha: 0 };
  // Cerca de las transiciones el tinte vira a ambar; en plena noche, a azul.
  const warmth = 1 - Math.abs(light - 0.5) * 2;
  return { color: mixColor(NIGHT, AMBER, warmth * 0.55), alpha: (1 - light) * NIGHT_ALPHA };
}

export function mixColor(a: number, b: number, t: number): number {
  const ch = (shift: number): number => {
    const x = (a >> shift) & 255;
    const y = (b >> shift) & 255;
    return Math.round(x + (y - x) * t);
  };
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}

/** La vela como color CSS, que es como se pinta. */
export function tintCss(t: SkyTint): string {
  const r = (t.color >> 16) & 255;
  const g = (t.color >> 8) & 255;
  const b = t.color & 255;
  return `rgba(${r},${g},${b},${t.alpha.toFixed(3)})`;
}
