/**
 * Sprites con la profundidad de su cuerpo, pixel a pixel.
 *
 * Un sprite de three.js es una lamina plana de cara a la camara, y cada pixel
 * de la lamina usa su propia profundidad: la de la lamina. Pegado a una pared,
 * la parte que sobresale de lado entra en el bloque de al lado y la cara de
 * ese bloque la tapa (lo vio el autor, 2026-10-03).
 *
 * **Cada pixel toma la profundidad que tendria el cuerpo de verdad.** El
 * cuerpo es una caja (`body-ray.ts`): su largo a lo largo de hacia donde mira,
 * su ancho y su alto. En el fragment shader, el rayo de la camara que pasa por
 * ese pixel se corta contra la caja, y la profundidad del punto donde entra es
 * la que se escribe en `gl_FragDepth`. Asi el terreno tapa del dibujo justo lo
 * que taparia de un cuerpo: ni lo que tiene al lado ni lo que tiene detras, y
 * si lo que esta de verdad delante. La tinta cuyo rayo no toca la caja —una
 * oreja, una cornamenta— toma la del punto de la caja mas cercano a su rayo:
 * siempre la del cuerpo, nunca la de la lamina.
 *
 * Sustituye a «la lamina entera con la profundidad de un punto adelantado»
 * (`e3d3de6`), que dejaba ver a un bisonte a traves de una cornisa: para no
 * cortar su dibujo de perfil se adelantaba 1,45 bloques.
 *
 * Hoy lo usa **solo el jugador** (`billboards.ts`), con su caja cuadrada. Los
 * animales lo usaron hasta el 2026-10-03; desde entonces son modelos de
 * bloques (`fauna-model.ts`) con su profundidad de verdad. La sonda
 * (`sprite-depth-probe.ts`) mide el del jugador.
 */

import { SpriteMaterial, Vector2, Vector3, type SpriteMaterialParameters } from 'three';

/** La linea del vertex shader de three.js 0.170 tras la que se calcula la caja. */
export const PROJECT_LINE = 'gl_Position = projectionMatrix * mvPosition;';
/** La linea del fragment shader tras la que se escribe la profundidad: despues del descarte. */
export const ALPHA_TEST_LINE = '#include <alphatest_fragment>';

const VARYINGS = `
varying vec3 vBodyView;
varying vec3 vBodyCenter;
varying vec3 vBodyLong;
varying vec3 vBodyUp;
varying vec3 vBodySide;
`;

/**
 * El vertex shader entrega, en espacio de vista, el punto de la lamina y la
 * caja: su centro (el ancla del sprite mas `bodyLift` en la vertical) y sus
 * tres ejes (el rumbo, la vertical y el costado).
 */
const BODY_VERTEX = `
gl_Position = projectionMatrix * mvPosition;
vBodyView = mvPosition.xyz;
vBodyCenter = modelViewMatrix[ 3 ].xyz + ( viewMatrix * vec4( 0.0, bodyLift, 0.0, 0.0 ) ).xyz;
vBodyLong = ( viewMatrix * vec4( bodyFacing.x, 0.0, bodyFacing.y, 0.0 ) ).xyz;
vBodyUp = ( viewMatrix * vec4( 0.0, 1.0, 0.0, 0.0 ) ).xyz;
vBodySide = ( viewMatrix * vec4( - bodyFacing.y, 0.0, bodyFacing.x, 0.0 ) ).xyz;
`;

/**
 * El fragment shader corta el rayo con la caja (slab test en sus ejes), como
 * `rayBodyBox`, y si no la toca usa `nearestOnBox`. En perspectiva el rayo
 * sale del ojo; en ortografica, del plano de la camara y en paralelo.
 */
const BODY_FRAGMENT = `
#include <alphatest_fragment>
vec3 bodyO = isOrthographic ? vec3( vBodyView.xy, 0.0 ) : vec3( 0.0 );
vec3 bodyD = isOrthographic ? vec3( 0.0, 0.0, - 1.0 ) : normalize( vBodyView );
vec3 bodyP = bodyO - vBodyCenter;
vec3 bodyLo = vec3( dot( bodyP, vBodyLong ), dot( bodyP, vBodyUp ), dot( bodyP, vBodySide ) );
vec3 bodyLd = vec3( dot( bodyD, vBodyLong ), dot( bodyD, vBodyUp ), dot( bodyD, vBodySide ) );
bodyLd = mix( bodyLd, vec3( 1e-6 ), vec3( lessThan( abs( bodyLd ), vec3( 1e-6 ) ) ) );
vec3 bodyT0 = ( - bodyHalf - bodyLo ) / bodyLd;
vec3 bodyT1 = ( bodyHalf - bodyLo ) / bodyLd;
vec3 bodyTn = min( bodyT0, bodyT1 );
vec3 bodyTf = max( bodyT0, bodyT1 );
float bodyNear = max( max( bodyTn.x, bodyTn.y ), max( bodyTn.z, 0.0 ) );
float bodyFar = min( min( bodyTf.x, bodyTf.y ), bodyTf.z );
vec3 bodyHit;
if ( bodyNear <= bodyFar ) {
  bodyHit = bodyO + bodyD * bodyNear;
} else {
  vec3 bodyQ = bodyO + bodyD * max( 0.0, dot( vBodyCenter - bodyO, bodyD ) ) - vBodyCenter;
  vec3 bodyK = clamp( vec3( dot( bodyQ, vBodyLong ), dot( bodyQ, vBodyUp ), dot( bodyQ, vBodySide ) ), - bodyHalf, bodyHalf );
  bodyHit = vBodyCenter + vBodyLong * bodyK.x + vBodyUp * bodyK.y + vBodySide * bodyK.z;
}
vec4 bodyClip = projectionMatrix * vec4( bodyHit, 1.0 );
gl_FragDepth = clamp( bodyClip.z / bodyClip.w * 0.5 + 0.5, 0.0, 1.0 );
`;

/** Lo que mide un cuerpo, en bloques. */
export interface BodySize {
  /** Cuanto sube el centro de la caja sobre el ancla del sprite. */
  lift: number;
  halfLength: number;
  halfHeight: number;
  halfWidth: number;
}

/** Un `SpriteMaterial` con su cuerpo: `facing` es su rumbo en el suelo (`x`, `z`). */
export type BodySpriteMaterial = SpriteMaterial & { readonly facing: Vector2 };

/** Los materiales cuya reescritura no encontro sus lineas: el humo lo lee. */
export const depthPatchMisses: string[] = [];

/** Un `SpriteMaterial` con la profundidad de la caja de su cuerpo. */
export function bodySpriteMaterial(params: SpriteMaterialParameters, size: BodySize): BodySpriteMaterial {
  const material = new SpriteMaterial(params) as BodySpriteMaterial;
  const facing = new Vector2(1, 0);
  Object.defineProperty(material, 'facing', { value: facing });
  const lift = { value: size.lift };
  const half = { value: new Vector3(size.halfLength, size.halfHeight, size.halfWidth) };
  const facingUniform = { value: facing };
  material.onBeforeCompile = (shader) => {
    if (!shader.vertexShader.includes(PROJECT_LINE) || !shader.fragmentShader.includes(ALPHA_TEST_LINE)) {
      // Una version de three.js con otro shader: se queda como un sprite normal
      // y se avisa, en vez de romper el dibujo.
      depthPatchMisses.push(material.uuid);
      console.warn('sprite-depth: el shader del sprite no trae las lineas esperadas; sin profundidad del cuerpo');
      return;
    }
    shader.uniforms.bodyLift = lift;
    shader.uniforms.bodyHalf = half;
    shader.uniforms.bodyFacing = facingUniform;
    shader.vertexShader = shader.vertexShader
      .replace('void main() {', `uniform float bodyLift;\nuniform vec2 bodyFacing;\n${VARYINGS}\nvoid main() {`)
      .replace(PROJECT_LINE, BODY_VERTEX);
    shader.fragmentShader = shader.fragmentShader
      .replace('void main() {', `uniform mat4 projectionMatrix;\nuniform vec3 bodyHalf;\n${VARYINGS}\nvoid main() {`)
      .replace(ALPHA_TEST_LINE, BODY_FRAGMENT);
  };
  // Un solo programa para todos los sprites con cuerpo; los numeros de cada
  // uno van en sus uniformes, que three.js guarda por material.
  material.customProgramCacheKey = () => 'verdant-sprite-body';
  return material;
}
