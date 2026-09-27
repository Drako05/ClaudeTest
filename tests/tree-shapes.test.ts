import { describe, expect, it } from 'vitest';
import { Feature } from '@verdant/shared';
import { TREE_SHAPES, treeShapeOf } from '../packages/client/src/tree-shapes.js';

/**
 * Cada arbol con la forma de su especie real (reparto del autor, 2026-09-27),
 * a un tamano de copa de 3-5 bloques. Lo que se dibuja de verdad lo mide el humo
 * sobre el lienzo; aqui se afirma la tabla.
 */
describe('formas de arbol por especie', () => {
  const ratio = (f: Feature): number => {
    const s = treeShapeOf(f)!;
    return s.crownW / s.crownH;
  };

  it('las seis especies de arbol tienen forma, y nada mas', () => {
    const trees = [
      Feature.ForestTree, Feature.ForestTreeRare,
      Feature.MeadowTree, Feature.MeadowTreeRare,
      Feature.TundraTree, Feature.TundraTreeRare,
    ];
    for (const f of trees) expect(treeShapeOf(f)).not.toBeNull();
    expect(Object.keys(TREE_SHAPES)).toHaveLength(6);
    expect(treeShapeOf(Feature.ForestPlant)).toBeNull();
    expect(treeShapeOf(Feature.ForestTreeSapling)).toBeNull();
  });

  it('copas de 3 a 5 bloques de alto, como pidio el autor', () => {
    for (const s of Object.values(TREE_SHAPES)) {
      expect(s!.crownH).toBeGreaterThanOrEqual(3);
      expect(s!.crownH).toBeLessThanOrEqual(5);
    }
  });

  it('las coniferas son mas altas que anchas; los frondosos, al reves', () => {
    for (const f of [Feature.ForestTree, Feature.ForestTreeRare, Feature.TundraTree, Feature.TundraTreeRare]) {
      expect(ratio(f)).toBeLessThan(0.5);
    }
    for (const f of [Feature.MeadowTree, Feature.MeadowTreeRare]) expect(ratio(f)).toBeGreaterThan(1);
  });

  it('la picea negra es la mas estrecha y el cerezo el mas ancho', () => {
    const all = Object.keys(TREE_SHAPES).map(Number) as Feature[];
    const sorted = [...all].sort((a, b) => ratio(a) - ratio(b));
    expect(sorted[0]).toBe(Feature.TundraTree);
    expect(sorted[sorted.length - 1]).toBe(Feature.MeadowTreeRare);
  });
});
