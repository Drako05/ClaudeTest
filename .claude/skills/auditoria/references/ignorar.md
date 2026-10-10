# Avisos del escaner ya juzgados

Rutas y nombres que el escaner (`scripts/escaner.mjs`) marca y que **no son
fallos**. Cada uno con su motivo, para que la proxima auditoria no vuelva a
investigarlo y para que, si el motivo deja de valer, se note.

Solo entran aqui cosas **estables**: nombres de APIs ajenas, historia que se
cuenta a proposito. Nunca un fallo que «ya se arreglara». Si dudas, no lo
anadas: un aviso de mas cuesta un minuto, y uno silenciado por error puede
costar una tanda.

**Siempre con «En:»**, limitado a los ficheros donde esta justificado. Un
ignorado sin ambito se ignora en todo el repo, y taparia el mismo nombre si
reapareciera en el codigo, que es justo lo que el escaner busca.

Formato (el escaner lo lee):

    - `nombre` — motivo. En: `fichero`, `fichero`.

## APIs y nombres ajenos

- `toDataURL` — API de canvas del navegador. En: `tools/slash.mjs`.
- `preserveDrawingBuffer` — opcion de WebGL. En: `tools/slash.mjs`.
- `pixi.js` — la biblioteca del isometrico, que se retiro. En: `docs/pendiente.md`, `docs/juicio.md`, `docs/historia.md`.
- `highRefresh` — prefijo de la pasada `highRefreshPass` del humo, como se escribe en la linea de ordenes. En: `docs/pruebas.md`.
- `devTools` — prefijo de la pasada `devToolsPass`, que es el nombre de su casilla en la matriz de CI. En: `docs/pruebas.md`.

## Historia que se cuenta a proposito

- `AIR_CONTROL` — la desviacion en el aire del salto, retirada el 2026-09-30 y tachada en su tabla de numeros. En: `docs/pendiente.md`, `docs/juicio.md`, `docs/historia.md`.
- `effectLayer` — la capa de pantalla del isometrico, que explica por que el barrido va encima. En: `docs/efectos.md`, `packages/client/src/effects-view.ts`.
- `fpPitch` — la inclinacion aparte de la primera persona, antes de compartir la mirada. En: `docs/controles.md`.
- `levelStep` — la auditoria del 2026-09-29 lo cita como resto retirado. En: `docs/pendiente.md`, `docs/juicio.md`, `docs/historia.md`.
- `actionArea` — la fase 2 del relieve lo cuenta; ya no existe. En: `docs/pendiente.md`, `docs/juicio.md`, `docs/historia.md`.
- `regrowTicksOf` — la auditoria del 2026-09-29 lo cuenta como escape: `CLAUDE.md` lo citaba sin existir. En: `docs/pendiente.md`, `docs/juicio.md`, `docs/historia.md`.
- `tilesOnScreen` — isometrico. En: `docs/isometrico.md`.
- `playerHidden` — isometrico. En: `docs/isometrico.md`.
- `footGap` — isometrico. En: `docs/isometrico.md`.
- `worldToScreen` — isometrico. En: `docs/isometrico.md`.
- `screenToWorld` — isometrico. En: `docs/isometrico.md`.
- `depthOf` — isometrico. En: `docs/isometrico.md`.
- `tileOrigin` — isometrico. En: `docs/isometrico.md`.
- `worldCorner` — isometrico. En: `docs/isometrico.md`.
- `zIndex` — isometrico. En: `docs/isometrico.md`.
- `depthRowOf` — isometrico. En: `docs/isometrico.md`.
- `spike3d.html` — el HTML del prototipo 3D; la tabla anota que hoy es `index.html`. En: `docs/isometrico.md`.
- `packages/client/src/projection.ts` — isometrico. En: `docs/isometrico.md`.
- `projection.ts` — isometrico. En: `docs/pendiente.md`, `docs/juicio.md`, `docs/historia.md`.
- `tests/projection.test.ts` — isometrico. En: `docs/isometrico.md`, `docs/pendiente.md`, `docs/juicio.md`, `docs/historia.md`.
- `input.ts` — el mando del isometrico; hoy `controls.ts`. En: `docs/isometrico.md`, `docs/pendiente.md`, `docs/juicio.md`, `docs/historia.md`.
- `client/src/input.ts` — idem. En: `docs/pendiente.md`, `docs/juicio.md`, `docs/historia.md`.
- `client/terrain-draw.ts` — isometrico. En: `docs/isometrico.md`.
- `tests/terrain-draw.test.ts` — isometrico. En: `docs/isometrico.md`.
- `tiles.ts` — isometrico. En: `docs/pendiente.md`, `docs/juicio.md`, `docs/historia.md`.
- `tests/biome-edges-3d.test.ts` — nombre de entonces; la tabla anota el de hoy. En: `docs/isometrico.md`.
