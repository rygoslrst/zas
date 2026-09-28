#!/usr/bin/env python3
# =============================================================================
#  servidor.py — servidor de desarrollo
# -----------------------------------------------------------------------------
#  Es `python -m http.server` con tres arreglos:
#   1. Le prohíbe al navegador guardar archivos en caché. Sin esto, después de
#      editar un .js el navegador a veces sigue usando el viejo y parece que el
#      cambio "no anda".
#   2. Fuerza el tipo correcto para .js: en algunos Windows, Python lo sirve
#      como texto plano y el navegador se niega a cargar los módulos.
#   3. Acepta capturas del canvas (POST a /__captura/nombre.jpg) y las guarda
#      en capturas/. Sirve para revisar los microjuegos con pruebas
#      automáticas. Sólo existe acá: GitHub Pages no acepta POST.
#
#  Uso (desde cualquier carpeta):
#      python servidor.py
#  y abrí http://localhost:8124   (con ?debug para ver los FPS)
# =============================================================================

import http.server
import os
import re
import sys

PUERTO = int(sys.argv[1]) if len(sys.argv) > 1 else 8124


class SinCache(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        '.js': 'text/javascript',
        '.woff2': 'font/woff2',
        '.json': 'application/json',
        '.webp': 'image/webp',
    }

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def do_POST(self):
        m = re.fullmatch(r'/__captura/([\w-]+\.jpg)', self.path)
        if not m:
            self.send_error(404)
            return
        largo = int(self.headers.get('Content-Length', 0))
        if largo > 5_000_000:
            self.send_error(413)
            return
        os.makedirs('capturas', exist_ok=True)
        with open(os.path.join('capturas', m.group(1)), 'wb') as f:
            f.write(self.rfile.read(largo))
        self.send_response(204)
        self.end_headers()

    def log_message(self, formato, *args):
        pass   # sin una línea por archivo: la consola queda limpia


if __name__ == '__main__':
    os.chdir(os.path.dirname(os.path.abspath(__file__)))   # sirve esta carpeta, desde donde sea
    print(f'ZAS en http://localhost:{PUERTO}   (Ctrl+C para cortar)')
    http.server.ThreadingHTTPServer(('', PUERTO), SinCache).serve_forever()
