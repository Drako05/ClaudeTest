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
 *   mano; cerrado, dentro de la barra. **Soltarlo fuera lo tira**, sin
 *   preguntar; y desde la barra, **soltarlo sobre INVENTARIO lo guarda** fuera
 *   de ella (el autor, 2026-10-18; `bindDrag`).
 * - **Las opciones de una casilla** (el autor, 2026-10-19): con clic en PC o
 *   manteniendo 0,3 s en el movil, al lado de la casilla de la rejilla, Usar,
 *   Dividir, Equipar y Destruir, las que toquen (`item-menu.ts`). Dividir pide
 *   la cantidad y Destruir, confirmacion. Elegir una casilla que no se ve
 *   entera desliza la rejilla hasta que se vea.
 * - **Fabricar es mantener pulsado 1 s** el resultado de la receta (1,5 hasta
 *   el 2026-10-17), y la fila se llena de izquierda a derecha como una barra
 *   de carga. Con **+ y -** (solo en lo apilable) se elige cuantas veces: un
 *   solo mantener fabrica las N, hasta lo que alcance (el autor, 2026-10-17).
 * - **Las categorias de las recetas van por su icono**, monocromo; el nombre,
 *   al pasar el raton.
 * - **Cada estacion tiene sus recetas** (decision del autor, tanda 2): con E se
 *   ven las de mano; al USAR una mesa o un horno se abre este mismo panel con
 *   las suyas, bajo su nombre, y se cierra solo al salir del alcance, medido
 *   hasta su cara (`stationNear`, la misma cuenta con que el nucleo acepta).
 * - **Cada objeto se ve por su icono en pixelart** (el autor, 2026-10-17;
 *   `item-icons.ts`): en las casillas, en los ingredientes y en lo que se
 *   arrastra. El nombre queda al pasar el raton y en la descripcion.
 * - **PERSONAJE tiene catorce casillas** (decision del autor, 2026-10-04), cada
 *   una con la silueta de lo que va en ella, que se oculta al equipar algo. La
 *   bolsa o la mochila van al **Bolso** y abren sus casillas en la rejilla
 *   (las que no se abren no se ven); un arma va al **Arma**, y con ella se
 *   golpea a los seres vivos.
 *
 * Nada de esto toca el estado: lo que se pide —elegir casilla, mover, tirar,
 * fabricar— se guarda como peticion y el bucle lo mete en la `Intent` (regla
 * 5). Estas peticiones no se tiran en pausa, al reves que las del mundo.
 */

import { craftableTimes, equipSlot, EYE_HEIGHT, HOTBAR_SLOTS, hitboxAt, stationNear, type GameState } from '@verdant/sim';
import {
  type Equip,
  equipOf,
  EQUIP_COUNT,
  EQUIP_NAMES,
  RECIPES,
  RESOURCE_NAMES,
  Resource,
  Station,
  STATION_NAMES,
  stackMax,
  toolStats,
} from '@verdant/shared';
import { now } from './clock.js';
import { equipIcon } from './equip-icons.js';
import { itemIcon } from './item-icons.js';
import { playerArt } from './world-sprites.js';
import {
  clampSplit,
  inCore,
  MENU_HOLD_MS,
  OPTION_LABELS,
  optionsFor,
  placeMenu,
  scrollToShow,
  TOUCH_CORE,
  type ItemOption,
} from './item-menu.js';
import { pixelIcon } from './pixel-art.js';
import { categoryArt } from './silhouette-icons.js';
import { ScrollRail } from './scroll-rail-view.js';
import { qtySteps } from './qty-hold.js';

/** Lo que se tarda en fabricar manteniendo pulsado (el autor; 1 s desde el 2026-10-17). */
export const CRAFT_HOLD_MS = 1000;
/** Lo que hay que mover el puntero para que un toque sea un arrastre. **Propuesta mia.** */
const DRAG_SLOP = 6;
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
  [Resource.Iron]: 'Mineral: pide un pico de cobre o mejor. Se funde en el horno.',
  [Resource.Copper]: 'Mineral: sale con el pico de piedra. Se funde en el horno.',
  [Resource.Branch]: 'Sale de los arboles golpeandolos sin hacha. Para fabricar.',
  [Resource.Fiber]: 'La sueltan los arbustos. Para fabricar.',
  [Resource.StoneAxe]: 'Tala arboles. Se gasta con cada golpe.',
  [Resource.StonePickaxe]: 'Saca piedra, carbon y cobre. Se gasta con cada golpe.',
  [Resource.CopperIngot]: 'Del horno. Para herramientas, la espada y la mochila, en la mesa.',
  [Resource.IronIngot]: 'Del horno. Para las herramientas y la espada de hierro, en la mesa.',
  [Resource.CopperAxe]: 'Tala en dos golpes. Se gasta con cada golpe.',
  [Resource.CopperPickaxe]: 'Mina tambien el hierro. Se gasta con cada golpe.',
  [Resource.IronAxe]: 'Tala mas deprisa que ninguna. Se gasta con cada golpe.',
  [Resource.IronPickaxe]: 'El mejor pico. Se gasta con cada golpe.',
  [Resource.Workbench]: 'En la mano, clic derecho (o USAR) mirando al suelo para ponerla. Usala para ver sus recetas.',
  [Resource.Furnace]: 'En la mano, clic derecho (o USAR) mirando al suelo para ponerlo. Usalo para fundir.',
  [Resource.FiberBag]: 'Arrastrala al Bolso, en PERSONAJE: +2 casillas.',
  [Resource.FrameBackpack]: 'Arrastrala al Bolso, en PERSONAJE: +6 casillas.',
  [Resource.RawMeat]: 'De los animales. Cruda no se come: asala en el horno.',
  [Resource.CookedMeat]: 'Del horno. En la mano, clic derecho (o USAR) para comer: alimenta mas que las bayas.',
  [Resource.Hide]: 'De los mamiferos. Aun no tiene uso.',
  [Resource.Feather]: 'De las gaviotas. Aun no tiene uso.',
  [Resource.Shell]: 'Del cangrejo. Aun no tiene uso.',
  [Resource.StoneDagger]:
    'Arma: 15 de dano a los animales. Equipada en Arma, en PERSONAJE, golpea con ella aunque lleves otra cosa en la mano.',
  [Resource.CopperSword]:
    'Arma: 30 de dano a los animales. Equipada en Arma, en PERSONAJE, golpea con ella aunque lleves otra cosa en la mano.',
  [Resource.IronSword]:
    'Arma: 45 de dano a los animales. Equipada en Arma, en PERSONAJE, golpea con ella aunque lleves otra cosa en la mano.',
};

export interface ItemRequests {
  select: number;
  craft: number;
  /** Las veces de `craft`, de los + y - de su receta. */
  craftTimes: number;
  moveFrom: number;
  moveTo: number;
  discard: number;
  /** Casilla de la barra que se guarda en el resto del inventario. */
  stow: number;
  /** Dividir: de que casilla y cuantos. */
  splitFrom: number;
  splitCount: number;
  /** Destruir la pila de esa casilla. */
  destroy: number;
  /** Comer de esa casilla. */
  useSlot: number;
}

function byId<T extends HTMLElement = HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}


export class InventoryUi {
  private readonly panel = byId('invPanel');
  private readonly hotbar = byId('hotbar');
  private readonly grid = byId('invGrid');
  private readonly selSlot = byId('selSlot');
  private readonly selDesc = byId('selDesc');
  private readonly charSelSlot = byId('charSelSlot');
  private readonly charSelDesc = byId('charSelDesc');
  private readonly recipeTitle = byId('recipeTitle');
  /** Las catorce casillas de PERSONAJE, por `Equip`, con su indice de arrastre y su icono. */
  private readonly wornSlots: Array<{ el: HTMLElement; slot: number; icon: SVGSVGElement; name: string }> = [];
  private readonly recipeTabs = byId('recipeTabs');
  private readonly recipeList = byId('recipeList');
  private readonly tabs = byId('invTabs');
  private readonly others = byId('others');
  private readonly invOpen = byId('invOpen');
  private readonly ghost = byId('dragGhost');
  private readonly menu = byId('itemMenu');
  private readonly splitAsk = byId('splitAsk');
  private readonly splitQty = byId<HTMLInputElement>('splitQty');
  private readonly destroyAsk = byId('destroyAsk');
  private readonly destroyText = byId('destroyText');
  /** La casilla cuyo menu esta abierto, con el objeto que tenia al abrirlo. */
  private menuFor: { slot: number; item: Resource } | null = null;
  /** La casilla que espera la cantidad de Dividir, o la confirmacion de Destruir. */
  private asking: { slot: number; item: Resource; kind: 'split' | 'destroy' } | null = null;

  private pending: ItemRequests = InventoryUi.none();
  private page: Page = 'inventario';
  /** Casilla cuyo objeto se describe. */
  private picked = -1;
  private drag: {
    slot: number;
    bar: boolean;
    x: number;
    y: number;
    moving: boolean;
    el: HTMLElement;
    over: HTMLElement | null;
    /** El toque largo del movil, que abre el menu (`MENU_HOLD_MS`). */
    timer: number;
    /** Ya abrio el menu manteniendo: soltar no hace nada mas. */
    held: boolean;
    /** La hora del evento que apoyo el dedo (`timeStamp`). */
    since: number;
    /**
     * Un dedo que empezo en el anillo de una casilla de la rejilla: desliza la
     * rejilla en vez de arrastrar la casilla (`TOUCH_CORE`).
     */
    scroll: { y: number; top: number } | null;
  } | null = null;
  private hold: { recipe: number; since: number; row: HTMLElement } | null = null;
  /** El + o - mantenido: repite, cada vez mas deprisa (`qtySteps`). */
  private qtyHold: { recipe: number; step: number; since: number; done: number; button: HTMLButtonElement } | null =
    null;
  private category = '';
  /** De donde son las recetas que se ven: a mano (E) o una estacion usada. */
  private mode: Station = Station.Hand;

  /** Peticiones que salieron hacia la `Intent`, para el humo. */
  readonly sent = { select: 0, craft: 0, move: 0, discard: 0, stow: 0, split: 0, destroy: 0, use: 0 };
  /** Se llama al abrir o cerrar el inventario. */
  onToggle: ((open: boolean) => void) | null = null;

  private static none(): ItemRequests {
    return {
      select: -1,
      craft: -1,
      craftTimes: 1,
      moveFrom: -1,
      moveTo: -1,
      discard: -1,
      stow: -1,
      splitFrom: -1,
      splitCount: 0,
      destroy: -1,
      useSlot: -1,
    };
  }

  /** Las veces elegidas para cada receta (por su indice en `RECIPES`). */
  private readonly times = new Map<number, number>();

  private timesOf(recipe: number): number {
    return this.times.get(recipe) ?? 1;
  }

  constructor(private readonly current: () => GameState) {
    // La barra deslizable del movil, a la rejilla y a las recetas (tambien las
    // de la mesa y el horno, que usan la misma lista): con mas casillas de las
    // que caben, el fondo de la rejilla casi no se encuentra con el dedo
    // (pedido del autor, 2026-09-30).
    new ScrollRail(this.grid);
    new ScrollRail(this.recipeList);
    this.bindTouchOutside();
    // La barra de la mano: tocar elige; arrastrar mueve (decision del autor).
    for (let i = 0; i < HOTBAR_SLOTS; i++) {
      const b = this.slotButton(i);
      b.dataset.bar = '1';
      this.bindDrag(b, i, true);
      this.hotbar.appendChild(b);
    }
    // La rejilla del inventario: tocar describe; arrastrar mueve o tira. En el
    // movil solo responde el centro de cada casilla, y el anillo desliza la
    // rejilla (`bindDrag`).
    for (let i = 0; i < this.current().inventory.size; i++) {
      const b = this.slotButton(i);
      b.dataset.grid = '1';
      this.bindDrag(b, i, false);
      this.grid.appendChild(b);
    }
    // Los equipables: la rejilla los coloca alrededor del dibujo (CSS de
    // `#charGrid`), en el orden de `Equip`, que es el de lectura. Todos se
    // arrastran, aunque la mayoria aun no tenga nada que ponerse: el nucleo
    // solo acepta en cada uno lo suyo.
    const charGrid = byId('charGrid');
    for (let e = 0 as Equip; e < EQUIP_COUNT; e++) {
      const slot = equipSlot(e);
      const b = this.slotButton(slot);
      b.classList.add('equip');
      b.dataset.equip = '1';
      this.bindDrag(b, slot, false);
      this.wornSlots.push({ el: b, slot, icon: equipIcon(e), name: EQUIP_NAMES[e] });
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
    this.invOpen.addEventListener('click', () => this.toggle());
    this.others.addEventListener('click', () => this.setOthers(!document.body.classList.contains('others-open')));
    // OTROS se cierra tocando fuera de su fila (propuesta mia).
    document.addEventListener(
      'pointerdown',
      (e) => {
        if (!document.body.classList.contains('others-open')) return;
        const t = e.target as Element | null;
        if (t?.closest('#others, #hudToggle, #statsToggle, #proj, #fovPanel, #devToggle, #devPanel')) return;
        this.setOthers(false);
      },
      true,
    );

    this.bindMenu();

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
    this.showSelected(this.pending.select);
    this.passes.push(this.pending.select);
  }

  /**
   * Enciende en el acto la casilla elegida de la barra y apaga las demas. La
   * rueda ilumina cada casilla por la que pasa (pedido del autor) y **solo una
   * a la vez, sin espera** (2026-10-01): la luz es la de la seleccion, que se
   * mueve con cada muesca. Hubo un destello aparte que se apagaba a los
   * 140 ms, y mientras el nucleo no aplicaba la seleccion seguia encendida la
   * de antes: dos a la vez.
   */
  private showSelected(slot: number): void {
    Array.from(this.hotbar.children).forEach((el, i) => el.classList.toggle('on', i === slot));
  }
  /**
   * Las casillas que la rueda ha encendido, en orden, anotadas al encenderse.
   * Acumulado, para el humo: asi afirma cuales sin depender de cuanto tarde
   * la maquina (escape 13).
   */
  readonly passes: number[] = [];

  /**
   * En el movil, con el inventario abierto, **un toque fuera de su interfaz lo
   * cierra, y solo eso** (decisiones del autor, 2026-10-01): ni gira la camara,
   * ni mueve el joystick, ni pulsa el boton que hubiera debajo. Se escucha en
   * la fase de captura del documento, antes que nadie, y se traga ese dedo
   * entero —sus eventos de puntero, de toque y el clic que le sigue— hasta que
   * se levanta. No cuentan como fuera el panel, la barra de la mano (se
   * arrastra entre las dos) y el boton INVENTARIO (ya alterna; deduccion mia).
   */
  private bindTouchOutside(): void {
    let swallowing: number | null = null;
    let swallowClickUntil = 0;
    const inside = (t: EventTarget | null) =>
      t instanceof Element && !!t.closest('#invPanel, #hotbar, #invOpen');
    document.addEventListener(
      'pointerdown',
      (e) => {
        if (e.pointerType !== 'touch' || !this.open || inside(e.target)) return;
        if (!document.body.classList.contains('touch-active')) return;
        swallowing = e.pointerId;
        e.preventDefault();
        e.stopImmediatePropagation();
        this.toggle();
      },
      { capture: true },
    );
    const swallowPointer = (e: PointerEvent) => {
      if (swallowing === null || e.pointerId !== swallowing) return;
      e.stopImmediatePropagation();
      if (e.type === 'pointerup' || e.type === 'pointercancel') {
        swallowing = null;
        swallowClickUntil = performance.now() + 500;
      }
    };
    for (const type of ['pointermove', 'pointerup', 'pointercancel'] as const) {
      document.addEventListener(type, swallowPointer, { capture: true });
    }
    // Los eventos de toque llegan aparte de los de puntero, y algunos botones
    // escuchan esos (`touchstart`): tambien se tragan, y con `preventDefault`
    // el navegador no fabrica el clic.
    for (const type of ['touchstart', 'touchmove', 'touchend', 'touchcancel'] as const) {
      document.addEventListener(
        type,
        (e) => {
          // El que empieza o se mueve, solo mientras dura el dedo que cerro; el
          // que acaba llega justo despues de su `pointerup`.
          const ending = e.type === 'touchend' || e.type === 'touchcancel';
          if (swallowing === null && !(ending && performance.now() <= swallowClickUntil)) return;
          if (inside(e.target)) return;
          e.preventDefault();
          e.stopImmediatePropagation();
        },
        { capture: true, passive: false },
      );
    }
    document.addEventListener(
      'click',
      (e) => {
        if (performance.now() > swallowClickUntil || inside(e.target)) return;
        e.preventDefault();
        e.stopImmediatePropagation();
      },
      { capture: true },
    );
  }

  toggle(): void {
    const open = this.panel.hidden;
    // Al abrir no hay nada seleccionado, y la descripcion esta vacia (pedido
    // del autor).
    if (open) this.picked = -1;
    // Cerrado, el panel vuelve a ser el de E: con las recetas de mano.
    if (!open) this.setMode(Station.Hand);
    this.panel.hidden = !open;
    this.invOpen.classList.toggle('open', open);
    this.invOpen.setAttribute('aria-expanded', String(open));
    if (!open) {
      this.closeMenu();
      this.closeAsk();
      this.cancelHold();
      this.qtyHold = null;
      // Al cerrar, todas las recetas vuelven a 1 (el autor, 2026-10-17).
      this.times.clear();
    }
    this.onToggle?.(open);
    if (open) this.render(this.current());
  }

  /**
   * Abre el panel con las recetas de la estacion que se acaba de usar, en la
   * pagina de recetas (decision del autor: solo se ven al usarla).
   */
  openStation(station: Station): void {
    this.setMode(station);
    this.page = 'recetas';
    this.renderPage();
    if (this.panel.hidden) this.toggle();
    else this.render(this.current());
  }

  /** De donde son las recetas que se ven ahora. */
  get station(): Station {
    return this.mode;
  }

  private setMode(station: Station): void {
    if (station === this.mode && this.category) return;
    this.mode = station;
    this.cancelHold();
    this.qtyHold = null;
    this.recipeTitle.textContent = station === Station.Hand ? 'Recetas' : STATION_NAMES[station];
    this.buildRecipes();
  }

  private setOthers(open: boolean): void {
    document.body.classList.toggle('others-open', open);
    this.others.classList.toggle('open', open);
    this.others.setAttribute('aria-expanded', String(open));
  }

  /** Las peticiones pendientes, que se vacian. Las recoge el bucle. */
  take(): ItemRequests {
    const out = this.pending;
    this.pending = InventoryUi.none();
    if (out.select >= 0) this.sent.select++;
    if (out.craft >= 0) this.sent.craft++;
    if (out.moveFrom >= 0) this.sent.move++;
    if (out.discard >= 0) this.sent.discard++;
    if (out.stow >= 0) this.sent.stow++;
    if (out.splitFrom >= 0) this.sent.split++;
    if (out.destroy >= 0) this.sent.destroy++;
    if (out.useSlot >= 0) this.sent.use++;
    return out;
  }

  /**
   * Cada frame, la receta mantenida se carga. No hay avisos en pantalla
   * —«necesitas un pico», «inventario lleno», «fabricado»—: el autor los quito
   * todos el 2026-09-29. Lo que no cabe cae al suelo (el autor, 2026-10-18).
   */
  frame(): void {
    // Lejos de su estacion, su panel se cierra solo (decision del autor), con
    // la misma cuenta con que el nucleo decide si se puede fabricar ahi.
    if (this.mode !== Station.Hand && this.open) {
      const s = this.current();
      const id = s.playerId;
      const eye = { x: s.entities.x[id], y: s.entities.y[id], z: s.entities.z[id] + EYE_HEIGHT };
      if (!stationNear(s.world, eye, this.mode, (tx, ty) => hitboxAt(s.world, tx, ty))) this.toggle();
    }
    if (this.hold) {
      const t = Math.min(1, (now() - this.hold.since) / CRAFT_HOLD_MS);
      (this.hold.row.querySelector('.charge') as HTMLElement).style.width = `${t * 100}%`;
      if (t >= 1) {
        this.pending.craft = this.hold.recipe;
        this.pending.craftTimes = this.timesOf(this.hold.recipe);
        this.cancelHold();
      }
    }
    this.repeatQty();
  }

  /** El + o - mantenido da los pasos que le tocan; lo para su tope, que apaga el boton. */
  private repeatQty(): void {
    const q = this.qtyHold;
    if (!q) return;
    const due = qtySteps(now() - q.since);
    while (q.done < due && !q.button.disabled) {
      this.stepTimes(q.recipe, q.step);
      q.done++;
    }
    if (q.button.disabled) this.qtyHold = null;
  }

  private stepTimes(recipe: number, step: number): void {
    this.times.set(recipe, this.timesOf(recipe) + step);
    this.render(this.current());
  }

  // ------------------------------------------------------------ casillas

  private slotButton(slot: number): HTMLElement {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'slot';
    b.dataset.slot = String(slot);
    return b;
  }

  /**
   * Pinta una casilla: su icono en pixelart (el autor, 2026-10-17: el icono
   * en vez del nombre, que queda al pasar el raton) y, encima, abajo a la
   * izquierda, solo el numero; una herramienta o un arma, su desgaste; y un
   * bolso, nada, porque va de uno en uno.
   */
  private paint(el: HTMLElement, item: Resource | null, count: number, wear: number): void {
    el.replaceChildren();
    el.classList.toggle('empty', item === null);
    if (item === null) {
      el.title = 'Vacia';
      return;
    }
    el.appendChild(itemIcon(item));
    const tool = toolStats(item);
    if (tool) {
      // Entera, no se ve (el autor, 2026-10-17: nueva, o reparada cuando la
      // haya).
      if (wear >= tool.uses) {
        el.title = RESOURCE_NAMES[item];
        return;
      }
      const bar = document.createElement('i');
      bar.className = 'wear';
      bar.style.width = `${(wear / tool.uses) * 100}%`;
      el.appendChild(bar);
    } else if (stackMax(item) > 1) {
      const n = document.createElement('em');
      n.textContent = String(count);
      el.appendChild(n);
    }
    el.title = RESOURCE_NAMES[item];
  }

  /**
   * Arrastrar con raton o dedo. Pasado `DRAG_SLOP`, la casilla se lleva como
   * una etiqueta que sigue al puntero. Al soltar (el autor, 2026-10-18):
   * - sobre otra casilla —de la rejilla o de la barra— la mueve (apila o
   *   intercambia);
   * - desde la barra, sobre el boton INVENTARIO, la guarda en el resto del
   *   inventario (`stow`);
   * - desde la barra, en cualquier otro sitio, este el panel abierto o no, **la
   *   tira**, sin preguntar;
   * - desde el panel, fuera del panel y de la barra, la tira, sin preguntar.
   * Sin moverse es un toque: en la barra elige la mano, en la rejilla describe
   * el objeto.
   */
  private bindDrag(el: HTMLElement, slot: number, bar: boolean): void {
    const grid = el.dataset.grid === '1';
    el.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      const d = {
        slot, bar, x: e.clientX, y: e.clientY, moving: false, el, over: null, timer: 0, held: false,
        since: e.timeStamp, scroll: null as { y: number; top: number } | null,
      };
      this.drag = d;
      // En el movil cada casilla de la rejilla responde solo en su centro (el
      // autor, 2026-10-19): un dedo que empieza en el anillo desliza la
      // rejilla. Se decide aqui, por geometria, y no dejando el anillo sin
      // eventos: el navegador acerca el dedo a lo pulsable (el ajuste de
      // toque) y el anillo acababa igual en la casilla.
      if (grid && e.pointerType === 'touch' && !inCore(e.clientX, e.clientY, el.getBoundingClientRect(), TOUCH_CORE)) {
        d.scroll = { y: e.clientY, top: this.grid.scrollTop };
      }
      // En el movil, mantener una casilla de la rejilla abre su menu (el autor:
      // 0,3 s); soltar antes es un toque, que la describe.
      if (grid && e.pointerType === 'touch' && !d.scroll) {
        d.timer = window.setTimeout(() => {
          if (this.drag !== d || d.moving) return;
          d.held = true;
          this.pick(slot);
          this.openMenu(slot);
        }, MENU_HOLD_MS);
      }
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        // Sin captura sigue funcionando mientras el puntero no salga.
      }
    });
    el.addEventListener('pointermove', (e) => {
      const d = this.drag;
      if (!d || d.el !== el) return;
      if (d.scroll) {
        this.grid.scrollTop = d.scroll.top - (e.clientY - d.scroll.y);
        return;
      }
      if (!d.moving) {
        if (Math.hypot(e.clientX - d.x, e.clientY - d.y) < DRAG_SLOP) return;
        window.clearTimeout(d.timer);
        const item = this.current().inventory.itemAt(slot);
        if (item === null) return;
        d.moving = true;
        // Arrastrar cierra el menu (el autor).
        this.closeMenu();
        el.classList.add('dragging');
        this.ghost.replaceChildren(itemIcon(item));
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
      window.clearTimeout(d.timer);
      el.classList.remove('dragging');
      d.over?.classList.remove('drop');
      this.ghost.style.display = 'none';
      if (d.scroll) return;
      // Con la pagina ocupada, el plazo puede correr antes de atender un
      // soltar que llego a tiempo: lo que cuenta es cuanto se mantuvo el dedo,
      // por la hora de cada evento. Si no llego a 0,3 s, era un toque.
      if (d.held && !d.moving && !cancelled && e.timeStamp - d.since < MENU_HOLD_MS) {
        d.held = false;
        this.closeMenu();
      }
      if (!d.moving) {
        if (cancelled || d.held) return;
        if (d.bar) this.pending.select = slot;
        else this.pick(slot);
        // En PC, el clic en una casilla de la rejilla abre ademas su menu (el autor).
        if (grid && e.pointerType !== 'touch') this.openMenu(slot);
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
      const under = document.elementFromPoint(e.clientX, e.clientY);
      if (d.bar && under && this.invOpen.contains(under)) {
        this.pending.stow = slot;
        return;
      }
      if (!d.bar && !this.open) return;
      if (!under || !(this.panel.contains(under) || this.hotbar.contains(under))) this.pending.discard = slot;
    };
    el.addEventListener('pointerup', (e) => end(e, false));
    el.addEventListener('pointercancel', (e) => end(e, true));
  }

  /** La casilla de la rejilla o de la barra que hay bajo el puntero. */
  private slotAt(x: number, y: number): HTMLElement | null {
    const el = document.elementFromPoint(x, y)?.closest('.slot') as HTMLElement | null;
    if (!el || el.hidden) return null;
    return el.dataset.grid === '1' || el.dataset.bar === '1' || el.dataset.equip === '1' ? el : null;
  }

  /**
   * Elige la casilla que se describe. Si es de la rejilla y no se ve entera
   * —la rejilla quedo deslizada a medias—, la desliza lo justo para que se vea
   * (el autor, 2026-10-19).
   */
  private pick(slot: number): void {
    this.picked = slot;
    const cell = this.grid.children[slot] as HTMLElement | undefined;
    if (cell && this.grid.contains(cell)) {
      this.grid.scrollTop += scrollToShow(cell.getBoundingClientRect(), this.gridView());
    }
    this.render(this.current());
  }

  /** Lo que se ve de la rejilla: su caja sin el borde. */
  private gridView(): { left: number; top: number; right: number; bottom: number } {
    const r = this.grid.getBoundingClientRect();
    const top = r.top + this.grid.clientTop;
    const left = r.left + this.grid.clientLeft;
    return { left, top, right: left + this.grid.clientWidth, bottom: top + this.grid.clientHeight };
  }

  // ------------------------------------------------------------ el menu de una casilla

  /** Los botones de los avisos de Dividir y Destruir, y cerrar el menu tocando fuera. */
  private bindMenu(): void {
    // Tocar fuera del menu lo cierra, y ese toque sigue su curso (el autor):
    // en captura, sin tragarlo.
    document.addEventListener(
      'pointerdown',
      (e) => {
        if (this.menu.hidden) return;
        const t = e.target as Node | null;
        if (t && this.menu.contains(t)) return;
        this.closeMenu();
      },
      true,
    );
    // Y lo mismo los avisos de Dividir y Destruir: tocar fuera es cancelar (el
    // autor, 2026-10-19), y ese toque tambien sigue su curso (*deduccion*).
    document.addEventListener(
      'pointerdown',
      (e) => {
        if (!this.asking) return;
        const t = e.target as Node | null;
        if (t && (this.splitAsk.contains(t) || this.destroyAsk.contains(t))) return;
        this.closeAsk();
      },
      true,
    );
    for (const b of Array.from(this.splitAsk.querySelectorAll<HTMLButtonElement>('[data-add], [data-set]'))) {
      b.addEventListener('click', () => {
        const stack = this.askedStack();
        const now = clampSplit(Number(this.splitQty.value), stack);
        const next = b.dataset.set === 'zero' ? 0 : b.dataset.set === 'half' ? Math.floor(stack / 2) : now + Number(b.dataset.add);
        this.splitQty.value = String(clampSplit(next, stack));
      });
    }
    // Lo escrito se ciñe a lo que se puede separar al salir del campo.
    this.splitQty.addEventListener('change', () => {
      this.splitQty.value = String(clampSplit(Number(this.splitQty.value), this.askedStack()));
    });
    byId('splitNo').addEventListener('click', () => this.closeAsk());
    byId('splitYes').addEventListener('click', () => {
      const a = this.asking;
      const n = clampSplit(Number(this.splitQty.value), this.askedStack());
      if (a && n > 0 && this.stillHolds(a.slot, a.item)) {
        this.pending.splitFrom = a.slot;
        this.pending.splitCount = n;
      }
      this.closeAsk();
    });
    byId('destroyNo').addEventListener('click', () => this.closeAsk());
    byId('destroyYes').addEventListener('click', () => {
      const a = this.asking;
      // Si entretanto la casilla cambio de objeto, no se destruye: se confirmo destruir OTRA cosa.
      if (a && this.stillHolds(a.slot, a.item)) this.pending.destroy = a.slot;
      this.closeAsk();
    });
  }

  /** La pila de la casilla del aviso abierto, o 0. */
  private askedStack(): number {
    const a = this.asking;
    return a && this.stillHolds(a.slot, a.item) ? this.current().inventory.counts[a.slot] : 0;
  }

  private stillHolds(slot: number, item: Resource): boolean {
    return this.current().inventory.itemAt(slot) === item;
  }

  /** Abre el menu de una casilla de la rejilla, con las opciones de su objeto, al lado de ella. */
  private openMenu(slot: number): void {
    const inv = this.current().inventory;
    const item = inv.itemAt(slot);
    if (item === null || !this.open) return;
    this.closeAsk();
    this.menuFor = { slot, item };
    this.menu.replaceChildren();
    for (const option of optionsFor(item)) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn';
      b.dataset.option = option;
      const label = document.createElement('span');
      label.textContent = OPTION_LABELS[option];
      b.appendChild(label);
      // Dividir sin casilla libre, o con una pila de 1, sale apagado (el autor; lo segundo, *deduccion*).
      if (option === 'split' && (inv.firstFree() < 0 || inv.counts[slot] < 2)) {
        b.classList.add('off');
        b.disabled = true;
      }
      b.addEventListener('click', () => this.choose(option));
      this.menu.appendChild(b);
    }
    this.menu.hidden = false;
    this.placeMenuAt(slot);
  }

  /** Coloca el menu al lado de su casilla (`placeMenu`), en coordenadas del panel. */
  private placeMenuAt(slot: number): void {
    const cell = (this.grid.children[slot] as HTMLElement).getBoundingClientRect();
    const box = this.menu.getBoundingClientRect();
    const at = placeMenu(slot, cell, this.gridView(), { width: box.width, height: box.height });
    const panel = this.panel.getBoundingClientRect();
    this.menu.style.left = `${(at.left - panel.left - this.panel.clientLeft).toFixed(1)}px`;
    this.menu.style.top = `${(at.top - panel.top - this.panel.clientTop).toFixed(1)}px`;
    this.menu.dataset.side = at.side;
    this.menu.dataset.align = at.align;
  }

  private closeMenu(): void {
    this.menuFor = null;
    this.menu.hidden = true;
  }

  private closeAsk(): void {
    this.asking = null;
    this.splitAsk.hidden = true;
    this.destroyAsk.hidden = true;
  }

  /** Lo que hace cada opcion: Usar y Equipar en el acto; Dividir y Destruir preguntan. */
  private choose(option: ItemOption): void {
    const m = this.menuFor;
    this.closeMenu();
    if (!m || !this.stillHolds(m.slot, m.item)) return;
    if (option === 'use') this.pending.useSlot = m.slot;
    else if (option === 'equip') {
      const e = equipOf(m.item);
      if (e !== null) {
        this.pending.moveFrom = m.slot;
        this.pending.moveTo = equipSlot(e);
      }
    } else if (option === 'split') {
      this.asking = { ...m, kind: 'split' };
      this.splitQty.value = '0';
      this.splitAsk.hidden = false;
    } else {
      this.asking = { ...m, kind: 'destroy' };
      const count = this.current().inventory.counts[m.slot];
      this.destroyText.textContent =
        stackMax(m.item) === 1 ? `¿Destruir ${RESOURCE_NAMES[m.item]}?` : `¿Destruir ${count} × ${RESOURCE_NAMES[m.item]}?`;
      this.destroyAsk.hidden = false;
    }
  }

  /** Lo que el humo mira del menu: si esta abierto, de que casilla, sus opciones y como se coloco. */
  get menuState(): { open: boolean; slot: number; options: string[]; side: string; align: string; asking: string | null } {
    return {
      open: !this.menu.hidden,
      slot: this.menuFor?.slot ?? -1,
      options: Array.from(this.menu.children).map((b) => (b as HTMLElement).dataset.option ?? ''),
      side: this.menu.dataset.side ?? '',
      align: this.menu.dataset.align ?? '',
      asking: this.asking?.kind ?? null,
    };
  }

  // ------------------------------------------------------------ recetas

  /** Las categorias de las recetas del modo, y la lista de la primera. */
  private buildRecipes(): void {
    this.recipeTabs.replaceChildren();
    const categories = [...new Set(RECIPES.filter((r) => r.station === this.mode).map((r) => r.category))];
    this.category = categories[0] ?? '';
    for (let i = 0; i < CATEGORY_SLOTS; i++) {
      const tab = document.createElement('button');
      tab.type = 'button';
      tab.className = 'btn slot';
      const cat = categories[i];
      if (cat) {
        // Su icono, monocromo (el autor, 2026-10-17); el nombre, al pasar el
        // raton y para el lector de pantalla.
        tab.dataset.category = cat;
        tab.title = cat;
        tab.setAttribute('aria-label', cat);
        const art = categoryArt(cat);
        if (art) tab.appendChild(pixelIcon(art, 'catIcon'));
        else tab.appendChild(textSpan(cat));
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
      tab.classList.toggle('on', (tab as HTMLElement).dataset.category === this.category),
    );
    RECIPES.forEach((recipe, i) => {
      if (recipe.station !== this.mode || recipe.category !== this.category) return;
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
      // + encima de -, a la derecha de los ingredientes (el autor, 2026-10-17).
      const qty = document.createElement('div');
      qty.className = 'qty';
      for (const [label, step] of [['+', 1], ['-', -1]] as const) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'btn';
        b.appendChild(textSpan(label));
        b.setAttribute('aria-label', step > 0 ? 'Una vez mas' : 'Una vez menos');
        // Mantenido, repite y acelera (el autor, 2026-10-17). El primer paso,
        // en el acto; el teclado (un `click` sin puntero) da uno.
        b.addEventListener('pointerdown', (e) => {
          if (e.button !== 0 || b.disabled) return;
          this.qtyHold = { recipe: i, step, since: now(), done: 0, button: b };
          this.repeatQty();
        });
        for (const type of ['pointerup', 'pointerleave', 'pointercancel']) {
          b.addEventListener(type, () => {
            if (this.qtyHold?.button === b) this.qtyHold = null;
          });
        }
        b.addEventListener('click', (e) => {
          if (e.detail === 0) this.stepTimes(i, step);
        });
        qty.appendChild(b);
      }
      row.append(charge, result, ingredients, qty);
      this.bindHold(result, row, i);
      this.recipeList.appendChild(row);
    });
  }

  /**
   * Fabricar: mantener pulsado el resultado. Sin ingredientes no arranca, y
   * sin aviso (decision del autor); sin sitio si, y lo que no cabe cae a los
   * pies (el autor, 2026-10-18). Soltar o salirse antes de tiempo
   * lo cancela.
   */
  private bindHold(el: HTMLElement, row: HTMLElement, recipe: number): void {
    el.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      // Sin ingredientes para las N veces, no arranca.
      if (craftableTimes(this.current().inventory, recipe) < this.timesOf(recipe)) return;
      this.cancelHold();
      this.hold = { recipe, since: now(), row };
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
    this.closeMenu();
    this.closeAsk();
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
    const art = playerArt();
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    // A un multiplo entero de su rejilla, como todo el pixelart (guia de
    // arte, directriz 5): si no, sus pixeles saldrian desiguales.
    const scale = Math.max(1, Math.floor(Math.min(canvas.width / art.canvas.width, canvas.height / art.canvas.height) * 0.9));
    const w = art.canvas.width * scale;
    const h = art.canvas.height * scale;
    ctx.drawImage(art.canvas, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
  }

  /** Repinta la barra y, si esta abierto, el inventario y el recetario. */
  render(state: GameState): void {
    const inv = state.inventory;
    Array.from(this.hotbar.children).forEach((el, i) => {
      this.paint(el as HTMLElement, inv.itemAt(i), inv.counts[i], inv.wear[i]);
    });
    // La pedida y aun sin aplicar manda: si no, entre la muesca y el tick se
    // volveria a encender la de antes.
    this.showSelected(this.pending.select >= 0 ? this.pending.select : inv.selected);
    if (this.panel.hidden) return;

    // Las casillas del Bolso que lo puesto no abre no existen, y no se ven.
    Array.from(this.grid.children).forEach((el, i) => {
      (el as HTMLElement).hidden = !inv.isOpen(i);
      this.paint(el as HTMLElement, inv.itemAt(i), inv.counts[i], inv.wear[i]);
      // La rejilla no repite la luz de la barra (pedido del autor, 2026-10-01):
      // aunque su primera fila sean esas mismas casillas.
      el.classList.toggle('picked', this.picked === i);
    });
    for (const worn of this.wornSlots) {
      const item = inv.itemAt(worn.slot);
      this.paint(worn.el, item, 1, inv.wearAt(worn.slot));
      worn.el.classList.toggle('picked', this.picked === worn.slot);
      // Vacio, su icono dice que va ahi; equipado, el icono se oculta (el
      // autor). El nombre solo queda al pasar el raton.
      if (item === null) {
        worn.el.appendChild(worn.icon);
        worn.el.title = worn.name;
      }
    }

    // Lo elegido se describe en su pagina: lo equipado en PERSONAJE, lo
    // demas en INVENTARIO. La otra zona se queda vacia.
    const onBody = this.wornSlots.some((w) => w.slot === this.picked);
    const item = this.picked >= 0 ? inv.itemAt(this.picked) : null;
    this.describe(this.selSlot, this.selDesc, onBody ? null : item, onBody ? 0 : this.picked);
    this.describe(this.charSelSlot, this.charSelDesc, onBody ? item : null, this.picked);

    for (const row of Array.from(this.recipeList.children) as HTMLElement[]) {
      const recipe = Number(row.dataset.recipe);
      const r = RECIPES[recipe];
      // Las veces elegidas con + y -, entre 1 y lo que alcanza (el autor,
      // 2026-10-17). Si deja de alcanzar, baja sola (*deduccion*).
      const most = craftableTimes(inv, recipe);
      const times = Math.max(1, Math.min(this.timesOf(recipe), most));
      this.times.set(recipe, times);
      let ok = true;
      // El resultado dice lo que sale en total (el autor: «en el resultado»).
      this.paint(row.querySelector('.result') as HTMLElement, r.output, r.count * times, toolStats(r.output)?.uses ?? 0);
      const cells = Array.from(row.querySelectorAll('.ingredients .slot')) as HTMLElement[];
      cells.forEach((cell, k) => {
        const input = r.inputs[k];
        cell.replaceChildren();
        if (!input) return;
        const have = inv.count(input.item);
        const need = input.count * times;
        if (have < need) ok = false;
        const n = document.createElement('em');
        n.textContent = `${Math.min(have, need)}/${need}`;
        cell.append(itemIcon(input.item), n);
        cell.title = RESOURCE_NAMES[input.item];
      });
      row.classList.toggle('missing', !ok);
      // + y -: solo en lo apilable (el autor), y cada uno hasta su tope.
      const stacks = stackMax(r.output) > 1;
      const [more, less] = Array.from(row.querySelectorAll<HTMLButtonElement>('.qty button'));
      more.disabled = !stacks || times >= most;
      less.disabled = !stacks || times <= 1;
      row.querySelector('.qty')?.classList.toggle('off', !stacks);
    }
  }

  /**
   * Pinta una zona de lo seleccionado. Sin objeto —casilla vacia o nada
   * elegido— la descripcion se limpia; antes se quedaba la del ultimo tocado.
   */
  private describe(slotEl: HTMLElement, descEl: HTMLElement, item: Resource | null, slot: number): void {
    const inv = this.current().inventory;
    const count = item === null ? 0 : stackMax(item) === 1 ? 1 : inv.counts[slot];
    this.paint(slotEl, item, count, item === null ? 0 : inv.wearAt(slot));
    descEl.replaceChildren();
    if (item === null) return;
    const title = document.createElement('b');
    title.textContent = RESOURCE_NAMES[item];
    descEl.append(title, DESCRIPTIONS[item] ?? '');
  }
}

/**
 * El texto de un boton va en su propio `<span>` (el estandar de los botones,
 * 2026-10-18): pulsado, baja lo de dentro, y un texto suelto no se puede mover.
 */
function textSpan(text: string): HTMLSpanElement {
  const span = document.createElement('span');
  span.textContent = text;
  return span;
}
