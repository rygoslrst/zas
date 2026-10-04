// ¡APILA LAS CAJAS! — Una grúa lleva una caja de lado a lado, arriba; al
// tocar, la suelta y cae derecho. Tiene que quedar encima de la torre (con su
// centro sobre la caja de abajo): si no, se viene abajo. 2 cajas en el nivel
// 1; 3 en el 2 y el 3 (más angostas y la grúa más rápida).
import { Micro, mezcla } from '../escenas/Micro.js';
import { COLOR } from '../config.js';

const ALTO = 84;                  // alto de cada caja
const GRAVEDAD = 2600;            // px/s²
const CARTON = [0xc8915a, 0xd9a066, 0xb97d47];

export class Apila extends Micro {
  static ORDEN = '¡APILA LAS CAJAS!';
  static ICONO = 'martillo';          // en la galería
  static CONTROL = 'tocar';
  static PULSOS = 12;

  armar() {
    this.tema('cielo');
    this.yPiso = this.bajo - 30;
    this.horizonte(this.yPiso, 'ciudad', 0xa9c4e4);
    this.piso(this.yPiso, 0x7a7266);
    this.n = [2, 3, 3][this.nivel - 1];
    this.ancho = [150, 132, 116][this.nivel - 1];
    this.amp = [150, 165, 180][this.nivel - 1];
    this.w = [2.4, 3.0, 3.6][this.nivel - 1] * Math.sqrt(this.vel);      // radianes por segundo
    this.fase = this.azar(0, Math.PI * 2);
    // La tarima, en el medio, y los huecos punteados donde van las cajas
    const g = this.add.graphics();
    const a = this.ancho;
    g.fillStyle(COLOR.OSCURO, 0.3).fillEllipse(this.cx, this.yPiso + 4, a + 70, 24);
    g.fillStyle(COLOR.OSCURO, 1).fillRect(this.cx - a / 2 - 4, this.yPiso - 30, a + 8, 30);
    g.fillStyle(0xd9a066, 1).fillRect(this.cx - a / 2, this.yPiso - 26, a, 9);
    for (const dx of [-a / 2 + 4, -12, a / 2 - 28]) g.fillStyle(0xb5824a, 1).fillRect(this.cx + dx, this.yPiso - 17, 24, 13);
    this.torre = [{ x: this.cx, yTope: this.yPiso - 30 }];
    for (let i = 0; i < this.n; i++) {
      const y = this.yPiso - 30 - (i + 1) * ALTO;
      g.lineStyle(4, 0xffffff, 0.5);
      for (let x = this.cx - a / 2; x < this.cx + a / 2; x += 22) g.lineBetween(x, y, Math.min(x + 11, this.cx + a / 2), y);
      g.lineBetween(this.cx - a / 2, y, this.cx - a / 2, y + ALTO).lineBetween(this.cx + a / 2, y, this.cx + a / 2, y + ALTO);
    }
    // La grúa: una viga amarilla arriba, el carrito y el cable
    this.yRiel = this.arriba + 140;
    const v = this.add.graphics();
    v.fillStyle(COLOR.OSCURO, 1).fillRect(0, this.yRiel - 38, this.W, 32);
    v.fillStyle(0xffb703, 1).fillRect(0, this.yRiel - 34, this.W, 24);
    v.lineStyle(4, 0xc77d00, 1);
    for (let x = 0; x < this.W; x += 36) v.lineBetween(x, this.yRiel - 34, x + 18, this.yRiel - 10).lineBetween(x + 18, this.yRiel - 10, x + 36, this.yRiel - 34);
    this.cable = this.rect(this.cx, this.yRiel, 5, 50, COLOR.OSCURO).setOrigin(0.5, 0);
    this.carro = this.add.container(this.cx, this.yRiel - 10, [
      this.rect(0, 0, 70, 30, COLOR.OSCURO), this.rect(0, -2, 62, 22, 0x4a5d73),
      this.circulo(-20, 14, 9, COLOR.OSCURO), this.circulo(20, 14, 9, COLOR.OSCURO),
    ]);
    this.yCaja = this.yRiel + 50 + ALTO / 2;
    this.colgada = null;
    this.cayendo = null;
    this.puestas = 0;
    this.nueva();
    this.alTocar(() => this.soltar());
  }

  // Una caja de cartón con su cinta y su etiqueta
  caja() {
    const w = this.ancho, c = CARTON[this.puestas % CARTON.length];
    const g = this.add.graphics();
    g.fillStyle(COLOR.OSCURO, 1).fillRoundedRect(-w / 2 - 4, -ALTO / 2 - 4, w + 8, ALTO + 8, 10);
    g.fillStyle(c, 1).fillRoundedRect(-w / 2, -ALTO / 2, w, ALTO, 7);
    g.fillStyle(mezcla(c, 0xffffff, 0.3), 1).fillRect(-w / 2 + 6, -ALTO / 2 + 5, w - 12, 7);
    g.fillStyle(mezcla(c, 0x000000, 0.2), 1).fillRect(-w / 2 + 6, ALTO / 2 - 11, w - 12, 6);
    g.fillStyle(0xf2d38a, 1).fillRect(-11, -ALTO / 2, 22, ALTO);
    g.fillStyle(0xffffff, 0.9).fillRect(-w / 2 + 14, 2, 30, 20);
    g.fillStyle(mezcla(c, 0x000000, 0.35), 1).fillRect(-w / 2 + 18, 7, 22, 3).fillRect(-w / 2 + 18, 14, 14, 3);
    return this.add.container(this.carro.x, this.yCaja, [g]).setDepth(2);
  }

  nueva() {
    this.colgada = this.caja().setScale(0.2);
    this.tweens.add({ targets: this.colgada, scale: 1, duration: 140, ease: 'Back.easeOut' });
  }

  soltar() {
    if (!this.colgada || this.decidido) return;
    this.cayendo = { obj: this.colgada, vy: 0 };
    this.colgada = null;
    this.audio.toque();
  }

  alGanar() {
    this.confeti(this.cx, this.torre[this.torre.length - 1].yTope, 24);
    this.cartel(this.cx, this.yRiel + 70, '¡TORRE LISTA!', COLOR.ORO, 60);
  }

  paso(dt, t) {
    // El carrito va y viene; la caja colgada, con él
    const x = this.cx + Math.sin(this.fase + this.w * t) * this.amp;
    this.carro.x = x;
    this.cable.x = x;
    if (this.colgada) this.colgada.setPosition(x, this.yCaja).setAngle(Math.cos(this.fase + this.w * t) * -4);
    const c = this.cayendo;
    if (!c || this.decidido) return;
    c.vy += GRAVEDAD * dt;
    c.obj.y += c.vy * dt;
    const tope = this.torre[this.torre.length - 1];
    if (c.obj.y + ALTO / 2 < tope.yTope) return;
    // Llegó a la torre: ¿su centro está encima de la caja de abajo?
    const dx = c.obj.x - tope.x;
    this.cayendo = null;
    if (Math.abs(dx) <= this.ancho / 2 - 6) {
      c.obj.y = tope.yTope - ALTO / 2;
      this.torre.push({ x: c.obj.x, yTope: tope.yTope - ALTO });
      this.puestas++;
      this.audio.tapa();
      this.audio.acierto(this.puestas - 1);
      this.rebote(c.obj, 1.12);
      c.obj.setAngle(dx * 0.06);
      this.tweens.add({ targets: c.obj, angle: 0, duration: 260, ease: 'Back.easeOut' });
      if (Math.abs(dx) < 12) this.chispas(c.obj.x, tope.yTope, 8);
      if (this.puestas >= this.n) this.ganar(); else this.nueva();
    } else {
      // Se cae por el borde, girando
      const lado = Math.sign(dx) || 1;
      this.perder();
      c.obj.y = tope.yTope - ALTO / 2;
      this.tweens.add({ targets: c.obj, x: c.obj.x + lado * 150, y: this.yPiso + 10, angle: lado * 110, duration: 480, ease: 'Quad.easeIn' });
      this.time.delayedCall(420, () => { this.audio.golpe(); this.humo(c.obj.x, this.yPiso, 80); });
      this.cartel(this.cx, this.yRiel + 70, '¡SE CAYÓ!', COLOR.MAL, 62);
    }
  }
}
