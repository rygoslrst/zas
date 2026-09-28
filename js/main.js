// ============================================================================
//  main.js — arranque
// ============================================================================

import { ANCHO, VISTA, ESCALA, DEBUG, CLAVE_SONIDO, altoParaPantalla, escalaParaPantalla } from './config.js';
import { Audio } from './motor/Audio.js';
import { UI } from './ui.js';
import { Director } from './escenas/Director.js';
import { MICROS, JEFES } from './micro/indice.js';

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

function hayWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl')));
  } catch (e) { return false; }
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
//  pausa. En la computadora (mouse) cualquier forma de ventana sirve.
// ----------------------------------------------------------------------------
function vigilarOrientacion(director) {
  const aviso = document.getElementById('gira');
  const tactil = window.matchMedia('(pointer: coarse)').matches;
  const revisar = () => {
    const acostado = tactil && window.innerWidth > window.innerHeight;
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
      if (!d || d.estado !== 'pausa') audio.pausar();
    } else if (!d || d.estado !== 'pausa') {
      audio.reanudar();
    }
  });
}

async function arrancar() {
  blindarGestos();
  if (!hayWebGL()) {
    document.getElementById('error').hidden = false;
    document.getElementById('cargando').hidden = true;
    return;
  }

  // La tipografía y los emoji tienen que estar antes de armar las texturas.
  const fuente = Promise.race([document.fonts.load('128px Anton'), new Promise(r => setTimeout(r, 3000))])
    .catch(() => { /* seguimos con la de respaldo */ });
  const imagenEmoji = new Image();
  imagenEmoji.src = (await soportaWebp()) ? 'assets/emoji.webp' : 'assets/emoji.png';
  await Promise.all([fuente, imagenEmoji.decode()]);

  const audio = new Audio(CLAVE_SONIDO);
  const ui = new UI(audio, imagenEmoji);

  VISTA.alto = altoParaPantalla(window.innerWidth, window.innerHeight);
  ESCALA.k = escalaParaPantalla(window.innerWidth, window.innerHeight, VISTA.alto);
  const juego = new Phaser.Game({
    type: Phaser.WEBGL,
    parent: 'juego',
    width: Math.round(ANCHO * ESCALA.k),
    height: Math.round(VISTA.alto * ESCALA.k),
    backgroundColor: '#1b1030',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    render: { antialias: true, pixelArt: false, roundPixels: false, powerPreference: 'high-performance' },
    fps: { target: 60, min: 20 },
    audio: { noAudio: true },                  // el audio es nuestro: un solo AudioContext
    input: { activePointers: 3, keyboard: false, gamepad: false },
    banner: false,
  });
  // Los microjuegos primero y el Director al final: así queda dibujado encima.
  for (const M of [...MICROS, ...JEFES]) juego.scene.add(M.name, M, false);
  juego.scene.add('Director', Director, true, { audio, ui, imagenEmoji });

  const director = () => juego.scene.getScene('Director');
  vigilarOrientacion(director);
  vigilarAlto(juego, director);
  vigilarVisibilidad(director, audio);
  document.getElementById('cargando').hidden = true;
  if (DEBUG) window.juego = juego;
}

arrancar();
