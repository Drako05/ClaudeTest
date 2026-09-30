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
    un hitbox** (`sim/aim.ts`), decision del autor del 2026-09-28: **2,5
    bloques** (eran 2; los subio el 2026-09-29) **y 90 grados** (±45) en el plano de la mirada —la direccion en que se mira,
    con su inclinacion, y la horizontal a su derecha—, y **el terreno lo
    corta**: no se golpea a traves del suelo ni de una pared. Se recorre con 33
    rayos (a 2,5 bloques, un hueco de 0,12, menos que el tronco mas fino), cada uno
    cortado donde entra en el terreno; cae todo objeto cuyo hitbox cruce alguno.
    **Sembrar** va donde la mirada toca la cara de arriba del suelo, a menos de
    2,5 bloques **en horizontal** —el mismo alcance, decision del autor— (lo de
    horizontal es deduccion mia: a lo largo de la mirada habria que mirar 44
    grados abajo para sembrar en llano; asi, 35); ni en la cara de una pared ni
    mirando al cielo.

    **Hitboxes** (`hitboxAt` en `systems/gathering.ts`): cajas verticales
    centradas en su casilla y apoyadas en su suelo. **El del arbol es solo su
    tronco desnudo** —del suelo a la copa y del grosor de su especie—, decision
    del autor: las hojas no. Por eso el tronco de cada arbol **vive en el
    nucleo** (`sim/trunk.ts`) y el cliente lo lee de ahi para dibujarlo: el que
    se ve y el que se golpea son el mismo numero, escalon de cuarto de bloque
    incluido, y un test lo afirma. Arbusto, roca, minerales y brote llevan
    medidas sacadas de su dibujo (deduccion mia).

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
    menos de 2,5 (`preciseTarget`, el mismo rayo que abre una estacion). Es un
    estado de la `Intent` (`precise`), como correr; se cambia con TAB o el
    boton MODO, y en vez del arco se ve una **estocada** recta que **nace
    abajo a la derecha de la pantalla** y va hasta lo golpeado en el centro de
    la mira (`stabLine`, con `STAB_SCREEN`). Recorria la linea de la mirada y,
    vista de punta, solo se veia al moverse (lo vio el autor); `npm run slash`
    la cuenta en pixeles en ese cuadrante.

    **Colocar** va donde se siembra o, si la mirada toca un **costado** del
    terreno, en la casilla de delante de esa pared (`aimSurface`), y la caja
    **cae** hasta su suelo desde donde la tocaba la mirada (decision del autor:
    todo tiene gravedad; la caida solo se ve, el nucleo la pone en su sitio).

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

    **Las estaciones entran en ese suelo** (decision del autor, 2026-09-30:
    fisicas como un bloque). Lo que pisa el cuerpo es `World.floorHeightAt`, el
    terreno mas la estacion de la casilla (`stationHeight`); lo usan el choque y
    la vertical, y nada mas —el terreno que se dibuja, el golpe y sembrar
    siguen con `groundHeightAt`—. Asi una mesa estorba de lado como una pared
    de un bloque, se sube de un salto y, si se desmonta, se cae. El horno mide
    1,25 y **no se sube desde su mismo nivel**: a proposito, porque «que haya
    bloques de diferente altura sera una de las caracteristicas del juego».

22. **Donde se nace hay que ganarselo.** `findSpawn` miraba solo si el tile era
    solido, y eso basto mientras el relieve solo se veia. Con la altura
    estorbando, un hueco entre el mar y un escalon de dos bloques es un tile
    perfectamente pisable del que **no se sale**: la semilla de prueba hacia
    exactamente eso. Ahora se exigen tres cosas, de la mas barata a la mas cara
    — un rellano llano de 3x3, sitio para andar sin saltar, y sitio del que
    salir contando con el salto—. Medido en nueve semillas, cuesta mover el
    nacimiento entre 8 y 15 casillas, que en un mundo infinito no es nada.

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

```bash
npm run typecheck && npm test && npm run smoke
```

**La CI confirma, pero no se espera** (decision del autor, 2026-09-29). Lo que
valida un cambio son estas pruebas en local, antes de empujar. Tras empujar se
informa al autor en el acto, diciendo que la CI esta en marcha, y la CI se mira
**al empezar el siguiente turno de trabajo**: si salio en rojo, se dice y se
arregla antes que nada. Esperarla costaba ~19 minutos de conversacion parada en
cada entrega. La skill `auditoria` si la espera, porque cierra una tanda.

**La CI va repartida** (`.github/workflows/ci.yml`): un trabajo para typecheck
y tests, y una **matriz con una maquina por pasada del humo** —`desktop`,
`resources`, `stations`, `mobile`, `devTools`, `life`, `relief`,
`highRefresh`— mas otra
para los gestos, todas a la vez; y un trabajo final, «CI completa», que solo sale
verde si todo lo esta. Cada pasada se lanza por el prefijo de su nombre
(`node tools/smoke.mjs life`). **Si anades una pasada al humo, anadela a la
matriz**, o no correra nunca en CI: el escaner de la auditoria lo cruza. Y el
humo sale en rojo si se le pide una pasada que no existe, para que una errata
en la matriz no sea una casilla verde que no prueba nada. Una casilla que falle
se relanza sola desde GitHub («Re-run failed jobs»).

**Y al cerrar cada tanda, la auditoria**: la skill `auditoria`
(`.claude/skills/auditoria/`, se invoca con `/auditoria`). Tiene un proceso fijo
por fases, diez lentes, un escaner automatico con autoprueba y un **registro de
escapes**. Parte del commit que marca «Ultima auditoria» en `docs/pendiente.md`.
Cada fallo que aparezca despues y que una auditoria pudo ver se anade a ese
registro, con el metodo que lo habria detectado, y ese metodo pasa al escaner o
a una lente: asi la skill mejora con cada cosa que se le escapa. Vive en el repo
a proposito: el contenedor muere con la sesion y la skill tiene que crecer.

`npm run smoke` construye el cliente y lo juega en Chromium headless leyendo el
estado real por `window.__verdant`. Los tests unitarios no detectan que el juego
no arranque; esto si. Hace ocho pasadas —escritorio, recursos (comer, sembrar,
minar), estaciones (mesa, horno, fundir y ropa), movil con toques sinteticos,
panel de desarrollo, muerte y noche, relieve, y pantalla de 144 Hz—; si tocas
los controles, todas tienen que seguir
pasando. Una sola se corre con `node tools/smoke.mjs <nombre>` tras `npm run
build`, por ejemplo `node tools/smoke.mjs mobile`.

**Los pestillos del mando se recogen solo en un frame que corre algun tick.**
La simulacion va a 60 Hz y la pantalla a lo que de; el bucle recogia salto,
accion, comer y sembrar en TODOS los frames, y los de un frame sin tick se
tiraban en silencio. A mas de 60 Hz eso es la mitad de los frames: el autor lo
vio jugando —«ataco o salto y a veces no lo hace, a veces ni al segundo
intento»— y un modelo del bucle lo midio en un 32 % de pulsaciones perdidas a
90 Hz, 50 % a 120 y 58 % a 144 (a 60, del 0,5 al 2,5 %). Estuvo meses sin que
el humo lo viera, porque el headless va a unos 13 FPS y ahi todo frame lleva
tick. La pasada `highRefresh` finge el reloj de `requestAnimationFrame` a 144
Hz y exige 30 de 30 golpes y 5 de 5 saltos; sin el arreglo da 10 y 0. **Lo que
dependa del ritmo de fotogramas hay que medirlo con el reloj fingido**, no con
el que tenga el headless.

Dos habitos del humo que conviene conservar. Lo que depende del paisaje se
comprueba **desde el nacimiento**, que es un rellano llano (regla 22), o
yendo a un sitio buscado a proposito con `?x=&y=`
(`probes.ts`); una comprobacion que depende de donde quedo el jugador pasa o
falla por suerte, y eso ya paso. Y que un boton **llega a la Intent** se mide
con los contadores `sent` de la sonda, no con su efecto: que sembrar plante
depende de tener semillas y una casilla que lo admita, y eso lo miden los tests
del nucleo.

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
de vida— sin DOM ni three.js, y `effects-view.ts` solo lo dibuja: asi la fisica de
las particulas se mide en Node. Avanzan con el tiempo **escalado**, de modo que
pausar los congela y 64x no inunda la pantalla.

Los colores de los escombros salen de `client/palette.ts`, la misma tabla con la
que `art.ts` pinta cada especie. Estan juntas a proposito: el encargo era que
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

**El 3D reutilizo `effects.ts` tal cual y solo puso el dibujado**
(`effects-view.ts`). Es la prueba de que el reparto estaba bien hecho: lo que se
reutilizo —donde esta cada escombro, cuanto le queda de vida, con que colores—
nunca fue de la camara isometrica, que es donde nacio.

Dos adaptaciones al pasar a tres dimensiones, y ninguna es capricho:

- **En el 3D un nivel mide lo mismo que una casilla**, porque `terrain-mesh.ts`
  usa la altura tal cual como coordenada Y; en el isometrico un nivel eran 16 px
  y una casilla 32. Asi que la altura entra directa y el TAMANO, que `effects.ts`
  da en pixeles del arte isometrico, se divide por 32.
- **Los escombros se apagan encogiendo, no desvaneciendose.** Cada uno tiene su
  edad y un `InstancedMesh` comparte material, asi que no hay transparencia por
  instancia; se aplica la misma curva de apagado a la escala. El barrido si se
  desvanece, porque son pocos y cada uno lleva su material.
- **El barrido se dibuja POR ENCIMA del mundo y MIRANDO a la camara.** Las dos
  cosas son la traduccion de una sola: en el isometrico el trazo vivia en
  `effectLayer`, una capa de pantalla sobre el mundo entero, y ahi nada puede
  taparlo ni escorzarlo. En 3D eso se compra con `depthTest: false` y con una
  cinta que se ensancha perpendicular a la linea de vision. Sin lo primero se lo
  come lo que haya entre la camara y el arco —un bloque, un arbol, el propio
  personaje—; sin lo segundo se ve de canto cuando su ancho cae a lo largo del
  rumbo desde el que se mira. Medido a 0.08 rad de elevacion: 104 pixeles
  aclarados contra 2 y contra 13.

  **El barrido recorre el BORDE CURVO DEL AREA REAL del golpe** (pedido del
  autor con el sector de la regla 12): el extremo de cada uno de sus 33 rayos,
  ya cortados por el terreno, asi que donde el sector entra en el suelo o en una
  pared el trazo se pega a el (`slashEdge` en `effects.ts`, puro). No se
  recalcula nada: es el mismo golpe que decidio la simulacion. Sale de los ojos
  en las tres vistas, siempre, haya algo que golpear o no —es el gesto, no el
  resultado—, y se congela en el mundo al nacer. En primera persona, a 2,5
  bloques de los ojos, lleva medio ancho 0,04 (deduccion mia); en tercera, 0,06:
  los 3 px del isometrico con la casilla a 32, redondeados al alza desde 0,094
  porque PixiJS suavizaba el trazo y este lienzo va sin antialias. Antes fue un
  arco fijo delante de la mirada, y antes aun iba clavado a las casillas.

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
que algo llega a pantalla hay que contar **pixeles**: `npm run slash` para
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
lanza» de «se lanza y no se dibuja», que era justo el caso. Ahora el dibujado
lleva un acumulador de slashes **trazados** (`EffectsView.slashesDrawn`) y el
humo afirma que crece. Una comprobacion que puede pasar por suerte es peor que una que
falla.

**Y la moraleja de la moraleja: cuando se arreglo el slash, la comprobacion de
los ESCOMBROS se quedo como estaba** —preguntando por la lista de particulas
vivas, una linea mas abajo, con el arreglo del slash comentado justo encima—.
Aguanto varias tandas y un dia el runner de CI perdio la moneda: 221 slashes
trazados y cero escombros, con el mismo golpe soltando diez unas lineas mas
abajo, donde el tiempo esta congelado. Un escombro vive entre 0,6 y 1,1 s, el
runner va a 4-6 FPS y el sondeo cae cada 420 ms: no habia por que acertar. Ahora
hay `EffectsView.debrisDrawn`, gemelo del otro. **Al arreglar una comprobacion de
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

Las superposiciones de depuracion (rejilla de chunks y contorno de biomas) van
en `overlays.ts`, en coordenadas **del mundo** y pegadas al suelo de cada
esquina. En el isometrico se calculaban en pantalla y ahi tuvieron sus dos
fallos —el origen del chunk sumado dos veces, que sacaba el dibujo un chunk en
diagonal y en el chunk (0,0) valia cero, y las costuras sin dibujar—; en 3D el
primero desaparece por construccion y el humo sigue midiendo que ningun
segmento caiga fuera de su chunk. La geometria del contorno vive aparte en
`biome-edges.ts`, sin three.js, para poder verificarla en Node, y mira el vecino
de la costura con `world.gen` para no registrar chunks por mirar.

**La mirada es la de la camara, asi que la reticula tambien.** Marca **donde
toca la mirada**: en verde la casilla de suelo, y en blanco la cara de la pared
si toca un costado del terreno (pedido del autor, 2026-09-30). Sale de
`aimSurface`, lo mismo que decide donde se siembra y se coloca. Hasta entonces
marcaba tambien los objetos que el golpe alcanzaba; el autor lo quito.

La congelacion empieza puesta al abrir el panel y solo se aplica con el panel
abierto (`DevTools.survivalFrozen` es un getter, como `timeScale`). Sin ella las
herramientas no sirven para lo que se hicieron: a 64x se pierden unos 13 puntos
de hambre por segundo real y saltar un dia vacia el hambre entera, asi que el
boton mas util del panel era el que mataba.

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
solucion son los sprites de cuatro u ocho direcciones, que siguen pendientes.

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
(`cornerHeight` de `terrain-mesh.ts`, que tampoco registra chunks vecinos). Como
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
esto: recorre el borde del sector del golpe (ver «Efectos visuales»).

Y una consecuencia que es de juicio del autor, no medible: **el relieve se lee
menos de la mitad de alto**. Una pared de un bloque pasa de llegar al pecho a
llegar a la rodilla, y una cima de 27 niveles de medir 34 personajes a medir 14.
La fisica no cambia ni un decimal, pero los 16 px por nivel se calibraron a ojo
en el isometrico, que era donde un nivel se media en pixeles.

## El relieve

El mundo tiene altura desde `packages/sim/src/relief.ts`: hasta 41 niveles,
escalon de 0.06 de elevacion, y `groundHeightAt` devuelve la altura real de un
punto con decimales. **El relieve estorba** desde la fase 2: hay gravedad, salto
y caida, y ya no se cambia de nivel andando (regla 21).

**En el 3D un nivel mide lo mismo que una casilla**: `terrain-mesh.ts` usa la
altura tal cual como coordenada Y, asi que los bloques son cubos. En el
isometrico un nivel eran **16 px**, `TILE_W / 2`, la arista vertical de un cubo
en una 2:1; estuvo en 8 y el autor lo noto a la primera —los bloques se veian
como baldosas—. Es el mismo cubo por los dos caminos.

Las cordilleras amplifican el desnivel **anclando en el nivel del mar**: bajo el
agua `reliefAt` es identica a `elevationAt`, y por eso meter montanas no obligo a
recalibrar la costa, que son los tres umbrales mas delicados que hay. Los de
altitud si se recalibraron, pero **sumando** reglas a las viejas en vez de
sustituirlas, para no mover el mundo llano ni un tile.

Las teclas: WASD o flechas andan, **Espacio salta** (decision del autor en la
fase 2), Shift enciende la carrera, **E abre el inventario**, 1-4 eligen lo
que se lleva en la mano, y tambien la **rueda del raton**, que la recorre (hacia
abajo, la siguiente; da la vuelta), R empieza un mundo nuevo, **+ y - acercan y
alejan** —solo ellas: la rueda dejo de hacer zoom el 2026-09-29, decision del
autor—, y P cambia de proyeccion. **Esc con el inventario abierto lo cierra**
sin pausar. **TAB cambia el modo de golpe** (barrido o preciso) y **CTRL
mantenido suelta el raton** para pulsar botones sin pausar (las dos, del autor,
2026-09-30). **Clic izquierdo golpea y clic derecho usa** lo que se
lleva en la mano: una baya se come, una semilla se siembra. **Con el inventario
abierto no se golpea ni se usa**: solo se anda (y se salta, deduccion mia).
Los controles se leen dentro del boton de informacion (i). Comer (E), sembrar
(F), el inventario (I) y fabricar (C) tuvieron tecla propia hasta el 2026-09-28,
cuando el autor lo cambio a esto; cambiar una tecla que funciona para meter
otra no es decision del agente.

**Correr es un INTERRUPTOR**, tambien decision suya: se enciende con Shift o con
el boton del movil y se queda encendido hasta que se vuelva a pulsar. No es una
tecla que se mantiene, y la razon es el telefono — con un pulgar en el joystick
y otro en la camara no sobran dedos para sostener nada. Por eso lleva **estado
visible** en los dos sitios: el boton se ilumina y, con teclado, la ayuda dice
«ACTIVADO». Un interruptor sin indicador deja al jugador adivinando por que el
personaje va como va.

Y por eso mismo desaparecio el acelerador analogico (regla 5): la velocidad la
elige el interruptor, no lo desplazado que este el pulgar.

**En PC la mirada va con el raton, y soltar el cursor pone el juego en
pausa** (decisiones del autor, 2026-09-28; `pointer-lock.ts`). Hacia donde se
mueve el cursor se mueve la vista, en las tres vistas —raton arriba es mirar
arriba en todas, `camera.turn`—, y para eso el navegador **captura** el cursor
(Pointer Lock), que Esc suelta siempre. De ahi sale todo:

- **Pausa el cursor que suelta el jugador**, no el que suelta el juego. El Esc
  del jugador en pleno juego para el tiempo (escala cero, como la pausa del
  panel de desarrollo), con el aviso «Juego en pausa». **Arranca asi**: el
  navegador exige un clic para capturar. Con el cursor suelto se pulsan los
  botones (ojo, HUD, inventario, barra del angulo).
- **El cursor que suelta el juego no pausa** (`MouseLook.free`): el
  inventario, el panel de desarrollo, CTRL mantenido y la muerte. Al cerrarlos
  se intenta capturar; si el navegador no deja, **se sigue jugando** con el
  cursor suelto —se anda, pero el raton no gira la vista— hasta el primer
  clic, que captura sin golpear.
- **Un clic en la pantalla captura y reanuda, y ese clic no golpea.** Ya
  capturado, el clic izquierdo golpea en el acto, al apoyar: no hay arrastre
  que distinguir. **Esc no reanuda**, y no por gusto: Chrome no cuenta Esc
  como gesto para volver a capturar el cursor, porque es la salida de
  emergencia del jugador. El autor eligio que solo el clic reanude.
- **Esc con el inventario abierto lo cierra sin pausar.** Se intenta
  recapturar, pero **Chrome no deja**: Esc no cuenta como gesto. Esto decia lo
  contrario —«el cursor lo solto el juego y Chrome deja»— y el autor vio el
  juego pausarse (2026-09-30); el headless SI recaptura, y por eso el humo
  nunca lo vio. Ahora el humo le quita la captura a mano antes del Esc para
  probar justo ese caso. De ahi el cursor suelto sin pausa de arriba.
- **El menu del navegador no sale nunca**: `contextmenu` se anula en todo el
  documento. Con solo el lienzo, el clic derecho que abre una estacion dejaba
  caer el suyo sobre el panel recien abierto bajo el cursor.
- **Una cruz en el centro de la pantalla**, en las tres vistas y en PC y
  movil: como las tres comparten la mirada, el centro es justo hacia donde se
  mira y se golpea.
- El **inventario** (E) y el **panel de desarrollo** (F3) sueltan el cursor
  pero **no pausan**: abrir el inventario no pausa por decision del autor, y el
  panel tiene su propia pausa y sirve para ver pasar el tiempo; con el panel
  abierto se sigue arrastrando para girar, como antes. Al cerrarlos se intenta
  capturar otra vez (una tecla cuenta como gesto; Esc no, ver arriba).
- Solo con puntero fino y hasta el primer toque de verdad (`mouseMode`): el
  movil no cambia, y un portatil tactil jugado con el dedo no se congela.
- Muerto, el cursor se suelta para poder pulsar «Reiniciar», y reiniciar lo
  vuelve a capturar.

Deducciones mias, en `docs/pendiente.md`: la sensibilidad (`MOUSE_TURN`,
0,0025 rad por pixel), que un clic sea un golpe sin repetir, lo de la muerte, lo
del tactil y los textos del aviso.

**El primer movimiento tras capturar se descarta**: Chrome manda un salto
espurio —en headless, el recorrido entero hasta el centro de la ventana— y,
medido, llega ANTES que `pointerlockchange`, asi que se detecta en el propio
`mousemove` (el primero con el cursor capturado). Sin eso, capturar giraba la
vista 90 grados; el humo afirma que capturar no mueve la mirada. Y ojo al
probarlo: **el headless de Chromium si captura, pero sus movimientos
sinteticos no sirven** —cada `mouse.click` salta desde el centro y vuelve— y
**Esc no suelta**. El humo manda `mousemove` con `movementX/Y` a mano, suelta con
`document.exitPointerLock()` y manda los clics de golpe al lienzo a mano, porque en headless cada
`mouse.down`/`up` capturado lleva pegado un movimiento espurio que gira la vista.

**Con el cursor libre —el panel de desarrollo abierto— la accion
es el clic izquierdo, y ahi hay un conflicto que resolver:**
ese mismo boton gira la camara arrastrando. Se decide **al soltar** —lo que no se
ha movido mas de `TAP_SLOP` era un clic; lo que si, era un arrastre y ya giro la
vista—, y se mide contra el ORIGEN quedandose con el maximo, para que ir y volver
siga contando como arrastre. La regla vive en `gestures.ts`, que es puro,
y `tests/gestures.test.ts` la afirma. En tactil no hay tal conflicto: acciona el
boton, y un dedo sobre el mundo gira la camara y nada mas.

**La pantalla del movil es la del boceto del autor (2026-09-28).** Abajo, el
**ATAQUE**, el mas grande, en la esquina derecha, que es donde cae el pulgar en
reposo; **USAR** a su izquierda, apoyado en su mismo borde de abajo; y
**CORRER** y **SALTAR** en columna encima del ataque, alineados a su borde
derecho. Los **anillos de salud y hambre** van abajo a la izquierda.
Arriba, **OTROS** a la izquierda, la **barra de la mano** en el centro exacto
(sus casillas encogen en pantallas estrechas para no pisar a los redondos) e
**INVENTARIO** a la derecha; OTROS despliega **en columna debajo de el** el
ojo, el HUD y el entorno, y se cierra tocando fuera. **Los botones son solo
iconos**, sin rotulo (decision del autor, 2026-09-29): una mano abierta en
USAR, espada y pico cruzados en ATAQUE, una **mochila de explorador** en
INVENTARIO (asa, solapa con dos cierres y bolsillos, casi tan ancha como alta
y mas grande que los otros iconos, como el adjunto del autor del 2026-09-30),
tres barras en OTROS, y CORRER y SALTAR con su glifo; el nombre va en
`aria-label`. Los dibujos son mios. Y **MODO** (2026-09-30), mas pequeno que
USAR y en la diagonal de arriba a la izquierda del ataque: un toque cambia de
modo de golpe, su icono dice cual —un tajo para el barrido, una mirilla para
el preciso— y **se enciende al pulsarlo**, como USAR y SALTAR (en PC tambien,
y con TAB). Sustituyo al racimo en fila
—accion, salto, carrera, comer y sembrar, ordenados por el borde— y a los
botones de comer y sembrar, que ahora son USAR con la baya o la semilla en la
mano. Los tamanos son mios.

**La barra de abajo de PC es el boceto del autor (2026-09-30)**: MODO, una caja
**centrada al pixel** con el **anillo del hambre**, la **barra de la mano** y el
**anillo de la salud**, y despues INVENTARIO y un hueco (`#barExtras`) para los
botones que vendran; MODO e INVENTARIO miden lo mismo. Tres columnas con las de
los lados iguales, que es lo que centra la caja midan lo que midan los botones.
**Los anillos se vacian en sentido horario**: lo gastado crece desde las 12
(`ring.ts`, puro y con su test). En el movil esas piezas se sacan de la caja
con `display: contents` y vuelven a su sitio: la barra y el INVENTARIO arriba,
y **los anillos, los mismos elementos**, en la esquina de abajo a la izquierda.

**Salud y hambre son anillos tambien en el movil** (decision del autor,
2026-09-30; antes, una franja de barras): uno al lado del otro, pegados a la
esquina de abajo a la izquierda y apoyados en el borde de abajo de ATAQUE y
USAR, de 80 px, entre los dos de tamano. No cogen dedos, porque esa esquina es
la del joystick. **La zona del joystick** es ese rincon (decision del autor,
2026-09-30): del borde izquierdo al derecho del anillo de salud, y de abajo a
la mitad de la altura de CORRER; fuera, un dedo gira la camara. `controls.ts`
la mide en cada toque y `gestures.ts` decide con ella; sin medir, el
cuadrante inferior izquierdo de antes. Siempre a la vista y sin rotulos: un corazon y unos cubiertos
—fueron un muslo de pollo hasta que el autor dibujo cubiertos—. Lo que vive
abajo (el registro, el panel de desarrollo) se apoya encima con la variable
CSS `--above-vitals`.

**El HUD y el inventario arrancan cerrados**, tambien decision suya. El HUD
(hora, dia, semilla, posicion, FPS y, en PC, los controles) se abre con su
boton —arriba a la izquierda en PC, dentro de OTROS en el movil— y **no tiene
tecla**; el inventario, con **E** o el boton INVENTARIO. Cerrados no se escriben: el
DOM se refresca diez veces por segundo y no hay por que pagarlo por lo que no
se ve.

**Y ese racimo no se ve en PC**, tambien decision suya: son controles de pulgar y
con teclado sobran, porque Shift, Espacio y el clic izquierdo ya hacen lo mismo.
El mecanismo —`.touch-active` en el `body`, que pone `controls.ts` si el puntero es grueso y, si no, al primer toque
de verdad—. **Esa segunda via no es adorno**: un portatil tactil declara puntero
fino, asi que sin ella sus botones no apareceran nunca, y como `hasTouch` de
Playwright ya hace que Chromium declare puntero grueso, medirla obliga a fingir
uno fino (`tools/slash.mjs` lo hace, y afirma «oculto al cargar, visible
tras tocar»).

La excepcion es **el ojo**, que cambia de proyeccion y en PC se ve siempre,
arriba a la derecha: nacio siendo el unico control sin tecla anunciada (en PC la
ayuda ya anuncia la P). En el movil vive dentro de OTROS, y su barra del angulo
sale hacia donde hay sitio: hacia la izquierda con el ojo pegado al borde
derecho, hacia la derecha si cabe, y si no, justo debajo del ojo (deduccion mia;
dentro de OTROS se abria encima del propio ojo y el dedo lo pisaba). Va en SVG y no en emoji —`👁` se pinta a color y distinto en cada
sistema— y **dice cual esta activa con su propia forma**: abierto en perspectiva,
que tiene fuga, y entrecerrado en ortografica, que lo aplana todo. Lo eligio asi
el autor entre tres opciones; el simbolo cuenta la diferencia en vez de limitarse
a senalar que hay un interruptor.

**La vista de arranque es la perspectiva**, que es la que el autor eligio para el
juego final tras probar las dos en su telefono. El interruptor se queda porque la
ortografica conserva el aspecto plano del isometrico y sirve para comparar.

**El ojo recorre tres vistas: perspectiva → isometrica → primera persona**, con
el boton o con P. La primera persona la pidio el autor despues, con estas
decisiones suyas: el ojo lleva un **punto de mira** en esa vista; arrastrar
**hacia arriba es mirar arriba** —el dedo lleva la mirada—; y la pinza es un
**catalejo temporal**, que
estrecha el campo de vision y al soltar vuelve. En la interfaz la ortografica
se llama «isometrica», que es como la llama el autor.

**El angulo de vision de la primera persona se ajusta en el juego**, con una
barra de **70 a 120 grados** (fue de 50 a 100 hasta el 2026-09-29) que sale desde detras del ojo, una marca cada 10 y
los grados a su izquierda; **70 por defecto**. Todo eso y como se abre y se
cierra es del autor (2026-09-28), y **solo existe en primera persona**. En
**PC** se abre al **pasar el raton** por el ojo, sin clic, y salir no la
cierra; en el **movil**, con un **toque sostenido de mas de 0,5 s** (fue 1 s hasta el 2026-09-29), y al soltar
no cambia de vista. Un toque corto en el ojo cambia de vista como siempre y la
cierra aunque estuviera abierta; cualquier accion —una tecla, la rueda, apoyar
el raton o el dedo fuera de ella— tambien. Por eso al ojo no lo cierra su
`pointerdown` sino su `click`: si no, sostenerlo con la barra abierta la haria
parpadear. El angulo **se recuerda** en el navegador de cada dispositivo
(`localStorage`, solo comodidad) y **el catalejo parte de el**. La logica va en
`fov-panel.ts`; el toque sostenido lo comprueba `tools/gestures.mjs` con toques
de verdad, porque tras sostener un dedo el navegador aun manda su `click`, y
sin tragarselo se cambiaba de vista al soltar (medido: con el clic sin tragar,
cae). Son grados **verticales**, como siempre.

**Las tres comparten la mirada ENTERA** (decision del autor, 2026-09-28): el
mismo pivote —los ojos del jugador, `EYE_HEIGHT = 1,75` en el nucleo, que es
tambien el origen del golpe— y la misma direccion, rumbo e inclinacion, que es
la direccion en que mira el jugador. La primera persona esta en el pivote; la
perspectiva y la isometrica, **detras de el sobre la linea de la mirada y
mirandolo**, asi que el centro de la pantalla es siempre hacia donde se mira y
cambiar de vista no mueve la mirada. Antes cada vista tenia su inclinacion
(`fpPitch` aparte) y la orbital miraba a 1,6: al compartir la mirada, una sola.
**La isometrica tambien la comparte**, por decision del autor. Y **arrastrar
hacia arriba es mirar arriba en las tres**, como el raton en PC: en las
orbitales el arrastre vertical «agarraba el mundo» hasta el 2026-09-30, cuando
el autor lo pidio igual que en PC.

**Y la tercera persona mira hacia arriba**, pedido del autor: la camara baja por
detras, y para eso **choca** (`camera-collision.ts`, puro). Un rayo desde los
ojos hacia donde iria la camara se para 0,3 antes del primer choque con el
**terreno** que se dibuja o con un **hitbox** —el del arbol es su tronco, asi que
la camara pasa entre las copas—. La isometrica se pone a 60 como mucho (su
tamano no depende de la distancia) y su plano cercano paso de −400 a 0,05, para
que lo que queda detras de una camara empujada no se pinte delante; el de la
perspectiva, de 0,5 a 0,1, porque la camara puede quedar a un palmo del suelo.
Con la camara a menos de 1 bloque el sprite del jugador se oculta. Los rayos no
salen de los chunks cargados: el mas largo mide 60 y se carga radio 3 de 32.

**Consecuencia a saber**: como la mirada pasa por los ojos del jugador, en
tercera persona **el personaje tapa el centro de la pantalla**, que es justo
hacia donde se golpea. Un encuadre «por encima del hombro» lo resolveria, y es
decision del autor.

El cuerpo del jugador no se dibuja desde dentro. Los numeros —ojos a 1,75, la
inclinacion de arranque −0,62 (los 35 grados de la perspectiva de siempre), el
tope de ±83 grados, catalejo hasta 15°, la vuelta del
catalejo con raton a los 0,8 s, el margen de 0,3 y los topes de la colision— son
deduccion mia; estan en `docs/pendiente.md`.

**Una medida de «se ve» tiene que mirar donde esta lo que mide.** `npm run
slash` cuenta los pixeles aclarados en una caja central, y en primera persona
el barrido arranca en la esquina de arriba a la derecha y cruza la vista entera:
un rumbo daba cero o 2.545 segun el momento del trazo que pillara la captura, con
el trazo perfectamente visible en la esquina. En primera persona mide ahora el
ancho entero sin las franjas de botones, y da 9.000-19.000 en los cuatro rumbos.
(Antes de que el barrido fuera delante de la mirada habia otro cero de mentira:
rumbos donde solo se alcanzaba la casilla propia y no habia arco que trazar.)

Ojo con una diferencia entre los dos mandos, que es deliberada: **el boton repite
al mantenerlo** (cuatro veces por segundo, la cadencia de siempre) y **el raton
no** —un clic es una accion—, porque mantener pulsado el raton significa
arrastrar la camara y no se puede saber si es accion hasta que se suelta.

**Y el dedo que mantiene ACCION gira la camara si se arrastra**, sin soltar la
accion: pedido del autor, y con la mirada de la camara eso es barrer alrededor.
En `gestures.ts` es un tercer dueno, `'actionLook'`, que gira como un dedo de
camara pero **no cuenta para la pinza** —si contara, el dedo de la accion mas
uno de camara harian zoom solos— y no empieza a girar hasta pasar `TAP_SLOP`,
para que el pulgar que solo mantiene no de tirones (el umbral es deduccion mia).
Los `touchmove` se escuchan en el propio boton, que los sigue recibiendo aunque
el dedo salga de el, y con un dedo `pointerleave` ya no suelta la accion.

**La prueba de ese gesto va con toques de verdad** (CDP
`Input.dispatchTouchEvent` en `tools/gestures.mjs`), no con `PointerEvent`
sinteticos: los sinteticos entran directos al lienzo y se saltan lo que el
navegador decide sobre un dedo que nace en un boton. Muerde: sin el `touchmove`
del boton, cae.

Numeros del autor, que no se tocan sin preguntarle: el escalon (0.06), los 16 px
por nivel, el 15 % de fronteras que son rampa y el tope de 40 niveles. El umbral
de salientes y la ganancia de cordillera, en cambio, son calibraciones: se eligen
midiendo (regla 14).

El salto, ya implementado: parabola simetrica con el apice **a una casilla
exacta** y alcance dos andando, y el agua es muro tambien volando. **El salto
solo empuja hacia arriba y en el aire se anda como en el suelo** (decision del
autor, 2026-09-30): a la velocidad de andar o de correr, girando lo que se
quiera, y sin mando no se avanza. Hasta entonces conservaba el impulso del
despegue y admitia un 30 % de desviacion. Andar y volar solo se distinguen
en el margen de subida (regla 21). Medido con la
integracion exacta: apice 1.160 niveles contra 1.161 en papel, alcance 2.17
casillas a paso completo, vuelo 0.400 s. `GRAVITY = 62` y `JUMP_SPEED = 12` son
**deduccion del agente** a partir del caso que describio el autor, no numeros
suyos: puede corregirlos, y `tests/jump.test.ts` afirma la relacion que los ata.

**El hambre gasta segun el esfuerzo** (decision del autor, 2026-09-30;
`systems/survival.ts`): quieto o andando se vacia en `HUNGER_EMPTY_DAYS` dias
de juego —uno—, y el ritmo **se deriva de `DAY_TICKS`**, para que si el dia
cambia de duracion el hambre lo siga; corriendo y avanzando, por
`RUN_MULTIPLIER`, el mismo factor que la velocidad, y con la carrera encendida
pero quieto, como quieto; y cada salto que despega cuesta `JUMP_HUNGER`, un 1 %.
Lo de «avanzando» se mide en el tick comparando la posicion antes y despues de
moverse (deduccion mia: empujar contra una pared no es correr). Todo respeta
`survivalFrozen`, y `skipTime` gasta como quieto.

## Recoleccion y fabricacion

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
- **Se desgastan y se rompen.**
- **16 casillas con pilas de 100** (`sim/inventory.ts`), y la ropa las amplia:
  la bolsa en la cintura, +2; la mochila en la espalda, +6. Se arrastran a su
  hueco de PERSONAJE, y **no se quitan con sus casillas ocupadas**.
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
  Bayas», en letra pequena debajo del boton INVENTARIO en el movil y abajo a la
  derecha en PC. Cada linea sube despacio mientras se desvanece, las nuevas
  van debajo y **nunca hay mas de cinco**: al llegar la quinta, la mas vieja se
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
  con `state.lastHits` del nucleo), y **no hay barra de progreso**.
- **La roca a mano no da nada**: la primera piedra son **guijarros** sueltos
  en el suelo, una feature inerte y finita que no estorba el paso.
- Lo basico se fabrica a mano en cualquier sitio; lo mejor, en la **mesa de
  trabajo** o el **horno** (tanda 2). Se colocan con USAR, son **cajas**, no
  aspas, estorban el paso y se desmontan a mano en 3 golpes. **Sus recetas no
  salen con E**: USAR mirando la estacion abre el mismo panel con las suyas, y
  se cierra solo al alejarse a mas de 3 casillas. Fundir es una receta mas del
  horno.

Lo que el codigo tiene que respetar:

- **Un botin entra entero o no entra** (`Inventory.fits`): si no cabe, el golpe
  no completa y el objeto se queda en el mundo, con su dano, para acabarlo en
  cuanto haya sitio. Nada se reparte a medias ni se pierde.
- **El dano acumulado y las ramas arrancadas viven en `WorkState`**, fuera del
  chunk como el overlay (regla 4). El dano se pierde a los `DAMAGE_DECAY_TICKS`
  sin golpear; las ramas se reponen **por el tiempo transcurrido**, no por
  pasos, asi que vivirlo y saltarlo con `skipTime` da lo mismo (hay test).
- **`harvestTile` es la primitiva que completa**, sin golpes ni herramientas;
  la usan `tryHarvestArea` y los tests del ecosistema.
- **Las estaciones viven en el overlay** (regla 4): el mundo no las genera
  nunca, son inertes para el ecosistema (`lifeKindOf` da `null`) y desmontarlas
  las devuelve enteras por `harvestOf`. **Donde sirven lo decide una sola
  funcion**, `stationNear` (`sim/stations.ts`): el nucleo la usa para aceptar
  una receta y el panel para cerrarse, asi que lo que la interfaz deja intentar
  es lo que el nucleo acepta. La caja que se dibuja (`stations-view.ts`) mide
  lo que su hitbox (`STATION_BOXES`), como el tronco de los arboles.
- **La ropa abre tramos fijos** detras de las 16 casillas: la cintura el suyo
  y la espalda el suyo, aunque solo se lleve una prenda. Un tramo cerrado no
  existe para meter, sacar ni arrastrar (`Inventory.isOpen`). Los huecos de
  ropa tienen indice de arrastre propio (`EQUIP_WAIST`, `EQUIP_BACK`), asi que
  ponerse y quitarse viajan en la `Intent` como mover. Lo puesto **cuenta en
  `totals()`** —equiparse no es «-1 Mochila» en el registro— **pero no en
  `count()`**: una receta no se lo gasta.
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
  **PERSONAJE** es el segundo boceto del autor, en PC y en el movil: el dibujo
  en medio, tres equipables a cada lado y cuatro debajo (apagados hasta la
  ropa). **PERSONAJE e INVENTARIO** llevan abajo la zona de lo seleccionado y
  su descripcion, del mismo tamano y a la misma altura. En el movil **no se
  desliza el panel entero**: pestanas, zona de lo seleccionado y categorias
  de recetas se quedan fijas, y solo se deslizan la rejilla del inventario o
  la lista de recetas, centradas; las categorias, cuando sean mas, a los
  lados. El humo lo mide pagina por pagina.
- **Arrastrar se prueba con toques de verdad** (`tools/gestures.mjs`): dentro
  de la barra con el inventario cerrado (y al vacio, sin tirar), de casilla a
  casilla y de la rejilla a la barra, y mantener una receta 1,5 s. En PC lo
  hace el humo con el raton, confirmacion de tirar incluida.

Para probar sin juntarlo todo a mano, el panel de desarrollo tiene
**«Materiales de piedra»**: da materiales, no herramientas, para que fabricar
se pruebe de verdad. El humo lo usa para minar con un pico fabricado desde el
panel.

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
