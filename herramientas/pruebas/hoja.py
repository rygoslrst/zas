# Arma hojas de contacto con las capturas (para revisar los microjuegos de un vistazo)
from PIL import Image
import os, sys
def hoja(nombres, sufijos, salida, w=270, h=480):
    W = len(nombres) * (w + 6); H = len(sufijos) * (h + 6)
    out = Image.new('RGB', (W, H), (30, 20, 50))
    for i, n in enumerate(nombres):
        for j, s in enumerate(sufijos):
            p = f'{n}_{s}.jpg'
            if os.path.exists(p):
                out.paste(Image.open(p).resize((w, h)), (i * (w + 6), j * (h + 6)))
    out.save(salida, quality=85)
if __name__ == '__main__':
    nombres = sys.argv[1].split(',')
    sufijos = sys.argv[2].split(',')
    hoja(nombres, sufijos, sys.argv[3])
