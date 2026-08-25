# Estado de las leyes

Anexo de [`el-libro-del-mundo.md`](./el-libro-del-mundo.md). **El libro es del
autor y no se toca; este documento lo mantiene el agente.**

Cada ley del libro se enlaza aqui con el codigo que la implementa y el test que
la hace cumplir. Una ley que nadie comprueba es solo una intencion, asi que el
objetivo es que toda ley marcada como cumplida tenga una prueba que falle si el
codigo deja de respetarla.

| Estado | Significado |
|---|---|
| **Cumplida** | Implementada y con un test que la defiende |
| **Parcial** | Implementada solo en parte; se indica que falta |
| **Pendiente** | Aun no existe en el codigo |

Los tests de las leyes viven en [`tests/world-laws.test.ts`](../tests/world-laws.test.ts).

---

## Capitulo I: El mundo

| Ley | Estado | Donde vive | Prueba |
|---|---|---|---|
| El mundo existe independientemente de cualquier observador | **Cumplida** | `sim/life.ts` — todos los chunks perturbados avanzan a la vez en pasos globales fijos, este cargado lo que este | «la vegetacion evoluciona igual se observe o no», «alejarse y volver no altera lo que ocurrio mientras tanto» |
| Impone sus reglas absolutas de forma igualitaria con todos | **Parcial** | `sim/worldgen.ts` no favorece ninguna posicion; el spawn solo busca terreno transitable | — falta cuando haya mas entidades a las que tratar por igual |
| Todos los sistemas relacionados bajo causalidad rastreable | **Pendiente** | — | — no hay registro de causas; hoy no se podria rastrear por que paso algo |
| Las consecuencias dependen del estado del mundo y de las relaciones | **Parcial** | `sim/systems/gathering.ts` — recolectar hunde la vegetacion de la zona, no solo el tile | «talar hunde la vegetacion de la zona, no solo el tile» |
| Los jugadores no son necesarios para el desarrollo de sucesos | **Cumplida** | `sim/life.ts` — la vegetacion evoluciona sin que nadie la mire | «la vegetacion evoluciona igual se observe o no» |
| Existen el pasar del tiempo y las leyes fisicas fundamentales | **Parcial** | `sim/clock.ts` — tiempo, ciclo dia/noche | «el ciclo del dia es periodico», «el dia recorre sus cuatro fases» — de fisica solo hay colision |
| El mundo es abierto para todos | **Cumplida** | `sim/world.ts` — infinito en las cuatro direcciones, sin barreras | «las coordenadas negativas de chunk funcionan» |
| Toda existencia es justificada por un sistema | **Parcial** | Las plantas existen solo donde el bioma y la vegetacion las sostienen | «un chunk sin vida y rodeado de vacio no genera vida por si solo» |
| El entorno cambia por acontecimientos naturales o de las entidades | **Parcial** | Naturales (crecimiento vegetal) y por entidades (recoleccion) | «un arbusto recolectado vuelve a crecer con el tiempo» |

## Capitulo II: Los recursos

| Ley | Estado | Donde vive | Prueba |
|---|---|---|---|
| Pueden ser finitos, consumibles y renovables | **Cumplida** | `shared/regrowTicksOf` — la piedra es finita, madera y bayas se renuevan | «un arbusto recolectado vuelve a crecer», «la piedra es finita y no vuelve nunca» |
| Todo recurso tiene origen, transformacion y destino | **Parcial** | Origen (worldgen) y destino (inventario) existen | — falta la transformacion: no hay procesado ni crafteo |
| Los mas basicos se generan con el terreno | **Cumplida** | `sim/worldgen.ts` — `featureAt` decide segun el bioma | tests de `world-quality` |
| Deben ser recolectados para usarlos | **Cumplida** | `sim/systems/gathering.ts` | «recolectar un arbol da madera y vacia el tile» |
| En su mayoria requieren ser procesados | **Pendiente** | — | — |
| Algunos podran combinarse para crear cosas nuevas | **Pendiente** | — | — |
| Categorias: minerales, quimicos, organicos | **Pendiente** | Hoy solo hay tres recursos sin taxonomia | — |
| Se requieren herramientas y experiencia | **Pendiente** | — | — |

## Capitulo III: La vida

| Ley | Estado | Donde vive | Prueba |
|---|---|---|---|
| Todo ser vivo tiene necesidades fisicas | **Parcial** | `sim/systems/survival.ts` — hambre y salud, solo del jugador | «el hambre baja con el tiempo al ritmo esperado» |
| Los recursos naturales son la base de la vida | **Parcial** | Las bayas alimentan; la vegetacion depende del bioma | «sin comer, el hambre llega a cero» |
| Todo ser vivo busca maximizar sus posibilidades de persistir | **Pendiente** | — | — no hay seres con comportamiento propio |
| Los seres vivos intentan mejorar su calidad de vida | **Pendiente** | — | — |
| Existen relaciones naturales entre las entidades vivas | **Pendiente** | — | — |
| Las interacciones se desarrollan de forma coherente y reactiva | **Pendiente** | — | — |
| Cada entidad cumple un rol y coexiste con sus vecinos | **Pendiente** | — | — |
| Ciclo basico: nacimiento, crecimiento, reproduccion y muerte | **Parcial** | `sim/life.ts` — la flora nace, crece y muere de forma agregada | «pero si se repuebla desde vecinos con vida» — falta el ciclo de individuos |
| Los ecosistemas tienden a estados dinamicos de equilibrio | **Cumplida** | `sim/life.ts` — crecimiento logistico hacia la capacidad de carga | «la vegetacion converge a la capacidad de carga sin superarla» |
| Existen muchas y diversas formas de vida | **Pendiente** | Hoy solo hay tres tipos de planta | — |
| Las comunidades de especies desarrollan comportamientos colectivos | **Pendiente** | — | — |
| El reino vegetal se desarrolla naturalmente y por intervencion | **Cumplida** | `sim/life.ts` — crece solo y se resiente al talar | «talar hunde la vegetacion de la zona» |
| Las entidades vivas no surgen automaticamente | **Cumplida** | `sim/life.ts` — con densidad cero el crecimiento es exactamente cero; solo se repuebla desde vecinos | «un chunk sin vida y rodeado de vacio no genera vida por si solo» |
| Todo ser vivo puede desarrollar rasgos diferenciales | **Pendiente** | — | — |
| Existen muchos tipos de biomas y ecosistemas | **Cumplida** | `sim/worldgen.ts` — ocho biomas calibrados | «todos los biomas aparecen» |

## Capitulo IV: Las comunidades

Ninguna ley de este capitulo esta implementada todavia: requiere fauna con
comportamiento propio, que es el paso siguiente. Se documentaran aqui conforme se
implementen.

---

## Deudas conocidas

- **Causalidad rastreable** (Capitulo I) es la ley mas exigente del libro y hoy
  no existe nada de ella. Merece una decision de diseno propia: registrar cadenas
  causales tiene un coste de memoria que hay que acotar antes de empezar.
- **La transformacion de recursos** (Capitulo II) es el hueco mas visible
  jugando: se recolecta madera y no hay nada que hacer con ella.
- **El ciclo de vida por individuo** (Capitulo III) hoy es agregado por chunk.
  Sirve para la flora, pero la fauna necesitara individuos con estado propio.
