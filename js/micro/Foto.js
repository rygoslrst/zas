// ¡SACÁ LA FOTO! — Un bicho vuela de acá para allá: tocá cuando esté en el cuadro.
import { Micro } from '../escenas/Micro.js';
import { COLOR } from '../config.js';

export class Foto extends Micro {
  static ORDEN = '¡SACÁ LA FOTO!';
  static CONTROL = 'tocar';

  armar() {
    this.tema('cielo');
    this.emoji('camara', this.W - 60, this.bajo - 20, 80).setAngle(-12);
    // El visor: cuatro esquinas
    this.lado = [230, 180, 140][this.nivel - 1];
    this.mx = this.cx; this.my = this.cy + 40;
    const l = this.lado / 2, g = 8, c = 40;
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      this.rect(this.mx + sx * (l - c / 2), this.my + sy * l, c, g, 0xffffff);
      this.rect(this.mx + sx * l, this.my + sy * (l - c / 2), g, c, 0xffffff);
    }
    this.rect(this.mx, this.my, 22, 3, 0xffffff, 0.7);
    this.rect(this.mx, this.my, 3, 22, 0xffffff, 0.7);
    // El bicho
    this.nombre = this.elegir(['pajaro', 'mariposa', 'abeja', 'pato']);
    this.x = -60;
    this.dir = 1;
    this.rapidez = [210, 270, 320][this.nivel - 1] * this.vel;
    this.amplitud = [50, 100, 140][this.nivel - 1];
    this.bicho = this.emoji(this.nombre, this.x, this.my, 96);
    this.mirar(this.bicho, this.nombre, 1);
    this.flash = this.rect(this.cx, this.cy, this.W, this.H, 0xffffff, 0).setDepth(80);
    this.alTocar(() => this.disparar());
  }

  disparar() {
    this.audio.obturador();
    this.flash.setAlpha(0.9);
    this.tweens.add({ targets: this.flash, alpha: 0, duration: 250 });
    const adentro = Math.abs(this.bicho.x - this.mx) < this.lado / 2 - 22 && Math.abs(this.bicho.y - this.my) < this.lado / 2 - 22;
    if (adentro) {
      this.ganar();
      this.cartel(this.cx, this.my - this.lado / 2 - 50, '¡QUÉ FOTO!', COLOR.ORO, 60);
    } else {
      this.perder();
      this.cartel(this.cx, this.my - this.lado / 2 - 50, '¡NO SALIÓ!', COLOR.MAL, 56);
    }
  }

  paso(dt, t) {
    if (this.decidido) return;       // la foto congela al bicho
    this.x += this.dir * this.rapidez * dt;
    if ((this.x > this.W - 50 && this.dir > 0) || (this.x < 50 && this.dir < 0 && t > 1)) {
      this.dir *= -1;
      this.mirar(this.bicho, this.nombre, this.dir);
    }
    // En el nivel 3 el vuelo es más loco (dos ondas mezcladas)
    const y = this.my + Math.sin(t * 3.1 * this.vel) * this.amplitud
      + (this.nivel >= 3 ? Math.sin(t * 7.3) * 40 : 0);
    this.bicho.setPosition(this.x, y).setAngle(Math.sin(t * 12) * 8);
  }
}
