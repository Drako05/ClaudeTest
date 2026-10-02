# Registro de escapes

Todo fallo que una auditoria **pudo ver y no vio**, y que aparecio despues (en
la misma auditoria al ejecutar, en otra tanda, en CI o jugando el autor).

Esto es lo que hace que la skill mejore. Cada entrada acaba en un **metodo**
que ahora vive en una lente (`lentes.md`) o en el escaner
(`scripts/escaner.mjs`). Un escape que no deja metodo se volvera a escapar.

Formato:

    ### N. Titulo corto (fecha)
    - **Que paso**:
    - **Por que se escapo**:
    - **Que lo habria visto**:
    - **Donde vive ahora**: lente X / escaner, categoria Y / principio Z

---

### 1. El humo aceptaba golpes solo hasta 2 bloques (2026-09-29)
- **Que paso**: el alcance subio a 2,5, pero `tools/smoke.mjs` seguia
  comprobando `d <= 2 + √½`. Un golpe legitimo a 2,3 lo habria hecho fallar.
  Paso semanas en verde por suerte: ningun objeto cayo en esa franja.
- **Por que se escapo**: la auditoria busco «2 bloques» en texto y el humo
  tenia el numero suelto, `2`, sin la palabra.
- **Que lo habria visto**: buscar cada valor cambiado **en su forma numerica**
  en tests y herramientas, y preguntar por cada literal si duplica una
  constante.
- **Donde vive ahora**: lente A, pasos 2 y 3.

### 2. «No se ve `#thumbPad`» no podia fallar (2026-09-29)
- **Que paso**: desde que cada boton del pulgar va fijado por su cuenta, el
  contenedor `#thumbPad` mide 0x0 y Playwright lo da siempre por no visible.
  El humo afirmaba «en PC no se ve el racimo», y pasaba se viera o no.
- **Por que se escapo**: la comprobacion se leyo, no se muto.
- **Que lo habria visto**: mostrar los botones en PC a proposito y ver si la
  comprobacion caia.
- **Donde vive ahora**: lente B (patron `isVisible` sobre 0x0), y el escaner
  vigila `isVisible('#thumbPad')` en `retirados.md`.

### 3. `npm run shots` no funcionaba (2026-09-29)
- **Que paso**: desde el cursor capturado (2026-09-28), el primer arrastre de
  `shots` capturaba el cursor y ya no podia pulsar el ojo. Se colgaba 30 s y
  moria.
- **Por que se escapo**: no corre en CI, y nadie la ejecuto en dos tandas.
- **Que lo habria visto**: ejecutar todas las herramientas en cada auditoria.
- **Donde vive ahora**: lente C, y el escaner lista las que la CI no ejecuta.

### 4. `npm run slash` abortaba (2026-09-29)
- **Que paso**: comprobaba que tocar revela los botones mirando `#thumbPad`,
  el mismo 0x0 de la entrada 2, y como nunca «se veia», abortaba.
- **Por que se escapo**: igual que la 3. Y era **la hermana** de la 2: el
  mismo fallo en otro sitio.
- **Que lo habria visto**: lente C, y el principio de la hermana: al arreglar
  la 2, buscar `#thumbPad` en todo el repo.
- **Donde vive ahora**: lente C, principio de la hermana (`SKILL.md`).

### 5. La doc de `aimZ` citaba `levelStep`, que no existe (2026-09-29)
- **Que paso**: `shared/index.ts` explicaba `aimZ` con la «segunda altura» del
  cono y una funcion retirada un dia antes.
- **Por que se escapo**: estaba en un comentario de un fichero que la tanda no
  toco.
- **Que lo habria visto**: comprobar que todo nombre citado entre comillas
  invertidas existe en el codigo vivo.
- **Donde vive ahora**: escaner, categoria «Nombres citados que no estan en el
  codigo vivo».

### 6. CSS pisado por especificidad (2026-09-29)
- **Que paso**: `#invPanel h2` (de un panel anterior) pisaba a `.invPage h2`,
  y la mitad de las propiedades de esta ultima no se aplicaban.
- **Por que se escapo**: los dos selectores tienen elemento, asi que un
  detector de CSS huerfano no lo ve.
- **Que lo habria visto**: buscar dos reglas para el mismo elemento.
- **Donde vive ahora**: lente D.

### 7. Los escombros sondeados, la hermana del slash (anterior, en `CLAUDE.md`)
- **Que paso**: se arreglo la comprobacion del slash para contar dibujados
  acumulados, y la de los escombros, una linea mas abajo, siguio sondeando la
  lista viva. Aguanto varias tandas hasta que el runner de CI perdio la moneda.
- **Por que se escapo**: se arreglo un caso y no se busco el mismo patron al
  lado.
- **Que lo habria visto**: el principio de la hermana.
- **Donde vive ahora**: principio de la hermana (`SKILL.md`), lente B.

### 8. El toque corto de 500 ms caia a suertes (2026-09-29)
- **Que paso**: la prueba de gestos llamaba «toque corto» a sostener el ojo
  500 ms, justo el umbral de pulsacion larga de Chrome. Fallaba unas veces si
  y otras no, y luego, con la barra a 0,5 s, casi siempre.
- **Por que se escapo**: un numero de la prueba coincidia con un limite de la
  plataforma, y nadie lo cruzo con los limites conocidos.
- **Que lo habria visto**: para cada umbral de tiempo de una prueba,
  preguntar a que distancia esta de un limite de la plataforma y de un umbral
  del juego.
- **Donde vive ahora**: lente B.

### 9. Los pestillos a mas de 60 Hz (anterior, en `CLAUDE.md`)
- **Que paso**: saltos y golpes se perdian en los frames sin tick; a 144 Hz,
  casi seis de cada diez. El humo no lo vio en meses porque el headless va a
  13 FPS y ahi todo frame lleva tick.
- **Por que se escapo**: se midio con el reloj del headless.
- **Que lo habria visto**: medir con el reloj fingido todo lo que dependa del
  ritmo de fotogramas.
- **Donde vive ahora**: lente G, y la pasada `highRefreshPass` del humo.

### 10. `CLAUDE.md` citaba `regrowTicksOf`, que no existe (2026-09-29)
- **Que paso**: «`regrowTicksOf` devuelve 0 para lo finito». Lo finito
  depende hoy de `lifeKindOf`, que devuelve `null` para lo inerte.
- **Por que se escapo**: la auditoria manual del mismo dia no lo vio; lo vio
  el escaner en su primera pasada.
- **Que lo habria visto**: el escaner, categoria de nombres citados.
- **Donde vive ahora**: escaner. (Con el vinieron tres mas del mismo tipo: la
  constante `HARVEST_REPEAT_TICKS` de un comentario de `main.ts`, un
  `client/input.ts` en un test y un razonamiento de «tres casillas» en
  `slash`.)

### 11. Esc cerraba el inventario y pausaba en un Chrome de verdad (2026-09-30)
- **Que paso**: `CLAUDE.md` afirmaba que, como el cursor lo habia soltado el
  juego, Chrome dejaba recapturarlo sin gesto al cerrar con Esc. No es asi: Esc
  no cuenta como gesto, la captura se rechaza y el juego se pausaba. Lo vio el
  autor jugando.
- **Por que se escapo**: el humo lo comprobaba en el headless, que **si**
  recaptura sin gesto. La comprobacion pasaba en un navegador que no se
  comporta como el del jugador, y la afirmacion del documento nunca se probo
  contra uno de verdad.
- **Que lo habria visto**: para cada comportamiento que dependa de una
  politica del navegador (gestos de usuario, captura del cursor, pantalla
  completa, audio), preguntar si el headless la aplica igual; si no, forzar el
  caso adverso a mano (el humo ahora hace que `requestPointerLock` falle antes
  del Esc).
- **Donde vive ahora**: lente B (patron: politicas del navegador que el
  headless no aplica).

### 12. «Con el inventario abierto no golpea» clicaba sobre el panel (2026-09-30)
- **Que paso**: la primera version de esa comprobacion clicaba en el centro
  de la pantalla, donde esta el panel del inventario: el clic nunca llegaba al
  mundo y la comprobacion pasaba con el arreglo quitado. Se vio al mutar.
- **Por que se escapo**: no se escapo del todo, la lente B la cazo; se anota
  porque el patron se repetira: **un clic de prueba que cae en otra cosa**.
- **Que lo habria visto**: antes de clicar, `elementFromPoint` en ese punto:
  tiene que ser lo que se quiere probar.
- **Donde vive ahora**: lente B.

### 13. La rueda contaba destellos en una ventana de tiempo (2026-09-30)
- **Que paso**: la comprobacion de la rueda observaba 800 ms que casillas se
  encendian al girar dos muescas y exigia exactamente dos distintas. En el
  runner de CI, lento, aun seguia encendida la de la muesca anterior: conto
  tres y la casilla `desktop` salio en rojo con el juego bien. El primer
  arreglo cambio «cuantas» por «cuales», **pero dejo la ventana**, y el humo
  entero en local, con la maquina cargada, fallo al reves: la ultima casilla
  se encendio despues de cerrarse los 800 ms.
- **Por que se escapo**: en local la maquina es rapida y la cuenta cuadraba
  siempre; y al arreglarlo se corrigio lo que se contaba, no la ventana, que
  era la causa.
- **Que lo habria visto**: el patron del #7 un paso mas alla: **mirar cosas
  efimeras dentro de una ventana de tiempo** depende de la velocidad de la
  maquina, cuente lo que cuente. El juego anota en un **acumulador** lo que
  hizo (`hotbarPasses`, las casillas encendidas en orden, apuntadas al
  encenderse) y el humo **espera a que llegue** y lo compara entero.
- **Donde vive ahora**: lente B.

### 14. Esc volvia a pausar, con el arreglo del #11 puesto (2026-10-01)
- **Que paso**: el arreglo del #11 suponia que Chrome **rechaza** recapturar
  el cursor al cerrar con Esc, y el humo lo probaba forzando ese rechazo. En
  el Chrome del autor el juego se seguia pausando. Hipotesis: la captura se
  **concede** (la tecla deja activacion) y el propio Esc de Chrome la suelta
  como si fuera el jugador. El headless no hace ninguna de las dos cosas.
- **Por que se escapo**: se forzo **un** caso adverso, el que se supuso, y la
  politica del navegador tiene mas de uno. Probar que el juego aguanta que la
  API falle no dice nada de lo que pasa si sale bien y luego se deshace.
- **Que lo habria visto**: no buscar el caso adverso bueno, sino **no pedir**
  algo sujeto a politicas del navegador desde un contexto dudoso (un Esc). La
  prueba espia la API y exige **cero llamadas**: eso vale para todos los
  casos a la vez.
- **Donde vive ahora**: lente B (politicas del navegador: mejor no pedir que
  forzar un fallo).

### 15. La rueda «de una en una» encendia dos (2026-10-01)
- **Que paso**: el arreglo del #13 media las casillas por las que pasaba el
  **destello** (`.pass`), una a una y en orden, y la comprobacion pasaba. Pero
  la luz de la seleccion (`.on`) seguia en la casilla vieja hasta el tick
  siguiente, asi que en pantalla habia dos. Lo vio el autor.
- **Por que se escapo**: se midio lo que se acababa de tocar, no lo que ve
  el jugador. El autor pidio «una sola encendida»: la medida tenia que contar
  **todo lo que se enciende**, sea cual sea la clase.
- **Que lo habria visto**: medir el requisito tal como lo dice el autor, con
  un invariante por fotograma (el maximo de casillas encendidas a la vez, de
  cualquier clase), no la pieza que se cambio.
- **Donde vive ahora**: lente B.

### 16. `slash` no corria en un repositorio recien clonado (2026-10-02)
- **Que paso**: el primer dia en la CI, `tools/slash.mjs` revento escribiendo
  `screenshots/slash.png`: la carpeta no existe en un clon limpio. En local
  siempre existia, porque el humo la crea, asi que corrida a mano «iba bien».
- **Por que se escapo**: la lente C manda correr a mano lo que la CI no
  corre, y se corria; pero en un arbol con restos de otras herramientas. Lo
  que depende del entorno no se ve corriendo en el entorno de siempre.
- **Que lo habria visto**: correrla en un clon limpio. Desde el 2026-10-02
  `slash` es casilla de la CI, que es un clon limpio en cada tanda.
- **Donde vive ahora**: lente C (patron: herramientas que solo funcionan en
  un arbol usado).

---

## Del proceso del agente

Fallos de como trabaja el agente, no del codigo. Tambien se repiten.

### P1. Una espera que se encontraba a si misma (2026-09-29)
- **Que paso**: para esperar al humo, el agente uso
  `until ! pgrep -f "tools/smoke.mjs"; do sleep 5; done`. `pgrep -f` busca en
  la linea de ordenes completa, y la del propio bucle contiene el mismo texto:
  no terminaba nunca. Una estuvo once horas dando vueltas.
- **Metodo**: para esperar a un proceso, se espera un **fichero de fin** que
  el proceso escribe al terminar (`... ; echo "fin: $?" >> log`) y se hace
  `until grep -q '^fin:' log`. Nunca se busca un proceso por su nombre desde
  una orden que contiene ese nombre.

### P2. Correr pruebas pesadas a la vez (2026-09-29)
- **Que paso**: el humo y los tests unitarios lanzados en paralelo cargaron
  la maquina, y el humo fallo por tiempos (fabricar no llego a los 1,5 s).
  Parecio un fallo del juego y no lo era.
- **Metodo**: las pruebas de navegador se corren solas. Si una falla por
  tiempo, se repite sola antes de investigar.

### P3. Comparar dos variantes con un build viejo (2026-10-01)
- **Que paso**: para medir el giro del barrido del TAP, el agente comparo
  «con giro» y «sin giro», pero habia restaurado el codigo tras una mutacion
  **sin recompilar**: las dos pasadas usaban el mismo `dist` sin giro, y la
  conclusion («el giro no ayuda») era falsa.
- **Metodo**: el humo y las sondas leen `packages/client/dist`, no el
  codigo. Cada variante que se mide va precedida de `npm run build` **en la
  misma orden**, y la sonda comprueba que la variante esta (un valor que solo
  existe con ella) antes de dar numeros.

### P4. Una mutacion que «cae» porque la prueba revienta (2026-10-02)
- **Que paso**: la mutacion del barrido (`frustumCulled`) salio en verde en
  su primera tanda de la CI: «cae». Pero `slash` habia reventado antes de
  medir nada (escape 16), no por el barrido. Se dio por buena una
  comprobacion sin verla morder.
- **Metodo**: `tools/mutar.mjs` solo cuenta CAE si la salida trae un `FALLO`
  (humo, gestos, barrido) o un `×`/`AssertionError` (vitest); en rojo sin
  eso es ERROR (`cayoDeVerdad`, con su test). Y al mirar una mutacion caida,
  se lee POR QUE cayo, no solo que cayo.
