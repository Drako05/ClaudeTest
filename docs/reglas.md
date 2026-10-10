# Las reglas duras, enteras

El texto entero de **todas** las reglas duras de `CLAUDE.md`, con sus medidas,
su historia y lo que decidio el autor. `CLAUDE.md` lleva solo el enunciado de
cada una, con el mismo numero, que es el que cita el codigo: **lo que cambie
aqui se revisa alli, y al reves.**

Las 12, 21 y 22 estaban en `CLAUDE.md` hasta el 2026-10-02 y se mudaron aqui **literal** (propuesta 3:
`CLAUDE.md` se carga entero en cada turno, asi que lleva solo lo operativo y
un indice de estos documentos).

## Las demas reglas duras, enteras

Estaba en `CLAUDE.md` hasta el 2026-10-10 y se mudo aqui **literal**: `CLAUDE.md`
se carga en cada llamada, asi que alli queda solo el enunciado.

1. **`packages/sim` jamas toca el navegador.** Sin DOM, canvas, WebGL, three.js ni
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
   nucleo. La mirada tambien viaja ahi (`aimX`/`aimY`, y `aimZ` para su
   inclinacion), y es **la de la camara**, decision del autor: cada tick sale de
   `camera.forward()` y `camera.lookPitch`, que son **la misma en las tres
   vistas**, y el nucleo la usa **tal cual, sin encajarla en ocho
   direcciones**: inclina el sector del golpe (regla 12). Se acciona hacia donde se mira; y
   como el movimiento tambien se rota con la camara antes de entrar en la
   Intent, la Intent sigue siendo de mundo y puede viajar por red.

   **`moveX`/`moveY` son DIRECCION, no velocidad.** Su magnitud no dice nada. Lo
   cambio el autor al pedir la carrera: el joystick hacia de acelerador —cuanto
   mas desplazado, mas rapido— y eso se sustituyo por dos velocidades discretas
   que elige `run`. Un mando analogico apunta; no dosifica. La zona muerta se
   queda, pero vive en el cliente: el nucleo solo ve direcciones.
6. *(Retirada con el isometrico: la vista isometrica girable. Ver
   `docs/isometrico.md`.)*
7. *(Retirada con el isometrico: la capa ordenada por profundidad. Ver
   `docs/isometrico.md`.)*
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
13. **El relieve sale de la misma elevacion que el terreno, en voxeles de 0,5**
    (decision del autor, 2026-10-06). Cada columna de 0,5 × 0,5 tiene su altura
    en medios bloques (`heightFrom`, 0,03 de elevacion cada uno: el 0,06 del
    autor partido en dos), interpolando el relieve entre las esquinas de su
    casilla; lo que es agua lo decide la casilla, el mismo `e < 0.42` de
    siempre, asi que `terrainAt` no cambia y los umbrales de bioma siguen
    calibrados. El bioma, la vida y los objetos siguen por casilla de 1. Si
    mueves el nivel del mar sin mover el umbral de agua,
    `tests/relief.test.ts` te avisa.
14. **La altura y los muros son dos mecanismos distintos.** Las **cordilleras**
    amplifican el desnivel sobre el nivel del mar, y de ahi salen la altitud y
    las laderas escalonadas; los **salientes** levantan +3 de golpe y de ahi
    salen las mesetas. Con voxeles de 0,5, la ladera de una cordillera sale en
    paredes de un bloque, que se saltan, y las paredes de dos o mas solo las dan
    los salientes (medido, 2026-10-06). Los salientes se pagan en conectividad, y
    su densidad esta calibrada, no elegida. Antes de tocar `OUTCROP_THRESHOLD`,
    `RIDGE_GAIN` o sus escalas, vuelve a medir con
    `npx vite-node tools/analyze-world.ts` y mira la **linea base solo-agua**: el
    mundo plano tampoco es del todo conexo, y comparar contra el 100 % hace pasar
    por sano un relieve que no lo es. El presupuesto acordado es un punto.
15. *(Retirada con los voxeles, 2026-10-06: la rampa. El autor elimino las
    rampas; el relieve sube a escalones de medio bloque, que se suben andando.
    Ver `docs/relieve.md`.)*
16-20. *(Retiradas con el isometrico: el orden por antidiagonales, el recorte
    por bloques, la silueta del jugador, la fila de su casilla y el filo de los
    escalones. Ver `docs/isometrico.md`.)*
23. **Cualquier medida de conectividad tiene que obedecer la fisica.** El
    recorrido de `debug.reachableArea` inundaba mirando solo los solidos, y
    desde que una pared detiene el paso eso dejo de medir lo que el jugador
    recorre. Sus cifras de antes y las de ahora **no son comparables**.
    `tools/analyze-world.ts` ya lo hacia bien —mide con «se sube un bloque de un
    salto»—, asi que la calibracion de la regla 14 estaba hecha para esta fisica
    y aguanta. Desde los voxeles (2026-10-06) las tres medidas van **por
    columnas de 0,5**: medio bloque andando, uno de un salto (`canClimbTo`). El
    relieve cuesta 0,14-0,76 puntos sobre la linea base solo-agua, lo mismo que
    antes, por debajo del punto acordado.

## Las reglas 12, 21 y 22

12. **El golpe es un SECTOR PLANO que sale de los ojos y cuenta solo si toca
    un hitbox** (`sim/aim.ts`), decision del autor del 2026-09-28: **3
    bloques** (eran 2; los subio a 2,5 el 2026-09-29 y a 3 el 2026-10-01) **y 90 grados** (±45) en el plano de la mirada —la direccion en que se mira,
    con su inclinacion, y la horizontal a su derecha—, y **el terreno lo
    corta**: no se golpea a traves del suelo ni de una pared. Se recorre con 33
    rayos (a 3 bloques, un hueco de 0,147, menos que el tronco mas fino, 0,21), cada uno
    cortado donde entra en el terreno; cae todo objeto cuyo hitbox cruce alguno.
    **Sembrar** va donde la mirada toca la cara de arriba del suelo, a menos de
    3 bloques **en horizontal** —el mismo alcance, decision del autor— (lo de
    horizontal es deduccion mia: a lo largo de la mirada habria que mirar 44
    grados abajo para sembrar en llano; asi, 35); ni en la cara de una pared ni
    mirando al cielo.

    **El plano del sector puede girar alrededor de la mirada** (`aimRoll` en
    la `Intent`, `lookRoll` en las entidades; positivo, su derecha sube). Con
    0 es el de siempre, y asi va con MIRA y el teclado. Lo usa el modo **TAP**
    del movil (pedido del autor, 2026-10-01: al tocar a un lado del jugador el
    barrido salia casi vertical): el cliente lo gira para que **contenga la
    derecha de la camara** (`rollFor`), que es el «primero Y y luego X» que
    propuso el autor —girar hacia el lado con el abanico plano y despues
    inclinarlo sobre la derecha de la camara—. En primera persona eso es
    exacto: el trazo sale horizontal y centrado en el toque. En tercera, la
    camara no esta en los ojos, y un arco en el aire a un lado del jugador se
    ve de frente y torcido; ahi se elige, en la media vuelta alrededor, el
    giro con el que el trazo **se ve** menos alto para lo ancho que es
    (`flattestRoll`, con cinco de los rayos ya cortados por el terreno;
    deduccion mia). Medido: de hasta 2,75 de alto/ancho a 0,42 como mucho, y
    lo que queda es la curva propia del arco. El nucleo no se entera de por
    que: golpea con el giro que le llega, asi que lo que se ve es lo que se
    golpea.

    **Hitboxes** (`hitboxAt` en `systems/gathering.ts`): cajas verticales
    centradas en su casilla y apoyadas en su suelo. **El del arbol es solo su
    tronco desnudo** —del suelo a la copa y del grosor de su especie—, decision
    del autor: las hojas no. Por eso el tronco de cada arbol **vive en el
    nucleo** (`sim/trunk.ts`) y el cliente lo lee de ahi para dibujarlo: el que
    se ve y el que se golpea son el mismo numero, escalon de cuarto de bloque
    incluido, y un test lo afirma. Arbusto, roca, minerales y brote llevan
    medidas sacadas de su dibujo (deduccion mia). **Desde el 2026-10-05 esa
    caja es tambien la que choca** si su tipo choca (`sim/boxes.ts`; ver la
    regla 21).

    **El de un animal son las cajas de su cuerpo** (decision del autor,
    2026-10-03): las partes `hit` de su plano (`shared/fauna-body.ts`), giradas
    con su rumbo (`animalBoxes`, `rayOrientedBox`). Desde el 2026-10-05 (el
    autor), **la cabeza, el cuello, las extremidades y el tronco**; lo pequeno
    o fino —cuernos, colas cortas, alas recogidas, orejas, las patas de la
    gaviota y del cangrejo— no. Es el mismo plano que se dibuja, como el tronco
    de los arboles.

    Es el tercer modelo, y cada uno cayo por lo mismo: la primera persona.
    Cuatro casillas fijas (la apuntada, sus vecinas en el anillo de 8
    direcciones y la propia) golpeaban lo que no estaba delante de los ojos; un
    cono sobre casillas, con «dos alturas», se quedaba corto. Con la mirada
    libre arriba y abajo, lo unico que decide es lo que hay delante: sin casilla
    propia ni alturas, lo pone la geometria. **Consecuencia que conviene saber:
    el sector es plano**, asi que mirando al frente pasa por encima de un
    arbusto (1,1 de alto, los ojos a 1,75) y hay que mirar hacia el.

    **Dos modos de golpe** (decision del autor, 2026-09-30): el **barrido**,
    que es todo lo de arriba, y el **preciso**, que golpea **solo el primer
    objetivo que cruza el centro de la mira**, cortado por el terreno y a
    menos de 3 (`preciseTarget`, el mismo rayo que abre una estacion). Es un
    estado de la `Intent` (`precise`), como correr; se cambia con TAB o el
    boton MODO, y en vez del arco se ve una **estocada** recta que **nace
    abajo a la derecha de la pantalla** y va hasta lo golpeado en el centro de
    la mira (`stabLine`, con `STAB_SCREEN`). Ese punto de pantalla es el de la
    camara de **primera persona** en las tres vistas —que va siempre en los
    ojos aunque no se dibuje con ella—, asi que el recorrido en el mundo es el
    mismo: con la camara activa, en tercera persona nacia lejos del jugador
    (lo vio el autor, 2026-10-01). Recorria la linea de la mirada y,
    vista de punta, solo se veia al moverse (lo vio el autor); `npm run slash`
    la cuenta en pixeles en ese cuadrante.

    **Colocar** va donde se siembra o, si la mirada toca un **costado** del
    terreno, en la casilla de delante de esa pared (`aimSurface`), y la caja
    **cae** hasta su suelo desde donde la tocaba la mirada (decision del autor:
    todo tiene gravedad; la caida solo se ve, el nucleo la pone en su sitio).

21. **La altura estorba, y estorba con UNA regla: no se entra donde el suelo
    esta por encima de los pies.** De ahi salen las tres cosas a la vez y sin
    casos especiales — un escalon de medio bloque se sube andando, una pared de
    uno no, y en el aire uno se estampa contra la cara de un bloque porque a esa
    altura su suelo sigue estando encima. Lo unico que cambia entre andar y
    volar es **cuanto** margen hay: andando, `STEP_UP`; volando, ninguno.

    **`STEP_UP` es 0,5, inclusive**: todo lo que mida ≤ 0,5 se sube andando, y es
    una caracteristica de la fisica, no de cada cosa (decision del autor,
    2026-10-06, con el terreno de voxeles de 0,5). Hasta entonces era la holgura
    que separaba un talud de una pared; las rampas se retiraron y el relieve
    sube a escalones de medio bloque, que es justo lo que ese margen deja
    pasar.

    **Solo subir es de golpe; bajar es caer** (el autor, 2026-10-10: «solo al
    subir escalones ≤ 0.5 se permite teletransportar»; «solo bajan de escalón
    cuando al caer ninguna de sus cajas choca con algo»). Hasta entonces
    `SNAP_DOWN`, el gemelo de bajada de `STEP_UP`, pegaba los pies al suelo
    medio bloque para no ir dando saltitos escalera abajo; se retiro. Ahora un
    escalon de medio bloque tarda 0,13 s en caerse, y **cayendo no se salta**:
    el autor eligio no dar margen (2026-10-10). Y nada sube mas de golpe: una
    columna que asoma mas de `STEP_UP` sobre los pies no se pisa, igual que una
    caja (*deduccion*); si un cuerpo aparece con la huella metida en una pared
    —puesto a mano con `?x=&y=`—, se queda al pie en vez de subir a lo alto, y
    al aparecer los pies van a lo que pisa la huella, no el centro.

    **Inercia** (el autor, 2026-10-10): arrancar y frenar duran `INERTIA_TIME`,
    0,1 s, a ritmo constante, en el suelo y en el aire (`steer`,
    `systems/movement.ts`). Andando se resbalan ~0,22 m al soltar a 60 Hz, y
    dar media vuelta tarda 0,2 s. El ritmo es el del paso que se lleva puesto
    (*deduccion*): soltar a la vez la direccion y la carrera frena desde
    correr al ritmo de andar. Contra una pared, el eje bloqueado pierde su
    velocidad: no se acumula impulso.

    **La cabeza choca** (el cuerpo mide `PLAYER_HEIGHT`, 1,8, del autor): una
    caja que empieza por encima de la cabeza no estorba de lado, es techo, y un
    salto debajo se corta contra ella (`ceilingOver`, `headroom`). El mundo de
    hoy no genera nada colgado; lo afirma un test con un mundo a mano.

    La altura del personaje es **suya** (`entities.z`), no la del suelo bajo sus
    pies, y el que dibuja tiene que leer esa. Leyendo el suelo el personaje
    queda pegado al terreno tambien en pleno salto, que es como si no hubiera
    salto.

    **La gravedad se integra por el promedio de las dos velocidades**, no con el
    Euler de toda la vida. Con aceleracion constante eso no es una aproximacion,
    es la parabola exacta; con Euler el apice medido salia 1.06 en vez de los
    1.16 de la derivacion, y ese decimo es justo el margen que el autor pidio
    para que subirse a un bloque no fuera al milimetro.

    **Con la huella entera se alcanza mas**: el bloque a dos casillas a altura 2
    ya se alcanza de un salto, de pie en su filo (`tests/jump.test.ts`). El
    autor lo acepto (2026-10-10): «no hay problema en que se alcancen más
    casillas siempre que se respeten las leyes físicas».

    **Los objetos entran en ese suelo por su caja** (decision del autor,
    2026-10-05, que extiende la de las estaciones del 2026-09-30: «fisicas como
    un bloque»). Cada objeto tiene **una** caja, la que se golpea (regla 12),
    ajustada a el y con alto; si su tipo choca (`blocksBody`: el tronco del
    arbol, la roca, los minerales y las estaciones; el arbusto, el brote y los
    guijarros no), entra en el suelo que se pisa. **El cuerpo se apoya y choca
    con su huella entera** (`BODY_RADIUS` por lado), tambien contra las
    estaciones y, desde el 2026-10-10, **tambien contra el terreno** («todas
    las cajas chocan con el terreno en todo momento», el autor): hasta
    entonces el terreno se media en el centro. Lo que pisa el cuerpo es
    `squareFloor` (`sim/boxes.ts`): cada columna de 0,5 que toca la huella
    (`terrainUnder`) y, encima, el techo de cada caja que la toca; lo usan el choque, la
    vertical (`footing`) y el auto salto, y nada mas —el terreno que se dibuja,
    el golpe y sembrar siguen con `groundHeightAt`—. De ahi, sin casos
    especiales:
    - una roca (1,0) o una mesa (1) estorban de lado como una pared, se suben de
      un salto (llega a 1,16), encima se esta de pie y al bajarse se cae;
    - un tronco (de 2 a 5) no se sube, y entre dos troncos vecinos se pasa si el
      hueco supera el cuerpo (0,68): entre los de tundra si, entre los de
      bosque o pradera no;
    - el horno mide 1,25 y **no se sube desde su mismo nivel**: a proposito,
      porque «que haya bloques de diferente altura sera una de las
      caracteristicas del juego».

    Una caja que asoma **mas de `STEP_UP` por encima de los pies no se pisa**
    (*deduccion*): si un arbol crece bajo la huella, el cuerpo se queda metido
    en vez de subir de golpe a su techo. Hasta el 2026-10-05 los arboles y la
    roca chocaban por la casilla entera y sin alto, y la estacion se media en
    el centro (`World.floorHeightAt`, retirado).

    **Los animales llevan la regla a sus partes** (2026-10-03, ver
    `docs/fauna.md`). Sus pies, en el centro y con `STEP_UP` contra el
    terreno. Ademas, cada parte de su cuerpo que choca (`hit`), girada con su
    rumbo, no puede solapar una casilla de agua, y desde el 2026-10-10 **todas
    sus cajas chocan siempre** (el autor): cada una mide su altura de reposo
    (`partsRest`) —lo mas alto bajo ella, columnas de 0,5 y cajas de objetos,
    menos lo que esa caja esta por encima de los pies—, el cuerpo reposa en el
    maximo de todas, y una parte estorba si pide subir los pies mas de
    `STEP_UP` andando o de nada en el aire (`sim/body.ts`). La decision del
    autor es que choquen las cajas de sus partes; como se mide la altura
    contra ellas es deduccion mia. Hasta la fase B de aquella tanda, cada parte
    miraba una heuristica de escalones hacia los pies y se apoyaban solo en sus
    partes mas bajas.

22. **Donde se nace hay que ganarselo.** `findSpawn` miraba solo si el tile era
    solido, y eso basto mientras el relieve solo se veia. Con la altura
    estorbando, un hueco entre el mar y un escalon de dos bloques es un tile
    perfectamente pisable del que **no se sale**: la semilla de prueba hacia
    exactamente eso. Ahora se exigen tres cosas, de la mas barata a la mas cara
    — un rellano llano de 3x3, sitio para andar sin saltar, y sitio del que
    salir contando con el salto—. Medido en nueve semillas, cuesta mover el
    nacimiento entre 8 y 15 casillas, que en un mundo infinito no es nada.

    Con los voxeles de 0,5 (2026-10-06), el rellano pide que **las 36 columnas**
    de sus 3 × 3 casillas esten a la misma altura, y los dos recorridos van por
    columnas: medio bloque andando, uno de un salto (`canClimbTo`).

    El rellano nacio cuando la accion solo alcanzaba casillas a la altura
    propia: en terreno escalonado llegaba a una de tres y el juego empezaba
    pareciendo roto. Ese modelo ya no existe (regla 12), pero el rellano se
    queda: nacer en llano, sin un escalon que corte el golpe por delante, sigue
    siendo la mejor primera impresion.

    Y una cuarta condicion, que aparecio como efecto secundario de la tercera:
    el terreno tiene que **sostener vida**. En este mundo lo llano son las
    mesetas y las mesetas son roca, asi que pedir suelo liso mudo el nacimiento
    a piedra pelada en cinco de nueve semillas, a niveles de hasta 16, sin nada
    que comer y con el hambre corriendo desde el primer tick. Cuesta nada —el
    radio de busqueda pasa de 8-15 a 8-17 casillas—, y no es una preferencia:
    es quitar un sesgo que metio la regla anterior.
