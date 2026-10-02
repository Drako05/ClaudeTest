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
por nivel, el 15 % de fronteras que son rampa y el tope de 40 niveles. El umbral
de salientes y la ganancia de cordillera, en cambio, son calibraciones: se eligen
midiendo (regla 14).

El salto, ya implementado: parabola simetrica con el apice **a una casilla
exacta** y alcance dos andando, y el agua es muro tambien volando. **El salto
solo empuja hacia arriba y en el aire se anda como en el suelo** (decision del
autor, 2026-09-30): a la velocidad de andar o de correr, girando lo que se
quiera, y sin mando no se avanza. Hasta entonces conservaba el impulso del
despegue y admitia un 30 % de desviacion. Andar y volar solo se distinguen
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
