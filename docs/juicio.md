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
| Menu de una casilla: **los botones son del estandar** (fondo oscuro, tinta blanca, la luz al pulsar; directriz 6), no las pildoras blancas con letra negra de la foto | `docs/recoleccion.md`, las opciones de una casilla | reglas CSS de `#itemMenu` |
| Menu de una casilla: **solo en la rejilla del panel** (su primera fila incluida), no en la barra de abajo de la pantalla ni en lo equipado de PERSONAJE; en PC, **el clic abre el menu y ademas describe**, como antes | `docs/recoleccion.md`, las opciones de una casilla | `bindDrag` en `inventory-ui.ts` |
| Dividir: **la cantidad va de 0 a la pila menos 1** (separarla entera seria moverla); **1/2 redondea hacia abajo**; **con una pila de 1, apagado**; ✓ con 0 no hace nada | `docs/recoleccion.md`, las opciones de una casilla | `clampSplit`, `Inventory.split` |
| Menu: **6 px** entre la casilla y el menu; **«primera fila visible»** es la que no tiene otra fila entera encima dentro de la vista (y la ultima, debajo) | `docs/recoleccion.md`, las opciones de una casilla | `MENU_GAP`, `placeMenu` |
| Desplazar hasta la casilla elegida: **en el acto, sin animacion** | `docs/recoleccion.md` | `pick` en `inventory-ui.ts` |
| Movil: **con el inventario abierto, el panel tapa el boton MAS** (empieza a su altura); **el registro de objetos cuelga bajo INVENTARIO pero a la izquierda de MAS**, para no taparlo; **las casillas de la rejilla encogen** a lo que quepa con la barra deslizable a cada lado (54 px en 390) | `docs/controles.md`, el movil | reglas CSS de `#others`, `#pickupFeed` y `--cell` |
| PC: **la rejilla sigue enseñando 4 filas de alto**: con 15 casillas no sale la barra deslizable; con la mochila, si | `docs/recoleccion.md` | `#invGrid` en `index.html` |
| Suelo: **caduca tambien lo que vuela hacia el jugador** o lo que esta cayendo, si cumple los 2 dias | `docs/recoleccion.md`, objetos en el suelo | `stepDrops` |
| Botones: **la forma del relieve, por dentro**: un borde de luz de 2 px arriba a la izquierda y uno de sombra de 3 px abajo a la derecha (era, ademas, una sombra dura de 3 px debajo, que sobresalia; retirada por el autor el 2026-10-17); pulsado, encendido o abierto, los bordes se invierten y el icono (o el texto) baja 2 px, el boton quieto. Las esquinas: 12 px, y en proporcion 20 en ATAQUE, 14 en USAR, CORRER y SALTAR y 8 en AUTO SALTO | `docs/controles.md`, los botones | una regla al final del CSS |
| Botones: **MODO y ENTRADA, con un espacio de 10 px** con USAR, con SALTAR y entre ellos: el de USAR–ATAQUE, que no dio el autor. Lo demas es suyo: el espejo, los 4 px de corrimiento y medir MODO–ENTRADA de esquina a esquina (7,2 px). Lo mas cerca que quedan: ENTRADA a 4,1 px de AUTO SALTO | `docs/controles.md`, MODO y ENTRADA | `--modegap` en el CSS |
| Botones, el estandar (2026-10-18): **el azul de encendido y pulsado es el de USAR pulsado** (el mas vivo de los dos que habia), y **Reiniciar deja de ser azul claro con letra oscura** (y Tirar dejo de ser rojo, hasta que el dialogo de tirar se retiro ese mismo dia): «todos los botones» los incluye | `docs/guia-de-arte.md`, directriz 6 | `--btn-lit-bg` y la regla `.btn` del CSS |
| Suelo: **el salto del botin hacia arriba**, 3 bloques/s (la distancia, de 0 a 0,5, y la media altura son del autor; la espera de 0,5 s, el iman a 8 bloques/s, lo tirado y el icono de 0,4 con su vaiven los dio por buenos jugando) | `docs/recoleccion.md`, objetos en el suelo | `SCATTER_UP` en `systems/drops.ts` |
| Suelo: **la huella de un monton**, 0,15 de media, para buscar su suelo; **se funden a 0,5** uno de otro; las herramientas no se funden | `docs/recoleccion.md`, objetos en el suelo | `DROP_HALF`, `MERGE_RADIUS` |
| Suelo: **sobre el agua flota en su superficie**, a 0,2, en vez de hundirse | `docs/recoleccion.md`, objetos en el suelo | `dropFloor` |
| Suelo: **en el suelo no hay tope de pila**: dos montones que se funden suman lo que sumen | `docs/recoleccion.md`, objetos en el suelo | `merge` en `systems/drops.ts` |
| Suelo: **el botin de un arbol sale de la mitad de su tronco**, que es su caja, y no de la del arbol entero con la copa | `docs/recoleccion.md`, objetos en el suelo | `sourceOf` en `gathering.ts` |
| Suelo: **los 0 a 0,5 m se cuentan desde la cara de la caja** por la que sale el monton, no desde su centro: sale por fuera de ella, con su huella entera (0,15 de media) sin pisarla. Un tronco de 0,47 suelta sus ramas a entre 0,39 y 0,89 de su centro, por los ejes; un animal, igual desde la suya. Pegado a una pared mas alta, nace encima de ella | `docs/recoleccion.md`, objetos en el suelo | `scatterLoot` en `systems/drops.ts` |
| Inventario: **desde la barra, soltar dentro del panel abierto** (sin casilla) **no tira**: solo fuera del panel | `docs/recoleccion.md`, arrastrar | `bindDrag` en `inventory-ui.ts` |
| Recetas: **el ritmo del + y - mantenidos, su ejemplo tal cual**: uno en el acto, 3 el primer segundo, 4 el segundo, 5 el tercero…, a partes iguales dentro de cada segundo y sin tope de ritmo | `docs/recoleccion.md`, fabricar | `qty-hold.ts` |
| Recetas: **+ y - de 26 px**, apagados tambien en su tope (el + en lo que alcanza, el - en 1); y **la N se queda despues de fabricar**, bajando sola si ya no alcanza | `docs/recoleccion.md`, fabricar | CSS y `inventory-ui.ts` |
| Recetas: **los diseños de las 6 categorias** (pico y hacha, la mesa de lado, el crisol con la llama, la tunica, el muslo y la espada); los viste en la hoja | `docs/guia-de-arte.md`, directriz 5 | `CATEGORY_ROWS` |
| Colores: **el horno se oscurecio con la piedra**, por ser de piedra | `docs/pendiente.md`, la tanda | `STATION_FACES` |
| Iconos: **las reglas de estilo que saque de tu referencia**: contorno oscuro de 1 pixel alrededor de todo (`#1d1a26`, lo afirma un test), luz arriba a la izquierda, 3-4 tonos por material y 1 pixel de margen. Las hojas las aprobaste; las reglas, escritas asi, no las has visto | `docs/guia-de-arte.md`, directriz 5 | la paleta y un test |
| Iconos: **una paleta comun** de colores por material (madera, corteza, piedra, hierro, cobre, carbon, hoja, baya, carne, hueso, fibra, piel, pluma, caparazon…), de la que salen los 30; las estaciones, con los colores de su modelo | `docs/guia-de-arte.md`, directriz 5 | `ITEM_PALETTE` |
| Iconos: **48 px en las casillas**, el doble exacto de la rejilla, y **24 donde no caben 40 px de contenido** (el dibujo trae 2 px de margen a 48 y puede invadir el relleno); que sea siempre un multiplo entero es tuyo. La cantidad y el desgaste van encima, con sombra | `docs/recoleccion.md`, el panel | un numero en `index.html` |
| Iconos: **los botones a 24 px**, salvo ATAQUE, USAR, INVENTARIO y los anillos del movil, a **48** (eran 32, 36 y 36; AUTO SALTO, de 18 a 24): el multiplo entero mas cercano que cabe en su boton, que no cambia; la mochila llega justo al borde de su redondo; y los diseños de los cuatro que eran un caracter (CORRER, SALTAR, AUTO SALTO y el bioma) | `docs/controles.md`, los botones | numeros en `index.html` |
| Iconos: **la linea del registro de lo recogido mide 26 px** (era 15), para el icono de 24 | `docs/recoleccion.md`, el registro | `FEED_LINE` |
| Fisica Minecraft: **el ancho** de cada especie y etapa es el de sus partes `hit` de lado a lado, y **el lomo**, lo alto del tronco (o del caparazon). Hoy, ciervo adulto 0,48 × 0,48 × 1,08; bisonte 1,24 × 1,24 × 1,58 | `docs/fauna.md`, el choque | `collisionBoxOf` |
| Fisica Minecraft: **la subida**: tus 0,5 en 0,1 s son 5 m/s en vertical (`CLIMB_SPEED`); se sigue andando mientras sube, y la caja puede asomar un instante dentro del borde que esta subiendo | `docs/reglas.md`, regla 21 | un numero |
| Fisica Minecraft: **el salto se decide por lo que hay delante, por su rumbo**: si un paso por delante de su caja hay un escalon de mas de 0,5 y no mas de 1, salta aunque pudiera deslizarse de lado (era tu punto 2). Se ensaya entero antes de darlo; si no aterriza arriba, lo bordea | `docs/fauna.md`, el choque | el disparador de `tryJump` |
| Fisica Minecraft: **la indulgencia**: una caja que ya esta metida en algo (un arbol que crecio a su lado, o puesto a mano) anda mirando solo el punto de sus pies hasta que vuelve a caber | `docs/fauna.md`, el choque | una linea en `walkAnimal` |
| Fisica Minecraft, los empujes: la **masa** es el volumen de la caja (jugador 0,83; bisonte adulto 2,45; liebre 0,007); dos cajas que se solapan en planta y en alto se apartan **por la linea entre sus centros**, a **2 m/s como mucho**, en proporcion a lo que se solapan (lo que haria falta mover a uno para separarlos, sobre el lado de los dos); cada una se lleva la parte **de la masa de la otra**. Pasan por el choque de andar: no meten en una pared ni sacan del bioma, y lo que no cabe se pierde. Van antes de que ande el jugador, asi que lo que le empujan no le cuesta hambre | `docs/reglas.md`, regla 21 | numeros en `push.ts` |
| Fisica Minecraft: **al ponerlo**, en su punto de paso o, si su caja no cabe alli, en su origen, mirando de su origen a su punto de paso (la caja no gira: ya no hace falta probar 8 rumbos) | `docs/fauna.md`, el choque | una regla en `placeAt` |
| Pruebas: en `mobile` con el reloj manual, **el sostenido de TAP se sigue reconociendo con el temporizador del navegador** (300 ms reales) y no con el reloj del juego; la prueba espera ese tiempo real antes de avanzar los ticks. Pasarlo al reloj del juego tocaria `controls.ts`, que es codigo del juego, para una prueba | `docs/pruebas.md`, `mobile` y su toque sostenido | un temporizador en `controls.ts` |
| Pruebas: con el **reloj manual** el humo corre **a 60 Hz exactos**, un tick por frame, como un jugador a 60 Hz. El headless de antes iba a 5-13 FPS, con varios ticks por frame | `docs/pruebas.md`, el reloj manual | un numero en `elapse` |
| Pruebas: **`slash` con el reloj manual da otros numeros, todos por encima de sus puertas**, que no toco (5, 20 y 500): vista normal **184-192** pixeles (en la CI, con el de verdad, 12-16), camara baja 8.878-19.160 (5.612-13.738), primera persona 11.274-14.182 (906-960), estocada 9.537 (8.278). La normal ya no se ve «de canto»: a 60 Hz exactos cada captura cae en otro punto del trazo | `docs/pruebas.md`, el reloj manual | nada, o subir las puertas |
| Pruebas: `fauna` **busca su presa quieta durante hasta 20 s de juego**, y no en un solo instante | `docs/pruebas.md`, el reloj manual | un bucle |
| Pruebas: **`desktop` y `gestures` se quedan con el reloj de verdad** (alguna tiene que probar el bucle real y los dedos de verdad); `mobile`, migrada el 2026-10-13 | `docs/pruebas.md`, el reloj manual | una lista |
| Pruebas: **la vista normal de `slash` no caza el recorte por frustum**, aunque su puerta propia (`MIN_NORMAL`, 5) se puso para eso. Con la mutacion puesta cayeron a 0 la camara baja, la primera persona y la estocada, y la normal paso (CI, 2026-10-10). Esa puerta queda sin nada medido que la justifique; no la toco sin que lo digas | `docs/pruebas.md`, `slash` partido; `tools/slash.mjs`, las puertas | una puerta |
| Fisicas: si algo crece bajo un cuerpo y asoma mas de lo que se sube, **se queda donde esta**, sin subirse a medias apoyado en otra cosa | `docs/reglas.md`, regla 21 | una linea en `footing` |
| Camara sin tirones: **se interpolan el jugador y la fauna** (no los efectos ni las estaciones que caen), con **un tick de retraso** en lo que se ve de la posicion; mas lejos de **8** en un tick, salta | `docs/controles.md`, sin tirones; regla 8 | una lista y un numero |
| Fisicas, animales: la inercia va en su **avance hacia delante**, y al llegar o al girar sin avanzar **se deslizan frenando por su rumbo** | `docs/fauna.md` | `brakeAnimal` y `glide` |
| Fisicas: la inercia frena y arranca **al ritmo del paso que se lleva puesto**: soltar a la vez la direccion y la carrera frena desde correr al ritmo de andar, en 0,16 s y no en 0,1 | `docs/reglas.md`, regla 21 | una linea en `walk` |
| Fisicas: contra una pared, **el eje bloqueado pierde su velocidad** (no se acumula impulso que salga disparado al rodearla) | `docs/reglas.md`, regla 21 | una linea en `slide` |
| Voxeles: **la columna interpola el relieve entre las esquinas de su casilla**, sin ruido nuevo; consecuencia, **las cordilleras ya no dan acantilados de dos**, sino paredes de un bloque que se saltan, y las paredes de dos o mas solo salen de los salientes | `docs/relieve.md`, voxeles | la formula de `columnFrom` |
| Voxeles: **lo que es agua lo decide la casilla** (sus cuatro columnas a -1), asi la costa no se mueve | `docs/relieve.md`, voxeles | una regla en `generateChunk` |
| Voxeles: **el arbol, el arbusto y el brote van con lo generado** (columna mas baja), aunque el brote lo siembre el jugador; solo las estaciones van sobre lo que tocan | `sim/boxes.ts`, `objectBase` | una regla |
| Voxeles: las **estaciones siguen ocupando una casilla de 1** (colocarlas a medio bloque romperia «un objeto por casilla» mientras la vida va por casilla de 1) | Fase 1, arriba | la tanda de construir |
| Una caja por objeto: una caja que asoma **mas de `STEP_UP` sobre los pies no se pisa** —un arbol que crece bajo la huella deja al cuerpo metido, no lo sube de golpe a su techo— | Una caja por objeto, mas abajo | un parametro en `jump.ts` |
| Una caja por objeto: las **medidas por casilla** (el nacimiento, `reachableArea`, `analyze-world`) siguen contando una casilla con tronco o roca como que no se cruza: miden **por lo bajo** de lo que el cuerpo recorre | Una caja por objeto, mas abajo | una regla en `World.isSolidAt` |
| Una caja por objeto: las **medidas de las cajas** (la roca 0,9 de ancho y 1,0 de alto, sacadas de su dibujo) ahora tambien chocan: entre dos rocas vecinas no se pasa, y una se sube de un salto | `sim/boxes.ts` | numeros en `ROCK_BOX` |
| Cajas de depuracion: **12 casillas** a la redonda; el **jugador de los pies a los ojos**; se rehacen en cada fotograma | `docs/devtools.md`, las cajas | numeros en `debug-boxes.ts` |
| El boton de desarrollo del movil: el **panel al lado de la columna**, como el HUD (la llave inglesa, en pixelart desde el 2026-10-17, la aprobaste en la hoja) | `docs/devtools.md`, el movil | una regla CSS |
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
| Fauna: el **paseo** — un punto de paso cada 20 s, territorio de 6 a 16 casillas, de 0,6 a 1,2 bloques por segundo, sin salir de su bioma | `docs/fauna.md`, la ley del observador | numeros en `SPECIES` |
| Fauna: **los animales no se curan** mientras estan cerca (al recargarse si: tu decision) | `docs/fauna.md`, el sistema de PV | una regla |
| El **impacto**: estrella de 0,18 a 0,42 bloques en 0,2 s, blanca y sin prueba de profundidad | `docs/efectos.md`, el impacto | tres numeros |
| Fauna, el cuerpo de bloques: las **medidas de cada plano** (que es `hit` ya es tuyo: cabeza, cuello, extremidades y tronco); la cabeza de la cria un 30 % mayor y la del joven un 10 %; los colores | `docs/fauna.md`, el cuerpo de bloques | numeros en `fauna-body.ts` y `fauna-model.ts` |
| Fauna, el choque: **girar a 180°/s**; **no avanzar a mas de 45°** de su destino | `docs/fauna.md`, el choque | numeros en `movement.ts` |
| Fauna, que no se queden clavados (tu elegiste saltar y bordear): un rodeo de **1 bloque** por **±45°, ±90°, ±135° y 180°**, el izquierdo antes; sin salida, **quieto hasta el siguiente punto de paso** | `docs/fauna.md`, lo que estorba | numeros en `movement.ts` |
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
| A color solo **el corazon y los cubiertos**, en el rojo y el naranja de su anillo (que los botones van en monocromo es tuyo desde el 2026-10-17) | La franja de salud y hambre | CSS en `index.html` |
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
| Las descripciones de los objetos nuevos (los nombres cortos de las casillas se fueron con los iconos, 2026-10-17) | Recoleccion y fabricacion, tanda 2 | texto en `inventory-ui.ts` |
| «Materiales de metal» en el panel de desarrollo: lo justo para toda la tanda 2 | Recoleccion y fabricacion, tanda 2 | quitarlo |
| Con el inventario abierto **se salta** (tu dijiste «solo moverse») | Ajustes de la tanda 2 | una linea en `main.ts` |
| El modo de golpe **arranca en barrido** y no se recuerda entre partidas | Ajustes de la tanda 2 | una linea |
| La estacion puesta contra una pared cae con la **gravedad del salto** (62), y la caida solo se ve | Ajustes de la tanda 2 | `stations-view.ts` |
| La rueda **no tiene destello aparte**: la luz es la de la seleccion, que se mueve en el acto (antes, un destello de 140 ms junto a la luz vieja, y se veian dos) | Ajustes de la tanda 2, 6.ª ronda | `inventory-ui.ts` |
| Cerrar el inventario con Esc **captura al soltar la tecla**, con una red de **1 s** (`SOFT_GRACE_MS`): si Chrome la suelta antes, no pausa. La causa de la pausa sigue siendo hipotesis mia (la tecla apoyada soltaba la captura); **solo tu Chrome lo confirma** | Ajustes de la tanda 2, 7.ª ronda | `main.ts` y `pointer-lock.ts` |
| La rama de pruebas se llama **`pruebas`**; `slash` falla por debajo de **20 pixeles** en la vista normal, la camara baja y la primera persona (lo bueno, ~190 a ~10.000; los fallos, 0-13), y la vista que gira cerca **no hace fallar** (en la CI dio 46, 12 y ~190 sobre el mismo codigo) y **500** la estocada; a la CI se le da un temporizador de **5 min** antes de mirarla | Las pruebas pesadas a la CI | `ci.yml`, `slash.mjs`, `CLAUDE.md` |
| `?view=` en la URL para que las pruebas arranquen en perspectiva | Ajustes de la tanda 2, 7.ª ronda | `start.ts` |
| El boton del dialogo de morir («Reiniciar») **no lleva tecla escrita**; las teclas, en 8 px abajo a la izquierda | Ajustes de la tanda 2, 7.ª ronda | `index.html` |
| La pausa bloquea **tambien F3**, y deja pasar las teclas que se sueltan | Ajustes de la tanda 2, 7.ª ronda | `main.ts` |
| El registro en PC, centrado sobre INVENTARIO a 6 px: la mas vieja abajo, las nuevas encima | Ajustes de la tanda 2, 7.ª ronda | `main.ts`, `pickup-feed.ts` |
| Con la pausa que lo bloquea todo, la **barra del angulo** en PC se abre pasando el raton por el ojo **con el inventario abierto** (antes, en pausa) | Ajustes de la tanda 2, 7.ª ronda | — |
| La distancia a una estacion se mide **de los ojos al punto mas cercano de su caja, en 3D** | Ajustes de la tanda 2, 6.ª ronda | `sim/stations.ts` |
| No cuentan como «fuera» del inventario: la **barra de la mano** y el boton **INVENTARIO** | Ajustes de la tanda 2, 6.ª ronda | un selector en `inventory-ui.ts` |
| Panel de PC: **44 px** entre columnas, **32** a los lados, titulos de **15 px** a **14** de su rejilla | Ajustes de la tanda 2, 6.ª ronda | CSS |
| El barrido del TAP en **tercera persona** gira lo que haga falta para **verse** mas horizontal (en primera, tu «primero Y y luego X», exacto); se mira con 5 rayos y 19 giros | Ajustes de la tanda 2, 6.ª ronda | `flattestRoll` en `tap-input.ts` |
| Los dibujos del **tajo** y la **mirilla**; los anillos de PC de **56 px** y trazo 5 | Ajustes de la tanda 2 | SVG y CSS en `index.html` |
| La **mochila** redibujada como tu adjunto, casi cuadrada, a **34 px** en el boton (antes 28) | Ajustes de la tanda 2, 2.ª ronda | SVG y CSS en `index.html` |
| MODO y ENTRADA en el movil de **44 px** (su sitio, desde el 2026-10-17, es del autor: ver la fila de los 10 px) | Ajustes de la tanda 2 | CSS |
| ENTRADA en TAP: el sostenido empieza a los **300 ms** quieto (`HOLD_MS`); el joystick no cuenta como «pantalla» | Ajustes de la tanda 2, 5.ª ronda | un numero en `gestures.ts` |
| En TAP, sin nada bajo el dedo (el cielo), se apunta a un punto lejano del rayo; el sostenido apunta al dedo **en cada golpe** | Ajustes de la tanda 2, 5.ª ronda | `aimAt` en `main.ts` |
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
| La **estocada** nace en el punto de pantalla **(0,55; −0,55)** —abajo a la derecha, en coordenadas normalizadas— a la **profundidad de los ojos** (al menos 1 delante de la camara) | Ajustes de la tanda 2, 2.ª ronda | `STAB_SCREEN` en `effects.ts` |
| Anillos del movil de **80 px** (USAR 64, ATAQUE 96), con un **disco oscuro** detras, **hambre primero** como en PC, a 12 px del borde y 10 entre ellos | Ajustes de la tanda 2, 2.ª ronda | CSS en `index.html` |
| **TAB** tambien enciende el boton MODO de PC, al menos **150 ms**, como un toque | Ajustes de la tanda 2, 2.ª ronda | `flash` en `press-light.ts` |
| El marco de la **pared** es la cara de cubo tocada: una casilla de ancho y un nivel de alto | Ajustes de la tanda 2 | `overlays.ts` |
| Lo que no cabe en el inventario **cae al suelo** desde el 2026-10-18 (el autor); tirar **lo lanza** al mundo, ya no lo hace desaparecer | Recoleccion | `systems/drops.ts` |
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
| Pestanas del movil en letra de **16 px**, subrayada la elegida | Ajustes del inventario | CSS |
| El **dibujo nuevo del ataque**: espada con hoja de contorno, guarda y pomo, y pico en media luna; el mango se corta bajo la hoja | Ajustes, 3.ª ronda | SVG en `index.html` |
| La rueda: **hacia abajo, la siguiente**; **una muesca, una casilla**; un trackpad acumula **50 px** por casilla; da la vuelta | Ajustes, 3.ª ronda | numeros en `controls.ts` |
| La cruz: **14 px**, blanca con contorno oscuro; se oculta al morir | Ajustes, 3.ª ronda | CSS |
| **Todo boton** pulsado, encendido al menos **150 ms** (eran USAR y SALTAR; desde el 2026-10-18, el estandar de todos) | Ajustes, 3.ª ronda | `FLASH_MS` en `press-light.ts` |
| El registro de objetos: **3 s** de vida, sube **18 px**, entero el primer 40 % y luego se desvanece; la vieja se va en **0,3 s** al llegar la quinta; letra de **11 px**, ganancias en verde claro y perdidas en rojo claro | Ajustes, 3.ª ronda | numeros en `pickup-feed.ts` y CSS |
| Sin nada seleccionado, la descripcion queda **vacia**, sin texto de ayuda | Ajustes, 3.ª ronda | una linea |
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

