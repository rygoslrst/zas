// ¡PONLO EN SU LUGAR! — Arrastra la figura hasta su sombra. Soltarla en una
// sombra que no es, pierde. Más sombras cuanto más difícil; en el nivel 3,
// además, las sombras se mueven un poco.
import { Micro } from '../escenas/Micro.js';
import { COLOR } from '../config.js';

// Figuras con silueta fácil de reconocer
const FORMAS = ['banana', 'uva', 'cereza', 'anana', 'zanahoria', 'hongo', 'helado', 'pizza', 'pancho', 'gato',
  'pato', 'pez', 'tortuga', 'conejo', 'dinosaurio', 'cohete', 'auto', 'bici', 'paraguas', 'llave', 'martillo',
  'tijera', 'guante', 'corazon', 'estrella', 'rayo', 'luna', 'nube', 'gota', 'campana', 'trofeo', 'pulpo'];
const CERCA = 80;                 // a cuánto del centro de una sombra cuenta como "soltada ahí"

export class Encaja extends Micro {
  static ORDEN = '¡PONLO EN SU LUGAR!';
  static ICONO = 'iman';          // en la galería
  static CONTROL = 'arrastrar';

  armar() {
    this.tema('madera');
    const n = [2, 3, 4][this.nivel - 1];
    const cosas = this.mezclar(FORMAS).slice(0, n);
    this.buscada = this.elegir(cosas);
    // Un paño verde donde están las sombras
    const yP = this.cy - 120, alto = n <= 3 ? 220 : 380;
    const g = this.add.graphics();
    g.fillStyle(COLOR.OSCURO, 0.3).fillRoundedRect(this.cx - 236, yP - alto / 2 + 10, 480, alto, 26);
    g.fillStyle(0x2e8b57, 1).fillRoundedRect(this.cx - 240, yP - alto / 2, 480, alto, 26);
    g.lineStyle(6, 0xe8c77e, 1).strokeRoundedRect(this.cx - 240, yP - alto / 2, 480, alto, 26);
    const lugares = n <= 3
      ? cosas.map((_, i) => [this.cx + (i - (n - 1) / 2) * 150, yP])
      : [[this.cx - 110, yP - 90], [this.cx + 110, yP - 90], [this.cx - 110, yP + 90], [this.cx + 110, yP + 90]];
    this.huecos = cosas.map((nombre, i) => {
      const [x, y] = lugares[i];
      const img = this.emoji(nombre, x, y, 124).setTintFill(0x14301f).setAlpha(0.75);
      return { nombre, x, y, x0: x, y0: y, img, fase: this.azar(0, 6) };
    });
    // La pieza, abajo
    this.origen = { x: this.cx, y: this.bajo - 90 };
    this.sombra(this.origen.x, this.origen.y + 70, 110, 0.3);
    this.pieza = this.emoji(this.buscada, this.origen.x, this.origen.y, 124).setDepth(5);
    this.tweens.add({ targets: this.pieza, scale: this.pieza.scaleX * 1.08, duration: 420, yoyo: true, repeat: -1 });
    this.agarrada = false;
    this.alTocar((x, y) => {
      if (Math.hypot(this.pieza.x - x, this.pieza.y - y) > 95) return;
      this.agarrada = true;
      this.dx = this.pieza.x - x;
      this.dy = this.pieza.y - y;
      this.tweens.killTweensOf(this.pieza);
      this.pieza.setDisplaySize(136, 136);
    });
    this.alMover((x, y) => { if (this.agarrada) this.pieza.setPosition(x + this.dx, y + this.dy); });
    this.alSoltar(() => this.soltar());
  }

  soltar() {
    if (!this.agarrada) return;
    this.agarrada = false;
    const h = this.huecos.find(o => Math.hypot(o.x - this.pieza.x, o.y - this.pieza.y) < CERCA);
    if (h && h.nombre === this.buscada) {
      this.ganar();
      this.pieza.setPosition(h.x, h.y).setDisplaySize(124, 124);
      this.rebote(this.pieza, 1.25);
      this.chispas(h.x, h.y, 12);
      this.audio.acierto(3);
      this.cartel(this.cx, this.origen.y - 40, '¡ENCAJA!', COLOR.ORO, 60);
    } else if (h) {
      this.perder();
      this.pieza.setPosition(h.x, h.y + 20);
      this.cartel(h.x, h.y - 90, '¡NO ES!', COLOR.MAL, 52);
    } else {
      this.tweens.add({ targets: this.pieza, x: this.origen.x, y: this.origen.y, displayWidth: 124, displayHeight: 124, duration: 180, ease: 'Quad.easeOut' });
    }
  }

  paso(dt, t) {
    if (this.nivel < 3 || this.decidido) return;
    for (const h of this.huecos) {
      h.x = h.x0 + Math.sin(t * 1.6 + h.fase) * 22;
      h.y = h.y0 + Math.cos(t * 1.3 + h.fase) * 12;
      h.img.setPosition(h.x, h.y);
    }
  }
}
