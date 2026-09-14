# Notas para agentes que trabajen en este repo

Lee tambien el README: explica la arquitectura y el porque de cada decision.
Esto es el resumen operativo.

## El isometrico esta CONGELADO

Decision del autor, 2026-09-12: **no se gasta mas trabajo en el juego
isometrico.** No se le anaden mecanicas, no se le portan los cambios nuevos y no
se pule. El desarrollo va al cliente 3D (`packages/client/src/spike3d/`,
`npm run spike`), segun la decision que ya esta escrita en `docs/pendiente.md`.

Lo congelado es **la capa de presentacion isometrica**: `projection.ts`,
`terrain-draw.ts`, `relief-faces.ts`, `biome-edges.ts`, el arte de terreno de
`tiles.ts`, `renderer.ts` y la parte de `main.ts` / `input.ts` que sea suya.
`packages/sim` y `packages/shared` no estan congelados: son el nucleo del juego y
entran intactos en el 3D, asi que ahi se sigue trabajando igual.

Las reglas de abajo que describen la isometrica (6, 7, 16, 17, 18, 19, 20) se
quedan escritas por dos motivos: varias son verdades del mundo, no de la camara
—el orden por profundidad, las filas, lo que tapa a quien— y vuelven a aparecer
en 3D; y las que no, cuentan **por que** se giro.

**Interpretacion mia, corregible:** congelado no es roto. Si un cambio en `sim`
deja el isometrico sin compilar o tumba `npm run smoke`, hago el arreglo minimo
para devolverlo al verde, porque hoy el humo es la unica prueba de integracion
que existe. Lo que no hago es llevarle nada nuevo. Si prefieres que el
isometrico salga del `typecheck` y del humo en cuanto el 3D tenga su propia
prueba de humo, dilo y se retira.

## Reglas duras

1. **`packages/sim` jamas toca el navegador.** Sin DOM, canvas, WebGL, PixiJS ni
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
   nucleo. La mirada tambien viaja ahi (`aimX`/`aimY`): con raton la fija el
   cursor, en tactil el joystick, y en reposo se conserva la que hubiera.

   **`moveX`/`moveY` son DIRECCION, no velocidad.** Su magnitud no dice nada. Lo
   cambio el autor al pedir la carrera: el joystick hacia de acelerador —cuanto
   mas desplazado, mas rapido— y eso se sustituyo por dos velocidades discretas
   que elige `run`. Un mando analogico apunta; no dosifica. La zona muerta se
   queda, pero vive en el cliente: el nucleo solo ve direcciones.
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
12. **Una accion afecta a tres casillas: la apuntada y sus dos vecinas en el
    anillo de 8 direcciones** (`sim/aim.ts`). De esa unica regla salen los dos
    casos que describio el autor —en recto las flanqueantes quedan en diagonal,
    en diagonal quedan ortogonales— y `tests/aim.test.ts` las tiene todas. El
    area parte de la casilla que se PISA: antes se apuntaba con
    `floor(pos + mirada * 1.1)`, que pegado al borde de la casilla podia saltar a
    dos de distancia, y con tres casillas eso deja de pasar inadvertido.

13. **El relieve sale de la misma elevacion que el terreno.** `levelFrom` no es
    mas que otra forma de leer el `e < 0.42` que ya separaba el agua, asi que
    `terrainAt` no cambia y los umbrales de bioma siguen calibrados. Si mueves el
    nivel del mar sin mover el umbral de agua, `tests/relief.test.ts` te avisa.
14. **La altura y los muros son dos mecanismos distintos.** Las **cordilleras**
    amplifican el desnivel sobre el nivel del mar, y de ahi salen la altitud y
    las laderas escalonadas; los **salientes** levantan +3 de golpe y de ahi
    salen las mesetas. Medido, una cordillera tambien produce acantilados
    naturales —la pendiente amplificada pasa de un nivel por casilla— y **le
    salen gratis**: un acantilado a media ladera siempre se rodea porque la
    escalera sigue al lado. Los salientes, en cambio, se pagan en conectividad, y
    su densidad esta calibrada, no elegida. Antes de tocar `OUTCROP_THRESHOLD`,
    `RIDGE_GAIN` o sus escalas, vuelve a medir con
    `npx vite-node tools/analyze-world.ts` y mira la **linea base solo-agua**: el
    mundo plano tampoco es del todo conexo, y comparar contra el 100 % hace pasar
    por sano un relieve que no lo es. El presupuesto acordado es un punto.
15. **La rampa es propiedad del tile bajo, no de la arista.** Es lo que hace
    continuo el campo de alturas: con la rampa en la arista habria un escalon
    vertical justo en el limite entre las dos casillas, que es lo que un talud no
    tiene. Y por eso un talud se dibuja como un rombo torcido, sin forma
    especial. Las caras se calculan con las alturas de los **dos extremos** de
    cada borde: comparando niveles enteros, el costado de un talud se quedaria
    sin su cuna y se veria el fondo por el agujero.
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

21. **La altura estorba, y estorba con UNA regla: no se entra donde el suelo
    esta por encima de los pies.** De ahi salen las tres cosas a la vez y sin
    casos especiales — un talud se sube andando porque su suelo sube poco a
    poco, una pared no se sube porque el suyo sube de golpe, y en el aire uno se
    estampa contra la cara de un bloque porque a esa altura su suelo sigue
    estando encima. Lo unico que cambia entre andar y volar es **cuanto** margen
    hay: andando, `STEP_UP`; volando, ninguno.

    Ese margen y su gemelo `SNAP_DOWN` no son alturas de escalon elegidas a ojo:
    son la holgura que separa un talud de una pared. Subiendo un talud a paso
    completo el suelo asciende `WALK_SPEED · TICK_DT ≈ 0.087` niveles por tick y
    la pared mas baja mide 1 entero, asi que cualquier valor entre esas dos
    cifras da el mismo mundo. Sin la holgura de bajada el personaje iria dando
    saltitos ladera abajo.

    La altura del personaje es **suya** (`entities.z`), no la del suelo bajo sus
    pies, y el que dibuja tiene que leer esa. Leyendo el suelo el personaje
    queda pegado al terreno tambien en pleno salto, que es como si no hubiera
    salto.

    **La gravedad se integra por el promedio de las dos velocidades**, no con el
    Euler de toda la vida. Con aceleracion constante eso no es una aproximacion,
    es la parabola exacta; con Euler el apice medido salia 1.06 en vez de los
    1.16 de la derivacion, y ese decimo es justo el margen que el autor pidio
    para que subirse a un bloque no fuera al milimetro.

22. **Donde se nace hay que ganarselo.** `findSpawn` miraba solo si el tile era
    solido, y eso basto mientras el relieve solo se veia. Con la altura
    estorbando, un hueco entre el mar y un escalon de dos bloques es un tile
    perfectamente pisable del que **no se sale**: la semilla de prueba hacia
    exactamente eso. Ahora se exigen tres cosas, de la mas barata a la mas cara
    — un rellano llano de 3x3, sitio para andar sin saltar, y sitio del que
    salir contando con el salto—. Medido en nueve semillas, cuesta mover el
    nacimiento entre 8 y 15 casillas, que en un mundo infinito no es nada.

    El rellano no es lujo: sin el, en terreno escalonado **la accion alcanza una
    casilla de las tres**, porque solo llega a las de la altura propia, y el
    juego empieza pareciendo roto.

    Y una cuarta condicion, que aparecio como efecto secundario de la tercera:
    el terreno tiene que **sostener vida**. En este mundo lo llano son las
    mesetas y las mesetas son roca, asi que pedir suelo liso mudo el nacimiento
    a piedra pelada en cinco de nueve semillas, a niveles de hasta 16, sin nada
    que comer y con el hambre corriendo desde el primer tick. Cuesta nada —el
    radio de busqueda pasa de 8-15 a 8-17 casillas—, y no es una preferencia:
    es quitar un sesgo que metio la regla anterior.

23. **Cualquier medida de conectividad tiene que obedecer la fisica.** El
    recorrido de `debug.reachableArea` inundaba mirando solo los solidos, y
    desde que una pared detiene el paso eso dejo de medir lo que el jugador
    recorre. Sus cifras de antes y las de ahora **no son comparables**.
    `tools/analyze-world.ts` ya lo hacia bien —mide con «se sube un bloque de un
    salto»—, asi que la calibracion de la regla 14 estaba hecha para esta fisica
    y aguanta: el relieve cuesta 0.14-0.77 puntos sobre la linea base solo-agua,
    por debajo del punto acordado.

## Regla de trabajo con el autor

**La interpretacion de las leyes es del autor, no del agente.** Antes de escribir
codigo que implemente o toque una ley del libro, hay que consultarle:

- como se interpreta la ley,
- que mecanicas internas la realizan,
- como fluye en el tiempo (ritmos, curvas, duraciones),
- con que otros sistemas interactua,
- y que valor toma cada parametro.

Esto surgio de un error real: en la primera tanda de vida vegetal el agente fijo
por su cuenta la forma de la curva de crecimiento, los tiempos de rebrote y que
la piedra fuera finita. Eran decisiones de diseno del autor, no de
implementacion, y varias no coincidian con lo que el tenia en mente.

Proponer interpretaciones es bienvenido; darlas por aprobadas no. Cuando una
decision se tome por deduccion (por ejemplo, derivar una tasa a partir de unos
tiempos que dio el autor), hay que decirlo explicitamente para que pueda
corregirla.

## El libro del mundo

`docs/el-libro-del-mundo.md` es un documento **del autor del proyecto**. No lo
edites nunca, ni para corregir erratas: contiene su texto literal.

Sus leyes se traducen a tests en `tests/world-laws.test.ts`, y el estado de cada
una se lleva en `docs/leyes.md`, que si mantiene el agente. Al implementar algo
que cumpla o acerque una ley, actualiza esa tabla en el mismo cambio.

**`docs/pendiente.md` es lo primero que hay que leer al empezar una tanda.** Lleva
las decisiones del autor que aun no son codigo —el diseno del salto con su
enunciado literal, el giro a 3D ya decidido— y los cabos sueltos. Esta en el repo
a proposito: las notas de trabajo del agente viven en un contenedor efimero y
mueren con la sesion, asi que lo que no este aqui se pierde.

Tres leyes condicionan el diseno entero y conviene tenerlas presentes antes de
tocar la simulacion:

- **«El mundo existe independientemente de cualquier observador»** prohibe
  simular solo lo que rodea al jugador. La vida avanza en pasos globales fijos
  (`LIFE_STEP_TICKS`) sobre todos los chunks perturbados a la vez, de modo que
  ponerse al dia de golpe y simular continuamente dan el mismo resultado. Si
  anades un proceso que dependa del orden fino entre chunks, esa equivalencia se
  rompe y el test de independencia del observador te avisara.
- **«Las entidades vivas no surgen automaticamente»** prohibe generar vida de la
  nada. En `sim/life.ts` esta codificado en la aritmetica: con densidad cero el
  crecimiento vale exactamente cero.
- **«Segun su naturaleza, pueden ser finitos, consumibles y renovables»**: no
  todo recurso vuelve. `regrowTicksOf` devuelve 0 para lo finito.

## Como trabajar sin quemar la ventana de uso

Cada llamada a una herramienta reenvia la conversacion entera, asi que el coste
va como **contexto x numero de idas y vueltas**. Dos habitos que lo disparan y
que este proyecto ya se comio una vez:

- **Edita con la herramienta de edicion, no con `sed` ni heredocs de `python`.**
  Cuando un fichero cambia por fuera, el sistema lo vuelca **entero** en el
  contexto para que no trabajes sobre una copia vieja. En una tanda,
  `spike3d/main.ts` se volco completo siete veces: decenas de miles de tokens
  en re-volcados que no aportaron nada.
- **Una captura por ronda, no cuatro.** Cada PNG son 1.200-1.800 tokens y se
  queda en contexto reenviandose el resto del turno. Mira la que decide; las
  demas, solo si la comparacion lo exige de verdad.

Y lo que no es cosa del agente: la sesion crece sin parar, asi que el corte
natural es **empezar sesion nueva al cerrar cada tanda**, y `/usage` desglosa a
donde se fue el gasto.

## Antes de dar algo por bueno

```bash
npm run typecheck && npm test && npm run smoke
```

`npm run smoke` construye el cliente y lo juega en Chromium headless leyendo el
estado real por `window.__verdant`. Los tests unitarios no detectan que el juego
no arranque; esto si. Hace dos pasadas, escritorio con teclado y movil con
eventos tactiles sinteticos; si tocas los controles, ambas tienen que seguir
pasando.

Reparto de responsabilidades entre las dos capas de test, que conviene respetar:
la prueba de humo verifica **integracion** (que un toque llega a producir una
Intent y el mundo reacciona), y los tests unitarios verifican **numeros**. Medir
la relacion entre marcha y carrera en el navegador daria un resultado contaminado
por las colisiones con arboles, agua y paredes; por eso el multiplicador exacto
se mide en `tests/simulation.test.ts`, sobre una zona llana y abierta verificada,
y el humo solo afirma que el interruptor llega a la Intent y que corriendo se
recorre mas.

Ojo con los FPS que reporta la pasada movil: en headless se renderiza por
software a 3x, asi que ese numero no dice nada del rendimiento en un movil real.

## Efectos visuales

`client/effects.ts` lleva el movimiento —donde esta cada cosa y cuanto le queda
de vida— sin DOM ni PixiJS, y el renderizador solo lo dibuja: asi la fisica de
las particulas se mide en Node. Avanzan con el tiempo **escalado**, de modo que
pausar los congela y 64x no inunda la pantalla.

Los colores de los escombros salen de `client/palette.ts`, la misma tabla con la
que `tiles.ts` pinta cada especie. Estan juntas a proposito: el encargo era que
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

**El 3D reutiliza `effects.ts` tal cual y solo pone el dibujado**
(`spike3d/effects-view.ts`). Es la prueba de que el reparto estaba bien hecho: lo
que se reutiliza —donde esta cada escombro, cuanto le queda de vida, con que
colores— nunca fue del isometrico, asi que no roza el congelado.

Dos adaptaciones al pasar a tres dimensiones, y ninguna es capricho:

- **En el 3D un nivel mide lo mismo que una casilla**, porque `terrain-mesh.ts`
  usa la altura tal cual como coordenada Y; en el isometrico un nivel son 16 px
  y una casilla 32. Asi que la altura entra directa y el TAMANO, que `effects.ts`
  da en pixeles del arte isometrico, se divide por 32.
- **Los escombros se apagan encogiendo, no desvaneciendose.** Cada uno tiene su
  edad y un `InstancedMesh` comparte material, asi que no hay transparencia por
  instancia; se aplica la misma curva de apagado a la escala. El barrido si se
  desvanece, porque son pocos y cada uno lleva su material.
- **El barrido se dibuja POR ENCIMA del mundo y MIRANDO a la camara.** Las dos
  cosas son la traduccion de una sola: en el isometrico el trazo vive en
  `effectLayer`, una capa de pantalla sobre el mundo entero, y ahi nada puede
  taparlo ni escorzarlo. En 3D eso se compra con `depthTest: false` y con una
  cinta que se ensancha perpendicular a la linea de vision. Sin lo primero se lo
  come lo que haya entre la camara y el arco —un bloque, un arbol, el propio
  personaje—; sin lo segundo se ve de canto cuando su ancho cae a lo largo del
  rumbo desde el que se mira. Medido a 0.08 rad de elevacion: 104 pixeles
  aclarados contra 2 y contra 13. Y **no lo tapa la pared de la casilla
  golpeada**, que era mi primera sospecha y es falsa: el area solo alcanza
  casillas de la altura propia, asi que el arco nunca cruza un desnivel.

  La cinta se levanta 0.9 —la altura del pecho, los mismos `TILE_H * 0.9` del
  isometrico leidos como niveles— y mide 0.12 casillas de ancho, que son sus 3 px
  con la casilla a 32. Se redondea al alza desde 0.094 porque PixiJS suavizaba el
  trazo y este lienzo va sin antialias.

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
que algo llega a pantalla hay que contar **pixeles**: `npm run spike:slash` para
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
lanza» de «se lanza y no se dibuja», que era justo el caso. Ahora el renderizador
lleva un acumulador de slashes **trazados** (`Renderer.slashesDrawn`) y el humo
afirma que crece. Una comprobacion que puede pasar por suerte es peor que una que
falla.

**Y la moraleja de la moraleja: cuando se arreglo el slash, la comprobacion de
los ESCOMBROS se quedo como estaba** —preguntando por la lista de particulas
vivas, una linea mas abajo, con el arreglo del slash comentado justo encima—.
Aguanto varias tandas y un dia el runner de CI perdio la moneda: 221 slashes
trazados y cero escombros, con el mismo golpe soltando diez unas lineas mas
abajo, donde el tiempo esta congelado. Un escombro vive entre 0,6 y 1,1 s, el
runner va a 4-6 FPS y el sondeo cae cada 420 ms: no habia por que acertar. Ahora
hay `Renderer.debrisDrawn`, gemelo del otro. **Al arreglar una comprobacion de
estas, mira si su hermana tiene el mismo fallo.**

## Herramientas de desarrollo

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

Las superposiciones de depuracion (rejilla de chunks y contorno de biomas) se
trazan en coordenadas de pantalla **absolutas** y su `Graphics` se queda en (0,0)
dentro de `markerLayer`. Asignarle ademas la posicion del chunk suma el origen
dos veces y saca todo el dibujo un chunk en diagonal; como en el chunk (0,0) el
error vale cero, a ojo parece que funciona. La geometria del contorno vive aparte
en `client/biome-edges.ts`, sin PixiJS, para poder verificarla en Node.

La congelacion empieza puesta al abrir el panel y solo se aplica con el panel
abierto (`DevTools.survivalFrozen` es un getter, como `timeScale`). Sin ella las
herramientas no sirven para lo que se hicieron: a 64x se pierden unos 35 puntos
de hambre por segundo real y saltar un dia son 264, asi que el boton mas util del
panel era el que mataba.

## Proporciones

**Un bloque no es la unidad de nada vivo.** El arte nacio para el isometrico con
el jugador midiendo 0,78 bloques y un arbol 1,22, y el autor lo comparo con
Minecraft: alli mides poco menos de dos y un arbol pasa de tres. Los dos factores
que hacian falta salian **casi iguales** —2,3 y 2,6—, y eso era el diagnostico
entero: la relacion entre jugador y arbol ya era la buena y lo que sobraba era el
bloque.

Asi que **todo lo que se apoya en el suelo sube con el mismo `BASE = 2.3`**
(`spike3d/billboards.ts`), y solo los arboles llevan su pizca de mas
(`ARBOL = 2.6`). Eso conserva intactas las proporciones que el autor ya habia
dado por buenas entre unos y otros, y cambia unicamente su tamano frente al
terreno. Medido del dibujo:

| | Antes | Ahora |
|---|---|---|
| Jugador | 0,78 | **1,93** |
| Arbol | 1,22 | **3,17** |
| Arbusto | 0,47 | 1,17 |
| Brote | 0,29 | 0,88 |
| Roca y minerales | 0,47 | 1,09 |

**Esto es ARTE, no fisica.** El salto (apice 1,16), `STEP_UP` y la colision van en
unidades de mundo y no saben lo que mide un sprite, asi que `packages/sim` no se
entera. Y de paso queda mas cerca de Minecraft de lo que estaba: alli mides 1,8,
subes 0,6 andando y saltas 1,25; aqui 1,93, `STEP_UP` 0,5 y apice 1,16. La regla
21 se lee igual de bien con el personaje nuevo.

**El arte se redibuja, no se estira**, que es lo que separa un 2D-HD de un
pixelado. `makeFeatureArt(feature, detail)` y `makePlayerArt(detail)` crean el
lienzo `detail` veces mas grande y le aplican `ctx.scale(detail, detail)`: **ni
una coordenada de dibujo cambia**, y `anchorX`/`anchorY` salen bien solas porque
ya eran fracciones. `riseAbove` va en pixeles y se multiplica. El isometrico pide
`detail = 1` y obtiene byte por byte lo de siempre —lo afirma el humo con su «pie
a (0,0) px de su rombo» en las cuatro vistas—.

**Las proporciones se MIDEN, no se miran.** `BillboardSet.sizes` busca el pixel
con tinta mas alto de cada lienzo y lo pasa a bloques; `npm run spike:shots` los
imprime. No vale el alto del lienzo ni `riseAbove`: un arbol ocupa 39 px de un
lienzo de 58 y `riseAbove` da la cota superior. Estimando por el lienzo me sali
con que un brote mediria 1,52 bloques y una roca 2,88; medidos son 0,88 y 1,09.

Dos cosas arrastro el cambio y no eran opcionales: **`EYE` de la camara** paso de
1.2 a 1.6, porque 1.2 le quedaba por encima de la cabeza al personaje viejo y por
las rodillas al nuevo (el 1.6 es deduccion mia); y **los escombros** llevan el
mismo `BASE`, porque son astillas de lo que se derriba y sin el pasaban de chinas
a polvo. El **alto** del barrido sube tambien —es el pecho del personaje— pero su
**ancho** no: ese marca las casillas que la accion afecta, o sea que es del tile.

Y una consecuencia que es de juicio del autor, no medible: **el relieve se lee
menos de la mitad de alto**. Una pared de un bloque pasa de llegar al pecho a
llegar a la rodilla, y una cima de 27 niveles de medir 34 personajes a medir 14.
La fisica no cambia ni un decimal, pero los 16 px por nivel se calibraron a ojo.

## El relieve

El mundo tiene altura desde `packages/sim/src/relief.ts`: hasta 41 niveles,
escalon de 0.06 de elevacion, y `groundHeightAt` devuelve la altura real de un
punto con decimales. **El relieve estorba** desde la fase 2: hay gravedad, salto
y caida, y ya no se cambia de nivel andando (regla 21).

Un nivel mide **16 px**, que es `TILE_W / 2`: en una isometrica 2:1 esa es la
arista vertical de un cubo. Estuvo en 8 y el autor lo noto a la primera —los
bloques se veian como baldosas—, asi que no es una eleccion estetica.

Las cordilleras amplifican el desnivel **anclando en el nivel del mar**: bajo el
agua `reliefAt` es identica a `elevationAt`, y por eso meter montanas no obligo a
recalibrar la costa, que son los tres umbrales mas delicados que hay. Los de
altitud si se recalibraron, pero **sumando** reglas a las viejas en vez de
sustituirlas, para no mover el mundo llano ni un tile.

La camara gira con **coma y punto**, no con Q y E: la E ya era comer, y cambiar
una tecla que funciona para meter otra no es decision del agente.

Los controles cambiaron con la fase 2, y fue decision del autor: **Espacio pasa
a ser el salto** y la accion se va **al clic derecho, en exclusiva**. En tactil
hay boton de saltar, en el isometrico y en el 3D. Dejar tambien el clic
izquierdo accionando habria vaciado la distincion de sentido.

**Correr es un INTERRUPTOR**, tambien decision suya: se enciende con Shift o con
el boton del movil y se queda encendido hasta que se vuelva a pulsar. No es una
tecla que se mantiene, y la razon es el telefono — con un pulgar en el joystick
y otro en la camara no sobran dedos para sostener nada. Por eso lleva **estado
visible** en los dos sitios: el boton se ilumina y, con teclado, la ayuda dice
«ACTIVADO». Un interruptor sin indicador deja al jugador adivinando por que el
personaje va como va.

Y por eso mismo desaparecio el acelerador analogico (regla 5): la velocidad la
elige el interruptor, no lo desplazado que este el pulgar.

**En el 3D la accion es el clic izquierdo, y ahi hay un conflicto que resolver:**
ese mismo boton gira la camara arrastrando. Se decide **al soltar** —lo que no se
ha movido mas de `TAP_SLOP` era un clic; lo que si, era un arrastre y ya giro la
vista—, y se mide contra el ORIGEN quedandose con el maximo, para que ir y volver
siga contando como arrastre. La regla vive en `spike3d/gestures.ts`, que es puro,
y `tests/gestures.test.ts` la afirma. En tactil no hay tal conflicto: acciona el
boton, y un dedo sobre el mundo gira la camara y nada mas.

El racimo de botones del movil lo ordeno el autor: **la accion es la mas grande y
la mas pegada al borde derecho**, que es donde cae el pulgar en reposo, y salto y
carrera se apartan a su izquierda y van mas pequenos. En fila y no en columna,
para que sea el borde —y no la altura— lo que ordene la importancia.

**Y ese racimo no se ve en PC**, tambien decision suya: son controles de pulgar y
con teclado sobran, porque Shift, Espacio y el clic izquierdo ya hacen lo mismo.
El mecanismo es el del isometrico y se copio tal cual —`.touch-active` en el
`body`, que pone `controls.ts` si el puntero es grueso y, si no, al primer toque
de verdad—. **Esa segunda via no es adorno**: un portatil tactil declara puntero
fino, asi que sin ella sus botones no apareceran nunca, y como `hasTouch` de
Playwright ya hace que Chromium declare puntero grueso, medirla obliga a fingir
uno fino (`tools/spike-slash.mjs` lo hace, y afirma «oculto al cargar, visible
tras tocar»).

La excepcion es **el ojo de la esquina superior derecha**, que cambia de
proyeccion y se ve siempre: es el unico control que no tiene tecla anunciada en
ningun sitio. Va en SVG y no en emoji —`👁` se pinta a color y distinto en cada
sistema— y **dice cual esta activa con su propia forma**: abierto en perspectiva,
que tiene fuga, y entrecerrado en ortografica, que lo aplana todo. Lo eligio asi
el autor entre tres opciones; el simbolo cuenta la diferencia en vez de limitarse
a senalar que hay un interruptor.

**La vista de arranque es la perspectiva**, que es la que el autor eligio para el
juego final tras probar las dos en su telefono. El interruptor se queda porque la
ortografica conserva el aspecto plano del isometrico y sirve para comparar.

Ojo con una diferencia entre los dos mandos, que es deliberada: **el boton repite
al mantenerlo** (cuatro veces por segundo, la cadencia de siempre) y **el raton
no** —un clic es una accion—, porque mantener pulsado el raton significa
arrastrar la camara y no se puede saber si es accion hasta que se suelta.

Numeros del autor, que no se tocan sin preguntarle: el escalon (0.06), los 16 px
por nivel, el 15 % de fronteras que son rampa y el tope de 40 niveles. El umbral
de salientes y la ganancia de cordillera, en cambio, son calibraciones: se eligen
midiendo (regla 14).

El salto, ya implementado: parabola simetrica con el apice **a una casilla
exacta** y alcance dos, conserva el impulso que se llevaba, admite un 30 % de
desviacion en el aire, y el agua es muro tambien volando. Medido con la
integracion exacta: apice 1.160 niveles contra 1.161 en papel, alcance 2.17
casillas a paso completo, vuelo 0.400 s. `GRAVITY = 62` y `JUMP_SPEED = 12` son
**deduccion del agente** a partir del caso que describio el autor, no numeros
suyos: puede corregirlos, y `tests/jump.test.ts` afirma la relacion que los ata.

## Si tocas la generacion del mundo

Cambiar una escala de ruido invalida los umbrales de bioma, que estan calibrados
contra los percentiles reales de cada campo. Vuelve a medir:

```bash
npx vite-node tools/analyze-world.ts
```

y ajusta los umbrales en `packages/sim/src/worldgen.ts` a la distribucion nueva.
`tests/world-quality.test.ts` falla si algun bioma desaparece, si el jugador
queda encerrado o si el bosque se vuelve intransitable.

## Ciclos de importacion

`packages/shared/src/base.ts` y `packages/sim/src/coords.ts` existen solo para
romper ciclos: `index.ts` reexporta `ecology.ts`, y `world.ts` usa `biome.ts`.
Con el ciclo puesto los tests pasan igual, pero el bundle del navegador revienta
con «Cannot access X before initialization», que solo detecta `npm run smoke`.
Si anades un modulo que necesiten dos partes que ya se referencian, ponlo en su
propio fichero sin dependencias en vez de importarlo cruzado.

## Presupuesto de rendimiento

`tests/performance.test.ts` mide el coste medio de un tick. El limite acordado
son 8 ms; superarlo de forma sostenida es la senal para portar el modulo caliente
a Rust/WASM detras de la misma interfaz, no para empezar a optimizar a ciegas.
