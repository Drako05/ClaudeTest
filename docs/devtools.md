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
toca la mirada**: en verde la casilla de suelo, y en blanco la cara de la pared
si toca un costado del terreno (pedido del autor, 2026-09-30). Sale de
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
  roca, los minerales y las estaciones) y cada parte de los animales
  (`animalBoxes`), patas incluidas.
- **Golpe**: lo que solo se golpea: el arbusto, el brote y los guijarros.
- **Choque**: el jugador, su huella de `BODY_RADIUS` de los pies a los ojos
  (propuesta mia: su choque no tiene alto).

El primer dibujo (unas horas) pintaba en cian la casilla entera de cada arbol y
roca, que era lo que chocaba entonces; al verlo, el autor cambio la regla.

Se rehacen enteras en cada fotograma: son unas 600 casillas, cuesta poco, y no
hay cache que se quede vieja al talar algo o al pasar un animal. El humo las
cuenta (`__verdant.debugBoxes`) y `tests/debug-boxes.test.ts` mide la parte pura.

**El retraso de la camara** (2026-10-10): un deslizador del grupo Vista lo
mueve de 0 a 0,3 s (`CAMERA_LAG_MAX`), para que el autor lo ajuste jugando; el
de partida es el suyo, 0,1 (`docs/controles.md`). **A diferencia de lo demas,
no vuelve a su valor al cerrar el panel** (propuesta mia): es un ajuste, no un
estado que deje el juego raro sin el panel a la vista. Se olvida al recargar.

**En el movil, que no tiene F3**, el panel se abre con el cuarto boton de la
columna de OTROS, una llave inglesa bajo el bioma (`#devToggle`, pedido del
autor, 2026-10-05), y se abre al lado de la columna, como el HUD: abajo a la
izquierda pisaria el joystick. El boton se enciende mientras el panel esta
abierto, se haya abierto con el, con F3 o con `?dev=1` (`DevTools.onToggle`).
