# Historia y estado de la máquina

## Propósito

La máquina es una atracción interactiva para Warland: el jugador inicia una partida, queda en una posición controlada frente a la máquina, mueve la garra, intenta tomar un peluche y puede salir para recuperar el control normal. Debe funcionar en Bedrock móvil y Windows, y los seis peluches también sirven como objetos decorativos colocables.

La especificación inicial describe una máquina de aproximadamente 2×2 bloques de base y cuatro bloques de alto, con panel metálico, cámara de cristal, marquesina de madera, mecanismo superior, garra y peluches pastel. El detalle funcional evolucionó con pruebas y feedback; cuando las instrucciones antiguas se contradicen, se debe respetar el código fuente actual y confirmar la intención con el dueño antes de revertir una decisión.

La distribución visual prevista es: panel de control en la base frontal; cámara transparente entre base y marquesina; riel, cable y tenazas en la cámara; peluches visibles en el suelo interior; paneles trasero y laterales acristalados; techo/base cerrados. La referencia estética es pixel art estilizado con roble cálido, metal gris, reflejos de cristal y acentos de color. En la especificación original, la base ocupa 16 px verticales, la cámara la franja central y la marquesina los 16 px superiores de un modelo aproximado de 32×32×64 px.

## Recorrido de feedbacks

- **Feedback inicial:** pidió la máquina completa, interacción, cámara, controles, probabilidad de premio y seis peluches. Las expectativas de leer directamente WASD/click no son una garantía de la API móvil; la solución posterior cambió a detección indirecta de movimiento.
- **#2:** las dimensiones excedían los límites prácticos de custom blocks. Se cambió a una entidad estática alineada a la cuadrícula, con colisión/colocación manejadas por la lógica. También pidió acabado de textura, cristales, riel, cable y pinza.
- **#3:** reportó que la UI/cámara tapaba la máquina y pidió eliminar overlays redundantes, completar riel/cable/tenazas, animaciones de movimiento/caída/agarre/palanca y textura completa.
- **#4:** después de que el riel se hizo visible, reportó el gancho invisible. Pidió revisar UV, alpha y escalado de huesos, reforzar madera/cristal/metal y orientar la cámara en primera persona con movimiento visible de palanca y botón.
- **#5:** reportó peluches internos invisibles. Pidió corregir UV/visibilidad, exponer movimiento mediante variables MoLang y secuenciar pulsación del botón, descenso/ascenso y apertura/cierre de la pinza.
- **#6:** reportó que los peluches solo aparecían de cerca y que móvil no movía la garra. Solicitó bounding box/visibilidad, controles touch y propiedades explícitas; la captura mostró el cuerpo metálico y marquesina ya legibles.
- **#7:** reportó regresión a textura gris y teletransporte al usar D-pad. Pidió restaurar las referencias de textura y congelar al jugador sin moverlo físicamente.
- **#8:** indicó que máquina y peluches ya eran visibles, pero la garra no respondía y la base/marquesina seguían demasiado grises. Pidió recuperar eventos de movimiento y mejorar la madera y los detalles del panel.
- **#9:** dijo que el aspecto general ya era excelente; pidió homogeneizar los seis modelos entre ítem, entidad interior y objeto colocado, además de mapear el D-pad móvil a X/Z.
- **#10:** corrigió el tamaño excesivo de los peluches interiores, la orientación frontal fija de cámara y el movimiento móvil del D-pad. Pidió mantener al jugador anclado y usar el desplazamiento detectado para mover la garra.
- **#11:** identificó el contrato necesario entre propiedades de entidad, variables Molang y animación de la garra. La implementación debe comprobar el nombre de hueso real y mantener alineados cliente, animación y geometría.

El archivo de recomendaciones del proyecto concreta ese contrato como lectura de `warland:claw_x`, `warland:claw_z` y `warland:claw_y` en `pre_animation`, seguida de la animación `animation.claw_machine.move_claw`. Es una hipótesis de causa que se debe contrastar con los manifiestos y archivos actuales antes de reemplazar el JSON; nombres de hueso, valores/unidades y API deben derivarse de las fuentes vigentes, no copiarse a ciegas.

La especificación completa original y los feedbacks con adjuntos no se copiaron al repositorio compartido para evitar trasladar chats o adjuntos personales. Este resumen conserva sus decisiones técnicas relevantes. Si se necesita recuperar un detalle exacto, se consulta la fuente privada de trabajo en lugar de asumirlo.

## Decisiones técnicas acumuladas

1. La máquina se representa como entidad estática colocable y no como un custom block gigante: el tamaño solicitado rebasa los límites de tamaño de bloques personalizados.
2. La colocación se alinea a la cuadrícula y la sesión controla cámara, permisos/movimiento y salida del jugador.
3. En móvil no se presupone acceso a los eventos físicos del joystick. La implementación observa el desplazamiento/velocidad durante la sesión, traduce la intención a los ejes de la garra y mantiene al jugador en el punto de juego.
4. La máquina y los peluches se conectan mediante identificadores y contratos de geometría, animación y propiedades; cambiar un nombre requiere seguirlo por todos los JSON y scripts.
5. Los peluches cuentan con modelos de entidad y modelos de objeto colocable; la textura y escala deben conservar lectura individual dentro del espacio limitado de la cámara.
6. El pack se encuentra en versión 1.0.9. Ese número describe el paquete de origen, no una versión aceptada por la toolchain del repositorio compartido.

## Estado migrado

El prototipo incluye los dos packs completos, seis modelos de peluches, modelo de la máquina, texturas, iconos, animaciones, controladores de render, scripts TS/JS y scripts Python de generación. La revisión de la iteración previa reportó las auditorías de UV/geometría/modelos sin errores ni advertencias y corrigió enlaces de animación/propiedades, así como la distancia de cámara y la sincronización de atlas. Esa evidencia no sustituye una prueba dentro de Minecraft.

### Pendiente para el equipo

- Comprobar que los UUID de encabezados, módulos y dependencia RP no colisionan con la base actual; generar UUID propios para los packs del equipo cuando se proponga su integración.
- Actualizar `@minecraft/server` desde 1.18.0 a la API estable fijada por `config/toolchain.json` (actualmente 2.10.0), adaptando llamadas y tipos y sin habilitar APIs beta.
- Revisar manifiestos, esquema de entidades/ítems/bloques, permisos de movimiento, cámara y eventos contra la versión real de cliente y BDS.
- Ejecutar `python tools/team.py check` y la suite estándar; preparar el laboratorio únicamente tras la sincronización requerida.
- Verificar que el jugador puede iniciar, mover, bajar/subir la garra, obtener o fallar el premio y salir sin quedarse anclado. Comprobar controles en móvil y Windows.
- Revisar en cliente las seis siluetas, cristal, cámara y animaciones; automatización JSON/UV no valida apariencia en Bedrock.
- Solo tras aprobación del propietario convertir la propuesta en packs de `packs/`, añadirlos a ambos `pack-order`, actualizar baseline/estado/decisiones y el catálogo.

## Seguridad de integración

El prototipo no se instala ni se registra por esta migración. No copiar la base `.mcaddon` encima del mundo compartido: las herramientas y contratos de la base del equipo son distintos, y su manifiesto declara Script API 1.18. La carpeta se conserva para análisis/adaptación. La incorporación a `packs/` es una propuesta futura y la instalación en mundo oficial una autorización aparte.
