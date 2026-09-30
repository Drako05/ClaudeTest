# Las lentes de la auditoria

Cada lente es una pasada con **una sola pregunta**. Mirar con todas a la vez es
mirar con ninguna: la auditoria del 2026-09-29 lo leyo todo de una vez, y lo mas
hondo solo salio al ejecutar y mutar.

Para cada lente: la pregunta, el metodo (lo que se hace, no lo que se piensa) y
los patrones que ya se sabe que existen (ver `escapes.md`).

Se aplican **a lo que toco la tanda** (fase 0) y a todo lo que lo cita. Las
lentes C, F y J se aplican siempre al repo entero, porque la podredumbre de lo
que nadie toco es justo lo que ninguna tanda mira.

---

## A. Numeros y nombres — ¿queda algun valor viejo?

**Metodo**
1. Lista cada valor que la tanda cambio: alcance, tiempos, rangos, tamanos,
   teclas, nombres de fichero, de funcion, de constante.
2. Busca el **valor viejo** en todo el repo: codigo, tests, `tools/`,
   documentacion, comentarios y el HTML. Busca tambien sus formas escritas («2
   bloques», «dos bloques», «2 s», «2000»).
3. Busca **literales que duplican una constante**: un test o una herramienta
   que escribe `2` donde el nucleo exporta `STRIKE_RANGE`. Si puede importarla,
   que la importe; si no (el humo es JS suelto), que el comentario lo diga y
   que la auditoria lo busque aqui.
4. Nombres que **mienten**: una variable `wheelZoom` cuando la rueda ya no hace
   zoom. Un nombre falso es documentacion falsa que ademas compila.
5. Anade lo retirado a `retirados.md` para que el escaner lo vigile siempre.

**Patrones conocidos**: el humo con alcance 2 cuando era 2,5 (`escapes.md` #1).

## B. Comprobaciones — ¿puede fallar?

**Metodo**
1. Lista cada comprobacion nueva o tocada: `check(...)` del humo y de los
   gestos, `expect` de los tests y guardas de las herramientas.
2. Para cada una, **rompe a proposito lo que afirma** y mirala caer. Vale
   comentar la linea, cambiar un numero o reintroducir el fallo. Revierte
   despues. Si no cae, **no comprueba nada**.
3. Si mutar es caro, al menos razona: ¿con que estado del juego saldria
   `false`? Si no encuentras ninguno, es una comprobacion de adorno.

**Patrones conocidos**:
- `isVisible` sobre un contenedor de 0x0, que siempre es «no visible», de
  modo que «no se ve» pasa siempre (#2).
- Sondear una lista efimera (efectos vivos) en vez de un acumulador de
  dibujados: pasa o falla por suerte (#7).
- **Mirar efimeros en una ventana de tiempo** (#13): que destellos o
  efectos hubo en 800 ms depende de la maquina, se cuente lo que se cuente.
  El juego anota lo que hizo en un acumulador y la prueba espera a que llegue.
- Umbrales de tiempo pegados a un limite de la plataforma: el toque largo de
  Chrome es 500 ms, y una prueba de «toque corto» de 500 ms cae a suertes (#8).
- Medir con el reloj del headless lo que depende del ritmo de fotogramas: a
  13 FPS todo frame lleva tick y el fallo de 144 Hz no existe (#9).
- Comprobaciones que dependen de donde quedo el jugador: se hacen desde el
  nacimiento o desde un sitio buscado con `?x=&y=`.
- **Politicas del navegador que el headless no aplica** (#11): recapturar el
  cursor sin gesto, pantalla completa, audio. Una comprobacion que pasa en
  headless puede ser falsa en el Chrome del jugador: se fuerza el caso adverso
  a mano (hacer que la API falle) y se mira que el juego lo aguante.
- **Un clic de prueba que cae en otra cosa** (#12): antes de clicar para
  probar algo, `elementFromPoint` en ese punto tiene que ser lo que se prueba.

## C. Herramientas fuera de CI — ¿siguen funcionando?

**Metodo**
1. El escaner lista las herramientas que la CI no ejecuta.
2. **Se ejecutan todas**: `npm run shots`, `npm run slash` y
   `npx vite-node tools/analyze-world.ts`. La podredumbre solo la ve la
   ejecucion: una herramienta que nadie corre deja de funcionar sin que nadie
   se entere.
3. Si una ha dejado de funcionar, se arregla, y se anota por que se pudrio:
   suele ser un cambio de mandos o de maquetacion que no la tuvo en cuenta.

**Patrones conocidos**: `shots` era de antes del cursor capturado, y `slash`
miraba `#thumbPad` de 0x0 (#3, #4).

## D. Codigo muerto — ¿hay algo que nadie usa?

**Metodo**
1. El escaner da los exports que nadie usa y los CSS sin elemento.
2. A mano:
   - **Resultados que nadie consume**: campos del estado que se escriben y no
     se leen (`lastBlocked` tras quitar los avisos).
   - **CSS pisado por especificidad**: dos reglas para el mismo elemento, una
     con `#id` y otra con `.clase`; la de menos peso tiene propiedades
     muertas.
   - Constantes y parametros sin uso: `tsc` no avisa si `noUnused*` esta
     apagado.
3. No todo lo sin uso sobra. Lo que se deja a proposito se dice en el informe,
   con su motivo.

**Patrones conocidos**: `#invPanel h2` pisaba a `.invPage h2` (#6).

## E. Comentarios contra codigo — ¿dice verdad cada frase?

**Metodo**
1. Para cada fichero tocado, lee su **cabecera** y cada comentario de bloque,
   frase a frase.
2. Cada afirmacion con un numero, un nombre, una tecla o un «siempre/nunca»
   se verifica contra el codigo. El escaner ya mira los nombres entre comillas
   invertidas; esta lente mira los que no las llevan («el inventario no suelta
   el cursor»).
3. Los comentarios de **por que** son los que mas se pudren: la razon se queda
   mientras el codigo cambia (la razon del rellano 3x3 era el modelo de
   casillas).

**Patrones conocidos**: `aimZ` citaba `levelStep` (#5), y la cabecera de
`hud.ts` decia que llevaba el inventario.

## F. Documentacion contra documentacion — ¿cuentan todas lo mismo?

**Metodo**
1. Toma cada decision de la tanda y encuentrala en cada documento que la
   cuente: `CLAUDE.md`, `README.md`, `docs/pendiente.md`, `docs/leyes.md`,
   `docs/isometrico.md` y la ayuda del HTML. Deben decir lo mismo.
2. `docs/pendiente.md`, «Esperando tu juicio»: cada fila **sigue existiendo en
   el juego**. Una deduccion sobre un boton que ya no existe no espera el
   juicio de nadie.
3. Secciones de historia («HECHO», «SUSTITUIDO»): si el presente las
   contradice, llevan su «*Luego*: …» en una linea. La historia no se reescribe,
   se anota.
4. `docs/leyes.md`: el estado de cada ley y las «Deudas conocidas» siguen
   siendo ciertos.

**Patrones conocidos**: `leyes.md` decia «el relieve no existe» semanas
despues de existir.

## G. Logica de lo nuevo — ¿que pasa en los bordes?

**Metodo**: para cada caracteristica nueva, recorre esta lista y responde con
el codigo delante.
- **Ciclo de vida**: al reiniciar o cambiar de mundo, al morir, al pausar y
  reanudar, al abrir y cerrar paneles. ¿Que estado sobrevive y no deberia?
  (El registro de objetos tenia que olvidar el inventario al reiniciar, o
  escribiria «-N».)
- **Varios pasos en un frame**: el bucle corre varios ticks seguidos en un
  frame lento. ¿Se duplica o se pierde algo?
- **Ritmo de fotogramas**: ¿depende de que haya tick en el frame? Se mide
  con el reloj fingido (`highRefreshPass`), nunca con el del headless.
- **Entre dos pasos del usuario**: confirmaciones, arrastres y esperas. ¿Que
  pasa si el estado cambia en medio? (Tirar comprueba que la casilla sigue
  teniendo lo mismo al confirmar.)
- **Unidades**: bloques contra pixeles, ticks contra segundos, grados
  verticales contra horizontales, tiempo escalado contra real.
- **Entradas raras**: rueda de trackpad contra la de raton, toque contra raton
  en el mismo boton, teclas con el cursor capturado o sin capturar.

## H. Tests — ¿dicen lo que afirman?

**Metodo**
1. El nombre de cada test tocado describe lo que de verdad afirma («avisa de
   inventario lleno» cuando ya no hay aviso).
2. Tests que pasan por suerte: dependen del paisaje, del tiempo real o del
   orden.
3. Cada numero del autor tiene un test que lo fija. Cada deduccion del agente
   tiene un test que ata su relacion, no solo su valor.

## I. Estructura — ¿esta cada cosa en su sitio?

**Metodo**
1. **El mismo calculo en dos sitios**: busca la logica nueva en el resto del
   repo. El registro de objetos y el del panel de desarrollo hacian la misma
   cuenta y acabaron compartiendola.
2. Ficheros que crecen sin orden: `main.ts` y la sonda `__verdant`. Partirlos
   solo si hay ganancia; lo lineal y comentado puede quedarse largo.
3. Logica que deberia ser pura (y medible en Node) metida en DOM: movimiento,
   tiempos o colas. Patron del proyecto: `effects.ts` puro y `effects-view.ts`
   dibuja.
4. `npm run build` avisa de ciclos de importacion solo en el bundle: lo cubre
   el humo (ver `CLAUDE.md`, «Ciclos de importacion»).

## J. Reglas del proyecto — ¿se cumplen las de `CLAUDE.md`?

**Metodo**
- `packages/sim` sin DOM ni `Math.random` (lo afirma `tests/purity.test.ts`).
- Las mutaciones del mundo, por el overlay (regla 4).
- `docs/el-libro-del-mundo.md` intacto: `git diff` sobre el no muestra nada.
- `docs/leyes.md` al dia si la tanda acerco una ley.
- Toda **deduccion del agente** de la tanda (numeros, tiempos, textos, iconos)
  esta en «Esperando tu juicio» de `docs/pendiente.md`, y nada del autor esta
  marcado como deduccion.
- La CI corre **todas** las pasadas del humo: la matriz de `ci.yml` tiene una
  casilla por pasada de `tools/smoke.mjs` mas los gestos (el escaner lo
  cruza), y el humo sale en rojo si se le pide una pasada que no existe.
- La CI sigue validando lo que dice que valida: el YAML parsea y cada paso
  apunta a un fichero que existe (el escaner mira lo segundo).
