// ¡DESPEGÁ! — Tocá rápido para cargar el cohete hasta que salga volando.
import { Micro } from '../escenas/Micro.js';
import { COLOR } from '../config.js';

export class Despega extends Micro {
  static ORDEN = '¡DESPEGA!';
  static CONTROL = 'machacar';

  armar() {
    this.tema('noche');
    this.emoji('luna', 110, this.arriba + 110, 110);
    // Igual que ¡INFLÁ!: los toques que se piden salen del tiempo disponible
    this.necesarios = Math.max(6, Math.round([4, 5, 6][this.nivel - 1] * (this.dur - 0.3)));
    this.pierde = this.nivel >= 2 ? 0.8 : 0;
    this.carga = 0;
    this.yBase = this.bajo - 70;
    this.piso(this.bajo - 10, 0x5a5f73);
    this.rect(this.cx, this.bajo - 20, 150, 22, 0x2b2d42);
    this.cohete = this.emoji('cohete', this.cx, this.yBase, 140).setAngle(-45);
    // Medidor de combustible
    this.rect(470, this.cy + 40, 36, 300, COLOR.OSCURO, 0.7);
    this.nafta = this.rect(470, this.cy + 185, 24, 1, COLOR.ORO).setOrigin(0.5, 1);
    this.emoji('fuego', 470, this.cy - 140, 50);
    this.alTocar(() => {
      this.carga++;
      this.audio.inflar(Math.min(12, this.carga));
      this.humo(this.cx + this.azar(-40, 40), this.yBase + 60, 50);
      if (this.carga >= this.necesarios) this.despegar();
    });
  }

  despegar() {
    this.ganar();
    this.audio.acelera();
    this.cartel(this.cx, this.cy - 60, '¡DESPEGUE!', COLOR.ORO, 72);
    this.fuego = this.emoji('fuego', this.cx, this.yBase + 80, 90).setAngle(180);
    this.tweens.add({ targets: [this.cohete, this.fuego], y: `-=${this.H + 200}`, duration: 900, ease: 'Quad.easeIn' });
  }

  paso(dt, t) {
    if (!this.decidido) {
      this.carga = Math.max(0, this.carga - dt * this.pierde);
      const k = this.carga / this.necesarios;
      this.cohete.setPosition(this.cx + Math.sin(t * 60) * 5 * k, this.yBase + Math.sin(t * 47) * 3 * k);
      this.nafta.displayHeight = 290 * Math.min(1, k);
    } else if (this.fuego) {
      this.fuego.setScale(this.fuego.scaleX, this.fuego.scaleX * (1 + Math.sin(t * 40) * 0.2));
      if (Math.random() < 0.5) this.humo(this.cohete.x + this.azar(-20, 20), this.cohete.y + 110, 60);
    }
  }
}
