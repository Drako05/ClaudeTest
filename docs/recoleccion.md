# Recoleccion y fabricacion

Lee esto antes de tocar el inventario, las herramientas, el trabajo por golpes,
las estaciones, los equipables (bolso y armas), el panel `inventory-ui.ts` o el
registro de objetos.

Estaba en `CLAUDE.md` hasta el 2026-10-02 y se mudo aqui **literal** (propuesta 3:
`CLAUDE.md` se carga entero en cada turno, asi que lleva solo lo operativo y
un indice de estos documentos).

La progresion la pidio el autor tal como la viviria un jugador: aparece sin
nada, recolecta con las manos, fabrica sus primeras herramientas, que le dan
mejores recursos, y con ellos fabrica mejores herramientas e indumentaria. Fue
en dos tandas, las dos hechas: la **tanda 1** (manos → herramientas de piedra →
lo que sacan) y la **tanda 2** (mesa, horno, fundir, cobre, hierro y ropa). Las
cifras y lo que decidio el autor en cada una estan en `docs/historia.md`.

Decisiones del autor, que no se tocan sin preguntarle:

- **Trabajo por golpes.** Cada objeto pide un trabajo (`workOf`) y cada golpe
  suma el poder de lo que se lleva en la mano (`toolStats`); a mano, algunas
  cosas no se completan. Un arbol sin hacha no cae: suelta ramas. Roca y
  minerales piden pico, y el hierro uno de cobre o mejor.
- **Se equipa una herramienta**: las casillas 1-5 (la primera fila del
  inventario, de 5 columnas desde el 2026-10-19) son la barra y la elegida es
  la mano. La eleccion viaja en la
  `Intent` (`select`), como fabricar (`craft`), mover (`moveFrom`/`moveTo`),
  tirar (`discard`) y usar (`use`): regla 5.
- **Usar** (clic derecho, boton USAR): **mirando una estacion, la abre**, se
  lleve lo que se lleve en la mano; si no, es con lo de la mano: bayas se
  comen, una semilla se siembra —esa, no otra— y una mesa o un horno se coloca,
  las dos donde toca la mirada (`tryUse`). Lo demas que se mira (puertas)
  llegara despues.
- **Se desgastan y se rompen**, y **todo golpe que toca algo gasta un uso** de
  lo que pega, sea suyo o no: un hacha contra la roca, tambien (el autor,
  2026-10-04; antes, golpear lo que no era suyo no la gastaba). Uno por golpe
  y por objeto, toque a uno o a varios (propuesta mia); al aire o a un brote,
  nada (deduccion mia: lo que no da impacto no se toca).
- **15 casillas con pilas de 100**, tres filas de 5 (el autor, 2026-10-19;
  16 hasta entonces) (`sim/inventory.ts`), y el **Bolso** las
  amplia: la bolsa +2 o la mochila +6, **una sola a la vez** (el autor,
  2026-10-04; antes, la bolsa a la cintura y la mochila a la espalda, 24 como
  mucho). Se arrastran a su casilla de PERSONAJE, y **no se quitan ni se
  cambian con sus casillas ocupadas**.
  **Arrastrar mueve**: el mismo objeto se apila y lo que sobra se queda; uno
  distinto se intercambia (`Inventory.move`). Con el inventario abierto se
  arrastra entre la rejilla y la barra de la mano; **cerrado, dentro de la
  barra**. **Soltarlo fuera del panel lo tira, sin preguntar** (el autor,
  2026-10-18: «ya no se pide confirmacion»). **Desde la barra**, este el panel
  abierto o no: **soltarlo en cualquier sitio que no sea una casilla lo tira**,
  y **soltarlo sobre el boton INVENTARIO lo guarda** fuera de la barra
  (`Inventory.stow`, `Intent.stow`): primero completa pilas del mismo objeto y
  lo que sobre va a la primera casilla vacia; lo que no cabe se queda en la
  barra (el autor: «primero apila, luego vacia»).
- **Las opciones de una casilla** (el autor, 2026-10-19, con una foto):
  **clic en PC**, o **mantenerla 0,3 s en el movil**, sobre una casilla de la
  rejilla con algo abre a su lado **Usar** (lo que se come), **Dividir** (lo
  apilable), **Equipar** (lo que tiene hueco en PERSONAJE) y **Destruir**
  (todo), en ese orden y solo las que tocan (`item-menu.ts`).
  - **Donde**: las columnas 1-2 lo sacan a la derecha y las 3-5 a la
    izquierda, centrado en la altura de la casilla; en la primera o la ultima
    fila **visible** de la rejilla se alinea con su borde de arriba o de abajo,
    para no salirse por encima de las pestanas ni sobre la descripcion.
  - **Se cierra** al arrastrar, al tocar en otro sitio —y ese toque hace lo
    suyo—, al cerrar el panel o al cambiar de pagina. Un toque corto en el
    movil solo describe, como siempre.
  - **Los 0,3 s se miden por la hora de los eventos** (apoyar y soltar), no
    por cuando corre el plazo: con la pagina ocupada, el plazo corria antes de
    atender un soltar que habia llegado a tiempo, y un toque abria el menu (la
    CI del 2026-10-19). Si al soltar no llego a 0,3 s, era un toque.
  - **Usar** come de esa casilla (`Intent.useSlot`, `eatFrom`), con las reglas
    de comer: con el hambre llena, nada. **Equipar** es moverla a su hueco de
    PERSONAJE, con la regla del Bolso.
  - **Dividir** abre un selector (el autor): un area con la cantidad, que
    empieza en 0, con **[-1] [-5] [-10] [0]** encima, **[+1] [+5] [+10] [1/2]**
    debajo, **X** a la izquierda y **✓** a la derecha. Lo separado va a la
    **primera casilla libre, barra incluida** (`Inventory.split`,
    `Intent.splitFrom`/`splitCount`); sin ninguna libre, Dividir sale apagado.
    La cantidad va de 0 a la pila menos 1 y 1/2 redondea hacia abajo
    (*deduccion*); con una pila de 1, apagado (*deduccion*).
  - **Destruir** se lleva **toda la pila, con confirmacion** (el autor):
    «¿Destruir N × objeto?», Cancelar o Destruir. Desaparece, sin caer al
    suelo (`Inventory.destroy`, `Intent.destroy`); si al confirmar la casilla
    ya tiene otra cosa, no destruye.
  - **Los botones son del estandar** (directriz 6 de `docs/guia-de-arte.md`),
    con las esquinas de 8 px de los botones con texto (el autor, 2026-10-19:
    redondeadas «como todos los demas»; los 8 px, *deduccion*).
  - **Tocar fuera del selector de Dividir o de la confirmacion de Destruir los
    cierra** sin hacer nada (el autor, 2026-10-19), y ese toque sigue su curso
    (*deduccion*).
- **En el movil las casillas de la rejilla miden lo de PERSONAJE** (60 px si
  caben) y **cada una responde solo en su centro de 48 px** (`TOUCH_CORE`): un
  dedo que empieza en el anillo de 6 px desliza la rejilla (el autor,
  2026-10-19: atinarle al hueco entre casillas era muy dificil). Se decide por
  geometria al apoyar el dedo, y la rejilla la desliza el juego, sin inercia
  (*deduccion*): dejar el anillo sin eventos no sirve, porque el navegador
  acerca el dedo a lo pulsable (el ajuste de toque) y el anillo acababa igual
  en la casilla. Soltar un arrastre vale en toda la casilla. La **barra
  deslizable** va centrada en el hueco entre la ultima columna y el borde
  derecho del panel (el autor), y en un telefono estrecho adelgaza hasta caber
  en el (*deduccion*). El panel del movil queda a 8 px de cada lado.
- **Elegir una casilla que no se ve entera** —la rejilla quedo deslizada a
  medias— **desliza la rejilla hasta que se vea** (el autor, 2026-10-19), lo
  justo y en el acto (`scrollToShow`).
- **Fabricar es mantener pulsado 1 s** el resultado de la receta (1,5 hasta el
  2026-10-17, el autor), con la fila llenandose de izquierda a derecha **hasta
  el borde derecho de los ingredientes** (la fila mide lo que su contenido);
  sin ingredientes se ve apagada y no hace nada, y sin sitio tampoco.
- **Cuantas veces, con + y -** (el autor, 2026-10-17): uno encima del otro a la
  derecha de los ingredientes, en cada receta, pero **habilitados solo en lo
  que se apila** (herramientas, armas y equipables no). **Un solo mantener
  fabrica las N**, todo o nada (`tryCraft(..., times)` en el nucleo, y
  `Intent.craftTimes`). El + sube **hasta lo que alcanza**, de ingredientes y
  de sitio (`craftableTimes`); el resultado dice **lo que sale en total** y
  los ingredientes, tengo/necesito para las N. Despues de fabricar, la N se
  queda, y baja sola si ya no alcanza (*deduccion*); **al cerrar el
  inventario, todas vuelven a 1** (el autor, 2026-10-17). **Mantenidos, + y -
  repiten** de uno en uno y **cada segundo mas deprisa** (el autor: «al
  principio aumenta por ejemplo 3/s y al segundo siguiente pasa a 4/s y al
  siguiente 5/s»): uno en el acto, 3 el primer segundo, 4 el siguiente, 5…,
  repartidos a partes iguales en cada segundo (`qty-hold.ts`; que sea su
  ejemplo tal cual, *deduccion*). Los para su tope, que apaga el boton; un
  toque da uno, y el teclado tambien.
- **La barra de desgaste no se ve con la herramienta o el arma entera** (el
  autor, 2026-10-17: «nueva o con futuras expansiones de reparación»).
- **Las categorias de las recetas van por su icono**, monocromo
  (`silhouette-icons.ts`, `CATEGORY_ROWS`), con el nombre al pasar el raton.
- **No hay avisos en pantalla** (decision del autor, 2026-09-29): ni «necesitas
  un pico», ni «inventario lleno», ni «fabricado». El nucleo sigue dejando
  `lastBlocked`, pero nadie lo pinta. **Fabricar sin sitio fabrica igual**, y
  lo que no cabe cae a los pies (el autor, 2026-10-18; «Objetos en el suelo»,
  abajo).
- **Lo que entra y sale del inventario sale escrito**: «+5 Madera», «-1
  Bayas», **con el icono del objeto entre la cantidad y el nombre** (el autor,
  2026-10-17: icono y texto; la linea mide 26 px para el icono de 24, *deduccion*), en letra pequena debajo del boton INVENTARIO en el movil, subiendo
  hacia el, y **en PC encima de ese boton, bajando hacia el** (pedido del
  autor, 2026-10-02; antes, abajo a la derecha): cada linea se desliza
  despacio mientras se desvanece, la mas vieja la mas cerca del boton (en
  PC, que las nuevas vayan encima es deduccion mia, por simetria) y **nunca
  hay mas de cinco**: al llegar la quinta, la mas vieja se
  apaga deprisa (todo eso, del autor; tiempos y medidas, mios). La logica es
  pura (`pickup-feed.ts`, con sus tests) y sale de **comparar los totales**
  frame a frame, la misma cuenta que el registro del panel de desarrollo, que
  ahora la comparte: mover de casilla no escribe nada, y reiniciar no escribe
  «-N». La descripcion del inventario se vacia al tocar una casilla vacia, y al
  abrirlo no hay nada seleccionado.
- **USAR y SALTAR se encienden mientras se tocan**, como el ataque mantenido,
  y al menos 150 ms para que un toque rapido se vea.
- **Al golpear algo que no se rompe salen esquirlas**, mas pequenas, poco
  saturadas y semitransparentes que los escombros de romperlo (`spawnChips`,
  con `state.lastHits` del nucleo), y **no hay barra de progreso**. Desde el
  2026-10-03, ademas, todo golpe a algo que se puede romper deja su **impacto**
  donde toca (`docs/efectos.md`); los animales, solo el impacto.
- **La roca a mano no da nada**: la primera piedra son **guijarros** sueltos
  en el suelo, una feature inerte y finita que no estorba el paso.
- Lo basico se fabrica a mano en cualquier sitio; lo mejor, en la **mesa de
  trabajo** o el **horno** (tanda 2). Se colocan con USAR **con su cara
  principal hacia quien las pone** (pedido del autor, 2026-10-02: el lado de
  su casilla que da al jugador, `facingToward`; lo guarda el nucleo en
  `World.stationFacingAt`, fuera del chunk como el overlay, y desmontarla lo
  borra), son **cajas**, no aspas, estorban el paso y se desmontan a mano en 3 golpes. **Sus recetas no
  salen con E**: USAR mirando la estacion abre el mismo panel con las suyas, y
  se cierra cuando **su cara** queda mas lejos que el alcance, para todas
  las estaciones sea cual sea su forma, y **la distancia de cierre es siempre
  el alcance** (`STRIKE_RANGE`, decision del autor, 2026-10-01). Se mide de
  los ojos al punto mas cercano de su caja (`stationNear`; en 3D, deduccion
  mia), y es la misma cuenta con la que el nucleo acepta la receta. Fundir es
  una receta mas del horno.

Lo que el codigo tiene que respetar:

- **Todo botin cae al suelo** (el autor, 2026-10-18), y el golpe completa
  siempre, quepa o no en el inventario: «Objetos en el suelo», abajo. Nada se
  pierde.
- **El dano acumulado y las ramas arrancadas viven en `WorkState`**, fuera del
  chunk como el overlay (regla 4). El dano se pierde a los `DAMAGE_DECAY_TICKS`
  sin golpear, y tambien **al descargarse su chunk** (`forgetUnloadedDamage`,
  decision del autor, 2026-10-03: el dano no sobrevive a recargar el chunk, sea
  de una planta, un bloque o un animal); las ramas no son dano: se reponen
  **por el tiempo transcurrido**, no por pasos, asi que vivirlo y saltarlo con
  `skipTime` da lo mismo (hay test), y se quedan aunque el chunk se descargue.
- **`harvestTile` es la primitiva que completa**, sin golpes ni herramientas;
  la usan `tryHarvestArea` y los tests del ecosistema.
- **Las estaciones viven en el overlay** (regla 4): el mundo no las genera
  nunca, son inertes para el ecosistema (`lifeKindOf` da `null`) y desmontarlas
  las devuelve enteras por `harvestOf`. **Donde sirven lo decide una sola
  funcion**, `stationNear` (`sim/stations.ts`): el nucleo la usa para aceptar
  una receta y el panel para cerrarse, asi que lo que la interfaz deja intentar
  es lo que el nucleo acepta. La caja que se dibuja (`stations-view.ts`) mide
  lo que su hitbox (`STATION_BOXES`), como el tronco de los arboles.
- **Los equipables son catorce** (`Equip` en `shared`, el autor, 2026-10-04),
  en orden de lectura de la rejilla: Capa, Casco, Hombreras, **Bolso**,
  Pechera, Collar, Cinturon, Pantalon, Anillo, Botas, Mascota, Montura,
  **Arma** y Emblema. Solo el Bolso y el Arma tienen ya que ponerse; el resto
  llega en tandas posteriores. Cada hueco tiene indice de arrastre propio
  (`equipSlot(e)`, `EQUIP_BASE + e`), asi que ponerse y quitarse viajan en la
  `Intent` como mover; en cada uno entra solo lo suyo (`equipOf`), y soltar
  algo valido sobre lo puesto los **intercambia** si lo puesto se podria
  quitar (propuesta mia). Lo puesto **conserva su desgaste**
  (`Inventory.wornWear`), **cuenta en `totals()`** —equiparse no es «-1
  Mochila» en el registro— **pero no en `count()`**: una receta no se lo
  gasta.
- **El Bolso abre un tramo fijo** de 6 casillas detras de las 16 (`BAG_RANGE`):
  la bolsa abre sus 2 primeras y la mochila las 6 (`bagCapacity`). Una casilla
  cerrada no existe para meter, sacar ni arrastrar (`Inventory.isOpen`), y lo
  del Bolso no sale a su propio tramo, que se cerraria con ello dentro.
- **La casilla del Arma** (el autor, 2026-10-04): con un arma puesta, **a los
  seres vivos les pega ella** —su daño, y se gasta ella— aunque en la mano se
  lleve otra cosa; a lo demas (arbol, roca, bloque), lo de la mano. Un barrido
  que toca a la vez un animal y un arbol gasta un uso de cada uno. Sin arma
  puesta, un arma en la mano pega con ella y contra lo inerte pega como la
  mano (`ToolKind.Weapon`, poder 0), gastandose igual. Si la puesta se
  rompe, el hueco se vacia.
- **Las armas**: punal de piedra (1 rama, 2 piedras, 1 fibra, a mano), espada
  de cobre y espada de hierro (1 rama y 4 lingotes, en la mesa), en la
  categoria «Armas». Daño 15, 30 y 45 (el autor; sin equilibrar aun, habra
  una sesion de combate); duran menos que la herramienta de su material (el
  autor): 30, 90 y 180 usos, tres cuartos de los suyos (deduccion mia).
- **Los guijarros no mueven nada**: salen solo en casillas que se quedarian
  vacias y con su propio hash, asi que ningun umbral ni ninguna otra feature
  cambia (reglas 2 y 3). Van **tumbados** en el suelo (`flatGeometry`), no en
  aspa: vistos desde arriba, dos laminas cruzadas se leian como una helice.
- **Las peticiones del inventario no se tiran en pausa**, al reves que salto y
  accion: son orden, no acciones en el mundo, y esperan al primer tick.
- **El inventario (E) suelta el cursor sin pausar** (decision del autor: abrirlo
  no pausa), como el panel de desarrollo, y capturar es asincrono: si el cursor
  se captura con uno de los dos abierto, `pointer-lock.ts` lo suelta en el acto
  (sin eso, F3 y el panel seguidos lo dejaban abierto con el cursor capturado).
- **El panel es `inventory-ui.ts`**, segun los bocetos: en PC tres columnas
  —PERSONAJE, INVENTARIO y RECETAS—; en el movil, una pagina a la vez,
  elegida con las pestanas **Personaje | Inventario | Recetas**: todo el ancho
  en tres celdas iguales, la elegida iluminada y en orden fijo.
  **PERSONAJE** es el segundo boceto del autor, en PC y en el movil, con la
  columna que anadio el 2026-10-04: el dibujo en medio, tres equipables a su
  izquierda, seis en dos columnas a su derecha y cinco debajo. **Cada casilla
  lleva un icono en vez de su nombre** (`equip-icons.ts`: siluetas de
  armadura y equipo medieval, de un color y en pixelart de 24 × 24 desde el
  2026-10-17, segun las directrices 3 y 5 de `docs/guia-de-arte.md`; dibujos
  mios), que **se cambia por el del objeto al equipar algo**; el nombre
  queda solo al pasar el raton.
  **Los objetos se ven por su icono, no por su nombre** (el autor,
  2026-10-17): un pixelart a color de 24 × 24 por objeto (`item-icons.ts`,
  directriz 5), pintado a **48 px**, el doble exacto (*deduccion*), en la
  barra, la rejilla, PERSONAJE, el resultado y los ingredientes de las
  recetas, lo arrastrado y la zona de lo seleccionado. **Siempre a un
  multiplo entero de su rejilla** (el autor, 2026-10-17: solo el icono, la
  casilla se queda): a 48 donde caben 40 px de contenido —el dibujo trae un
  pixel de margen transparente y puede invadir el relleno—, y a 24 donde no
  (una consulta por contenedor, `@container`). Igual las siluetas de PERSONAJE. La cantidad o el desgaste van encima, abajo, con
  sombra para leerse; el nombre, al pasar el raton y en la descripcion. Hasta
  entonces cada casilla escribia el nombre, recortado (`SHORT`). En el movil las cinco columnas encogen hasta
  caber en 360 px. **PERSONAJE e INVENTARIO** llevan abajo la zona de lo seleccionado y
  su descripcion, del mismo tamano y a la misma altura. En el movil **no se
  desliza el panel entero**: pestanas, zona de lo seleccionado y categorias
  de recetas se quedan fijas, y solo se deslizan la rejilla del inventario o
  la lista de recetas, centradas; las categorias, cuando sean mas, a los
  lados. El humo lo mide pagina por pagina.
  **En PC** (pedido del autor, 2026-10-01): la lista de recetas mide **cuatro
  recetas exactas**, asi que la mesa con sus cuatro herramientas no saca la
  barra; 44 px entre columnas, 32 a los lados, titulos de 15 px y 14 de ellos
  a su rejilla (numeros mios). Y **mide eso siempre**, haya las recetas que
  haya (2026-10-02): el panel no cambia de tamano entre E, la mesa y el
  horno, y el humo compara los tres al pixel. **La rejilla no repite la luz
  de la barra**: la casilla elegida solo se ilumina en la barra de la mano.
- **Los botones del juego no toman el foco con el raton** (`mousedown` con
  `preventDefault` en `main.ts`). Con el foco, una tecla despues de un clic
  encendia `:focus-visible` y Chrome pintaba su contorno blanco: el autor lo
  vio en la casilla de la barra tocada con el inventario abierto, al cerrarlo
  con E (2026-10-02). Y Espacio o Intro habrian vuelto a pulsar ese boton.
- **En el movil, un toque fuera del inventario lo cierra, y solo eso**
  (decision del autor, 2026-10-01): se escucha en captura y se traga ese dedo
  entero —ni gira la camara, ni ataca, ni pulsa el boton que hubiera debajo—.
  No cuentan como fuera la barra de la mano, que es parte del arrastre, el
  boton INVENTARIO, que ya alterna (deduccion mia).
  Los gestos lo prueban con toques de verdad.
- **Con mas de lo que cabe, una barra deslizable** a la derecha de la
  rejilla y de la lista de recetas (pedido del autor, 2026-09-30 en el movil,
  2026-10-01 tambien en PC, donde la franja es de 18 px para no pisar la
  columna de las recetas): con mas casillas, el fondo de la rejilla casi no se encontraba con
  el dedo, porque todo es casilla y apoyar en una empieza un arrastre. Se ve
  **siempre que desborde, y solo entonces**; el mando se arrastra y tocar la
  pista lo lleva alli. Las cuentas son puras (`scroll-rail.ts`, con su test) y
  el DOM va en `scroll-rail-view.ts`, que se engancha a cualquier contenedor:
  la lista de recetas es la misma para la mesa y el horno, asi que cuando
  haya muchas ya esta. El humo lo mide en un telefono de 375x640, donde 16
  casillas no caben, y los gestos arrastran el mando con un dedo de verdad.
- **Arrastrar se prueba con toques de verdad** (`tools/gestures.mjs`): dentro
  de la barra con el inventario cerrado, al vacio (tira) y sobre INVENTARIO
  (guarda), de casilla a casilla y de la rejilla a la barra, y mantener una
  receta 1 s. En PC lo hace el humo con el raton, tirar incluido.

Para probar sin juntarlo todo a mano, el panel de desarrollo tiene
**«Materiales de piedra»**: da materiales, no herramientas, para que fabricar
se pruebe de verdad. El humo lo usa para minar con un pico fabricado desde el
panel.

## Objetos en el suelo (2026-10-18)

El autor: «todo botin generado debe ser arrojado como items flotantes en el
suelo. tendran gravedad pero flotaran a 0.2m de la superficie y miraran siempre
al jugador (billboard). no diran su nombre, solo sera el items». Es todo lo que
suelta romper, talar, golpear un arbol sin hacha o matar, lo fabricado que no
cabe y lo que se tira desde el inventario.

**Del autor** (sus respuestas del 2026-10-18):
- **Se recogen solos, al acercarse**: a 1 bloque del cuerpo (1,5 hasta que lo
  probo el autor, 2026-10-18), lo que se
  deja recoger vuela al jugador y entra lo que quepa; el resto se queda.
- **Caducan a los 2 dias de juego** desde que se generaron (el autor,
  2026-10-19; hasta entonces duraban para siempre), esten donde esten y aunque
  se aleje uno hasta descargar su chunk (`DROP_LIFE_TICKS`, `Drop.born`). **Al
  fundirse dos montones cuenta el reloj del mas nuevo** (el autor). Lo que
  vuela hacia el jugador tambien caduca, si le toca (*deduccion*).
- **Inventario lleno: el golpe termina igual** y el botin se queda en el suelo.
- **Lo fabricado que no cabe cae a los pies.**
- **El botin sale expulsado** de lo que lo suelta (el autor, 2026-10-18,
  despues de jugarlo dos veces: «que los elementos salgan expulsados de su
  generador con una fuerza que los lleve entre 0 y 0.5m del origen»): **desde
  la mitad de su altura** —la de su caja; la de un arbol, su tronco
  (*deduccion*)—, cada monton hacia su lado y **por fuera de la caja**, y con
  su salto cae a **entre 0 y 0,5 m de esa cara**, flotando a 0,2 m de su
  suelo. Que el origen sea la cara y no el centro es *deduccion*: nacer en el
  centro lo metia en el tronco, que es solido, y la rama se posaba encima del
  arbol; y la mata soltaba su botin debajo de si misma. Lo fabricado que no
  cabe cae a los pies.
- **Tirar no pide confirmacion** (el autor, 2026-10-18).
- **Un monton por tipo de objeto**, con su cantidad, y **dos iguales que se
  posan juntos se funden**.
- **Tirar lo lanza hacia la mirada**, en un arco corto, y no se deja recoger
  durante unos 2 s.
- **Mientras flota, sube y baja suave**, y mira siempre a la camara. Sin
  nombre ni numero: solo el icono del objeto, el del inventario.

**Como esta hecho**:
- El nucleo: `sim/drop-store.ts` (los datos, en el `World`, fuera de los
  chunks como el overlay) y `sim/systems/drops.ts`. Contiene la caida con la
  misma gravedad que los cuerpos, el suelo de su huella (`squareFloor`) o la
  superficie del agua, el iman (`collectDrops`), el salto del botin
  (`scatterLoot`), lo tirado (`throwFrom`) y lo que no cabe (`dropAtFeet`).
- Lo que reposa no se simula. Al cambiar una casilla (se tala, se coloca, crece
  algo) se despierta lo que reposaba en ella, que vuelve a caer.
- `skipTime` los hace caer y recoger tick a tick, como vivirlo quieto.
- El cliente: `drops-view.ts`, un `Sprite` por monton con el icono rasterizado
  a 24 × 24, interpolado entre ticks y con su vaiven.
- Las herramientas no se funden, y tiradas **conservan su desgaste**.
- Los numeros que no dio el autor son *deduccion* (`docs/juicio.md`): el
  salto del botin hacia arriba, la huella, el radio de fundir y flotar en el
  agua. El medio segundo antes de dejarse recoger el botin, la velocidad del
  iman, lo tirado y el tamaño del icono y su vaiven los propuse yo y **el autor
  los dio por buenos jugando** (2026-10-18).

