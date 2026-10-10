# Lo que está por hacer, y el registro de lo aprendido

Este fichero existe porque las notas de trabajo del agente viven en un contenedor
efimero y **mueren con la sesion**. Lo que hay aqui son decisiones del autor y
deuda tecnica que ninguna sesion nueva podria reconstruir leyendo el codigo.

Lo permanente del *como* esta en `CLAUDE.md` y en los documentos de `docs/` que
indexa (desde el 2026-10-02, cada parte del juego en el suyo); las leyes del mundo, en
`docs/el-libro-del-mundo.md` y `docs/leyes.md`.

**Ultima auditoria: commit `3415d31`, 2026-10-04** (la primera tanda de fauna y
la de los equipables, desde `8396b7f`). La proxima parte de aqui: ver
`.claude/skills/auditoria/` y «Auditoria al cerrar la fauna y los equipables»,
mas abajo.

**Como leerlo.** Desde el 2026-10-10 son tres ficheros, partidos como se partio
`CLAUDE.md` el 2026-10-02 y por lo mismo: este se lee al empezar cada tanda, y
llego a 123 KB (≈ 35.000 tokens) que viajaban en cada llamada. **Nada se
reescribio: cada seccion se movio entera y literal.**

1. **Este fichero, entero, al empezar**: la tanda en curso —lo que el autor ya
   eligio y aun no es codigo—, la ultima auditoria, lo que el autor aparco o
   tiene que mirar, y las medidas que costaron caro.
2. **`docs/juicio.md`, «Esperando tu juicio»**: las decisiones que tomo el
   agente por deduccion y que el autor puede corregir. **No hace falta leerla
   entera**: antes de tocar una parte, busca en ella sus filas (por el nombre de
   la parte o del fichero). Las deducciones nuevas se anaden alli.
3. **`docs/historia.md`, las tandas cerradas**: que se hizo, que se midio y que
   aparecio por el camino. Es historia que el codigo no cuenta; se consulta
   cuando algo remite a ella, no se lee de corrido. Al cerrar una tanda, su
   seccion «HECHA» se mueve alli entera.

---

## TANDA EN CURSO: fisicas — cajas que chocan siempre, gravedad, inercia, camara (2026-10-10)

**Empieza aqui.** Es tambien la fase 2 de los voxeles (abajo). El autor, literal
(2026-10-10):

1. «las entidades y el jugador solo bajan de escalón cuando al caer ninguna de
   sus cajas choca con algo. lo mismo se aplica para subir. es decir, todas las
   cajas chocan con el terreno en todo momento.»
2. «las entidades deben saltar para subir un escalón de mas de 0.5. usando las
   mismas físicas que el jugador (moverse para desplazarse en el aire y poder
   subir porque el mero salto solo aplica impulso vertical). creo que aquí se
   puede aplicar el sistema de salto automático pero para los animales.»
3. «solo al subir escalones ≤ 0.5 se permite teletransportar a la entidad o el
   jugador. lo que en la practica, será simplemente como seguir caminando.»
4. «ahora para cualquier entidad y jugador, debe haber una desaceleración al
   cambiar la dirección del movimiento, ya sea caminando, corriendo o en el
   aire (cayendo o saltando). Esta desaceleración también aplica al dejar se
   avanzar, no se parara el instante, sino que tendrá ese pequeño instante de
   desplazamiento en la dirección que llevaba (debe ser pequeño, como 0.1s,
   pero escucho tus sugerencias para este detalle).»
5. «en todo momento, la cámara debe tener un suavizado/retraso de 0.1s al
   perseguir al jugador en todas las vistas. (es un tiempo ajustable que
   juzgare cuando lo pruebe).»

Y sus respuestas a las preguntas:
- Inercia: **arranque y frenada en 0,1 s**, a ritmo constante.
- Camara, literal: «el retraso igual en todas las vistas y direcciones, el
  centro de la pantalla sigue siendo el punto hacia donde mira y apunta el
  personaje sin importar la ubicación del personaje.»
- Saltar mientras se cae medio bloque: **sin margen**.
- Animales en el aire: **como el jugador, a su paso**; saltan justo antes de
  chocar si llegan arriba, y si no, rodean.

**El plan, en tres fases, cada una a `main` con su CI:** A, el jugador (el
terreno con la huella entera, sin `SNAP_DOWN`, techos, inercia); B, los animales
(el reposo por cajas, auto salto a su paso, inercia); C, la camara (retraso
exponencial ajustable en el panel, y mirando al punto de mira). **El modelo
comun, deduccion mia: la altura de reposo** de un cuerpo es el maximo, sobre
cada caja, de lo mas alto bajo su huella menos lo que esa caja esta por encima
de los pies; andando se sube de golpe hasta `STEP_UP`, por debajo se cae con
gravedad, y en el aire no se entra donde el reposo pasa de los pies.

**Estado:** A y B hechas y **fueron juntas a `main`**: la CI de A cayo en tres
pasadas del humo, y cuando estuvieron arregladas B ya estaba en el arbol. Lo
que ensenaron: `stations` (la deriva al empujar arboles metia la huella en el
pasillo de la mesa y el horno: orden de teclas), `fauna` (una presa parada
puede estar atascada lejos de su punto de paso, y al recargar aparece en el:
se exige `atWaypoint`), y `slash` (ver `docs/pruebas.md`: la vista normal
cuenta solo rumbos con la camara libre). **C, hecha**: la camara persigue los
ojos con retraso exponencial de 0,1 s en las tres vistas y mira al punto de
mira (`docs/controles.md`), con un deslizador en el panel de desarrollo. Las
tres fueron a `main` juntas, tras una sola tanda de CI. **Falta la
`/auditoria`**, que cierra la tanda.

Fuera de esta tanda y pendiente del autor: **las paredes de 2+ voxeles**, que el
relieve interpolado casi elimino (de 38-47 m de pared de 1 m o mas por 100 m² a
1,6-3); se le propusieron cuatro opciones (A: interpolar solo los desniveles de
medio bloque; B: sin interpolar; C: mas relieve; D: zonas de acantilados).

## El mundo de voxeles de 0,5 — fase 1 hecha (2026-10-06)

**Empieza aqui.** El autor decidio pasar el terreno de mapa de alturas (un
nivel y una rampa por casilla de 1) a **voxeles de 0,5 × 0,5 × 0,5**, «para
darle un aspecto y jugabilidad diferente a mi juego, sobre todo de cara a los
próximos cambios referentes al sandbox (destrucción del terreno y
construcción)». Un mapa de alturas no puede tener nada debajo de un suelo —ni
tuneles, ni cuevas, ni puentes, ni techos—, asi que destruir y construir de
verdad piden voxeles; y pasar primero a alturas de 0,5 y luego a voxeles seria
migrar dos veces. Por eso se hacen juntos.

**Sus respuestas, literales** (2026-10-06):

1. Modelo: «Sí, me gustaría un modelo de voxeles completo, con todas las
   formaciones del terreno que eso implica. Pero en la primera tanda quisiera
   que solo nos centremos en dejar las bases del mundo de voxeles y aún no
   entrar en la creación de formaciones geográficas, sino solo en que se genere
   el terreno y los biomas superficiales como los tenemos ahora.»
2. Subir: «El nuevo bloque y cualquier otro elementos que mida ≤ 0.5, se sube
   andando. Debe ser una característica de las físicas del juego, para no tener
   que especificarlo en cada elemento.»
3. Cuerpo: «El cuerpo del player va a medir 1.8.»
4. Objetos: «Los objetos se colocan en la rejilla de 0.5. pero aquí hay
   matices: elementos generados proceduralmente en la creación del mundo deben
   ir con toda su hitbox apoyada en terreno. Por ejemplo, si la ubicación de un
   árbol dice que va en un punto y resulta que ese punto es un escalón aislado
   (bloque de 0.5 sin bloques adyacentes) entonces el árbol bajara un nivel y
   reconsultara la condición, así hasta que toda la cara inferior de su hitbox
   este apoyada en terreno. Para el caso de bloques puestos por el jugador,
   estos se quedarán sobre cualquier otro bloque que sean puestos, siempre que
   la base de su hitbox toque con algo, sin importar que el área de toque sea
   pequeña.»
5. Movil: «Deberemos medir y optimizar para el caso del móvil, ya iremos
   decidiendo que medidas se pueden tomar.»

**Lo que eso fija para la primera tanda:**
- **Alcance**: las bases del mundo de voxeles —el dato, su generacion, su
  dibujo y su fisica— con **el mismo terreno y los mismos biomas de
  superficie que hoy**. Nada de cuevas, salientes ni formaciones nuevas, y
  todavia ni excavar ni construir: son tandas siguientes.
- **Subir**: todo lo que mida ≤ 0,5 se sube andando, por la fisica y no por
  objeto: `STEP_UP` = 0,5 inclusive, para el terreno y para las cajas. Una
  pared es de 2 bloques (1, lo que hoy es un bloque); el salto (1,16) sube 2.
- **El jugador mide 1,8** de alto: pasar pide 4 bloques libres (2,0 ≥ 1,8).
  Con voxeles hay techos: la cabeza choca.
- **Objetos en la rejilla de 0,5**:
  - **generados**: toda la cara inferior de su caja apoyada en terreno; si no
    lo esta, baja un nivel y vuelve a mirar, hasta que lo este;
  - **puestos por el jugador**: se quedan sobre lo que toque la base de su
    caja, por poco que sea.
- **Movil**: medir y optimizar; las medidas (distancia de vista, terreno lejano
  simplificado…) las decide el autor a la vista de los numeros.

**Lo que habra que proponerle y que confirme antes de escribirlo** (regla de
trabajo con el autor; nada de esto esta decidido):
- como se lee el terreno de hoy en voxeles: el nivel entero de cada casilla
  pasa a 2 bloques de 0,5, y las rampas (regla 15) a medios bloques;
- si el bioma, la contabilidad de vida y los recursos siguen por casilla de 1
  o pasan a la de 0,5 (la regla 10 y la ley del observador dependen de ello);
- que reglas duras caen o se reescriben —9, 13, 14, 15, 21, 22 y 23 al
  menos— y en que orden por fases, cada una jugable y verificada. La propuesta
  que se le hizo: (1) voxeles en el nucleo con tests, (2) el dibujo, (3) la
  fisica —suelo, techos, golpe y mirada cortados por voxeles—, (4) generacion
  y calibracion (`tools/analyze-world.ts`), (5) en otra tanda, excavar y
  construir. Las ediciones del terreno tendran su propia capa, como el overlay
  de `World.setFeature` (regla 4).

**Aparcado dentro de esta tanda**: el animal que cae de un escalon cuando el
centro de su tronco pasa el borde, con las patas traseras quedando dentro del
bloque de arriba (lo vio el autor, 2026-10-05). La propuesta que quedo en la
mesa: **que caiga solo cuando todo su cuerpo cabe abajo**. Como con voxeles esa
fisica se reescribe entera, se resuelve ahi.

**Al empezar la tanda, el autor decidio ademas** (2026-10-06):
- **sin rampas**: «Elimina las rampas por completo, el terreno solo se genera en
  bloques de 0.5»;
- **el escalon natural, de medio bloque en alto y en planta**: la misma
  elevacion de hoy, leida cada 0,5;
- **el bioma, la vida y los recursos siguen por casilla de 1**;
- **el terreno tambien se pisa con la huella entera**, y los animales caen
  solo cuando el cuerpo cabe abajo (fase 2);
- **cada fase a `main`** cuando su CI este en verde.

El plan, por fases: (1) el terreno de voxeles, su generacion y su dibujo, con
la fisica de antes adaptada a columnas; (2) la fisica de voxeles —el jugador
como caja de 0,68 × 0,68 × 1,8 con techos, subir ≤ 0,5 igual para terreno y
cajas, apoyo por la huella entera, animales que caen solo cuando caben, rayos
por voxeles—; (3) medir y optimizar el movil, decidiendo el autor a la vista de
los numeros.

### Fase 1 — HECHA (2026-10-06)

- **El dato**: cada chunk guarda la altura de sus 64 × 64 columnas en medios
  bloques (`Chunk.height`); `World.columnTop`, `isSolidVoxel` y
  `groundHeightAt` (el techo de la columna que se pisa). `WorldGen.columnTopAt`
  es puro, para el dibujo y las sondas. Fuera `levelAt`, `rampDirAt`,
  `groundHeight`, `rampDirOf`, `isRampEdge`, `RAMP_SHARE` y la regla 15.
- **La generacion**: ver `docs/relieve.md`, «Voxeles de 0,5». Medido, el
  mundo y su conectividad salen como antes.
- **Lo que se apoya**: lo generado, en la columna mas baja de su casilla; las
  estaciones, en la mas alta (`objectBase`).
- **El nacimiento y las medidas de conectividad** van por columnas.
- **El dibujo**: una tapa por columna, o una sola por casilla si sus cuatro
  columnas estan a la misma altura (el terreno llano cuesta lo de antes), y una
  pared por vecina mas baja. Las sombras, la reticula, la rejilla de chunks y
  los bordes de bioma, por columnas.
- **El auto salto sigue la escalera**: decide contra el escalon anterior, no
  contra los pies, asi que una escalera de medio bloque se anda.
- **La fisica sigue siendo la de antes** (el terreno en el centro), sobre las
  columnas; la de voxeles es la fase 2.
- **El tick medio**: ~0,75 → ~1,0 ms (los escalones de las partes de los
  animales, ahora por columnas). Muy por debajo de los 8.
- **La CI fallo una vez en `slash`, y no por los voxeles.** El paseo acabo en
  un pinar, y alli la vista normal da 12-16 pixeles en la mayoria de rumbos,
  tambien con el build de `main`. Ahora esa vista se queda con el mejor de
  cuatro rumbos (`docs/efectos.md`), con una mutacion que lo hace caer. Esa
  mutacion destapo otro agujero que ya estaba: la medida contaba tambien los
  impactos. Ahora `slash.mjs` abre con `?efectos=barrido` y solo ve el barrido.

## Auditoria al cerrar la fauna y los equipables (2026-10-04)

Desde `8396b7f` hasta `3415d31`: la primera tanda de fauna (que se cerro sin
auditar), la guia de arte y los equipables con sus iconos.

**Corregido:**
- **El humo `desktop` media el registro de PC con un plazo fijo de 400 ms** y
  cayo una vez en la CI de `main` (escape 23). Ahora espera hasta que la linea
  se mueva, con tope dentro de su vida, y una mutacion la ve caer.
- **`slash` fallo una vez con 16 pixeles en la vista normal** (suelo 20). La
  sospecha es un animal paseando por delante del barrido; **la causa no esta
  confirmada**. Ahora mide con `?fauna=0`, que quita solo el dibujo de los
  animales (escape 24). Si vuelve a caer, la causa era otra.
- **Dos cabeceras seguian contando a los animales como laminas**
  (`sprite-depth.ts`, `body-ray.ts`), aunque son de bloques desde `a1168a7`
  (escape 22). El escaner tiene una categoria nueva que lo habria visto.
- Un comentario CSS huerfano de la regla `.slot .hint`, que se quito con los
  iconos.
- El README no contaba los equipables ni las armas, y `stations.test.ts` y el
  humo seguian hablando de la ropa como antes.
- El campo `wornWear` de la sonda `__verdant`, que no leia nadie.

**Dejado a proposito:**
- Los 18 avisos de terminos retirados, todos en secciones de historia.
- `state.lastBroke`: el cliente no lo pinta (no hay avisos en pantalla), pero
  lo leen los tests, como `lastBlocked`.

**El alcance, dicho claro**: la fauna se audito con el escaner, buscando
restos de los modelos sustituidos y releyendo las cabeceras de lo que esos
modelos usaban. Sus comprobaciones ya se mutaron en sus rondas. Los
equipables, ademas, linea a linea.

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
