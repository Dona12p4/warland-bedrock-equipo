# WARLAND: instrucciones compartidas

Leer `README.md`, `docs/ESTADO.md` y `baseline.json` antes de editar. Este repositorio contiene la base de paquetes REALMENTE instalados; el antiguo proyecto 0.4.2 no reproduce esta version y no debe desplegarse encima.

El colaborador trabaja en Linux instalado directamente, con Codex CLI desde la terminal; dispone de arranque dual Windows para pruebas visuales Bedrock. Usar `python3` y los lanzadores `.sh` en Linux. Iniciar `codex` desde la raiz del clon o `bash ABRIR-CODEX.sh`; no necesita pegar los chats del propietario. No ejecutar .cmd, PowerShell ni bedrock_server.exe bajo Linux.

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
- El atlas publico https://dona12p4.github.io/warland-bedrock-equipo/ se reconstruye al publicar main. Tras instalar una delta oficial, capturar sus packs, revisar, probar y publicar la revision; no terminar una instalacion dejando el catalogo en una base antigua. Si falta autorizacion para publicar, dejar constancia concreta. No monitorizar ni copiar una DB abierta.
- Un inicio de sesion no ejecuta este proyecto automaticamente: abrir esta carpeta en Codex y seguir estas instrucciones. Las tareas locales necesitan el computador encendido. No inventar sincronizacion permanente ni integracion automatica de todos los cambios sin publicar.
- Sin apagado, mensajes a terceros ni vigilancia por defecto. Solo ante orden vigente correspondiente.
