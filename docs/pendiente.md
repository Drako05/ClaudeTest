# Lo que está por hacer, y el registro de lo aprendido

Este fichero existe porque las notas de trabajo del agente viven en un contenedor
efimero y **mueren con la sesion**. Lo que hay aqui son decisiones del autor y
deuda tecnica que ninguna sesion nueva podria reconstruir leyendo el codigo.

Lo permanente del *como* esta en `CLAUDE.md`; las leyes del mundo, en
`docs/el-libro-del-mundo.md` y `docs/leyes.md`.

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
| `GRAVITY = 62` y `JUMP_SPEED = 12`, deducidos de tu enunciado del salto | Fase 2 del relieve | dos numeros |
| Soltar el mando en el aire **conserva** el impulso, no frena | Fase 2 del relieve | un `if` |
| Los arboles siguen frenando tambien en el aire | Fase 2 del relieve | una linea |
| **El mundo es empinado**: de cuatro direcciones solo una lleva a alguna parte, y saltando | Fase 2 del relieve | calibracion del relieve (regla 14) |
| El bonus de equilibrio **no lo cobra lo inerte** (piedra y minerales) | Cabos sueltos | una linea |
| Como se agrupa un bioma: la conexion es por chunk y `isTracked` no caduca | Cabos sueltos | trabajo de verdad |
| `EYE = 1.6` para la camara, al crecer el personaje | Proporciones nuevas | un numero |
| **El relieve se lee menos de la mitad de alto** tras las proporciones | Proporciones nuevas | calibracion del relieve |
| El grosor del barrido: 0,12 casillas, redondeado al alza por el antialias | El barrido del 3D | un numero |
| Los ojos a **1,75** para las tres vistas y el golpe (la orbital miraba a 1,6) | Golpe por hitbox y una sola mirada | un numero en `sim/aim.ts` |
| Inclinacion de arranque **−0,62** tambien en primera persona (antes entraba a −0,2) y tope de **±83 grados** | Golpe por hitbox y una sola mirada | numeros en `camera.ts` |
| Sembrar a menos de 2,5 bloques (el alcance es tuyo) **en horizontal**, no a lo largo de la mirada (asi basta mirar 35 grados abajo, no 44) | Golpe por hitbox y una sola mirada | una linea |
| Hitboxes: arbusto 0,9 de ancho × 1,1, roca y minerales 0,9 × 1,0, brote 0,3 × 0,85 | Golpe por hitbox y una sola mirada | numeros en `gathering.ts` |
| Colision de camara: se para **0,3** antes, la isometrica a **60** como mucho, y el jugador se oculta con la camara a menos de **1** | Golpe por hitbox y una sola mirada | numeros en `camera*.ts` |
| Grosor del barrido en primera persona: medio ancho **0,04** a 2,5 bloques | Golpe por hitbox y una sola mirada | un numero en `effects.ts` |
| El barrido se **congela en el mundo** al nacer: girar la camara despues no lo arrastra | La accion es un cono | una linea |
| En tercera persona **el personaje tapa el centro de la pantalla**, que es hacia donde se golpea | Golpe por hitbox y una sola mirada | un encuadre por encima del hombro |
| El cuarto de vuelta propio de cada aspa | Las features ya son aspas | un numero |
| El tamano y la intensidad de la sombra tumbada | Las features ya son aspas | dos numeros |
| El material de las aspas **no se ilumina**, para que el aspecto no cambiara | Las features ya son aspas | cambiar a Lambert, con pegas |
| Comer y sembrar en el racimo del pulgar: a la izquierda de todo y los mas pequenos | El isometrico se retira | CSS |
| La noche como **vela sobre la pantalla**, no bajando las luces | El isometrico se retira | trabajo de verdad si se quiere luz |
| Sin `?seed` se juega un mundo al azar (el 3D usaba siempre el 12345) | El isometrico se retira | una linea |
| Salud y hambre **apiladas** (salud arriba), la franja de 50 px y **sin numero** en las barras | La franja de salud y hambre | CSS |
| La mochila del inventario y la «i» del HUD en **monocromo**, como el ojo; a color solo el corazon y el muslo | La franja de salud y hambre | SVG |
| Con el inventario abierto en el movil, el panel **tapa** comer, sembrar y correr hasta que se cierra | La franja de salud y hambre | CSS |
| El dedo de ACCION no gira la camara hasta moverse **6 px** (`TAP_SLOP`), para que el pulgar quieto no de tirones | `CLAUDE.md`, racimo del pulgar | un numero |
| Primera persona: catalejo hasta **15°** (el campo de vision ya es tuyo: 70-120, 70 por defecto) | `CLAUDE.md`, las tres vistas | un numero en `camera.ts` |
| Sensibilidad del raton capturado: **0,0025 rad por pixel** (unos 0,14 grados) | El raton lleva la mirada | un numero en `camera.ts` |
| Con el cursor capturado **un clic es un golpe** y mantener no repite | El raton lleva la mirada | un temporizador |
| Al morir el cursor **se suelta** para pulsar «Reiniciar», y reiniciar lo vuelve a capturar | El raton lleva la mirada | una linea |
| Un toque de verdad **apaga** el modo raton (portatil tactil), y ya no hay pausa por el cursor | El raton lleva la mirada | una linea |
| Textos del aviso: «Haz clic para jugar» al arrancar y «Haz clic para continuar» despues | El raton lleva la mirada | HTML |
| Casillas iniciales y tope: **16 y 100**, ya decididos por el autor (antes, 8 y 20 mios) | Recoleccion y fabricacion | — |
| Lo que no cabe: el golpe **no completa** y el objeto se queda; tirar (soltar fuera del panel) lo **hace desaparecer** | Recoleccion y fabricacion | `gathering.ts` / `inventory.ts` |
| Las **descripciones** de los objetos (una frase cada uno) | Inventario de los bocetos | texto en `inventory-ui.ts` |
| La **barrita de desgaste** en las herramientas (no estaba en el boceto) | Inventario de los bocetos | CSS |
| OTROS se cierra tocando fuera; su columna va centrada bajo el, y el HUD se abre a su lado para no taparla | Inventario de los bocetos | CSS y una linea |
| La barra del angulo en el movil sale **a la derecha del ojo**, que ahora esta en la columna de OTROS | Inventario de los bocetos | una linea en `fov-panel.ts` |
| Tamanos de la pantalla del movil (ataque 96, usar 64, correr y saltar 62; la barra de arriba encoge hasta dejar 10 px a cada redondo) | Inventario de los bocetos | CSS |
| El arrastre empieza a los **6 px** | Inventario de los bocetos | un numero |
| Esquirlas de golpe: saturacion al **40 %**, opacidad **45 %** (las **8** por golpe son tuyas) | Inventario de los bocetos | numeros en `effects*.ts` |
| Las diez casillas de equipables se ven **apagadas** hasta la ropa | Inventario de los bocetos | CSS |
| La zona de lo seleccionado mide siempre lo mismo (una descripcion larga se desliza dentro) y en PERSONAJE dice «Equipables: llegaran con la ropa» | Ajustes del inventario, 2.ª ronda | CSS y texto |
| Usar mirando a algo (sin nada util en la mano) **aun no hace nada** | Inventario de los bocetos | llega con puertas y demas |
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
| Los grados son **verticales**, como el 70 de siempre: a 100, un movil apaisado ve mas de 140 en horizontal | Angulo de vision ajustable | una conversion |
| Con raton el catalejo vuelve **0,8 s** despues del ultimo giro de rueda (no hay «soltar») | `CLAUDE.md`, las tres vistas | un numero |
| Una roca vista desde arriba se lee como **dos cartas cruzadas** | Las features ya son aspas | darles modelo propio |
| Tronco = el tramo **desnudo** hasta la copa, y la copa **conserva su tamano** | Arboles altos | redibujar el arte |
| El tronco desnudo **por especie** (μ ± σ): picea comun 2,5 ± 0,35, alerce 4 ± 0,5, roble 2,4 ± 0,3, cerezo 2,2 ± 0,2, picea negra 2,1 ± 0,1, picea azul 2,2 ± 0,2; **truncada** en `[max(2, μ−2σ), μ+2σ]` | Troncos por especie | numeros en `sim/trunk.ts` |
| Grosor del tronco por especie (0,45; 0,40; **0,75**; 0,50; **0,22**; 0,40) y que crezca con `√(desnudo/μ)` | Troncos por especie | numeros en `sim/trunk.ts` |
| **Casi todas las copas quedan justo sobre la cabeza** (el minimo es 2 y el jugador mide 1,93); solo el alerce las deja altas | Troncos por especie | las medias de la tabla |
| El tronco va en escalones de **un cuarto de bloque** (13 alturas) | Arboles altos | un numero |
| Coniferas, frondosos y los **raros** sacan el tronco de la misma normal | Arboles altos | un `if` |
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

1. **El terreno tapa al jugador** cuando la camara queda detras de una loma. En 3D
   se resuelve con colision de camara o atenuando lo que se interpone; son
   soluciones estandar, no otro callejon.
2. **El personaje de frente y de espaldas**: un billboard plano se lee bien en un
   arbol y regular en un humanoide.
3. **Agrupar los sprites.** Entre 100 y 300 draw calls segun el angulo, casi todos
   arboles sueltos. A 80 FPS no bloquea, pero es la primera optimizacion.
4. ~~Que se retira del isometrico.~~ **Hecho el 2026-09-26**: se retiro entero
   (ver «El isometrico se retira»). Los puntos 1 a 3 siguen abiertos.

---

## Ajustes del inventario, 3.ª ronda — HECHO (2026-09-29)

- Otro dibujo para el ATAQUE (espada y pico cruzados).
- PC: la **rueda recorre la barra de la mano** y el zoom queda con + y -.
- PC: **Esc cierra el inventario** sin pausar. En pausa, **solo el clic
  reanuda** (tu eleccion: Chrome no deja volver a capturar con Esc).
- **Cruz en el centro** de la pantalla, en todas las vistas.
- USAR y SALTAR se encienden al tocarlos.
- La descripcion se limpia al tocar una casilla vacia, y al abrir el
  inventario no hay nada seleccionado.
- **Registro de objetos** «+5 Madera / -1 Bayas»: bajo INVENTARIO en el movil,
  abajo a la derecha en PC (tu eleccion), maximo cinco lineas.

## Ajustes del inventario, 2.ª ronda — HECHO (2026-09-29)

- Sostener el ojo **0,5 s** abre la barra del angulo (era 1 s). De paso
  desaparece el tramo muerto: de 0,5 a 1 s Chrome ya no mandaba el toque.
- Panel del movil: el contenido pegado a las pestanas; pestanas, zona de lo
  seleccionado (fija y centrada abajo) y categorias de recetas **fijas**; solo
  se deslizan la rejilla del inventario y la lista de recetas, centradas.
- **PERSONAJE** con tu boceto nuevo (tres a cada lado, cuatro abajo) y su zona
  de descripcion, que encaja con la de INVENTARIO. En PC tambien, como
  pediste.
- **Ningun aviso en pantalla.** Fabricar sin sitio queda para la tanda de
  objetos que se tiran al suelo.

## Ajustes del inventario — HECHO (2026-09-29)

Sobre la misma tanda:
- Movil: CORRER y SALTAR al borde derecho del ATAQUE, USAR a su borde de
  abajo; OTROS despliega en columna debajo; la barra, en el centro exacto de
  arriba; **solo iconos**, sin rotulos.
- Angulo de la primera persona de **70 a 120**, 70 por defecto (lo guardado
  por debajo de 70 se lee como 70).
- Fabricar en **1,5 s**, con la carga hasta el borde de los ingredientes.
- Pestanas **Personaje | Inventario | Recetas** en lugar de las flechas.
- Alcance del golpe y de sembrar: **2,5**.
- **8 esquirlas** por golpe.
- Arrastrar entre la rejilla y la barra con el inventario abierto, y dentro de
  la barra con el cerrado; tirar pide confirmacion, y desde la barra cerrada
  soltar al vacio no tira.

Lo comprueban los tests del golpe (2,4 cae, 2,8 no; sembrar a 2,24 si, a 2,69
no) y del angulo, el humo (alineaciones medidas, pestanas, iconos, confirmar,
de la rejilla a la barra, 1,5 s) y los gestos con toques de verdad (la barra
cerrada, de la rejilla a la barra, receta 1,5 s).

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
- **Fabricar es mantener 2 s**.
- **Esquirlas** pequenas, semitransparentes y poco saturadas al golpear sin
  romper, y sin barra de progreso.
- Sin iconos, y la cantidad solo como numero.

Lo que decidi yo esta arriba, en «Esperando tu juicio».

Lo comprueban los tests del nucleo (mover y apilar, usar, fabricar sin sitio,
golpes sin romper), el humo con raton (E, arrastrar, tirar, mantener 2 s, clic
derecho para comer y sembrar, OTROS, las paginas del movil) y `npm run gestures`
con toques de verdad (arrastrar una casilla y mantener una receta).

## Recoleccion y fabricacion — tanda 1 HECHA, tanda 2 ESPERANDO (2026-09-28)

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
- El hacha tala en 4 golpes. El pico saca roca, carbon y cobre; el hierro dice
  «Necesitas un pico mejor».

Lo comprueban `tests/crafting.test.ts`, con una partida guionizada de las manos a
los minerales, y el humo. El humo fabrica un pico desde el panel con los
«Materiales de piedra» del panel de desarrollo y saca cobre golpe a golpe.

**Tanda 2, esperando a que des por buena la 1** (el plan aprobado, para que no se
pierda):

- **Estaciones**, colocadas con F en la casilla que toca la mirada (sin estacion
  en la mano, F siembra). Estorban el paso y se recogen a mano con 3 golpes.
  - Mesa de trabajo = 8 madera: recetas de mesa a menos de 3 casillas.
  - Horno = 10 piedra + 2 carbon: fundir a menos de 3 casillas.
- **Fundir**, instantaneo:
  - 2 mineral de cobre + 1 carbon = 1 lingote de cobre;
  - 2 mineral de hierro + 2 carbon = 1 lingote de hierro.
- **Herramientas de metal**, en la mesa:
  - hacha y pico de cobre = 2 ramas + 3 lingotes de cobre; poder 2, 120 usos;
    el pico de cobre mina hierro;
  - hacha y pico de hierro = 2 ramas + 3 lingotes de hierro; poder 3, 250 usos.
- **Indumentaria**, en la mesa, en dos huecos nuevos del personaje:
  - bolsa de fibra (8 fibra), en la cintura: +2 casillas;
  - mochila de armazon (10 fibra + 4 madera + 2 lingotes de cobre), en la
    espalda: +6 casillas.
  - No se puede quitar una prenda con sus casillas ocupadas.
- **La otra mitad de la ley**, «experiencia», queda fuera: esta sin disenar.

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

## La accion alcanza tambien la casilla que se pisa — HECHO

Pedido del autor: cuatro casillas en vez de tres, con su enunciado sobre una
rejilla 1-9 (jugador en el 5; mirando a 2 → 1, 2, 3 y 5; mirando a 3 → 2, 3, 6
y 5). El arco del barrido no cambia, tambien decision suya. Esta en la regla 12
de `CLAUDE.md`. Recolectar la propia solo hace algo si hay algo pisable encima
—una mata, por ejemplo—; sembrar sigue siendo solo la apuntada.

---

## La franja de salud y hambre — HECHA (2026-09-26)

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
- **Soltar el mando en el aire conserva el impulso, no frena.** Tambien
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

- **Impulso conservado**: a paso completo llega a 2 casillas; a paso lento, menos.
- **En el aire, correccion parcial**: se puede desviar, no dar media vuelta.
- **Caer es caer**: salir de un borde describe un arco con la misma gravedad,
  conservando el impulso. **Sin dano por caida.**
- **El agua es muro tambien en el aire.** Un salto que acabe sobre agua choca con
  su borde y cae en la orilla de la que salio. Provisional, dicho por el autor: se
  revisara al ampliar las mecanicas de exploracion.
- **La accion solo alcanza casillas a la misma altura**: para talar un arbol
  subido a un bloque hay que subir.
- **La accion pasa a ser exclusivamente el clic derecho**; Espacio queda para el
  salto, y en movil se anade un boton de salto.

### Numeros

| Constante | Valor | Origen |
|---|---|---|
| `AIR_CONTROL` | 0.30 | autor («correccion parcial») |
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
- **El encuadre**: una cima de 40 niveles son 640 px y el zoom normal se queda
  corto en el isometrico. Con la camara libre puede dejar de ser un problema.
- La estetica del HUD, la fauna, el procesado de recursos y el crafteo, las
  especies de costa, el subsuelo, y la construccion y destruccion del terreno.

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
