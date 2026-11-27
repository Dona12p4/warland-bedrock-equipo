# Partículas ambientales en WARLAND completo 0.7.3

Se adapta el archivo Biomes-Particles.mcaddon entregado por el propietario,
con prioridad en sus partículas y en el perfil móvil de 3–4 GB. Los recursos
originales pertenecen a MrsTrader; se conserva su crédito y su textura.
La distribución e instalación se hace exclusivamente con WARLAND.mcaddon,
un BP y un RP. Las carpetas BiomesParticles de packs/ son módulos fuente.

## Qué se incorpora

85 efectos ambientales: hojas, mariposas, aves lejanas, luciérnagas, arena,
polvo, nieve, lluvia, viento, auroras y efectos ambientales del Nether/agua.
Se escogen según el bioma, horario y clima. El Umbral no recibe estos efectos:
conserva su oscuridad y partículas propias. No se añaden entidades jugables,
objetos, bloques ni generación de terreno.

## Optimización y correcciones

- Emisión dirigida a cada jugador: no se retransmiten todos los emisores de
  cada compañero a todos los demás. Un grupo no multiplica su carga visual.
- Como máximo una emisión por segundo por jugador, seis emisores recientes
  en su presupuesto y 24 partículas simultáneas por emisor (16 en auroras).
  Lluvia/nieve instantáneas pasan de 40–60 a un máximo de 12 por emisión.
- Emisores normales de hasta un segundo; partículas de hasta ocho segundos.
  Auroras: hasta seis segundos de emisión, sin repetirse durante un minuto.
  Se eliminan emisores infinitos y las cascadas hacia partículas inexistentes.
- Dos muestras de jugador cada dos ticks, con reparto circular. En servidores
  con más de veinte jugadores, baja la frecuencia antes de aumentar el trabajo.
- Caché de bioma y techo de dos segundos, invalidada al cambiar de celda de
  cuatro bloques/dimensión. Una consulta nativa de columna sustituye catorce
  lecturas de bloques y detecta también techos altos. Sin forzar chunks.
- Partículas de agua solo con la cabeza sumergida. El clima del Overworld
  no se aplica al Nether. Dos fragmentos de tumbleweed se excluyen porque
  el archivo original no incluye la textura que referencian.
- Identificadores warland_biomes y texturas en su propia carpeta. No se
  reemplazan las partículas de los mobs ni recursos vanilla.

## Compatibilidad y comprobación

Cliente instalado 1.26.6501.0; BDS 1.26.60.6. El módulo declara API estable
2.10.0. El completo conserva la excepción Beta APIs previa de Base; no se
añaden experimentos. getWeather se utiliza cuando está expuesto; el evento
weatherChange conserva la alternativa en una API que no lo exponga.

47 pruebas del proyecto pasan. La sonda temporal verifica 183 registros del
complemento y ocho casos de partículas con un jugador simulado: bioma, API
dirigida, clima, techo alto, inmersión y presupuesto sostenido. Cierre limpio
con Quit correctly y servidores preexistentes conservados en la corrida final.
La sonda y GameTest nunca se incluyen en el archivo distribuible.

El RP añadido ocupa aproximadamente 315 KiB sin comprimir. Se preservan los
1081 archivos del completo anterior; solo cambian sus dos manifiestos y el
punto de entrada, y se añaden 161 archivos. UUID e inventarios no se migran.
No se afirma un aumento medido de FPS ni una revisión visual Android.

Fuentes técnicas de Bedrock consultadas:
- https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/player
- https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/dimension
- https://learn.microsoft.com/en-us/minecraft/creator/reference/content/particlesreference/particlecomponents/minecraftemitter_lifetime_once
- https://learn.microsoft.com/en-us/minecraft/creator/reference/content/particlesreference/particlecomponents/minecraftemitter_rate_steady
