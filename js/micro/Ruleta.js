// ¡PARÁ EN LA ESTRELLA! — La ruleta gira: tocá para frenarla con la estrella
// debajo de la flecha. Frena siempre igual (un cuarto de vuelta más o menos):
// hay que tocar un poquito antes.
import { Micro } from '../escenas/Micro.js';
import { COLOR } from '../config.js';

const PREMIOS = ['pizza', 'globo', 'gato', 'dona', 'pelota', 'sapo', 'cohete', 'dado', 'hongo'];
const GAJOS = [0xff4d5a, 0xffd23f, 0x4d96ff, 0x2ec4b6, 0xff70a6, 0x7b61ff, 0xff9f1c, 0x8ac926];
const FRENADA = 0.42;        // segundos que tarda en frenar

export class Ruleta extends Micro {
  static ORDEN = '¡FRENA EN LA ESTRELLA!';
  static CONTROL = 'tocar';

  armar() {
    this.fondo(0x3a2a6b, 'rayas');
    this.n = [6, 8, 8][this.nivel - 1];
    this.radio = 200;
    this.rx = this.cx; this.ry = this.cy + 80;
    this.estrella = Math.floor(Math.random() * this.n);
    // La rueda: gajos de colores dibujados y un emoji en cada uno
    this.rueda = this.add.container(this.rx, this.ry);
    const g = this.add.graphics();
    const paso = (Math.PI * 2) / this.n;
    for (let i = 0; i < this.n; i++) {
      g.fillStyle(i === this.estrella ? 0xfff1a8 : GAJOS[i % GAJOS.length], 1);
      g.beginPath();
      g.slice(0, 0, this.radio, i * paso - paso / 2 - Math.PI / 2, (i + 1) * paso - paso / 2 - Math.PI / 2, false);
      g.fillPath();
    }
    g.lineStyle(6, COLOR.OSCURO, 1).strokeCircle(0, 0, this.radio);
    for (let i = 0; i < this.n; i++) {
      const a = i * paso - Math.PI / 2;
      g.lineBetween(0, 0, Math.cos(a - paso / 2) * this.radio, Math.sin(a - paso / 2) * this.radio);
    }
    this.rueda.add(g);
    const premios = this.mezclar(PREMIOS);
    for (let i = 0; i < this.n; i++) {
      const a = i * paso - Math.PI / 2;
      const img = this.emoji(i === this.estrella ? 'estrella' : premios[i % premios.length], Math.cos(a) * this.radio * 0.66, Math.sin(a) * this.radio * 0.66, 64);
      img.setAngle(a * 57.3 + 90);
      this.rueda.add(img);
    }
    this.circulo(this.rx, this.ry, 30, COLOR.OSCURO);
    this.circulo(this.rx, this.ry, 20, 0xffd23f);
    // La flecha, arriba, apuntando hacia abajo
    this.flecha = this.add.image(this.rx, this.ry - this.radio - 26, 'atlas', 'flecha').setDisplaySize(84, 84)
      .setAngle(90).setTint(COLOR.MAL);
    this.giro = Math.random() * Math.PI * 2;
    this.w = [3.0, 3.7, 4.3][this.nivel - 1] * Math.sqrt(this.vel);        // radianes por segundo
    this.frenando = -1;
    this.alTocar(() => {
      if (this.frenando >= 0) return;
      this.frenando = this.t;
      this.w0 = this.w;
      this.audio.freno();
    });
  }

  // ¿Qué gajo queda bajo la flecha? (la flecha está arriba: ángulo -90°)
  gajoArriba() {
    const paso = (Math.PI * 2) / this.n;
    let a = (-this.giro) % (Math.PI * 2);
    if (a < 0) a += Math.PI * 2;
    return Math.round(a / paso) % this.n;
  }

  paso(dt, t) {
    if (this.decidido && this.frenando < 0) return;
    let w = this.w;
    if (this.frenando >= 0) {
      const p = (t - this.frenando) / FRENADA;
      w = this.w0 * Math.max(0, 1 - p);
      if (p >= 1 && !this.decidido) {
        if (this.gajoArriba() === this.estrella) {
          this.ganar();
          this.confeti(this.rx, this.ry - this.radio);
          this.cartel(this.cx, this.arriba + 130, '¡PREMIO!', COLOR.ORO, 72);
        } else {
          this.perder();
          this.cartel(this.cx, this.arriba + 130, '¡CASI!', COLOR.MAL, 72);
        }
      }
    }
    this.giro += w * dt;
    this.rueda.setRotation(this.giro);
    this.flecha.y = this.ry - this.radio - 26 + (w > 0.5 ? Math.sin(t * 40) * 2 : 0);
  }
}
