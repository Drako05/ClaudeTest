#!/usr/bin/env bash
# Lleva el arbol de trabajo TAL CUAL —cambios sin commit incluidos— a la rama
# `pruebas`, donde la CI corre entera y las mutaciones de la ronda en paralelo
# (decision del autor, 2026-10-02). Lo que sale verde ahi se lleva a `main`;
# a `main` no se empuja para probar, porque empujar a `main` publica el juego.
#
#   tools/a-pruebas.sh "que se prueba"
#
# No toca ni el indice, ni la rama en que se esta, ni `main`: hace un commit
# del arbol con un indice temporal, encima de la punta de `origin/pruebas`
# (avance rapido, nunca hace falta forzar) y lo empuja. Imprime su SHA, que es
# lo que se busca despues en la CI. Antes comprueba lo barato, para no gastar
# una tanda de CI en una errata.
set -euo pipefail
cd "$(dirname "$0")/.."

motivo="${1:-pruebas}"

# Lo barato primero: la lista de mutaciones aplica y las herramientas parsean.
node tools/mutar.mjs --comprobar
for f in tools/*.mjs; do node --check "$f"; done

git fetch -q origin pruebas 2>/dev/null || true
if git rev-parse -q --verify origin/pruebas >/dev/null; then
  padre=$(git rev-parse origin/pruebas)
else
  padre=$(git rev-parse HEAD)
fi

indice=$(mktemp)
trap 'rm -f "$indice"' EXIT
cp "$(git rev-parse --git-path index)" "$indice"
GIT_INDEX_FILE="$indice" git add -A
arbol=$(GIT_INDEX_FILE="$indice" git write-tree)

# Las lineas de atribucion de la sesion que empuja, si las hay (cambian en
# cada sesion, asi que no viven aqui): FIRMA="Co-Authored-By: …".
mensaje="pruebas: ${motivo}

Arbol de trabajo sobre $(git rev-parse --short HEAD) ($(git rev-parse --abbrev-ref HEAD)), para verificarlo
en la CI antes de llevarlo a main.${FIRMA:+

$FIRMA}"
sha=$(git commit-tree "$arbol" -p "$padre" -m "$mensaje")

for intento in 1 2 3 4; do
  if git push -q origin "$sha:refs/heads/pruebas"; then
    echo "pruebas <- $sha"
    exit 0
  fi
  sleep $((2 ** intento))
done
echo "no se pudo empujar a pruebas" >&2
exit 1
