/**
 * Los objetos de un chunk agrupados por especie: una llamada de dibujo por
 * grupo en vez de una por objeto (tanda movil 1, 2026-10-24).
 *
 * En el telefono del autor los FPS eran los mismos a 2x que a 1x: a la media
 * no le pesaban los pixeles sino las llamadas, cientos por chunk, una por aspa
 * y por roca. Cada especie ya compartia geometria y material (`BillboardSet`),
 * y el material es opaco con `alphaTest`, asi que el orden entre instancias no
 * importa: agrupar no cambia nada de lo que se ve.
 */

import { InstancedMesh, type BufferGeometry, type Material, type Mesh } from 'three';

/**
 * Agrupa las mallas por (geometria, material) en un `InstancedMesh` por grupo,
 * cada instancia con la posicion y el giro de su malla. Las mallas no se usan
 * despues: lo que va a la escena son los grupos.
 */
export function batchProps(meshes: readonly Mesh[]): InstancedMesh[] {
  const groups = new Map<BufferGeometry, Map<Material, Mesh[]>>();
  for (const mesh of meshes) {
    const material = mesh.material as Material;
    let byMaterial = groups.get(mesh.geometry);
    if (!byMaterial) groups.set(mesh.geometry, (byMaterial = new Map()));
    let group = byMaterial.get(material);
    if (!group) byMaterial.set(material, (group = []));
    group.push(mesh);
  }

  const out: InstancedMesh[] = [];
  for (const [geometry, byMaterial] of groups) {
    for (const [material, group] of byMaterial) {
      const batch = new InstancedMesh(geometry, material, group.length);
      group.forEach((mesh, i) => {
        mesh.updateMatrix();
        batch.setMatrixAt(i, mesh.matrix);
      });
      batch.instanceMatrix.needsUpdate = true;
      // El recorte por camara, con las instancias y no con la malla de una.
      batch.computeBoundingSphere();
      out.push(batch);
    }
  }
  return out;
}

/**
 * Suelta un grupo: solo su buffer de instancias. La geometria y el material
 * son de la especie y los siguen usando los demas chunks.
 */
export function disposeBatch(batch: InstancedMesh): void {
  batch.dispose();
}
