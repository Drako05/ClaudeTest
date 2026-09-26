# El cliente isometrico (archivo)

El juego nacio con una camara isometrica de cuatro vistas, dibujada con PixiJS.
El 2026-09-12 el autor lo congelo y el desarrollo paso al 3D; el 2026-09-26
decidio **retirarlo del todo**, para que el 3D no dependiera de nada suyo y cada
caracteristica nueva se hiciera una sola vez.

**Nada se ha perdido.** El codigo entero sigue en la historia de `main`: el
ultimo commit con el isometrico completo es `b1d0d7a`, y se recupera con

```bash
git checkout b1d0d7a          # o la etiqueta isometrico-final, si existe
npm install && npm run build && npm run smoke
```

Este documento guarda lo que no es codigo: **por que** era como era, y que se
hizo con cada cosa que tenia.

## Lo que se traslado al 3D antes de borrarlo

Antes de borrar se comparo que rellenaba cada cliente en la `Intent`, que habia
en cada HTML, que dibujaba cada renderizador y que campos exponia cada sonda de
depuracion. Todo lo que era del JUEGO se traslado, cada cosa con su
comprobacion en la prueba de humo del 3D:

| # | Que | Donde vive en el 3D | Comprobacion del humo |
|---|---|---|---|
| 1 | Comer (E y boton) | `controls.ts` → `intent.eat` | recursos: «comer no gasto ninguna baya»; movil: «el boton de comer no llego a la Intent» |
| 2 | Sembrar (F y boton) | `controls.ts` → `intent.plant` | recursos: «sembrar no consumio ninguna semilla»; movil: boton de sembrar |
| 3 | Mirada | `main.ts`: `aimX/aimY` = `camera.forward()` (decision del autor) | escritorio: «girar la camara no giro la mirada» — comprobado quitandola |
| 4 | Muerte y reinicio | `hud.ts` (aviso), `start.ts`, R y boton | vida: aviso al morir, R y el boton empiezan un mundo nuevo |
| 5 | Salud y hambre | `hud.ts` | escritorio: barras del HUD |
| 6 | Inventario | `hud.ts` | escritorio: «el inventario del HUD no es el del juego» |
| 7 | Reloj y dia | `hud.ts` con `clockLabel`/`dayNumber` | escritorio: reloj y dia del HUD |
| 8 | Panel del entorno | `hud.ts` | escritorio y movil: barras, bioma pisado, recompensas |
| 9 | Ayuda de teclado | `spike3d.html` `#help` | escritorio: visible en PC, «ACTIVADO» con la carrera; movil: oculta |
| 10 | Dia y noche | `sky.ts`, misma vela y mismos colores | vida: vela a medianoche, nada a mediodia; `tests/sky.test.ts` |
| 11 | Reticula | `overlays.ts` con `actionReach` | escritorio: marca exactamente las casillas alcanzables |
| 12 | Zoom con + y - | `controls.ts` | escritorio: - aleja, + acerca |
| 13 | Panel de desarrollo | `devtools.ts` tal cual, cableado al bucle | desarrollo: pausa, +1 h exacta, congelar, 16x, registro, F3 |
| 14 | Bordes de chunk y bioma | `overlays.ts`, `biome-edges.ts` en coordenadas de mundo | desarrollo: dibujan, sobreviven al cambio de chunk, cero fuera de sitio; `tests/biome-edges-3d.test.ts` |

Y lo que no estaba en la tabla y se encontro por el camino: la semilla al azar
cuando la URL no dice nada (el 3D usaba siempre la misma), `?t=` y `?x=&y=` para
abrir a una hora o en un sitio, y las sondas de la prueba de humo (`probes.ts`).

Los campos de la sonda isometrica (`__verdant`) que no existen en el 3D son
todos de aquella camara: `tilesOnScreen` (el zoom; en 3D es `distance`),
`objects` (en 3D, `triangles`), `faces`, `playerHidden`, `view`, `footGap` y
`faded`.

## Lo que NO se traslado, y por que

Eran tecnicas de la camara isometrica, y el 3D las resuelve con su buffer de
profundidad o no las necesita:

- el giro en cuatro vistas (`,` y `.`) y sus botones: la camara 3D gira libre;
- la proyeccion, el orden por antidiagonales y el recorte por bloques de 8x8;
- las caras de relieve dibujadas como sprites y el filo de los escalones;
- la atenuacion de lo que tapa al jugador y su silueta. El equivalente 3D —que
  el terreno tape al jugador— sigue pendiente, en `docs/pendiente.md`.

## Las reglas de la camara isometrica

Estaban en `CLAUDE.md` como reglas 6, 7 y 16 a 20. Se guardan aqui literales,
porque varias son verdades del mundo y no de la camara —el orden por
profundidad, lo que tapa a quien— y las que no, cuentan por que se giro. Los
ficheros y tests que citan ya no existen; estan en `b1d0d7a`.

6. **La vista es isometrica, GIRABLE en cuatro, y vive solo en el cliente.** La
   transformacion esta entera en `packages/client/src/projection.ts`, que lleva
   una orientacion de modulo y la aplica dentro de `worldToScreen`,
   `screenToWorld` y `depthOf`; todo lo demas se entera solo. El mundo es una
   rejilla cuadrada y la simulacion no sabe que existe una camara: el vector de
   movimiento se rota en `input.ts` **antes** de entrar en la Intent, para que la
   Intent siga siendo de mundo y pueda viajar por red (regla 5).

   **`worldToScreen(wx, wy)` NO es la esquina norte del rombo del tile**, aunque
   lo sea en la vista 0. La rotacion gira alrededor del origen, no del centro de
   la casilla, asi que ese punto pasa a ser la esquina oeste en la vista 1, la sur
   en la 2 y la este en la 3: dibujar el rombo desde ahi lo deja **medio tile
   fuera de sitio** en tres de las cuatro vistas. Para eso esta `tileOrigin`, que
   sale del centro —lo unico que el giro respeta— y baja media altura de tile.

   Lo que hace ese fallo dificil de ver es que **no se nota en el terreno**: todas
   sus piezas se corren igual y el paisaje sigue siendo coherente consigo mismo.
   Se nota en lo que se apoya en el, que se situa por el centro del tile y por
   tanto cae bien: arboles a caballo entre dos casillas y personajes naciendo del
   costado de un bloque. El test de orden tampoco lo ve, porque afirma quien tapa
   a quien, que es RELATIVO. Lo que lo cierra es afirmar **donde cae el rombo**:
   sus cuatro esquinas tienen que ser las de su cuadrado del mundo, proyectadas.
   Cuando necesites una esquina concreta, pidela por sus coordenadas de mundo
   —`worldCorner`, o proyectar el punto directamente— y no por su sitio en
   pantalla.

   Se gira porque con una sola vista la cara oculta de una montana es
   inexplorable: lo que hay al otro lado lo tapa la montana misma. Girar de forma
   continua no es posible —el arte lleva la proyeccion horneada dentro, asi que a
   un angulo libre habria que rehacer la geometria del terreno en cada frame y el
   orden dejaria de agruparse en antidiagonales—, y por eso el giro es de 90
   grados y con corte seco.
7. **Todo lo que tenga altura va en la capa ordenada por profundidad**
   (`depthOf`), nunca horneado en la textura del chunk; si no, el personaje
   aparecera por delante de cosas que tiene detras.

16. **Todo el mundo va en UN solo orden, por antidiagonales.** Suelo, paredes,
    arboles y personaje comparten capa y se ordenan por `wx + wy`. Tener el suelo
    horneado por un lado y las paredes en la capa de objetos por otro fue un
    fallo de verdad, y de los caros: la capa de caras estaba entera por encima,
    asi que una pared se pintaba sobre cualquier suelo, lo tuviera delante o
    detras. **No lo vio ningun test ni la prueba de humo; lo vio el autor
    jugando.** Por eso el orden vive ahora en `client/terrain-draw.ts`, que es
    puro, y `tests/terrain-draw.test.ts` afirma la regla: si dos piezas se
    solapan en pantalla, la de mayor profundidad se dibuja despues.

    No se ordenan miles de sprites por frame: los tiles de una misma
    antidiagonal **no se solapan nunca entre si**, asi que cada una es un
    contenedor y solo se ordena la lista de contenedores. Si tocas eso, el test
    «dentro de una antidiagonal nada se pisa» es el que defiende la suposicion.

17. **El recorte de pantalla es por bloques de 8x8, no por chunk.** Con montanas
    de cuarenta niveles un chunk ocupa mas que la pantalla, asi que darlo por
    visible entero significa dibujar diez mil piezas para ver mil quinientas.
    Medido: 10.236 contra 3.026.

18. **Al personaje lo tapa el terreno, y por eso lleva silueta.** Atenuar el
    suelo como se atenua un arbol NO vale: por detras de un arbol se ve el suelo,
    pero por detras del suelo no hay nada y se abre un agujero al vacio. Se
    probo. La silueta se decide mirando si algo cubre el **pecho o la cabeza**,
    no la caja entera: la casilla de justo delante siempre roza los pies, y
    comparando cajas la silueta salia siempre y dejaba de significar nada.

    Lo que estorba se busca recorriendo las **filas de delante**, no una ventana
    de casillas alrededor: con relieve, un arbol encaramado cinco filas mas alla
    tapa tanto como el de al lado. Y ojo con las condiciones de esa busqueda: la
    version anterior filtraba por un `zIndex` que al pasar a contenedores por fila
    dejo de asignarse, asi que en coordenadas positivas no se atenuaba **nada** y
    en negativas se atenuaba todo. Medio mundo bien y medio mal, y ningun test
    unitario lo ve. Por eso la prueba de humo lo mide en el cuadrante positivo.

19. **Una entidad va en la fila de su CASILLA, no de su posicion.** `depthRowOf`
    redondea la casilla; redondear la posicion continua metia al personaje una
    fila por delante de si mismo en media casilla de cada dos, dibujandolo sobre
    el arbol y el bloque que tenia justo delante. Aparecia y desaparecia al
    caminar, que es lo que lo hacia dificil de ver.

20. **Un escalon mirado por detras no se ve, asi que se delata con el filo.** Los
    dos costados traseros de un bloque los tapa el propio bloque, y sin nada mas
    un escalon por detras es indistinguible de terreno llano: un nivel mide 16 px
    y una fila 8, asi que subir un nivel equivale exactamente a retroceder dos
    filas. En su sitio va el **filo iluminado** de la arista, que se refuerza con
    el desnivel.

    **No hay sombra, y no puede haberla.** Se intento dos veces y las dos
    quedaron mal. Primero extruida en vertical, que en isometrica dibuja una
    PARED y se veia como un panel oscuro de pie sobre la arista. Luego tumbada en
    el plano del suelo, pero **al nivel del propio emisor**: sobre un escalon
    hacia el mar era una losa plana flotando a la altura de la arena sobre agua
    que esta un nivel mas abajo, y se leia como terreno que no existe.

    Bajarla a su sitio tampoco vale, y esto es lo que cierra la cuestion: el
    suelo que la recibiria **no se ve nunca**. Una casilla una fila mas atras y un
    nivel mas abajo cae en pantalla justo donde cae la que la tapa por delante a
    tu propia altura, y esa se dibuja despues. Es la misma aritmetica de la
    ambiguedad, por el otro lado — y es tambien la razon de que el escalon
    necesite una senal. `tests/projection.test.ts` fija las dos identidades.

    De ahi sale la regla general que lo gobierna, y que vale para cualquier senal
    que se anada: **nada se dibuja fuera del rombo de su propio tile**, porque
    fuera de el no hay garantia de que haya suelo a esa altura.
    `tests/terrain-draw.test.ts` lo afirma.


## Del README

Las decisiones del README que eran de aquella camara, tal como estaban.

**La vista es isometrica, y eso no toco la simulacion.** El mundo sigue siendo
una rejilla cuadrada; solo cambia como se proyecta a pantalla
(`packages/client/src/projection.ts`). Ni una regla, colision o test del nucleo
cambio al pasar de cenital a isometrica: esa es exactamente la separacion que
justifica toda la arquitectura.

Dos consecuencias que si son del render y no se pueden esquivar:

- **Las features no se hornean en la textura del chunk.** Arboles, rocas y
  personaje van en una capa ordenada por profundidad (`depthOf = wx + wy`), para
  que el jugador pueda pasar por detras de un arbol. Horneadas en el suelo no
  podrian ordenarse contra el personaje.
- **Lo que tapa al jugador se vuelve translucido.** En isometrica un arbol una
  casilla por delante oculta al personaje por completo. Se atenuan solo las
  casillas que geometricamente pueden taparlo, no todas.

**El input tactil no rompe la frontera del nucleo.** El joystick y los botones
son una segunda fuente que produce la misma `Intent` que el teclado; el nucleo
no se entera de que existe una pantalla tactil. El vector de la `Intent` es
**direccion pura** y la velocidad la elige su campo `run`, asi que teclado y
joystick producen exactamente lo mismo: uno con teclas, el otro con un pulgar.

**Un sprite por chunk, no por tile.** Cada chunk se pinta una vez en un canvas 2D
y se sube como una textura, y solo se repinta si cambia. Dibujar el terreno
cuesta unas decenas de sprites por frame en vez de decenas de miles.
