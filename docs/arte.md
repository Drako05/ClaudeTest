# El arte en 3D: aspas y proporciones

Lee esto antes de tocar `billboards.ts`, `art.ts`, `tree-shapes.ts`,
`shadows.ts`, `shadow-patches.ts`, `sim/trunk.ts` o cualquier tamano de lo que
se dibuja.

Estaba en `CLAUDE.md` hasta el 2026-10-02 y se mudo aqui **literal** (propuesta 3:
`CLAUDE.md` se carga entero en cada turno, asi que lleva solo lo operativo y
un indice de estos documentos).

## Las features son aspas; el jugador, no

**Cada elemento del mundo son dos laminas cruzadas a 90 grados**, no un billboard.
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

- **El umbral es 0.4 y no puede ser menor**, porque el arte pinta su sombra **al
  26 %** y con el material opaco cualquier umbral que la conserve la pintaria
  **negra maciza**. O sea que la sombra del arte se descarta por fuerza.
- **Por eso la sombra va aparte y tumbada** (`shadows.ts`), que ademas es
  donde debia estar: la pintada era una elipse VERTICAL pegada al pie, herencia
  de que el arte nacio para una camara isometrica fija. Sin ella unos arboles de
  tres bloques parecen pegatinas flotando. Medido quitandolas: 60.429 pixeles
  oscurecidos con sombras contra 32.882 sin ellas.

**El material es `MeshBasicMaterial`, no Lambert.** El arte ya lleva su luz
horneada desde el noroeste y el sprite tampoco se iluminaba, asi que asi el
ASPECTO no cambia y solo cambia la orientacion. Con Lambert las dos laminas de
una misma aspa se iluminarian distinto y el dibujo se ensuciaria.

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

Lo siguiente por aqui, que ya estaba en la lista de la migracion: **agrupar las
aspas por (chunk, especie) en `InstancedMesh`**, que es lo que bajaria de verdad
las draw calls.

## Proporciones

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

El arte se redibuja por **(especie, cuarto de bloque)**, cada combinacion una
vez y solo cuando aparece (`BillboardSet.tree`): sigue siendo un Mesh por arbol
con geometria y material compartidos. `makeFeatureArt(feature, detail, { bare, pxPerBlock })`
dibuja el tronco y apoya la copa encima. Y el tronco se
**mide del dibujo**, no de la cuenta: la tirada del color del tronco en la
columna del pie, que termina donde la copa se pinta encima
(`window.__verdant.trunks`, que el humo afirma). La copa de cada arbol sale de
su especie: ver abajo.

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
grueso (`√(desnudo/μ)`). Y el tronco **estrecha y acaba en punta dentro de la
copa**: fue un rectangulo que subia al 85 % de las coniferas, y ahi el cono ya
es mas estrecho que el, asi que el autor vio asomar su canto por los lados. En
las coniferas la punta cae a media altura de un piso, para quedar tapada
tambien en el alerce, que entre piso y piso deja hueco. `BillboardSet.crowns`
cuenta los pixeles de tronco con aire encima por dentro de la copa (`asoma`) y
el humo exige cero; con el rectangulo de antes, caen tres coniferas.

Sustituyo a un `CROWN = 1.5` comun que duro un dia. La copa se dibuja **desde
su borde bajo, que es exactamente el tronco desnudo**: por eso las coniferas
tienen los pisos de base plana —con las puntas caidas, la copa bajaba de su
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

La medida del tronco busca el tronco **unas filas por encima del pie**: el
lienzo redondea su alto al alza, el ancla es una fraccion del alto logico, y la
fila del pie mezcla tronco y sombra. Con la copa mas alta esa fila cayo mal y el
frondoso midio **cero** de tronco; mirando solo la fila del pie, que un arbol
mida bien o no dependia del redondeo.

**Esto es ARTE, no fisica.** El salto (apice 1,16), `STEP_UP` y la colision van en
unidades de mundo y no saben lo que mide un sprite, asi que `packages/sim` no se
entera. Y de paso queda mas cerca de Minecraft de lo que estaba: alli mides 1,8,
subes 0,6 andando y saltas 1,25; aqui 1,93, `STEP_UP` 0,5 y apice 1,16. La regla
21 se lee igual de bien con el personaje nuevo.

**El arte se redibuja, no se estira**, que es lo que separa un 2D-HD de un
pixelado. `makeFeatureArt(feature, detail)` y `makePlayerArt(detail)` crean el
lienzo `detail` veces mas grande y le aplican `ctx.scale(detail, detail)`: **ni
una coordenada de dibujo cambia**, y `anchorX`/`anchorY` salen bien solas porque
ya eran fracciones. Con `detail = 1` sale byte por byte el dibujo original del
isometrico, que lo verifico su humo mientras existio.

**Las proporciones se MIDEN, no se miran.** `BillboardSet.sizes` busca el pixel
con tinta mas alto de cada lienzo y lo pasa a bloques; `npm run shots` los
imprime. No vale el alto del lienzo ni el ancla: un arbol ocupa 39 px de un
lienzo de 58 y lo que queda por encima del ancla es la cota superior. Estimando por el lienzo me sali
con que un brote mediria 1,52 bloques y una roca 2,88; medidos son 0,88 y 1,09.

Dos cosas arrastro el cambio y no eran opcionales: **la altura de los ojos**
subio con el personaje —1.2 le quedaba por las rodillas al nuevo; paso a 1.6 y
hoy es `EYE_HEIGHT = 1,75`, la misma para las tres vistas y el golpe (deduccion
mia)—; y **los escombros** llevan el mismo `BASE`, porque son astillas de lo que
se derriba y sin el pasaban de chinas a polvo. El barrido ya no depende de
esto: recorre el borde del sector del golpe (ver `docs/efectos.md`).

Y una consecuencia que es de juicio del autor, no medible: **el relieve se lee
menos de la mitad de alto**. Una pared de un bloque pasa de llegar al pecho a
llegar a la rodilla, y una cima de 27 niveles de medir 34 personajes a medir 14.
La fisica no cambia ni un decimal, pero los 16 px por nivel se calibraron a ojo
en el isometrico, que era donde un nivel se media en pixeles.
