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
cifras y lo que decidio el autor en cada una estan en `docs/pendiente.md`.

Decisiones del autor, que no se tocan sin preguntarle:

- **Trabajo por golpes.** Cada objeto pide un trabajo (`workOf`) y cada golpe
  suma el poder de lo que se lleva en la mano (`toolStats`); a mano, algunas
  cosas no se completan. Un arbol sin hacha no cae: suelta ramas. Roca y
  minerales piden pico, y el hierro uno de cobre o mejor.
- **Se equipa una herramienta**: las casillas 1-4 (la primera fila del
  inventario) son la barra y la elegida es la mano. La eleccion viaja en la
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
- **16 casillas con pilas de 100** (`sim/inventory.ts`), y el **Bolso** las
  amplia: la bolsa +2 o la mochila +6, **una sola a la vez** (el autor,
  2026-10-04; antes, la bolsa a la cintura y la mochila a la espalda, 24 como
  mucho). Se arrastran a su casilla de PERSONAJE, y **no se quitan ni se
  cambian con sus casillas ocupadas**.
  **Arrastrar mueve**: el mismo objeto se apila y lo que sobra se queda; uno
  distinto se intercambia (`Inventory.move`). Con el inventario abierto se
  arrastra entre la rejilla y la barra de la mano; **cerrado, dentro de la
  barra**. **Soltarlo fuera del panel lo tira, previa confirmacion**; desde la
  barra con el inventario cerrado, soltar al vacio no hace nada.
- **Fabricar es mantener pulsado 1,5 s** el resultado de la receta, con la fila
  llenandose de izquierda a derecha **hasta el borde derecho de los
  ingredientes** (la fila mide lo que su contenido); sin ingredientes se ve
  apagada y no hace nada, y sin sitio tampoco.
- **No hay avisos en pantalla** (decision del autor, 2026-09-29): ni «necesitas
  un pico», ni «inventario lleno», ni «fabricado». El nucleo sigue dejando
  `lastBlocked`, pero nadie lo pinta. Fabricar sin sitio se resolvera en otra
  tanda, con objetos que se tiran al suelo.
- **Lo que entra y sale del inventario sale escrito**: «+5 Madera», «-1
  Bayas», en letra pequena debajo del boton INVENTARIO en el movil, subiendo
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

- **Un botin entra entero o no entra** (`Inventory.fits`): si no cabe, el golpe
  no completa y el objeto se queda en el mundo, con su dano, para acabarlo en
  cuanto haya sitio. Nada se reparte a medias ni se pierde.
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
  lleva un icono en vez de su nombre** (`equip-icons.ts`: siluetas rellenas
  de armadura y equipo medieval, segun la directriz 3 de
  `docs/guia-de-arte.md`; dibujos mios), que **se oculta al equipar algo**; el nombre
  queda solo al pasar el raton. En el movil las cinco columnas encogen hasta
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
  boton INVENTARIO, que ya alterna, ni el dialogo de tirar (deduccion mia).
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
  de la barra con el inventario cerrado (y al vacio, sin tirar), de casilla a
  casilla y de la rejilla a la barra, y mantener una receta 1,5 s. En PC lo
  hace el humo con el raton, confirmacion de tirar incluida.

Para probar sin juntarlo todo a mano, el panel de desarrollo tiene
**«Materiales de piedra»**: da materiales, no herramientas, para que fabricar
se pruebe de verdad. El humo lo usa para minar con un pico fabricado desde el
panel.
