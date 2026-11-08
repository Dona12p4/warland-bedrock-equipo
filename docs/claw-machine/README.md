# Prototipo: máquina de peluches

Esta carpeta conserva el estado de desarrollo de la máquina de peluches que se trabajó en el proyecto Warland 3. Es una migración de prototipo para continuar su desarrollo junto al equipo; **no forma parte de los 25 packs instalados**, no está añadida a `pack-order/` y no debe instalarse en el mundo oficial.

## Mapa de archivos

- [`prototypes/claw-machine/behavior_packs/`](../../prototypes/claw-machine/behavior_packs/): entidad/bloque, ítems, loot tables, manifiesto y lógica JavaScript/TypeScript.
- [`prototypes/claw-machine/resource_packs/`](../../prototypes/claw-machine/resource_packs/): geometrías Bedrock, entidades cliente, animaciones, render controllers, atlas y texturas.
- [`prototypes/claw-machine/models_src/`](../../prototypes/claw-machine/models_src/): siete modelos Blockbench editables y scripts de generación de texturas/activos, incluido `gen_peluche_textures.py`. `build_mcaddon.py` reproduce el paquete local de pruebas; el binario generado no se publica aquí.
- [`HISTORIA-Y-ESTADO.md`](HISTORIA-Y-ESTADO.md): requisitos, feedbacks, decisiones y situación actual.
- [`MODELADO-Y-SKILL.md`](MODELADO-Y-SKILL.md): cómo se aplicó `entertainment-machine-models` y cómo mantener coherentes los modelos.
- [`INTEGRACION.md`](INTEGRACION.md): pasos para revisar compatibilidad antes de proponer integración.

## Fuente y alcance

El origen de esta migración es el proyecto de trabajo Warland 3 y sus activos vigentes en `warland3-addon/`. Se preserva el árbol de fuentes del addon como estaba al migrar; no se mezcló con los packs de la base oficial ni se reescribieron sus UUID, identificadores o dependencias. Los adjuntos de feedback, capturas/vídeos originales, configuraciones MCP y el archivo de distribución `.mcaddon` no se incluyen. El archivo distribuible se debe regenerar desde las fuentes después de validar la toolchain y decidir los UUID definitivos.

Los modelos y recursos incluidos son parte del prototipo. No implican autorización para copiar activos de terceros; se siguieron principios visuales generales de pixel art estilizado y no se deben extraer ni trazar recursos de *Actions & Stuff*.

## Estado resumido

El paquete fuente está en versión 1.0.11 y contiene la máquina, seis peluches, sus representaciones de entidad/bloque y los cambios de lógica/animación acumulados tras los feedbacks. La revisión previa de los modelos/UV reportó cero incidencias automatizadas en los activos revisados, pero eso no equivale a una validación del cliente Bedrock y BDS del repositorio del equipo. Antes de convertirlo en pack del equipo hay que actualizar la API de Script a la política vigente, comprobar colisiones de identificadores, asignar UUID nuevos, ejecutar las pruebas del repositorio y probarlo visualmente en el laboratorio.
