// ¡PESCÁ! — Los peces pasan por abajo: tocá para bajar el anzuelo justo encima.
import { Micro } from '../escenas/Micro.js';
import { COLOR } from '../config.js';

export class Pesca extends Micro {
  static ORDEN = '¡PESCÁ!';
  static CONTROL = 'tocar';

  armar() {
    this.tema('mar');
    this.yAgua = this.arriba + 60;
    this.rect(this.cx, this.yAgua / 2, this.W, this.yAgua, 0x8fd3ff).setOrigin(0.5);
    this.rect(this.cx, this.yAgua, this.W, 8, 0xc7f0ff);
    this.yArriba = this.arriba + 170;
    this.yPeces = this.cy + 170;
    this.linea = this.rect(this.cx, 0, 4, 1, 0xffffff, 0.85).setOrigin(0.5, 0);
    this.anzuelo = this.emoji('anzuelo', this.cx, this.yArriba, 64);
    this.estadoAnzuelo = 'arriba';
    this.bajada = (this.yPeces - this.yArriba) / (0.22 / this.vel);    // px/s
    // Peces (y en el nivel 3, un tiburón que no hay que pescar)
    const rapidez = [150, 210, 250][this.nivel - 1] * this.vel;
    const tipos = [['pez'], ['pez', 'pez_globo'], ['pez', 'tiburon', 'pulpo']][this.nivel - 1];
    this.peces = tipos.map((nombre, i) => {
      const dir = i % 2 ? -1 : 1;
      const x = dir > 0 ? -70 - i * 120 : this.W + 70 + i * 120;
      const img = this.emoji(nombre, x, this.yPeces, nombre === 'tiburon' ? 120 : 96);
      const p = { nombre, img, x, dir, rapidez: rapidez * this.azar(0.9, 1.15), malo: nombre === 'tiburon' };
      this.mirar(img, nombre, dir);
      return p;
    });
    this.alTocar(() => {
      if (this.estadoAnzuelo === 'arriba') { this.estadoAnzuelo = 'baja'; this.audio.zas(); }
    });
  }

  paso(dt, t) {
    for (const p of this.peces) {
      if (p.pescado) continue;
      p.x += p.dir * p.rapidez * dt;
      if ((p.x > this.W + 80 && p.dir > 0) || (p.x < -80 && p.dir < 0)) { p.dir *= -1; this.mirar(p.img, p.nombre, p.dir); }
      p.img.setPosition(p.x, this.yPeces + Math.sin(t * 4 + p.rapidez) * 8);
    }
    const a = this.anzuelo;
    if (this.estadoAnzuelo === 'baja') {
      a.y += this.bajada * dt;
      if (a.y >= this.yPeces) {
        a.y = this.yPeces;
        this.estadoAnzuelo = 'sube';
        const p = this.peces.find(o => Math.abs(o.x - this.cx) < (o.malo ? 60 : 58));
        if (p && p.malo) {
          this.perder();
          this.cartel(this.cx, this.yPeces - 100, '¡ÑAM!', COLOR.MAL, 72);
          this.audio.mordida();
          a.setVisible(false);
        } else if (p) {
          p.pescado = true;
          this.pez = p;
          this.ganar();
          this.audio.bien();
          this.chispas(this.cx, this.yPeces, 10);
          this.cartel(this.cx, this.yPeces - 100, '¡PICÓ!', COLOR.ORO, 64);
        }
      }
    } else if (this.estadoAnzuelo === 'sube') {
      a.y -= this.bajada * 0.8 * dt;
      if (a.y <= this.yArriba) { a.y = this.yArriba; this.estadoAnzuelo = 'arriba'; }
    }
    if (this.pez) this.pez.img.setPosition(this.cx, a.y + 40).setAngle(-70);
    this.linea.displayHeight = a.y - 20;
  }
}
