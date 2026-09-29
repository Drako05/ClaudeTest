# Verdant

Prototipo de sandbox de supervivencia con mundo procedural infinito, pensado
para crecer hacia multijugador online y, mas adelante, una version nativa.

**Jugar: https://drako05.github.io/ClaudeTest/**

Un mundo con relieve y camara libre en 3D. Arranca **en perspectiva**, que es la
vista que eligio el autor; el ojo de la esquina superior derecha recorre
perspectiva, isometrica —que lo aplana todo— y primera persona. La antigua
direccion `/3d/` redirige aqui.

El nombre es provisional.

## Arrancar

```bash
npm install
npm run dev      # servidor de desarrollo
```

Otros comandos:

```bash
npm test          # tests del nucleo y del cliente (Node, sin navegador)
npm run typecheck
npm run build     # build estatico: un unico index.html autocontenido
npm run smoke     # construye y juega el build en Chromium headless
npm run shots     # capturas y proporciones medidas en bloques
npm run slash     # cuenta los pixeles que el barrido llega a pintar
npm run gestures  # los gestos tactiles, medidos en un navegador de verdad
npm run build:pages               # el sitio tal como se publica
npx vite-node tools/analyze-world.ts   # estadisticas del mundo generado
```

La URL admite `?seed=12345` para fijar el mundo (sin ella se elige uno al
azar), `?t=` para abrirlo a una hora concreta en ticks, `?x=&y=` para aparecer
en un sitio, y `?dev=1` para abrir el panel de desarrollo.

`npm run smoke` tambien puede verificar un despliegue ya publicado:

```bash
VERDANT_URL=https://drako05.github.io/ClaudeTest npm run smoke
```

## Controles

**Teclado y raton**

| Tecla | Accion |
|---|---|
| `WASD` / flechas | Moverse, relativo a la camara |
| Clic en la pantalla | Capturar el cursor y jugar (el juego arranca en pausa) |
| Raton | Mirar: la vista va con el cursor, tambien arriba y abajo (en tercera persona se puede mirar al cielo) |
| `Esc` | Soltar el cursor y **pausar**; con el cursor suelto se pulsan los botones. Con el inventario abierto, lo cierra sin pausar |
| Rueda | Recorrer la barra de la mano |
| `+` / `-` | Zoom; en primera persona, catalejo que vuelve al dejar de pulsar |
| Clic izquierdo | Golpear hacia donde mira la camara, con lo que se lleve en la mano |
| Clic derecho | Usar lo de la mano: una baya se come, una semilla se siembra donde mira la camara |
| `Espacio` | Saltar |
| `Shift` | Correr: interruptor, se queda encendido |
| `E` | Inventario y recetas (no pausa): arrastrar mueve o apila, soltar fuera tira (pide confirmacion), mantener 1,5 s una receta la fabrica |
| `1`-`4` | Elegir la casilla de la barra: lo que se lleva en la mano |
| `R` | Mundo nuevo |
| `P` | Vista: perspectiva → isometrica → primera persona |
| Raton sobre el ojo (en pausa) | En primera persona, barra del angulo de vision (70-120°); cualquier accion la cierra |
| `F3` | Panel de desarrollo |

**Tactil** (aparece solo en dispositivos de puntero grueso, o al primer toque)

| Gesto | Accion |
|---|---|
| Pulgar en el cuadrante inferior izquierdo | Joystick flotante: apunta, no dosifica |
| Un dedo en el resto de la pantalla | Girar la camara |
| Dos dedos de camara | Zoom; en primera persona, catalejo que vuelve al soltar |
| Boton ATAQUE | Golpear; mantener repite 4 veces por segundo, y arrastrar ese mismo dedo gira la camara sin soltar el golpe |
| Boton USAR | Usar lo de la mano: comer una baya, sembrar una semilla |
| Botones SALTAR y CORRER | Saltar; correr es un interruptor |
| Barra de arriba | Tocar una casilla la pone en la mano; arrastrar las ordena |
| Boton INVENTARIO | Inventario, con pestanas Personaje, Inventario y Recetas; como en PC, arrastrar y mantener |
| Boton OTROS | Cambiar de vista (el ojo), el HUD y el panel del entorno |
| Sostener el ojo mas de 0,5 s | En primera persona, barra del angulo de vision; tocar fuera la cierra |

**La mirada es una sola** en las tres vistas: el centro de la pantalla es hacia
donde mira el jugador. Se golpea con un sector plano de 2,5 bloques y 90 grados
que sale de sus ojos y solo cuenta si toca un objeto —de un arbol, su tronco—;
el terreno lo tapa. Se siembra donde la mirada toca el suelo. Una cruz en el
centro de la pantalla marca ese punto. La camara no atraviesa bloques ni
troncos.

**Recolectar y fabricar.** Se nace sin nada. A mano se cogen guijarros
(piedra), fibra y bayas de los arbustos, y ramas de los arboles, que no caen
sin hacha. Con eso se fabrican el hacha y el pico de piedra, que talan arboles
y sacan piedra, carbon y cobre golpe a golpe; el hierro pide un pico mejor. Las
herramientas se gastan y se rompen, y el inventario son dieciseis casillas con
pilas de cien. Al golpear algo que no se rompe saltan esquirlas pequenas, y lo
que entra o sale del inventario se anota en letra pequena («+5 Madera»).

**En los dos:** la salud (corazon) y el hambre (muslo) van siempre abajo. En
PC, de borde a borde, con el **HUD** (hora, dia, semilla, posicion, FPS) arriba
a la izquierda y el **panel del entorno** (la hoja) bajo el ojo; en el movil,
esos dos y el ojo viven en OTROS. Los paneles arrancan cerrados.

En el movil, el ATAQUE es el boton mas grande, en la esquina de abajo a la
derecha, con USAR a su izquierda y CORRER y SALTAR encima: la distribucion del
boceto del autor. En PC esos botones no se ven: el teclado y el raton ya hacen
lo mismo.

El joystick **apunta, no dosifica**: cruzada la zona muerta se anda a velocidad
de marcha entera, se haya desplazado el pulgar poco o mucho. La velocidad la
elige el interruptor de correr. La zona muerta se queda, para que el dedo
simplemente apoyado no haga derivar al personaje.

## Estructura

```
packages/shared   Vocabulario comun: tiles, features, recursos, Intent
packages/sim      Nucleo de simulacion. Puro, determinista, sin navegador
packages/client   Cliente 3D (three.js): escena, controles y HUD. Lo unico que toca el DOM
tools             Utilidades de analisis y verificacion
tests             Tests del nucleo y de las partes puras del cliente
```

## La regla que sostiene el proyecto

**`packages/sim` no puede depender del navegador.** Ni DOM, ni canvas, ni WebGL,
ni three.js, ni `Math.random`.

No es purismo. Es lo que hace posible, sin reescribir el juego:

- **Servidor autoritativo**: el servidor importa exactamente el mismo modulo de
  simulacion que el cliente. Sin esto no hay multijugador sin trampas.
- **Version nativa**: cambiar el renderizador y conservar el juego entero.
- **Tests de verdad**: la simulacion se verifica headless en Node, en
  milisegundos y sin GPU.

Hay un test (`tests/purity.test.ts`) que escanea el nucleo y falla si alguien
rompe la regla.

La segunda mitad de esa regla es el **determinismo**: toda aleatoriedad nace de
una semilla explicita y la simulacion avanza en pasos de tiempo fijos. La misma
semilla produce siempre el mismo mundo. De eso dependen la prediccion en cliente
del futuro multijugador, la reproducibilidad de los bugs y los tests.

## Decisiones tomadas y por que

**Un solo cliente, en 3D.** El juego nacio isometrico; el 2026-09-12 el
desarrollo paso al 3D y el 2026-09-26 el isometrico se retiro, despues de
trasladar al 3D todo lo que era del juego y comprobarlo en la prueba de humo.
Que se pudiera hacer sin tocar una linea de `packages/sim` es justo lo que
justifica la arquitectura. El porque, lo que se traslado y las reglas de aquella
camara estan en `docs/isometrico.md`.

**TypeScript en vez de Rust/WASM, por ahora.** Un nucleo en WASM seria mas rapido,
pero multiplicaria el coste de iterar justo en la fase donde lo unico que importa
es averiguar si el juego es divertido. El criterio para portar esta fijado de
antemano: si el tick supera ~8 ms con la carga objetivo, se porta el modulo
caliente detras de la misma interfaz. `tests/performance.test.ts` vigila ese
numero (linea base actual: unas 3 milesimas de milisegundo).

**La camara no toco la simulacion.** El mundo es una rejilla cuadrada con
alturas; el cliente la malla y la mira. Ni una regla, colision o test del nucleo
cambio al pasar de cenital a isometrica, ni de isometrica a 3D.

**Los elementos del mundo son aspas de dos laminas**, no sprites que giran con
la camara: asi el bosque tiene lados. El jugador si es un sprite que mira a la
camara, por decision del autor. El detalle esta en `CLAUDE.md`.

**El input tactil no rompe la frontera del nucleo.** El joystick y los botones
son una segunda fuente que produce la misma `Intent` que el teclado; el nucleo
no se entera de que existe una pantalla tactil. El vector de la `Intent` es
**direccion pura** y la velocidad la elige su campo `run`, asi que teclado y
joystick producen exactamente lo mismo: uno con teclas, el otro con un pulgar.

**Una malla por chunk, no por tile.** El terreno de cada chunk es una sola
geometria con color por vertice, y las sombras de sus elementos van en otra
malla por chunk, apoyada casilla a casilla en el suelo: el coste va por chunk,
no por casilla.

**Las mutaciones viven fuera del chunk.** Un chunk puede descartarse y
regenerarse en cualquier momento, asi que lo que el jugador cambia se guarda en
un overlay aparte. Ese overlay es, ademas, exactamente lo que habria que
sincronizar por red.

**Los umbrales de bioma salen de medir, no de estimar.** Una version inicial tenia
el umbral de nieve por debajo del minimo real del campo de temperatura: la nieve
no existia en el mundo, y ningun test lo detectaba porque el codigo era
correcto. `tools/analyze-world.ts` mide los percentiles reales y
`tests/world-quality.test.ts` impide que la regresion vuelva.

## Estado y siguientes pasos

El Milestone 1 esta hecho y desbordado: mundo infinito por chunks con ocho
biomas, movimiento con colision, recoleccion, hambre y salud, ecologia que avanza
mire alguien o no, y herramientas de desarrollo para poder comprobarla sin
esperar horas reales.

Encima de eso, lo que vino despues:

- **El mundo tiene altura, y estorba.** Hasta 41 niveles, laderas escalonadas,
  mesetas y acantilados; y desde la fase 2 hay gravedad, salto y caida, asi que
  ya no se cambia de nivel andando.
- **Camara libre en 3D**, con los elementos como aspas de dos laminas,
  proporciones al estilo Minecraft —el jugador dos bloques, y cada arbol
  con la forma de una especie real y un tronco de al menos 2 para ver por
  debajo de la copa—, dia y noche, y los efectos reutilizando la fisica que ya
  existia. La camara choca con el terreno y los troncos.
- **Recolectar y fabricar**: de las manos a las herramientas de piedra, con
  inventario por casillas (tanda 1; la 2 —mesa, horno, metales y ropa— espera).

**Antes del multijugador quedan cabos de la camara nueva:** los sprites de
varias direcciones para el personaje y agrupar las aspas para bajar las draw
calls. Los cabos sueltos y las decisiones que esperan al autor estan en
`docs/pendiente.md`.

Despues, y en este orden:

- **M2 — Multijugador**: `packages/server` en Node importando `packages/sim`,
  servidor autoritativo, protocolo binario sobre WebSocket, prediccion en cliente
  y reconciliacion, snapshots delta y gestion de area de interes. Modelo de
  partidas pequenas, no mundo persistente masivo: el coste de servidor es el
  verdadero limite comercial de este genero.
- **M3 — Mundo vivo**: simulacion por niveles de detalle (los chunks cercanos
  entidad por entidad, los lejanos de forma estadistica agregada), fauna y clima
  (el ciclo dia/noche ya existe).
- **M4 — Comercial**: persistencia, contenido, pulido y empaquetado nativo.
