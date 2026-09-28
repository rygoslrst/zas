// ¡CORTÁ! — Saltan frutas: deslizá el dedo a través de ellas. La bomba, no.
import { Micro } from '../escenas/Micro.js';
import { COLOR } from '../config.js';

const FRUTAS = [['sandia', 0xff4d6d], ['anana', 0xffd23f], ['coco', 0xf5f5f5], ['naranja', 0xff9f1c],
                ['limon', 0xfff04d], ['manzana', 0xff4d5a], ['durazno', 0xffa07a]];

export class Corta extends Micro {
  static ORDEN = '¡CORTÁ!';
  static CONTROL = 'deslizar';

  armar() {
    this.tema('madera');
    this.g = 950 * this.vel * this.vel;
    const cosas = [[1], [1, 1], [1, 0, 1, 1]][this.nivel - 1];
    this.frutas = cosas.map((esFruta, i) => {
      const [nombre, jugo] = esFruta ? this.elegir(FRUTAS) : ['bomba', 0x333333];
      const x = this.azar(120, this.W - 120);
      const altura = this.azar(this.cy - 60, this.cy + 60) - (this.H + 60);   // negativo: cuánto sube
      return {
        nombre, jugo, esFruta: !!esFruta, x, y: this.H + 60, vx: (this.cx - x) * this.azar(0.2, 0.5) * this.vel,
        vy: -Math.sqrt(2 * this.g * -altura), tSale: (0.55 + i * 0.5) / this.vel, estado: 'espera', img: null,
      };
    });
    // El rastro del dedo
    this.rastro = [];
    this.trazo = this.add.graphics().setDepth(40);
    this.abajoDedo = false;
    this.alTocar((x, y) => { this.abajoDedo = true; this.rastro.length = 0; this.rastro.push({ x, y, t: this.t }); });
    this.input.on('pointerup', () => { this.abajoDedo = false; });
    this.alMover((x, y) => {
      if (!this.abajoDedo) return;
      const u = this.rastro[this.rastro.length - 1];
      this.rastro.push({ x, y, t: this.t });
      if (u && Math.hypot(x - u.x, y - u.y) > 6) this.cortarEntre(u.x, u.y, x, y);
    });
  }

  // ¿El segmento del dedo pasó cerca del centro de alguna fruta?
  cortarEntre(x0, y0, x1, y1) {
    const dx = x1 - x0, dy = y1 - y0, l2 = dx * dx + dy * dy;
    for (const f of this.frutas) {
      if (f.estado !== 'vuela') continue;
      const k = Math.max(0, Math.min(1, ((f.x - x0) * dx + (f.y - y0) * dy) / l2));
      if (Math.hypot(x0 + k * dx - f.x, y0 + k * dy - f.y) < 58) this.cortar(f, Math.atan2(dy, dx));
    }
  }

  cortar(f, angulo) {
    f.estado = 'cortada';
    if (!f.esFruta) {
      f.img.setTexture('emoji', 'explosion').setDisplaySize(180, 180);
      this.audio.explosion();
      this.perder();
      return;
    }
    // Dos mitades que se separan
    f.img.destroy();
    for (const lado of [-1, 1]) {
      const m = this.emojiEntero(f.nombre, f.x, f.y, 100).setCrop(lado < 0 ? 0 : 76, 0, 76, 152).setAngle(angulo * 57.3 + 90);
      this.tweens.add({
        targets: m, x: f.x + lado * 90, y: f.y + 160, angle: m.angle + lado * 120, alpha: 0,
        duration: 600, ease: 'Quad.easeIn', onComplete: () => m.destroy(),
      });
    }
    this.chispas(f.x, f.y, 10, f.jugo);
    this.audio.corte();
    this.audio.acierto(this.frutas.filter(o => o.estado === 'cortada').length - 1);
    this.revisar();
  }

  // Gana cuando cortó todas las frutas y la bomba (si hay) ya se fue sin cortar.
  revisar() {
    if (!this.decidido && this.frutas.every(f => (f.esFruta ? f.estado === 'cortada' : f.estado === 'cayo'))) this.ganar();
  }

  paso(dt, t) {
    for (const f of this.frutas) {
      if (f.estado === 'espera' && t >= f.tSale) {
        f.estado = 'vuela';
        f.img = this.emoji(f.nombre, f.x, f.y, 100);
      }
      if (f.estado !== 'vuela') continue;
      f.vy += this.g * dt;
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      f.img.setPosition(f.x, f.y);
      f.img.angle += 90 * dt;
      if (f.vy > 0 && f.y > this.H + 70) {
        f.estado = 'cayo';
        if (f.esFruta) { this.perder(); this.cartel(this.cx, this.cy, '¡SE TE ESCAPÓ!', COLOR.MAL, 48); }
      }
    }
    this.revisar();
    this.dibujarRastro(t);
  }

  dibujarRastro(t) {
    while (this.rastro.length && t - this.rastro[0].t > 0.12) this.rastro.shift();
    const g = this.trazo;
    g.clear();
    for (let i = 1; i < this.rastro.length; i++) {
      const a = this.rastro[i - 1], b = this.rastro[i];
      const k = i / this.rastro.length;
      g.lineStyle(4 + k * 10, 0xffffff, 0.35 + k * 0.6);
      g.lineBetween(a.x, a.y, b.x, b.y);
    }
  }
}
