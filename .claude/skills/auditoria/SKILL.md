---
name: auditoria
description: Auditoria de codigo y documentacion de Verdant — restos de modelos sustituidos, comprobaciones que no pueden fallar, herramientas podridas, codigo muerto, documentacion que contradice al codigo o a si misma, y logica rota en los bordes. Usala SIEMPRE al cerrar una tanda de cambios, y cuando el autor pida auditar, revisar, repasar o limpiar el codigo o la documentacion. Tiene un proceso fijo por fases, un escaner automatico y un registro de escapes que crece con cada fallo que se le paso.
---

# Auditoria de codigo y documentacion

Una auditoria de este proyecto **no se improvisa**: sigue estas fases en orden,
con las lentes de `references/lentes.md` y el escaner de `scripts/`. Al
terminar deja escrito que audito, hasta que commit, y que aprendio.

Se lanza **como minimo al cerrar cada tanda**, antes de dar la tanda por
entregada, y siempre que el autor lo pida.

## Principios

Salen de fallos reales (`references/escapes.md`), no de un manual.

1. **Leer no basta: hay que ejecutar y mutar.** La primera auditoria del
   2026-09-29 lo leyo todo, y lo mas hondo —una comprobacion con un numero
   viejo, dos que no podian fallar, dos herramientas podridas— solo salio al
   ejecutar.
2. **Una comprobacion que no puede fallar es peor que ninguna**, porque da una
   seguridad que no existe. Toda comprobacion nueva o tocada se ve caer una vez.
3. **Al arreglar algo, busca a su hermana.** El mismo fallo casi nunca esta en
   un solo sitio: `#thumbPad` estaba en el humo y en `slash`; el sondeo del
   slash estaba tambien en los escombros.
4. **«No encontre nada» no es «esta limpio».** Es «no lo encontre con estos
   metodos». Por eso las lentes son varias y la segunda pasada es obligatoria.
5. **Toda correccion se verifica**, igual que un cambio del juego.
6. **Lo que se escapa se convierte en metodo** (fase 6). Si no, se vuelve a
   escapar.
7. **La interpretacion es del autor.** La auditoria corrige lo que es falso;
   lo que es una decision (un numero de sensacion, un diseno) se le pregunta.
   `docs/el-libro-del-mundo.md` no se toca nunca.

## Fase 0 — Alcance

1. Lee `docs/pendiente.md` y busca **«Ultima auditoria»**: el commit desde el
   que se audita.
2. `git log --oneline <commit>..HEAD` y `git diff --stat <commit>..HEAD`: que
   cambio, en que ficheros.
3. Haz la **lista de decisiones de la tanda**: cada valor, tecla, nombre,
   modelo o texto que cambio o se retiro. Sale de los mensajes de commit, de
   las secciones «HECHO» de `pendiente.md` y del diff.
4. **Antes de buscar nada**, anade lo retirado a
   `references/retirados.md`, con su patron. Lo que no este ahi no lo busca
   nadie.

## Fase 1 — Barrido mecanico

```bash
node .claude/skills/auditoria/scripts/escaner.mjs --autoprueba   # primero: que muerda
node .claude/skills/auditoria/scripts/escaner.mjs
```

Si la autoprueba falla, **se arregla el escaner antes de seguir**: un escaner
que no ve su fallo sembrado no ve los de verdad.

El informe trae doce categorias:
- rutas y nombres citados que no existen;
- CSS sin elemento;
- ids que el JS pide y el HTML no tiene;
- exports que nadie usa;
- terminos retirados;
- scripts rotos;
- herramientas fuera de CI;
- pasadas del humo sin casilla en la matriz de CI;
- comentarios de documentacion sueltos (dos `/** */` seguidos);
- documentos de `docs/` que el indice de `CLAUDE.md` no nombra;
- ficheros que un modulo dice que «lo usan» y no lo importan.

**Cada aviso se juzga** y acaba en uno de tres sitios:
- **se corrige**;
- **va a `references/ignorar.md`**, con motivo y ambito «En:», si es
  estable y correcto (una API ajena, historia contada a proposito);
- **se deja tal cual** si esta en historia (`[historia]`) y la seccion lleva
  su «*Luego*».

## Fase 2 — Lentes

Una pasada por lente, en orden, cada una con su pregunta. El metodo detallado
y los patrones conocidos estan en `references/lentes.md`: **leelo entero cada
vez**, porque crece.

| Lente | Pregunta |
|---|---|
| A. Numeros y nombres | ¿Queda algun valor o nombre viejo, tambien como literal suelto? |
| B. Comprobaciones | ¿Puede fallar cada comprobacion nueva o tocada? Se muta y se ve caer. |
| C. Herramientas fuera de CI | ¿Siguen funcionando? Se ejecutan todas. |
| D. Codigo muerto | ¿Hay resultados, CSS o constantes que nadie usa? |
| E. Comentarios contra codigo | ¿Dice verdad cada frase de cada fichero tocado? |
| F. Documentos entre si | ¿Cuentan todos lo mismo? ¿La historia lleva su «*Luego*»? |
| G. Logica de lo nuevo | ¿Que pasa al reiniciar, pausar, en frames lentos, entre dos pasos del usuario? |
| H. Tests | ¿Dice cada test lo que afirma? ¿Pasa alguno por suerte? |
| I. Estructura | ¿Hay calculos duplicados o logica pura metida en el DOM? |
| J. Reglas del proyecto | ¿Se cumplen las reglas duras de `CLAUDE.md`? ¿Estan anotadas las deducciones? |

Las lentes C, F y J se aplican **al repo entero**; las demas, a lo que toco la
tanda y a todo lo que lo cita.

## Fase 3 — Segunda pasada, adversaria

Lo que falto la primera vez que se audito este repo.

1. **Lee el diff de la tanda linea a linea** con una sola pregunta: «¿que
   documento, comentario o prueba describe esto, y sigue siendo verdad?».
2. Para **cada correccion hecha en las fases 1 y 2**, busca su hermana: el
   mismo patron en todo el repo.
3. **Vuelve a pasar el escaner.** Las correcciones tambien meten restos.

## Fase 4 — Verificacion

Todo, aunque la auditoria «solo toque comentarios». Lo pesado va a la CI, en la
rama `pruebas` (`CLAUDE.md`, «Antes de dar algo por bueno»): en local solo lo
barato y lo que la CI no corre.

```bash
npm run typecheck && npm test
node tools/mutar.mjs --comprobar        # si la tanda tiene mutaciones
npm run shots                           # la unica herramienta de navegador fuera de CI
python3 -c "import yaml; [yaml.safe_load(open(f)) for f in ['.github/workflows/ci.yml', '.github/workflows/mutaciones.yml']]"   # si se toco CI
FIRMA="…" tools/a-pruebas.sh "auditoria"   # y esperar «CI completa» y «Mutaciones completas» en verde
```

Si una prueba de navegador hay que correrla aqui (la CI no esta, o se depura
una pasada), **de una en una**, nunca a la vez que otras (`escapes.md`, P2), y
esperando un fichero de fin, nunca el proceso por su nombre (P1):

```bash
( node tools/smoke.mjs > LOG 2>&1; echo "fin: $?" >> LOG )   # en segundo plano
until grep -q '^fin:' LOG; do sleep 10; done
```

## Fase 5 — Cierre

1. **Commit y push** de las correcciones, con un mensaje que las cuente. Aqui
   **si se espera la CI** hasta verla en verde, al reves que en el trabajo
   diario (`CLAUDE.md`): la auditoria cierra una tanda y no se da por cerrada
   con la CI en marcha.
2. En `docs/pendiente.md`:
   - actualiza **«Ultima auditoria: commit `<hash auditado>`, fecha»**, que
     es el punto de partida de la siguiente;
   - anade una seccion breve con lo encontrado, lo corregido y lo dejado a
     proposito, con su motivo.
3. **Informe al autor**, en su idioma y sin jerga: que se encontro, que se
   corrigio, que se dejo y por que, y **que decide el** (con opciones).

## Fase 6 — Aprender (obligatoria)

Esta fase es la que hace que la skill mejore. Se hace:
- al final de cada auditoria, por lo que salio en las fases 3 y 4 que las
  anteriores no vieron;
- y **cada vez que aparezca un fallo** —en otra tanda, en CI o jugando el
  autor— que una auditoria pudo haber visto.

Para cada uno:
1. Anadelo a `references/escapes.md` con su formato: que paso, por que se
   escapo, que lo habria visto y donde vive ahora ese metodo.
2. **Convierte el metodo en algo que se ejecute**:
   - si es mecanizable, al escaner: una categoria nueva, con su fallo sembrado
     en `--autoprueba`;
   - si es un termino o valor retirado, a `references/retirados.md`;
   - si es una forma de mirar, a su lente en `references/lentes.md`, con el
     patron concreto.
3. Si un fallo no encaja en ninguna lente, **crea una lente nueva**.

Una auditoria que termina sin haber anadido nada a la fase 6 tiene que poder
decir por que: «no se escapo nada» solo vale si la segunda pasada y la
verificacion no encontraron nada que la primera no viera.

## Ficheros de la skill

- `references/lentes.md`: el metodo de cada lente y sus patrones conocidos.
- `references/escapes.md`: el registro de escapes; es la historia de por que
  la skill es como es.
- `references/retirados.md`: los terminos que el escaner vigila.
- `references/ignorar.md`: los avisos ya juzgados como correctos, con ambito.
- `scripts/escaner.mjs`: el barrido mecanico y su autoprueba. Es Node puro,
  sin dependencias, para que corra en un contenedor recien creado.
