# Lo que esta por hacer

Este fichero existe porque las notas de trabajo del agente viven en un contenedor
efimero y **mueren con la sesion**. Lo que hay aqui son decisiones del autor y
deuda tecnica que ninguna sesion nueva podria reconstruir leyendo el codigo.

Lo permanente del *como* esta en `CLAUDE.md`; las leyes del mundo, en
`docs/el-libro-del-mundo.md` y `docs/leyes.md`. Esto es el *que falta*.

---

## Decision tomada: el juego pasa a 3D con estetica de sprites

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
- **El mundo es empinado.** Con la altura estorbando se nota mucho mas que
  viendola: hay direcciones que topan a media casilla constantemente. Si quieres
  laderas mas suaves, eso es mover la calibracion del relieve, que es tuya
  (regla 14).
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
