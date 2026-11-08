# WARLAND: instrucciones compartidas

Leer `README.md`, `docs/ESTADO.md` y `baseline.json` antes de editar. Este repositorio contiene la base de paquetes REALMENTE instalados; el antiguo proyecto 0.4.2 no reproduce esta version y no debe desplegarse encima.

## Al empezar cada chat o retomar una tarea

1. Ejecutar `python tools/team.py sync`. Requiere Internet y acceso al repositorio privado. Si hay cambios sin guardar en Git, conservarlos, revisarlos y hacer un commit en la rama de trabajo antes de sincronizar; NO reset, clean, stash automatico ni descartar cambios. Un conflicto debe resolverse conservando ambas funcionalidades.
2. Leer los cambios nuevos de `origin/main`, el estado y decisiones. No confiar solamente en la memoria de este chat. No decir que una tarea nueva ya esta hecha sin comprobar codigo/pruebas.
3. Usar una rama `codex/<tarea>` (`python tools/team.py begin <tarea>`), nunca trabajar directamente sobre main. Un worktree por tarea concurrente; cada uno tiene su propio laboratorio y debe configurar puertos distintos si se ejecutan simultaneamente.
4. Antes de probar o enviar propuesta volver a sincronizar. `prepare-lab`, `play` y `proposal` rechazan una rama que no contenga la ultima main consultada. Fallar si no se puede consultar el remoto; no afirmar que esta actualizada trabajando offline.

## Edicion y compatibilidad

- SOLO Minecraft Bedrock Windows y servidor BDS. No Java Edition, Forge, Paper, Spigot ni Geyser. Combate tipo Java significa mecanicas implementadas EN Bedrock.
- Logica de packs: JavaScript y JSON. Utilidades: Python 3.11+ estandar, Git, GitHub CLI. Se puede usar TypeScript compilado a JS sin cambiar el contrato de los packs.
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
- El propietario revisa y aprueba integrar a main; instalar en oficial es una accion separada que requiere su orden. El repositorio por si solo no modifica Minecraft. Las protecciones de GitHub dependen del plan: los hooks locales son prevencion de errores, NO una barrera de seguridad.
- Nunca commitear DB, mundos, binarios, backups, credenciales, tokens, chats personales ni adjuntos originales. Los mundos van en Releases PRIVADAS y solo se descargan con acceso. No copiar sesiones/cuentas ChatGPT de otra persona.
- Un inicio de sesion no ejecuta este proyecto automaticamente: abrir esta carpeta en Codex y seguir estas instrucciones. Las tareas locales necesitan el computador encendido. No inventar sincronizacion permanente ni integracion automatica de todos los cambios sin publicar.
- Sin apagado, mensajes a terceros ni vigilancia por defecto. Solo ante orden vigente correspondiente.
