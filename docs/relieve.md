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
