# Estado de partida de la colaboracion

Captura de paquetes instalados el 08/11/2026. Los 25 paquetes del mundo cliente y de la copia offline coinciden byte por byte. Base 0.6.20, Lobby BP 1.1.2 / RP 1.1.0, Dark BP 0.15.1, HUD 1.1.18. El inventario exacto se genera en baseline.json.

Se conservan los mobs, animaciones, sonido, comercio, Warcoins/Keep, equipos, misiones, salud, muerte global, Umbral, biomas, lobby y combate que ya estan en los paquetes. Este repositorio no certifica que toda mecanica este terminada: consultar historial y pruebas de cada cambio.

No incluye los archivos personales, chats ni todos los prototipos de modelos descartados. Incluye los modelos/animaciones/texturas que realmente usa la partida. Si una tarea requiere un prototipo no instalado, el propietario debe incorporarlo como propuesta separada.

La referencia historica tiene estados antiguos contradictorios: las decisiones posteriores y los paquetes actuales prevalecen. El antiguo package.json version 0.4.2 no se usa como constructor de esta base.

Cliente observado: 1.26.63.1. BDS existente fijado: 1.26.60.6. API estable 2.10.0; Base conserva excepcion 2.12.0-beta ya existente. No se activaron nuevos experimentos.

Snapshot vigente: `world-20261108-164424`, capturado del mundo oficial del cliente despues de que el propietario guardara y cerrara Minecraft. ZIP verificado completo, ahora publico por orden posterior del propietario; no se modifico la partida original. Consultar world-release.json para hash y commit exactos. La copia offline usada en el primer arranque de prueba no es la entrega del mapa actual.

GitHub: repositorio PUBLICO Dona12p4/warland-bedrock-equipo por orden posterior del 08/11/2026. Escritura invitada a TheDarkness6859; lectura y descargas sin invitacion. Main ahora tiene proteccion remota: check obligatorio, una revision y CODEOWNERS. El propietario conserva omision administrativa. No se cambio de plan. Ningun comando del kit instala sobre oficial.

Validacion inicial: 16 pruebas del flujo en Windows y CI de GitHub, validacion de 25 packs/1119 archivos; arranque BDS 1.26.60.6 y cierre Quit correctly, cero errores detectados. No equivale a revision visual en el computador del colaborador ni a una prueba de todas las mecanicas del juego.

Validacion de entrega: clon nuevo descargado de GitHub, 1119 hashes identicos a la captura instalada, BDS descargado de Minecraft oficial con SHA256 fijado y snapshot descargado de la Release privada. El laboratorio creado desde esas descargas arranco y cerro con Quit correctly, sin errores detectados. Se verificaron los 1135 archivos del mundo cliente original contra su snapshot: permanecen intactos. El kit inicial solo contiene el lanzador, bootstrap e instrucciones; no incluye sesiones ni credenciales. Invitacion pendiente de aceptacion al terminar la preparacion.


Atlas publico generado: https://dona12p4.github.io/warland-bedrock-equipo/. Incluye categorias y acceso individual a TODOS los archivos de packs, modelos 3D, clips numericos, texturas y audio. Datos regenerados al capturar/sincronizar/comprobar/publicar; GitHub Pages publica main automaticamente. El historial conserva estados antiguos, no sustituye los archivos actuales. Los prototipos no instalados no forman parte de la base oficial.

Validacion del atlas: 22 pruebas de catalogo y colaboracion en Windows; navegador de desarrollo con las 19 secciones, 14 modelos principales, metadatos de los 16 eventos de sonido y disposicion a 390 px sin desbordamiento. Revisadas capturas reales de portada y ficha 3D. No es una nueva prueba del cliente Minecraft ni de la logica del juego.


## Prototipo separado de la base instalada

Se migró a `prototypes/claw-machine/` un prototipo de máquina de peluches con su contexto en `docs/claw-machine/`. No está instalado, registrado en `pack-order/` ni incluido en el catálogo; por tanto, la base de 25 packs descrita arriba permanece intacta. Requiere adaptación a la API estable del equipo y pruebas en laboratorio antes de proponer su integración.
