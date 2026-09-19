# Lo que esta por hacer

Este fichero existe porque las notas de trabajo del agente viven en un contenedor
efimero y **mueren con la sesion**. Lo que hay aqui son decisiones del autor y
deuda tecnica que ninguna sesion nueva podria reconstruir leyendo el codigo.

Lo permanente del *como* esta en `CLAUDE.md`; las leyes del mundo, en
`docs/el-libro-del-mundo.md` y `docs/leyes.md`. Esto es el *que falta*.

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
  números en `spike3d/shadows.ts`.
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
(`npm run spike:slash`, que cuenta pixeles de pantalla y no barridos lanzados):

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

**Y desde el 2026-09-12, el isometrico esta congelado por decision suya:**
no se gasta trabajo en el, no se le portan los cambios nuevos y no se le
anaden mecanicas. Lo que venga de ahora en adelante se hace en `sim` (que es
comun) y en el cliente 3D. `CLAUDE.md` lo lleva como nota de cabecera, con el
detalle de que ficheros abarca y de que hacer si un cambio en `sim` tumba el
humo del isometrico.

El autor probo un spike de 3D (`packages/client/src/spike3d/`, `npm run spike`) y
**decidio girar**. Motivo, medido y no opinado: en una isometrica de angulo fijo
la informacion para entender el relieve **no esta en la imagen** —subir un nivel
equivale exactamente a retroceder dos filas, y el pie de un escalon queda siempre
tapado; las dos identidades estan fijadas en `tests/projection.test.ts`—. Wakfu lo
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

### Lo que la migracion tiene que resolver y el spike no resolvio

1. **El terreno tapa al jugador** cuando la camara queda detras de una loma. En 3D
   se resuelve con colision de camara o atenuando lo que se interpone; son
   soluciones estandar, no otro callejon.
2. **El personaje de frente y de espaldas**: un billboard plano se lee bien en un
   arbol y regular en un humanoide.
3. **Agrupar los sprites.** Entre 100 y 300 draw calls segun el angulo, casi todos
   arboles sueltos. A 80 FPS no bloquea, pero es la primera optimizacion.
4. **Que se retira del isometrico**: `projection.ts`, `terrain-draw.ts`,
   `relief-faces.ts`, `biome-edges.ts`, el arte de terreno de `tiles.ts` y la
   mayor parte de `renderer.ts`. Sobreviven `effects.ts`, `palette.ts`,
   `devtools.ts`, `main.ts` y `input.ts` casi enteros.

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

El salto se encola en un **booleano** (`client/src/input.ts`, `jumpQueued`) y se
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

Modelo del bucle real (`main.ts` + el pestillo de `input.ts`) a 60 fps, con un
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
   `input.ts` es cambiar el booleano por un contador de ticks que decrece, y
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
