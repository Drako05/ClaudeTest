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
- `segunda altura|dos alturas` — el cono con dos alturas, sustituido por el sector plano (regla 12) el 2026-09-28. Permitido en: `packages/sim/src/aim.ts`, `CLAUDE.md` (los dos cuentan por que se sustituyo).
- `cono de la acci[oó]n|eje del cono` — la accion como cono sobre casillas, sustituida el 2026-09-28.
- `actionArea` — las casillas fijas de la accion; hoy es `actionReach` sobre el sector.
- `tres casillas del area|una casilla de las tres` — el area de tres casillas, anterior al sector.
- `\b(alcance|a menos) de 2 bloques` — el alcance de 2; es 2,5 desde el 2026-09-29. (El `\b` evita «nunca menos de 2 bloques», que es el tronco y esta bien.)
- `(alcance|a menos) de 2[,.]5|2[,.]5 bloques|a 2[,.]5 como el golpe` — el alcance de 2,5; es 3 (`STRIKE_RANGE`) desde el 2026-10-01. Permitido en: `CLAUDE.md` (cuenta como subio).
- `41 grados` — mirar 41 grados abajo para sembrar, con alcance 2; hoy 35.

## Mandos

- `intent\.(eat|plant)|\b(swapA|swapB)\b` — comer, sembrar e intercambiar como campos de la Intent; hoy `use`, `moveFrom`/`moveTo`. Permitido en: `docs/isometrico.md`.
- `inventario \(I\)|\(C\) tuvieron|fabricar \(C\)` — I como inventario y C como fabricar, retiradas el 2026-09-28. (La I volvio el 2026-10-02 para la informacion, asi que «tecla I» ya no es un resto.) Permitido en: `CLAUDE.md`.
- `KeyF` — sembrar con F, retirado el 2026-09-28. Permitido en: `tools/smoke.mjs`.
- `wheelZoom|lastWheelAt|WHEEL_HOLD` — la rueda como zoom; desde el 2026-09-29 recorre la barra y el zoom es + y -.
- `giro de rueda` — el catalejo que volvia tras girar la rueda; hoy tras + o -.

## Fisica y supervivencia

- `AIR_CONTROL|airVelocity|takeoffV[xy]|impulso del despegue` — el salto que conservaba el impulso y admitia un 30 % de desvio; desde el 2026-09-30 en el aire se anda como en el suelo. Permitido en: `CLAUDE.md`, `docs/pendiente.md`, `packages/sim/src/systems/movement.ts` (lo cuenta como historia).
- `vac[ií]an? en un d[ií]a|un 1 ?% (de hambre )?por salto|salto cuesta (un )?0[,.]5` — el hambre en un dia y el salto al 1 % y al 0,5 %; hoy dos dias y 0,25 %. Permitido en: `docs/pendiente.md`.

## Interfaz

- `healthBar|healthFill|hungerBar|hungerFill|vitalBars|franja de barras` — la franja de salud y hambre del movil; desde el 2026-09-30, los anillos. Permitido en: `CLAUDE.md`, `docs/pendiente.md`.
- `reticleTiles|marcos? de lo alcanzado` — la reticula que marcaba lo que el golpe alcanzaba; retirada el 2026-09-30. Permitido en: `docs/pendiente.md`.
- `centro del jugador al centro de su casilla` — los 3 de la estacion medidos de centro a centro; desde el 2026-10-01, `stationNear` de los ojos a su caja.
- `arranca en perspectiva|vista de arranque es la perspectiva` — se arranca en primera persona desde el 2026-10-02.
- `Esc .{0,40}sin pedir capturar|no pide capturar` — Esc con el inventario abierto captura al soltar desde el 2026-10-02 (`captureSoft`). Permitido en: `docs/pendiente.md`, `.claude/skills/auditoria/references/escapes.md`.

- `items-ui|ItemsUi` — el panel de antes, sustituido por `inventory-ui.ts`.
- `pageNext|pagePrev|pageNav` — las flechas del panel del movil; hoy pestanas. Permitido en: `tools/smoke.mjs`.
- `#toast|BLOCKED_TEXT|Necesitas un pico` — los avisos en pantalla, retirados el 2026-09-29. Permitido en: `tools/smoke.mjs`, `packages/client/src/inventory-ui.ts`.
- `equipLeft|equipRight|EQUIP_PER_SIDE|charBox|equipCol` — PERSONAJE con cinco equipables por lado; hoy el boceto de 3+3+4.
- `isVisible\('#thumbPad'\)` — el contenedor mide 0x0: esa comprobacion no puede fallar. Se mira un boton.
- `50-100|50 a 100` — el rango viejo del angulo de vision; hoy 70-120. Permitido en: `tests/fov-panel.test.ts`, `packages/client/src/camera.ts`, `CLAUDE.md`.
- `mantener (pulsado )?2 s` — fabricar en 2 s; hoy 1,5.
- `mas de 1 s` — sostener el ojo 1 s; hoy 0,5.
- `onFreeCursor|CTRL mantenido|fromBottom` — CTRL soltaba el cursor (retirado por el autor el 2026-10-02) y el registro de PC contaba desde abajo. Permitido en: `docs/pendiente.md`.
- `STATION_RANGE|flashPass|PASS_MS|litPass|lastSweepEnds` — la distancia propia de las estaciones (hoy el alcance), el destello aparte de la rueda y los extremos del barrido para el humo (hoy `lastSweep`).

## Proporciones y camara

- `EYE = 1\.6|EYE\` de la camara` — la altura de ojos de la camara; hoy `EYE_HEIGHT = 1,75`.
- `spike3d` — el nombre del cliente 3D cuando era un prototipo.
