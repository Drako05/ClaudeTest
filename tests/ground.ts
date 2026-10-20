/**
 * Ayudantes para los tests desde que el botin cae al suelo (el autor,
 * 2026-10-18): contar lo que hay suelto y recogerlo de golpe, para los tests
 * que miden lo que da algo y no como se recoge (eso lo mira `drops.test.ts`).
 */
import { isStation, type Feature, type Resource } from '@verdant/shared';
import { topOf, VOXEL, type Inventory, type Solid, type World } from '@verdant/sim';

/** Cuantas unidades de un objeto hay sueltas en el mundo. */
export function groundCount(world: World, item: Resource): number {
  let n = 0;
  for (const d of world.drops.values()) if (d.item === item) n += d.count;
  return n;
}

/** Mete en el inventario todo lo suelto que quepa, sin iman ni espera. */
export function collectAll(world: World, inventory: Inventory): void {
  for (const d of world.drops.values()) {
    d.count -= inventory.addSome(d.item, d.count, d.wear);
    if (d.count <= 0) world.drops.remove(d.id);
  }
}

/**
 * Un terreno de mentira desde una altura por punto, para los rayos (`Solid`):
 * cada columna de 0,5, solida hasta la altura de su centro redondeada al medio
 * bloque. Asi los tests de geometria siguen diciendo «una pared de 2».
 */
export function heightField(ground: (x: number, y: number) => number): Solid {
  return (vx, vy, vz) => vz < Math.round(ground((vx + 0.5) * VOXEL, (vy + 0.5) * VOXEL) / VOXEL);
}

/**
 * Las consultas del terreno de voxeles para un mundo de mentira que solo da la
 * altura de cada columna (`columnTop`, en medios bloques): solido de ahi para
 * abajo, sin nada roto, y los objetos apoyados como en `World`. Van con `this`,
 * asi que un `{ ...mundo, columnTop }` que cambia las alturas las sigue.
 */
export function withVoxels<T extends object>(w: T): T {
  type Columns = { columnTop(vx: number, vy: number): number };
  return Object.assign(w, {
    potentialTop(this: Columns, vx: number, vy: number) {
      return this.columnTop(vx, vy);
    },
    brokenAt: () => undefined,
    floorBelow(this: Columns, vx: number, vy: number, below: number) {
      return Math.min(this.columnTop(vx, vy), below);
    },
    ceilingAbove(this: Columns, vx: number, vy: number, from: number) {
      return from < this.columnTop(vx, vy) ? from : Infinity;
    },
    isSolidVoxel(this: Columns, vx: number, vy: number, vz: number) {
      return vz < this.columnTop(vx, vy);
    },
    objectBaseAt(this: Columns, tx: number, ty: number, feature: Feature) {
      const tops = [0, 1, 2, 3].map((s) => topOf(this.columnTop(tx * 2 + (s % 2), ty * 2 + Math.floor(s / 2))));
      return isStation(feature) ? Math.max(...tops) : Math.min(...tops);
    },
  });
}
