# Terminos retirados

Lo que el juego fue y ya no es. El escaner (`scripts/escaner.mjs`) busca cada
patron en codigo, tests, herramientas y documentacion, y marca `[historia]` lo
que cae en una seccion de historia, donde nombrarlo puede ser correcto.

**Se actualiza en la fase 0 de cada auditoria, ANTES de buscar**: cada valor,
tecla, nombre o modelo que la tanda cambio o retiro entra aqui con su patron.
Un concepto que cambio y no esta en esta lista es un concepto que nadie va a
buscar.

Formato de cada entrada (el escaner lo lee tal cual):

    - `patron (regex, sin distinguir mayusculas)` — que era y desde cuando. Permitido en: `ruta`, `ruta`.

«Permitido en» es opcional: ficheros donde el termino esta a proposito (un
test que afirma que la tecla vieja ya no hace nada, por ejemplo).

## Modelos del golpe

- `levelStep` — la «segunda altura» del cono; no existe desde el 2026-09-28.
- `segunda altura|dos alturas` — el cono con dos alturas, sustituido por el sector plano (regla 12) el 2026-09-28. Permitido en: `packages/sim/src/aim.ts`, `docs/reglas.md` (los dos cuentan por que se sustituyo).
- `cono de la acci[oó]n|eje del cono` — la accion como cono sobre casillas, sustituida el 2026-09-28.
- `actionArea` — las casillas fijas de la accion; hoy es `actionReach` sobre el sector.
- `tres casillas del area|una casilla de las tres` — el area de tres casillas, anterior al sector.
- `\b(alcance|a menos) de 2 bloques` — el alcance de 2; es 2,5 desde el 2026-09-29. (El `\b` evita «nunca menos de 2 bloques», que es el tronco y esta bien.)
- `(alcance|a menos) de 2[,.]5|2[,.]5 bloques|a 2[,.]5 como el golpe` — el alcance de 2,5; es 3 (`STRIKE_RANGE`) desde el 2026-10-01. Permitido en: `docs/reglas.md` (cuenta como subio).
- `41 grados` — mirar 41 grados abajo para sembrar, con alcance 2; hoy 35.

## Mandos

- `intent\.(eat|plant)|\b(swapA|swapB)\b` — comer, sembrar e intercambiar como campos de la Intent; hoy `use`, `moveFrom`/`moveTo`. Permitido en: `docs/isometrico.md`.
- `inventario \(I\)|\(C\) tuvieron|fabricar \(C\)` — I como inventario y C como fabricar, retiradas el 2026-09-28. (La I volvio el 2026-10-02 para la informacion, asi que «tecla I» ya no es un resto.) Permitido en: `docs/controles.md`.
- `KeyF` — sembrar con F, retirado el 2026-09-28. Permitido en: `tools/smoke.mjs`.
- `wheelZoom|lastWheelAt|WHEEL_HOLD` — la rueda como zoom; desde el 2026-09-29 recorre la barra y el zoom es + y -.
- `giro de rueda` — el catalejo que volvia tras girar la rueda; hoy tras + o -.

## Fisica y supervivencia

- `AIR_CONTROL|airVelocity|takeoffV[xy]|impulso del despegue` — el salto que conservaba el impulso y admitia un 30 % de desvio; desde el 2026-09-30 en el aire se anda como en el suelo. Permitido en: `docs/relieve.md`, `docs/pendiente.md`, `docs/juicio.md`, `docs/historia.md`, `packages/sim/src/systems/movement.ts` (lo cuenta como historia).
- `vac[ií]an? en un d[ií]a|un 1 ?% (de hambre )?por salto|salto cuesta (un )?0[,.]5` — el hambre en un dia y el salto al 1 % y al 0,5 %; hoy dos dias y 0,25 %. Permitido en: `docs/pendiente.md`, `docs/juicio.md`, `docs/historia.md`.

## Interfaz

- `healthBar|healthFill|hungerBar|hungerFill|vitalBars|franja de barras` — la franja de salud y hambre del movil; desde el 2026-09-30, los anillos. Permitido en: `docs/controles.md`, `docs/pendiente.md`, `docs/juicio.md`, `docs/historia.md`.
- `reticleTiles|marcos? de lo alcanzado` — la reticula que marcaba lo que el golpe alcanzaba; retirada el 2026-09-30. Permitido en: `docs/pendiente.md`, `docs/juicio.md`, `docs/historia.md`.
- `centro del jugador al centro de su casilla` — los 3 de la estacion medidos de centro a centro; desde el 2026-10-01, `stationNear` de los ojos a su caja.
- `arranca en perspectiva|vista de arranque es la perspectiva` — se arranca en primera persona desde el 2026-10-02.
- `Esc .{0,40}sin pedir capturar|no pide capturar` — Esc con el inventario abierto captura al soltar desde el 2026-10-02 (`captureSoft`). Permitido en: `docs/pendiente.md`, `docs/juicio.md`, `docs/historia.md`, `.claude/skills/auditoria/references/escapes.md`.

- `items-ui|ItemsUi` — el panel de antes, sustituido por `inventory-ui.ts`.
- `pageNext|pagePrev|pageNav` — las flechas del panel del movil; hoy pestanas. Permitido en: `tools/smoke.mjs`.
- `#toast|BLOCKED_TEXT|Necesitas un pico` — los avisos en pantalla, retirados el 2026-09-29. Permitido en: `tools/smoke.mjs`, `packages/client/src/inventory-ui.ts`.
- `equipLeft|equipRight|EQUIP_PER_SIDE|charBox|equipCol` — PERSONAJE con cinco equipables por lado; hoy el boceto de 3+3+4.
- `isVisible\('#thumbPad'\)` — el contenedor mide 0x0: esa comprobacion no puede fallar. Se mira un boton.
- `50-100|50 a 100` — el rango viejo del angulo de vision; hoy 70-120. Permitido en: `tests/fov-panel.test.ts`, `packages/client/src/camera.ts`, `docs/controles.md`.
- `mantener (pulsado )?2 s` — fabricar en 2 s; hoy 1,5.
- `mas de 1 s` — sostener el ojo 1 s; hoy 0,5.
- `onFreeCursor|CTRL mantenido|fromBottom` — CTRL soltaba el cursor (retirado por el autor el 2026-10-02) y el registro de PC contaba desde abajo. Permitido en: `docs/pendiente.md`, `docs/juicio.md`, `docs/historia.md`.
- `STATION_RANGE|flashPass|PASS_MS|litPass|lastSweepEnds` — la distancia propia de las estaciones (hoy el alcance), el destello aparte de la rueda y los extremos del barrido para el humo (hoy `lastSweep`).

## Proporciones y camara

- `EYE = 1\.6|EYE\` de la camara` — la altura de ojos de la camara; hoy `EYE_HEIGHT = 1,75`.
- `spike3d` — el nombre del cliente 3D cuando era un prototipo.
- `faunaDamageOf|setFaunaDamage|faunaDamage` — el daño de los animales en el overlay de `World`; desde el 2026-10-03 se olvida al recargarse (decision del autor) y vive solo en la entidad.
- `depthNearOf|depthSafeSpriteMaterial|verdant-sprite-depth|besideShare|frontShare` — la lamina entera con la profundidad de un punto adelantado (`e3d3de6`); desde el 2026-10-03 cada pixel toma la de la caja del cuerpo (`bodySpriteMaterial`), y la sonda mide casos de terreno.
- `inkColumns` y el voltear por la derecha de la camara (`update(fauna, store, rightX, rightZ)`) — la fauna elige uno de ocho dibujos por el angulo a la camara (`fauna-facing.ts`) y recibe la posicion de la camara.
- `animalHalf|animalBox\b|walkAt\b` — la caja de golpe cuadrada de cada animal y su andar con el radio del jugador; desde el 2026-10-03 golpea y choca con las partes de su plano (`hitPartsOf`, `animalBoxes`, `walkAnimal`).
- `fauna-art|makeAnimalArt|fauna-facing|viewOf|VIEW_HYSTERESIS|bodyWideOf|directionsSeen|faunaDirections` — los animales en lamina, con ocho direcciones (`ff73508`); desde el 2026-10-03 son modelos de bloques (`fauna-model.ts`).
- `animalPalette` — los colores de las esquirlas y escombros de los animales; desde el 2026-10-03 no sueltan fragmentos, solo el impacto.

## Equipables

- `EQUIP_WAIST|EQUIP_BACK|wearOfSlot|WEAR_SLOTS|garmentOf|Wear\.(Waist|Back)|enum Wear\b|rangeOf\(|rangeEmpty\(` — la ropa en dos huecos, cintura (bolsa) y espalda (mochila), cada uno con su tramo; desde el 2026-10-04 hay catorce equipables (`Equip`) y bolsa y mochila van al Bolso, una sola (`equipOf`, `bagCapacity`, `bagRange`, `bagEmpty`). Permitido en: `docs/pendiente.md`, `docs/juicio.md`, `docs/historia.md`.
- `'Cintura'|'Espalda'|bolsa a la cintura|mochila a la espalda|bolsa en la cintura|mochila en la espalda` — los nombres de aquellos huecos. Permitido en: `docs/pendiente.md`, `docs/juicio.md`, `docs/historia.md`, `docs/recoleccion.md` (cuenta el antes).
- `EQUIP_SLOTS = 10|WORN_AT|tres equipables a cada lado|cuatro debajo` — la rejilla de PERSONAJE de diez casillas; desde el 2026-10-04 son catorce en cinco columnas, con iconos. Permitido en: `docs/pendiente.md`, `docs/juicio.md`, `docs/historia.md`.
- `\b24 casillas|16, 18, 22 o 24` — el maximo con bolsa y mochila puestas a la vez; hoy 22. Permitido en: `docs/pendiente.md`, `docs/juicio.md`, `docs/historia.md`.
- `golpe util|lo que no es suyo no la gasta|no se gasta en ella` — la herramienta solo se gastaba con lo suyo; desde el 2026-10-04 todo golpe que toca algo gasta (el autor). Permitido en: `docs/pendiente.md`, `docs/juicio.md`, `docs/historia.md`, `docs/recoleccion.md` (cuenta el antes).
- `caballo de(l)? ajedrez|capa con capucha|capa de espaldas|escudo con (una )?cruz|huella, herradura|iconos de trazo` — los dibujos de los equipables que el autor hizo rehacer el 2026-10-04: los primeros de trazo fino (con una herradura), y luego la capa con capucha y despues de espaldas, el caballo de ajedrez y el escudo con cruz como Emblema. Hoy: siluetas rellenas, capa de frente, cabeza de caballo de perfil y medalla de pecho. Permitido en: `docs/pendiente.md`, `docs/juicio.md`, `docs/historia.md`, `docs/guia-de-arte.md` (describe la referencia del autor, que tiene una capa con capucha).

## Cajas de los objetos

- `isFeatureSolid|floorHeightAt` — el choque de casilla entera de arboles, roca y minerales, y lo que pisaba el cuerpo medido en el centro con la estacion de su casilla; desde el 2026-10-05 cada objeto tiene una caja que golpea y, si su tipo choca, choca (`blocksBody`, `solidBoxAt`), y el cuerpo pisa con su huella (`squareFloor`, `footing`). Permitido en: `docs/pendiente.md`, `docs/juicio.md`, `docs/historia.md`, `docs/reglas.md`, `docs/devtools.md` (cuentan el antes).
- `casilla entera (de lo que|en cian)|choque dibujado hasta el alto` — el primer dibujo de las cajas del panel, con el choque de casilla entera en cian (unas horas del 2026-10-05). Permitido en: `docs/pendiente.md`, `docs/juicio.md`, `docs/historia.md`, `docs/devtools.md`.
- `patas finas, la cola|la cola, las patas y las orejas no|las patas finas.{0,20}no chocan` — las patas sin caja; desde el 2026-10-05 la cabeza, el cuello, las extremidades y el tronco golpean y chocan (el autor). Permitido en: `docs/pendiente.md`, `docs/juicio.md`, `docs/historia.md`.

## Rampas y relieve por casilla

- `rampDir|RAMP_SHARE|RAMP_DIRS|NO_RAMP|isRampEdge|rampDirOf|levelAt\(|levelFromRelief|levelFrom\(|WATER_LEVEL|CLIMB_LIMIT|cornerHeight|groundHeight\(` — el relieve como un nivel entero y una rampa por casilla de 1, con el 15 % de fronteras en rampa; desde el 2026-10-06 son columnas de voxel de 0,5 sin rampas (`columnTop`, `columnTopAt`, `heightFrom`, `WALK_HALVES`/`JUMP_HALVES`, `columnTopFor`). Permitido en: `docs/pendiente.md`, `docs/juicio.md`, `docs/historia.md`, `docs/relieve.md`, `docs/isometrico.md`, `CLAUDE.md` (cuentan el antes).
- `\btalud(es)?\b` — el talud que se subia andando; hoy un escalon de medio bloque. Permitido en: `docs/pendiente.md`, `docs/juicio.md`, `docs/historia.md`, `docs/relieve.md`, `docs/isometrico.md`, `docs/reglas.md`, `CLAUDE.md`.

## Fisicas: bajar de golpe y el terreno en el centro (2026-10-10)

- `SNAP_DOWN|se pega al suelo|saltitos escalera abajo` — el margen que pegaba los pies al suelo al bajar medio bloque; desde el 2026-10-10 bajar es caer con la gravedad. Permitido en: `docs/pendiente.md`, `docs/juicio.md`, `docs/historia.md`, `docs/reglas.md`.
- `terreno (se mide |sigue midiendose |medido )?en el centro|el terreno, en el centro` — el terreno pisado en el centro del cuerpo; desde el 2026-10-10, con la huella entera (los animales, en la fase B de la tanda). Permitido en: `docs/pendiente.md`, `docs/juicio.md`, `docs/historia.md`, `docs/reglas.md`, `docs/fauna.md`, `packages/sim/src/systems/movement.ts`, `packages/sim/src/boxes.ts`.
- `LEAP_SHARES|partsFloor|stepTop` — el salto del animal con impulso de mas (a su paso, a tres cuartos o a la mitad) y su apoyo solo en las cajas mas bajas; desde el 2026-10-10 (fase B) salta con la fisica del jugador, a su paso, y reposa con todas sus cajas (`partsRest`). Permitido en: `docs/pendiente.md`, `docs/juicio.md`, `docs/historia.md`.

## Pruebas: slash de una pieza y el temporizador de la CI (2026-10-10)

- `pasada == 'slash'|prueba: 'slash'|casilla `slash`|\[[^\]]*\bslash\]` — `slash` como una sola casilla de la CI o una sola prueba de mutacion; desde el 2026-10-10 va en partes (`slash-<parte>`, `slash:<parte>`, `tools/slash-partes.mjs`). Permitido en: `docs/historia.md`.
- `sleep 300|sin .gh. ni API` — esperar la CI con un temporizador fijo de 5 minutos porque no habia API; desde el 2026-10-10, `tools/esperar-ci.sh` con `gh api`. Permitido en: `docs/pruebas.md` (cuenta el cambio), `docs/historia.md`.

## Auditoria del 2026-10-10: lo que retiraron las tandas de voxeles, fisicas y pruebas

- `avanza(ba)? lo justo para que (sus|los) pies` — el animal que en el aire avanzaba lo justo para pasar el borde en lo alto del salto, mas deprisa que su paso si hacia falta (`601329f`); desde la fase B de fisicas (2026-10-10) avanza a su paso, como el jugador. Permitido en: `packages/sim/src/systems/movement.ts` (lo cuenta como historia), `docs/pendiente.md`, `docs/juicio.md`, `docs/historia.md`, `docs/fauna.md`.
- `tope de 15 minutos|15 minutos antes de dar` — lo que `mutar.mjs` esperaba antes de dar una prueba por colgada; desde el 2026-10-10 son 25 (`LIMITE_MS`). Permitido en: `docs/historia.md`.
- `se alcanza \(PENDIENTE DEL AUTOR\)|CHOQUE DE DOS DECISIONES TUYAS` — el bloque a dos casillas a altura 2 que la huella entera alcanza; el autor lo acepto el 2026-10-10 («no hay problema en que se alcancen más casillas siempre que se respeten las leyes físicas»). Permitido en: `docs/pendiente.md`, `docs/historia.md`.
- `feetOnly|footPartsOf` — las cajas mas bajas de un animal, con las que se apoyaba hasta la fase B de fisicas; desde entonces reposa con todas (`partsRest`), y la auditoria del 2026-10-10 retiro lo que quedaba. Permitido en: `docs/pendiente.md`, `docs/historia.md`.

## La camara con retraso de la fase C (2026-10-12)

- `camera-lag|CAMERA_LAG|cameraLag|camLagGap|aimScreen|aimPoint|AIM_FAR|AIM_NEAR|CAMERA_SNAP|\bchase\(|camera\.aim\b|camera\.lag\b|devLag` — la camara que perseguia los ojos con 0,1 s de retraso y miraba al punto de mira (fase C de fisicas, 2026-10-10); el autor la descarto, y desde el 2026-10-12 el dibujo se interpola entre ticks y solo el escalon se suaviza (`smooth.ts`). Permitido en: `docs/historia.md`, `docs/pendiente.md`.
- `retraso de la camara|camara (va )?(con|rezagada) retraso|ojos perseguidos|camara rezagada|va rezagada` — la misma, en palabras. Permitido en: `docs/historia.md`, `docs/pendiente.md`, `docs/controles.md` (cuenta que se sustituyo), `docs/devtools.md` (lo mismo), `docs/juicio.md` (lo mismo), `packages/client/src/smooth.ts` (lo mismo), `packages/client/src/camera.ts` (lo mismo), `tests/smooth.test.ts` (lo mismo).
- `mouse\.wheel\(0, -120\)` — acercar la vista «de cerca» de `slash` con la rueda, que desde que la rueda recorre la barra de la mano no acercaba nada; desde el 2026-10-12, con `Equal`. Permitido en: `docs/historia.md`.

## La fisica por fases (2026-10-13)

- `\bleap\b` — la velocidad fija a la que avanzaba un animal en el aire (la de su salto, o su paso si se caia andando); desde el 2026-10-13 anda en el aire con inercia, mas el impulso del salto (`impulse`). Permitido en: `docs/historia.md`.
- `JUMP_LOOK` — la busqueda del borde por puntos a lo largo del rumbo, que decidia el salto; desde el 2026-10-13 el escalon es lo mas alto bajo las cajas que chocarian (`tryJump`). Permitido en: `docs/historia.md`.
- `la cabeza (sube|levanta) al animal|sube al animal entero` — la cabeza que, a menos de medio bloque de un borde, subia de golpe al animal; desde el 2026-10-13 solo la base sube andando y el animal salta antes de tocar. Permitido en: `docs/historia.md`, `docs/pendiente.md`, `docs/fauna.md` (cuenta que se sustituyo), `docs/reglas.md` (lo mismo), `packages/sim/src/boxes.ts` (lo mismo).
- `a su paso le basta` — el salto de los animales sin impulso, «a su paso le basta»; desde el 2026-10-13 lleva el impulso minimo. Permitido en: `docs/historia.md`.

## La fisica de Minecraft (2026-10-14)

- `\brepel\b|REPEL_SPEED|repelling|repelX|repelY|repulsi[oó]n` — la repulsion que sacaba en horizontal lo que se metia en algo al caer (fisica por fases, 2026-10-13); desde el 2026-10-14 la caja choca por todas sus caras siempre. Permitido en: `docs/historia.md`, `docs/pendiente.md`, `docs/reglas.md` (cuenta que se retiro), `docs/fauna.md` (lo mismo), `docs/juicio.md` (lo mismo), `.claude/skills/auditoria/references/retirados.md`.
- `choque (va )?por fases|fisica por fases|f[ií]sica por fases` — el choque por fases (subiendo todas las cajas, bajando solo la base); retirado el 2026-10-14. Permitido en: `docs/historia.md`, `docs/pendiente.md`, `docs/reglas.md` (cuenta que se retiro), `docs/fauna.md` (lo mismo), `.claude/skills/auditoria/references/retirados.md`.
- `landingFloor|baseMaskOf|partsRest|bodyClashes|sim/src/body\.ts|sim/body\.ts` — el choque y el reposo por las cajas de las partes de un animal, giradas con su rumbo (2026-10-03 a 2026-10-14); desde entonces, una caja cuadrada (`collisionBoxOf`, `bodyOf`). Permitido en: `docs/historia.md`, `docs/pendiente.md`, `docs/reglas.md` (cuenta que se retiro), `docs/fauna.md` (lo mismo), `docs/juicio.md` (lo mismo).
- `\bimpulse\b|impulso m[ií]nimo` — el impulso horizontal minimo del salto de un animal (2026-10-13); retirado el 2026-10-14 por el salto a medida. Permitido en: `docs/historia.md`, `docs/pendiente.md`, `docs/fauna.md` (cuenta que se retiro).
- `tryTurnJump|turnToX|turnToY|salt(o|a) para girar|salto de giro` — el salto para girar en una ladera (2026-10-13); retirado el 2026-10-14: la caja no gira. Permitido en: `docs/historia.md`, `docs/pendiente.md`, `docs/fauna.md` (cuenta que se retiro).
- `ANIMAL_BACKUP|backedUp|retrocede y gira` — retroceder para girar (2026-10-05); retirado el 2026-10-14. Permitido en: `docs/historia.md`, `docs/pendiente.md`.
- `faceToFit|8 rumbos desde el de su origen` — probar rumbos al poner un animal hasta que cupiera; desde el 2026-10-14 la caja no gira y cabe mire a donde mire. Permitido en: `docs/historia.md`.
- `StepSmoother|stepCam|STEP_SMOOTH|stepSmooth|camStep` — el suavizado de camara del escalon (2026-10-12); retirado el 2026-10-14: el cuerpo sube tick a tick (`CLIMB_SPEED`). Permitido en: `docs/historia.md`, `docs/pendiente.md`, `docs/controles.md` (cuenta que se retiro), `docs/devtools.md` (lo mismo).
- `subir es de golpe|solo subir es de golpe|sube(n)? de golpe medio bloque` — el escalon que se subia de golpe (hasta el 2026-10-14). Permitido en: `docs/historia.md`, `docs/pendiente.md`.
- `sin chocar con nadie|no choca con otros animales ni con el jugador` — los animales que se atravesaban entre si y con el jugador; desde el 2026-10-14 se empujan (`pushBodies`). Permitido en: `docs/historia.md`, `docs/pendiente.md`.
- `0,43 × 0,43|1,25 × 1,25 × 1,58|bisonte adulto 2,47` — las medidas de las cajas de colision antes de poner las patas en el cuadrado (ciervo adulto 0,43 de lado, bisonte 1,25, su masa 2,47); desde el 2026-10-14, 0,48, 1,24 y 2,45. (Un «2,47» suelto no: es tambien a donde llega el suelo del golpe, en `tests/strike.test.ts`.) Permitido en: `docs/historia.md`.

## Los iconos en pixelart (2026-10-17)

- `\bSHORT\b|\bnameOf\b` — el nombre recortado que escribia cada casilla (`inventory-ui.ts`); desde el 2026-10-17 la casilla lleva el icono del objeto (`itemIcon`). Permitido en: `docs/recoleccion.md` (cuenta que se retiro), `docs/historia.md`, `docs/pendiente.md`.
- `\bMIRROR\b|%MASK%|BOOT_CUTS` — las siluetas vectoriales de los equipables, con lo simetrico espejado y los calados por mascara; desde el 2026-10-17 son pixelart de 24 × 24 (`silhouette-icons.ts`). Permitido en: `docs/historia.md`, `docs/pendiente.md`.
- `fill-rule|evenodd` — los calados de los iconos por la regla de relleno; desde el 2026-10-17 son pixeles transparentes. Permitido en: `docs/guia-de-arte.md` (cuenta como era la directriz 3), `docs/historia.md`, `docs/pendiente.md`.
- `glifo de CORRER|con su glifo` — CORRER, SALTAR, AUTO SALTO y el bioma con un caracter (», ↑, A, 🌿); desde el 2026-10-17, iconos en pixelart. Permitido en: `docs/historia.md`, `docs/pendiente.md`.
- `min\(48px, 100%\)|var\(--eq\) \* \.8|#use svg \{ width: 32px|#invOpen svg \{ width: 36px|#autoJump svg \{ width: 18px|\.ringIcon \{ width: 36px` — los iconos a un tamano que no era multiplo de su rejilla (encoger con la casilla, el 80 % de PERSONAJE, USAR a 32, la mochila a 36, AUTO SALTO a 18, los anillos del movil a 36); desde el 2026-10-17, siempre 24 o 48. Permitido en: `tools/mutaciones.mjs` (las mutaciones los reintroducen), `docs/historia.md`.

## Las correcciones a los iconos (2026-10-17)

- `mantener (pulsado )?1,5 s|1,5 s (una receta|con el dedo)|CRAFT_HOLD_MS = 1500` — fabricar manteniendo 1,5 s; desde el 2026-10-17, 1 s (el autor). Permitido en: `docs/historia.md`, `docs/pendiente.md`, `docs/recoleccion.md` (cuenta que lo era), `tools/mutaciones.mjs` (la mutacion lo reintroduce), `packages/client/src/inventory-ui.ts` (lo cuenta su cabecera), `tools/smoke.mjs` (comentarios que lo cuentan).
- `--arc: 84px|arco de 84` — el arco de MODO y ENTRADA con botones redondos; desde el 2026-10-17, 102. Permitido en: `docs/historia.md`, `docs/pendiente.md`, `docs/juicio.md`, `docs/controles.md`, `packages/client/index.html` (lo cuentan), `tools/mutaciones.mjs`.
- `un redondo pequeno|los dos redondos|no pisar a los redondos` — los botones redondos; desde el 2026-10-17 son cuadrados con relieve. Permitido en: `docs/historia.md`, `docs/pendiente.md`.
- `tab\.textContent === |t\.textContent === n` — buscar la categoria de las recetas por su texto; desde el 2026-10-17 lleva icono y su nombre va en `data-category`. Permitido en: `docs/historia.md`.
- `mochila de explorador|la flecha que lo salta sola|cuello alto y abierto en dos picos` — los dibujos de INVENTARIO, AUTO SALTO y Capa que el autor hizo rehacer el 2026-10-17. Permitido en: `docs/historia.md`, `docs/pendiente.md`, `docs/controles.md` (cuenta la mochila de 2026-09-30).

## Los ajustes despues de jugar en el movil (2026-10-17)

- `--arc\b|155,5 grados|arco (de MODO y ENTRADA )?de 102` — MODO y ENTRADA en un arco del mismo radio alrededor del ataque (102 px, MODO a 155,5 grados); desde el 2026-10-17, a 10 px de USAR y de SALTAR, corridos 4 px en espejo (`--modegap`, `--modeshift`). Permitido en: `docs/historia.md`, `docs/pendiente.md`, `.claude/skills/auditoria/references/retirados.md`.
- `0 3px 0 rgba` — la sombra dura de 3 px que el relieve echaba debajo del boton, por fuera; desde el 2026-10-17 el relieve va todo por dentro. Permitido en: `tools/mutaciones.mjs` (la mutacion la reintroduce), `docs/historia.md`, `docs/pendiente.md`.
- `scale\(\.9[0-9]\)|baja 2 px y se hunde` — el boton entero que se encogia o bajaba al pulsarlo; desde el 2026-10-17 se queda quieto y baja su icono. Permitido en: `docs/historia.md`, `docs/pendiente.md`.

## El estandar de los botones (2026-10-18)

- `border-bottom-color: #8fc4ff|rgba\(232, 238, 247, \.38\)` — las pestanas del movil con el texto gris y la elegida en azul con raya debajo; desde el 2026-10-18 son botones del estandar, blancas, y la elegida encendida. Permitido en: `tools/mutaciones.mjs` (la mutacion lo reintroduce), `docs/historia.md`, `docs/pendiente.md`.
- `rgba\(255, 196, 107, \.22\)|#ffdca6` — la luz naranja de los botones del panel de desarrollo; desde el 2026-10-18, el azul de todos. Permitido en: `docs/historia.md`, `docs/pendiente.md`.
- `rgba\(168, 60, 60|color: #0b1020; background: #8fc4ff` — Tirar en rojo y Reiniciar en azul claro con letra oscura; desde el 2026-10-18, el estandar. Permitido en: `docs/historia.md`, `docs/pendiente.md`.
- `padding: 16px 0 10px|padding-top: 11px; padding-bottom: 7px|qty button:enabled:active \{ padding-top` — bajar el texto de un boton pulsado moviendo su relleno; desde el 2026-10-18 el texto va en su `<span>` y baja con el icono. Permitido en: `docs/historia.md`, `docs/pendiente.md`, `.claude/skills/auditoria/references/escapes.md` (el escape 34 lo cuenta).

## Los objetos en el suelo (2026-10-18)

- `Un botin entra entero o no entra|botin que no cabe deje el objeto en el mundo|el golpe que lo mataria no completa|golpe que mataria no completa|Aun no hay objetos sueltos|Fabricar sin sitio se resolvera` — el botin todo o nada: si no cabia en el inventario, el golpe no completaba; y tirar hacia desaparecer. Desde el 2026-10-18 todo botin cae al suelo y lo tirado se lanza. Permitido en: `docs/historia.md`, `docs/pendiente.md`, `.claude/skills/auditoria/references/retirados.md`.
- `blocked = 'full'|'full' \| 'needPickaxe'|=== 'full'|: 'ok' \| 'missing' \| 'full'` — el aviso del nucleo de inventario lleno, al golpear y al fabricar. Permitido en: `docs/historia.md`, `docs/pendiente.md`, `.claude/skills/auditoria/references/retirados.md`.
- `WATER_Y` — la altura del agua, que vivia solo en el cliente; desde el 2026-10-18 es `WATER_SURFACE`, del nucleo. Permitido en: `docs/historia.md`.
- `discardAsk|discardYes|discardNo|discardText|askingDiscard|previa confirmacion|Confirmar al tirar|¿Tirar` — el dialogo que pedia confirmar al tirar (Cancelar / Tirar); el autor lo retiro el 2026-10-18 («ya no se pide confirmacion»). Permitido en: `docs/historia.md`, `docs/pendiente.md`, `.claude/skills/auditoria/references/retirados.md`.
- `SCATTER_SIDE_MIN|SCATTER_SIDE_MAX|1-1,5 hacia un lado|a 1,5 bloques del cuerpo|aprox\. 1,5 bloques` — el salto del botin a 1-1,5 de lado y el iman de 1,5; desde el 2026-10-18 (el autor, jugandolo), de 0 a 0,5 y 1 bloque. Permitido en: `docs/historia.md`, `docs/pendiente.md`, `docs/recoleccion.md` (cuenta que fue 1,5), `.claude/skills/auditoria/references/retirados.md`.
- `al vacio no hace nada|soltar al vacio no tira|y al vacio, sin tirar` — soltar la barra fuera de las casillas con el inventario cerrado no hacia nada; desde el 2026-10-18 lo tira. Permitido en: `docs/historia.md`, `docs/pendiente.md`.
- `midOf|a 0-0,5 del centro|no mas de 0,5 del centro` — el botin que nacia en el centro de la caja de lo que lo suelta y caia a 0-0,5 de ese centro: dentro de un tronco solido, la rama se posaba encima del arbol. Desde el 2026-10-18 (el autor, jugandolo) sale por fuera de la caja y cae a 0-0,5 de su cara (`sourceOf`, `LootSource`). Permitido en: `docs/historia.md`, `docs/pendiente.md`, `.claude/skills/auditoria/references/retirados.md`.
- `dropsDrawn|dropsView\.drawnTotal` — la sonda de los montones dibujados alguna vez, que no leia ninguna herramienta; retirada en la auditoria del 2026-10-18. Permitido en: `docs/historia.md`, `.claude/skills/auditoria/references/escapes.md`, `.claude/skills/auditoria/references/retirados.md`.

## Inventario de 5 columnas, menu de opciones y objetos que caducan (2026-10-19)

- `[Dd]uran para siempre|duran para siempre|Los objetos duran para siempre` — los objetos del suelo eran eternos; desde el 2026-10-19 caducan a los 2 dias de juego (`DROP_LIFE_TICKS`). Permitido en: `docs/historia.md`, `docs/pendiente.md`, `docs/recoleccion.md` (cuenta que antes duraban), `.claude/skills/auditoria/references/retirados.md`.
- `16 casillas con pilas|[Ll]as 16 casillas|START_SLOTS = 16|las cuatro primeras|casillas 1-4|1-4 eligen|HOTBAR_SLOTS = 4|repeat\(4, 60px\)|16, 18 o 22` — el inventario de 16 casillas en 4 columnas y la barra de 4; desde el 2026-10-19, 15 en 5 columnas y la barra de 5. Permitido en: `docs/historia.md`, `docs/pendiente.md`, `docs/recoleccion.md` (cuenta que fueron 16), `.claude/skills/auditoria/references/retirados.md`.
- `OTROS a la izquierda|entre OTROS e INVENTARIO|pisa OTROS o INVENTARIO|OTROS e INVENTARIO no estan arriba` — OTROS (el boton MAS) arriba a la izquierda y la barra centrada entre los dos; desde el 2026-10-19 OTROS va debajo de INVENTARIO y la barra sale del borde izquierdo. Permitido en: `docs/historia.md`, `docs/pendiente.md`, `docs/controles.md` (cuenta como era), `.claude/skills/auditoria/references/retirados.md`.
- `--cell|encogen a lo que quepa|54 px en 390` — las casillas de la rejilla del movil encogian para dejar sitio a la barra deslizable a cada lado; desde el 2026-10-19 (el autor, jugandolo) miden lo de PERSONAJE y responden solo en su centro de 48. Permitido en: `docs/historia.md`, `docs/pendiente.md`, `.claude/skills/auditoria/references/retirados.md`.
