// ¡NO TOQUES NADA! — Un botón rojo gigante que pide que lo toques. No lo toques.
import { Micro } from '../escenas/Micro.js';
import { COLOR } from '../config.js';

export class NoToques extends Micro {
  static ORDEN = '¡NO TOQUES NADA!';
  static CONTROL = 'nada';
  static GANA_AL_FINAL = true;

  armar() {
    this.fondo(0x2ec4b6, 'rayas');
    const by = this.cy + 150;
    this.circulo(this.cx, by + 16, 128, 0x7a1020);                // sombra del botón
    this.boton = this.circulo(this.cx, by, 128, 0xe63946);
    this.brillo = this.circulo(this.cx - 40, by - 50, 34, 0xffffff, 0.35);
    this.letrero = this.texto(this.cx, by, 'TOCAME', 58);
    // Tentaciones, más cuanto más difícil
    this.cebos = [];
    const lugares = [[110, this.arriba + 170], [430, this.arriba + 170], [100, this.bajo - 40], [440, this.bajo - 40]];
    const cuales = ['gato', 'regalo', 'diamante', 'plata'].slice(0, this.nivel + 1);
    cuales.forEach((n, i) => {
      const [x, y] = lugares[i];
      this.cebos.push({ img: this.emoji(n, x, y, 96), x, y, fase: i * 1.7 });
    });
    this.globo = this.texto(110, this.arriba + 95, '¡TOCAME!', 30, COLOR.OSCURO).setTint(0xffffff);
    this.alTocar(() => this.perder());
  }

  alPerder() {
    this.boton.setTint(0x9d0208).setScale(this.boton.scaleX * 0.94);
    this.letrero.setText('¡NOOO!');
    this.emoji('sirena', this.cx, this.arriba + 60, 110);
    this.audio.golpe();
  }

  alGanar() {
    this.cartel(this.cx, this.cy - 60, '¡BIEN AHÍ!', COLOR.ORO, 64);
  }

  paso(dt, t) {
    const k = 1 + Math.sin(t * 9) * 0.04;
    if (!this.decidido) {
      this.boton.setScale(k * (256 / 128));
      this.letrero.setScale(k);
    }
    for (const c of this.cebos) c.img.setPosition(c.x + Math.sin(t * 5 + c.fase) * 10, c.y + Math.cos(t * 4 + c.fase) * 8)
      .setAngle(Math.sin(t * 7 + c.fase) * 12);
    this.globo.setScale(1 + Math.sin(t * 8) * 0.08);
  }
}
