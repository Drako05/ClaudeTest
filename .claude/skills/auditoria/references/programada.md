# La auditoria programada

La lanza una tarea programada de Claude Code en la nube, **martes y sabado a
las 3:00 de Bogota** (`CRON_TZ=America/Bogota 0 3 * * 2,6`), con una sesion
nueva por disparo y el prompt «Lee y sigue
`.claude/skills/auditoria/references/programada.md`». Decision del autor,
2026-10-24: la auditoria corre sola y **va directo a `main` si sale verde**,
sin esperar a que el la mire. A la misma hora corre la CI completa en `main`
(`ci.yml`, `schedule`).

Nadie la esta mirando mientras corre: no hay a quien preguntar. Por eso todo
lo que sea una decision se escribe y no se toca.

1. **Arranque.** Lo de `CLAUDE.md`, «Arranque de una sesion nueva», para la
   nube. Lee `docs/pendiente.md` y busca **«Ultima auditoria»**. Si
   `git log --oneline <ese commit>..origin/main` no da nada, **termina sin
   cambios**: ni commit, ni push, ni ramas, y el resumen lo dice en una linea.
2. **Si hay commits, `/auditoria` desde ese commit**, con su proceso entero
   (`SKILL.md`, fases 0 a 6). Lo que cambia lo que hace el juego **no se
   toca**: va a «Para ti» en la seccion de la auditoria, como siempre.
3. **Se verifica en `pruebas`**: `tools/a-pruebas.sh "auditoria programada"` y
   `tools/esperar-ci.sh <sha>`, esperando «CI completa» y «Mutaciones
   completas».
   - **Verde**: commit y push a `main`.
   - **Rojo**: **un solo intento de arreglo**, y otra vez al 3. Si sigue en
     rojo, **`main` no se toca**: el resumen de la sesion dice que fallo, en
     que trabajo y con que linea, y no se actualiza «Ultima auditoria».
   - Un rojo que ya esta anotado como fallo suelto en `docs/pendiente.md` (el
     del registro, por ejemplo) se relanza una vez antes de gastar el intento.
4. **`FIRMA`**, con las lineas de atribucion de esa sesion, en `a-pruebas.sh`
   y en el commit a `main`.
5. **El resumen final**, en castellano y sin jerga, porque llega al movil y al
   correo del autor: si habia algo que auditar, que se corrigio, que espera su
   decision, y si llego a `main` o por que no.
