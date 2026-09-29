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
- `41 grados` — mirar 41 grados abajo para sembrar, con alcance 2; hoy 35.

## Mandos

- `intent\.(eat|plant)|\b(swapA|swapB)\b` — comer, sembrar e intercambiar como campos de la Intent; hoy `use`, `moveFrom`/`moveTo`. Permitido en: `docs/isometrico.md`.
- `inventario \(I\)|tecla I\b|\(C\) tuvieron|fabricar \(C\)` — teclas I y C, retiradas el 2026-09-28. Permitido en: `CLAUDE.md`.
- `KeyF` — sembrar con F, retirado el 2026-09-28. Permitido en: `tools/smoke.mjs`.
- `wheelZoom|lastWheelAt|WHEEL_HOLD` — la rueda como zoom; desde el 2026-09-29 recorre la barra y el zoom es + y -.
- `giro de rueda` — el catalejo que volvia tras girar la rueda; hoy tras + o -.

## Interfaz

- `items-ui|ItemsUi` — el panel de antes, sustituido por `inventory-ui.ts`.
- `pageNext|pagePrev|pageNav` — las flechas del panel del movil; hoy pestanas. Permitido en: `tools/smoke.mjs`.
- `#toast|BLOCKED_TEXT|Necesitas un pico` — los avisos en pantalla, retirados el 2026-09-29. Permitido en: `tools/smoke.mjs`, `packages/client/src/inventory-ui.ts`.
- `equipLeft|equipRight|EQUIP_PER_SIDE|charBox|equipCol` — PERSONAJE con cinco equipables por lado; hoy el boceto de 3+3+4.
- `isVisible\('#thumbPad'\)` — el contenedor mide 0x0: esa comprobacion no puede fallar. Se mira un boton.
- `50-100|50 a 100` — el rango viejo del angulo de vision; hoy 70-120. Permitido en: `tests/fov-panel.test.ts`, `packages/client/src/camera.ts`, `CLAUDE.md`.
- `mantener (pulsado )?2 s` — fabricar en 2 s; hoy 1,5.
- `mas de 1 s` — sostener el ojo 1 s; hoy 0,5.

## Proporciones y camara

- `EYE = 1\.6|EYE\` de la camara` — la altura de ojos de la camara; hoy `EYE_HEIGHT = 1,75`.
- `spike3d` — el nombre del cliente 3D cuando era un prototipo.
