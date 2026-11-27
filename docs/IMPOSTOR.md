# El Impostor Â· prototipo 0.3.2

Al aparecer, `warland:impostor` consulta los jugadores conectados y elige uno.
Muestra su nombre exacto encima de la cabeza. Prefiere participantes de su misma
dimension y excluye espectadores; si no hay nadie, espera hasta que alguien entre.
La identidad elegida se conserva al descargar chunks, desconectarse el jugador
original y reiniciar el servidor. El mob sigue siendo una criatura, nunca una
cuenta de jugador: no entra en la lista de jugadores ni recibe Warcoins.

La apariencia es Steve o Alex, con sus texturas oficiales y brazos correspondientes.
Es la alternativa autorizada el 26/11/2026. NO copia una skin personalizada ni
puede saber si el jugador original esta usando Steve o Alex. La eleccion de apariencia
es estable para cada nombre; no cambia aleatoriamente cada vez que se recarga.

Pasea y alterna carreras, descansos e inspecciones. Al correr encadena de 6 a 10 saltos: aterriza antes de cada impulso y vuelve a caminar al completar la tanda. No hay un temporizador de espera entre saltos. Requiere avance, espacio libre y suelo de llegada; si la ruta esta bloqueada no fuerza un salto. La cabeza queda alineada con el cuerpo al caminar, correr y saltar. Solo mira alrededor de forma independiente estando quieto. El impulso no teletransporta ni modifica bloques.
Tiene 20 puntos de vida, sin ataques, botin, experiencia ni aparicion natural.
El nombre se asigna sin mensajes globales. Solo se procesan entidades pendientes
en lotes de hasta 16 cada 40 ticks. La eleccion de comportamiento recorre como maximo 16 entidades cargadas cada cinco ticks, por turnos. Solo las tandas activas comprueban el apoyo cada tick, hasta 16 por turno; los raycasts se hacen al intentar despegar, nunca en cada tick de vuelo. No recorre chunks ni busca jugadores continuamente.

## Prueba

Activar BP y RP en una copia de laboratorio, con Minecraft Bedrock 1.26.60 o superior.
No requiere un experimento adicional: su Script API es estable 2.10.0.

```
/give @s warland:impostor_spawn_egg
/summon warland:impostor
```

Si solo hay un participante conectado, tomara su nombre. Con varios, puede elegir
cualquiera (priorizando la dimension). Para seleccionar un nombre concreto, DanielGamerSC
o Hatsudemiku pueden usar, cerca del impostor (16 bloques):

```
/scriptevent warland:impostor Nombre Exacto Del Jugador
```

No se aceptan nombres de personas desconectadas. El comando cambia el impostor mas
cercano, nunca el jugador original. No modifica mensajes de chat, inventarios,
permisos, cuentas, equipos ni datos economicos.

## Compatibilidad de skins

La API estable Player no expone la textura del jugador. `minecraft:skin_id` selecciona
texturas previamente preparadas, no descarga la skin de una cuenta. La API experimental
GameTest ofrece `getPlayerSkin` / `setSkin` para jugadores simulados, pero el contrato
PlayerSkinData solo documenta piezas Persona, color y brazos; no el PNG de skins importadas.
No se incorporo GameTest al complemento entregable ni se cambio el servidor.

- https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/player
- https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server-gametest/playerskindata
- https://learn.microsoft.com/en-us/minecraft/creator/reference/content/entityreference/examples/entitycomponents/minecraftcomponent_skin_id

## Estado

Instalado el 27/11/2026 en el oficial WARLAND - Movil 3-4 GB - COPIA (Importado), con respaldo completo verificado. BP/RP 0.3.2 registrados en el mundo y Shared de Bedrock. Se conservan los otros 25 paquetes, datos de mundo e inventarios. No se agregan experimentos. Las revisiones siguientes son antecedentes historicos; manda este estado actual.
Las pruebas GameTest son exclusivas del laboratorio y no se empaquetan en el addon.
Los resultados nativos se guardan en `.local/impostor-native.json`; la revision
visual en Minecraft y en Android se informa por separado, nunca se infiere de BDS.

Validacion 26/11/2026: 22 comprobaciones nativas en BDS 1.26.60.6 con los 27 paquetes
de esta rama, incluidos jugadores simulados conectados, nombres con espacios,
exclusion de espectadores, control administrativo, movimiento y reinicio. Ambas
pasadas cerraron con Quit correctly y sin errores de contenido. 37 pruebas Python
y 6 pruebas de identidad JavaScript aprobadas. Modelo Steve revisado en el navegador;
letrero y animaciones en el cliente Minecraft, asi como Android, pendientes.

Los archivos entregables son exclusivamente `packs/behavior_packs/WARLAND_Impostor_BP` y `packs/resource_packs/WARLAND_Impostor_RP`. No incluir GameTest, la sonda ni el mundo de laboratorio.

## Revision 0.2.0 del visor y movimiento

El visor corrige ejes y caras UV Bedrock, incluidos espejos y tapas. Ofrece Steve/Alex, pose, respirar, caminar, mirar, correr con saltos y salto individual; pausa y vistas frente/espalda/laterales. Las formulas originales usan un evaluador aritmetico limitado, sin eval; velocidad y objetivos de mirada son simulados. Mirada con pausas y transiciones suaves, sin pendulo continuo. Alex conserva el PNG oficial; sus capas externas quedan a 0.0625 unidades del cuerpo para evitar pixeles aparentemente separados.

Validacion de esta revision: 38 pruebas Python, 16 JavaScript, check de 27 paquetes/1138 archivos. BDS: 27 comprobaciones incluidas velocidad de carrera, salto fisico (apice 0.873 bloques), aterrizaje, descanso y persistencia al reiniciar; ambas pasadas Quit correctly, cero errores. En el navegador: ambas skins, UV laterales/frente/espalda, cinco clips, pausas reales de mirada, control de pausa y saltos espaciados (76 fotogramas en aire / 381 apoyado en la muestra). El cliente Minecraft y Android no se han revisado visualmente. No instalado en oficial.

Reconstruir visor: `node tools/build_viewer.mjs --tools <directorio-de-herramientas>`; dependencias fijadas Three 0.180.0 y esbuild 0.25.11. Fuentes de las convenciones: https://github.com/JannisX11/blockbench/blob/master/js/formats/bedrock/bedrock.js y https://github.com/JannisX11/blockbench/blob/master/js/outliner/types/cube.js .

## Revision 0.3.2

Visor con saltos continuos y zancada sin cambio brusco al despegar/aterrizar. La muestra de carrera se repite; la IA conserva las tandas de 6-10. Cabeza sin giro relativo al cuerpo durante desplazamientos. Inspeccion de cofre de 4,4 segundos: orientacion, gesto breve de uso y observacion; no abre la tapa ni altera contenido. Las variantes Steve y Alex conservan sus texturas. Instalacion oficial pendiente.

Validacion final local 0.3.2: 35 comprobaciones nativas (incluido reinicio), 33 JavaScript y 38 Python aprobadas; cero errores de contenido y Quit correctly en ambas pasadas. Seis saltos consecutivos con 0-1 tick de actualizacion nativa al aterrizar, apice 1,261 bloques, inspeccion dirigida al cofre sin cambiar sus siete diamantes. Los 1065 archivos entregables coinciden con el laboratorio salvo la sonda y GameTest exclusivos de prueba. Visor revisado con Alex caminando y corriendo, cabeza alineada; revision 032 abierta. Cliente grafico de Minecraft/Android e instalacion oficial pendientes.

## Verificacion de integracion oficial, 27/11/2026

Los 25 paquetes anteriores del oficial coinciden byte por byte con la base publicada. Prueba nueva con esos 25 mas BP/RP del Impostor: 35 comprobaciones nativas en BDS 1.26.60.6 (30 iniciales y cinco tras reinicio), cero errores y Quit correctly en ambas pasadas. Los 19 archivos nuevos coinciden con los probados, excluyendo exclusivamente la sonda/dependencia de GameTest del laboratorio. API estable 2.10.0; no se agregan experimentos al oficial. Cliente instalado comprobado: 1.26.6501.0.

Validacion adicional: 37 pruebas Python, seis JavaScript, inventario de 27 paquetes y 1138 archivos. Ficha, comandos y modelo Steve revisados en el navegador del catalogo. Esta revision del atlas no sustituye la comprobacion visual en Minecraft; cliente y Android pendientes. Las cifras de las secciones anteriores corresponden a sus revisiones historicas.

Instalacion final: 1135 archivos respaldados; 1133 originales intactos. Solo cambian las dos listas de activacion y se agregan los 19 archivos del Impostor. Verificacion posterior: los 27 paquetes del oficial coinciden por SHA-256 con esta fuente. Copia offline y snapshot de noviembre 8 sin sobrescribir; el laboratorio integra el snapshot con los paquetes actuales.
