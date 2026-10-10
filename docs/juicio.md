# Esperando tu juicio

Partido de `docs/pendiente.md` el 2026-10-10, **literal** (ver su «Como
leerlo»). No se lee de corrido: antes de tocar una parte se buscan sus filas.
Las deducciones nuevas se anaden aqui, arriba del todo, en el mismo cambio que
las mete en el codigo.

**Donde la segunda columna dice «mas abajo», «arriba» o nombra una seccion**,
esa seccion esta en `docs/historia.md` (las tandas cerradas), o en
`docs/pendiente.md` si es la tanda en curso o algo aparcado. Se dejaron tal
cual para no tocar el texto.

## Esperando tu juicio

Todo esto esta **vivo en el codigo** y funcionando; son numeros y criterios que
elegi yo por deduccion, no tu. Cada uno remite a la seccion donde esta el
razonamiento entero. Ninguno bloquea nada: si no dices nada, se quedan.

| Qué | Dónde está contado | Cuesta cambiarlo |
|---|---|---|
| **CHOQUE DE DOS DECISIONES TUYAS**: con el terreno pisado con la huella entera (2026-10-10), **el bloque a dos casillas a altura 2 ya se alcanza** de un salto: el borde delantero del cuerpo llega a su cara con los pies a +1,13 y se queda de pie en su filo. Tu enunciado del salto (2026-09-28) decia que no. O se acepta, o se recalibra el salto (`GRAVITY`, `JUMP_SPEED`, que son deduccion mia) | `docs/reglas.md`, regla 21; `tests/jump.test.ts` | dos numeros |
| Fisicas, animales: **el reposo por cajas**: el cuerpo reposa en el maximo, sobre cada caja, de lo mas alto bajo ella menos su altura sobre los pies; consecuencia rara, **una cabeza que toca el borde de una pared a menos de medio bloque sobre su base sube al animal entero**, como un escalon | `docs/fauna.md`, el cuerpo y el terreno | la formula de `partsRest` |
| Fisicas: si algo crece bajo un cuerpo y asoma mas de lo que se sube, **se queda donde esta**, sin subirse a medias apoyado en otra cosa | `docs/reglas.md`, regla 21 | una linea en `footing` |
| Fisicas, camara: **el retraso es exponencial** (constante de 0,1 s), no un retraso puro: el puro daria el mismo salto del escalon 0,1 s despues. Andando a ritmo constante va justo 0,1 s por detras | `docs/controles.md`, las tres vistas | una formula en `chase` |
| Fisicas, camara: **mas lejos de 8 casillas no persigue, salta** (nacer, reaparecer, `?x=&y=`); el punto de mira se busca **hasta 64** y **no se acerca a menos de 0,05** de los ojos | `docs/controles.md`, las tres vistas | tres numeros en `camera-lag.ts` |
| Fisicas, camara: **la primera persona tambien va rezagada** y mira al punto de mira desde sus ojos perseguidos; pegado a una pared, subiendo un escalon, se nota un cabeceo breve hacia el punto | `docs/controles.md`, las tres vistas | una linea en `follow` |
| Fisicas, camara: el deslizador del retraso **no vuelve a 0,1 al cerrar el panel** (si al recargar) | `docs/devtools.md` | una linea en `toggle` |
| Fisicas, animales: la inercia va en su **avance hacia delante**, y al llegar o al girar sin avanzar **se deslizan frenando por su rumbo** | `docs/fauna.md` | `brakeAnimal` y `glide` |
| Fisicas: la inercia frena y arranca **al ritmo del paso que se lleva puesto**: soltar a la vez la direccion y la carrera frena desde correr al ritmo de andar, en 0,16 s y no en 0,1 | `docs/reglas.md`, regla 21 | una linea en `walk` |
| Fisicas: contra una pared, **el eje bloqueado pierde su velocidad** (no se acumula impulso que salga disparado al rodearla) | `docs/reglas.md`, regla 21 | una linea en `slide` |
| Voxeles: **la columna interpola el relieve entre las esquinas de su casilla**, sin ruido nuevo; consecuencia, **las cordilleras ya no dan acantilados de dos**, sino paredes de un bloque que se saltan, y las paredes de dos o mas solo salen de los salientes | `docs/relieve.md`, voxeles | la formula de `columnFrom` |
| Voxeles: **lo que es agua lo decide la casilla** (sus cuatro columnas a -1), asi la costa no se mueve | `docs/relieve.md`, voxeles | una regla en `generateChunk` |
| Voxeles: **el arbol, el arbusto y el brote van con lo generado** (columna mas baja), aunque el brote lo siembre el jugador; solo las estaciones van sobre lo que tocan | `sim/boxes.ts`, `objectBase` | una regla |
| Voxeles: las **estaciones siguen ocupando una casilla de 1** (colocarlas a medio bloque romperia «un objeto por casilla» mientras la vida va por casilla de 1) | Fase 1, arriba | la tanda de construir |
| Una caja por objeto: los animales **se apoyan en sus partes mas bajas** (las patas; el caparazon del cangrejo; el tronco de la gaviota) | Una caja por objeto, mas abajo | una funcion en `boxes.ts` |
| Una caja por objeto: una caja que asoma **mas de `STEP_UP` sobre los pies no se pisa** —un arbol que crece bajo la huella deja al cuerpo metido, no lo sube de golpe a su techo— | Una caja por objeto, mas abajo | un parametro en `jump.ts` |
| Una caja por objeto: las **medidas por casilla** (el nacimiento, `reachableArea`, `analyze-world`) siguen contando una casilla con tronco o roca como que no se cruza: miden **por lo bajo** de lo que el cuerpo recorre | Una caja por objeto, mas abajo | una regla en `World.isSolidAt` |
| Una caja por objeto: las **medidas de las cajas** (la roca 0,9 de ancho y 1,0 de alto, sacadas de su dibujo) ahora tambien chocan: entre dos rocas vecinas no se pasa, y una se sube de un salto | `sim/boxes.ts` | numeros en `ROCK_BOX` |
| Cajas de depuracion: **12 casillas** a la redonda; el **jugador de los pies a los ojos**; se rehacen en cada fotograma | `docs/devtools.md`, las cajas | numeros en `debug-boxes.ts` |
| El boton de desarrollo del movil: una **llave inglesa de trazo** (como el resto de esa columna, a falta de tu juicio sobre la directriz 3), y el **panel al lado de la columna**, como el HUD | `docs/devtools.md`, el movil | un icono y una regla CSS |
| Equipables: los **usos de las armas**, 30, 90 y 180, tres cuartos de los de la herramienta de su material (tu pediste «menos») | Equipables, mas abajo | tres numeros en `toolStats` |
| Equipables: **que gasta un golpe**: lo que da impacto (un animal, o algo que se trabaja); al aire o a un brote, nada; **uno por golpe y por objeto**, asi un barrido a un animal y un arbol gasta uno del arma puesta y otro de la mano | Equipables, mas abajo | una regla en `tryHarvestArea` |
| Equipables: **soltar sobre lo puesto lo intercambia** si lo puesto se podria quitar (la espada sobre el punal, la mochila sobre la bolsa con sus casillas vacias) | Equipables, mas abajo | una regla en `Inventory.moveWorn` |
| Equipables: las **14 casillas se ven iguales**, todas con su icono y todas destino de arrastre, aunque casi ninguna tenga aun que ponerse (antes, las sin ropa iban apagadas); el **nombre, al pasar el raton** | Equipables, mas abajo | una linea |
| Equipables: los **dibujos de los iconos**, rehechos segun tu directriz 3 (siluetas medievales) y con tus correcciones: capa vista de frente, sin capucha, con cuello alto, broche y la tela de atras visible (segun tus referencias), yelmo con penacho, hombreras con puas, mochila de aventurero con manta, peto, amuleto, cinturon con bolsita, pantalon de armadura con cintura, anillo de sello, par de botas una detras de otra con el empeine bajo, huella de lobo, cabeza de caballo de perfil, espada y condecoracion de pecho (cinta y medalla con estrella) | `packages/client/src/equip-icons.ts` | un dibujo cada uno |
| Guia de arte: mi lectura de la **directriz 3**, que vale para **todo icono**, y la lista de los botones que hoy no la cumplen (algunos son de manejo y quiza no deban cambiar) | `docs/guia-de-arte.md`, directriz 3 | una tanda de iconos |
| Equipables: los nombres **sin tilde ni eñe**, como los demas objetos: «Punal de piedra» | Equipables, mas abajo | tres textos |
| Fauna: el **daño de un golpe** a algo vivo, 5 a mano y 10 por punto de poder de la herramienta (cualquier hacha o pico); golpear un animal gasta un uso. Las armas traen el suyo (tuyo: 15, 30, 45) | `docs/fauna.md`, el sistema de PV | dos numeros |
| Fauna: la **masa de cada etapa**, cria 15 % y joven 60 % del adulto (de ahi PV, alto y botin), y su **proporcion en el mundo**, 20 / 25 / 55 % | `docs/fauna.md` | numeros en `shared/src/fauna.ts` |
| Fauna: **densidad en el juego = 0,45 × √(densidad real)**, para que un chunk tenga animales | `docs/fauna.md`, aparicion | un numero |
| Fauna: el **botin** — carne 0,6 × √(masa), piel 1 (2 el bisonte adulto, ninguna la cria), plumas 1-3, caparazon 1; el cangrejo no da carne | `docs/fauna.md`, botin | numeros en `animalLoot` |
| Fauna: **asar** 2 de carne cruda + 1 de carbon da 2 de asada; la asada llena **35** de hambre | `docs/fauna.md`, botin | dos numeros |
| Fauna: el **paseo** — un punto de paso cada 20 s, territorio de 6 a 16 casillas, de 0,6 a 1,2 bloques por segundo, sin salir de su bioma y sin chocar con nadie | `docs/fauna.md`, la ley del observador | numeros en `SPECIES` |
| Fauna: **los animales no se curan** mientras estan cerca (al recargarse si: tu decision) | `docs/fauna.md`, el sistema de PV | una regla |
| El **impacto**: estrella de 0,18 a 0,42 bloques en 0,2 s, blanca y sin prueba de profundidad | `docs/efectos.md`, el impacto | tres numeros |
| Fauna, el cuerpo de bloques: las **medidas de cada plano** (que es `hit` ya es tuyo: cabeza, cuello, extremidades y tronco); la cabeza de la cria un 30 % mayor y la del joven un 10 %; los colores | `docs/fauna.md`, el cuerpo de bloques | numeros en `fauna-body.ts` y `fauna-model.ts` |
| Fauna, el choque: el **escalon de mas de `STEP_UP`** que estorba a una parte, y la rampa que no; **girar a 180°/s**; **no avanzar a mas de 45°** de su destino; la **indulgencia** del que no cabe; al ponerlo, **8 rumbos** desde el de su origen a su punto de paso | `docs/fauna.md`, el choque | numeros en `movement.ts` y `body.ts` |
| Fauna, que no se queden clavados (tu elegiste retroceder y girar, saltar todos un bloque y bordear): **retroceder 1 bloque** como mucho; un rodeo de **1 bloque** por **±45°, ±90°, ±135° y 180°**, el izquierdo antes; sin salida, **quieto hasta el siguiente punto de paso** | `docs/fauna.md`, lo que estorba | numeros en `movement.ts` |
| Fauna, el salto: en el aire **avanza lo justo para pasar el borde en lo alto del salto** (el plan decia a 5,2, la del jugador, y el bisonte adulto no llegaba: topa con la cabeza a 1,7 del borde), y si no llega, a tres cuartos o a la mitad del ascenso. El bisonte adulto salta asi unos 3,4 bloques de largo, y mas si tiene que probar a tres cuartos o a la mitad | `docs/fauna.md`, lo que estorba | una formula en `tryJump` |
| Fauna: **los cuerpos grandes aun se quedan quietos en sitios estrechos** — jabali (40-47 % del tiempo) y ciervo (16-23 %) en el bosque, bisonte (19-34 %) —: no caben al girar entre arboles a dos casillas. ¿Que los arboles no estorben a sus partes, solo a sus pies? ¿Rodeos mas largos? ¿Buscar camino? | `docs/fauna.md`, lo que estorba | segun lo que elijas |
| La **sonda de profundidad del jugador**: mal tapado y mal visto ≤ 5 % en cinco casos de terreno | `docs/fauna.md`, lo que quedo de la lamina | dos numeros del humo |
| Fauna: el **ciervo adulto se dibuja sin astas**, porque el dibujo aun no distingue sexos | `docs/fauna.md`, las especies | un dibujo |
| Fauna: los **dibujos y colores** de las diez especies y sus crias; el **alto minimo** de 0,22 bloques (el cangrejo); el medio ancho de cada caja | `docs/fauna.md`, las especies | dibujo y numeros |
| `GRAVITY = 62` y `JUMP_SPEED = 12`, deducidos de tu enunciado del salto | Fase 2 del relieve | dos numeros |
| Los arboles siguen frenando tambien en el aire | Fase 2 del relieve | una linea |
| **El mundo es empinado**: de cuatro direcciones solo una lleva a alguna parte, y saltando | Fase 2 del relieve | calibracion del relieve (regla 14) |
| El bonus de equilibrio **no lo cobra lo inerte** (piedra y minerales) | Cabos sueltos | una linea |
| Como se agrupa un bioma: la conexion es por chunk y `isTracked` no caduca | Cabos sueltos | trabajo de verdad |
| **El relieve se lee menos de la mitad de alto** tras las proporciones | Proporciones nuevas | calibracion del relieve |
| El grosor del barrido: 0,12 casillas, redondeado al alza por el antialias | El barrido del 3D | un numero |
| Los ojos a **1,75** para las tres vistas y el golpe (la orbital miraba a 1,6) | Golpe por hitbox y una sola mirada | un numero en `sim/aim.ts` |
| Inclinacion de arranque **−0,62** tambien en primera persona (antes entraba a −0,2) y tope de **±83 grados** | Golpe por hitbox y una sola mirada | numeros en `camera.ts` |
| Sembrar a menos de 3 bloques (el alcance es tuyo) **en horizontal**, no a lo largo de la mirada (asi basta mirar 35 grados abajo, no 44) | Golpe por hitbox y una sola mirada | una linea |
| El tronco que se golpea es una **caja del grosor del pie**, y el que se ve estrecha hacia la copa: a media altura la picea negra se dibuja de 0,16 y su caja mide 0,21 | Auditoria al cerrar la tanda 2 | estrechar la caja o no estrechar el dibujo |
| Hitboxes: arbusto 0,9 de ancho × 1,1, roca y minerales 0,9 × 1,0, brote 0,3 × 0,85 | Golpe por hitbox y una sola mirada | numeros en `gathering.ts` |
| Colision de camara: se para **0,3** antes, la isometrica a **60** como mucho, y el jugador se oculta con la camara a menos de **1** | Golpe por hitbox y una sola mirada | numeros en `camera*.ts` |
| Grosor del barrido en primera persona: medio ancho **0,04** a 3 bloques | Golpe por hitbox y una sola mirada | un numero en `effects.ts` |
| El barrido se **congela en el mundo** al nacer: girar la camara despues no lo arrastra | La accion es un cono | una linea |
| En tercera persona **el personaje tapa el centro de la pantalla**, que es hacia donde se golpea | Golpe por hitbox y una sola mirada | un encuadre por encima del hombro |
| El cuarto de vuelta propio de cada aspa | Las features ya son aspas | un numero |
| El tamano y la intensidad de la sombra tumbada | Las features ya son aspas | dos numeros |
| El material de las aspas **no se ilumina**, para que el aspecto no cambiara | Las features ya son aspas | cambiar a Lambert, con pegas |
| La noche como **vela sobre la pantalla**, no bajando las luces | El isometrico se retira | trabajo de verdad si se quiere luz |
| Sin `?seed` se juega un mundo al azar (el 3D usaba siempre el 12345) | El isometrico se retira | una linea |
| Salud y hambre **sin numero** en los anillos | La franja de salud y hambre | CSS |
| Los iconos de los botones y la «i» del HUD en **monocromo**, como el ojo; a color solo el corazon y los cubiertos | La franja de salud y hambre | SVG |
| El dedo de ACCION no gira la camara hasta moverse **6 px** (`TAP_SLOP`), para que el pulgar quieto no de tirones | `docs/controles.md`, el dedo de ACCION | un numero |
| Primera persona: catalejo hasta **15°** (el campo de vision ya es tuyo: 70-120, 70 por defecto) | `docs/controles.md`, las tres vistas | un numero en `camera.ts` |
| Sensibilidad del raton capturado: **0,0025 rad por pixel** (unos 0,14 grados) | El raton lleva la mirada | un numero en `camera.ts` |
| Con el cursor capturado **un clic es un golpe** y mantener no repite | El raton lleva la mirada | un temporizador |
| Al morir el cursor **se suelta** para pulsar «Reiniciar», y reiniciar lo vuelve a capturar | El raton lleva la mirada | una linea |
| Un toque de verdad **apaga** el modo raton (portatil tactil), y ya no hay pausa por el cursor | El raton lleva la mirada | una linea |
| Textos del aviso: «Haz clic para jugar» al arrancar y «Haz clic para continuar» despues | El raton lleva la mirada | HTML |
| Casillas iniciales y tope: **16 y 100**, ya decididos por el autor (antes, 8 y 20 mios) | Recoleccion y fabricacion | — |
| Mesa de **1 × 1 × 1** bloques y horno de **1,25** de alto: la caja que se ve es la que estorba y se golpea | Recoleccion y fabricacion, tanda 2 | numeros en `gathering.ts` (`STATION_BOXES`) |
| Una estacion **no se coloca en un talud** (quedaria colgando) **ni donde pise el cuerpo** del jugador | Recoleccion y fabricacion, tanda 2 | dos lineas en `tryPlace` |
| USAR abre lo que toca **el rayo central** de la mirada, al alcance del golpe (3); lo que haya detras de otra cosa no se abre | Recoleccion y fabricacion, tanda 2 | `gazeTarget` en `aim.ts` |
| La ropa abre **tramos fijos**: la cintura las casillas 17-18, la espalda las 19-24, aunque solo se lleve una | Recoleccion y fabricacion, tanda 2 | `inventory.ts` |
| Una prenda se quita **solo a una casilla vacia** de fuera de su tramo; tirarla puesta, solo con el tramo vacio | Recoleccion y fabricacion, tanda 2 | `inventory.ts` |
| Categorias: a mano **Herramientas y Estaciones**; mesa **Herramientas y Ropa**; horno **Fundicion** | Recoleccion y fabricacion, tanda 2 | texto en `RECIPES` |
| Las estaciones se apilan **hasta 100** como un material; herramientas y prendas, de una en una | Recoleccion y fabricacion, tanda 2 | `stackMax` |
| Nivel de las herramientas: **piedra 1, cobre 2, hierro 3** (el hierro pide 2) | Recoleccion y fabricacion, tanda 2 | `toolStats` |
| El **dibujo** de la mesa (tablas, cuadricula arriba, patas, sierra y martillo) y del horno (ladrillo, boca con brasa, tiro arriba); el frente mira **hacia quien la puso** desde la 7.ª ronda (en la diagonal exacta gana el eje y, deduccion mia) | Recoleccion y fabricacion, tanda 2 | `stations-view.ts` |
| Nombres cortos y descripciones de los objetos nuevos; los huecos de ropa vacios dicen «Espalda» y «Cintura» | Recoleccion y fabricacion, tanda 2 | texto en `inventory-ui.ts` |
| «Materiales de metal» en el panel de desarrollo: lo justo para toda la tanda 2 | Recoleccion y fabricacion, tanda 2 | quitarlo |
| Con el inventario abierto **se salta** (tu dijiste «solo moverse») | Ajustes de la tanda 2 | una linea en `main.ts` |
| El modo de golpe **arranca en barrido** y no se recuerda entre partidas | Ajustes de la tanda 2 | una linea |
| La estacion puesta contra una pared cae con la **gravedad del salto** (62), y la caida solo se ve | Ajustes de la tanda 2 | `stations-view.ts` |
| La rueda **no tiene destello aparte**: la luz es la de la seleccion, que se mueve en el acto (antes, un destello de 140 ms junto a la luz vieja, y se veian dos) | Ajustes de la tanda 2, 6.ª ronda | `inventory-ui.ts` |
| Cerrar el inventario con Esc **captura al soltar la tecla**, con una red de **1 s** (`SOFT_GRACE_MS`): si Chrome la suelta antes, no pausa. La causa de la pausa sigue siendo hipotesis mia (la tecla apoyada soltaba la captura); **solo tu Chrome lo confirma** | Ajustes de la tanda 2, 7.ª ronda | `main.ts` y `pointer-lock.ts` |
| La rama de pruebas se llama **`pruebas`**; `slash` falla por debajo de **20 pixeles** en la vista normal, la camara baja y la primera persona (lo bueno, ~190 a ~10.000; los fallos, 0-13), y la vista que gira cerca **no hace fallar** (en la CI dio 46, 12 y ~190 sobre el mismo codigo) y **500** la estocada; a la CI se le da un temporizador de **5 min** antes de mirarla | Las pruebas pesadas a la CI | `ci.yml`, `slash.mjs`, `CLAUDE.md` |
| `?view=` en la URL para que las pruebas arranquen en perspectiva | Ajustes de la tanda 2, 7.ª ronda | `start.ts` |
| Los botones de los dialogos («Reiniciar», «Cancelar», «Tirar») **no llevan tecla escrita**; las teclas, en 8 px abajo a la izquierda | Ajustes de la tanda 2, 7.ª ronda | `index.html` |
| La pausa bloquea **tambien F3**, y deja pasar las teclas que se sueltan | Ajustes de la tanda 2, 7.ª ronda | `main.ts` |
| El registro en PC, centrado sobre INVENTARIO a 6 px: la mas vieja abajo, las nuevas encima | Ajustes de la tanda 2, 7.ª ronda | `main.ts`, `pickup-feed.ts` |
| Con la pausa que lo bloquea todo, la **barra del angulo** en PC se abre pasando el raton por el ojo **con el inventario abierto** (antes, en pausa) | Ajustes de la tanda 2, 7.ª ronda | — |
| La distancia a una estacion se mide **de los ojos al punto mas cercano de su caja, en 3D** | Ajustes de la tanda 2, 6.ª ronda | `sim/stations.ts` |
| No cuentan como «fuera» del inventario: la **barra de la mano**, el boton **INVENTARIO** y el **dialogo de tirar** | Ajustes de la tanda 2, 6.ª ronda | un selector en `inventory-ui.ts` |
| Panel de PC: **44 px** entre columnas, **32** a los lados, titulos de **15 px** a **14** de su rejilla | Ajustes de la tanda 2, 6.ª ronda | CSS |
| El barrido del TAP en **tercera persona** gira lo que haga falta para **verse** mas horizontal (en primera, tu «primero Y y luego X», exacto); se mira con 5 rayos y 19 giros | Ajustes de la tanda 2, 6.ª ronda | `flattestRoll` en `tap-input.ts` |
| Los dibujos del **tajo** y la **mirilla**; los anillos de PC de **56 px** y trazo 5 | Ajustes de la tanda 2 | SVG y CSS en `index.html` |
| La **mochila** redibujada como tu adjunto, casi cuadrada, a **34 px** en el boton (antes 28) | Ajustes de la tanda 2, 2.ª ronda | SVG y CSS en `index.html` |
| MODO en el movil de **44 px**, a 72 px (en cada eje) del centro del ataque | Ajustes de la tanda 2 | CSS |
| ENTRADA en TAP: el sostenido empieza a los **300 ms** quieto (`HOLD_MS`); el joystick no cuenta como «pantalla» | Ajustes de la tanda 2, 5.ª ronda | un numero en `gestures.ts` |
| En TAP, sin nada bajo el dedo (el cielo), se apunta a un punto lejano del rayo; el sostenido apunta al dedo **en cada golpe** | Ajustes de la tanda 2, 5.ª ronda | `aimAt` en `main.ts` |
| El arco de MODO y ENTRADA: **84 px** del centro del ataque, botones de **44**, a 153 y 117 grados | Ajustes de la tanda 2, 5.ª ronda | CSS en `index.html` |
| El dibujo de la **mano que toca** (TAP) y la cruz (MIRA) en ENTRADA | Ajustes de la tanda 2, 5.ª ronda | SVG en `index.html` |
| En PC la franja de la barra deslizable es de **18 px** (en el movil, 24) | Ajustes de la tanda 2, 5.ª ronda | CSS |
| Auto salto: se mira la **linea del centro del cuerpo** (la que decide la altura en la colision) y se salta a la distancia que se recorre mientras los pies pasan del borde, **con un tick de mas** | Ajustes de la tanda 2, 4.ª ronda | `systems/autojump.ts` |
| Auto salto: la altura maxima es **el apice exacto** (~1,16); delante de **agua o de un tronco** no salta | Ajustes de la tanda 2, 4.ª ronda | una linea en `autojump.ts` |
| El boton AUTO SALTO: **30 px**, una **«A»**, con su centro en el borde de SALTAR a 45 grados | Ajustes de la tanda 2, 4.ª ronda | CSS en `index.html` |
| La barra deslizable: franja tactil de **24 px**, pista de **6** y mando de **10**, el mando nunca menor de **44 px** | Ajustes de la tanda 2, 4.ª ronda | CSS y `MIN_THUMB` en `scroll-rail.ts` |
| En el aire, **sin mando no se avanza**: es «como en el suelo» | Ajustes de la tanda 2, 3.ª ronda | una linea en `movement.ts` |
| Correr gasta mas hambre solo si **de verdad se avanza** en el tick: empujando contra una pared con la carrera encendida se gasta como andando | Ajustes de la tanda 2, 3.ª ronda | una linea en `tick.ts` |
| El salto cobra su 0,25 % **al despegar**, no al pulsar: pulsar en el aire no cobra | Ajustes de la tanda 2, 3.ª ronda | una linea en `tick.ts` |
| Saltar el tiempo (`skipTime`) gasta hambre **como quieto** | Ajustes de la tanda 2, 3.ª ronda | — |
| Zona del joystick **sin medir** (antes de que aparezcan los botones tactiles): el cuadrante de antes | Ajustes de la tanda 2, 3.ª ronda | una linea en `gestures.ts` |
| Cubiertos: la cuchara **3,2** a la izquierda y el tenedor **1,5** a la derecha; puas a **3,2** de eje a eje | Ajustes de la tanda 2, 3.ª ronda | SVG en `index.html` |
| La **estocada** nace en el punto de pantalla **(0,55; −0,55)** —abajo a la derecha, en coordenadas normalizadas— a la **profundidad de los ojos** (al menos 1 delante de la camara) | Ajustes de la tanda 2, 2.ª ronda | `STAB_SCREEN` en `effects.ts` |
| Anillos del movil de **80 px** (USAR 64, ATAQUE 96), con un **disco oscuro** detras, **hambre primero** como en PC, a 12 px del borde y 10 entre ellos | Ajustes de la tanda 2, 2.ª ronda | CSS en `index.html` |
| **TAB** tambien enciende el boton MODO de PC; la luz dura lo que el toque y **al menos 150 ms**, como USAR y SALTAR | Ajustes de la tanda 2, 2.ª ronda | una linea en `controls.ts` |
| El marco de la **pared** es la cara de cubo tocada: una casilla de ancho y un nivel de alto | Ajustes de la tanda 2 | `overlays.ts` |
| Lo que no cabe: el golpe **no completa** y el objeto se queda, sin aviso; tirar (soltar fuera del panel y confirmar) lo **hace desaparecer**, hasta que haya objetos en el suelo | Recoleccion y fabricacion | `gathering.ts` / `inventory.ts` |
| Las **descripciones** de los objetos (una frase cada uno) | Inventario de los bocetos | texto en `inventory-ui.ts` |
| La **barrita de desgaste** en las herramientas (no estaba en el boceto) | Inventario de los bocetos | CSS |
| OTROS se cierra tocando fuera; su columna va centrada bajo el, y el HUD se abre a su lado para no taparla | Inventario de los bocetos | CSS y una linea |
| La barra del angulo en el movil sale **a la derecha del ojo**, que ahora esta en la columna de OTROS | Inventario de los bocetos | una linea en `fov-panel.ts` |
| Tamanos de la pantalla del movil (ataque 96, usar 64, correr y saltar 62; la barra de arriba encoge hasta dejar 10 px a cada redondo) | Inventario de los bocetos | CSS |
| El arrastre empieza a los **6 px** | Inventario de los bocetos | un numero |
| Esquirlas de golpe: saturacion al **40 %**, opacidad **45 %** (las **8** por golpe son tuyas) | Inventario de los bocetos | numeros en `effects*.ts` |
| Los ocho equipables sin ropa todavia se ven **apagados** | Inventario de los bocetos | CSS |
| La zona de lo seleccionado mide siempre lo mismo (una descripcion larga se desliza dentro); en PERSONAJE describe la prenda tocada | Ajustes del inventario, 2.ª ronda | CSS |
| Usar mirando a algo que no es una estacion **aun no hace nada** | Inventario de los bocetos | llega con puertas y demas |
| Los **dibujos** de los iconos: mano abierta, espada y pico cruzados, mochila, tres barras | Ajustes del inventario | SVG en `index.html` |
| Pestanas del movil en letra de **16 px**, subrayada la elegida | Ajustes del inventario | CSS |
| El **dibujo nuevo del ataque**: espada con hoja de contorno, guarda y pomo, y pico en media luna; el mango se corta bajo la hoja | Ajustes, 3.ª ronda | SVG en `index.html` |
| La rueda: **hacia abajo, la siguiente**; **una muesca, una casilla**; un trackpad acumula **50 px** por casilla; da la vuelta | Ajustes, 3.ª ronda | numeros en `controls.ts` |
| La cruz: **14 px**, blanca con contorno oscuro; se oculta al morir | Ajustes, 3.ª ronda | CSS |
| USAR y SALTAR encendidos al menos **150 ms** | Ajustes, 3.ª ronda | un numero en `controls.ts` |
| El registro de objetos: **3 s** de vida, sube **18 px**, entero el primer 40 % y luego se desvanece; la vieja se va en **0,3 s** al llegar la quinta; letra de **11 px**, ganancias en verde claro y perdidas en rojo claro | Ajustes, 3.ª ronda | numeros en `pickup-feed.ts` y CSS |
| Sin nada seleccionado, la descripcion queda **vacia**, sin texto de ayuda | Ajustes, 3.ª ronda | una linea |
| Confirmar al tirar: «¿Tirar N × Objeto?» con **Cancelar** y **Tirar**; tocar fuera cancela; si la casilla cambio entretanto, no se tira nada | Ajustes del inventario | `inventory-ui.ts` |
| En PC, con el cursor capturado la barra no se arrastra (el raton gira la vista): se arrastra con el cursor libre, o sea con E abierto | Ajustes del inventario | — |
| Trabajos: arbol 4 golpes (raro 6), roca 3, carbon 4, cobre 5, hierro 6 con pico de nivel 2; arbusto y guijarros 1 | Recoleccion y fabricacion | `workOf` en `shared` |
| Herramientas de piedra: poder 1, **40 usos**; hacha = 3 ramas + 2 piedras + 2 fibras, pico = 3 ramas + 3 piedras + 2 fibras | Recoleccion y fabricacion | `toolStats` y `RECIPES` |
| Un uso por **golpe util**, alcance a uno o a varios; golpear con el hacha una roca no gasta | Recoleccion y fabricacion | una linea |
| El dano acumulado se pierde a los **3 s** sin golpear | Recoleccion y fabricacion | un numero |
| Ramas a mano: 1 por golpe, **3 por arbol**, se reponen en **1 dia de juego**; talar da ademas 1 rama | Recoleccion y fabricacion | numeros en `gathering.ts` |
| Fibra: **1-2** por arbusto; el bono del 30 % no se aplica a ramas ni fibra | Recoleccion y fabricacion | numeros en `gathering.ts` |
| Guijarros: 1 piedra, **2 %** de las casillas vacias de tierra y **6 %** en roca; tumbados en el suelo, 0,6 de ancho y 0,2 de alto | Recoleccion y fabricacion | `worldgen.ts` y `gathering.ts` |
| Las peticiones del inventario **no se tiran en pausa**: se aplican al reanudar | Recoleccion y fabricacion | una linea en `main.ts` |
| «Materiales de piedra» en el panel de desarrollo | Recoleccion y fabricacion | quitarlo |
| La barra del angulo: **180 px** de largo, paso de **1 grado**, se despliega en **150 ms** | Angulo de vision ajustable | CSS y un atributo |
| En PC la abre solo el **raton** al pasar; un dedo que toca el ojo no cuenta como pasar por encima | Angulo de vision ajustable | una linea en `fov-panel.ts` |
| **Cualquier tecla** la cierra, flechas incluidas (con la barra enfocada no la mueven: se anda) | Angulo de vision ajustable | una linea |
| Los grados son **verticales**, como el 70 de siempre: a 120, un movil apaisado ve unos 150 en horizontal | Angulo de vision ajustable | una conversion |
| Con teclado el catalejo vuelve **0,8 s** despues de la ultima pulsacion de + o - | `docs/controles.md`, las tres vistas | un numero |
| Una roca vista desde arriba se lee como **dos cartas cruzadas** | Las features ya son aspas | darles modelo propio |
| Tronco = el tramo **desnudo** hasta la copa, que se apoya encima | Arboles altos | redibujar el arte |
| El tronco desnudo **por especie** (μ ± σ): picea comun 2,5 ± 0,35, alerce 4 ± 0,5, roble 2,4 ± 0,3, cerezo 2,2 ± 0,2, picea negra 2,1 ± 0,1, picea azul 2,2 ± 0,2; **truncada** en `[max(2, μ−2σ), μ+2σ]` | Troncos por especie | numeros en `sim/trunk.ts` |
| Grosor del tronco por especie (0,45; 0,40; **0,75**; 0,50; **0,22**; 0,40) y que crezca con `√(desnudo/μ)` | Troncos por especie | numeros en `sim/trunk.ts` |
| **Casi todas las copas quedan justo sobre la cabeza** (el minimo es 2 y el jugador mide 1,93); solo el alerce las deja altas | Troncos por especie | las medias de la tabla |
| El tronco va en escalones de **un cuarto de bloque** (13 alturas) | Arboles altos | un numero |
| El **alto de copa** de cada especie (5; 4,5; 3,5; 3; 5; 4,5) y el numero de pisos de las coniferas | Arboles con forma de su especie | numeros en `tree-shapes.ts` |
| Los pisos de las coniferas con **base plana**, sin puntas caidas | Arboles con forma de su especie | una linea |
| La punta engrosada de la picea negra: **tres pisos cortos que cierran en punta** desde el 62 % de la copa | Arboles con forma de su especie | numeros en `art.ts` |
| Los arboles raros **pierden su +15 %**: ahora son especie propia | Arboles con forma de su especie | un numero |
| Desde arriba, un bosque denso con copas grandes **tapa mas al jugador** | Arboles altos | es el cabo de la camara que ya estaba pendiente |

Y una cosa que **tu ya diagnosticaste y aparcaste**: los saltos que se pierden
al encadenarlos, pulsados en pleno vuelo. La causa esta localizada y el plan
escrito, y el 2026-09-28 decidiste **seguir sin margen de espera ni coyote
time** hasta ver si basta el arreglo de los pestillos (abajo).

---

