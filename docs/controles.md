# Controles, camara y vistas

Lee esto antes de tocar una tecla, el raton, el cursor capturado y la pausa,
la pantalla del movil, la barra de PC, el ojo y las tres vistas, la camara,
los gestos, la ENTRADA (MIRA o TAP) o el auto salto: casi todo lo que hay aqui
lo decidio el autor, con fecha.

Estaba en `CLAUDE.md` hasta el 2026-10-02 y se mudo aqui **literal** (propuesta 3:
`CLAUDE.md` se carga entero en cada turno, asi que lleva solo lo operativo y
un indice de estos documentos).

Las teclas: WASD o flechas andan, **Espacio salta** (decision del autor en la
fase 2), Shift enciende la carrera, **E abre el inventario**, 1-4 eligen lo
que se lleva en la mano, y tambien la **rueda del raton**, que la recorre (hacia
abajo, la siguiente; da la vuelta; **una sola casilla encendida, siempre**: cada
muesca mueve en el acto la luz de la seleccion, sin destello aparte ni espera,
pedido del autor, 2026-10-01), R empieza un mundo nuevo, **+ y - acercan y
alejan** —solo ellas: la rueda dejo de hacer zoom el 2026-09-29, decision del
autor—, y P cambia de proyeccion. **Esc con el inventario abierto lo cierra**
sin pausar. **TAB cambia el modo de golpe** (barrido o preciso, del autor,
2026-09-30). **I abre la informacion y B el panel del bioma** (2026-10-02).
**Cada boton de PC tiene su tecla y la lleva escrita** en su esquina de abajo
a la izquierda (pedido del autor, 2026-10-02): el ojo P, la informacion I, el
bioma B, MODO TAB e INVENTARIO E; solo en PC. Los botones de los dialogos
(«Reiniciar», «Cancelar», «Tirar») no la llevan (deduccion mia). CTRL soltaba
el raton para pulsar botones hasta el 2026-10-02, y el autor lo retiro.
**Clic izquierdo golpea y clic derecho usa** lo que se
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
  navegador exige un clic para capturar. **En pausa no responde nada hasta
  reanudar** (pedido del autor, 2026-10-02): un escudo a pantalla completa
  (`#pause`) se traga los punteros —un clic encima de un boton reanuda y no
  lo pulsa— y un oyente en captura se traga las teclas y la rueda, F3
  incluida; las teclas que se sueltan pasan, para que no se queden pegadas.
  El oyente sigue **al escudo visible**, no a `MouseLook.paused`: muerto no
  se pinta la pausa, y bloqueando por el estado interno se tragaba la R del
  mundo nuevo (lo cazo el humo de la muerte). Y el escudo se pone **en el
  propio `pointerlockchange`**, no en el bucle de dibujo: un fotograma tarde,
  un clic en medio pulsaba el boton de debajo (lo cazo la CI en una maquina
  lenta; escape 17). El humo mira que hay encima de INVENTARIO dentro de ese
  mismo evento, con `requestAnimationFrame` retenido: si corre un fotograma
  entre soltar y el evento, lo tapa, y la comprobacion no mordia.
  Los botones se pulsan con el cursor suelto por el juego (inventario, panel
  de desarrollo), no en pausa.
- **El cursor que suelta el juego no pausa** (`MouseLook.free`): el
  inventario, el panel de desarrollo y la muerte. Al cerrarlos
  se intenta capturar; si el navegador no deja, **se sigue jugando** con el
  cursor suelto —se anda, pero el raton no gira la vista— hasta el primer
  clic, que captura sin golpear.
- **Un clic en la pantalla captura y reanuda, y ese clic no golpea.** Ya
  capturado, el clic izquierdo golpea en el acto, al apoyar: no hay arrastre
  que distinguir. **Esc no reanuda**, y no por gusto: Chrome no cuenta Esc
  como gesto para volver a capturar el cursor, porque es la salida de
  emergencia del jugador. El autor eligio que solo el clic reanude.
- **Esc con el inventario abierto lo cierra sin pausar y captura el cursor
  como E** (pedido del autor, 2026-10-02), pero **la captura se pide al
  SOLTAR la tecla y con red** (`captureSoft`): si el navegador la suelta en
  menos de `SOFT_GRACE_MS` (1 s, deduccion mia), no fue el jugador y no
  pausa; el cursor queda suelto por el juego hasta el primer clic, que
  captura sin golpear. Tres intentos llevo. Primero se recapturaba al
  apoyar Esc y el autor vio la pausa (2026-09-30); luego se dio por hecho
  que Chrome no dejaba y se probo forzando ese fallo, y la vio otra vez
  (2026-10-01); despues se dejo de pedir (escape 14), y el autor la queria.
  Hipotesis mia, que solo su Chrome confirma: la tecla apoyada soltaba la
  captura recien concedida. El humo espia `requestPointerLock` (cero
  llamadas con Esc apoyado, una al soltarlo) y prueba la red soltando la
  captura en el instante en que llega.
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
`aria-label`. Los dibujos son mios. Y **MODO** (2026-09-30) y **ENTRADA**
(2026-10-01), mas pequenos que USAR y en un **arco alrededor del ataque**, a la
misma distancia de su centro (boceto del autor): ENTRADA arriba, hacia SALTAR,
y MODO abajo a la izquierda, encima de USAR; radio y tamano, mios. MODO: un
toque cambia de modo de golpe, su icono dice cual —un tajo para el barrido, una mirilla para
el preciso— y **se enciende al pulsarlo**, como USAR y SALTAR (en PC tambien,
y con TAB). ENTRADA alterna **MIRA** y **TAP** (abajo), con la cruz o una
mano tocando por icono, y se recuerda. Y **AUTO SALTO** (2026-09-30), un redondo pequeno montado sobre la
esquina de arriba a la izquierda de SALTAR, como el boceto del autor: un toque
lo enciende o apaga, se ilumina encendido, **arranca apagado y se recuerda**
en el navegador de cada dispositivo (`localStorage`, como el angulo de
vision). Solo en el movil, decision del autor. Sustituyo al racimo en fila
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
boton —arriba a la izquierda en PC, dentro de OTROS en el movil— o con **I**
(desde el 2026-10-02; antes no tenia tecla); el inventario, con **E** o el boton
INVENTARIO. Cerrados no se escriben: el
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

**La vista de arranque es la primera persona** (decision del autor,
2026-10-02). Fue la perspectiva, que eligio para el juego final tras probar
perspectiva y ortografica en su telefono, antes de que existiera la primera
persona. `?view=perspectiva|orto|primera` arranca en otra (`start.ts`): las
pruebas que dependen de la vista la fijan asi —el humo, los gestos, `slash` y
`shots` abren en perspectiva— y el humo mide aparte que sin el parametro se
arranca en primera persona.

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

**La ENTRADA del movil: MIRA o TAP** (decision del autor, 2026-10-01). En
MIRA se actua hacia la cruz, como siempre. En **TAP**, ademas, tocando el
mundo (fuera de los botones y del joystick):

- **Un toque rapido** USA en ese punto y, al tick siguiente, ATACA alli **solo
  si el USAR no hizo nada**: abrir, comer, sembrar o colocar cancelan el
  ataque (`state.lastUsed`).
- **Mantenerlo** `HOLD_MS` (300 ms, deduccion mia, lejos de los 500 del toque
  largo de Chrome) ataca en el acto y luego con la cadencia del boton, hacia
  donde este el dedo; **arrastrarlo despues gira la camara sin dejar de
  atacar**. Arrastrar antes es solo camara, y dos dedos son la pinza.
- **ATAQUE y USAR siguen yendo a la cruz**, y la cruz se queda.

«Ese punto» es el del mundo bajo el dedo: un rayo de la camara activa por el
punto tocado que choca con el terreno o un hitbox (`rayHit`, el mismo de la
colision de camara), y la mirada de ese tick va **de los ojos a el**. El nucleo
no cambia: el golpe, sembrar o abrir salen de los ojos con esa mirada y su
alcance, y lo que quede lejos no se alcanza. El reparto: `gestures.ts`
clasifica el dedo (toque, sostenido `'tapHold'`, que gira sin contar para la
pinza, o arrastre), `controls.ts` lo traduce a peticiones, `tap-input.ts`
(puro, con su test) pone el orden tick a tick, y `main.ts` calcula la mirada.
Y el **giro del barrido**, para que se vea horizontal y centrado en el toque:
ver la regla 12 (`aimRoll`). El humo mide el trazo en pantalla en tres toques;
sin el giro, a un lado del jugador da 2,24.

**El AUTO SALTO** (decision del autor, 2026-09-30; `systems/autojump.ts`):
andando hacia un bloque que se sube de un salto, se salta solo **justo antes
de chocar**, y se sube sin rozar la cara. Solo si cabe en el salto
(`JUMP_HEIGHT`, el apice, ~1,16): ni dos bloques, ni una mesa sobre un
escalon, ni el horno de 1,25, y delante de agua o de un tronco tampoco. Es un
estado de la `Intent` (`autoJump`), como correr, y **cobra como un salto**. Se
mira la linea del centro del cuerpo, que es la que decide la altura en la
colision, y se salta a la distancia que se recorre mientras los pies pasan del
borde del bloque, con un tick de mas: sin el, a paso de marcha se rozaba la
cara un tick (`tests/jump.test.ts` cuenta los ticks parados y exige cero). Esa
lectura, y que delante de agua no salte, son deduccion mia.
