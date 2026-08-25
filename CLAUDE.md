# Notas para agentes que trabajen en este repo

Lee tambien el README: explica la arquitectura y el porque de cada decision.
Esto es el resumen operativo.

## Reglas duras

1. **`packages/sim` jamas toca el navegador.** Sin DOM, canvas, WebGL, PixiJS ni
   `Math.random`. El mismo modulo debe correr en Node (servidor autoritativo,
   tests) y en el navegador. `tests/purity.test.ts` lo verifica.
2. **Toda aleatoriedad viene de una semilla explicita.** Usa `mulberry32` o
   `hash2D` de `packages/sim/src/rng.ts`.
3. **La generacion del mundo es pura.** `generateChunk(gen, cx, cy)` no puede
   depender del orden en que se llame ni de estado previo. Un chunk se descarta y
   se regenera constantemente.
4. **Las mutaciones del jugador van al overlay** de `World.setFeature`, nunca
   escribiendo el array del chunk directamente: el chunk es cache desechable.
5. **El input produce `Intent`; nunca muta el estado.** Es lo que permitira
   enviar esa misma Intent por red sin reescribir nada. Teclado y tactil son dos
   fuentes que alimentan la misma estructura; anadir mas no debe cambiar el
   nucleo.
6. **La vista es isometrica y vive solo en el cliente.** La transformacion esta
   entera en `packages/client/src/projection.ts`. El mundo es una rejilla
   cuadrada: si algo del nucleo necesita saber como se proyecta, es que esta mal
   puesto.
7. **Todo lo que tenga altura va en la capa ordenada por profundidad**
   (`depthOf`), nunca horneado en la textura del chunk; si no, el personaje
   aparecera por delante de cosas que tiene detras.
8. **Paso de tiempo fijo.** La simulacion avanza en incrementos de `TICK_DT`. La
   interpolacion para el render es cosa del cliente.

## El libro del mundo

`docs/el-libro-del-mundo.md` es un documento **del autor del proyecto**. No lo
edites nunca, ni para corregir erratas: contiene su texto literal.

Sus leyes se traducen a tests en `tests/world-laws.test.ts`, y el estado de cada
una se lleva en `docs/leyes.md`, que si mantiene el agente. Al implementar algo
que cumpla o acerque una ley, actualiza esa tabla en el mismo cambio.

Tres leyes condicionan el diseno entero y conviene tenerlas presentes antes de
tocar la simulacion:

- **«El mundo existe independientemente de cualquier observador»** prohibe
  simular solo lo que rodea al jugador. La vida avanza en pasos globales fijos
  (`LIFE_STEP_TICKS`) sobre todos los chunks perturbados a la vez, de modo que
  ponerse al dia de golpe y simular continuamente dan el mismo resultado. Si
  anades un proceso que dependa del orden fino entre chunks, esa equivalencia se
  rompe y el test de independencia del observador te avisara.
- **«Las entidades vivas no surgen automaticamente»** prohibe generar vida de la
  nada. En `sim/life.ts` esta codificado en la aritmetica: con densidad cero el
  crecimiento vale exactamente cero.
- **«Segun su naturaleza, pueden ser finitos, consumibles y renovables»**: no
  todo recurso vuelve. `regrowTicksOf` devuelve 0 para lo finito.

## Antes de dar algo por bueno

```bash
npm run typecheck && npm test && npm run smoke
```

`npm run smoke` construye el cliente y lo juega en Chromium headless leyendo el
estado real por `window.__verdant`. Los tests unitarios no detectan que el juego
no arranque; esto si. Hace dos pasadas, escritorio con teclado y movil con
eventos tactiles sinteticos; si tocas los controles, ambas tienen que seguir
pasando.

Reparto de responsabilidades entre las dos capas de test, que conviene respetar:
la prueba de humo verifica **integracion** (que un toque llega a producir una
Intent y el mundo reacciona), y los tests unitarios verifican **numeros**. Medir
la escala analogica del joystick en el navegador daria un resultado contaminado
por las colisiones con arboles y agua; por eso se mide en
`tests/simulation.test.ts`, sobre una zona abierta verificada.

Ojo con los FPS que reporta la pasada movil: en headless se renderiza por
software a 3x, asi que ese numero no dice nada del rendimiento en un movil real.

## Si tocas la generacion del mundo

Cambiar una escala de ruido invalida los umbrales de bioma, que estan calibrados
contra los percentiles reales de cada campo. Vuelve a medir:

```bash
npx vite-node tools/analyze-world.ts
```

y ajusta los umbrales en `packages/sim/src/worldgen.ts` a la distribucion nueva.
`tests/world-quality.test.ts` falla si algun bioma desaparece, si el jugador
queda encerrado o si el bosque se vuelve intransitable.

## Presupuesto de rendimiento

`tests/performance.test.ts` mide el coste medio de un tick. El limite acordado
son 8 ms; superarlo de forma sostenida es la senal para portar el modulo caliente
a Rust/WASM detras de la misma interfaz, no para empezar a optimizar a ciegas.
