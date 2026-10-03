# ZAS

Microjuegos de 4 segundos. ¿Cuántos aguantas?

Un juego al estilo WarioWare para el navegador, en celular y computadora, sin
instalar nada. Hecho para el torneo del colegio.

## Cómo se juega

Aparece una orden de una o dos palabras (**¡ATRAPA!**, **¡CORTA!**,
**¡QUE NO TE VEA!**) y tienes unos segundos para cumplirla. Abajo se quema la
mecha: cuando llega a la bomba, se acabó el tiempo. Tienes 4 vidas.

La primera vez hay una **práctica guiada** de tres microjuegos: el juego se
detiene y muestra con una mano qué gesto hacer (también desde "Cómo jugar").

- Cada 5 microjuegos todo va **más rápido**.
- Cada 12 aparece un **JEFE** (un desafío más largo: si lo ganas, vida extra) y
  después los microjuegos se vuelven **más difíciles** (nivel 1, 2 y 3).
- Al final, según cuántos superaste, una medalla: bronce (5), plata (10), oro
  (20), trofeo (30) y diamante (40).
- Cada microjuego superado da puntos (más si lo terminas rápido y a mayor
  velocidad; los jefes, el triple). Los 10 mejores puntajes quedan en la
  tabla de **Récords** del aparato, con nombre.
- Se juega con el dedo (o el mouse): tocar, arrastrar, deslizar, mantener
  presionado o tocar muchas veces seguidas. Debajo de la orden aparece cuál.

En el celular se juega **en vertical**.

## Correrlo en tu computadora

```
python servidor.py
```

y abrí `http://localhost:8124`. Con `?debug` se ven los FPS; con
`?debug&micro=Frena&nivel=3&vel=1.5` se repite siempre el mismo microjuego con
esa dificultad (para probarlo), y `&k=2` fuerza el dibujo a doble resolución
(como en un celular con pantalla densa).

## Dónde se toca cada cosa

| Quiero… | Archivo |
|---|---|
| que todo vaya más rápido o más lento, más o menos vidas | `js/config.js` → `RITMO`, `PARTIDA` |
| cambiar o arreglar un microjuego | `js/micro/<Nombre>.js` (uno por archivo) |
| cambiar los fondos temáticos (cielo, mar, noche…) | `js/escenas/Micro.js` → `TEMAS` |
| sumar un jefe | un microjuego con `static JEFE = true`, en `JEFES` de `js/micro/indice.js` |
| agregar un microjuego | ver abajo |
| usar un emoji que no está | `herramientas/armar_emoji.py` (ver abajo) |
| cambiar los carteles entre microjuegos | `js/escenas/Director.js` → `intermedio()` |
| cambiar la música o los sonidos | `js/motor/Audio.js` |

### Agregar un microjuego

1. Copiá uno parecido de `js/micro/` (por ejemplo `Reventa.js`, que es corto).
2. Cambiale el nombre de la clase, la `ORDEN` y el `CONTROL`.
3. En `armar()` creá la escena; en `paso(dt, t)` movela; llamá a `this.ganar()`
   o `this.perder()` cuando corresponda. Usá `this.nivel` (1 a 3) y `this.vel`
   (1 a 1,85) para que se ponga más difícil.
4. Importalo en `js/micro/indice.js`.

Todo lo que tienen en común (fondo, emoji, textos, chispas) está explicado al
principio de `js/escenas/Micro.js`. Para probarlo con un jugador automático,
ver `herramientas/pruebas/LEEME.md`.

### Agregar un emoji

Los dibujos son emoji de Google (Noto, estilo "2D") pegados en una sola
imagen, `assets/emoji.webp`. Para sumar uno, agregalo a la tabla `EMOJI` de
`herramientas/armar_emoji.py` con su código (por ejemplo `'tigre': '1f42f'`)
y corré:

```
python herramientas/armar_emoji.py
```

(necesita `pip install pillow` e internet la primera vez).

## Cómo está hecho

- **Phaser 3.90** en `vendor/`, sin build ni npm.
- **Cada microjuego es una escena** que el Director lanza y apaga. Al
  apagarse, Phaser destruye todo lo que creó: por eso los microjuegos no
  necesitan limpiar nada.
- **El reloj es la música.** Cada microjuego dura una cantidad de pulsos; la
  música se inventa al azar para cada uno (otra tonalidad, otra melodía).
- **Dos texturas en total:** la de emoji y una generada al cargar con formas y
  la tipografía (fuente bitmap, para no re-subir texturas al cambiar textos).
- **Estilo "sticker":** cada emoji lleva un borde blanco y una sombra, horneados
  en la imagen. El marco de Phaser mide lo que mide el dibujo (el borde se
  dibuja por fuera), así los tamaños del código son los del emoji.
- **Nitidez:** el juego piensa siempre en 540 de ancho, pero dibuja a la
  resolución real de la pantalla (hasta el doble) con una cámara con zoom. En
  la computadora dibuja a 540, que es lo más liviano.

## Publicar

El juego está publicado con GitHub Pages: cada `git push` a `main` lo
actualiza en uno o dos minutos. Los teléfonos pueden tardar hasta 10 minutos
en ver la versión nueva: **no publiques nada durante el torneo**.

## Para el stand

En `stand/` hay todo listo para imprimir en A4 (los PDF se imprimen tal cual):

| Archivo | Qué es |
|---|---|
| `cartel.pdf` | el cartel a color: logo, QR, cómo se juega, medallas y un cuadro para anotar el récord del día |
| `cartel-ahorra-tinta.pdf` | el mismo cartel con fondo blanco, para impresoras en blanco y negro o con poca tinta |
| `tarjetas.pdf` | 8 tarjetitas con el QR por hoja, para recortar y repartir |

Los HTML (`cartel.html`, `cartel.html#ahorro`, `tarjetas.html`) son las mismas
hojas para abrir en el navegador. Todo se genera con
`python herramientas/armar_cartel.py` a partir de `herramientas/plantilla_*.html`
(para cambiar un texto del cartel, se cambia la plantilla y se vuelve a
generar). Los PDF se hacen con Edge: ver el comentario en `armar_cartel.py`.
