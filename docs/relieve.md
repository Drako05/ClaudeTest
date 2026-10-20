# El relieve, el salto y el hambre

Lee esto antes de tocar `relief.ts`, el salto, la gravedad o el hambre. Las
reglas 13 a 15 y 21 a 23 de `CLAUDE.md` son las que lo atan.

Estaba en `CLAUDE.md` hasta el 2026-10-02 y se mudo aqui **literal** (propuesta 3:
`CLAUDE.md` se carga entero en cada turno, asi que lleva solo lo operativo y
un indice de estos documentos).

El mundo tiene altura desde `packages/sim/src/relief.ts`: hasta 41 niveles,
escalon de 0.06 de elevacion, y `groundHeightAt` devuelve la altura real de un
punto con decimales. **El relieve estorba** desde la fase 2: hay gravedad, salto
y caida, y ya no se cambia de nivel andando (regla 21).

**En el 3D un nivel mide lo mismo que una casilla**: `terrain-mesh.ts` usa la
altura tal cual como coordenada Y, asi que los bloques son cubos. En el
isometrico un nivel eran **16 px**, `TILE_W / 2`, la arista vertical de un cubo
en una 2:1; estuvo en 8 y el autor lo noto a la primera —los bloques se veian
como baldosas—. Es el mismo cubo por los dos caminos.

Las cordilleras amplifican el desnivel **anclando en el nivel del mar**: bajo el
agua `reliefAt` es identica a `elevationAt`, y por eso meter montanas no obligo a
recalibrar la costa, que son los tres umbrales mas delicados que hay. Los de
altitud si se recalibraron, pero **sumando** reglas a las viejas en vez de
sustituirlas, para no mover el mundo llano ni un tile.

Numeros del autor, que no se tocan sin preguntarle: el escalon (0.06), los 16 px
por nivel y el tope de 40 niveles. El umbral de salientes y la ganancia de
cordillera, en cambio, son calibraciones: se eligen midiendo (regla 14).

## Voxeles de 0,5 (2026-10-06)

**El terreno son voxeles de 0,5 × 0,5 × 0,5** (decision del autor, pensando en
excavar y construir): cada **columna** de medio bloque de lado tiene una altura
entera en **medios bloques**, y es solida de ahi para abajo. Una casilla de 1
son 2 × 2 columnas. Lo que decidio el autor:
- **sin rampas** —el 15 % de fronteras que eran rampa se retiro, y con el la
  regla 15—: el relieve sube a escalones de medio bloque, que se suben andando;
- **el escalon natural mide 0,5 en alto y en planta**: la misma elevacion de
  siempre, leida cada 0,5. El escalon de elevacion de un medio bloque es
  **0,03**, el 0,06 del autor partido en dos;
- **el bioma, la vida y los objetos siguen por casilla de 1**.

Lo que es **deduccion mia**:
- **la columna interpola el relieve y el saliente entre las cuatro esquinas de
  su casilla** (`WorldGen.columnFrom`), sin ruido nuevo: la columna de la
  esquina es la casilla tal cual, y generar no cuesta cuatro veces mas;
- **lo que es agua lo decide la casilla**: una casilla de agua tiene sus cuatro
  columnas a -1 y una de tierra, todas de 0 para arriba. Asi la costa y los
  biomas no se mueven ni un tile.

Medido (`tools/analyze-world.ts`, tres semillas):
- **el reparto de alturas es el de antes**, y el relieve cuesta **0,14, 0,76 y
  0,61 puntos** de conectividad sobre la linea base solo-agua, lo mismo que con
  rampas: no hizo falta recalibrar los salientes;
- **andando, casi todo se recorre**: la componente andando es practicamente la
  de con salto, porque en llano dos columnas vecinas nunca se llevan mas de
  medio bloque (un test lo afirma);
- **las cordilleras ya no dan acantilados de dos**: la interpolacion reparte su
  pendiente en paredes de un bloque, que se saltan. Las paredes de dos o mas
  solo las dan los salientes, que son escasos.

El salto, ya implementado: parabola simetrica con el apice **a una casilla
exacta** y alcance dos andando, y el agua es muro tambien volando. **El salto
solo empuja hacia arriba y en el aire se anda como en el suelo** (decision del
autor, 2026-09-30): a la velocidad de andar o de correr, girando lo que se
quiera, y sin mando no se avanza. Hasta entonces conservaba el impulso del
despegue y admitia un 30 % de desviacion. Desde el 2026-10-10, con la misma
**inercia** que en el suelo: arrancar, frenar y girar llevan 0,1 s
(`INERTIA_TIME`, regla 21), y **bajar es caer**, tambien medio bloque. Andar y volar solo se distinguen
en el margen de subida (regla 21). Medido con la
integracion exacta: apice 1.160 niveles contra 1.161 en papel, alcance 2.17
casillas a paso completo, vuelo 0.400 s. `GRAVITY = 62` y `JUMP_SPEED = 12` son
**deduccion del agente** a partir del caso que describio el autor, no numeros
suyos: puede corregirlos, y `tests/jump.test.ts` afirma la relacion que los ata.

**El salto de un animal es a medida** (el autor, 2026-10-14): con la misma
gravedad, la fuerza justa para su escalon mas 0,1 m (`jumpSpeedFor`,
`ANIMAL_JUMP_MARGIN`), y como mucho 1 m (`ANIMAL_JUMP_UP`). El del jugador no
cambia. Y **ningun escalon se sube de golpe**: lo que mide ≤ 0,5 se sube
andando tick a tick, medio bloque en 0,1 s (`CLIMB_SPEED`, regla 21).

**El hambre gasta segun el esfuerzo** (decision del autor, 2026-09-30;
`systems/survival.ts`): quieto o andando se vacia en `HUNGER_EMPTY_DAYS` dias
de juego —dos; fue uno hasta el 2026-10-01—, y el ritmo **se deriva de `DAY_TICKS`**, para que si el dia
cambia de duracion el hambre lo siga; corriendo y avanzando, por
`RUN_MULTIPLIER`, el mismo factor que la velocidad, y con la carrera encendida
pero quieto, como quieto; y cada salto que despega cuesta `JUMP_HUNGER`, un 0,25 %
(fue un 1 % y luego un 0,5 %; lo fue bajando el autor), el automatico tambien.
Lo de «avanzando» se mide en el tick comparando la posicion antes y despues de
moverse (deduccion mia: empujar contra una pared no es correr). Todo respeta
`survivalFrozen`, y `skipTime` gasta como quieto.

## Romper el terreno (2026-10-20)

El autor: «quiero que el mundo realmente se entienda como creado por bloques
de 0.5m. quiero que cada golpe impacte realmente a cada bloque de 0.5m y lo
pueda destruir de forma independiente. por ahora, lo que hay debajo de un
bloque es otro de su mismo tipo hasta el fondo. los bloques de 0.5 ya no se
deben ver como pertenecientes a un bloque de 1m, sino como que ellos mismos
son la unidad fundamental de terreno. por el momento detendremos la gravedad
para los bloques, ya nada cae si no tiene algo debajo. por el momento, pegar
con cualquier cosa rompe el terreno. el terreno aguanta 3 golpes antes de
romperse y no suelta partículas ni botín.» Y contesto a cuatro preguntas:

- **Barrido: cada voxel que toca recibe su golpe**, uno aunque entren varios
  rayos (no solo el mas cercano ni solo el del centro).
- **Un objeto cuyo apoyo se rompe se queda flotando.**
- **Ninguna pista del daño** hasta que se rompe («agregaremos esas pistas
  visuales en otra tanda»).
- **Gasta un uso** de la herramienta, como todo golpe que toca algo.
- Y despues: **cada cara de voxel con su tesela de 12 × 12** (no la de 24
  reducida ni un cuarto de ella), **sin fondo**, **el agua no se mueve** (el
  fondo de una casilla de agua no se rompe) y **el daño se olvida a los 3 s**,
  como el de los objetos.

Como esta hecho:
- **El dato** (regla 4): lo roto vive fuera del chunk, por chunk, columna y
  altura (`World.broken`); el terreno es lo que dio el generador menos eso
  (`isSolidVoxel`). **Debajo de un voxel hay otro del mismo suelo hasta el
  fondo**, y no hay fondo: el tipo es el `Terrain` de su casilla.
- **Nada cae**: ni el terreno —lo que queda en el aire se queda— ni los
  objetos. Lo generado se apoya en lo que dio el generador
  (`World.objectBaseAt`, `potentialTop`), y lo que aparece despues —un brote,
  una estacion— guarda donde quedo al aparecer; si cambia en su sitio con la
  misma regla de apoyo (un brote que madura), conserva su base. Lo suelto del
  suelo si cae: es un cuerpo.
- **Los cuerpos si caen** (la gravedad de los cuerpos no se toca): se cae a un
  hoyo, y la cabeza choca con lo que quedo en el aire (regla 21).
- **El nacimiento, la conectividad y las sondas** miden el mundo generado
  (`potentialTop`): son de la generacion, no de lo que se rompio.
- **El dibujo**: cada cara de un voxel que da al aire, con su tesela entera
  (`terrain-mesh.ts`, ver `docs/arte.md`). Un voxel roto rehace solo el
  terreno de su chunk y, en el borde, el de la vecina (`terrainRevision`), no
  sus objetos.

**Lo que cuesta** (medido en los 49 chunks alrededor del nacimiento de tres
semillas): **de 1,6 a 1,9 veces los triangulos** (270.000-330.000 a
507.000-543.000), porque una casilla llana ya no sale con una tapa de 1 × 1
sino con cuatro; y **unos 15 ms por chunk** al rehacer su terreno tras romper
un voxel (de unos 9 a unos 15 por chunk al mallarlo). Lo que se haga para el
movil lo decide el autor a la vista de esto (pendiente desde los voxeles).

### La pala, lo primero que toca y las menas (2026-10-20, la tanda siguiente)

El autor dio por buena la tanda de arriba y pidio cuatro cambios:

- **«El golpe parece atravesar las cajas y seguir hasta golpear el terreno,
  esto no debe pasar»**: cada rayo da solo a lo primero que toca (eligio que
  valga para todo, tambien un objeto detras de otro). Ver la regla 12.
- **La pala**, «solo con ella se puede romper terreno maleable, como arena y
  tierras»: arena, hierba, bosque, tundra y nieve (las eligio). **La roca, solo
  el pico.** Y el poder resta, como con los objetos: con el trabajo de 3, la
  de piedra rompe en 3 golpes, la de cobre en 2 y la de hierro en 1. A mano ya
  no se rompe nada. Las recetas, en `docs/recoleccion.md`.
- **Lo que se pone va en la rejilla de 0,5** (regla 12, «Colocar»).
- **Las menas, una formacion de voxeles** («cada voxel es golpeable de forma
  independiente y se destruye como el terreno uno a uno»): ocho, en tres
  niveles —«1 solo bloque abajo, luego el 2x2, luego los 3 bloques de
  arriba»—; los dos primeros sustituyen terreno y el de arriba queda encima.
  Cada voxel aguanta el trabajo de su mena (eligio «su trabajo de hoy»:
  carbon 4, cobre 5, hierro 6, el poder resta) y suelta 0-1 de su mineral, el
  carbon 1-2. Sin particulas (lo eligio).

Como esta hecho, en las menas:
- **El generador las pone en las alturas** (`generateChunk`, `oreTops`, y lo
  mismo `WorldGen.columnTopAt`, que sigue puro): la base de la mena es la
  columna mas baja de su casilla, tal como la dio el relieve; las columnas de
  su nivel de arriba suben a la base + 1. Guarda la base por casilla
  (`Chunk.oreBase`). Que voxel falta arriba y cual va abajo sale de la
  casilla y la semilla (*deduccion*).
- **El material**: `World.oreAt` dice de que mena es un voxel, por la
  formacion de su casilla (el potencial); que siga ahi, `isSolidVoxel`. La
  mena ya no es un objeto (sin caja); la casilla guarda su feature hasta que
  se rompe el ultimo voxel, y entonces queda vacia.
- **Medido** (`tools/analyze-world.ts`, tres semillas): la conectividad, la
  misma; las columnas al pie de un escalon de 1 suben de 2.575 a 2.597, de
  4.691 a 4.713 y de 3.398 a 3.434 (las menas asoman medio bloque). Las de 2+
  no cambian.
