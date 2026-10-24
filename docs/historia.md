# Historia: las tandas cerradas

Partido de `docs/pendiente.md` el 2026-10-10, **literal** y en el mismo orden
(ver su «Como leerlo»): que se hizo en cada tanda, que se midio y que aparecio
por el camino. Es historia que el codigo no cuenta. **No se lee de corrido**:
se consulta cuando algo remite a una seccion por su nombre, sobre todo las filas
de `docs/juicio.md`. Al cerrar una tanda, su seccion «HECHA» de
`docs/pendiente.md` se mueve aqui, arriba del todo.

Lo que aqui dice «arriba», «abajo» o «Esperando tu juicio» se escribio cuando
todo era un solo fichero: lo vivo esta en `docs/pendiente.md` y las
deducciones en `docs/juicio.md`.

## La CI sin duplicados y lo pesado dos veces por semana (2026-10-24) — HECHA

**Aprobado por el autor el 2026-10-24, para que lo ejecute la primera sesion
local** (no la de la nube que lo escribio):

- **1a**: la CI deja de correr en las ramas `claude/…`.
- **1b**: en `main`, cada push corre solo typecheck y tests, porque el mismo
  arbol ya paso la CI completa en `pruebas`.
- **La CI completa y la auditoria, martes y sabado a las 3:00 de Colombia**
  (America/Bogota, UTC-5 todo el ano: 08:00 UTC).
- **La auditoria, en la nube, y directo a `main` si sale verde**, sin esperar
  al autor.

**1. `.github/workflows/ci.yml`**
- `on`: `push` solo a `['main', 'pruebas']`, `pull_request`,
  `schedule: - cron: '0 8 * * 2,6'` (martes y sabado, 08:00 UTC = 3:00
  Bogota) y `workflow_dispatch`.
- El trabajo `navegador`:
  `if: github.event_name != 'push' || github.ref != 'refs/heads/main'`. Asi
  un push a `main` lo salta, y lo corren entero `pruebas`, los PR, el
  calendario y el lanzamiento a mano.
- `todo` («CI completa»): hoy exige `navegador = success`. Que acepte
  `skipped` **solo** si es un push a `main`; en cualquier otro caso un
  `skipped` es rojo.
- En la cabecera, el porque y la fecha, como sus otros comentarios. La linea
  `pasada: [...]` no cambia, asi que el cruce del escaner
  (`escaner.mjs`, `matrix`) sigue valiendo.

**2. La auditoria programada**
- Su guion, en el repo: `.claude/skills/auditoria/references/programada.md`,
  porque la tarea programada solo dira «sigue ese fichero». Dice:
  1. Sin commits desde «Ultima auditoria» (arriba en este fichero), termina
     sin cambios.
  2. Si los hay, `/auditoria` desde ese commit, con su proceso entero. Lo
     que cambia lo que hace el juego no se toca: va a «Para ti», como hoy.
  3. Lo verifica en `pruebas` (`tools/a-pruebas.sh` y
     `tools/esperar-ci.sh`). Si sale verde, empuja a `main`. Si sale rojo,
     tiene un solo intento de arreglo; si sigue rojo, **`main` no se toca** y
     el resumen de la sesion dice que fallo.
  4. `FIRMA`, con las lineas de atribucion de esa sesion.
- La tarea programada, en la nube de Claude Code: una sesion nueva por
  disparo, sobre este repo, `CRON_TZ=America/Bogota 0 3 * * 2,6`, con
  avisos al movil y por correo, y el prompt «Lee y sigue
  `.claude/skills/auditoria/references/programada.md`». La herramienta
  (`create_trigger`) esta en las sesiones de la nube. Si la local no la tiene,
  la crea el autor desde claude.ai/code (tareas programadas) con ese prompt, o
  se crea desde una sesion en la nube.

**3. Los documentos que dejan de ser verdad**
- `CLAUDE.md`, «Antes de dar algo por bueno»: el paso 5, con la CI de `main`
  ligera. «Al cerrar cada tanda, la auditoria» pasa a «corre sola martes y
  sabado a las 3:00 de Bogota, y cuando el autor la pida». La regla de
  `retirados.md` se queda.
- `docs/pruebas.md`: «El procedimiento, paso a paso», el parrafo de la
  auditoria, y que corre la CI en cada disparo.
- `.claude/skills/auditoria/SKILL.md`: la `description` («Usala SIEMPRE al
  cerrar una tanda») y «como minimo al cerrar cada tanda».
- `retirados.md`: «la auditoria al cerrar cada tanda», retirada (escape 19).
- Esta seccion, a «HECHA» y de ahi a `docs/historia.md`.

**4. Verificar**
1. En local: typecheck, tests y lo que corre `a-pruebas.sh` (las
   herramientas y el escaner).
2. En `pruebas`: «CI completa» corre entera y sale verde.
3. Push a `main`: solo «Typecheck y tests», `navegador` saltado y «CI
   completa» **verde**.
4. `ci.yml` lanzado a mano en `main` (`workflow_dispatch`): corre entera. Es
   el camino del calendario.
5. Un push a una rama `claude/…` ya no dispara la CI.
6. La tarea de auditoria lanzada una vez a mano: sin commits nuevos, termina
   sin cambios.

**5. Avisar al autor**: GitHub retrasa a veces lo programado en punto. Los
correos de un rojo programado van a quien toco el cron por ultima vez, que es
su cuenta. Y el fallo suelto del registro (abajo) puede dar algun rojo
programado.

### Lo hecho (2026-10-24)

- **Verificado**: en `pruebas` (`b49c9b1`), «CI completa» entera (18 trabajos), «Mutaciones completas» y el despliegue, en verde. Push a `main` (`e7acc57`): solo «Typecheck y tests», el navegador saltado y «CI completa» verde. `ci.yml` a mano en `main`: entera, 18 en verde. Un push a `claude/prueba-sin-ci` no disparo la CI (la rama se borro despues).
- **La tarea programada de la nube**: la sesion local no pudo crearla (la API pide el id del entorno de la nube, que desde local no se ve). La creo una sesion en la nube con la confirmacion del autor: «Auditoria programada de Verdant» (trig_01S6VhivcyEtANcMTaHA7Gnu), `CRON_TZ=America/Bogota 0 3 * * 2,6`, avisos al movil y por correo, y la correccion automatica de PR apagada a proposito (la auditoria no abre PR: empuja a `pruebas` y a `main`). Su primer disparo, el sabado 2026-10-24 a las 3:06; la prueba a mano del paso 4.6 no se hizo.
- **Lo que salio por el camino, en Windows** (el PC del autor): `tools/esperar-ci.sh` da «HAY ROJO» en el acto, porque `grep -P` no acepta el locale; con `LC_ALL=C.UTF-8` va bien. `node tools/mutar.mjs --comprobar` falla con `core.autocrlf=true` (un `de` de varias lineas en CRLF), y por eso `tools/a-pruebas.sh` aborta: se hizo a mano. Y siete tests largos se pasan de los 5 s de vitest en local; en la CI pasan.

## La pala, lo primero que toca, las menas de voxeles y la rejilla de 0,5 (2026-10-20) — HECHA

**Cerrada por el autor** el 2026-10-20: «Tus consideraciones sobre la colocación de bloques estan bien y los errores están solucionados. Hemos terminado.» Commit `8e9269e`, con la CI y el despliegue en verde; cerrada con la auditoria de ese dia, en `docs/pendiente.md`.

**Lo que pidio el autor**, con sus respuestas, en `docs/relieve.md`, «La pala,
lo primero que toca y las menas», y en la regla 12 (colocar en la rejilla de
0,5). El plan, aprobado como plan.

**Hecho**:
- **El golpe se para en lo primero** (`strike`, `StrikeRay`): voxel, caja o
  cuerpo; los animales del barrido salen de ahi (`strikeOf` con `animals`).
- **La pala** (`ToolKind.Shovel`, tres tiers, recetas al final de `RECIPES`,
  iconos) y **`voxelWorkOf`**: roca, pico; lo maleable, pala; el poder resta;
  `needShovel`. `VOXEL_WORK` retirado.
- **Las menas, ocho voxeles** (`ore-shape.ts`, `Chunk.oreBase`, `World.oreAt`,
  `oreFormationAt`), sin caja, con botin por voxel (`oreVoxelLoot`); su malla,
  de lo que queda y sin cristales donde la tapa el terreno, rehecha con el.
- **Las estaciones en la rejilla de 0,5** (`placeStation`, `stationOffsetAt`,
  `isCovered`, `footprintTiles`, `SHIFT`).
- Tests: `ore-voxels.test.ts` (nuevo), y lo de la pala, la rejilla y la
  oclusion en `voxel-edit`, `stations`, `strike`, `terrain-mesh` y
  `ore-mesh`; los que creaban menas con `setFeature` pican ahora una generada
  (`oreSite`, `strikeDown` en `tests/ground.ts`). Humo: `dig` fabrica un pico
  desde el panel (a mano la roca no se rompe), `resources` pica una mena, y el
  recetario cuenta 3 de mano y 6 en la mesa. 23 mutaciones; caen todas en
  local.
- **Dejado**: que las menas se rehagan al romper un voxel no tiene comprobacion
  en el humo: la vida rehace chunks mientras se pica y la medida no podia
  fallar (se quito). Se ve en la captura.

**El autor (2026-10-20)**: la barra de la mesa, «el comportamiento esperado»;
las deducciones de las menas y las palas, bien. No cierra la tanda: vio dos
fallos, ya arreglados (commit de esta ronda):
- **Romper un voxel de mena cambiaba los cristales de los demas**: salian de
  un solo azar por casilla. Ahora, uno por cara de voxel (`oreModel`).
- **Corriendo, lo recogido no llegaba**: el iman iba a 8 b/s fijos y
  corriendo se va a 8,32. Ahora acelera 30 b/s² (el autor) y no suelta por
  distancia.

Sigue a su juicio la rejilla de 0,5 (`docs/juicio.md`, filas «Rejilla de
0,5»).

---

## Romper el terreno, voxel a voxel (2026-10-20) — HECHA

**Dada por buena por el autor** (2026-10-20): «Las texturas que hiciste están
bien, en otra tanda perfeccionamos el arte»; el coste, «de momento no se siente
la carga en fps, en alguna futura tanda de optimización vemos si tocamos
algo»; y aprobo mis tres deducciones (sin destello al golpear terreno, lo que
se pone se apoya bajo donde toca la mirada, y renacer mira el terreno
generado). Commit `1e9af1f`, con la CI y el despliegue en verde. **Las teselas
de 24 del suelo** (`TERRAIN_TILES`) siguen sin uso en el juego: retirarlas es
cosa de la tanda de arte. Pasa a `docs/historia.md` con la auditoria.

**Lo que pidio el autor**, literal y con sus cuatro respuestas, en
`docs/relieve.md`, «Romper el terreno». En corto: el voxel de 0,5 es la unidad
del terreno; cada golpe da a cada voxel que toca (en barrido, todos los que
tocan sus rayos), que aguanta 3 con cualquier cosa y se rompe sin particulas
ni botin; debajo, mas del mismo suelo, sin fondo; nada cae, tampoco los
objetos; el agua no se mueve; el daño se olvida a los 3 s; gasta un uso; cada
cara de voxel con su tesela de 12 × 12; sin pistas del daño (otra tanda).

**Hecho** (el plan, aprobado por el autor como plan):
- **El nucleo**: el overlay del terreno (`World.broken`, `breakVoxel`,
  `isSolidVoxel` como unica fuente de verdad; regla 4), los rayos voxel a voxel
  (`groundHit`, `Solid`; regla 12), el daño por voxel (`VOXEL_WORK`,
  `voxelDamage`), la fisica con suelo y techo por voxel (`floorBelow`,
  `ceilingAbove`, `ceilingOver`, `blocked`; regla 21), y la base fija de los
  objetos (`objectBaseAt`, `bases`).
- **El dibujo**: caras de voxel con teselas de 12 × 12 (`voxel-art.ts`,
  generadas por `tools/pixel-mundo.ts`), rehacer solo el terreno de un chunk
  (`terrainRevision`), la reticula por cara de voxel, y la rejilla y los
  bordes de bioma que se rehacen con el terreno.
- **Pruebas**: `tests/voxel-edit.test.ts` (17), `tests/terrain-mesh.test.ts`
  reescrito, la pasada `dig` del humo (tambien en la matriz de la CI) y 21
  mutaciones, que caen todas en local.

**Medido**: de 1,6 a 1,9 veces los triangulos, y unos 15 ms por chunk al
rehacer su terreno (`docs/relieve.md`). El tick, en su presupuesto.

Siguen a su juicio las demas deducciones de esta tanda, en `docs/juicio.md`,
filas «Romper el terreno».

---

## Las menas al juego (2026-10-20) — HECHA

*Luego* (2026-10-20, la tanda de la pala): las menas son ocho voxeles del terreno, **sin caja** y **sin escombros**; la caja de choque de abajo y los escombros con el color del mineral ya no son de este modelo. Auditada con la de la pala.

**Dada por buena por el autor** el 2026-10-20, tras ver la captura: «todo
esta bien por ahora». Commit `8555cb2`, con la CI y el despliegue en verde.

**La auditoria, aplazada por el autor**: «no corras la auditoria aun. quiero
que pasemos con otra tanda». Se hace cuando la pida. Su alcance parte de la
«Ultima auditoria» de arriba (`4151766`), asi que cubre esta tanda y la
siguiente. Esta seccion pasa a `docs/historia.md` al cerrar con esa
auditoria, no antes.

Siguen a su juicio las deducciones de `docs/juicio.md`, filas «Menas»:
- los colores del hierro;
- la caja de choque;
- la luz de los cristales;
- las vetas por cara.

Lo hecho:
- `ore-mesh.ts`, nuevo;
- `ORE_TONES` en `palette.ts`;
- `STONES` lleva solo la roca;
- el dibujo de cada mena y su liberacion en `billboards.ts` y `main.ts`;
- la hoja `?mundo=1`;
- `tests/ore-mesh.test.ts` y el humo de `resources`.

Lo que se decidio por deduccion esta en `docs/juicio.md`, y el modelo en
`docs/arte.md`, «Las menas». Medido: unos 560 vertices y 1 ms por mena.

Lleva al juego el boceto de abajo («Boceto: los minerales
como piedra con cristales»). El autor contesto cuatro preguntas:

1. **Colores: directo al juego.** El cobre y el carbon, con los del boceto. El
   hierro no esta en el boceto: lleva los que proponga el agente (*deduccion*),
   y el autor los corrige luego sobre el juego.
2. **Piedra: la de la roca del juego** (`STONES[Feature.RockNode]`,
   `ROCK_BASE #84848e`), con las vetas y los cristales del mineral encima. No
   la gris verdosa del boceto.
3. **Variedad**, la maxima: «Me gustaria la opcion de maxima variedad. Usando
   parametros deterministas que le den una forma segun la coordenada donde se
   ubique cada bloque, ¿aun seguiria siendo considerable el incremento de uso
   de memoria y gpu?». La respuesta es **no**. Las cuentas, del codigo:
   - Los minerales son el 10 % de la piedra de montaña (`HIGHLAND_ROCK` 0,045 ×
     `MINERAL_SHARE`): el 0,45 % de sus casillas. Se mallan 7 × 7 chunks de 32
     (`RADIUS = 3` en `main.ts`), unas 50.000 casillas. Aunque todo fuera
     montaña, serian **unas 225 menas como mucho**.
   - **Llamadas de dibujo: las mismas.** Ya hay un `Mesh` por objeto
     (`billboards.ts`, `spawn`) y miles de arboles. Una mena unica sigue siendo
     una llamada si la piedra y los cristales comparten material: `alphaTest`,
     y los cristales en quads por las dos caras.
   - **Memoria: poca.** La forma de juego (`ROCK_SHAPE`, 7 voxeles: 4 tapas y 16
     caras de lado) lleva unos 28 cristales de corona y 32 de costado.
     - Geometria: unos 1.000 vertices, unos 40 KB por mena; en el peor caso,
       unos 9 MB.
     - Una textura de 64 × 64 por mena: 16 KB; unos 3,6 MB.
   - **Lo que si cuesta**:
     - **CPU al cargar un chunk**: pintar y mallar sus menas. Se mide en la
       tanda, no se supone.
     - **Liberar al descartar**: hoy las geometrias de la roca son compartidas
       y no se liberan. Con una por mena hay que hacer `dispose` de su
       geometria y su textura al descartar el chunk, o la memoria crece sin
       parar.
4. **Vecinos: solo dentro de la formacion.** Se quitan los cristales de las
   caras que tocan otro voxel de la misma mena. Hacia fuera de la casilla
   salen siempre, aunque haya otra mena o una pared de terreno pegada.

**El plan**, propuesto por el agente y aprobado por el autor como plan:

- **`packages/client/src/ore-mesh.ts`, nuevo y puro** (como `rock-mesh.ts`):
  - Recibe la mena, la semilla y la casilla. Devuelve arrays planos: los
    voxeles de piedra de `rockMesh` (reutilizado, con su giro por casilla) y
    los quads de los cristales.
  - Porta del boceto (`docs/bocetos/minerales/index.html`) las dos reglas
    aprobadas: `voxelCrown`, la de la corona, y `voxelSide`, la de los
    costados.
  - Porta tambien el quitar cristales de las caras tocadas, como hace
    `buildScene`.
  - `ROCK_SHAPE` no tiene voladizo, asi que no hay flor de abajo.
  - Azar: `mulberry32` sembrado con `hash2D` de la casilla (regla 2). La misma
    casilla se ve igual al volver.
- **La textura de cada mena**:
  - La tesela de la roca del juego, con las vetas y el nodulo pintados encima
    (`stoneFace` del boceto, sobre esa piedra), y los sprites de sus cristales,
    todo en un lienzo de 64 × 64 (`pixelTexture`/`artCanvas` de
    `world-sprites.ts`).
  - Un solo `MeshBasicMaterial`, con `vertexColors` (la luz por cara, como
    hoy) y `alphaTest` 0,4.
- **`billboards.ts`, `spawn`**: `CoalNode`, `IronNode` y `CopperNode` usan
  `ore-mesh`. La roca normal no cambia. Hay que mirar antes como se descarta
  hoy un chunk, para liberar lo de cada mena.
- **Escombros**: `debrisPalette` (`palette.ts`) da a los de una mena el color
  de su mineral.
- ***Deduccion*, a juicio del autor**:
  - La caja de choque sigue de 0,9 × 1,0: los cristales son de dibujo y no se
    golpean.
  - La sombra sigue de ancho 1.
  - Los colores del hierro, de la familia de su icono (`ITEM_PALETTE`).
- **Tests (`tests/ore-mesh.test.ts`)**:
  - La misma casilla da la misma malla, y dos casillas, mallas distintas.
  - Ningun cristal sale de una cara tocada por otro voxel de la mena.
  - Cristales de 0,25 como mucho.
  - La corona pone lo que pide y no se pisa mas del 40 %.
  - Los costados, a 30-56° con arco de 0-20°, y sin tocarse.
  - Todo cabe en la textura.
  - Y el humo de `resources` (`rocks` cuenta tambien las menas).
- **Lo de siempre**:
  - Las mutaciones y `tools/a-pruebas.sh`, y despues `main`.
  - Una captura que decida.
  - La documentacion: `docs/arte.md`, `docs/juicio.md`, y `retirados.md` si
    se retiran las `STONES` de las menas.
  - La auditoria al cerrar.
  - Medir lo que cuesta mallar un chunk con menas
    (`tests/performance.test.ts` mide el tick, no el mallado).

---

## Boceto: los minerales como piedra con cristales (2026-10-20)

El autor, con una referencia (un cubo de roca con cristales de amatista que
brotan de el; el repo no la guarda): quiere que **el voxel de un mineral sea de
piedra con vetas del color del mineral, y que de el salgan cristales del
mineral en laminas cruzadas, como los arboles**, con texturas de 24 × 24.
Pidio solo un ejemplo, sin tocar el juego, para el cobre y el carbon.

**Donde quedo (cierre de sesion, 2026-10-20, `7fc6529`, CI en verde).**
- **Aprobadas por el autor**: el bloque de 1, la regla de los costados y la
  de la corona.
- **Mandada sin respuesta**: la hoja de voxeles juntos (`escenas-cobre.png`).
- **Por confirmar**: los colores de la piedra y de cada mineral.
- **Nada en el juego.**
- **Para comprobar que un cambio no altera lo aprobado**: se vuelve a correr
  `render.mjs` y `git status` no debe marcar ningun PNG salvo los que se
  quieren cambiar. Las fotos son deterministas.

- **El boceto**: `docs/bocetos/minerales/` (`index.html`, que genera sus
  propias texturas, nuevas, y `render.mjs`, que saca las fotos:
  `node docs/bocetos/minerales/render.mjs`).
- **El bloque de 1 × 1 × 1** (`cobre-1.png`, `carbon-1.png`): «Están de lujo»
  (el autor). Hay que conservarlo tal cual: el script reproduce esas fotos
  pixel a pixel.
- **El voxel de 0,5** (`?s=0.5`; `cobre-05.png`, `carbon-05.png`), que pidio
  despues: caras de 12 × 12 y cristales de **0,25 como mucho** (6 pixeles).
  El autor: los de los lados «están tan juntos que parecen uno solo»; ahora
  los dos de cada cara van sueltos, separados de un quinto a dos tercios de la
  cara segun la cara (*deduccion*), y cada uno a su altura. Despues, el
  autor: que varien «entre 45 y 90 grados con respecto a la cara», en un arco
  con la punta «hacia adentro o hacia afuera del bloque», y que su distancia y
  posicion varien «pero nunca lleguen a solaparse sus bases». Leido asi
  (*por confirmar*): la punta, hacia el centro de la cara o hacia su borde,
  con hasta 45 grados de desvio; entre dos pies, sus dos medias bases y un
  margen de 0,08 de la cara (`voxelSide`). Solo en el voxel: el bloque
  aprobado no cambia. Luego, el autor: **el angulo con la cara, de 45 a 75
  grados; el arco dentro-fuera, de 0 a 30**, y «resortea» (el voxel lleva su
  propia semilla). Algunos quedaban mirando al suelo (el arco va en el plano
  de la cara, que es vertical); el autor eligio que **ninguno apunte hacia
  abajo**: si cae, se refleja hacia arriba. Resorteado otra vez. Luego el
  autor: que **en general miren hacia arriba, pero no todos por igual**, con
  el angulo de la primera vez de tope (salian de 38 a 56 grados sobre la
  horizontal) y unos grados para bajar; el arco, igual o mas acotado. Hoy: **de
  30 a 56 grados sobre la horizontal** (los 26 de margen, *deduccion*) y **el
  arco en horizontal, de 0 a 20** grados hacia el centro o el borde de la cara
  (*deduccion*). El autor: «perfecto, así me gustan, guarda esa regla para
  los costados».
- **La regla de los costados, APROBADA** (2026-10-20), para cada cara de lado
  de un voxel de mineral: dos cristales de 3-4 x 4-5 pixeles; **de 30 a 56
  grados sobre la horizontal**; la punta en un **arco horizontal de 0 a 20
  grados**, hacia el centro de la cara o hacia su borde; posicion y distancia
  al azar, **sin que sus bases se toquen nunca** (entre sus pies, sus dos
  medias bases y 0,08 de la cara). Esta en `voxelSide`, en el boceto.
- **La regla de la corona, APROBADA** (2026-10-20: «Bien, ahora me
  convenciste. guarda esa regla para la corona»), para la cara de arriba de
  un voxel de mineral, y la misma flor colgando de la de abajo. Esta en
  `voxelCrown(face)`, en el boceto. Las ocho reglas las propuse yo y el autor
  las aplico todas («aplica todas, con los brotes sueltos»); los numeros son
  *mios* y quedan aprobados con la regla:
  1. De 5 a 7 cristales.
  2. Uno en el centro, el mas alto y grueso (5 x 6 pixeles), de 0 a 10
     grados desde la vertical.
  3. Los demas, petalos en un anillo a 0,20-0,35 del lado, repartidos por
     igual con ±15 grados, de 3 a 5 pixeles de alto.
  4. Abiertos hacia fuera de 15 a 40 grados.
  5. Torcidos de lado hasta ±10 grados.
  6. El centro de la flor, hasta 0,12 del lado fuera del de la cara.
  7. **Cada cristal, un pixel menos de ancho que de alto, nunca menos de
     3**; y sus bases **se pueden pisar hasta un 40 %** de sus dos medias
     bases juntas, nunca mas. Es el grosor y la apretura de la primera
     corona, que el autor preferia: «permite que se solapen hasta un limite
     si es necesario con tal de recuperar ese aspecto original sin el riesgo
     de que queden amontonados por la variedad». La primera se pisaba hasta
     un 31 %; el 40 % lo fije yo.
  8. De 0 a 2 brotes sueltos de 3 x 3, cerca del borde (0,36-0,44).
  - **Y abajo, otra flor igual** («agrega una segunda tirada en la cara de
    abajo»): yo lo lei como otra flor colgando de la cara de abajo, y el
    autor la vio y aprobo la regla. En el boceto, el voxel flota a 0,3 del
    suelo, y hay una vista desde abajo para verla.
  - **Nada se descarta sin decirlo**: cada sorteo cuenta lo que pidio y lo que
    puso, y cuanto se pisan (en el titulo, `data-corona` y `data-abajo`). La
    leccion viene de la primera hoja de coronas. Con bases que no podian
    tocarse, ningun petalo cabia en el anillo y se saltaban sin avisar. El
    autor: «literalmente la flor ya no esta».
- Lo que elegi yo (*por confirmar*): la piedra gris verdosa, los colores de
  cada mineral (y el cardenillo en las vetas del cobre), cuantos cristales y
  donde, su forma (prisma en punta con su cara de luz y su brillo).
- **Voxeles juntos** (2026-10-20). El autor pidio cobre de 0,5 «posados en
  el suelo», cada uno con «una generacion distinta», solo la vista noreste.
  La regla: **eliminar los cristales de las caras donde se toquen los
  bloques**. El suelo cuenta como vecino, asi que la flor de abajo solo sale
  en un voxel que tenga hueco debajo. Las seis formaciones estan en
  `?escena=1..6` (`SCENES`): 2 y 3 en fila, 2 x 2, 3 x 3, 2 x 2 x 2, y una
  base de 2 x 2 con uno encima. La hoja es `escenas-cobre.png`. Cada voxel
  tiene su sorteo y sus vetas (`buildScene`). Al hacerlo aparecio un fallo
  latente de las vetas: una veta que nace en el borde de la cara puede durar
  menos de 4 pixeles, y su nodulo leia antes del principio. Ya esta acotado,
  y los dibujos de antes no cambian.
- **Aun no es codigo del juego**: llevarlo al juego es una tanda que pide el
  autor.

---

## Auditoria al cerrar el pixelart del mundo (2026-10-19)

**El alcance**: de `78bead8` a `4151766`: los arreglos de despues de la
auditoria anterior (el humo de Esc, el toque largo por la hora de los
eventos), las lentes por principios y la tanda del pixelart del mundo, entera
en `docs/historia.md`.

**Corregido:**
- **Medidas escritas sin medir** (escape 44): los comentarios daban a la
  mata 1,1, al brote 0,88 y al jugador 1,92; medidos con `npm run shots`, 1,04,
  0,79 y 1,88 (la mata y el brote, tras subir su dibujo a la fila de arriba).
  Y el color del suelo en pantalla se citaba con una medida de antes de la
  textura: repetida, la roca da lo mismo antes y despues.
- **Textos que hablaban del modelo sustituido** (escape 46): los animales «con
  colores por vertice, como el terreno», el `README` (el terreno en colores por
  vertice) y `docs/efectos.md` (los escombros de `art.ts`, con un contorno del
  isometrico); y las cajas de `sim/boxes.ts`, con las medidas del dibujo
  vectorial.
- **Campos que nadie leia** (escape 47): la silueta, la variante rara y dos
  tonos de cada especie en `palette.ts`, las tres caras de la roca y las de las
  estaciones; hoy `LOOKS` (corteza, hojas y fruto), `ROCK_BASE` y
  `STATION_BASE`. El carbon dejo de llevar sus colores a mano en el generador.
- **`TileRect` dos veces** (en `terrain-mesh.ts` y `world-sprites.ts`): uno.
- **El test de la frontera del cliente** pedia un fichero acabado en `art.ts`,
  que ya no existe: pide `world-art.ts`.
- **Dos numeros tuyos sin test**: las paredes a 0,72 y las 3-4 variantes por
  suelo. Con sus mutaciones, que caen.

**Mutado a mano** (cayeron): las dos nuevas, mas las siete de tests de la
tanda en local; en la CI, todas.

**Ejecutado**: el escaner y su autoprueba; `npm run shots`,
`tools/analyze-world.ts` y el generador (a otro fichero, sale identico);
typecheck y los tests; las pasadas `desktop`, `resources`, `stations`,
`fauna`, `relief` y `devTools`; los triangulos del suelo (+3-5 %).

**Dejado a proposito:**
- **La mata y el brote, unos centimetros por dentro de su caja de choque**
  (1,04 contra 1,1; 0,79 contra 0,85): no se insiste en los dibujos (el
  autor); esta en `docs/juicio.md`.
- El generador sigue fuera de la CI: reescribe un fichero que se retoca a
  mano. Se comprueba a mano, a otro fichero (lente C).

**Escapes** (fase 6): el 44 a A2, el 45 (una comprobacion relajada sin haber
visto el fallo, cuya mutacion sobrevivio en la CI) a B1, el 46 afina el
disparador de sustituir un modelo (tambien lo que solo se comparaba con el), y
el 47 a D1 (cada campo de cada entrada).

---
## El mundo en pixelart HD (2026-10-19) — HECHA

El autor: «adaptemos el arte del terreno y los elementos
(árboles, rocas, minerales, plantas...) al pixelart HD. Los animales quedan
para otra tanda.» Sus respuestas (seran la directriz 7 de
`docs/guia-de-arte.md`):
- «Caras de 24x24 en bloques (voxeles 12x12). Esa debe ser la medida para
  todo elemento del juego. Esto implica rehacer las estaciones.»
- Las paredes del terreno, del **mismo material, mas oscuro**.
- **Sin contorno** en los elementos del mundo.
- Entran tambien **el agua, la mesa y el horno, el jugador, y los escombros y
  esquirlas**.
- **Rocas y minerales, bloques de voxeles** de forma irregular, no laminas.
- El suelo, **3-4 variantes por casilla** elegidas con la semilla, **sin** el
  ±10 % de brillo de hoy.
- Las **sombras, difuminadas como hoy**.

**El plan, por rondas, cada una ensenada antes de seguir** (como los iconos):
1. **Muestra de estilo** en la hoja `?mundo=1` (`world-sheet.ts`): hierba (4
   variantes) y roca (2) con su pared, el roble, la mata de la pradera y la
   roca de voxeles. **Ensenada el 2026-10-19.** El autor: «El árbol y el
   arbusto no me convence mucho», con dos referencias (un roble y una mata de
   bayas en pixelart, que el repo no guarda): «El follaje del árbol debería
   ser más unido y entrelazado, no como si fueran varias bolas de hojas una
   al lado de la otra.» Rehechos. El autor: «El arte del árbol que hiciste
   está bien. Sin contornos es lo correcto», pero las ramas parecian «la
   copa y luego le recortaste un par de agujeros»; en su referencia (un
   arbol de copa alta en pixelart) **las ramas van debajo del follaje, y las
   que se ven dentro son pequenas, con follaje de fondo o sin estar rodeadas
   del todo**. Y que el detalle sea «más profesional»: en otra referencia, un
   arbusto «noob» y uno «pro», **el pro da la ilusion de hojas sueltas**.
   Rehechos otra vez. El autor: las ramas «aparecen no tener textura», lo que
   cubre la union de las ramas parece «musgo más que hojas», y las hojas
   «tienen cierta forma, no son solo líneas de color»; los tallos de la mata,
   planos. Y: **«Hagamos un último intento y aplícalo tal cual como te salga.
   No vamos a gastar más tiempo en eso, ya habrán otras tandas para
   perfeccionar los dibujos.»** Hecho el ultimo intento (corteza en ramas y
   tallos, la horquilla bajo la sombra de la masa principal, hojas con forma
   en abanicos): **la ronda 1 queda cerrada con eso**.
2. El resto en la hoja: los 8 terrenos, el agua (animada o no: el autor, al
   verla), las 6 especies, matas, brotes, rocas y minerales, guijarros, el
   jugador y las estaciones a 24 px. **Hecha y ensenada el 2026-10-19;
   esperando al autor.** Lo nuevo:
   - el pincel se mudo a `client/src/pixel-paint.ts` (puro), porque el juego
     pinta con `barkTrunk` el tronco desnudo de cada arbol (13 largos);
     `world-sprites.ts` compone copa y tronco (`treeArt`) y pasa un dibujo a
     lienzo (`artCanvas`);
   - cada dibujo lleva **su paleta**, como los iconos: con todos los
     materiales, las letras de una paleta comun no alcanzan;
   - las copas de conifera son **pisos** (`Mass.tier`): triangulos de puntas
     caidas y borde dentado, cada uno sobre el de debajo;
   - los minerales son la **piedra de la roca con vetas** de su mineral, no
     una roca entera de su color (*deduccion*);
   - los colores de lo vivo salen de `palette.ts` con algo mas de saturacion,
     la luz hacia el amarillo y la sombra hacia el azul (*deduccion*); la
     nieve, con sombras mas suaves que el resto del suelo;
   - el agua, **quieta** de momento: si se anima, lo decide el autor.
3. **Al juego — hecha el 2026-10-19** (el autor: «Dale, manda asi. Luego
   perfeccionamos»): el suelo en un atlas con sus variantes y paredes de un
   voxel; las aspas y el jugador a 24 pixeles por bloque, sin la escala de
   antes; los arboles con su tronco pintado al vuelo; las rocas y minerales en
   voxeles (`rock-mesh.ts`); el agua, la mesa y el horno en pixelart; los
   escombros con los colores de su dibujo; los iconos de las estaciones con
   los colores de sus caras nuevas. Fuera el dibujo vectorial de antes. Lo que costo: la paleta de
   cada copa tiene que guardar sus cuatro tonos de corteza, y la copa se apoya
   donde empiezan sus hojas, no en el borde de su dibujo (`docs/arte.md`).
4. Documentos (`arte.md`, la directriz 7, `juicio.md`, retirados) y la
   auditoria de cierre (en `docs/pendiente.md` mientras sea la ultima).

**Como se hacen los dibujos**: `tools/pixel-mundo.ts` (`npx vite-node`) los
saca de formas y los escribe en `packages/client/src/world-art.ts`, donde
**se retocan a mano**; volver a correrlo pisa los retoques.

**Deducciones de la ronda 1, para el autor:**
- Los colores son **los que se ven hoy**: el suelo, su hexadecimal (medido en
  una captura: la hierba `#588c48` sale 92,136,84); los objetos, el de
  `palette.ts` aclarado como lo aclara three.js, porque sus texturas no llevan
  espacio de color y las toma por lineales.
- Cuatro tonos por material (luz, base, sombra, hondo) repartidos por
  proporciones fijas; la luz del noroeste.
- La roca de voxeles: 2 × 2 abajo y 3 arriba (le falta la esquina de delante
  a la derecha).
- **El follaje** (`foliage` en el generador): la copa son **masas** (en el
  roble, la principal, dos que cuelgan a los lados y una en sombra debajo,
  delante de la horquilla), cada una un relieve (su cupula y un bulto por
  mata), con la luz de su pendiente, la sombra que echa cada mata sobre la de
  abajo a la derecha y la parte de abajo de cada masa en sombra. Encima,
  **hojas sueltas** de 2-4 pixeles, de pie o en diagonal hacia arriba, un
  tono mas claras que lo de detras y con su sombra debajo; en el borde, sus
  puntas hacen la silueta.
- **Las ramas** salen de la horquilla, por debajo de la copa, y suben entre
  las masas; dentro del follaje solo se ven donde la sombra es honda.
- El tronco, en placas de corteza con las raices abiertas. La mata, de hojas
  sueltas, con bayas de 2 × 2 y tres tallos.
- **Las hojas tienen forma** (`LEAVES` en el generador): tres dibujos de 3-4
  pixeles (de pie, a la izquierda, a la derecha), con canto de luz, cuerpo y
  sombra, en abanicos de dos o tres hacia fuera de su masa.
- **Sus colores salen de las referencias**, no de lo que se ve hoy: verdes
  mas hondos y saturados, corteza rojiza. Las referencias llevan **contorno
  oscuro**; los dibujos no, porque el autor eligio «sin contorno».

## Auditoria al cerrar el inventario de 5 columnas (2026-10-19)

**El alcance**: de `dc902a3` a `78bead8`: la auditoria anterior y la tanda del
inventario de 5 columnas, el menu de una casilla y los objetos que caducan,
con sus ajustes tras jugar. La tanda, entera, en `docs/historia.md`.

**Corregido:**
- **Numeros viejos**: «22 casillas» en un comentario del humo y en un test, y
  la barra impresa con 4 casillas en el humo (`slice(0, 4)`); el patron de
  retirados ahora busca tambien «22 casillas» y «18 casillas».
- **Una linea que no hacia nada** (escape 42): `split` copiaba el desgaste,
  que en lo apilable es siempre 0.
- **Una comprobacion que faltaba**: `takeFrom` sin su tope solo se podia
  romper desde fuera de comer; tiene ya su test.
- **Cerrar el panel con el menu abierto** lo cierra, pero no lo probaba nadie:
  `desktop` lo comprueba.

**Mutado a mano** (cayeron): `firstFree` sin mirar si la casilla esta
abierta, `eatFrom` con el hambre llena y `takeFrom` sin tope.

**Ejecutado**: el escaner y su autoprueba; `npm run shots` y
`tools/analyze-world.ts`; typecheck y los tests; la pasada `desktop`.

**Dejado a proposito:**
- **Con el menu abierto, deslizar la rejilla con la rueda (en PC, con la
  mochila puesta) lo deja donde estaba**, separado de su casilla. Es un caso
  raro, y cerrarlo al deslizar lo cerraria tambien al desplazar hasta la
  casilla elegida.
- **«Todo está bien» no saca de `docs/juicio.md` las deducciones de la
  tanda**: el autor lo dijo de la tanda entera, no de cada numero, asi que
  siguen esperando su juicio (el estandar del escape 38 es lo aprobado
  expresamente).
- Las siete claves de la sonda sin lector de tandas anteriores (escape 40)
  siguen para otra auditoria.

**Escapes** (fase 6): el 41, el ajuste de toque del navegador, a la lente G;
el 42, una mutacion que sobrevive porque la linea no hace nada, a la B; y el
P7, una mutacion a mano que deshizo un arreglo sin commit al restaurar desde
git.

**Despues del cierre**: la CI de `main` cayo en `desktop`: la comprobacion
nueva de cerrar y reabrir con E dejaba una captura del cursor a medias que la
prueba de Esc veia como pausa. Ahora se hace sin pedir la captura y comprueba
que no queda ni pausa ni captura; es el escape P8. Y al probarlo, la CI de
`pruebas` cayo en los gestos: **un toque corto en una casilla abria el menu si
la pagina iba ocupada**, porque el plazo de 0,3 s corria antes de atender el
soltar. Eso le pasaria igual a un movil lento: ahora se mide por la hora de los
eventos, y los gestos lo comprueban con un soltar de 0,1 s que llega a los 0,6
(su mutacion cae). Es el escape 43.

## Las lentes por principios, no por casos (2026-10-19) — HECHA

El autor: la skill de auditoria tiene que construirse con **protocolos que
sirvan en proyectos parecidos**; ante cada escape, entender la logica de la
omision y hacer un estandar, no una regla para ese caso. Una tanda propia, y
`.claude/skills/auditoria/references/lentes.md` en un solo fichero.

- **`lentes.md` reescrito**: cada lente lleva su pregunta, **principios**
  numerados (`B2`, `G1`) sin nombres del proyecto, cada uno con sus «Casos»
  de `escapes.md`, y al final «En este proyecto» con lo propio de Verdant.
  Arriba, **disparadores** que cruzan lentes (al sustituir un modelo, al
  arreglar algo, al retirar algo); abajo, **el proceso del auditor** (Q1-Q4,
  de los P1-P8).
- **Familias que estaban repartidas**: el tiempo del hecho contra el de la
  prueba o del codigo (#7, #9, #13, #17, #23, #43, en B3 y G1); el objeto de
  la medida (#2, #12, #15, #21, #28, en B2); la plataforma que se interpone
  (#8, #11, #14, #41, en B5 y G2); lo que dependia de un modelo sustituido
  (#22, #26, #30, #31, en un disparador).
- **`SKILL.md`, fase 6**: se nombra la omision sin terminos del proyecto; si
  encaja en un principio, el escape solo anade su numero; si no, el principio
  nuevo tiene que cazar otro escape pasado o un caso verosimil en otro
  proyecto. El principio 6 dice ya «un principio, no un caso».
- **El escaner**, categoria 14: cada escape tiene que estar citado en algun
  «Casos». En su primera pasada sobre las lentes viejas dio 11 sin citar
  (#10, #29, #30, #33 y siete del proceso); con las nuevas, 0.
- **Los cinco escapes del dia** (#41, #42, #43, P7, P8) se pusieron al
  formato del registro, con su principio.

## Inventario de 5 columnas, menu de una casilla y objetos que caducan (2026-10-19) — HECHA

El autor, en lo esencial: los objetos del suelo **caducan a los 2 dias de
juego** desde que se generaron; la rejilla pasa a **5 columnas y 15
casillas** (3 filas), y la **barra a 5**, su primera fila; en el movil el
boton **MAS** (OTROS) baja **debajo de INVENTARIO**; elegir una casilla que no
se ve entera **desliza la rejilla** hasta que se vea; y **un menu de opciones**
por casilla (una foto: Usar, Dividir, Equipar, Destruir), con clic en PC o
manteniendo en el movil, a la derecha en las columnas 1-2 y a la izquierda en
las 3-5, alineado con el borde en la primera o la ultima fila visible.

Sus respuestas: Dividir abre un selector con un area que empieza en 0,
[-1] [-5] [-10] [0] encima, [+1] [+5] [+10] [1/2] debajo, X a la izquierda y ✓
a la derecha, y lo separado va a la primera casilla disponible, barra
incluida (sin ninguna, apagado); Destruir, toda la pila y con confirmacion;
los botones de MAS, en columna bajo el, a la derecha; el Bolso sigue en 2 y 6;
al fundirse, el reloj del mas nuevo; la barra del movil, del borde izquierdo a
INVENTARIO; mantener, 0,3 s.

**Hecho**:
- en el nucleo, `Drop.born`, `DROP_LIFE_TICKS` y `stepDrops(world, tick)`;
  `START_SLOTS = 15` y `HOTBAR_SLOTS = 5`; `Inventory.split`, `destroy`,
  `firstFree` y `takeFrom`; `eatFrom`; y en la `Intent`, `splitFrom` /
  `splitCount`, `destroy` y `useSlot`;
- en el cliente, `item-menu.ts` (las opciones, la colocacion, el
  desplazamiento y el tope de Dividir, puros), el menu y los dos avisos en
  `inventory-ui.ts` e `index.html`, y el CSS de 5 columnas, la barra del movil
  y OTROS;
- tests en `drops.test.ts`, `inventory-actions.test.ts` e
  `item-menu.test.ts`; el humo (`desktop`, `mobile`) y los gestos.

Las deducciones, en `docs/juicio.md`: el estandar de botones en vez de las
pildoras blancas de la foto, el menu solo en la rejilla, el tope de Dividir,
el registro de objetos a la izquierda de MAS y lo demas.

En `main` tras las dos tandas en verde en `pruebas` (`d6ca9d7`). **El autor lo
jugo** (2026-10-19): bien, salvo tres cosas. Pidio redondear las esquinas de
los botones nuevos; que tocar fuera cierre el selector de Dividir (y, en su
respuesta, la confirmacion de Destruir, sin destruir); y que las casillas del
movil no encojan, con el mismo espacio que PERSONAJE, respondiendo al dedo
solo en su centro de 48 px para que el resto deslice la rejilla, y la barra
deslizable centrada en el hueco entre la ultima columna y el borde del panel.
**Hecho**: esquinas de 8 px, cerrar los avisos tocando fuera, casillas de 60
con `TOUCH_CORE` (el anillo desliza la rejilla por geometria: dejarlo sin
eventos no servia, por el ajuste de toque del navegador), la barra en el hueco
y el panel del movil a 8 px de cada lado.

En `main` tras las dos tandas en verde en `pruebas` (`6748612`). **Cerrada**
(2026-10-19): el autor lo dio por bueno jugando («Todo está bien»), y la
auditoria de cierre, en «Auditoria al cerrar el inventario de 5 columnas».

---

## Auditoria al cerrar los objetos en el suelo (2026-10-18)

**El alcance**: de `597b8d4` a `dc902a3`: la auditoria anterior y la tanda de
los objetos en el suelo, con sus dos rondas de ajustes tras jugar. La tanda,
entera, en `docs/historia.md`.

**Corregido:**
- **Lo que el autor dio por bueno jugando seguia como deduccion** (escape 38):
  la espera de 0,5 s para recoger, la velocidad del iman, lo tirado y el
  icono de 0,4 con su vaiven salen de `docs/juicio.md`, y el codigo y
  `docs/recoleccion.md` dicen que los aprobo.
- **Una sonda muerta con un comentario falso** (escape 40): la de los
  montones dibujados y su contador («el humo lo mira crecer»); no la leia
  nadie.
- **Un comentario sobre la linea que no era** (escape 39): en `tick.ts`, el
  de tirar quedo encima de guardar.
- **El humo copia numeros del juego sin decirlo**: el comentario del botin en
  `resources` nombra ahora `DROP_FLOAT`, `DROP_SIZE` y `BOB_HEIGHT`.
- **Un test que afirma mas de lo que dice su nombre**: el de la mata se llama
  ahora «sale por fuera de la mata…», tambien en `docs/leyes.md`.

**Mutado a mano** (cayeron las cinco): el desgaste y el limite de la barra de
`stow`, lo que no cabe al guardar, flotar sobre el agua y derramar lo
fabricado que no cabe.

**Ejecutado**: el escaner y su autoprueba; `npm run shots` y
`tools/analyze-world.ts`; typecheck y los tests.

**Dejado a proposito:**
- **Tirar o guardar arrastrando ya no comprueba que la casilla siga teniendo
  lo mismo al soltar**: lo hacia el dialogo de confirmar, que el autor
  retiro. Un arrastre dura un instante; si en medio se come lo de esa
  casilla, se tira o guarda lo que quede en ella.
- **Siete claves de la sonda que no lee ninguna herramienta**, de tandas
  anteriores: `balanced`, `faunaDrawn`, `faunaGallery`, `lastUsed`,
  `stationDrops`, `tracked` y `usedLast`. Fuera del alcance; para la proxima
  auditoria (escape 40).

**Escapes** (fase 6): del 37 al 40. El 37, el botin dentro del tronco, lo vio
el autor jugando: a la lente G, «Lo que nace en el mundo».

---

## Los objetos en el suelo (2026-10-18) — HECHA

El autor, literal: «en esta tanda quiero abarcar items arrojables. me refiero a
que los drops al matar, romper, golpear cosas en el mundo, arrojar items desde
el inventario, etc. todo botin generado debe ser arrojado como items flotantes
en el suelo. tendran gravedad pero flotaran a 0.2m de la superficie y miraran
siempre al jugador (billboard). no diran su nombre, solo sera el items».

Sus respuestas (plan aprobado): se recogen solos al acercarse (iman de ~1,5);
duran para siempre; con el inventario lleno el golpe termina igual; lo
fabricado que no cabe cae a los pies; el botin salta y se esparce; un monton
por tipo, y los iguales se funden; tirar lo lanza hacia la mirada y no se deja
recoger unos 2 s; y mientras flota, sube y baja suave.

**Hecho**: el nucleo (`drop-store.ts`, `systems/drops.ts`, la emision en
`gathering.ts` y `tick.ts`), el cliente (`drops-view.ts`), los tests
(`drops.test.ts` y los que esperaban el botin en el inventario, con
`tests/ground.ts`), el humo (`collect`, que anda hasta los montones, y la
comprobacion del botin en el suelo en `resources`) y la documentacion
(`docs/recoleccion.md`, «Objetos en el suelo»).

En `main` desde `3d7b09d`. **El autor lo jugo** (2026-10-18): tamaño, vaiven,
velocidad del iman, espera para recoger y distancia al tirar, bien. Pidio,
literal: «El imán bájalo a 1 bloque»; «La dispersión al generarse. cuando es
botin de una acción en el mundo, que salga dispersado de 0m a 0.5m del origen
y desde la mitad de la altura del elemento que la género. Cuando es de una
receta que no cabe, cae a los pies»; «Al tirar un objeto desde el inventario
ya no se pide confirmacion»; «si se arrastras desde la hotbar a fuera de las
casillas, se arroja (también sin confirmar)»; y arrastrar de la barra al boton
INVENTARIO la guarda en la siguiente casilla disponible fuera de la barra. Sus
respuestas: el saltito se queda y cae a 0-0,5; al guardar, primero apila y
luego vacia; tirar desde la barra, en cualquier sitio salvo casillas e
INVENTARIO.

**Hecho (ajustes)**: `PICKUP_RADIUS = 1`, `SCATTER_REACH`, `sourceOf` en
`gathering.ts`, `Inventory.stow` con `Intent.stow`, y en `inventory-ui.ts`
tirar sin dialogo, tirar desde la barra y guardar. Tests en `drops.test.ts` y
`stow.test.ts`; los gestos lo prueban con el dedo.

En `main` tras las dos tandas en verde en `pruebas` (`066e4b1`). **El autor lo
jugo otra vez** (2026-10-18): todo bien salvo la dispersion, que seguia cayendo
casi en el centro, y las ramas de un arbol en pie salian encima de el. Literal:
«La idea es que los elementos salgan expulsados de su generador con una fuerza
que los lleve entre 0 y 0.5m del origen». La causa: nacian en el centro de la
caja, dentro del tronco solido, y se posaban encima. **Hecho**: `scatterLoot`
los saca por fuera de la caja (`LootSource`, con su media anchura) y cuenta
los 0-0,5 desde esa cara (*deduccion*, en `docs/juicio.md`); los animales,
igual desde la suya.

**Cerrada** (2026-10-18): el autor lo dio por bueno jugando («Todo parece
funcionar bien por el momento»), y la auditoria de cierre, en «Auditoria al
cerrar los objetos en el suelo».

---

## Auditoria al cerrar el estandar de los botones (2026-10-18)

**El alcance**: de `bf82a04` a `597b8d4`: la auditoria anterior y el estandar
de los botones. La tanda, entera, en `docs/historia.md`.

**Corregido:**
- **CSS muerto que tapaba la regla comun** (escape 36): `.slot.off`, que ya
  solo llevaban las categorias vacias (son `.btn` y las apaga `.btn.off`), y
  los `border-radius: 50%` de `#proj`, `#thumbPad button` y `.round`, que
  pisan las esquinas de 12 px desde los botones cuadrados.

**Ejecutado**: el escaner y su autoprueba; `npm run shots` y
`tools/analyze-world.ts`; typecheck y los tests; las pasadas `desktop` y
`mobile`.

**Escapes** (fase 6): el 36, CSS pisado por orden y no por peso, a la lente D.

**Sin verificar con dedos**: la luz de pulsar en un movil de verdad (el humo
la mira con toques simulados).

---

## El estandar de los botones (2026-10-18) — HECHA

El autor, despues de probar en el movil el + y el - mantenidos («Se siente
bien»), literal: «note un comportamiento de algunos bonotes que no está
estandarizado. Los botones de las pestañas dentro de inventario y los botones
de + y -, no se iluminan al ser presionados. Además, los botones de las
pestañas no tienen el texto en blanco, que es el color del icono de todos los
demás botones. Estandariza la construcción para todos los botones de ahora en
adelante (arte pixelart o texto, color, sombra e iluminación, comportamiento,
etc.) y arregla los que ya mencionados.»

Sus respuestas: la pestaña elegida, encendida como un boton; el panel de
desarrollo, con el mismo azul; un solo azul para pulsado y encendido.

**Hecho**: la directriz 6 de `docs/guia-de-arte.md` (el estandar entero);
`.btn` en todos los botones salvo las casillas, con su regla al final del CSS;
`press-light.ts`, la luz de pulsar de todos (USAR, SALTAR, MODO y ATAQUE ya no
se encienden por su cuenta); los textos de los botones en su `<span>`. El humo
mira cada boton que se ve en PC, en el movil y en el panel de desarrollo
(`buttonStandard`), que la luz de un toque dure y que el + no se quede
encendido al apagarse en su tope.

## Auditoria al cerrar los ajustes despues de jugar en el movil (2026-10-17)

**El alcance**: de `47c7cc5` a `bf82a04`: la auditoria anterior y los ajustes
(+ y - mantenidos, la vuelta a 1, el relieve por dentro con el icono que baja,
MODO y ENTRADA). La tanda, entera, en `docs/historia.md`.

**Corregido:**
- **El texto del + y el - pulsados bajaba 1 px, no 2**: miden 26 px de alto
  fijo, y el texto va centrado en lo que deja el relleno. Ahora 4 px de
  relleno lo bajan 2; el humo `stations` lo mide, con su mutacion.
- **Dos filas de `docs/juicio.md` sobre un sitio de MODO que ya no existe**
  (a 72 px del ataque, el arco de 84). Fuera; queda la del tamano.
- La historia del arco de 102 y la sombra de fuera lleva su «*Luego*».

**Ejecutado**: el escaner y su autoprueba; `npm run shots` y
`tools/analyze-world.ts`; typecheck y los tests; una mutacion nueva.

**Escapes de la tanda** (fase 6): el 34 («baja 2 px» medido solo en los
iconos) y el 35 (filas de juicio buscadas por el valor y no por el nombre).

**Sin verificar con dedos**: mantener + o - en el movil; los gestos no lo
prueban, porque con E no hay ninguna receta apilable.

## Ajustes despues de jugar en el movil (2026-10-17) — HECHA

El autor probo en su movil las correcciones a los iconos y pidio, literal:

> Los botones de + y - en recetas, quiero que al dejar presionados sumen o
> resten más rápidamente (de uno en uno, pero varias veces por segundo e
> incrementando la frecuencia de aumento por segundo entre más tiempo se deje
> presionado, es decir, al dejar presionado al principio aumenta por ejemplo
> 3/s y al segundo siguiente pasa a 4/s y al siguiente 5/s y así, es solo un
> ejemplo). Al cerrar el inventario, el contador de + en recetas vuelve a 1.

Y en el movil: MODO y ENTRADA con el mismo espacio entre ellos y con USAR y
SALTAR; las pestanas pisaban la linea; «A todos los botones le pusiste una
sombra que sobre sale… Preferiría que ya sea sombra o iluminación, estén
dibujadas solo en el área del propio botón»; y «me gustaría probar con que sea
solo el icono quien haga el efecto de bajar y el botón lo acompañe con el
intercambio de luces e iluminación, pero que el propio botón no se mueva de su
posición».

**Lo que se decidio con el autor** (con capturas, antes del codigo): ATAQUE,
USAR, SALTAR y CORRER no se mueven; MODO a 10 px de USAR y ENTRADA a 10 de
SALTAR, corridos **4 px en espejo** (MODO dentro del ancho de USAR, ENTRADA
dentro del alto de SALTAR), con MODO–ENTRADA medido de esquina a esquina (7,2
px); encendido, el icono tambien abajo.

**Hecho**: `qty-hold.ts` (el ritmo, con su test), el mantener en
`inventory-ui.ts`, la vuelta a 1 en `toggle()`, el relieve por dentro y el
icono que baja (la regla comun al final del CSS; fuera los `scale` de los
`:active`, que ya no hacian nada), y MODO y ENTRADA con `--modegap` y
`--modeshift`. El humo lo mide en `stations`, `desktop` y `mobile`; las
deducciones, en `docs/juicio.md`.

**Sin verificar con dedos**: mantener + o - en el movil (`pointerdown` con el
dedo); los gestos no lo prueban, por lo mismo de abajo.

## Auditoria al cerrar las correcciones a los iconos (2026-10-17)

**El alcance**: de `ab51f9b` a `47c7cc5`: la auditoria anterior, los iconos a
multiplo de 24, la regla de `CLAUDE.md` («una pregunta del autor se responde,
no se ejecuta») y las tres rondas de correcciones. La tanda, entera, en
`docs/historia.md`.

**Corregido:**
- **Cuatro colores huerfanos en la paleta** (escape 33): los del fuego y el
  hondo de la piedra, que solo usaba el horno viejo. Fuera, y un test nuevo
  exige que cada color lo use algun icono.
- **`docs/controles.md` mentia en dos frases**: llamaba «mochila de
  explorador» al icono de INVENTARIO y decia que AUTO SALTO «era una A»,
  cuando ahora lo vuelve a ser.
- **CSS muerto**: la letra de 8 px de las categorias, que ya no escriben su
  nombre.
- La fila de la paleta en `docs/juicio.md` ya no cuenta los colores.

**Ejecutado**: el escaner y su autoprueba; `npm run shots` y
`tools/analyze-world.ts`; typecheck y los tests; una mutacion nueva.

**Escapes de la tanda** (fase 6): la pasada `resources` afirmaba algo de la
fila de receta y no la corri en local antes de la CI (P6); ahora las pasadas
que se corren salen de buscar los selectores tocados.

**Sin verificar con dedos**: los + y - se pulsan en el movil con un toque
normal (`click`), pero los gestos no los prueban, porque con E no hay ninguna
receta apilable.

## Correcciones a los iconos — HECHA (2026-10-17)

**El pedido del autor, literal** (con dos imagenes de ejemplo: una mochila con
solapa, hebilla y bolsillo, y una capa de frente con cuello alto):

> El icono de inventario quedó demasiado pegado al borde de su botón y no se
> ve bien. Ya que 24x24 sería muy pequeño, vamos a pasar todos los botones
> redondos a cuadrados (como el botón de bioma o información) y darles una
> pequeña iluminación y sombra para generar la ilusión de relieve que indique
> "soy un botón que puedes presionar". La ilusión de relieve no debe ir en el
> dibujo del icono, sino en el botón. Esto aplicara para todos los botones del
> juego.
>
> Me hicieron falta los iconos de las categorías de las recetas. Diseñalos
> como monocromaticos para que se entienda que son representaciones
> generales. Cómo esto son botones, su botón también va con la ilusión de
> relieve.
>
> Los iconos de las estaciones deben ser lo más parecido a sus bloques 3d. Lo
> mismo para todos los iconos de bloques que se puedan poner en el mundo de
> ahora en adelante.
>
> El icono de auto salto vuelve a que sea una "A" pero hecha en pixelart.
>
> En el icono del corazón de vida, haz que sean más uniformes las líneas
> horizontales que forman la punta inferior. Actualmente tienen como un bache.
>
> Los iconos de capa y mochila no me convencen. Te mandé unos ejemplos, pero
> recuerda que estos seran iconos, así que deben ir monocromaticos. Usa el
> mismo icono de mochila para el botón de inventario.
>
> Los colores del hierro y la piedra son muy similares, has la piedra un poco
> más oscura y el hierro un poco más claro (en todo, tanto en la mena como en
> los ítems y recetas).
>
> Las barras de durabilidad no se mostraran cuando el arma o herramienta este
> a su máxima durabilidad (nueva o con futuras expansiones de reparación).
>
> Agrega unos pequeños botones de + y - para cambiar la cantidad de veces que
> se ejecuta una receta. Los puedes poner uno sobre el otro al lado derecho de
> los ingredientes de la receta (alineando nuevamente toda la fila hacia el
> centro del hud). Cada receta tendrá estos botones, pero solo estarán
> habilitados en aquellas recetas de ítems apilables (las herramientas, armas
> y equipables no son apilables).

**Sus respuestas a las preguntas:**
- Fabricar N: «Salen las N de golpe con un solo mantener. Además, baja el
  tiempo de mantener a 1s.»
- La N sube hasta lo que alcanzan los ingredientes y el sitio, y se ve en el
  resultado (lo que sale en total); los ingredientes, tengo/necesito para N.
- «Todos los botones»: todo lo pulsable salvo las casillas. Los anillos de
  hambre y salud se quedan redondos.
- El objeto *Mochila de armazon* (a color) no cambia; solo las siluetas de
  Capa y Bolso y el boton INVENTARIO.
- Piedra e hierro: en los iconos **y en el mundo 3D**.
- Las estaciones: el bloque en 3/4, isometrico, como el inventario de
  Minecraft.
- Antes, sobre los ingredientes del movil (el icono de 48 en una casilla que
  ensena 44): «mientras se mantenga así entonces no hay necesidad de tocar las
  proporciones en los hud de recetas».

**El plan, por rondas** (cada una se ensena antes de seguir):
1. Los dibujos, en la hoja `?iconos=1`.
2. El aspecto de los botones, en capturas de PC y movil.
3. El resto al juego —fabricar N, el mantener a 1 s, la durabilidad, las
   categorias con icono, los colores 3D—, el humo, las mutaciones, la CI y
   `main`.

**Ronda 1 — HECHA, esperando al autor (2026-10-17):**
- Las 6 categorias, en `silhouette-icons.ts` (`CATEGORY_ROWS`, por el nombre
  de la categoria en `RECIPES`): el pico y el hacha, la mesa de lado, el
  crisol con la llama, la tunica, el muslo y la espada. Son diseños mios.
- La mesa y el horno, en 3/4, sacados de las **mismas texturas** que pinta
  `stations-view.ts`, con sus colores y la luz de cada cara (tapa 100 %,
  frente 95 %, costado 74 %), y su contorno. Los saca un generador del
  contenedor; desde que estan en el repo se retocan a mano.
- La «A», el corazon con la punta en escalones iguales, y la capa y la
  mochila nuevas. INVENTARIO usa la rejilla del hueco Bolso.
- Piedra mas oscura e hierro mas claro, en la paleta de los iconos (y la veta
  de hierro) y en el mundo: `ROCK_FACES`, `MINERAL_FACES[IronNode]` y, por
  ser de piedra, el horno (`STATION_FACES`; esto ultimo es *deduccion*).
- **El autor aprobo el resto y corrigio tres** (2026-10-17):
  - el icono de la mesa se veia mas oscuro que su bloque. **Medido**: three.js
    trata la textura del lienzo como lineal y la pasa a sRGB al pintarla, asi
    que en pantalla `#8a5a30` es `#c2a078` (lo mismo el horno). El generador
    aplica esa conversion; los colores de las estaciones en `ITEM_PALETTE`
    son ahora los que se miden en pantalla. **Cualquier icono futuro de un
    bloque tiene que pasar por ella**;
  - la capa, mas sencilla, como su segundo ejemplo (sin la cruz: va
    monocroma);
  - Herramientas: el pico y el hacha de los objetos, adaptados y cruzados como
    su referencia.
- **Aprobada** («Aprobados, adelante con la ronda 2»).

**Ronda 2 — HECHA, esperando al autor (2026-10-17)**: una sola regla al final
del CSS (`index.html`, «Todos los botones, cuadrados y con relieve») para todo
lo pulsable salvo casillas y anillos.
- Esquinas de 12 px (20 en ATAQUE, 14 en USAR, CORRER y SALTAR, 8 en AUTO
  SALTO).
- Relieve con `box-shadow`, *deduccion*: luz por dentro arriba a la
  izquierda, sombra abajo a la derecha y una sombra dura debajo. Pulsado,
  encendido o abierto, se hunde.
- Con esquinas, MODO y ENTRADA se pisaban (−7 px) y MODO tocaba USAR. El arco
  mas corto que deja 4 px libres con todo, a la misma distancia del ataque,
  es de **102** (era 84), con MODO a **155,5 grados** (era 153) y ENTRADA en
  sus 117. Propuesta al autor.
- **Aprobada** («Todo va bien. Continúa»).
- *Luego* (el mismo 2026-10-17, despues de jugar en el movil): el relieve paso
  todo por dentro, el boton dejo de hundirse (baja solo el icono) y MODO y
  ENTRADA dejaron el arco; ver «Ajustes despues de jugar en el movil».

**Ronda 3 — HECHA (2026-10-17)**:
- **Fabricar N**: `tryCraft(..., times)` todo o nada y `craftableTimes` en
  `sim/systems/gathering.ts`, `Intent.craftTimes`, y + y - en cada receta
  (`inventory-ui.ts`), apagados en lo que no se apila y en su tope. El
  resultado dice el total y los ingredientes, tengo/necesito para las N.
  Tests en `tests/craft-times.test.ts`.
- **Mantener 1 s** (`CRAFT_HOLD_MS`).
- **La barra de desgaste** no se pinta con la herramienta entera.
- **Las categorias**, con su icono; su nombre va en `data-category`, `title`
  y `aria-label`.
- **El humo**: en `stations` el + se para en lo que alcanza y un mantener
  hace 5 lingotes (el mantener de esa pasada es de 1,2 s, para distinguir 1 de
  1,5), y las herramientas tienen + y - apagados y sin barra; en `desktop` y
  `mobile`, los botones cuadrados y con relieve; en `mobile`, la holgura entre
  mandos se mide de caja a caja. Nueve mutaciones.

## Auditoria al cerrar los iconos en pixelart (2026-10-17)

**El alcance**: de `2b3e3cc` a `ab51f9b`: la auditoria anterior y las tres
rondas de los iconos —el formato y los 30 objetos, las siluetas de PERSONAJE
y de los botones, y su llegada al juego—. La tanda, entera, en
`docs/historia.md`.

**Corregido:**
- **El ojo de la primera persona salia fuera de la rejilla** (escape 31): el
  CSS seguia encogiendo la pupila con `scale(.55)`, pensado para el vector, y
  en pixelart pintaba pixeles mas pequenos que los del resto. Es la vista de
  arranque. Ahora la mira lleva su propia pupila de 2 × 2, dibujada en la
  rejilla, y la grande se oculta; el humo lo mira y su mutacion cae.
- **Una comprobacion del humo que corria contra el reloj** (patron 13): la
  del icono del registro leia las lineas en otra ida y vuelta, y cada una
  vive 3 s. Ahora la mira el observador que ve nacer la linea.
- **Filas de `docs/juicio.md` sobre lo que ya no existe** (escape 32): dos
  median los dibujos de trazo retirados (los cubiertos y los iconos de los
  botones), dos los citaban, y una hablaba de los huecos «Espalda» y
  «Cintura», que no existen desde el 2026-10-04.
- **USAR mide 32 px** y la documentacion de los tamanos no lo decia.
- **CSS muerto**: el `font-size: 9px` de la barra del movil era del nombre.
- Comentarios: el del ojo en `index.html` (eran dos formas y la clase
  `.flat`; son cuatro piezas), y las cabeceras de los iconos dicen ahora que
  el autor aprobo los dibujos.

**Ejecutado**: el escaner y su autoprueba; `npm run shots` y
`tools/analyze-world.ts`, que funcionan; typecheck y 531 tests; la pasada
`desktop`; el ojo, capturado ampliado antes y despues; dos mutaciones nuevas.

**Dejado para el autor**: USAR (32 px), INVENTARIO (36) y AUTO SALTO (18) no
eran multiplos de 24, y sus pixeles salian desiguales; lo mismo los iconos que
encogian con una casilla pequena. **Lo decidio el mismo dia**: «Puedes ajustar
solo el icono y dejar las casillas/botones del tamaño actual?». Hecho: todos a
24 o 48 (tambien los anillos del movil, a 36, que cazo la comprobacion nueva
del humo), y las casillas pasan a 24 donde no cabe el de 48.

## Los iconos en pixelart — HECHA (2026-10-17)

**El pedido del autor, literal**, con una imagen de referencia (iconos de
juego de unos 16-20 pixeles, contorno oscuro, 3-4 tonos, luz arriba a la
izquierda, sobre fondo oscuro):

> La siguiente tanda quiero que sea de iconos. vamos a generar svg para cada
> objeto disponible actualmente en el juego. quiero que tengan aspecto
> pixelart HD. te mande una imagen de referencia.

**Sus respuestas:**
- Rejilla de **24 × 24**.
- El icono **en vez del nombre** donde hoy se ve un objeto: la barra, la
  rejilla, las recetas y sus ingredientes, lo arrastrado y la zona de lo
  seleccionado. El nombre queda al pasar el raton y en la descripcion. Y en el
  aviso de lo recogido, **icono y texto**.
- Sus palabras: «Los iconos de items seran pixelart a color. los iconos de las
  casillas vacias del inventario y de los botones siguen siendo siluetas
  monocromaticas. pero en esta tanda incluye pasar los iconos de casillas
  vacias de inventario y los iconos de los botones a pixelart 24x24».
- Tambien los cuatro botones de caracter (», ↑, A y el 🌿 de bioma).
- **Revision**: primero una hoja con los 30, que aprueba o corrige; despues,
  al juego.

**El plan, por rondas**:
1. El formato, la paleta y los 30 objetos, y su hoja.
2. Las 14 siluetas de PERSONAJE y los iconos de boton (salieron 20), y su hoja.
3. La integracion en la interfaz, el humo, las mutaciones, la documentacion,
   la CI y `main`.

**Donde va cada cosa**:
- `client/src/pixel-art.ts`: el formato. Cada icono son 24 filas de 24
  caracteres; `.` es transparente.
- `client/src/item-icons.ts`: los 30 objetos y su paleta comun.
- La hoja: `?iconos=1` (`icon-sheet.ts`).
- El test: `tests/pixel-icons.test.ts`.

Las rejillas las saco de formas (elipses, poligonos, trazos), con el contorno
y la luz puestos solos, con un generador que vive en el contenedor y muere con
el. **Desde que estan en el repo, se retocan a mano, pixel a pixel.**

**Ronda 1 — HECHA y APROBADA (2026-10-17)**: los 30, en la hoja. El autor:
«Aprobados, adelante con la ronda 2».

**Ronda 2 — HECHA y APROBADA (2026-10-17)**: el autor, «Aprobados, adelante
con la ronda 3»: las 14 siluetas de
PERSONAJE y los 20 iconos de boton, en `client/src/silhouette-icons.ts`, en
la misma hoja. Son 20 porque el ojo son cuatro piezas que alterna el juego:
abierto, pupila, entornado y la mira de la primera persona.
- Los de PERSONAJE traducen a pixel los que el autor ya corrigio.
- Los cuatro de caracter son lectura mia, por confirmar: correr con dos
  galones, saltar con una flecha, el auto salto con una flecha que salta un
  bloque, y el bioma con una ramita.
- Duda mia, para el autor: las hombreras, a 24 pixeles, salen con aire de
  corona.

**Ronda 3 — HECHA (2026-10-17)**: al juego.
- **Las casillas** (`paint()` en `inventory-ui.ts`) ponen `itemIcon(item)` a
  48 px en vez del nombre; la cantidad y el desgaste, encima. Igual el
  resultado y los ingredientes de las recetas, lo arrastrado y la zona de lo
  seleccionado. PERSONAJE, al equipar, cambia la silueta por el icono.
- **El registro**: «+5 [icono] Madera»; la linea pasa de 15 a 26 px.
- **Los botones**: cada `<svg>` de `index.html` va vacio con `data-pixel` y se
  rellena al arrancar (`installButtonIcons`, 22 piezas); los cuatro de
  caracter tambien.
- **El humo** lo afirma en `desktop` (casillas, ingredientes, registro y que
  se rellenaron los 22), `mobile` (los ocho botones con su icono pintado) y
  `devTools` (la hoja, con sus 64). Siete mutaciones.
- **Docs**: la directriz 5 en `docs/guia-de-arte.md` y la 3 al dia;
  `recoleccion.md`, `controles.md`, cinco filas en `juicio.md` y los retirados.

## Auditoria al cerrar la fisica al estilo Minecraft (2026-10-14)

**El alcance**: de `7e2d790` a `2b3e3cc`, nueve commits: la camara sin
tirones (interpolar entre ticks, y el escalon suavizado que luego se retiro),
la puerta de la vista de cerca de `slash`, `mobile` con el reloj manual, la
fisica por fases (sustituida) y las cuatro fases de la fisica al estilo
Minecraft —caja cuadrada, escalon tick a tick, salto a medida, empujes y
modelos con las patas en el cuadrado—. La tanda, entera, en
`docs/historia.md`.

**Corregido:**
- **Una comprobacion del humo que no veia lo nuevo** (escape 28): la pasada
  `devTools` miraba las cajas del panel en el nacimiento, donde no hay ningun
  animal a 12 casillas, y daba por bueno «en cian solo el jugador». Quitar del
  panel la caja de los animales no la hacia caer. Ahora cuenta aparte los
  cuerpos y las partes de los animales (`boxesNear`) y se repite junto a un
  animal: mutada, cae por las dos vias.
- **Una doc suelta** (escape 29): `keepIn` quedo entre la doc de `stepFauna`
  y la funcion. Y para que no vuelva, `tools/a-pruebas.sh` pasa ahora el
  escaner entero y ensena sus avisos vivos antes de empujar.
- **Un numero viejo** (escape 30): la cabecera de `push.ts` daba la caja del
  bisonte de antes de la fase 4 (1,25; es 1,24). Las medidas viejas entran en
  `retirados.md`.
- **`massOf` solo la usaban los tests** (patron #26): `push.ts` repetia su
  formula a mano. Ahora la usa, y su mutacion cae.
- **Comentarios que decian que las partes de un animal chocan**
  (`fauna-body.ts`, tres sitios): desde la caja cuadrada solo se golpean; la
  cabecera de `movement.ts` cuenta ahora que entre cuerpos no hay choque sino
  empujes.
- **Historia sin su «*Luego*»**: tres secciones de `docs/historia.md` que
  cuentan modelos ya sustituidos (el reposo por partes, la camara con retraso,
  retroceder para girar).
- `docs/fauna.md`, el coste de los empujes en «Lo que cuesta».

**Ejecutado**: `npm run shots` y `tools/analyze-world.ts`, que la CI no
corre, funcionan; el escaner y su autoprueba; typecheck y 522 tests; las
pasadas `devTools` y `fauna`; tres mutaciones nuevas, las tres caen.

**Dejado a proposito**: las citas al reposo por partes y a su fichero en la
historia (en `ignorar.md`, con su ambito); y el README dice que el jugador mide «dos
bloques», cuando el sprite mide 1,93 y su caja 1,8: es una aproximacion de
antes de esta tanda.

## La fisica de los animales al estilo Minecraft — HECHA (2026-10-14)

El autor probo la fisica por fases (`520f018`; en `docs/historia.md`, «Lo que
dijo el autor al probar las fisicas») y no le satisface.
**Su texto, literal:**

> El comportamiento y físicas generales de los animales no son
> satisfactorios, te nombrare algunas cosas que he notado y quiero arreglar.
>
> 1. Cuando suben un escalón saltando, saltan muy alto, se ve raro, seria
>    mejor que aplicaran una fuerza de salto con respecto a la altura que
>    desean alcanzar y dicha fuerza tenga un máximo dependiendo del animal (que
>    en la mayoría de animales, el máximo seria lo justo para subir 1m).
> 2. En ocasiones, los animales arrastran su cabeza contra las paredes a lo
>    largo de unos pocos metros como si aun no se enteraran que deben salta,
>    luego saltan. algo no se esta calculando bien ahi.
> 3. creo que la cámara suavizada fue solucionar el problema equivocado. en
>    realidad, nunca debimos dejar que el jugador o los animales se
>    teletransportaran al subir un escalón, porque ahora se ve bien la camara
>    para el jugador, pero ver animales subiendo escalones teletransportándose
>    es un poco raro. lo que debíamos hacer es que esas subidas "automáticas"
>    fueran tan rápidas que parecieran seguir caminando, pero en realidad el
>    cuerpo si sube tick a tick, no teletransportado.
> 4. El tema de los atascos de los animales. cuando retroceden, luego empujan
>    hacia adelante y vuelve a retroceder y otra vez a empujar hacia adelante,
>    es como si hicieran movimientos erráticos hasta salir.
> 5. el problema de los animales con cabeza u hocico largo que no pueden subir
>    escaleras. las patas delanteras que serian el primer apoyo de un animal al
>    subir a un escalón, ni siquiera llegan al escalón si el animal tiene una
>    cabeza y cuello que suman >= 1m de largo. no tengo claro como solucionarlo.
> 6. observando minecraft, vi como ellos arreglan lo de los atascos de los
>    animales y lo de subir escalones (1m para ellos). Todas las hitbox de
>    minecraft tienen una base cuadrada, de forma que el animal puede girar 360
>    grados sobre su centro en cualquier momento y asi siempre puede dar media
>    vuelta y salir de cualquier atasco. y ya que todas sus bases son
>    cuadradas, siempre habrá punto de apoyo para el animal por muy pequeña que
>    sea la superficie del escalon.
> 7. para solucionar el punto 4. (los atascos) y 5. (subir escalones), pense en
>    inspirarme en minecraft y tambien hacer la base de la caja de colision de
>    los animales cuadrada (con la altura variable segun el alto del
>    dibujo/lomo del animal), pero con la diferencia que las cajas que se
>    pueden golpear si seran todas las cajas que ya hemos hablado. para esto,
>    me parece que tenemos que tener en cuenta ciertas directrices en el diseño
>    de los modelos, porque la idea de una caja con base cuadrada, es que cubra
>    en gran medida las patas del animal, pero a su vez, la caja no debe sobre
>    salir demasiado del ancho del animal. entonces, esto implica que las patas
>    delanteras y traseras, no pueden estar mucho mas separadas que el ancho del
>    propio animal, para que la base cuadrada las cubra. te dejo capturas de una
>    hitbox de vaca de minecraft para que entiendas de lo que te hablo.
> 8. arreglando las cajas de colision como explico en el punto 7. y aplicando
>    la subida de escalon tick a tick del punto 3., implica que ya los
>    animales, por diseño, no saltaran los escalones <= 0.5m, sino que saltaran
>    alturas > 0.5m (hasta su maximo de salto) y su fuerza de salto sera según
>    el punto 1.
> 9. los animales ahora también colisionaran con otros y con el jugador. me
>    gustaria simular colisiones similares a las de minecraft, que no se
>    sienten rígidas.
> 10. vi que hay animales que por alguna razón, están cayendo por debajo del
>     terreno. creo que esto se debe a la eliminación de colisión de sus cajas
>     durante las caídas. entonces vale la pena hablar aqui de como cambian
>     esas reglas de físicas antes dichas. como ahora las cajas de colision
>     seran un simple cubo rectangular, chocaran por todas sus caras siempre,
>     asi de simple y directo.

**Sus respuestas a lo que se le pregunto (2026-10-14):**
- **Modelos**: rediseñarlos para que la separacion entre patas delanteras y
  traseras sea mas o menos el ancho del cuerpo; la directriz va a la guia de
  arte y el revisa los modelos nuevos con capturas.
- **Caja**: lado de **1,2 × el ancho** del cuerpo y alto **hasta el lomo**; la
  cabeza queda fuera y **se acepta que se vea metida en una pared**, como en
  Minecraft. La caja no gira.
- **Subida**: **0,1 s** el medio bloque, sin dejar de andar, para jugador y
  animales, y **fuera el suavizado de camara del escalon**.
- **Salto**: hasta el escalon **mas 0,1 m**, como mucho **1 m** en todas las
  especies (los maximos especiales, mas adelante). El del jugador no cambia.
- **Empujes**: **segun el tamaño**: el grande aparta mas al pequeño; el jugador
  cuenta como un cuerpo mas.
- **Jugador**: tambien vuelve a chocar **por todas sus caras siempre**: fuera
  el choque por fases y la repulsion.
- **Se quitan** el impulso minimo, el salto para girar y el retroceder para
  girar.

**El plan, por fases**: (1-2) caja cuadrada que choca siempre, salto a medida
y subida tick a tick, juntas a `main`; (3) los empujes; (4) el rediseño de los
modelos, con capturas para el autor. Las deducciones, en `docs/juicio.md`.

**Fases 1 y 2 — HECHAS (2026-10-14).** Cada cuerpo es una caja de base
cuadrada que no gira y choca por todas sus caras siempre (`bodyOf`; la de un
animal, `collisionBoxOf`); el escalon de ≤ 0,5 se sube tick a tick, medio
bloque en 0,1 s (`CLIMB_SPEED`), para el jugador y los animales; un animal
salta lo que mide mas de 0,5 y hasta 1 con la fuerza justa para el escalon
mas 0,1 m, decidido por lo que tiene delante. Fuera las fases, la repulsion,
el impulso, el salto para girar, el retroceder, el reposo por partes y el
suavizado de camara del escalon. Medido en cinco semillas, 2 min: **clavados
del 0,9-8 % al 0,0-0,2 %**, y el tick medio de ~1,2 ms a 0,52 ms. Contado en
`docs/reglas.md` (21), `docs/fauna.md`, `docs/controles.md` y
`docs/relieve.md`.

**Fase 3 — HECHA (2026-10-14).** Los cuerpos —animales y jugador— no se
chocan entre si: se empujan (`pushBodies`, `systems/push.ts`), poco a poco,
hasta 2 m/s en proporcion al solape, repartido por la masa (el volumen de la
caja), y por el choque de andar, sin meter a nadie en una pared ni sacar a un
animal de su bioma. Las deducciones, en `docs/juicio.md`. Medido en cinco
semillas, 2 min: clavados 0,0-0,5 % (sin empujes, 0,0-0,2 %); el empuje
cuesta 0,15 ms por tick con 113 animales, tras ordenarlos a lo largo de x (a
lo bruto, todos los pares, 0,65 ms).

**Fase 4 — HECHA y APROBADA (2026-10-14).** Las ocho especies de cuatro
patas tienen las patas en el cuadrado de su caja: troncos mas cortos (1,5
veces el ancho), patas en el borde del cuadrado, y la liebre, el zorro, el
ciervo y el ibice algo mas anchos. Se le enviaron dos capturas de la galeria
con las cajas (`faunaGallery(true, 100)`), antes y despues, y el autor las
dio por buenas: «aprobados esos diseños». La directriz 4 y como se aplico
estan en `docs/guia-de-arte.md`. Los clavados no cambian: 0,0-0,5 % en cinco
semillas.

**Cerrada con la auditoria del 2026-10-14** (`docs/pendiente.md`, o ya aqui
debajo si vino otra).

## Auditoria al cerrar las fisicas y las pruebas (2026-10-10)

Desde `3415d31` hasta `7e2d790`: los animales que se quedaban clavados, una
caja por objeto, las cajas en el panel, la fase 1 de los voxeles, las tres
fases de fisicas y las pruebas mas rapidas (22 commits).

**Corregido:**
- **Codigo muerto de un modelo sustituido** (escape 26): `bodyBoxes(…,
  feetOnly)` y `footPartsOf` (el apoyo de los animales en sus partes mas
  bajas) ya solo los usaban dos tests desde que `partsRest` mira todas las
  cajas. Fuera, y los tests calculan lo suyo (`lowestOf`, mutado: caen los
  dos).
- **La regla 21 en `docs/reglas.md` contaba a los animales con el modelo de
  antes de la fase B** (la heuristica de escalones y el apoyo en las partes
  mas bajas). Ahora dice lo que hace el juego, como `fauna.md`. Y fuera la
  fila de `docs/juicio.md` que preguntaba por aquel apoyo.
- **`docs/leyes.md` citaba un test que no existia** con ese nombre (escape
  25): «andando se sube como mucho medio bloque por tick» se seguia llamando
  como en tiempos de las rampas. Renombrado, y el escaner tiene una categoria
  que cruza la tabla con los tests.
- **Numeros que no casaban** (escape 27): el resbalon al soltar era 0,26 m en
  `movement.ts` y 0,22 en `reglas.md` y su test (0,26 es la cuenta continua;
  el juego, a 60 Hz, da 0,22). La camara «exactamente 0,1 s por detras» son
  0,092 a 60 Hz.
- **El bloque a dos casillas**: lo acepto el autor; quitada su fila de
  `juicio.md` y el «PENDIENTE DEL AUTOR» del test, y anotado en la regla 21.
- **Lo que el autor ya juzgo, en el documento de su parte**: la camara con
  retraso «injugable» en `docs/controles.md`, y la cabeza que sube primero en
  `docs/fauna.md`, con su *Luego*.
- Restos: «talud» en tres tests y el humo, «rampa» y «niveles» en nombres de
  test y en `fauna.md`; un comentario suelto en `main.ts` (`boxesNear` entre
  la doc de `__verdant` y la sonda); la cabecera de `terrain-mesh.ts`, que
  decia que la usaba `shadow-patches.ts` (se la pasa `main.ts` a
  `buildShadows`).

**Dejado a proposito:**
- Los 18 avisos de terminos retirados, todos en historia.
- **Los animales en el aire no tienen inercia** (lente G): saltan cuando su
  avance se atasca, casi parados, y en el aire van a su paso desde el primer
  tick. El autor pidio arranque y frenada de 0,1 s tambien en el aire; esta
  en «que decides tu», abajo, porque toca la fisica del salto que se va a
  debatir con la cabeza que sube primero.
- `mobile` seguia con el reloj de verdad: quedo fuera de la tanda de pruebas.
  **Hecho el 2026-10-13**: va con el reloj manual (`docs/pruebas.md`).
- **El registro de PC de `desktop` cayo otra vez en la CI de `pruebas`**
  (`54028eb`): la linea murio sin verse moverse (`alive: false`, y 623 -> 0),
  con la pasada a 304 s en un runner lento. Relanzada una vez, paso. Es la
  comprobacion del escape 23, con el reloj de verdad a proposito; si vuelve a
  caer, la salida es medir la deriva en la pagina con el tiempo del juego y
  no con temporizadores del navegador, y no subir el plazo.

**Verificado**: typecheck y los 515 tests en local; el escaner con su
autoprueba (13 categorias); `analyze-world` (0,14/0,76/0,61 pt, como en la
fase 1) y `shots`, que funcionan; y la CI de `pruebas`.

**El alcance, dicho claro**: linea a linea, lo nuevo de fisicas
(`movement.ts`, `boxes.ts`, `body.ts`, y camera-lag.ts, retirado el
2026-10-12), el reloj
(`clock.ts` y el bucle de `main.ts`) y sus documentos; lo demas, con el
escaner, busquedas por lente y las cabeceras. Las comprobaciones de la tanda
ya se mutaron en sus rondas; aqui solo las tocadas.

**Aprendido** (fase 6): escapes 25-27 en la skill, la categoria 13 del
escaner y sus patrones en las lentes A, D y F.

**Que decides tu:**
1. **Inercia de los animales en el aire**: (a) que arranquen el salto con lo
   que llevaban y aceleren en el aire en 0,1 s, como el jugador; (b) dejarlo
   como esta, porque un salto ya es un arranque; (c) decidirlo con lo de la
   cabeza que sube primero.

## Lo que dijo el autor al probar las fisicas — HECHA (2026-10-10 a 2026-10-14)

Hablarlo y hacer el plan. La tanda de fisicas, ya cerrada, esta en
`docs/historia.md` («Fisicas: cajas que chocan siempre…»), con lo que pidio el
autor literal y el modelo de la altura de reposo.

1. **El bloque a dos casillas que ya se alcanza: aceptado.** El autor, literal:
   «no hay problema en que se alcancen más casillas siempre que se respeten las
   leyes físicas». **Hecho en la auditoria del 2026-10-10**: fuera la fila de
   `docs/juicio.md`, el test lo afirma como decision suya y `docs/reglas.md`
   (regla 21) lo cuenta.
2. **Los animales que suben primero la cabeza y luego las patas: se ve mal, hay
   que arreglarlo, y toca debatirlo.** Pasa en los pequenos: el reposo por cajas
   (`partsRest`) sube el cuerpo entero cuando la cabeza toca un borde a menos de
   medio bloque sobre su base. La idea del autor, literal: «cuando los animales
   choquen las paredes primero con algo diferente a sus patas, tengan que saltar
   (no teletransportarse) desde el punto de impacto si quieren subir, esto
   provocaría que su velocidad de movimiento —si no es suficiente para la
   maniobra— deba ser aumentada al mínimo requerido para que pueda saltar un
   escalón o un escalón doble (1m) (para los animales más altos) desde el punto
   donde golpea su cabeza». Preguntas a llevar: que cuenta como «chocar con algo
   que no son las patas» (cabeza, cuello, tronco, cola); si el impulso minimo
   rompe «saltan a su paso» (decision suya del mismo dia) o es la excepcion; que
   animales llegan a 1 m; y si las patas siguen subiendo medio bloque de golpe.

   **HECHO (2026-10-13)**, con lo que pidio el autor ese dia: el animal cuyas
   patas no serian lo primero en tocar un escalon de 0,5 o 1 salta antes de
   tocarlo, con el **impulso horizontal minimo** para que sus patas delanteras
   lleguen arriba (constante todo el vuelo, sumado a lo que anda en el aire); y
   **el choque va por fases**, para animales y jugador: subiendo y en
   horizontal, todas las cajas; bajando, solo la base, y lo demas lo saca la
   **repulsion** (4 m/s, en horizontal, gana al mando). Al medirlo aparecio que
   en las laderas de escalones un animal de cabeza baja no podia dar media
   vuelta; el autor eligio **saltar para girar** («luego me explicas bien y lo
   ajustamos»: **pendiente de explicarselo**). Esta en `docs/reglas.md` (21) y
   `docs/fauna.md`; las deducciones, en `docs/juicio.md`.

   **SUSTITUIDO (2026-10-14)** por la fisica de Minecraft: una caja cuadrada
   que no gira y choca siempre por todas sus caras, el salto a medida y la
   subida tick a tick. Fuera las fases, la repulsion, el impulso minimo y el
   salto para girar (que asi no hizo falta explicar mas que en el chat).
3. **La camara con retraso no sirve: «no ayudo en nada, incluso en primera
   persona genera tirones raros, es injugable asi».** Pide un metodo de suavizado
   de verdad, y deja la recomendacion al agente (sugiere, sin cerrarlo, inercia
   en la camara). Sospechas a comprobar antes de proponer, por orden:
   - **No hay interpolacion para el render** (regla 8 dice que es cosa del
     cliente, y `main.ts` dibuja la `x/y/z` del ultimo tick): a una frecuencia de
     pantalla que no es 60 Hz unos fotogramas avanzan dos ticks y otros cero, y
     una persecucion sobre un blanco a saltos da tirones. Probablemente el
     tiron de fondo, con o sin retraso.
   - **Mirar al punto de mira desde unos ojos desplazados** hace que la
     direccion de la camara salte cuando el rayo pasa de algo cercano a algo
     lejano (un tronco, el suelo del fondo): en primera persona, con los ojos
     medio bloque por debajo tras un escalon, eso es un cabeceo brusco al girar.
   - El retraso en horizontal sobra: lo que el autor pidio suavizar es el
     escalon, que es vertical.
   Recomendacion a llevar (deduccion mia, no aprobada): quitar el retraso
   general y hacer lo que hacen los juegos de primera persona con las
   escaleras —**suavizar solo el salto vertical de subir un escalon** (un
   desfase que nace al subir de golpe y se apaga en ~0,1 s, la camara mirando
   en la direccion de la mirada, sin punto de mira)— mas **interpolar el render
   entre ticks**. La inercia de camara no la recomendaria: anade latencia a la
   mirada, que es la que apunta el golpe.

   **HECHO (2026-10-12)**: el autor eligio esa recomendacion, «escalon +
   interpolar». Fuera el retraso y el punto de mira (camera-lag.ts); el
   jugador y la fauna se dibujan interpolados entre ticks, y la camara sube el
   escalon en 0,1 s con un muelle (`smooth.ts`, `docs/controles.md`). Las
   deducciones —la curva, lo que cuenta como escalon, el salto a 8—, en
   `docs/juicio.md`. **El autor lo probo y lo da por bueno** (2026-10-12):
   «se siente mucho la mejoria de la camara al subir escalones. Con 0,1 s se
   notan los escalones sin ser incomodos, ya pasados los 0,2 s casi se pierde
   el "jalon" del escalon, asi que considero adecuado mantenerlo en 0,1 s».
   Y la vista «de cerca» de `slash` vuelve a tener puerta, como pidio
   (`docs/pruebas.md`). Por el camino, `relief` dio una
   vez 0,64 al correr en vez de 8,32 con el reloj manual, sin repetirse: el
   humo dice ahora si el juego se puso en pausa por medio.

   **El suavizado del escalon, SUSTITUIDO (2026-10-14)**: el autor vio que
   solucionaba «el problema equivocado»; ahora el cuerpo sube el escalon tick
   a tick en 0,1 s y la camara lo sigue tal cual. La interpolacion se queda.

## Pruebas mas rapidas — HECHA (2026-10-10)

Pedido del autor, literal: «Cómo podemos hacer para que las pruebas las hagas
más rápido […] con tal de ahorrarnos esas horas que llega a tomar el proceso de
pruebas posterior a cada tanda de cambios». Aprobo el plan de tres fases.

**Lo medido.**
- La CI paso de ~5 minutos (4-5 oct) a ~15. El camino critico era una sola
  casilla, `slash`, con 845-900 s; todas las demas, por debajo de 340 s. Sus
  mutaciones tardaban ~1.000 s cada una.
- El 10-oct hubo 4 rondas en `pruebas` en 3 h 20 min, y tres salieron en rojo,
  varias por depender de la velocidad de la maquina.
- Sin GPU, Chromium dibuja por software: ~5 FPS a 1280x720 en el contenedor y
  1,4 s por captura. Ninguna opcion de arranque de Chromium lo mejora. Un tick
  de la simulacion cuesta 1,7 ms.

**Las fases.**
1. **`slash` partido en cinco casillas**, una por parte (`docs/pruebas.md`).
   **Hecha y en `main`** (`6bab86a`). En la CI de `pruebas`: CI 11 min,
   mutaciones 7 min 42 s (antes ~15 y ~18). Por el camino se vio que el
   recorte por frustum no lo caza la vista normal (`docs/juicio.md`).
2. **`tools/esperar-ci.sh`**: espera a la CI con `gh api` y no con un
   temporizador fijo. **Hecha y en `main`**.
3. **Reloj de pruebas** (`?reloj=manual`, `clock.ts`, `window.__reloj`;
   `docs/pruebas.md`, «El reloj manual»). **Hecho y en `main`** (`7e2d790`,
   CI de `main` en verde):
   - Migradas: `life`, `relief`, `fauna`, `devTools`, `stations`,
     `resources`, `highRefresh` (`hz` 144) y `slash`, con capturas recortadas.
     Todas dan lo mismo en dos corridas, salvo un contador de `fauna`.
   - Las mutaciones de la ronda caen todas, en local y en la CI.
   - **En la CI de `pruebas`** (`30ca220`): CI **6 min 45 s** y mutaciones
     **2 min 01 s**, frente a ~15 y ~18 al empezar la tanda. Cada parte de
     `slash` tarda 54-98 s, y las pasadas migradas 33-67 s. El camino critico
     ya son las tres con el reloj de verdad: `gestures` 394 s, `desktop` 241 y
     `mobile` 230.
   - **Queda fuera**: `mobile`, por sus toques sostenidos con temporizadores
     del navegador. `desktop` y `gestures` siguen con el reloj de verdad a
     proposito.

   **Decisiones por defecto, del agente y sin aprobar**: frames a 60 Hz con el
   reloj manual, y una comprobacion que dé otro numero no se reajusta en
   silencio, sino que se dice con los dos valores y va a `docs/juicio.md`.
   Alli estan los numeros nuevos de `slash` y la vista «de cerca» que no se
   acerca.

## Fisicas: cajas que chocan siempre, gravedad, inercia, camara — HECHA (2026-10-10)

*Luego*: la camara con retraso de la fase C se retiro el 2026-10-12, y el
reposo de un animal por sus partes, el 2026-10-14, por una caja cuadrada
(`docs/reglas.md`, regla 21).

Cerrada con la auditoria del 2026-10-10 (`docs/pendiente.md`). Lo que dijo
el autor al probarla es la tanda siguiente, en `pendiente.md`. La de pruebas
se metio delante por pedido suyo.

**Empieza aqui.** Es tambien la fase 2 de los voxeles (abajo). El autor, literal
(2026-10-10):

1. «las entidades y el jugador solo bajan de escalón cuando al caer ninguna de
   sus cajas choca con algo. lo mismo se aplica para subir. es decir, todas las
   cajas chocan con el terreno en todo momento.»
2. «las entidades deben saltar para subir un escalón de mas de 0.5. usando las
   mismas físicas que el jugador (moverse para desplazarse en el aire y poder
   subir porque el mero salto solo aplica impulso vertical). creo que aquí se
   puede aplicar el sistema de salto automático pero para los animales.»
3. «solo al subir escalones ≤ 0.5 se permite teletransportar a la entidad o el
   jugador. lo que en la practica, será simplemente como seguir caminando.»
4. «ahora para cualquier entidad y jugador, debe haber una desaceleración al
   cambiar la dirección del movimiento, ya sea caminando, corriendo o en el
   aire (cayendo o saltando). Esta desaceleración también aplica al dejar se
   avanzar, no se parara el instante, sino que tendrá ese pequeño instante de
   desplazamiento en la dirección que llevaba (debe ser pequeño, como 0.1s,
   pero escucho tus sugerencias para este detalle).»
5. «en todo momento, la cámara debe tener un suavizado/retraso de 0.1s al
   perseguir al jugador en todas las vistas. (es un tiempo ajustable que
   juzgare cuando lo pruebe).»

Y sus respuestas a las preguntas:
- Inercia: **arranque y frenada en 0,1 s**, a ritmo constante.
- Camara, literal: «el retraso igual en todas las vistas y direcciones, el
  centro de la pantalla sigue siendo el punto hacia donde mira y apunta el
  personaje sin importar la ubicación del personaje.»
- Saltar mientras se cae medio bloque: **sin margen**.
- Animales en el aire: **como el jugador, a su paso**; saltan justo antes de
  chocar si llegan arriba, y si no, rodean.

**El plan, en tres fases, cada una a `main` con su CI:** A, el jugador (el
terreno con la huella entera, sin `SNAP_DOWN`, techos, inercia); B, los animales
(el reposo por cajas, auto salto a su paso, inercia); C, la camara (retraso
exponencial ajustable en el panel, y mirando al punto de mira). **El modelo
comun, deduccion mia: la altura de reposo** de un cuerpo es el maximo, sobre
cada caja, de lo mas alto bajo su huella menos lo que esa caja esta por encima
de los pies; andando se sube de golpe hasta `STEP_UP`, por debajo se cae con
gravedad, y en el aire no se entra donde el reposo pasa de los pies.

**Estado:** A y B hechas y **fueron juntas a `main`**: la CI de A cayo en tres
pasadas del humo, y cuando estuvieron arregladas B ya estaba en el arbol. Lo
que ensenaron: `stations` (la deriva al empujar arboles metia la huella en el
pasillo de la mesa y el horno: orden de teclas), `fauna` (una presa parada
puede estar atascada lejos de su punto de paso, y al recargar aparece en el:
se exige `atWaypoint`), y `slash` (ver `docs/pruebas.md`: la vista normal
cuenta solo rumbos con la camara libre). **C, hecha**: la camara persigue los
ojos con retraso exponencial de 0,1 s en las tres vistas y mira al punto de
mira (`docs/controles.md`), con un deslizador en el panel de desarrollo. Las
tres fueron a `main` juntas, verificadas en la misma CI; por el camino `slash`
pidio medir en un claro y la camara baja en cuatro rumbos (`docs/pruebas.md`). La
`/auditoria` la cerro el mismo dia.

## Una caja por objeto, con alto, y las patas con caja — HECHO (2026-10-05)

*Luego*: desde el 2026-10-14 un animal ya no choca con sus partes sino con una
caja cuadrada; sus partes `hit` solo se golpean. La caja por objeto sigue.

Al ver las cajas en el panel, el autor afino las reglas:

> En plantas, rocas y futuros recursos. La caja de daño y colisión será mixta,
> ajustada al área general de objeto y no cubriendo necesariamente toda la
> casilla que lo contiene, además, la altura también debe estar definida,
> pudiendo así el jugador o animales subirse a, por ejemplo, una roca o el
> tronco de un árbol.
>
> En animales, todas las partes principales de un animal deben tener cajas de
> colisión y daño, entiéndase partes importantes por: cabeza, cuello,
> extremidades y tronco. Aún se dejarán por fuera las partes pequeñas o
> delgadas como: cuernos, antenas, colas cortas, alas recogidas.
>
> Estas consideraciones pueden variar y afinarse según el animal o elemento,
> así que siempre que se tenga duda, se deberá debatir.

Y sus respuestas a mis preguntas:
- el arbusto, los guijarros y el brote **no chocan**;
- **se apoya y se choca con la huella entera**, tambien contra las estaciones;
- las **pinzas** del cangrejo si; las **patas de la gaviota y del cangrejo**,
  no;
- el resto de partes, como estaban, mas las patas.

Lo que se hizo:
- **`sim/boxes.ts`**, modulo nuevo: la caja de cada objeto (`featureBox`, lo
  que era `hitboxAt`), `solidBoxAt` para lo que choca (`blocksBody`, que
  sustituye a `isFeatureSolid`), y lo que pisa un cuerpo: `squareFloor` (el
  terreno en el centro y el techo de las cajas que tocan la huella) y
  `footing`. Vive fuera de `systems/` para no abrir ciclos de importacion.
- **La regla 21 no cambia de enunciado**: no se entra donde el suelo esta por
  encima de los pies; el suelo es ahora el terreno mas esas cajas. El choque de
  casilla entera de arboles y roca y la estacion medida por el centro se
  retiraron, y `World.floorHeightAt` con ellos.
- **Las patas** (`legs()`) y las **pinzas** pasan a `hit`. Los animales
  chocan con las cajas por sus partes y saltan a una roca de 1,0
  (`ANIMAL_JUMP_UP`).

Medido:
- **Entre dos troncos de tundra vecinos se pasa** (hueco de ~0,78, mas que el
  cuerpo, 0,68); entre los de bosque o pradera, no.
- **Animales clavados**, el primer minuto de tres semillas: 6,9 → 3,6 %,
  5,0 → 2,0 % y 0,04 → 0,13 %; los pequeños, 0,04 → 0,02 %, 0,26 → 0,64 % y
  0,01 → 0,09 %. Los troncos ya no ocupan la casilla.
- **El tick medio**: 0,46 → ~0,75 ms (cuatro cajas mas por animal y las cajas
  de los objetos), muy por debajo de los 8 ms. Una ronda de consultas por
  animal y tick, compartida por su andar y su vertical, lo bajo de ~0,83.
- **`tools/analyze-world.ts`**: identico a antes, porque las medidas por
  casilla no cambiaron (ver «Esperando tu juicio»).

Deducciones mias, en «Esperando tu juicio»: el apoyo de los animales, la caja
que asoma por encima de los pies, las medidas por casilla y las medidas de la
roca. Colocar una estacion encima de la propia huella ya estaba prohibido
(`placeTarget`).

## Fauna: lo que estorba no los deja clavados — HECHO (2026-10-05)

*Luego*: el retroceder para girar se retiro el 2026-10-14, con la caja
cuadrada que gira en cualquier sitio; los rodeos y el saltar siguen. Clavados
hoy, 0,0-0,5 % (`docs/fauna.md`).

Viste que los animales se paraban al topar con algo, incluso de frente, y no
salian. Pasaban clavados el **25-53 % del tiempo** (2 min, cinco semillas): iban
en linea recta a su punto de paso y, pegados de frente, ningun giro les cabia.
Elegiste: **retroceder y girar**, **todos saltan un bloque** y **lo demas se
bordea**. Contado entero en `docs/fauna.md`, «Lo que estorba no los deja
clavados».

- El salto y cada rodeo **se ensayan** con las mismas funciones que los
  mueven, y solo se hace lo que en el ensayo sale. Suponer que un rumbo servia
  fallaba: casi todos los que se rendian habian elegido un rodeo cuyo giro no
  cabia ni retrocediendo.
- **Me aparte del plan en una cosa**: el avance en el aire. A 5,2 bloques por
  segundo el bisonte adulto no subia un escalon (topa con la cabeza con los
  pies a 1,7 del borde); avanza lo justo para pasar el borde en lo alto del
  salto. Esta en «Esperando tu juicio».
- Despues: **0,1-11 % del tiempo**; liebre, zorro, cangrejo, gaviota y reno
  0-4 %, la marmota hasta 12 % en una semilla. Quedan los cuerpos grandes en
  sitios estrechos, tambien en «Esperando tu juicio».
- El tick medio no cambia (0,26 ms).

## Auditoria al cerrar la fauna y los equipables (2026-10-04)

Desde `8396b7f` hasta `3415d31`: la primera tanda de fauna (que se cerro sin
auditar), la guia de arte y los equipables con sus iconos.

**Corregido:**
- **El humo `desktop` media el registro de PC con un plazo fijo de 400 ms** y
  cayo una vez en la CI de `main` (escape 23). Ahora espera hasta que la linea
  se mueva, con tope dentro de su vida, y una mutacion la ve caer.
- **`slash` fallo una vez con 16 pixeles en la vista normal** (suelo 20). La
  sospecha es un animal paseando por delante del barrido; **la causa no esta
  confirmada**. Ahora mide con `?fauna=0`, que quita solo el dibujo de los
  animales (escape 24). Si vuelve a caer, la causa era otra.
- **Dos cabeceras seguian contando a los animales como laminas**
  (`sprite-depth.ts`, `body-ray.ts`), aunque son de bloques desde `a1168a7`
  (escape 22). El escaner tiene una categoria nueva que lo habria visto.
- Un comentario CSS huerfano de la regla `.slot .hint`, que se quito con los
  iconos.
- El README no contaba los equipables ni las armas, y `stations.test.ts` y el
  humo seguian hablando de la ropa como antes.
- El campo `wornWear` de la sonda `__verdant`, que no leia nadie.

**Dejado a proposito:**
- Los 18 avisos de terminos retirados, todos en secciones de historia.
- `state.lastBroke`: el cliente no lo pinta (no hay avisos en pantalla), pero
  lo leen los tests, como `lastBlocked`.

**El alcance, dicho claro**: la fauna se audito con el escaner, buscando
restos de los modelos sustituidos y releyendo las cabeceras de lo que esos
modelos usaban. Sus comprobaciones ya se mutaron en sus rondas. Los
equipables, ademas, linea a linea.

## Auditoria al cerrar la tanda 2 (2026-10-02)

A peticion tuya, de `912c3d7` a `8396b7f`. No aparecio ningun fallo del juego;
si restos de cosas que cambiaron por el camino y una comprobacion que afirmaba
de mas:

- **El alcance de 2,5 seguia escrito en cinco comentarios** (el golpe, el
  barrido, un test y dos del humo) y en una fila de «Esperando tu juicio»,
  con el alcance ya en 3. Nadie lo buscaba: el valor viejo no se anadio a la
  lista de retirados al cambiarlo. Desde ahora se anade en el mismo cambio.
- **Diez comentarios de documentacion sueltos**, colgando encima de otro: el
  de `lookZ` quedo encima de `lookRoll` al meter el giro del TAP, el de
  `rollFor` encima de `tiltOf`, y uno de la sonda seguia diciendo que la
  reticula marca lo que el golpe alcanza, que quitaste el 2026-09-30. Otro
  decia que el ojo era «el unico control sin tecla anunciada», y desde la
  7.ª ronda todos la llevan. El escaner los busca ya solo.
- **Un test afirmaba de mas**: «entre dos rayos no cabe ni el tronco mas
  fino» comparaba con el grosor medio de la picea negra (0,22), no con el de
  la mas baja (0,21). Ahora lo saca de las especies, y se vio caer.
- **Restos de texto**: el hambre «en un dia» en un test (son dos); las
  recetas de estacion «a menos de 3 casillas» en un test y en el humo (es el
  alcance, de los ojos a su caja); un comentario del nucleo que hablaba del
  cursor apuntando, del isometrico; el README decia que USAR del movil solo
  come y siembra; el anillo, que era solo de PC.
- **Una fila de «Esperando tu juicio» que ya no existe**: «los 3 de la
  estacion se miden del centro del jugador al centro de su casilla». Lo
  sustituyo tu decision del 2026-10-01 (de los ojos a su caja, al alcance).

Se ejecuto lo que la CI no corre: `npm run shots` y `analyze-world`
funcionan; el relieve cuesta 0,61 puntos sobre la linea base, dentro del
presupuesto.

Se dejo a proposito:
- `lastBlocked`, `lastBroke` y `lastCrafted`, como en la auditoria anterior.
- El tronco que se golpea es una caja del grosor del pie, y el que se ve
  **estrecha hacia la copa**: a media altura, la picea negra se dibuja de 0,16
  y su caja mide 0,21. Es anterior a la tanda y es tuyo decidir si importa.
- En el modo TAP, dos toques en dos ticks seguidos darian el ataque del
  primero con la mirada del segundo. Un dedo no puede hacerlo en 17 ms.

---

## Auditoria antes de la tanda 2 (2026-09-29)

A peticion tuya, antes de la tanda 2. No aparecio ningun fallo del juego; si
restos de modelos ya sustituidos y tres comprobaciones rotas:

- **Tres comprobaciones que no median lo que decian:**
  - El humo daba por bueno un golpe solo hasta **2 bloques**: con el alcance
    en 2,5, un golpe legitimo a 2,3 lo habria hecho fallar.
  - El humo afirmaba que en PC **no** se ve `#thumbPad`, pero el contenedor
    mide 0x0 desde que cada boton va fijado por su cuenta: esa comprobacion no
    podia fallar. Ahora mira los cuatro botones.
  - La hermana del mismo fallo: `npm run slash` miraba `#thumbPad` para saber
    si el toque revelaba los botones, y como nunca «se veia», abortaba.
- **`npm run shots` no funcionaba**: era de antes del cursor capturado, y su
  primer arrastre capturaba el cursor. Ahora abre con el panel de desarrollo.
  Ni `shots` ni `slash` corren en CI, por eso nadie lo vio.
- **Restos de texto**:
  - el cono, la «segunda altura» y las «tres casillas» en comentarios;
  - la doc de `aimZ` citaba `levelStep`, que ya no existe;
  - la rueda como zoom, en nombres de variable y comentarios;
  - «el inventario no suelta el cursor»;
  - `CLAUDE.md`, `README.md`, `docs/leyes.md` («el relieve no existe») y
    `docs/isometrico.md`;
  - aqui, filas de «Esperando tu juicio» de cosas que ya no existen, y notas
    «*Luego*» en las secciones cuya historia cambio despues.
- **Una regla CSS duplicada** (`#invPanel h2` pisaba a `.invPage h2`), fundida
  en una con el mismo aspecto.

Se dejo a proposito:
- `lastBlocked`, `lastBroke` y `lastCrafted`: son resultado del nucleo y los
  usan los tests, aunque nadie los pinte.
- `main.ts`: es largo, pero lineal.

`npm run gestures` entro en la CI despues, a peticion tuya.

**Y de aqui salio la skill `auditoria`** (`.claude/skills/auditoria/`). Al
estrenarse, su escaner encontro cuatro restos mas que esta auditoria manual no
vio:
- `CLAUDE.md` citaba `regrowTicksOf`, que no existe;
- un comentario de `main.ts` citaba una constante que no existe;
- un test situaba la zona muerta en un fichero del isometrico;
- `slash` razonaba con las «tres casillas».

Estan en su registro de escapes.

---

## El estado del repositorio, revisado el 2026-09-23

Auditoría a petición tuya. Lo que salió, para que no haya que volver a buscarlo:

**El proyecto vivió entero en una sola rama.** `claude/capabilities-workflow-confirmation-mgqdm5`,
que era además la rama por defecto porque era la única, y **nunca ha habido un
PR**. Cuarenta y tantos commits bajo un nombre que es andamiaje de la
herramienta. Decidiste mudarte a `main`, y se creó **en el mismo commit**, así
que no hay historia migrada ni nada que pueda diverger.

**Hecho.** El repo tiene una sola rama, `main`, que es la de por defecto y la
que despliega a Pages. Verificado contra el remoto el 2026-09-23. El primer
despliegue desde `main` falló igual que antes del cambio, y eso corrigió un
diagnóstico del agente:

- Lo que se había escrito —«Pages solo acepta despliegues de la rama por
  defecto»— **era falso**. Quien decide es el **entorno `github-pages`**, con una
  lista de ramas permitidas que se fijó al configurar Pages y que **no sigue a la
  rama por defecto**. El agente no pudo leer esa lista —el proxy de la sesión
  bloquea esa parte de la API—, así que al principio era solo la explicación que
  cuadraba con los dos fallos. **Quedó confirmada** cuando añadiste `main` a la
  lista: el despliegue relanzado desde `main` salió en verde a la primera, sin
  cambiar una línea más.
- El guardia que se metió en `deploy.yml` se basaba en esa creencia falsa y **se
  quitó**: era una segunda compuerta con otra regla, y habría dejado sin
  desplegar a la única rama que el entorno aceptaba.

**La rama vieja la borraste tú desde la web**, porque el proxy de la sesión del
agente rechaza borrar ramas (HTTP 403) y un 403 del proxy no se reintenta ni se
esquiva. No se perdió nada: antes de borrarla se comprobó que su último commit,
`c9c1518`, era antecesor de `main` y que no aportaba ningún commit propio. Si
alguna vez hiciera falta, se recrea desde ese commit.

Lo que costó por el camino, para que no se repita: con las dos ramas disparando
a la vez, el push de la auditoría no publicó nada porque el grupo de
concurrencia canceló a la única que podía. Y al meter el guardia el agente rompió
el YAML sin mirarlo antes de empujar: un workflow es el único fichero del repo
que no cubren ni el typecheck, ni los tests, ni el humo. Desde entonces se valida
con un parser de YAML de verdad antes de cada push.

**Restos que se retiraron en la misma tanda:**

- 13 PNG rastreados bajo `screenshots/`, que el propio `.gitignore` ignoraba. Se
  ensuciaban en cada `npm run smoke` —hubo que descartarlos tres veces— y encima
  eran del isométrico, anteriores al 3D. Ya no se rastrean; siguen generándose en
  disco y CI los sigue subiendo como artefacto de cada ejecución, que es donde de
  verdad se miran.
- La cabecera del cliente 3D seguía diciendo «spike de usar y tirar; si esto no
  convence se borra la carpeta». Era el texto más desactualizado del repo.
- `CLAUDE.md` citaba un sim/life.ts que no existe (sin comillas a propósito: no
  es una ruta del repo). La aritmética del crecimiento
  vive en `sim/world.ts` (`lifeStep`) con sus constantes en `shared/ecology.ts`.

**Lo que se revisó y estaba limpio**, para no repetir el trabajo: no hay ni un
`TODO`, `FIXME`, `HACK` ni `@ts-ignore` en todo el código; no quedó ninguna
herramienta de usar y tirar de las que el agente fue creando; `docs/leyes.md`
está mantenido; y de todos los ficheros citados en `CLAUDE.md`, `README.md` y
`docs/*.md` solo uno no existía —el de arriba—.

---

## Las features ya son aspas — y lo que queda por ahí

Hecho lo que pediste: cada elemento son dos láminas cruzadas y el jugador sigue
mirando a la cámara, como elegiste. Las proporciones no se movieron ni un
decimal (1,93 / 3,17 / 1,17 / 0,88 / 1,09), que era el listón.

Lo que el aspa arregla está afirmado con un número y no con una captura: **la
silueta nunca baja de `cos 45º`** del ancho, mire la cámara desde donde mire, y
el mismo test mide media aspa para verla dar **cero** en dos rumbos. Ése era el
defecto que anticipaste.

Tres cosas que decidí yo y puedes corregir:

- **Cada aspa lleva un cuarto de vuelta propio**, sacado de la semilla, para que
  el bosque no se vea alineado a la rejilla. Sin giro queda más ordenado y más
  parecido a Minecraft; es un número.
- **La sombra tumbada** mide el 62 % del ancho del elemento y va al 26-42 % de
  negro. Es lo que las asienta; si la quieres más marcada o más sutil, son dos
  números en `shadows.ts`.
- **El material no se ilumina** (`MeshBasicMaterial`), para que el aspecto sea
  exactamente el de antes. Si prefieres que el sol afecte a los árboles, se
  cambia a Lambert — pero entonces las dos láminas de una misma aspa se iluminan
  distinto, que es feo, y habría que repensar el arte.

Y lo que conviene mirar: **una roca vista desde arriba se lee como dos cartas
cruzadas**, porque no tiene la simetría radial que tiene un árbol. Si te chirría,
la salida no es volver al billboard sino darles un modelo de verdad: son pocas
formas y son inertes.

**Lo siguiente natural por aquí, que ya estaba en tu lista de la migración:
agrupar las aspas por (chunk, especie) en `InstancedMesh`.** Hoy el mundo cuesta
~725 draw calls y casi todas son una por elemento; esta ronda no las subió, pero
tampoco las bajó.

---

## Proporciones nuevas — y una consecuencia que tienes que mirar tú

Hecho lo que pediste, y las medidas salen justo en tu enunciado: **jugador 1,93
bloques** («poco menos que 2») y **árbol 3,17** («poco más de 3»). Sube todo lo
que se apoya en el suelo con el mismo factor, así que las proporciones entre unas
cosas y otras son exactamente las de antes.

Dos números salieron mejor de lo que te dije en el plan, porque allí los estimé
del lienzo y luego los medí del dibujo: el **brote queda en 0,88** —por debajo de
la cintura, no casi tan alto como tú— y la **roca en 1,09**. La pega que te
señalé sobre los brotes desaparece sola.

**Lo que sí tienes que mirar: el relieve se lee menos de la mitad de alto.** Una
pared de un bloque pasa de llegarte al pecho a llegarte a la rodilla, y una cima
de 27 niveles de medir 34 personajes a medir 14. La física no cambia ni un
decimal —el salto sigue en 1,16 y `STEP_UP` en 0,5, que es casi exactamente
Minecraft—, pero **los 16 px por nivel los calibraste a ojo** y esto toca justo lo
que mirabas entonces. Si ahora el mundo te parece plano, la palanca no es el
tamaño de los sprites sino la ganancia de cordillera (regla 14), midiendo antes.

Y dos deducciones mías, corregibles: **`EYE = 1.6`** para la cámara (1.2 le
quedaba por las rodillas al personaje nuevo; conservar la proporción de antes
daría 2,8, que me pareció demasiado alto), y que **los árboles de 3,2 bloques
tapan bastante más** con la cámara baja — que es justo la oclusión de cámara que
sigue pendiente de la migración.

---

## El barrido del 3D, arreglado — y lo que queda de tu juicio

El barrido «no salia completo y se desvanecia casi de inmediato». **No era la
duracion ni la curva**: `SLASH_SECONDS = 0.22`, el barrido `t * 1.6` y el apagado
`(1 - t) * 0.85` son los tuyos y los del isometrico, y estan intactos. Eran tres
fallos de dibujado, cada uno confirmado reintroduciendolo y viendo caer la medida
(`npm run slash`, que cuenta pixeles de pantalla y no barridos lanzados):

| Fallo | Con el fallo | Arreglado |
|---|---|---|
| La esfera envolvente se congelaba donde diste el **primer** golpe de la partida, asi que al alejarte se recortaba todo | 80 mandados, **0 pixeles** | 103 |
| La prueba de profundidad dejaba que lo tapara lo que hubiera entre la camara y el arco | 2 pixeles | 104 |
| La cinta iba tumbada en el suelo y se veia de canto segun el rumbo | 13 pixeles | 104 |

Aviso honesto: **no pude ver tu video** —es H.264 y este contenedor no lleva
codecs propietarios—, asi que el diagnostico sale de leer el codigo contra su
original isometrico. Encaja con lo que describiste, pero si algo no cuadra con lo
que viste, dilo.

Y una cosa que decidi yo y puedes corregir: **el grosor**. El isometrico traza 3
px con la casilla a 32, o sea 0.094 casillas de ancho de mundo; aqui lo puse en
0.12 porque PixiJS suavizaba el trazo y el lienzo de three.js va sin antialias, y
a 2,6 px un quad sin suavizar se deshilacha. Si lo quieres mas gordo o mas fino
es un numero, y es de sensacion, o sea tuyo.

---

## Decision tomada: el juego pasa a 3D con estetica de sprites

**El 2026-09-12 el isometrico se congelo, y el 2026-09-26 se retiro del
todo** (ver «El isometrico se retira», abajo). Esta seccion es la historia de
por que se giro.

El autor probo un prototipo de 3D y **decidio girar**. Motivo, medido y no opinado: en una isometrica de angulo fijo
la informacion para entender el relieve **no esta en la imagen** —subir un nivel
equivale exactamente a retroceder dos filas, y el pie de un escalon queda siempre
tapado; las dos identidades las fijaba `tests/projection.test.ts`, hoy en la
historia (`b1d0d7a`)—. Wakfu lo
resuelve en diseno de nivel poniendo la altura en los bordes del mapa; en un
sandbox procedural eso no esta disponible.

Elecciones suyas:

- **Perspectiva**, no ortografica, para el juego final.
- **Billboards planos valen por ahora.** Los sprites de 4-8 direcciones se
  abordaran en la tanda de estetica.
- Confirmado en su telefono: **80+ FPS**, iguales en las dos proyecciones.

Lo que hace el giro asumible, y conviene no romperlo: `packages/sim` y
`packages/shared` **no se tocan** —mundo, relieve, biomas, ecologia, apuntado,
recoleccion y reloj entran intactos—, porque `sim` nunca supo que existia una
camara. Y `groundHeight(level, rampDir, fx, fy)` ya devuelve la altura continua de
cualquier punto de una casilla: eso ya es la descripcion de una malla.

### Lo que la migracion tenia que resolver

1. ~~**El terreno tapa al jugador** cuando la camara queda detras de una loma.~~
   **Hecho el 2026-09-28** con colision de camara (`camera-collision.ts`): se
   para antes del terreno y de los troncos.
2. **El personaje de frente y de espaldas**: un billboard plano se lee bien en un
   arbol y regular en un humanoide.
3. **Agrupar los sprites.** Entre 100 y 300 draw calls segun el angulo, casi todos
   arboles sueltos. A 80 FPS no bloquea, pero es la primera optimizacion.
4. ~~Que se retira del isometrico.~~ **Hecho el 2026-09-26**: se retiro entero
   (ver «El isometrico se retira»). Los puntos 2 y 3 siguen abiertos.

---

## Ajustes del inventario, en tres rondas — HECHO (2026-09-29)

Probaste el inventario de los bocetos y pediste ajustes en tres rondas. Lo que
quedo:

**Pantalla del movil**
- CORRER y SALTAR al borde derecho del ATAQUE; USAR a su borde de abajo.
- OTROS despliega en columna debajo de el.
- La barra de la mano, en el centro exacto de arriba.
- **Solo iconos**, sin rotulos; el del ataque, redibujado en la tercera ronda.
- USAR y SALTAR se encienden al tocarlos.

**Panel del inventario**
- Pestanas **Personaje | Inventario | Recetas** en lugar de las flechas, con
  el contenido pegado a ellas.
- Fijos: las pestanas, la zona de lo seleccionado (centrada abajo) y las
  categorias de recetas. Solo se deslizan la rejilla y la lista de recetas.
- **PERSONAJE** con tu segundo boceto (tres a cada lado, cuatro abajo), en PC
  y en el movil, con su zona de descripcion encajada con la de INVENTARIO.
- La descripcion se limpia al tocar una casilla vacia, y al abrir no hay
  nada seleccionado.

**Fabricar y mover**
- Fabricar en **1,5 s**, con la carga hasta el borde de los ingredientes.
- Arrastrar entre la rejilla y la barra con el inventario abierto, y dentro
  de la barra con el cerrado.
- Tirar pide confirmacion; desde la barra cerrada, soltar al vacio no tira.
- **Ningun aviso en pantalla.** Fabricar sin sitio queda para la tanda de
  objetos que se tiran al suelo.
- **Registro de objetos** «+5 Madera / -1 Bayas»: bajo INVENTARIO en el movil,
  abajo a la derecha en PC (tu eleccion), maximo cinco lineas.

**Mandos y vista**
- Alcance del golpe y de sembrar: **2,5**.
- **8 esquirlas** por golpe.
- Angulo de la primera persona de **70 a 120**, 70 por defecto (lo guardado
  por debajo de 70 se lee como 70).
- Sostener el ojo **0,5 s** abre la barra del angulo (era 1 s). De paso
  desaparece el tramo muerto: de 0,5 a 1 s Chrome ya no mandaba el toque.
- PC: la **rueda recorre la barra de la mano** y el zoom queda con + y -.
- PC: **Esc cierra el inventario** sin pausar. En pausa, **solo el clic
  reanuda** (tu eleccion: Chrome no deja volver a capturar con Esc).
- **Cruz en el centro** de la pantalla, en todas las vistas.

Lo comprueban:
- los tests del golpe (2,4 cae, 2,8 no; sembrar a 2,24 si, a 2,69 no), los del
  angulo y los del registro (`tests/pickup-feed.test.ts`);
- el humo: alineaciones medidas, pestanas, iconos, confirmar, de la rejilla a
  la barra, 1,5 s, la rueda, Esc, la cruz, la descripcion y el registro;
- los gestos con toques de verdad: la barra cerrada, de la rejilla a la barra,
  receta 1,5 s, y USAR y SALTAR encendidos.

## Inventario de los bocetos, y usar con clic derecho — HECHO (2026-09-28)

Probaste la tanda 1 y pediste cambios, con dos bocetos:
- **Clic izquierdo** golpea con lo que se lleva en la mano.
- **Clic derecho** (USAR en el movil) usa lo de la mano. Se van E=comer,
  F=sembrar, I, C y el boton COMER.
- **E** abre inventario y recetas juntos, sin pausar: PERSONAJE, INVENTARIO y
  RECETAS como en el boceto.
- En el movil, la pantalla del boceto: OTROS · barra · INVENTARIO arriba; salud,
  USAR y ATAQUE abajo, con CORRER y SALTAR encima.
- **16 casillas** y pilas de **100**.
- **Arrastrar** mueve, apila o intercambia, y soltar fuera tira.
- **Fabricar es mantener 2 s** (luego 1,5 s).
- **Esquirlas** pequenas, semitransparentes y poco saturadas al golpear sin
  romper, y sin barra de progreso.
- Sin iconos, y la cantidad solo como numero.

Varias cosas de aqui cambiaron en los ajustes de arriba: pestanas en vez de
flechas, iconos en los botones, 1,5 s para fabricar, confirmar al tirar.

Lo que decidi yo esta arriba, en «Esperando tu juicio».

Lo comprueban los tests del nucleo (mover y apilar, usar, fabricar sin sitio,
golpes sin romper), el humo con raton (E, arrastrar, tirar, mantener 2 s, clic
derecho para comer y sembrar, OTROS, las paginas del movil) y `npm run gestures`
con toques de verdad (arrastrar una casilla y mantener una receta).

## Cajas de golpe y de choque, y el panel de desarrollo en el movil — HECHO (2026-10-05)

Pediste ver las cajas de golpe y de choque de todo —plantas, rocas,
estaciones, animales— con un boton del panel de desarrollo, y otro para abrir
ese panel en el movil, en la columna de OTROS. Elegiste que se vean a traves de
todo, tres colores (rojo golpe, cian choque, amarillo las dos) y el agua sin
dibujar. Como quedo, en `docs/devtools.md`; lo que elegi yo, en «Esperando tu
juicio».

## Equipables: catorce casillas, el Bolso, el Arma y las primeras armas — HECHO (2026-10-04)

Lo pediste asi:

- **Una columna mas a la derecha de PERSONAJE**: de 10 a 14 casillas. En orden
  de lectura: Capa, Casco, Hombreras, Bolso, Pechera, Collar, Cinturon,
  Pantalon, Anillo, Botas, Mascota, Montura, Arma y Emblema (`Equip`).
- **Un icono por casilla en vez de su nombre**, que se oculta al equipar algo.
  Elegiste siluetas vectoriales (`equip-icons.ts`).
- **Bolsa y mochila solo van al Bolso**, y elegiste **una a la vez**: el
  maximo baja de 24 a 22 casillas.
- **La casilla del Arma**: a los seres vivos les pega el arma puesta aunque se
  lleve otra cosa en la mano; a lo demas, lo de la mano.
- **Tres armas**: punal de piedra (a mano), espada de cobre y de hierro (en la
  mesa), en «Armas». Daño 15, 30 y 45, a falta de una sesion de equilibrio del
  combate; deben **durar menos** que las herramientas. Las recetas, mi
  propuesta, que aprobaste.
- **Un arma en la mano pega con ella**, y **todo golpe gasta** a lo que pega,
  vivo o inerte, en la mano o equipado. Esto **retira** la regla de antes, mia,
  de que golpear lo que no es suyo no gastaba la herramienta: un hacha contra
  la roca ahora se gasta.

Como quedo (todo en `docs/recoleccion.md`):

- **Lo puesto guarda su desgaste** (`Inventory.wornWear`) y lo devuelve al
  quitarlo; el arma puesta que se rompe deja el hueco vacio.
- **El tramo del Bolso es fijo, de 6**: la bolsa abre las 2 primeras. La regla
  de que no se quita con sus casillas ocupadas sigue, y vale tambien para
  cambiarla por la otra.
- **En el movil** las cinco columnas encogen hasta caber en 360 px.

Lo que eligi yo esta en «Esperando tu juicio»: los usos de las armas, que
gasta un golpe, el intercambio directo, que las 14 casillas se vean iguales,
los iconos y los nombres sin eñe.

**Los iconos, rehechos** (el mismo dia): los primeros eran de trazo fino y el
Bolso parecia un bolso de mujer. Pediste partes de armadura medieval
minimalista, como tu imagen de referencia, con aspecto aventurero, medieval y
de fantasia, y que entrara en la guia: es su **directriz 3**. Ahora son
siluetas rellenas con los detalles calados. Despues corregiste cinco: la capa
sin capucha; el caballo, cuyo hocico parecia una trompa; las botas, las dos y
una detras de otra, con el pie mas plano; el pantalon con su cintura, entero;
y el emblema como medalla de pecho, no como escudo. La capa de espaldas
parecia una aleta de buceo, y abierta por delante parecia no tener tela en el
centro. Con tus dos referencias quedo vista de frente: cuello alto, broche,
y la tela de atras llena entre los delanteros, separada por juntas caladas
(una mascara con trazos, en `equip-icons.ts`).

**La auditoria de la fauna sigue pendiente** (arriba): esta tanda no la hizo.

## Fauna de bloques, con la caja de golpe de sus partes — HECHO (2026-10-03)

Probaste las ocho direcciones y no te convencieron: «no siento que por ese
camino podamos llegar a un juego pulido». Elegiste **animales de bloques**:

- detalle medio;
- estaticos de momento;
- chocan con **las cajas de sus partes**;
- no chocan entre ellos ni contigo.

- **El plano de cada especie** (`shared/fauna-body.ts`) es el unico sitio que
  dice como es un animal, de 10 a 25 cajas segun la especie.
  - El nucleo golpea y choca con las partes `hit`, y el cliente dibuja todas.
  - Tu ejemplo: el cuello y la cabeza del bisonte se golpean; su cola, no.
  - Lo fino tambien queda fuera (patas, orejas, cuernos, astas): es mi
    deduccion, esta arriba.
- **El choque**:
  - un bisonte no cabe por un pasillo de un bloque;
  - no gira si su cabeza fuera a entrar en una pared;
  - no mete la cabeza en un escalon de un nivel.
  - **Una rampa deja pasar.** Es la deduccion que mas pesa: un cuerpo que no se
    inclina asoma un poco sobre la pendiente, y sin eso ni una liebre subia
    rampas.
- **El coste**:
  - la primera version subio el tick de 0,17 ms a 2,2 ms, y el juego no
    llegaba a 60 ticks por segundo en el humo;
  - leyendo cada casilla una vez por ronda, queda en 0,26 ms.
- **Mirala** con `__verdant.faunaGallery()`.
  - Los colores y las medidas son mios: dime que especie no se parece a la
    suya.

## Fauna: ocho direcciones y la profundidad del cuerpo — HECHO (2026-10-03)

Me mandaste dos capturas de una liebre «metida en la pared» y elegiste A+B.

- **Tus dos capturas eran un corte verdadero.** La sonda las reproduce
  (`cornisa`): estabas en lo alto de un escalon y la liebre, al pie. Una caja
  3D en su sitio queda cortada por la misma arista; te mando las dos imagenes.
  Lo elegiste: **A+B tal cual**, sin tolerancia.
- **Lo que si estaba mal** era el bisonte. Se adelantaba 1,45 bloques y se veia
  a traves de cornisas y esquinas (100 % y 21 %). Ahora, 0 % y 0,1 %.
- **A, ocho direcciones:**
  - de frente, tres cuartos, perfil, tres cuartos de espaldas y de espaldas;
  - los de lado van en espejo, y la histeresis evita el parpadeo;
  - la galeria (`__verdant.faunaGallery()`) las enseña todas.
- **B, profundidad de la caja del cuerpo**, pixel a pixel, para animales y
  jugador.
- **Desde arriba** se ve el dibujo de pie y entero. No enseña el lomo: eso es
  lo que cambiarian C o los bloques, y **es tu decision**.
- **Pregunta abierta, del nucleo:** que cada animal choque con su cuerpo y no
  con 0,34. De cara a una pared, la cabeza de un bisonte esta en 3D dentro de
  ella, y B la tapa, como la taparia un modelo de bloques.

## Fauna, ajustes: el daño se olvida, impacto, sprites enteros — HECHO (2026-10-03)

Tres ajustes tuyos tras probar la primera tanda:
- **El daño no se mantiene al recargar**, para todo lo que se golpea.
  - El animal vuelve entero al retirarse y volver: su daño ya no esta en el
    overlay, solo su muerte.
  - Plantas y bloques lo olvidan al descargarse su chunk
    (`forgetUnloadedDamage`).
  - Las ramas arrancadas no son daño y se quedan.
- **Los animales no sueltan fragmentos**, tampoco al morir (lo elegiste).
  - A cambio, todo golpe a algo que se puede romper deja un **impacto**: la
    estrella de 4 puntas que elegiste, donde el golpe toca.
  - El punto lo da el nucleo, con la misma cuenta que decide que cae.
- **El sprite no se mete detras de lo que tiene al lado**, y el del jugador
  tampoco (lo elegiste).
  - La lamina entera toma la profundidad del centro del cuerpo, adelantado
    medio largo de su dibujo.
  - Al proponerlo dije «medio ancho de la caja»; al medirlo no bastaba. La cara
    de un bloque al que se arrima queda medio bloque por delante del centro, y
    la lamina sobresale medio largo del dibujo, que es mucho mas que el cuerpo.
  - Medido en una escena minima: pegado de lado a un bloque se ve el 100 %, y
    con un bloque delante, el 0 %.

## Fauna, primera tanda: diez especies que deambulan — HECHO (2026-10-02)

Pediste dos animales reales por bioma, con tres etapas y dos sexos, sus
ratios, puntos de vida y botin, y un sistema de PV con bases claras; que de
momento solo deambulen y que el boton del bioma no se toque. Decidiste PV por
masa, los cinco biomas de tierra, etapa fija hasta la reproduccion, y asar la
carne con el resto del botin en espera. Todo esta en **`docs/fauna.md`**:
especies, numeros, el comportamiento escrito de cada etapa, el oceano para la
tanda del nado y como se aplica la ley del observador.

- **Hecho**:
  - diez especies en pradera, bosque, tundra, tierras altas y costa, con sus
    30 dibujos;
  - PV = 100 × (masa / 70 kg)^(1/3), el jugador de referencia;
  - aparicion por densidad real comprimida, en grupos;
  - se golpean con el mismo golpe que el resto (barrido y preciso);
  - sueltan su botin entero o no mueren;
  - la carne se asa en el horno («Cocina») y la asada se come;
  - un muerto no vuelve.
  - En el panel de desarrollo, «Materiales de cocina».
- **Lo que no**:
  - no comen, no huyen, no envejecen ni se reproducen;
  - no entran en el equilibrio ni en el panel del bioma;
  - piel, plumas y caparazon no sirven aun para nada.
- **Medido**:
  - cada especie sale cerca de su densidad (el ibice, un 30 % por debajo, por
    la roca);
  - las etapas, 19 / 26 / 56 %;
  - unos 50-60 animales alrededor del nacimiento, a 0,15 ms por tick;
  - cada dibujo mide exactamente su caja de golpe.
- **Lo que destapo el humo**:
  - Los puntos de paso eran un punto cualquiera de su casilla. Junto a la
    orilla, la caja del cuerpo rozaba el agua, el animal nacia en su origen y
    echaba a andar. Ahora son el centro de la casilla.
  - Y el propio humo: recargar la pagina reinicia el tiempo, asi que la presa
    nacia en el punto del periodo anterior. Se recarga en el mismo tick (`&t=`).
- La tabla del plan llevaba 38 PV para liebre y zorro y 10 para el cangrejo,
  redondeados a mano; la formula aprobada da 39 y 9.
- Las casillas del inventario no llevan iconos (decision tuya), asi que los
  objetos nuevos solo tienen su nombre y su descripcion: el plan decia iconos.
  **Luego** (2026-10-17): los iconos llegaron con su propia tanda, en
  pixelart (`docs/guia-de-arte.md`, directriz 5).

## `CLAUDE.md` adelgazado: cada parte en su documento — HECHO (2026-10-02)

La propuesta 3, que pediste tras las 2 y 4. `CLAUDE.md` se carga **entero en
cada turno** y cada llamada a una herramienta lo reenvia, asi que lo que pesa
se paga muchas veces por sesion. Ahora lleva solo lo que vale para cualquier
tarea —arranque, reglas duras, la regla de trabajo contigo, el libro, el
procedimiento de pruebas y la auditoria— y un **indice**, «Donde esta cada
cosa: leer antes de tocar», que dice que documento leer antes de tocar cada
parte. Medido: de 87.978 bytes (1.378 lineas) a 21.940 (364), una cuarta
parte.

- **Nada se reescribio: se movio literal.** Cada linea con texto del
  `CLAUDE.md` de antes esta, identica, en el nuevo o en uno de los documentos
  (comprobado con un guion, contando repeticiones); solo cambiaron cuatro
  titulos, que pasaron a ser el de su documento, y una referencia interna
  («ver «Efectos visuales»», ahora `docs/efectos.md`).
- **El reparto**: `docs/reglas.md` (las reglas 12, 21 y 22 enteras),
  `docs/controles.md`, `docs/recoleccion.md`, `docs/efectos.md`,
  `docs/arte.md` (aspas y proporciones), `docs/relieve.md` (con el salto y el
  hambre), `docs/devtools.md` y `docs/pruebas.md` (el humo, la CI y sus
  lecciones).
- **Las reglas 12, 21 y 22 llevan un resumen** en `CLAUDE.md` con su mismo
  numero, que es el que cita el codigo; el texto entero va en
  `docs/reglas.md`. Es lo unico duplicado, y la lente F de la auditoria lo
  vigila.
- **El escaner tiene una categoria nueva**: un documento de `docs/` que el
  indice no nombra sale como aviso, con su fallo sembrado en la autoprueba. Un
  documento sin fila no lo lee nadie, y es perder la informacion por otro
  camino. Las listas de permitidos del escaner (`retirados.md`, `ignorar.md`)
  apuntan a los documentos nuevos, y el escaner da los mismos 20 avisos que
  antes del cambio.
- **A partir de ahora**, lo que cambie en una parte se escribe en su documento,
  no en `CLAUDE.md`, salvo que cambie una regla dura, el procedimiento o el
  indice.

Las referencias a «`CLAUDE.md`, tal seccion» de las secciones de historia de
este fichero se quedan como estaban: eran ciertas cuando se escribieron, y el
indice dice donde vive hoy cada seccion.

## Las pruebas pesadas a la CI, y las mutaciones en paralelo — HECHO (2026-10-02)

Lo pediste tras ver lo que tardaba cada ronda (propuestas 2 y 4; la 3,
adelgazar `CLAUDE.md`, va despues; *Luego*: hecha el mismo dia, ver la
seccion de arriba):
- **Lo pesado se verifica en la CI, en la rama `pruebas`**, que no despliega:
  `tools/a-pruebas.sh` lleva alli el arbol de trabajo tal cual, sin tocar
  `main`. A `main` solo va lo que sale verde ahi. En local, solo lo barato y la
  pasada que se esta escribiendo. El procedimiento entero, en `CLAUDE.md`
  («Antes de dar algo por bueno»).
- **Las mutaciones de cada ronda en una orden** (`tools/mutar.mjs`, con la
  lista en `tools/mutaciones.mjs`), y en la CI **todas a la vez**, una maquina
  por mutacion (`.github/workflows/mutaciones.yml`).
- **`slash` entro en la CI**, y ahora falla si el barrido no llega a verse.

Lo que destapo el primer dia, y por eso habia que probarlo con trampas:
- `slash` no corria en un clon limpio: no creaba su carpeta de capturas
  (escape 16). En local siempre existia.
- Y por eso mismo, la mutacion del barrido «cayo» sin que el barrido tuviera
  nada que ver. Ahora una prueba que revienta sin un `FALLO` es ERROR, no
  CAE (escape P4).
- Las dos trampas salieron en rojo, cada una por su motivo: un comentario
  («no llego al build») y mover 1 px el registro («no cae»).
- **Una carrera de la 7.ª ronda**: el escudo de la pausa se pintaba un
  fotograma tarde, y en una maquina lenta un clic en medio pulsaba
  INVENTARIO (escape 17). Ahora se pone en el propio evento. Tambien lo
  notarias tu en un equipo lento.
- La vista que gira cerca de `slash` dio 46, 12 y ~190 sobre el mismo
  codigo: se sigue midiendo, pero no hace fallar.

Medido: la CI completa en ~5 min y las doce mutaciones en ~7, contra ~22 min
de humo, gestos y barrido en serie mas ~45 de mutaciones en local. Son unos
25 trabajos para las 20 maquinas que da GitHub, asi que algunos esperan cola.
Cabo suelto: las acciones `@v4` de GitHub avisan de que Node 20 esta
obsoleto; subirlas cuando toque.

## Ajustes de la tanda 2, 7.ª ronda — HECHO (2026-10-02)

La CI de la 6.ª ronda (`313db40`) salio en verde. Lo que pediste:
- **Se arranca en primera persona.**
- **El panel de PC mide siempre lo mismo**, el de cuatro recetas, con E, la
  mesa o el horno.
- **Esc cierra el inventario y vuelve a capturar el cursor, como E**: la
  captura se pide al soltar la tecla, y si el navegador la suelta enseguida
  no pausa. Es lo que puedo hacer sin tu Chrome; si aun ves la pausa, dimelo.
- **Las estaciones miran a quien las pone**: el nucleo guarda su frente.
- **Cada boton de PC lleva su tecla escrita** abajo a la izquierda: el ojo P,
  la informacion I (nueva), el bioma B (nueva), MODO TAB, INVENTARIO E.
- **Fuera CTRL.**
- **En pausa no responde nada** hasta que un clic reanuda.
- **El contorno blanco** de la casilla tocada con el inventario abierto era
  el foco del navegador: los botones ya no lo toman con el raton.
- **El registro de objetos en PC**, encima de INVENTARIO, bajando hacia el.

Lo que decidi yo va arriba, en «Esperando tu juicio».

## Ajustes de la tanda 2, 6.ª ronda — HECHO (2026-10-02)

La CI de la 5.ª ronda (`4458d9b`) salio en verde. Lo que pediste, y lo que
respondiste:
- **La rueda enciende una sola casilla, siempre**: cada muesca mueve en el
  acto la luz de la seleccion. Se veian dos porque el destello iba aparte y
  la luz vieja no se movia hasta el tick siguiente.
- **La rejilla del inventario no repite la luz de la barra.**
- **El panel de PC**: la lista de recetas cabe cuatro sin barra, mas aire
  entre columnas y a los lados, y titulos mas grandes y mas separados.
- **Esc cierra el inventario sin pausar**: ya no pide capturar el cursor; el
  primer clic lo captura sin golpear.
- **El alcance es 3** para golpear, sembrar, colocar y abrir; y **el panel de
  una estacion se cierra cuando su cara queda mas lejos que el alcance**, sea
  cual sea su forma («la distancia de cierre siempre sera igual al
  alcance»).
- **En el movil, un toque fuera del inventario lo cierra, y solo eso.**
- **El barrido del TAP se ve horizontal y centrado en el toque**, con el
  origen en los ojos. Tu «primero Y y luego X» es justo el giro que hace
  falta: girar hacia el lado con el abanico plano y despues inclinarlo sobre
  la derecha de la camara. En primera persona es exacto. En tercera, la
  camara no esta en los ojos, y se afina eligiendo el giro con el que el
  trazo se ve mas plano. Medido en ocho puntos de la pantalla (alto entre
  ancho del trazo; 0 es plano):

  | Vista | Sin giro | Primero Y y luego X | Afinado |
  |---|---|---|---|
  | Perspectiva, peor punto | 2,02 | 2,75 | **0,36** |
  | Isometrica, peor punto | 1,85 | 2,14 | **0,42** |
  | Primera persona, peor punto | 0,17 | **0,00** | **0,00** |

  Lo que queda en tercera persona (~0,2 de media) es la curva propia del
  arco de 90 grados visto de frente.

Lo que decidi yo va arriba, en «Esperando tu juicio».

## Ajustes de la tanda 2, 5.ª ronda — HECHO (2026-10-01)

La CI de la 4.ª ronda (`36e683f`) salio en verde. Lo que pediste, y lo que
respondiste:
- **La estocada en tercera persona** hace el mismo recorrido que en primera:
  nace a un bloque de los ojos, abajo a la derecha de la mirada. Antes nacia
  en la pantalla de la camara, que en tercera persona va detras, y salia de
  muy lejos (medido: a 8,5 bloques; ahora, a 1,06).
- **Las barras deslizables tambien en PC**, en la rejilla y en las recetas.
- **El hambre se vacia en 2 dias** quieto o andando, y **el salto cuesta
  0,25 %**.
- **La rueda enciende una sola casilla a la vez**, en el acto: girando
  deprisa ya no se quedan todas encendidas.
- **MODO y ENTRADA**, como tu boceto, en un arco alrededor del ataque a la
  misma distancia de su centro: ENTRADA arriba y MODO abajo a la izquierda.
- **ENTRADA: MIRA o TAP.** En TAP, un toque en el mundo usa alli y, si no se
  uso nada (abrir, comer, sembrar, colocar), ataca alli; mantener ataca
  sostenido, y arrastrar despues gira la camara sin parar de atacar; arrastrar
  antes es solo camara. ATAQUE y USAR siguen yendo a la cruz, la cruz se
  queda y la entrada se recuerda. Iconos: la cruz en MIRA y una mano tocando
  en TAP.

Lo que decidi yo va arriba, en «Esperando tu juicio».

## Ajustes de la tanda 2, 4.ª ronda — HECHO (2026-09-30)

La CI de la 3.ª ronda (`51f6c7b`) salio en verde. Lo que pediste, y lo que
respondiste:
- **Una barra deslizable en el movil**, al lado de la rejilla del inventario:
  se ve siempre que haya mas casillas de las que caben, y su mando se arrastra
  con el dedo (tocar la pista tambien lo lleva alli). La misma, lista, en las
  recetas: la lista es la misma para la mesa y el horno. Solo en el movil,
  como respondiste.
- **AUTO SALTO**: un boton pequeno sobre SALTAR, como tu boceto. Encendido,
  andando hacia un bloque que se sube de un salto se salta solo justo antes de
  chocar, y se sube sin rozar la cara. No salta si el bloque, o varios
  apilados, pasan del salto (dos bloques, una mesa sobre un escalon, el horno
  de 1,25). Solo en el movil; **cobra como un salto**; arranca apagado y **se
  recuerda** en cada dispositivo.
- **El salto cuesta 0,5 %** del hambre, no 1 %; el automatico tambien.

Lo que decidi yo va arriba, en «Esperando tu juicio».

## Ajustes de la tanda 2, 3.ª ronda — HECHO (2026-09-30)

La CI de la 2.ª ronda (`5b3a3f6`) salio en verde. Lo que pediste:
- **Cubiertos**: la cuchara corrida a la izquierda y el tenedor a la derecha;
  ya se ve el cuello de la cuchara antes del cruce, y las puas del tenedor
  tienen aire entre ellas.
- **El salto solo empuja hacia arriba.** En el aire se anda como en el suelo,
  a la velocidad de andar o de correr, y se puede girar o dar media vuelta; sin
  mando no se avanza. Se retiraron el impulso del despegue y el 30 % de
  desviacion. Tu caso del salto sigue igual andando (alcance 2, apice 1,16).
- **La zona del joystick en el movil** es ahora el rincon que va del borde
  izquierdo al borde derecho del anillo de salud, y de abajo a la mitad de
  CORRER. Fuera, aunque sea el cuadrante de antes, un dedo gira la camara.
- **El hambre gasta segun el esfuerzo**:
  - quieto o andando se vacia en **un dia de juego** (`HUNGER_EMPTY_DAYS = 1`,
    derivado de `DAY_TICKS`: si el dia cambia, el hambre lo sigue). Hasta ahora
    se vaciaba en unos 3 minutos; ahora en 8;
  - corriendo y avanzando, **×1,6**, el mismo factor que la velocidad; con la
    carrera encendida y quieto, como quieto;
  - **cada salto, un 1 %** del hambre total (bajado a 0,5 % en la 4.ª ronda).

Lo que decidi yo va arriba, en «Esperando tu juicio».

## Ajustes de la tanda 2, 2.ª ronda — HECHO (2026-09-30)

Antes que nada: **la CI de la entrega anterior (`ac4eff0`) salio en rojo** en
la casilla `desktop`, y la culpa era de una comprobacion mia, no del juego. La
de la rueda contaba cuantas casillas distintas se encendian mientras se giraban
dos muescas y exigia exactamente dos; en el runner lento seguia encendida la de
la muesca anterior y conto tres. El juego anota ahora las casillas que enciende, en
orden, y el humo espera a que lleguen y las compara: sin ventana de tiempo,
que en una maquina cargada falla tambien al reves (escape #13 de la
auditoria).

Lo que pediste:
- **La mochila**, como tu adjunto: asa, solapa curva, dos cierres, bolsillo
  delantero y laterales, sin correas; casi cuadrada y mas grande en el boton.
- **La estocada del modo preciso nace abajo a la derecha de la pantalla** y va
  hasta lo golpeado en el centro de la mira. Antes recorria la propia linea de
  la vista y se veia de punta: solo aparecia al moverse. Medido con pixeles en
  primera persona: 9.153 aclarados abajo a la derecha, y cero con el arranque
  de antes.
- **En el movil, subir el dedo sube la mirada en las tres vistas**, como el
  raton en PC. Las orbitales ya no «agarran el mundo» en vertical; en
  horizontal no cambia nada.
- **MODO se ilumina al pulsarlo**, en el movil y en PC, y con TAB.
- **En el movil, los anillos de PC** en vez de las barras: uno al lado del
  otro, en la esquina de abajo a la izquierda, apoyados en el borde de abajo
  de ATAQUE y USAR, y de un tamano entre los dos. Son los mismos elementos que
  en PC, sacados de la caja con CSS: una sola cifra y un solo dibujo.

Lo que decidi yo va arriba, en «Esperando tu juicio».

## Ajustes de la tanda 2 — HECHO (2026-09-30)

Lo que pediste tras jugarla, y lo que respondiste:
- **Con el inventario abierto no se usa ni se ataca**; se anda.
- **Esc cierra el inventario sin pausar.** Chrome no deja volver a capturar el
  cursor sin un gesto, y Esc no cuenta como gesto: por eso se pausaba. Ahora
  el cursor que suelta el propio juego (inventario, CTRL, panel) no pausa: se
  sigue jugando y el primer clic lo captura. Solo pausa tu Esc en pleno juego.
- **CTRL mantenido suelta el raton** para pulsar botones, sin pausar; al
  soltarlo se vuelve a capturar.
- **El menu del navegador ya no sale** al abrir una estacion con clic derecho.
- **Las estaciones son fisicas como un bloque**: se chocan de lado y se sube
  encima; el horno sigue midiendo 1,25, mas que el salto, a proposito.
- **Colocar mirando a una pared** la pone delante de ella y cae hasta el suelo.
- **La rueda ilumina cada casilla por la que pasa.**
- **Icono de INVENTARIO**: una mochila de explorador, como tu adjunto.
- **La barra de abajo de PC**, tu boceto: MODO, la caja centrada con el anillo
  del hambre (con cubiertos), la barra de la mano y el anillo de la salud, e
  INVENTARIO con hueco para mas botones. Los anillos se vacian en sentido
  horario.
- **Los controles de PC**, dentro del boton de informacion.
- **La reticula** ya no marca lo que alcanza el golpe; marca el suelo y ahora
  tambien la cara de la pared que se mira.
- **Dos modos de golpe**: barrido (el de siempre) y preciso (solo el primer
  objetivo del centro de la mira). TAB o el boton MODO; en el movil, mas
  pequeno que USAR y en la diagonal de arriba a la izquierda del ataque. En
  preciso se ve una estocada recta.

Lo que decidi yo va arriba, en «Esperando tu juicio».

## Recoleccion y fabricacion — tandas 1 y 2 HECHAS (2026-09-28 y 2026-09-29)

Pediste la progresion de un jugador real: aparece sin nada, recolecta con las
manos, fabrica sus primeras herramientas, que le dan mejores recursos, y con
ellos mejores herramientas e indumentaria. Tus decisiones:
- trabajo por golpes;
- la herramienta se equipa;
- se desgastan y se rompen;
- la ropa sirve para llevar mas;
- lo basico se fabrica a mano y lo mejor en mesa u horno;
- los metales se funden en un horno;
- el inventario son casillas con pilas;
- la roca a mano no da nada y la primera piedra son guijarros sueltos.

Lo que decidi yo, con cifras, esta arriba en «Esperando tu juicio».

**Tanda 1, hecha**: etapas 1 a 3.
- A mano: guijarros (piedra), arbustos (bayas y fibra), arboles (ramas).
- Hacha y pico de piedra, fabricados a mano.
- El hacha tala en 4 golpes. El pico saca roca, carbon y cobre; el hierro pide
  un pico mejor (lo decia un aviso, que retiraste el 2026-09-29 con los demas).

Lo comprueban `tests/crafting.test.ts`, con una partida guionizada de las manos a
los minerales, y el humo. El humo fabrica un pico desde el panel con los
«Materiales de piedra» del panel de desarrollo y saca cobre golpe a golpe.

**Tanda 2, hecha el 2026-09-29.** El plan aprobado, con lo que decidiste al
empezarla (F ya no existia):
- **Mesa de trabajo** (8 madera) y **horno** (10 piedra + 2 carbon), fabricados
  a mano en la categoria «Estaciones».
- **Se colocan con USAR** llevandolos en la mano, donde la mirada toca el
  suelo, como una semilla. Son **cajas en 3D**, no aspas. Estorban el paso y se
  desmontan a mano en 3 golpes; vuelven al inventario enteras.
- **USAR mirando una estacion la abre siempre**, lleves lo que lleves en la
  mano. Se abre el mismo panel que con E, pero RECETAS (la pestana Recetas en
  el movil) muestra solo las de esa estacion, con su nombre de titulo. **Con E
  no salen**: solo se ven usandola.
- **El panel de una estacion se cierra solo a mas de 3 casillas** de ella. El
  nucleo usa la misma cuenta (`stationNear`) para aceptar la receta.
  (*Hoy*, desde la 6.ª ronda de ajustes: cuando su cara queda mas lejos que
  el alcance.)
- **Fundir es una receta mas del horno**: mantener 1,5 s. 2 cobre + 1 carbon
  dan un lingote de cobre; 2 hierro + 2 carbon, uno de hierro.
- **Herramientas de metal**, en la mesa:
  - hacha y pico de cobre = 2 ramas + 3 lingotes, poder 2, 120 usos; el pico
    de cobre mina hierro;
  - de hierro = 2 ramas + 3 lingotes, poder 3, 250 usos.
- **Ropa**, en la mesa, y se arrastra a su hueco de PERSONAJE:
  - bolsa de fibra (8 fibra), en la cintura, abajo a la derecha: +2 casillas;
  - mochila de armazon (10 fibra + 4 madera + 2 lingotes de cobre), en la
    espalda, en el centro de la columna derecha: +6 casillas.
  - No se quita una prenda con sus casillas ocupadas.
- «Experiencia», la otra mitad de la ley, sigue fuera: esta sin disenar.

Lo comprueban:
- `tests/stations.test.ts`: colocar, estorbar, desmontar, abrir, la distancia,
  fundir, los picos de metal, la ropa y una partida de la mesa a la mochila;
- dos leyes nuevas en `tests/world-laws.test.ts`;
- la pasada `stations` del humo, que lo juega con el raton desde el nacimiento
  y esta en su casilla de la CI.

Mis deducciones van arriba, en «Esperando tu juicio». Hay tambien dos cosas
que tienes que saber:

- **El golpe tumba todo lo que toca** (regla 12), tambien una estacion:
  talando un arbol pegado a la mesa, los golpes la desmontan tambien (3
  golpes, y el dano se olvida a los 3 s). Lo deje asi por coherencia. Que la
  estacion solo reciba el golpe cuando es lo mas cercano del sector es una
  linea.
- **En el movil la ropa se equipa desde la barra.** Las paginas del panel van
  de una en una, asi que la rejilla del inventario y los huecos de PERSONAJE
  no estan a la vista a la vez; la barra de la mano si. La prenda se lleva
  primero a la barra y de ahi a su hueco. Si lo quieres de otra forma (por
  ejemplo, tocar la prenda y un boton «Ponerse»), es decision tuya.
- **No hay iconos nuevos**: el plan los mencionaba, pero las casillas van con
  nombre corto y sin iconos por decision tuya; los objetos nuevos llevan
  nombre corto y descripcion como los demas.

## Ataques y saltos que no salian — ARREGLADO (2026-09-28)

Lo viste jugando: moviendote, a veces atacas o saltas y no pasa nada, y a veces
ni al segundo intento, tambien en llano. La causa estaba en el bucle del
cliente, no en la simulacion: los pestillos del mando (salto, accion, comer,
sembrar) se recogian en cada fotograma, y la simulacion va a 60 Hz; en un
fotograma sin tick la pulsacion se tiraba. A mas de 60 Hz eso pasa en muchos
fotogramas: un modelo del bucle da un 32 % de pulsaciones perdidas a 90 Hz, 50 %
a 120 y 58 % a 144, y del 0,5 al 2,5 % a 60. Ahora esperan en el mando al primer
fotograma con tick. En pausa se siguen tirando, a proposito.

Una pasada nueva del humo finge una pantalla de 144 Hz y exige 30 de 30 golpes y
5 de 5 saltos; sin el arreglo da 10 y 0.

**Confirmado por el autor jugando**: «funciona excelente ahora». Si algun dia
vuelve a perderse un salto, quedaria el otro canal —pulsarlo en el aire, al
aterrizar o bajando un escalon, un 2,2 % del tiempo andando—, que es la seccion
aparcada de mas abajo.

## El raton lleva la mirada, y soltarlo pausa — HECHO (2026-09-28)

En PC, hacia donde se mueve el cursor se mueve la vista, en las tres vistas. El
navegador captura el cursor, y Esc lo suelta y pone el juego en pausa con el
aviso «Juego en pausa». Un clic en la pantalla lo captura otra vez y reanuda, y
ese clic no golpea. Tambien arranca en pausa. El inventario no suelta el
cursor; el panel de desarrollo lo suelta sin pausar. Todo eso lo decidiste tu;
lo mio esta arriba, en «Esperando tu juicio».

Medido en el humo: en pausa el reloj de ticks no se mueve, capturar no gira la
vista (Chrome manda un salto espurio al capturar que se descarta, y sin eso
giraba 90 grados), el clic que reanuda no golpea, F3 suelta sin pausar e I no
suelta. El movil no cambia: los gestos y el humo movil pasan igual.

*Luego*: el inventario paso a la tecla E y **si** suelta el cursor, sin pausar;
Esc lo cierra.

## Angulo de vision ajustable — HECHO (2026-09-28)

Pediste poder cambiar el campo de vision de la primera persona dentro del juego.
Es una barra de 50 a 100 grados que sale desde detras del ojo, con una marca
cada 10 y los grados a su izquierda, y arranca en 70. En PC se abre al pasar el
raton por el ojo; en el movil, al sostenerlo mas de 1 s, y al soltar no cambia
de vista. Un toque corto cambia de vista y la cierra, y cualquier otra accion o
toque fuera tambien la cierra. Decidiste ademas que solo exista en primera
persona, que el angulo se recuerde en cada dispositivo y que el catalejo parta
de el. Lo que decidi yo esta arriba, en «Esperando tu juicio».

Lo comprueban el humo (raton) y `npm run gestures`, este con toques de verdad.
Sostener el ojo abre la barra solo en primera persona, medio segundo no la
abre, el dedo la arrastra de 70 a 100 y tocar el mundo la cierra. El toque
corto cambia de vista y la cierra. Con el clic del toque sostenido sin tragar,
la comprobacion cae.

*Luego* (2026-09-29): la barra va de 70 a 120 y el toque sostenido es de 0,5 s.

## Golpe por hitbox y una sola mirada — HECHO (2026-09-28)

Probaste el cono en el movil: funcionaba, pero se quedaba corto. Pediste:

- **Alcance 2 bloques**, y el **cono plano, inclinado hacia el punto exacto de
  vision**: ahora es un sector de 90 grados en el plano de la mirada, que sale
  de los ojos.
- **El golpe solo cuenta si toca un hitbox**; el del arbol es su **tronco
  desnudo**, no las hojas. Todo objeto tiene el suyo. **El terreno tapa el
  golpe.** Se siembra **donde la mirada toca el suelo**.
- **El barrido recorre el borde curvo del area real**: el extremo de cada rayo
  del sector, cortado por el terreno.
- **Primera y tercera persona comparten el punto central**, que es la
  direccion en que mira el jugador; **la isometrica tambien**. La tercera persona
  **mira hacia arriba**, y la camara **choca** con bloques y troncos.

Lo que cambia al jugar, y conviene que lo mires tu:

- El sector es plano: **mirando al frente pasa por encima de un arbusto** (los
  ojos a 1,75, el arbusto a 1,1). Para golpearlo hay que mirarlo; con la
  camara de arranque (35 grados hacia abajo) se alcanza.
- **Para sembrar hay que mirar unos 41 grados hacia abajo** en llano, algo mas
  que la camara de arranque.
- **En tercera persona el personaje tapa el centro de la pantalla**, porque la
  mirada pasa por sus ojos.

El tronco de cada arbol se mudo al nucleo (`sim/trunk.ts`): el que se dibuja y
el que se golpea son el mismo numero. Medido: mirando arriba del todo, la camara
queda a 0,46 de los ojos y 0,30 sobre el suelo; el barrido llega a pantalla en
todas las vistas y rumbos. Lo que decidi yo, arriba en «Esperando tu juicio».

*Luego* (2026-09-29): el alcance subio a **2,5**, tambien para sembrar, y
basta mirar unos 35 grados hacia abajo, lo que da la camara de arranque.

## La accion es un cono — SUSTITUIDO (2026-09-28)

Lo que sigue quedo sustituido el mismo dia por el golpe por hitbox de arriba.

Pediste que la accion dejara de estar fijada a casillas: en primera persona se
golpeaba lo que no estaba delante de los ojos, y el barrido a veces ni se veia.
Tus decisiones:

- **Cono de 1,5 bloques y 90 grados** alrededor de la mirada real (sin
  redondearla a ocho direcciones); una casilla cuenta si su centro cae dentro.
- **Dos alturas, en 3D**: la propia y la de arriba; mirando hacia abajo mas de
  **25 grados**, la propia y la de abajo. Vale en las tres vistas: en primera
  persona se entra mirando a -11 grados (arriba); la orbital arranca a 35
  (abajo), y bajandola casi a ras de suelo pasa a la de arriba.
- **El barrido delante de la mirada**: delante de los ojos en primera persona,
  delante del pecho del personaje en tercera.
- **Sembrar en la casilla de enfrente**: la primera que cruza el centro de la
  mirada.

Con el jugador centrado y mirando en recto el cono coge lo mismo que las cuatro
casillas de antes; se nota al girar y al estar a medio paso. Lo que decidi yo,
en «Esperando tu juicio». Medido: el barrido llega a pantalla en todos los
rumbos de primera persona (9.000-19.000 pixeles) y en tercera como antes; y un
test del nucleo afirma las dos alturas (con la segunda altura fija «arriba», cae).

## Troncos por especie — HECHO (2026-09-27)

Pediste tres cosas: que no asomara el canto de arriba del tronco, que el tronco
desnudo fuera de cada especie (2-5 bloques de palo bajo la picea negra se veian
raros) y que el grosor tambien. La unica regla comun que dejaste: **nunca menos
de 2 bloques**.

- **El canto asomaba** porque el tronco de las coniferas era un rectangulo que
  subia al 85 % de la copa, donde el cono ya es mas estrecho que el. Ahora
  estrecha del pie a la copa y acaba en punta dentro de ella. Se mide: pixeles
  de tronco con aire encima por dentro de la copa, cero en las seis especies
  (con el rectangulo de antes, 2 en tres coniferas; el humo cae).
- **Tronco y grosor por especie**, del porte real de cada una: la tabla, en
  «Esperando tu juicio» y en `CLAUDE.md`. Medido del dibujo, cada especie cae en
  su rango y el roble es el mas grueso y la picea negra la mas fina.
- Lo que cambia al jugar: **casi todas las copas quedan justo sobre la cabeza**,
  porque casi todas las especies rozan el minimo de 2; solo el alerce las lleva
  altas. El tronco medio de los arboles colocados paso de 3,5 a 2,6.

## Arboles con forma de su especie, y sombras al suelo — HECHO (2026-09-27)

Pediste que cada arbol tomara las proporciones de una especie real, para no
iterar a ojo. Tu reparto: bosque = picea comun, bosque raro = alerce en otono,
pradera = roble aislado, pradera raro = cerezo japones, tundra = picea negra,
tundra raro = picea azul; y **solo la forma**, con la copa en 3-5 bloques de
alto. Medido del dibujo, cada ancho:alto cae en el de su especie (0,40; 0,44;
1,26; 1,49; 0,25; 0,44). La tabla, en `CLAUDE.md` (Proporciones) y en
`tree-shapes.ts`. Lo que decidi yo esta arriba, en «Esperando tu juicio».

Despues viste en el movil una conifera con **un circulo de hojas en la punta**:
era la picea negra, con su penacho dibujado como una elipse lisa. La especie
real si tiene la punta tupida, pero la elipse se leia como una piruleta. Ahora
son tres pisos cortos y apretados que acaban en punta, y la aguja estrecha
hasta arriba; el ancho:alto medido sigue en 0,25.

Nota: la picea comun sale **igual de ancha que antes y mas alta**: tu viste la
copa estrecha, pero una picea de verdad es estrecha. Los que se ensanchan son
el roble y el cerezo.

Y el fallo de las sombras: la sombra era un cuadrado plano a la altura del pie,
asi que al borde de un desnivel quedaba media en el aire. Ahora se parte por
casillas y cada trozo cae sobre la superficie de la suya, por abajo que este.
Sigue costando una draw call por chunk.

## Arboles altos: el tronco mide de 2 a 5 bloques — HECHO (2026-09-26)

Tu encargo: **solo el tronco de un arbol adulto mide de 2 a 5 bloques, segun
una normal**, para que el jugador vea por debajo del follaje. Antes, medido del
dibujo, el tronco que asomaba bajo la copa iba de **0,78 a 1,13** bloques: la
copa le tapaba la cabeza a un personaje de 1,93.

Lo que interprete yo, y esta en «Esperando tu juicio»:

- **«Tronco» es el tramo desnudo**, del suelo al borde bajo de la copa, porque
  es el que decide si se ve por debajo. La copa no cambia de tamano: sube. El
  arbol entero pasa de 3,17 a unos 4,4-7,4 bloques (5,70 con el tronco medio).
- **Media 3,5 y desviacion 0,75**, que ponen 2 y 5 a ±2σ. **Truncada**: una
  muestra que se sale se vuelve a sortear. Recortarla habria dejado un 2,3 % de
  los arboles clavados en 2 y otro tanto en 5, una fila de arboles iguales.
- **Las seis especies de arbol** por igual, raras incluidas (conservan su copa
  un 15 % mayor). Brotes, arbustos y rocas no cambian.

Lo que no es interpretacion: la altura es **de la casilla** (`hash2DFloat`),
como el giro del aspa, asi que un arbol no cambia de altura al regenerarse su
chunk; y es **arte**, `packages/sim` no se entera. Se dibuja por (especie,
cuarto de bloque), cada combinacion una vez y solo si aparece: sigue siendo un
Mesh por arbol, sin draw calls de mas.

Medido del dibujo en la semilla 12345: **2.924 arboles, de 1,97 a 5,00, media
3,48**. `tests/trunk.test.ts` afirma la forma de la normal y que no hay montones
en los topes (comprobado que muerde: recortando en vez de truncar caen dos
tests), y el humo afirma el rango, la variacion y que el tronco medio deja pasar
al jugador (con el arte viejo cae con tres fallos).

**Y la copa, despues** (2026-09-27): la viste pequena para el arbol nuevo y
pediste agrandarla. Propuse y puse **x1,5** (`CROWN` en `art.ts`): el frondoso
pasa de 2,47 a **3,69** bloques de copa, del orden del tronco medio, como un
roble de Minecraft; el arbol medio mide ahora 6,82. Se escala desde su borde
bajo, asi que el tronco sigue en 1,98-5,01. El humo afirma que la copa pasa de
3,1 (con `CROWN = 1` cae). Por el camino aparecio que la medida del tronco
miraba solo la fila del pie, que cae a medio pixel: con la copa nueva el
frondoso medio cero. Ahora busca el tronco unas filas por encima.

Una consecuencia a mirar: vista desde arriba, un bosque denso ahora **tapa mas
al jugador**. Es el cabo de la camara que ya estaba en la lista («que el
terreno tape al jugador sin perderlo de vista»), que ahora aprieta un poco mas.

## La accion alcanza tambien la casilla que se pisa — SUSTITUIDO

Sustituido el 2026-09-28 por el cono y, el mismo dia, por el golpe por hitbox
(arriba). Queda como historia.

Pedido del autor: cuatro casillas en vez de tres, con su enunciado sobre una
rejilla 1-9 (jugador en el 5; mirando a 2 → 1, 2, 3 y 5; mirando a 3 → 2, 3, 6
y 5). El arco del barrido no cambia, tambien decision suya. Esta en la regla 12
de `CLAUDE.md`. Recolectar la propia solo hace algo si hay algo pisable encima
—una mata, por ejemplo—; sembrar sigue siendo solo la apuntada.

---

## La franja de salud y hambre — HECHA (2026-09-26)

*(Sustituida el 2026-09-30: en el movil van ahora los anillos de PC, ver
«Ajustes de la tanda 2, 2.ª ronda». Lo de abajo es historia.)*

Pedido del autor, con sus decisiones: salud y hambre siempre a la vista, abajo
del todo y bajo el racimo del pulgar, sin rotulo y con un corazon y un muslo de
pollo en SVG a color; un boton de inventario en la esquina inferior izquierda
(tecla I); el HUD ocultable con su boton arriba a la izquierda y sin tecla; HUD e
inventario cerrados al arrancar. Lo que decidi yo esta en «Esperando tu juicio».

El humo afirma lo que no se ve en un test: que los paneles arrancan cerrados y se
abren con su boton o su tecla, que el inventario en pantalla es el del juego, y
que en un telefono de 390 px el racimo queda entero por encima de la franja y la
franja llega al borde derecho. Comprobado que muerde: con el HUD arrancando
abierto, cae con tres fallos.

**Cabo suelto de medida, no de juego:** `npm run slash` dio dos veces seguidas
**0 pixeles** en el peor rumbo de «de cerca, girando» y, repetida, 17, 93 y 84.
La herramienta anda hasta un sitio con alcance completo y no siempre para en el
mismo (5.0,42.2 / 5.2,42.3 / 5.5,42.6), asi que su peor rumbo depende de donde
cae. El cambio de la franja no toca nada dentro del recuadro que mide.

**Resuelto despues, con la primera persona:** los ceros salian en rumbos donde,
al girar, las casillas de delante quedaban a otra altura y la accion solo
alcanzaba la propia —que no se barre—: no habia arco que ver. La herramienta
ahora cuenta esos rumbos aparte («sin arco») y no los mete en el peor.

---

## El isometrico se retira — HECHO (2026-09-26)

Decision del autor: centrarse al 100 % en el 3D, que el 3D no dependa de nada
del isometrico y no tener que adaptar cada caracteristica a dos modelos. Con
una condicion: **no perder trabajo que solo estuviera en el isometrico.**

Como se hizo, por fases y con `main` en verde entre una y otra:

1. **Cortar la dependencia.** El 3D arrastraba codigo isometrico por una sola
   puerta: `tiles.ts`, que mezclaba el arte de especies con el de terreno e
   importaba `projection.ts`. El arte del 3D paso a `art.ts`, y un test recorre
   el grafo de imports (hoy `tests/client-boundary.test.ts`, que ademas afirma
   que no queda ningun fichero huerfano).
2. **Trasladar lo que solo tenia el isometrico.** Se comparo campo a campo la
   `Intent`, los HTML, los renderizadores y las sondas de depuracion. Salieron
   catorce cosas, y dos eran graves: **en el 3D no se podia comer** —con el
   hambre corriendo— y **al morir la partida se quedaba congelada sin aviso**.
   La tabla entera, con donde vive cada una y que comprobacion la cubre, esta en
   `docs/isometrico.md`.
3. **Humo del 3D antes de borrar nada.** Hasta entonces la unica prueba de
   integracion jugaba el isometrico. La nueva lleva todas sus comprobaciones de
   juego y una por cada traslado, en seis pasadas; convivio con la vieja en CI
   hasta que las dos estuvieron en verde.
4. **Borrar**: ocho modulos, cuatro tests, su humo, el build de un solo fichero
   y `pixi.js`.
5. **El 3D pasa a ser el cliente**: `src/spike3d/` subio a `src/`, los scripts
   perdieron el `spike` y Pages lo publica en la raiz, con `/3d/` redirigiendo
   para no romper enlaces ni el acceso del telefono.

Lo que aparecio por el camino y conviene saber:

- **La mirada es la de la camara**, decision del autor: se acciona hacia donde
  se mira. Por eso las sondas del humo (`probes.ts`) buscan el sitio de apoyo
  al sureste de lo que se quiere golpear: la camara arranca mirando al noroeste.
- **La noche es una vela sobre la pantalla**, como en el isometrico, y no bajar
  las luces: las aspas usan un material sin iluminar y se quedarian a pleno dia
  con el terreno a oscuras. Si algun dia se quiere luz de verdad, primero hay
  que decidir lo del material (ver «Esperando tu juicio»).
- **Dos comprobaciones del humo nuevo pasaban o fallaban segun donde quedara el
  jugador** —el barrido del clic y el de la accion movil—: al pie de un muro las
  tres casillas pueden estar a otra altura y no hay nada que barrer. Se movieron
  al nacimiento, que es un rellano llano por la regla 22.
- **Que un boton llega a la Intent** se mide con contadores (`sent` en la
  sonda), no con su efecto: sembrar depende de tener semillas y sitio.
- **La etiqueta `isometrico-final`** no la dejo crear el proxy de la sesion (se
  corta la conexion al empujar etiquetas). No hace falta para recuperar nada
  —`b1d0d7a` esta en la historia de `main`—, pero si el autor la quiere, se
  crea desde la web.

---

## Fase 2 del relieve: la altura estorba — HECHA

Implementada. Lo que sigue es el diseno tal y como lo fijo el autor, que se
conserva porque los numeros marcados como deduccion **siguen siendo suyos para
corregir**, y debajo lo que aparecio al construirlo.

### Lo que se midio al terminarla

| Medida | Valor | Contra que |
|---|---|---|
| Apice del salto | 1.160 niveles | 1.161 en papel |
| Alcance a paso completo | 2.17 casillas | 2 de diseno |
| Duracion del vuelo | 0.400 s | 0.387 s en papel |
| Conectividad del relieve | pierde 0.14-0.77 pt | presupuesto de 1 pt (regla 14) |
| Coste del spawn nuevo | 8-15 casillas | nueve semillas |

### Lo que aparecio construyendola, y que el codigo no cuenta

1. **Euler se comia un decimo del apice.** Integrando «resta la gravedad y avanza
   con la velocidad ya frenada» el apice medido era 1.06 en vez de 1.16, o sea
   un pelo de un pixel sobre un bloque de 16. Se integra por el promedio de las
   dos velocidades, que con aceleracion constante es exacto.
2. **El spawn de la semilla de prueba era injugable.** Agua al noroeste,
   escalones de +2 al sureste: cuatro casillas andables. `findSpawn` solo miraba
   si el tile era solido, y eso basto mientras el relieve no estorbaba.
3. **El rellano de 3x3 no es comodidad.** Sin el, la accion —que solo alcanza la
   altura propia— llegaba a **una casilla de las tres** nada mas empezar.
   Pero el rellano trajo su propio sesgo, y lo destapo la CI, no el humo local:
   **lo llano de este mundo son las mesetas, y las mesetas son roca**, asi que
   cinco de nueve semillas pasaron a nacer en piedra pelada a nivel 16, sin nada
   que comer. Se arreglo exigiendo ademas terreno que sostenga vida, y sale
   gratis: el radio de busqueda pasa de 8-15 a 8-17 casillas.

   Dice algo del mundo, no del spawn: **si hace falta filtrar para encontrar
   suelo llano habitable, es que el relieve es muy empinado.** Es la misma
   observacion de mas abajo, por otra puerta.
4. **La conectividad estaba bien calibrada de antemano.** `analyze-world` ya
   media con «se sube un bloque de un salto», asi que el presupuesto de la regla
   14 se fijo para esta fisica. `debug.reachableArea` no, y se corrigio.
5. **Las comprobaciones de direccion fija dejaron de valer.** Media docena de
   ellas —en tests y en el humo— daban por hecho que andar hacia un lado avanza.
   Ahora una pared es una respuesta correcta, y lo que hay que afirmar es que se
   puede ir a **alguna** parte.
6. **`actionArea` no se filtro; se le anadio `actionReach` al lado.** El plan
   decia filtrar dentro, pero aquella es geometria pura del anillo de
   direcciones y sus 21 tests no conocen el mundo ni deben. El filtro por altura
   es una pregunta sobre el relieve y vive aparte; quien acciona y quien dibuja
   el reticulo usan la version filtrada, para que lo marcado sea justo lo que se
   alcanza.

### Lo que queda pendiente de tu juicio

- **`GRAVITY = 62` y `JUMP_SPEED = 12` siguen siendo deduccion mia.** Salen de tu
  caso, y la tabla de arriba dice exactamente que producen.
- ~~**Soltar el mando en el aire conserva el impulso, no frena.**~~ *Ya no
  aplica: desde el 2026-09-30 en el aire se anda como en el suelo.* Tambien
  deduccion mia. Dijiste «impulso conservado» y «en el aire, correccion
  parcial»; leer «no pido nada» como «quiero pararme» convertiria soltar el
  mando en un freno del 30 % del alcance, y eso es una correccion que nadie
  pide. Si lo quieres al reves, es un `if`.
- **El mundo es empinado, y aqui esta la medida.** Desde el nacimiento de la
  semilla de prueba, empujando ocho segundos en cada una de las cuatro
  direcciones:

  | | Andando | Saltando |
  |---|---|---|
  | Este | 2.4 casillas | **17.2, cruza de chunk** |
  | Norte | 6.2 | 6.2 |
  | Sur | 1.1 | 1.1 |
  | Oeste | 1.1 | 1.1 |

  O sea: **de cuatro direcciones solo una lleva a alguna parte, y solo
  saltando.** Y eso es en un sitio elegido por ser llano y habitable. No es un
  fallo —la altura estorba, que era el encargo— pero si es mucho mas restrictivo
  de lo que se intuia viendo el relieve sin chocar con el. Si quieres laderas
  mas suaves, la palanca es la calibracion del relieve, que es tuya (regla 14):
  `RIDGE_GAIN` y `OUTCROP_THRESHOLD`, midiendo antes con
  `npx vite-node tools/analyze-world.ts`.
- **Los arboles siguen frenando tambien en el aire.** No lo dijiste, asi que no
  lo he cambiado: se mantiene la colision de siempre y no se salta por encima de
  un arbusto. Es una linea si prefieres lo contrario.

### El diseno, como lo fijaste

Vive en `packages/sim`, asi que es agnostica de la camara y **no se ve afectada
por el giro a 3D**.

### Reglas, fijadas por el autor

**El salto**, con su enunciado literal: «desde la casilla 1 a altura 1, saltando y
moviendose al norte, se sube al bloque 2 en altura 2; pero al bloque 3 en altura 2
no se llega — se estampa contra su cara y aterriza en el bloque 2, altura 1». Eso
es una parabola simetrica con el **apice a una casilla exacta** y **alcance dos**.

- ~~**Impulso conservado**: a paso completo llega a 2 casillas; a paso lento, menos.~~
- ~~**En el aire, correccion parcial**: se puede desviar, no dar media vuelta.~~
  *Las dos las cambiaste el 2026-09-30: el salto **solo empuja hacia arriba**
  y en el aire se anda **como en el suelo**, a la velocidad de andar o de
  correr. Ver «Ajustes de la tanda 2, 3.ª ronda».*
- **Caer es caer**: salir de un borde describe un arco con la misma gravedad.
  **Sin dano por caida.**
- **El agua es muro tambien en el aire.** Un salto que acabe sobre agua choca con
  su borde y cae en la orilla de la que salio. Provisional, dicho por el autor: se
  revisara al ampliar las mecanicas de exploracion.
- **La accion solo alcanza casillas a la misma altura**: para talar un arbol
  subido a un bloque hay que subir.
- **La accion pasa a ser exclusivamente el clic derecho**; Espacio queda para el
  salto, y en movil se anade un boton de salto.

*Luego*: las dos ultimas quedaron superadas. El golpe es el sector de la
regla 12, que alcanza a cualquier altura mientras el terreno no lo corte, y
desde el 2026-09-28 golpea el clic **izquierdo** y el derecho **usa**. Igual
con `actionArea`, que ya no existe: `actionReach` son los objetos que toca el
sector.

### Numeros

| Constante | Valor | Origen |
|---|---|---|
| ~~`AIR_CONTROL`~~ | ~~0.30~~ | autor; **retirado el 2026-09-30**: en el aire se anda como en el suelo |
| `JUMP_SPEED` | 12 niveles/s | **deduccion del agente**, ver abajo |
| `GRAVITY` | 62 niveles/s² | **deduccion del agente**, ver abajo |

Derivacion a partir del caso que describio el autor, que **el tiene que poder
corregir**. Con `WALK_SPEED = 5.2` casillas/s, alcance 2 da un vuelo de
`T = 2 / 5.2 = 0.385 s`. Una parabola simetrica tiene el apice en `T/2`, o sea a
una casilla exacta, que es justo donde quiere poder subir un bloque. Fijando el
apice en 1.16 niveles —un pelo por encima del bloque, para que subirse no sea al
milimetro—:

```
g  = 8h / T²  = 8 · 1.16 / 0.385²  ≈ 62 niveles/s²
v0 = g · T/2  = 62 · 0.192         ≈ 12 niveles/s
```

Comprobado contra su caso: a 1 casilla `z = 1.16` → sube el bloque de +1; a 2
casillas `z = 0` → el bloque de +1 a esa distancia es pared. Sale exactamente lo
que describio.

`AIR_CONTROL` se implementa como **tope de desviacion**: la velocidad horizontal
en el aire nunca se aleja mas de `0.30 · WALK_SPEED` de la del despegue. Es
medible en un test, no una sensacion.

### Donde toca

- `sim/entities.ts`: `z`, `vx`, `vy`, `vz`, `grounded`.
- `sim/systems/movement.ts`: en el suelo, lo de hoy mas la prohibicion de entrar
  donde el suelo este por encima de los pies; en el aire, gravedad, tope de
  desviacion y colision contra caras.
- `sim/systems/jump.ts` (nuevo): despegue con el impulso actual y aterrizaje.
- `shared/index.ts`: `Intent` gana `jump`.
- `sim/systems/gathering.ts`: `actionArea` filtra las casillas cuyo nivel no sea
  el del jugador. **`aim.ts` no se toca**: es geometria pura y sus tests valen.

### Que tiene que afirmar `tests/jump.test.ts`

- El caso literal del autor, como tabla.
- A velocidad plena el alcance son 2 casillas; a media, menos.
- La desviacion en el aire nunca supera el 30 % de la velocidad de paso.
- Caer de una altura 3 aterriza abajo y no atraviesa el suelo.
- Un salto sobre agua no acaba nunca dentro del agua.
- Recolectar no alcanza una casilla un nivel por encima.

---

