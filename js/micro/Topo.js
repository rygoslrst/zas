// ¡PEGALE! — Asoman hámsters por los pozos: tocalos antes de que se escondan.
import { Micro } from '../escenas/Micro.js';
import { COLOR } from '../config.js';

const TIERRA = 0x9a6532, TIERRA_CLARA = 0xb57b40, TIERRA_OSCURA = 0x6b4220, POZO = 0x2b1a0e;

export class Topo extends Micro {
  static ORDEN = '¡PEGALE!';
  static CONTROL = 'tocar';

  armar() {
    this.tema('pasto');
    this.necesarios = [3, 4, 5][this.nivel - 1];
    this.golpes = 0;
    this.ventana = [0.95, 0.75, 0.6][this.nivel - 1] / Math.sqrt(this.vel);
    this.juntos = this.nivel >= 3 ? 2 : 1;
    this.hoyos = [];
    for (let i = 0; i < 9; i++) {
      const x = this.cx + ((i % 3) - 1) * 160, y = this.cy + 60 + (Math.floor(i / 3) - 1) * 175;
      // Montículo de tierra (atrás), el pozo, el hámster y el borde de adelante,
      // que tapa la parte de abajo del hámster: así sale DE ADENTRO del pozo.
      this.add.image(x, y + 14, 'atlas', 'circulo').setDisplaySize(158, 70).setTint(TIERRA);
      this.add.image(x, y + 8, 'atlas', 'circulo').setDisplaySize(150, 44).setTint(TIERRA_CLARA);
      this.add.image(x, y + 16, 'atlas', 'circulo').setDisplaySize(118, 38).setTint(POZO);
      const img = this.emoji('hamster', x, y + 22, 100).setOrigin(0.5, 1).setScale(0).setVisible(false);
      this.add.image(x, y + 16, 'atlas', 'circulo').setDisplaySize(158, 70).setTint(TIERRA_OSCURA)
        .setCrop(0, 64, 128, 64);
      this.add.image(x, y + 14, 'atlas', 'circulo').setDisplaySize(150, 60).setTint(TIERRA).setCrop(0, 64, 128, 64);
      this.hoyos.push({ x, y, img, hasta: 0, fuera: false });
    }
    // escala del hámster a su tamaño normal (se usa al asomar)
    const muestra = this.emoji('hamster', -200, -200, 100);
    this.escalaHamster = muestra.scaleX;
    muestra.destroy();
    this.cuenta = this.texto(this.cx, this.arriba + 60, String(this.necesarios), 64);
    this.proximo = 0.45 / this.vel;
    this.martillo = this.emoji('martillo', 0, 0, 90).setVisible(false).setDepth(30);
    this.alTocar((x, y) => this.golpear(x, y));
  }

  golpear(x, y) {
    this.martillo.setVisible(true).setPosition(x + 30, y - 30).setAngle(-40);
    this.tweens.killTweensOf(this.martillo);
    this.tweens.add({ targets: this.martillo, angle: 10, duration: 70, yoyo: true, onComplete: () => this.martillo.setVisible(false) });
    const h = this.hoyos.find(o => o.fuera && Math.hypot(o.x - x, o.y - 30 - y) < 75);
    if (!h) { this.audio.zas(); return; }
    h.fuera = false;
    this.tweens.killTweensOf(h.img);
    h.img.setTint(0xbbbbbb);
    this.tweens.add({ targets: h.img, scaleY: 0, scaleX: this.escalaHamster * 1.25, duration: 160, onComplete: () => h.img.setVisible(false) });
    this.audio.plaf();
    this.chispas(h.x, h.y - 40, 6, COLOR.ORO);
    this.golpes++;
    this.cuenta.setText(String(Math.max(0, this.necesarios - this.golpes)));
    this.rebote(this.cuenta, 1.3);
    if (this.golpes >= this.necesarios) this.ganar();
  }

  esconder(h) {
    h.fuera = false;
    this.tweens.killTweensOf(h.img);
    this.tweens.add({ targets: h.img, scaleY: 0, duration: 110, onComplete: () => h.img.setVisible(false) });
  }

  paso(dt, t) {
    for (const h of this.hoyos) if (h.fuera && t > h.hasta) this.esconder(h);
    if (this.decidido || t < this.proximo) return;
    // Asoman en pozos distintos a los que ya están afuera
    const libres = this.mezclar(this.hoyos.filter(o => !o.fuera && !o.img.visible));
    for (let k = 0; k < this.juntos && k < libres.length; k++) {
      const h = libres[k];
      h.fuera = true;
      h.hasta = t + this.ventana;
      h.img.setVisible(true).clearTint().setScale(this.escalaHamster, 0);
      this.tweens.add({ targets: h.img, scaleY: this.escalaHamster, duration: 110, ease: 'Back.easeOut' });
    }
    this.proximo = t + this.ventana + 0.12 / this.vel;
  }
}

