#!/usr/bin/env bash
set -euo pipefail
project_root="$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd -- "$project_root"
code_only=0
if [[ ${1:-} == --solo-codigo ]]; then code_only=1
elif [[ $# -gt 0 ]]; then printf 'Uso: bash PREPARAR-EQUIPO.sh [--solo-codigo]\n'; exit 1; fi
[[ $(uname -s) == Linux ]] || { printf 'Este preparador es para Linux. En Windows usa PREPARAR-EQUIPO.cmd.\n'; exit 1; }
[[ $EUID -ne 0 ]] || { printf 'Ejecuta este archivo como usuario normal, sin sudo. Solo las dependencias pueden pedir tu contraseña.\n'; exit 1; }

missing=()
for tool in git gh python3; do command -v "$tool" >/dev/null 2>&1 || missing+=("$tool"); done
if ((${#missing[@]})); then
  if command -v apt-get >/dev/null 2>&1 && command -v sudo >/dev/null 2>&1; then
    printf 'Se instalarán las herramientas que faltan: %s\n' "${missing[*]}"
    sudo apt-get update
    sudo apt-get install -y "${missing[@]}"
  else
    printf 'Instala estas herramientas con el gestor de tu distribución y vuelve a ejecutar: %s\n' "${missing[*]}"; exit 1
  fi
fi
python3 -c 'import sys; assert sys.version_info >= (3,10), "Se necesita Python 3.10 o posterior."'
if ! gh auth status >/dev/null 2>&1; then
  printf 'Inicia sesión con tu propia cuenta GitHub para colaborar. No se copian sesiones de otra persona.\n'
  gh auth login --hostname github.com --git-protocol https --web
fi
gh auth setup-git

# The small downloadable kit is not a Git checkout. Clone beside it once.
if [[ ! -e .git ]]; then
  destination="$(dirname -- "$project_root")/WARLAND-Equipo"
  [[ ! -e $destination ]] || { printf 'Ya existe %s. Usa su PREPARAR-EQUIPO.sh; no se reemplaza.\n' "$destination"; exit 1; }
  git clone https://github.com/Dona12p4/warland-bedrock-equipo.git "$destination"
  if ((code_only)); then exec bash "$destination/PREPARAR-EQUIPO.sh" --solo-codigo
  else exec bash "$destination/PREPARAR-EQUIPO.sh"; fi
fi
python3 tools/team.py sync
if ! git config user.name >/dev/null; then git config user.name "$(gh api user --jq .login)"; fi
if ! git config user.email >/dev/null; then
  account_login="$(gh api user --jq .login)"
  account_id="$(gh api user --jq .id)"
  git config user.email "$account_id+$account_login@users.noreply.github.com"
fi
python3 tools/team.py hooks
python3 tools/team.py check

ubuntu_supported=0
if [[ -r /etc/os-release ]]; then
  # Standard system metadata; does not change shell paths or home directories.
  . /etc/os-release
  if [[ ${ID:-} == ubuntu && ${VERSION_ID%%.*} -ge 22 && $(uname -m) == x86_64 ]]; then ubuntu_supported=1; fi
fi
if ((code_only == 0 && ubuntu_supported == 1)); then
  if [[ ! -f .local/user.json ]]; then
    read -r -p 'Gamertag Xbox para tu laboratorio (Enter para configurarlo después): ' gamertag
    python3 - "$gamertag" <<'PY'
import json,sys
from pathlib import Path
Path('.local').mkdir(exist_ok=True)
Path('.local/user.json').write_text(json.dumps({'gamertag':sys.argv[1].strip(),'port':19152},ensure_ascii=False)+'\n',encoding='utf-8')
PY
  fi
  python3 tools/team.py setup-server
  python3 tools/team.py prepare-lab
  python3 tools/team.py smoke --seconds 15
else
  printf '\nCódigo y contexto preparados. BDS solo tiene soporte oficial para Ubuntu 22.04+ x86_64.\n'
  printf 'En otras distribuciones puedes programar y usar el catálogo; la prueba nativa queda pendiente.\n'
fi
printf '\nLISTO. Proyecto: %s\n' "$project_root"
printf 'Para abrir Codex con el contexto: bash ABRIR-CODEX.sh\n'
printf 'Catálogo: bash ABRIR-CATALOGO.sh\n'
printf 'Laboratorio: bash ACTUALIZAR-Y-PROBAR.sh (escribe stop para guardar y cerrar).\n'
printf 'El cliente gráfico oficial de Bedrock se prueba desde tu Windows del arranque dual. Usa un clon propio allí.\n'
printf 'No se montan particiones ni se comparten carpetas .local entre los dos sistemas.\n'
