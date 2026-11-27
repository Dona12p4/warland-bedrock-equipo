# Decision vigente 27/11/2026

El propietario exige trabajar en el mundo oficial Movil 3-4 GB; autoriza integrar El Pasado para revisarlo alli. Conservar todas las mejoras ya instaladas, incluida Particulas de biomas 0.7.3, y respaldar antes de actualizar. No requiere otra aprobacion estetica en laboratorio antes de esta instalacion.

# Decisiones compartidas

- 2026-11-27, corrección posterior de El Pasado: el usuario elige primero todo intacto y después destruido. Sustituye los destellos breves. Siete tomas, cortes también sobre bajos suaves; actor de espaldas, cuerpo legible y luz en la mano. Añadir salidas físicas del río en las dos copias y comprobarlas en BDS. Completo 0.7.3 candidato, sin instalar en los dos destinos hasta revisión final.

- 2026-11-27, El Pasado: sustituir la película pixelada por una cinemática nativa sobre una copia acotada de WARLAND I. Ruinas recorribles ahora; intacto como vista administrativa para una futura apertura. Conservar perspectiva/cortes, tres destellos de 0,3 s, ceniza solo en ruinas y TP a 59,1 s. Música de fondo hasta salir, con sonoridad similar al Umbral; luz guía pendiente. Añadir recuperación conservadora de atascos sin modificar partidas originales.
- 2026-11-27, revisión de esta rama: «los dos mundos» se refiere al servidor vigente y al oficial Movil 3–4 GB, no a las variantes intacta/destruida. Verificar ambos y el Impostor. La entrega vigente exige un addon completo BP/RP y paridad por hashes; no volver a instalar módulos independientes. El código preparado en esta rama no acredita instalación ni revisión visual en esos destinos.

- 2026-11-27: por orden de instalar del propietario, incorporar El Impostor 0.3.2 en el oficial de 3-4 GB. Conservar los 25 paquetes previos, UUID, orden, datos e inventarios; agregar BP/RP independientes (27 paquetes). No incluir propuestas del lobby ni la fusion experimental de paquetes de otras ramas. Pasivo y sin aparicion natural; Steve/Alex como alternativa autorizada a las skins personales. Publicar la fuente y ficha del atlas con las limitaciones reales.

- 2026-11-26: llegada de luz en el lobby, únicamente en la primera entrada al mundo y al morir cuando Bedrock devuelve al jugador al lobby por no tener otro spawn válido. No repetirla al reconectar ni trasladar a jugadores desde camas válidas. El usuario confirmó «Solo la primera entrada».
- Propuesta Lobby BP/RP 1.2.0: secuencia de 110 ticks, luz descendente y revelado del jugador real. La cámara empieza después del flujo del corazón; no modifica modo, inventario ni punto de reaparición. Mantener API estable 2.10.0 y las protecciones existentes. El comando de revisión /warland:llegada es solo para los administradores dentro de la luz.
- 2026-11-26, corrección visual: el jugador no debe verse antes de que baje la luz. Ocultar cuerpo, cabeza y objetos durante los primeros 76 ticks y restaurarlos con el revelado o al interrumpir. La cámara inicial mira por la abertura central del techo. Conservar el jugador real, su equipo y su inventario; no sustituirlo por un actor.
- 2026-11-26, ajuste posterior solicitado: empezar desde lejos y mostrar/escuchar truenos antes del descenso. La secuencia pasa a 158 ticks (7,9 s), con plano general a 26 bloques, dos relámpagos cosméticos y sonidos vanilla de trueno. El descenso empieza en el tick 48 y el jugador se revela en el 124. Un destello breve enlaza con el encuadre de la abertura; no atravesar el techo con la cámara. Sin entidades de rayo, lluvia global, fuego ni daño. Presupuesto: 96 partículas por secuencia completa.
- 2026-11-26, aclaración vigente: «DESDE LA CAPA DE LAS NUBES». El vórtice y los relámpagos horizontales se sitúan en Y194, dentro de la capa vanilla Y192–196 (nota oficial Bedrock 1.17.40: https://feedback.minecraft.net/hc/en-us/articles/4411311573133-Minecraft-1-17-40-Bedrock). Altura absoluta, independiente del spawn. La cámara empieza en Y216, gira hacia el ojo y acompaña la luz desde las nubes hasta el lobby, pasando por su abertura central. Se retira el corte y destello del prólogo anterior. Dos capas de nube giratorias, dos rayos dentro de ellas y sonido posicional desde arriba; emisores dirigidos al jugador para la cámara distante. Duración 222 ticks (11,1 s), descenso 60–160, revelado 188. Presupuesto finito de 132 partículas; conserva recuperación y equipo.
- La instalación y publicación de esta propuesta no están hechas. La prueba se limita al laboratorio local; no modifica el servidor del compañero. GameTest solo se usa en una sonda temporal retirada al cerrar BDS, nunca en la dependencia del pack entregable.


- 2026-11-08: preparar colaboracion con otra persona/cuenta. Cada tarea se prueba aparte. El propietario decide que pasa a oficial.
- Version oficial: WARLAND - Movil 3-4 GB - COPIA. Partida y progreso publicados como snapshots separados del codigo. Nunca sincronizar carpetas LevelDB en uso ni fusionar dos partidas.
- Los paquetes instalados son la base inicial: Base 0.6.20 (incluye lobby posterior), Dark BP 0.15.1, HUD 1.1.18. El inventario exacto esta en baseline.json.
- Mantener el servidor BDS 1.26.60.6 existente y las API actuales. Cliente observado 1.26.63.1; no actualizar BDS automaticamente. Prueba visual en el PC del colaborador pendiente.
- Bootstrap instala herramientas faltantes mediante winget solo cuando se ejecuta voluntariamente; no copia autenticaciones. GitHub y ChatGPT se autentican por persona.
- 2026-11-08, decision posterior: el propietario solicita hacer publico el repositorio al fallar la invitacion. Quedan publicos el codigo, los recursos existentes y las Releases; la invitacion sigue siendo necesaria para conceder escritura. Esto no altera la titularidad/licencias de recursos de terceros.
- Atlas generado desde los paquetes completos, con categorias, buscador, modelos 3D, clips numericos, texturas, audio y archivos originales. La cobertura se verifica automaticamente; el visor no emula la IA ni todo Molang de Bedrock. GitHub Pages se reconstruye con main; el lanzador local sincroniza y genera al abrir.
- Despues de instalar una incorporacion oficial autorizada, capturar/publicar sus packs y actualizar las descripciones afectadas; el catalogo queda como parte de la entrega. No copiar mundos abiertos ni confundir una captura publicada con observacion en vivo.
- 2026-11-08, aclaracion: el colaborador usa Linux instalado directamente y Codex desde terminal; tiene arranque dual Windows. Preparadores .sh, BDS Linux x86_64 fijado en 1.26.60.6 con SHA256 propio y mismas API/paquetes. Codex se inicia en la raiz del clon para leer el contexto. Clones/laboratorios independientes por sistema; Windows se conserva para pruebas visuales del cliente Bedrock.
- 2026-11-08, preparacion de la segunda cuenta en el mismo PC: conservar el contexto portable en GitHub y comprobar por separado la cuenta ChatGPT, la identidad GitHub y el equipo de ejecucion. No copiar autenticaciones ni modificar las credenciales del propietario. TheDarkness6859 ya tiene escritura; guia de inicio en docs/INICIO-OTRA-CUENTA.md.

- 2026-11-26, corrección posterior: el vórtice será DE LUZ en la capa de nubes, no de masas grises. Dos espirales blancas/doradas y 32 chispas giratorias sustituyen las nubes anteriores (130 partículas totales). Viento grave original de 5,8 s, con crescendo y máximo coincidente con el descenso al segundo 3; una reproducción por llegada, solo para ese jugador, cancelada al recuperar la escena. No se cambia el volumen del equipo. Conserva Y194, rayos arriba y recorrido de cámara.

- 2026-11-26, giro del vórtice: corregida la rotación anulada al combinar particle_initial_spin con particle_motion_parametric. Ahora rotation depende de particle_age en el propio movimiento paramétrico, con velocidad inicial de 72–84 grados/s y aceleración suave. Altura Y194, luz, viento, partículas y duración conservados. Referencia: https://learn.microsoft.com/en-us/minecraft/creator/reference/content/particlesreference/particlecomponents/minecraftparticle_motion_parametric .
# 27/11/2026: complemento unico y paridad obligatoria

El propietario exige integrar cada cambio en el pack completo, reinstalar el completo cuando haga falta y aplicar la misma version al servidor vigente y al mundo Movil 3-4 GB. No volver a instalar mods sueltos. La referencia obligatoria es [PACK-COMPLETO-Y-PARIDAD.md](PACK-COMPLETO-Y-PARIDAD.md). La igualdad se verifica por UUID/version, hashes y configuracion; no autoriza sustituir DB ni progreso de una partida por otra. Los antiguos mundos de estudio conservan sus datos y funciones; revisar dependencias antes de retirar registros de Minecraft. Se respeta la orden de no cerrar el servidor local.

El constructor completo 0.7.1 conserva las fuentes de la rama actual, incluido Lobby 1.2.0 e Impostor 0.3.2. Se rechaza usar el viejo candidato unificado 0.7.0 como fuente porque omitiria la llegada de luz. La paridad se audita con `tools/audit_pack_parity.py`; una prueba o un paquete generado no equivalen a instalacion en ambos destinos.


- 27/11/2026: incorporar Biomes-Particles al oficial, integrado en el pack completo, con prioridad en optimizar las particulas. Se entregan Overworld/Nether con recursos de MrsTrader, limites por jugador y sin alterar el Umbral. Unico WARLAND.mcaddon 0.7.3, mismo BP/RP en servidor y oficial. No detener servidores abiertos.


## 27/11/2026: luz fuerte, ceniza y viento en El Pasado

El usuario pide una luz muy potente en la entrada de WARLAND que guíe el regreso, ceniza como tormenta de arena y sonido de viento. Se conserva intacto y limpio el primer acto de la cinemática. El retorno usa el origen individual guardado y no se activa durante cámaras ni sobre la llegada. Orden adicional: no hacer confirmaciones visuales ni tomar el cliente; el usuario sigue jugando. Preparar y probar automáticamente sin modificar la DB abierta. Instalación oficial y paridad quedan pendientes del cierre.


27/11/2026, orden posterior «instalalo»: completado el despliegue0.7.4 en ambos destinos con Minecraft cerrado. Paridad, respaldos y conservación de registros verificados. Sin revisión visual; los procesos de laboratorios abiertos se mantienen. El servidor vigente es19152, entrada guardada «WARLAND - Luz - LAB»; no confundirlo con19160/19178.


## 27/11/2026: llegada por las esquinas, sin luces guia en la pelicula

- La luz de llegada recorre El Pasado de esquina a esquina y termina en la entrada. Plano lateral distante a mitad del descenso. No modifica la ruta de la pelicula del Coloso.
- La luz de llegada y la columna de regreso no se muestran durante la cinematica. Emision individual para preservar esa exclusion en multijugador.
- El propietario pide continuar sin confirmaciones visuales ni tomar el control de Minecraft. No cerrar partidas o servidores; dejar la instalacion preparada si estan abiertos.
