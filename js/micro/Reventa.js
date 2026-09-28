// ¡REVENTÁ! — Suben globos: tocalos a todos antes de que se acabe el tiempo.
import { Micro } from '../escenas/Micro.js';

export class Reventa extends Micro {
  static ORDEN = '¡REVENTÁ!';
  static CONTROL = 'tocar';

  armar() {
    this.tema('cielo');
    const n = [3, 4, 6][this.nivel - 1];
    const sube = [55, 65, 80][this.nivel - 1] * this.vel;
    this.globos = [];
    for (let i = 0; i < n; i++) {
      const x = 70 + (i + 0.5) * (400 / n) + this.azar(-18, 18);
      const y = this.bajo - 40 - this.azar(0, 220);
      this.globos.push({ img: this.emoji('globo', x, y, 104), x, y, vy: -sube * this.azar(0.8, 1.2), fase: this.azar(0, 6), vivo: true });
    }
    this.reventados = 0;
    this.alTocar((x, y) => {
      let mejor = null, dMejor = 66;
      for (const g of this.globos) {
        if (!g.vivo) continue;
        const d = Math.hypot(g.x - x, g.y - 12 - y);     // el globo está arriba del hilo
        if (d < dMejor) { dMejor = d; mejor = g; }
      }
      if (mejor) this.reventar(mejor);
    });
  }

  reventar(g) {
    g.vivo = false;
    g.img.setTexture('emoji', 'explosion').setDisplaySize(120, 120);
    this.tweens.add({ targets: g.img, alpha: 0, displayWidth: 150, displayHeight: 150, duration: 220, onComplete: () => g.img.destroy() });
    this.chispas(g.x, g.y - 12, 8, 0xff4d5a);
    this.audio.pop();
    this.audio.acierto(this.reventados++);
    if (this.globos.every(o => !o.vivo)) this.ganar();
  }

  paso(dt, t) {
    for (const g of this.globos) {
      if (!g.vivo) continue;
      g.y += g.vy * dt;
      g.x += Math.sin(t * 2.4 + g.fase) * 22 * dt;
      g.img.setPosition(g.x, g.y).setAngle(Math.sin(t * 2 + g.fase) * 6);
    }
  }
}
