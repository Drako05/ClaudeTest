# Lo que está por hacer, y el registro de lo aprendido

Este fichero existe porque las notas de trabajo del agente viven en un contenedor
efimero y **mueren con la sesion**. Lo que hay aqui son decisiones del autor y
deuda tecnica que ninguna sesion nueva podria reconstruir leyendo el codigo.

Lo permanente del *como* esta en `CLAUDE.md` y en los documentos de `docs/` que
indexa (desde el 2026-10-02, cada parte del juego en el suyo); las leyes del mundo, en
`docs/el-libro-del-mundo.md` y `docs/leyes.md`.

**Ultima auditoria: commit `8396b7f`, 2026-10-02** (la tanda 2 entera, con sus
siete rondas de ajustes y las pruebas pesadas a la CI). La proxima parte de
aqui: ver `.claude/skills/auditoria/`.

**La primera tanda de fauna se cerro el 2026-10-04 sin su auditoria.** Abarca
del diseño de las especies a los animales de bloques y la guia de arte. **Es lo
primero de la sesion siguiente**: `/auditoria`, desde `8396b7f`.

- **Hay que mirar en ella un fallo intermitente de `slash`.** En la CI de
  `pruebas` `a28555b` (solo documentacion, el mismo codigo que `a1168a7`, verde
  dos veces) fallo «el barrido no llega a verse: normal: 16 pixeles», y al
  repetirlo salio verde.
- **Sospecha, sin comprobar**: un animal de bloques, opaco y paseando, se cruzo
  entre la camara y el barrido. Donde esta cada animal depende del tiempo real
  del humo, y antes no habia animales que taparan nada.
- **Un arreglo plausible**: que `slash` mida sin fauna en la escena, o que lo
  aparte de su campo de vision. Hay que confirmar la causa antes.

**Como leerlo.** Va de lo mas urgente a lo mas historico:

1. **Esperando tu juicio** — la lista de abajo. Son decisiones que tomo el agente
   por deduccion y que el autor puede corregir, mas lo que quedo senalado para
   que lo mire. **Empieza aqui.**
2. **Aparcado a proposito** — lo que el autor decidio dejar para luego.
3. **Tandas cerradas** — que se hizo, que se midio y que aparecio por el camino.
   Es historia, pero es historia que el codigo no cuenta.

---

## Esperando tu juicio

Todo esto esta **vivo en el codigo** y funcionando; son numeros y criterios que
elegi yo por deduccion, no tu. Cada uno remite a la seccion donde esta el
razonamiento entero. Ninguno bloquea nada: si no dices nada, se quedan.

| Qué | Dónde está contado | Cuesta cambiarlo |
|---|---|---|
| Equipables: los **usos de las armas**, 30, 90 y 180, tres cuartos de los de la herramienta de su material (tu pediste «menos») | Equipables, mas abajo | tres numeros en `toolStats` |
| Equipables: **que gasta un golpe**: lo que da impacto (un animal, o algo que se trabaja); al aire o a un brote, nada; **uno por golpe y por objeto**, asi un barrido a un animal y un arbol gasta uno del arma puesta y otro de la mano | Equipables, mas abajo | una regla en `tryHarvestArea` |
| Equipables: **soltar sobre lo puesto lo intercambia** si lo puesto se podria quitar (la espada sobre el punal, la mochila sobre la bolsa con sus casillas vacias) | Equipables, mas abajo | una regla en `Inventory.moveWorn` |
| Equipables: las **14 casillas se ven iguales**, todas con su icono y todas destino de arrastre, aunque casi ninguna tenga aun que ponerse (antes, las sin ropa iban apagadas); el **nombre, al pasar el raton** | Equipables, mas abajo | una linea |
| Equipables: los **dibujos de los iconos** (capa, casco, hombreras, bolso, pechera, collar, cinturon, pantalon, anillo, bota, huella, herradura, espada, escudo) | `packages/client/src/equip-icons.ts` | un dibujo cada uno |
| Equipables: los nombres **sin tilde ni eñe**, como los demas objetos: «Punal de piedra» | Equipables, mas abajo | tres textos |
| Fauna: el **daño de un golpe** a algo vivo, 5 a mano y 10 por punto de poder de la herramienta (cualquier hacha o pico); golpear un animal gasta un uso. Las armas traen el suyo (tuyo: 15, 30, 45) | `docs/fauna.md`, el sistema de PV | dos numeros |
| Fauna: la **masa de cada etapa**, cria 15 % y joven 60 % del adulto (de ahi PV, alto y botin), y su **proporcion en el mundo**, 20 / 25 / 55 % | `docs/fauna.md` | numeros en `shared/src/fauna.ts` |
| Fauna: **densidad en el juego = 0,45 × √(densidad real)**, para que un chunk tenga animales | `docs/fauna.md`, aparicion | un numero |
| Fauna: el **botin** — carne 0,6 × √(masa), piel 1 (2 el bisonte adulto, ninguna la cria), plumas 1-3, caparazon 1; el cangrejo no da carne | `docs/fauna.md`, botin | numeros en `animalLoot` |
| Fauna: **asar** 2 de carne cruda + 1 de carbon da 2 de asada; la asada llena **35** de hambre | `docs/fauna.md`, botin | dos numeros |
| Fauna: el **paseo** — un punto de paso cada 20 s, territorio de 6 a 16 casillas, de 0,6 a 1,2 bloques por segundo, sin salir de su bioma y sin chocar con nadie | `docs/fauna.md`, la ley del observador | numeros en `SPECIES` |
| Fauna: **los animales no se curan** mientras estan cerca (al recargarse si: tu decision) | `docs/fauna.md`, el sistema de PV | una regla |
| El **impacto**: estrella de 0,18 a 0,42 bloques en 0,2 s, blanca y sin prueba de profundidad | `docs/efectos.md`, el impacto | tres numeros |
| Fauna, el cuerpo de bloques: las **medidas de cada plano** y que es `hit` mas alla de la cola (patas, orejas, cuernos, astas, barba, alas y pico, no); la cabeza de la cria un 30 % mayor y la del joven un 10 %; los colores | `docs/fauna.md`, el cuerpo de bloques | numeros en `fauna-body.ts` y `fauna-model.ts` |
| Fauna, el choque: el **escalon de mas de `STEP_UP`** que estorba a una parte, y la rampa que no; **girar a 180°/s**; **no avanzar a mas de 45°** de su destino; la **indulgencia** del que no cabe; al ponerlo, **8 rumbos** desde el de su origen a su punto de paso | `docs/fauna.md`, el choque | numeros en `movement.ts` y `body.ts` |
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

## Auditoria al cerrar la tanda 2 (2026-10-02)

A peticion tuya, de `912c3d7` a `8396b7f`. No aparecio ningun fallo del juego;
si restos de cosas que cambiaron por el camino y una comprobacion que afirmaba
de mas:

- **El alcance de 2,5 seguia escrito en cinco comentarios** (el golpe, el
  barrido, un test y dos del humo) y en una fila de «Esperando tu juicio»,
  con el alcance ya en 3. Nadie lo buscaba: el valor viejo no se anadio a la
  lista de retirados al cambiarlo. Desde ahora se anade en el mismo cambio.
- **Diez comentarios de documentacion sueltos**, colgando encima de otro: el
  de `lookZ` quedo encima de `lookRoll` al meter el giro del TAP, el de
  `rollFor` encima de `tiltOf`, y uno de la sonda seguia diciendo que la
  reticula marca lo que el golpe alcanza, que quitaste el 2026-09-30. Otro
  decia que el ojo era «el unico control sin tecla anunciada», y desde la
  7.ª ronda todos la llevan. El escaner los busca ya solo.
- **Un test afirmaba de mas**: «entre dos rayos no cabe ni el tronco mas
  fino» comparaba con el grosor medio de la picea negra (0,22), no con el de
  la mas baja (0,21). Ahora lo saca de las especies, y se vio caer.
- **Restos de texto**: el hambre «en un dia» en un test (son dos); las
  recetas de estacion «a menos de 3 casillas» en un test y en el humo (es el
  alcance, de los ojos a su caja); un comentario del nucleo que hablaba del
  cursor apuntando, del isometrico; el README decia que USAR del movil solo
  come y siembra; el anillo, que era solo de PC.
- **Una fila de «Esperando tu juicio» que ya no existe**: «los 3 de la
  estacion se miden del centro del jugador al centro de su casilla». Lo
  sustituyo tu decision del 2026-10-01 (de los ojos a su caja, al alcance).

Se ejecuto lo que la CI no corre: `npm run shots` y `analyze-world`
funcionan; el relieve cuesta 0,61 puntos sobre la linea base, dentro del
presupuesto.

Se dejo a proposito:
- `lastBlocked`, `lastBroke` y `lastCrafted`, como en la auditoria anterior.
- El tronco que se golpea es una caja del grosor del pie, y el que se ve
  **estrecha hacia la copa**: a media altura, la picea negra se dibuja de 0,16
  y su caja mide 0,21. Es anterior a la tanda y es tuyo decidir si importa.
- En el modo TAP, dos toques en dos ticks seguidos darian el ataque del
  primero con la mirada del segundo. Un dedo no puede hacerlo en 17 ms.

---

## Auditoria antes de la tanda 2 (2026-09-29)

A peticion tuya, antes de la tanda 2. No aparecio ningun fallo del juego; si
restos de modelos ya sustituidos y tres comprobaciones rotas:

- **Tres comprobaciones que no median lo que decian:**
  - El humo daba por bueno un golpe solo hasta **2 bloques**: con el alcance
    en 2,5, un golpe legitimo a 2,3 lo habria hecho fallar.
  - El humo afirmaba que en PC **no** se ve `#thumbPad`, pero el contenedor
    mide 0x0 desde que cada boton va fijado por su cuenta: esa comprobacion no
    podia fallar. Ahora mira los cuatro botones.
  - La hermana del mismo fallo: `npm run slash` miraba `#thumbPad` para saber
    si el toque revelaba los botones, y como nunca «se veia», abortaba.
- **`npm run shots` no funcionaba**: era de antes del cursor capturado, y su
  primer arrastre capturaba el cursor. Ahora abre con el panel de desarrollo.
  Ni `shots` ni `slash` corren en CI, por eso nadie lo vio.
- **Restos de texto**:
  - el cono, la «segunda altura» y las «tres casillas» en comentarios;
  - la doc de `aimZ` citaba `levelStep`, que ya no existe;
  - la rueda como zoom, en nombres de variable y comentarios;
  - «el inventario no suelta el cursor»;
  - `CLAUDE.md`, `README.md`, `docs/leyes.md` («el relieve no existe») y
    `docs/isometrico.md`;
  - aqui, filas de «Esperando tu juicio» de cosas que ya no existen, y notas
    «*Luego*» en las secciones cuya historia cambio despues.
- **Una regla CSS duplicada** (`#invPanel h2` pisaba a `.invPage h2`), fundida
  en una con el mismo aspecto.

Se dejo a proposito:
- `lastBlocked`, `lastBroke` y `lastCrafted`: son resultado del nucleo y los
  usan los tests, aunque nadie los pinte.
- `main.ts`: es largo, pero lineal.

`npm run gestures` entro en la CI despues, a peticion tuya.

**Y de aqui salio la skill `auditoria`** (`.claude/skills/auditoria/`). Al
estrenarse, su escaner encontro cuatro restos mas que esta auditoria manual no
vio:
- `CLAUDE.md` citaba `regrowTicksOf`, que no existe;
- un comentario de `main.ts` citaba una constante que no existe;
- un test situaba la zona muerta en un fichero del isometrico;
- `slash` razonaba con las «tres casillas».

Estan en su registro de escapes.

---

## El estado del repositorio, revisado el 2026-09-23

Auditoría a petición tuya. Lo que salió, para que no haya que volver a buscarlo:

**El proyecto vivió entero en una sola rama.** `claude/capabilities-workflow-confirmation-mgqdm5`,
que era además la rama por defecto porque era la única, y **nunca ha habido un
PR**. Cuarenta y tantos commits bajo un nombre que es andamiaje de la
herramienta. Decidiste mudarte a `main`, y se creó **en el mismo commit**, así
que no hay historia migrada ni nada que pueda diverger.

**Hecho.** El repo tiene una sola rama, `main`, que es la de por defecto y la
que despliega a Pages. Verificado contra el remoto el 2026-09-23. El primer
despliegue desde `main` falló igual que antes del cambio, y eso corrigió un
diagnóstico del agente:

- Lo que se había escrito —«Pages solo acepta despliegues de la rama por
  defecto»— **era falso**. Quien decide es el **entorno `github-pages`**, con una
  lista de ramas permitidas que se fijó al configurar Pages y que **no sigue a la
  rama por defecto**. El agente no pudo leer esa lista —el proxy de la sesión
  bloquea esa parte de la API—, así que al principio era solo la explicación que
  cuadraba con los dos fallos. **Quedó confirmada** cuando añadiste `main` a la
  lista: el despliegue relanzado desde `main` salió en verde a la primera, sin
  cambiar una línea más.
- El guardia que se metió en `deploy.yml` se basaba en esa creencia falsa y **se
  quitó**: era una segunda compuerta con otra regla, y habría dejado sin
  desplegar a la única rama que el entorno aceptaba.

**La rama vieja la borraste tú desde la web**, porque el proxy de la sesión del
agente rechaza borrar ramas (HTTP 403) y un 403 del proxy no se reintenta ni se
esquiva. No se perdió nada: antes de borrarla se comprobó que su último commit,
`c9c1518`, era antecesor de `main` y que no aportaba ningún commit propio. Si
alguna vez hiciera falta, se recrea desde ese commit.

Lo que costó por el camino, para que no se repita: con las dos ramas disparando
a la vez, el push de la auditoría no publicó nada porque el grupo de
concurrencia canceló a la única que podía. Y al meter el guardia el agente rompió
el YAML sin mirarlo antes de empujar: un workflow es el único fichero del repo
que no cubren ni el typecheck, ni los tests, ni el humo. Desde entonces se valida
con un parser de YAML de verdad antes de cada push.

**Restos que se retiraron en la misma tanda:**

- 13 PNG rastreados bajo `screenshots/`, que el propio `.gitignore` ignoraba. Se
  ensuciaban en cada `npm run smoke` —hubo que descartarlos tres veces— y encima
  eran del isométrico, anteriores al 3D. Ya no se rastrean; siguen generándose en
  disco y CI los sigue subiendo como artefacto de cada ejecución, que es donde de
  verdad se miran.
- La cabecera del cliente 3D seguía diciendo «spike de usar y tirar; si esto no
  convence se borra la carpeta». Era el texto más desactualizado del repo.
- `CLAUDE.md` citaba un sim/life.ts que no existe (sin comillas a propósito: no
  es una ruta del repo). La aritmética del crecimiento
  vive en `sim/world.ts` (`lifeStep`) con sus constantes en `shared/ecology.ts`.

**Lo que se revisó y estaba limpio**, para no repetir el trabajo: no hay ni un
`TODO`, `FIXME`, `HACK` ni `@ts-ignore` en todo el código; no quedó ninguna
herramienta de usar y tirar de las que el agente fue creando; `docs/leyes.md`
está mantenido; y de todos los ficheros citados en `CLAUDE.md`, `README.md` y
`docs/*.md` solo uno no existía —el de arriba—.

---

## Las features ya son aspas — y lo que queda por ahí

Hecho lo que pediste: cada elemento son dos láminas cruzadas y el jugador sigue
mirando a la cámara, como elegiste. Las proporciones no se movieron ni un
decimal (1,93 / 3,17 / 1,17 / 0,88 / 1,09), que era el listón.

Lo que el aspa arregla está afirmado con un número y no con una captura: **la
silueta nunca baja de `cos 45º`** del ancho, mire la cámara desde donde mire, y
el mismo test mide media aspa para verla dar **cero** en dos rumbos. Ése era el
defecto que anticipaste.

Tres cosas que decidí yo y puedes corregir:

- **Cada aspa lleva un cuarto de vuelta propio**, sacado de la semilla, para que
  el bosque no se vea alineado a la rejilla. Sin giro queda más ordenado y más
  parecido a Minecraft; es un número.
- **La sombra tumbada** mide el 62 % del ancho del elemento y va al 26-42 % de
  negro. Es lo que las asienta; si la quieres más marcada o más sutil, son dos
  números en `shadows.ts`.
- **El material no se ilumina** (`MeshBasicMaterial`), para que el aspecto sea
  exactamente el de antes. Si prefieres que el sol afecte a los árboles, se
  cambia a Lambert — pero entonces las dos láminas de una misma aspa se iluminan
  distinto, que es feo, y habría que repensar el arte.

Y lo que conviene mirar: **una roca vista desde arriba se lee como dos cartas
cruzadas**, porque no tiene la simetría radial que tiene un árbol. Si te chirría,
la salida no es volver al billboard sino darles un modelo de verdad: son pocas
formas y son inertes.

**Lo siguiente natural por aquí, que ya estaba en tu lista de la migración:
agrupar las aspas por (chunk, especie) en `InstancedMesh`.** Hoy el mundo cuesta
~725 draw calls y casi todas son una por elemento; esta ronda no las subió, pero
tampoco las bajó.

---

## Proporciones nuevas — y una consecuencia que tienes que mirar tú

Hecho lo que pediste, y las medidas salen justo en tu enunciado: **jugador 1,93
bloques** («poco menos que 2») y **árbol 3,17** («poco más de 3»). Sube todo lo
que se apoya en el suelo con el mismo factor, así que las proporciones entre unas
cosas y otras son exactamente las de antes.

Dos números salieron mejor de lo que te dije en el plan, porque allí los estimé
del lienzo y luego los medí del dibujo: el **brote queda en 0,88** —por debajo de
la cintura, no casi tan alto como tú— y la **roca en 1,09**. La pega que te
señalé sobre los brotes desaparece sola.

**Lo que sí tienes que mirar: el relieve se lee menos de la mitad de alto.** Una
pared de un bloque pasa de llegarte al pecho a llegarte a la rodilla, y una cima
de 27 niveles de medir 34 personajes a medir 14. La física no cambia ni un
decimal —el salto sigue en 1,16 y `STEP_UP` en 0,5, que es casi exactamente
Minecraft—, pero **los 16 px por nivel los calibraste a ojo** y esto toca justo lo
que mirabas entonces. Si ahora el mundo te parece plano, la palanca no es el
tamaño de los sprites sino la ganancia de cordillera (regla 14), midiendo antes.

Y dos deducciones mías, corregibles: **`EYE = 1.6`** para la cámara (1.2 le
quedaba por las rodillas al personaje nuevo; conservar la proporción de antes
daría 2,8, que me pareció demasiado alto), y que **los árboles de 3,2 bloques
tapan bastante más** con la cámara baja — que es justo la oclusión de cámara que
sigue pendiente de la migración.

---

## El barrido del 3D, arreglado — y lo que queda de tu juicio

El barrido «no salia completo y se desvanecia casi de inmediato». **No era la
duracion ni la curva**: `SLASH_SECONDS = 0.22`, el barrido `t * 1.6` y el apagado
`(1 - t) * 0.85` son los tuyos y los del isometrico, y estan intactos. Eran tres
fallos de dibujado, cada uno confirmado reintroduciendolo y viendo caer la medida
(`npm run slash`, que cuenta pixeles de pantalla y no barridos lanzados):

| Fallo | Con el fallo | Arreglado |
|---|---|---|
| La esfera envolvente se congelaba donde diste el **primer** golpe de la partida, asi que al alejarte se recortaba todo | 80 mandados, **0 pixeles** | 103 |
| La prueba de profundidad dejaba que lo tapara lo que hubiera entre la camara y el arco | 2 pixeles | 104 |
| La cinta iba tumbada en el suelo y se veia de canto segun el rumbo | 13 pixeles | 104 |

Aviso honesto: **no pude ver tu video** —es H.264 y este contenedor no lleva
codecs propietarios—, asi que el diagnostico sale de leer el codigo contra su
original isometrico. Encaja con lo que describiste, pero si algo no cuadra con lo
que viste, dilo.

Y una cosa que decidi yo y puedes corregir: **el grosor**. El isometrico traza 3
px con la casilla a 32, o sea 0.094 casillas de ancho de mundo; aqui lo puse en
0.12 porque PixiJS suavizaba el trazo y el lienzo de three.js va sin antialias, y
a 2,6 px un quad sin suavizar se deshilacha. Si lo quieres mas gordo o mas fino
es un numero, y es de sensacion, o sea tuyo.

---

## Decision tomada: el juego pasa a 3D con estetica de sprites

**El 2026-09-12 el isometrico se congelo, y el 2026-09-26 se retiro del
todo** (ver «El isometrico se retira», abajo). Esta seccion es la historia de
por que se giro.

El autor probo un prototipo de 3D y **decidio girar**. Motivo, medido y no opinado: en una isometrica de angulo fijo
la informacion para entender el relieve **no esta en la imagen** —subir un nivel
equivale exactamente a retroceder dos filas, y el pie de un escalon queda siempre
tapado; las dos identidades las fijaba `tests/projection.test.ts`, hoy en la
historia (`b1d0d7a`)—. Wakfu lo
resuelve en diseno de nivel poniendo la altura en los bordes del mapa; en un
sandbox procedural eso no esta disponible.

Elecciones suyas:

- **Perspectiva**, no ortografica, para el juego final.
- **Billboards planos valen por ahora.** Los sprites de 4-8 direcciones se
  abordaran en la tanda de estetica.
- Confirmado en su telefono: **80+ FPS**, iguales en las dos proyecciones.

Lo que hace el giro asumible, y conviene no romperlo: `packages/sim` y
`packages/shared` **no se tocan** —mundo, relieve, biomas, ecologia, apuntado,
recoleccion y reloj entran intactos—, porque `sim` nunca supo que existia una
camara. Y `groundHeight(level, rampDir, fx, fy)` ya devuelve la altura continua de
cualquier punto de una casilla: eso ya es la descripcion de una malla.

### Lo que la migracion tenia que resolver

1. ~~**El terreno tapa al jugador** cuando la camara queda detras de una loma.~~
   **Hecho el 2026-09-28** con colision de camara (`camera-collision.ts`): se
   para antes del terreno y de los troncos.
2. **El personaje de frente y de espaldas**: un billboard plano se lee bien en un
   arbol y regular en un humanoide.
3. **Agrupar los sprites.** Entre 100 y 300 draw calls segun el angulo, casi todos
   arboles sueltos. A 80 FPS no bloquea, pero es la primera optimizacion.
4. ~~Que se retira del isometrico.~~ **Hecho el 2026-09-26**: se retiro entero
   (ver «El isometrico se retira»). Los puntos 2 y 3 siguen abiertos.

---

## Ajustes del inventario, en tres rondas — HECHO (2026-09-29)

Probaste el inventario de los bocetos y pediste ajustes en tres rondas. Lo que
quedo:

**Pantalla del movil**
- CORRER y SALTAR al borde derecho del ATAQUE; USAR a su borde de abajo.
- OTROS despliega en columna debajo de el.
- La barra de la mano, en el centro exacto de arriba.
- **Solo iconos**, sin rotulos; el del ataque, redibujado en la tercera ronda.
- USAR y SALTAR se encienden al tocarlos.

**Panel del inventario**
- Pestanas **Personaje | Inventario | Recetas** en lugar de las flechas, con
  el contenido pegado a ellas.
- Fijos: las pestanas, la zona de lo seleccionado (centrada abajo) y las
  categorias de recetas. Solo se deslizan la rejilla y la lista de recetas.
- **PERSONAJE** con tu segundo boceto (tres a cada lado, cuatro abajo), en PC
  y en el movil, con su zona de descripcion encajada con la de INVENTARIO.
- La descripcion se limpia al tocar una casilla vacia, y al abrir no hay
  nada seleccionado.

**Fabricar y mover**
- Fabricar en **1,5 s**, con la carga hasta el borde de los ingredientes.
- Arrastrar entre la rejilla y la barra con el inventario abierto, y dentro
  de la barra con el cerrado.
- Tirar pide confirmacion; desde la barra cerrada, soltar al vacio no tira.
- **Ningun aviso en pantalla.** Fabricar sin sitio queda para la tanda de
  objetos que se tiran al suelo.
- **Registro de objetos** «+5 Madera / -1 Bayas»: bajo INVENTARIO en el movil,
  abajo a la derecha en PC (tu eleccion), maximo cinco lineas.

**Mandos y vista**
- Alcance del golpe y de sembrar: **2,5**.
- **8 esquirlas** por golpe.
- Angulo de la primera persona de **70 a 120**, 70 por defecto (lo guardado
  por debajo de 70 se lee como 70).
- Sostener el ojo **0,5 s** abre la barra del angulo (era 1 s). De paso
  desaparece el tramo muerto: de 0,5 a 1 s Chrome ya no mandaba el toque.
- PC: la **rueda recorre la barra de la mano** y el zoom queda con + y -.
- PC: **Esc cierra el inventario** sin pausar. En pausa, **solo el clic
  reanuda** (tu eleccion: Chrome no deja volver a capturar con Esc).
- **Cruz en el centro** de la pantalla, en todas las vistas.

Lo comprueban:
- los tests del golpe (2,4 cae, 2,8 no; sembrar a 2,24 si, a 2,69 no), los del
  angulo y los del registro (`tests/pickup-feed.test.ts`);
- el humo: alineaciones medidas, pestanas, iconos, confirmar, de la rejilla a
  la barra, 1,5 s, la rueda, Esc, la cruz, la descripcion y el registro;
- los gestos con toques de verdad: la barra cerrada, de la rejilla a la barra,
  receta 1,5 s, y USAR y SALTAR encendidos.

## Inventario de los bocetos, y usar con clic derecho — HECHO (2026-09-28)

Probaste la tanda 1 y pediste cambios, con dos bocetos:
- **Clic izquierdo** golpea con lo que se lleva en la mano.
- **Clic derecho** (USAR en el movil) usa lo de la mano. Se van E=comer,
  F=sembrar, I, C y el boton COMER.
- **E** abre inventario y recetas juntos, sin pausar: PERSONAJE, INVENTARIO y
  RECETAS como en el boceto.
- En el movil, la pantalla del boceto: OTROS · barra · INVENTARIO arriba; salud,
  USAR y ATAQUE abajo, con CORRER y SALTAR encima.
- **16 casillas** y pilas de **100**.
- **Arrastrar** mueve, apila o intercambia, y soltar fuera tira.
- **Fabricar es mantener 2 s** (luego 1,5 s).
- **Esquirlas** pequenas, semitransparentes y poco saturadas al golpear sin
  romper, y sin barra de progreso.
- Sin iconos, y la cantidad solo como numero.

Varias cosas de aqui cambiaron en los ajustes de arriba: pestanas en vez de
flechas, iconos en los botones, 1,5 s para fabricar, confirmar al tirar.

Lo que decidi yo esta arriba, en «Esperando tu juicio».

Lo comprueban los tests del nucleo (mover y apilar, usar, fabricar sin sitio,
golpes sin romper), el humo con raton (E, arrastrar, tirar, mantener 2 s, clic
derecho para comer y sembrar, OTROS, las paginas del movil) y `npm run gestures`
con toques de verdad (arrastrar una casilla y mantener una receta).

## Equipables: catorce casillas, el Bolso, el Arma y las primeras armas — HECHO (2026-10-04)

Lo pediste asi:

- **Una columna mas a la derecha de PERSONAJE**: de 10 a 14 casillas. En orden
  de lectura: Capa, Casco, Hombreras, Bolso, Pechera, Collar, Cinturon,
  Pantalon, Anillo, Botas, Mascota, Montura, Arma y Emblema (`Equip`).
- **Un icono por casilla en vez de su nombre**, que se oculta al equipar algo.
  Elegiste siluetas vectoriales (`equip-icons.ts`).
- **Bolsa y mochila solo van al Bolso**, y elegiste **una a la vez**: el
  maximo baja de 24 a 22 casillas.
- **La casilla del Arma**: a los seres vivos les pega el arma puesta aunque se
  lleve otra cosa en la mano; a lo demas, lo de la mano.
- **Tres armas**: punal de piedra (a mano), espada de cobre y de hierro (en la
  mesa), en «Armas». Daño 15, 30 y 45, a falta de una sesion de equilibrio del
  combate; deben **durar menos** que las herramientas. Las recetas, mi
  propuesta, que aprobaste.
- **Un arma en la mano pega con ella**, y **todo golpe gasta** a lo que pega,
  vivo o inerte, en la mano o equipado. Esto **retira** la regla de antes, mia,
  de que golpear lo que no es suyo no gastaba la herramienta: un hacha contra
  la roca ahora se gasta.

Como quedo (todo en `docs/recoleccion.md`):

- **Lo puesto guarda su desgaste** (`Inventory.wornWear`) y lo devuelve al
  quitarlo; el arma puesta que se rompe deja el hueco vacio.
- **El tramo del Bolso es fijo, de 6**: la bolsa abre las 2 primeras. La regla
  de que no se quita con sus casillas ocupadas sigue, y vale tambien para
  cambiarla por la otra.
- **En el movil** las cinco columnas encogen hasta caber en 360 px.

Lo que eligi yo esta en «Esperando tu juicio»: los usos de las armas, que
gasta un golpe, el intercambio directo, que las 14 casillas se vean iguales,
los iconos y los nombres sin eñe.

**La auditoria de la fauna sigue pendiente** (arriba): esta tanda no la hizo.

## Guia de arte — en progreso (abierta el 2026-10-04)

Diste por buenos los modelos de bloques «dentro de lo esperado de una fase
temprana». Pediste directrices de arte, que crezcan en una tanda dedicada o
poco a poco. Estan en `docs/guia-de-arte.md`, con tu texto literal:

1. **Lo que va en la piel se pinta en el cubo de su parte**: patrones del
   pelaje y ojos.
2. **Lo delgado va en laminas cruzadas**, como los arboles.

Lo que espera tu juicio:

- **Si mi lectura de la 1 vale.** Entraria tambien lo que hoy son cajas finas
  pegadas al cuerpo: la barriga clara, la grupa blanca, el disco del hocico, la
  punta de la oreja de la liebre y la de la cola del zorro, y el vientre del
  cangrejo.
- **Que cuenta como «delgado» en la 2**: astas, cuernos, colmillos, orejas
  finas, colas finas, barbas, y las alas, el pico y las patas de la gaviota y
  del cangrejo. Y si una lamina puede llevar caja de golpe (hoy ninguna de esas
  partes golpea).
- **Aplicarlas a la fauna es una tanda por pedir.** El inventario de lo que hoy
  no las cumple esta en la guia.

## Fauna de bloques, con la caja de golpe de sus partes — HECHO (2026-10-03)

Probaste las ocho direcciones y no te convencieron: «no siento que por ese
camino podamos llegar a un juego pulido». Elegiste **animales de bloques**:

- detalle medio;
- estaticos de momento;
- chocan con **las cajas de sus partes**;
- no chocan entre ellos ni contigo.

- **El plano de cada especie** (`shared/fauna-body.ts`) es el unico sitio que
  dice como es un animal, de 10 a 25 cajas segun la especie.
  - El nucleo golpea y choca con las partes `hit`, y el cliente dibuja todas.
  - Tu ejemplo: el cuello y la cabeza del bisonte se golpean; su cola, no.
  - Lo fino tambien queda fuera (patas, orejas, cuernos, astas): es mi
    deduccion, esta arriba.
- **El choque**:
  - un bisonte no cabe por un pasillo de un bloque;
  - no gira si su cabeza fuera a entrar en una pared;
  - no mete la cabeza en un escalon de un nivel.
  - **Una rampa deja pasar.** Es la deduccion que mas pesa: un cuerpo que no se
    inclina asoma un poco sobre la pendiente, y sin eso ni una liebre subia
    rampas.
- **El coste**:
  - la primera version subio el tick de 0,17 ms a 2,2 ms, y el juego no
    llegaba a 60 ticks por segundo en el humo;
  - leyendo cada casilla una vez por ronda, queda en 0,26 ms.
- **Mirala** con `__verdant.faunaGallery()`.
  - Los colores y las medidas son mios: dime que especie no se parece a la
    suya.

## Fauna: ocho direcciones y la profundidad del cuerpo — HECHO (2026-10-03)

Me mandaste dos capturas de una liebre «metida en la pared» y elegiste A+B.

- **Tus dos capturas eran un corte verdadero.** La sonda las reproduce
  (`cornisa`): estabas en lo alto de un escalon y la liebre, al pie. Una caja
  3D en su sitio queda cortada por la misma arista; te mando las dos imagenes.
  Lo elegiste: **A+B tal cual**, sin tolerancia.
- **Lo que si estaba mal** era el bisonte. Se adelantaba 1,45 bloques y se veia
  a traves de cornisas y esquinas (100 % y 21 %). Ahora, 0 % y 0,1 %.
- **A, ocho direcciones:**
  - de frente, tres cuartos, perfil, tres cuartos de espaldas y de espaldas;
  - los de lado van en espejo, y la histeresis evita el parpadeo;
  - la galeria (`__verdant.faunaGallery()`) las enseña todas.
- **B, profundidad de la caja del cuerpo**, pixel a pixel, para animales y
  jugador.
- **Desde arriba** se ve el dibujo de pie y entero. No enseña el lomo: eso es
  lo que cambiarian C o los bloques, y **es tu decision**.
- **Pregunta abierta, del nucleo:** que cada animal choque con su cuerpo y no
  con 0,34. De cara a una pared, la cabeza de un bisonte esta en 3D dentro de
  ella, y B la tapa, como la taparia un modelo de bloques.

## Fauna, ajustes: el daño se olvida, impacto, sprites enteros — HECHO (2026-10-03)

Tres ajustes tuyos tras probar la primera tanda:
- **El daño no se mantiene al recargar**, para todo lo que se golpea.
  - El animal vuelve entero al retirarse y volver: su daño ya no esta en el
    overlay, solo su muerte.
  - Plantas y bloques lo olvidan al descargarse su chunk
    (`forgetUnloadedDamage`).
  - Las ramas arrancadas no son daño y se quedan.
- **Los animales no sueltan fragmentos**, tampoco al morir (lo elegiste).
  - A cambio, todo golpe a algo que se puede romper deja un **impacto**: la
    estrella de 4 puntas que elegiste, donde el golpe toca.
  - El punto lo da el nucleo, con la misma cuenta que decide que cae.
- **El sprite no se mete detras de lo que tiene al lado**, y el del jugador
  tampoco (lo elegiste).
  - La lamina entera toma la profundidad del centro del cuerpo, adelantado
    medio largo de su dibujo.
  - Al proponerlo dije «medio ancho de la caja»; al medirlo no bastaba. La cara
    de un bloque al que se arrima queda medio bloque por delante del centro, y
    la lamina sobresale medio largo del dibujo, que es mucho mas que el cuerpo.
  - Medido en una escena minima: pegado de lado a un bloque se ve el 100 %, y
    con un bloque delante, el 0 %.

## Fauna, primera tanda: diez especies que deambulan — HECHO (2026-10-02)

Pediste dos animales reales por bioma, con tres etapas y dos sexos, sus
ratios, puntos de vida y botin, y un sistema de PV con bases claras; que de
momento solo deambulen y que el boton del bioma no se toque. Decidiste PV por
masa, los cinco biomas de tierra, etapa fija hasta la reproduccion, y asar la
carne con el resto del botin en espera. Todo esta en **`docs/fauna.md`**:
especies, numeros, el comportamiento escrito de cada etapa, el oceano para la
tanda del nado y como se aplica la ley del observador.

- **Hecho**:
  - diez especies en pradera, bosque, tundra, tierras altas y costa, con sus
    30 dibujos;
  - PV = 100 × (masa / 70 kg)^(1/3), el jugador de referencia;
  - aparicion por densidad real comprimida, en grupos;
  - se golpean con el mismo golpe que el resto (barrido y preciso);
  - sueltan su botin entero o no mueren;
  - la carne se asa en el horno («Cocina») y la asada se come;
  - un muerto no vuelve.
  - En el panel de desarrollo, «Materiales de cocina».
- **Lo que no**:
  - no comen, no huyen, no envejecen ni se reproducen;
  - no entran en el equilibrio ni en el panel del bioma;
  - piel, plumas y caparazon no sirven aun para nada.
- **Medido**:
  - cada especie sale cerca de su densidad (el ibice, un 30 % por debajo, por
    la roca);
  - las etapas, 19 / 26 / 56 %;
  - unos 50-60 animales alrededor del nacimiento, a 0,15 ms por tick;
  - cada dibujo mide exactamente su caja de golpe.
- **Lo que destapo el humo**:
  - Los puntos de paso eran un punto cualquiera de su casilla. Junto a la
    orilla, la caja del cuerpo rozaba el agua, el animal nacia en su origen y
    echaba a andar. Ahora son el centro de la casilla.
  - Y el propio humo: recargar la pagina reinicia el tiempo, asi que la presa
    nacia en el punto del periodo anterior. Se recarga en el mismo tick (`&t=`).
- La tabla del plan llevaba 38 PV para liebre y zorro y 10 para el cangrejo,
  redondeados a mano; la formula aprobada da 39 y 9.
- Las casillas del inventario no llevan iconos (decision tuya), asi que los
  objetos nuevos solo tienen su nombre y su descripcion: el plan decia iconos.

## `CLAUDE.md` adelgazado: cada parte en su documento — HECHO (2026-10-02)

La propuesta 3, que pediste tras las 2 y 4. `CLAUDE.md` se carga **entero en
cada turno** y cada llamada a una herramienta lo reenvia, asi que lo que pesa
se paga muchas veces por sesion. Ahora lleva solo lo que vale para cualquier
tarea —arranque, reglas duras, la regla de trabajo contigo, el libro, el
procedimiento de pruebas y la auditoria— y un **indice**, «Donde esta cada
cosa: leer antes de tocar», que dice que documento leer antes de tocar cada
parte. Medido: de 87.978 bytes (1.378 lineas) a 21.940 (364), una cuarta
parte.

- **Nada se reescribio: se movio literal.** Cada linea con texto del
  `CLAUDE.md` de antes esta, identica, en el nuevo o en uno de los documentos
  (comprobado con un guion, contando repeticiones); solo cambiaron cuatro
  titulos, que pasaron a ser el de su documento, y una referencia interna
  («ver «Efectos visuales»», ahora `docs/efectos.md`).
- **El reparto**: `docs/reglas.md` (las reglas 12, 21 y 22 enteras),
  `docs/controles.md`, `docs/recoleccion.md`, `docs/efectos.md`,
  `docs/arte.md` (aspas y proporciones), `docs/relieve.md` (con el salto y el
  hambre), `docs/devtools.md` y `docs/pruebas.md` (el humo, la CI y sus
  lecciones).
- **Las reglas 12, 21 y 22 llevan un resumen** en `CLAUDE.md` con su mismo
  numero, que es el que cita el codigo; el texto entero va en
  `docs/reglas.md`. Es lo unico duplicado, y la lente F de la auditoria lo
  vigila.
- **El escaner tiene una categoria nueva**: un documento de `docs/` que el
  indice no nombra sale como aviso, con su fallo sembrado en la autoprueba. Un
  documento sin fila no lo lee nadie, y es perder la informacion por otro
  camino. Las listas de permitidos del escaner (`retirados.md`, `ignorar.md`)
  apuntan a los documentos nuevos, y el escaner da los mismos 20 avisos que
  antes del cambio.
- **A partir de ahora**, lo que cambie en una parte se escribe en su documento,
  no en `CLAUDE.md`, salvo que cambie una regla dura, el procedimiento o el
  indice.

Las referencias a «`CLAUDE.md`, tal seccion» de las secciones de historia de
este fichero se quedan como estaban: eran ciertas cuando se escribieron, y el
indice dice donde vive hoy cada seccion.

## Las pruebas pesadas a la CI, y las mutaciones en paralelo — HECHO (2026-10-02)

Lo pediste tras ver lo que tardaba cada ronda (propuestas 2 y 4; la 3,
adelgazar `CLAUDE.md`, va despues; *Luego*: hecha el mismo dia, ver la
seccion de arriba):
- **Lo pesado se verifica en la CI, en la rama `pruebas`**, que no despliega:
  `tools/a-pruebas.sh` lleva alli el arbol de trabajo tal cual, sin tocar
  `main`. A `main` solo va lo que sale verde ahi. En local, solo lo barato y la
  pasada que se esta escribiendo. El procedimiento entero, en `CLAUDE.md`
  («Antes de dar algo por bueno»).
- **Las mutaciones de cada ronda en una orden** (`tools/mutar.mjs`, con la
  lista en `tools/mutaciones.mjs`), y en la CI **todas a la vez**, una maquina
  por mutacion (`.github/workflows/mutaciones.yml`).
- **`slash` entro en la CI**, y ahora falla si el barrido no llega a verse.

Lo que destapo el primer dia, y por eso habia que probarlo con trampas:
- `slash` no corria en un clon limpio: no creaba su carpeta de capturas
  (escape 16). En local siempre existia.
- Y por eso mismo, la mutacion del barrido «cayo» sin que el barrido tuviera
  nada que ver. Ahora una prueba que revienta sin un `FALLO` es ERROR, no
  CAE (escape P4).
- Las dos trampas salieron en rojo, cada una por su motivo: un comentario
  («no llego al build») y mover 1 px el registro («no cae»).
- **Una carrera de la 7.ª ronda**: el escudo de la pausa se pintaba un
  fotograma tarde, y en una maquina lenta un clic en medio pulsaba
  INVENTARIO (escape 17). Ahora se pone en el propio evento. Tambien lo
  notarias tu en un equipo lento.
- La vista que gira cerca de `slash` dio 46, 12 y ~190 sobre el mismo
  codigo: se sigue midiendo, pero no hace fallar.

Medido: la CI completa en ~5 min y las doce mutaciones en ~7, contra ~22 min
de humo, gestos y barrido en serie mas ~45 de mutaciones en local. Son unos
25 trabajos para las 20 maquinas que da GitHub, asi que algunos esperan cola.
Cabo suelto: las acciones `@v4` de GitHub avisan de que Node 20 esta
obsoleto; subirlas cuando toque.

## Ajustes de la tanda 2, 7.ª ronda — HECHO (2026-10-02)

La CI de la 6.ª ronda (`313db40`) salio en verde. Lo que pediste:
- **Se arranca en primera persona.**
- **El panel de PC mide siempre lo mismo**, el de cuatro recetas, con E, la
  mesa o el horno.
- **Esc cierra el inventario y vuelve a capturar el cursor, como E**: la
  captura se pide al soltar la tecla, y si el navegador la suelta enseguida
  no pausa. Es lo que puedo hacer sin tu Chrome; si aun ves la pausa, dimelo.
- **Las estaciones miran a quien las pone**: el nucleo guarda su frente.
- **Cada boton de PC lleva su tecla escrita** abajo a la izquierda: el ojo P,
  la informacion I (nueva), el bioma B (nueva), MODO TAB, INVENTARIO E.
- **Fuera CTRL.**
- **En pausa no responde nada** hasta que un clic reanuda.
- **El contorno blanco** de la casilla tocada con el inventario abierto era
  el foco del navegador: los botones ya no lo toman con el raton.
- **El registro de objetos en PC**, encima de INVENTARIO, bajando hacia el.

Lo que decidi yo va arriba, en «Esperando tu juicio».

## Ajustes de la tanda 2, 6.ª ronda — HECHO (2026-10-02)

La CI de la 5.ª ronda (`4458d9b`) salio en verde. Lo que pediste, y lo que
respondiste:
- **La rueda enciende una sola casilla, siempre**: cada muesca mueve en el
  acto la luz de la seleccion. Se veian dos porque el destello iba aparte y
  la luz vieja no se movia hasta el tick siguiente.
- **La rejilla del inventario no repite la luz de la barra.**
- **El panel de PC**: la lista de recetas cabe cuatro sin barra, mas aire
  entre columnas y a los lados, y titulos mas grandes y mas separados.
- **Esc cierra el inventario sin pausar**: ya no pide capturar el cursor; el
  primer clic lo captura sin golpear.
- **El alcance es 3** para golpear, sembrar, colocar y abrir; y **el panel de
  una estacion se cierra cuando su cara queda mas lejos que el alcance**, sea
  cual sea su forma («la distancia de cierre siempre sera igual al
  alcance»).
- **En el movil, un toque fuera del inventario lo cierra, y solo eso.**
- **El barrido del TAP se ve horizontal y centrado en el toque**, con el
  origen en los ojos. Tu «primero Y y luego X» es justo el giro que hace
  falta: girar hacia el lado con el abanico plano y despues inclinarlo sobre
  la derecha de la camara. En primera persona es exacto. En tercera, la
  camara no esta en los ojos, y se afina eligiendo el giro con el que el
  trazo se ve mas plano. Medido en ocho puntos de la pantalla (alto entre
  ancho del trazo; 0 es plano):

  | Vista | Sin giro | Primero Y y luego X | Afinado |
  |---|---|---|---|
  | Perspectiva, peor punto | 2,02 | 2,75 | **0,36** |
  | Isometrica, peor punto | 1,85 | 2,14 | **0,42** |
  | Primera persona, peor punto | 0,17 | **0,00** | **0,00** |

  Lo que queda en tercera persona (~0,2 de media) es la curva propia del
  arco de 90 grados visto de frente.

Lo que decidi yo va arriba, en «Esperando tu juicio».

## Ajustes de la tanda 2, 5.ª ronda — HECHO (2026-10-01)

La CI de la 4.ª ronda (`36e683f`) salio en verde. Lo que pediste, y lo que
respondiste:
- **La estocada en tercera persona** hace el mismo recorrido que en primera:
  nace a un bloque de los ojos, abajo a la derecha de la mirada. Antes nacia
  en la pantalla de la camara, que en tercera persona va detras, y salia de
  muy lejos (medido: a 8,5 bloques; ahora, a 1,06).
- **Las barras deslizables tambien en PC**, en la rejilla y en las recetas.
- **El hambre se vacia en 2 dias** quieto o andando, y **el salto cuesta
  0,25 %**.
- **La rueda enciende una sola casilla a la vez**, en el acto: girando
  deprisa ya no se quedan todas encendidas.
- **MODO y ENTRADA**, como tu boceto, en un arco alrededor del ataque a la
  misma distancia de su centro: ENTRADA arriba y MODO abajo a la izquierda.
- **ENTRADA: MIRA o TAP.** En TAP, un toque en el mundo usa alli y, si no se
  uso nada (abrir, comer, sembrar, colocar), ataca alli; mantener ataca
  sostenido, y arrastrar despues gira la camara sin parar de atacar; arrastrar
  antes es solo camara. ATAQUE y USAR siguen yendo a la cruz, la cruz se
  queda y la entrada se recuerda. Iconos: la cruz en MIRA y una mano tocando
  en TAP.

Lo que decidi yo va arriba, en «Esperando tu juicio».

## Ajustes de la tanda 2, 4.ª ronda — HECHO (2026-09-30)

La CI de la 3.ª ronda (`51f6c7b`) salio en verde. Lo que pediste, y lo que
respondiste:
- **Una barra deslizable en el movil**, al lado de la rejilla del inventario:
  se ve siempre que haya mas casillas de las que caben, y su mando se arrastra
  con el dedo (tocar la pista tambien lo lleva alli). La misma, lista, en las
  recetas: la lista es la misma para la mesa y el horno. Solo en el movil,
  como respondiste.
- **AUTO SALTO**: un boton pequeno sobre SALTAR, como tu boceto. Encendido,
  andando hacia un bloque que se sube de un salto se salta solo justo antes de
  chocar, y se sube sin rozar la cara. No salta si el bloque, o varios
  apilados, pasan del salto (dos bloques, una mesa sobre un escalon, el horno
  de 1,25). Solo en el movil; **cobra como un salto**; arranca apagado y **se
  recuerda** en cada dispositivo.
- **El salto cuesta 0,5 %** del hambre, no 1 %; el automatico tambien.

Lo que decidi yo va arriba, en «Esperando tu juicio».

## Ajustes de la tanda 2, 3.ª ronda — HECHO (2026-09-30)

La CI de la 2.ª ronda (`5b3a3f6`) salio en verde. Lo que pediste:
- **Cubiertos**: la cuchara corrida a la izquierda y el tenedor a la derecha;
  ya se ve el cuello de la cuchara antes del cruce, y las puas del tenedor
  tienen aire entre ellas.
- **El salto solo empuja hacia arriba.** En el aire se anda como en el suelo,
  a la velocidad de andar o de correr, y se puede girar o dar media vuelta; sin
  mando no se avanza. Se retiraron el impulso del despegue y el 30 % de
  desviacion. Tu caso del salto sigue igual andando (alcance 2, apice 1,16).
- **La zona del joystick en el movil** es ahora el rincon que va del borde
  izquierdo al borde derecho del anillo de salud, y de abajo a la mitad de
  CORRER. Fuera, aunque sea el cuadrante de antes, un dedo gira la camara.
- **El hambre gasta segun el esfuerzo**:
  - quieto o andando se vacia en **un dia de juego** (`HUNGER_EMPTY_DAYS = 1`,
    derivado de `DAY_TICKS`: si el dia cambia, el hambre lo sigue). Hasta ahora
    se vaciaba en unos 3 minutos; ahora en 8;
  - corriendo y avanzando, **×1,6**, el mismo factor que la velocidad; con la
    carrera encendida y quieto, como quieto;
  - **cada salto, un 1 %** del hambre total (bajado a 0,5 % en la 4.ª ronda).

Lo que decidi yo va arriba, en «Esperando tu juicio».

## Ajustes de la tanda 2, 2.ª ronda — HECHO (2026-09-30)

Antes que nada: **la CI de la entrega anterior (`ac4eff0`) salio en rojo** en
la casilla `desktop`, y la culpa era de una comprobacion mia, no del juego. La
de la rueda contaba cuantas casillas distintas se encendian mientras se giraban
dos muescas y exigia exactamente dos; en el runner lento seguia encendida la de
la muesca anterior y conto tres. El juego anota ahora las casillas que enciende, en
orden, y el humo espera a que lleguen y las compara: sin ventana de tiempo,
que en una maquina cargada falla tambien al reves (escape #13 de la
auditoria).

Lo que pediste:
- **La mochila**, como tu adjunto: asa, solapa curva, dos cierres, bolsillo
  delantero y laterales, sin correas; casi cuadrada y mas grande en el boton.
- **La estocada del modo preciso nace abajo a la derecha de la pantalla** y va
  hasta lo golpeado en el centro de la mira. Antes recorria la propia linea de
  la vista y se veia de punta: solo aparecia al moverse. Medido con pixeles en
  primera persona: 9.153 aclarados abajo a la derecha, y cero con el arranque
  de antes.
- **En el movil, subir el dedo sube la mirada en las tres vistas**, como el
  raton en PC. Las orbitales ya no «agarran el mundo» en vertical; en
  horizontal no cambia nada.
- **MODO se ilumina al pulsarlo**, en el movil y en PC, y con TAB.
- **En el movil, los anillos de PC** en vez de las barras: uno al lado del
  otro, en la esquina de abajo a la izquierda, apoyados en el borde de abajo
  de ATAQUE y USAR, y de un tamano entre los dos. Son los mismos elementos que
  en PC, sacados de la caja con CSS: una sola cifra y un solo dibujo.

Lo que decidi yo va arriba, en «Esperando tu juicio».

## Ajustes de la tanda 2 — HECHO (2026-09-30)

Lo que pediste tras jugarla, y lo que respondiste:
- **Con el inventario abierto no se usa ni se ataca**; se anda.
- **Esc cierra el inventario sin pausar.** Chrome no deja volver a capturar el
  cursor sin un gesto, y Esc no cuenta como gesto: por eso se pausaba. Ahora
  el cursor que suelta el propio juego (inventario, CTRL, panel) no pausa: se
  sigue jugando y el primer clic lo captura. Solo pausa tu Esc en pleno juego.
- **CTRL mantenido suelta el raton** para pulsar botones, sin pausar; al
  soltarlo se vuelve a capturar.
- **El menu del navegador ya no sale** al abrir una estacion con clic derecho.
- **Las estaciones son fisicas como un bloque**: se chocan de lado y se sube
  encima; el horno sigue midiendo 1,25, mas que el salto, a proposito.
- **Colocar mirando a una pared** la pone delante de ella y cae hasta el suelo.
- **La rueda ilumina cada casilla por la que pasa.**
- **Icono de INVENTARIO**: una mochila de explorador, como tu adjunto.
- **La barra de abajo de PC**, tu boceto: MODO, la caja centrada con el anillo
  del hambre (con cubiertos), la barra de la mano y el anillo de la salud, e
  INVENTARIO con hueco para mas botones. Los anillos se vacian en sentido
  horario.
- **Los controles de PC**, dentro del boton de informacion.
- **La reticula** ya no marca lo que alcanza el golpe; marca el suelo y ahora
  tambien la cara de la pared que se mira.
- **Dos modos de golpe**: barrido (el de siempre) y preciso (solo el primer
  objetivo del centro de la mira). TAB o el boton MODO; en el movil, mas
  pequeno que USAR y en la diagonal de arriba a la izquierda del ataque. En
  preciso se ve una estocada recta.

Lo que decidi yo va arriba, en «Esperando tu juicio».

## Recoleccion y fabricacion — tandas 1 y 2 HECHAS (2026-09-28 y 2026-09-29)

Pediste la progresion de un jugador real: aparece sin nada, recolecta con las
manos, fabrica sus primeras herramientas, que le dan mejores recursos, y con
ellos mejores herramientas e indumentaria. Tus decisiones:
- trabajo por golpes;
- la herramienta se equipa;
- se desgastan y se rompen;
- la ropa sirve para llevar mas;
- lo basico se fabrica a mano y lo mejor en mesa u horno;
- los metales se funden en un horno;
- el inventario son casillas con pilas;
- la roca a mano no da nada y la primera piedra son guijarros sueltos.

Lo que decidi yo, con cifras, esta arriba en «Esperando tu juicio».

**Tanda 1, hecha**: etapas 1 a 3.
- A mano: guijarros (piedra), arbustos (bayas y fibra), arboles (ramas).
- Hacha y pico de piedra, fabricados a mano.
- El hacha tala en 4 golpes. El pico saca roca, carbon y cobre; el hierro pide
  un pico mejor (lo decia un aviso, que retiraste el 2026-09-29 con los demas).

Lo comprueban `tests/crafting.test.ts`, con una partida guionizada de las manos a
los minerales, y el humo. El humo fabrica un pico desde el panel con los
«Materiales de piedra» del panel de desarrollo y saca cobre golpe a golpe.

**Tanda 2, hecha el 2026-09-29.** El plan aprobado, con lo que decidiste al
empezarla (F ya no existia):
- **Mesa de trabajo** (8 madera) y **horno** (10 piedra + 2 carbon), fabricados
  a mano en la categoria «Estaciones».
- **Se colocan con USAR** llevandolos en la mano, donde la mirada toca el
  suelo, como una semilla. Son **cajas en 3D**, no aspas. Estorban el paso y se
  desmontan a mano en 3 golpes; vuelven al inventario enteras.
- **USAR mirando una estacion la abre siempre**, lleves lo que lleves en la
  mano. Se abre el mismo panel que con E, pero RECETAS (la pestana Recetas en
  el movil) muestra solo las de esa estacion, con su nombre de titulo. **Con E
  no salen**: solo se ven usandola.
- **El panel de una estacion se cierra solo a mas de 3 casillas** de ella. El
  nucleo usa la misma cuenta (`stationNear`) para aceptar la receta.
  (*Hoy*, desde la 6.ª ronda de ajustes: cuando su cara queda mas lejos que
  el alcance.)
- **Fundir es una receta mas del horno**: mantener 1,5 s. 2 cobre + 1 carbon
  dan un lingote de cobre; 2 hierro + 2 carbon, uno de hierro.
- **Herramientas de metal**, en la mesa:
  - hacha y pico de cobre = 2 ramas + 3 lingotes, poder 2, 120 usos; el pico
    de cobre mina hierro;
  - de hierro = 2 ramas + 3 lingotes, poder 3, 250 usos.
- **Ropa**, en la mesa, y se arrastra a su hueco de PERSONAJE:
  - bolsa de fibra (8 fibra), en la cintura, abajo a la derecha: +2 casillas;
  - mochila de armazon (10 fibra + 4 madera + 2 lingotes de cobre), en la
    espalda, en el centro de la columna derecha: +6 casillas.
  - No se quita una prenda con sus casillas ocupadas.
- «Experiencia», la otra mitad de la ley, sigue fuera: esta sin disenar.

Lo comprueban:
- `tests/stations.test.ts`: colocar, estorbar, desmontar, abrir, la distancia,
  fundir, los picos de metal, la ropa y una partida de la mesa a la mochila;
- dos leyes nuevas en `tests/world-laws.test.ts`;
- la pasada `stations` del humo, que lo juega con el raton desde el nacimiento
  y esta en su casilla de la CI.

Mis deducciones van arriba, en «Esperando tu juicio». Hay tambien dos cosas
que tienes que saber:

- **El golpe tumba todo lo que toca** (regla 12), tambien una estacion:
  talando un arbol pegado a la mesa, los golpes la desmontan tambien (3
  golpes, y el dano se olvida a los 3 s). Lo deje asi por coherencia. Que la
  estacion solo reciba el golpe cuando es lo mas cercano del sector es una
  linea.
- **En el movil la ropa se equipa desde la barra.** Las paginas del panel van
  de una en una, asi que la rejilla del inventario y los huecos de PERSONAJE
  no estan a la vista a la vez; la barra de la mano si. La prenda se lleva
  primero a la barra y de ahi a su hueco. Si lo quieres de otra forma (por
  ejemplo, tocar la prenda y un boton «Ponerse»), es decision tuya.
- **No hay iconos nuevos**: el plan los mencionaba, pero las casillas van con
  nombre corto y sin iconos por decision tuya; los objetos nuevos llevan
  nombre corto y descripcion como los demas.

## Ataques y saltos que no salian — ARREGLADO (2026-09-28)

Lo viste jugando: moviendote, a veces atacas o saltas y no pasa nada, y a veces
ni al segundo intento, tambien en llano. La causa estaba en el bucle del
cliente, no en la simulacion: los pestillos del mando (salto, accion, comer,
sembrar) se recogian en cada fotograma, y la simulacion va a 60 Hz; en un
fotograma sin tick la pulsacion se tiraba. A mas de 60 Hz eso pasa en muchos
fotogramas: un modelo del bucle da un 32 % de pulsaciones perdidas a 90 Hz, 50 %
a 120 y 58 % a 144, y del 0,5 al 2,5 % a 60. Ahora esperan en el mando al primer
fotograma con tick. En pausa se siguen tirando, a proposito.

Una pasada nueva del humo finge una pantalla de 144 Hz y exige 30 de 30 golpes y
5 de 5 saltos; sin el arreglo da 10 y 0.

**Confirmado por el autor jugando**: «funciona excelente ahora». Si algun dia
vuelve a perderse un salto, quedaria el otro canal —pulsarlo en el aire, al
aterrizar o bajando un escalon, un 2,2 % del tiempo andando—, que es la seccion
aparcada de mas abajo.

## El raton lleva la mirada, y soltarlo pausa — HECHO (2026-09-28)

En PC, hacia donde se mueve el cursor se mueve la vista, en las tres vistas. El
navegador captura el cursor, y Esc lo suelta y pone el juego en pausa con el
aviso «Juego en pausa». Un clic en la pantalla lo captura otra vez y reanuda, y
ese clic no golpea. Tambien arranca en pausa. El inventario no suelta el
cursor; el panel de desarrollo lo suelta sin pausar. Todo eso lo decidiste tu;
lo mio esta arriba, en «Esperando tu juicio».

Medido en el humo: en pausa el reloj de ticks no se mueve, capturar no gira la
vista (Chrome manda un salto espurio al capturar que se descarta, y sin eso
giraba 90 grados), el clic que reanuda no golpea, F3 suelta sin pausar e I no
suelta. El movil no cambia: los gestos y el humo movil pasan igual.

*Luego*: el inventario paso a la tecla E y **si** suelta el cursor, sin pausar;
Esc lo cierra.

## Angulo de vision ajustable — HECHO (2026-09-28)

Pediste poder cambiar el campo de vision de la primera persona dentro del juego.
Es una barra de 50 a 100 grados que sale desde detras del ojo, con una marca
cada 10 y los grados a su izquierda, y arranca en 70. En PC se abre al pasar el
raton por el ojo; en el movil, al sostenerlo mas de 1 s, y al soltar no cambia
de vista. Un toque corto cambia de vista y la cierra, y cualquier otra accion o
toque fuera tambien la cierra. Decidiste ademas que solo exista en primera
persona, que el angulo se recuerde en cada dispositivo y que el catalejo parta
de el. Lo que decidi yo esta arriba, en «Esperando tu juicio».

Lo comprueban el humo (raton) y `npm run gestures`, este con toques de verdad.
Sostener el ojo abre la barra solo en primera persona, medio segundo no la
abre, el dedo la arrastra de 70 a 100 y tocar el mundo la cierra. El toque
corto cambia de vista y la cierra. Con el clic del toque sostenido sin tragar,
la comprobacion cae.

*Luego* (2026-09-29): la barra va de 70 a 120 y el toque sostenido es de 0,5 s.

## Golpe por hitbox y una sola mirada — HECHO (2026-09-28)

Probaste el cono en el movil: funcionaba, pero se quedaba corto. Pediste:

- **Alcance 2 bloques**, y el **cono plano, inclinado hacia el punto exacto de
  vision**: ahora es un sector de 90 grados en el plano de la mirada, que sale
  de los ojos.
- **El golpe solo cuenta si toca un hitbox**; el del arbol es su **tronco
  desnudo**, no las hojas. Todo objeto tiene el suyo. **El terreno tapa el
  golpe.** Se siembra **donde la mirada toca el suelo**.
- **El barrido recorre el borde curvo del area real**: el extremo de cada rayo
  del sector, cortado por el terreno.
- **Primera y tercera persona comparten el punto central**, que es la
  direccion en que mira el jugador; **la isometrica tambien**. La tercera persona
  **mira hacia arriba**, y la camara **choca** con bloques y troncos.

Lo que cambia al jugar, y conviene que lo mires tu:

- El sector es plano: **mirando al frente pasa por encima de un arbusto** (los
  ojos a 1,75, el arbusto a 1,1). Para golpearlo hay que mirarlo; con la
  camara de arranque (35 grados hacia abajo) se alcanza.
- **Para sembrar hay que mirar unos 41 grados hacia abajo** en llano, algo mas
  que la camara de arranque.
- **En tercera persona el personaje tapa el centro de la pantalla**, porque la
  mirada pasa por sus ojos.

El tronco de cada arbol se mudo al nucleo (`sim/trunk.ts`): el que se dibuja y
el que se golpea son el mismo numero. Medido: mirando arriba del todo, la camara
queda a 0,46 de los ojos y 0,30 sobre el suelo; el barrido llega a pantalla en
todas las vistas y rumbos. Lo que decidi yo, arriba en «Esperando tu juicio».

*Luego* (2026-09-29): el alcance subio a **2,5**, tambien para sembrar, y
basta mirar unos 35 grados hacia abajo, lo que da la camara de arranque.

## La accion es un cono — SUSTITUIDO (2026-09-28)

Lo que sigue quedo sustituido el mismo dia por el golpe por hitbox de arriba.

Pediste que la accion dejara de estar fijada a casillas: en primera persona se
golpeaba lo que no estaba delante de los ojos, y el barrido a veces ni se veia.
Tus decisiones:

- **Cono de 1,5 bloques y 90 grados** alrededor de la mirada real (sin
  redondearla a ocho direcciones); una casilla cuenta si su centro cae dentro.
- **Dos alturas, en 3D**: la propia y la de arriba; mirando hacia abajo mas de
  **25 grados**, la propia y la de abajo. Vale en las tres vistas: en primera
  persona se entra mirando a -11 grados (arriba); la orbital arranca a 35
  (abajo), y bajandola casi a ras de suelo pasa a la de arriba.
- **El barrido delante de la mirada**: delante de los ojos en primera persona,
  delante del pecho del personaje en tercera.
- **Sembrar en la casilla de enfrente**: la primera que cruza el centro de la
  mirada.

Con el jugador centrado y mirando en recto el cono coge lo mismo que las cuatro
casillas de antes; se nota al girar y al estar a medio paso. Lo que decidi yo,
en «Esperando tu juicio». Medido: el barrido llega a pantalla en todos los
rumbos de primera persona (9.000-19.000 pixeles) y en tercera como antes; y un
test del nucleo afirma las dos alturas (con la segunda altura fija «arriba», cae).

## Troncos por especie — HECHO (2026-09-27)

Pediste tres cosas: que no asomara el canto de arriba del tronco, que el tronco
desnudo fuera de cada especie (2-5 bloques de palo bajo la picea negra se veian
raros) y que el grosor tambien. La unica regla comun que dejaste: **nunca menos
de 2 bloques**.

- **El canto asomaba** porque el tronco de las coniferas era un rectangulo que
  subia al 85 % de la copa, donde el cono ya es mas estrecho que el. Ahora
  estrecha del pie a la copa y acaba en punta dentro de ella. Se mide: pixeles
  de tronco con aire encima por dentro de la copa, cero en las seis especies
  (con el rectangulo de antes, 2 en tres coniferas; el humo cae).
- **Tronco y grosor por especie**, del porte real de cada una: la tabla, en
  «Esperando tu juicio» y en `CLAUDE.md`. Medido del dibujo, cada especie cae en
  su rango y el roble es el mas grueso y la picea negra la mas fina.
- Lo que cambia al jugar: **casi todas las copas quedan justo sobre la cabeza**,
  porque casi todas las especies rozan el minimo de 2; solo el alerce las lleva
  altas. El tronco medio de los arboles colocados paso de 3,5 a 2,6.

## Arboles con forma de su especie, y sombras al suelo — HECHO (2026-09-27)

Pediste que cada arbol tomara las proporciones de una especie real, para no
iterar a ojo. Tu reparto: bosque = picea comun, bosque raro = alerce en otono,
pradera = roble aislado, pradera raro = cerezo japones, tundra = picea negra,
tundra raro = picea azul; y **solo la forma**, con la copa en 3-5 bloques de
alto. Medido del dibujo, cada ancho:alto cae en el de su especie (0,40; 0,44;
1,26; 1,49; 0,25; 0,44). La tabla, en `CLAUDE.md` (Proporciones) y en
`tree-shapes.ts`. Lo que decidi yo esta arriba, en «Esperando tu juicio».

Despues viste en el movil una conifera con **un circulo de hojas en la punta**:
era la picea negra, con su penacho dibujado como una elipse lisa. La especie
real si tiene la punta tupida, pero la elipse se leia como una piruleta. Ahora
son tres pisos cortos y apretados que acaban en punta, y la aguja estrecha
hasta arriba; el ancho:alto medido sigue en 0,25.

Nota: la picea comun sale **igual de ancha que antes y mas alta**: tu viste la
copa estrecha, pero una picea de verdad es estrecha. Los que se ensanchan son
el roble y el cerezo.

Y el fallo de las sombras: la sombra era un cuadrado plano a la altura del pie,
asi que al borde de un desnivel quedaba media en el aire. Ahora se parte por
casillas y cada trozo cae sobre la superficie de la suya, por abajo que este.
Sigue costando una draw call por chunk.

## Arboles altos: el tronco mide de 2 a 5 bloques — HECHO (2026-09-26)

Tu encargo: **solo el tronco de un arbol adulto mide de 2 a 5 bloques, segun
una normal**, para que el jugador vea por debajo del follaje. Antes, medido del
dibujo, el tronco que asomaba bajo la copa iba de **0,78 a 1,13** bloques: la
copa le tapaba la cabeza a un personaje de 1,93.

Lo que interprete yo, y esta en «Esperando tu juicio»:

- **«Tronco» es el tramo desnudo**, del suelo al borde bajo de la copa, porque
  es el que decide si se ve por debajo. La copa no cambia de tamano: sube. El
  arbol entero pasa de 3,17 a unos 4,4-7,4 bloques (5,70 con el tronco medio).
- **Media 3,5 y desviacion 0,75**, que ponen 2 y 5 a ±2σ. **Truncada**: una
  muestra que se sale se vuelve a sortear. Recortarla habria dejado un 2,3 % de
  los arboles clavados en 2 y otro tanto en 5, una fila de arboles iguales.
- **Las seis especies de arbol** por igual, raras incluidas (conservan su copa
  un 15 % mayor). Brotes, arbustos y rocas no cambian.

Lo que no es interpretacion: la altura es **de la casilla** (`hash2DFloat`),
como el giro del aspa, asi que un arbol no cambia de altura al regenerarse su
chunk; y es **arte**, `packages/sim` no se entera. Se dibuja por (especie,
cuarto de bloque), cada combinacion una vez y solo si aparece: sigue siendo un
Mesh por arbol, sin draw calls de mas.

Medido del dibujo en la semilla 12345: **2.924 arboles, de 1,97 a 5,00, media
3,48**. `tests/trunk.test.ts` afirma la forma de la normal y que no hay montones
en los topes (comprobado que muerde: recortando en vez de truncar caen dos
tests), y el humo afirma el rango, la variacion y que el tronco medio deja pasar
al jugador (con el arte viejo cae con tres fallos).

**Y la copa, despues** (2026-09-27): la viste pequena para el arbol nuevo y
pediste agrandarla. Propuse y puse **x1,5** (`CROWN` en `art.ts`): el frondoso
pasa de 2,47 a **3,69** bloques de copa, del orden del tronco medio, como un
roble de Minecraft; el arbol medio mide ahora 6,82. Se escala desde su borde
bajo, asi que el tronco sigue en 1,98-5,01. El humo afirma que la copa pasa de
3,1 (con `CROWN = 1` cae). Por el camino aparecio que la medida del tronco
miraba solo la fila del pie, que cae a medio pixel: con la copa nueva el
frondoso medio cero. Ahora busca el tronco unas filas por encima.

Una consecuencia a mirar: vista desde arriba, un bosque denso ahora **tapa mas
al jugador**. Es el cabo de la camara que ya estaba en la lista («que el
terreno tape al jugador sin perderlo de vista»), que ahora aprieta un poco mas.

## La accion alcanza tambien la casilla que se pisa — SUSTITUIDO

Sustituido el 2026-09-28 por el cono y, el mismo dia, por el golpe por hitbox
(arriba). Queda como historia.

Pedido del autor: cuatro casillas en vez de tres, con su enunciado sobre una
rejilla 1-9 (jugador en el 5; mirando a 2 → 1, 2, 3 y 5; mirando a 3 → 2, 3, 6
y 5). El arco del barrido no cambia, tambien decision suya. Esta en la regla 12
de `CLAUDE.md`. Recolectar la propia solo hace algo si hay algo pisable encima
—una mata, por ejemplo—; sembrar sigue siendo solo la apuntada.

---

## La franja de salud y hambre — HECHA (2026-09-26)

*(Sustituida el 2026-09-30: en el movil van ahora los anillos de PC, ver
«Ajustes de la tanda 2, 2.ª ronda». Lo de abajo es historia.)*

Pedido del autor, con sus decisiones: salud y hambre siempre a la vista, abajo
del todo y bajo el racimo del pulgar, sin rotulo y con un corazon y un muslo de
pollo en SVG a color; un boton de inventario en la esquina inferior izquierda
(tecla I); el HUD ocultable con su boton arriba a la izquierda y sin tecla; HUD e
inventario cerrados al arrancar. Lo que decidi yo esta en «Esperando tu juicio».

El humo afirma lo que no se ve en un test: que los paneles arrancan cerrados y se
abren con su boton o su tecla, que el inventario en pantalla es el del juego, y
que en un telefono de 390 px el racimo queda entero por encima de la franja y la
franja llega al borde derecho. Comprobado que muerde: con el HUD arrancando
abierto, cae con tres fallos.

**Cabo suelto de medida, no de juego:** `npm run slash` dio dos veces seguidas
**0 pixeles** en el peor rumbo de «de cerca, girando» y, repetida, 17, 93 y 84.
La herramienta anda hasta un sitio con alcance completo y no siempre para en el
mismo (5.0,42.2 / 5.2,42.3 / 5.5,42.6), asi que su peor rumbo depende de donde
cae. El cambio de la franja no toca nada dentro del recuadro que mide.

**Resuelto despues, con la primera persona:** los ceros salian en rumbos donde,
al girar, las casillas de delante quedaban a otra altura y la accion solo
alcanzaba la propia —que no se barre—: no habia arco que ver. La herramienta
ahora cuenta esos rumbos aparte («sin arco») y no los mete en el peor.

---

## El isometrico se retira — HECHO (2026-09-26)

Decision del autor: centrarse al 100 % en el 3D, que el 3D no dependa de nada
del isometrico y no tener que adaptar cada caracteristica a dos modelos. Con
una condicion: **no perder trabajo que solo estuviera en el isometrico.**

Como se hizo, por fases y con `main` en verde entre una y otra:

1. **Cortar la dependencia.** El 3D arrastraba codigo isometrico por una sola
   puerta: `tiles.ts`, que mezclaba el arte de especies con el de terreno e
   importaba `projection.ts`. El arte del 3D paso a `art.ts`, y un test recorre
   el grafo de imports (hoy `tests/client-boundary.test.ts`, que ademas afirma
   que no queda ningun fichero huerfano).
2. **Trasladar lo que solo tenia el isometrico.** Se comparo campo a campo la
   `Intent`, los HTML, los renderizadores y las sondas de depuracion. Salieron
   catorce cosas, y dos eran graves: **en el 3D no se podia comer** —con el
   hambre corriendo— y **al morir la partida se quedaba congelada sin aviso**.
   La tabla entera, con donde vive cada una y que comprobacion la cubre, esta en
   `docs/isometrico.md`.
3. **Humo del 3D antes de borrar nada.** Hasta entonces la unica prueba de
   integracion jugaba el isometrico. La nueva lleva todas sus comprobaciones de
   juego y una por cada traslado, en seis pasadas; convivio con la vieja en CI
   hasta que las dos estuvieron en verde.
4. **Borrar**: ocho modulos, cuatro tests, su humo, el build de un solo fichero
   y `pixi.js`.
5. **El 3D pasa a ser el cliente**: `src/spike3d/` subio a `src/`, los scripts
   perdieron el `spike` y Pages lo publica en la raiz, con `/3d/` redirigiendo
   para no romper enlaces ni el acceso del telefono.

Lo que aparecio por el camino y conviene saber:

- **La mirada es la de la camara**, decision del autor: se acciona hacia donde
  se mira. Por eso las sondas del humo (`probes.ts`) buscan el sitio de apoyo
  al sureste de lo que se quiere golpear: la camara arranca mirando al noroeste.
- **La noche es una vela sobre la pantalla**, como en el isometrico, y no bajar
  las luces: las aspas usan un material sin iluminar y se quedarian a pleno dia
  con el terreno a oscuras. Si algun dia se quiere luz de verdad, primero hay
  que decidir lo del material (ver «Esperando tu juicio»).
- **Dos comprobaciones del humo nuevo pasaban o fallaban segun donde quedara el
  jugador** —el barrido del clic y el de la accion movil—: al pie de un muro las
  tres casillas pueden estar a otra altura y no hay nada que barrer. Se movieron
  al nacimiento, que es un rellano llano por la regla 22.
- **Que un boton llega a la Intent** se mide con contadores (`sent` en la
  sonda), no con su efecto: sembrar depende de tener semillas y sitio.
- **La etiqueta `isometrico-final`** no la dejo crear el proxy de la sesion (se
  corta la conexion al empujar etiquetas). No hace falta para recuperar nada
  —`b1d0d7a` esta en la historia de `main`—, pero si el autor la quiere, se
  crea desde la web.

---

## Fase 2 del relieve: la altura estorba — HECHA

Implementada. Lo que sigue es el diseno tal y como lo fijo el autor, que se
conserva porque los numeros marcados como deduccion **siguen siendo suyos para
corregir**, y debajo lo que aparecio al construirlo.

### Lo que se midio al terminarla

| Medida | Valor | Contra que |
|---|---|---|
| Apice del salto | 1.160 niveles | 1.161 en papel |
| Alcance a paso completo | 2.17 casillas | 2 de diseno |
| Duracion del vuelo | 0.400 s | 0.387 s en papel |
| Conectividad del relieve | pierde 0.14-0.77 pt | presupuesto de 1 pt (regla 14) |
| Coste del spawn nuevo | 8-15 casillas | nueve semillas |

### Lo que aparecio construyendola, y que el codigo no cuenta

1. **Euler se comia un decimo del apice.** Integrando «resta la gravedad y avanza
   con la velocidad ya frenada» el apice medido era 1.06 en vez de 1.16, o sea
   un pelo de un pixel sobre un bloque de 16. Se integra por el promedio de las
   dos velocidades, que con aceleracion constante es exacto.
2. **El spawn de la semilla de prueba era injugable.** Agua al noroeste,
   escalones de +2 al sureste: cuatro casillas andables. `findSpawn` solo miraba
   si el tile era solido, y eso basto mientras el relieve no estorbaba.
3. **El rellano de 3x3 no es comodidad.** Sin el, la accion —que solo alcanza la
   altura propia— llegaba a **una casilla de las tres** nada mas empezar.
   Pero el rellano trajo su propio sesgo, y lo destapo la CI, no el humo local:
   **lo llano de este mundo son las mesetas, y las mesetas son roca**, asi que
   cinco de nueve semillas pasaron a nacer en piedra pelada a nivel 16, sin nada
   que comer. Se arreglo exigiendo ademas terreno que sostenga vida, y sale
   gratis: el radio de busqueda pasa de 8-15 a 8-17 casillas.

   Dice algo del mundo, no del spawn: **si hace falta filtrar para encontrar
   suelo llano habitable, es que el relieve es muy empinado.** Es la misma
   observacion de mas abajo, por otra puerta.
4. **La conectividad estaba bien calibrada de antemano.** `analyze-world` ya
   media con «se sube un bloque de un salto», asi que el presupuesto de la regla
   14 se fijo para esta fisica. `debug.reachableArea` no, y se corrigio.
5. **Las comprobaciones de direccion fija dejaron de valer.** Media docena de
   ellas —en tests y en el humo— daban por hecho que andar hacia un lado avanza.
   Ahora una pared es una respuesta correcta, y lo que hay que afirmar es que se
   puede ir a **alguna** parte.
6. **`actionArea` no se filtro; se le anadio `actionReach` al lado.** El plan
   decia filtrar dentro, pero aquella es geometria pura del anillo de
   direcciones y sus 21 tests no conocen el mundo ni deben. El filtro por altura
   es una pregunta sobre el relieve y vive aparte; quien acciona y quien dibuja
   el reticulo usan la version filtrada, para que lo marcado sea justo lo que se
   alcanza.

### Lo que queda pendiente de tu juicio

- **`GRAVITY = 62` y `JUMP_SPEED = 12` siguen siendo deduccion mia.** Salen de tu
  caso, y la tabla de arriba dice exactamente que producen.
- ~~**Soltar el mando en el aire conserva el impulso, no frena.**~~ *Ya no
  aplica: desde el 2026-09-30 en el aire se anda como en el suelo.* Tambien
  deduccion mia. Dijiste «impulso conservado» y «en el aire, correccion
  parcial»; leer «no pido nada» como «quiero pararme» convertiria soltar el
  mando en un freno del 30 % del alcance, y eso es una correccion que nadie
  pide. Si lo quieres al reves, es un `if`.
- **El mundo es empinado, y aqui esta la medida.** Desde el nacimiento de la
  semilla de prueba, empujando ocho segundos en cada una de las cuatro
  direcciones:

  | | Andando | Saltando |
  |---|---|---|
  | Este | 2.4 casillas | **17.2, cruza de chunk** |
  | Norte | 6.2 | 6.2 |
  | Sur | 1.1 | 1.1 |
  | Oeste | 1.1 | 1.1 |

  O sea: **de cuatro direcciones solo una lleva a alguna parte, y solo
  saltando.** Y eso es en un sitio elegido por ser llano y habitable. No es un
  fallo —la altura estorba, que era el encargo— pero si es mucho mas restrictivo
  de lo que se intuia viendo el relieve sin chocar con el. Si quieres laderas
  mas suaves, la palanca es la calibracion del relieve, que es tuya (regla 14):
  `RIDGE_GAIN` y `OUTCROP_THRESHOLD`, midiendo antes con
  `npx vite-node tools/analyze-world.ts`.
- **Los arboles siguen frenando tambien en el aire.** No lo dijiste, asi que no
  lo he cambiado: se mantiene la colision de siempre y no se salta por encima de
  un arbusto. Es una linea si prefieres lo contrario.

### El diseno, como lo fijaste

Vive en `packages/sim`, asi que es agnostica de la camara y **no se ve afectada
por el giro a 3D**.

### Reglas, fijadas por el autor

**El salto**, con su enunciado literal: «desde la casilla 1 a altura 1, saltando y
moviendose al norte, se sube al bloque 2 en altura 2; pero al bloque 3 en altura 2
no se llega — se estampa contra su cara y aterriza en el bloque 2, altura 1». Eso
es una parabola simetrica con el **apice a una casilla exacta** y **alcance dos**.

- ~~**Impulso conservado**: a paso completo llega a 2 casillas; a paso lento, menos.~~
- ~~**En el aire, correccion parcial**: se puede desviar, no dar media vuelta.~~
  *Las dos las cambiaste el 2026-09-30: el salto **solo empuja hacia arriba**
  y en el aire se anda **como en el suelo**, a la velocidad de andar o de
  correr. Ver «Ajustes de la tanda 2, 3.ª ronda».*
- **Caer es caer**: salir de un borde describe un arco con la misma gravedad.
  **Sin dano por caida.**
- **El agua es muro tambien en el aire.** Un salto que acabe sobre agua choca con
  su borde y cae en la orilla de la que salio. Provisional, dicho por el autor: se
  revisara al ampliar las mecanicas de exploracion.
- **La accion solo alcanza casillas a la misma altura**: para talar un arbol
  subido a un bloque hay que subir.
- **La accion pasa a ser exclusivamente el clic derecho**; Espacio queda para el
  salto, y en movil se anade un boton de salto.

*Luego*: las dos ultimas quedaron superadas. El golpe es el sector de la
regla 12, que alcanza a cualquier altura mientras el terreno no lo corte, y
desde el 2026-09-28 golpea el clic **izquierdo** y el derecho **usa**. Igual
con `actionArea`, que ya no existe: `actionReach` son los objetos que toca el
sector.

### Numeros

| Constante | Valor | Origen |
|---|---|---|
| ~~`AIR_CONTROL`~~ | ~~0.30~~ | autor; **retirado el 2026-09-30**: en el aire se anda como en el suelo |
| `JUMP_SPEED` | 12 niveles/s | **deduccion del agente**, ver abajo |
| `GRAVITY` | 62 niveles/s² | **deduccion del agente**, ver abajo |

Derivacion a partir del caso que describio el autor, que **el tiene que poder
corregir**. Con `WALK_SPEED = 5.2` casillas/s, alcance 2 da un vuelo de
`T = 2 / 5.2 = 0.385 s`. Una parabola simetrica tiene el apice en `T/2`, o sea a
una casilla exacta, que es justo donde quiere poder subir un bloque. Fijando el
apice en 1.16 niveles —un pelo por encima del bloque, para que subirse no sea al
milimetro—:

```
g  = 8h / T²  = 8 · 1.16 / 0.385²  ≈ 62 niveles/s²
v0 = g · T/2  = 62 · 0.192         ≈ 12 niveles/s
```

Comprobado contra su caso: a 1 casilla `z = 1.16` → sube el bloque de +1; a 2
casillas `z = 0` → el bloque de +1 a esa distancia es pared. Sale exactamente lo
que describio.

`AIR_CONTROL` se implementa como **tope de desviacion**: la velocidad horizontal
en el aire nunca se aleja mas de `0.30 · WALK_SPEED` de la del despegue. Es
medible en un test, no una sensacion.

### Donde toca

- `sim/entities.ts`: `z`, `vx`, `vy`, `vz`, `grounded`.
- `sim/systems/movement.ts`: en el suelo, lo de hoy mas la prohibicion de entrar
  donde el suelo este por encima de los pies; en el aire, gravedad, tope de
  desviacion y colision contra caras.
- `sim/systems/jump.ts` (nuevo): despegue con el impulso actual y aterrizaje.
- `shared/index.ts`: `Intent` gana `jump`.
- `sim/systems/gathering.ts`: `actionArea` filtra las casillas cuyo nivel no sea
  el del jugador. **`aim.ts` no se toca**: es geometria pura y sus tests valen.

### Que tiene que afirmar `tests/jump.test.ts`

- El caso literal del autor, como tabla.
- A velocidad plena el alcance son 2 casillas; a media, menos.
- La desviacion en el aire nunca supera el 30 % de la velocidad de paso.
- Caer de una altura 3 aterriza abajo y no atraviesa el suelo.
- Un salto sobre agua no acaba nunca dentro del agua.
- Recolectar no alcanza una casilla un nivel por encima.

---

## Diagnosticado y APARCADO por el autor: saltos que se pierden

El autor lo vio jugando: **saltando repetidamente sobre el mismo tile a
intervalos constantes, hay saltos que no se efectuan.** Diagnosticado el
2026-09-12 y **deliberadamente no arreglado**: se deja asi por ahora. Esto queda
escrito para que la proxima tanda no tenga que volver a encontrarlo.

### La causa, que son dos lineas

El salto se encola en un **booleano** (`client/src/input.ts` del isometrico, `jumpQueued`; hoy `controls.ts`) y se
consume **incondicionalmente** en el primer tick del fotograma:

```ts
intent.jump = this.jumpQueued;
this.jumpQueued = false;   // se vacia MIRE O NO si se puede saltar
```

Pero solo se ejecuta si en ese mismo tick se pisa suelo (`sim/tick.ts`, dentro
de la rama `if (entities.grounded[playerId])`). **Una pulsacion que cae en pleno
vuelo se descarta en silencio**: no espera al aterrizaje. No hay buffer de
entrada de ningun tipo.

Que no se encadenen saltos en el aire es correcto y es lo que el autor pidio. Lo
que no es correcto es **tirar la peticion** en vez de retenerla unas decimas.

### Lo medido

Modelo del bucle real de entonces (`main.ts` + el pestillo de `input.ts`, en el
isometrico; en el 3D el pestillo es el mismo, en `controls.ts`) a 60 fps, con un
12 % de temblor humano en el ritmo de pulsacion. El vuelo dura **0.400 s**:

| Periodo de pulsacion | Saltos efectuados | Con un buffer de 0.15 s |
|---|---|---|
| 0.35 s | 51 % | 79 % |
| 0.40 s | 70 % | 98 % |
| 0.45 s | 99 % | 100 % |
| ≥ 0.50 s | 100 % | 100 % |

El corte cae justo donde uno pulsa al saltar repetido en el sitio —unas 2.5
pulsaciones por segundo—, y **no es aleatorio**: depende de la fase entre el
ritmo y el aterrizaje. Por eso se siente como «algunos saltos no salen» y no
como un fallo sistematico.

**Honestidad sobre esta medida:** el mecanismo esta confirmado leyendo el codigo
y el autor lo ve jugando, pero **el porcentaje sale de un modelo, no del juego**.
La medida en navegador quedo sin cerrar, y merece la pena saber por que para no
repetir el intento:

- Con `page.keyboard.press` se perdio **1 de 12 a 300 ms** y ninguno de 400 a
  1000 ms. Confirma que el fallo existe, pero no el ritmo: la latencia de
  Playwright alarga el intervalo real y lo saca de la ventana.
- Despachando los eventos **dentro** de la pagina con `setTimeout` la sonda se
  quedo colgada sin devolver nada. Sospecha: en headless los temporizadores se
  estrangulan, y ademas el juego ahi va a 13 fps, que no es el ritmo del autor.

O sea que para cerrarlo hace falta medirlo **a 60 fps de verdad**, no en el
headless de la prueba de humo. El 30 % es la cifra a batir, no un hecho.

Segundo canal de perdida, menor pero real: al ser un **booleano y no un
contador**, dos pulsaciones dentro del mismo fotograma se funden en una. Solo
importa con fotogramas largos.

### El plan, para cuando se retome

1. **Buffer de salto**: que la peticion viva unas decimas en vez de tirarse, de
   modo que pulsar justo antes de tocar suelo salte al aterrizar. En
   `controls.ts` es cambiar el booleano `jumpQueued` por un contador de ticks
   que decrece, y
   limpiarlo cuando el despegue ocurre de verdad.
2. **Cuanto margen es decision del autor**, no del agente: 0.15 s es lo habitual
   en plataformas, pero un buffer largo hace que el personaje salte «solo» un
   instante despues de soltar. Preguntarselo antes de fijar el numero.
3. **El *coyote time* —poder saltar unas decimas despues de salir de un borde—
   es otra decision aparte** y no se da por supuesta. Se menciona porque es el
   pariente natural del buffer y conviene decidir los dos a la vez.
4. **Como afirmarlo sin echarlo a suertes**: el contador `__verdant.jumps` ya
   existe y cuenta despegues EFECTUADOS, asi que la prueba es pulsar N veces a
   un periodo fijo y comparar. Ojo con medirlo desde Playwright por lo dicho
   arriba: los eventos hay que despacharlos dentro de la pagina.

---

## Cabos sueltos que el autor tiene que mirar

1. **El bonus de equilibrio no lo cobra lo inerte** (piedra y los tres minerales).
   Fue **decision del agente, no suya**, y **esta ya implementada y viva**
   (`shared/index.ts`, `gathering.ts`). Motivo: la montana no tiene vida, asi que
   su bioma esta siempre «en equilibrio» por vacio y los minerales cobrarian el
   +30 % gratis y para siempre. Efecto secundario: la piedra da a veces 2 donde
   antes daba 3. Si prefiere que la piedra siga como estaba, es una linea.

2. **Como se agrupa un bioma.** Revisado a fondo, sin tocar nada. La sospecha del
   autor («se suman todos los tiles de un tipo como un bioma global») es
   literalmente falsa —`collectBiome` es una inundacion por adyacencia desde su
   chunk—, pero su conclusion practica se sostiene por tres motivos distintos:
   - **La conexion es por chunk, no por tile**: a un chunk le basta **un tile** de
     pradera entre sus 1024 para servir de puente.
   - **`isTracked` no caduca nunca**: `pruneFar` borra el cache de terreno pero
     **jamas `this.records`**, asi que el tejido conectivo solo crece.
   - **`BIOME_MAX_CHUNKS = 512` con `queue.pop()`, o sea LIFO**: los 512 chunks
     contados no son los 512 mas cercanos sino un tentaculo, asi que el panel
     puede estar describiendo un corredor lejano.

   Dos notas para cuando se decida actuar: `withinEquilibrium` con
   `reference <= 0` da «equilibrado» con hasta `COUNT_SLACK` unidades, asi que un
   bioma sin vida cuenta como sano; y `biomeCache` se vacia entero en cada paso de
   vida y en cada cambio de tile, asi que el coste del recorrido se paga a menudo.

---

## Aparcado a proposito por el autor

- **Las rampas**, a revisar al ver el relieve nuevo.
- La estetica del HUD, la fauna, las especies de costa, el subsuelo, y la
  construccion y destruccion del terreno. (El encuadre de las cimas era cosa
  del isometrico y se fue con el; el crafteo ya esta en marcha.)

---

## Medidas que costaron caro y que el codigo no cuenta

- **Un atlas de texturas no habria servido** en el isometrico: se midio forzando
  una sola textura para todas las cimas y el peor frame no mejoro. El coste es el
  numero de quads. Lo que si sirvio fue recortar por bloques de 8x8: de 10.236
  piezas a 3.026.
- **El presupuesto de conectividad se mide contra la linea base solo-agua**, nunca
  contra el 100 %: el mundo plano tampoco es conexo (75-88 % segun semilla). La
  medida **no es monotona**, asi que se elige el valor consistente en las tres
  semillas, no el mas generoso.
- **Una cordillera SI fabrica muros**: la ganancia no actua solo sobre la
  pendiente del campo base. Sin salientes hay 671-1146 tiles al pie de una pared
  de dos bloques, y cuestan **cero** en conectividad.
- **three.js pesa MENOS que PixiJS aqui**: el spike de 3D son 506 KB contra los
  565 KB del juego isometrico. Hace mucho mejor tree-shaking.
- **Cada medida nueva se verifica reintroduciendo el fallo y viendola caer.** La
  prueba de humo ha pasado por el motivo equivocado mas de una vez.
