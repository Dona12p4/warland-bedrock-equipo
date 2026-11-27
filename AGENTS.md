## Instalado 0.7.8: espiral del lobby, Coloso y tormenta (27/11/2026)

Nueva autorización expresa del usuario: «Sí, ya guardé y cerré; instala y reinicia». Se detuvo solo el servidor 19152 con stop y Quit correctly, se respaldaron los dos mundos cerrados y Shared, y se instaló el completo 0.7.8. Un BP/RP, mismas UUID, 1.283 archivos iguales en oficial Movil 3-4 GB y servidor; DB, inventarios y progreso intactos. Servidor reabierto en 127.0.0.1:19152; los laboratorios anteriores no se tocaron. La autorización no habilita futuros reinicios por rutina.

La llegada original del lobby conserva la entrada por el centro de la espiral y añade un plano distante a mitad del descenso. El Pasado entra a pie en 380.5/63/-800.5, a 136 bloques de la salida: el jugador busca una guía blanca independiente, excluida de la película. El recuerdo intacto conserva su entrada anterior. Cruzar la guía devuelve al lobby con la llegada existente.

Coloso: reloj sincronizado warland:performance_time y controlador de espera/actuación; conserva las poses de la referencia, gesto de la mano y desaparición. Cámara lateral de tres cuartos para mostrar capa y mano. Tormenta: 104 trazos y 20 copos cercanos por ráfaga, cuatro ráfagas/s, caída de 6.5–9.5 bloques/s más viento lateral, vida corta y colisión. Máximo cuatro zonas compartidas y 2.768 partículas de tormenta vivas. No es una medición de FPS Android.

Validación: 58 pruebas de proyecto y BDS 1.26.60.6 con 184 comprobaciones de registros y 294 de recorrido/cámara/reloj/retorno; cero errores y Quit correctly. Cámara libre de bloques, línea de visión permite el vidrio de la abertura original. Sin revisión visual del cliente por orden del usuario: se comprobó el reloj y los recursos, no la imagen renderizada en Minecraft.

Informes locales outputs/past-feedback/preparation.json, installation.json y final-parity-0.7.8.json; respaldo backups/past-feedback-0.7.8-preinstall. Completo en outputs/past-feedback/WARLAND.mcaddon y exports/WARLAND.mcaddon, SHA256 01049a3a26c71a261dff424ca0806a59b2aee3282081aeeb7a4d0ee8ab81c54a. Fuente Base 0.6.25 / Lobby BP 1.2.2 / recursos 1.1.21. Publicación en rama/PR8; integración de main/Pages pendiente de revisión.

## Vigente instalado: completo0.7.7 (27/11/2026)

Un BP/RP actualizado con respaldo en oficial Movil3-4GB y servidor19152:1281 archivos iguales, DB/progreso intactos. Administración > El Pasado y llegadas, llegada diagonal, guía privada fuera de la película, cruce hacia lobby con animación y cámara del Coloso alineada detrás. Informes outputs/past-arrival/installation.json y final-parity-0.7.7.json. Servidor reabierto y debe seguir encendido; no repetir instalación/importación ni detener por rutina. Sin revisión visual por orden del usuario. Antecedentes de candidatos0.7.5/0.7.6 quedan sustituidos por este despliegue.

## Revision visual suspendida por el usuario (27/11/2026)

No controlar Minecraft ni realizar confirmaciones visuales en esta ronda: el usuario quiere seguir jugando. Continuar con pruebas automaticas y preparar el completo; no editar ni copiar su DB abierta. No reactivar revisiones de cliente por instrucciones anteriores.

## Revision vigente: trabajar en el oficial 3-4 GB (27/11/2026)

El usuario ordeno trabajar y revisar los cambios en WARLAND - Movil 3-4 GB - COPIA (Importado), porque no quiere depender de que un laboratorio este abierto. Esta orden autoriza integrar El Pasado y las correcciones preparadas en esa partida. Sustituye el requisito anterior de revision jugable exclusiva en laboratorio. Conservar respaldo cerrado y datos/progreso; las comprobaciones internas pueden usar stages desechables, sin trasladar al usuario a otro mundo. Mantener un solo addon y paridad con los archivos del servidor vigente; no detener servidores que el usuario dejo abiertos.

# WARLAND: instrucciones compartidas

Antes de toda tarea de juego o entrega, leer [docs/PACK-COMPLETO-Y-PARIDAD.md](docs/PACK-COMPLETO-Y-PARIDAD.md), decision expresa del 27/11. Todo cambio aprobado debe integrarse en el unico WARLAND.mcaddon (BP/RP unificados) y quedar igual por hashes/version/configuracion en el servidor vigente y el mundo Movil 3-4 GB. No instalar mods sueltos ni copiar DB entre destinos. No afirmar terminado en ambos si solo se probo o instalo en uno. Esta regla prevalece sobre despliegues historicos separados. Respetar la orden vigente de no detener el servidor local.

Leer `README.md`, `docs/ESTADO.md` y `baseline.json` antes de editar. Este repositorio contiene la base de paquetes REALMENTE instalados; el antiguo proyecto 0.4.2 no reproduce esta version y no debe desplegarse encima.

El colaborador trabaja en Linux instalado directamente, con Codex CLI desde la terminal; dispone de arranque dual Windows para pruebas visuales Bedrock. Usar `python3` y los lanzadores `.sh` en Linux. Iniciar `codex` desde la raiz del clon o `bash ABRIR-CODEX.sh`; no necesita pegar los chats del propietario. No ejecutar .cmd, PowerShell ni bedrock_server.exe bajo Linux.

Para una cuenta/equipo nuevo, leer `docs/INICIO-OTRA-CUENTA.md`. Verificar la identidad con `gh api user --jq .login` antes de publicar; cambiar la cuenta ChatGPT no cambia las credenciales GitHub de la terminal. No alterar la sesion del propietario ni copiarla al colaborador.

## Al empezar cada chat o retomar una tarea

1. Ejecutar `python tools/team.py sync`. Requiere Internet; el repositorio es publico por orden del propietario. Si hay cambios sin guardar en Git, conservarlos, revisarlos y hacer un commit en la rama de trabajo antes de sincronizar; NO reset, clean, stash automatico ni descartar cambios. Un conflicto debe resolverse conservando ambas funcionalidades.
2. Leer los cambios nuevos de `origin/main`, el estado y decisiones. No confiar solamente en la memoria de este chat. No decir que una tarea nueva ya esta hecha sin comprobar codigo/pruebas.
3. Usar una rama `codex/<tarea>` (`python tools/team.py begin <tarea>`), nunca trabajar directamente sobre main. Un worktree por tarea concurrente; cada uno tiene su propio laboratorio y debe configurar puertos distintos si se ejecutan simultaneamente.
4. Antes de probar o enviar propuesta volver a sincronizar. `prepare-lab`, `play` y `proposal` rechazan una rama que no contenga la ultima main consultada. Fallar si no se puede consultar el remoto; no afirmar que esta actualizada trabajando offline.

## Edicion y compatibilidad

- SOLO Minecraft Bedrock: cliente Windows y servidor BDS nativo Windows/Ubuntu. No Java Edition, Forge, Paper, Spigot ni Geyser. Combate tipo Java significa mecanicas implementadas EN Bedrock.
- Logica de packs: JavaScript y JSON. Utilidades: Python 3.10+ estandar, Git, GitHub CLI. Se puede usar TypeScript compilado a JS sin cambiar el contrato de los packs.
- En Linux, BDS fijado 1.26.60.6 de Minecraft oficial, SHA256 propio, x86_64; soporte oficial Ubuntu 22.04 LTS o posterior. No instalar Wine ni traducir el ejecutable Windows. En otra distribucion se puede editar/validar el codigo, pero no declarar validada su ejecucion nativa.
- Arranque dual: conservar clones y laboratorios .local separados en Linux y Windows. Publicar commits desde la rama y sincronizar antes de probar al cambiar de sistema. No montar particiones ni copiar credenciales o DB entre sistemas como sustituto de la sincronizacion. El BDS de Linux no permanece ejecutandose al arrancar Windows.
- Consultar `config/toolchain.json` y manifests; verificar versiones reales cliente/BDS/Script API. No actualizar versiones ni activar experimentos automaticamente. Excepcion Beta APIs existente de Base conservada, NO extenderla a otros packs.
- Los archivos de `packs/` son la fuente editable vigente. Mantener UUID de BP, orden/dependencias de packs y propiedades persistentes. Los nuevos packs necesitan UUID propios. Registrar decisiones en `docs/DECISIONES.md` y pruebas en la propuesta.
- Preservar Warcoins, equipos, protecciones, salud, seguros, HUD, combate, mapas, inventarios y temporizadores. Las misiones pagan automaticamente una sola vez, hasta 6 diarios ademas de 1 moneda/30 min. No iniciar temporada ni inventar decisiones pendientes.
- Umbral: materiales propios de su lista vigente permanentes; los demas se permiten durante 15 s. Agua se evapora, excepcion de lava conservada. No restaurar reglas antiguas.
- Solo pruebas en `.local/server/worlds/WARLAND_LAB`. Nunca editar el mundo oficial, Shared de Minecraft ni copiar una DB de laboratorio a produccion. No instalar paquetes mediante los antiguos generadores sin conservar todas las deltas actuales.
- `prepare-lab` hace copia y respalda el laboratorio antes de actualizar; el mapa nuevo sustituye SOLO esta copia de pruebas. Los cambios del mapa de laboratorio no se fusionan. Para proponer construcciones usar estructura/migracion especifica revisable.
- Detener BDS con `stop`, esperar `Quit correctly` antes de copiar. Para tomar snapshot oficial, Minecraft y BDS deben estar cerrados. No cerrar a la fuerza ni perder trabajo.
- No publicar puertos ni cambiar firewall/router. Servidor de pruebas en loopback, transporte nethernet, puerto 19152. Si el cliente pide confianza/permisos, los acepta la persona.
- Calidad Minecraft coherente x16 donde ya aplique; atlas no equivale a densidad. No confundir validacion automatica con revision visual del cliente. Revisar HUD y animaciones en Minecraft antes de afirmar que se ven bien.

## Entrega e integracion

- Ejecutar `python tools/team.py check` y `python -m unittest discover -s tests -v`; para cambios de juego, tambien prueba BDS/cliente apropiada. Actualizar ESTADO y DECISIONES sin borrar antecedentes.
- `proposal` crea un paquete de diferencias y contexto; no publica ni instala oficial. Enviar rama/PR tras autorizacion del usuario. Describir comportamiento, pruebas y limitaciones.
- El propietario revisa y aprueba integrar a main; instalar en oficial es una accion separada que requiere su orden. El repositorio por si solo no modifica Minecraft. Main tiene proteccion remota: check, una revision y CODEOWNERS; el propietario puede omitirla como administrador. No presentar hooks locales como barrera de seguridad.
- Nunca commitear DB, mundos, binarios, backups, credenciales, tokens, chats personales ni adjuntos originales. El usuario hizo PUBLICO este repositorio y sus Releases el 08/11/2026; los mundos publicados se pueden descargar sin invitacion. No copiar sesiones/cuentas ChatGPT de otra persona ni publicar otros archivos personales.
- Toda incorporacion oficial debe reflejarse en el catalogo. `check`, `sync`, `capture-installed` y `publish-world` regeneran `catalogo/data.js` y su inventario desde TODOS los archivos de packs. Agregar tambien una descripcion clara en `catalogo/editorial.json` cuando cambie una mecanica o se incorpore una criatura; no mantener una lista manual de recursos. Comprobar la ficha y, si hay modelos, su vista 3D.
- Las explicaciones jugables estan en `catalogo/guias.json`: mantener funcionamiento, limites, estado y palabras de busqueda al cambiar una mecanica. Un inventario de archivos no sustituye su explicacion. La cronologia visual se extrae de la politica del lobby; las fases de temporada y propuestas de misiones no se presentan como eventos diarios terminados.
- El atlas publico https://dona12p4.github.io/warland-bedrock-equipo/ se reconstruye al publicar main. Tras instalar una delta oficial, capturar sus packs, revisar, probar y publicar la revision; no terminar una instalacion dejando el catalogo en una base antigua. Si falta autorizacion para publicar, dejar constancia concreta. No monitorizar ni copiar una DB abierta.
- Un inicio de sesion no ejecuta este proyecto automaticamente: abrir esta carpeta en Codex y seguir estas instrucciones. Las tareas locales necesitan el computador encendido. No inventar sincronizacion permanente ni integracion automatica de todos los cambios sin publicar.
- Sin apagado, mensajes a terceros ni vigilancia por defecto. Solo ante orden vigente correspondiente.
