# Las pruebas: el humo, la CI y sus lecciones

Lee esto antes de escribir o tocar una comprobacion del humo, de los gestos o
del barrido, o la matriz de la CI, y **«El procedimiento, paso a paso» antes de
la primera ronda de cada sesion**. `CLAUDE.md`, «Antes de dar algo por bueno»,
lleva solo sus cinco pasos.

Estaba en `CLAUDE.md` hasta el 2026-10-02 y se mudo aqui **literal** (propuesta 3:
`CLAUDE.md` se carga entero en cada turno, asi que lleva solo lo operativo y
un indice de estos documentos).

## El procedimiento, paso a paso

Estaba en `CLAUDE.md` hasta el 2026-10-10 y se mudo aqui **literal**: `CLAUDE.md`
se carga en cada llamada, asi que alli queda solo el enunciado.

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

## La CI, el humo y sus lecciones

**La CI va repartida** (`.github/workflows/ci.yml`): un trabajo para typecheck
y tests, y una **matriz con una maquina por pasada del humo** —`desktop`,
`resources`, `stations`, `mobile`, `devTools`, `life`, `relief`,
`highRefresh`, `fauna`— mas los gestos y el barrido en pixeles (`slash`, que desde que
corre aqui **falla** si la vista normal, la camara baja o la primera persona
bajan de 20 pixeles aclarados, o la estocada de 500; los fallos que tuvo daban
0, 2 y 13. La vista que gira cerca se mide pero no hace fallar: en la CI dio
46, 12 y ~190 sobre el mismo codigo, y como puerta fallaria a suertes. Desde
la auditoria del 2026-10-04 mide **sin animales dibujados** (`?fauna=0`, que
solo quita su dibujo): la vista normal dio una vez 16 en la CI con un codigo
que habia pasado dos veces, y un animal de bloques paseando por delante del
barrido es la sospecha. Y desde la tanda de fisicas, 2026-10-10, **la vista
normal cuenta solo los rumbos con la camara libre y su suelo es 5**: el sector
sale de los ojos por la mirada, que en esa vista es la de la camara, y se ve de
canto, 12 pixeles en cualquier rumbo libre. Los ~190 y 9.001 de antes salian de
rumbos con la camara metida en la cabeza por la colision, que dan eso o 0 segun
el instante; lo que vigila es el recorte por frustum, que da 0 en todos. Y se
mide **en un claro**, con la camara libre en los cuatro rumbos: el paseo acaba
donde lo deja la velocidad de la maquina, y entre arboles la camara baja dio 0.
Y un canal cuenta como aclarado si sube 12 **o la mitad de lo que le queda
hasta 255**: sobre el cielo el azul ya va por 240, el trazo translucido lo
subia 10, y la camara baja daba 0 con el barrido a la vista. La camara baja
mide ademas el ancho entero, como la primera persona: mirando arriba la colision
la deja a 0,84 de los ojos, y la caja central pillaba el trazo en una captura
de ocho o en ninguna), todas a la vez; y un trabajo final, «CI completa», que solo sale
verde si todo lo esta. La preparacion —Node, dependencias y Chromium con su
cache— es una accion compartida, `.github/actions/preparar`, que usan las dos
tandas. Cada pasada se lanza por el prefijo de su nombre
(`node tools/smoke.mjs life`). **Si anades una pasada al humo, anadela a la
matriz**, o no correra nunca en CI: el escaner de la auditoria lo cruza. Y el
humo sale en rojo si se le pide una pasada que no existe, para que una errata
en la matriz no sea una casilla verde que no prueba nada. Una casilla que falle
se relanza sola desde GitHub («Re-run failed jobs»).

`npm run smoke` construye el cliente y lo juega en Chromium headless leyendo el
estado real por `window.__verdant`. Los tests unitarios no detectan que el juego
no arranque; esto si. Hace nueve pasadas —escritorio, recursos (comer, sembrar,
minar), estaciones (mesa, horno, fundir, asar, comer carne y ropa), movil con
toques sinteticos, panel de desarrollo, muerte y noche, relieve, pantalla de
144 Hz y fauna (dibujo, paseo y caza)—; si tocas
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
