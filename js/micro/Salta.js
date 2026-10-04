// ¡SALTÁ! — Vienen cactus: tocá para saltarlos.
import { Micro } from '../escenas/Micro.js';
import { COLOR } from '../config.js';

export class Salta extends Micro {
  static ORDEN = '¡SALTA!';
  static ICONO = 'cactus';          // en la galería
  static CONTROL = 'tocar';

  armar() {
    this.tema('atardecer');
    this.emoji('sol', 440, this.arriba + 110, 130);
    this.suelo = this.cy + 150;
    this.horizonte(this.suelo, 'dunas', 0xf1b67c);
    this.piso(this.suelo, 0xe0a458);
    this.rapidez = 340 * this.vel;
    this.duracionSalto = 0.62 / this.vel;
    // El corredor mira a la izquierda: se lo da vuelta
    this.corredor = this.emoji('corredor', 120, this.suelo - 48, 100).setFlipX(true);
    this.enAire = false;
    this.tSalto = 0;
    const n = this.nivel;
    const separacion = [0, 300, 290][n - 1];
    this.cactus = [];
    for (let i = 0; i < n; i++) {
      const x = this.W + 50 + i * (separacion + this.azar(0, 40));
      this.cactus.push({ img: this.emoji('cactus', x, this.suelo - 38, 84), x });
    }
    this.alTocar(() => {
      if (this.enAire) return;
      this.enAire = true;
      this.tSalto = this.t;
      this.audio.salto();
    });
  }

  paso(dt, t) {
    // El corredor
    let y = this.suelo - 48;
    if (this.enAire) {
      const p = (t - this.tSalto) / this.duracionSalto;
      if (p >= 1) this.enAire = false;
      else y -= 4 * 160 * p * (1 - p);
    }
    if (this.resultado === 'perdio') {
      this.corredor.angle = Math.max(-90, this.corredor.angle - 400 * dt);
      return;
    }
    this.corredor.setPosition(120, y + (this.enAire ? 0 : -Math.abs(Math.sin(t * 16)) * 5))
      .setAngle(this.enAire ? -10 : 0);
    // Los cactus
    for (const c of this.cactus) {
      c.x -= this.rapidez * dt;
      c.img.x = c.x;
      // Choque: cajas un poco más chicas que el dibujo
      if (!this.decidido && Math.abs(c.x - 120) < 44 && y > this.suelo - 48 - 58) {
        this.perder();
        this.audio.golpe();
        this.cartel(120, this.suelo - 150, '¡AY!', COLOR.MAL);
      }
    }
    if (!this.decidido && this.cactus.every(c => c.x < 60)) {
      this.ganar();
      this.chispas(120, this.suelo - 60, 8);
    }
  }
}
