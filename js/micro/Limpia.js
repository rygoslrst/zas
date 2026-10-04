// ¡LIMPIÁ! — Está lleno de barro: frotá con la esponja hasta que quede limpio.
import { Micro } from '../escenas/Micro.js';
import { COLOR } from '../config.js';

const FROTE = 130;           // px de frotar que hacen falta para sacar una mancha

export class Limpia extends Micro {
  static ORDEN = '¡LIMPIA!';
  static ICONO = 'esponja';          // en la galería
  static CONTROL = 'arrastrar';

  armar() {
    this.fondo([0xdff6ff, 0x5aa9e6], 'cuadros');
    this.burbujas(14);
    const cosa = this.elegir(['perro', 'gato', 'auto', 'cerdo', 'panda', 'vaca']);
    this.cosa = this.emoji(cosa, this.cx, this.cy + 20, 320);
    const n = [4, 6, 8][this.nivel - 1];
    this.manchas = [];
    for (let i = 0; i < n; i++) {
      const a = this.azar(0, Math.PI * 2), r = this.azar(10, 115);
      const x = this.cx + Math.cos(a) * r, y = this.cy + 20 + Math.sin(a) * r;
      const img = this.circulo(x, y, this.azar(32, 44), 0x6b4226, 0.92).setAngle(this.azar(0, 90)).setScale(this.azar(0.55, 0.75), this.azar(0.45, 0.6));
      this.manchas.push({ x, y, img, vida: 1 });
    }
    this.esponja = this.emoji('esponja', this.cx + 170, this.bajo - 60, 96).setDepth(20);
    this.apretado = false;
    this.ultimo = null;
    this.alTocar((x, y) => { this.apretado = true; this.ultimo = { x, y }; this.esponja.setPosition(x, y); });
    this.input.on('pointerup', () => { this.apretado = false; });
    this.alMover((x, y) => {
      this.esponja.setPosition(x, y);
      if (!this.apretado) return;
      const d = Math.hypot(x - this.ultimo.x, y - this.ultimo.y);
      this.ultimo = { x, y };
      this.frotar(x, y, d);
    });
  }

  frotar(x, y, d) {
    let limpio = false;
    for (const m of this.manchas) {
      if (m.vida <= 0 || Math.hypot(m.x - x, m.y - y) > 62) continue;
      m.vida -= d / FROTE;
      m.img.setAlpha(Math.max(0, m.vida) * 0.92);
      if (m.vida <= 0) {
        m.img.destroy();
        this.chispas(m.x, m.y, 5, 0xffffff);
        this.audio.acierto(this.manchas.filter(o => o.vida <= 0).length - 1);
        limpio = true;
      }
    }
    if (Math.random() < 0.25) this.audio.zas();
    if (limpio && this.manchas.every(o => o.vida <= 0)) {
      this.ganar();
      this.chispas(this.cx, this.cy + 20, 14, COLOR.ORO, 1.8);
      this.cartel(this.cx, this.arriba + 130, '¡RELUCIENTE!', COLOR.ORO, 60);
    }
  }

  paso(dt, t) { this.esponja.angle = Math.sin(t * 20) * (this.apretado ? 10 : 0); }
}
