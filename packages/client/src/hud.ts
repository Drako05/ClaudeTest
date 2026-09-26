/**
 * La interfaz sobre el mundo: la franja de salud y hambre, el HUD, el
 * inventario, el panel del entorno y el aviso de muerte.
 *
 * Las barras se ven siempre. El HUD, el inventario y el panel del entorno se
 * abren y cierran con su boton, arrancan cerrados, y mientras estan cerrados no
 * se escribe en ellos: el DOM se toca diez veces por segundo y no hay por que
 * pagarlo por lo que no se ve.
 *
 * Es DOM puro sobre el estado del nucleo, y vino tal cual del cliente
 * isometrico: nada de esto sabe que hay una camara.
 */

import {
  BIOME_NAMES,
  EQUILIBRIUM_BAND,
  LIFE_KIND_NAMES,
  LifeKind,
  Resource,
} from '@verdant/shared';
import { clockLabel, dayNumber, toChunkCoord, type GameState } from '@verdant/sim';

function byId(id: string): HTMLElement {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Falta el elemento #${id} en el HTML`);
  return node;
}

/**
 * Una fila de barra del panel, reutilizada entre refrescos.
 *
 * Se construye una vez y despues solo se actualizan sus valores: reconstruir el
 * DOM diez veces por segundo provocaria parpadeos y basura innecesaria.
 */
interface StatRow {
  root: HTMLElement;
  fill: HTMLElement;
  state: HTMLElement;
}

function makeStatRow(container: HTMLElement, label: string): StatRow {
  const root = document.createElement('div');
  root.className = 'statRow';
  root.innerHTML =
    `<div class="label"><span>${label}</span><span class="state">—</span></div>` +
    '<div class="track"><div class="band"></div><div class="fill"></div></div>';
  container.appendChild(root);
  return {
    root,
    fill: root.querySelector('.fill') as HTMLElement,
    state: root.querySelector('.state') as HTMLElement,
  };
}

/** La barra llega hasta 1.5x del referente; el rango sano se marca encima. */
const BAR_SCALE = 1.5;

function updateStatRow(row: StatRow, count: number, reference: number): void {
  if (reference <= 0) {
    row.fill.style.width = '0%';
    row.fill.className = 'fill';
    row.state.className = 'state';
    row.state.textContent = 'sin presencia';
    return;
  }
  const ratio = count / reference;
  row.fill.style.width = `${Math.min(ratio / BAR_SCALE, 1) * 100}%`;

  let mood = 'ok';
  let text = 'en equilibrio';
  if (ratio < 1 - EQUILIBRIUM_BAND) {
    mood = 'low';
    text = 'por debajo';
  } else if (ratio > 1 + EQUILIBRIUM_BAND) {
    mood = 'high';
    text = 'saturado';
  }
  row.fill.className = `fill ${mood}`;
  row.state.className = `state ${mood}`;
  row.state.textContent = text;
}

const KINDS: readonly LifeKind[] = [LifeKind.Tree, LifeKind.Plant, LifeKind.Animal];

export class Hud {
  private readonly el = {
    healthBar: byId('healthBar'),
    healthFill: byId('healthFill'),
    hungerBar: byId('hungerBar'),
    hungerFill: byId('hungerFill'),
    hudToggle: byId('hudToggle'),
    hud: byId('hud'),
    invToggle: byId('invToggle'),
    invPanel: byId('invPanel'),
    wood: byId('wood'),
    stone: byId('stone'),
    berries: byId('berries'),
    treeSeed: byId('treeSeed'),
    plantSeed: byId('plantSeed'),
    coal: byId('coal'),
    iron: byId('iron'),
    copper: byId('copper'),
    statsToggle: byId('statsToggle'),
    statsPanel: byId('statsPanel'),
    biomeName: byId('biomeName'),
    biomeScope: byId('biomeScope'),
    biomeBars: byId('biomeBars'),
    rewardState: byId('rewardState'),
    chunkScope: byId('chunkScope'),
    chunkBars: byId('chunkBars'),
    clock: byId('clock'),
    day: byId('day'),
    seed: byId('seed'),
    pos: byId('pos'),
    chunks: byId('chunks'),
    fps: byId('fps'),
    draw: byId('draw'),
    dead: byId('dead'),
  };
  private readonly biomeRows: StatRow[] = [];
  private readonly chunkRows: StatRow[] = [];

  /** Los dos ultimos datos de rendimiento, para pintar el HUD nada mas abrirlo. */
  private lastFps = 0;
  private lastDraw = '—';

  /** `current` da el estado vigente: al reiniciar la partida se sustituye. */
  constructor(private readonly current: () => GameState) {
    // Cada panel se despliega y repliega con su boton.
    this.el.statsToggle.addEventListener('click', () => this.toggleStats());
    this.el.hudToggle.addEventListener('click', () => this.toggleHud());
    this.el.invToggle.addEventListener('click', () => this.toggleInventory());
  }

  /** Abre o cierra un panel y deja su boton diciendo como esta. */
  private static flip(button: HTMLElement, panel: HTMLElement): boolean {
    const open = panel.hidden;
    panel.hidden = !open;
    button.classList.toggle('open', open);
    button.setAttribute('aria-expanded', String(open));
    return open;
  }

  toggleStats(): void {
    if (Hud.flip(this.el.statsToggle, this.el.statsPanel)) this.updateStats(this.current());
  }

  /** El HUD: solo con su boton, sin tecla (decision del autor). */
  toggleHud(): void {
    const open = Hud.flip(this.el.hudToggle, this.el.hud);
    this.el.hudToggle.setAttribute('aria-label', open ? 'Ocultar informacion' : 'Mostrar informacion');
    if (open) this.updateInfo(this.current());
  }

  /** El inventario: su boton o la tecla I. */
  toggleInventory(): void {
    if (Hud.flip(this.el.invToggle, this.el.invPanel)) this.updateInventory(this.current());
  }

  get hudOpen(): boolean {
    return !this.el.hud.hidden;
  }

  get inventoryOpen(): boolean {
    return !this.el.invPanel.hidden;
  }

  /** Si el aviso de muerte esta a la vista. */
  get deadShown(): boolean {
    return this.el.dead.classList.contains('show');
  }

  update(state: GameState, fps: number, draw: string): void {
    const { entities, playerId } = state;
    const el = this.el;
    this.lastFps = fps;
    this.lastDraw = draw;

    // Las barras, siempre: son lo unico que no se puede ocultar.
    const health = Math.max(0, entities.health[playerId]);
    const hunger = Math.max(0, entities.hunger[playerId]);
    el.healthFill.style.width = `${health}%`;
    el.healthBar.setAttribute('aria-valuenow', String(Math.ceil(health)));
    el.hungerFill.style.width = `${hunger}%`;
    el.hungerBar.setAttribute('aria-valuenow', String(Math.ceil(hunger)));

    el.dead.classList.toggle('show', entities.alive[playerId] === 0);
    if (this.inventoryOpen) this.updateInventory(state);
    if (this.hudOpen) this.updateInfo(state);
    this.updateStats(state);
  }

  private updateInventory(state: GameState): void {
    const { inventory } = state;
    const el = this.el;
    el.wood.textContent = String(inventory[Resource.Wood]);
    el.stone.textContent = String(inventory[Resource.Stone]);
    el.berries.textContent = String(inventory[Resource.Berries]);
    el.treeSeed.textContent = String(inventory[Resource.TreeSeed]);
    el.plantSeed.textContent = String(inventory[Resource.PlantSeed]);
    el.coal.textContent = String(inventory[Resource.Coal]);
    el.iron.textContent = String(inventory[Resource.Iron]);
    el.copper.textContent = String(inventory[Resource.Copper]);
  }

  private updateInfo(state: GameState): void {
    const { entities, playerId } = state;
    const el = this.el;
    el.clock.textContent = clockLabel(state.tick);
    el.day.textContent = String(dayNumber(state.tick));
    el.seed.textContent = String(state.world.seed);
    el.pos.textContent = `${Math.floor(entities.x[playerId])}, ${Math.floor(entities.y[playerId])}`;
    el.chunks.textContent = String(state.world.loadedChunkCount);
    // Hasta que cierre la primera ventana de medicion no hay dato que mostrar.
    el.fps.textContent = this.lastFps > 0 ? String(Math.round(this.lastFps)) : '—';
    el.draw.textContent = this.lastDraw;
  }

  /**
   * Vuelca el estado del entorno en el panel.
   *
   * No se muestran cantidades absolutas a proposito: con el bioma a medio generar
   * no serian significativas. Lo que se ve es cuanto se desvia lo que hay del
   * equilibrio con el que nacio, con el rango sano marcado sobre la barra.
   */
  private updateStats(state: GameState): void {
    const el = this.el;
    if (el.statsPanel.hidden) return;

    const { entities, playerId, world } = state;
    const tileX = Math.floor(entities.x[playerId]);
    const tileY = Math.floor(entities.y[playerId]);
    const cx = toChunkCoord(tileX);
    const cy = toChunkCoord(tileY);
    // El bioma que se anuncia es el del SUELO que pisa el jugador, no el
    // predominante de su chunk (regla 10).
    const standing = world.biomeAt(tileX, tileY);

    if (this.biomeRows.length === 0) {
      for (const kind of KINDS) {
        this.biomeRows.push(makeStatRow(el.biomeBars, LIFE_KIND_NAMES[kind]));
        this.chunkRows.push(makeStatRow(el.chunkBars, LIFE_KIND_NAMES[kind]));
      }
    }

    const biome = world.biomeStats(cx, cy, standing);
    el.biomeName.textContent = BIOME_NAMES[biome.kind] ?? 'Bioma';
    el.biomeScope.textContent =
      `${biome.chunks} chunk${biome.chunks === 1 ? '' : 's'} explorado` +
      `${biome.chunks === 1 ? '' : 's'}${biome.truncated ? ' (parcial)' : ''}`;

    KINDS.forEach((kind, i) => {
      updateStatRow(this.biomeRows[i], biome.count[kind], biome.reference[kind]);
      updateStatRow(
        this.chunkRows[i],
        world.countOf(cx, cy, standing, kind),
        world.referenceOf(cx, cy, standing, kind),
      );
    });

    if (biome.balanced) {
      el.rewardState.className = 'on';
      el.rewardState.textContent = 'Bioma equilibrado: recolectar rinde mas y brotan variantes raras.';
    } else if (biome.overcrowded > 0) {
      el.rewardState.className = 'off';
      el.rewardState.textContent =
        `${biome.overcrowded} chunk${biome.overcrowded === 1 ? '' : 's'} saturado` +
        `${biome.overcrowded === 1 ? '' : 's'}: sin recompensas hasta que la competencia lo corrija.`;
    } else {
      el.rewardState.className = 'off';
      el.rewardState.textContent = 'Bioma fuera de rango: siembra para recuperar las recompensas.';
    }

    el.chunkScope.textContent = `${cx}, ${cy}`;
  }
}
