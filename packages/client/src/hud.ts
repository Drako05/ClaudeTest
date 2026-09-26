/**
 * El HUD: salud y hambre, inventario, reloj, el panel del entorno y el aviso de
 * muerte.
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
    healthText: byId('healthText'),
    healthFill: byId('healthFill'),
    hungerText: byId('hungerText'),
    hungerFill: byId('hungerFill'),
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

  /** `current` da el estado vigente: al reiniciar la partida se sustituye. */
  constructor(private readonly current: () => GameState) {
    // El panel del entorno se despliega y repliega con el mismo boton.
    this.el.statsToggle.addEventListener('click', () => {
      const open = this.el.statsPanel.hidden;
      this.el.statsPanel.hidden = !open;
      this.el.statsToggle.classList.toggle('open', open);
      this.el.statsToggle.setAttribute('aria-expanded', String(open));
      if (open) this.updateStats(this.current());
    });
  }

  /** Si el aviso de muerte esta a la vista. */
  get deadShown(): boolean {
    return this.el.dead.classList.contains('show');
  }

  update(state: GameState, fps: number, draw: string): void {
    const { entities, playerId, inventory } = state;
    const health = entities.health[playerId];
    const hunger = entities.hunger[playerId];
    const el = this.el;

    el.healthText.textContent = String(Math.ceil(health));
    el.healthFill.style.width = `${Math.max(0, health)}%`;
    el.hungerText.textContent = String(Math.ceil(hunger));
    el.hungerFill.style.width = `${Math.max(0, hunger)}%`;

    el.wood.textContent = String(inventory[Resource.Wood]);
    el.stone.textContent = String(inventory[Resource.Stone]);
    el.berries.textContent = String(inventory[Resource.Berries]);
    el.treeSeed.textContent = String(inventory[Resource.TreeSeed]);
    el.plantSeed.textContent = String(inventory[Resource.PlantSeed]);
    el.coal.textContent = String(inventory[Resource.Coal]);
    el.iron.textContent = String(inventory[Resource.Iron]);
    el.copper.textContent = String(inventory[Resource.Copper]);

    el.clock.textContent = clockLabel(state.tick);
    el.day.textContent = String(dayNumber(state.tick));
    el.seed.textContent = String(state.world.seed);
    el.pos.textContent = `${Math.floor(entities.x[playerId])}, ${Math.floor(entities.y[playerId])}`;
    el.chunks.textContent = String(state.world.loadedChunkCount);
    // Hasta que cierre la primera ventana de medicion no hay dato que mostrar.
    el.fps.textContent = fps > 0 ? String(Math.round(fps)) : '—';
    el.draw.textContent = draw;

    el.dead.classList.toggle('show', entities.alive[playerId] === 0);
    this.updateStats(state);
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
