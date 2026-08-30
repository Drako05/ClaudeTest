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
4. **Las mutaciones van al overlay** de `World.setFeature`, nunca escribiendo el
   array del chunk directamente: el chunk es cache desechable. Lo que hay en un
   tile es `override ?? potencial`, y esa es la **unica fuente de verdad**: la
   usan por igual el dibujo, la colision y la recoleccion. Que el renderer leyera
   el potencial crudo por su cuenta fue justo el bug de las plantas que no
   desaparecian al recolectarlas.
5. **El input produce `Intent`; nunca muta el estado.** Es lo que permitira
   enviar esa misma Intent por red sin reescribir nada. Teclado y tactil son dos
   fuentes que alimentan la misma estructura; anadir mas no debe cambiar el
   nucleo. La mirada tambien viaja ahi (`aimX`/`aimY`): con raton la fija el
   cursor, en tactil el joystick, y en reposo se conserva la que hubiera. a tres casillas: la apuntada y sus dos vecinas en el
    anillo de 8 direcciones** (`sim/aim.ts`). De esa unica regla salen los dos
    casos que describio el autor —en recto las flanqueantes quedan en diagonal,
    en diagonal quedan ortogonales— y `tests/aim.test.ts` las tiene todas.
    El area parte de la casilla que se PISA. Antes se apuntaba con
    `floor(pos + mirada * 1.1)`, que pegado al borde de la casilla podia saltar a
    dos de distancia; con tres casillas eso deja de ser inadvertido.
6. **La vista es isometrica y vive solo en el cliente.** La transformacion esta
   entera en `packages/client/src/projection.ts`. El mundo es una rejilla
   cuadrada: si algo del nucleo necesita saber como se proyecta, es que esta mal
   puesto.
7. **Todo lo que tenga altura va en la capa ordenada por profundidad**
   (`depthOf`), nunca horneado en la textura del chunk; si no, el personaje
   aparecera por delante de cosas que tiene detras.
8. **Paso de tiempo fijo.** La simulacion avanza en incrementos de `TICK_DT`. La
   interpolacion para el render es cosa del cliente.
9. **Lo unico que detiene el paso es el agua.** La roca estuvo en
   `isTerrainSolid` y eso convertia el bioma de montana entero en un muro contra
   el que se chocaba; de paso explicaba que no tuviera nada dentro. Si algo tiene
   que estorbar, que sea una feature, no el terreno.
10. **El bioma es del tile, no del chunk.** La contabilidad de vida va por
   `(chunk, bioma, tipo)` y `World.biomeAt` devuelve el bioma del suelo que se
   pisa. Etiquetar el chunk entero con su terreno predominante hacia que el panel
   anunciara «Bosque» estando en pradera y que dos especies distintas compartieran
   referente. Un brote solo puede salir en un tile de su propio bioma.
11. **Un paso de vida lee estado congelado y escribe en otro.** La colonizacion
    mira si hay vida cerca en `ChunkRecord.live`, que es la foto del inicio del
    paso, nunca los vecinos en curso. Leyendo el estado vivo, que un chunk
    arrasado reviviera dependia del orden en que se generaron los chunks —es
    decir, de por donde paseo el jugador—, y eso rompe la ley del observador sin
    que ningun test evidente lo delate.
12. **Una accion afecta a tres casillas: la apuntada y sus dos vecinas en el
    anillo de 8 direcciones** (`sim/aim.ts`). De esa unica regla salen los dos
    casos que describio el autor —en recto las flanqueantes quedan en diagonal,
    en diagonal quedan ortogonales— y `tests/aim.test.ts` las tiene todas. El
    area parte de la casilla que se PISA: antes se apuntaba con
    `floor(pos + mirada * 1.1)`, que pegado al borde de la casilla podia saltar a
    dos de distancia, y con tres casillas eso deja de pasar inadvertido.

13. **El relieve sale de la misma elevacion que el terreno.** `levelFrom` no es
    mas que otra forma de leer el `e < 0.42` que ya separaba el agua, asi que
    `terrainAt` no cambia y los umbrales de bioma siguen calibrados. Si mueves el
    nivel del mar sin mover el umbral de agua, `tests/relief.test.ts` te avisa.
14. **Las paredes de dos o mas bloques SOLO salen de los salientes.** El campo de
    elevacion es tan suave que dos tiles vecinos nunca se llevan dos niveles:
    medido, sin salientes la perdida de conectividad es exactamente cero. Y esa
    densidad esta calibrada, no elegida: al doble de salientes una de cada tres
    semillas pierde 17 puntos de conectividad, o sea un mundo partido en dos.
    Antes de tocar `OUTCROP_THRESHOLD` o su escala, vuelve a medir con
    `npx vite-node tools/analyze-world.ts` y mira la **linea base solo-agua**: el
    mundo plano tampoco es del todo conexo, y comparar contra el 100 % hace pasar
    por sano un relieve que no lo es.
15. **La rampa es propiedad del tile bajo, no de la arista.** Es lo que hace
    continuo el campo de alturas: con la rampa en la arista habria un escalon
    vertical justo en el limite entre las dos casillas, que es lo que un talud no
    tiene. Y por eso un talud se dibuja como un rombo torcido, sin forma
    especial. Las caras se calculan con las alturas de los **dos extremos** de
    cada borde: comparando niveles enteros, el costado de un talud se quedaria
    sin su cuna y se veria el fondo por el agujero.
16. **Las caras van en la capa ordenada por profundidad, las cimas en la textura
    del chunk.** Es la regla 7 aplicada al relieve: una pared tiene altura y
    horneada en el suelo se dibujaria por debajo del arbol que tiene detras. Las
    cimas se quedan horneadas porque tapan mucho menos, y a cambio el terreno
    sigue costando un sprite por chunk. El `terrainLayer` si pasa a ordenarse por
    profundidad de chunk: una cima levantada invade el rombo del chunk vecino.

## Regla de trabajo con el autor

**La interpretacion de las leyes es del autor, no del agente.** Antes de escribir
codigo que implemente o toque una ley del libro, hay que consultarle:

- como se interpreta la ley,
- que mecanicas internas la realizan,
- como fluye en el tiempo (ritmos, curvas, duraciones),
- con que otros sistemas interactua,
- y que valor toma cada parametro.

Esto surgio de un error real: en la primera tanda de vida vegetal el agente fijo
por su cuenta la forma de la curva de crecimiento, los tiempos de rebrote y que
la piedra fuera finita. Eran decisiones de diseno del autor, no de
implementacion, y varias no coincidian con lo que el tenia en mente.

Proponer interpretaciones es bienvenido; darlas por aprobadas no. Cuando una
decision se tome por deduccion (por ejemplo, derivar una tasa a partir de unos
tiempos que dio el autor), hay que decirlo explicitamente para que pueda
corregirla.

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

## Efectos visuales

`client/effects.ts` lleva el movimiento —donde esta cada cosa y cuanto le queda
de vida— sin DOM ni PixiJS, y el renderizador solo lo dibuja: asi la fisica de
las particulas se mide en Node. Avanzan con el tiempo **escalado**, de modo que
pausar los congela y 64x no inunda la pantalla.

Los colores de los escombros salen de `client/palette.ts`, la misma tabla con la
que `tiles.ts` pinta cada especie. Estan juntas a proposito: el encargo era que
los escombros fueran los colores del objeto, y con una copia se separarian al
primer retoque. Sobre hierba los verdes de un arbol desaparecen, asi que cada
cuadrado lleva un contorno oscuro debajo; cambiarles el color habria sido
traicionar el encargo.

## Herramientas de desarrollo

`packages/client/src/devtools.ts`, con `?dev=1` en la URL o F3. Pausa,
multiplicadores de tiempo, saltos de +1 h / +6 h / +1 dia, bordes de chunk y de
bioma, congelar la supervivencia, y un registro de eventos.

Existen porque casi todo lo del ecosistema tarda horas reales en poder
comprobarse —cinco para recuperar un bioma desde cero, dos y media para corregir
una saturacion, ocho minutos para que madure un brote—, asi que sin ellas no hay
forma de verificar a mano lo que se implementa.

Tres cosas que conviene no romper: el registro sale de **comparar el inventario y
el hambre entre refrescos**, no de que la simulacion emita eventos, asi que el
nucleo no se entera de que existe; `skipTime` es `step` con la Intent vacia, para
que saltar una hora deje el mundo exactamente igual que vivirla quieto; y
`GameState.survivalFrozen` lo respetan por igual `step` y `skipTime`, para que esa
equivalencia siga valiendo con el interruptor en cualquier posicion. Hay tests de
las tres.

Las superposiciones de depuracion (rejilla de chunks y contorno de biomas) se
trazan en coordenadas de pantalla **absolutas** y su `Graphics` se queda en (0,0)
dentro de `markerLayer`. Asignarle ademas la posicion del chunk suma el origen
dos veces y saca todo el dibujo un chunk en diagonal; como en el chunk (0,0) el
error vale cero, a ojo parece que funciona. La geometria del contorno vive aparte
en `client/biome-edges.ts`, sin PixiJS, para poder verificarla en Node.

La congelacion empieza puesta al abrir el panel y solo se aplica con el panel
abierto (`DevTools.survivalFrozen` es un getter, como `timeScale`). Sin ella las
herramientas no sirven para lo que se hicieron: a 64x se pierden unos 35 puntos
de hambre por segundo real y saltar un dia son 264, asi que el boton mas util del
panel era el que mataba.

## El relieve

El mundo tiene altura desde `packages/sim/src/relief.ts`: ocho niveles, escalon
de 0.06 de elevacion, y `groundHeightAt` devuelve la altura real de un punto con
decimales. **Por ahora el relieve solo se ve**: la colision no ha cambiado y el
jugador camina por donde caminaba. La gravedad, el salto y las paredes que
estorban son la fase siguiente, ya disenada con el autor.

Tres numeros son suyos y no se tocan sin preguntarle: el escalon (0.06), los 8
px por nivel y el 15 % de fronteras que son rampa. El umbral de salientes, en
cambio, es una calibracion: se elige midiendo (regla 14).

Lo que la fase siguiente traera, para no disenarlo dos veces: el salto es una
parabola simetrica cuyo apice cae **a una casilla exacta** y cuyo alcance son dos
—de ahi salen `GRAVITY` y `JUMP_SPEED`, derivados del caso concreto que describio
el autor—, conserva el impulso que se llevaba, admite un 30 % de correccion en el
aire, y el agua sigue siendo muro tambien volando.

## Si tocas la generacion del mundo

Cambiar una escala de ruido invalida los umbrales de bioma, que estan calibrados
contra los percentiles reales de cada campo. Vuelve a medir:

```bash
npx vite-node tools/analyze-world.ts
```

y ajusta los umbrales en `packages/sim/src/worldgen.ts` a la distribucion nueva.
`tests/world-quality.test.ts` falla si algun bioma desaparece, si el jugador
queda encerrado o si el bosque se vuelve intransitable.

## Ciclos de importacion

`packages/shared/src/base.ts` y `packages/sim/src/coords.ts` existen solo para
romper ciclos: `index.ts` reexporta `ecology.ts`, y `world.ts` usa `biome.ts`.
Con el ciclo puesto los tests pasan igual, pero el bundle del navegador revienta
con «Cannot access X before initialization», que solo detecta `npm run smoke`.
Si anades un modulo que necesiten dos partes que ya se referencian, ponlo en su
propio fichero sin dependencias en vez de importarlo cruzado.

## Presupuesto de rendimiento

`tests/performance.test.ts` mide el coste medio de un tick. El limite acordado
son 8 ms; superarlo de forma sostenida es la senal para portar el modulo caliente
a Rust/WASM detras de la misma interfaz, no para empezar a optimizar a ciegas.
