/**
 * La barra de la mano, el inventario por casillas, el panel de fabricar, los
 * avisos y la barra de trabajo del golpe.
 *
 * Nada de esto toca el estado: lo que el jugador pide —elegir casilla,
 * intercambiar dos, tirar una, fabricar— se guarda aqui como peticion y el
 * bucle lo mete en la `Intent` (regla 5), igual que el salto o la accion.
 * **Estas peticiones no se tiran en pausa**, al reves que las del mundo: son
 * orden del inventario, y se aplican en el primer tick que corra (propuesta
 * mia). Con el cursor capturado los paneles no se pueden pulsar, y en pausa si.
 */

import {
  actionReach,
  damageAt,
  HOTBAR_SLOTS,
  type GameState,
} from '@verdant/sim';
import { RECIPES, RESOURCE_NAMES, Resource, toolStats, workOf } from '@verdant/shared';

/** Nombre corto para una casilla de la barra, que es estrecha. */
const SHORT: Record<number, string> = {
  [Resource.Wood]: 'Madera',
  [Resource.Stone]: 'Piedra',
  [Resource.Berries]: 'Bayas',
  [Resource.TreeSeed]: 'Sem. arbol',
  [Resource.PlantSeed]: 'Sem. planta',
  [Resource.Coal]: 'Carbon',
  [Resource.Iron]: 'Min. hierro',
  [Resource.Copper]: 'Min. cobre',
  [Resource.Branch]: 'Rama',
  [Resource.Fiber]: 'Fibra',
  [Resource.StoneAxe]: 'Hacha',
  [Resource.StonePickaxe]: 'Pico',
};

/** Lo que cuenta cada aviso. */
const BLOCKED_TEXT = {
  full: 'Inventario lleno',
  needPickaxe: 'Necesitas un pico',
  needBetterPickaxe: 'Necesitas un pico mejor',
} as const;

/** Cuanto dura un aviso en pantalla, en segundos. */
const TOAST_SECONDS = 1.6;

export interface ItemRequests {
  select: number;
  craft: number;
  swapA: number;
  swapB: number;
  discard: number;
}

function byId<T extends HTMLElement = HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}

export class ItemsUi {
  private readonly hotbar = byId('hotbar');
  private readonly invGrid = byId('invGrid');
  private readonly invPanel = byId('invPanel');
  private readonly discardBtn = byId<HTMLButtonElement>('discard');
  private readonly craftToggle = byId('craftToggle');
  private readonly craftPanel = byId('craftPanel');
  private readonly craftList = byId('craftList');
  private readonly toast = byId('toast');
  private readonly workBar = byId('workBar');
  private readonly workFill = byId('workFill');

  private pending: ItemRequests = ItemsUi.none();
  /** Casilla marcada en el inventario para moverla o tirarla. */
  private marked = -1;
  private toastLeft = 0;
  /** Contadores de peticiones que salieron hacia la `Intent`, para el humo. */
  readonly sent = { select: 0, craft: 0, swap: 0, discard: 0 };
  /** Se llama al abrir o cerrar el panel de fabricar. */
  onCraftToggle: ((open: boolean) => void) | null = null;

  private static none(): ItemRequests {
    return { select: -1, craft: -1, swapA: -1, swapB: -1, discard: -1 };
  }

  constructor(private readonly current: () => GameState) {
    for (let i = 0; i < HOTBAR_SLOTS; i++) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'slot';
      b.dataset.slot = String(i);
      b.addEventListener('click', () => this.requestSelect(i));
      this.hotbar.appendChild(b);
    }
    for (let i = 0; i < this.current().inventory.size; i++) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'slot';
      b.dataset.slot = String(i);
      b.addEventListener('click', () => this.mark(i));
      this.invGrid.appendChild(b);
    }
    this.discardBtn.addEventListener('click', () => {
      if (this.marked < 0) return;
      this.pending.discard = this.marked;
      this.marked = -1;
    });
    RECIPES.forEach((recipe, i) => {
      const row = document.createElement('div');
      row.className = 'recipe';
      const name = document.createElement('b');
      name.textContent = RESOURCE_NAMES[recipe.output];
      const needs = document.createElement('span');
      needs.className = 'needs';
      const make = document.createElement('button');
      make.type = 'button';
      make.textContent = 'Fabricar';
      make.addEventListener('click', () => {
        this.pending.craft = i;
      });
      row.append(name, needs, make);
      this.craftList.appendChild(row);
    });
    this.craftToggle.addEventListener('click', () => this.toggleCraft());

    // Teclas 1-4: la casilla de la barra. C: el panel de fabricar.
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      const n = Number(e.key);
      if (Number.isInteger(n) && n >= 1 && n <= HOTBAR_SLOTS) this.requestSelect(n - 1);
      if (e.code === 'KeyC') this.toggleCraft();
    });
  }

  get craftOpen(): boolean {
    return !this.craftPanel.hidden;
  }

  toggleCraft(): void {
    const open = this.craftPanel.hidden;
    this.craftPanel.hidden = !open;
    this.craftToggle.classList.toggle('open', open);
    this.craftToggle.setAttribute('aria-expanded', String(open));
    this.onCraftToggle?.(open);
    if (open) this.render(this.current());
  }

  /** Las peticiones pendientes, que se vacian. Las recoge el bucle. */
  take(): ItemRequests {
    const out = this.pending;
    this.pending = ItemsUi.none();
    if (out.select >= 0) this.sent.select++;
    if (out.craft >= 0) this.sent.craft++;
    if (out.swapA >= 0) this.sent.swap++;
    if (out.discard >= 0) this.sent.discard++;
    return out;
  }

  private requestSelect(slot: number): void {
    this.pending.select = slot;
  }

  /** Tocar una casilla la marca; tocar otra despues las intercambia. */
  private mark(slot: number): void {
    if (this.marked < 0) {
      this.marked = slot;
    } else if (this.marked === slot) {
      this.marked = -1;
    } else {
      this.pending.swapA = this.marked;
      this.pending.swapB = slot;
      this.marked = -1;
    }
    this.render(this.current());
  }

  /** Cuenta lo que paso en el ultimo tick: avisos de golpe, rotura y fabricado. */
  notice(state: GameState): void {
    if (state.lastBlocked) this.say(BLOCKED_TEXT[state.lastBlocked]);
    if (state.lastBroke) this.say('Se rompio la herramienta');
    if (state.lastCrafted >= 0) this.say(`Fabricado: ${RESOURCE_NAMES[RECIPES[state.lastCrafted].output]}`);
  }

  private say(text: string): void {
    this.toast.textContent = text;
    this.toast.classList.add('show');
    this.toastLeft = TOAST_SECONDS;
  }

  /** Cada frame: el aviso se apaga solo y la barra de trabajo sigue al golpe. */
  frame(state: GameState, dt: number): void {
    if (this.toastLeft > 0) {
      this.toastLeft -= dt;
      if (this.toastLeft <= 0) this.toast.classList.remove('show');
    }
    // El trabajo acumulado en lo mas cercano que alcanza el golpe.
    const target = actionReach(state.world, state.entities, state.playerId)[0];
    let fraction = 0;
    if (target) {
      const need = workOf(state.world.featureAt(target.x, target.y));
      const done = damageAt(state.work, state.world, target.x, target.y, state.tick);
      if (need && done > 0) fraction = Math.min(1, done / need.work);
    }
    this.workBar.classList.toggle('show', fraction > 0);
    this.workFill.style.width = `${fraction * 100}%`;
  }

  /** Repinta la barra y, si estan abiertos, el inventario y el panel de fabricar. */
  render(state: GameState): void {
    const inv = state.inventory;
    const paint = (el: Element, slot: number) => {
      const item = inv.itemAt(slot);
      const b = el as HTMLElement;
      b.replaceChildren();
      b.classList.toggle('empty', item === null);
      if (item !== null) {
        const name = document.createElement('span');
        name.textContent = SHORT[item] ?? RESOURCE_NAMES[item];
        b.appendChild(name);
        const tool = toolStats(item);
        if (tool) {
          const wear = document.createElement('i');
          wear.className = 'wear';
          wear.style.width = `${(inv.wear[slot] / tool.uses) * 100}%`;
          b.appendChild(wear);
        } else {
          const count = document.createElement('em');
          count.textContent = String(inv.counts[slot]);
          b.appendChild(count);
        }
        b.title = RESOURCE_NAMES[item];
      } else {
        b.title = 'Vacia';
      }
    };
    Array.from(this.hotbar.children).forEach((el, i) => {
      paint(el, i);
      el.classList.toggle('on', inv.selected === i);
    });
    if (!this.invPanel.hidden) {
      Array.from(this.invGrid.children).forEach((el, i) => {
        paint(el, i);
        el.classList.toggle('marked', this.marked === i);
        el.classList.toggle('on', inv.selected === i);
      });
      this.discardBtn.disabled = this.marked < 0;
    }
    if (this.craftOpen) {
      RECIPES.forEach((recipe, i) => {
        const row = this.craftList.children[i] as HTMLElement;
        let ok = true;
        const parts = recipe.inputs.map((input) => {
          const have = inv.count(input.item);
          if (have < input.count) ok = false;
          return `${RESOURCE_NAMES[input.item]} ${Math.min(have, input.count)}/${input.count}`;
        });
        (row.querySelector('.needs') as HTMLElement).textContent = parts.join(' · ');
        (row.querySelector('button') as HTMLButtonElement).disabled = !ok;
        row.classList.toggle('missing', !ok);
      });
    }
  }
}
