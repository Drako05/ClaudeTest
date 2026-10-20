# Guia de arte — trabajo en progreso

Lee esto antes de diseñar o retocar un modelo: un animal, una estacion o lo
que venga. Son **las directrices del autor** para el diseño.

## Como crece

- La abrio el autor el 2026-10-04, al dar por buenos los modelos de bloques
  de la fauna «dentro de lo esperado de una fase temprana».
- Es un **trabajo en progreso**: «podremos ir agregando lineamientos en una
  tanda dedicada o poco a poco a lo largo del desarrollo».
- **Las directrices son del autor.** El agente no añade ninguna por su cuenta:
  las propone en `docs/pendiente.md` y entran aqui cuando el autor las da por
  buenas.
- Cada directriz lleva:
  - su texto literal y su fecha;
  - lo que el agente entiende de ella, marcado *por confirmar* mientras el
    autor no lo haya visto.
- **Escribirla no la aplica.** Lo que hoy no la cumple va en su inventario,
  para la tanda que la aplique, que pide el autor.

## Directriz 1: lo que va en la piel se pinta en su cubo

> «Cuando el animal presenta patrones en su pelaje, estos pueden ser
> coloreados directamente en el cubo de esa parte del cuerpo en vez de
> hacerlos con otro cubo, esto aplicaria para elementos que van al nivel de
> la piel, como los ojos.» — el autor, 2026-10-04

- **Alcance**: los patrones del pelaje (motas, rayas), los ojos y todo lo que
  esta al nivel de la piel.
- **Lectura del agente, *por confirmar***: entran tambien estos manchones de
  color, que hoy son cajas finas pegadas al cuerpo:
  - la barriga clara;
  - la grupa blanca del ciervo;
  - el disco del hocico del jabali y la nariz del zorro;
  - la punta oscura de la oreja de la liebre;
  - la punta blanca de la cola del zorro;
  - el vientre del cangrejo.
- **Lo que hoy no la cumple** (`shared/src/fauna-body.ts`): `motas-*`,
  `raya-*`, `ojo`, `ojo-*`, `barriga`, `grupa`, `disco`, `nariz`,
  `punta-oreja`, `punta-cola` y `vientre`.
- **Aplicarla** pide pintar caras, no solo colorear cajas enteras. Dos
  caminos, sin decidir:
  - una textura por caja, como las caras de las estaciones;
  - colores por vertice subdividiendo la cara.
  - En los dos, el plano del cuerpo tendria que decir que se pinta en que cara.

## Directriz 2: lo delgado va en laminas cruzadas

> «Otra guia podria ser que los elementos mas delgados no sean cubos sino
> laminas 2D cruzadas (como los arboles).» — el autor, 2026-10-04

- **El referente** son las aspas de los arboles (`docs/arte.md`): dos laminas
  a 90 grados, cuya silueta nunca baja de `cos 45º` de su ancho.
- **Por decidir, por el autor:**
  - **Que cuenta como «delgado».** Candidatos de hoy:
    - las astas del reno (`asta*`);
    - los cuernos del bisonte y del ibice (`cuerno*`);
    - los colmillos del jabali (`colmillo`);
    - las orejas finas: liebre, ciervo, reno, zorro, ibice (`oreja`);
    - las colas finas: bisonte, jabali, ciervo (`cola`);
    - la barba del bisonte y del ibice (`barba`);
    - las alas plegadas de la gaviota (`ala`), su pico (`pico`) y sus patas;
    - las patas del cangrejo.
  - **Si una lamina puede llevar caja de golpe.** Hoy ninguna de esas partes
    es `hit`: no golpean ni chocan.
- **Lo que hoy no la cumple**: todas las de la lista, que son cajas.
- **Aplicarla** es dibujarlas como las aspas de `billboards.ts`, en el marco
  del animal y girando con el. No cambia el plano de golpe mientras esas partes
  sigan sin `hit`.

## Directriz 3: los iconos son siluetas de aventurero medieval

> «Me gustaria que los iconos esten mas inspirados en un aspecto de parte de
> armadura medieval minimalista, algo parecido a la foto que te adjunte. [...]
> El bolso que hiciste parece un bolso de mujer. Por favor cambia todo a un
> aspecto aventurero/medieval/fantasia. Agrega esto a las directrices de la
> guia de diseño grafico del juego.» — el autor, 2026-10-04

- **El referente**: la imagen que adjunto el autor, que el repo no guarda.
  - Doce iconos en negro sobre blanco: peto, yelmo con penacho, guantelete,
    hombreras con puas, grebas, escudo redondo, capa con capucha, brazal,
    capucha, tunica, botas altas y escudo de blason con un leon rampante.
  - **Siluetas rellenas de un solo color**, sin contorno; los detalles (la
    rendija del yelmo, las juntas de las laminas) son huecos calados.
  - Formas simples, que se leen pequeñas.
- **El tema** es el de un aventurero de un mundo medieval y de fantasia:
  armadura, cuero, metal, blasones. **Nada que se lea como un objeto de hoy**:
  el bolso de mano que tenia el Bolso fue justo el error que la origino.
- **Como se hacen** desde el 2026-10-17 (directriz 5): **en pixelart de 24 ×
  24, de un solo color** (`currentColor`), en `client/src/silhouette-icons.ts`.
  Los calados son pixeles transparentes. De la primera version, en vectores
  con `fill-rule: evenodd` y lo simetrico espejado, queda el diseño: el
  pixelart lo traslado.
- **Lectura del agente, *por confirmar***: vale para **todo icono del
  juego**, no solo para los equipables. **Matizada por el autor** el
  2026-10-17: los **objetos** van a color (directriz 5); las siluetas de un
  color siguen en los huecos vacios de PERSONAJE y en los botones.
- **Aplicada**:
  - los catorce equipables (2026-10-04, y en pixel el 2026-10-17);
  - **los botones** (2026-10-17): USAR, ATAQUE, MODO (barrido y preciso),
    ENTRADA (mira y toque), el ojo en sus tres estados y la mira, la
    informacion, OTROS, INVENTARIO, la llave inglesa, los cubiertos y el
    corazon de los anillos, y los cuatro que eran un caracter: correr (»),
    saltar (↑), el auto salto (A) y el bioma (🌿). Sus diseños son del agente,
    aprobados por el autor en la hoja de la ronda 2 («Aprobados»).

## Directriz 4: las patas caben en el cuadrado de la caja de colision

> «La idea de una caja con base cuadrada, es que cubra en gran medida las
> patas del animal, pero a su vez, la caja no debe sobre salir demasiado del
> ancho del animal. entonces, esto implica que las patas delanteras y
> traseras, no pueden estar mucho mas separadas que el ancho del propio
> animal, para que la base cuadrada las cubra.» — el autor, 2026-10-14
>
> Y al preguntarle: rediseñar los modelos para que la separacion entre patas
> delanteras y traseras sea mas o menos el ancho del cuerpo; la directriz va a
> esta guia, y el revisa los modelos nuevos con capturas.

- **La caja** (`docs/reglas.md`, regla 21): de base cuadrada, de lado 1,2
  veces el ancho del cuerpo, alta hasta el lomo y sin girar con el animal. Su
  referente es la vaca de Minecraft.
- **Como se aplico** (propuesta del agente; **el autor dio por buenos los
  modelos** con las capturas, 2026-10-14: «aprobados esos diseños»):
  - mirando el animal a lo largo de un eje, el borde de fuera de cada pata
    queda **dentro del cuadrado**, y se ponen justo en su borde; en diagonal
    asoman las esquinas, como en Minecraft;
  - el tronco mide **1,5 veces el ancho del cuerpo** (la vaca de Minecraft:
    1,125 de largo por 0,75 de ancho); la cabeza, el cuello y la cola se
    acercan lo que se acorta;
  - un animal muy estrecho se **ensancha** antes que quedarse en un cubito con
    patas: se hizo con la liebre, el zorro, el ciervo y el ibice;
  - no cuenta para las patas finas y sin caja (el cangrejo, la gaviota).
- **Como se revisa**: `__verdant.faunaGallery(true, 100)` pinta las 30 en una
  rejilla con su caja en cian; `tests/fauna-body.test.ts` afirma que ninguna
  pata se sale.
- **Aplicada**: las ocho especies de cuatro patas, en sus tres etapas
  (2026-10-14), aprobadas por el autor con las capturas. Un modelo nuevo
  sigue la misma regla.

## Directriz 5: los iconos son pixelart HD de 24 × 24; los objetos, a color

> «La siguiente tanda quiero que sea de iconos. vamos a generar svg para cada
> objeto disponible actualmente en el juego. quiero que tengan aspecto
> pixelart HD. te mande una imagen de referencia.» — el autor, 2026-10-17
>
> «Los iconos de items seran pixelart a color. los iconos de las casillas
> vacias del inventario y de los botones siguen siendo siluetas
> monocromaticas. pero en esta tanda incluye pasar los iconos de casillas
> vacias de inventario y los iconos de los botones a pixelart 24x24.» — el
> autor, 2026-10-17

- **El referente**: la imagen que adjunto el autor, que el repo no guarda.
  Iconos de unos 16-20 pixeles sobre fondo oscuro, con contorno oscuro de 1
  pixel, 3-4 tonos por color y la luz arriba a la izquierda.
- **Del autor** (respuestas del 2026-10-17):
  - **rejilla de 24 × 24**;
  - **el icono sustituye al nombre** donde se ve un objeto (las casillas, las
    recetas, lo arrastrado, lo seleccionado); el nombre queda al pasar el
    raton y en la descripcion; el registro de lo recogido lleva **icono y
    texto**;
  - **los objetos, a color**; los huecos vacios y los botones, **siluetas de
    un color** (directriz 3), tambien en 24 × 24.
- **Lo que el agente saco de la referencia, *por confirmar***:
  - **contorno oscuro de 1 pixel** (`#1d1a26`) alrededor de todo: ningun
    pixel de color toca lo transparente (lo afirma
    `tests/pixel-icons.test.ts`);
  - **luz arriba a la izquierda**, sombra abajo a la derecha;
  - **3-4 tonos por material** (luz, base, sombra y a veces hondo), sacados de
    **una paleta comun** por material (`ITEM_PALETTE`, en
    `client/src/item-icons.ts`: madera, corteza, piedra, hierro, cobre,
    carbon, hoja, baya, carne, hueso, fibra, piel, pluma, caparazon, fuego…),
    para que los 30 se lean como una familia;
  - **un pixel de margen** como minimo;
  - **los de una familia, iguales salvo el material**: hachas, picos,
    espadas, lingotes y minerales.
- **Como se hacen**: `client/src/pixel-art.ts`. Cada icono son 24 filas de 24
  caracteres; `.` es transparente y cada letra, un color de su paleta. Se
  pinta como SVG, un `<path>` por color con los pixeles seguidos juntos, con
  `shape-rendering: crispEdges`. Se dibujan y se corrigen **a mano, en la
  rejilla**.
- **Siempre a un multiplo entero de la rejilla** (el autor, 2026-10-17:
  «Puedes ajustar solo el icono y dejar las casillas/botones del tamaño
  actual?»): 24 o 48 px, nunca lo que quepa. Si no, sus pixeles salen
  desiguales. El humo mide cada icono que se ve.
- **El relieve va en el boton, no en el icono** (el autor, 2026-10-17: «La
  ilusión de relieve no debe ir en el dibujo del icono, sino en el botón»).
  Los botones son cuadrados y llevan luz y sombra (`docs/controles.md`); el
  icono, plano.
- **Los bloques que se ponen en el mundo, como su bloque 3D** (el autor,
  2026-10-17: «Los iconos de las estaciones deben ser lo más parecido a sus
  bloques 3d. Lo mismo para todos los iconos de bloques que se puedan poner en
  el mundo de ahora en adelante»), y al preguntarle, **en 3/4, isometricos**,
  como el inventario de Minecraft. Se sacan de **las mismas texturas** del
  modelo, con la luz de cada cara (tapa 100 %, frente 95 %, costado 74 %) y
  **pasadas a sRGB como las pinta three.js**, que trata la textura del lienzo
  como lineal: es el color que se ve en pantalla (sin eso, el icono salia mas
  oscuro que el bloque; lo noto el autor).
- **Las categorias de las recetas, monocromas** (el autor, 2026-10-17: «para
  que se entienda que son representaciones generales»), como los botones.
- **Como se revisa**: `?iconos=1` abre en el juego la hoja de los 73 (33
  objetos —las tres palas, desde el 2026-10-20—, 14 huecos, 20 botones y 6
  categorias), cada uno a 48 px y a 96, con su nombre.
- **Aplicada**: los 30 objetos, los 14 huecos y los botones (2026-10-17), y
  las tres palas (2026-10-20).
  Los de la mesa y el horno cambiaron de colores con sus caras en pixelart
  (2026-10-19, directriz 7): cada color, el del mismo papel y la misma luz.
  Los diseños son del agente, y **el autor los aprobo en dos hojas**
  («Aprobados, adelante con la ronda 2», «Aprobados, adelante con la ronda
  3»). Un objeto nuevo necesita su icono: el test falla si falta.

## Directriz 6: un solo boton, para todos los botones

> «Note un comportamiento de algunos bonotes que no está estandarizado. Los
> botones de las pestañas dentro de inventario y los botones de + y -, no se
> iluminan al ser presionados. Además, los botones de las pestañas no tienen
> el texto en blanco, que es el color del icono de todos los demás botones.
> Estandariza la construcción para todos los botones de ahora en adelante
> (arte pixelart o texto, color, sombra e iluminación, comportamiento, etc.)
> y arregla los que ya mencionados.» — el autor, 2026-10-18

- **Del autor** (respuestas del 2026-10-18):
  - la pestaña elegida (Personaje, Inventario, Recetas) **se ve encendida,
    como un boton**, sin la raya de debajo;
  - **los del panel de desarrollo, igual que los del juego**, con el mismo
    azul;
  - **un solo azul**: pulsado y encendido se ven igual.
- **El estandar** (lo que se repite en todos; cada boton pone solo su tamaño,
  su sitio, sus esquinas y su letra):
  - todo lo que se pulsa lleva **`class="btn"`**, salvo las casillas, que se
    arrastran;
  - **dentro, un icono o un texto**: el icono, en pixelart de un color a
    multiplo de 24 (directriz 5); el texto, en su `<span>` y en la letra
    monoespaciada del juego; los dos **en blanco** (`#e8eef7`);
  - **fondo oscuro con borde azul tenue, y el relieve por dentro** (luz de 2
    px arriba a la izquierda, sombra de 3 abajo a la derecha);
  - **pulsado** —mientras el dedo o el raton estan encima, y **no menos de
    150 ms**, para que un toque rapido se vea— y **encendido o abierto**
    (CORRER puesto, la mochila abierta, la pestaña elegida): **se ilumina**
    con el azul, se invierten sus luces y **baja lo de dentro 2 px**; el
    boton no se mueve;
  - **apagado** (el + en su tope, una categoria vacia): tenue, sin relieve, y
    no se ilumina.
- **Lo que el agente decidio, *por confirmar***: los 150 ms (eran los de USAR
  y SALTAR); el azul, el de USAR pulsado (el mas vivo de los dos que habia); y
  que **Tirar deje de ser rojo** y **Reiniciar deje de ser azul claro con
  letra oscura**, porque «todos los botones» los incluye. (El dialogo de
  tirar, con su boton Tirar, se retiro ese mismo dia: tirar ya no pregunta.)
- **Donde vive**: la regla al final del CSS de `index.html` (`.btn`), la luz
  de pulsar en `client/src/press-light.ts`, que escucha en el documento y
  vale sola para los botones que se creen despues, y el humo
  (`buttonStandard`), que mira cada boton que se ve en PC, en el movil y en
  el panel de desarrollo y falla si uno no cumple.
- **Aplicada**: todos los botones del juego (2026-10-18).

## Directriz 7: el mundo es pixelart HD, a 24 pixeles por bloque

> «En esta tanda quiero que adaptemos el arte del terreno y los elementos
> (árboles, rocas, minerales, plantas...) al pixelart HD. Los animales quedan
> para otra tanda.» — el autor, 2026-10-19

- **Del autor** (respuestas del 2026-10-19):
  - **la medida**: «Caras de 24x24 en bloques (voxeles 12x12). Esa debe ser
    la medida para todo elemento del juego. Esto implica rehacer las
    estaciones.»;
  - **las paredes del terreno, del mismo material, mas oscuras**;
  - **sin contorno** en el mundo («Sin contornos es lo correcto», al ver el
    roble);
  - entran tambien **el agua, la mesa y el horno, el jugador, y los escombros
    y esquirlas**;
  - **las rocas y los minerales, bloques de voxeles**, no laminas;
  - el suelo, **3-4 variantes por casilla**, sin el brillo por casilla de
    antes; las **sombras, difuminadas** como antes.
- **El follaje, con sus referencias** (un roble, una mata de bayas, un arbol
  de copa alta y un arbusto «noob» frente a uno «pro», en pixelart; el repo no
  las guarda):
  - «El follaje del árbol debería ser más unido y entrelazado, no como si
    fueran varias bolas de hojas una al lado de la otra.»;
  - las ramas, **debajo del follaje**: «las que se ven dentro del follaje son
    pequeñas y tienen follaje de fondo o no están totalmente rodeadas de
    follaje», no huecos recortados en la copa;
  - **hojas con forma**: «tienen cierta forma, no son solo líneas de color»;
    el arbusto «pro» «da la ilusión de hojas»;
  - las ramas y los tallos, **con textura**.
- **Como se aplico** (lectura del agente, *por confirmar*):
  - la copa es un relieve de **masas** (la principal y las que cuelgan), cada
    una con sus matas, la luz de su pendiente y la sombra que cada mata echa
    sobre la de abajo a la derecha; encima, **hojas sueltas de 3-4 pixeles**
    con canto de luz, cuerpo y sombra, en abanicos (`foliage` y `LEAVES` en
    `pixel-paint.ts`);
  - **cuatro tonos por material** (luz, base, sombra, hondo), la luz del
    noroeste; lo vivo, desde su color de `palette.ts` con la luz hacia el
    amarillo y la sombra hacia el azul;
  - las coniferas, en **pisos** de puntas caidas y borde dentado.
- **Como se hacen**: `tools/pixel-mundo.ts` los saca de formas y los escribe en
  `client/src/world-art.ts`, donde se retocan a mano (volver a correrlo pisa
  los retoques). El detalle, en `docs/arte.md`.
- **Como se revisa**: `?mundo=1`, la hoja de todos los dibujos.
- **Aplicada** (2026-10-19): el suelo, el agua, los seis arboles, las seis
  matas, los seis brotes, la roca, los tres minerales, los guijarros, el
  jugador, la mesa, el horno y los escombros. El roble y la mata, tras tres
  rondas con sus referencias, con su ultima palabra: «Hagamos un último
  intento y aplícalo tal cual como te salga. No vamos a gastar más tiempo en
  eso, ya habrán otras tandas para perfeccionar los dibujos»; y el resto, «Dale,
  manda asi. Luego perfeccionamos».
- **Lo que no la cumple**: la fauna, que es otra tanda.

