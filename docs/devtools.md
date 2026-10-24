# Herramientas de desarrollo

Lee esto antes de tocar `devtools.ts`, `overlays.ts`, `biome-edges.ts` o la
reticula.

Estaba en `CLAUDE.md` hasta el 2026-10-02 y se mudo aqui **literal** (propuesta 3:
`CLAUDE.md` se carga entero en cada turno, asi que lleva solo lo operativo y
un indice de estos documentos).

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

Las superposiciones de depuracion (rejilla de chunks y contorno de biomas) van
en `overlays.ts`, en coordenadas **del mundo** y pegadas al suelo de cada
esquina. En el isometrico se calculaban en pantalla y ahi tuvieron sus dos
fallos —el origen del chunk sumado dos veces, que sacaba el dibujo un chunk en
diagonal y en el chunk (0,0) valia cero, y las costuras sin dibujar—; en 3D el
primero desaparece por construccion y el humo sigue midiendo que ningun
segmento caiga fuera de su chunk. La geometria del contorno vive aparte en
`biome-edges.ts`, sin three.js, para poder verificarla en Node, y mira el vecino
de la costura con `world.gen` para no registrar chunks por mirar.

**La mirada es la de la camara, asi que la reticula tambien.** Marca **donde
toca la mirada**: en verde la cara de arriba del voxel de suelo, y en blanco
la de la pared si toca un costado del terreno, o la de abajo de lo que quedo
en el aire (pedido del autor, 2026-09-30; por voxel desde el 2026-10-20,
*deduccion*: el voxel es la unidad del terreno). Sale de
`aimSurface`, lo mismo que decide donde se siembra y se coloca. Hasta entonces
marcaba tambien los objetos que el golpe alcanzaba; el autor lo quito.

La congelacion empieza puesta al abrir el panel y solo se aplica con el panel
abierto (`DevTools.survivalFrozen` es un getter, como `timeScale`). Sin ella las
herramientas no sirven para lo que se hicieron: a 64x se pierden unos 6,7 puntos
de hambre por segundo real y saltar un dia vacia la mitad del hambre, asi que el
boton mas util del panel era el que mataba.

**Las cajas de golpe y de choque** (pedido del autor, 2026-10-05): el
conmutador «Cajas» del grupo Vista las dibuja alrededor del jugador
(`debug-boxes.ts`, 12 casillas a la redonda, propuesta mia). Colores del autor:
**rojo** lo que se golpea, **cian** lo que choca y **amarillo** lo que hace las
dos cosas. Se ven **a traves de todo**, sin prueba de profundidad, porque el
tronco que se golpea vive dentro de su copa. **El agua no se dibuja**, aunque
corte el paso (decision del autor). Ninguna caja es del cliente: todas salen
del nucleo. Desde el mismo dia cada objeto tiene **una** caja, que se golpea y,
si su tipo choca, tambien choca (`sim/boxes.ts`, ver `docs/reglas.md`, 21):
- **Las dos**: los objetos que chocan (`blocksBody`: el tronco del arbol, la
  roca, los minerales y las estaciones).
- **Golpe**: lo que solo se golpea: el arbusto, el brote, los guijarros y,
  desde el 2026-10-14, cada parte de los animales (`animalBoxes`), patas
  incluidas.
- **Choque**: la caja de cada cuerpo (`bodyOf`, regla 21): el jugador, su
  huella de `BODY_RADIUS` y `PLAYER_HEIGHT` de alto; cada animal, su caja
  cuadrada hasta el lomo, que no gira.

El primer dibujo (unas horas) pintaba en cian la casilla entera de cada arbol y
roca, que era lo que chocaba entonces; al verlo, el autor cambio la regla.

Se rehacen enteras en cada fotograma: son unas 600 casillas, cuesta poco, y no
hay cache que se quede vieja al talar algo o al pasar un animal. El humo las
cuenta (`__verdant.debugBoxes`) contra un recuento aparte (`boxesNear`), en el
nacimiento y junto a un animal, porque en el nacimiento de la semilla de la
prueba no hay ninguno a mano (auditoria del 2026-10-14); y
`tests/debug-boxes.test.ts` mide la parte pura.

Del 2026-10-12 al 2026-10-14 un deslizador del grupo Vista ajustaba lo que
tardaba la camara en subir un escalon; se retiro con el
suavizado, cuando el cuerpo paso a subir tick a tick (`docs/controles.md`).

**En el movil, que no tiene F3**, el panel se abre con el cuarto boton de la
columna de OTROS, una llave inglesa bajo el bioma (`#devToggle`, pedido del
autor, 2026-10-05), y se abre al lado de la columna, como el HUD: abajo a la
izquierda pisaria el joystick. El boton se enciende mientras el panel esta
abierto, se haya abierto con el, con F3 o con `?dev=1` (`DevTools.onToggle`).

## El peor frame (tanda movil 1, 2026-10-24)

El grupo **«Peor frame (5 s)»** dice cuanto trabajo llevo el frame mas caro de
los ultimos cinco segundos y en que se fue, en ms del hilo principal:
`nucleo` (los ticks del frame, y al cambiar de chunk su carga), `malla`
(el terreno de los chunks nuevos), `objetos` (aspas, rocas y estaciones),
`menas`, `sombras`, `fauna` y `gpu` (la llamada a `render`, que es donde
three.js sube la geometria nueva). Y cuantos chunks se construyeron en el.
Lo lleva `frame-probe.ts`.

Existe porque el contador de FPS es la media de un segundo y un tiron se
diluye en ella: un frame de 300 ms en un segundo a 42 fps sale como «32». Para
medir el tiron en el telefono se abre el panel (la llave inglesa), se cruza un
borde de chunk (con «Bordes de chunk» puesto se ve donde esta) y se lee la
linea antes de cinco segundos. El humo lee lo mismo en `__verdant.framePeak`.

Debajo, **«Resolucion»**: lo que costo dibujar el ultimo frame (llamadas de
dibujo, triangulos y pixeles del lienzo) y tres botones, **2x · 1,5x · 1x**, los
pixeles de lienzo por pixel CSS, con el tope de la pantalla. 2x es la de
siempre. Sirve para saber que le pesa al movil: si a 1x los FPS suben mucho, los
pixeles; si apenas cambian, las llamadas. **Se recuerda** (`localStorage`) y,
a diferencia de la velocidad, **no vuelve a 2x al cerrar el panel**: es para
jugar con ella y comparar. El humo la prueba en la pasada del movil, que es la
unica con pantalla de mas de 1x.
