# El Pasado: cinemática nativa y recuerdo jugable

Estado del 27/11/2026: **completo 0.7.4 instalado en el oficial Movil 3–4 GB y en el servidor de proyecto19152**, con respaldo y paridad de los 1.275 archivos. Conserva las partículas de biomas e inventarios/progreso. Informe local `outputs/past-official-installation.json`. El WARLAND I original no se modifica. La revisión visual no se hace por petición del usuario.

## Recorrido

`warland:el_pasado` contiene una copia acotada del WARLAND I reconstruido, transformada en ruinas. No modifica el original. Se entra en aventura, sin romper/colocar bloques, abrir cofres, pulsar botones, usar objetos o cruzar portales históricos. Los contenedores de la copia no incluyen inventarios y los portales/bloques de comando se sustituyen por obsidiana durante la transferencia.

Las ruinas son la visita inicial. La versión intacta queda como vista previa administrativa, separada 1.024 bloques; su apertura al público sigue pendiente. Una columna blanca intensa marca la entrada principal de la muralla (245,5 / 63 / -782,5; desplazada +1024 X en la vista intacta). En el candidato 0.7.6, al permanecer un segundo junto a su base se viaja al lobby y se reproduce su llegada de luz; al terminar queda allí con el modo original. El comando /warland:pasado_salir y el botón Volver conservan el regreso al punto previo como alternativa. La llegada aparece fuera del activador y las cámaras no pueden activarlo.

Comandos disponibles:

- `/warland:pasado`: menú del recuerdo.
- `/warland:pasado_cenizas`: entrar a las ruinas.
- `/warland:pasado_intacto`: vista previa intacta; solo DanielGamerSC y Hatsudemiku.
- `/warland:pasado_salir`: regresar.
- `/warland:pasado_desatascar`: volver a la entrada del recuerdo sin salir de la dimensión.
- `/warland:cinematica`: reproducción nativa, restringida a administradores durante la revisión.
- `/warland:cinematica_salir`: cancelar y recuperar el control.

La animación impide temporalmente el movimiento, conserva la configuración previa y cede ante la animación global de muerte. La recuperación pendiente se completa al reaparecer/reconectar.

## Presentación

Nueva revisión solicitada: primero WARLAND intacto durante 27,5 segundos y después las mismas zonas destruidas; el coloso cierra la secuencia. Siete tomas en 0 / 13,7667 / 20,6333 / 27,5 / 34,5667 / 39,7667 / 44,6333 s, duración 63,5667 s. Los seis cortes coinciden con ataques del bajo de 35–180 Hz, incluyendo los de menor intensidad. La mano conserva la actuación aprobada, sin voz, y el TP ocurre en 59,1667 s. Ya no hay destellos intactos intercalados.

Las cámaras usan terreno, modelo y partículas reales de Bedrock; no hay vídeo ni atlas de fotogramas. Un decorado intacto elevado comparte los chunks de las ruinas y se precarga bajo el negro inicial. La ceniza tiene posición y colisión en el mundo y se excluye de todo el primer acto. Las barras conservan el recorte de la película y se estiran al ancho de pantalla; la brújula y las coordenadas se ocultan durante la escena.

El actor mira hacia el fondo (yaw 180), dando la espalda a la cámara final. Cuatro luces invisibles y locales hacen legible la capa; una luz clásica sigue el localizador de la mano a 5 Hz mientras emerge el poder. Solo sustituye aire y restaura el bloque anterior al cambiar de celda, cancelar, terminar o desconectarse. El color morado lo aportan el orbe y sus partículas; no se promete iluminación RGB de RTX en móviles.

La música continúa al terminar o cancelar la escena mientras se permanezca en El Pasado. Se repite individualmente y se detiene al salir o morir. Usa el mismo canal y volumen 0,5 del Umbral; los archivos fueron igualados a aproximadamente -15,2 LUFS. Ambos stems conservan su relación original: mano 8 dB bajo el fondo y TP equiparado al fondo. La suma codificada alcanza -1,7 dBFS, sin recorte medido.

La iluminación clásica de Bedrock no reproduce literalmente las luces de color, sombras y exposición del render externo. Se adapta mediante oscuridad del recinto, niebla, materiales emisivos y partículas. No requiere RTX ni cambia la hora global. El parecido final necesita observarse en el cliente; no confundir la carga nativa con aprobación estética.

## Luz de salida y viento

La columna de luz sube hasta Y101, con núcleo blanco y halo cálido ancho, por encima de la muralla. Dieciocho bloques invisibles de nivel 15 iluminan las dos entradas; tres apoyos reparan el desnivel del acceso en ruinas. Solo se modifica el terreno importado de El Pasado, no el WARLAND original ni el decorado intacto de la película. Las partículas conservan profundidad: no se promete verlas a través de muros ni fuera de la distancia de renderizado.

El viento es un Ogg original de 24 segundos y 88 KB, con ráfagas y fundidos suaves, transmitido en mono. Se reproduce individualmente solo en las ruinas, por debajo de la música (-20,51 LUFS en el archivo; volumen 0,38). Se detiene durante el primer acto intacto, al salir o al morir; reconectar no duplica la pista. La música continúa con su comportamiento anterior.

Por petición expresa, no se harán comprobaciones visuales ni se tomará el control del cliente mientras el usuario juega. Validación automática y nativa separada; revisión estética y FPS móviles pendientes. La instalación se completó con Minecraft cerrado; posteriormente el usuario reabrió el cliente.

## Salidas de atascos y coste

Además de los apoyos anteriores, esta revisión añade 62 salidas físicas entre ambas copias (1.523 bloques de escalones de piedra, más cuatro luces del escenario). Cada ruta tiene comprobación de soporte, espacio para la cabeza y pasos de como máximo un bloque. Incluye dos salidas en el río central de las ruinas. El plano y las rutas exactas se guardan en `.local/past-two-acts/river-exits.json`. La revisión dentro del motor se registra aparte; una ruta calculada no equivale por sí sola a una prueba manual completa de todo el mapa.

La recuperación automática examina una persona por segundo, con hasta 160 nodos de búsqueda. Solo devuelve al último punto seguro cuando puede demostrar un recinto cerrado y la persona sigue detenida. Chunks no cargados o presupuesto agotado no se consideran pruebas de atasco. El comando manual vuelve siempre a la entrada: así también permite salir de recintos grandes que superen el alcance de la búsqueda local. No se escanea ni modifica continuamente todo el mapa.

La pista del Coloso se redujo de 22.191 a 3.248 claves numéricas: aproximadamente 2,69 MB a 0,71 MB. Se compararon todos los puntos de la curva original con error máximo de 0,00001. Ceniza en tormenta: hasta cuatro focos compartidos, 72+28 partículas nuevas por segundo y vidas de 2,8/2,5 segundos. Ráfagas laterales de 2,7–4,1 bloques/s y polvo bajo, siempre en el espacio del mundo y con colisión. Presupuesto de tormenta compartida de 1.232 partículas; la guía individual añade hasta 22 por cliente, considerando cohortes superpuestas; desaparición del Coloso: 240 adicionales y transitorias. La música se transmite como Ogg, sin cargar un vídeo. No hay una medición real en Android de 3–4 GB.

## Verificación y transferencia

- Pruebas del controlador: dos actos, siete tomas, TP, continuación de música, salida, permisos, convivencia con muerte y recuperación.
- BDS 1.26.60.6: candidato completo 0.7.4 con 652 comprobaciones de registros, celdas de 62 rutas, siete cámaras, actor, orientación, luces nivel 15 y camino de acceso a la guía; cero errores y cierre `Quit correctly`. Los servidores anteriores y Minecraft se conservan abiertos.
- 54 pruebas Python correctas, incluidas las pruebas JavaScript de retorno por la luz, protección de cámaras, fases de tormenta y viento tras reconexión, muerte o salida. Los cambios posteriores solo suavizan el solapamiento de la columna para evitar pulsos de brillo; las cuatro pruebas de El Pasado también se repitieron.
- Se separan 19 comprobaciones funcionales de las 1.350 comprobaciones de celdas vacías del recinto de prueba; no son 1.369 escenarios jugables.
- La exportación acotada contiene 15.680 registros de terreno y 1.147 chunks, con los 544 chunks exigidos de zona jugable y margen completos. Cinco chunks periféricos de la fuente intacta nunca se generaron; se conservan como ausencia de origen, fuera del recorrido protegido.
- La transferencia excluye jugadores, actores, inventarios, reglas y ticking areas. El id numérico de dimensión del laboratorio se elimina del artefacto. El instalador debe resolver el id del destino y rechazar cualquier colisión con terreno existente.

Las pruebas y artefactos locales están bajo `.local/`; no se publica una DB de laboratorio. WARLAND completo 0.7.4 está instalado (un BP y un RP) en ambos destinos. No repetir la migración de dimensión nueva sobre esos mundos. La entrada guardada del servidor vigente es «WARLAND - Luz - LAB», 127.0.0.1:19152; al terminar quedó detenido. Los servidores19160/19178 son pruebas anteriores.


## Llegada y luces fuera de la pelicula (27/11/2026)

Completo candidato 0.7.5, Base 0.6.22 y recursos HUD 1.1.20. Al entrar a las ruinas desde otra dimension, una luz desciende desde la esquina sureste, cruza hasta la esquina noroeste y gira hacia la entrada. El recorrido dura 14 segundos, precedido de dos segundos de carga bajo negro. A mitad de camino la camara se aparta unos 44 bloques lateralmente para mostrar el descenso. El destino sigue siendo la entrada original, sin cambiar camas ni inventarios. El recuerdo intacto y la orden directa de cinematica omiten esta llegada.

La luz movil y la columna fija de salida se emiten por jugador. Ninguna se emite al espectador de la pelicula, aunque haya otra persona recorriendo el mapa o entrando a la vez. Al iniciar la pelicula se cancela una llegada activa; las particulas anteriores terminan en menos de dos segundos, antes de levantar su fundido de precarga de nueve segundos. La guia vuelve al acabar o cancelar la pelicula. Las luces propias de la actuacion del Coloso se conservan.

La llegada usa 32 chunks temporales adicionales al norte y los libera al terminar la ultima llegada activa. Maximo cuatro llegadas simultaneas; los visitantes adicionales entran directamente. Hasta 16 particulas vivas de llegada por cliente, con emision a 10 Hz. La guia individual mantiene 22 particulas vivas por cliente; no se transmiten al resto. Los puntos de camara no cambian terreno, construcciones ni iluminacion de bloques.

El controlador persiste los permisos y el modo anterior, restaura el control y cede ante la muerte global. El jugador que salga o se desconecte conserva su retorno. No se ha controlado el cliente ni realizado una revision visual, por peticion expresa. Preparado fuera de las partidas abiertas; consultar el informe local de instalacion antes de atribuir esta version al oficial.

Validacion de 0.7.5: 54 pruebas del proyecto y sonda BDS 1.26.60.6 con 184 registros mas 161 comprobaciones de la llegada (incluye muestreos de camara y visibilidad del recorrido). Jugador simulado: aterrizaje, permisos, inventario, spawn, cambio a pelicula y guia individual correctos; cero errores y Quit correctly. No es una comprobacion visual. El Pasado 0.7.4 ya fue instalado por la tarea paralela: esta delta requiere solo actualizar el addon con respaldo, nunca volver a importar terreno. Informe outputs/past-arrival/preparation.json.

## Cruce de la luz hacia el lobby (27/11/2026)

Aclaración del usuario: cruzar la columna de salida debe reproducir la animación de llegada y dejar al jugador en el lobby. Candidato completo 0.7.6, Base 0.6.23 y Lobby BP 1.2.1. Conserva la llegada diagonal de El Pasado y la exclusión de luces guía durante la película.

El complemento unificado conecta la salida con la animación existente del lobby (11,1 segundos), sin una segunda escena distinta. Precarga y comprueba el suelo de destino antes de trasladar, recupera el modo anterior, retira música/viento/niebla de El Pasado y devuelve el control al acabar. No modifica cama, inventario, saldos ni progreso. No repite la escena al reconectar.

La salida espera a que no haya una muerte en curso; si no carga el suelo o se alcanza la capacidad de llegadas simultáneas, conserva el regreso guardado y permite reintentar. Las cargas temporales se comparten entre visitantes y se liberan al terminar. El comando de salida manual mantiene el retorno al origen.

Preparado sin instalar: el usuario sigue jugando y el servidor 19152 debe continuar encendido. Solo se actualizarán los packs cuando exista una ventana autorizada, con respaldo; no volver a importar El Pasado ni reemplazar DB.

Validación del candidato 0.7.6: 55 pruebas del proyecto y BDS 1.26.60.6 con 184 registros y 171 comprobaciones del recorrido. La prueba nativa cruza la luz con un jugador simulado, inicia la llegada real del lobby, termina sin repetición y conserva controles, inventario, cama y modo. Cero errores, cierre Quit correctly y servidores anteriores conservados. No es una revisión visual. Evidencia local: .local/past-lobby-native-0.7.6/native.json.
