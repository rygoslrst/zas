// ============================================================================
//  tarjeta.js — la imagen para compartir el puntaje
// ----------------------------------------------------------------------------
//  Se dibuja en un canvas con el estilo del juego (fondo con rayos, el logo,
//  Zas, el puntaje y la dirección), para mandarla por WhatsApp o donde sea.
//  La misma función arma la vista previa del link (assets/vista-previa.jpg,
//  ver herramientas/LEEME o CLAUDE.md).
// ============================================================================

import { svgMascota } from './datos/mascota.js';
import { EMOJI, CELDA_EMOJI } from './datos/emoji.js';

const FUENTE = "'Anton', Impact, 'Arial Narrow Bold', sans-serif";
const NOCHE = '#1b1030', ORO = '#ffd23f', CREMA = '#fffaf0', CORAL = '#ff6b6b';

async function cargar(src) {
  const img = new Image();
  img.src = src;
  await img.decode();
  return img;
}

// Fondo violeta con luz al centro y rayos de sol, como el telón del juego
function fondo(g, w, h, cx, cy) {
  const r = g.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.85);
  r.addColorStop(0, '#5a3bc0');
  r.addColorStop(0.45, '#3a2585');
  r.addColorStop(1, NOCHE);
  g.fillStyle = r;
  g.fillRect(0, 0, w, h);
  g.save();
  g.translate(cx, cy);
  g.fillStyle = 'rgba(255, 255, 255, 0.06)';
  const n = 18, R = Math.hypot(w, h);
  for (let k = 0; k < n; k++) {
    const a0 = (k / n) * Math.PI * 2, a1 = a0 + Math.PI / n;
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(Math.cos(a0) * R, Math.sin(a0) * R);
    g.lineTo(Math.cos(a1) * R, Math.sin(a1) * R);
    g.closePath();
    g.fill();
  }
  g.restore();
}

// Texto con borde oscuro (y sombra dura abajo, como el logo del título).
// Si no entra en 'ancho', se achica.
function texto(g, t, x, y, tam, color, { borde = 0, sombra = 0, angulo = 0, ancho = 0, sombraColor = NOCHE } = {}) {
  g.save();
  g.translate(x, y);
  g.rotate(angulo);
  g.font = `${tam}px ${FUENTE}`;
  if (ancho) {
    const w = g.measureText(t).width;
    if (w > ancho) { tam *= ancho / w; g.font = `${tam}px ${FUENTE}`; }
  }
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineJoin = 'round';
  if (sombra) {
    g.fillStyle = sombraColor;
    g.strokeStyle = sombraColor;
    g.lineWidth = borde * 2;
    if (borde) g.strokeText(t, 0, sombra);
    g.fillText(t, 0, sombra);
  }
  if (borde) { g.lineWidth = borde * 2; g.strokeStyle = NOCHE; g.strokeText(t, 0, 0); }
  g.fillStyle = color;
  g.fillText(t, 0, 0);
  g.restore();
}

// Un emoji del atlas (ya tiene borde blanco de sticker)
function emoji(g, atlas, nombre, x, y, tam, angulo = 0) {
  if (!atlas || !EMOJI[nombre]) return;
  const [ex, ey] = EMOJI[nombre];
  g.save();
  g.translate(x, y);
  g.rotate(angulo);
  g.drawImage(atlas, ex, ey, CELDA_EMOJI, CELDA_EMOJI, -tam / 2, -tam / 2, tam, tam);
  g.restore();
}

// Una cápsula de color con texto ("¿ME GANAS?")
function capsula(g, t, x, y, tam, fondoColor) {
  g.save();
  g.font = `${tam}px ${FUENTE}`;
  const w = g.measureText(t).width + tam * 1.1, h = tam * 1.45;
  g.translate(x, y);
  g.rotate(-0.04);
  g.fillStyle = NOCHE;
  redondeado(g, -w / 2 + 8, -h / 2 + 8, w, h, h / 2);
  g.fill();
  g.fillStyle = fondoColor;
  redondeado(g, -w / 2, -h / 2, w, h, h / 2);
  g.fill();
  g.lineWidth = 6;
  g.strokeStyle = NOCHE;
  g.stroke();
  g.restore();
  texto(g, t, x, y + tam * 0.04, tam, '#fff', { borde: tam * 0.06, angulo: -0.04 });
}

function redondeado(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

// La tarjeta de un resultado (1080 x 1350, la proporción que mejor se ve en
// WhatsApp e Instagram).
//   grande: "12.340" · linea: "PUNTOS · 23 MICROJUEGOS" · arriba: "¡GANA EL JUGADOR 1!"
//   cara: la de Zas · medalla: emoji (o null) · pie: "¿ME GANAS?" · url
export async function dibujarTarjeta({ grande, linea, arriba = '', cara = 'feliz', medalla = null, pie = '¿ME GANAS?',
  url = '', atlas = null }) {
  await document.fonts.load(`100px ${FUENTE}`).catch(() => {});
  const W = 1080, H = 1350;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  fondo(g, W, H, W / 2, 560);
  // Adornos en las esquinas
  emoji(g, atlas, 'rayo', 130, 150, 130, -0.3);
  emoji(g, atlas, 'estrella', 960, 120, 100, 0.25);
  emoji(g, atlas, 'globo', 110, 1130, 120, -0.2);
  emoji(g, atlas, 'cohete', 975, 1150, 120, 0.2);
  // El logo
  texto(g, 'ZAS', W / 2, 205, 250, ORO, { borde: 12, sombra: 16, angulo: -0.1, sombraColor: '#c9971a' });
  // Zas (y la medalla, si hay)
  // (con una línea arriba del resultado, Zas va más chico para que entre todo)
  const zas = await cargar('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgMascota(cara, true)));
  const zw = arriba ? 240 : 300, zh = zw * 250 / 200;
  g.drawImage(zas, W / 2 - zw / 2 - (medalla ? 70 : 0), arriba ? 315 : 330, zw, zh);
  if (medalla) emoji(g, atlas, medalla, W / 2 + 170, 560, 220, 0.15);
  // El resultado (las letras de Anton son altas: el número grande ocupa
  // ~110 px arriba y abajo de su centro)
  if (arriba) texto(g, arriba, W / 2, 690, 64, CREMA, { borde: 5, ancho: 900 });
  texto(g, grande, W / 2, arriba ? 852 : 840, 190, ORO, { borde: 10, sombra: 12, ancho: 920 });
  texto(g, linea, W / 2, arriba ? 1000 : 975, 58, CREMA, { borde: 4, ancho: 900 });
  if (pie) capsula(g, pie, W / 2, 1105, 70, CORAL);
  if (url) texto(g, url, W / 2, 1255, 46, CREMA, { borde: 4 });
  return c;
}

// La vista previa del link (1200 x 630): logo, la bajada y Zas
export async function dibujarVistaPrevia(atlas) {
  await document.fonts.load(`100px ${FUENTE}`).catch(() => {});
  const W = 1200, H = 630;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  fondo(g, W, H, 470, 300);
  emoji(g, atlas, 'rayo', 95, 95, 110, -0.3);
  emoji(g, atlas, 'globo', 90, 520, 110, -0.15);
  emoji(g, atlas, 'pizza', 690, 560, 100, 0.25);
  emoji(g, atlas, 'estrella', 700, 80, 80, 0.3);
  emoji(g, atlas, 'cohete', 1125, 560, 100, 0.2);
  texto(g, 'ZAS', 420, 230, 270, ORO, { borde: 13, sombra: 17, angulo: -0.1, sombraColor: '#c9971a' });
  texto(g, 'MICROJUEGOS DE 4 SEGUNDOS', 420, 430, 50, CREMA, { borde: 4, ancho: 600 });
  texto(g, '¿CUÁNTOS AGUANTAS?', 420, 505, 64, ORO, { borde: 5, ancho: 600 });
  const zas = await cargar('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgMascota('guino', true)));
  const zw = 360, zh = zw * 250 / 200;
  g.save();
  g.translate(930, 320);
  g.rotate(0.12);
  g.drawImage(zas, -zw / 2, -zh / 2, zw, zh);
  g.restore();
  return c;
}
