#!/usr/bin/env python3
# =============================================================================
#  armar_sw.py — arma sw.js (el service worker: jugar sin internet)
# -----------------------------------------------------------------------------
#  El service worker guarda en el aparato TODOS los archivos del juego de una
#  misma versión, juntos: así nunca se mezclan archivos viejos y nuevos, la
#  segunda vez carga al instante y en el stand no depende del Wi-Fi.
#
#  La versión es una huella de los archivos: si cambia cualquiera, cambia
#  sw.js, el navegador lo nota, baja la versión nueva completa y la usa desde
#  la vez siguiente que se abre el juego.
#
#  Lo corre solo el gancho de git (.git/hooks/pre-commit) antes de cada
#  commit. A mano: python herramientas/armar_sw.py
#  Si se agrega una carpeta o un tipo de archivo que el juego usa, sumarlo a
#  GUARDAR (los atlas de emoji no van: son pesados y hay 5; se guarda sólo el
#  que usa cada aparato, al usarlo).
# =============================================================================

import glob
import hashlib
import os

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

GUARDAR = [
    'index.html', 'estilo.css', 'manifest.webmanifest',
    'js/**/*.js', 'vendor/phaser.min.js', 'fuentes/*.woff2',
    'assets/*.svg', 'assets/icono*.png', 'stand/qr.svg',
    'herramientas/pruebas/bots.js',            # la demo del modo stand
]
# Entran en la huella aunque no se guarden de entrada
HUELLA_TAMBIEN = ['assets/emoji*.webp', 'assets/emoji*.png']

PLANTILLA = r"""// ============================================================================
//  sw.js — jugar sin internet. GENERADO por herramientas/armar_sw.py: no
//  editar a mano (se rehace antes de cada commit).
// ----------------------------------------------------------------------------
//  Guarda juntos todos los archivos de una versión y los sirve desde el
//  aparato (nunca se mezclan versiones). Una versión nueva se baja entera en
//  segundo plano y se usa desde la próxima vez que se abre el juego.
//  Los atlas de emoji se guardan al usarlos (sólo el de cada aparato), y una
//  versión nueva vuelve a bajar los que ya se usaban.
//  Lo que no es del juego (la tabla de récords en Supabase) va directo a la red.
// ============================================================================
const VERSION = '__VERSION__';
const ARCHIVOS = __ARCHIVOS__;
const CAJA = 'zas-' + VERSION;
const ES_ATLAS = /\/assets\/emoji[^/]*$/;

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const caja = await caches.open(CAJA);
    // 'no-cache': pregunta al servidor (si no cambió, no se vuelve a bajar)
    await caja.addAll(ARCHIVOS.map(u => new Request(u, { cache: 'no-cache' })));
    // Los atlas que este aparato ya usaba, en su versión nueva
    for (const nombre of await caches.keys()) {
      if (!nombre.startsWith('zas-') || nombre === CAJA) continue;
      const vieja = await caches.open(nombre);
      for (const r of await vieja.keys()) {
        if (!ES_ATLAS.test(new URL(r.url).pathname)) continue;
        try { await caja.add(new Request(r.url, { cache: 'no-cache' })); } catch (err) { /* ya no existe */ }
      }
    }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const nombre of await caches.keys()) {
      if (nombre.startsWith('zas-') && nombre !== CAJA) await caches.delete(nombre);
    }
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const pedido = e.request;
  if (pedido.method !== 'GET') return;
  const url = new URL(pedido.url);
  if (url.origin !== location.origin) return;
  e.respondWith((async () => {
    const caja = await caches.open(CAJA);
    // La página se abre con ?stand, ?debug...: es la misma
    const guardada = await caja.match(pedido, { ignoreSearch: pedido.mode === 'navigate' });
    if (guardada) return guardada;
    const respuesta = await fetch(pedido);
    if (respuesta.ok && ES_ATLAS.test(url.pathname)) caja.put(pedido, respuesta.clone());
    return respuesta;
  })());
});
"""


def archivos():
    lista = []
    for patron in GUARDAR:
        for f in sorted(glob.glob(os.path.join(RAIZ, patron), recursive=True)):
            if os.path.isfile(f):
                lista.append(os.path.relpath(f, RAIZ).replace(os.sep, '/'))
    return lista


def main():
    lista = archivos()
    huella = hashlib.sha256()
    extra = []
    for patron in HUELLA_TAMBIEN:
        extra += sorted(glob.glob(os.path.join(RAIZ, patron)))
    for f in [os.path.join(RAIZ, a) for a in lista] + extra:
        huella.update(os.path.relpath(f, RAIZ).replace(os.sep, '/').encode())
        with open(f, 'rb') as h:
            huella.update(h.read())
    version = huella.hexdigest()[:12]
    urls = ['./'] + lista
    cuerpo = '[\n' + ''.join(f"  '{u}',\n" for u in urls) + ']'
    sw = PLANTILLA.replace('__VERSION__', version).replace('__ARCHIVOS__', cuerpo)
    destino = os.path.join(RAIZ, 'sw.js')
    viejo = open(destino, encoding='utf-8').read() if os.path.exists(destino) else ''
    if viejo != sw:
        with open(destino, 'w', encoding='utf-8', newline='\n') as f:
            f.write(sw)
    print(f'sw.js: versión {version}, {len(urls)} archivos' + ('' if viejo != sw else ' (sin cambios)'))


if __name__ == '__main__':
    main()
