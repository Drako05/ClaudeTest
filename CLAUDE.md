# Notas para agentes que trabajen en este repo

Lee tambien el README: explica la arquitectura y el porque de cada decision.
Esto es el resumen operativo.

## Arranque de una sesion nueva

**El contenedor es efimero y se reaprovisiona entre sesiones.** Puede tocarte
empezar con el repo literalmente vacio: sin ficheros, sin refs, solo un `.git`
con el remoto puesto. Paso antes de una tanda, asi que no es teorico y no es
sintoma de nada roto.

```bash
git fetch origin main
git checkout -B main FETCH_HEAD
npm install
```

El trabajo va a **`main`**, que es la rama por defecto. Hasta el 2026-09-23 el
proyecto vivio entero en una rama llamada
`claude/capabilities-workflow-confirmation-mgqdm5` —nombre de andamiaje de la
herramienta, y la unica que habia—, y el autor decidio mudarse. Si alguna
herramienta te propone esa rama como rama de trabajo, es un eco de aquello: el
trabajo va a `main`.

**Ojo con Pages**, que es donde se tropezo la mudanza: desde que ramas se puede
desplegar lo decide el entorno `github-pages` (Settings → Environments), con
una lista de ramas que se fija al configurar Pages y **no sigue a la rama por
defecto**. Si un `deploy` muere en un segundo sin ejecutar un paso, es eso.

Y el proxy git de la sesion deja empujar pero **no borrar ramas**: responde 403,
y un 403 del proxy no se reintenta ni se esquiva. Borrar una rama remota es
cosa del autor, desde la web.

Y por eso existe `docs/pendiente.md`: **las notas del agente mueren con la
sesion**, asi que lo que no este escrito en el repo se pierde. Leelo primero.

## Un solo cliente: el 3D

Decision del autor, 2026-09-26: **el juego isometrico se retiro del todo.** El
cliente es el 3D (`packages/client/src/`), y cada caracteristica se hace una
sola vez. Antes de borrarlo se traslado todo lo que era del juego y se comprobo
con la prueba de humo; la lista, lo que no se traslado y por que, y las reglas
de aquella camara estan en **`docs/isometrico.md`**. El codigo sigue en la
historia: `b1d0d7a` es el ultimo commit con el isometrico completo.

Las reglas 6, 7 y 16 a 20 eran de la camara isometrica y se mudaron alli
literales. Sus numeros se quedan vacios a proposito: el codigo cita «regla 21» o
«regla 22», y renumerar romperia esas referencias.

## Reglas duras

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
12. **El golpe es un SECTOR PLANO que sale de los ojos y cuenta solo si toca
    un hitbox** (`sim/aim.ts`), decision del autor: **3 bloques y 90 grados**
    en el plano de la mirada, recorridos con 33 rayos que **el terreno corta**.
    El plano puede girar alrededor de la mirada (`aimRoll`, lo usa el modo TAP).
    El hitbox del arbol es **solo su tronco desnudo**, que vive en el nucleo
    (`sim/trunk.ts`) para que el que se ve y el que se golpea sean el mismo.
    Hay dos modos: el **barrido** y el **preciso** (`preciseTarget`, el primer
    objetivo en el centro de la mira). **Sembrar** va donde la mirada toca la
    cara de arriba del suelo, a menos de 3 en horizontal, y **colocar** ahi o
    delante de la pared que toca (`aimSurface`). **El texto entero —medidas,
    hitboxes, la estocada, por que cayeron los dos modelos anteriores— esta en
    `docs/reglas.md`: leelo antes de tocar el golpe, sembrar o colocar.**
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
16-20. *(Retiradas con el isometrico: el orden por antidiagonales, el recorte
    por bloques, la silueta del jugador, la fila de su casilla y el filo de los
    escalones. Ver `docs/isometrico.md`.)*
21. **La altura estorba, y estorba con UNA regla: no se entra donde el suelo
    esta por encima de los pies.** Andando hay un margen, `STEP_UP`; volando,
    ninguno: de ahi salen el talud que se sube, la pared que no y el bloque
    contra el que uno se estampa en el aire. La altura del personaje es
    **suya** (`entities.z`) y es la que se dibuja; la gravedad se integra con el
    **promedio de las dos velocidades**, que da la parabola exacta; y las
    **estaciones entran en el suelo que se pisa** (`World.floorHeightAt`).
    **Texto entero, con el porque de cada numero, en `docs/reglas.md`.**
22. **Donde se nace hay que ganarselo** (`findSpawn`): un rellano llano de 3x3,
    sitio para andar sin saltar, sitio del que salir contando con el salto, y
    terreno que **sostenga vida**. **Texto entero, con lo medido, en
    `docs/reglas.md`.**
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
  nada. El paso de vida vive en `sim/world.ts` (`lifeStep`) con sus constantes en
  `shared/ecology.ts`, y ahi esta codificado en la aritmetica: con densidad cero
  el crecimiento vale exactamente cero.
- **«Segun su naturaleza, pueden ser finitos, consumibles y renovables»**: no
  todo recurso vuelve. `lifeKindOf` devuelve `null` para lo inerte —roca y
  minerales—, que asi queda fuera del paso de vida: ni crece ni se repone.

## Como trabajar sin quemar la ventana de uso

Cada llamada a una herramienta reenvia la conversacion entera, asi que el coste
va como **contexto x numero de idas y vueltas**. Dos habitos que lo disparan y
que este proyecto ya se comio una vez:

- **Edita con la herramienta de edicion, no con `sed` ni heredocs de `python`.**
  Cuando un fichero cambia por fuera, el sistema lo vuelca **entero** en el
  contexto para que no trabajes sobre una copia vieja. En una tanda,
  `main.ts` del cliente se volco completo siete veces: decenas de miles de tokens
  en re-volcados que no aportaron nada.
- **Una captura por ronda, no cuatro.** Cada PNG son 1.200-1.800 tokens y se
  queda en contexto reenviandose el resto del turno. Mira la que decide; las
  demas, solo si la comparacion lo exige de verdad.

Y lo que no es cosa del agente: la sesion crece sin parar, asi que el corte
natural es **empezar sesion nueva al cerrar cada tanda**, y `/usage` desglosa a
donde se fue el gasto.

## Antes de dar algo por bueno

**Lo pesado se verifica en la CI, en la rama `pruebas`** (decision del autor,
2026-10-02). En local el humo va en serie —humo, gestos y barrido, unos 22
minutos, y cada mutacion 4-5 mas— y la CI lo reparte en maquinas a la vez: unos
5 minutos todo, mutaciones incluidas. Pero **a `main` no se empuja para
probar**: `deploy.yml` publica el juego en cada push a `main` sin esperar a la
CI, y lo roto llegaria al autor antes que el rojo. De ahi el procedimiento:

1. **En local, mientras se trabaja**: `npm run typecheck && npm test` (~20 s) y
   **solo la pasada que se esta escribiendo o tocando**
   (`npm run build && node tools/smoke.mjs <pasada>`), las veces que haga falta.
2. **La ronda de mutaciones** en `tools/mutaciones.mjs`: cada comprobacion
   nueva, con lo que la rompe (ver abajo).
3. **`tools/a-pruebas.sh "que se prueba"`**, con `FIRMA` puesta a las lineas de
   atribucion de la sesion. Lleva el arbol de trabajo tal cual, cambios sin
   commit incluidos, a la rama `pruebas`: commit con un indice temporal encima
   de su punta, avance rapido, sin tocar `main` ni el indice. Antes comprueba
   que la lista de mutaciones aplica.
4. **Esperar las dos tandas en verde**: «CI completa» (`ci.yml`) y «Mutaciones
   completas» (`mutaciones.yml`). Sin `gh` ni API: un temporizador en segundo
   plano (`sleep 300` con `run_in_background`) y despues las herramientas MCP
   de GitHub: `actions_list` con `list_workflow_runs`, `resource_id` `ci.yml`
   o `mutaciones.yml` y una sola por pagina, da el estado y la conclusion de cada
   tanda (se comprueba que su SHA es el que imprimio el guion; filtrar por la
   rama devolvio una vez la lista vacia); si alguna sale en rojo, `get_job_logs` con su `run_id`,
   `failed_only` y `tail_lines` ~40 da solo lo que fallo —el resumen de
   `mutar.mjs` y los `FALLO` del humo quedan unas 20 lineas antes del final—.
   **No listar los trabajos** (`list_workflow_jobs`) salvo que haga falta: con
   veinte trabajos son ~10.000 tokens de pasos. Mientras la CI esta en cola
   —son unos 25 trabajos para 20 maquinas— se sigue con otra cosa, como la
   documentacion. Lo que falle se arregla y se vuelve al 3.
5. **Solo entonces**, commit y push a `main`. Esa CI **confirma, pero no se
   espera** (decision del autor, 2026-09-29): se informa al autor en el acto,
   diciendo que esta en marcha, y se mira **al empezar el siguiente turno**; si
   salio en rojo, se dice y se arregla antes que nada.

El humo completo en local (`npm run smoke`, mas `gestures` y `slash`) queda para
cuando la CI no este disponible. La rama `pruebas` se queda en el remoto para
siempre —el proxy no deja borrar ramas, y no hace falta— y un push nuevo cancela
la tanda anterior que siguiera en marcha.

**Las mutaciones** (`tools/mutar.mjs`, con lo puro en `mutar-lib.mjs` y su
test): cada comprobacion nueva se ve **caer** rompiendo a proposito lo que
afirma; si no cae, no comprueba nada (lente B). La lista de la ronda es
`tools/mutaciones.mjs` —nombre, fichero, el texto `de` que tiene que aparecer
exactamente una vez, el `a` que lo rompe, y la `prueba`: `smoke:<pasada>`,
`gestures`, `slash` o `test:<fichero de vitest>`—; se reescribe en cada ronda y
la de antes queda en la historia. En la CI cada mutacion es un trabajo con su
nombre, que sale en verde si su prueba CAE. En local:
`node tools/mutar.mjs --comprobar` (segundos) o `node tools/mutar.mjs [nombre…]`
(en serie; restaura siempre, tambien con Ctrl-C). **Una mutacion cuyo build sale
identico al limpio es un error, no un «no cae»**: no llego a lo que se mide, que
es justo el escape P3 —se midio una vez con el build viejo—. Asi que una
mutacion de un comentario, que el minificador borra, sale en rojo.

**La CI va repartida** (`.github/workflows/ci.yml`): typecheck y tests, una
maquina por pasada del humo mas `gestures` y `slash`, y un trabajo final, «CI
completa», que solo sale verde si todo lo esta. **Si anades una pasada al humo,
anadela a la matriz**, o no correra nunca en CI. Las puertas de `slash`, la
accion compartida y lo que ensenaron el humo y sus fallos estan en
`docs/pruebas.md`: **leelo antes de escribir o tocar una comprobacion.**

**Y al cerrar cada tanda, la auditoria**: la skill `auditoria`
(`.claude/skills/auditoria/`, se invoca con `/auditoria`). Tiene un proceso fijo
por fases, diez lentes, un escaner automatico con autoprueba y un **registro de
escapes**. Parte del commit que marca «Ultima auditoria» en `docs/pendiente.md`. **Lo
que un cambio retire —un valor, una tecla, un nombre— entra en
`.claude/skills/auditoria/references/retirados.md` en ese mismo cambio**, no en
la auditoria: si no, nadie lo busca hasta entonces (escape 19).
Cada fallo que aparezca despues y que una auditoria pudo ver se anade a ese
registro, con el metodo que lo habria detectado, y ese metodo pasa al escaner o
a una lente: asi la skill mejora con cada cosa que se le escapa. Vive en el repo
a proposito: el contenedor muere con la sesion y la skill tiene que crecer.

## Donde esta cada cosa: leer antes de tocar

Este fichero se carga entero en cada turno, asi que lleva solo lo que vale para
cualquier tarea. Lo de cada parte del juego vive en `docs/`, con el mismo texto
que tuvo aqui hasta el 2026-10-02 (propuesta 3). **Antes de tocar una de estas
partes, lee su documento**: casi todo lo que cuenta es una decision del autor
con fecha, o la leccion de un fallo que ya paso.

| Si vas a tocar… | Lee |
|---|---|
| El golpe, sembrar, colocar, la altura que estorba, el nacimiento (reglas 12, 21 y 22) | `docs/reglas.md` |
| Teclas, raton y pausa, la pantalla del movil, la barra de PC, el ojo y las vistas, la camara, los gestos, MIRA/TAP, el auto salto | `docs/controles.md` |
| El inventario, herramientas, golpes, estaciones, ropa, el panel, el registro de objetos | `docs/recoleccion.md` |
| Barrido, estocada, escombros, esquirlas, o una medida de «se ve» | `docs/efectos.md` |
| Aspas, sombras, tamanos, arboles y sus especies | `docs/arte.md` |
| El relieve, el salto, el hambre | `docs/relieve.md` |
| El panel de desarrollo, las superposiciones, la reticula | `docs/devtools.md` |
| Una comprobacion del humo, de los gestos o del barrido, la matriz de la CI | `docs/pruebas.md` |
| Algo que viene del isometrico retirado (reglas 6, 7 y 16-20) | `docs/isometrico.md` |
| Una ley del libro | `docs/leyes.md` y `docs/el-libro-del-mundo.md` |

Y **`docs/pendiente.md` primero, siempre**: decisiones pendientes, deducciones
que esperan el juicio del autor y la historia de cada tanda.

**Al cambiar algo, se actualiza el documento de su parte**, no `CLAUDE.md`,
salvo que cambie una regla dura, el procedimiento o este indice. Y si una parte
nueva no cabe en ninguno, se le abre el suyo y una fila aqui.

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
