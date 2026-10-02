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
 * - **Cada estacion tiene sus recetas** (decision del autor, tanda 2): con E se
 *   ven las de mano; al USAR una mesa o un horno se abre este mismo panel con
 *   las suyas, bajo su nombre, y se cierra solo al salir del alcance, medido
 *   hasta su cara (`stationNear`, la misma cuenta con que el nucleo acepta).
 * - **La ropa** se arrastra a su hueco de PERSONAJE —la mochila en el centro
 *   de la columna derecha, el cinturon abajo a la derecha— y abre sus casillas
 *   en la rejilla; las de una prenda que no se lleva no se ven.
 *
 * Nada de esto toca el estado: lo que se pide —elegir casilla, mover, tirar,
 * fabricar— se guarda como peticion y el bucle lo mete en la `Intent` (regla
 * 5). Estas peticiones no se tiran en pausa, al reves que las del mundo.
 */

import { EQUIP_BACK, EQUIP_WAIST, EYE_HEIGHT, HOTBAR_SLOTS, hitboxAt, stationNear, type GameState } from '@verdant/sim';
import {
  RECIPES,
  RESOURCE_NAMES,
  Resource,
  Station,
  STATION_NAMES,
  stackMax,
  toolStats,
} from '@verdant/shared';
import { makePlayerArt } from './art.js';
import { ScrollRail } from './scroll-rail-view.js';

/** Lo que se tarda en fabricar manteniendo pulsado (decision del autor). */
export const CRAFT_HOLD_MS = 1500;
/** Lo que hay que mover el puntero para que un toque sea un arrastre. **Propuesta mia.** */
const DRAG_SLOP = 6;
/** Casillas de equipables: tres a cada lado del personaje y cuatro debajo (boceto del autor). */
const EQUIP_SLOTS = 10;
/**
 * Los huecos de la ropa entre esos diez, por su orden en la rejilla (izquierda
 * y derecha de cada fila, y luego los cuatro de abajo): la mochila en el
 * centro de la derecha y el cinturon abajo a la derecha (decision del autor).
 */
const WORN_AT: Record<number, { slot: number; label: string }> = {
  3: { slot: EQUIP_BACK, label: 'Espalda' },
  5: { slot: EQUIP_WAIST, label: 'Cintura' },
};
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
  [Resource.StoneAxe]: 'Tala arboles. Se gasta con cada golpe util.',
  [Resource.StonePickaxe]: 'Saca piedra, carbon y cobre. Se gasta con cada golpe util.',
  [Resource.CopperIngot]: 'Del horno. Para herramientas y la mochila, en la mesa.',
  [Resource.IronIngot]: 'Del horno. Para las herramientas de hierro, en la mesa.',
  [Resource.CopperAxe]: 'Tala en dos golpes. Se gasta con cada golpe util.',
  [Resource.CopperPickaxe]: 'Mina tambien el hierro. Se gasta con cada golpe util.',
  [Resource.IronAxe]: 'Tala mas deprisa que ninguna. Se gasta con cada golpe util.',
  [Resource.IronPickaxe]: 'El mejor pico. Se gasta con cada golpe util.',
  [Resource.Workbench]: 'En la mano, clic derecho (o USAR) mirando al suelo para ponerla. Usala para ver sus recetas.',
  [Resource.Furnace]: 'En la mano, clic derecho (o USAR) mirando al suelo para ponerlo. Usalo para fundir.',
  [Resource.FiberBag]: 'Arrastrala a la cintura, en PERSONAJE: +2 casillas.',
  [Resource.FrameBackpack]: 'Arrastrala a la espalda, en PERSONAJE: +6 casillas.',
  [Resource.RawMeat]: 'De los animales. Cruda no se come: asala en el horno.',
  [Resource.CookedMeat]: 'Del horno. En la mano, clic derecho (o USAR) para comer: alimenta mas que las bayas.',
  [Resource.Hide]: 'De los mamiferos. Aun no tiene uso.',
  [Resource.Feather]: 'De las gaviotas. Aun no tiene uso.',
  [Resource.Shell]: 'Del cangrejo. Aun no tiene uso.',
};

/** Nombre corto para una casilla, que es estrecha. Sin iconos (decision del autor). */
const SHORT: Record<number, string> = {
  [Resource.TreeSeed]: 'Sem. arbol',
  [Resource.PlantSeed]: 'Sem. planta',
  [Resource.Iron]: 'Min. hierro',
  [Resource.Copper]: 'Min. cobre',
  [Resource.StoneAxe]: 'Hacha piedra',
  [Resource.StonePickaxe]: 'Pico piedra',
  [Resource.CopperIngot]: 'Ling. cobre',
  [Resource.IronIngot]: 'Ling. hierro',
  [Resource.CopperAxe]: 'Hacha cobre',
  [Resource.CopperPickaxe]: 'Pico cobre',
  [Resource.IronAxe]: 'Hacha hierro',
  [Resource.IronPickaxe]: 'Pico hierro',
  [Resource.Workbench]: 'Mesa',
  [Resource.FiberBag]: 'Bolsa',
  [Resource.FrameBackpack]: 'Mochila',
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
  private readonly charSelSlot = byId('charSelSlot');
  private readonly charSelDesc = byId('charSelDesc');
  private readonly recipeTitle = byId('recipeTitle');
  /** Los dos huecos de ropa, con el indice de arrastre de cada uno. */
  private readonly wornSlots: Array<{ el: HTMLElement; slot: number; label: string }> = [];
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
  private category = '';
  /** De donde son las recetas que se ven: a mano (E) o una estacion usada. */
  private mode: Station = Station.Hand;

  /** Peticiones que salieron hacia la `Intent`, para el humo. */
  readonly sent = { select: 0, craft: 0, move: 0, discard: 0 };
  /** Se llama al abrir o cerrar el inventario. */
  onToggle: ((open: boolean) => void) | null = null;

  private static none(): ItemRequests {
    return { select: -1, craft: -1, moveFrom: -1, moveTo: -1, discard: -1 };
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
    // La rejilla del inventario: tocar describe; arrastrar mueve o tira.
    for (let i = 0; i < this.current().inventory.size; i++) {
      const b = this.slotButton(i);
      b.dataset.grid = '1';
      this.bindDrag(b, i, false);
      this.grid.appendChild(b);
    }
    // Los equipables: la rejilla los coloca alrededor del dibujo (CSS de
    // `#charGrid`). Los dos de la ropa se arrastran; los demas, apagados hasta
    // que haya algo que ponerse ahi.
    const charGrid = byId('charGrid');
    for (let i = 0; i < EQUIP_SLOTS; i++) {
      const worn = WORN_AT[i];
      if (worn) {
        const b = this.slotButton(worn.slot);
        b.classList.add('equip');
        b.dataset.equip = '1';
        this.bindDrag(b, worn.slot, false);
        this.wornSlots.push({ el: b, slot: worn.slot, label: worn.label });
        charGrid.appendChild(b);
        continue;
      }
      const b = document.createElement('div');
      b.className = 'slot off equip';
      b.title = 'Equipable (aun sin ropa para aqui)';
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
   * arrastra entre las dos), el boton INVENTARIO (ya alterna) y el dialogo de
   * tirar (deduccion mia).
   */
  private bindTouchOutside(): void {
    let swallowing: number | null = null;
    let swallowClickUntil = 0;
    const inside = (t: EventTarget | null) =>
      t instanceof Element && !!t.closest('#invPanel, #hotbar, #invOpen, #discardAsk');
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
      this.cancelHold();
      this.answer(false);
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
    this.recipeTitle.textContent = station === Station.Hand ? 'Recetas' : STATION_NAMES[station];
    this.buildRecipes();
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
    this.discardText.textContent =
      stackMax(item) === 1
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
    // Lejos de su estacion, su panel se cierra solo (decision del autor), con
    // la misma cuenta con que el nucleo decide si se puede fabricar ahi.
    if (this.mode !== Station.Hand && this.open) {
      const s = this.current();
      const id = s.playerId;
      const eye = { x: s.entities.x[id], y: s.entities.y[id], z: s.entities.z[id] + EYE_HEIGHT };
      if (!stationNear(s.world, eye, this.mode, (tx, ty) => hitboxAt(s.world, tx, ty))) this.toggle();
    }
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

  /**
   * Pinta una casilla: nombre y, abajo a la izquierda, solo el numero; una
   * herramienta, su desgaste; y una prenda, nada, porque va de una en una.
   */
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
    } else if (stackMax(item) > 1) {
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
    if (!el || el.hidden) return null;
    return el.dataset.grid === '1' || el.dataset.bar === '1' || el.dataset.equip === '1' ? el : null;
  }

  private pick(slot: number): void {
    this.picked = slot;
    this.render(this.current());
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
    });
    // La pedida y aun sin aplicar manda: si no, entre la muesca y el tick se
    // volveria a encender la de antes.
    this.showSelected(this.pending.select >= 0 ? this.pending.select : inv.selected);
    if (this.panel.hidden) return;

    // Las casillas de una prenda que no se lleva no existen, y no se ven.
    Array.from(this.grid.children).forEach((el, i) => {
      (el as HTMLElement).hidden = !inv.isOpen(i);
      this.paint(el as HTMLElement, inv.itemAt(i), inv.counts[i], inv.wear[i]);
      // La rejilla no repite la luz de la barra (pedido del autor, 2026-10-01):
      // aunque su primera fila sean esas mismas casillas.
      el.classList.toggle('picked', this.picked === i);
    });
    for (const worn of this.wornSlots) {
      const item = inv.itemAt(worn.slot);
      this.paint(worn.el, item, 1, 0);
      worn.el.classList.toggle('picked', this.picked === worn.slot);
      // Vacio, dice que va ahi.
      if (item === null) {
        const label = document.createElement('span');
        label.className = 'hint';
        label.textContent = worn.label;
        worn.el.appendChild(label);
        worn.el.title = worn.label;
      }
    }

    // Lo elegido se describe en su pagina: una prenda puesta en PERSONAJE, lo
    // demas en INVENTARIO. La otra zona se queda vacia.
    const onBody = this.wornSlots.some((w) => w.slot === this.picked);
    const item = this.picked >= 0 ? inv.itemAt(this.picked) : null;
    this.describe(this.selSlot, this.selDesc, onBody ? null : item, onBody ? 0 : this.picked);
    this.describe(this.charSelSlot, this.charSelDesc, onBody ? item : null, this.picked);

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

  /**
   * Pinta una zona de lo seleccionado. Sin objeto —casilla vacia o nada
   * elegido— la descripcion se limpia; antes se quedaba la del ultimo tocado.
   */
  private describe(slotEl: HTMLElement, descEl: HTMLElement, item: Resource | null, slot: number): void {
    const inv = this.current().inventory;
    const count = item === null ? 0 : stackMax(item) === 1 ? 1 : inv.counts[slot];
    this.paint(slotEl, item, count, item === null ? 0 : inv.wear[slot] ?? 0);
    descEl.replaceChildren();
    if (item === null) return;
    const title = document.createElement('b');
    title.textContent = RESOURCE_NAMES[item];
    descEl.append(title, DESCRIPTIONS[item] ?? '');
  }
}
