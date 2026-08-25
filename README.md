# Verdant

Prototipo de sandbox de supervivencia con mundo procedural infinito, pensado
para crecer hacia multijugador online y, mas adelante, una version nativa.

**Jugar: https://drako05.github.io/ClaudeTest/**

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

| Tecla | Accion |
|---|---|
| `WASD` / flechas | Moverse |
| `Espacio` | Recolectar el tile marcado |
| `E` | Comer bayas |
| `R` | Mundo nuevo |
| `+` / `-` | Zoom |

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
