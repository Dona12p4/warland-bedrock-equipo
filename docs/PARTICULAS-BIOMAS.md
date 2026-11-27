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

## Revision visual en el oficial (27/11/2026)

En Minecraft Bedrock Windows v26.65 se observaron luciernagas luminosas mediante
un comando cosmetico y hojas verdes pixeladas apareciendo naturalmente sobre
el bosque. La densidad observada fue baja y no se vieron texturas faltantes en
esas muestras. No se ha revisado visualmente la totalidad de los 85 efectos ni
medido FPS en Windows/Android. El jugador regreso al lobby y a Supervivencia;
no se alteraron bloques, inventario, saldo ni archivos del mundo durante esta
revision, y Minecraft quedo abierto.

### Revision ampliada: auroras y otros ambientes (27/11/2026)

Se visualizaron las cinco variantes base northern_lights_1..5 en el cliente
oficial mediante comandos cosmeticos. Hay cortinas verdes, cian y violetas;
algunas variantes se ven pequenas y lejanas. Las muestras nocturnas y diurnas
no equivalen a verificar su aparicion natural en un bioma frio. La seleccion
natural requiere noche, cielo despejado y bioma frio; las variantes shorter
no se revisaron individualmente.

Tambien se observaron snow_0, sandmote, nether_fireflies, warped_dust y
underwater_bubbles. Las muestras del Nether se invocaron en el Overworld para
comprobar su recurso, no su frecuencia natural. Las burbujas se comprobaron
bajo el agua de un oceano. Se vieron mariposas naturales y motas submarinas,
pero estas ultimas no se distinguieron inequívocamente del ambiente vanilla.
El comando rain se acepto, pero las gotas no quedaron visibles en las capturas:
esa comprobacion visual sigue pendiente. No hay medicion numerica de FPS.

Al terminar se restauro la posicion inicial del jugador, Supervivencia, medio
corazon y la hora del dia consultada antes de la prueba. El hotbar se conservo;
el sistema otorgo normalmente una moneda por tiempo durante la sesion.
No se cambiaron bloques ni packs, ni se cerraron Minecraft o los servidores.
