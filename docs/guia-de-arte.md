# Guia de arte — trabajo en progreso

Lee esto antes de diseñar o retocar un modelo: un animal, una estacion o lo
que venga. Son **las directrices del autor** para el diseño.

## Como crece

- La abrio el autor el 2026-10-04, al dar por buenos los modelos de bloques
  de la fauna «dentro de lo esperado de una fase temprana».
- Es un **trabajo en progreso**: «podremos ir agregando lineamientos en una
  tanda dedicada o poco a poco a lo largo del desarrollo».
- **Las directrices son del autor.** El agente no añade ninguna por su cuenta:
  las propone en `docs/pendiente.md` y entran aqui cuando el autor las da por
  buenas.
- Cada directriz lleva:
  - su texto literal y su fecha;
  - lo que el agente entiende de ella, marcado *por confirmar* mientras el
    autor no lo haya visto.
- **Escribirla no la aplica.** Lo que hoy no la cumple va en su inventario,
  para la tanda que la aplique, que pide el autor.

## Directriz 1: lo que va en la piel se pinta en su cubo

> «Cuando el animal presenta patrones en su pelaje, estos pueden ser
> coloreados directamente en el cubo de esa parte del cuerpo en vez de
> hacerlos con otro cubo, esto aplicaria para elementos que van al nivel de
> la piel, como los ojos.» — el autor, 2026-10-04

- **Alcance**: los patrones del pelaje (motas, rayas), los ojos y todo lo que
  esta al nivel de la piel.
- **Lectura del agente, *por confirmar***: entran tambien estos manchones de
  color, que hoy son cajas finas pegadas al cuerpo:
  - la barriga clara;
  - la grupa blanca del ciervo;
  - el disco del hocico del jabali y la nariz del zorro;
  - la punta oscura de la oreja de la liebre;
  - la punta blanca de la cola del zorro;
  - el vientre del cangrejo.
- **Lo que hoy no la cumple** (`shared/src/fauna-body.ts`): `motas-*`,
  `raya-*`, `ojo`, `ojo-*`, `barriga`, `grupa`, `disco`, `nariz`,
  `punta-oreja`, `punta-cola` y `vientre`.
- **Aplicarla** pide pintar caras, no solo colorear cajas enteras. Dos
  caminos, sin decidir:
  - una textura por caja, como las caras de las estaciones;
  - colores por vertice subdividiendo la cara.
  - En los dos, el plano del cuerpo tendria que decir que se pinta en que cara.

## Directriz 2: lo delgado va en laminas cruzadas

> «Otra guia podria ser que los elementos mas delgados no sean cubos sino
> laminas 2D cruzadas (como los arboles).» — el autor, 2026-10-04

- **El referente** son las aspas de los arboles (`docs/arte.md`): dos laminas
  a 90 grados, cuya silueta nunca baja de `cos 45º` de su ancho.
- **Por decidir, por el autor:**
  - **Que cuenta como «delgado».** Candidatos de hoy:
    - las astas del reno (`asta*`);
    - los cuernos del bisonte y del ibice (`cuerno*`);
    - los colmillos del jabali (`colmillo`);
    - las orejas finas: liebre, ciervo, reno, zorro, ibice (`oreja`);
    - las colas finas: bisonte, jabali, ciervo (`cola`);
    - la barba del bisonte y del ibice (`barba`);
    - las alas plegadas de la gaviota (`ala`), su pico (`pico`) y sus patas;
    - las patas del cangrejo.
  - **Si una lamina puede llevar caja de golpe.** Hoy ninguna de esas partes
    es `hit`: no golpean ni chocan.
- **Lo que hoy no la cumple**: todas las de la lista, que son cajas.
- **Aplicarla** es dibujarlas como las aspas de `billboards.ts`, en el marco
  del animal y girando con el. No cambia el plano de golpe mientras esas partes
  sigan sin `hit`.

## Directriz 3: los iconos son siluetas de aventurero medieval

> «Me gustaria que los iconos esten mas inspirados en un aspecto de parte de
> armadura medieval minimalista, algo parecido a la foto que te adjunte. [...]
> El bolso que hiciste parece un bolso de mujer. Por favor cambia todo a un
> aspecto aventurero/medieval/fantasia. Agrega esto a las directrices de la
> guia de diseño grafico del juego.» — el autor, 2026-10-04

- **El referente**: la imagen que adjunto el autor, que el repo no guarda.
  - Doce iconos en negro sobre blanco: peto, yelmo con penacho, guantelete,
    hombreras con puas, grebas, escudo redondo, capa con capucha, brazal,
    capucha, tunica, botas altas y escudo de blason con un leon rampante.
  - **Siluetas rellenas de un solo color**, sin contorno; los detalles (la
    rendija del yelmo, las juntas de las laminas) son huecos calados.
  - Formas simples, que se leen pequeñas.
- **El tema** es el de un aventurero de un mundo medieval y de fantasia:
  armadura, cuero, metal, blasones. **Nada que se lea como un objeto de hoy**:
  el bolso de mano que tenia el Bolso fue justo el error que la origino.
- **Como se hacen** (los equipables, `client/src/equip-icons.ts`):
  - SVG en una caja de 24 × 24, rellenos con `currentColor`;
  - los calados con `fill-rule: evenodd`, que vive en el CSS;
  - lo simetrico (las hombreras, las grebas) se dibuja una vez y se espeja.
- **Lectura del agente, *por confirmar***: vale para **todo icono del
  juego**, no solo para los equipables.
- **Lo que hoy no la cumple**: los iconos de trazo de los botones
  (`client/index.html`). Algunos son de manejo, no de mundo, y puede que no
  deban cambiar; eso lo decide el autor.
  - USAR (una mano abierta);
  - ATAQUE (`#action`);
  - MODO, barrido y preciso (un tajo y una mirilla, `#modeTouch`, `#modeBar`);
  - ENTRADA, mira y toque (una mano que toca, `#inputMode`);
  - la vista en perspectiva (`#proj`) y la informacion (`#hudToggle`);
  - OTROS (tres barras);
  - INVENTARIO (la «mochila de explorador» de trazo de `docs/controles.md`,
    `#invOpen`);
  - los anillos de hambre (cubiertos) y salud (un corazon).
- **Aplicada**: los catorce equipables (2026-10-04).
