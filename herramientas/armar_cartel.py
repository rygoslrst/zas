#!/usr/bin/env python3
# =============================================================================
#  armar_cartel.py — el cartel A4 del stand, con el QR que abre el juego
# -----------------------------------------------------------------------------
#  Genera stand/cartel.html (y stand/qr.svg). Si cambia la dirección del juego,
#  cambiá URL y volvé a correrlo:
#      python herramientas/armar_cartel.py
#  Necesita: pip install qrcode
# =============================================================================

import os
import qrcode
import qrcode.constants

URL = 'https://rygoslrst.github.io/zas/'
URL_VISIBLE = 'rygoslrst.github.io/zas'

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(AQUI)


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


PLANTILLA = '''<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>ZAS — cartel del stand</title>
<!-- Generado por herramientas/armar_cartel.py -->
<style>
  /* Cartel para imprimir en A4. Fondo blanco a propósito: gasta poca tinta en
     la impresora del colegio y el QR se lee mejor con máximo contraste. */
  @font-face { font-family: 'Anton'; src: url('../fuentes/anton-latin.woff2') format('woff2'); }
  @page { size: A4 portrait; margin: 0; }
  :root { --tinta: #1b1030; --oro: #f2b705; --coral: #e5484d; --gris: #5b5570; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #e9e6ef; font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; color: var(--tinta); }
  .hoja {
    width: 210mm; height: 297mm; margin: 12mm auto; background: #fff;
    padding: 16mm 18mm 14mm; display: flex; flex-direction: column; align-items: center;
    box-shadow: 0 6px 30px rgba(27, 16, 48, 0.18);
  }
  h1 {
    font-family: 'Anton', Impact, sans-serif; font-weight: 400; font-size: 70mm; line-height: 0.85;
    color: var(--oro); transform: rotate(-6deg);
    text-shadow: 0 1.6mm 0 #b88a04, 0 3.2mm 0 var(--tinta);
  }
  .bajada { font-size: 7mm; font-weight: 600; margin-top: 9mm; text-align: center; line-height: 1.3; }
  .qr { width: 100mm; height: 100mm; margin-top: 9mm; }
  .qr svg { width: 100%; height: 100%; display: block; }
  .escanea { font-family: 'Anton', Impact, sans-serif; font-size: 9.4mm; letter-spacing: 0.04em; text-transform: uppercase; margin-top: 6mm; text-align: center; }
  .url { font-size: 5.4mm; color: var(--gris); margin-top: 2mm; letter-spacing: 0.02em; }
  .ordenes { display: flex; flex-wrap: wrap; justify-content: center; gap: 3mm; margin-top: 9mm; max-width: 160mm; }
  .ordenes span {
    font-family: 'Anton', Impact, sans-serif; font-size: 6.4mm; letter-spacing: 0.03em;
    border: 0.6mm solid var(--tinta); border-radius: 99mm; padding: 1mm 4.5mm 1.4mm;
  }
  .nota { font-size: 4.6mm; color: var(--gris); margin-top: 6mm; text-align: center; }
  .voto { margin-top: auto; font-family: 'Anton', Impact, sans-serif; font-size: 8.6mm; letter-spacing: 0.05em; text-transform: uppercase; color: var(--coral); }
  .imprimir { position: fixed; top: 16px; right: 16px; font: 600 15px system-ui, sans-serif; padding: 12px 20px; border-radius: 999px; border: 0; background: var(--tinta); color: #fff; cursor: pointer; }
  .imprimir:focus-visible { outline: 3px solid var(--oro); outline-offset: 2px; }
  /* Sólo en pantalla: la vista previa se achica para entrar entera. */
  @media screen and (max-width: 880px) { .hoja { zoom: 0.72; } }
  @media screen and (max-height: 1180px) and (min-width: 881px) { .hoja { zoom: 0.8; } }
  @media print {
    body { background: #fff; }
    .hoja { margin: 0; box-shadow: none; }
    .imprimir { display: none; }
  }
</style>
</head>
<body>
<button class="imprimir" type="button" onclick="print()">Imprimir</button>
<main class="hoja">
  <h1>ZAS</h1>
  <p class="bajada">Microjuegos de 4 segundos.<br>¿Cuántos aguantás?</p>

  <div class="qr" role="img" aria-label="Código QR para abrir el juego">__QR__</div>
  <p class="escanea">Escaneá y jugá en tu celular</p>
  <p class="url">__URL__</p>

  <div class="ordenes" aria-label="Algunas de las órdenes del juego">
    <span>¡ATRAPÁ!</span><span>¡CORTÁ EL ROJO!</span><span>¡PEGALE!</span><span>¡VOLÁ!</span>
    <span>¡QUE NO TE VEA!</span><span>¡NO TOQUES NADA!</span><span>¿CUÁNTO ES?</span>
  </div>
  <p class="nota">Con el teléfono derecho. No hace falta instalar nada.</p>

  <p class="voto">Si te gustó, votá por ZAS</p>
</main>
</body>
</html>
'''


def main():
    svg = svg_qr(URL)
    os.makedirs(os.path.join(RAIZ, 'stand'), exist_ok=True)
    with open(os.path.join(RAIZ, 'stand', 'qr.svg'), 'w', encoding='utf-8', newline='\n') as f:
        f.write(svg)
    html = PLANTILLA.replace('__QR__', svg).replace('__URL__', URL_VISIBLE)
    with open(os.path.join(RAIZ, 'stand', 'cartel.html'), 'w', encoding='utf-8', newline='\n') as f:
        f.write(html)
    print(f'stand/cartel.html y stand/qr.svg para {URL}')


if __name__ == '__main__':
    main()
