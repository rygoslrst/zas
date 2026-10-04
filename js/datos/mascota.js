// ============================================================================
//  mascota.js — "Zas", la mascota: una bomba redonda con cara y la mecha
//  encendida (el juego es de mechas que se queman)
// ----------------------------------------------------------------------------
//  Se dibuja en SVG: el mismo dibujo sirve en el HTML (carga, título, final) y,
//  pasado a imagen al arrancar, en el juego (las reacciones del telón y la
//  bomba de la mecha). Cada cara es una expresión distinta.
// ============================================================================

export const CARAS = ['feliz', 'euforico', 'guino', 'cool', 'triste', 'mareado', 'asustado', 'enamorado', 'sorprendido', 'llorando'];
export const ANCHO_MASCOTA = 200, ALTO_MASCOTA = 224;

const OSCURO = '#1b1030', CUERPO = '#43307d', CUERPO_CLARO = '#6a54b8';

// Ojos abiertos (con brillo); dx corre la mirada
const ojo = (x, y, dx = 3, dy = 4, r = 17) =>
  `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r + 4}" fill="#fff" stroke="${OSCURO}" stroke-width="4"/>` +
  `<circle cx="${x + dx}" cy="${y + dy}" r="${r * 0.55}" fill="${OSCURO}"/>` +
  `<circle cx="${x + dx + 3}" cy="${y + dy - 4}" r="3.2" fill="#fff"/>`;
// Un corazón (los ojos de enamorado)
const corazon = (x, y, s) => `<path d="M${x} ${y + s * 0.9} C${x - s * 1.5} ${y}, ${x - s * 0.9} ${y - s * 1.2}, ${x} ${y - s * 0.35} ` +
  `C${x + s * 0.9} ${y - s * 1.2}, ${x + s * 1.5} ${y}, ${x} ${y + s * 0.9} Z" fill="#ff4d6d" stroke="${OSCURO}" stroke-width="4" stroke-linejoin="round"/>`;
const trazo = (d, w = 7) => `<path d="${d}" fill="none" stroke="${OSCURO}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;

const CARA = {
  feliz: ojo(74, 126) + ojo(126, 126) + trazo('M76 158 Q100 182 124 158'),
  euforico: trazo('M58 128 Q74 108 90 128') + trazo('M110 128 Q126 108 142 128') +
    `<path d="M70 150 Q100 198 130 150 Z" fill="${OSCURO}" stroke="${OSCURO}" stroke-width="5" stroke-linejoin="round"/>` +
    '<ellipse cx="100" cy="172" rx="14" ry="9" fill="#ff6b8a"/>',
  guino: ojo(74, 126) + trazo('M110 128 Q126 116 142 128') + trazo('M80 160 Q104 178 126 154'),
  cool: `<path d="M50 112 H150 V120 Q148 146 124 146 Q104 146 102 124 H98 Q96 146 76 146 Q52 146 50 120 Z" fill="${OSCURO}"/>` +
    '<path d="M60 118 L72 118 L62 132 Z" fill="#fff" opacity=".35"/>' + trazo('M80 162 Q104 176 124 158'),
  triste: ojo(74, 130, 0, 7) + ojo(126, 130, 0, 7) + trazo('M56 112 L84 101', 6) + trazo('M144 112 L116 101', 6) +
    trazo('M78 172 Q100 154 122 172') +
    '<path d="M58 150 Q64 162 58 168 Q52 162 58 150 Z" fill="#7fd3ff" stroke="#1b1030" stroke-width="3"/>',
  mareado: trazo('M62 116 L86 140') + trazo('M86 116 L62 140') + trazo('M114 116 L138 140') + trazo('M138 116 L114 140') +
    trazo('M70 168 Q78 158 86 168 T102 168 T118 168 T134 168', 6),
  enamorado: corazon(74, 126, 20) + corazon(126, 126, 20) + trazo('M74 156 Q100 186 126 156'),
  sorprendido: trazo('M56 98 Q74 84 92 98', 6) + trazo('M108 98 Q126 84 144 98', 6) +
    ojo(74, 128, 0, 1, 18) + ojo(126, 128, 0, 1, 18) + `<ellipse cx="100" cy="170" rx="10" ry="12" fill="${OSCURO}"/>`,
  llorando: trazo('M58 128 Q74 138 90 128') + trazo('M110 128 Q126 138 142 128') +
    trazo('M64 112 L86 104', 6) + trazo('M136 112 L114 104', 6) +
    `<path d="M76 176 Q100 150 124 176 Q100 168 76 176 Z" fill="${OSCURO}" stroke="${OSCURO}" stroke-width="6" stroke-linejoin="round"/>` +
    '<path d="M66 136 Q60 158 66 184" fill="none" stroke="#7fd3ff" stroke-width="10" stroke-linecap="round"/>' +
    '<path d="M134 136 Q140 158 134 184" fill="none" stroke="#7fd3ff" stroke-width="10" stroke-linecap="round"/>',
  asustado: ojo(72, 124, 0, 0, 19) + ojo(128, 124, 0, 0, 19) +
    `<ellipse cx="100" cy="168" rx="11" ry="14" fill="${OSCURO}"/>` +
    '<path d="M158 82 Q166 98 158 104 Q150 98 158 82 Z" fill="#7fd3ff" stroke="#1b1030" stroke-width="3"/>',
};

// La chispa de la mecha (las caras tristes, en vez de chispa, un humito)
const PUNTAS = Array.from({ length: 16 }, (_, i) => {
  const a = (i / 16) * Math.PI * 2, r = i % 2 ? 7 : 18;
  return `${(130 + Math.cos(a) * r).toFixed(1)},${(16 + Math.sin(a) * r).toFixed(1)}`;
}).join(' ');
function chispa(triste) {
  if (triste) return '<circle cx="132" cy="16" r="9" fill="#cfc8e8" opacity=".9"/><circle cx="142" cy="8" r="6" fill="#cfc8e8" opacity=".7"/>';
  return `<polygon points="${PUNTAS}" fill="#ffd23f" stroke="#ff7a1a" stroke-width="3" stroke-linejoin="round"/>` +
    '<circle cx="130" cy="16" r="5" fill="#fff"/>';
}

// La silueta (mecha, chispa, cuello y cuerpo) engordada 'extra': para el
// borde blanco y la sombra de la versión "sticker"
function silueta(color, extra, triste) {
  return `<g fill="${color}" stroke="${color}" stroke-linejoin="round" stroke-linecap="round">` +
    `<path d="M100 54 C 98 36, 120 36, 126 20" fill="none" stroke-width="${14 + extra}"/>` +
    (triste ? `<circle cx="132" cy="16" r="9" stroke-width="${extra}"/><circle cx="142" cy="8" r="6" stroke-width="${extra}"/>`
      : `<polygon points="${PUNTAS}" stroke-width="${3 + extra}"/>`) +
    `<rect x="76" y="46" width="48" height="30" rx="9" stroke-width="${7 + extra}"/>` +
    `<circle cx="100" cy="138" r="80" stroke-width="${8 + extra}"/></g>`;
}

// sticker: con borde blanco y sombra dibujados (sin filtros: se imprime nítido;
// es la que usa el cartel del stand)
export function svgMascota(cara = 'feliz', sticker = false) {
  const triste = cara === 'triste' || cara === 'mareado' || cara === 'llorando';
  if (sticker) {
    const interior = svgMascota(cara).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -12 200 250" width="200" height="250">' +
      `<g transform="translate(3 6)" opacity=".3">${silueta(OSCURO, 10, triste)}</g>` +
      silueta('#ffffff', 10, triste) + interior + '</svg>';
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${ANCHO_MASCOTA} ${ALTO_MASCOTA}" width="${ANCHO_MASCOTA}" height="${ALTO_MASCOTA}">` +
    // la mecha (con borde) y su chispa
    `<path d="M100 54 C 98 36, 120 36, 126 20" fill="none" stroke="${OSCURO}" stroke-width="14" stroke-linecap="round"/>` +
    '<path d="M100 54 C 98 36, 120 36, 126 20" fill="none" stroke="#d9a35f" stroke-width="7" stroke-linecap="round"/>' +
    chispa(triste) +
    // el cuello de la bomba
    `<rect x="76" y="46" width="48" height="30" rx="9" fill="${CUERPO_CLARO}" stroke="${OSCURO}" stroke-width="7"/>` +
    // el cuerpo, con un brillo
    `<circle cx="100" cy="138" r="80" fill="${CUERPO}" stroke="${OSCURO}" stroke-width="8"/>` +
    `<path d="M40 150 A62 62 0 0 0 158 176 A80 80 0 0 1 40 150 Z" fill="${OSCURO}" opacity=".18"/>` +
    '<ellipse cx="64" cy="96" rx="15" ry="24" fill="#fff" opacity=".32" transform="rotate(30 64 96)"/>' +
    '<circle cx="84" cy="80" r="6" fill="#fff" opacity=".3"/>' +
    // los cachetes y la cara
    '<ellipse cx="56" cy="156" rx="13" ry="8" fill="#ff7ab0" opacity=".55"/>' +
    '<ellipse cx="144" cy="156" rx="13" ry="8" fill="#ff7ab0" opacity=".55"/>' +
    CARA[cara] +
    '</svg>';
}

// Todas las caras en un lienzo (una al lado de la otra), para el juego, con
// el borde blanco y la sombra de "sticker" de los emoji.
// Devuelve { lienzo, marcos: { cara: [x, y, w, h] } }.
export async function lienzoMascota(escala = 1.5) {
  const w = Math.round(ANCHO_MASCOTA * escala), h = Math.round(ALTO_MASCOTA * escala);
  const borde = Math.round(5 * escala), m = borde + Math.round(8 * escala);
  const lw = w + 2 * m, lh = h + 2 * m;
  const lienzo = document.createElement('canvas');
  lienzo.width = lw * CARAS.length;
  lienzo.height = lh;
  const g = lienzo.getContext('2d');
  // La silueta del dibujo pintada de un color (para el borde y la sombra)
  const silueta = document.createElement('canvas');
  silueta.width = w; silueta.height = h;
  const gs = silueta.getContext('2d');
  const pintar = (img, color) => {
    gs.globalCompositeOperation = 'source-over';
    gs.clearRect(0, 0, w, h);
    gs.drawImage(img, 0, 0, w, h);
    gs.globalCompositeOperation = 'source-in';
    gs.fillStyle = color;
    gs.fillRect(0, 0, w, h);
  };
  const marcos = {};
  for (const [i, cara] of CARAS.entries()) {
    const img = new Image();
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgMascota(cara));
    try { await img.decode(); } catch (e) { continue; }
    const x0 = i * lw + m, y0 = m;
    pintar(img, '#1b1030');                                   // sombra, abajo a la derecha
    g.globalAlpha = 0.3;
    g.drawImage(silueta, x0 + 4 * escala, y0 + 7 * escala, w, h);
    g.globalAlpha = 1;
    pintar(img, '#ffffff');                                   // borde blanco alrededor
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2;
      g.drawImage(silueta, x0 + Math.cos(a) * borde, y0 + Math.sin(a) * borde, w, h);
    }
    g.drawImage(img, x0, y0, w, h);
    marcos[cara] = [i * lw, 0, lw, lh];
  }
  return { lienzo, marcos };
}
