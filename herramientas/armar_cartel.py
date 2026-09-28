#!/usr/bin/env python3
# =============================================================================
#  armar_cartel.py — el cartel del stand y las tarjetitas, con el QR del juego
# -----------------------------------------------------------------------------
#  Genera, en stand/:
#      cartel.html     cartel A4 para pegar en el stand (a color o "ahorra tinta")
#      tarjetas.html   8 tarjetitas por hoja A4 para recortar y repartir
#      pegatinas.webp  los emoji del cartel, en alta resolución (para imprimir)
#      qr.svg          el código QR solo
#
#  Si cambia la dirección del juego, cambiá URL y volvé a correrlo:
#      python herramientas/armar_cartel.py
#  Necesita: pip install qrcode pillow
#
#  Para rehacer los PDF (con el servidor de desarrollo andando), con Edge:
#      msedge --headless=new --no-pdf-header-footer --virtual-time-budget=6000
#             --print-to-pdf=stand/cartel.pdf http://localhost:8124/stand/cartel.html
#  (y lo mismo con cartel.html#ahorro → cartel-ahorra-tinta.pdf y tarjetas.html)
# =============================================================================

import os
import sys
import qrcode
import qrcode.constants
from PIL import Image

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(AQUI)
sys.path.insert(0, AQUI)
from armar_emoji import EMOJI, bajar, sticker   # noqa: E402

URL = 'https://rygoslrst.github.io/zas/'
URL_VISIBLE = 'rygoslrst.github.io/zas'

# Emoji que usa el cartel (los del juego y alguno más)
PEGATINAS = ['bomba', 'globo', 'pizza', 'gato', 'sandia', 'pelota', 'cohete', 'sapo', 'diamante',
             'trofeo', 'medalla_bronce', 'medalla_plata', 'medalla_oro', 'dedo', 'estrella',
             'marciano', 'corona', 'rayo', 'telefono', 'explosion']
EXTRA = {'telefono': '1f4f1'}
K = 3                                   # tres veces el tamaño del juego: nítido impreso
COLUMNAS = 5


def svg_qr(url, tinta='#1b1030'):
    # Corrección de errores alta (H): se sigue leyendo aunque el papel se
    # arrugue o alguien le ponga un dedo encima.
    qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_H, border=0, box_size=1)
    qr.add_data(url)
    qr.make(fit=True)
    m = qr.get_matrix()
    n = len(m)
    # Un solo <path> con un rectángulo por tramo de módulos: liviano y nítido.
    partes = []
    for y, fila in enumerate(m):
        x = 0
        while x < n:
            if fila[x]:
                x0 = x
                while x < n and fila[x]:
                    x += 1
                partes.append(f'M{x0} {y}h{x - x0}v1h-{x - x0}z')
            else:
                x += 1
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="-4 -4 {n + 8} {n + 8}" shape-rendering="crispEdges">'
            f'<rect x="-4" y="-4" width="{n + 8}" height="{n + 8}" fill="#fff"/>'
            f'<path fill="{tinta}" d="{"".join(partes)}"/></svg>')


def estallido(n=13, ancho=200, alto=110):
    """Puntos de un estallido de historieta (para el SVG detrás del logo)."""
    import math
    pts = []
    for k in range(n * 2):
        a = k / (n * 2) * math.tau - math.pi / 2
        r = (0.62 + 0.06 * ((k * 7) % 3)) if k % 2 else (1.0 - 0.05 * ((k * 5) % 3))
        pts.append(f'{ancho / 2 + math.cos(a) * r * (ancho / 2 - 3):.1f},{alto / 2 + math.sin(a) * r * (alto / 2 - 3):.1f}')
    return ' '.join(pts)


def rayos(n=18, r=150):
    """Rayos de sol como dibujo vectorial (un gradiente cónico de CSS se imprime
    como imagen en pedazos y se ve la unión)."""
    import math
    d = []
    for k in range(n):
        a0 = k / n * math.tau
        a1 = a0 + math.pi / n
        d.append(f'M0 0L{math.cos(a0) * r:.1f} {math.sin(a0) * r:.1f}L{math.cos(a1) * r:.1f} {math.sin(a1) * r:.1f}Z')
    return (f'<svg class="rayos" viewBox="-{r} -{r} {2 * r} {2 * r}" aria-hidden="true">'
            f'<path d="{"".join(d)}"/></svg>')


def armar_pegatinas():
    """Una sola imagen con los stickers del cartel y el CSS para usarlos."""
    celdas = []
    for nombre in PEGATINAS:
        codigo = EXTRA.get(nombre) or EMOJI[nombre]
        celdas.append(sticker(bajar(codigo), K))
    lado = celdas[0].size[0]
    filas = (len(celdas) + COLUMNAS - 1) // COLUMNAS
    hoja = Image.new('RGBA', (COLUMNAS * lado, filas * lado), (0, 0, 0, 0))
    for i, c in enumerate(celdas):
        hoja.alpha_composite(c, ((i % COLUMNAS) * lado, (i // COLUMNAS) * lado))
    hoja.save(os.path.join(RAIZ, 'stand', 'pegatinas.webp'), 'WEBP', quality=92, method=6)
    # CSS: cada .e-nombre muestra su celda, a cualquier tamaño (en %)
    css = [f'.e {{ background: url(pegatinas.webp) no-repeat; background-size: {COLUMNAS * 100}% {filas * 100}%; }}']
    for i, nombre in enumerate(PEGATINAS):
        col, fila = i % COLUMNAS, i // COLUMNAS
        px = col / (COLUMNAS - 1) * 100
        py = fila / (filas - 1) * 100 if filas > 1 else 0
        css.append(f'.e-{nombre} {{ background-position: {px:.3f}% {py:.3f}%; }}')
    return '\n  '.join(css)


def main():
    os.makedirs(os.path.join(RAIZ, 'stand'), exist_ok=True)
    qr = svg_qr(URL)
    with open(os.path.join(RAIZ, 'stand', 'qr.svg'), 'w', encoding='utf-8', newline='\n') as f:
        f.write(qr)
    css_pegatinas = armar_pegatinas()
    for plantilla, salida in (('plantilla_cartel.html', 'cartel.html'), ('plantilla_tarjetas.html', 'tarjetas.html')):
        with open(os.path.join(AQUI, plantilla), encoding='utf-8') as f:
            html = f.read()
        html = (html.replace('/*__PEGATINAS__*/', css_pegatinas)
                    .replace('<!--__QR__-->', qr)
                    .replace('__URL__', URL_VISIBLE)
                    .replace('__ESTALLIDO__', estallido())
                    .replace('<!--__RAYOS__-->', rayos()))
        with open(os.path.join(RAIZ, 'stand', salida), 'w', encoding='utf-8', newline='\n') as f:
            f.write(html)
    kb = os.path.getsize(os.path.join(RAIZ, 'stand', 'pegatinas.webp')) // 1024
    print(f'stand/cartel.html, stand/tarjetas.html y stand/pegatinas.webp ({kb} KB) para {URL}')


if __name__ == '__main__':
    main()
