# El Pasado: candidato de cinemática nativa y recuerdo jugable

Estado del 27/11/2026: preparado en una rama y laboratorio independientes. **No instalado en el mundo oficial ni en el servidor de entrega.** La revisión visual final en Minecraft sigue pendiente. La instalación futura debe integrarse en el único addon completo y conservar la paridad servidor/mundo móvil; no entregar estos módulos por separado.

## Recorrido

`warland:el_pasado` contiene una copia acotada del WARLAND I reconstruido, transformada en ruinas. No modifica el original. Se entra en aventura, sin romper/colocar bloques, abrir cofres, pulsar botones, usar objetos o cruzar portales históricos. Los contenedores de la copia no incluyen inventarios y los portales/bloques de comando se sustituyen por obsidiana durante la transferencia.

Las ruinas son la visita inicial. La versión intacta queda como vista previa administrativa, separada 1.024 bloques; su apertura al público y la futura luz que guíe la salida siguen pendientes. Por ahora se regresa con el comando o el menú al punto y modo previos de cada jugador.

Comandos del candidato:

- `/warland:pasado`: menú del recuerdo.
- `/warland:pasado_cenizas`: entrar a las ruinas.
- `/warland:pasado_intacto`: vista previa intacta; solo DanielGamerSC y Hatsudemiku.
- `/warland:pasado_salir`: regresar.
- `/warland:pasado_desatascar`: volver a la entrada del recuerdo sin salir de la dimensión.
- `/warland:cinematica`: reproducción nativa, restringida a administradores durante la revisión.
- `/warland:cinematica_salir`: cancelar y recuperar el control.

No son todavía comandos del mundo oficial. La animación impide temporalmente el movimiento, conserva la configuración previa y cede ante la animación global de muerte. La recuperación pendiente se completa al reaparecer/reconectar.

## Presentación

Nueva revisión solicitada: primero WARLAND intacto durante 27,5 segundos y después las mismas zonas destruidas; el coloso cierra la secuencia. Siete tomas en 0 / 13,7667 / 20,6333 / 27,5 / 34,5667 / 39,7667 / 44,6333 s, duración 63,5667 s. Los seis cortes coinciden con ataques del bajo de 35–180 Hz, incluyendo los de menor intensidad. La mano conserva la actuación aprobada, sin voz, y el TP ocurre en 59,1667 s. Ya no hay destellos intactos intercalados.

Las cámaras usan terreno, modelo y partículas reales de Bedrock; no hay vídeo ni atlas de fotogramas. Un decorado intacto elevado comparte los chunks de las ruinas y se precarga bajo el negro inicial. La ceniza tiene posición y colisión en el mundo y se excluye de todo el primer acto. Las barras conservan el recorte de la película y se estiran al ancho de pantalla; la brújula y las coordenadas se ocultan durante la escena.

El actor mira hacia el fondo (yaw 180), dando la espalda a la cámara final. Cuatro luces invisibles y locales hacen legible la capa; una luz clásica sigue el localizador de la mano a 5 Hz mientras emerge el poder. Solo sustituye aire y restaura el bloque anterior al cambiar de celda, cancelar, terminar o desconectarse. El color morado lo aportan el orbe y sus partículas; no se promete iluminación RGB de RTX en móviles.

La música continúa al terminar o cancelar la escena mientras se permanezca en El Pasado. Se repite individualmente y se detiene al salir o morir. Usa el mismo canal y volumen 0,5 del Umbral; los archivos fueron igualados a aproximadamente -15,2 LUFS. Ambos stems conservan su relación original: mano 8 dB bajo el fondo y TP equiparado al fondo. La suma codificada alcanza -1,7 dBFS, sin recorte medido.

La iluminación clásica de Bedrock no reproduce literalmente las luces de color, sombras y exposición del render externo. Se adapta mediante oscuridad del recinto, niebla, materiales emisivos y partículas. No requiere RTX ni cambia la hora global. El parecido final necesita observarse en el cliente; no confundir la carga nativa con aprobación estética.

## Salidas de atascos y coste

Además de los apoyos anteriores, esta revisión añade 62 salidas físicas entre ambas copias (1.523 bloques de escalones de piedra, más cuatro luces del escenario). Cada ruta tiene comprobación de soporte, espacio para la cabeza y pasos de como máximo un bloque. Incluye dos salidas en el río central de las ruinas. El plano y las rutas exactas se guardan en `.local/past-two-acts/river-exits.json`. La revisión dentro del motor se registra aparte; una ruta calculada no equivale por sí sola a una prueba manual completa de todo el mapa.

La recuperación automática examina una persona por segundo, con hasta 160 nodos de búsqueda. Solo devuelve al último punto seguro cuando puede demostrar un recinto cerrado y la persona sigue detenida. Chunks no cargados o presupuesto agotado no se consideran pruebas de atasco. El comando manual vuelve siempre a la entrada: así también permite salir de recintos grandes que superen el alcance de la búsqueda local. No se escanea ni modifica continuamente todo el mapa.

La pista del Coloso se redujo de 22.191 a 3.248 claves numéricas: aproximadamente 2,69 MB a 0,71 MB. Se compararon todos los puntos de la curva original con error máximo de 0,00001. Ceniza: hasta cuatro focos compartidos, 48+12 partículas por emisión; desaparición: 240 partículas. La música se transmite como Ogg, sin cargar un vídeo. No hay una medición real en Android de 3–4 GB.

## Verificación y transferencia

- Pruebas del controlador: dos actos, siete tomas, TP, continuación de música, salida, permisos, convivencia con muerte y recuperación.
- BDS 1.26.60.6: completo 0.7.3 con 633 comprobaciones de registros, celdas de 62 rutas, siete cámaras, actor, orientación y luces; cero errores y cierre `Quit correctly`. El proceso del laboratorio anterior se conservó abierto.
- Se separan 19 comprobaciones funcionales de las 1.350 comprobaciones de celdas vacías del recinto de prueba; no son 1.369 escenarios jugables.
- La exportación acotada contiene 15.680 registros de terreno y 1.147 chunks, con los 544 chunks exigidos de zona jugable y margen completos. Cinco chunks periféricos de la fuente intacta nunca se generaron; se conservan como ausencia de origen, fuera del recorrido protegido.
- La transferencia excluye jugadores, actores, inventarios, reglas y ticking areas. El id numérico de dimensión del laboratorio se elimina del artefacto. El instalador debe resolver el id del destino y rechazar cualquier colisión con terreno existente.

Las pruebas y artefactos locales están bajo `.local/`; no se publica una DB de laboratorio. Se construye WARLAND completo 0.7.3 (un BP y un RP) para esta revisión. Faltan la aprobación visual final e instalación con respaldo en ambos destinos y comprobación de sus hashes. El 0.7.2 oficial sigue intacto.
