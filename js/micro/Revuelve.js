// ¡REVUELVE LA SOPA! — Hay que dar vueltas con el dedo DENTRO de la olla: los
// ingredientes giran con la cuchara y la sopa va tomando color. Con las
// vueltas que pide, está lista. (Las vueltas se cuentan como en ¡GIRA LA
// MANIVELA!: por cuánto gira la dirección del dedo, no alrededor de un punto.)
import { Micro, mezcla } from '../escenas/Micro.js';
import { COLOR } from '../config.js';

const PASO_MIN = 9;               // píxeles entre muestras del dedo (menos es ruido)
const GIRO_MAX = 1.6;             // un cambio de dirección mayor es un "ida y vuelta": no cuenta
const INGREDIENTES = ['tomate', 'zanahoria', 'hongo', 'huevo', 'limon'];
const AGUA = 0xbfe6ff, SOPA = 0xff8a3d;

export class Revuelve extends Micro {
  static ORDEN = '¡REVUELVE LA SOPA!';
  static ICONO = 'zanahoria';          // en la galería
  static CONTROL = 'girar';
  // La lección de girar en círculos es una sola para los dos (con ¡GIRA LA MANIVELA!)
  static LECCION = {
    titulo: '¡GIRA EL DEDO EN CÍRCULOS!', sub: 'DENTRO DE LA OLLA, SIN LEVANTARLO',
    gesto: 'girar', lugar: 'arriba', listo: () => true, grupo: 'girar',
    objetivo: m => ({ x: m.ox, y: m.oy }),
  };

  armar() {
    this.tema('cocina');
    this.azulejos(0, this.cy + 120, 0xfff1e2, 92, 46);
    this.vineta(0.3);
    // La cocina (hornalla) y la olla
    this.ox = this.cx;
    this.oy = this.cy + 40;
    this.rx = 190;
    this.ry = 72;
    const g = this.add.graphics();
    g.fillStyle(0x3b3b46, 1).fillRect(0, this.oy + 170, this.W, this.H);
    g.fillStyle(0x2a2a33, 1).fillRect(0, this.oy + 170, this.W, 16);
    g.fillStyle(COLOR.OSCURO, 0.3).fillEllipse(this.ox + 8, this.oy + 176, this.rx * 2 + 40, 50);
    g.fillStyle(0x9aa3ad, 1).fillRoundedRect(this.ox - this.rx - 8, this.oy, this.rx * 2 + 16, 170, { tl: 0, tr: 0, bl: 40, br: 40 });
    g.fillStyle(0xc7cdd4, 1).fillRect(this.ox - this.rx + 20, this.oy + 10, 26, 140);
    g.fillStyle(COLOR.OSCURO, 1).fillRoundedRect(this.ox - this.rx - 50, this.oy + 30, 46, 22, 10).fillRoundedRect(this.ox + this.rx + 4, this.oy + 30, 46, 22, 10);
    g.fillStyle(0x6c757d, 1).fillEllipse(this.ox, this.oy, this.rx * 2 + 24, this.ry * 2 + 20);
    // La sopa (cambia de color) y los ingredientes que flotan en ella
    this.sopa = this.add.graphics();
    this.ingredientes = this.mezclar(INGREDIENTES).slice(0, 5).map((nombre, i) => ({
      img: this.emoji(nombre, this.ox, this.oy, 58).setDepth(2), a: (i / 5) * Math.PI * 2, r: 0.35 + (i % 3) * 0.22,
    }));
    this.cuchara = this.add.graphics().setDepth(4);
    // Las vueltas que hacen falta salen del tiempo que hay
    this.vueltas = Math.max(2, Math.round([0.75, 0.9, 1.0][this.nivel - 1] * (this.dur - 0.5)));
    this.giro = 0;
    this.cuartos = 0;
    this.add.image(this.cx, this.arriba + 150, 'atlas', 'blanco').setDisplaySize(310, 32).setTint(COLOR.OSCURO).setAlpha(0.7);
    this.barra = this.add.image(this.cx - 150, this.arriba + 150, 'atlas', 'blanco').setOrigin(0, 0.5).setDisplaySize(1, 20).setTint(COLOR.ORO);
    this.cuenta = this.texto(this.cx, this.arriba + 100, `0 / ${this.vueltas}`, 44);
    this.ultimo = null;
    this.rumbo = null;
    this.dedo = null;
    const soltar = () => { this.ultimo = null; this.rumbo = null; this.dedo = null; };
    this.alTocar((x, y) => { this.ultimo = { x, y }; this.rumbo = null; this.dedo = { x, y }; });
    this.alMover((x, y, p) => { if (p.isDown) { this.dedo = { x, y }; this.mover(x, y); } });
    this.input.on('pointerup', soltar);
    this.input.on('pointerupoutside', soltar);
    this.dibujarSopa(0);
  }

  // ¿El dedo está dentro de la olla? (con margen: la olla es ancha y baja)
  adentro(x, y) { return ((x - this.ox) / (this.rx + 40)) ** 2 + ((y - this.oy) / (this.ry + 90)) ** 2 <= 1; }

  mover(x, y) {
    if (!this.ultimo) { this.ultimo = { x, y }; return; }
    const dx = x - this.ultimo.x, dy = y - this.ultimo.y;
    if (Math.hypot(dx, dy) < PASO_MIN) return;
    const rumbo = Math.atan2(dy, dx);
    if (this.rumbo !== null && this.adentro(x, y)) {
      let d = rumbo - this.rumbo;
      while (d > Math.PI) d -= 2 * Math.PI;
      while (d < -Math.PI) d += 2 * Math.PI;
      if (Math.abs(d) < GIRO_MAX) this.girar(d);
    }
    this.rumbo = rumbo;
    this.ultimo = { x, y };
  }

  girar(d) {
    if (this.decidido) return;
    this.giro += d;
    for (const o of this.ingredientes) o.a += d;
    const v = Math.abs(this.giro) / (2 * Math.PI);
    const k = Math.min(1, v / this.vueltas);
    this.barra.setDisplaySize(1 + 299 * k, 20);
    this.cuenta.setText(`${Math.min(this.vueltas, Math.floor(v))} / ${this.vueltas}`);
    this.dibujarSopa(k);
    const cuartos = Math.floor(v * 4);
    if (cuartos > this.cuartos) this.audio.inflar(Math.min(8, cuartos));
    this.cuartos = cuartos;
    if (v >= this.vueltas) {
      this.ganar();
      this.audio.bien();
      for (let i = 0; i < 3; i++) this.humo(this.ox + (i - 1) * 90, this.oy - 40, 90);
      this.cartel(this.cx, this.arriba + 210, '¡SOPA LISTA!', COLOR.ORO, 62);
    }
  }

  dibujarSopa(k) {
    const g = this.sopa;
    g.clear();
    const color = mezcla(AGUA, SOPA, k);
    g.fillStyle(color, 1).fillEllipse(this.ox, this.oy, this.rx * 2, this.ry * 2);
    g.fillStyle(mezcla(color, 0xffffff, 0.35), 0.6).fillEllipse(this.ox - 40, this.oy - 16, this.rx, this.ry * 0.6);
    // Remolino: un espiral más visible cuanto más se revolvió
    g.lineStyle(4, mezcla(color, 0x000000, 0.18), 0.35 + 0.4 * k);
    g.beginPath();
    for (let i = 0; i <= 40; i++) {
      const a = this.giro + i * 0.35, r = i / 40;
      const px = this.ox + Math.cos(a) * this.rx * 0.85 * r, py = this.oy + Math.sin(a) * this.ry * 0.85 * r;
      if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.strokePath();
  }

  paso(dt, t) {
    for (const o of this.ingredientes) {
      o.img.setPosition(this.ox + Math.cos(o.a) * this.rx * 0.75 * o.r * 1.4, this.oy + Math.sin(o.a) * this.ry * 0.75 * o.r * 1.4 - 6 + Math.sin(t * 3 + o.r * 9) * 3);
    }
    // La cuchara de madera, donde está el dedo
    const c = this.cuchara;
    c.clear();
    if (this.dedo && !this.decidido) {
      const { x, y } = this.dedo;
      c.lineStyle(14, COLOR.OSCURO, 1).lineBetween(x, y, x + 50, y - 150);
      c.lineStyle(9, 0xc98a52, 1).lineBetween(x, y, x + 50, y - 150);
      c.fillStyle(COLOR.OSCURO, 1).fillEllipse(x, y, 46, 32);
      c.fillStyle(0xc98a52, 1).fillEllipse(x, y, 38, 24);
    }
  }
}
