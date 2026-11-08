# Decisiones compartidas

- 2026-11-08: preparar colaboracion con otra persona/cuenta. Cada tarea se prueba aparte. El propietario decide que pasa a oficial.
- Version oficial: WARLAND - Movil 3-4 GB - COPIA. Partida y progreso publicados como snapshots separados del codigo. Nunca sincronizar carpetas LevelDB en uso ni fusionar dos partidas.
- Los paquetes instalados son la base inicial: Base 0.6.20 (incluye lobby posterior), Dark BP 0.15.1, HUD 1.1.18. El inventario exacto esta en baseline.json.
- Mantener el servidor BDS 1.26.60.6 existente y las API actuales. Cliente observado 1.26.63.1; no actualizar BDS automaticamente. Prueba visual en el PC del colaborador pendiente.
- Bootstrap instala herramientas faltantes mediante winget solo cuando se ejecuta voluntariamente; no copia autenticaciones. GitHub y ChatGPT se autentican por persona.
- 2026-11-08, decision posterior: el propietario solicita hacer publico el repositorio al fallar la invitacion. Quedan publicos el codigo, los recursos existentes y las Releases; la invitacion sigue siendo necesaria para conceder escritura. Esto no altera la titularidad/licencias de recursos de terceros.
- Atlas generado desde los paquetes completos, con categorias, buscador, modelos 3D, clips numericos, texturas, audio y archivos originales. La cobertura se verifica automaticamente; el visor no emula la IA ni todo Molang de Bedrock. GitHub Pages se reconstruye con main; el lanzador local sincroniza y genera al abrir.
- Despues de instalar una incorporacion oficial autorizada, capturar/publicar sus packs y actualizar las descripciones afectadas; el catalogo queda como parte de la entrega. No copiar mundos abiertos ni confundir una captura publicada con observacion en vivo.

- 2026-11-08: conservar la máquina de peluches como prototipo separado en `prototypes/claw-machine/`, con historia y flujo de modelado en `docs/claw-machine/`. La migración no altera los 25 packs instalados ni autoriza instalación oficial. La adaptación de Script API, pruebas Bedrock y eventual integración requieren una propuesta posterior.

- 2026-11-08, aclaracion: el colaborador usa Linux instalado directamente y Codex desde terminal; tiene arranque dual Windows. Preparadores .sh, BDS Linux x86_64 fijado en 1.26.60.6 con SHA256 propio y mismas API/paquetes. Codex se inicia en la raiz del clon para leer el contexto. Clones/laboratorios independientes por sistema; Windows se conserva para pruebas visuales del cliente Bedrock.
- 2026-11-08, preparacion de la segunda cuenta en el mismo PC: conservar el contexto portable en GitHub y comprobar por separado la cuenta ChatGPT, la identidad GitHub y el equipo de ejecucion. No copiar autenticaciones ni modificar las credenciales del propietario. TheDarkness6859 ya tiene escritura; guia de inicio en docs/INICIO-OTRA-CUENTA.md.
