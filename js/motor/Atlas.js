// ============================================================================
//  Atlas.js — formas y tipografía en UNA textura, generada al cargar
// ----------------------------------------------------------------------------
//  Los objetos de los microjuegos son emoji (otra textura, ya armada). Acá se
//  dibujan con código las formas sueltas (círculos, rayos, patrones de fondo,
//  partículas) y la tipografía Anton horneada a fuente bitmap.
//
//  Todo se dibuja en BLANCO y se colorea en el juego con tint.
// ============================================================================

const ANCHO_ATLAS = 2048;
const MARGEN = 2;          // píxeles vacíos entre piezas: evita que se "filtre" la vecina

function radial(c, x, y, s, paradas) {
  const g = c.createRadialGradient(x + s / 2, y + s / 2, 0, x + s / 2, y + s / 2, s / 2);
  for (const [k, a] of paradas) g.addColorStop(k, `rgba(255,255,255,${a})`);
  c.fillStyle = g;
  c.fillRect(x, y, s, s);
}

function piezas() {
  return [
    // "interior": se usa sólo el centro, así al estirarlo no aparecen bordes borrosos
    { nombre: 'blanco', w: 16, h: 16, interior: 4, dibujar: (c, x, y) => { c.fillStyle = '#fff'; c.fillRect(x, y, 16, 16); } },
    { nombre: 'circulo', w: 128, h: 128, dibujar: (c, x, y) => {
        c.fillStyle = '#fff'; c.beginPath(); c.arc(x + 64, y + 64, 63, 0, Math.PI * 2); c.fill();
      } },
    { nombre: 'anillo', w: 128, h: 128, dibujar: (c, x, y) => {
        c.strokeStyle = '#fff'; c.lineWidth = 10; c.beginPath(); c.arc(x + 64, y + 64, 57, 0, Math.PI * 2); c.stroke();
      } },
    { nombre: 'punto', w: 32, h: 32, dibujar: (c, x, y) => radial(c, x, y, 32, [[0, 1], [0.45, 0.85], [1, 0]]) },
    { nombre: 'brillo', w: 128, h: 128, dibujar: (c, x, y) => radial(c, x, y, 128, [[0, 0.9], [0.35, 0.35], [1, 0]]) },
    // Estrellita de cuatro puntas para las partículas de festejo
    { nombre: 'chispa', w: 32, h: 32, dibujar: (c, x, y) => {
        c.fillStyle = '#fff'; c.beginPath();
        for (let k = 0; k < 8; k++) {
          const a = (k / 8) * Math.PI * 2, r = k % 2 ? 4 : 15;
          c.lineTo(x + 16 + Math.cos(a) * r, y + 16 + Math.sin(a) * r);
        }
        c.closePath(); c.fill();
      } },
    // Rayos de sol para los fondos de transición (se hacen girar)
    { nombre: 'rayos', w: 512, h: 512, dibujar: (c, x, y) => {
        c.fillStyle = '#fff';
        const n = 16;
        for (let k = 0; k < n; k++) {
          const a0 = (k / n) * Math.PI * 2, a1 = a0 + Math.PI / n;
          c.beginPath(); c.moveTo(x + 256, y + 256);
          c.arc(x + 256, y + 256, 256, a0, a1); c.closePath(); c.fill();
        }
      } },
    // Patrones que se repiten (TileSprite) para dar textura a los fondos
    { nombre: 'rayas', w: 64, h: 64, dibujar: (c, x, y) => {
        c.save(); c.beginPath(); c.rect(x, y, 64, 64); c.clip();
        c.fillStyle = '#fff';
        for (let k = -2; k < 3; k++) {
          c.beginPath();
          c.moveTo(x + k * 32, y + 64); c.lineTo(x + k * 32 + 16, y + 64);
          c.lineTo(x + k * 32 + 80, y); c.lineTo(x + k * 32 + 64, y); c.closePath(); c.fill();
        }
        c.restore();
      } },
    { nombre: 'lunares', w: 64, h: 64, dibujar: (c, x, y) => {
        c.fillStyle = '#fff';
        for (const [px, py] of [[16, 16], [48, 48]]) { c.beginPath(); c.arc(x + px, y + py, 7, 0, Math.PI * 2); c.fill(); }
      } },
    { nombre: 'degrade', w: 16, h: 128, dibujar: (c, x, y) => {
        const g = c.createLinearGradient(0, y, 0, y + 128);
        g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,1)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        c.fillStyle = g; c.fillRect(x, y, 16, 128);
      } },
  ];
}

// ----------------------------------------------------------------------------
//  Tipografía: Anton horneada a una fuente bitmap
// ----------------------------------------------------------------------------
//  Un texto común de Phaser es un canvas propio que se re-sube a la placa de
//  video cada vez que cambia. Una fuente bitmap vive en el atlas: cambiar el
//  texto no cuesta nada. El borde oscuro viene horneado: el tint colorea el
//  relleno y el borde queda oscuro, así se lee sobre cualquier fondo.
const FUENTE = {
  TAM: 96, BORDE: 8,
  CARACTERES: ' ABCDEFGHIJKLMNOPQRSTUVWXYZÁÉÍÓÚÑÜ0123456789!¡?¿.,:;-+×%\'"/()#',
};

function bloqueFuente() {
  const med = document.createElement('canvas').getContext('2d');
  med.font = `${FUENTE.TAM}px Anton`;
  const m = med.measureText('ÁÑ¿Qg');
  const asc = Math.ceil(m.fontBoundingBoxAscent || FUENTE.TAM * 0.98);
  const desc = Math.ceil(m.fontBoundingBoxDescent || FUENTE.TAM * 0.3);
  const altoCelda = asc + desc + FUENTE.BORDE * 2;
  const MAX_W = 2040;

  const glifos = [];
  let x = 0, y = 0;
  for (const ch of FUENTE.CARACTERES) {
    const avance = Math.ceil(med.measureText(ch).width);
    const w = avance + FUENTE.BORDE * 2;
    if (x + w > MAX_W) { x = 0; y += altoCelda; }
    glifos.push({ ch, x, y, w, avance });
    x += w;
  }
  const W = MAX_W, H = y + altoCelda;

  let xml = `<?xml version="1.0"?><font><info face="Anton" size="${FUENTE.TAM}"/>` +
            `<common lineHeight="${asc + desc + 2}" base="${asc}"/><chars count="${glifos.length}">`;
  for (const g of glifos) {
    xml += `<char id="${g.ch.codePointAt(0)}" x="${g.x}" y="${g.y}" width="${g.w}" height="${altoCelda}" ` +
           `xoffset="${-FUENTE.BORDE}" yoffset="0" xadvance="${g.avance + 3}"/>`;
  }
  xml += '</chars></font>';

  return {
    nombre: 'fuente', w: W, h: H, xml,
    dibujar: (c, bx, by) => {
      c.save();
      c.font = `${FUENTE.TAM}px Anton`;
      c.textBaseline = 'alphabetic';
      c.lineJoin = 'round';
      c.lineWidth = FUENTE.BORDE * 2;
      c.strokeStyle = '#1b1030';
      c.fillStyle = '#fff';
      for (const g of glifos) {
        if (g.ch === ' ') continue;
        const px = bx + g.x + FUENTE.BORDE, py = by + g.y + FUENTE.BORDE + asc;
        c.strokeText(g.ch, px, py);
        c.fillText(g.ch, px, py);
      }
      c.restore();
    },
  };
}

// ----------------------------------------------------------------------------
//  Empaquetado en estantes y dibujo final
// ----------------------------------------------------------------------------
export function crearAtlas() {
  const lista = [...piezas(), bloqueFuente()];
  const orden = [...lista].sort((a, b) => b.h - a.h || b.w - a.w);
  let x = 0, y = 0, altoFila = 0;
  for (const p of orden) {
    if (x + p.w + MARGEN > ANCHO_ATLAS) { x = 0; y += altoFila + MARGEN; altoFila = 0; }
    p.x = x + MARGEN;
    p.y = y + MARGEN;
    x += p.w + MARGEN;
    altoFila = Math.max(altoFila, p.h + MARGEN);
  }
  const usado = y + altoFila + MARGEN;
  let alto = 256;
  while (alto < usado) alto *= 2;

  const canvas = document.createElement('canvas');
  canvas.width = ANCHO_ATLAS;
  canvas.height = alto;
  const ctx = canvas.getContext('2d');

  const marcos = [];
  let xmlFuente = null;
  for (const p of lista) {
    ctx.save();
    ctx.beginPath(); ctx.rect(p.x, p.y, p.w, p.h); ctx.clip();
    p.dibujar(ctx, p.x, p.y);
    ctx.restore();
    const i = p.interior || 0;
    marcos.push({ nombre: p.nombre, x: p.x + i, y: p.y + i, w: p.w - 2 * i, h: p.h - 2 * i });
    if (p.xml) xmlFuente = p.xml;
  }
  return { canvas, marcos, xmlFuente };
}
