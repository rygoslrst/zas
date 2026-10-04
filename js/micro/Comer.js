// ¡DALE DE COMER! — Arrastrá la comida hasta la boca abierta.
import { Micro } from '../escenas/Micro.js';
import { COLOR } from '../config.js';

const COMIDA = ['hamburguesa', 'pizza', 'papas', 'pancho', 'dona', 'helado', 'galleta', 'torta'];

export class Comer extends Micro {
  static ORDEN = '¡DALE DE COMER!';
  static ICONO = 'rico';          // en la galería
  static CONTROL = 'arrastrar';

  armar() {
    this.tema('cocina');
    this.yCara = this.arriba + 160;
    this.cara = this.emoji('boca', this.cx, this.yCara, 180);
    this.amplitud = [0, 120, 150][this.nivel - 1];
    this.faltan = this.nivel >= 3 ? 2 : 1;
    this.origen = { x: this.cx, y: this.bajo - 80 };
    this.piso(this.origen.y + 22, 0xc98a52);
    this.circulo(this.origen.x, this.origen.y + 44, 100, COLOR.OSCURO, 0.2).setScale(1, 0.3);
    this.circulo(this.origen.x, this.origen.y + 38, 100, 0xffffff).setScale(1, 0.3);
    this.circulo(this.origen.x, this.origen.y + 38, 70, 0xe8e4f0).setScale(1, 0.3);
    this.nuevaComida();
    this.agarrada = false;
    this.alTocar((x, y) => {
      if (this.comida && Math.hypot(this.comida.x - x, this.comida.y - y) < 95) {
        this.agarrada = true;
        this.dx = this.comida.x - x;
        this.dy = this.comida.y - y;
        this.tweens.killTweensOf(this.comida);
        this.comida.setDisplaySize(130, 130);
      }
    });
    this.alMover((x, y) => {
      if (this.agarrada) this.comida.setPosition(x + this.dx, y + this.dy);
    });
    this.alSoltar(() => this.soltar());
  }

  nuevaComida() {
    this.comida = this.emoji(this.elegir(COMIDA), this.origen.x, this.origen.y, 116);
    this.comida.setScale(0);
    this.tweens.add({ targets: this.comida, displayWidth: 116, displayHeight: 116, duration: 160, ease: 'Back.easeOut' });
  }

  get boca() { return { x: this.cara.x, y: this.cara.y + 34 }; }

  soltar() {
    if (!this.agarrada) return;
    this.agarrada = false;
    const b = this.boca;
    if (Math.hypot(this.comida.x - b.x, this.comida.y - b.y) < 85) {
      this.comida.destroy();
      this.comida = null;
      this.audio.mordida();
      this.cara.setTexture('emoji', 'rico').setDisplaySize(180, 180);
      this.rebote(this.cara, 1.15);
      this.chispas(b.x, b.y, 8);
      this.faltan--;
      if (this.faltan <= 0) {
        this.ganar();
        this.cartel(this.cx, this.cy, '¡ÑAM!', COLOR.ORO, 72);
      } else {
        this.time.delayedCall(260, () => { this.cara.setTexture('emoji', 'boca').setDisplaySize(180, 180); this.nuevaComida(); });
      }
    } else {
      this.tweens.add({ targets: this.comida, x: this.origen.x, y: this.origen.y, displayWidth: 116, displayHeight: 116, duration: 180 });
    }
  }

  paso(dt, t) {
    this.cara.x = this.cx + Math.sin(t * 2.3 * this.vel) * this.amplitud;
    this.cara.angle = Math.sin(t * 5) * 5;
  }
}
