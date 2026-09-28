// ¡NO LO SUELTES! — Poné el dedo sobre la mariquita y seguila hasta el final.
import { Micro } from '../escenas/Micro.js';
import { COLOR } from '../config.js';

export class Sigue extends Micro {
  static ORDEN = '¡NO LO SUELTES!';
  static CONTROL = 'arrastrar';
  static GANA_AL_FINAL = true;

  armar() {
    this.tema('pasto');
    this.nombre = this.elegir(['mariquita', 'abeja', 'mariposa']);
    this.bicho = this.emoji(this.nombre, this.cx, this.cy + 150, 90);
    this.aro = this.add.image(this.cx, this.cy + 150, 'atlas', 'anillo').setDisplaySize(150, 150).setTint(0xffffff).setAlpha(0.8);
    this.dedo = null;
    this.tLejos = 0;
    // Hasta que no lo agarrás, el bicho te espera (y la consigna se lee)
    this.tArranca = 0;
    this.rapidez = [1.0, 1.25, 1.5][this.nivel - 1] * Math.sqrt(this.vel);
    this.alTocar((x, y) => { this.dedo = { x, y }; });
    this.alMover((x, y, p) => { if (p.isDown || p.wasTouch === false) this.dedo = { x, y }; });
    this.input.on('pointerup', p => { if (p.wasTouch) this.dedo = null; });
  }

  alGanar() { this.cartel(this.cx, this.cy - 150, '¡PEGADITO!', COLOR.ORO, 60); }

  paso(dt, t) {
    if (this.decidido) return;
    const cerca = this.dedo && Math.hypot(this.dedo.x - this.bicho.x, this.dedo.y - this.bicho.y) < 80;
    if (!this.tArranca && cerca) this.tArranca = t;
    // Se mueve en una curva que cambia (Lissajous)
    if (this.tArranca) {
      const u = (t - this.tArranca) * this.rapidez;
      const x = this.cx + Math.sin(u * 1.3) * 170 + Math.sin(u * 2.9) * 30;
      const y = this.cy + 60 + Math.sin(u * 0.9 + 1.2) * 220;
      this.bicho.setPosition(x, y).setAngle(Math.sin(u * 5) * 15);
      // Si el dedo se aleja más de un instante, se escapó
      this.tLejos = cerca ? 0 : this.tLejos + dt;
      if (this.tLejos > 0.3) {
        this.perder();
        this.cartel(this.bicho.x, this.bicho.y - 80, '¡SE ESCAPÓ!', COLOR.MAL);
      }
    } else if (t > this.dur * 0.55) {
      // Nunca lo agarró
      this.perder();
    }
    this.aro.setPosition(this.bicho.x, this.bicho.y).setTint(cerca ? COLOR.BIEN : 0xffffff)
      .setAlpha(0.5 + Math.sin(t * 10) * 0.3);
  }
}
