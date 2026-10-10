# Notas para agentes que trabajen en este repo

Lee tambien el README: explica la arquitectura y el porque de cada decision.
Esto es el resumen operativo.

## Arranque de una sesion nueva

**El contenedor es efimero y se reaprovisiona entre sesiones.** Puede tocarte
empezar con el repo literalmente vacio: sin ficheros, sin refs, solo un `.git`
con el remoto puesto. Paso antes de una tanda, asi que no es teorico y no es
sintoma de nada roto.

```bash
git fetch origin main
git checkout -B main FETCH_HEAD
npm install
```

El trabajo va a **`main`**, que es la rama por defecto. Hasta el 2026-09-23 el
proyecto vivio entero en una rama llamada
`claude/capabilities-workflow-confirmation-mgqdm5` —nombre de andamiaje de la
herramienta, y la unica que habia—, y el autor decidio mudarse. Si alguna
herramienta te propone esa rama como rama de trabajo, es un eco de aquello: el
trabajo va a `main`.

**Ojo con Pages**, que es donde se tropezo la mudanza: desde que ramas se puede
desplegar lo decide el entorno `github-pages` (Settings → Environments), con
una lista de ramas que se fija al configurar Pages y **no sigue a la rama por
defecto**. Si un `deploy` muere en un segundo sin ejecutar un paso, es eso.

Y el proxy git de la sesion deja empujar pero **no borrar ramas**: responde 403,
y un 403 del proxy no se reintenta ni se esquiva. Borrar una rama remota es
cosa del autor, desde la web.

Y por eso existe `docs/pendiente.md`: **las notas del agente mueren con la
sesion**, asi que lo que no este escrito en el repo se pierde. Leelo primero.

## Un solo cliente: el 3D

Decision del autor, 2026-09-26: **el juego isometrico se retiro del todo.** El
cliente es el 3D (`packages/client/src/`), y cada caracteristica se hace una
sola vez. Antes de borrarlo se traslado todo lo que era del juego y se comprobo
con la prueba de humo; la lista, lo que no se traslado y por que, y las reglas
de aquella camara estan en **`docs/isometrico.md`**. El codigo sigue en la
historia: `b1d0d7a` es el ultimo commit con el isometrico completo.

Las reglas 6, 7 y 16 a 20 eran de la camara isometrica y se mudaron alli
literales. Sus numeros se quedan vacios a proposito: el codigo cita «regla 21» o
«regla 22», y renumerar romperia esas referencias.

## Reglas duras

Aqui va el enunciado de cada una, con el numero que cita el codigo. **El texto
entero —el porque, las medidas y el fallo que motivo cada una— esta en
`docs/reglas.md`, y se lee antes de tocar lo que regula.**

1. **`packages/sim` jamas toca el navegador**: sin DOM, canvas, WebGL, three.js
   ni `Math.random`; corre igual en Node y en el navegador
   (`tests/purity.test.ts`).
2. **Toda aleatoriedad viene de una semilla explicita** (`mulberry32` o
   `hash2D`, de `sim/rng.ts`).
3. **La generacion del mundo es pura**: `generateChunk` no depende del orden en
   que se llame ni de estado previo.
4. **Las mutaciones van al overlay** de `World.setFeature`: lo que hay en un
   tile es `override ?? potencial`, la **unica fuente de verdad** para el
   dibujo, la colision y la recoleccion.
5. **El input produce `Intent`; nunca muta el estado.** La mirada viaja en ella
   y es la de la camara, tal cual; `moveX`/`moveY` son **direccion, no
   velocidad**.
6-7. *(Retiradas con el isometrico. Ver `docs/isometrico.md`.)*
8. **Paso de tiempo fijo** (`TICK_DT`); la interpolacion para el render es cosa
   del cliente.
9. **Lo unico que detiene el paso es el agua**; si algo tiene que estorbar, que
   sea una feature, no el terreno.
10. **El bioma es del tile, no del chunk** (`World.biomeAt`).
11. **Un paso de vida lee estado congelado y escribe en otro**
    (`ChunkRecord.live`), o se rompe la ley del observador.
12. **El golpe es un SECTOR PLANO que sale de los ojos y cuenta solo si toca
    un hitbox** (`sim/aim.ts`): 3 bloques y 90 grados, 33 rayos que el
    terreno corta. Cada objeto tiene una caja (`sim/boxes.ts`). Sembrar y
    colocar van donde la mirada toca el suelo o la pared (`aimSurface`).
13. **El relieve sale de la misma elevacion que el terreno, en voxeles de 0,5**:
    cada columna lleva su altura en medios bloques; el agua, el bioma, la vida y
    los objetos siguen por casilla de 1.
14. **La altura y los muros son dos mecanismos distintos** (cordilleras y
    salientes). Antes de tocar su calibracion se mide con
    `npx vite-node tools/analyze-world.ts` contra la **linea base solo-agua**:
    el presupuesto acordado es un punto.
15. *(Retirada con los voxeles: la rampa. Ver `docs/relieve.md`.)*
16-20. *(Retiradas con el isometrico. Ver `docs/isometrico.md`.)*
21. **La altura estorba, y estorba con UNA regla: no se entra donde el suelo
    esta por encima de los pies** (`STEP_UP` andando, ninguno volando). El
    terreno y los objetos que chocan se pisan con la huella entera
    (`squareFloor`); **solo subir es de golpe: bajar es caer** con la gravedad.
    Se anda con inercia (`INERTIA_TIME`, 0,1 s) y la cabeza choca (1,8).
22. **Donde se nace hay que ganarselo** (`findSpawn`): un rellano llano, del
    que se pueda salir, en terreno que sostenga vida.
23. **Cualquier medida de conectividad tiene que obedecer la fisica**: por
    columnas de 0,5, medio bloque andando y uno de un salto (`canClimbTo`).

## Regla de trabajo con el autor

**La interpretacion de las leyes es del autor, no del agente.** Antes de escribir
codigo que implemente o toque una ley del libro, hay que consultarle:

- como se interpreta la ley,
- que mecanicas internas la realizan,
- como fluye en el tiempo (ritmos, curvas, duraciones),
- con que otros sistemas interactua,
- y que valor toma cada parametro.

Esto surgio de un error real: en la primera tanda de vida vegetal el agente fijo
por su cuenta la forma de la curva de crecimiento, los tiempos de rebrote y que
la piedra fuera finita. Eran decisiones de diseno del autor, no de
implementacion, y varias no coincidian con lo que el tenia en mente.

Proponer interpretaciones es bienvenido; darlas por aprobadas no. Cuando una
decision se tome por deduccion (por ejemplo, derivar una tasa a partir de unos
tiempos que dio el autor), hay que decirlo explicitamente para que pueda
corregirla.

## El libro del mundo

`docs/el-libro-del-mundo.md` es un documento **del autor del proyecto**. No lo
edites nunca, ni para corregir erratas: contiene su texto literal.

Sus leyes se traducen a tests en `tests/world-laws.test.ts`, y el estado de cada
una se lleva en `docs/leyes.md`, que si mantiene el agente. Al implementar algo
que cumpla o acerque una ley, actualiza esa tabla en el mismo cambio.

Tres leyes condicionan el diseno entero —la del observador, la de que la vida
no surge sola y la de que no todo recurso vuelve—: **antes de tocar la
simulacion, lee como se cumplen en `docs/leyes.md`**, «Las tres que condicionan
el diseno».

## Como trabajar sin quemar la ventana de uso

Cada llamada a una herramienta reenvia la conversacion entera, asi que el coste
va como **contexto x numero de idas y vueltas**. Dos habitos que lo disparan y
que este proyecto ya se comio una vez:

- **Edita con la herramienta de edicion, no con `sed` ni heredocs de `python`.**
  Cuando un fichero cambia por fuera, el sistema lo vuelca **entero** en el
  contexto para que no trabajes sobre una copia vieja. En una tanda,
  `main.ts` del cliente se volco completo siete veces: decenas de miles de tokens
  en re-volcados que no aportaron nada.
- **Una captura por ronda, no cuatro.** Cada PNG son 1.200-1.800 tokens y se
  queda en contexto reenviandose el resto del turno. Mira la que decide; las
  demas, solo si la comparacion lo exige de verdad.

Y lo que no es cosa del agente: la sesion crece sin parar, asi que el corte
natural es **empezar sesion nueva al cerrar cada tanda**, y `/usage` desglosa a
donde se fue el gasto.

## Antes de dar algo por bueno

**Lo pesado se verifica en la CI, en la rama `pruebas`** (decision del autor,
2026-10-02), y **a `main` no se empuja para probar**: `deploy.yml` publica el
juego en cada push a `main` sin esperar a la CI. El detalle de cada paso —como
mirar la CI sin gastar, las mutaciones, la matriz, la auditoria— esta en
`docs/pruebas.md`, «El procedimiento, paso a paso»: **leelo antes de la primera
ronda de cada sesion.**

1. **En local**: `npm run typecheck && npm test` (~20 s) y **solo la pasada que
   se toca** (`npm run build && node tools/smoke.mjs <pasada>`).
2. **La ronda de mutaciones** en `tools/mutaciones.mjs`: cada comprobacion
   nueva, con lo que la rompe. Si no cae, no comprueba nada.
3. **`tools/a-pruebas.sh "que se prueba"`**, con `FIRMA` puesta a las lineas
   de atribucion de la sesion.
4. **Esperar las dos tandas en verde**: «CI completa» y «Mutaciones completas».
   Lo que falle se arregla y se vuelve al 3.
5. **Solo entonces**, commit y push a `main`. Esa CI **confirma, pero no se
   espera**: se avisa al autor y se mira **al empezar el siguiente turno**.

**Y al cerrar cada tanda, la auditoria** (`/auditoria`). **Lo que un cambio
retire —un valor, una tecla, un nombre— entra en
`.claude/skills/auditoria/references/retirados.md` en ese mismo cambio**
(escape 19).

## Donde esta cada cosa: leer antes de tocar

Este fichero se carga entero en cada turno, asi que lleva solo lo que vale para
cualquier tarea. Lo de cada parte del juego vive en `docs/`, con el mismo texto
que tuvo aqui hasta el 2026-10-02 (propuesta 3) y el 2026-10-10. **Antes de tocar una de estas
partes, lee su documento**: casi todo lo que cuenta es una decision del autor
con fecha, o la leccion de un fallo que ya paso.

| Si vas a tocar… | Lee |
|---|---|
| Una regla dura (el texto entero de todas), el golpe, sembrar, colocar, la altura que estorba, el nacimiento | `docs/reglas.md` |
| Teclas, raton y pausa, la pantalla del movil, la barra de PC, el ojo y las vistas, la camara, los gestos, MIRA/TAP, el auto salto | `docs/controles.md` |
| El inventario, herramientas, golpes, estaciones, ropa, el panel, el registro de objetos | `docs/recoleccion.md` |
| Barrido, estocada, escombros, esquirlas, o una medida de «se ve» | `docs/efectos.md` |
| Aspas, sombras, tamanos, arboles y sus especies | `docs/arte.md` |
| Las directrices de arte del autor (en progreso): como se diseña un modelo | `docs/guia-de-arte.md` |
| El relieve, el salto, el hambre | `docs/relieve.md` |
| Los animales: especies, puntos de vida, botin, su paseo y su dibujo | `docs/fauna.md` |
| El panel de desarrollo, las superposiciones, la reticula | `docs/devtools.md` |
| Una comprobacion del humo, de los gestos o del barrido, la matriz de la CI | `docs/pruebas.md` |
| Algo que viene del isometrico retirado (reglas 6, 7 y 16-20) | `docs/isometrico.md` |
| Una ley del libro | `docs/leyes.md` y `docs/el-libro-del-mundo.md` |

Y **`docs/pendiente.md` primero, siempre**: la tanda en curso, las decisiones
del autor que aun no son codigo y lo aparcado. Desde el 2026-10-10 lo demas va
aparte, para que leerlo primero no cueste 35.000 tokens:
**`docs/juicio.md`**, las deducciones que esperan el juicio del autor (se buscan
las filas de la parte que se toca; las nuevas se anaden alli), y
**`docs/historia.md`**, las tandas cerradas (se consulta, no se lee de corrido;
al cerrar una tanda, su seccion «HECHA» se mueve alli).

**Al cambiar algo, se actualiza el documento de su parte**, no `CLAUDE.md`,
salvo que cambie una regla dura, el procedimiento o este indice. Y si una parte
nueva no cabe en ninguno, se le abre el suyo y una fila aqui.

## Si tocas la generacion del mundo

Cambiar una escala de ruido invalida los umbrales de bioma, que estan calibrados
contra los percentiles reales de cada campo. Vuelve a medir:

```bash
npx vite-node tools/analyze-world.ts
```

y ajusta los umbrales en `packages/sim/src/worldgen.ts` a la distribucion nueva.
`tests/world-quality.test.ts` falla si algun bioma desaparece, si el jugador
queda encerrado o si el bosque se vuelve intransitable.

## Ciclos de importacion

`packages/shared/src/base.ts` y `packages/sim/src/coords.ts` existen solo para
romper ciclos: `index.ts` reexporta `ecology.ts`, y `world.ts` usa `biome.ts`.
Con el ciclo puesto los tests pasan igual, pero el bundle del navegador revienta
con «Cannot access X before initialization», que solo detecta `npm run smoke`.
Si anades un modulo que necesiten dos partes que ya se referencian, ponlo en su
propio fichero sin dependencias en vez de importarlo cruzado.

## Presupuesto de rendimiento

`tests/performance.test.ts` mide el coste medio de un tick. El limite acordado
son 8 ms; superarlo de forma sostenida es la senal para portar el modulo caliente
a Rust/WASM detras de la misma interfaz, no para empezar a optimizar a ciegas.
