/**
 * Herramientas de desarrollo.
 *
 * No son un extra: casi todo lo que hay que verificar del ecosistema tarda horas
 * reales —cinco para recuperar un bioma desde cero, dos y media para corregir
 * una saturacion, ocho minutos para que madure un brote—, asi que sin control
 * del tiempo no hay forma de comprobarlo a mano.
 *
 * Estan ocultas salvo que se active `?dev=1` en la URL o se pulse F3. Todo lo de
 * aqui es depuracion, no interfaz de juego.
 */

import { BIOME_NAMES, DAY_TICKS, RESOURCE_NAMES } from '@verdant/shared';

/** Multiplicadores de velocidad del tiempo. */
const SPEEDS: readonly number[] = [0.25, 1, 4, 16, 64];
/** Saltos directos, en ticks del mundo. */
const JUMPS: ReadonlyArray<readonly [string, number]> = [
  ['+1 h', DAY_TICKS / 24],
  ['+6 h', DAY_TICKS / 4],
  ['+1 dia', DAY_TICKS],
];

/** Lineas visibles del registro antes de descartar las mas viejas. */
const LOG_LIMIT = 12;

export interface DevActions {
  /** Salta el tiempo indicado en ticks del mundo. */
  onSkip: (ticks: number) => void;
}

export class DevTools {
  private enabled = false;
  private root: HTMLElement | null = null;
  private logList: HTMLElement | null = null;
  private speedLabel: HTMLElement | null = null;
  private statusLabel: HTMLElement | null = null;

  /** Multiplicador aplicado al tiempo. Cero equivale a pausa. */
  speed = 1;
  paused = false;
  showChunkBorders = false;
  showBiomeBorders = false;
  /**
   * Congela hambre y salud. Empieza puesto porque, sin el, el boton mas util del
   * panel es el que mata: saltar un dia gasta 264 puntos de hambre.
   */
  freezeSurvival = true;

  /** Ultimo estado observado, para deducir que ha cambiado. */
  private lastInventory: number[] | null = null;
  private lastHunger = 0;
  private readonly lines: string[] = [];

  constructor(private readonly actions: DevActions) {
    let start = false;
    try {
      start = new URLSearchParams(window.location.search).get('dev') === '1';
    } catch {
      // Sin acceso a la URL: se activa solo con F3.
    }

    window.addEventListener('keydown', (e) => {
      if (e.code === 'F3') {
        e.preventDefault();
        this.toggle();
      }
    });

    if (start) this.toggle();
  }

  get active(): boolean {
    return this.enabled;
  }

  /**
   * Congelacion efectiva. Con el panel cerrado el juego corre normal, aunque el
   * conmutador se quede puesto para la proxima vez que se abra.
   */
  get survivalFrozen(): boolean {
    return this.enabled && this.freezeSurvival;
  }

  /** Factor por el que multiplicar el tiempo transcurrido en cada frame. */
  get timeScale(): number {
    if (!this.enabled) return 1;
    return this.paused ? 0 : this.speed;
  }

  toggle(): void {
    this.enabled = !this.enabled;
    if (this.enabled && !this.root) this.build();
    if (this.root) this.root.hidden = !this.enabled;
    if (!this.enabled) {
      // Al cerrar se devuelve todo a su sitio: dejar el juego en pausa o a 64x
      // sin panel visible seria desconcertante. La congelacion vuelve a su valor
      // de apertura, y el getter ya se encarga de que no afecte con el panel
      // cerrado.
      this.paused = false;
      this.speed = 1;
      this.showChunkBorders = false;
      this.showBiomeBorders = false;
      this.freezeSurvival = true;
    }
    this.refresh();
  }

  /**
   * Deduce lo ocurrido comparando el estado entre refrescos.
   *
   * Se hace por comparacion y no haciendo que la simulacion emita eventos: asi
   * el nucleo no se entera de que existe un registro y cualquier cosa que mueva
   * un recurso aparece sola. A cambio, solo se ve lo que se refleja en el
   * inventario o en el hambre.
   */
  observe(inventory: readonly number[], hunger: number, biome: number): void {
    if (!this.enabled) {
      this.lastInventory = [...inventory];
      this.lastHunger = hunger;
      return;
    }

    if (this.lastInventory) {
      for (let r = 0; r < inventory.length; r++) {
        const delta = inventory[r] - this.lastInventory[r];
        if (delta !== 0) this.push(`${delta > 0 ? '+' : ''}${delta} ${RESOURCE_NAMES[r]}`);
      }
      // El hambre baja de forma continua; solo interesa cuando pega un salto,
      // que es lo que delata haber comido.
      const hungerDelta = hunger - this.lastHunger;
      if (hungerDelta > 1) this.push(`+${Math.round(hungerDelta)} hambre`);
    }

    this.lastInventory = [...inventory];
    this.lastHunger = hunger;
    if (this.statusLabel) {
      this.statusLabel.textContent = BIOME_NAMES[biome] ?? '—';
    }
  }

  private push(text: string): void {
    this.lines.unshift(text);
    if (this.lines.length > LOG_LIMIT) this.lines.length = LOG_LIMIT;
    if (this.logList) this.logList.textContent = this.lines.join('\n');
  }

  private refresh(): void {
    if (this.speedLabel) {
      this.speedLabel.textContent = this.paused ? 'en pausa' : `${this.speed}x`;
    }
    for (const [key, on] of [
      ['chunks', this.showChunkBorders],
      ['biomes', this.showBiomeBorders],
      ['pause', this.paused],
      ['survival', this.freezeSurvival],
    ] as Array<[string, boolean]>) {
      this.root?.querySelector(`[data-toggle="${key}"]`)?.classList.toggle('on', on);
    }
    const speedButtons = this.root?.querySelectorAll('[data-speed]');
    for (const button of Array.from(speedButtons ?? [])) {
      const value = Number((button as HTMLElement).dataset.speed);
      button.classList.toggle('on', !this.paused && value === this.speed);
    }
  }

  private build(): void {
    const root = document.createElement('div');
    root.id = 'devPanel';
    root.innerHTML = `
      <h2>Desarrollo <span class="hint">F3</span></h2>
      <div class="devGroup">
        <span class="devLabel">Tiempo <b id="devSpeed">1x</b></span>
        <div class="devRow">
          <button data-toggle="pause" type="button">Pausa</button>
          ${SPEEDS.map((v) => `<button data-speed="${v}" type="button">${v}x</button>`).join('')}
        </div>
        <div class="devRow">
          ${JUMPS.map(
            ([label, ticks]) =>
              `<button data-jump="${ticks}" data-jump-label="${label}" type="button">${label}</button>`,
          ).join('')}
        </div>
        <div class="devRow">
          <button data-toggle="survival" type="button">Sin hambre</button>
        </div>
        <p class="devNote">Un salto no simula el movimiento de esas horas.</p>
      </div>
      <div class="devGroup">
        <span class="devLabel">Vista</span>
        <div class="devRow">
          <button data-toggle="chunks" type="button">Bordes de chunk</button>
          <button data-toggle="biomes" type="button">Bordes de bioma</button>
        </div>
        <span class="devLabel">Pisando <b id="devBiome">—</b></span>
      </div>
      <div class="devGroup">
        <span class="devLabel">Registro</span>
        <pre id="devLog"></pre>
      </div>`;
    document.body.appendChild(root);

    this.root = root;
    this.logList = root.querySelector('#devLog');
    this.speedLabel = root.querySelector('#devSpeed');
    this.statusLabel = root.querySelector('#devBiome');

    root.addEventListener('click', (e) => {
      const button = (e.target as HTMLElement).closest('button');
      if (!button) return;

      if (button.dataset.speed) {
        this.speed = Number(button.dataset.speed);
        this.paused = false;
      } else if (button.dataset.jump) {
        this.actions.onSkip(Number(button.dataset.jump));
        // El rotulo del boton, tal cual: un dia del mundo dura ocho minutos
        // reales, asi que traducir los ticks a minutos daria «0 min» para un
        // salto de una hora y no diria nada de lo que acaba de pasar.
        this.push(`salto ${button.dataset.jumpLabel}`);
      } else {
        switch (button.dataset.toggle) {
          case 'pause':
            this.paused = !this.paused;
            break;
          case 'chunks':
            this.showChunkBorders = !this.showChunkBorders;
            break;
          case 'biomes':
            this.showBiomeBorders = !this.showBiomeBorders;
            break;
          case 'survival':
            this.freezeSurvival = !this.freezeSurvival;
            break;
          default:
            break;
        }
      }
      this.refresh();
    });

    this.refresh();
  }
}
