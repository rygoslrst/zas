// ¡PATEÁ! — Penal: deslizá el dedo hacia el arco. Que no la ataje el arquero.
import { Micro } from '../escenas/Micro.js';
import { COLOR } from '../config.js';

export class Patea extends Micro {
  static ORDEN = '¡PATEÁ!';
  static CONTROL = 'deslizar';

  armar() {
    this.tema('pasto');
    // El arco
    this.palo0 = 105; this.palo1 = 435;
    this.yLinea = this.arriba + 250;
    const yTravesano = this.yLinea - 150;
    this.rect(this.cx, this.yLinea - 75, this.palo1 - this.palo0, 150, 0xffffff, 0.22);
    this.add.tileSprite(this.palo0, yTravesano, this.palo1 - this.palo0, 150, 'atlas', 'lunares').setOrigin(0).setAlpha(0.35);
    this.rect(this.palo0, this.yLinea - 75, 12, 162, 0xffffff);
    this.rect(this.palo1, this.yLinea - 75, 12, 162, 0xffffff);
    this.rect(this.cx, yTravesano, this.palo1 - this.palo0 + 12, 12, 0xffffff);
    this.rect(this.cx, this.yLinea + 4, this.W, 5, 0xffffff, 0.6);
    // El arquero (los guantes)
    this.arquero = this.emoji('guante', this.cx, this.yLinea - 60, 100);
    // El arquero va y viene; mientras la pelota vuela recorre ~100 px como
    // mucho: pateando hacia el lado del que se aleja, siempre entra.
    this.velArquero = [150, 220, 280][this.nivel - 1] * this.vel;
    this.dirArquero = Math.random() < 0.5 ? -1 : 1;
    // La pelota
    this.pelota = this.emoji('pelota', this.cx, this.bajo - 90, 86);
    this.pateada = false;
    this.desde = null;
    this.alTocar((x, y) => { this.desde = { x, y }; });
    const patear = (x, y) => {
      if (!this.desde || this.pateada) return;
      const dx = x - this.desde.x, dy = y - this.desde.y;
      if (dy < -45) this.patear(dx, dy);
    };
    this.alMover(patear);
    this.alSoltar((x, y) => { patear(x, y); this.desde = null; });
  }

  patear(dx, dy) {
    this.pateada = true;
    // Adónde llega sobre la línea del arco, siguiendo la dirección del gesto
    const xDestino = this.pelota.x + (dx / -dy) * (this.pelota.y - (this.yLinea - 60));
    this.xDestino = xDestino;
    this.audio.patada();
    this.tweens.add({
      targets: this.pelota, x: xDestino, y: this.yLinea - 60, displayWidth: 56, displayHeight: 56, angle: 540,
      duration: 330 / this.vel, ease: 'Quad.easeOut', onComplete: () => this.llega(),
    });
  }

  llega() {
    const x = this.xDestino;
    if (x < this.palo0 + 10 || x > this.palo1 - 10) {
      this.perder();
      this.cartel(this.cx, this.cy, '¡AFUERA!', COLOR.MAL, 72);
    } else if (Math.abs(x - this.arquero.x) < 62) {
      this.perder();
      this.cartel(this.cx, this.cy, '¡ATAJADA!', COLOR.MAL, 72);
      this.tweens.add({ targets: this.pelota, y: this.pelota.y + 120, x: this.pelota.x + this.azar(-80, 80), duration: 300 });
    } else {
      this.ganar();
      this.audio.silbato();
      this.cartel(this.cx, this.cy, '¡GOOOL!', COLOR.ORO, 88);
      this.chispas(x, this.yLinea - 60, 14);
    }
  }

  paso(dt) {
    if (this.decidido && !this.pateada) return;
    const a = this.arquero;
    // En el nivel 3 cambia de lado de golpe cada tanto (antes de patear)
    if (this.nivel >= 3 && !this.pateada && Math.random() < dt * 1.2) this.dirArquero *= -1;
    a.x += this.dirArquero * this.velArquero * dt;
    if (a.x < this.palo0 + 55) { a.x = this.palo0 + 55; this.dirArquero = 1; }
    if (a.x > this.palo1 - 55) { a.x = this.palo1 - 55; this.dirArquero = -1; }
  }
}
