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

- **Todo lo que ve el jugador va en español NEUTRO, con "tú"** (¡TOCA!,
  ¡CORTA!, "Tienes 4 vidas"), nunca voseo (¡TOCÁ!, "Tenés"): el torneo es en
  Chile y el usuario pidió que las instrucciones se entiendan al instante.
  Vale para el juego, el HTML, el cartel y las tarjetas. Ojo con palabras
  regionales: "pastel" (no "torta"), "tomar la foto", "te salvaste".
  Las respuestas al usuario, también en neutro. (Los comentarios del código
  quedaron en rioplatense de antes; no hace falta cambiarlos.)
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
5. 2026-09-28 (misma jornada, el usuario fuera de casa): resolución que baja
   sola si la máquina no da, Topo/Infla/Llena rehechos a nivel visual, 4
   microjuegos nuevos (Colores, SinChocar, Ataja, Ruleta) y un 3.er jefe
   (Carrera). Regresión completa con bots: los 37 se ganan.
6. 2026-09-28: pidió **español neutro** (el acento argentino confundía las
   instrucciones; el torneo es en Chile) y un **tutorial como el de FUGA**,
   donde el juego se detiene para enseñar → texto neutro en todo (juego,
   HTML, cartel y tarjetas, PDF rehechos) y la **práctica guiada**.
7. 2026-10-03: la orden tapaba el juego mientras corría el tiempo → ahora
   sale sobre el telón y queda chica junto a la mecha. El aviso de pantalla
   completa tapaba la mecha → el primer microjuego espera a que se vaya.
8. 2026-10-03: ¡NO LO SUELTES! "se teletransportaba" al agarrarlo (el
   recorrido no empezaba donde esperaba el bicho) → arreglado. ¡APILA! "no era
   bueno" → reemplazado por ¡TOCA AL RITMO!. Pidió un botón para ir al menú
   principal y una tabla de récords con puntaje y rondas → botón de pausa con
   "Menú principal", puntaje por microjuego y tabla de los 10 mejores.
   Autorizó crear el proyecto de Supabase → tabla de récords en línea.
9. 2026-10-03: "me gustaría que se viera mejor" → auditoría visual de los
   37 (hoja de contacto) y mejoras de costo acotado: el fondo genérico ganó
   luz central y luces desenfocadas que flotan (15 juegos de una vez);
   escenarios para los más vacíos (¡ATRAPA! picnic, ¡DALE DE COMER! cocina
   con plato, ¿DÓNDE ESTABA? mesa de madera, ¡INFLA! fiesta con banderines
   —tema nuevo `fiesta`—, ¡LIMPIA! baño con azulejos y burbujas, ¡QUE NO TE
   VEA! cerros y camino); destello dorado/rojo en los bordes al ganar/perder.
10. 2026-10-03: emoji "pixelados" → se dibujaban hasta 5 veces más grandes que
   su imagen (128 px). Atlas de 192 y 256 px, transparencia sin pérdida y
   mipmaps; el de 128 queda de respaldo.
13. 2026-10-03: jefe nuevo Marciano; se sacaron Topo (¡GOLPÉALO!) y
   SinChocar (¡SIN CHOCAR!, "el de la abeja") y entraron Vasos y Honda. En el
   cartel del stand, la orden ¡GOLPÉALO! pasó a ¡ENCESTA! (PDF rehechos).
12. 2026-10-03: 6 microjuegos nuevos (Rebota, Cruza, Encesta, Equilibra,
   Encaja, Sopla) → 40. Probados con bots en los 3 niveles y, además, que
   ninguno se gane sin hacer nada.
11. 2026-10-03: escenario para todos los que quedaban con fondo genérico:
   tema nuevo `escenario` (concurso con focos y ampolletas: ¿CUÁNTO ES?,
   ¡EL MÁS GRANDE!, ruleta), ¿CUÁNTOS HAY? según lo que se cuenta (mar,
   noche, cielo, cocina o campo), ¡EN ORDEN! mesa de pool, ¡SIGUE LAS
   FLECHAS! pista de baile, ¡NO TOQUES NADA! botón con base de peligro,
   ¡EL DISTINTO! tablero sobre un panel. ¡TOCA EL COLOR! queda con fondo
   neutro a propósito (que no confunda los colores). Además: jugar sólo con
   el botón y el filtro de nombres v2 (ver arriba).
14. 2026-10-03/04: "haz lo visual y si puedes mejora todo el sonido" →
   mascota **Zas**, pantalla de carga con avance real, escenarios nuevos,
   efectos de jefe y de velocidad (ver abajo), y el sonido entero rehecho:
   música y efectos por separado, música más rica, jefes en menor, ritmo en el
   telón, música del menú, vibración y sonidos nuevos. En la revisión salieron
   3 microjuegos con estado que sobrevivía a la escena reutilizada (Duelo: la
   segunda vez no salía el "¡YA!"; Ataja: sin sonido de patada; Pesca).
15. 2026-10-04: comodidad, stand y "otros" del informe de mejoras → compartir
   el resultado, vista previa del link, instalable y sin internet, modo stand
   con demo, QR y récords a los costados, y registro de errores. Se arregló el
   juego corrido a la derecha en la computadora (lo centraban Phaser y el CSS).
16. 2026-10-04: "ver si falta algo o crear más microjuegos" → 4 nuevos
   (Puertas, Separa, Traza, Puntillas) → 46 + 5 jefes = 51. En la regresión
   salió que el "golpe" al ganar (75 ms quieto) se medía con el reloj real y
   el arnés, que va más rápido, congelaba el microjuego siguiente: ahora se
   mide con el reloj del juego. Se descartó mantener despierta la base con
   GitHub Actions (el usuario no lo quiso).
17. 2026-10-04: el usuario pidió sacar ¡QUE NO TE VEA! (Avanza) y poner otro
   → Grua ¡SACA EL PELUCHE! (también de mantener apretado).
18. 2026-10-04: "más microjuegos y analiza todo lo visual" → hojas de
   contacto de los 51 en un teléfono alto: fondos lisos o vacíos arreglados
   (¡DALE DE COMER! cocina con azulejos, ¡DEFIENDE EL PASTEL! mantel de
   picnic en el pasto, ¡ENCESTA! gimnasio, ¡FRENA! y ¡SALTA! con
   `subsuelo()` —vetas y piedritas bajo el piso—, ¡CIERRA LAS PUERTAS!
   ventana con luna y telarañas, ¿DÓNDE ESTABA? cartas grandes en dos filas),
   el × y el + de la fuente se veían como puntos ("×1,5") → se dibujan más
   grandes (`AGRANDAR` en Atlas.js). 3 nuevos: Cuerda, Fuego, Pedalea → 49
   + 5 jefes = 54.
19. 2026-10-04: ¡DISPARA! a veces mostraba la señal verdadera gris (la falsa
   seguía encendida y la pisaba; lo vio el usuario) → arreglado. 4 nuevos:
   Dardo, Une, Revuelve, Carril → 53 + 5 jefes = 58. La lección de girar en
   círculos es una sola para Manivela y Revuelve (`grupo: 'girar'`).
20. 2026-10-04: "mejora lo visual" → hojas de contacto de los 58 en la
   pantalla del notebook (alto 760): ¡PEDALEA!, ¡UNE LAS PAREJAS! y ¡SIN
   HACER RUIDO! se encimaban → acomodados. Estadio con tribuna y carteles en
   ¡PATEA! y ¡ATAJA EL PENAL! (`cancha()` en Micro.js), sala de control con
   luces y franjas de peligro en ¡NO TOQUES NADA!, 3 caras nuevas de Zas
   (enamorado, sorprendido, llorando) y el desfile de emoji tenue en el telón.

## Cómo es el juego hoy

- Una orden ("¡ATRAPA!") sobre un estallido, con una manito que muestra el
  gesto; ~4 s para cumplirla; abajo se quema una mecha. **4 vidas.**
- La orden sale **sobre el telón**, al final del intermedio (después del
  resultado), y al subir el telón se achica y queda chica junto a la bomba
  (`ordenChica`) como recordatorio. Así el microjuego se ve entero desde el
  primer instante: antes la orden tapaba el centro ~1 s con el reloj
  corriendo (el usuario lo pidió el 2026-10-03). Tiempos en `intermedio()`
  (resultado) y `prepararMicro()` (orden).
- Pantalla completa en el celular: Chrome en Android muestra abajo un aviso
  ("desliza para salir") que la página no puede quitar. El primer microjuego
  espera a que se vaya (`esperarAviso`, 3,8 s supuestos: duración de un
  aviso largo de Android; si en el teléfono real sigue tapando, subirlo en
  `AVISO_PANTALLA_S` de `js/ui.js`).
- Cada 5 microjuegos, **más rápido** (+12%, hasta ×1,85). Cada 12, **más
  difícil** (nivel 1 → 2 → 3). **JEFES:** el 8.º microjuego y después cada 12
  (20.º, 32.º...; antes era el 12.º y casi nadie llegaba). Si lo ganas, vida
  extra. En el telón se **presenta**: su cara en grande (`static RETRATO`), su
  nombre (`NOMBRE_JEFE`) y un sacudón (`Director.presentarJefe`).
- **Racha** (2026-10-03): microjuegos seguidos sin fallar multiplican el
  puntaje: ×1,5 desde 5, ×2 desde 10 (`PARTIDA.RACHA`). En el telón, debajo de
  los corazones: "🔥 RACHA 6 · ×1,5" y "¡A 1 DEL ×2!"; al cortarse (si era de
  3 o más), "¡SE CORTÓ LA RACHA!". El tope de la base cuenta con el ×2.
- **Primera vez** de cada microjuego en el aparato (`zas_vistos_v1`): sello
  "¡NUEVO!" en la orden y 0,5 s más de orden (`EXTRA_NUEVO_S`). Si el
  microjuego tiene `static LECCION` (17: los de mantener, los de "toca rápido"
  —una sola lección para los tres, `grupo: 'machacar'`—, Honda, Ritmo, Cruza,
  Sigue, Flechas, Encesta, Ataja, Manivela, Lazo y los 5 jefes), la primera vez se CONGELA como
  en la práctica, con su cartel y la mano sobre el objeto
  (`zas_lecciones_v1`). `listo(m)` dice cuándo (p. ej. Ataja: con la pelota ya
  pateada, porque tirarse antes pierde) y `objetivo(m)` dónde va la mano. No
  se pone en los que el toque de descongelar haría perder (Duelo, NoToques).
- **Práctica guiada** (`js/escenas/Practica.js`): la primera vez en cada
  aparato, y siempre desde el botón "Cómo jugar" del título. Tres
  microjuegos lentos (velocidad 0,85), uno por gesto: Reventa (tocar),
  Atrapa (arrastrar) y Corta (deslizar). Pasada la consigna, el juego se
  CONGELA con un cartel que explica y la mano haciendo el gesto sobre el
  objeto; el primer toque lo descongela y cuenta como jugada. No se pierden
  vidas (si sale mal, se repite una vez). Al final: "¡AHORA EN SERIO!",
  "¡TIENES 4 VIDAS!" y arranca la partida. Botón "Saltar práctica" arriba a
  la derecha. Se recuerda en `localStorage` (`zas_practica_v1`).
  Cómo congela: `Director.congelado` frena `Micro.update`; al descongelar,
  el tiempo congelado se le suma al `t0` del Director, del microjuego y de
  la pista (`audio.correrPista`), así todo sigue donde quedó sin suspender
  el audio. Para agregar una lección: una entrada en `LECCIONES` con
  `listo(m)` (cuándo congelar) y `objetivo(m)` (dónde va la mano).
- Al final, **medalla**: bronce 5, plata 10, oro 20, trofeo 30, diamante 40
  (por microjuegos superados).
- **Puntaje** (`Director.puntosPorMicro`): cada microjuego superado da 100 +
  hasta 100 por terminarlo rápido (lo que sobró de mecha), todo × velocidad;
  los jefes ×3; los que se ganan aguantando cuentan "medio rápido". Se ve en
  el telón debajo del número grande ("440 PUNTOS +150").
- **Tabla de récords** (`js/tabla.js`): los 10 mejores, con nombre, puntos y
  microjuegos. Al final, si entra, se pide el nombre (hasta 10 letras, con el
  último ya escrito; filtro de groserías → "JUGADOR").
  - **En línea, una para todos:** Supabase, proyecto **zas** (ref
    `eouuvfqpktumfwlebmqz`, São Paulo, plan gratis) en la organización del
    usuario (que también tiene "talentorh", ajeno: no tocarlo). Autorizado
    por el usuario el 2026-10-03. Esquema y reglas en
    `herramientas/tabla_en_linea.sql`: nadie toca la tabla directo; el juego
    sólo llama `mejores_records` y `anotar_record` (valida tope de puntaje
    según `Director.puntosPorMicro` — si cambia el puntaje, cambiar el tope —,
    múltiplos de 10, limpia el nombre, 20 anotaciones/minuto entre todos).
    La llave publishable en `js/tabla.js` es pública a propósito.
  - **Filtro de nombres (v5, 2026-10-03; el usuario pidió reforzarlo "lo más
    posible"; todo en `herramientas/filtro_nombres/`, ver su LEEME):**
    - Listas en `prohibidas.txt` (297, por tema; `*` = sólo palabra entera,
      `~` = también al revés como palabra suelta) y `permitidas.txt` (39).
      `armar.py` las copia a `js/filtroNombres.js` y escribe
      `sincronizar.sql` (para la base; sólo toca filas con nota "lista:") e
      imprime una huella md5 + la consulta que la compara con la base.
    - Procedimiento (igual en JS y en SQL, `herramientas/tabla_en_linea.sql`):
      teléfono (7+ cifras), 69/420/1488/KKK; forma canónica (tildes, leet
      con 2=Z, letras sueltas seguidas se juntan, vocales repetidas, PH=F,
      X=CH, QU/C/K, V/B, Z/S, Y/I, NB=MB, CE/CI=SE/SI, HUE/GUE/UE=WE,
      GE/GI=JE/JI, H muda, LL=I (yeísmo), repetidas salvo RR, Ñ ≠ N);
      lecturas extra: 1/!/| como L, V como U, LL como L. Se busca en cada
      palabra y en "tramos" (palabras pegadas a una vecina de ≤3 letras: PU
      TA, MARI CON; JOSÉ MÉNDEZ no se junta). Enteras y al revés: sólo
      palabra suelta o tramo entero. Permitidas largas perdonan lo que cubren.
    - Las cortas o comunes son enteras a propósito (TETA, NAZI, CACA, POLLA,
      SEMEN, NEPE, NIGGA, FUCK, ASSHOLE...): como subcadena tumbaban nombres
      reales (DANTE TAPIA, IGNACIO, JOSÉ MÉNDEZ, SOFÍA 2013...).
    - Pruebas: `herramientas/pruebas/filtro.html` (deben_pasar ≈1.150,
      deben_caer ≈370, ≈2.800 variantes automáticas, comparación JS↔base por
      la RPC, y ~107.000 combinaciones naturales: caen 22). Al tocar el
      filtro: correrla entera, incluida la comparación con la base, y que la
      huella de `armar.py` coincida.
    - En la base: `records.oculto` (moderación a mano, no aparece ni cuenta
      para el puesto), check de formato del nombre, y `mejores_records`
      vuelve a revisar el nombre al leer (si después se prohíbe una palabra,
      los puntajes viejos salen como JUGADOR). Medido: ~0,7 ms por nombre,
      ~1 ms la tabla.
    - Con un nombre prohibido, el juego avisa y pide otro (`revisar_nombre`);
      igual, al guardar, la base lo cambia a JUGADOR.
  - **Respaldo en el aparato** (localStorage `zas_tabla_v1`): se anota
    siempre ahí también; si no hay red (3,5 s sin respuesta), se muestra ésa
    ("de este aparato (sin conexión)").
  - Puntajes truchos: `oculto = true` en Supabase → Table Editor → records
    (o borrarlos: `delete from public.records where nombre = '...'`). El
    2026-10-03 el usuario pidió vaciar la tabla antes del torneo (se hizo
    con `truncate ... restart identity`).
  - El plan gratis **pausa el proyecto tras 7 días sin uso**. Lo evitaría
    `herramientas/mantener-base.yml` (GitHub le hace una consulta cada 2
    días), PERO todavía no está activado: hay que moverlo a
    `.github/workflows/` y el acceso de git de este equipo no tiene permiso
    para subir eso (falta el permiso `workflow`: `gh auth refresh -s workflow`,
    lo tiene que hacer el usuario). Mientras, basta con que alguien abra el
    juego al menos una vez por semana. Si igual se pausó, se reactiva desde
    el panel de Supabase (el juego mientras usa la tabla local).
  - **Tabla de hoy y de siempre** (2026-10-04): pestañas "Hoy | Siempre" en
    Récords (sin elegir, abre la de hoy; si hoy no hay, la de siempre).
    "Hoy" = desde las 0:00 de Chile (`inicio_de_hoy()` en la base;
    `mejores_de_hoy`). Se pide el nombre si el puntaje entra en CUALQUIERA de
    las dos. Al guardar, se abre la de hoy con la fila resaltada. Los
    costados del stand muestran la de hoy (o la de siempre, si hoy no hay).
    En el aparato se guardan los 30 mejores (la de hoy sin conexión sale de
    ahí).
  - **Todas las partidas** (sin nombre: puntaje y microjuegos), tabla
    `partidas`, RPC `terminar_partida` (mismo tope que `anotar_record`, clave
    para no contar dos veces, 300 por minuto) → al final, "Quedaste #57 de
    230 partidas · hoy, #5 de 40" (`#fin-puesto`); `contar_partidas` → en el
    título "1.234 partidas jugadas · 57 hoy" y en el costado del stand. Sólo
    las partidas normales (no práctica, galería, duelo ni demo). Sin internet
    quedan pendientes y se suben con lo demás. SQL en
    `herramientas/tabla_en_linea.sql` (al final).
- **Galería** (2026-10-03): botón en el título. Los 58 con su ícono (`static
  ICONO`, un emoji); los que no salieron en el aparato (`zas_vistos_v1`), en
  silueta con "???". Tocar uno = **práctica libre** de ese microjuego
  (`Director.empezarGaleria`, usa `soloEste`): 4 vidas, más rápido cada 2 y
  más difícil cada 4, sin tabla ni racha; se guarda la mejor marca de cada uno
  (`zas_galeria_v1`). Su final (`#fin.galeria`) dice "Práctica: ¡CORTA!",
  cuántos seguidos y "tu mejor", con "Otra vez" (el mismo), Menú y Galería.
- **Duelo, 2 jugadores** (2026-10-03): botón "2 jugadores" en el título. Se
  turnan el mismo teléfono; en cada ronda los dos juegan EL MISMO microjuego
  (misma variante, misma velocidad; si al 1 le tocó lección o sello NUEVO, al
  2 también). Antes de cada turno, `#turno` ("Turno de JUGADOR 2 · Pásale el
  teléfono") espera el "¡Listo!" (`Director.seguirDuelo`). 4 vidas cada uno;
  al cerrar una ronda, si alguien quedó sin vidas, se acaba (si los dos, gana
  el que superó más; si no, empate). Sin puntaje ni tabla. Final:
  `#fin.duelo` ("¡Gana el jugador 1!", "7 – 5", Revancha).
- **Menú principal** = la pantalla de título (Jugar, Récords, Galería, 2
  jugadores, Cómo jugar, Créditos). Se empieza **sólo con el botón Jugar** (antes, tocar cualquier
  parte del fondo arrancaba; el usuario no lo quería). Igual al final:
  "Jugar otra vez" es un botón. Durante la partida hay un botón de pausa (arriba a la
  izquierda; también Escape) con "Menú principal" (`Director.irAlMenu`, la
  partida se abandona). Al final: "Menú" y "Récords". Los botones sobre el
  juego se acomodan a la columna del juego (`--col-izq/--col-der`, ver
  `ui.ajustarColumna`).
- Celular en **vertical**. Todo se juega con el dedo (o el mouse).
- **Zas, la mascota** (`js/datos/mascota.js`): una bomba con cara, en SVG, con
  10 caras (`CARAS`). Al cargar se pasa a un lienzo con borde blanco y sombra
  (`lienzoMascota`) y queda como textura `mascota` (un marco por cara). Está
  en la carga, junto al logo del título, en las reacciones del telón
  (`CARAS_BIEN`/`CARAS_MAL`), al final de la mecha (feliz → asustada en los
  últimos 3 pulsos → eufórica / mareada; explota con el emoji) y en el final
  cuando no hay medalla (`#fin-zas`, cara según cómo te fue; también en
  galería y duelo). Si falla, `ponerCara` usa emoji. El HTML usa copias fijas
  `assets/zas-*.svg`: **si cambia el dibujo, regenerarlas** (en la consola,
  `svgMascota(cara)` → POST a `/__captura/x.jpg` → renombrar a .svg), y lo
  mismo con las del stand (`svgMascota(cara, true)`, versión sticker con el
  borde dibujado, sin filtros: se imprime nítida).
- **Efectos de pantalla:** ¡MÁS RÁPIDO! hace girar los rayos y cruza líneas de
  viento (`efectoVelocidad`); ¡JEFE! pone el telón rojo con un relámpago
  (`presentarJefe`, `destelloTelon`); al ganar, el microjuego se congela 75 ms
  (`golpeHasta`). Con "reducir movimiento" del aparato (`MENOS_MOVIMIENTO`)
  no hay sacudidas de cámara y los destellos son más suaves.
- **Carga:** `main.js` baja el atlas de emoji de a pedazos (`bajarAtlas`, con
  `fetch` y `getReader`) para mover la barra; si no se puede, de una.
- **Sonido** (`js/motor/Audio.js`, todo sintetizado):
  - Dos botones, **música** y **efectos** (título, final y pausa;
    `zas_musica_v1`, `zas_sonido_v1`); la tecla M apaga o prende todo. Con la
    música apagada ni se programa (menos trabajo en aparatos lentos). La
    vibración (Android; el iPhone no deja) va con los efectos.
  - En el iPhone, con el interruptor de silencio puesto no suena (como los
    juegos del iPhone; se decidió no forzarlo). Los créditos lo avisan.
  - **Destrabar el audio:** ningún navegador deja sonar nada antes de que la
    persona toque la página. El primer toque EN CUALQUIER PARTE (o una tecla)
    lo destraba (`ui.js`, `destrabar`; antes sólo los botones, y el usuario
    notó que a veces no sonaba la música del menú). La música del menú se
    PIDE (`empezarMenu` deja `quiereMenu`) y suena apenas el audio arranca
    (`onstatechange` → `_alArrancar`). Si una partida empezó sin audio (el
    audio tardó en arrancar), `_alArrancar` la pasa al reloj del audio sin
    saltos (medido: 8 ms) y desde ahí suena la música.
  - Una pista a la vez (`pista.tipo`): `micro` (al azar por semilla: bombo
    con clic, caja con cuerpo, platillos a la derecha, acordes —golpecitos o
    colchón— a la izquierda, melodía de 2 compases con eco, redoble en los
    últimos 2 pulsos de la mecha, que se calla si ya se decidió), `jefe` (en
    menor, con el V de la menor armónica, bajo en corcheas), `telon` (ritmo
    liviano en Do al pulso que viene, mientras está el telón) y `menu`
    (tranquila, en el título y en el final después de los jingles). Cada
    pista tiene su salida y se apaga con un fundido. Volúmenes medidos con
    `OfflineAudioContext` (micro y jefe ~0,06 RMS, como la versión anterior).
  - Jingles propios: ¡MÁS RÁPIDO!, ¡MÁS DIFÍCIL!, ¡JEFE!, ¡DUELO!, ¡VIDA
    EXTRA!, ¡RACHA!, ¡ÚLTIMA VIDA! (latidos), corazón que se parte, la orden,
    la lección que congela y descongela, la cuenta 3-2-1 de la pausa, el turno
    del duelo, los botones. Y de microjuegos: ruleta (clic por gajo),
    ¡DISPARA! (señal, señal falsa y disparo), vasos (tapan y se levantan),
    ¡NO LO SUELTES! (agarrar y aviso al alejarse), ¡SACA EL PELUCHE! (motor
    de la garra) y ¡SIN HACER RUIDO! (pasitos y la alarma del gato).
  - **Reloj y pausa:** en la pausa el reloj del juego se congela
    (`_congeladoEn`) y se lleva la cuenta de lo que el audio sonó con el juego
    quieto (`_desfase`), así la cuenta 3-2-1 suena (`despertar()`) sin que la
    mecha avance. Las pistas de reloj `juego` se programan en tiempo de juego
    + `_desfase`; la del menú, con el reloj del audio. `pausar()` se puede
    llamar de más (al ocultar la página, siempre).

**Microjuegos (53)**, por control:
- *tocar:* Reventa ¡REVIENTA!, Aplasta ¡APLASTA!, Distinto ¡EL DISTINTO!,
  NoToques ¡NO TOQUES NADA!, Cuantos ¿CUÁNTOS HAY?, Frena ¡FRENA!, Salta
  ¡SALTA!, Pesca ¡PESCA!, Foto ¡TOMA LA FOTO!, Vasos ¡ENCUENTRA EL DIAMANTE!
  (el juego de los vasos), Vuela ¡VUELA!,
  Suma ¿CUÁNTO ES?, Grande ¡EL MÁS GRANDE!/¡EL MÁS CHICO!, Orden ¡EN ORDEN!,
  Ritmo ¡TOCA AL RITMO! (notas que bajan al compás del bombo; tocar a lo
  loco pierde), Memoria ¿DÓNDE ESTABA?, Duelo ¡DISPARA!, Colores ¡TOCA EL
  AZUL! (y otros colores; desde el nivel 2 la palabra miente), Ataja ¡ATAJA
  EL PENAL! (eres el arquero), Ruleta ¡FRENA EN LA ESTRELLA!, Rebota ¡NO LO
  DEJES CAER! (globo sobre cactus), Cruza ¡CRUZA LA CALLE! (el pollito entre
  autos; al armarse, comprueba con un planificador que haya un cruce posible
  y si no, reacomoda los autos), Dardo ¡DALE AL BLANCO! (dos toques: una línea
  vertical va y viene, el toque fija el ancho; después una horizontal, el
  segundo toque fija la altura; el dardo tiene que caer en el centro rojo)
- *arrastrar:* Atrapa ¡ATRAPA!, Esquiva ¡ESQUIVA!, Comer ¡DALE DE COMER!,
  Limpia ¡LIMPIA!, Sigue ¡NO LO SUELTES!, Honda ¡TUMBA AL CERDO! (honda: tirar
  hacia atrás y soltar; puntos muestran el camino), Encaja ¡PONLO EN SU
  LUGAR! (a su sombra), Separa ¡SEPARA! (de a una, la comida a la canasta y
  las cosas a la caja; también se pueden lanzar hacia su lado), Traza ¡DIBUJA
  LA ESTRELLA! (y el rayo, el corazón, el triángulo: pasar el dedo por la
  figura punteada desde el punto verde; avanza mientras el dedo esté cerca de
  la línea), Puntillas ¡SIN HACER RUIDO! (llevar al hámster a la galleta sin
  despertar al gato: arrastrar rápido llena la barra de ruido), Fuego ¡APAGA
  EL FUEGO! (con el dedo apoyado, la manguera moja donde está el dedo; cada
  fuego se apaga con un ratito de agua; en el nivel 3 los que no se terminan
  de apagar vuelven a crecer), Une ¡UNE LAS PAREJAS! (arrastrar una línea de
  cada animal a su comida: mono-banana, conejo-zanahoria, abeja-flor,
  pingüino-pez, sapo-mosca)
- *deslizar:* Corta ¡CORTA!, Patea ¡PATEA!, Cable ¡CORTA EL ROJO! (y otros
  colores), Flechas ¡SIGUE LAS FLECHAS!, Encesta ¡ENCESTA! (la pelota va
  adonde apunta el gesto; el aro se mueve desde el nivel 2), Puertas ¡CIERRA
  LAS PUERTAS! (pasillo embrujado: barrer de lado a lado cada puerta antes de
  que llegue su fantasma; 2, 3 o 4 puertas), Cuerda ¡CORTA LA CUERDA! (un
  chupetín se hamaca; al cortar sale con el impulso que traía y tiene que
  caer en la boca del sapo; el sapo se pone donde caería cortando en un
  momento elegido: en el nivel 1 cerca de una punta del vaivén —medio segundo
  para acertar—, en el 3 en cualquier parte —0,15 s—), Carril ¡CAMBIA DE
  CARRIL! (tres carriles, piedras de frente; deslizar o tocar un lado; se
  gana aguantando; cada fila deja libre un carril que también estaba libre
  en la anterior, así siempre hay por dónde pasar)
- *tocar rápido / mantener:* Infla ¡INFLA!, Despega ¡DESPEGA!, Llena ¡LLENA EL
  VASO!, Grua ¡SACA EL PELUCHE! (máquina de peluches: mientras se mantiene
  apretado la garra avanza, al soltar baja; un intento; desde el nivel 2 hay
  bombas al lado del peluche), Pedalea ¡PEDALEA! (tocar un pedal y después el
  otro; desde el nivel 2 hay que ganarle a otro ciclista), Equilibra ¡EQUILIBRA! (mantener un lado de
  la pantalla inclina el tablón; sin apretar, se va hacia la pelota), Sopla
  ¡APAGA LAS VELAS!
- *girar en círculos* (2026-10-03, gesto nuevo): Revuelve ¡REVUELVE LA SOPA!
  (círculos dentro de la olla: los ingredientes giran y la sopa toma color),
  Manivela ¡GIRA LA MANIVELA!
  (caja sorpresa; cuenta cuánto gira la DIRECCIÓN del dedo, así un círculo
  en cualquier parte vale y un zigzag no; en el nivel 3, para el lado de la
  flecha)
- *dibujar una vuelta* (gesto nuevo): Lazo ¡ENCIERRA LA OVEJA! (el lazo se
  cierra solo al volver cerca de un punto anterior; en el nivel 3 hay un zorro
  que no debe quedar adentro y que nunca se le pega a la oveja)

**Jefes (5):** Simon ¡REPITE! (secuencia de colores; el que la muestra es un
ROBOT —antes un marciano, igual que el jefe Marciano—), Torta ¡DEFIENDE EL
PASTEL! (hormigas), Carrera ¡ESCAPA! (tocar para saltar obstáculos; un ogro
te persigue, 3 choques y pierdes) y Marciano ¡DERROTA AL MARCIANO! (arrastrar
la nave, que dispara sola; el marciano tira meteoros; su vida es una parte de
los tiros posibles —36/32/25 %—, calibrada con un bot que esquiva perfecto y
acierta ~55 % en niveles 1-2 y ~35 % en el 3) y Pulpo ¡CORTA LOS TENTÁCULOS!
(2026-10-03, el primero que se juega deslizando: tentáculos que crecen desde
los costados hacia el tesoro; cada corte le baja vida; 3 que llegan y pierdes;
su vida es 66/62/62 % de los tentáculos que salen, y un bot que corta todo gana
con ~4-6 s de sobra). Un jefe dura `PULSOS × pulso × √vel`.

- **Compartir** (botón en el final): con `navigator.share` manda una imagen
  de 1080 x 1350 (`js/tarjeta.js`: logo, Zas, puntaje, "¿ME GANAS?" y la
  dirección) más el texto; la imagen se arma al mostrar el final (el teléfono
  sólo deja compartir justo al tocar). Sin `share` (computadora), copia el
  texto. Textos distintos para partida, galería y duelo.
- **Vista previa del link** (WhatsApp, etc.): `assets/vista-previa.jpg`
  (1200 x 630) y las etiquetas `og:` del `index.html`.
- **Instalable y sin internet:** `manifest.webmanifest`, íconos
  `assets/icono*` y el service worker `sw.js`, que guarda TODOS los archivos
  de una versión juntos (no se mezclan versiones) y el atlas de emoji que usa
  cada aparato. `sw.js` lo GENERA `herramientas/armar_sw.py` (versión = huella
  de los archivos); lo corre solo el gancho `.git/hooks/pre-commit` antes de
  cada commit. **Si el gancho no está (otra copia del repo), correr
  `python herramientas/armar_sw.py` antes de publicar**: si no, los aparatos
  siguen con la versión vieja. En localhost no se registra (salvo `?sw`). En
  Android aparece "Instalar en el teléfono" en el título; instalado, se abre a
  pantalla completa. Probado: con el servidor apagado, todo sale del aparato.
  Cuando llega una versión nueva, se recarga sola la próxima vez que el
  juego está en el título (sin demo ni paneles), con el aviso "¡Versión nueva
  del juego! Actualizando…"; un aparato abierto todo el día pregunta cada
  media hora si hay versión nueva. Créditos muestra la versión guardada en el
  aparato (los 6 primeros caracteres de `VERSION` en `sw.js`). El usuario
  creyó una vez que no se había publicado: estaba viendo la copia guardada.
  Para comprobar lo publicado: `curl` a `sw.js` del sitio y comparar
  `VERSION`; en la computadora, Ctrl+Shift+R se salta la copia guardada.
  Íconos y vista previa se rehacen abriendo `herramientas/generar_imagenes.html`
  con el servidor andando (quedan en `capturas/`: moverlos a `assets/`).
- **A los costados** (si sobran 250 px por lado, p. ej. un notebook): el QR
  "¡Juega en tu celular!" y la tabla de récords en vivo (se relee cada 45 s,
  nunca a mitad de un microjuego, y al anotar un puntaje).
- **Sin tocar nada** (en cualquier aparato, desde el 2026-10-04 a pedido del
  usuario; números en `STAND` de `config.js`): a los 20 s sin tocar el
  título, una **demo** que juegan los bots de `herramientas/pruebas/bots.js`
  (12 rondas, sin récords ni lecciones; gana ~34 de 36); un toque de verdad
  la corta y vuelve al título (no empieza partida). El final vuelve solo al
  título (25 s; 60 s si está escribiendo su nombre) y los paneles se cierran
  (40 s). Al volver a la pestaña, la espera empieza de nuevo. Si se cambia un
  bot, se cambia también la demo.
- **Modo stand** (`?stand`), además: la pausa abandonada (60 s) vuelve al
  título (en un teléfono una partida en pausa no se pierde nunca), las
  lecciones de primera vez no se recuerdan (cada jugador nuevo las recibe),
  no se ofrece instalar, la pantalla no se apaga (Wake Lock; se vuelve a
  pedir al volver a la pestaña y con cada toque) y el primer clic pone
  pantalla completa (una sola vez: si el que atiende la saca con Esc, no se
  insiste). El panel del navegador de Claude no deja ninguna de las dos
  cosas (lo rechaza sin error): se prueban en el aparato del stand.
- Los costados aparecen desde 210 px por lado (entra una tablet acostada,
  1024 x 768, con letra más chica: clase `estrecho`); los récords que
  entran entre una lectura y otra se iluminan un momento. Las filas de
  botones no se salen de la columna del juego.
- **Registro de errores:** `js/errores.js` (script común, se carga primero, en
  sintaxis vieja: avisa aunque el navegador no entienda los módulos) manda a
  Supabase (`anotar_error`, tabla `errores`, ver
  `herramientas/registro_errores.sql`) los errores de JavaScript, archivos que
  no cargaron, "sigue en Cargando a los 30 s" y "sin WebGL". Nada personal;
  3 por visita, 200 por hora entre todos, se guardan los últimos 5000. El
  juego no puede leerla. Para mirar: Supabase → Table Editor → errores.

## Cómo está hecho (lo esencial)

- **Phaser 3.90** en `vendor/`, sin build ni npm. Módulos ES nativos.
- `js/escenas/Director.js`: maneja la partida (elige y lanza cada microjuego,
  consigna, mecha, telón del intermedio, jefes, medallas).
- `js/escenas/Practica.js`: las lecciones de la práctica y su cartel.
- `js/tabla.js`: la tabla de récords (guardar, leer, limpiar nombres).
- `js/filtroNombres.js`: copia local del filtro de nombres (las listas entre
  `<listas>` las escribe `herramientas/filtro_nombres/armar.py`).
- `js/escenas/Micro.js`: base de todos los microjuegos (ayudas: `fondo()`,
  `tema()`, `emoji()`, `boton()`, `chispas()`, `confeti()`, `cartel()`,
  `alTocar/alMover/alSoltar`...; para escenarios: `vineta`, `azulejos`,
  `ventana`, `mesada`, `tablas` y `horizonte(y, 'ciudad'|'cerros'|'dunas')`,
  éste para el cielo vacío de las pantallas altas). Leer su encabezado antes
  de hacer uno nuevo.
- `js/datos/mascota.js`: Zas (ver arriba).
- `js/micro/<Nombre>.js`: un archivo por microjuego; se registran en
  `js/micro/indice.js` (`MICROS` y `JEFES`).
- `js/config.js`: todos los números de la partida (ritmo, vidas, velocidad).
- `js/motor/Audio.js`: reloj (la música manda el tiempo), música inventada al
  azar para cada microjuego y efectos sintetizados (ver "Sonido" arriba).
- `js/motor/Atlas.js`: formas y tipografía (Anton) generadas al cargar.
- **Coordenadas siempre de 540 de ancho** (alto 760–1170 según la pantalla).
  Se dibuja a la resolución real con una cámara con zoom `ESCALA.k` (hasta 2).
- **Resolución que se adapta:** `Director.medirRendimiento()` junta 150
  cuadros durante los microjuegos; si la mediana pasa de 20 ms (menos de 50
  FPS), baja el techo `ESCALA.max` un 0,25 y lo guarda en `localStorage`
  (`zas_escala_max_v1`). Se aplica en el siguiente intermedio
  (`aplicarResolucion()`), nunca a mitad de un microjuego. Así la Celeron o un
  celular flojo terminan en la resolución que aguantan, y la próxima vez ya
  arrancan ahí. Para volver a probar desde cero: borrar esa clave.
- **Las escenas se reutilizan:** Phaser relanza la misma instancia de cada
  microjuego. Todo el estado se inicializa en `armar()` (nada en el
  constructor ni en campos de clase que "sobrevivan"). Ojo con las banderas
  que se prenden en `paso()` (`if (!this.ya) { this.ya = true; ... }`): si no
  se apagan en `armar()`, la segunda vez no pasa nada. Para buscarlas: listar
  las propiedades que se asignan fuera de `armar()` y no dentro.
- **Emoji = Noto "2D"** (Apache 2.0) con borde blanco y sombra, armados por
  `herramientas/armar_emoji.py` en **tres atlas** (desde el 2026-10-03, porque
  el usuario los veía pixelados): `emoji-uhd.webp` (dibujo de 256, 4096x4096,
  1,8 MB), `emoji.webp` (192, 4096x2048, 1,2 MB) y `emoji-sd.webp` (128,
  2048x2048). `main.js` (`elegirAtlas`) usa UHD sólo con k ≥ 1,75 y
  `navigator.deviceMemory` ≥ 4 (Chrome); SD si la placa no admite 4096; si
  no, HD. Para probar: `?atlas=uhd|hd|sd`. Transparencia sin pérdida (con
  pérdida, los bordes salían dentados) y **mipmaps** (`render.mipmapFilter`;
  por eso los atlas tienen lado potencia de 2). El marco `nombre` mide lo que
  el dibujo (borde por fuera, con `setTrim`); `nombre#` es la celda entera,
  para `setCrop`: **nunca usar números fijos de celda**, siempre
  `CELDA_EMOJI` (cambia según el atlas).
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
  Para un microjuego nuevo conviene probar también lo contrario: que sin
  tocar nada se pierda (sobre todo si es GANA_AL_FINAL).
- **Regresión completa** (en la consola, con el arnés cargado): para cada
  nombre de `window.director.scene.manager.scenes` (menos `Director`),
  `__probar(nombre, 1, 1, 3)` y `__probar(nombre, 3, 1.85, 4)`. Conviene de a
  6–8 microjuegos por llamada (el panel corta los scripts a los 45 s).
- `__foto()` manda capturas a `capturas/` (tarda; puede parecer colgado si el
  panel está oculto, pero termina). `hoja.py` arma hojas de contacto: ojo, las
  capturas miden 270×(alto/2), no 270×480.
- Trampas del panel del navegador: si está oculto, la página se queda en
  "Cargando" (una captura lo destraba); las capturas pueden salir viejas (usar
  las del arnés); Phaser escucha mouse/touch, no PointerEvent; los tweens usan
  `Date.now()`; tras `location.reload()` hay que volver a importar el arnés y
  los bots (conviene `import('/capturas/arnes.js?' + Date.now())` para no
  tomar una versión vieja: la página importa las copias de `capturas/`, así
  que después de editar `herramientas/pruebas/*.js` hay que copiarlas ahí).
- El panel del navegador no tiene service workers. Para probar "sin
  internet": Edge sin ventana con depuración remota y la página liviana
  `herramientas/pruebas/sw.html` (el juego con gráficos por software anda tan
  lento que todo vence por tiempo); apagar el servidor y pedir archivos.
- Si el chat se abrió desde otra carpeta (p. ej. la de FUGA),
  `preview_start` con nombre levanta el servidor de ESA carpeta. Solución:
  arrancar `python servidor.py 8124` desde `zas` en segundo plano y abrir el
  panel con `preview_start` pasando la URL `http://localhost:8124/?debug`.
- Los bots con memoria (`m.__bot`) la atan al `t0` del microjuego: la escena
  se reutiliza y, si no, la segunda vez el bot cree que ya apoyó el dedo.
- **Sonido sin oírlo:** importar `js/motor/Audio.js`, darle un
  `OfflineAudioContext`, llamar `_construir()`, forzar `audioVivo` y
  `_usarPerf = false`, programar pasos con `_paso` (o llamar un jingle),
  `startRendering()` y medir pico y RMS. Sirve para encontrar errores y
  comparar volúmenes con la versión anterior (`git show HEAD:...`).
- Qué mirar al hacer un bot: que no "haga trampa" con información que el
  jugador no ve, y que no dependa de reflejos imposibles. Si falla, primero
  mirar si es el bot (pasó con Esquiva: el bot viejo se trababa solo; hoy
  simula el movimiento) antes de tocar el juego.

## Stand

`stand/cartel.pdf` (a color), `stand/cartel-ahorra-tinta.pdf` y
`stand/tarjetas.pdf` (8 tarjetitas con QR para repartir), listos para imprimir.
Se generan con `python herramientas/armar_cartel.py` desde
`herramientas/plantilla_*.html`; los PDF con Edge headless (instrucciones en ese
archivo; desde Git Bash Edge no escribe el PDF: usar PowerShell con
`Start-Process ... -Wait` y un `--user-data-dir` propio). Los QR se
verificaron leyendo los PDF. Zas va en el cartel (guiñando, junto al logo) y
en cada tarjetita (con 4 caras distintas): `stand/zas-*.svg`.

## Pendiente

- El usuario todavía no lo probó en su **teléfono real** ni midió en la
  **Celeron**: pedirle eso y ajustar según lo que diga (legibilidad, dificultad,
  microjuegos confusos, tirones).
- Ideas para seguir: más microjuegos y jefes (lo que el usuario pida después
  de probarlo). Candidatos a pulir visualmente: los de fondo liso más
  antiguos (Reventa, NoToques, Grande). En Ruleta, la porción de la estrella
  podría destacarse más si el usuario la encuentra difícil de ver.
- Dificultad de Carrera: los pares de piedras (desde nivel 2) dejan una
  ventana de ~130 ms a velocidad 1,85; la pista nunca es más larga de lo que
  se corre en el 85 % del tiempo. Si en el teléfono resulta injusto, subir la
  separación del par (hoy 72 px) o achicar la caja de choque (hoy ±32 px).
- Antes del torneo: dejar todo publicado y verificado; durante, no publicar.
