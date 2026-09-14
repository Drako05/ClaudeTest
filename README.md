# Verdant

Prototipo de sandbox de supervivencia con mundo procedural infinito, pensado
para crecer hacia multijugador online y, mas adelante, una version nativa.

**Jugar: https://drako05.github.io/ClaudeTest/**

**El 3D: https://drako05.github.io/ClaudeTest/3d/** — el mismo mundo, la misma
semilla y la misma simulacion, con camara libre en vez de isometrica. Es hacia
donde va el proyecto (`docs/pendiente.md`); el isometrico de la raiz sigue siendo
el juego completo mientras dure la migracion. Arranca **en perspectiva**, que es
la vista que eligio el autor para el juego final.

En el movil, el pulgar en el cuadrante inferior izquierdo anda, el resto de la
pantalla gira la camara, y dos dedos de camara hacen zoom. Abajo a la derecha
estan correr, saltar y **accion** —la mas grande y la mas pegada al borde, que es
donde cae el pulgar—.

**Esos tres botones no se ven en PC**, donde solo estorban: Espacio salta, Shift
enciende y apaga la carrera, y el **clic izquierdo acciona** siempre que no
arrastre, porque arrastrar es girar la camara. Aparecen al detectar un puntero
grueso o al primer toque, igual que en el isometrico.

El que si se ve siempre es el **ojo de la esquina superior derecha**, que cambia
entre perspectiva y ortografica: es el unico control sin tecla anunciada en
ninguna parte. Abierto es perspectiva y entrecerrado ortografica, que es la que
lo aplana todo.

El nombre es provisional.

## Arrancar

```bash
npm install
npm run dev      # servidor de desarrollo
```

Otros comandos:

```bash
npm test         # tests del nucleo (Node, sin navegador)
npm run typecheck
npm run build    # build estatico del cliente
npm run smoke    # construye y juega el build en Chromium headless
npm run artifact # build de un solo fichero autocontenido
npx vite-node tools/analyze-world.ts   # estadisticas del mundo generado
```

La semilla se puede fijar por URL: `?seed=12345`. Sin ella se elige una al azar.

`npm run smoke` tambien puede verificar un despliegue ya publicado en vez del
build local:

```bash
VERDANT_URL=https://drako05.github.io/ClaudeTest npm run smoke
```

## Controles

**Teclado**

| Tecla | Accion |
|---|---|
| `WASD` / flechas | Moverse (a marcha) |
| `Shift` | Correr: interruptor, se queda encendido |
| `Espacio` | Saltar |
| Clic derecho | Recolectar las casillas marcadas (mantener repite) |
| `E` | Comer bayas |
| `R` | Mundo nuevo |
| `+` / `-` | Zoom |

**Tactil** (aparece solo en dispositivos de puntero grueso, o al primer toque)

| Gesto | Accion |
|---|---|
| Apoyar y arrastrar en la mitad izquierda | Joystick flotante: apunta, no dosifica |
| Boton RECOGER | Recolectar; mantener repite 4 veces por segundo |
| Boton SALTAR | Saltar; no encadena si se mantiene |
| Boton CORRER | Correr: interruptor, se queda encendido |
| Boton COMER | Comer bayas |
| Pellizcar con dos dedos | Zoom |

El joystick solo nace en la **mitad izquierda**: la derecha queda libre para los
botones y para el pellizco. Si apoyas un segundo dedo sobre el mundo, el
pellizco tiene prioridad y le quita el control al joystick; sin esa cesion el
zoom seria inalcanzable, porque el primer dedo se queda siempre con el joystick.

El joystick **apunta, no dosifica**: cruzada la zona muerta se anda a velocidad
de marcha entera, se haya desplazado el pulgar poco o mucho. La velocidad la
elige el interruptor de correr. Lo fue hasta la tanda de la carrera —la
velocidad era proporcional al desplazamiento— y lo cambio el autor. La zona
muerta se queda, para que el dedo simplemente apoyado no haga derivar al
personaje.

## Estructura

```
packages/shared   Vocabulario comun: tiles, features, recursos, Intent
packages/sim      Nucleo de simulacion. Puro, determinista, sin navegador
packages/client    Renderizado, input y HUD. Lo unico que toca el DOM
tools             Utilidades de analisis y verificacion
tests             Tests del nucleo
```

## La regla que sostiene el proyecto

**`packages/sim` no puede depender del navegador.** Ni DOM, ni canvas, ni WebGL,
ni PixiJS, ni `Math.random`.

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

**TypeScript en vez de Rust/WASM, por ahora.** Un nucleo en WASM seria mas rapido,
pero multiplicaria el coste de iterar justo en la fase donde lo unico que importa
es averiguar si el juego es divertido. El criterio para portar esta fijado de
antemano: si el tick supera ~8 ms con la carga objetivo, se porta el modulo
caliente detras de la misma interfaz. `tests/performance.test.ts` vigila ese
numero (linea base actual: unas 3 milesimas de milisegundo).

**La vista es isometrica, y eso no toco la simulacion.** El mundo sigue siendo
una rejilla cuadrada; solo cambia como se proyecta a pantalla
(`packages/client/src/projection.ts`). Ni una regla, colision o test del nucleo
cambio al pasar de cenital a isometrica: esa es exactamente la separacion que
justifica toda la arquitectura.

Dos consecuencias que si son del render y no se pueden esquivar:

- **Las features no se hornean en la textura del chunk.** Arboles, rocas y
  personaje van en una capa ordenada por profundidad (`depthOf = wx + wy`), para
  que el jugador pueda pasar por detras de un arbol. Horneadas en el suelo no
  podrian ordenarse contra el personaje.
- **Lo que tapa al jugador se vuelve translucido.** En isometrica un arbol una
  casilla por delante oculta al personaje por completo. Se atenuan solo las
  casillas que geometricamente pueden taparlo, no todas.

**El input tactil no rompe la frontera del nucleo.** El joystick y los botones
son una segunda fuente que produce la misma `Intent` que el teclado; el nucleo
no se entera de que existe una pantalla tactil. El vector de la `Intent` es
**direccion pura** y la velocidad la elige su campo `run`, asi que teclado y
joystick producen exactamente lo mismo: uno con teclas, el otro con un pulgar.

**Un sprite por chunk, no por tile.** Cada chunk se pinta una vez en un canvas 2D
y se sube como una textura, y solo se repinta si cambia. Dibujar el terreno
cuesta unas decenas de sprites por frame en vez de decenas de miles.

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

Esto es el Milestone 1: mundo infinito por chunks con ocho biomas, movimiento con
colision, recoleccion y un bucle basico de hambre y salud.

- **M2 — Multijugador**: `packages/server` en Node importando `packages/sim`,
  servidor autoritativo, protocolo binario sobre WebSocket, prediccion en cliente
  y reconciliacion, snapshots delta y gestion de area de interes. Modelo de
  partidas pequenas, no mundo persistente masivo: el coste de servidor es el
  verdadero limite comercial de este genero.
- **M3 — Mundo vivo**: simulacion por niveles de detalle (los chunks cercanos
  entidad por entidad, los lejanos de forma estadistica agregada), fauna, clima y
  ciclo dia/noche.
- **M4 — Comercial**: persistencia, contenido, pulido y empaquetado nativo.
