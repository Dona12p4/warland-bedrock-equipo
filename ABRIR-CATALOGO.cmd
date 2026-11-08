@echo off
cd /d "%~dp0"
python tools\team.py sync
if errorlevel 1 (
  echo No se pudo sincronizar. Se abrira la base local; revisa los cambios pendientes.
)
python tools\team.py catalog
if errorlevel 1 pause
