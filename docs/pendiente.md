# Lo que está por hacer, y el registro de lo aprendido

Este fichero existe porque las notas de trabajo del agente viven en un contenedor
efimero y **mueren con la sesion**. Lo que hay aqui son decisiones del autor y
deuda tecnica que ninguna sesion nueva podria reconstruir leyendo el codigo.

Lo permanente del *como* esta en `CLAUDE.md` y en los documentos de `docs/` que
indexa (desde el 2026-10-02, cada parte del juego en el suyo); las leyes del mundo, en
`docs/el-libro-del-mundo.md` y `docs/leyes.md`.

**Ultima auditoria: commit `8e9269e`, 2026-10-20** (la pala y las menas de
voxeles, desde `4151766`). La proxima parte de aqui: ver
`.claude/skills/auditoria/` y «Auditoria al cerrar la pala y las menas de
voxeles», mas abajo.

**Como leerlo.** Desde el 2026-10-10 son tres ficheros, partidos como se partio
`CLAUDE.md` el 2026-10-02 y por lo mismo: este se lee al empezar cada tanda, y
llego a 123 KB (≈ 35.000 tokens) que viajaban en cada llamada. **Nada se
reescribio: cada seccion se movio entera y literal.**

1. **Este fichero, entero, al empezar**: la tanda en curso —lo que el autor ya
   eligio y aun no es codigo—, la ultima auditoria, lo que el autor aparco o
   tiene que mirar, y las medidas que costaron caro.
2. **`docs/juicio.md`, «Esperando tu juicio»**: las decisiones que tomo el
   agente por deduccion y que el autor puede corregir. **No hace falta leerla
   entera**: antes de tocar una parte, busca en ella sus filas (por el nombre de
   la parte o del fichero). Las deducciones nuevas se anaden alli.
3. **`docs/historia.md`, las tandas cerradas**: que se hizo, que se midio y que
   aparecio por el camino. Es historia que el codigo no cuenta; se consulta
   cuando algo remite a ella, no se lee de corrido. Al cerrar una tanda, su
   seccion «HECHA» se mueve alli entera.

---

## Tanda siguiente, para la primera sesion local: CI sin duplicados y lo pesado dos veces por semana

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

---

## El norte del proyecto: sin motor grafico (2026-10-24)

El autor quiere desarrollar Verdant en serio y se planteo pasar a Unity o
Unreal. **Decidido por el autor:**

- **Sin motor grafico**, y sin probar Godot: se sigue con TypeScript y
  three.js. Objetivos: **PC primero** (lanzamiento), luego movil; consolas,
  despues del lanzamiento. **El multijugador pesa tanto como el solitario**
  («como Minecraft»). El equipo: el autor solo, con agentes.
- **Se trabaja en local**, en su PC, con recarga en caliente (`CLAUDE.md`,
  «Arranque»).
- **Version de pruebas publicada en `/pruebas/`** (`deploy.yml`,
  `docs/pruebas.md`).

**Lo que motivo la revision, medido:** el ciclo «tanda pedida → jugarla» no lo
frena escribir codigo, sino la CI (7-9 min por pasada, y el mismo commit corria
dos o tres veces: `pruebas`, la rama `claude/…` y `main`) y que solo `main` se
publicaba. Y **el movil va peor tanda a tanda**, sin nada que lo vigile.

**Abierto, para el autor:**
- **Rust para el nucleo**: propuesto **no portarlo ahora**. El tick de la
  simulacion no es lo que frena el movil; lo es el dibujo. El cliente sigue en
  TypeScript, y el servidor del multijugador en Node puede importar el mismo
  `packages/sim`, que es lo que promete la regla 1. Rust queda como la salida ya
  prevista (el umbral de 8 ms), modulo a modulo detras de la misma interfaz.
- **Medir el movil en un telefono de verdad** antes de optimizar: que lo frena
  (las ~700 draw calls de `docs/arte.md`, el relleno, la geometria, el hilo
  principal).
- **Que la CI no corra en las ramas `claude/…`**: aprobado, con la CI
  completa y la auditoria dos veces por semana. Ver la tanda siguiente.
- **El empaquetado**: Tauri o Electron para Steam y Capacitor para movil. Se
  decide cerca del lanzamiento.

---

## Auditoria al cerrar la pala y las menas de voxeles (2026-10-20)

**El alcance**: de `4151766` a `8e9269e`: el boceto de los minerales, las
menas al juego, romper el terreno y la tanda de la pala, enteros en
`docs/historia.md`. Con la lente nueva, **K, buenas practicas** (pedida por el
autor este dia).

**Corregido:**
- **El compilador, mas estricto** (lente K): `noUnusedLocals` y
  `noUnusedParameters`, encendidos. Sacaron 16 restos sin uso: imports de
  modelos sustituidos (en la recoleccion, `treeTrunkAt`, `rayBox`,
  `stationHeight`…), un parametro `world` que los efectos ya no leian, la
  constante `SQUARE` de las casillas y un indice suelto en los bordes de
  bioma. Y el escaner vigila que sigan encendidos (categoria «Practicas»).
- **La camara atravesaba media estacion** corrida medio bloque: buscaba cada
  caja solo en su casilla. Ahora mira tambien las vecinas al oeste y al norte;
  igual el modo TAP, que usa el mismo rayo. Con su test.
- **El barrido se dibujaba mas largo que el golpe**: se volvia a medir
  despues del paso, cuando lo roto ya no cortaba su rayo. Ahora el nucleo
  cuenta los rayos del golpe (`lastStrikeRays`) y el cliente los dibuja.
- **Lo que solo sostenian los tests**: los escombros de una mena (no se
  rompe ninguna con escombros desde que son terreno) y `Surface.front` (lo que
  se coloca va delante de la cara, desde la rejilla de 0,5). Fuera, con sus
  textos.
- **Tests que no decian lo que afirmaban**: las reglas de los cristales se
  median sobre la roca de siete voxeles, que ya no es una mena: ahora sobre la
  formacion de ocho, enterrada y cavada. «Requieren herramientas para
  recolectarse» ya no miraba que se recolectara: ahora, el carbon que suelta.
  «Una casilla cubierta» no se probaba; «la generacion sigue pura» comparaba
  un chunk consigo mismo (ahora, con otro generado despues de sus vecinos); y
  el preciso a 40 grados sin su control.
- **Comentarios y documentos del modelo viejo**: el terreno «con cualquier
  cosa», las menas con caja y con escombros (`docs/arte.md`,
  `docs/efectos.md`, `docs/juicio.md`), el golpe «cortado por el terreno»
  (`aim.ts`, `strikeOf`), lo que pesa una mena (medido otra vez: enterrada,
  400 vertices; cavada, 880), las palas en la guia de arte y en las leyes.
- **Numeros sin nombre**: `ORE_SALT`, `BODY_REACH`, y `VOXELS_PER_TILE` en
  vez de un `* 2`.

**Mutado** (caen las 5 en local): la camara sin vecinas, el barrido sin los
rayos del golpe, colocar sobre lo cubierto, la mena sin botin y los cristales
bajo tierra.

**Ejecutado**: el escaner y su autoprueba; typecheck y los 650 tests;
`npm run shots`, `tools/analyze-world.ts` (en su presupuesto) y el generador
de pixelart (a otro fichero, sale identico); las pasadas `mobile` y `dig`.

**Para ti** (cambian lo que hace el juego; no se tocaron):
- **Las menas aun cuentan como solidas para nacer y medir el mundo**
  (`blocksBody`): sin caja, se pisan, pero el nacimiento y la conectividad las
  evitan. Quitarlas cambia donde se nace en algunas semillas.
- **Lo que vuela hacia ti atraviesa el terreno**: desde que no se suelta por
  distancia, persigue en linea recta aunque haya una pared en medio. Y si
  mueres con algo volando, se queda quieto en el aire hasta que caduca.
- **La estocada del preciso no se para en un animal**: la simulacion si le
  pega al primero, pero la linea que se dibuja sigue hasta el terreno o el
  objeto de detras.

**Un fallo suelto en la CI de `main`, sin causa encontrada**: la pasada
`desktop` cayo una vez en «el registro no va encima de INVENTARIO» (run
39472539170, una maquina lenta: la pasada tardo 411 s). La linea «+5 Bayas»
ya estaba fuera de la pagina en el primer fotograma tras nacer (`y0` 0,
`alive` false), y su vida no puede acabar en un fotograma (`dt` con tope de
0,25 s). Paso en `pruebas` con el mismo arbol y al relanzarlo. La auditoria no
toca el registro. Si vuelve, se mira que quita la linea antes de su primer
fotograma.

**Volvio el 2026-10-24** (run 40057853752, rama `claude/wonderful-dirac-s8oi52`,
el mismo arbol que paso en `pruebas`, y el cambio no tocaba el cliente), con
otra cara: «el registro de objetos no anoto lo recolectado: []», aunque el
inventario si tenia lo recogido (10 de un objeto, 3 de otro). Y por eso, despues,
«no hay una pila de bayas con que probar el menu». Ya son dos veces: es un fallo
del registro, no de la maquina, y esta por mirar.

**Dejado a proposito** (sin medida que lo pida, lente K5): rehacer solo las
menas cercanas al voxel roto, y ahorrar las claves de texto al mirar el
terreno roto. Y unas duplicaciones pequeñas (la altura de la mena en el
generador, el bucle de bajar por lo roto), que se juntan cuando se toquen.

**Escapes** (fase 6): el 48 (lo sorteado de cada pieza, de un flujo comun) a
un principio nuevo, G8; el 49 (dos numeros con una relacion, cada uno por su
lado) a otro, A4; el 50 a B3, afinado; el 51 a K1; y el P9 (un `stash` que se
llevo tests sin commit) a Q4.

---

## Pendiente del autor: las paredes de 2+ voxeles

**Las paredes de 2+ voxeles**, que el
relieve interpolado casi elimino (de 38-47 m de pared de 1 m o mas por 100 m² a
1,6-3); se le propusieron cuatro opciones (A: interpolar solo los desniveles de
medio bloque; B: sin interpolar; C: mas relieve; D: zonas de acantilados).

## El mundo de voxeles de 0,5 — fase 1 hecha (2026-10-06)

**Empieza aqui.** El autor decidio pasar el terreno de mapa de alturas (un
nivel y una rampa por casilla de 1) a **voxeles de 0,5 × 0,5 × 0,5**, «para
darle un aspecto y jugabilidad diferente a mi juego, sobre todo de cara a los
próximos cambios referentes al sandbox (destrucción del terreno y
construcción)». Un mapa de alturas no puede tener nada debajo de un suelo —ni
tuneles, ni cuevas, ni puentes, ni techos—, asi que destruir y construir de
verdad piden voxeles; y pasar primero a alturas de 0,5 y luego a voxeles seria
migrar dos veces. Por eso se hacen juntos.

**Sus respuestas, literales** (2026-10-06):

1. Modelo: «Sí, me gustaría un modelo de voxeles completo, con todas las
   formaciones del terreno que eso implica. Pero en la primera tanda quisiera
   que solo nos centremos en dejar las bases del mundo de voxeles y aún no
   entrar en la creación de formaciones geográficas, sino solo en que se genere
   el terreno y los biomas superficiales como los tenemos ahora.»
2. Subir: «El nuevo bloque y cualquier otro elementos que mida ≤ 0.5, se sube
   andando. Debe ser una característica de las físicas del juego, para no tener
   que especificarlo en cada elemento.»
3. Cuerpo: «El cuerpo del player va a medir 1.8.»
4. Objetos: «Los objetos se colocan en la rejilla de 0.5. pero aquí hay
   matices: elementos generados proceduralmente en la creación del mundo deben
   ir con toda su hitbox apoyada en terreno. Por ejemplo, si la ubicación de un
   árbol dice que va en un punto y resulta que ese punto es un escalón aislado
   (bloque de 0.5 sin bloques adyacentes) entonces el árbol bajara un nivel y
   reconsultara la condición, así hasta que toda la cara inferior de su hitbox
   este apoyada en terreno. Para el caso de bloques puestos por el jugador,
   estos se quedarán sobre cualquier otro bloque que sean puestos, siempre que
   la base de su hitbox toque con algo, sin importar que el área de toque sea
   pequeña.»
5. Movil: «Deberemos medir y optimizar para el caso del móvil, ya iremos
   decidiendo que medidas se pueden tomar.»

**Lo que eso fija para la primera tanda:**
- **Alcance**: las bases del mundo de voxeles —el dato, su generacion, su
  dibujo y su fisica— con **el mismo terreno y los mismos biomas de
  superficie que hoy**. Nada de cuevas, salientes ni formaciones nuevas, y
  todavia ni excavar ni construir: son tandas siguientes.
- **Subir**: todo lo que mida ≤ 0,5 se sube andando, por la fisica y no por
  objeto: `STEP_UP` = 0,5 inclusive, para el terreno y para las cajas. Una
  pared es de 2 bloques (1, lo que hoy es un bloque); el salto (1,16) sube 2.
- **El jugador mide 1,8** de alto: pasar pide 4 bloques libres (2,0 ≥ 1,8).
  Con voxeles hay techos: la cabeza choca.
- **Objetos en la rejilla de 0,5**:
  - **generados**: toda la cara inferior de su caja apoyada en terreno; si no
    lo esta, baja un nivel y vuelve a mirar, hasta que lo este;
  - **puestos por el jugador**: se quedan sobre lo que toque la base de su
    caja, por poco que sea.
- **Movil**: medir y optimizar; las medidas (distancia de vista, terreno lejano
  simplificado…) las decide el autor a la vista de los numeros.

**Lo que habra que proponerle y que confirme antes de escribirlo** (regla de
trabajo con el autor; nada de esto esta decidido):
- como se lee el terreno de hoy en voxeles: el nivel entero de cada casilla
  pasa a 2 bloques de 0,5, y las rampas (regla 15) a medios bloques;
- si el bioma, la contabilidad de vida y los recursos siguen por casilla de 1
  o pasan a la de 0,5 (la regla 10 y la ley del observador dependen de ello);
- que reglas duras caen o se reescriben —9, 13, 14, 15, 21, 22 y 23 al
  menos— y en que orden por fases, cada una jugable y verificada. La propuesta
  que se le hizo: (1) voxeles en el nucleo con tests, (2) el dibujo, (3) la
  fisica —suelo, techos, golpe y mirada cortados por voxeles—, (4) generacion
  y calibracion (`tools/analyze-world.ts`), (5) en otra tanda, excavar y
  construir. Las ediciones del terreno tendran su propia capa, como el overlay
  de `World.setFeature` (regla 4).

**Aparcado dentro de esta tanda**: el animal que cae de un escalon cuando el
centro de su tronco pasa el borde, con las patas traseras quedando dentro del
bloque de arriba (lo vio el autor, 2026-10-05). La propuesta que quedo en la
mesa: **que caiga solo cuando todo su cuerpo cabe abajo**. Como con voxeles esa
fisica se reescribe entera, se resuelve ahi.

**Al empezar la tanda, el autor decidio ademas** (2026-10-06):
- **sin rampas**: «Elimina las rampas por completo, el terreno solo se genera en
  bloques de 0.5»;
- **el escalon natural, de medio bloque en alto y en planta**: la misma
  elevacion de hoy, leida cada 0,5;
- **el bioma, la vida y los recursos siguen por casilla de 1**;
- **el terreno tambien se pisa con la huella entera**, y los animales caen
  solo cuando el cuerpo cabe abajo (fase 2);
- **cada fase a `main`** cuando su CI este en verde.

El plan, por fases: (1) el terreno de voxeles, su generacion y su dibujo, con
la fisica de antes adaptada a columnas; (2) la fisica de voxeles —el jugador
como caja de 0,68 × 0,68 × 1,8 con techos, subir ≤ 0,5 igual para terreno y
cajas, apoyo por la huella entera, animales que caen solo cuando caben, rayos
por voxeles—; (3) medir y optimizar el movil, decidiendo el autor a la vista de
los numeros.

### Fase 1 — HECHA (2026-10-06)

- **El dato**: cada chunk guarda la altura de sus 64 × 64 columnas en medios
  bloques (`Chunk.height`); `World.columnTop`, `isSolidVoxel` y
  `groundHeightAt` (el techo de la columna que se pisa). `WorldGen.columnTopAt`
  es puro, para el dibujo y las sondas. Fuera `levelAt`, `rampDirAt`,
  `groundHeight`, `rampDirOf`, `isRampEdge`, `RAMP_SHARE` y la regla 15.
- **La generacion**: ver `docs/relieve.md`, «Voxeles de 0,5». Medido, el
  mundo y su conectividad salen como antes.
- **Lo que se apoya**: lo generado, en la columna mas baja de su casilla; las
  estaciones, en la mas alta (`objectBase`).
- **El nacimiento y las medidas de conectividad** van por columnas.
- **El dibujo**: una tapa por columna, o una sola por casilla si sus cuatro
  columnas estan a la misma altura (el terreno llano cuesta lo de antes), y una
  pared por vecina mas baja. Las sombras, la reticula, la rejilla de chunks y
  los bordes de bioma, por columnas.
- **El auto salto sigue la escalera**: decide contra el escalon anterior, no
  contra los pies, asi que una escalera de medio bloque se anda.
- **La fisica sigue siendo la de antes** (el terreno en el centro), sobre las
  columnas; la de voxeles es la fase 2.
- **El tick medio**: ~0,75 → ~1,0 ms (los escalones de las partes de los
  animales, ahora por columnas). Muy por debajo de los 8.
- **La CI fallo una vez en `slash`, y no por los voxeles.** El paseo acabo en
  un pinar, y alli la vista normal da 12-16 pixeles en la mayoria de rumbos,
  tambien con el build de `main`. Ahora esa vista se queda con el mejor de
  cuatro rumbos (`docs/efectos.md`), con una mutacion que lo hace caer. Esa
  mutacion destapo otro agujero que ya estaba: la medida contaba tambien los
  impactos. Ahora `slash.mjs` abre con `?efectos=barrido` y solo ve el barrido.

## Guia de arte — en progreso (abierta el 2026-10-04)

Diste por buenos los modelos de bloques «dentro de lo esperado de una fase
temprana». Pediste directrices de arte, que crezcan en una tanda dedicada o
poco a poco. Estan en `docs/guia-de-arte.md`, con tu texto literal:

1. **Lo que va en la piel se pinta en el cubo de su parte**: patrones del
   pelaje y ojos.
2. **Lo delgado va en laminas cruzadas**, como los arboles.
3. **Los iconos son siluetas de aventurero medieval** (2026-10-04); desde el
   2026-10-17, en pixelart de 24 × 24 y aplicada tambien a los botones.
4. **Las patas caben en el cuadrado de la caja** (2026-10-14), aplicada.
5. **Los iconos son pixelart HD de 24 × 24; los objetos, a color**
   (2026-10-17), aplicada a los 30 objetos, los 14 huecos y los botones; y
   a las tres palas (2026-10-20).
6. **Un solo boton, para todos los botones** (2026-10-18), aplicada.
7. **El mundo es pixelart HD, a 24 pixeles por bloque** (2026-10-19),
   aplicada a todo menos la fauna.

Lo que espera tu juicio:

- **Las reglas que saque de tu referencia para la 5** (contorno de 1 pixel,
  luz arriba a la izquierda, 3-4 tonos por material, una paleta comun):
  aprobaste los dibujos, pero no las reglas escritas.

- **Si mi lectura de la 1 vale.** Entraria tambien lo que hoy son cajas finas
  pegadas al cuerpo: la barriga clara, la grupa blanca, el disco del hocico, la
  punta de la oreja de la liebre y la de la cola del zorro, y el vientre del
  cangrejo.
- **Que cuenta como «delgado» en la 2**: astas, cuernos, colmillos, orejas
  finas, colas finas, barbas, y las alas, el pico y las patas de la gaviota y
  del cangrejo. Y si una lamina puede llevar caja de golpe (hoy ninguna de esas
  partes golpea).
- **Aplicarlas a la fauna es una tanda por pedir.** El inventario de lo que hoy
  no las cumple esta en la guia.

## Diagnosticado y APARCADO por el autor: saltos que se pierden

El autor lo vio jugando: **saltando repetidamente sobre el mismo tile a
intervalos constantes, hay saltos que no se efectuan.** Diagnosticado el
2026-09-12 y **deliberadamente no arreglado**: se deja asi por ahora. Esto queda
escrito para que la proxima tanda no tenga que volver a encontrarlo.

### La causa, que son dos lineas

El salto se encola en un **booleano** (`client/src/input.ts` del isometrico, `jumpQueued`; hoy `controls.ts`) y se
consume **incondicionalmente** en el primer tick del fotograma:

```ts
intent.jump = this.jumpQueued;
this.jumpQueued = false;   // se vacia MIRE O NO si se puede saltar
```

Pero solo se ejecuta si en ese mismo tick se pisa suelo (`sim/tick.ts`, dentro
de la rama `if (entities.grounded[playerId])`). **Una pulsacion que cae en pleno
vuelo se descarta en silencio**: no espera al aterrizaje. No hay buffer de
entrada de ningun tipo.

Que no se encadenen saltos en el aire es correcto y es lo que el autor pidio. Lo
que no es correcto es **tirar la peticion** en vez de retenerla unas decimas.

### Lo medido

Modelo del bucle real de entonces (`main.ts` + el pestillo de `input.ts`, en el
isometrico; en el 3D el pestillo es el mismo, en `controls.ts`) a 60 fps, con un
12 % de temblor humano en el ritmo de pulsacion. El vuelo dura **0.400 s**:

| Periodo de pulsacion | Saltos efectuados | Con un buffer de 0.15 s |
|---|---|---|
| 0.35 s | 51 % | 79 % |
| 0.40 s | 70 % | 98 % |
| 0.45 s | 99 % | 100 % |
| ≥ 0.50 s | 100 % | 100 % |

El corte cae justo donde uno pulsa al saltar repetido en el sitio —unas 2.5
pulsaciones por segundo—, y **no es aleatorio**: depende de la fase entre el
ritmo y el aterrizaje. Por eso se siente como «algunos saltos no salen» y no
como un fallo sistematico.

**Honestidad sobre esta medida:** el mecanismo esta confirmado leyendo el codigo
y el autor lo ve jugando, pero **el porcentaje sale de un modelo, no del juego**.
La medida en navegador quedo sin cerrar, y merece la pena saber por que para no
repetir el intento:

- Con `page.keyboard.press` se perdio **1 de 12 a 300 ms** y ninguno de 400 a
  1000 ms. Confirma que el fallo existe, pero no el ritmo: la latencia de
  Playwright alarga el intervalo real y lo saca de la ventana.
- Despachando los eventos **dentro** de la pagina con `setTimeout` la sonda se
  quedo colgada sin devolver nada. Sospecha: en headless los temporizadores se
  estrangulan, y ademas el juego ahi va a 13 fps, que no es el ritmo del autor.

O sea que para cerrarlo hace falta medirlo **a 60 fps de verdad**, no en el
headless de la prueba de humo. El 30 % es la cifra a batir, no un hecho.

Segundo canal de perdida, menor pero real: al ser un **booleano y no un
contador**, dos pulsaciones dentro del mismo fotograma se funden en una. Solo
importa con fotogramas largos.

### El plan, para cuando se retome

1. **Buffer de salto**: que la peticion viva unas decimas en vez de tirarse, de
   modo que pulsar justo antes de tocar suelo salte al aterrizar. En
   `controls.ts` es cambiar el booleano `jumpQueued` por un contador de ticks
   que decrece, y
   limpiarlo cuando el despegue ocurre de verdad.
2. **Cuanto margen es decision del autor**, no del agente: 0.15 s es lo habitual
   en plataformas, pero un buffer largo hace que el personaje salte «solo» un
   instante despues de soltar. Preguntarselo antes de fijar el numero.
3. **El *coyote time* —poder saltar unas decimas despues de salir de un borde—
   es otra decision aparte** y no se da por supuesta. Se menciona porque es el
   pariente natural del buffer y conviene decidir los dos a la vez.
4. **Como afirmarlo sin echarlo a suertes**: el contador `__verdant.jumps` ya
   existe y cuenta despegues EFECTUADOS, asi que la prueba es pulsar N veces a
   un periodo fijo y comparar. Ojo con medirlo desde Playwright por lo dicho
   arriba: los eventos hay que despacharlos dentro de la pagina.

---

## Cabos sueltos que el autor tiene que mirar

1. **El bonus de equilibrio no lo cobra lo inerte** (piedra y los tres minerales).
   Fue **decision del agente, no suya**, y **esta ya implementada y viva**
   (`shared/index.ts`, `gathering.ts`). Motivo: la montana no tiene vida, asi que
   su bioma esta siempre «en equilibrio» por vacio y los minerales cobrarian el
   +30 % gratis y para siempre. Efecto secundario: la piedra da a veces 2 donde
   antes daba 3. Si prefiere que la piedra siga como estaba, es una linea.

2. **Como se agrupa un bioma.** Revisado a fondo, sin tocar nada. La sospecha del
   autor («se suman todos los tiles de un tipo como un bioma global») es
   literalmente falsa —`collectBiome` es una inundacion por adyacencia desde su
   chunk—, pero su conclusion practica se sostiene por tres motivos distintos:
   - **La conexion es por chunk, no por tile**: a un chunk le basta **un tile** de
     pradera entre sus 1024 para servir de puente.
   - **`isTracked` no caduca nunca**: `pruneFar` borra el cache de terreno pero
     **jamas `this.records`**, asi que el tejido conectivo solo crece.
   - **`BIOME_MAX_CHUNKS = 512` con `queue.pop()`, o sea LIFO**: los 512 chunks
     contados no son los 512 mas cercanos sino un tentaculo, asi que el panel
     puede estar describiendo un corredor lejano.

   Dos notas para cuando se decida actuar: `withinEquilibrium` con
   `reference <= 0` da «equilibrado» con hasta `COUNT_SLACK` unidades, asi que un
   bioma sin vida cuenta como sano; y `biomeCache` se vacia entero en cada paso de
   vida y en cada cambio de tile, asi que el coste del recorrido se paga a menudo.

---

## Aparcado a proposito por el autor

- **Las rampas**, a revisar al ver el relieve nuevo.
- La estetica del HUD, la fauna, las especies de costa, el subsuelo, y la
  construccion del terreno (la destruccion empezo el 2026-10-20, arriba). (El encuadre de las cimas era cosa
  del isometrico y se fue con el; el crafteo ya esta en marcha.)
- **Titulos internos en los documentos grandes** (el autor, 2026-10-19):
  `controles.md`, `recoleccion.md` y `reglas.md` pasan de 20 KB con uno a
  tres titulos, y no se pueden leer por secciones. Se les ponen **cuando una
  tanda toque cada uno**, moviendo el texto sin reescribirlo, como se partio
  `pendiente.md`.

---

## Medidas que costaron caro y que el codigo no cuenta

- **Un atlas de texturas no habria servido** en el isometrico: se midio forzando
  una sola textura para todas las cimas y el peor frame no mejoro. El coste es el
  numero de quads. Lo que si sirvio fue recortar por bloques de 8x8: de 10.236
  piezas a 3.026.
- **El presupuesto de conectividad se mide contra la linea base solo-agua**, nunca
  contra el 100 %: el mundo plano tampoco es conexo (75-88 % segun semilla). La
  medida **no es monotona**, asi que se elige el valor consistente en las tres
  semillas, no el mas generoso.
- **Una cordillera SI fabrica muros**: la ganancia no actua solo sobre la
  pendiente del campo base. Sin salientes hay 671-1146 tiles al pie de una pared
  de dos bloques, y cuestan **cero** en conectividad.
- **three.js pesa MENOS que PixiJS aqui**: el spike de 3D son 506 KB contra los
  565 KB del juego isometrico. Hace mucho mejor tree-shaking.
- **Cada medida nueva se verifica reintroduciendo el fallo y viendola caer.** La
  prueba de humo ha pasado por el motivo equivocado mas de una vez.
