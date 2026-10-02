# Las pruebas: el humo, la CI y sus lecciones

Lee esto antes de escribir o tocar una comprobacion del humo, de los gestos o
del barrido, o la matriz de la CI. El procedimiento de cada ronda (local,
mutaciones, rama `pruebas`, `main`) sigue en `CLAUDE.md`, «Antes de dar algo
por bueno».

Estaba en `CLAUDE.md` hasta el 2026-10-02 y se mudo aqui **literal** (propuesta 3:
`CLAUDE.md` se carga entero en cada turno, asi que lleva solo lo operativo y
un indice de estos documentos).

**La CI va repartida** (`.github/workflows/ci.yml`): un trabajo para typecheck
y tests, y una **matriz con una maquina por pasada del humo** —`desktop`,
`resources`, `stations`, `mobile`, `devTools`, `life`, `relief`,
`highRefresh`, `fauna`— mas los gestos y el barrido en pixeles (`slash`, que desde que
corre aqui **falla** si la vista normal, la camara baja o la primera persona
bajan de 20 pixeles aclarados, o la estocada de 500; los fallos que tuvo daban
0, 2 y 13. La vista que gira cerca se mide pero no hace fallar: en la CI dio
46, 12 y ~190 sobre el mismo codigo, y como puerta fallaria a suertes), todas a la vez; y un trabajo final, «CI completa», que solo sale
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
