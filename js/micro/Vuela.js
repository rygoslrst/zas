// ¡VOLÁ! — Tocá para aletear y pasá por el hueco de los caños.
import { Micro } from '../escenas/Micro.js';
import { COLOR } from '../config.js';

const VERDE = 0x3a9d23, VERDE_OSCURO = 0x1f6b12;

export class Vuela extends Micro {
  static ORDEN = '¡VOLÁ!';
  static CONTROL = 'tocar';
  static GANA_AL_FINAL = true;

  armar() {
    this.tema('cielo');
    this.suelo = this.bajo - 10;
    this.piso(this.suelo, 0xded895);
    this.rect(this.cx, this.suelo + 4, this.W, 10, VERDE);
    this.x = 140;
    this.y = this.cy - 40;
    this.vy = 0;
    this.g = 1500 * this.vel * this.vel;
    this.aleteo = -520 * this.vel;
    this.volando = false;
    this.pajaro = this.emoji('pajaro', this.x, this.y, 80);
    // Caños con un hueco
    const hueco = [300, 255, 215][this.nivel - 1];
    const n = [1, 2, 2][this.nivel - 1];
    this.rapidez = 250 * this.vel;
    this.canos = [];
    for (let i = 0; i < n; i++) {
      const centro = this.azar(this.cy - 150, this.cy + 130);
      const x = this.W + 80 + i * 330;
      const arribaAlto = centro - hueco / 2, abajoY = centro + hueco / 2;
      const partes = [
        this.rect(x, arribaAlto / 2, 90, arribaAlto, VERDE),
        this.rect(x, arribaAlto - 14, 106, 28, VERDE_OSCURO),
        this.rect(x, (abajoY + this.suelo) / 2, 90, this.suelo - abajoY, VERDE),
        this.rect(x, abajoY + 14, 106, 28, VERDE_OSCURO),
      ];
      this.canos.push({ x, partes, arribaAlto, abajoY });
    }
    this.alTocar(() => {
      this.volando = true;
      this.vy = this.aleteo;
      this.audio.aleteo();
    });
  }

  alPerder() {
    this.audio.golpe();
    this.cartel(this.x + 40, this.y - 70, '¡PAF!', COLOR.MAL);
  }

  alGanar() { this.cartel(this.cx, this.arriba + 180, '¡BIEN VOLADO!', COLOR.ORO, 56); }

  paso(dt, t) {
    // Al principio el pájaro flota: la gravedad arranca con el primer toque
    // (o solo, después de la consigna)
    if (!this.volando && t > 0.95 / this.vel) this.volando = true;
    if (this.volando && this.resultado !== 'gano') {
      this.vy += this.g * dt;
      this.y += this.vy * dt;
      if (this.y < this.arriba - 30) { this.y = this.arriba - 30; this.vy = 0; }
    } else if (!this.volando) {
      this.y = this.cy - 40 + Math.sin(t * 6) * 10;
    }
    if (this.y > this.suelo - 30) { this.y = this.suelo - 30; this.perder(); }
    this.pajaro.setPosition(this.x, this.y).setAngle(Math.max(-30, Math.min(70, this.vy * 0.06)));
    if (this.resultado === 'perdio') return;
    for (const c of this.canos) {
      c.x -= this.rapidez * dt;
      for (const p of c.partes) p.x = c.x;
      if (Math.abs(c.x - this.x) < 45 + 28 && (this.y - 26 < c.arribaAlto || this.y + 26 > c.abajoY)) this.perder();
    }
  }
}
