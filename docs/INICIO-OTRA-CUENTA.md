# Inicio de WARLAND con otra cuenta

El proyecto compartido es https://github.com/Dona12p4/warland-bedrock-equipo.
El catalogo es https://dona12p4.github.io/warland-bedrock-equipo/.

## Que ya esta preparado

- Codigo, paquetes y contexto versionados en GitHub. `AGENTS.md` indica las reglas; `docs/ESTADO.md`, `docs/DECISIONES.md` y `baseline.json` describen la base vigente.
- Lanzadores para Linux nativo y Windows; servidor de pruebas independiente. No se instala automaticamente sobre el mundo oficial.
- TheDarkness6859 tiene permiso **write**, comprobado en GitHub el 08/11/2026. La invitacion ya fue aceptada. Main conserva su proteccion y la revision del propietario.
- Linux: 31 pruebas automatizadas y arranque/cierre de BDS 1.26.60.6 en Ubuntu 22.04, con el mundo publicado. La prueba visual y la preparacion en el PC del companero siguen pendientes. Evidencia: [PR 3](https://github.com/Dona12p4/warland-bedrock-equipo/pull/3) y [ejecucion nativa](https://github.com/Dona12p4/warland-bedrock-equipo/actions/runs/42510152256).

## Cuenta, computador y GitHub son conexiones distintas

Iniciar sesion en otra cuenta ChatGPT en el mismo PC no cambia la cuenta de `gh`, no copia el proyecto a Linux y no transfiere sus programas. No copiar `auth.json`, tokens ni carpetas de sesiones.

Para usar GitHub desde ChatGPT, anadir el plugin GitHub en esa cuenta y autorizarlo con TheDarkness6859. El usuario completa el inicio de sesion y la autorizacion. No conectar por accidente Dona12p4: es el propietario. Este plugin no sustituye `gh auth login` en Linux ni es necesario para leer el repositorio publico.

Para Codex CLI, la configuracion duradera de WARLAND esta en el repositorio, no en un chat privado ni en instrucciones globales del PC del propietario. No se requieren nuevos cambios de modelo, permisos, sandbox o experimentos para esta entrega.

## Primera preparacion en el Linux del companero

Desde la terminal donde ya tiene Codex instalado:

```bash
git clone https://github.com/Dona12p4/warland-bedrock-equipo.git WARLAND-Equipo
cd WARLAND-Equipo
bash PREPARAR-EQUIPO.sh
bash ABRIR-CODEX.sh
```

Si ya existe el clon, entrar en el y ejecutar los dos ultimos comandos. No clonar encima ni borrar cambios existentes. El preparador pide la autenticacion GitHub propia y prepara las herramientas y el laboratorio compatibles. Para configurar solo codigo/contexto: `bash PREPARAR-EQUIPO.sh --solo-codigo`.

En la primera preparacion se necesitan sus sesiones y, cuando falten dependencias, permisos locales de instalacion. Estos pasos no se pueden adelantar desde otro computador. BDS nativo esta preparado para Ubuntu 22.04+ x86_64; otra distribucion requiere comprobar sus dependencias antes de dar la ejecucion por validada. Windows en arranque dual sirve para revisar Minecraft Bedrock con otro clon y laboratorio.

Puede dar su primera tarea directamente. Si necesita comprobar la preparacion, pedir:

> Prepara WARLAND para trabajar desde este Linux. Lee AGENTS.md y los documentos que referencia; sincroniza sin perder cambios, comprueba mis herramientas y la identidad de GitHub, valida los paquetes y prepara solo una copia de pruebas. No modifiques el mundo oficial ni copies sesiones del propietario. Indica las comprobaciones reales y lo que siga pendiente.

## Trabajo diario

- Abrir Codex con `bash ABRIR-CODEX.sh`; las instrucciones de la carpeta se leen como contexto del proyecto. No hace falta copiar chats.
- La IA sincroniza, crea una rama `codex/`, conserva los cambios oficiales y prueba en `.local/server/worlds/WARLAND_LAB`.
- El catalogo se abre con `bash ABRIR-CATALOGO.sh`; incluye lo publicado en main, no los cambios que aun esten solo en otro PC.
- Las propuestas se revisan antes de integrar; instalar en oficial requiere una orden separada del propietario. Los avances de dos partidas no se fusionan.

Referencia de Codex: [proyectos y carpeta de trabajo](https://learn.chatgpt.com/docs/projects). Un proyecto del escritorio o del navegador no sustituye el clon usado por Codex CLI.
