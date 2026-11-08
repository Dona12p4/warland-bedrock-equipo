#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")"
if ! python3 tools/team.py sync; then
  printf 'No se sincronizó; se abrirá la copia local conservando tus cambios.\n'
fi
exec python3 tools/team.py catalog
