// ============================================================================
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
const VERSION = 'd3b0a5f73c89';
const ARCHIVOS = [
  './',
  'index.html',
  'estilo.css',
  'manifest.webmanifest',
  'js/config.js',
  'js/datos/emoji.js',
  'js/datos/mascota.js',
  'js/errores.js',
  'js/escenas/Director.js',
  'js/escenas/Micro.js',
  'js/escenas/Practica.js',
  'js/filtroNombres.js',
  'js/main.js',
  'js/micro/Aplasta.js',
  'js/micro/Ataja.js',
  'js/micro/Atrapa.js',
  'js/micro/Cable.js',
  'js/micro/Carrera.js',
  'js/micro/Carril.js',
  'js/micro/Colores.js',
  'js/micro/Comer.js',
  'js/micro/Corta.js',
  'js/micro/Cruza.js',
  'js/micro/Cuantos.js',
  'js/micro/Cuerda.js',
  'js/micro/Dardo.js',
  'js/micro/Despega.js',
  'js/micro/Distinto.js',
  'js/micro/Duelo.js',
  'js/micro/Encaja.js',
  'js/micro/Encesta.js',
  'js/micro/Equilibra.js',
  'js/micro/Esquiva.js',
  'js/micro/Flechas.js',
  'js/micro/Foto.js',
  'js/micro/Frena.js',
  'js/micro/Fuego.js',
  'js/micro/Grande.js',
  'js/micro/Grua.js',
  'js/micro/Honda.js',
  'js/micro/Infla.js',
  'js/micro/Lazo.js',
  'js/micro/Limpia.js',
  'js/micro/Llena.js',
  'js/micro/Manivela.js',
  'js/micro/Marciano.js',
  'js/micro/Memoria.js',
  'js/micro/NoToques.js',
  'js/micro/Orden.js',
  'js/micro/Patea.js',
  'js/micro/Pedalea.js',
  'js/micro/Pesca.js',
  'js/micro/Puertas.js',
  'js/micro/Pulpo.js',
  'js/micro/Puntillas.js',
  'js/micro/Rebota.js',
  'js/micro/Reventa.js',
  'js/micro/Revuelve.js',
  'js/micro/Ritmo.js',
  'js/micro/Ruleta.js',
  'js/micro/Salta.js',
  'js/micro/Separa.js',
  'js/micro/Sigue.js',
  'js/micro/Simon.js',
  'js/micro/Sopla.js',
  'js/micro/Suma.js',
  'js/micro/Torta.js',
  'js/micro/Traza.js',
  'js/micro/Une.js',
  'js/micro/Vasos.js',
  'js/micro/Vuela.js',
  'js/micro/indice.js',
  'js/motor/Atlas.js',
  'js/motor/Audio.js',
  'js/tabla.js',
  'js/tarjeta.js',
  'js/ui.js',
  'vendor/phaser.min.js',
  'fuentes/anton-latin.woff2',
  'assets/icono.svg',
  'assets/zas-euforico.svg',
  'assets/zas-feliz.svg',
  'assets/zas-guino.svg',
  'assets/zas-triste.svg',
  'assets/icono-192.png',
  'assets/icono-512.png',
  'assets/icono-apple.png',
  'assets/icono-mascara-512.png',
  'stand/qr.svg',
  'herramientas/pruebas/bots.js',
];
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
