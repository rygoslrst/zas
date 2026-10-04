// ¡DIBUJA LA ESTRELLA! (o el rayo, el corazón, el triángulo) — La figura está
// punteada: hay que pasar el dedo por encima desde el punto verde hasta el
// final, sin levantarlo. Cuanto más difícil, más justo hay que ir por la línea.
import { Micro } from '../escenas/Micro.js';
import { COLOR } from '../config.js';

// Las figuras, en puntos de -1 a 1 (se escalan a la pantalla). Se recorren en
// orden; las cerradas terminan donde empiezan.
function estrella() {
  const p = [];
  for (let i = 0; i <= 5; i++) {
    const a = -Math.PI / 2 + (i * 2 * (2 * Math.PI)) / 5;
    p.push([Math.cos(a), Math.sin(a) * 0.98 + 0.06]);
  }
  return p;
}
function corazon() {
  const p = [];
  for (let i = 0; i <= 28; i++) {
    const t = Math.PI + (i / 28) * Math.PI * 2;          // empieza abajo, en la punta
    const x = 16 * Math.sin(t) ** 3;
    const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
    p.push([x / 17, y / 17 - 0.15]);
  }
  return p;
}
const FIGURAS = {
  estrella: estrella(),
  rayo: [[0.35, -1], [-0.45, 0.05], [0.2, 0.05], [-0.35, 1]],
  corazon: corazon(),
  triangulo: [[0, -0.95], [0.95, 0.8], [-0.95, 0.8], [0, -0.95]],
};

export class Traza extends Micro {
  static ORDEN = '¡DIBUJA LA ESTRELLA!';
  static ICONO = 'rayo';          // en la galería
  static CONTROL = 'arrastrar';
  static PULSOS = 10;
  static VARIANTES = [
    { orden: '¡DIBUJA LA ESTRELLA!', figura: 'estrella' },
    { orden: '¡DIBUJA EL RAYO!', figura: 'rayo' },
    { orden: '¡DIBUJA EL CORAZÓN!', figura: 'corazon' },
    { orden: '¡DIBUJA EL TRIÁNGULO!', figura: 'triangulo' },
  ];
  // La primera vez: el juego se congela y enseña (ver Director.revisarLeccion)
  static LECCION = {
    titulo: '¡PASA EL DEDO POR LOS PUNTOS!', sub: 'DESDE EL VERDE HASTA EL FINAL, SIN LEVANTARLO',
    gesto: 'arrastrar', lugar: 'arriba', listo: () => true,
    objetivo: m => ({ x: m.ruta[0].x, y: m.ruta[0].y }),
  };

  armar() {
    this.fondo(0x7b61ff, 'lunares');
    const figura = (this.variante && this.variante.figura) || 'estrella';
    // Una hoja de cuaderno
    const g = this.add.graphics();
    const hx = this.cx, hy = this.cy + 40, hw = 470, hh = 560;
    g.fillStyle(COLOR.OSCURO, 0.18).fillRoundedRect(hx - hw / 2 + 8, hy - hh / 2 + 10, hw, hh, 16);
    g.fillStyle(0xffffff, 1).fillRoundedRect(hx - hw / 2, hy - hh / 2, hw, hh, 16);
    g.lineStyle(2, 0x9ecbff, 0.7);
    for (let y = hy - hh / 2 + 40; y < hy + hh / 2; y += 34) g.lineBetween(hx - hw / 2 + 10, y, hx + hw / 2 - 10, y);
    g.lineStyle(3, 0xff8a8a, 0.8).lineBetween(hx - hw / 2 + 52, hy - hh / 2, hx - hw / 2 + 52, hy + hh / 2);
    // La figura, en pantalla, y su recorrido "denso" (un punto cada 6 px)
    const r = 190;
    const base = FIGURAS[figura].map(([x, y]) => ({ x: hx + x * r, y: hy + y * r }));
    this.ruta = [];
    for (let i = 0; i < base.length - 1; i++) {
      const a = base[i], b = base[i + 1], n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 6));
      for (let k = 0; k < n; k++) this.ruta.push({ x: a.x + (b.x - a.x) * k / n, y: a.y + (b.y - a.y) * k / n });
    }
    this.ruta.push(base[base.length - 1]);
    // Punteado de guía
    const guia = this.add.graphics();
    guia.fillStyle(0x6b5b95, 0.55);
    for (let i = 0; i < this.ruta.length; i += 4) guia.fillCircle(this.ruta[i].x, this.ruta[i].y, 5);
    // El lápiz: lo ya dibujado, por encima
    this.tinta = this.add.graphics().setDepth(2);
    // Inicio (verde, con un 1) y final (una estrella)
    const ini = this.ruta[0], fin = this.ruta[this.ruta.length - 1];
    this.inicio = this.circulo(ini.x, ini.y, 26, COLOR.BIEN).setDepth(3);
    this.escalaInicio = this.inicio.scaleX;
    this.texto(ini.x, ini.y, '1', 30).setDepth(3);
    if (Math.hypot(fin.x - ini.x, fin.y - ini.y) > 40) this.emoji('estrella', fin.x, fin.y, 56).setDepth(1).setAlpha(0.85);
    // Qué tan cerca de la línea hay que ir
    this.tolerancia = [62, 52, 44][this.nivel - 1];
    this.avance = 0;              // hasta qué punto de la ruta se llegó
    this.dibujando = false;
    this.alTocar((x, y) => {
      // Se empieza en el punto verde (o donde se había quedado)
      const p = this.ruta[this.avance];
      if (Math.hypot(x - p.x, y - p.y) <= this.tolerancia + 20) { this.dibujando = true; this.seguir(x, y); }
    });
    this.alMover((x, y, pt) => { if (pt.isDown && this.dibujando) this.seguir(x, y); });
    this.input.on('pointerup', () => { this.dibujando = false; });
  }

  // Avanza por la ruta mientras el dedo esté cerca de los puntos que siguen
  seguir(x, y) {
    if (this.decidido) return;
    const antes = this.avance;
    let mejor = this.avance;
    for (let i = this.avance; i < Math.min(this.ruta.length, this.avance + 30); i++) {
      const p = this.ruta[i];
      if (Math.hypot(x - p.x, y - p.y) <= this.tolerancia) mejor = i;
    }
    if (mejor === antes) return;
    this.avance = mejor;
    this.tinta.lineStyle(14, 0xff5d8f, 1);
    this.tinta.beginPath();
    this.tinta.moveTo(this.ruta[antes].x, this.ruta[antes].y);
    for (let i = antes + 1; i <= mejor; i++) this.tinta.lineTo(this.ruta[i].x, this.ruta[i].y);
    this.tinta.strokePath();
    if (Math.floor(mejor / 40) > Math.floor(antes / 40)) this.audio.acierto(Math.min(8, Math.floor(mejor / 40)));
    if (this.avance >= this.ruta.length - 1) {
      this.ganar();
      this.chispas(this.cx, this.cy + 40, 16);
      this.cartel(this.cx, this.arriba + 130, '¡QUÉ ARTISTA!', COLOR.ORO, 60);
    }
  }

  paso(dt, t) {
    // El punto verde late hasta que se empieza
    if (!this.avance && !this.decidido) this.inicio.setScale(this.escalaInicio * (1 + Math.sin(t * 8) * 0.12));
  }
}
