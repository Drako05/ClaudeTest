/**
 * El inventario y el recetario, segun los bocetos del autor, y la barra de la
 * mano.
 *
 * - **PC**: la tecla E abre un panel con tres columnas —PERSONAJE con sus
 *   equipables, INVENTARIO con el objeto seleccionado y su descripcion, y
 *   RECETAS por categorias—. **No pausa**: suelta el cursor para poder usar el
 *   raton, y al cerrarlo lo vuelve a capturar (`main.ts`).
 * - **Movil**: el boton INVENTARIO abre una pagina a la vez, elegida con las
 *   pestanas Personaje | Inventario | Recetas; y OTROS despliega el ojo, el
 *   HUD y el entorno.
 * - **Se arrastra** para mover: el mismo objeto se apila y uno distinto se
 *   intercambia. Con el inventario abierto, entre la rejilla y la barra de la
 *   mano; cerrado, dentro de la barra. **Soltarlo fuera del panel lo tira**,
 *   previa confirmacion, y solo con el panel abierto: desde la barra cerrada,
 *   soltar al vacio no hace nada.
 * - **Fabricar es mantener pulsado 1,5 s** el resultado de la receta, y la fila
 *   se llena de izquierda a derecha como una barra de carga.
 *
 * Nada de esto toca el estado: lo que se pide —elegir casilla, mover, tirar,
 * fabricar— se guarda como peticion y el bucle lo mete en la `Intent` (regla
 * 5). Estas peticiones no se tiran en pausa, al reves que las del mundo.
 */

import { HOTBAR_SLOTS, type GameState } from '@verdant/sim';
import { RECIPES, RESOURCE_NAMES, Resource, toolStats } from '@verdant/shared';
import { makePlayerArt } from './art.js';

/** Lo que se tarda en fabricar manteniendo pulsado (decision del autor). */
export const CRAFT_HOLD_MS = 1500;
/** Lo que hay que mover el puntero para que un toque sea un arrastre. **Propuesta mia.** */
const DRAG_SLOP = 6;
/** Casillas de equipables: tres a cada lado del personaje y cuatro debajo (boceto del autor). */
const EQUIP_SLOTS = 10;
/** Categorias del recetario que se dibujan (boceto: cinco). */
const CATEGORY_SLOTS = 5;
const PAGES = ['personaje', 'inventario', 'recetas'] as const;
type Page = (typeof PAGES)[number];

/** Una frase por objeto, para el recuadro de la descripcion. **Texto mio.** */
const DESCRIPTIONS: Record<number, string> = {
  [Resource.Wood]: 'Sale al talar un arbol con hacha.',
  [Resource.Stone]: 'De los guijarros del suelo, a mano, o de la roca con pico.',
  [Resource.Berries]: 'En la mano, clic derecho (o USAR) para comer.',
  [Resource.TreeSeed]: 'En la mano, clic derecho (o USAR) mirando al suelo para sembrar un arbol.',
  [Resource.PlantSeed]: 'En la mano, clic derecho (o USAR) mirando al suelo para sembrar un arbusto.',
  [Resource.Coal]: 'Se mina con pico en la montana.',
  [Resource.Iron]: 'Mineral: pide un pico mejor que el de piedra.',
  [Resource.Copper]: 'Mineral: sale con el pico de piedra.',
  [Resource.Branch]: 'Sale de los arboles golpeandolos sin hacha. Para fabricar.',
  [Resource.Fiber]: 'La sueltan los arbustos. Para fabricar.',
  [Resource.StoneAxe]: 'Tala arboles. Se gasta con cada golpe util.',
  [Resource.StonePickaxe]: 'Saca piedra, carbon y cobre. Se gasta con cada golpe util.',
};

/** Nombre corto para una casilla, que es estrecha. Sin iconos (decision del autor). */
const SHORT: Record<number, string> = {
  [Resource.TreeSeed]: 'Sem. arbol',
  [Resource.PlantSeed]: 'Sem. planta',
  [Resource.Iron]: 'Min. hierro',
  [Resource.Copper]: 'Min. cobre',
  [Resource.StoneAxe]: 'Hacha piedra',
  [Resource.StonePickaxe]: 'Pico piedra',
};

export interface ItemRequests {
  select: number;
  craft: number;
  moveFrom: number;
  moveTo: number;
  discard: number;
}

function byId<T extends HTMLElement = HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}

function nameOf(item: Resource): string {
  return SHORT[item] ?? RESOURCE_NAMES[item];
}

export class InventoryUi {
  private readonly panel = byId('invPanel');
  private readonly hotbar = byId('hotbar');
  private readonly grid = byId('invGrid');
  private readonly selSlot = byId('selSlot');
  private readonly selDesc = byId('selDesc');
  private readonly recipeTabs = byId('recipeTabs');
  private readonly recipeList = byId('recipeList');
  private readonly tabs = byId('invTabs');
  private readonly discardAsk = byId('discardAsk');
  private readonly discardText = byId('discardText');
  private readonly others = byId('others');
  private readonly invOpen = byId('invOpen');
  private readonly ghost = byId('dragGhost');

  private pending: ItemRequests = InventoryUi.none();
  private page: Page = 'inventario';
  /** Casilla cuyo objeto se describe. */
  private picked = -1;
  /** Lo que espera confirmacion para tirarse. */
  private asking: { slot: number; item: Resource } | null = null;
  /** El toque que cerro la confirmacion, que no empieza un arrastre. */
  private dismissEvent: Event | null = null;
  private drag: {
    slot: number;
    bar: boolean;
    x: number;
    y: number;
    moving: boolean;
    el: HTMLElement;
    over: HTMLElement | null;
  } | null = null;
  private hold: { recipe: number; since: number; row: HTMLElement } | null = null;
  private category = RECIPES[0]?.category ?? '';

  /** Peticiones que salieron hacia la `Intent`, para el humo. */
  readonly sent = { select: 0, craft: 0, move: 0, discard: 0 };
  /** Se llama al abrir o cerrar el inventario. */
  onToggle: ((open: boolean) => void) | null = null;

  private static none(): ItemRequests {
    return { select: -1, craft: -1, moveFrom: -1, moveTo: -1, discard: -1 };
  }

  constructor(private readonly current: () => GameState) {
    // La barra de la mano: tocar elige; arrastrar mueve (decision del autor).
    for (let i = 0; i < HOTBAR_SLOTS; i++) {
      const b = this.slotButton(i);
      b.dataset.bar = '1';
      this.bindDrag(b, i, true);
      this.hotbar.appendChild(b);
    }
    // La rejilla del inventario: tocar describe; arrastrar mueve o tira.
    for (let i = 0; i < this.current().inventory.size; i++) {
      const b = this.slotButton(i);
      b.dataset.grid = '1';
      this.bindDrag(b, i, false);
      this.grid.appendChild(b);
    }
    // Los equipables, apagados hasta que haya ropa (tanda 2).
    // La rejilla los coloca alrededor del dibujo (CSS de `#charGrid`).
    const charGrid = byId('charGrid');
    for (let i = 0; i < EQUIP_SLOTS; i++) {
      const b = document.createElement('div');
      b.className = 'slot off equip';
      b.title = 'Equipable (llegara con la ropa)';
      charGrid.appendChild(b);
    }
    this.drawCharacter();
    this.buildRecipes();

    for (const tab of Array.from(this.tabs.children) as HTMLElement[]) {
      tab.addEventListener('click', () => {
        this.page = tab.dataset.page as Page;
        this.renderPage();
      });
    }
    byId('discardYes').addEventListener('click', () => this.answer(true));
    byId('discardNo').addEventListener('click', () => this.answer(false));
    // Tocar fuera de la confirmacion la cancela (propuesta mia).
    document.addEventListener(
      'pointerdown',
      (e) => {
        if (!this.asking || this.discardAsk.contains(e.target as Node | null)) return;
        this.dismissEvent = e;
        this.answer(false);
      },
      true,
    );
    this.invOpen.addEventListener('click', () => this.toggle());
    this.others.addEventListener('click', () => this.setOthers(!document.body.classList.contains('others-open')));
    // OTROS se cierra tocando fuera de su fila (propuesta mia).
    document.addEventListener(
      'pointerdown',
      (e) => {
        if (!document.body.classList.contains('others-open')) return;
        const t = e.target as Element | null;
        if (t?.closest('#others, #hudToggle, #statsToggle, #proj, #fovPanel')) return;
        this.setOthers(false);
      },
      true,
    );

    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      const n = Number(e.key);
      if (Number.isInteger(n) && n >= 1 && n <= HOTBAR_SLOTS) this.pending.select = n - 1;
    });
    this.renderPage();
  }

  get open(): boolean {
    return !this.panel.hidden;
  }

  /**
   * La casilla siguiente (`+1`) o la anterior (`-1`) de la barra, dando la
   * vuelta: la rueda del raton en PC (pedido del autor). Varios pasos en un
   * mismo frame se encadenan sobre lo ya pedido.
   */
  step(delta: number): void {
    const from = this.pending.select >= 0 ? this.pending.select : this.current().inventory.selected;
    this.pending.select = (((from + delta) % HOTBAR_SLOTS) + HOTBAR_SLOTS) % HOTBAR_SLOTS;
  }

  toggle(): void {
    const open = this.panel.hidden;
    // Al abrir no hay nada seleccionado, y la descripcion esta vacia (pedido
    // del autor).
    if (open) this.picked = -1;
    this.panel.hidden = !open;
    this.invOpen.classList.toggle('open', open);
    this.invOpen.setAttribute('aria-expanded', String(open));
    if (!open) {
      this.cancelHold();
      this.answer(false);
    }
    this.onToggle?.(open);
    if (open) this.render(this.current());
  }

  private setOthers(open: boolean): void {
    document.body.classList.toggle('others-open', open);
    this.others.classList.toggle('open', open);
    this.others.setAttribute('aria-expanded', String(open));
  }

  /** Si hay una confirmacion de tirar a la vista. */
  get askingDiscard(): boolean {
    return this.asking !== null;
  }

  /** Pide confirmacion para tirar lo de esa casilla. */
  private ask(slot: number): void {
    const inv = this.current().inventory;
    const item = inv.itemAt(slot);
    if (item === null) return;
    this.asking = { slot, item };
    this.discardText.textContent = toolStats(item)
      ? `¿Tirar ${RESOURCE_NAMES[item]}?`
      : `¿Tirar ${inv.counts[slot]} × ${RESOURCE_NAMES[item]}?`;
    this.discardAsk.hidden = false;
  }

  /**
   * Responde a la confirmacion. Si entretanto la casilla cambio de objeto (se
   * comio, se movio), no se tira nada: se confirmo tirar OTRA cosa.
   */
  private answer(yes: boolean): void {
    const asked = this.asking;
    if (!asked) return;
    this.asking = null;
    this.discardAsk.hidden = true;
    if (yes && this.current().inventory.itemAt(asked.slot) === asked.item) this.pending.discard = asked.slot;
  }

  /** Las peticiones pendientes, que se vacian. Las recoge el bucle. */
  take(): ItemRequests {
    const out = this.pending;
    this.pending = InventoryUi.none();
    if (out.select >= 0) this.sent.select++;
    if (out.craft >= 0) this.sent.craft++;
    if (out.moveFrom >= 0) this.sent.move++;
    if (out.discard >= 0) this.sent.discard++;
    return out;
  }

  /**
   * Cada frame, la receta mantenida se carga. No hay avisos en pantalla
   * —«necesitas un pico», «inventario lleno», «fabricado»—: el autor los quito
   * todos el 2026-09-29. Lo que no cabe se resolvera tirando objetos al suelo.
   */
  frame(): void {
    if (this.hold) {
      const t = Math.min(1, (performance.now() - this.hold.since) / CRAFT_HOLD_MS);
      (this.hold.row.querySelector('.charge') as HTMLElement).style.width = `${t * 100}%`;
      if (t >= 1) {
        this.pending.craft = this.hold.recipe;
        this.cancelHold();
      }
    }
  }

  // ------------------------------------------------------------ casillas

  private slotButton(slot: number): HTMLElement {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'slot';
    b.dataset.slot = String(slot);
    return b;
  }

  /** Pinta una casilla: nombre y, abajo a la izquierda, solo el numero. */
  private paint(el: HTMLElement, item: Resource | null, count: number, wear: number): void {
    el.replaceChildren();
    el.classList.toggle('empty', item === null);
    if (item === null) {
      el.title = 'Vacia';
      return;
    }
    const name = document.createElement('span');
    name.textContent = nameOf(item);
    el.appendChild(name);
    const tool = toolStats(item);
    if (tool) {
      const bar = document.createElement('i');
      bar.className = 'wear';
      bar.style.width = `${(wear / tool.uses) * 100}%`;
      el.appendChild(bar);
    } else {
      const n = document.createElement('em');
      n.textContent = String(count);
      el.appendChild(n);
    }
    el.title = RESOURCE_NAMES[item];
  }

  /**
   * Arrastrar con raton o dedo. Pasado `DRAG_SLOP`, la casilla se lleva como
   * una etiqueta que sigue al puntero; al soltar, sobre otra casilla —de la
   * rejilla o de la barra— la mueve (apila o intercambia); fuera del panel
   * abierto pide confirmacion para tirarla; y en cualquier otro sitio no hace
   * nada. Con el inventario cerrado solo esta la barra, y soltar al vacio no
   * tira. Sin moverse es un toque: en la barra elige la mano, en la rejilla
   * describe el objeto.
   */
  private bindDrag(el: HTMLElement, slot: number, bar: boolean): void {
    el.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || this.asking || e === this.dismissEvent) return;
      this.drag = { slot, bar, x: e.clientX, y: e.clientY, moving: false, el, over: null };
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        // Sin captura sigue funcionando mientras el puntero no salga.
      }
    });
    el.addEventListener('pointermove', (e) => {
      const d = this.drag;
      if (!d || d.el !== el) return;
      if (!d.moving) {
        if (Math.hypot(e.clientX - d.x, e.clientY - d.y) < DRAG_SLOP) return;
        const item = this.current().inventory.itemAt(slot);
        if (item === null) return;
        d.moving = true;
        el.classList.add('dragging');
        this.ghost.textContent = nameOf(item);
        this.ghost.style.display = 'block';
      }
      this.ghost.style.left = `${e.clientX}px`;
      this.ghost.style.top = `${e.clientY}px`;
      const over = this.slotAt(e.clientX, e.clientY);
      if (over !== d.over) {
        d.over?.classList.remove('drop');
        over?.classList.add('drop');
        d.over = over;
      }
    });
    const end = (e: PointerEvent, cancelled: boolean) => {
      const d = this.drag;
      if (!d || d.el !== el) return;
      this.drag = null;
      el.classList.remove('dragging');
      d.over?.classList.remove('drop');
      this.ghost.style.display = 'none';
      if (!d.moving) {
        if (cancelled) return;
        if (d.bar) this.pending.select = slot;
        else this.pick(slot);
        return;
      }
      if (cancelled) return;
      const target = this.slotAt(e.clientX, e.clientY);
      if (target) {
        const to = Number(target.dataset.slot);
        if (to !== slot) {
          this.pending.moveFrom = slot;
          this.pending.moveTo = to;
        }
        return;
      }
      if (!this.open) return;
      const under = document.elementFromPoint(e.clientX, e.clientY);
      if (!under || !(this.panel.contains(under) || this.hotbar.contains(under))) this.ask(slot);
    };
    el.addEventListener('pointerup', (e) => end(e, false));
    el.addEventListener('pointercancel', (e) => end(e, true));
  }

  /** La casilla de la rejilla o de la barra que hay bajo el puntero. */
  private slotAt(x: number, y: number): HTMLElement | null {
    const el = document.elementFromPoint(x, y)?.closest('.slot') as HTMLElement | null;
    return el && (el.dataset.grid === '1' || el.dataset.bar === '1') ? el : null;
  }

  private pick(slot: number): void {
    this.picked = slot;
    this.render(this.current());
  }

  // ------------------------------------------------------------ recetas

  private buildRecipes(): void {
    const categories = [...new Set(RECIPES.map((r) => r.category))];
    for (let i = 0; i < CATEGORY_SLOTS; i++) {
      const tab = document.createElement('button');
      tab.type = 'button';
      tab.className = 'slot';
      const cat = categories[i];
      if (cat) {
        tab.textContent = cat;
        tab.addEventListener('click', () => {
          this.category = cat;
          this.buildList();
          this.render(this.current());
        });
      } else {
        tab.classList.add('off');
      }
      this.recipeTabs.appendChild(tab);
    }
    this.buildList();
  }

  private buildList(): void {
    this.recipeList.replaceChildren();
    Array.from(this.recipeTabs.children).forEach((tab) =>
      tab.classList.toggle('on', tab.textContent === this.category),
    );
    RECIPES.forEach((recipe, i) => {
      if (recipe.category !== this.category) return;
      const row = document.createElement('div');
      row.className = 'recipe';
      row.dataset.recipe = String(i);
      const charge = document.createElement('i');
      charge.className = 'charge';
      const result = this.slotButton(-1);
      result.classList.add('result');
      result.title = `Mantener ${CRAFT_HOLD_MS / 1000} s para fabricar`;
      const ingredients = document.createElement('div');
      ingredients.className = 'ingredients';
      for (let k = 0; k < 4; k++) {
        const s = document.createElement('div');
        s.className = 'slot';
        ingredients.appendChild(s);
      }
      row.append(charge, result, ingredients);
      this.bindHold(result, row, i);
      this.recipeList.appendChild(row);
    });
  }

  /**
   * Fabricar: mantener pulsado el resultado. Sin ingredientes o sin sitio no
   * arranca, y sin aviso (decision del autor). Soltar o salirse antes de tiempo
   * lo cancela.
   */
  private bindHold(el: HTMLElement, row: HTMLElement, recipe: number): void {
    el.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      const inv = this.current().inventory;
      const r = RECIPES[recipe];
      if (r.inputs.some((input) => inv.count(input.item) < input.count)) return;
      if (!inv.fits([{ item: r.output, count: r.count }], r.inputs)) return;
      this.cancelHold();
      this.hold = { recipe, since: performance.now(), row };
    });
    for (const type of ['pointerup', 'pointerleave', 'pointercancel']) {
      el.addEventListener(type, () => {
        if (this.hold?.recipe === recipe) this.cancelHold();
      });
    }
  }

  private cancelHold(): void {
    if (!this.hold) return;
    (this.hold.row.querySelector('.charge') as HTMLElement).style.width = '0%';
    this.hold = null;
  }

  // ------------------------------------------------------------ paginas del movil

  /** Muestra la pagina elegida e ilumina su pestana; las pestanas no se mueven. */
  private renderPage(): void {
    for (const section of Array.from(this.panel.querySelectorAll<HTMLElement>('.invPage'))) {
      section.classList.toggle('current', section.dataset.page === this.page);
    }
    for (const tab of Array.from(this.tabs.children) as HTMLElement[]) {
      const on = tab.dataset.page === this.page;
      tab.classList.toggle('on', on);
      tab.setAttribute('aria-selected', String(on));
    }
  }

  get currentPage(): Page {
    return this.page;
  }

  // ------------------------------------------------------------ pintar

  private drawCharacter(): void {
    const canvas = byId<HTMLCanvasElement>('charArt');
    const ctx = canvas.getContext('2d');
    const art = makePlayerArt(4);
    if (!ctx || !art) return;
    ctx.imageSmoothingEnabled = false;
    const scale = Math.min(canvas.width / art.canvas.width, canvas.height / art.canvas.height) * 0.9;
    const w = art.canvas.width * scale;
    const h = art.canvas.height * scale;
    ctx.drawImage(art.canvas, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
  }

  /** Repinta la barra y, si esta abierto, el inventario y el recetario. */
  render(state: GameState): void {
    const inv = state.inventory;
    Array.from(this.hotbar.children).forEach((el, i) => {
      this.paint(el as HTMLElement, inv.itemAt(i), inv.counts[i], inv.wear[i]);
      el.classList.toggle('on', inv.selected === i);
    });
    if (this.panel.hidden) return;

    Array.from(this.grid.children).forEach((el, i) => {
      this.paint(el as HTMLElement, inv.itemAt(i), inv.counts[i], inv.wear[i]);
      el.classList.toggle('on', inv.selected === i);
      el.classList.toggle('picked', this.picked === i);
    });

    const item = this.picked >= 0 ? inv.itemAt(this.picked) : null;
    this.paint(this.selSlot, item, item === null ? 0 : inv.counts[this.picked], item === null ? 0 : inv.wear[this.picked]);
    // Sin objeto —casilla vacia o nada elegido— la descripcion se limpia. Antes
    // se quedaba la del ultimo objeto tocado.
    this.selDesc.replaceChildren();
    if (item !== null) {
      const title = document.createElement('b');
      title.textContent = RESOURCE_NAMES[item];
      this.selDesc.append(title, DESCRIPTIONS[item] ?? '');
    }

    for (const row of Array.from(this.recipeList.children) as HTMLElement[]) {
      const r = RECIPES[Number(row.dataset.recipe)];
      let ok = true;
      this.paint(row.querySelector('.result') as HTMLElement, r.output, r.count, toolStats(r.output)?.uses ?? 0);
      const cells = Array.from(row.querySelectorAll('.ingredients .slot')) as HTMLElement[];
      cells.forEach((cell, k) => {
        const input = r.inputs[k];
        cell.replaceChildren();
        if (!input) return;
        const have = inv.count(input.item);
        if (have < input.count) ok = false;
        const name = document.createElement('span');
        name.textContent = nameOf(input.item);
        const n = document.createElement('em');
        n.textContent = `${Math.min(have, input.count)}/${input.count}`;
        cell.append(name, n);
        cell.title = RESOURCE_NAMES[input.item];
      });
      row.classList.toggle('missing', !ok);
    }
  }
}
