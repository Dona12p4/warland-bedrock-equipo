# Servidor local siempre en línea

El servidor vigente es `collaboration/.local/server`, mundo `WARLAND_LAB`, con el completo0.7.4. En la lista de Minecraft figura «WARLAND - Luz - LAB», dirección127.0.0.1 y puerto19152. Los puertos19160 y19178 son estudios anteriores. No modificar servidor, mundo, mods ni puertos para arrancarlo.

Orden del 27/11: conservarlo encendido y no reiniciarlo por iniciativa del asistente. Las actualizaciones que exijan cierre quedan preparadas hasta una nueva orden expresa. No reactivar apagados históricos. Esta orden no transforma el servidor local en alojamiento público ni abre router/firewall.

## Funcionamiento

`tools/keep_server_online.py` tiene una copia independiente del worktree en `collaboration/.local/persistent-server/`. Un acceso en Inicio de Windows ejecuta esa copia con pythonw al iniciar sesión. El supervisor mantiene stdin abierto, guarda la consola y comprueba el proceso por ruta completa. Un mutex impide dos supervisores para el mismo ejecutable. Si el proceso termina, espera entre5 y60segundos antes de volver a iniciarlo. Nunca mata ni reinicia un proceso vivo, ni despliega packs ni copia DB. Si falla la consulta de procesos, no interpreta el fallo como ausencia del servidor.

Mientras está habilitado solicita evitar la suspensión automática por inactividad; no cambia el plan energético, mantiene permitido apagar la pantalla y no bloquea un apagado o suspensión manual. No puede mantener el servidor accesible con el equipo apagado o sin conexión. El arranque posterior ocurre al iniciar sesión en Windows, no antes del inicio de sesión.

Estado: `status.json`. Eventos: `events.jsonl`. Consola por arranque: `server-*.log`. Los logs no se borran automáticamente. El archivo `probe.json` admite únicamente `{"command":"list","serverPid":PID_ACTUAL,"nonce":"valor-nuevo"}` para comprobar respuesta sin alterar la partida. No usar `team.py play` para este destino: ese flujo prepara un laboratorio y puede intentar reconstruir módulos separados.

## Solo ante una orden posterior expresa de cierre

No ejecutar estos pasos por rutina, actualización o fin del chat. Primero escribir `hold.json` con `{"hold":true}` en la carpeta del supervisor. Ese archivo por sí solo no detiene el servidor. Con orden nueva del usuario, leer el PID actual de `status.json` y escribir `control.json` con `{"action":"stop","serverPid":PID_ACTUAL,"explicitUserRequest":true}`. El supervisor solo envía stop si existe esa pausa, coinciden los PID y la autorización está marcada. Esperar `Quit correctly` y ausencia del proceso antes de tocar la DB. Para reanudar por orden posterior, poner `{"hold":false}`; no arrancar un segundo ejecutable manualmente.

## Comprobación realizada

Cinco pruebas de decisión/identidad/errores/pausa pasan. El servidor real inició una sola vez, cargó El Pasado y respondió a `list`; escucha TCP127.0.0.1:19152 con el transporte NetherNet existente. Una segunda ejecución del supervisor salió sin duplicarlo ni reiniciarlo. No se provocó una caída del servidor para probar recuperación; se validó la lógica sin interrumpirlo. El acceso de inicio quedó escrito y se ejecutaron sus mismos argumentos; no se reinició Windows para probar el inicio de sesión. Sin revisión visual ni intervención en Minecraft.
