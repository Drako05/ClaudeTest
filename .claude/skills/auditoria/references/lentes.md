# Las lentes de la auditoria

Cada lente es una pasada con **una sola pregunta**. Mirar con todas a la vez es
mirar con ninguna: la auditoria del 2026-09-29 lo leyo todo de una vez, y lo mas
hondo solo salio al ejecutar y mutar.

**Como esta escrito** (el autor, 2026-10-19): cada lente lleva su pregunta, sus
**principios** y, al final, **«En este proyecto»**.
- Un principio describe **la logica de una omision** y el metodo que la caza,
  sin nombres de este proyecto: tiene que servir en cualquier proyecto
  parecido. Se citan por su letra y numero (`B2`).
- **«Casos»** remite a `escapes.md`: los fallos reales de los que salio. Son
  ejemplos, no el principio.
- **«En este proyecto»** dice como se aplica aqui: comandos, ficheros, sondas.
  Es lo unico que cambia al llevar la skill a otro proyecto.

Un escape nuevo **no anade un caso suelto**: se busca el principio que lo
cubre (fase 6 de `SKILL.md`). El escaner exige que cada escape este citado
aqui.

Se aplican **a lo que toco la tanda** (fase 0) y a todo lo que lo cita. Las
lentes C, F y J se aplican siempre al repo entero, porque la podredumbre de lo
que nadie toco es justo lo que ninguna tanda mira.

---

## Disparadores que cruzan lentes

Algunos cambios dejan restos en varias lentes a la vez. Cuando la tanda hace
uno, se recorre su lista entera.

- **Al sustituir un modelo** (una forma de calcular, de dibujar o de
  representar algo) por otro, lo que dependia del viejo se queda hablando de
  el:
  - A: sus valores y nombres;
  - D: las piezas que ahora solo sostienen los tests;
  - E: las cabeceras de los modulos que lo usaban, **y las de los que solo se
    comparaban con el** («como el terreno»);
  - F: el texto de la regla que lo enunciaba y cada resumen de ese texto
    (tambien el README);
  - G: lo que transformaba el formato viejo (escalas, medidas).
  Se busca su nombre y sus rasgos en todo el repo, no solo sus simbolos.
  Casos: #22, #26, #30, #31, #46.
- **Al arreglar algo, su hermana**: el mismo fallo casi nunca esta en un solo
  sitio. Se busca el patron arreglado en el resto del repo antes de cerrar.
  Casos: #7.
- **Al retirar algo** (un valor, un nombre, una tecla), entra en la lista de
  retirados **en el mismo cambio**, con sus valores y no solo sus nombres, para
  que el barrido mecanico lo vigile siempre. Casos: #19, #30.

---

## A. Numeros y nombres — ¿queda algun valor viejo?

**A1. Un valor cambiado vive en mas sitios que su definicion.** Se lista cada
valor que la tanda cambio (alcances, tiempos, rangos, tamanos, teclas,
nombres) y se busca el viejo en todo el repo, en todas sus formas escritas
(«2 bloques», «dos bloques», «2 s», «2000»). Cada literal que duplica una
constante se importa de ella, o se dice en un comentario que es copia.
Casos: #1, #19, #30.

**A2. Un numero se toma de donde vive y del sistema que se ejecuta.** No se
copia de un documento ni se saca de la formula continua: vale el que produce
el sistema de verdad (en pasos discretos, el de los pasos), y el que dice la
afirmacion (si dice «el mas fino», el minimo, no la media). Una medida de
antes de cambiar el modelo se repite despues. Casos: #20, #27, #44.

**A3. Un nombre que ya no describe es documentacion falsa que compila.** Una
variable, funcion o fichero cuyo nombre cuenta un comportamiento que ya no
tiene se renombra.

**En este proyecto**
- La lista de retirados es `references/retirados.md`; el escaner la vigila.
- Los literales que el humo no puede importar (es JS suelto): `STRIKE_RANGE`
  escrito a mano, con su comentario.
- Ejemplos: el humo con alcance 2 cuando era 2,5 (#1); el 2,5 en cinco
  comentarios con el alcance a 3 (#19); `wheelZoom` cuando la rueda ya no hace
  zoom; frenar de 5,2 a 0 en 0,1 s da 0,26 m en la formula y 0,22 a 60 Hz (#27).

## B. Comprobaciones — ¿puede fallar?

**B1. Toda comprobacion se ve caer, y por la razon que afirma.** Se rompe a
proposito lo que afirma y se mira caer; si no cae, no comprueba nada. Se lee
POR QUE cayo: una prueba que revienta antes de medir no ha mordido. Si
romperla es caro, al menos se razona con que estado saldria falsa; si no hay
ninguno, es de adorno. Y **una mutacion que sobrevive puede ser codigo que no
hace nada**: antes de escribir otra prueba, se mira si algun estado hace que
la linea cambie algo; si ninguno, se quita la linea. Lo mismo al **relajar
una comprobacion**: se ve antes el fallo que lo justifica. Casos: #42, #45,
P4.

**B2. El objeto de la medida es el que crees.** Antes de fiarse de una
comprobacion se verifica que lo medido:
- **existe y esta vivo** (un elemento retirado o de tamano cero mide ceros, y
  «no se ve» pasa siempre);
- **es ese y no el de al lado** (un clic de prueba que cae en otro elemento);
- **solo el suma** (un contador que tambien sube otra cosa de la escena);
- **aparece al menos una vez** donde mira la prueba (se imprime cuantos hay;
  si son cero, la prueba no lo ve y su mutacion no cae);
- **es el requisito, no la pieza tocada** (si se pide «una sola encendida»,
  se cuenta todo lo encendido, de cualquier clase).
Casos: #2, #12, #15, #21, #28.

**B3. El tiempo de la prueba no es el del hecho.** Una prueba que espera un
plazo fijo y luego mira, o que cuenta lo que hubo en una ventana de tiempo, o
que sondea una lista efimera, pasa o falla segun la maquina. El sistema anota
lo que hizo en un acumulador y la prueba **espera al hecho**, con un tope
dentro de la vida de lo que mide. Y lo que depende del ritmo del entorno de
prueba se mide con un reloj fingido, no con el suyo. Casos: #7, #9, #13, #23.

**B4. Un umbral sacado de una sola maquina no es un umbral.** El umbral va
entre lo bueno medido en varias maquinas y lo malo conocido. Una medida que
varia mucho entre ejecuciones se vuelve determinista y se le pone puerta, o
se imprime sin hacer fallar; una que no puede fallar se quita. Y lo que mide
pixeles se aisla de todo lo que se mueve o tapa por su cuenta. Casos: #24.

**B5. El entorno de prueba no es el del usuario.** Un navegador automatizado
no aplica todas las politicas (capturar el cursor sin gesto, pantalla
completa, audio) y una plataforma tiene umbrales propios (el toque largo del
sistema). Se fuerza a mano el caso adverso (hacer que la API falle) y, mejor,
no se pide la API desde un contexto dudoso y la prueba la espia y exige cero
llamadas. Ningun umbral de prueba se pega a uno de la plataforma.
Casos: #8, #11, #14.

**B6. Cada comprobacion parte de un estado conocido y no deja nada en
marcha.** No depende de donde quedo la anterior (se parte de un sitio
buscado), y al terminar no deja peticiones asincronas, temporizadores o
capturas que hereda la siguiente. Al meter una comprobacion entre otras, se
mira que deja en marcha; y la pasada se corre dos veces. Casos: P8.

**En este proyecto**
- Comprobaciones: `check(...)` de `tools/smoke.mjs` y `tools/gestures.mjs`,
  `expect` de vitest y guardas de las herramientas. Las mutaciones van en
  `tools/mutaciones.mjs` (`docs/pruebas.md`), y `tools/mutar.mjs` solo cuenta
  CAE con un `FALLO` o un `×` en la salida (P4).
- Ejemplos de B2: `isVisible` sobre `#thumbPad` de 0x0 (#2); el registro de
  PC retirado del DOM (se exige `isConnected`); el clic sobre el panel (#12,
  con `elementFromPoint`); las esquirlas del arbusto de al lado (#21); la caja
  de cada animal, cero en el escenario del humo (#28, se lleva con `&x=&y=`).
- Ejemplos de B3: destellos contados en 800 ms (#13); el registro con un
  plazo de 400 ms (#23); a 13 FPS todo frame lleva tick (#9, el reloj fingido
  es `highRefreshPass`).
- B4: el suelo de 50 px de `slash`, puesto con un peor caso local de 183, que
  la CI dio en 46 y luego en 12; el reloj manual de `docs/pruebas.md`;
  `?fauna=0` para medir sin animales (#24).
- B5: el toque largo de Chrome son 500 ms (#8); Esc en un Chrome de verdad
  (#11, #14), con un espia de `requestPointerLock`.
- B6: el humo parte del nacimiento o de `?x=&y=`.

## C. Herramientas fuera de CI — ¿siguen funcionando?

**C1. Lo que no se ejecuta se pudre.** Una herramienta que nadie corre deja de
funcionar sin que nadie se entere: se ejecutan todas las que la integracion
continua no corre. Si una se pudrio, se arregla y se anota por que: suele ser
un cambio de mandos o de maquetacion que no la tuvo en cuenta.
Casos: #3, #4.

**C2. Se ejecuta tambien en un entorno recien creado** si depende de el
(carpetas, cache): en el arbol de siempre hay restos que la sostienen.
Casos: #16.

**En este proyecto**: el escaner lista las herramientas que la CI no corre;
hoy `npm run shots`, `npx vite-node tools/analyze-world.ts` y el generador
del pixelart, que reescribe `world-art.ts` y pisaria sus retoques a mano: se
corre a otro fichero, `PIXEL_MUNDO_SALIDA=/tmp/world-art.ts npx vite-node
tools/pixel-mundo.ts`, y se compara con `diff` (`slash` corre en la CI desde
el 2026-10-02). `shots` era de antes del cursor capturado (#3),
`slash` miraba `#thumbPad` de 0x0 (#4) y no creaba su carpeta de capturas (#16).

## D. Codigo muerto — ¿hay algo que nadie usa?

**D1. Lo que se escribe y nadie lee esta muerto.** Campos del estado que se
escriben y no se leen, claves de una sonda que ninguna prueba consulta,
entradas de una tabla que nadie usa. **Una relacion se comprueba en los dos
sentidos**: no basta con que cada uso este en la tabla; cada entrada de la
tabla tiene que tener un uso, **y cada campo de cada entrada**. Casos: #33,
#40, #47.

**D2. Si dos mecanismos deciden lo mismo, el que pierde esta muerto.** Dos
reglas de estilo para el mismo elemento (por especificidad o por orden), dos
valores por defecto, dos sitios que fijan lo mismo: las propiedades del que
pierde se quitan alli. Casos: #6, #36.

**D3. Lo que solo sostienen los tests no esta vivo.** Al sustituir un modelo,
sus piezas auxiliares siguen exportadas porque un test las usa, y ningun
barrido las ve muertas. Se busca quien las llama fuera de los tests; si
nadie, se van y el test calcula lo suyo. Casos: #26.

**D4. No todo lo sin uso sobra**: lo que se deja a proposito se dice en el
informe, con su motivo. Y las constantes y parametros sin uso no los avisa el
compilador si esta configurado para callar.

**En este proyecto**
- El escaner da los exports que nadie usa y los CSS sin elemento.
- La sonda es `window.__verdant`: `grep -c "\bclave\b" tools/*.mjs` (#40).
- Ejemplos: `lastBlocked` tras quitar los avisos; `#invPanel h2` pisaba a
  `.invPage h2` (#6); las esquinas comunes al final del CSS (#36); los colores
  del horno en `ITEM_PALETTE` (#33); `bodyBoxes(…, feetOnly)` y `footPartsOf`
  (#26).

## E. Comentarios contra codigo — ¿dice verdad cada frase?

**E1. Cada afirmacion con un numero, un nombre o un «siempre/nunca» se
verifica contra el codigo**, frase a frase, en la cabecera y en cada
comentario de bloque de cada fichero tocado, tambien las que nombran algo sin
marcarlo como codigo. Los comentarios de **por que** son los que mas se
pudren: la razon se queda mientras el codigo cambia. Casos: #5, #10, #22.

**E2. Un comentario habla de lo que tiene justo debajo.** Al meter una linea,
un campo o una funcion entre un comentario y lo que documenta, o al mover lo
documentado, el comentario se queda encima de otra cosa. Y al borrar algo, se
busca su comentario. Casos: #18, #29, #39.

**En este proyecto**
- El escaner mira los nombres entre comillas invertidas, dos `/** */`
  seguidos y las cabeceras que dicen «lo usa `x.ts`» sin importarlo.
- El escaner no mira CSS: al borrar una regla se busca su comentario a mano
  (el de `.slot .hint`).
- Ejemplos: `aimZ` citaba `levelStep` (#5); `CLAUDE.md` citaba
  `regrowTicksOf` (#10); la cabecera de `hud.ts` decia que llevaba el
  inventario; las cabeceras que contaban a los animales como laminas (#22).

## F. Documentacion contra documentacion — ¿cuentan todas lo mismo?

**F1. Cada decision dice lo mismo en cada sitio que la cuenta, resumenes
incluidos.** Se toma cada decision de la tanda y se encuentra en cada
documento que la cuente. Si una regla esta enunciada en un sitio y entera en
otro, lo que cambie en uno cambia en los dos. Casos: #26.

**F2. Lo que un documento cita existe hoy**: nombres de codigo, pruebas,
ficheros y las filas que hablan de algo del sistema. Se buscan los literales
de cada fila en el codigo, y las filas se buscan **por el nombre** de lo que
cambio, no por su valor viejo: una fila de otro valor del mismo sitio tambien
se queda vieja. Casos: #25, #32, #35.

**F3. La historia se anota, no se reescribe.** Si el presente contradice una
seccion de historia, esta lleva su «*Luego*: …» en una linea.

**F4. Lo aprobado deja de figurar como pendiente.** Lo que el autor da por
bueno sale de la lista de lo que espera su juicio, y su marca en el codigo
dice que lo aprobo, con fecha. Casos: #38.

**En este proyecto**
- Los documentos: `CLAUDE.md` y el de cada parte en `docs/` (el indice de
  `CLAUDE.md` dice cual), `README.md`, `docs/pendiente.md`, `docs/juicio.md`,
  `docs/leyes.md`, `docs/isometrico.md` y la ayuda del HTML. Las reglas duras
  estan enunciadas en `CLAUDE.md` y enteras en `docs/reglas.md`.
- F2: `docs/juicio.md`, «Esperando tu juicio», con `grep -n "MODO"
  docs/juicio.md` (#35); «Espalda» y «Cintura» sobrevivieron tres auditorias
  (#32); el escaner cruza la columna «Prueba» de `docs/leyes.md` con los
  `it`/`describe` (#25).
- `docs/leyes.md`: el estado de cada ley y las «Deudas conocidas» siguen
  siendo ciertos (decia «el relieve no existe» semanas despues de existir).

## G. Logica de lo nuevo — ¿que pasa en los bordes?

**Metodo**: para cada caracteristica nueva se recorren estos principios con
el codigo delante.

**G1. Del hecho a su efecto hay un hueco.** Lo que decide que fue algo se
toma con **la hora del hecho**, no con cuando corre el codigo; y lo que el
usuario ve se aplica **en el mismo instante** del hecho, no en el siguiente
fotograma. Se pregunta:
- ¿que pasa si el sistema va ocupado y atiende tarde un evento que llego a
  tiempo? (un plazo que decide un gesto, medido con un temporizador);
- ¿y si corren varios pasos en un fotograma lento, o ninguno?;
- ¿y en el hueco entre el evento y el fotograma, si llega otro evento?
Se prueba enviando el evento con su hora real y atendiendolo tarde, y con un
reloj fingido para el ritmo de fotogramas. Casos: #9, #17, #43.

**G2. La plataforma se interpone entre el usuario y el codigo.** La entrada
llega transformada (el navegador acerca un toque a lo pulsable de al lado; el
sistema tiene su propio toque largo) y hay politicas (lo que se puede pedir
sin un gesto). Una zona «sin eventos» no es «no pulsable». Se prueba con la
entrada de verdad, por el camino del sistema, y se mira a que elemento llega;
si una zona tiene que hacer otra cosa, se decide por geometria en el oyente.
Casos: #11, #41.

**G3. Ciclo de vida.** Al reiniciar o cambiar de mundo, al morir, al pausar y
reanudar, al abrir y cerrar paneles: ¿que estado sobrevive y no deberia?

**G4. Entre dos pasos del usuario.** Confirmaciones, arrastres y esperas: ¿que
pasa si el estado cambia en medio? Lo que se confirma se vuelve a comprobar
al confirmar.

**G5. Unidades y entradas raras.** Bloques contra pixeles, pasos contra
segundos, grados verticales contra horizontales, tiempo escalado contra real.
Y entradas de otra clase por el mismo camino: rueda de trackpad contra la de
raton, toque contra raton en el mismo boton, teclas con el cursor capturado o
sin capturar. Casos: #27.

**G6. Cambiar el formato de algo invalida lo que lo transformaba.** Si cambia
como se pinta o se representa algo, cada regla que lo escala o transforma se
relee con el formato nuevo, y se mide el resultado compuesto **en cada clase
afectada**, no en una pieza suelta. Casos: #31, #34.

**G7. Lo nuevo se prueba contra cada clase de vecino.** Lo que aparece en el
mundo nace junto a, o desde, cada clase de cosa que lo puede bloquear (solida
y no solida). Y si lo nuevo se mueve o tapa por su cuenta, se repasa cada
medida que pudiera estropear (B4). Casos: #24, #37.

**En este proyecto**
- G1: el reloj fingido es `highRefreshPass`; el escudo de la pausa se pinta
  en el propio evento (#17); el toque largo del menu de una casilla se mide
  con `timeStamp`, y los gestos lo prueban con `Input.dispatchTouchEvent` y
  su `timestamp` (#43).
- G2: el anillo de 6 px de las casillas, decidido con `inCore` (#41).
- G3: el registro de objetos olvida el inventario al reiniciar, o escribiria
  «-N». G4: tirar comprueba que la casilla sigue teniendo lo mismo.
- G6: vector a pixelart (#31); en pixelart, un tamano que no es multiplo de la
  rejilla pinta pixeles desiguales; en un boton de alto fijo, el relleno se
  reparte y baja la mitad (#34).
- G7: montones, estaciones y cuerpos junto a un tronco y junto a una mata
  (#37); la fauna delante de `slash`, la sonda de profundidad y `shots` (#24).

## H. Tests — ¿dicen lo que afirman?

**H1.** El nombre de cada test tocado describe lo que de verdad afirma.
**H2.** Ninguno pasa por suerte: no dependen del paisaje, del tiempo real ni
del orden.
**H3.** Cada numero del autor tiene un test que lo fija, y cada deduccion del
agente uno que ata su relacion, no solo su valor.

**En este proyecto**: «avisa de inventario lleno» cuando ya no habia aviso.

## I. Estructura — ¿esta cada cosa en su sitio?

**I1. El mismo calculo en dos sitios**: se busca la logica nueva en el resto
del repo y se comparte.
**I2. Ficheros que crecen sin orden**: se parten solo si hay ganancia; lo
lineal y comentado puede quedarse largo.
**I3. Logica que deberia ser pura**, y medible sin interfaz, metida en la
interfaz: movimiento, tiempos o colas.
**I4. Lo que solo falla en el empaquetado** (ciclos de importacion) lo cubre
una prueba sobre el paquete, no la de los modulos sueltos.

**En este proyecto**: el registro de objetos y el del panel de desarrollo
hacian la misma cuenta (I1); `main.ts` y `__verdant` (I2); `effects.ts` puro
y `effects-view.ts` dibuja (I3); los ciclos los ve el humo («Ciclos de
importacion» en `CLAUDE.md`, I4).

## J. Reglas del proyecto — ¿se cumplen?

**J1. Las reglas que el proyecto se dio se verifican, no se suponen**: cada
una con su prueba o su barrido, tambien las de proceso (deducciones anotadas,
documentos al dia, integracion continua que corre lo que dice correr).
Casos: #25, #38.

**En este proyecto**
- `packages/sim` sin DOM ni `Math.random` (`tests/purity.test.ts`).
- Las mutaciones del mundo, por el overlay (regla 4).
- `docs/el-libro-del-mundo.md` intacto: `git diff` sobre el no muestra nada.
- `docs/leyes.md` al dia si la tanda acerco una ley.
- Toda deduccion del agente de la tanda (numeros, tiempos, textos, iconos)
  esta en «Esperando tu juicio» de `docs/juicio.md`, y nada del autor esta
  marcado como deduccion (F4).
- La matriz de `ci.yml` tiene una casilla por pasada de `tools/smoke.mjs` mas
  los gestos (el escaner lo cruza), y el humo sale en rojo si se le pide una
  pasada que no existe. El YAML parsea y cada paso apunta a un fichero que
  existe.

---

## El proceso del auditor

Los fallos del propio agente al verificar, no del codigo: los que hacen que
una verificacion diga algo falso.

**Q1. Para esperar algo, una senal que deja, no su nombre.** Se espera a un
fichero o una linea que el proceso escribe al terminar, nunca a que deje de
existir un proceso buscado por un texto que la propia espera contiene.
Casos: P1.

**Q2. Una medida vale solo si su entorno es el que crees**: la maquina sin
otras cargas pesadas a la vez, y lo medido construido con el codigo de ahora
(la variante que se mide se comprueba presente antes de dar numeros).
Casos: P2, P3.

**Q3. Lo que se toca se ejecuta en local, y lo tocado se encuentra
buscando.** Comprobar la sintaxis no ve los errores de ejecucion; y las
pruebas que miran lo cambiado se sacan buscando sus referencias, no de
memoria. Casos: P5, P6.

**Q4. Se restaura desde una copia tomada antes, no desde el control de
versiones**, que deshace tambien lo que aun no se guardo. Y antes de cerrar
se repasa la lista de cambios contra la de correcciones. Casos: P7.

(B1 cubre P4 y B6 cubre P8.)

**En este proyecto**: `until grep -q '^fin:' LOG` (P1); las pasadas de
navegador, de una en una (P2); `npm run build` en la misma orden que la
medida (P3); `grep -n "\.recipe" tools/*.mjs` para elegir pasadas (P6).
