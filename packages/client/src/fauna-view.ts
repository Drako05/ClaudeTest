/**
 * La fauna en pantalla: un modelo de bloques por animal materializado del
 * nucleo (decision del autor, 2026-10-03: los billboards no llegaban a un
 * juego pulido).
 *
 * El modelo es el plano de su cuerpo (`fauna-model.ts`), el mismo con que el
 * nucleo golpea y choca, y gira con su rumbo (`facingX`, `facingY`). Las
 * geometrias son por (especie, etapa) y el material, uno para toda la fauna.
 *
 * Como el jugador, se dibuja en la posicion del ultimo tick, sin interpolar:
 * pasean a un bloque por segundo y el salto entre ticks no se ve.
 */

import { Mesh, MeshLambertMaterial, type BufferGeometry, type Scene } from 'three';
import { animalHeight, SPECIES_COUNT, STAGE_COUNT, type Species, type Stage } from '@verdant/shared';
import type { EntityStore } from '@verdant/sim';
import { animalGeometry } from './fauna-model.js';

/** El giro de un modelo en three.js para un rumbo del nucleo: +x del modelo a (fx, fy). */
export function yawOf(facingX: number, facingY: number): number {
  return -Math.atan2(facingY, facingX);
}

export class FaunaView {
  private readonly geometries: BufferGeometry[] = [];
  private readonly material = new MeshLambertMaterial({ vertexColors: true });
  private readonly meshes = new Map<string, Mesh>();
  /** Modelos que se han colocado alguna vez: el humo lo mira crecer. */
  drawnTotal = 0;

  constructor(private readonly scene: Scene) {
    for (let s = 0; s < SPECIES_COUNT; s++) {
      for (let st = 0; st < STAGE_COUNT; st++) this.geometries.push(animalGeometry(s as Species, st as Stage));
    }
  }

  geometryOf(species: Species, stage: Stage): BufferGeometry {
    return this.geometries[species * STAGE_COUNT + stage];
  }

  /** Lo que mide de alto cada modelo y lo que deberia, en bloques. */
  get sizes(): Array<{ species: number; stage: number; modelo: number; caja: number }> {
    const out: Array<{ species: number; stage: number; modelo: number; caja: number }> = [];
    for (let s = 0; s < SPECIES_COUNT; s++) {
      for (let st = 0; st < STAGE_COUNT; st++) {
        const box = this.geometryOf(s as Species, st as Stage).boundingBox!;
        out.push({ species: s, stage: st, modelo: box.max.y - box.min.y, caja: animalHeight(s as Species, st as Stage) });
      }
    }
    return out;
  }

  /**
   * Cuantos animales cuelgan ahora de la escena. Se cuenta en la escena y no
   * en el mapa: un modelo creado y no anadido estaria en el mapa y no se veria
   * (la leccion del contador de «dibujados» de los efectos).
   */
  get count(): number {
    let n = 0;
    for (const mesh of this.meshes.values()) if (mesh.parent === this.scene && mesh.visible) n++;
    return n;
  }

  /** El giro de cada modelo en la escena, por su clave: el humo lo compara con su rumbo. */
  get yaws(): Array<{ key: string; yaw: number }> {
    return [...this.meshes].map(([key, mesh]) => ({ key, yaw: mesh.rotation.y }));
  }

  /**
   * Pone al dia los modelos con la fauna materializada: crea los que faltan,
   * retira los que ya no estan (muertos o lejos) y coloca cada uno en sus pies,
   * girado con su rumbo.
   */
  update(fauna: ReadonlyMap<string, number>, store: EntityStore): void {
    for (const [key, mesh] of this.meshes) {
      if (!fauna.has(key)) {
        this.scene.remove(mesh);
        this.meshes.delete(key);
      }
    }
    for (const [key, id] of fauna) {
      const animal = store.animal[id];
      if (!animal) continue;
      let mesh = this.meshes.get(key);
      if (!mesh) {
        mesh = new Mesh(this.geometryOf(animal.species, animal.stage), this.material);
        this.scene.add(mesh);
        this.meshes.set(key, mesh);
        this.drawnTotal++;
      }
      mesh.position.set(store.x[id], store.z[id], store.y[id]);
      mesh.rotation.y = yawOf(store.facingX[id], store.facingY[id]);
    }
  }

  /** Quita todos los modelos: un mundo nuevo empieza sin la fauna del anterior. */
  clear(): void {
    for (const mesh of this.meshes.values()) this.scene.remove(mesh);
    this.meshes.clear();
  }
}
