#!/usr/bin/env bash
# Espera a que terminen las tandas de la CI de un commit y dice como acabaron:
# la conclusion y lo que tardo cada una y, si alguna sale en rojo, sus trabajos
# fallidos con su `job_id`, que es lo que se le pide a `get_job_logs` (MCP)
# con `tail_lines` ~40. Los logs no se bajan aqui: GitHub los sirve desde otro
# dominio, y el `gh` de la sesion solo habla con api.github.com.
#
#   tools/esperar-ci.sh <sha>      # el que imprime tools/a-pruebas.sh
#
# El agente lo lanza en segundo plano y la sesion despierta sola al acabar.
# Sustituye al temporizador fijo de 5 minutos (2026-10-10), que despertaba a
# ciegas: antes de tiempo y a mirar otra vez, o minutos despues de acabar.
#
# Sale 0 si todo salio verde, 1 si algo salio en rojo o cancelado, y 2 si no
# termina en una hora.
set -euo pipefail
cd "$(dirname "$0")/.."

sha=$(git rev-parse "${1:?falta el sha del commit}")
# El slug del remoto, venga por https o por el proxy de la sesion (/git/...).
slug=$(git remote get-url origin | sed -E 's#^.*(github\.com[:/]|/git/)##; s#\.git$##')

limite=$((SECONDS + 3600))
while :; do
  # Una linea por tanda: nombre, estado, conclusion, id, inicio y fin.
  tandas=$(gh api "repos/$slug/actions/runs?head_sha=$sha&per_page=20" \
    --jq '.workflow_runs[] | [.name, .status, (.conclusion // "-"), .id, .run_started_at, .updated_at] | @tsv')
  # Hecho cuando hay al menos una tanda y ninguna sigue en marcha. Las del
  # mismo push nacen juntas, asi que no se da por acabada a medio crear.
  if [ -n "$tandas" ] && ! grep -qvP '^[^\t]*\tcompleted\t' <<<"$tandas"; then
    break
  fi
  if [ "$SECONDS" -ge "$limite" ]; then
    echo "SIN TERMINAR tras una hora:"
    printf '%s\n' "$tandas" | cut -f1-3
    exit 2
  fi
  sleep 30
done

verde=1
while IFS=$'\t' read -r nombre _ conclusion id inicio fin; do
  segundos=$(($(date -d "$fin" +%s) - $(date -d "$inicio" +%s)))
  printf '%-28s %-10s %3d min %02d s  (run %s)\n' "$nombre" "$conclusion" $((segundos / 60)) $((segundos % 60)) "$id"
  if [ "$conclusion" != success ] && [ "$conclusion" != skipped ]; then
    verde=0
    gh api "repos/$slug/actions/runs/$id/jobs?per_page=100" \
      --jq '.jobs[] | select(.conclusion == "failure" or .conclusion == "cancelled") | "    \(.conclusion): \(.name) (job \(.id))"'
  fi
done <<<"$tandas"

[ "$verde" = 1 ] && echo "TODO EN VERDE" && exit 0
echo "HAY ROJO"
exit 1
