# El arte en 3D: pixelart, aspas y proporciones

Lee esto antes de tocar `billboards.ts`, `world-art.ts`, `world-sprites.ts`,
`pixel-paint.ts`, `rock-mesh.ts`, `terrain-mesh.ts`, `tree-shapes.ts`,
`shadows.ts`, `shadow-patches.ts`, `sim/trunk.ts`, `tools/pixel-mundo.ts` o
cualquier tamano de lo que se dibuja.

## El mundo es pixelart a 24 pixeles por bloque (2026-10-19)

Lo pidio el autor: «adaptemos el arte del terreno y los elementos (árboles,
rocas, minerales, plantas...) al pixelart HD», y fijo la medida: «caras de
24x24 en bloques (voxeles 12x12). Esa debe ser la medida para todo elemento
del juego». Sus directrices de estilo, en `docs/guia-de-arte.md`
(directriz 7). Como esta hecho:

- **Los dibujos son rejillas de caracteres** (`world-art.ts`): una fila por
  fila de pixeles, `.` transparente y cada letra un color de **la paleta de su
  dibujo**. Los saca de formas `tools/pixel-mundo.ts` (`npx vite-node`) con el
  pincel de `pixel-paint.ts`, y **despues se retocan a mano en
  `world-art.ts`**: volver a correr el generador pisa los retoques.
- **Un pixel de arte es 1/24 de bloque en todo**: suelo, aspas, rocas,
  estaciones, jugador y escombros (`WORLD_PX`). Sustituyo a la escala de
  antes (`BASE`, `ARBOL` y `DETAIL`, abajo en «Proporciones»), que daba a
  cada objeto un pixel de otro tamano. **Los tamanos en el mundo casi no
  cambiaron**: los dibujos se hicieron a la medida de lo que ya median.
  Medidos con `npm run shots`: el jugador 1,88 (era 1,93), una mata 1,04
  (1,17), un brote 0,79 (0,88) y la roca 1,0 (1,09); las copas, las de su
  especie.
- **El suelo** (`terrain-mesh.ts`): desde el 2026-10-20 **cada cara de voxel
  lleva su tesela entera de 12 × 12** (`VOXEL_TILES`, `voxel-art.ts`; el
  autor: el voxel es la unidad del terreno y no debe verse como un cuarto de
  bloque), en una de sus 3-4 variantes, elegida por voxel y cara con la
  semilla (`terrainVariant`). Hasta entonces cada casilla tomaba la de 24 ×
  24, entera en una tapa de 1 × 1 y un cuarto en la de cada columna; las de
  24 siguen en `world-art.ts` y en la hoja hasta que el autor de por buenas
  las de 12. **Las paredes, del mismo material y mas oscuras** (el autor; el
  0,72 de antes, `WALL_LIGHT`), y la cara de abajo de lo que quedo en el
  aire, mas aun (0,55, `UNDER_LIGHT`, *deduccion*). Las de 12 salen del mismo
  generador, con los mismos pinceles y colores a la misma densidad, y lo que
  se reparte por la tesela (briznas, granos, grietas) en proporcion a su area
  (*deduccion*). Cuesta de 1,6 a 1,9 veces los triangulos de antes (ver
  `docs/relieve.md`, «Romper el terreno»). Sin el ±10 % de brillo
  por casilla de antes (el autor). Sigue en Lambert: su textura va **sin
  espacio de color**, como iban los colores por vertice a los que sustituye,
  y se ve con los mismos colores (medido: la roca del suelo, 120,120,116 en
  pantalla antes y despues).
- **Lo que no se ilumina** (aspas, estaciones, agua, jugador) va con la
  textura en sRGB: se ve con los colores del dibujo, tal cual.
- **Las rocas son voxeles** (el autor, 2026-10-19), no aspas:
  `rock-mesh.ts`, siete voxeles de 0,5 (le falta una esquina, para que no
  sea un cubo) con la piedra de su tesela, girados un cuarto de vuelta por
  casilla y con la luz de cada cara horneada como las estaciones. Ocupan su
  casilla (1 × 1 × 1); su caja de choque sigue en 0,9 × 1,0.
- **Las menas** (el autor, 2026-10-20; el boceto en `docs/bocetos/minerales/`)
  llevan la piedra de esa roca, con **vetas del mineral y cristales que brotan de ella**
  en laminas cruzadas, como los arboles (`ore-mesh.ts`). Desde la tanda de la
  pala son **una formacion de ocho voxeles del terreno** (`ore-shape.ts`):
  uno abajo, el 2 × 2 en medio y tres arriba, y solo el de arriba asoma. Se
  dibujan **los que quedan**, y **una cara tapada por el terreno no lleva ni
  piedra ni cristales**: cavando alrededor aparecen las del medio, y bajo lo
  que queda en el aire cuelga la flor de abajo de la regla de la corona. Se
  rehacen con el terreno de su chunk. Sin sombra: son terreno (*deduccion*).
  - **Una distinta por casilla**. El autor: «me gustaria la opcion de maxima
    variedad». La forma, el sitio, el angulo y el tamaño de cada cristal, y el
    recorrido de cada veta, salen de la casilla y la semilla (regla 2).
    **Los cristales de cada cara salen de esa cara**: del voxel en el mundo y
    de la cara, con su propio azar (el autor, 2026-10-20: romper un voxel
    cambiaba los de los demas, y tienen que estar «ligados a su posicion en
    el mundo»). Las vetas, del suyo por casilla.
  - **Cada mena lleva su propia malla y su propia textura**: la tesela de la
    roca con sus vetas, y al lado los dibujos de sus cristales, en 64 de
    ancho. Una llamada de dibujo por mena, como la roca. Al descartar su
    chunk se liberan (`BillboardSet.release`).
  - **Las reglas son las del boceto, aprobadas**:
    - la de la corona en cada tapa, una flor de 5 a 7 cristales que se pisan
      hasta un 40 %;
    - la de los costados en cada cara de lado: dos cristales, de 30 a 56
      grados hacia arriba;
    - y **ningun cristal donde se tocan dos voxeles de la mena**, «solo dentro
      de la formacion»: hacia fuera de la casilla salen siempre.
  - Los cristales no llevan la luz de las caras. Miden 0,25 como mucho. **Ya
    no tiene caja**: su arriba es terreno, se pisa y se sube.
  - **Los colores**, en `ORE_TONES` (`palette.ts`): el cobre y el carbon, los
    del boceto; el hierro, *deduccion*. No sueltan escombros: son terreno
    (el autor, 2026-10-20: «como el terreno: nada»).
  - **Lo que cuesta** (medido el 2026-10-20, 300 menas): enterrada, unos 400
    vertices y 0,6 ms al mallar su chunk; cavada del todo, unos 880 y 1 ms.
    Hay unas 225 menas como mucho a la vez, aunque todo fuera montaña.
- **Los arboles** son su copa (`CROWNS`, fija) sobre el tronco desnudo de
  cada uno, que tiene trece largos y su grosor y por eso **se pinta al vuelo**
  (`treeArt` en `world-sprites.ts`, con `barkTrunk`). La copa se apoya donde
  empiezan sus hojas en la columna del tronco: el tronco desnudo que se ve es
  exactamente el del nucleo, que es su hitbox.
- **Sin contorno** en el mundo (el autor), y las sombras, **difuminadas como
  antes** (el autor).
- **Como se revisa**: `?mundo=1` abre la hoja de todos los dibujos
  (`world-sheet.ts`), ampliados por un entero, con el suelo mezclado, el agua
  sobre su fondo, las rocas y las estaciones en perspectiva y una escena.

Estaba en `CLAUDE.md` hasta el 2026-10-02 y se mudo aqui **literal** (propuesta 3:
`CLAUDE.md` se carga entero en cada turno, asi que lleva solo lo operativo y
un indice de estos documentos).

## Las features son aspas; el jugador, no

**Cada elemento del mundo son dos laminas cruzadas a 90 grados**, no un
billboard. Salvo las estaciones y, desde el 2026-10-19, las rocas y los
minerales, que son cajas y voxeles.
Un sprite se reorienta a la camara en cada frame, y con la camara libre eso
delata que son cromos: los arboles giran contigo y el bosque no tiene lados. La
segunda lamina es lo que impide que la primera desaparezca vista de canto, y eso
es afirmable con un numero: **la silueta del aspa nunca baja de `cos 45º`** de su
ancho, mire la camara desde donde mire. `tests/cross.test.ts` lo mide sobre la
geometria de verdad, y mide tambien **media aspa para verla dar cero** en dos
rumbos — sin ese contraste seria una comprobacion que no puede fallar.

**El jugador sigue siendo billboard**, y es decision del autor: un aspa en un
humanoide es verlo de frente y de perfil a la vez, dos figuras atravesadas. Su
solucion serian los sprites de cuatro u ocho direcciones. **Los animales los
probaron y no llegaron** (decision del autor, 2026-10-03): desde el 2026-10-03
son **modelos de bloques**, como las estaciones, con la luz del mundo
(`fauna-model.ts`, ver `docs/fauna.md`). Como se diseña un modelo lo dicen
las directrices del autor, en progreso: `docs/guia-de-arte.md`. El jugador sigue siendo un sprite, y
cada pixel de su lamina toma **la profundidad de la caja de su cuerpo**
(`sprite-depth.ts`): el terreno le tapa lo que taparia a un cuerpo, ni lo que
tiene al lado ni menos de lo que tiene delante.

**El aspa obliga a recortar por alfa, y eso decide dos cosas mas.** Dos laminas
que se cruzan se atraviesan, y con `transparent` a secas el orden de pintado
entre ellas es una loteria; con `alphaTest` cada fragmento se pinta o se
descarta, escribe profundidad y el orden deja de importar. De ahi salen:

- **El umbral es 0.4.** Lo fijo una sombra que el arte vectorial pintaba al pie
  **al 26 %**, que con el material opaco saldria **negra maciza**; el pixelart
  no tiene pixeles a medias (o hay tinta o no), asi que hoy cualquier umbral
  da lo mismo.
- **La sombra va aparte y tumbada** (`shadows.ts`), que ademas es
  donde debia estar: la pintada era una elipse VERTICAL pegada al pie, herencia
  de que el arte nacio para una camara isometrica fija. Sin ella unos arboles de
  tres bloques parecen pegatinas flotando. Medido quitandolas: 60.429 pixeles
  oscurecidos con sombras contra 32.882 sin ellas.

**El material es `MeshBasicMaterial`, no Lambert.** El arte ya lleva su luz
horneada desde el noroeste. Con Lambert las dos laminas de una misma aspa se
iluminarian distinto y el dibujo se ensuciaria.

**Cada aspa lleva su propio giro, y sale de `hash2DFloat`, no de
`Math.random`.** No es purismo: los chunks se descartan y se regeneran
constantemente (regla 3), asi que con azar vivo los arboles girarian solos al
alejarte y volver. Un cuarto de vuelta basta, porque el aspa se repite cada 90
grados.

**Las sombras de un chunk van en UNA malla.** Una por elemento duplicaria las
~700 draw calls que ya cuesta el mundo; asi cuestan una por chunk —medido, 32 de
mas en total—. Geometria y material de cada especie tambien se comparten entre
todas sus instancias; antes cada sprite se creaba su material.

**Y cada sombra cae al suelo de cada casilla que pisa**, no a la altura del pie:
el autor vio medias sombras flotando sobre el hueco en los arboles al borde de
un desnivel. `shadow-patches.ts` parte el cuadrado por casillas y apoya cada
trozo en la superficie de la suya, que es **la misma que dibuja el terreno**
(`columnTopFor` de `terrain-mesh.ts`, que tampoco registra chunks vecinos). Como
dentro de una casilla el suelo es lineal, un cuadrilatero por trozo es exacto, y
una sombra que cabe en su casilla sigue siendo uno solo. Por eso dejo de ser un
`InstancedMesh`: ya no es la misma geometria repetida. `tests/shadow-patches.test.ts`
lo afirma, con el cuadrado plano de antes para verlo fallar.

**Y las aspas y las rocas de cada chunk van agrupadas por especie** en un
`InstancedMesh` (`prop-batch.ts`, tanda movil 1, 2026-10-24): una llamada de
dibujo por (chunk, especie) en vez de una por objeto. En los 49 chunks del humo,
6.694 objetos en 682 piezas de escena; en el telefono del autor, la media de 42
a 48 fps. Se puede porque el material es opaco con `alphaTest`: el orden entre
instancias no importa. **Siguen sueltas** las estaciones, que se animan una a
una, y las menas, que llevan cada una su malla y su textura.

## Proporciones

*Lo que sigue es como se llego a los tamanos de hoy. Desde el 2026-10-19 no
hay escala: el pixelart se dibujo a esos tamanos, a 24 pixeles por bloque.*

**Un bloque no es la unidad de nada vivo.** El arte nacio para el isometrico con
el jugador midiendo 0,78 bloques y un arbol 1,22, y el autor lo comparo con
Minecraft: alli mides poco menos de dos y un arbol pasa de tres. Los dos factores
que hacian falta salian **casi iguales** —2,3 y 2,6—, y eso era el diagnostico
entero: la relacion entre jugador y arbol ya era la buena y lo que sobraba era el
bloque.

Asi que **todo lo que se apoya en el suelo sube con el mismo `BASE = 2.3`**
(`billboards.ts`), y solo los arboles llevan su pizca de mas
(`ARBOL = 2.6`). Eso conserva intactas las proporciones que el autor ya habia
dado por buenas entre unos y otros, y cambia unicamente su tamano frente al
terreno. Medido del dibujo:

| | Antes | Ahora |
|---|---|---|
| Jugador | 0,78 | **1,93** |
| Arbol | 1,22 | 3,17, y con tronco y copa de su especie **~5-9,5** |
| Tronco desnudo del arbol | 0,3-0,4 | 0,78-1,13, y ahora **el de su especie, nunca menos de 2** |
| Copa | ~0,9 | la de su especie real: ver la tabla de abajo |
| Arbusto | 0,47 | 1,17 |
| Brote | 0,29 | 0,88 |
| Roca y minerales | 0,47 | 1,09 |

**El tronco desnudo de cada arbol adulto sale de la normal de su especie**, y la
unica regla comun es del autor: **nunca menos de 2 bloques**, para que el
jugador vea por debajo del follaje (antes asomaban 0,78-1,13 y la copa le tapaba
la cabeza). Empezo siendo 2-5 comun a todos, y el autor lo quiso por especie al
ver 2-5 bloques de palo bajo la picea negra, tan estrecha. Se lee como el tramo
**desnudo** hasta la copa; sale de una **normal truncada** en
`[max(2, μ−2σ), μ+2σ]` con la media y la desviacion de la tabla de especies de
abajo —numeros y truncado son deduccion mia—. **Vive en el nucleo**
(`sim/trunk.ts`, con `TREE_TRUNKS`) desde que el tronco desnudo es el hitbox del
arbol (regla 12): el cliente lo lee de ahi para dibujarlo, asi que el tronco que
se ve y el que se golpea no pueden no coincidir. Dos cosas que no son de gusto:

- **Es de la casilla**, de `hash2DFloat` como el giro del aspa: con azar vivo un
  arbol cambiaria de altura cada vez que su chunk se regenera (regla 3).
- **Truncada, no recortada**: recortar clavaria un 2,3 % de los arboles (mas, en
  las especies que rozan el minimo) exactamente en cada tope.
  `tests/trunk.test.ts` lo afirma y muerde.

El arbol se compone por **(especie, cuarto de bloque)**, cada combinacion una
vez y solo cuando aparece (`BillboardSet.tree`): sigue siendo un Mesh por arbol
con geometria y material compartidos. `treeArt` (`world-sprites.ts`) pinta el
tronco y apoya la copa encima. Y el tronco se **mide del dibujo**, no de la
cuenta: la tirada de corteza (cualquiera de sus cuatro tonos) en la columna
del pie, que termina donde empiezan las hojas (`window.__verdant.trunks`, que
el humo afirma). La copa de cada arbol sale de su especie: ver abajo.

**Cada arbol tiene la forma de una especie real** (`tree-shapes.ts`), para no
iterar proporciones a ojo. El reparto y el alcance son del autor: se toma **solo
la forma** —relacion ancho:alto de la copa y silueta— con la copa en **3-5
bloques de alto**; el alto exacto y el numero de pisos son deduccion mia.

| Arbol | Especie | Copa alto × ancho | Silueta | Tronco desnudo μ ± σ | Grosor |
|---|---|---|---|---|---|
| Bosque | Picea comun | 5 × 2 | cono de 5 pisos | 2,5 ± 0,35 | 0,45 |
| Bosque raro | Alerce en otono | 4,5 × 2 | cono de 4 pisos, con huecos | 4 ± 0,5 | 0,40 |
| Pradera | Roble aislado | 3,5 × 4,4 | cupula lobulada | 2,4 ± 0,3 | 0,75 |
| Pradera raro | Cerezo japones | 3 × 4,5 | sombrilla | 2,2 ± 0,2 | 0,50 |
| Tundra | Picea negra | 5 × 1,25 | aguja con la punta engrosada, apuntada | 2,1 ± 0,1 | 0,22 |
| Tundra raro | Picea azul | 4,5 × 2 | cono denso de 6 pisos | 2,2 ± 0,2 | 0,40 |

El grosor es el del pie para el tronco medio; uno mas alto de su especie sale mas
grueso (`√(desnudo/μ)`). Y el tronco **acaba en punta dentro de la copa**: fue
un rectangulo que subia al 85 % de las coniferas, y ahi el cono ya es mas
estrecho que el, asi que el autor vio asomar su canto por los lados. En las
coniferas la punta cae a media altura de un piso, para quedar tapada tambien
en el alerce, que entre piso y piso deja hueco. En pixelart, el tallo va
**recto hasta la base de ese piso y estrecha solo dentro de el**: estrechando
en los huecos del alerce, cada escalon dejaba un pixel con aire encima. En el
roble y el cerezo el tronco se abre por debajo de la copa y sus ramas suben
entre las masas de follaje (la referencia del autor); el tallo del centro no
asoma dentro de la copa. `BillboardSet.crowns` cuenta los pixeles de tronco
con aire encima por dentro de la copa (`asoma`) y el humo exige cero; las ramas
que se ven entre las masas suben hasta el follaje y no cuentan.

Sustituyo a un `CROWN = 1.5` comun que duro un dia. La copa se apoya **en el
tronco desnudo exacto**: por eso las coniferas tienen los pisos de base plana —con las puntas caidas, la copa bajaba de su
borde y ni el tronco ni el ancho median lo que pedia la especie— y la sombrilla
del cerezo apoya su racimo grande en el borde. Las dos cosas las destapo la
medida, no la vista. Los raros dejaron de llevar su +15 % generico: ahora son
especie propia. Y como el lienzo es del ancho de la copa, **la sombra tumbada
sigue a cada especie** (`widthOf`): ancha bajo el roble, estrecha bajo la picea.

`BillboardSet.crowns` mide del dibujo alto y ancho de cada copa (la caja de
tinta por encima del tronco desnudo) y el humo afirma su ancho:alto a un 15 % del
de la especie. Muerde: dibujando los frondosos tan anchos como altos, caen roble
y cerezo.

**Una medida de proporcion no ve la silueta.** La picea negra pasaba la suya
con una elipse lisa por penacho, y en el movil del autor se leia como una bola
clavada en un palo. Ahora la punta engrosada son tres pisos cortos que cierran
en punta; eso solo lo dice una captura.

La medida del tronco miraba **unas filas por encima del pie** cuando el arte
era vectorial: el lienzo redondeaba su alto y la fila del pie mezclaba tronco y
sombra pintada. En pixelart el pie es la ultima fila del lienzo, exacta. Lo
que si costo: **la paleta de cada copa guarda sus cuatro tonos de corteza
aunque no los use** (`tools/pixel-mundo.ts`), porque con ellos se pinta el
tronco debajo; sin uno, ese tono salia transparente y las coniferas median
0,2 bloques de tronco. Lo afirma `tests/world-art.test.ts`.

**Esto es ARTE, no fisica.** El salto (apice 1,16), `STEP_UP` y la colision van en
unidades de mundo y no saben lo que mide un sprite, asi que `packages/sim` no se
entera. Y de paso queda mas cerca de Minecraft de lo que estaba: alli mides 1,8,
subes 0,6 andando y saltas 1,25; aqui 1,93, `STEP_UP` 0,5 y apice 1,16. La regla
21 se lee igual de bien con el personaje nuevo.

**Las proporciones se MIDEN, no se miran.** `BillboardSet.sizes` busca el pixel
con tinta mas alto de cada lienzo y lo pasa a bloques (la roca, de sus
voxeles); `npm run shots` los imprime. No vale el alto del lienzo ni el ancla:
con el arte vectorial, un arbol ocupaba 39 px de un lienzo de 58, y estimando
por el lienzo salia que un brote mediria 1,52 bloques y una roca 2,88; medidos
eran 0,88 y 1,09.

Dos cosas arrastro el cambio y no eran opcionales: **la altura de los ojos**
subio con el personaje —1.2 le quedaba por las rodillas al nuevo; paso a 1.6 y
hoy es `EYE_HEIGHT = 1,75`, la misma para las tres vistas y el golpe (deduccion
mia)—; y **los escombros** llevaban el mismo `BASE`, porque son astillas de lo
que se derriba y sin el pasaban de chinas a polvo. Desde el pixelart miden
pixeles enteros a 24 por bloque (de 4 a 12; las esquirlas, de 2 a 3), lo mismo
que median, y sus colores son los de su dibujo (`debrisPalette`). El barrido ya no depende de
esto: recorre el borde del sector del golpe (ver `docs/efectos.md`).

Y una consecuencia que es de juicio del autor, no medible: **el relieve se lee
menos de la mitad de alto**. Una pared de un bloque pasa de llegar al pecho a
llegar a la rodilla, y una cima de 27 niveles de medir 34 personajes a medir 14.
La fisica no cambia ni un decimal, pero los 16 px por nivel se calibraron a ojo
en el isometrico, que era donde un nivel se media en pixeles.
