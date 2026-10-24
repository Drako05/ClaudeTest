import { describe, expect, it } from 'vitest';
import { BoxGeometry, Matrix4, Mesh, MeshBasicMaterial } from 'three';
import { batchProps } from '../packages/client/src/prop-batch.js';

/**
 * Los objetos de un chunk, agrupados por especie (tanda movil 1, 2026-10-24):
 * una llamada de dibujo por grupo, y cada instancia donde estaba su malla.
 */
describe('Agrupar los objetos de un chunk', () => {
  const tree = new BoxGeometry(1, 3, 1);
  const rock = new BoxGeometry(1, 1, 1);
  const oak = new MeshBasicMaterial();
  const pine = new MeshBasicMaterial();
  const stone = new MeshBasicMaterial();

  /** Tres especies: robles y pinos comparten geometria, la roca no. */
  const meshes = [
    ...[0, 1, 2, 3].map((i) => [tree, oak, i] as const),
    ...[0, 1, 2].map((i) => [tree, pine, i] as const),
    ...[0, 1].map((i) => [rock, stone, i] as const),
  ].map(([geometry, material, i]) => {
    const mesh = new Mesh(geometry, material);
    mesh.position.set(10 + i * 3, 0.5 * i, -4 - i);
    mesh.rotation.y = 0.3 * (i + 1);
    return mesh;
  });

  it('un grupo por especie, con todas sus instancias', () => {
    const batches = batchProps(meshes);
    expect(batches).toHaveLength(3);
    expect(batches.map((b) => b.count).sort()).toEqual([2, 3, 4]);
  });

  it('comparte la geometria y el material de la especie, sin copiarlos', () => {
    const batches = batchProps(meshes);
    const pines = batches.find((b) => b.material === pine)!;
    expect(pines.geometry).toBe(tree);
    expect(batches.find((b) => b.material === stone)!.geometry).toBe(rock);
  });

  it('cada instancia, con la posicion y el giro de su malla', () => {
    const batches = batchProps(meshes);
    const at = new Matrix4();
    for (const batch of batches) {
      const own = meshes.filter((m) => m.geometry === batch.geometry && m.material === batch.material);
      own.forEach((mesh, i) => {
        mesh.updateMatrix();
        batch.getMatrixAt(i, at);
        // El buffer de instancias es de float32.
        at.elements.forEach((e, k) => expect(e).toBeCloseTo(mesh.matrix.elements[k]!, 5));
      });
    }
  });

  it('su esfera envuelve todas las instancias, para el recorte por camara', () => {
    const oaks = batchProps(meshes).find((b) => b.material === oak)!;
    expect(oaks.boundingSphere).not.toBeNull();
    for (const mesh of meshes.filter((m) => m.material === oak)) {
      expect(oaks.boundingSphere!.containsPoint(mesh.position)).toBe(true);
    }
  });
});
