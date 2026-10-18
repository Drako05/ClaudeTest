/**
 * Ayudantes para los tests desde que el botin cae al suelo (el autor,
 * 2026-10-18): contar lo que hay suelto y recogerlo de golpe, para los tests
 * que miden lo que da algo y no como se recoge (eso lo mira `drops.test.ts`).
 */
import type { Resource } from '@verdant/shared';
import type { Inventory, World } from '@verdant/sim';

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
