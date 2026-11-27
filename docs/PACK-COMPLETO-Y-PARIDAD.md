# WARLAND: pack completo y paridad obligatoria

Decision expresa del propietario, 27/11/2026. Leer antes de editar juego, preparar una entrega, instalar o afirmar que un cambio esta terminado. Esta regla sustituye el despliegue habitual de mods independientes descrito en antecedentes antiguos.

## Resultado que debe recibir el jugador

- Un solo complemento distribuible: `WARLAND.mcaddon`, con un paquete de comportamiento (BP) y uno de recursos (RP). Recursos globales debe identificar una sola entrada de recursos WARLAND para la version completa; el BP figura en comportamientos.
- Cada criatura, cinematica, objeto, interfaz y correccion aprobada se integra en ese conjunto. No volver a entregar/registrar el mod individual, aunque sea mas facil; reconstruir y reinstalar el completo cuando sea necesario.
- Los archivos fuente pueden seguir organizados por modulos para mantenimiento. Una carpeta fuente o un prototipo no equivale a un addon independiente que deba instalarse.
- Conservar todas las funciones aceptadas de la version vigente. No reconstruir desde un export antiguo ni incluir propuestas sin aceptar solo por estar en una carpeta.

## Dos destinos de cada cambio

1. El servidor vigente del proyecto que se usa para revisar las actualizaciones.
2. El mundo oficial `WARLAND - Movil 3-4 GB - COPIA (Importado)` (identificar su carpeta y referencias en cada instalacion).

Ambos deben recibir exactamente la misma version jugable, BP/RP, recursos y configuracion. Verificar mediante SHA-256 por archivo, UUID/version y listas de paquetes activos. No basta con que ambos arranquen ni que los nombres coincidan.

Esta igualdad se refiere al contenido y funcionamiento del addon. No implica sobrescribir DB, inventarios, saldos, terreno, posiciones ni avance de una partida con los de otra. Los datos de prueba nunca sustituyen los reales. Diferencias del alojamiento (puerto, allowlist, rutas) no son diferencias del mod.

Los laboratorios temporales pueden contener sondas aisladas y UUID de recursos propios; no se presentan como el despliegue final ni como evidencia de paridad. En el servidor de entrega no deben quedar sondas, semillas de credito ni recursos aislados de ensayo.

## Flujo obligatorio

1. Sincronizar la fuente compartida sin descartar trabajo; revisar ESTADO y DECISIONES y comprobar cliente/BDS/API.
2. Identificar servidor, mundo, proceso y puerto reales. No confundir una beta antigua con el servidor vigente. Registrar las rutas en el informe local, fuera del repositorio publico.
3. Integrar el cambio en la fuente completa; generar el unico addon y un inventario de archivos con hashes. Abortar ante colisiones o contenido omitido.
4. Validar el conjunto, migracion de propiedades persistentes si cambia la identidad de packs, y comportamiento relevante. Respaldar cada mundo cerrado antes de tocarlo. No abrir/copiar su DB mientras esta en uso.
5. Desplegar el mismo artefacto en ambos destinos, conservar datos persistentes, y verificar hashes y referencias despues. Actualizar catalogo y fuente compartida segun el flujo vigente.
6. Revisar registros antiguos de Minecraft. Retirar solo las copias sustituidas, con respaldo y dependencias comprobadas. No borrar mundos de estudio, desactivar sus funciones, ni retirar addons ajenos por deducirlo de esta regla. Si un mundo conservado depende de un pack antiguo, migrarlo de forma especifica o dejar su retirada pendiente y decirlo.
7. Informar por separado: construido, probado, instalado en servidor, instalado en mundo 3-4 GB, revisado en cliente y publicado. No decir "listo en ambos" si queda alguno pendiente.

## Servidor abierto

El usuario ordeno no cerrar el servidor local en esta ronda. No detenerlo ni reiniciarlo por rutina. Preparar fuentes y artefactos fuera de los destinos abiertos; si el destino exige una interrupcion, dejar el paquete concreto listo y explicar que falta esa ventana de instalacion. Una orden historica de cierre/apagado no autoriza uno nuevo.

## Estado inicial de esta regla

La inspeccion del 27/11 encontro la fuente compartida con 27 modulos, una llegada de luz pendiente de instalacion oficial, y un candidato unificado anterior que no incorporaba esa llegada. Por tanto, ese candidato antiguo no acredita que los destinos sean iguales. El unico BDS abierto observado estaba en el puerto 19142 (beta antigua); la configuracion del proyecto vigente usa 19152. Confirmar de nuevo en cada despliegue, sin asumir que el estado sigue igual.

## Actualizacion 27/11: completo 0.7.3

Particulas de biomas optimizadas instaladas con paridad en oficial Movil 3-4 GB y servidor de proyecto19152. Misma identidad BP/RP, 1242 archivos por destino; DB y progreso intactos. 85 efectos, seis emisores recientes por jugador, 24 particulas/emisor. Informe outputs/biomes-particles/installation.json; candidato .runtime/biomes-particles-worktree/.local/complete-0.7.3-r2. No reinstalar 0.7.2 ni modulos separados. Servidores abiertos de otros laboratorios no se detuvieron. Fuente codex/biomes-particulas; revision visual pendiente por fallo del iniciador de Minecraft; main/Pages pendientes de revision.
