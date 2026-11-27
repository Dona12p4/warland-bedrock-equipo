## Servidor local siempre en linea (27/11/2026)

Las rutas siguientes parten de la raiz local WARLAND. En el checkout collaboration, el servidor vigente es .local/server; no confundirlo con el .local/server de otro worktree.

Orden expresa del usuario: mantener encendido el servidor vigente de `collaboration/.local/server`, puerto19152, entrada guardada «WARLAND - Luz - LAB». No detenerlo ni reiniciarlo al terminar un chat, para instalar, probar, copiar, limpiar o sincronizar. Si un cambio requiere cierre, dejarlo preparado; solo una orden posterior expresa del usuario habilita la interrupcion. No sustituirlo por los laboratorios19160/19178 ni arrancar otro mundo.

Inicio persistente local: `collaboration/.local/persistent-server/keep_server_online.py`, con estado y logs en esa carpeta y acceso de inicio de sesion de Windows «WARLAND - Servidor local.lnk». Recupera caidas con espera y no relanza procesos que sigan vivos. No reactivar ordenes historicas de apagado. Una nueva orden expresa de apagar/pausar prevalece: leer docs/SERVIDOR-SIEMPRE-EN-LINEA.md para cerrar de forma controlada sin que la recuperacion lo vuelva a arrancar. No editar ni copiar su DB abierta. Las pruebas usan procesos desechables distintos y no justifican cerrar19152.

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
