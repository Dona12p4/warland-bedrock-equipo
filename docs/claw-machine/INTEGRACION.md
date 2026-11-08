# Guía para continuar e integrar

## Antes de modificar el prototipo

1. Leer `AGENTS.md`, `README.md`, `docs/ESTADO.md`, `baseline.json` y las decisiones actuales del repositorio de equipo.
2. Sincronizar según el flujo del equipo y crear rama `codex/...`; no trabajar directamente en `main`.
3. Leer este directorio completo y revisar el código vigente. El resumen de feedback no reemplaza a los archivos fuente.
4. Identificar estado del laboratorio y versiones reales de cliente, BDS y Script API. No actualizar packs actuales ni activar beta por conveniencia.

## Adaptación propuesta

La integración debe ser una tarea separada de la migración documental. Revisar primero la compatibilidad del script: el origen declara `@minecraft/server` 1.18.0 y engine mínimo 1.21.80, mientras que la base de equipo exige API estable 2.10.0 para packs nuevos. Adaptar y validar las llamadas usadas; no basta con cambiar el número en el manifiesto.

Antes de registrar los packs:

- asignar UUID nuevos y únicos a cada header, módulo y dependencia RP; actualizar todos los enlaces internos;
- comprobar que los identificadores `warland:*`, nombres de recursos, bloques e ítems no colisionen;
- mantener los archivos en `packs/behavior_packs/` y `packs/resource_packs/` solo cuando estén listos para formar parte de la delta activa;
- agregar cada pack exactamente una vez a `pack-order/` con la versión del manifiesto;
- documentar la decisión en `docs/DECISIONES.md` y una descripción de la mecánica/criatura en `catalogo/editorial.json`;
- pasar `python tools/team.py check`, `python -m unittest discover -s tests -v` y prueba BDS/cliente del laboratorio; comprobar la ficha y vista 3D del catálogo.

La migración actual **no ejecuta ninguno de estos pasos de instalación**. Al terminar validación, preparar una propuesta revisable. La instalación en el mundo oficial requiere una orden separada del propietario.

## No publicar

No incorporar `mcp_config.json`, archivos `.local`, bases de mundo, logs personales, capturas/vídeos originales, credenciales, sesiones ni el `.mcaddon` compilado. No extraer el atlas del prototipo al catálogo público mientras siga fuera de la base activa.
