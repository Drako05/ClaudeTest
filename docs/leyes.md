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
| El mundo existe independientemente de cualquier observador | **Cumplida** | `sim/world.ts` — todos los chunks conocidos avanzan a la vez en pasos globales fijos, este cargado lo que este, y cada paso lee una foto fija del anterior para no depender del orden entre chunks | «la vida evoluciona igual se observe o no», «alejarse y volver no altera lo que ocurrio mientras tanto», «una hora saltada y una hora vivida quieto dejan el mismo mundo» |
| Impone sus reglas absolutas de forma igualitaria con todos | **Parcial** | `sim/worldgen.ts` no favorece ninguna posicion; el spawn solo busca terreno transitable | — falta cuando haya mas entidades a las que tratar por igual |
| Todos los sistemas relacionados bajo causalidad rastreable | **Pendiente** | — | — no hay registro de causas; hoy no se podria rastrear por que paso algo |
| Las consecuencias dependen del estado del mundo y de las relaciones | **Cumplida** | El rendimiento de recolectar depende de si el bioma esta equilibrado, y saturar un chunk deja al bioma entero sin recompensas | «un bioma equilibrado rinde mas al recolectar», «la saturacion deja al bioma sin recompensas mientras dura» |
| Los jugadores no son necesarios para el desarrollo de sucesos | **Cumplida** | `sim/world.ts` — la vegetacion evoluciona sin que nadie la mire | «la vida evoluciona igual se observe o no» |
| Existen el pasar del tiempo y las leyes fisicas fundamentales | **Parcial** | `sim/clock.ts` — tiempo, ciclo dia/noche | «el ciclo del dia es periodico», «el dia recorre sus cuatro fases» — de fisica solo hay colision |
| El mundo es abierto para todos | **Cumplida** | `sim/world.ts` — infinito en las cuatro direcciones, sin barreras | «las coordenadas negativas de chunk funcionan» |
| Toda existencia es justificada por un sistema | **Parcial** | Las plantas existen solo donde el bioma y la vegetacion las sostienen, y cada bioma lleva su cuenta propia **dentro** de cada chunk: un arbol de bosque no puede brotar sobre la hierba de al lado | «un brote solo sale en el terreno de su bioma», «las especies no se mezclan: talar el bosque no toca la pradera» |
| El entorno cambia por acontecimientos naturales o de las entidades | **Parcial** | Naturales (crecimiento vegetal) y por entidades (recoleccion) | «un arbusto recolectado vuelve a crecer con el tiempo» |

## Capitulo II: Los recursos

| Ley | Estado | Donde vive | Prueba |
|---|---|---|---|
| Pueden ser finitos, consumibles y renovables | **Cumplida** | La vida se repone via el ecosistema; la roca es inerte y no vuelve | «el ecosistema repone lo recolectado», «la piedra es inerte: ni cuenta como vida ni se repone» |
| Todo recurso tiene origen, transformacion y destino | **Parcial** | Origen (worldgen), destino (inventario) y un primer ciclo cerrado: recolectar deja semillas que se siembran y maduran | «sembrar consume una semilla y el brote madura a adulto» — falta el procesado y el crafteo |
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
| Ciclo basico: nacimiento, crecimiento, reproduccion y muerte | **Parcial** | Las plantas son instancias que nacen (brote o brote sembrado), maduran y mueren por recoleccion o competencia | «sembrar consume una semilla y el brote madura a adulto», «la mortandad corrige mas al principio que al final» — falta la fauna |
| Los ecosistemas tienden a estados dinamicos de equilibrio | **Cumplida** | Crecimiento logistico hacia el referente y mortandad exponencial por saturacion, con los ritmos que fijo el autor | «de cero al rango en 5 horas reales», «del 200 % al rango en 2.5 horas reales», «la vida tiende a su referente sin superarlo nunca» |
| Existen muchas y diversas formas de vida | **Parcial** | Bosque y pradera tienen su arbol y su planta propios, cada uno con variante rara. Tundra y nieve heredan los de pradera | «los biomas nacen equilibrados salvo excepciones del azar» — falta la fauna y el resto de biomas |
| Las comunidades de especies desarrollan comportamientos colectivos | **Pendiente** | — | — |
| El reino vegetal se desarrolla naturalmente y por intervencion | **Cumplida** | Crece solo despacio y el jugador lo acelera sembrando, que es la via principal de equilibrio | «el ecosistema repone lo recolectado», «sembrar consume una semilla y el brote madura a adulto» |
| Las entidades vivas no surgen automaticamente | **Cumplida** | Con poblacion cero el crecimiento logistico vale exactamente cero; solo la colonizacion desde una fuente cercana lo arranca | «sin fuente cercana no se genera ni una sola unidad de vida», «donde el terreno no sostiene vida, no aparece jamas» |
| Todo ser vivo puede desarrollar rasgos diferenciales | **Pendiente** | — | — |
| Existen muchos tipos de biomas y ecosistemas | **Cumplida** | `sim/worldgen.ts` — ocho biomas calibrados; el bioma es el del **tile**, no el del chunk, asi que la mancha sigue la forma real del terreno | «todos los biomas aparecen», «dos tiles del MISMO chunk pueden dar biomas distintos» |

## Capitulo IV: Las comunidades

Ninguna ley de este capitulo esta implementada todavia: requiere fauna con
comportamiento propio, que es el paso siguiente. Se documentaran aqui conforme se
implementen.

---

## Sobre el equilibrio de los biomas

El autor decidio que la via principal para mantener el equilibrio sea la
**participacion del jugador**: la recuperacion autonoma existe pero es lenta a
proposito (cinco horas reales para recuperar un bioma desde cero), mientras que
sembrar es inmediato. Un bioma equilibrado rinde un 30 % mas al recolectar y hace
brotar variantes raras.

Para que no baste con amontonar plantas en un solo sitio, cada chunk tiene un
tope de densidad por tipo de vida: superarlo deja al bioma entero sin
recompensas y provoca competencia y mortandad hasta volver al limite.

Un bioma es el conjunto conexo de chunks que **contienen** ese bioma y que estan
**ya generados**: el resto se asume en equilibrio, asi que solo lo explorado
puede desviar las cuentas. Por eso el panel no muestra cantidades absolutas sino
barras relativas al equilibrio con el que nacio la zona.

La contabilidad va por `(chunk, bioma, tipo de vida)`, no por chunk. Antes cada
chunk se etiquetaba con su terreno predominante, y eso tenia dos consecuencias
malas: el panel podia anunciar «Bosque» mientras el personaje pisaba hierba, y
los arboles de bosque y los de pradera de un mismo chunk compartian referente,
mezclando dos especies en una sola cuenta. Ahora el bioma que se nombra es
siempre el del tile que se pisa.

## Deudas conocidas

- **Causalidad rastreable** (Capitulo I) es la ley mas exigente del libro y hoy
  no existe nada de ella. Merece una decision de diseno propia: registrar cadenas
  causales tiene un coste de memoria que hay que acotar antes de empezar.
- **La transformacion de recursos** (Capitulo II) sigue siendo el hueco mas
  visible jugando: la madera todavia no sirve para nada. Las semillas cierran un
  primer ciclo, pero falta el procesado y el crafteo.
- **La fauna** (Capitulos III y IV) no existe. El panel ya reserva su fila para
  dejar claro que falta. Las comunidades del Capitulo IV dependen de ella.
- **Las especies** solo cubren bosque y pradera; tundra y nieve heredan las de
  pradera de momento.
