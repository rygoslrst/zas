// ¡ATRAPÁ! — Cae comida: movés la canasta para agarrarla. La bomba, no.
import { Micro } from '../escenas/Micro.js';
import { COLOR } from '../config.js';

const COMIDA = ['manzana', 'banana', 'uva', 'frutilla', 'sandia', 'cereza', 'durazno', 'anana', 'dona', 'pizza'];

export class Atrapa extends Micro {
  static ORDEN = '¡ATRAPA!';
  static CONTROL = 'arrastrar';

  armar() {
    this.tema('cielo');
    this.cy0 = this.bajo - 55;
    this.piso(this.cy0 + 46, 0x6fc24a);
    this.sombraCanasta = this.sombra(this.cx, this.cy0 + 58, 120, 0.3);
    this.canasta = this.emoji('canasta', this.cx, this.cy0, 132);
    this.objetivoX = this.cx;
    // Qué cae: 1, 2 o 3 cosas; en el nivel 3, una bomba en el medio
    const cosas = [[1], [1, 1], [1, 0, 1, 1]][this.nivel - 1];
    this.g = 820 * this.vel * this.vel;
    this.caen = cosas.map((esComida, i) => ({
      img: null, esComida: !!esComida, tSale: (0.75 + i * 0.62) / this.vel,
      x: this.azar(70, this.W - 70), y: -70, vy: 90 * this.vel, estado: 'espera',
    }));
    const mover = x => { this.objetivoX = Math.max(60, Math.min(this.W - 60, x)); };
    this.alMover(mover);
    this.alTocar(mover);
  }

  paso(dt, t) {
    this.canasta.x += (this.objetivoX - this.canasta.x) * Math.min(1, dt * 22);
    this.sombraCanasta.x = this.canasta.x;
    for (const c of this.caen) {
      if (c.estado === 'espera') {
        if (t < c.tSale) continue;
        c.estado = 'cae';
        c.img = this.emoji(c.esComida ? this.elegir(COMIDA) : 'bomba', c.x, c.y, 92);
      }
      if (c.estado !== 'cae') continue;
      c.vy += this.g * dt;
      c.y += c.vy * dt;
      c.img.setPosition(c.x, c.y).setAngle(c.y * 0.3);
      const dx = Math.abs(c.x - this.canasta.x);
      if (c.y > this.cy0 - 40 && c.y < this.cy0 + 10 && dx < 72) {
        c.estado = 'atrapado';
        c.img.destroy();
        this.rebote(this.canasta, 1.15);
        if (c.esComida) {
          this.audio.acierto(this.caen.filter(o => o.estado === 'atrapado').length - 1);
          this.chispas(c.x, this.cy0 - 30, 6);
        } else {
          this.audio.explosion();
          this.emoji('explosion', this.canasta.x, this.cy0 - 20, 170);
          this.perder();
        }
      } else if (c.y > this.cy0 + 50) {
        c.estado = 'paso';
        if (c.esComida) { this.perder(); this.cartel(c.x, this.cy0 - 90, '¡UY!', COLOR.MAL); }
      }
    }
    if (!this.decidido && this.caen.every(c => c.esComida ? c.estado === 'atrapado' : c.estado === 'paso')) this.ganar();
  }
}
