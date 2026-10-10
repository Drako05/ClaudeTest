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
