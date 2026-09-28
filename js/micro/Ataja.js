// ¡ATAJÁ! — Penal, pero sos el arquero: tocá el lado adonde va la pelota.
import { Micro } from '../escenas/Micro.js';
import { COLOR } from '../config.js';

export class Ataja extends Micro {
  static ORDEN = '¡ATAJÁ!';
  static CONTROL = 'tocar';

  armar() {
    this.tema('pasto');
    // El arco, visto desde adentro: los palos abajo, el pateador arriba
    this.yArco = this.bajo - 120;
    this.palo0 = 70; this.palo1 = 470;
    this.rect(this.cx, this.yArco + 40, this.W, 6, 0xffffff, 0.6);
    this.rect(this.palo0, this.yArco - 30, 14, 150, 0xffffff);
    this.rect(this.palo1, this.yArco - 30, 14, 150, 0xffffff);
    this.rect(this.cx, this.yArco - 104, this.palo1 - this.palo0 + 14, 14, 0xffffff);
    // Pateador y pelota
    this.yPenal = this.arriba + 200;
    this.pateador = this.emoji('ogro', this.cx, this.yPenal - 80, 110);
    this.pelota = this.emoji('pelota', this.cx, this.yPenal, 60);
    this.sombra(this.cx, this.yPenal + 30, 60, 0.25);
    // Los guantes, en el medio del arco
    this.guantes = this.emoji('guante', this.cx, this.yArco - 20, 110);
    // Cuándo patea, adónde, y cuánto tarda la pelota
    this.tPatada = this.azar(0.95, 1.5) / Math.sqrt(this.vel);
    this.lado = Math.random() < 0.5 ? -1 : 1;
    this.vuelo = [0.95, 0.8, 0.68][this.nivel - 1] / Math.sqrt(this.vel);
    this.amague = this.nivel >= 3 && Math.random() < 0.6;
    this.salto = 0;          // -1 izquierda, 1 derecha
    this.alTocar(x => {
      if (this.salto) return;
      this.salto = x < this.cx ? -1 : 1;
      // Si te tirás antes de la patada, el pateador te la cambia de lado
      if (this.t < this.tPatada) this.lado = -this.salto;
      this.tweens.add({ targets: this.guantes, x: this.cx + this.salto * 150, angle: this.salto * 35, duration: 140, ease: 'Quad.easeOut' });
      this.audio.zas();
    });
  }

  paso(dt, t) {
    // El pateador se prepara (y en el nivel 3 a veces amaga para un lado)
    if (t < this.tPatada) {
      const amago = this.amague && t > this.tPatada - 0.35 ? -this.lado * 18 : 0;
      this.pateador.setPosition(this.cx + amago + Math.sin(t * 10) * 3, this.yPenal - 80);
      return;
    }
    if (this.decidido) return;
    const p = Math.min(1, (t - this.tPatada) / this.vuelo);
    if (!this.pateo) { this.pateo = true; this.audio.patada(); }
    // La pelota viene hacia el arco y se agranda (se acerca)
    const xDest = this.cx + this.lado * 150;
    this.pelota.setPosition(this.cx + (xDest - this.cx) * p, this.yPenal + (this.yArco - 20 - this.yPenal) * p)
      .setDisplaySize(60 + 50 * p, 60 + 50 * p).setAngle(p * 720);
    if (p >= 1) {
      if (this.salto === this.lado) {
        this.ganar();
        this.cartel(this.cx, this.cy - 60, '¡ATAJADA!', COLOR.ORO, 72);
        this.chispas(this.pelota.x, this.pelota.y, 12);
        this.tweens.add({ targets: this.pelota, y: this.pelota.y - 160, x: this.pelota.x - this.lado * 120, duration: 350 });
      } else {
        this.perder();
        this.cartel(this.cx, this.cy - 60, '¡GOL!', COLOR.MAL, 72);
        this.pateador.setTexture('emoji', 'diablo');
      }
    }
  }
}
