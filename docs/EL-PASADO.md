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
- `/warland:pasado_desatascar`: volver al último punto seguro de la visita.
- `/warland:cinematica`: reproducción nativa, restringida a administradores durante la revisión.
- `/warland:cinematica_salir`: cancelar y recuperar el control.

No son todavía comandos del mundo oficial. La animación impide temporalmente el movimiento, conserva la configuración previa y cede ante la animación global de muerte. La recuperación pendiente se completa al reaparecer/reconectar.

## Presentación

Referencia aprobada: montaje `bass-cuts-tp-18`, 63,5 segundos, sin voz del Coloso. Las cuatro tomas cortan en 0 / 13,7 / 27,4333 / 44,5667 s. Los tres recuerdos intactos duran 0,3 s cada uno, una sola vez por toma de paisaje. El cierre brusco de la mano y la desaparición terminan en 59,1 s.

Las cámaras usan terreno, modelo y partículas reales de Bedrock; no hay vídeo ni atlas de fotogramas. Un decorado intacto elevado comparte los chunks de las ruinas y se precarga bajo el negro inicial para los destellos breves. La ceniza tiene posición y colisión en el mundo, no se dibuja sobre la pantalla, y se excluye de los recuerdos intactos. Las barras conservan el recorte de la película.

La música continúa al terminar o cancelar la escena mientras se permanezca en El Pasado. Se repite individualmente y se detiene al salir o morir. Usa el mismo canal y volumen 0,5 del Umbral; los archivos fueron igualados a aproximadamente -15,2 LUFS. Ambos stems conservan su relación original: mano 8 dB bajo el fondo y TP equiparado al fondo. La suma codificada alcanza -1,7 dBFS, sin recorte medido.

La iluminación clásica de Bedrock no reproduce literalmente las luces de color, sombras y exposición del render externo. Se adapta mediante oscuridad del recinto, niebla, materiales emisivos y partículas. No requiere RTX ni cambia la hora global. El parecido final necesita observarse en el cliente; no confundir la carga nativa con aprobación estética.

## Salidas de atascos y coste

El candidato contiene 53 bloques de apoyo añadidos en 19 depresiones del laboratorio. El informe inicial contó 76 candidatos aunque no todos cambiaron; la auditoría corregida separa ambos números. No se afirma que las 19 depresiones tengan recorrido manual comprobado.

La recuperación automática examina una persona por segundo, con hasta 160 nodos de búsqueda. Solo devuelve al último punto seguro cuando puede demostrar un recinto cerrado y la persona sigue detenida. Chunks no cargados o presupuesto agotado no se consideran pruebas de atasco. El comando de recuperación queda disponible para los demás casos. No se escanea ni modifica continuamente todo el mapa.

La pista del Coloso se redujo de 22.191 a 3.248 claves numéricas: aproximadamente 2,69 MB a 0,71 MB. Se compararon todos los puntos de la curva original con error máximo de 0,00001. Ceniza: hasta cuatro focos compartidos, 48+12 partículas por emisión; desaparición: 240 partículas. La música se transmite como Ogg, sin cargar un vídeo. No hay una medición real en Android de 3–4 GB.

## Verificación y transferencia

- Pruebas del controlador: cortes, tres destellos, TP, continuación de música, salida, permisos, convivencia con muerte y recuperación.
- BDS 1.26.60.6: carga del candidato, decorados elevado/inferior, posiciones de cámara, detección de foso y escalones de prueba; cero errores y cierre `Quit correctly`.
- Se separan 19 comprobaciones funcionales de las 1.350 comprobaciones de celdas vacías del recinto de prueba; no son 1.369 escenarios jugables.
- La exportación acotada contiene 15.680 registros de terreno y 1.147 chunks, con los 544 chunks exigidos de zona jugable y margen completos. Cinco chunks periféricos de la fuente intacta nunca se generaron; se conservan como ausencia de origen, fuera del recorrido protegido.
- La transferencia excluye jugadores, actores, inventarios, reglas y ticking areas. El id numérico de dimensión del laboratorio se elimina del artefacto. El instalador debe resolver el id del destino y rechazar cualquier colisión con terreno existente.

Las pruebas y artefactos locales están bajo `.local/`; no se publica una DB de laboratorio. Faltan revisión visual final, integración del addon completo, instalación con respaldo en ambos destinos y comprobación de sus hashes.
