# Lo que está por hacer, y el registro de lo aprendido

Este fichero existe porque las notas de trabajo del agente viven en un contenedor
efimero y **mueren con la sesion**. Lo que hay aqui son decisiones del autor y
deuda tecnica que ninguna sesion nueva podria reconstruir leyendo el codigo.

Lo permanente del *como* esta en `CLAUDE.md` y en los documentos de `docs/` que
indexa (desde el 2026-10-02, cada parte del juego en el suyo); las leyes del mundo, en
`docs/el-libro-del-mundo.md` y `docs/leyes.md`.

**Ultima auditoria: commit `ab51f9b`, 2026-10-17** (los iconos en pixelart,
desde `2b3e3cc`). La proxima parte de aqui: ver `.claude/skills/auditoria/` y
«Auditoria al cerrar los iconos en pixelart», mas abajo.

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

## TANDA EN CURSO: correcciones a los iconos (2026-10-17)

**El pedido del autor, literal** (con dos imagenes de ejemplo: una mochila con
solapa, hebilla y bolsillo, y una capa de frente con cuello alto):

> El icono de inventario quedó demasiado pegado al borde de su botón y no se
> ve bien. Ya que 24x24 sería muy pequeño, vamos a pasar todos los botones
> redondos a cuadrados (como el botón de bioma o información) y darles una
> pequeña iluminación y sombra para generar la ilusión de relieve que indique
> "soy un botón que puedes presionar". La ilusión de relieve no debe ir en el
> dibujo del icono, sino en el botón. Esto aplicara para todos los botones del
> juego.
>
> Me hicieron falta los iconos de las categorías de las recetas. Diseñalos
> como monocromaticos para que se entienda que son representaciones
> generales. Cómo esto son botones, su botón también va con la ilusión de
> relieve.
>
> Los iconos de las estaciones deben ser lo más parecido a sus bloques 3d. Lo
> mismo para todos los iconos de bloques que se puedan poner en el mundo de
> ahora en adelante.
>
> El icono de auto salto vuelve a que sea una "A" pero hecha en pixelart.
>
> En el icono del corazón de vida, haz que sean más uniformes las líneas
> horizontales que forman la punta inferior. Actualmente tienen como un bache.
>
> Los iconos de capa y mochila no me convencen. Te mandé unos ejemplos, pero
> recuerda que estos seran iconos, así que deben ir monocromaticos. Usa el
> mismo icono de mochila para el botón de inventario.
>
> Los colores del hierro y la piedra son muy similares, has la piedra un poco
> más oscura y el hierro un poco más claro (en todo, tanto en la mena como en
> los ítems y recetas).
>
> Las barras de durabilidad no se mostraran cuando el arma o herramienta este
> a su máxima durabilidad (nueva o con futuras expansiones de reparación).
>
> Agrega unos pequeños botones de + y - para cambiar la cantidad de veces que
> se ejecuta una receta. Los puedes poner uno sobre el otro al lado derecho de
> los ingredientes de la receta (alineando nuevamente toda la fila hacia el
> centro del hud). Cada receta tendrá estos botones, pero solo estarán
> habilitados en aquellas recetas de ítems apilables (las herramientas, armas
> y equipables no son apilables).

**Sus respuestas a las preguntas:**
- Fabricar N: «Salen las N de golpe con un solo mantener. Además, baja el
  tiempo de mantener a 1s.»
- La N sube hasta lo que alcanzan los ingredientes y el sitio, y se ve en el
  resultado (lo que sale en total); los ingredientes, tengo/necesito para N.
- «Todos los botones»: todo lo pulsable salvo las casillas. Los anillos de
  hambre y salud se quedan redondos.
- El objeto *Mochila de armazon* (a color) no cambia; solo las siluetas de
  Capa y Bolso y el boton INVENTARIO.
- Piedra e hierro: en los iconos **y en el mundo 3D**.
- Las estaciones: el bloque en 3/4, isometrico, como el inventario de
  Minecraft.
- Antes, sobre los ingredientes del movil (el icono de 48 en una casilla que
  ensena 44): «mientras se mantenga así entonces no hay necesidad de tocar las
  proporciones en los hud de recetas».

**El plan, por rondas** (cada una se ensena antes de seguir):
1. Los dibujos, en la hoja `?iconos=1`.
2. El aspecto de los botones, en capturas de PC y movil.
3. El resto al juego —fabricar N, el mantener a 1 s, la durabilidad, las
   categorias con icono, los colores 3D—, el humo, las mutaciones, la CI y
   `main`.

**Ronda 1 — HECHA, esperando al autor (2026-10-17):**
- Las 6 categorias, en `silhouette-icons.ts` (`CATEGORY_ROWS`, por el nombre
  de la categoria en `RECIPES`): el pico y el hacha, la mesa de lado, el
  crisol con la llama, la tunica, el muslo y la espada. Son diseños mios.
- La mesa y el horno, en 3/4, sacados de las **mismas texturas** que pinta
  `stations-view.ts`, con sus colores y la luz de cada cara (tapa 100 %,
  frente 95 %, costado 74 %), y su contorno. Los saca un generador del
  contenedor; desde que estan en el repo se retocan a mano.
- La «A», el corazon con la punta en escalones iguales, y la capa y la
  mochila nuevas. INVENTARIO usa la rejilla del hueco Bolso.
- Piedra mas oscura e hierro mas claro, en la paleta de los iconos (y la veta
  de hierro) y en el mundo: `ROCK_FACES`, `MINERAL_FACES[IronNode]` y, por
  ser de piedra, el horno (`STATION_FACES`; esto ultimo es *deduccion*).
- **El autor aprobo el resto y corrigio tres** (2026-10-17):
  - el icono de la mesa se veia mas oscuro que su bloque. **Medido**: three.js
    trata la textura del lienzo como lineal y la pasa a sRGB al pintarla, asi
    que en pantalla `#8a5a30` es `#c2a078` (lo mismo el horno). El generador
    aplica esa conversion; los colores de las estaciones en `ITEM_PALETTE`
    son ahora los que se miden en pantalla. **Cualquier icono futuro de un
    bloque tiene que pasar por ella**;
  - la capa, mas sencilla, como su segundo ejemplo (sin la cruz: va
    monocroma);
  - Herramientas: el pico y el hacha de los objetos, adaptados y cruzados como
    su referencia.
- **Aprobada** («Aprobados, adelante con la ronda 2»).

**Ronda 2 — HECHA, esperando al autor (2026-10-17)**: una sola regla al final
del CSS (`index.html`, «Todos los botones, cuadrados y con relieve») para todo
lo pulsable salvo casillas y anillos.
- Esquinas de 12 px (20 en ATAQUE, 14 en USAR, CORRER y SALTAR, 8 en AUTO
  SALTO).
- Relieve con `box-shadow`, *deduccion*: luz por dentro arriba a la
  izquierda, sombra abajo a la derecha y una sombra dura debajo. Pulsado,
  encendido o abierto, se hunde.
- Con esquinas, MODO y ENTRADA se pisaban (−7 px) y MODO tocaba USAR. El arco
  mas corto que deja 4 px libres con todo, a la misma distancia del ataque,
  es de **102** (era 84), con MODO a **155,5 grados** (era 153) y ENTRADA en
  sus 117. Propuesta al autor.
- **Aprobada** («Todo va bien. Continúa»).

**Ronda 3 — HECHA (2026-10-17)**:
- **Fabricar N**: `tryCraft(..., times)` todo o nada y `craftableTimes` en
  `sim/systems/gathering.ts`, `Intent.craftTimes`, y + y - en cada receta
  (`inventory-ui.ts`), apagados en lo que no se apila y en su tope. El
  resultado dice el total y los ingredientes, tengo/necesito para las N.
  Tests en `tests/craft-times.test.ts`.
- **Mantener 1 s** (`CRAFT_HOLD_MS`).
- **La barra de desgaste** no se pinta con la herramienta entera.
- **Las categorias**, con su icono; su nombre va en `data-category`, `title`
  y `aria-label`.
- **El humo**: en `stations` el + se para en lo que alcanza y un mantener
  hace 5 lingotes (el mantener de esa pasada es de 1,2 s, para distinguir 1 de
  1,5), y las herramientas tienen + y - apagados y sin barra; en `desktop` y
  `mobile`, los botones cuadrados y con relieve; en `mobile`, la holgura entre
  mandos se mide de caja a caja. Nueve mutaciones.

## Auditoria al cerrar los iconos en pixelart (2026-10-17)

**El alcance**: de `2b3e3cc` a `ab51f9b`: la auditoria anterior y las tres
rondas de los iconos —el formato y los 30 objetos, las siluetas de PERSONAJE
y de los botones, y su llegada al juego—. La tanda, entera, en
`docs/historia.md`.

**Corregido:**
- **El ojo de la primera persona salia fuera de la rejilla** (escape 31): el
  CSS seguia encogiendo la pupila con `scale(.55)`, pensado para el vector, y
  en pixelart pintaba pixeles mas pequenos que los del resto. Es la vista de
  arranque. Ahora la mira lleva su propia pupila de 2 × 2, dibujada en la
  rejilla, y la grande se oculta; el humo lo mira y su mutacion cae.
- **Una comprobacion del humo que corria contra el reloj** (patron 13): la
  del icono del registro leia las lineas en otra ida y vuelta, y cada una
  vive 3 s. Ahora la mira el observador que ve nacer la linea.
- **Filas de `docs/juicio.md` sobre lo que ya no existe** (escape 32): dos
  median los dibujos de trazo retirados (los cubiertos y los iconos de los
  botones), dos los citaban, y una hablaba de los huecos «Espalda» y
  «Cintura», que no existen desde el 2026-10-04.
- **USAR mide 32 px** y la documentacion de los tamanos no lo decia.
- **CSS muerto**: el `font-size: 9px` de la barra del movil era del nombre.
- Comentarios: el del ojo en `index.html` (eran dos formas y la clase
  `.flat`; son cuatro piezas), y las cabeceras de los iconos dicen ahora que
  el autor aprobo los dibujos.

**Ejecutado**: el escaner y su autoprueba; `npm run shots` y
`tools/analyze-world.ts`, que funcionan; typecheck y 531 tests; la pasada
`desktop`; el ojo, capturado ampliado antes y despues; dos mutaciones nuevas.

**Dejado para el autor**: USAR (32 px), INVENTARIO (36) y AUTO SALTO (18) no
eran multiplos de 24, y sus pixeles salian desiguales; lo mismo los iconos que
encogian con una casilla pequena. **Lo decidio el mismo dia**: «Puedes ajustar
solo el icono y dejar las casillas/botones del tamaño actual?». Hecho: todos a
24 o 48 (tambien los anillos del movil, a 36, que cazo la comprobacion nueva
del humo), y las casillas pasan a 24 donde no cabe el de 48.

---

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
3. **Los iconos son siluetas de aventurero medieval** (2026-10-04); desde el
   2026-10-17, en pixelart de 24 × 24 y aplicada tambien a los botones.
4. **Las patas caben en el cuadrado de la caja** (2026-10-14), aplicada.
5. **Los iconos son pixelart HD de 24 × 24; los objetos, a color**
   (2026-10-17), aplicada a los 30 objetos, los 14 huecos y los botones.

Lo que espera tu juicio:

- **Las reglas que saque de tu referencia para la 5** (contorno de 1 pixel,
  luz arriba a la izquierda, 3-4 tonos por material, una paleta comun):
  aprobaste los dibujos, pero no las reglas escritas.

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
