// ¡CORTA LA CUERDA! — Un chupetín cuelga de una cuerda y se hamaca. Abajo
// espera el sapo con la boca abierta. Hay que deslizar el dedo a través de la
// cuerda en el momento justo: el chupetín sale volando con el impulso que
// traía y tiene que caer en la boca del sapo.
import { Micro } from '../escenas/Micro.js';
import { COLOR } from '../config.js';

const G = 1700;                   // gravedad (px/s²)

export class Cuerda extends Micro {
  static ORDEN = '¡CORTA LA CUERDA!';
  static ICONO = 'chupetin';          // en la galería
  static CONTROL = 'deslizar';
  // La primera vez: el juego se congela y enseña (ver Director.revisarLeccion)
  static LECCION = {
    titulo: '¡DESLIZA SOBRE LA CUERDA!', sub: 'CÓRTALA PARA QUE EL DULCE CAIGA EN LA BOCA DEL SAPO',
    gesto: 'deslizar', lugar: 'medio', listo: () => true,
    objetivo: m => ({ x: m.px + Math.sin(m.ang) * m.largo * 0.5, y: m.py + Math.cos(m.ang) * m.largo * 0.5 }),
  };

  armar() {
    this.tema('cielo');
    this.nubes(2);
    // El pasto y el estanque del sapo
    this.yPasto = this.bajo - 40;
    this.horizonte(this.yPasto - 40, 'cerros', 0x9fd88a);
    this.piso(this.yPasto, 0x58b04a);
    // El clavo y la cuerda; el chupetín se hamaca (péndulo)
    this.px = this.cx;
    this.py = this.arriba + 110;
    this.largo = 250;
    this.amplitud = [0.75, 0.9, 1.0][this.nivel - 1];
    this.w = [3.6, 4.0, 4.4][this.nivel - 1] * Math.sqrt(this.vel) / 1.6;     // radianes por segundo de la fase
    this.fase = this.azar(0, Math.PI * 2);
    this.ang = this.amplitud * Math.sin(this.fase);
    // El sapo: donde cae el chupetín si se corta en un momento elegido (así
    // siempre hay un momento que sirve). En el nivel 1, cerca de una punta del
    // vaivén (el dulce casi se detiene: se corta cuando está encima del sapo);
    // cuanto más difícil, más cerca del medio (va rápido y sale despedido).
    this.yBoca = this.yPasto - 40;
    const margen = [0.45, 0.9, 1.5][this.nivel - 1];
    let xSapo = this.cx;
    for (let i = 0; i < 30; i++) {
      const f = (Math.random() < 0.5 ? 1 : -1) * Math.PI / 2 + this.azar(-margen, margen), x = this.cae(f);
      if (x > 80 && x < this.W - 80 && Math.abs(x - this.cx) > 40) { xSapo = x; break; }
    }
    this.xSapo = xSapo;
    this.tolerancia = [74, 64, 56][this.nivel - 1];
    this.sombra(this.xSapo, this.yPasto + 8, 120, 0.3);
    this.sapo = this.emoji('sapo', this.xSapo, this.yPasto - 34, 120);
    this.cuerdaG = this.add.graphics().setDepth(2);
    this.circulo(this.px, this.py, 14, COLOR.OSCURO).setDepth(3);
    this.circulo(this.px, this.py, 9, 0xc0c6cf).setDepth(3);
    this.dulce = this.emoji('chupetin', this.px, this.py + this.largo, 84).setDepth(3);
    this.cortada = false;
    this.vuelo = null;            // { x, y, vx, vy } después de cortar
    this.dedo = null;
    this.alTocar((x, y) => { this.dedo = { x, y }; });
    this.alMover((x, y, p) => {
      if (!p.isDown || !this.dedo) return;
      if (!this.cortada && this.cruza(this.dedo.x, this.dedo.y, x, y)) this.cortar();
      this.dedo = { x, y };
    });
    this.input.on('pointerup', () => { this.dedo = null; });
    this.dibujar();
  }

  // Ángulo y velocidad angular del péndulo para una fase
  estado(f) { return { a: this.amplitud * Math.sin(f), w: this.amplitud * Math.cos(f) * this.w }; }

  // Dónde cae (x a la altura de la boca) si se corta con la fase f
  cae(f) {
    const { a, w } = this.estado(f);
    const x = this.px + Math.sin(a) * this.largo, y = this.py + Math.cos(a) * this.largo;
    const vx = Math.cos(a) * this.largo * w, vy = -Math.sin(a) * this.largo * w;
    // y + vy t + G t²/2 = yBoca
    const dy = this.yBoca - y, t = (-vy + Math.sqrt(vy * vy + 2 * G * dy)) / G;
    return x + vx * t;
  }

  // ¿El tramo del dedo cruza la cuerda (del clavo al chupetín)?
  cruza(x1, y1, x2, y2) {
    const x3 = this.px, y3 = this.py, x4 = this.dulce.x, y4 = this.dulce.y;
    const d = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (Math.abs(d) < 1e-6) return false;
    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / d;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / d;
    return t >= 0 && t <= 1 && u >= 0.08 && u <= 0.92;
  }

  cortar() {
    this.cortada = true;
    const { a, w } = this.estado(this.fase);
    this.vuelo = {
      x: this.dulce.x, y: this.dulce.y,
      vx: Math.cos(a) * this.largo * w, vy: -Math.sin(a) * this.largo * w,
    };
    this.audio.corte();
    this.chispas((this.px + this.dulce.x) / 2, (this.py + this.dulce.y) / 2, 6, 0xffffff);
  }

  dibujar() {
    const g = this.cuerdaG;
    g.clear();
    if (this.cortada) {
      // Un cabito colgando del clavo
      g.lineStyle(6, 0x8a5a2b, 1).lineBetween(this.px, this.py, this.px + Math.sin(this.ang) * 40, this.py + 40);
      return;
    }
    g.lineStyle(9, COLOR.OSCURO, 0.5).lineBetween(this.px, this.py, this.dulce.x, this.dulce.y);
    g.lineStyle(6, 0xb07a3c, 1).lineBetween(this.px, this.py, this.dulce.x, this.dulce.y);
  }

  paso(dt, t) {
    if (this.decidido && !this.vuelo) return;
    if (!this.cortada) {
      this.fase += this.w * dt;
      this.ang = this.amplitud * Math.sin(this.fase);
      this.dulce.setPosition(this.px + Math.sin(this.ang) * this.largo, this.py + Math.cos(this.ang) * this.largo)
        .setAngle(-this.ang * 57.3);
    } else if (this.vuelo) {
      const v = this.vuelo;
      v.vy += G * dt;
      v.x += v.vx * dt;
      v.y += v.vy * dt;
      this.dulce.setPosition(v.x, v.y).setAngle(this.dulce.angle + v.vx * dt * 0.8);
      if (!this.decidido && v.y >= this.yBoca) {
        if (Math.abs(v.x - this.xSapo) <= this.tolerancia) {
          this.vuelo = null;
          this.dulce.setVisible(false);
          this.ganar();
          this.audio.mordida();
          this.rebote(this.sapo, 1.3);
          this.chispas(this.xSapo, this.yBoca, 12);
          this.cartel(this.cx, this.cy - 120, '¡ÑAM!', COLOR.ORO, 72);
        } else {
          this.perder();
          this.cartel(this.cx, this.cy - 120, '¡FALLASTE!', COLOR.MAL, 60);
        }
      }
      if (v.y > this.H + 100) this.vuelo = null;
    }
    this.sapo.setScale(this.sapo.scaleX, this.sapo.scaleX * (1 + Math.sin(t * 7) * 0.03));
    this.dibujar();
  }
}
