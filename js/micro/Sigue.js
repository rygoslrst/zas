// ¡NO LO SUELTES! — Pon el dedo sobre el bicho y síguelo hasta el final.
import { Micro } from '../escenas/Micro.js';
import { COLOR } from '../config.js';

export class Sigue extends Micro {
  static ORDEN = '¡NO LO SUELTES!';
  static CONTROL = 'arrastrar';
  static GANA_AL_FINAL = true;
  // La primera vez: el juego se congela y enseña (ver Director.revisarLeccion)
  static LECCION = {
    titulo: '¡PON EL DEDO ENCIMA!', sub: 'Y SÍGUELO SIN SOLTARLO HASTA EL FINAL',
    gesto: 'tocar', lugar: 'arriba', listo: () => true,
    objetivo: m => ({ x: m.bicho.x, y: m.bicho.y }),
  };

  armar() {
    this.tema('pasto');
    this.nombre = this.elegir(['mariquita', 'abeja', 'mariposa']);
    // El bicho espera justo donde empieza su recorrido: al agarrarlo no salta
    this.u = 0;
    const p0 = this.curva(0);
    this.bicho = this.emoji(this.nombre, p0.x, p0.y, 90);
    this.aro = this.add.image(p0.x, p0.y, 'atlas', 'anillo').setDisplaySize(150, 150).setTint(0xffffff).setAlpha(0.8);
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

  // El recorrido: una curva que cambia (Lissajous). En u = 0, el centro.
  curva(u) {
    return {
      x: this.cx + Math.sin(u * 1.3) * 170 + Math.sin(u * 2.9) * 30,
      y: this.cy + 60 + Math.sin(u * 0.9) * 220,
    };
  }

  paso(dt, t) {
    if (this.decidido) return;
    const cerca = this.dedo && Math.hypot(this.dedo.x - this.bicho.x, this.dedo.y - this.bicho.y) < 80;
    if (!this.tArranca && cerca) this.tArranca = t;
    if (this.tArranca) {
      // Arranca despacito (medio segundo): el dedo que recién lo agarró no lo pierde
      this.u += dt * this.rapidez * Math.min(1, (t - this.tArranca) / 0.5);
      const p = this.curva(this.u);
      this.bicho.setPosition(p.x, p.y).setAngle(Math.sin(this.u * 5) * 15);
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
