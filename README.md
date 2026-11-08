# WARLAND: proyecto compartido Bedrock

Esta carpeta es el proyecto que deben abrir ambas personas en Codex. Incluye los paquetes actuales, sus texturas/animaciones y reglas para las dos IA. Las conversaciones personales y credenciales no se comparten.

Repositorio publico por orden del propietario: https://github.com/Dona12p4/warland-bedrock-equipo. Se puede consultar y descargar sin invitacion. La invitacion a **TheDarkness6859** sirve para colaborar con escritura y sigue necesitando aceptacion. Main tiene proteccion remota: comprobacion `check`, una revision y CODEOWNERS; el propietario puede omitirla como administrador.

**Atlas completo:** https://dona12p4.github.io/warland-bedrock-equipo/ — criaturas 3D, clips, objetos, bloques, biomas, sonidos, recetas, comandos, sistemas y todos los archivos de los paquetes. En el PC, abrir **ABRIR-CATALOGO.cmd** para sincronizar y verlo sin servidor local.

## Primer uso del companero: Linux y Codex en terminal

El companero trabaja en Linux instalado directamente y tiene arranque dual Windows. Desde la terminal donde ya usa Codex:

```bash
git clone https://github.com/Dona12p4/warland-bedrock-equipo.git WARLAND-Equipo
cd WARLAND-Equipo
bash PREPARAR-EQUIPO.sh
bash ABRIR-CODEX.sh
```

Si ya existe el clon, entrar en el y ejecutar los dos ultimos comandos; no clonarlo encima. El preparador instala herramientas faltantes con apt cuando esta disponible, solicita su propia autenticacion GitHub, descarga la base, registra las comprobaciones y prepara BDS Linux en Ubuntu 22.04+ x86_64. Python minimo 3.10. En otra distribucion prepara codigo/contexto y deja indicada la prueba nativa pendiente. Tambien se puede elegir `bash PREPARAR-EQUIPO.sh --solo-codigo`.

`ABRIR-CODEX.sh` inicia su Codex instalado con la carpeta correcta, sin cambiar modelo, autenticacion ni permisos. AGENTS.md aporta las reglas de trabajo y dirige a las decisiones/estado compartidos. Puede pedir directamente una tarea; no necesita copiar las conversaciones del propietario.

- `bash ACTUALIZAR-Y-PROBAR.sh`: sincronizar y arrancar el BDS Linux local; cerrar con `stop`.
- `python3 tools/team.py smoke --seconds 15`: comprobar arranque/carga/cierre sin jugador.
- `bash ABRIR-CATALOGO.sh`: sincronizar y ver modelos, clips y recursos en su navegador.

Para la revision visual en Minecraft Bedrock de Windows, arrancar su Windows y usar otro clon con el preparador `.cmd`. Los cambios de codigo viajan por Git; las carpetas `.local`, los binarios y el progreso de cada laboratorio se mantienen separados. El servidor Linux no sigue funcionando durante el arranque de Windows. El kit no monta particiones ni abre puertos de red.

## Preparacion en Windows

1. Tener Minecraft **Bedrock para Windows** y la aplicacion ChatGPT/Codex instalada; iniciar sesion con la cuenta que usara el. Aceptar la invitacion con su cuenta GitHub para enviar cambios al proyecto; no hace falta para leer el atlas o descargar el mundo.
2. Descargar el kit inicial entregado por el propietario, descomprimirlo y abrir **PREPARAR-EQUIPO.cmd**. Instala Git, GitHub CLI y Python si faltan; pide autenticar GitHub y su gamertag una vez. Descarga el proyecto y el BDS fijado desde Minecraft, verifica los archivos y prepara la copia local del mundo.
3. Abrir la carpeta indicada como proyecto local en Codex. Escribir la tarea normalmente: «Haz que el sol no se mueva». La IA lee AGENTS.md, sincroniza y trabaja en una rama aislada.
4. Para jugar, **ACTUALIZAR-Y-PROBAR.cmd**; en Minecraft agregar servidor **127.0.0.1**, puerto **19152**. El servidor se cierra escribiendo `stop`, no cerrando la consola a la fuerza. Si el cliente requiere habilitar loopback, consultar el enlace oficial al final; los permisos los acepta el usuario.

No hay que configurar lenguajes ni copiar mobs a mano. Iniciar sesion en ChatGPT por si solo no abre el proyecto ni otorga acceso a GitHub. La preparacion inicial necesita esos pocos pasos y el computador encendido.

## Como se conservan ambos trabajos

- `python tools/team.py begin sol-quieto`: incorpora main y crea una rama.
- Editar `packs/`, probar, guardar un commit en la rama. La IA puede realizar estas tareas.
- `python tools/team.py sync`: trae los cambios oficiales y los combina con los commits de la rama. Si hay conflicto, se detiene para resolverlo; nunca descarta archivos automaticamente.
- `python tools/team.py prepare-lab`: comprueba que la rama contiene la main actual y prepara el laboratorio con TODOS los paquetes. Si otro acaba de agregar tres mobs, una rama anterior no puede probar/publicar sin incorporarlos.
- `python tools/team.py check` y `python -m unittest discover -s tests -v`: comprobaciones estructurales y del flujo. No sustituyen jugar ni probar la nueva mecanica.
- `python tools/team.py smoke`: arranque y cierre nativo BDS del laboratorio, sin jugadores. `play` abre la consola interactiva para la prueba real.
- `python tools/team.py proposal`: prepara evidencia de diferencias/base. Luego la IA puede enviar una rama y PR cuando el usuario lo autorice. El propietario revisa y decide integrar a main y, por separado, instalar en el mundo oficial.

Al haber un snapshot nuevo del mapa, el laboratorio se respalda y usa la copia nueva. Si solo cambian packs, se preservan su terreno, DB e inventarios. Cada tarea en worktree tiene `.local` independiente; cambiar el puerto en `.local/user.json` para ejecutar dos a la vez.

## Publicar un cambio oficial (propietario)

1. Ejecutar `python tools/team.py sync` y `python tools/team.py capture-installed "RUTA_DEL_MUNDO_OFICIAL"` con el mundo cerrado; revisar el diff, actualizar ESTADO/DECISIONES y pasar pruebas. La captura se niega si hay cambios del repositorio aun no incorporados a la base instalada. No ejecutar el build 0.4.2 del proyecto historico sobre esta base.
2. Integrar el codigo revisado a main. Los hooks bloquean pushes accidentales a main: el propietario puede usar `WARLAND_OWNER_PUSH=1` en su entorno tras revisar. Ademas se aplican las reglas remotas de main. GitHub Actions reconstruye y publica el atlas al actualizar main; comprobar que termine la publicacion. Agregar descripciones de mecanicas nuevas en `catalogo/editorial.json`.
3. Para compartir tambien el progreso/mapa: cerrar Minecraft y BDS; ejecutar `python tools/team.py snapshot "RUTA_DEL_MUNDO_OFICIAL" --label "Mapa actualizado"`. Hace una copia completa verificada, no modifica el original. Rechaza packs distintos de los de este repositorio para no publicar una base incoherente.
4. Ejecutar `python tools/team.py publish-world ".local/releases/CARPETA_INDICADA"`, revisar y commitear `world-release.json`. La publicacion es publica, como el repositorio. El companero la obtiene en la siguiente actualizacion/prueba.

No hay un observador que copie partidas abiertas ni commits sin publicar. Una modificacion no es compartida hasta publicarla. Ninguna herramienta de este kit despliega sobre el mundo oficial. Para llevar una prueba a oficial se prepara una delta de packs con respaldo y revision, conservando DB/inventarios; nunca importar el mapa de pruebas sobre la partida real.

## Que contiene

- `packs/`: base editable de 25 BP/RP instalados, con assets. JavaScript y JSON Bedrock.
- `pack-order/`: activacion y versiones del mundo, en orden.
- `baseline.json`: inventario y hashes de la base inicial.
- `world-release.json`: puntero verificado al snapshot publicado, sin guardar DB en Git.
- `catalogo/`: HTML, visor 3D y descripciones; datos generados desde packs al capturar, sincronizar, comprobar o publicar mundo. Los datos generados no se commitean para evitar conflictos.
- `tools/build_site.py` y `.github/workflows/pages.yml`: publicacion automatica del atlas desde main. Solo incluye packs, catalogo y documentos de estado; excluye datos locales y credenciales. La cobertura total es de archivos de packs, no de todas las pruebas manuales ni de prototipos no instalados.
- `docs/`: estado, decisiones y referencia historica; AGENTS.md es compacto para que la IA pueda leerlo completo.
- `.local/`: mundos, BDS, descargas, respaldo, configuracion personal. Ignorado por Git.

Solo RP recibe identificadores propios dentro del laboratorio para separar la cache visual del mundo oficial. Los UUID BP y sus datos persistentes se conservan. No se registran packs en Shared ni se modifican instalaciones existentes. Las versiones y experimentos de la base se conservan.

Documentacion oficial: [proyectos locales de Codex](https://learn.chatgpt.com/docs/projects), [AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md), [servidor Bedrock y loopback](https://learn.microsoft.com/en-us/minecraft/creator/documents/bedrockserver/getting-started?view=minecraft-bedrock-stable).

## Prototipo de máquina de peluches

El contexto, fuentes Blockbench y packs experimentales de la máquina están en [`docs/claw-machine/README.md`](docs/claw-machine/README.md) y `prototypes/claw-machine/`. El prototipo no pertenece a la base instalada ni al catálogo oficial.

Documentacion oficial: [Codex CLI y carpeta de trabajo](https://learn.chatgpt.com/docs/cli/reference), [AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md), [BDS para Ubuntu y Windows](https://www.minecraft.net/en-us/download/server/bedrock), [inicio del servidor Bedrock](https://learn.microsoft.com/en-us/minecraft/creator/documents/bedrockserver/getting-started?view=minecraft-bedrock-stable).
