// ¡TOCÁ EL AZUL! — Círculos de colores con nombres de colores escritos. Hay que
// tocar el del COLOR pedido, no el que dice la palabra (desde el nivel 2, la
// palabra miente).
import { Micro } from '../escenas/Micro.js';
import { COLOR } from '../config.js';

const COLORES = { ROJO: 0xff3b3b, AZUL: 0x2f6fff, AMARILLO: 0xffd23f, BLANCO: 0xf5f5f5 };

export class Colores extends Micro {
  static ORDEN = '¡TOCA EL AZUL!';
  static ICONO = 'arcoiris';          // en la galería
  static CONTROL = 'tocar';
  static VARIANTES = Object.keys(COLORES).map(c => ({ orden: `¡TOCA EL ${c}!`, color: c }));

  armar() {
    this.fondo(0x2b2d42, 'lunares');
    const pedido = this.variante ? this.variante.color : 'AZUL';
    const nombres = Object.keys(COLORES);
    const n = [3, 4, 4][this.nivel - 1];
    const colores = this.mezclar([pedido, ...this.mezclar(nombres.filter(c => c !== pedido)).slice(0, n - 1)]);
    // Las palabras: iguales al color (nivel 1) o mezcladas a propósito
    let palabras = [...colores];
    if (this.nivel >= 2) {
      do { palabras = this.mezclar(nombres).slice(0, n); } while (palabras.some((p, i) => p === colores[i]));
    }
    const lugares = n === 3
      ? [[this.cx - 150, this.cy + 110], [this.cx + 150, this.cy + 110], [this.cx, this.cy + 290]]
      : [[this.cx - 125, this.cy + 60], [this.cx + 125, this.cy + 60], [this.cx - 125, this.cy + 260], [this.cx + 125, this.cy + 260]];
    this.pedido = pedido;
    this.circulos = colores.map((c, i) => {
      const [x, y] = lugares[i];
      const sombra = this.circulo(x, y + 8, 88, COLOR.OSCURO, 0.4);
      const base = this.circulo(x, y, 88, COLORES[c]);
      const aro = this.add.image(x, y, 'atlas', 'anillo').setDisplaySize(184, 184).setTint(COLOR.OSCURO);
      const txt = this.texto(x, y, palabras[i], 46);
      txt.setScale(Math.min(1, 150 / txt.width));
      return { x, y, c, base, aro, txt, sombra, fase: Math.random() * 6 };
    });
    this.alTocar((x, y) => {
      const o = this.circulos.find(k => Math.hypot(k.x - x, k.y - y) < 92);
      if (!o) return;
      if (o.c === this.pedido) {
        this.ganar();
        this.chispas(o.x, o.y, 12);
        this.rebote(o.base, 1.2);
      } else {
        this.perder();
        o.aro.setTint(COLOR.MAL);
        const bueno = this.circulos.find(k => k.c === this.pedido);
        this.tweens.add({ targets: [bueno.base, bueno.aro], scale: '*=1.15', duration: 120, yoyo: true, repeat: 2 });
      }
    });
  }

  paso(dt, t) {
    // En el nivel 3 los círculos se mueven un poco (cuesta más leer el color)
    if (this.nivel < 3 || this.decidido) return;
    for (const o of this.circulos) {
      const dx = Math.sin(t * 2.2 + o.fase) * 18, dy = Math.cos(t * 1.7 + o.fase) * 14;
      for (const p of [o.base, o.aro, o.txt]) p.setPosition(o.x + dx, o.y + dy);
      o.sombra.setPosition(o.x + dx, o.y + dy + 8);
    }
  }
}
