# ZAS

Microjuegos de 4 segundos. ¿Cuántos aguantás?

Un juego al estilo WarioWare para el navegador, en celular y computadora, sin
instalar nada. Hecho para el torneo del colegio.

## Cómo se juega

Aparece una orden de una o dos palabras (**¡ATRAPÁ!**, **¡CORTÁ!**,
**¡QUE NO TE VEA!**) y tenés unos segundos para cumplirla. Abajo se quema la
mecha: cuando llega a la bomba, se acabó el tiempo. Tenés 4 vidas.

- Cada 5 microjuegos todo va **más rápido**.
- Cada 12, los microjuegos se vuelven **más difíciles** (nivel 1, 2 y 3).
- Se juega con el dedo (o el mouse): tocar, arrastrar, deslizar, mantener
  apretado o tocar muchas veces seguidas. Debajo de la orden aparece cuál.

En el celular se juega **en vertical**.

## Correrlo en tu computadora

```
python servidor.py
```

y abrí `http://localhost:8124`. Con `?debug` se ven los FPS; con
`?debug&micro=Frena&nivel=3&vel=1.5` se repite siempre el mismo microjuego con
esa dificultad (para probarlo).

## Dónde se toca cada cosa

| Quiero… | Archivo |
|---|---|
| que todo vaya más rápido o más lento, más o menos vidas | `js/config.js` → `RITMO`, `PARTIDA` |
| cambiar o arreglar un microjuego | `js/micro/<Nombre>.js` (uno por archivo) |
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

## Publicar

El juego está publicado con GitHub Pages: cada `git push` a `main` lo
actualiza en uno o dos minutos. Los teléfonos pueden tardar hasta 10 minutos
en ver la versión nueva: **no publiques nada durante el torneo**.

El cartel para el stand, con el QR, está en `stand/cartel.html` (abrilo y
tocá "Imprimir"). Se genera con `python herramientas/armar_cartel.py`.
