#!/usr/bin/env bash
set -euo pipefail
project_root="$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd -- "$project_root"
command -v codex >/dev/null 2>&1 || { printf 'No se encontró codex en esta terminal. Usa la terminal donde ya lo tienes instalado.\n'; exit 1; }
exec codex --cd "$project_root" "$@"
