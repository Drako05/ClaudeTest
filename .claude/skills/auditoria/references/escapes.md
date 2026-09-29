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
