// ¡APAGA EL FUEGO! — La casa se quema: con el dedo apoyado, la manguera echa
// agua hacia donde está el dedo. Cada fuego se apaga con un ratito de agua
// encima. Más fuegos cuanto más difícil; en el nivel 3, el que no se termina
// de apagar vuelve a crecer.
import { Micro, mezcla } from '../escenas/Micro.js';
import { COLOR } from '../config.js';

const ALCANCE = 78;               // a cuánto del dedo moja el agua

export class Fuego extends Micro {
  static ORDEN = '¡APAGA EL FUEGO!';
  static ICONO = 'fuego';          // en la galería
  static CONTROL = 'arrastrar';

  armar() {
    this.tema('atardecer');
    this.horizonte(this.cy + 150, 'ciudad', 0xe08a6a);
    const yPiso = this.cy + 230;
    this.piso(yPiso, 0x8a8f98);
    // La casa: paredes, techo, puerta y ventanas (los fuegos salen de ahí)
    const g = this.add.graphics();
    const cx = this.cx, ancho = 380, alto = 330, x0 = cx - ancho / 2, yTecho = yPiso - alto;
    g.fillStyle(COLOR.OSCURO, 0.25).fillRect(x0 + 10, yTecho + 12, ancho, alto);
    g.fillStyle(0xf2c48d, 1).fillRect(x0, yTecho, ancho, alto);
    g.fillStyle(mezcla(0xf2c48d, 0x000000, 0.12), 1);
    for (let y = yTecho + 26; y < yPiso; y += 30) g.fillRect(x0, y, ancho, 3);
    g.fillStyle(0xb5423a, 1).fillTriangle(x0 - 30, yTecho + 4, x0 + ancho + 30, yTecho + 4, cx, yTecho - 150);
    g.fillStyle(COLOR.OSCURO, 0.25).fillTriangle(x0 - 30, yTecho + 4, x0 + ancho + 30, yTecho + 4, cx, yTecho + 30);
    g.fillStyle(0x7a4a2a, 1).fillRoundedRect(cx - 36, yPiso - 120, 72, 120, { tl: 30, tr: 30, bl: 0, br: 0 });
    // Lugares de los fuegos: ventanas y techo
    const lugares = this.mezclar([
      [cx - 110, yTecho + 90], [cx + 110, yTecho + 90], [cx - 110, yTecho + 210], [cx + 110, yTecho + 210], [cx, yTecho - 50],
    ]);
    for (const [x, y] of lugares.slice(0, 4)) {
      if (y < yTecho) continue;
      g.fillStyle(COLOR.OSCURO, 1).fillRect(x - 46, y - 40, 92, 80);
      g.fillStyle(0xffd07a, 1).fillRect(x - 40, y - 34, 80, 68);
    }
    const n = [2, 3, 4][this.nivel - 1];
    this.fuegos = lugares.slice(0, n).map(([x, y]) => ({
      x, y, vida: 1, img: this.emoji('fuego', x, y - 6, 96), fase: this.azar(0, 6),
    }));
    // Cuánto tiempo de agua apaga un fuego
    this.apaga = [0.4, 0.38, 0.36][this.nivel - 1] / Math.sqrt(this.vel);
    this.revive = this.nivel >= 3 ? 0.35 : 0;          // por segundo, si no lo mojan
    // La manguera, abajo a la izquierda
    this.boca = { x: 60, y: this.bajo - 40 };
    this.circulo(this.boca.x, this.boca.y + 26, 46, 0xd62839);
    this.circulo(this.boca.x, this.boca.y + 26, 30, 0xa01828);
    this.agua = this.add.graphics().setDepth(5);
    this.dedo = null;
    this.alTocar((x, y) => { this.dedo = { x, y }; this.audio.chorro(true); });
    this.alMover((x, y, p) => { if (p.isDown && this.dedo) this.dedo = { x, y }; });
    const soltar = () => { this.dedo = null; this.audio.chorro(false); };
    this.input.on('pointerup', soltar);
    this.input.on('pointerupoutside', soltar);
  }

  alGanar() { this.audio.chorro(false); this.cartel(this.cx, this.arriba + 120, '¡APAGADO!', COLOR.ORO, 66); }
  alPerder() { this.audio.chorro(false); }

  paso(dt, t) {
    const g = this.agua;
    g.clear();
    if (this.decidido) return;
    const d = this.dedo;
    if (d) {
      // El chorro: una curva de gotas desde la manguera hasta el dedo
      const b = this.boca, mx = (b.x + d.x) / 2, my = Math.min(b.y, d.y) - 80;
      for (let k = 0; k <= 16; k++) {
        const u = k / 16, iu = 1 - u;
        const x = iu * iu * b.x + 2 * iu * u * mx + u * u * d.x, y = iu * iu * b.y + 2 * iu * u * my + u * u * d.y;
        const r = 10 + 6 * u + Math.sin(t * 40 + k) * 2;
        g.fillStyle(0x4dc3ff, 0.85).fillCircle(x, y, r);
        g.fillStyle(0xffffff, 0.5).fillCircle(x - r * 0.3, y - r * 0.3, r * 0.35);
      }
      g.fillStyle(0x9fe3ff, 0.45).fillCircle(d.x, d.y, ALCANCE * 0.6 + Math.sin(t * 30) * 4);
    }
    let quedan = 0;
    for (const f of this.fuegos) {
      if (f.vida <= 0) continue;
      const mojado = d && Math.hypot(d.x - f.x, d.y - f.y) < ALCANCE;
      if (mojado) f.vida -= dt / this.apaga;
      else if (this.revive) f.vida = Math.min(1, f.vida + this.revive * dt);
      if (f.vida <= 0) {
        f.img.setVisible(false);
        this.humo(f.x, f.y - 10, 80);
        this.audio.apagar();
        this.audio.acierto(this.fuegos.filter(o => o.vida <= 0).length);
        continue;
      }
      quedan++;
      const s = 0.45 + 0.55 * f.vida;
      f.img.setDisplaySize(96 * s * (1 + Math.sin(t * 14 + f.fase) * 0.06), 96 * s * (1 + Math.sin(t * 11 + f.fase) * 0.1));
    }
    if (!quedan) this.ganar();
  }
}
