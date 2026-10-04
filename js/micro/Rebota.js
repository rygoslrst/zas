// ¡NO LO DEJES CAER! — Un globo baja despacio hacia unos cactus: tócalo para
// que suba (si lo tocas de costado, también se va para el otro lado). Hay que
// aguantar hasta que se queme la mecha. Desde el nivel 2 sopla viento; en el
// nivel 3 son dos globos.
import { Micro } from '../escenas/Micro.js';
import { COLOR } from '../config.js';

export class Rebota extends Micro {
  static ORDEN = '¡NO LO DEJES CAER!';
  static ICONO = 'nube';          // en la galería
  static CONTROL = 'tocar';
  static GANA_AL_FINAL = true;

  armar() {
    this.tema('cielo');
    // Abajo, arena y una fila de cactus
    this.yPinchos = this.bajo - 34;
    this.horizonte(this.yPinchos + 18, 'dunas', 0xf3d79e);
    this.piso(this.yPinchos + 18, 0xe8c77e);
    for (let x = 28; x < this.W; x += 60) this.emoji('cactus', x + this.azar(-5, 5), this.yPinchos - 6, 62);
    // Un globo no cae como una piedra: acelera poco y tiene una velocidad tope
    const k = Math.pow(this.vel, 0.7);
    this.g = 280 * k;
    this.tope = [230, 270, 290][this.nivel - 1] * k;
    this.impulso = Math.sqrt(2 * this.g * 300);            // un toque lo sube unos 300 px
    this.viento = this.nivel >= 2 ? (Math.random() < 0.5 ? -1 : 1) * this.azar(25, 45) : 0;
    const n = this.nivel >= 3 ? 2 : 1;
    this.globos = [];
    for (let i = 0; i < n; i++) {
      const x = n === 1 ? this.cx : this.cx + (i ? 115 : -115);
      const y = this.arriba + 150 + i * 70;
      this.globos.push({ img: this.emoji('globo', x, y, 112), x, y, vx: 0, vy: 0, fase: i * 2.1 });
    }
    this.alTocar((x, y) => {
      let mejor = null, dMejor = 95;
      for (const g of this.globos) {
        const d = Math.hypot(g.x - x, g.y - 12 - y);
        if (d < dMejor) { dMejor = d; mejor = g; }
      }
      if (!mejor) return;
      mejor.vy = -this.impulso;
      mejor.vx = Math.max(-170, Math.min(170, mejor.vx + (mejor.x - x) * 2.4));
      this.rebote(mejor.img, 1.15);
      this.audio.toque();
      this.chispas(x, y, 5, 0xffffff, 0.5);
    });
  }

  alGanar() { this.cartel(this.cx, this.cy - 140, '¡BIEN AGUANTADO!', COLOR.ORO, 54); }

  paso(dt, t) {
    if (this.resultado === 'perdio') return;
    for (const g of this.globos) {
      g.vy = Math.min(this.tope, g.vy + this.g * dt);
      g.vx = (g.vx + this.viento * dt) * (1 - 0.7 * dt);
      g.x += g.vx * dt;
      g.y += g.vy * dt;
      // Rebota en los costados y en el techo
      if (g.x < 60) { g.x = 60; g.vx = Math.abs(g.vx); }
      else if (g.x > this.W - 60) { g.x = this.W - 60; g.vx = -Math.abs(g.vx); }
      if (g.y < this.arriba + 70) { g.y = this.arriba + 70; g.vy = Math.abs(g.vy) * 0.3; }
      g.img.setPosition(g.x, g.y + Math.sin(t * 3 + g.fase) * 3).setAngle(g.vx * 0.06 + Math.sin(t * 2 + g.fase) * 5);
      // ¿Llegó a los cactus?
      if (!this.decidido && g.y + 52 > this.yPinchos - 18) {
        g.img.setTexture('emoji', 'explosion').setDisplaySize(150, 150);
        this.audio.pop();
        this.perder();
        this.cartel(g.x, g.y - 90, '¡PLOP!', COLOR.MAL);
        return;
      }
    }
  }
}
