# La fauna

Lee esto antes de tocar los animales: las especies (`shared/src/fauna.ts`),
su generacion y su paseo (`sim/src/fauna.ts`, `sim/src/systems/wander.ts`),
el golpe a algo vivo (`systems/gathering.ts`), su dibujo (`client/src/fauna-art.ts`)
o su vista (`client/src/fauna-view.ts`).

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
- golpear un animal **gasta un uso** de la herramienta.

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
- **La caja de golpe** mide ese alto, centrada en el animal. Su medio ancho es
  *(deduccion)* por especie, escalado igual.
- **El dibujo mide exactamente su caja**: el cliente lo escala por la tinta
  medida, no por la figura que se pidio. Lo que se ve es lo que se golpea, y el
  humo lo afirma.
- **Dos sexos**, al 50 % y por hash, sin cambiar el dibujo ni los numeros.
- **El ciervo adulto se dibuja sin astas**, como una cierva *(deduccion)*:
  solo el macho las lleva, y el dibujo aun no distingue sexos. Reno e ibice
  llevan cuernos los dos sexos en la vida real, y su adulto los lleva.
- **El dibujo** es procedural, como el resto del arte, y mira a camara como el
  jugador; se voltea segun ande hacia la derecha o la izquierda de la pantalla.
  - Las crias llevan su librea real: el cervato moteado, el rayon a rayas, el
    bisonte rojizo, el reno pardo sin astas, el zorrito pardo, y el pollo de
    gaviota pardo y moteado.
  - Los jovenes, proporciones de adulto y cuernos a medias; el jabali joven,
    rojizo y sin rayas.
  - Los dibujos y sus colores son mios.
  - `window.__verdant.faunaGallery()` devuelve los 30 en un lienzo.

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

## El dibujo: ocho direcciones y la profundidad de su cuerpo

### Lo que se vio y lo que se midio

- **Primer aviso del autor (2026-10-03)**: un animal pegado a una pared o a un
  tronco se metia detras. `e3d3de6` le dio a la lamina entera la profundidad
  de un solo punto, el centro del cuerpo adelantado medio largo del dibujo.
- **Segundo aviso, con dos capturas**: una liebre «metida en la pared».
- **La sonda** (`spriteDepthProbe`) reprodujo las capturas, en el caso
  `cornisa`: el jugador en lo alto de un escalon, la liebre al pie.
  - **El corte era verdadero.** El rayo de los ojos a la mitad cercana de la
    liebre cruza el bloque antes de llegar a ella, asi que un cuerpo 3D en ese
    sitio queda cortado por la misma arista.
  - Lo enseña la sonda con `box`: la caja maciza del cuerpo en lugar del sprite
    sale cortada igual.
  - **Lo que estaba mal era lo contrario.** Para no cortar su perfil, el
    bisonte se adelantaba 1,45 bloques, y se veia **a traves** de cornisas y
    esquinas que tapan su cuerpo: el 100 % y el 21 % de lo que deberian tapar.
- **Decision del autor: A+B tal cual**, sin tolerancia que deje ver a traves
  del terreno. Con el resultado delante decide entre inclinar la lamina (C) o
  pasar a animales de bloques.

### A: ocho direcciones (`fauna-facing.ts`, `fauna-art.ts`)

- Decision del autor: **8 direcciones**.
- El dibujo sale del angulo, en el suelo, entre hacia donde mira el animal y la
  camara.
- Son **5 dibujos**: de frente, tres cuartos de frente, perfil, tres cuartos de
  espaldas y de espaldas. Los tres de en medio, en espejo segun el lado.
- **Frente y espaldas** se dibujan aparte con los mismos rasgos de cada
  especie: orejas, cuernos y astas abiertos a los dos lados, el hocico hacia la
  camara, la grupa y la cola.
- **Los tres cuartos** son el perfil encogido a lo ancho alrededor del ancla,
  hasta lo que mide la caja girada 45°, `(largo + ancho)·cos 45°`. De frente se
  le ven el pecho y los dos ojos; de espaldas, ningun ojo.
- **El cangrejo anda de lado**: su perfil, el ancho, es el que se ve mirando
  su marcha de lado.
- Cada vista se escala por su tinta para medir `animalHeight`.
- **Histeresis de 8°** *(deduccion)*: el dibujo solo cambia cuando el angulo
  pasa el borde de su sector por mas de eso, y asi no parpadea.
- **Desde arriba** se ve el dibujo de su angulo en el suelo, de pie y entero:
  la lamina mira a la camara. No enseña el lomo ni se acorta; es lo que C o los
  bloques cambiarian.
- **El ancho de cada cuerpo** es dibujo mio *(deduccion)*, con proporciones de
  la especie real: `wide` en `fauna-art.ts`, de 0,27 (reno) a 0,5 (bisonte,
  marmota) del alto. El cangrejo, 0,8; la gaviota, 0,33.

### B: la profundidad de la caja del cuerpo (`sprite-depth.ts`)

- **Cada pixel toma la profundidad del cuerpo.** El fragment shader corta el
  rayo de la camara por ese pixel con la caja y escribe en `gl_FragDepth` el
  punto donde entra.
- **La caja** es la misma que mide la sonda en JS (`body-ray.ts`):
  - largo: el de la tinta del perfil, medido desde el ancla;
  - ancho: el `wide` de su especie;
  - alto: `animalHeight`;
  - orientada con el **rumbo real** del animal *(deduccion)*. El dibujo va de
    45 en 45°, asi que pueden diferir hasta 22,5°.
  - No es la caja de golpe, que sigue cuadrada (regla 12).
- **Tinta cuyo rayo no toca la caja** (una oreja, unas astas): toma el punto de
  la caja mas cercano a su rayo *(deduccion)*. Asi es siempre la profundidad
  del cuerpo, nunca la de la lamina.
- **Cada animal tiene su material**, porque su rumbo es suyo; las texturas son
  de la clase.
- **El jugador tambien**, con la caja de colision: medio lado `BODY_RADIUS` y
  el alto de su dibujo.
- Reescribe una linea del vertex shader y otra del fragment de three.js 0.170.
  Si una version nueva las cambia, se avisa en consola y el humo falla.
- **Lo que B no arregla**:
  - El cuerpo dibujado es mas largo que su radio de colision. Un bisonte mide
    unos 2,9 y choca con 0,34, como el jugador.
  - De cara a una pared su cabeza esta, en 3D, dentro de ella, y B la tapa
    como la taparia un modelo de bloques.
  - Que cada animal choque con su cuerpo seria cambio del nucleo, y espera al
    autor.

### La sonda, antes y despues

Las cifras van por caso, en la suma de 8 rumbos × 3 alturas:

- **mal tapado**: lo que tapa el terreno sin tapar al cuerpo;
- **mal visto**: lo que se ve a traves de lo que tapa al cuerpo;
- **fuera**: la tinta que no cae sobre el cuerpo.

| Caso | Mal tapado, antes → ahora | Mal visto, antes → ahora | Fuera, antes → ahora |
|---|---|---|---|
| lado / liebre | 0 → 0 % | 0 → 0 % | 18,5 → 14,6 % |
| lado / bisonte | 0 → 0 % | **92,9 → 0,1 %** | 10,4 → 9,4 % |
| esquina / liebre | 0 → 0 % | 0,4 → 0,5 % | 18,5 → 10,7 % |
| esquina / bisonte | 0,1 → 0 % | **21,5 → 0,1 %** | 10,4 → 6,1 % |
| cornisa / liebre | 0 → 0 % | 0 → 0 % | 20,4 → 11,9 % |
| cornisa / bisonte | 0 → 0 % | **100 → 0 %** | 8,3 → 3,9 % |
| detras / liebre | 0 → 0 % | 0 → 0 % | 26,5 → 8,1 % |
| detras / bisonte | 0 → 0 % | **100 → 0 %** | 12,4 → 4,7 % |
| delante / liebre | 0 → 0 % | 0 → 0 % | 26,5 → 8,1 % |
| delante / bisonte | 0 → 0 % | 0 → 0 % | 12,4 → 4,7 % |

**Listones** *(deduccion)*, en cada caso:

- mal tapado ≤ 5 %;
- mal visto ≤ 5 %;
- fuera ≤ 16 %. Con el perfil de siempre la liebre pasaba del 26 %.

## Lo que mide cada prueba

- **`tests/fauna.test.ts`** mide:
  - las formulas con sus anclas y el botin;
  - asar y comer;
  - que la generacion es pura y salen las densidades, etapas y sexos;
  - que andan y nunca pisan otro bioma;
  - visto o saltado, el mismo punto de paso;
  - el daño que se olvida al recargar: el del animal y el de un arbol;
  - el impacto, sobre la caja de lo golpeado, uno por objetivo;
  - que lo muerto no vuelve;
  - que con el inventario lleno el golpe que mataria no completa.
- **`tests/world-laws.test.ts`**: que la fauna no reaparece, y el destino de
  los recursos con su lista de pendientes.
- **La pasada `fauna` del humo** afirma:
  - cada animal materializado tiene su sprite en la escena;
  - deambulan;
  - una presa se caza con el raton y el clic, suelta carne cruda y deja
    impactos, sin una sola esquirla ni escombro;
  - cada dibujo mide su caja, en sus cinco vistas;
  - paseando, se dibujan desde 3 direcciones o mas;
  - la sonda de profundidad, con los listones de arriba en los diez casos.
- **`tests/fauna-facing.test.ts`**: los ocho sectores, el espejo, la
  histeresis, y el rayo contra la caja del cuerpo y contra el terreno.
- **La pasada `stations`** asa en el horno y come la carne asada.
