/**
 * La forma de cada arbol, tomada de una especie real.
 *
 * El autor pidio dejar de iterar proporciones a ojo: cada arbol del juego toma
 * las de una especie de verdad. **El reparto es suyo** (2026-09-27): bosque =
 * picea comun, bosque raro = alerce en otono, pradera = roble aislado, pradera
 * raro = cerezo japones en flor, tundra = picea negra, tundra raro = picea azul.
 *
 * Y tambien es suyo **que se tome solo la forma**: la relacion ancho:alto de la
 * copa y su silueta salen de la especie real (copa de un ejemplar que crece
 * libre), pero el tamano se queda en unos 3-5 bloques de alto. A tamano real un
 * roble tendria una copa de diez bloques y una picea seria un lapiz de seis.
 * **El alto absoluto de cada copa es deduccion mia** dentro de ese margen, y
 * tambien el numero de pisos.
 *
 * Todo en BLOQUES y sin DOM: `billboards.ts` lo pasa a pixeles de arte, que es
 * suyo el factor, y `tests/tree-shapes.test.ts` lo afirma en Node.
 */

import { Feature } from '@verdant/shared';

export type Silhouette =
  /** Pisos triangulares que estrechan hacia arriba: las piceas y el alerce. */
  | 'cone'
  /** Aguja estrecha de muchos pisos cortos con un penacho arriba: la picea negra. */
  | 'spire'
  /** Cupula ancha de racimos: el roble. */
  | 'dome'
  /** Sombrilla aplanada, mas ancha arriba que abajo: el cerezo. */
  | 'umbrella';

export interface TreeShape {
  /** La especie real de la que sale la forma. */
  readonly species: string;
  readonly silhouette: Silhouette;
  /** Alto de la copa, en bloques. */
  readonly crownH: number;
  /** Ancho de la copa, en bloques. */
  readonly crownW: number;
  /** Pisos de ramas, en las coniferas. */
  readonly tiers: number;
  /**
   * Cuanto del hueco entre pisos se ve, de 0 (pisos solapados, copa densa) a 1.
   * El alerce es el que lo tiene: pierde la aguja y deja ver el tronco.
   */
  readonly open: number;
}

export const TREE_SHAPES: Partial<Record<Feature, TreeShape>> = {
  // Picea abies: cono esbelto, de un tercio largo de ancho que de alto, con las
  // ramas bajas algo caidas.
  [Feature.ForestTree]: {
    species: 'Picea comun (Picea abies)',
    silhouette: 'cone', crownH: 5, crownW: 2, tiers: 5, open: 0,
  },
  // Larix decidua: cono mas abierto y ralo; en otono, dorado y con huecos.
  [Feature.ForestTreeRare]: {
    species: 'Alerce europeo en otono (Larix decidua)',
    silhouette: 'cone', crownH: 4.5, crownW: 2, tiers: 4, open: 0.55,
  },
  // Quercus robur aislado: cupula mas ancha que alta.
  [Feature.MeadowTree]: {
    species: 'Roble aislado (Quercus robur)',
    silhouette: 'dome', crownH: 3.5, crownW: 4.4, tiers: 0, open: 0,
  },
  // Prunus serrulata: sombrilla baja y muy ancha.
  [Feature.MeadowTreeRare]: {
    species: 'Cerezo japones en flor (Prunus serrulata)',
    silhouette: 'umbrella', crownH: 3, crownW: 4.5, tiers: 0, open: 0,
  },
  // Picea mariana: la aguja de la taiga, una cuarta parte de ancha que de alta y
  // con el penacho denso en la punta.
  [Feature.TundraTree]: {
    species: 'Picea negra (Picea mariana)',
    silhouette: 'spire', crownH: 5, crownW: 1.25, tiers: 7, open: 0,
  },
  // Picea pungens: cono denso y regular, algo mas ancho que la comun.
  [Feature.TundraTreeRare]: {
    species: 'Picea azul (Picea pungens)',
    silhouette: 'cone', crownH: 4.5, crownW: 2, tiers: 6, open: 0,
  },
};

/** La forma de ese arbol, o `null` si no es un arbol adulto. */
export function treeShapeOf(feature: Feature): TreeShape | null {
  return TREE_SHAPES[feature] ?? null;
}
