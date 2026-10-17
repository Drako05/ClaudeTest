# Lo que está por hacer, y el registro de lo aprendido

Este fichero existe porque las notas de trabajo del agente viven en un contenedor
efimero y **mueren con la sesion**. Lo que hay aqui son decisiones del autor y
deuda tecnica que ninguna sesion nueva podria reconstruir leyendo el codigo.

Lo permanente del *como* esta en `CLAUDE.md` y en los documentos de `docs/` que
indexa (desde el 2026-10-02, cada parte del juego en el suyo); las leyes del mundo, en
`docs/el-libro-del-mundo.md` y `docs/leyes.md`.

**Ultima auditoria: commit `2b3e3cc`, 2026-10-14** (la fisica al estilo
Minecraft y lo que vino antes, desde `7e2d790`). La proxima parte de aqui: ver
`.claude/skills/auditoria/` y «Auditoria al cerrar la fisica al estilo
Minecraft», mas abajo.

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

## TANDA EN CURSO: los iconos en pixelart (2026-10-17)

**El pedido del autor, literal**, con una imagen de referencia (iconos de
juego de unos 16-20 pixeles, contorno oscuro, 3-4 tonos, luz arriba a la
izquierda, sobre fondo oscuro):

> La siguiente tanda quiero que sea de iconos. vamos a generar svg para cada
> objeto disponible actualmente en el juego. quiero que tengan aspecto
> pixelart HD. te mande una imagen de referencia.

**Sus respuestas:**
- Rejilla de **24 × 24**.
- El icono **en vez del nombre** donde hoy se ve un objeto: la barra, la
  rejilla, las recetas y sus ingredientes, lo arrastrado y la zona de lo
  seleccionado. El nombre queda al pasar el raton y en la descripcion. Y en el
  aviso de lo recogido, **icono y texto**.
- Sus palabras: «Los iconos de items seran pixelart a color. los iconos de las
  casillas vacias del inventario y de los botones siguen siendo siluetas
  monocromaticas. pero en esta tanda incluye pasar los iconos de casillas
  vacias de inventario y los iconos de los botones a pixelart 24x24».
- Tambien los cuatro botones de caracter (», ↑, A y el 🌿 de bioma).
- **Revision**: primero una hoja con los 30, que aprueba o corrige; despues,
  al juego.

**El plan, por rondas**:
1. El formato, la paleta y los 30 objetos, y su hoja.
2. Las 14 siluetas de PERSONAJE y los iconos de boton (salieron 20), y su hoja.
3. La integracion en la interfaz, el humo, las mutaciones, la documentacion,
   la CI y `main`.

**Donde va cada cosa**:
- `client/src/pixel-art.ts`: el formato. Cada icono son 24 filas de 24
  caracteres; `.` es transparente.
- `client/src/item-icons.ts`: los 30 objetos y su paleta comun.
- La hoja: `?iconos=1` (`icon-sheet.ts`).
- El test: `tests/pixel-icons.test.ts`.

Las rejillas las saco de formas (elipses, poligonos, trazos), con el contorno
y la luz puestos solos, con un generador que vive en el contenedor y muere con
el. **Desde que estan en el repo, se retocan a mano, pixel a pixel.**

**Ronda 1 — HECHA y APROBADA (2026-10-17)**: los 30, en la hoja. El autor:
«Aprobados, adelante con la ronda 2».

**Ronda 2 — HECHA y APROBADA (2026-10-17)**: el autor, «Aprobados, adelante
con la ronda 3»: las 14 siluetas de
PERSONAJE y los 20 iconos de boton, en `client/src/silhouette-icons.ts`, en
la misma hoja. Son 20 porque el ojo son cuatro piezas que alterna el juego:
abierto, pupila, entornado y la mira de la primera persona.
- Los de PERSONAJE traducen a pixel los que el autor ya corrigio.
- Los cuatro de caracter son lectura mia, por confirmar: correr con dos
  galones, saltar con una flecha, el auto salto con una flecha que salta un
  bloque, y el bioma con una ramita.
- Duda mia, para el autor: las hombreras, a 24 pixeles, salen con aire de
  corona.

**Ronda 3 — HECHA (2026-10-17)**: al juego.
- **Las casillas** (`paint()` en `inventory-ui.ts`) ponen `itemIcon(item)` a
  48 px en vez del nombre; la cantidad y el desgaste, encima. Igual el
  resultado y los ingredientes de las recetas, lo arrastrado y la zona de lo
  seleccionado. PERSONAJE, al equipar, cambia la silueta por el icono.
- **El registro**: «+5 [icono] Madera»; la linea pasa de 15 a 26 px.
- **Los botones**: cada `<svg>` de `index.html` va vacio con `data-pixel` y se
  rellena al arrancar (`installButtonIcons`, 22 piezas); los cuatro de
  caracter tambien.
- **El humo** lo afirma en `desktop` (casillas, ingredientes, registro y que
  se rellenaron los 22), `mobile` (los ocho botones con su icono pintado) y
  `devTools` (la hoja, con sus 64). Siete mutaciones.
- **Docs**: la directriz 5 en `docs/guia-de-arte.md` y la 3 al dia;
  `recoleccion.md`, `controles.md`, cinco filas en `juicio.md` y los retirados.

---

## Auditoria al cerrar la fisica al estilo Minecraft (2026-10-14)

**El alcance**: de `7e2d790` a `2b3e3cc`, nueve commits: la camara sin
tirones (interpolar entre ticks, y el escalon suavizado que luego se retiro),
la puerta de la vista de cerca de `slash`, `mobile` con el reloj manual, la
fisica por fases (sustituida) y las cuatro fases de la fisica al estilo
Minecraft —caja cuadrada, escalon tick a tick, salto a medida, empujes y
modelos con las patas en el cuadrado—. La tanda, entera, en
`docs/historia.md`.

**Corregido:**
- **Una comprobacion del humo que no veia lo nuevo** (escape 28): la pasada
  `devTools` miraba las cajas del panel en el nacimiento, donde no hay ningun
  animal a 12 casillas, y daba por bueno «en cian solo el jugador». Quitar del
  panel la caja de los animales no la hacia caer. Ahora cuenta aparte los
  cuerpos y las partes de los animales (`boxesNear`) y se repite junto a un
  animal: mutada, cae por las dos vias.
- **Una doc suelta** (escape 29): `keepIn` quedo entre la doc de `stepFauna`
  y la funcion. Y para que no vuelva, `tools/a-pruebas.sh` pasa ahora el
  escaner entero y ensena sus avisos vivos antes de empujar.
- **Un numero viejo** (escape 30): la cabecera de `push.ts` daba la caja del
  bisonte de antes de la fase 4 (1,25; es 1,24). Las medidas viejas entran en
  `retirados.md`.
- **`massOf` solo la usaban los tests** (patron #26): `push.ts` repetia su
  formula a mano. Ahora la usa, y su mutacion cae.
- **Comentarios que decian que las partes de un animal chocan**
  (`fauna-body.ts`, tres sitios): desde la caja cuadrada solo se golpean; la
  cabecera de `movement.ts` cuenta ahora que entre cuerpos no hay choque sino
  empujes.
- **Historia sin su «*Luego*»**: tres secciones de `docs/historia.md` que
  cuentan modelos ya sustituidos (el reposo por partes, la camara con retraso,
  retroceder para girar).
- `docs/fauna.md`, el coste de los empujes en «Lo que cuesta».

**Ejecutado**: `npm run shots` y `tools/analyze-world.ts`, que la CI no
corre, funcionan; el escaner y su autoprueba; typecheck y 522 tests; las
pasadas `devTools` y `fauna`; tres mutaciones nuevas, las tres caen.

**Dejado a proposito**: las citas al reposo por partes y a su fichero en la
historia (en `ignorar.md`, con su ambito); y el README dice que el jugador mide «dos
bloques», cuando el sprite mide 1,93 y su caja 1,8: es una aproximacion de
antes de esta tanda.

## Pendiente del autor: las paredes de 2+ voxeles

**Las paredes de 2+ voxeles**, que el
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
