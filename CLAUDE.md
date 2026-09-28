# ZAS — contexto para seguir trabajando

Este archivo resume todo lo necesario para continuar el proyecto en un chat
nuevo. Lo técnico en detalle está en `LEEME.md`; esto es el estado, las
decisiones y la forma de trabajar.

## Qué es y para qué

**ZAS** es un juego de microjuegos de ~4 segundos al estilo WarioWare, para
navegador (celular y computadora, sin instalar nada). Es la entrada del usuario
en un **torneo del colegio que se gana por votación del público**: tiene que
entenderse en segundos, dar ganas de volver a jugar y verse muy bien.

- **Jugar:** https://rygoslrst.github.io/zas/ (GitHub Pages, rama `main`, raíz)
- **Repo:** https://github.com/rygoslrst/zas (público)
- **Carpeta:** `C:\Users\rygos\Desktop\zas` (este proyecto se trabaja AISLADO:
  no tocar otras carpetas del escritorio)
- **Torneo:** alrededor del **11 de octubre de 2026**. Durante el torneo NO se
  publica nada: GitHub Pages guarda caché 10 minutos y un teléfono podría
  mezclar archivos viejos y nuevos.

## Cómo trabajar con el usuario

- Todo en **español rioplatense** (voseo): código, comentarios, interfaz y
  respuestas.
- Prefiere que **decidas y ejecutes vos** ("te doy completa libertad
  creativa"). Construir, verificar y después explicar qué se decidió y por
  qué. Frenar sólo para lo que únicamente el usuario puede hacer (iniciar
  sesión, crear cuentas, probar en su teléfono) o para cosas públicas nuevas.
- **Requisitos duros:** que se acceda por una URL y que ande bien en su
  computadora (Intel **Celeron N4500**) y en celulares de gama baja.
- **Regla del costo:** un costo acotado y de una sola vez, sí; un costo que se
  repite por cada pieza de contenido, no. Los microjuegos son contenido: se
  acota con variación por parámetros, emoji al azar, `VARIANTES` y niveles.
- Publicar = `git push` a `main` (se actualiza en 1–2 minutos). Commits con
  mensajes en español explicando el porqué.
- `gh` está en `C:\Program Files\GitHub CLI\gh.exe` (no está en el PATH de
  Git Bash) con la sesión de `rygoslrst`.

## Historia corta

1. 2026-09-26/27: se hizo **FUGA**, un runner (otra carpeta,
   `Desktop\runner-ritmico`, publicado en rygoslrst.github.io/fuga). El usuario
   lo descartó para el torneo: **no tocarlo**.
2. Se probó Bolt (bolt.new) como alternativa: sin tokens en el plan gratis,
   se decidió trabajar sólo acá.
3. 2026-09-27: el usuario eligió microjuegos estilo WarioWare **sin temática
   escolar** ("para aumentar la variedad"). Primera versión: 24 microjuegos.
4. 2026-09-28: pidió que "se vea excelente" y más variedad → estilo sticker,
   nitidez real en celulares, fondos temáticos, consigna en estallido de
   historieta, telón entre microjuegos, medallas, 30 microjuegos y 2 jefes.
   Reportó botones de números ilegibles y descuadrados → arreglado. Pidió un
   cartel mucho mejor → cartel a color, versión ahorra tinta y tarjetitas.

## Cómo es el juego hoy

- Una orden ("¡ATRAPÁ!") sobre un estallido, con una manito que muestra el
  gesto; ~4 s para cumplirla; abajo se quema una mecha. **4 vidas.**
- Cada 5 microjuegos, **más rápido** (+12%, hasta ×1,85). Cada 12, un **JEFE**
  (si lo ganás, vida extra) y después **más difícil** (nivel 1 → 2 → 3).
- Al final, **medalla**: bronce 5, plata 10, oro 20, trofeo 30, diamante 40.
- Celular en **vertical**. Todo se juega con el dedo (o el mouse).

**Microjuegos (30)**, por control:
- *tocar:* Reventa ¡REVENTÁ!, Aplasta ¡APLASTÁ!, Distinto ¡EL DISTINTO!,
  NoToques ¡NO TOQUES NADA!, Cuantos ¿CUÁNTOS HAY?, Frena ¡FRENÁ!, Salta
  ¡SALTÁ!, Pesca ¡PESCÁ!, Foto ¡SACÁ LA FOTO!, Topo ¡PEGALE!, Vuela ¡VOLÁ!,
  Suma ¿CUÁNTO ES?, Grande ¡EL MÁS GRANDE!/¡EL MÁS CHICO!, Orden ¡EN ORDEN!,
  Apila ¡APILÁ!, Memoria ¿DÓNDE ESTABA?, Duelo ¡DISPARÁ!
- *arrastrar:* Atrapa ¡ATRAPÁ!, Esquiva ¡ESQUIVÁ!, Comer ¡DALE DE COMER!,
  Limpia ¡LIMPIÁ!, Sigue ¡NO LO SUELTES!
- *deslizar:* Corta ¡CORTÁ!, Patea ¡PATEÁ!, Cable ¡CORTÁ EL ROJO! (y otros
  colores), Flechas ¡SEGUÍ LAS FLECHAS!
- *tocar rápido / mantener:* Infla ¡INFLÁ!, Despega ¡DESPEGÁ!, Llena ¡LLENÁ EL
  VASO!, Avanza ¡QUE NO TE VEA!

**Jefes (2):** Simon ¡REPETÍ! (secuencia de colores) y Torta ¡DEFENDÉ LA TORTA!
(hormigas).

## Cómo está hecho (lo esencial)

- **Phaser 3.90** en `vendor/`, sin build ni npm. Módulos ES nativos.
- `js/escenas/Director.js`: maneja la partida (elige y lanza cada microjuego,
  consigna, mecha, telón del intermedio, jefes, medallas).
- `js/escenas/Micro.js`: base de todos los microjuegos (ayudas: `fondo()`,
  `tema()`, `emoji()`, `boton()`, `chispas()`, `confeti()`, `cartel()`,
  `alTocar/alMover/alSoltar`...). Leer su encabezado antes de hacer uno nuevo.
- `js/micro/<Nombre>.js`: un archivo por microjuego; se registran en
  `js/micro/indice.js` (`MICROS` y `JEFES`).
- `js/config.js`: todos los números de la partida (ritmo, vidas, velocidad).
- `js/motor/Audio.js`: reloj (la música manda el tiempo), música inventada al
  azar para cada microjuego y efectos sintetizados.
- `js/motor/Atlas.js`: formas y tipografía (Anton) generadas al cargar.
- **Coordenadas siempre de 540 de ancho** (alto 760–1170 según la pantalla).
  Se dibuja a la resolución real con una cámara con zoom `ESCALA.k` (hasta 2).
- **Emoji = Noto "2D"** (Apache 2.0) con borde blanco y sombra, en
  `assets/emoji.webp`, armados por `herramientas/armar_emoji.py`. El marco
  `nombre` mide lo que el dibujo (borde por fuera, con `setTrim`); `nombre#` es
  la celda entera, para `setCrop`.
- **Texto:** la fuente trae un borde oscuro horneado. **Nunca teñir texto de
  oscuro** (queda un manchón ilegible). Para números en botones, `boton()`.

## Cómo probar

- `python servidor.py` → http://localhost:8124 (servidor sin caché; también
  guarda capturas que le mandan por POST en `capturas/`, que no se sube).
- `?debug&micro=Frena&nivel=3&vel=1.85&k=2` → FPS, un solo microjuego,
  dificultad y velocidad forzadas, doble resolución.
- **Jugadores automáticos:** `herramientas/pruebas/` (ver su LEEME). Cada
  microjuego tiene un bot; si el bot pierde, casi seguro hay un caso
  imposible. Hoy todos se ganan en nivel 1 y en nivel 3 a velocidad 1,85.
- Trampas del panel del navegador: si está oculto, la página se queda en
  "Cargando" (una captura lo destraba); las capturas pueden salir viejas (usar
  las del arnés); Phaser escucha mouse/touch, no PointerEvent; los tweens usan
  `Date.now()`.

## Stand

`stand/cartel.pdf` (a color), `stand/cartel-ahorra-tinta.pdf` y
`stand/tarjetas.pdf` (8 tarjetitas con QR para repartir), listos para imprimir.
Se generan con `python herramientas/armar_cartel.py` desde
`herramientas/plantilla_*.html`; los PDF con Edge headless (instrucciones en ese
archivo). Los QR se verificaron leyendo los PDF.

## Pendiente

- El usuario todavía no lo probó en su **teléfono real** ni midió en la
  **Celeron**: pedirle eso y ajustar según lo que diga (legibilidad, dificultad,
  microjuegos confusos, tirones).
- Ideas para seguir: más microjuegos y jefes; pulir visualmente los más
  simples (Infla, Topo, Llena); lo que el usuario pida después de probarlo.
- Antes del torneo: dejar todo publicado y verificado; durante, no publicar.
