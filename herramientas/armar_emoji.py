#!/usr/bin/env python3
# =============================================================================
#  armar_emoji.py — junta los emoji que usa el juego en UNA sola imagen
# -----------------------------------------------------------------------------
#  Los dibujos de ZAS son emoji de Google (Noto Emoji, estilo "2D", licencia
#  Apache 2.0). Bajar 150 imágenes sueltas en cada celular sería lento: este
#  script las baja una vez (en alta resolución), a cada una le pone un borde
#  blanco y una sombra suave —el estilo "sticker" del juego: se lee sobre
#  cualquier fondo— y las pega en una grilla. Genera
#      assets/emoji.webp   (y assets/emoji.png, para navegadores viejos)
#      js/datos/emoji.js   (dónde quedó cada una)
#
#  Para usar un emoji nuevo: agregalo a la tabla EMOJI (nombre → código),
#  corré el script y usalo en el juego por su nombre.
#      python herramientas/armar_emoji.py
#  Necesita Pillow (pip install pillow) e internet la primera vez.
# =============================================================================

import os
import sys
import urllib.request
from PIL import Image, ImageFilter

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(AQUI)
CACHE = os.path.join(AQUI, 'cache_emoji_512')
URL = 'https://raw.githubusercontent.com/googlefonts/noto-emoji/main/2D/png/512/emoji_u{}.png'

TAM = 128          # el emoji en sí mide 128x128...
BORDE = 6          # ...con un borde blanco de 6 px...
MARGEN = 12        # ...centrado en una celda de 152 (sobra lugar para la sombra)
CELDA = TAM + 2 * MARGEN
SOMBRA = (3, 6)    # la sombra cae abajo a la derecha
SEP = 2            # píxeles vacíos entre celdas: evita que se "filtre" el vecino
ANCHO = 2048

# nombre → código Unicode (en minúsculas, como lo nombra Noto)
EMOJI = {
    # --- interfaz ---
    'corazon': '2764', 'corazon_negro': '1f5a4', 'contento': '1f604', 'mareado': '1f635',
    'estrella': '2b50', 'trofeo': '1f3c6', 'brillo': '2728', 'dedo': '1f446', 'fiesta': '1f389',
    'rayo': '26a1', 'bomba': '1f4a3', 'explosion': '1f4a5', 'fuego': '1f525', 'reloj': '23f0',
    'musculo': '1f4aa', 'calavera': '1f480', 'cien': '1f4af', 'sirena': '1f6a8',
    # --- caras ---
    'sonrisa': '1f600', 'sonrisa2': '1f603', 'sonrisa3': '1f604', 'facha': '1f60e',
    'neutra': '1f610', 'sin_expresion': '1f611', 'boca': '1f62e', 'rico': '1f60b',
    'asustado': '1f631', 'dormido': '1f634', 'guinio': '1f609', 'diablo': '1f608',
    'lengua': '1f61b', 'enojado': '1f620',
    # --- animales ---
    'perro': '1f436', 'gato': '1f431', 'sapo': '1f438', 'tortuga': '1f422', 'oveja': '1f411',
    'pollito': '1f424', 'mosquito': '1f99f', 'cucaracha': '1fab3', 'mariquita': '1f41e',
    'mosca': '1fab0', 'pez': '1f41f', 'pez_globo': '1f421', 'pajaro': '1f426', 'mono': '1f435',
    'cerdo': '1f437', 'conejo': '1f430', 'pinguino': '1f427', 'pulpo': '1f419',
    # --- comida ---
    'manzana': '1f34e', 'manzana_verde': '1f34f', 'banana': '1f34c', 'uva': '1f347',
    'frutilla': '1f353', 'sandia': '1f349', 'cereza': '1f352', 'durazno': '1f351',
    'anana': '1f34d', 'coco': '1f965', 'naranja': '1f34a', 'limon': '1f34b', 'tomate': '1f345',
    'dona': '1f369', 'pizza': '1f355', 'hamburguesa': '1f354', 'papas': '1f35f',
    'pancho': '1f32d', 'torta': '1f382', 'helado': '1f366', 'galleta': '1f36a',
    # --- cosas ---
    'globo': '1f388', 'pelota': '26bd', 'basket': '1f3c0', 'auto': '1f697', 'bici': '1f6b2',
    'corredor': '1f3c3', 'cactus': '1f335', 'canasta': '1f9fa', 'meteoro': '2604',
    'roca': '1faa8', 'guante': '1f9e4', 'arco': '1f945', 'gota': '1f4a7', 'regalo': '1f381',
    'plata': '1f4b0', 'cohete': '1f680', 'sol': '2600', 'luna': '1f319', 'flor': '1f338',
    'girasol': '1f33b', 'bandera': '1f3c1', 'nube': '2601', 'anzuelo': '1fa9d',
    'camara': '1f4f7', 'diamante': '1f48e', 'llave': '1f511', 'candado': '1f512',
    'campana': '1f514', 'lupa': '1f50d', 'iman': '1f9f2', 'escoba': '1f9f9',
    'canilla': '1f6b0', 'martillo': '1f528', 'tijera': '2702', 'esponja': '1f9fd', 'ojos': '1f440',
    'planta': '1f331', 'tulipan': '1f337', 'dado': '1f3b2', 'foco': '1f4a1', 'paraguas': '2602',
    'arcoiris': '1f308', 'hongo': '1f344', 'huevo': '1f95a', 'zanahoria': '1f955', 'chupetin': '1f36d',
    # --- más bichos, para variar ---
    'tiburon': '1f988', 'mariposa': '1f98b', 'abeja': '1f41d', 'hamster': '1f439', 'unicornio': '1f984',
    'dinosaurio': '1f996', 'fantasma': '1f47b', 'alien': '1f47d', 'robot': '1f916', 'pato': '1f986',
    'cangrejo': '1f980', 'panda': '1f43c', 'zorro': '1f98a', 'leon': '1f981', 'vaca': '1f42e',
    'ballena': '1f433',
    # --- para la segunda tanda y los jefes ---
    'vaquero': '1f920', 'pistola': '1f52b', 'hormiga': '1f41c', 'trebol': '1f340', 'corona': '1f451',
    'ogro': '1f479', 'marciano': '1f47e', 'humo': '1f4a8', 'estrellitas': '1f4ab', 'confeti': '1f38a',
    'medalla_oro': '1f947', 'medalla_plata': '1f948', 'medalla_bronce': '1f949', 'caja': '1f4e6',
}


def bajar(codigo):
    os.makedirs(CACHE, exist_ok=True)
    ruta = os.path.join(CACHE, f'{codigo}.png')
    if not os.path.exists(ruta):
        with urllib.request.urlopen(URL.format(codigo), timeout=30) as r:
            datos = r.read()
        with open(ruta, 'wb') as f:
            f.write(datos)
    return ruta


def sticker(ruta):
    """El emoji a 128 px con borde blanco y sombra, en una celda de CELDA x CELDA."""
    im = Image.open(ruta).convert('RGBA').resize((TAM, TAM), Image.LANCZOS)
    alfa = Image.new('L', (CELDA, CELDA), 0)
    alfa.paste(im.getchannel('A'), (MARGEN, MARGEN))
    # Borde: el contorno del emoji "engordado" BORDE píxeles
    gordo = alfa.point(lambda a: 255 if a > 40 else 0).filter(ImageFilter.MaxFilter(2 * BORDE + 1))
    gordo = gordo.filter(ImageFilter.GaussianBlur(0.8))
    # Sombra: la misma silueta, corrida y difuminada
    sombra = Image.new('L', (CELDA, CELDA), 0)
    sombra.paste(gordo, SOMBRA)
    sombra = sombra.filter(ImageFilter.GaussianBlur(3)).point(lambda a: int(a * 0.32))
    celda = Image.new('RGBA', (CELDA, CELDA), (0, 0, 0, 0))
    celda.paste((27, 16, 48, 255), (0, 0), sombra)
    blanco = Image.new('RGBA', (CELDA, CELDA), (255, 255, 255, 255))
    blanco.putalpha(gordo)
    celda.alpha_composite(blanco)
    celda.alpha_composite(im, (MARGEN, MARGEN))
    return celda


def main():
    nombres = list(EMOJI)
    por_fila = ANCHO // (CELDA + SEP)
    filas = (len(nombres) + por_fila - 1) // por_fila
    alto = 1
    while alto < filas * (CELDA + SEP) + SEP:
        alto *= 2
    hoja = Image.new('RGBA', (ANCHO, alto), (0, 0, 0, 0))
    pos = {}
    faltan = []
    for i, nombre in enumerate(nombres):
        try:
            im = sticker(bajar(EMOJI[nombre]))
        except Exception as e:                       # noqa: BLE001 — se informa y se sigue
            faltan.append(f'{nombre} ({EMOJI[nombre]}): {e}')
            continue
        x = SEP + (i % por_fila) * (CELDA + SEP)
        y = SEP + (i // por_fila) * (CELDA + SEP)
        hoja.alpha_composite(im, (x, y))
        pos[nombre] = (x, y)
    if faltan:
        print('NO SE PUDIERON BAJAR:\n  ' + '\n  '.join(faltan))
        sys.exit(1)

    hoja.save(os.path.join(RAIZ, 'assets', 'emoji.webp'), 'WEBP', quality=82, alpha_quality=75, method=6)
    hoja.save(os.path.join(RAIZ, 'assets', 'emoji.png'), 'PNG', optimize=True)

    lineas = [
        '// Generado por herramientas/armar_emoji.py — no editar a mano.',
        '// Emoji Noto (Google), estilo 2D, licencia Apache 2.0.',
        f'export const TAM_EMOJI = {TAM};      // el dibujo',
        f'export const CELDA_EMOJI = {CELDA};  // la celda: dibujo + borde + sombra',
        'export const EMOJI = {',
    ]
    for nombre in nombres:
        x, y = pos[nombre]
        lineas.append(f"  {nombre}: [{x}, {y}],")
    lineas.append('};')
    with open(os.path.join(RAIZ, 'js', 'datos', 'emoji.js'), 'w', encoding='utf-8', newline='\n') as f:
        f.write('\n'.join(lineas) + '\n')

    kb = lambda p: os.path.getsize(os.path.join(RAIZ, 'assets', p)) // 1024
    print(f'{len(nombres)} emoji en {ANCHO}x{alto}: emoji.webp {kb("emoji.webp")} KB, emoji.png {kb("emoji.png")} KB')


if __name__ == '__main__':
    main()
