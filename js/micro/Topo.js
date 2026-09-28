// ¡PEGALE! — Asoman hámsters por los agujeros: tocalos antes de que se escondan.
import { Micro } from '../escenas/Micro.js';
import { COLOR } from '../config.js';

export class Topo extends Micro {
  static ORDEN = '¡PEGALE!';
  static CONTROL = 'tocar';

  armar() {
    this.fondo(0x8ac926, 'lunares');
    this.necesarios = [3, 4, 5][this.nivel - 1];
    this.golpes = 0;
    this.ventana = [0.95, 0.75, 0.6][this.nivel - 1] / Math.sqrt(this.vel);
    this.juntos = this.nivel >= 3 ? 2 : 1;
    this.hoyos = [];
    for (let i = 0; i < 9; i++) {
      const x = this.cx + ((i % 3) - 1) * 160, y = this.cy + 60 + (Math.floor(i / 3) - 1) * 175;
      this.circulo(x, y + 20, 62, 0x3b2a1a).setScale(1, 0.4);
      const img = this.emoji('hamster', x, y - 20, 100).setVisible(false);
      this.hoyos.push({ x, y, img, hasta: 0, fuera: false });
    }
    this.cuenta = this.texto(this.cx, this.arriba + 60, String(this.necesarios), 64);
    this.proximo = 0.45 / this.vel;
    this.martillo = this.emoji('martillo', 0, 0, 90).setVisible(false).setDepth(30);
    this.alTocar((x, y) => this.golpear(x, y));
  }

  golpear(x, y) {
    this.martillo.setVisible(true).setPosition(x + 30, y - 30).setAngle(-40);
    this.tweens.killTweensOf(this.martillo);
    this.tweens.add({ targets: this.martillo, angle: 10, duration: 70, yoyo: true, onComplete: () => this.martillo.setVisible(false) });
    const h = this.hoyos.find(o => o.fuera && Math.hypot(o.x - x, o.y - 20 - y) < 75);
    if (!h) { this.audio.zas(); return; }
    h.fuera = false;
    h.img.setScale(h.img.scaleX * 1.2, h.img.scaleY * 0.6).setTint(0xbbbbbb);
    this.time.delayedCall(160, () => h.img.setVisible(false));
    this.audio.plaf();
    this.chispas(h.x, h.y - 40, 6, COLOR.ORO);
    this.golpes++;
    this.cuenta.setText(String(Math.max(0, this.necesarios - this.golpes)));
    if (this.golpes >= this.necesarios) this.ganar();
  }

  paso(dt, t) {
    for (const h of this.hoyos) {
      if (h.fuera && t > h.hasta) { h.fuera = false; h.img.setVisible(false); }
    }
    if (this.decidido || t < this.proximo) return;
    // Asoman en agujeros distintos a los que ya están afuera
    const libres = this.mezclar(this.hoyos.filter(o => !o.fuera));
    for (let k = 0; k < this.juntos && k < libres.length; k++) {
      const h = libres[k];
      h.fuera = true;
      h.hasta = t + this.ventana;
      h.img.setVisible(true).clearTint().setDisplaySize(100, 100).setY(h.y + 10).setAlpha(1);
      this.tweens.add({ targets: h.img, y: h.y - 20, duration: 90 });
    }
    this.proximo = t + this.ventana + 0.12 / this.vel;
  }
}
