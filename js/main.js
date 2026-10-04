// ============================================================================
//  main.js — arranque
// ============================================================================

import { ANCHO, VISTA, ESCALA, DEBUG, CLAVE_SONIDO, CLAVE_MUSICA, MENOS_MOVIMIENTO, altoParaPantalla, escalaParaPantalla } from './config.js';
import { Audio } from './motor/Audio.js';
import { UI } from './ui.js';
import { Director } from './escenas/Director.js';
import { MICROS, JEFES } from './micro/indice.js';
import { ARCHIVO_EMOJI, LADO_ATLAS, usarAtlas } from './datos/emoji.js';
import { lienzoMascota } from './datos/mascota.js';

// Instalar en la pantalla de inicio: Chrome avisa que se puede con
// "beforeinstallprompt", a veces antes de que exista la interfaz (que muestra
// el botón "Instalar en el teléfono" cuando hay pedido).
const instalar = { pedido: null, alCambiar: () => {} };
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); instalar.pedido = e; instalar.alCambiar(); });
window.addEventListener('appinstalled', () => { instalar.pedido = null; instalar.alCambiar(); });

// JUGAR SIN INTERNET: el service worker (sw.js, lo arma herramientas/armar_sw.py)
// guarda el juego en el aparato: la segunda vez carga al instante y anda sin
// conexión. En localhost no (se probarían versiones viejas), salvo con ?sw.
function registrarSW(archivoAtlas) {
  const local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  if (!('serviceWorker' in navigator) || (local && !new URLSearchParams(location.search).has('sw'))) return;
  navigator.serviceWorker.register('sw.js').then(() => {
    // El atlas de emoji de este aparato también tiene que quedar guardado: si
    // se bajó antes de que el service worker manejara la página, se pide de
    // nuevo a través de él (sale de la caché del navegador: no se baja otra vez)
    const guardar = () => fetch(archivoAtlas).catch(() => {});
    if (navigator.serviceWorker.controller) guardar();
    else navigator.serviceWorker.addEventListener('controllerchange', guardar, { once: true });
  }).catch(() => { /* sin service worker: el juego anda igual */ });
}

// ----------------------------------------------------------------------------
//  Que el navegador no se coma los toques: sin esto, arrastrar el dedo hace
//  scroll, dos toques rápidos hacen zoom y deslizar desde arriba recarga la
//  página en medio de una partida. El panel de créditos sí puede desplazarse.
// ----------------------------------------------------------------------------
function blindarGestos() {
  const enPanel = e => e.target && e.target.closest && e.target.closest('.desplazable');
  const parar = e => { if (!enPanel(e)) e.preventDefault(); };
  document.addEventListener('touchmove', parar, { passive: false });
  document.addEventListener('gesturestart', parar, { passive: false });
  document.addEventListener('gesturechange', parar, { passive: false });
  document.addEventListener('dblclick', parar, { passive: false });
  document.addEventListener('contextmenu', e => e.preventDefault());
  let ultimo = 0;
  document.addEventListener('touchend', e => {
    const ahora = Date.now();
    if (ahora - ultimo < 320 && !enPanel(e) && !e.target.closest('.boton')) e.preventDefault();
    ultimo = ahora;
  }, { passive: false });
}

// El atlas de emoji más nítido que el aparato aguante: el de 256 px sólo con
// pantalla nítida (k alto) y memoria de sobra (Chrome la informa; si no se
// sabe, el de 192). El de 128 si la placa no admite texturas de 4096.
function elegirAtlas(maxTextura, k) {
  const memoria = navigator.deviceMemory || 0;
  if (maxTextura >= LADO_ATLAS.uhd && k >= 1.75 && memoria >= 4) return 'uhd';
  if (maxTextura >= LADO_ATLAS.hd) return 'hd';
  return 'sd';
}

// Devuelve el lado máximo de textura que admite la placa de video (0: sin WebGL)
function texturaMaxima() {
  try {
    const c = document.createElement('canvas');
    const gl = window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl'));
    if (!gl) return 0;
    const max = gl.getParameter(gl.MAX_TEXTURE_SIZE) || 2048;
    const perder = gl.getExtension('WEBGL_lose_context');
    if (perder) perder.loseContext();             // este contexto era sólo para preguntar
    return max;
  } catch (e) { return 0; }
}

// La barra de la pantalla de carga (de 0 a 1)
function avance(f) {
  const barra = document.getElementById('barra-carga');
  if (barra) barra.style.width = `${Math.round(4 + 96 * Math.min(1, f))}%`;
}

// Baja el atlas de emoji de a pedazos, para mover la barra mientras llega (es
// lo más pesado: casi 1 MB). Si el navegador no deja leer de a pedazos, se
// baja de una.
async function bajarAtlas(img, url, desde, hasta) {
  try {
    const r = await fetch(url);
    if (!r.ok || !r.body || !r.body.getReader) throw new Error('sin pedazos');
    const total = parseInt(r.headers.get('content-length'), 10) || 0;
    const lector = r.body.getReader(), pedazos = [];
    let llegado = 0;
    for (;;) {
      const { done, value } = await lector.read();
      if (done) break;
      pedazos.push(value);
      llegado += value.length;
      // sin tamaño conocido, la barra igual avanza (cada vez más despacio)
      const f = total ? llegado / total : 1 - 1 / (1 + llegado / 600000);
      avance(desde + (hasta - desde) * f);
    }
    img.src = URL.createObjectURL(new Blob(pedazos, { type: r.headers.get('content-type') || '' }));
  } catch (e) {
    img.src = url;
  }
  await img.decode();
  avance(hasta);
}

// WebP pesa la mitad; los iPhone muy viejos no lo leen y reciben el PNG.
function soportaWebp() {
  return new Promise(r => {
    const img = new Image();
    img.onload = () => r(img.width === 1);
    img.onerror = () => r(false);
    img.src = 'data:image/webp;base64,UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA';
  });
}

// ----------------------------------------------------------------------------
//  ZAS se juega con el celular en vertical. Si lo giran, se pide volver y se
//  pausa. En la computadora (mouse) cualquier forma de ventana sirve, y en una
//  tablet también: acostada hay alto de sobra (se juega en una franja, como en
//  la computadora). Sólo molesta un teléfono acostado: queda muy bajo.
// ----------------------------------------------------------------------------
function vigilarOrientacion(director) {
  const aviso = document.getElementById('gira');
  const tactil = window.matchMedia('(pointer: coarse)').matches;
  const revisar = () => {
    const acostado = tactil && window.innerWidth > window.innerHeight && window.innerHeight < 500;
    aviso.hidden = !acostado;
    const d = director();
    if (acostado && d) d.pausar();
  };
  window.addEventListener('resize', revisar);
  window.addEventListener('orientationchange', () => setTimeout(revisar, 250));
  revisar();
}

// El alto del mundo se adapta a la pantalla (celulares más o menos alargados),
// y la resolución a la que se dibuja, a la densidad de la pantalla.
function vigilarAlto(juego, director) {
  let pendiente = 0;
  const revisar = () => {
    const h = altoParaPantalla(window.innerWidth, window.innerHeight);
    const k = escalaParaPantalla(window.innerWidth, window.innerHeight, h);
    if (h === VISTA.alto && k === ESCALA.k) return;
    ESCALA.k = k;
    juego.scale.setGameSize(Math.round(ANCHO * k), Math.round(h * k));
    juego.scale.refresh();
    const d = director();
    if (d && d.fondoCapa) d.redimensionar(h);
    else VISTA.alto = h;
  };
  window.addEventListener('resize', () => { clearTimeout(pendiente); pendiente = setTimeout(revisar, 120); });
}

function vigilarVisibilidad(director, audio) {
  document.addEventListener('visibilitychange', () => {
    const d = director();
    if (document.hidden) {
      if (d && d.estado !== 'pausa') d.pausar();
      audio.pausar();                   // (también en la pausa: por si sonaba la cuenta)
    } else if (!d || d.estado !== 'pausa') {
      audio.reanudar();
    }
  });
}

async function arrancar() {
  blindarGestos();
  // "Reducir movimiento": ninguna cámara se sacude (vale para todas las escenas)
  if (MENOS_MOVIMIENTO) Phaser.Cameras.Scene2D.Camera.prototype.shake = function () { return this; };
  const maxTextura = texturaMaxima();
  if (!maxTextura) {
    document.getElementById('error').hidden = false;
    document.getElementById('cargando').hidden = true;
    return;
  }

  // La tipografía y los emoji tienen que estar antes de armar las texturas.
  const fuente = Promise.race([document.fonts.load('128px Anton'), new Promise(r => setTimeout(r, 3000))])
    .catch(() => { /* seguimos con la de respaldo */ });
  VISTA.alto = altoParaPantalla(window.innerWidth, window.innerHeight);
  ESCALA.k = escalaParaPantalla(window.innerWidth, window.innerHeight, VISTA.alto);
  const atlas = new URLSearchParams(location.search).get('atlas');      // para probar: ?atlas=sd
  usarAtlas(LADO_ATLAS[atlas] ? atlas : elegirAtlas(maxTextura, ESCALA.k));
  avance(0.1);
  const imagenEmoji = new Image();
  const archivo = ARCHIVO_EMOJI + ((await soportaWebp()) ? '.webp' : '.png');
  // La mascota (dibujada en SVG) se pasa a imagen, más nítida en pantallas densas
  const [, , mascota] = await Promise.all([fuente, bajarAtlas(imagenEmoji, archivo, 0.12, 0.9),
    lienzoMascota(ESCALA.k >= 1.75 ? 2 : 1.25).catch(() => null)]);
  avance(0.95);

  const audio = new Audio(CLAVE_SONIDO, CLAVE_MUSICA);
  const ui = new UI(audio, imagenEmoji, instalar);

  const juego = new Phaser.Game({
    type: Phaser.WEBGL,
    parent: 'juego',
    width: Math.round(ANCHO * ESCALA.k),
    height: Math.round(VISTA.alto * ESCALA.k),
    backgroundColor: '#1b1030',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.NO_CENTER },     // lo centra el CSS (#juego): si centraran los dos, quedaría corrido a la derecha
    // mipmaps: la placa guarda versiones reducidas de los emoji y los achica sin "dientes"
    render: { antialias: true, pixelArt: false, roundPixels: false, powerPreference: 'high-performance',
      mipmapFilter: 'LINEAR_MIPMAP_LINEAR' },
    fps: { target: 60, min: 20 },
    audio: { noAudio: true },                  // el audio es nuestro: un solo AudioContext
    input: { activePointers: 3, keyboard: false, gamepad: false },
    banner: false,
  });
  // Los microjuegos primero y el Director al final: así queda dibujado encima.
  for (const M of [...MICROS, ...JEFES]) juego.scene.add(M.name, M, false);
  juego.scene.add('Director', Director, true, { audio, ui, imagenEmoji, mascota });

  const director = () => juego.scene.getScene('Director');
  vigilarOrientacion(director);
  vigilarAlto(juego, director);
  vigilarVisibilidad(director, audio);
  avance(1);
  document.getElementById('cargando').hidden = true;
  if (DEBUG) window.juego = juego;
  setTimeout(() => registrarSW(archivo), 3000);      // después: que no le quite red a la carga
}

arrancar();
