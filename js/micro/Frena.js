// ¡FRENÁ! — El auto va derecho al precipicio: frená a tiempo, dentro de la zona.
import { Micro } from '../escenas/Micro.js';
import { COLOR } from '../config.js';

const FRENADA = 70;          // px que recorre el auto desde que frenás hasta parar

export class Frena extends Micro {
  static ORDEN = '¡FRENA!';
  static CONTROL = 'tocar';

  armar() {
    this.tema('cielo');
    this.suelo = this.cy + 140;
    this.borde = 462;
    const zona = [130, 96, 70][this.nivel - 1];
    this.zona0 = this.borde - zona;
    // Precipicio: el camino termina en el borde
    this.rect(this.borde / 2, this.suelo + (this.H - this.suelo) / 2, this.borde, this.H - this.suelo, 0x6b4f3a).setOrigin(0.5);
    this.add.image(0, this.suelo + 20, 'atlas', 'degradeV').setOrigin(0).setDisplaySize(this.borde, 80).setTint(0x8a6a50);
    this.rect(this.borde / 2, this.suelo + 10, this.borde, 20, 0x3d3d4a);
    for (let x = 20; x < this.borde; x += 60) this.rect(x + 15, this.suelo + 10, 28, 4, 0xfff1a8);
    this.rect((this.zona0 + this.borde) / 2, this.suelo + 10, zona, 20, COLOR.BIEN, 0.8);
    this.emoji('bandera', this.zona0 + 18, this.suelo - 44, 80);
    // El auto
    this.x = -60;
    this.v = [240, 290, 330][this.nivel - 1] * this.vel;
    this.frenando = false;
    this.cayendo = false;
    this.vy = 0;
    this.auto = this.emoji('auto', this.x, this.suelo - 38, 118);
    this.alTocar(() => {
      if (this.frenando || this.cayendo) return;
      this.frenando = true;
      this.desac = (this.v * this.v) / (2 * FRENADA);
      this.audio.freno();
    });
  }

  paso(dt, t) {
    if (this.cayendo) {
      this.vy += 1800 * dt;
      this.auto.y += this.vy * dt;
      this.auto.x += 120 * dt;
      this.auto.angle = Math.min(80, this.auto.angle + 200 * dt);
      return;
    }
    if (this.v <= 0) return;
    if (this.frenando) {
      this.v = Math.max(0, this.v - this.desac * dt);
      if (Math.random() < 0.5) this.chispas(this.x - 40, this.suelo - 6, 1, 0xdddddd, 0.4);
    }
    this.x += this.v * dt;
    this.auto.setPosition(this.x, this.suelo - 38 + (this.frenando ? 0 : Math.sin(t * 30) * 1.5))
      .setAngle(this.frenando ? 4 : 0);
    const frente = this.x + 52;
    if (this.x > this.borde) {                   // se pasó: al vacío
      this.cayendo = true;
      this.vy = 0;
      this.perder();
      this.cartel(this.cx, this.cy - 120, '¡AAAH!', COLOR.MAL);
    } else if (this.v === 0) {
      if (frente >= this.zona0 - 6) {
        this.ganar();
        this.cartel(this.cx, this.cy - 120, '¡JUSTO!', COLOR.ORO);
        this.chispas(frente, this.suelo - 40, 10);
      } else {
        this.perder();
        this.cartel(this.cx, this.cy - 120, '¡MUY LEJOS!', COLOR.MAL);
      }
    }
  }
}
