# Efectos visuales

Lee esto antes de tocar `effects.ts`, `effects-view.ts`, el barrido, la
estocada, el impacto, los escombros o las esquirlas, o una medida de «se ve».

Estaba en `CLAUDE.md` hasta el 2026-10-02 y se mudo aqui **literal** (propuesta 3:
`CLAUDE.md` se carga entero en cada turno, asi que lleva solo lo operativo y
un indice de estos documentos).

`client/effects.ts` lleva el movimiento —donde esta cada cosa y cuanto le queda
de vida— sin DOM ni three.js, y `effects-view.ts` solo lo dibuja: asi la fisica de
las particulas se mide en Node. Avanzan con el tiempo **escalado**, de modo que
pausar los congela y 64x no inunda la pantalla.

Los colores de los escombros salen de `client/palette.ts`, la misma tabla con la
que `art.ts` pinta cada especie. Estan juntas a proposito: el encargo era que
los escombros fueran los colores del objeto, y con una copia se separarian al
primer retoque. Sobre hierba los verdes de un arbol desaparecen, asi que cada
cuadrado lleva un contorno oscuro debajo; cambiarles el color habria sido
traicionar el encargo.

**Un efecto recien nacido sobrevive a su primer `advance`, dure lo que dure el
fotograma.** El bucle corre todos los ticks pendientes de golpe —y dentro de
ellos nace el slash—, luego envejece los efectos **una sola vez** con el frame
entero, y solo despues dibuja: sin esa garantia, cualquier efecto mas corto que
un fotograma nace y muere sin llegar a dibujarse. Con `SLASH_SECONDS = 0.22` el
corte cae en **4,5 FPS** y es exacto, no probabilistico: medido, a 219 ms por
frame se ven los 35 slashes y a 221 ms cero de 35. Ahi vivio meses el fallo, y
alargar el slash lo habria tapado tocando un numero de sensacion que es del
autor.

**El 3D reutilizo `effects.ts` tal cual y solo puso el dibujado**
(`effects-view.ts`). Es la prueba de que el reparto estaba bien hecho: lo que se
reutilizo —donde esta cada escombro, cuanto le queda de vida, con que colores—
nunca fue de la camara isometrica, que es donde nacio.

Dos adaptaciones al pasar a tres dimensiones, y ninguna es capricho:

- **En el 3D un nivel mide lo mismo que una casilla**, porque `terrain-mesh.ts`
  usa la altura tal cual como coordenada Y; en el isometrico un nivel eran 16 px
  y una casilla 32. Asi que la altura entra directa y el TAMANO, que `effects.ts`
  da en pixeles del arte isometrico, se divide por 32.
- **Los escombros se apagan encogiendo, no desvaneciendose.** Cada uno tiene su
  edad y un `InstancedMesh` comparte material, asi que no hay transparencia por
  instancia; se aplica la misma curva de apagado a la escala. El barrido si se
  desvanece, porque son pocos y cada uno lleva su material.
- **El barrido se dibuja POR ENCIMA del mundo y MIRANDO a la camara.** Las dos
  cosas son la traduccion de una sola: en el isometrico el trazo vivia en
  `effectLayer`, una capa de pantalla sobre el mundo entero, y ahi nada puede
  taparlo ni escorzarlo. En 3D eso se compra con `depthTest: false` y con una
  cinta que se ensancha perpendicular a la linea de vision. Sin lo primero se lo
  come lo que haya entre la camara y el arco —un bloque, un arbol, el propio
  personaje—; sin lo segundo se ve de canto cuando su ancho cae a lo largo del
  rumbo desde el que se mira. Medido a 0.08 rad de elevacion: 104 pixeles
  aclarados contra 2 y contra 13.

  **El barrido recorre el BORDE CURVO DEL AREA REAL del golpe** (pedido del
  autor con el sector de la regla 12): el extremo de cada uno de sus 33 rayos,
  ya cortados por el terreno, asi que donde el sector entra en el suelo o en una
  pared el trazo se pega a el (`slashEdge` en `effects.ts`, puro). No se
  recalcula nada: es el mismo golpe que decidio la simulacion. Sale de los ojos
  en las tres vistas, siempre, haya algo que golpear o no —es el gesto, no el
  resultado—, y se congela en el mundo al nacer. En primera persona, a 3
  bloques de los ojos, lleva medio ancho 0,04 (deduccion mia); en tercera, 0,06:
  los 3 px del isometrico con la casilla a 32, redondeados al alza desde 0,094
  porque PixiJS suavizaba el trazo y este lienzo va sin antialias. Antes fue un
  arco fijo delante de la mirada, y antes aun iba clavado a las casillas.

  **Y toda malla cuya geometria se reescriba cada frame lleva
  `frustumCulled = false`.** three.js calcula la esfera envolvente **una sola
  vez**, cuando la encuentra a `null`, asi que se queda clavada donde estuvo la
  primera vez que se dibujo: el barrido se esfumaba entero en cuanto el jugador
  se alejaba del sitio donde dio su primer golpe. Medido: 80 barridos mandados a
  la escena, 0 pixeles en pantalla.

Y una leccion de metodo, de fotografiar un efecto que dura 0.22 s: **una captura
tarda mas que el propio efecto**, asi que perseguirlo con sondeos es echarlo a
suertes. Las dos formas que si funcionan son mantener pulsada la accion —repite
cuatro veces por segundo, o sea que casi siempre hay uno vivo— o, para localizar
uno concreto, subir `SLASH_SECONDS` a proposito y revertirlo. Se pinto de magenta
una vez para comprobar que salia donde debia; salia.

**Un contador de «dibujados» dice que se MANDA, no que se VEA.** `slashesDrawn`
cuenta dentro del dibujado, y aun asi los tres fallos de arriba lo incrementaban
igual: recortado por el frustum o tapado por el terreno, el contador subia. Es el
mismo fallo de razonamiento que el de abajo, un escalon mas adentro. Para afirmar
que algo llega a pantalla hay que contar **pixeles**: `npm run slash` para
una captura en reposo como referencia y cuenta los que el efecto aclara, porque
con el jugador y la camara quietos dos fotogramas son identicos. Y compara
**contra el peor de cuatro rumbos**, no contra uno: los dos defectos de
orientacion van y vienen segun se gire, y mirando desde el sitio afortunado se
ven perfectos.

Ojo tambien con lo que se cuenta: la primera version buscaba pixeles «casi
blancos» y daba cero con el barrido perfectamente visible, porque el trazo es
translucido y blanco al 50 % sobre hierba es un verde palido.

Lo que ese fallo enseña sobre las comprobaciones, y vale para cualquiera que se
anada: **la prueba de humo preguntaba si habia un slash vivo en ese instante**,
con una vida de 0,22 s y un sondeo cada 420 ms. Dos defectos en uno — se
acertaba a suertes, y miraba la LISTA de efectos, asi que no distinguia «no se
lanza» de «se lanza y no se dibuja», que era justo el caso. Ahora el dibujado
lleva un acumulador de slashes **trazados** (`EffectsView.slashesDrawn`) y el
humo afirma que crece. Una comprobacion que puede pasar por suerte es peor que una que
falla.

**Y la moraleja de la moraleja: cuando se arreglo el slash, la comprobacion de
los ESCOMBROS se quedo como estaba** —preguntando por la lista de particulas
vivas, una linea mas abajo, con el arreglo del slash comentado justo encima—.
Aguanto varias tandas y un dia el runner de CI perdio la moneda: 221 slashes
trazados y cero escombros, con el mismo golpe soltando diez unas lineas mas
abajo, donde el tiempo esta congelado. Un escombro vive entre 0,6 y 1,1 s, el
runner va a 4-6 FPS y el sondeo cae cada 420 ms: no habia por que acertar. Ahora
hay `EffectsView.debrisDrawn`, gemelo del otro. **Al arreglar una comprobacion de
estas, mira si su hermana tiene el mismo fallo.**

**Una medida de «se ve» tiene que mirar donde esta lo que mide.** `npm run
slash` cuenta los pixeles aclarados en una caja central, y en primera persona
el barrido arranca en la esquina de arriba a la derecha y cruza la vista entera:
un rumbo daba cero o 2.545 segun el momento del trazo que pillara la captura, con
el trazo perfectamente visible en la esquina. En primera persona mide ahora el
ancho entero sin las franjas de botones, y da 9.000-19.000 en los cuatro rumbos.
(Antes de que el barrido fuera delante de la mirada habia otro cero de mentira:
rumbos donde solo se alcanzaba la casilla propia y no habia arco que trazar.)

## El impacto (2026-10-03)

Pedido del autor: «una animacion sencilla de impacto que se usara en el punto
donde el player golpee cualquier cosa destruible». Eligio el destello en
estrella entre tres propuestas.

- **Donde**: el nucleo da el punto. `strike` y `gazeTarget` guardan en cada
  objetivo donde lo toca su rayo mas corto (`at`), y `Swing.impacts` (en el
  estado, `lastImpacts`) lleva uno por cada cosa golpeada que se puede romper,
  feature o animal, se rompa o no. Es la misma cuenta que decide que cae: no se
  recalcula nada en el cliente.
- **Como**: una estrella blanca de 4 puntas, de cara al ojo, que crece de 0,18
  a 0,42 bloques mientras se apaga en 0,2 s (`IMPACT_SECONDS`,
  `impactLook`; tamanos y duracion, *deduccion mia*). Va sin prueba de
  profundidad, como el barrido: es un destello encima de lo golpeado.
- Tiene la misma garantia que el barrido, sobrevivir a su primer `advance`
  (`tests/effects.test.ts`), y su acumulador de dibujados, `impactsDrawn`.
- **Los animales no sueltan fragmentos**, ni golpeados ni al morir (decision
  del autor, 2026-10-03): solo el impacto. Las features conservan sus esquirlas
  y sus escombros.
