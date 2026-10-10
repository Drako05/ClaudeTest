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

## Las tres que condicionan el diseno

Estaba en `CLAUDE.md` hasta el 2026-10-10 y se mudo aqui **literal**: `CLAUDE.md`
se carga en cada llamada, asi que alli queda solo el enunciado.

Tres leyes condicionan el diseno entero y conviene tenerlas presentes antes de
tocar la simulacion:

- **«El mundo existe independientemente de cualquier observador»** prohibe
  simular solo lo que rodea al jugador. La vida avanza en pasos globales fijos
  (`LIFE_STEP_TICKS`) sobre todos los chunks perturbados a la vez, de modo que
  ponerse al dia de golpe y simular continuamente dan el mismo resultado. Si
  anades un proceso que dependa del orden fino entre chunks, esa equivalencia se
  rompe y el test de independencia del observador te avisara.
- **«Las entidades vivas no surgen automaticamente»** prohibe generar vida de la
  nada. El paso de vida vive en `sim/world.ts` (`lifeStep`) con sus constantes en
  `shared/ecology.ts`, y ahi esta codificado en la aritmetica: con densidad cero
  el crecimiento vale exactamente cero.
- **«Segun su naturaleza, pueden ser finitos, consumibles y renovables»**: no
  todo recurso vuelve. `lifeKindOf` devuelve `null` para lo inerte —roca y
  minerales—, que asi queda fuera del paso de vida: ni crece ni se repone.

## Capitulo I: El mundo

| Ley | Estado | Donde vive | Prueba |
|---|---|---|---|
| El mundo existe independientemente de cualquier observador | **Cumplida** | `sim/world.ts` — todos los chunks conocidos avanzan a la vez en pasos globales fijos, este cargado lo que este, y cada paso lee una foto fija del anterior para no depender del orden entre chunks | «la vida evoluciona igual se observe o no», «alejarse y volver no altera lo que ocurrio mientras tanto», «una hora saltada y una hora vivida quieto dejan el mismo mundo» |
| Impone sus reglas absolutas de forma igualitaria con todos | **Parcial** | `sim/worldgen.ts` no favorece ninguna posicion; el spawn busca terreno transitable, llano y del que se pueda salir, con el mismo criterio en todas las semillas | — falta cuando haya mas entidades a las que tratar por igual |
| Todos los sistemas relacionados bajo causalidad rastreable | **Pendiente** | — | — no hay registro de causas; hoy no se podria rastrear por que paso algo |
| Las consecuencias dependen del estado del mundo y de las relaciones | **Cumplida** | El rendimiento de recolectar depende de si el bioma esta equilibrado, y saturar un chunk deja al bioma entero sin recompensas | «un bioma equilibrado rinde mas al recolectar», «la saturacion deja al bioma sin recompensas mientras dura» |
| Los jugadores no son necesarios para el desarrollo de sucesos | **Cumplida** | `sim/world.ts` — la vegetacion evoluciona sin que nadie la mire | «la vida evoluciona igual se observe o no» |
| Existen el pasar del tiempo y las leyes fisicas fundamentales | **Parcial** | `sim/clock.ts` — tiempo y ciclo dia/noche; `sim/relief.ts` — el mundo tiene altura, en voxeles de 0,5; `sim/systems/jump.ts` — gravedad, salto y caida | «el ciclo del dia es periodico», «el dia recorre sus cuatro fases», «el suelo de un punto es el techo de su columna: sin rampas, a escalones de medio bloque», «andando se sube como mucho medio bloque por tick», «salir de un borde es caerse, no bajar de golpe», «un salto sobre el agua acaba en la orilla de la que salio» — la altura ya estorba; falta el resto de la fisica (empuje entre cuerpos, fluidos) |
| El mundo es abierto para todos | **Cumplida** | `sim/world.ts` — infinito en las cuatro direcciones, sin barreras | «las coordenadas negativas de chunk funcionan» |
| Toda existencia es justificada por un sistema | **Parcial** | Las plantas existen solo donde el bioma y la vegetacion las sostienen, y cada bioma lleva su cuenta propia **dentro** de cada chunk: un arbol de bosque no puede brotar sobre la hierba de al lado. La fauna, solo en los tiles de su bioma y con la densidad de su especie (`sim/fauna.ts`) | «un brote solo sale en el terreno de su bioma», «las especies no se mezclan: talar el bosque no toca la pradera», «ningun animal pisa nunca un tile de otro bioma» |
| El entorno cambia por acontecimientos naturales o de las entidades | **Parcial** | Naturales (crecimiento vegetal) y por entidades (recoleccion) | «el ecosistema repone lo recolectado» |

## Capitulo II: Los recursos

| Ley | Estado | Donde vive | Prueba |
|---|---|---|---|
| Pueden ser finitos, consumibles y renovables | **Cumplida** | La vida se repone via el ecosistema; roca y minerales son inertes y no vuelven | «el ecosistema repone lo recolectado», «la piedra es inerte: ni cuenta como vida ni se repone», «la piedra sigue siendo inerte y de cantidad fija» |
| Todo recurso tiene origen, transformacion y destino | **Cumplida** | Origen (worldgen), un ciclo cerrado —recolectar deja semillas que se siembran y maduran—, transformacion —fabricar (`tryCraft`), fundir y asar en el horno— y destino: desde la tanda 2 todo recurso se gasta en algo (la madera en la mesa y la mochila, el carbon y los minerales en el horno, los lingotes en herramientas, la carne cruda se asa y la asada se come). Piel, plumas y caparazon de la fauna **esperan su uso** por decision del autor, nombrados en `AWAITING_USE` | «sembrar consume una semilla y el brote madura a adulto», «algunos recursos se combinan para crear cosas nuevas», «todo recurso tiene destino: se gasta en una receta o se usa» |
| Los mas basicos se generan con el terreno | **Cumplida** | `sim/worldgen.ts` — `featureAt` decide segun el bioma | tests de `world-quality` |
| Deben ser recolectados para usarlos | **Cumplida** | `sim/systems/gathering.ts` | «recolectar un arbol da madera y vacia el tile» |
| En su mayoria requieren ser procesados | **Parcial** | Los minerales si: solo el horno los usa (`Station.Furnace` en `RECIPES`) y sus lingotes hacen las herramientas de metal. La carne tambien: cruda no se come, se asa en el horno. Madera, piedra, ramas y fibra se usan aun en bruto, asi que «la mayoria» todavia no | «los minerales requieren procesarse: solo el horno los usa…» |
| Algunos podran combinarse para crear cosas nuevas | **Cumplida** | `RECIPES` en `shared` y `tryCraft` en `sim/systems/gathering.ts`: ramas, piedra y fibra hacen el hacha y el pico de piedra | «algunos recursos se combinan para crear cosas nuevas», `tests/crafting.test.ts` |
| Categorias: minerales, quimicos, organicos | **Parcial** | Los minerales existen y viven donde deben: carbon, hierro y cobre solo en la montana. Lo organico crece con la fauna: carne, piel, plumas y caparazon. Faltan los quimicos y una taxonomia explicita | «solo aparecen sobre roca», «los tres existen y el carbon es el mas comun» |
| Se requieren herramientas y experiencia | **Parcial** | Herramientas si: trabajo por golpes (`workOf`, `toolStats`), la roca y los minerales piden pico, un arbol sin hacha no cae, y el hierro pide un pico de cobre o mejor; las de metal piden mesa y lingotes. La experiencia sigue pendiente | «algunos recursos requieren herramientas para recolectarse», `tests/crafting.test.ts` |

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
| Ciclo basico: nacimiento, crecimiento, reproduccion y muerte | **Parcial** | Las plantas son instancias que nacen (brote o brote sembrado), maduran y mueren por recoleccion o competencia. La fauna tiene sus tres etapas (cria, joven y adulto), pero **fijas** hasta la tanda de la reproduccion (decision del autor), y solo muere cazada | «sembrar consume una semilla y el brote madura a adulto», «la mortandad corrige mas al principio que al final», «matarlo da su botin entero, y lo que muere no vuelve» — falta que la fauna nazca, crezca y muera sola |
| Los ecosistemas tienden a estados dinamicos de equilibrio | **Cumplida** | Crecimiento logistico hacia el referente y mortandad exponencial por saturacion, con los ritmos que fijo el autor | «de cero al rango en 5 horas reales», «del 200 % al rango en 2.5 horas reales», «la vida tiende a su referente sin superarlo nunca» |
| Existen muchas y diversas formas de vida | **Parcial** | Bosque, pradera y tundra tienen su arbol y su planta propios, cada uno con variante rara. La nieve es la franja extrema de la tundra: sostiene arboles pero no plantas. Desde la primera tanda de fauna, diez especies reales, dos por bioma de tierra —costa y tierras altas incluidas—, cada una en tres etapas y dos sexos (`docs/fauna.md`) | «cada planta esta en el bioma de su especie, sin cruces», «tiene arbol y planta propios, con sus variantes raras», «cada especie sale con su densidad, y las etapas y los sexos en su proporcion» — falta la vida del oceano y la vegetal de costa |
| Las comunidades de especies desarrollan comportamientos colectivos | **Pendiente** | — | — |
| El reino vegetal se desarrolla naturalmente y por intervencion | **Cumplida** | Crece solo despacio y el jugador lo acelera sembrando, que es la via principal de equilibrio | «el ecosistema repone lo recolectado», «sembrar consume una semilla y el brote madura a adulto» |
| Las entidades vivas no surgen automaticamente | **Cumplida** | Con poblacion cero el crecimiento logistico vale exactamente cero; solo la colonizacion desde una fuente cercana lo arranca. La fauna es potencial de su chunk y su muerte va al overlay: lo que muere no vuelve, y sin reproduccion solo puede ir a menos | «sin fuente cercana no se genera ni una sola unidad de vida», «donde el terreno no sostiene vida, no aparece jamas», «la fauna no reaparece: lo que muere no vuelve, ni pasando el tiempo ni regenerando su chunk» |
| Todo ser vivo puede desarrollar rasgos diferenciales | **Pendiente** | — | — |
| Existen muchos tipos de biomas y ecosistemas | **Cumplida** | `sim/worldgen.ts` — ocho biomas calibrados; el bioma es el del **tile**, no el del chunk, asi que la mancha sigue la forma real del terreno | «todos los biomas aparecen», «dos tiles del MISMO chunk pueden dar biomas distintos» |
| El mundo es abierto para todos (aplicada al relieve) | **Cumplida** | `sim/relief.ts` y `sim/worldgen.ts` — hay cordilleras de hasta cuarenta niveles y mesetas con paredes, y la densidad de las dos cosas esta calibrada contra la conectividad real del mundo, no elegida a ojo | «el relieve no parte el mundo», «hay montanas de verdad, no llanuras onduladas», «existen paredes de dos o mas bloques», «la costa no se ha movido» |

## Capitulo IV: Las comunidades

Ninguna ley de este capitulo esta implementada todavia: requiere fauna con
comportamiento propio. La fauna ya existe (primera tanda, 2026-10-02) pero solo
deambula; su comportamiento por etapa esta escrito en `docs/fauna.md` para la
tanda que lo implemente.

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

La montana es el bioma mineral. No tiene vegetacion, pero la piedra sale alli con
el mismo indice que los arboles en la pradera, y con ella los tres minerales
—carbon, hierro y cobre— que suman un 10 % de ese indice. Fuera de la montana la
piedra sigue apareciendo, al 60 % de lo que aparecia antes. Nada de eso se repone:
son los recursos finitos del Capitulo II.

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
- **La transformacion de recursos** (Capitulo II): ramas, piedra y fibra se
  fabrican en herramientas, y desde la tanda 2 los minerales se funden en el
  horno y la madera hace la mesa. Lo que queda para que «la mayoria requiera
  procesarse» es que lo basico —madera, piedra— tambien pase por una estacion
  antes de servir, y eso es decision de diseno del autor.
- **La fauna** (Capitulos III y IV) existe desde el 2026-10-02, pero solo
  deambula: no come, no huye, no se reproduce ni envejece, y no entra en el
  equilibrio ni en el panel del bioma, que siguen sin ella por decision del
  autor. Las comunidades del Capitulo IV dependen de su comportamiento.
- **Las especies vegetales** cubren bosque, pradera y tundra. La costa sigue
  sin vegetacion propia, y la montana es mineral a proposito; las dos tienen ya
  su fauna. El oceano no tiene vida: su fauna espera a la tanda del nado.
