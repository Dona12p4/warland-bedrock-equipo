# Modelado, texturas y uso de `entertainment-machine-models`

## Rol de la skill en este proyecto

La skill `entertainment-machine-models` quedó incorporada al catálogo local de herramientas para las tareas de modelado, texturizado, animación y auditoría de máquinas Bedrock. Su ruta local actual en el entorno de origen es `~/.codex/skills/entertainment-machine-models/SKILL.md`; el repositorio conserva aquí el método aplicado y el contexto propio de la máquina, no una copia de la configuración privada del agente.

La regla de alcance principal es trabajar solamente en las piezas que pidió el usuario, manteniendo gameplay fuera de una tarea artística y viceversa salvo instrucción expresa. La skill pide leer especificación/feedback/evidencia, auditar antes de editar, usar los modelos Blockbench como fuente de geometría, propagar nombres y contratos a exportaciones Bedrock, generar texturas limpias y volver a auditar. La revisión visual dentro del cliente sigue siendo obligatoria para afirmar calidad de juego.

## Criterios visuales y técnicos aplicados

- Siluetas de voxel legibles, volúmenes escalonados y paleta cálida para madera, metal frío, cristal con reflejos y colores pastel para peluches.
- Los seis peluches mantienen identidad por silueta: conejo, gato, perro, hámster, caballo y rata. No añadir variantes sin pedido.
- La caja de cristal usa paneles delgados, evitando un cubo opaco o transparente que oculte el interior.
- Partes animadas separadas en huesos con pivotes significativos; nombres estables entre `.bbmodel`, `.geo.json`, animación, entidad cliente y script.
- Texturas pixel art con caras UV dentro de atlas, sin caras accidentales vacías, negras o transparentes. Revisar atlas y densidad a escala Bedrock; no asumir que un atlas grande significa más calidad.
- Los scripts `models_src/gen_claw_machine_texture.py`, `models_src/gen_plush_assets.py` y `models_src/gen_peluche_textures.py` son parte del flujo reproducible de generación. Si se edita a mano una textura generada, documentar el cambio o se perderá al regenerar.

## Fuentes de verdad y salidas

1. Editar el `.bbmodel` correspondiente en `models_src/` (fuente de autoría).
2. Exportar/actualizar la geometría de entidad en `resource_packs/models/entity/` y la representación colocable en `resource_packs/models/blocks/` donde aplique.
3. Actualizar atlas PNG e índices (`terrain_texture.json`, `item_texture.json`) sin romper referencias.
4. Mantener animaciones, controladores y `entity/*.entity.json` coherentes con huesos y propiedades reales.
5. Auditar UV, caras, huesos, límites de geometría y referencias cruzadas; revisar visualmente en Blockbench y Minecraft.
6. Incrementar versión de ambos manifests al reempaquetar y regenerar el artefacto solo cuando sea solicitado.

## Contratos de animación

Las animaciones de `resource_packs/animations/claw_machine.animation.json` leen directamente `warland:claw_x` y `warland:claw_z` mediante `query.property` y animan el hueso `machine_claw`; el controlador selecciona los estados de apertura, cierre, ascenso y retorno. El nombre del hueso debe coincidir exactamente con la geometría exportada. En el prototipo, revisar especialmente el mapeo de `warland:claw_x` y `warland:claw_z` a expresiones Molang y la conversión a unidades de modelo. El valor y sentido de cada eje se debe calibrar en juego: izquierda debe ser izquierda desde el punto de vista del jugador.

No copiar literalmente sugerencias de feedback que usen nombres de hueso o API supuestos. Primero inspeccionar la geometría y script vigentes; después corregir un contrato completo con evidencia.

## Evidencia y límites

La iteración anterior reportó cero errores/advertencias en las auditorías UV/geometría para los activos actualizados. Las auditorías automatizadas detectan daños de datos y referencias, pero no confirman iluminación, legibilidad, transparencia efectiva ni calidad de movimiento en cliente. Las capturas de feedback quedan fuera de este repositorio; el resumen de requisitos está en `HISTORIA-Y-ESTADO.md`.
