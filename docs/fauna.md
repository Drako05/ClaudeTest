# La fauna

Lee esto antes de tocar los animales: las especies (`shared/src/fauna.ts`),
su generacion y su paseo (`sim/src/fauna.ts`, `sim/src/systems/wander.ts`),
el golpe a algo vivo (`systems/gathering.ts`), **el plano de su cuerpo**
(`shared/src/fauna-body.ts`), su choque (`sim/src/body.ts`, `walkAnimal`), su
modelo (`client/src/fauna-model.ts`) o su vista (`client/src/fauna-view.ts`).

## Primera tanda (2026-10-02): diez especies que deambulan

Lo que pidio el autor:
- dos animales reales por bioma;
- tres etapas (cria, joven y adulto), cada una con su dibujo;
- dos sexos, sin diferencias de dibujo por ahora;
- ratios de aparicion, puntos de vida y botin, simplificando la vida real;
- un **sistema de puntos de vida con bases claras**, que valga para las
  formas de vida que vengan;
- el comportamiento de cada etapa, solo **por escrito**;
- de momento, **solo entidades que deambulan**;
- **el boton del bioma no se toca**: los dos sistemas se vinculan en otra tanda.

Lo que decidio el autor al responder a la propuesta:
1. **Los PV salen de la masa corporal.**
2. **Los cinco biomas de tierra.** El oceano queda escrito abajo para la tanda
   del nado.
3. **Etapa fija**: cada animal nace en el mundo con la suya y la conserva hasta
   la tanda de la reproduccion.
4. **Botin**: la carne cruda se asa en el horno y la asada se come; piel,
   plumas y caparazon se guardan sin uso todavia.

Lo marcado *(deduccion)* es mio y esta en «Esperando tu juicio» de
`docs/pendiente.md`.

## El sistema de puntos de vida

**PV = 100 × (masa / 70 kg)^(1/3)**, redondeado (`hitPointsOf`).

- **La referencia es el jugador**: 100 PV, una persona de 70 kg. Su salud de
  0 a 100 no cambia.
- **La raiz cubica de la masa es el tamano lineal del cuerpo**: ocho veces la
  masa es el doble de alto y el doble de vida (`tests/fauna.test.ts` fija el
  ancla y la relacion).
- **Vale para cualquier forma de vida que tenga masa**: aves, peces, reptiles.
  No pide mas que un numero real y medible.
- **Las etapas salen de la misma formula con la masa de cada etapa**: la cria
  pesa el 15 % del adulto y tiene ×0,53 de sus PV; el joven pesa el 60 % y
  tiene ×0,84. Las dos proporciones son comunes a todas las especies
  *(deduccion)*. El tamano del dibujo y el botin salen de esa misma masa.
- **Se desecho la esperanza de vida** porque no distingue tamanos: una marmota
  de 5 kg saldria igual que un ibice de 70, y una gaviota igual que un reno.

**El daño de un golpe, en PV** *(deduccion; es el primer daño a algo vivo)*:
- a mano, **5**;
- con herramienta, **10 por punto de su poder**: 10, 20 o 30 para piedra, cobre
  o hierro, valga el hacha o el pico (`strikeDamage`);
- golpear un animal **gasta un uso** de la herramienta;
- **las armas traen el suyo** (el autor, 2026-10-04): punal de piedra 15,
  espada de cobre 30 y espada de hierro 45. **Puesta en la casilla Arma de
  PERSONAJE, al animal le pega ella** —y se gasta ella— aunque en la mano
  haya otra cosa; lo demas lo golpea lo de la mano. Contado entero en
  `docs/recoleccion.md`.

Los animales **no se curan** mientras estan cerca *(deduccion)*, pero **el
daño no sobrevive a recargarse** (decision del autor, 2026-10-03): un animal
que se retira al alejarse el jugador (`FAUNA_RADIUS_CHUNKS`) vuelve entero.
Vale para todo lo que se golpea: las plantas y los bloques olvidan su daño al
descargarse su chunk (`forgetUnloadedDamage`, ver `docs/recoleccion.md`).

**Al golpearlos no saltan fragmentos**, ni al matarlos (decision del autor,
2026-10-03): solo el **impacto**, el destello en estrella que sale donde el
golpe toca cualquier cosa que se puede romper (`docs/efectos.md`).

## Las especies

Datos reales simplificados: masa media del adulto y esperanza de vida en
libertad. PV de cria / joven / adulto, calculados con la formula. El plan
llevaba 38 para la liebre y el zorro y 10 para el cangrejo, redondeados a mano;
la formula da 39 y 9.

| Bioma | Especie | Masa | Vida | PV | Alto (cria / joven / adulto) |
|---|---|---|---|---|---|
| Pradera | Liebre europea (*Lepus europaeus*) | 4 kg | 5 años | 20 / 32 / 39 | 0,24 / 0,38 / 0,45 |
| Pradera | Bisonte europeo (*Bison bonasus*) | 600 kg | 20 | 109 / 173 / 205 | 1,06 / 1,69 / 2,00 |
| Bosque | Ciervo rojo (*Cervus elaphus*) | 150 kg | 15 | 69 / 109 / 129 | 0,74 / 1,18 / 1,40 |
| Bosque | Jabali (*Sus scrofa*) | 90 kg | 10 | 58 / 92 / 109 | 0,53 / 0,84 / 1,00 |
| Tundra | Reno (*Rangifer tarandus*) | 120 kg | 15 | 64 / 101 / 120 | 1,01 / 1,60 / 1,90 |
| Tundra | Zorro artico (*Vulpes lagopus*) | 4 kg | 4 | 20 / 32 / 39 | 0,22 / 0,34 / 0,40 |
| Tierras altas | Ibice alpino (*Capra ibex*) | 70 kg | 15 | 53 / 84 / 100 | 0,69 / 1,10 / 1,30 |
| Tierras altas | Marmota alpina (*Marmota marmota*) | 5 kg | 13 | 22 / 35 / 41 | 0,22 / 0,34 / 0,40 |
| Costa | Cangrejo verde (*Carcinus maenas*) | 0,06 kg | 4 | 5 / 8 / 9 | 0,22 / 0,25 / 0,30 |
| Costa | Gaviota patiamarilla (*Larus michahellis*) | 1 kg | 15 | 13 / 20 / 24 | 0,32 / 0,51 / 0,60 |

- **El alto** sale del alto real con la vara del jugador (1,93 bloques para
  1,75 m), con astas o cuernos incluidos.
  - Por etapa escala con la raiz cubica de su masa, como los PV.
  - Nada baja de **0,22 bloques** *(deduccion)*: el cangrejo real mediria 0,1 y
    se sube al minimo visible.
- **El cuerpo es de bloques** desde el 2026-10-03 (decision del autor): el
  plano de cada especie, sus cajas, golpea, choca y se dibuja (ver «El cuerpo
  de bloques», abajo). Mide de alto justo ese alto, y el humo lo afirma.
- **Dos sexos**, al 50 % y por hash, sin cambiar el modelo ni los numeros.
- **El ciervo adulto va sin astas**, como una cierva *(deduccion)*: solo el
  macho las lleva, y el modelo aun no distingue sexos. Reno e ibice llevan
  cuernos los dos sexos en la vida real, y su adulto los lleva.
- **Las crias llevan su librea real**: el cervato moteado, el rayon a rayas, el
  bisonte rojizo y sin joroba, el reno pardo sin astas, el zorrito pardo, y el
  pollo de gaviota pardo. Sin cuernos, astas, colmillos ni barba; el joven,
  con cuernos y sin barba ni colmillos. La cabeza de la cria es un 30 % mas
  grande de lo que le toca, y la del joven un 10 % *(deduccion)*.
- Los modelos y sus colores son mios.
- `window.__verdant.faunaGallery()` devuelve los 30 modelos en una rejilla,
  vistos en tres cuartos desde arriba.

## Aparicion

- **Individuos por chunk lleno de su bioma = 0,45 × √(densidad real por
  km²)** *(deduccion)*. Se reparte segun los tiles de ese bioma que tenga el
  chunk.
  - Con la densidad real, un chunk de 29 × 29 m casi nunca tendria un animal.
  - La raiz conserva el orden (mas liebres que bisontes) y comprime la
    distancia, de 60 a 1 a unos 8 a 1.
- **En grupos de su tamano real.** El decimal que sobra se sortea, asi la media
  es la de la densidad.
- **Etapas: 20 % crias, 25 % jovenes y 55 % adultos** *(deduccion)*, comun a
  todas.
  - Un grupo de dos o mas lleva al menos un adulto.
  - Medido en 900 chunks: 19 / 26 / 56 %.

| Especie | Densidad real | Por chunk | Grupo |
|---|---|---|---|
| Liebre | 30 /km² | 2,5 | solitaria |
| Bisonte | 2 | 0,6 | manada de 4-10 |
| Ciervo | 8 | 1,3 | 2-5 |
| Jabali | 5 | 1,0 | piara de 2-6 |
| Reno | 3 | 0,8 | 3-8 |
| Zorro artico | 0,5 | 0,3 | 1-2 |
| Ibice | 6 | 1,1 | 2-6 |
| Marmota | 50 | 3,2 | colonia de 2-5 |
| Cangrejo | 400 | 9 | solitario |
| Gaviota | 100 | 4,5 | 2-6 |

Medido en 1.600 chunks, cada especie sale cerca de su densidad: el ibice,
con pocas casillas de roca habitables y grupos grandes, es la que mas se
aparta, un 30 % por debajo. Alrededor del nacimiento hay unos 50-60 animales
materializados, y la fauna cuesta 0,15 ms por tick.

## Botin

Todo el botin es *(deduccion)*:
- **Carne cruda = 0,6 × √(masa en kg)**, redondeada y con 1 como minimo
  (`meatOf`), con la masa de su etapa. En adultos da: liebre, zorro, marmota y
  gaviota 1; ibice 5; jabali 6; reno 7; ciervo 7; bisonte 15.
- **Piel**: 1 de cada mamifero joven o adulto, 2 del bisonte adulto.
- **Plumas**, de la gaviota: 1, 2 o 3 segun la etapa.
- **Caparazon**, del cangrejo joven o adulto. El cangrejo no da carne, asi que
  su cria no suelta nada.

Que se hace con ello:
- **Asar** en el horno, categoria «Cocina»: 2 carne cruda + 1 carbon dan 2
  carne asada *(deduccion)*.
- **Comer** con USAR la asada: llena **35** de hambre *(deduccion)*. Las bayas
  llenan 14, y la carne cocinada tiene unas cinco veces mas calorias por peso,
  rebajado a la mitad. La cruda no se come.
- **Un botin entra entero o no entra**, como en la recoleccion: si no cabe, el
  golpe que mataria no completa y el animal sigue con su daño.
- **Piel, plumas y caparazon esperan su uso** en `AWAITING_USE`. El test de
  «todo recurso tiene destino» solo los deja pasar por estar ahi con su nombre,
  y cae si un objeto de esa lista ya tiene uso (para que la lista no mienta).

## El comportamiento de cada etapa (escrito, sin implementar)

Para la tanda del comportamiento. Simplificado de la vida real; las duraciones
de cada etapa son las reales, para cuando haya reproduccion.

### Liebre europea
- **Cria (lebrato, 0-1 mes)**: nace con pelo y los ojos abiertos, sola en una
  cama en la hierba; la madre la visita una vez al dia para mamar. Se queda
  quieta y agazapada ante el peligro.
- **Joven (1-8 meses)**: independiente al mes. Explora, se dispersa a unos
  cientos de metros.
- **Adulta**: solitaria, crepuscular y nocturna; de dia, encamada en una
  depresion del suelo. Pace hierba y brotes. Huye a la carrera en zigzag, hasta
  70 km/h. En celo, las hembras «boxean» a los machos.

### Bisonte europeo
- **Cria (0-1 año)**: rojiza, camina a las pocas horas, sigue a la madre en la
  manada y mama hasta los 7-12 meses.
- **Joven (1-3 años)**: los machos dejan el grupo de hembras y se juntan en
  grupos de machos; las hembras se quedan.
- **Adulto**: manadas mixtas de hembras y crias guiadas por una hembra vieja;
  los machos, solos o en grupos, se unen en celo. Pasta y ramonea al amanecer y
  al atardecer. Huye en estampida; acorralado, carga.

### Ciervo rojo
- **Cria (cervato, 0-1 año)**: moteado, pasa las primeras semanas escondido en
  la vegetacion mientras la madre pace cerca; despues sigue al grupo.
- **Joven (1-3 años)**: el macho joven deja el grupo de hembras y le crecen las
  primeras astas sin ramificar (varetas).
- **Adulto**: hembras con crias en grupos; machos aparte fuera del celo. En
  otono, la berrea: los machos braman y se enfrentan con las astas por las
  hembras. Crepuscular. Huye en grupo; en celo el macho se defiende.

### Jabali
- **Cria (rayon, 0-6 meses)**: a rayas claras, en la piara con la madre;
  se esconde en el encame.
- **Joven (bermejo, 6 meses-2 años)**: pierde las rayas y se vuelve rojizo; los
  machos dejan la piara y van solos o en grupos.
- **Adulto**: piaras de hembras emparentadas con sus crias; el macho viejo,
  solitario. Nocturno; hoza el suelo buscando raices, bulbos, larvas y
  bellotas. La hembra defiende a sus crias y carga; el macho, con los colmillos.

### Reno
- **Cria (0-1 año)**: parda y sin astas; a la hora de nacer ya sigue a la madre
  en la manada, que no se detiene.
- **Joven (1-3 años)**: le crecen astas pequenas; se queda en la manada.
- **Adulto**: los dos sexos llevan astas. Manadas grandes que migran entre
  invierno y verano. Come liquenes, que escarba bajo la nieve, y hierbas. Huye
  en manada; los machos se enfrentan en celo.

### Zorro artico
- **Cria (zorrito, 0-3 meses)**: pardo oscuro, en una madriguera con muchas
  entradas; los cuidan los dos padres.
- **Joven (3-10 meses)**: aprende a cazar con los padres y se dispersa en otono.
- **Adulto**: en pareja durante la cria, solitario el resto del ano. Blanco en
  invierno y pardo en verano. Caza lemmings saltando sobre la nieve, y es
  carronero: sigue al oso y al lobo, y a los renos por sus restos. Huye y se
  esconde; defiende la madriguera.

### Ibice alpino
- **Cria (cabrito, 0-1 año)**: sigue a la madre en los riscos a los pocos dias.
- **Joven (1-3 años)**: cuernos cortos; los machos se van a los grupos de
  machos.
- **Adulto**: hembras y crias en grupos; machos en grupos aparte, mas arriba.
  Trepa paredes casi verticales. Pace hierbas alpinas, de dia. Huye hacia las
  rocas; en celo, los machos chocan los cuernos.

### Marmota alpina
- **Cria (0-1 año)**: nace en la madriguera y sale a las seis semanas; la
  colonia entera vigila.
- **Joven (1-2 años)**: sigue en la colonia familiar.
- **Adulta**: colonias familiares en madrigueras con una pareja dominante.
  Hiberna en invierno. Pace de dia; un centinela silba al ver peligro y todas
  corren a la madriguera.

### Cangrejo verde
- **Cria (larva y juvenil, 0-1 año)**: las larvas flotan con el plancton y se
  asientan en la playa; los juveniles se esconden bajo piedras y algas.
- **Joven (1-2 años)**: muda el caparazon varias veces al crecer.
- **Adulto**: solitario. Activo con la marea y de noche; carronero y
  depredador de moluscos. Ante el peligro levanta las pinzas y se esconde.

### Gaviota patiamarilla
- **Cria (pollo, 0-6 semanas)**: plumon pardo y moteado; se queda en el nido de
  la colonia y pide comida picando la mancha roja del pico de los padres.
- **Joven (1-4 años)**: plumaje pardo moteado que se va aclarando cada ano;
  vaga lejos de la colonia.
- **Adulta**: blanca con el dorso gris y las puntas negras. Cria en colonias
  ruidosas. Omnivora y oportunista: pesca, roba y busca restos. Defiende el
  nido en picado.

### El oceano (para la tanda del nado)

Propuestas, sin implementar:
- **Bacalao del Atlantico** (*Gadus morhua*): 10 kg, 15 años de vida. PV 28 /
  44 / 52.
  - La cria es un alevin con el plancton.
  - El joven vive en bancos cerca de la costa.
  - El adulto forma bancos en aguas frias y profundas y migra para frezar.
- **Foca comun** (*Phoca vitulina*): 100 kg, 25 años. PV 60 / 95 / 113.
  - La cria nada a las pocas horas.
  - El joven es solitario.
  - El adulto sale a descansar a la orilla en grupos y caza peces.

Piden que se nade, que el agua deje de ser un muro para ellos y que se vean
bajo la superficie.

## La ley del observador aplicada a la fauna

Interpretacion mia, aprobada con el plan:
- **La fauna es potencial del chunk**, como sus plantas.
  - `faunaOf` es pura (reglas 2 y 3): el mismo chunk da los mismos animales en
    cualquier orden.
  - Cada animal tiene una clave estable, `cx,cy,n`.
- **Su muerte va al overlay** (regla 4), por clave, en `World`. Su daño no:
  vive en la entidad y se olvida al retirarla (decision del autor, 2026-10-03).
  - **Un animal muerto no vuelve nunca**, ni regenerando su chunk ni pasando el
    tiempo: es la ley «las entidades vivas no surgen automaticamente». Sin
    reproduccion, la fauna solo puede ir a menos.
- **Donde esta un animal es funcion del tiempo.**
  - En cada periodo de paseo (20 s, *deduccion*) tiene un punto de paso: el
    centro de una casilla apta de su bioma dentro de su territorio, sacado de
    un hash de su clave y del periodo.
  - Mientras se le ve, anda hacia el y se para al llegar.
  - Al cargarse su chunk, o tras saltar el tiempo, aparece exactamente en el
    punto de su periodo.
  - Visto o no, coincide en los puntos de paso. Lo que cambia es la forma de
    llegar: la ley se cumple como en las plantas, estadisticamente. El test lo
    afirma comparando un rato vivido con uno saltado.
- **El punto de paso es el CENTRO de su casilla**, no un punto cualquiera: la
  caja del cuerpo cabe sin rozar las vecinas.
  - Con un punto junto a la orilla, el cuerpo tocaba el agua y el animal nacia
    en su origen y echaba a andar.
  - Lo destapo el humo: la presa que tenia que estar quieta se iba.
- **Solo se materializa la fauna a 2 chunks del jugador** (`FAUNA_RADIUS_CHUNKS`).
  - Con el territorio mas grande, 16 casillas, no sale de los 3 chunks que el
    nucleo tiene cargados, asi que andar no genera chunks.
  - Lo demas existe igual, como potencial de su chunk, pero no anda.
- **No entran en el paso de vida** ni en el panel del bioma: se vinculan en otra
  tanda.
- **Su paseo** *(deduccion)*:
  - territorio de 6 a 16 casillas segun la especie y velocidad de 0,6 a 1,2
    bloques por segundo;
  - **no salen de los tiles de su bioma**: lo que no lo es estorba como una
    pared, igual que un brote solo sale en el suyo (regla 10);
  - no chocan entre ellos ni con el jugador.

## El cuerpo de bloques (2026-10-03)

### Por que

- **Los billboards no llegaban.** El autor vio un animal «metido en la pared»
  y se probaron dos arreglos en lamina:
  - una sola profundidad adelantada (`e3d3de6`);
  - ocho direcciones con profundidad por pixel (`ff73508`).
- La sonda demostro que **sus capturas eran un corte verdadero**: desde lo
  alto de un escalon, un cuerpo 3D al pie queda cortado por la misma arista.
- Pero una lamina cortada se lee como «dentro de la pared», y un volumen como
  «detras de la cornisa».
- Decision del autor, tras probarlo: «no siento que por ese camino podamos
  llegar a un juego pulido». **Animales de bloques**:
  - detalle medio, de 10 a 16 cajas;
  - estaticos de momento: se desplazan y giran, el modelo no se mueve;
  - **la caja de golpe es la de su modelo**: «un bisonte tiene un cuello y
    cabeza grande que ameritan que tengan hitbox, pero su pequeña cola puede
    quedar fuera de la caja para que la colision sea directamente en su
    trasero».

### El plano (`shared/src/fauna-body.ts`)

- **Un solo sitio dice como es cada animal.** Es una lista de cajas, cada una
  con:
  - su largo a lo largo del rumbo, su alto y su ancho;
  - su centro en el marco del animal;
  - su papel de color;
  - si **golpea y choca** (`hit`).
- **Lo que es `hit`**: el tronco, el cuello, la cabeza, el hocico, el pecho,
  la joroba y la crin.
- **Lo que no**: las patas finas, la cola, las orejas, los cuernos, las astas,
  la barba, los ojos, las alas plegadas y el pico. Es la regla del autor (la
  cola fuera) extendida a lo fino *(deduccion)*.
- **Las medidas son mias**, de la especie real. Se escalan para que el plano
  mida justo `animalHeight`, con los pies en el suelo.
- **El nucleo golpea y choca con las partes `hit`**, y el cliente dibuja todas.
  Lo que se ve es lo que se golpea, como el tronco de los arboles (regla 12).

### El golpe

- Cada rayo del sector (o el central, en preciso) se corta con cada parte
  `hit`, girada con el rumbo del animal (`rayOrientedBox`).
- El impacto va donde entra en la parte que toca.
- La cabeza de un bisonte se golpea aunque quede lejos del tronco; su cola, no.

### El choque con el terreno (`sim/src/body.ts`, `walkAnimal`)

Decision del autor: **las cajas de sus partes giran con el rumbo y no entran
en un bloque**. Un bisonte no cabe por un pasillo de un bloque, y si al girar
su cabeza entrara en una pared, no gira.

- **Solidos**: ninguna parte `hit` solapa en el suelo una casilla solida.
- **Escalones** *(deduccion, la regla 21 extendida a las partes)*:
  - una casilla estorba a una parte si, entre ella y su vecina hacia los pies,
    hay un escalon de mas de `STEP_UP` cuya cima pasa de la base de la parte;
  - **una rampa no tiene escalon y deja pasar**, aunque un cuerpo que no se
    inclina asome sobre su pendiente;
  - se probo primero con «el suelo mas bajo de la casilla», y una liebre no
    terminaba de subir una rampa;
  - los pies, como siempre: centro y `STEP_UP`.
- **El giro**: hacia su destino a **180°/s** *(deduccion)*. Un paso de giro que
  meteria una parte en el terreno no se da.
- **El avance**: a lo largo de su rumbo, eje a eje, cuando el rumbo esta a
  menos de **45°** de su destino *(deduccion)*. No anda de lado.
- **La indulgencia** *(deduccion)*: un cuerpo que no cabe —nacio asi, o crecio
  algo a su lado— anda sin que sus partes le estorben, solo con sus pies,
  hasta que vuelve a caber. Asi nunca se queda clavado.
- **Al ponerlo** (al nacer o tras un salto de tiempo), prueba 8 rumbos desde el
  de su origen a su punto de paso, y se queda con el primero en que cabe.
  - Sale lo mismo lo mire alguien o no: la ley del observador.
- **No choca con otros animales ni con el jugador** (decision del autor, de
  momento).
- **Lo que cuesta**: hasta cuatro posturas por tick, sobre casi las mismas
  casillas.
  - Cada ronda (`groundRound`) lee cada casilla una vez, y su suelo sale del
    nivel y la rampa (`World.floorRangeAt`).
  - Con 63 animales el tick paso de 0,17 ms a 2,2 ms sin la ronda, y a
    0,26 ms con ella.

### Lo que estorba no los deja clavados (2026-10-05)

El autor vio que los animales se paraban al topar con algo y no salian,
**incluso de frente**. Dos causas:
- iban en linea recta a su punto de paso y empujaban contra lo que hubiera en
  medio hasta el siguiente (hasta 20 s);
- pegados de frente, **ya no podian girar**: cualquier paso de giro metia una
  esquina de la cabeza en la pared, la regla del giro lo rechazaba siempre, y
  se quedaban asi para siempre.

Medido en 2 min de cinco semillas, pasaban clavados (lejos de su punto de paso
y quietos 3 s) el **25-53 % del tiempo**.

Lo que eligio el autor, y como esta hecho (`movement.ts`, `walkAnimal`):
- **Retrocede y gira.** Si el giro no cabe, da un paso atras a lo largo de su
  rumbo y vuelve a probar; gira sobre el centro de su tronco, y el cuerpo nunca
  entra en la pared. Como mucho **1 bloque** (`ANIMAL_BACKUP`, *deduccion*).
- **Todos saltan un bloque** (`ANIMAL_JUMP_UP`), con la parabola del jugador.
  - Salta cuando el avance no progresa y, a lo largo de su rumbo, el suelo
    sube mas de `STEP_UP` y no mas de un nivel, sin nada solido ni fuera de su
    bioma antes del borde.
  - **En el aire avanza lo justo para que sus pies pasen el borde en lo alto
    del salto**, y nunca mas despacio que su paso *(deduccion)*. Un animal
    largo topa con la cabeza teniendo los pies lejos del borde: al bisonte
    adulto le quedan 1,7 bloques, y a la velocidad del jugador (5,2, la del
    plan) llegaba cayendo. Si asi no llega, prueba a pasarlo a tres cuartos
    del ascenso y a la mitad *(deduccion)*.
  - En el aire no gira, y se estampa como el jugador contra lo que no alcanza.
  - Si se cae andando por un borde, cae avanzando a su paso.
- **Lo que no se salta lo bordea**: pared alta, agua, arbol, el borde de su
  bioma.
  - Rumbos, desde el de su punto de paso: ±45°, ±90°, ±135° y 180°, el
    izquierdo antes *(deduccion; determinista)*.
  - Anda **1 bloque** por el (`ANIMAL_DETOUR`, *deduccion*) y vuelve a apuntar
    a su punto de paso. Contra una pared larga elige el mismo lado y la
    recorre.
  - Se probaron dos refinamientos y se quitaron porque no mejoraban la medida:
    empezar por el rumbo siguiente si se atascaba otra vez en el mismo sitio,
    y contar como trecho del rodeo lo que avanza en el aire.
  - Si no sale ninguno, es un callejon: espera quieto a su siguiente punto de
    paso, que olvida todo lo anterior.
- **Ensaya antes de hacer.** El salto y cada rodeo se prueban enteros con las
  mismas funciones que los van a mover, tick a tick como `stepFauna`, y se
  deshacen; solo se hace lo que en el ensayo sale. Como todo es determinista,
  lo de verdad es lo ensayado. Se eligio asi porque suponer que un rumbo sirve
  fallaba: casi todos los que se rendian habian elegido un rodeo cuyo giro no
  cabia ni retrocediendo.
- **La ley del observador no cambia**: los puntos de paso son los mismos; solo
  cambia la forma de llegar.

Despues, en las mismas cinco semillas: **0,1-11 % del tiempo**. Liebre, zorro,
cangrejo, gaviota y reno, 0-4 %; la marmota, 0-12 % segun la semilla. Lo que
queda es sobre todo de cuerpos grandes en sitios estrechos —el jabali (40-47 %)
y el ciervo (16-23 %) entre los arboles del bosque, el bisonte (19-34 %), el
ibice en algun risco (0-22 %)—: un cuerpo de dos bloques que no cabe al girar
entre arboles a dos casillas. Esta en «Esperando tu
juicio» de `docs/pendiente.md`. El tick no cambia: 0,26 ms de media.

### El modelo (`client/src/fauna-model.ts`, `fauna-view.ts`)

- Una geometria por (especie, etapa), con todas sus cajas y el color de cada
  papel por vertice.
- Material Lambert, como el terreno, con normales planas: la luz es la del
  mundo, asi que al girar cambia la cara iluminada.
- Un `Mesh` por animal, en sus pies y girado con su rumbo.
- **Las directrices de arte del autor** (`docs/guia-de-arte.md`, en progreso)
  piden pintar en su cubo lo que va en la piel y hacer lo delgado con laminas
  cruzadas. Los modelos de hoy aun no las cumplen; el inventario esta alli.

### Lo que quedo de la lamina

El jugador sigue siendo un sprite, con la profundidad de la caja de su cuerpo
pixel a pixel (`sprite-depth.ts`). La sonda (`spriteDepthProbe`) lo mide en
cinco casos de terreno: nada mal tapado ni mal visto.

## Lo que mide cada prueba

- **`tests/fauna.test.ts`** mide:
  - las formulas con sus anclas y el botin;
  - asar y comer;
  - que la generacion es pura y salen las densidades, etapas y sexos;
  - que andan y nunca pisan otro bioma;
  - que en el mundo de verdad casi no se quedan clavados (el primer minuto de
    la semilla 5, con el limite en 20 % del tiempo y 5 % las especies
    pequeñas: antes 33 y 25 %, ahora 7 y 0,04 %);
  - visto o saltado, el mismo punto de paso;
  - el daño que se olvida al recargar: el del animal y el de un arbol;
  - el impacto, sobre la caja de lo golpeado, uno por objetivo;
  - que lo muerto no vuelve;
  - que con el inventario lleno el golpe que mataria no completa.
- **`tests/world-laws.test.ts`**: que la fauna no reaparece, y el destino de
  los recursos con su lista de pendientes.
- **`tests/fauna-body.test.ts`** mide:
  - el plano: su alto, los pies en el suelo, y que es `hit`;
  - la cabeza del bisonte se golpea y su cola no, y girado;
  - el choque en mundos hechos a mano: el pasillo, la pared al girar, el
    escalon y la rampa, y la indulgencia al girar y al avanzar;
  - que no se quedan clavados: de frente contra una pared retrocede y gira;
    un escalon de un nivel lo saltan la liebre y el bisonte sin meter la
    cabeza; un pilar, un charco y una pared de dos niveles se bordean.
- **`tests/body-ray.test.ts`**: el rayo contra la caja del cuerpo y contra el
  terreno, la verdad de la sonda.
- **La pasada `fauna` del humo** afirma:
  - cada animal materializado tiene su modelo en la escena;
  - cada modelo mide su alto;
  - deambulan y giran;
  - cada modelo mira a donde mira su animal;
  - una presa se caza con el raton y el clic, suelta carne cruda y deja
    impactos, sin una sola esquirla ni escombro;
  - la sonda de profundidad del jugador, en los cinco casos.
- **La pasada `stations`** asa en el horno y come la carne asada.
