/**
 * Sprites que no se meten detras de lo que tienen al lado.
 *
 * Un sprite de three.js es una lamina plana de cara a la camara, y cada pixel
 * de la lamina usa su propia profundidad. Pegado a una pared o a un tronco, la
 * mitad que sobresale de lado entra en el bloque o el aspa de al lado y la
 * cara de esa cosa la tapa: el animal «se mete detras» (lo vio el autor,
 * 2026-10-03). No es un fallo del dibujo sino de la profundidad.
 *
 * El arreglo: **la lamina entera toma la profundidad de un solo punto**, el
 * centro del cuerpo adelantado hacia la camara medio largo de su dibujo
 * (`depthNearOf`). Asi solo la tapa lo que este de verdad delante del cuerpo
 * —un arbol entre la camara y el animal lo sigue ocultando—, y no lo que tenga
 * al lado o detras. Es el criterio de los juegos de sprites en 3D.
 *
 * Se hace en el vertex shader del sprite: tras proyectar el vertice, su `z` se
 * sustituye por la del punto central, multiplicada por la `w` del vertice para
 * que la division de perspectiva la deje en su sitio. Vale igual en
 * perspectiva y en ortografica. Lo usan los animales (`fauna-view.ts`) y el
 * jugador (`billboards.ts`): decision del autor, el jugador tambien.
 */

import { SpriteMaterial, type SpriteMaterialParameters } from 'three';

/** La linea del shader de three.js 0.170 que se reescribe. */
export const PROJECT_LINE = 'gl_Position = projectionMatrix * mvPosition;';

/**
 * El sustituto: la misma proyeccion, y la profundidad de un punto fijo. El
 * ancla del sprite (`modelViewMatrix[3]`) son sus pies; se sube medio alto en
 * la vertical del mundo y se acerca a la camara `depthNear` en el eje de la
 * vista, que en espacio de vista es +z.
 */
const DEPTH_FROM_CORE = `
gl_Position = projectionMatrix * mvPosition;
vec4 verdantCore = modelViewMatrix[ 3 ];
verdantCore.xyz += ( viewMatrix * vec4( 0.0, depthLift, 0.0, 0.0 ) ).xyz;
verdantCore.z += depthNear;
vec4 verdantCoreClip = projectionMatrix * verdantCore;
gl_Position.z = verdantCoreClip.z / verdantCoreClip.w * gl_Position.w;
`;

/**
 * Cuanto se adelanta hacia la camara el punto de profundidad: **medio largo
 * del dibujo**, y nunca menos que medio ancho de su caja de golpe. **Deduccion
 * mia.** La lamina sobresale de lado medio largo de su dibujo, que en un animal
 * es mucho mas que su cuerpo de colision (un bisonte mide 2,6 de largo con un
 * cuerpo de 0,34 de radio): pegado de lado a un bloque, la cara de ese bloque
 * mas cercana a la camara queda hasta medio bloque por delante de su centro. Lo
 * que este mas cerca de la camara que eso —un arbol entre ella y el animal— lo
 * sigue tapando.
 */
export function depthNearOf(halfLength: number, halfBody: number): number {
  return Math.max(halfLength, halfBody);
}

/** Los materiales cuya reescritura no encontro la linea: el humo lo lee. */
export const depthPatchMisses: string[] = [];

/**
 * Un `SpriteMaterial` con la profundidad del cuerpo. `lift` es cuanto sube el
 * centro sobre los pies (medio alto) y `near`, cuanto se adelanta hacia la
 * camara (medio ancho de su caja), los dos en bloques.
 */
export function depthSafeSpriteMaterial(
  params: SpriteMaterialParameters,
  lift: number,
  near: number,
): SpriteMaterial {
  const material = new SpriteMaterial(params);
  material.onBeforeCompile = (shader) => {
    shader.uniforms.depthLift = { value: lift };
    shader.uniforms.depthNear = { value: near };
    if (!shader.vertexShader.includes(PROJECT_LINE)) {
      // Una version de three.js con otro shader: se queda como un sprite normal
      // y se avisa, en vez de romper el dibujo.
      depthPatchMisses.push(material.uuid);
      console.warn('sprite-depth: el shader del sprite no trae la linea esperada; sin arreglo de profundidad');
      return;
    }
    shader.vertexShader = shader.vertexShader
      .replace('void main() {', 'uniform float depthLift;\nuniform float depthNear;\nvoid main() {')
      .replace(PROJECT_LINE, DEPTH_FROM_CORE);
  };
  // Un solo programa para todos los sprites con el arreglo, distinto del de un
  // sprite normal; los numeros de cada uno van en sus uniformes, que three.js
  // guarda por material.
  material.customProgramCacheKey = () => 'verdant-sprite-depth';
  return material;
}
