// ¡CORTÁ EL ROJO! — Una bomba con cables: deslizá el dedo por el del color pedido.
import { Micro } from '../escenas/Micro.js';
import { COLOR } from '../config.js';

const COLORES = { rojo: 0xff3b3b, azul: 0x3b82f6, amarillo: 0xffd23f, blanco: 0xf2f2f2 };

// Cruce de dos segmentos (p1-p2 con p3-p4)
function cruzan(x1, y1, x2, y2, x3, y3, x4, y4) {
  const d = (x2 - x1) * (y4 - y3) - (y2 - y1) * (x4 - x3);
  if (d === 0) return false;
  const u = ((x3 - x1) * (y4 - y3) - (y3 - y1) * (x4 - x3)) / d;
  const v = ((x3 - x1) * (y2 - y1) - (y3 - y1) * (x2 - x1)) / d;
  return u >= 0 && u <= 1 && v >= 0 && v <= 1;
}

export class Cable extends Micro {
  static ORDEN = '¡CORTA EL CABLE!';
  static CONTROL = 'deslizar';
  static VARIANTES = [
    { orden: '¡CORTA EL ROJO!', color: 'rojo' }, { orden: '¡CORTA EL AZUL!', color: 'azul' },
    { orden: '¡CORTA EL AMARILLO!', color: 'amarillo' }, { orden: '¡CORTA EL BLANCO!', color: 'blanco' },
  ];

  armar() {
    this.tema('oscuro');
    const objetivo = this.variante ? this.variante.color : 'rojo';
    this.objetivo = objetivo;
    this.bomba = this.emoji('bomba', this.cx, this.arriba + 120, 170);
    this.reloj = this.texto(this.cx, this.arriba + 235, '', 44, 0xff4d4d);
    this.rect(this.cx, this.bajo - 40, 400, 64, 0x555b6e);
    this.rect(this.cx, this.bajo - 40, 380, 44, 0x3a3f50);
    // Cables: el pedido siempre está; desde el nivel 2 se cruzan
    const n = [3, 4, 4][this.nivel - 1];
    const otros = this.mezclar(Object.keys(COLORES).filter(c => c !== objetivo)).slice(0, n - 1);
    const colores = this.mezclar([objetivo, ...otros]);
    const abajo = this.nivel >= 2 ? this.mezclar(colores.map((_, i) => i)) : colores.map((_, i) => i);
    const yT = this.arriba + 270, yB = this.bajo - 70;
    this.cables = colores.map((c, i) => {
      const xT = this.cx + (i - (n - 1) / 2) * 62, xB = this.cx + (abajo[i] - (n - 1) / 2) * 92;
      const puntos = [];
      for (let k = 0; k <= 12; k++) {
        const s = k / 12, suave = s * s * (3 - 2 * s);
        puntos.push({ x: xT + (xB - xT) * suave + Math.sin(s * Math.PI * 2 + i) * 18 * (this.nivel >= 3 ? 1 : 0), y: yT + (yB - yT) * s });
      }
      return { color: c, puntos, cortado: -1 };
    });
    this.dibujo = this.add.graphics();
    this.dibujar();
    // El dedo
    this.rastro = [];
    this.trazo = this.add.graphics().setDepth(40);
    this.abajoDedo = false;
    this.alTocar((x, y) => { this.abajoDedo = true; this.rastro = [{ x, y, t: this.t }]; });
    this.input.on('pointerup', () => { this.abajoDedo = false; });
    this.alMover((x, y) => {
      if (!this.abajoDedo) return;
      const u = this.rastro[this.rastro.length - 1];
      this.rastro.push({ x, y, t: this.t });
      if (u) this.cortarEntre(u.x, u.y, x, y);
    });
  }

  cortarEntre(x0, y0, x1, y1) {
    for (const c of this.cables) {
      for (let k = 1; k < c.puntos.length; k++) {
        const a = c.puntos[k - 1], b = c.puntos[k];
        if (cruzan(x0, y0, x1, y1, a.x, a.y, b.x, b.y)) { this.cortar(c, k); return; }
      }
    }
  }

  cortar(c, k) {
    c.cortado = k;
    this.dibujar();
    this.audio.corte();
    const p = c.puntos[k];
    this.chispas(p.x, p.y, 8, 0xfff1a8);
    if (c.color === this.objetivo) {
      this.ganar();
      this.bomba.setTint(0x8f8f8f);
      this.cartel(this.cx, this.cy, '¡DESACTIVADA!', COLOR.BIEN, 60);
    } else {
      this.perder();
      this.audio.explosion();
      this.bomba.setTexture('emoji', 'explosion').setDisplaySize(260, 260);
    }
  }

  dibujar() {
    const g = this.dibujo;
    g.clear();
    for (const c of this.cables) {
      const tramos = c.cortado < 0 ? [c.puntos] : [c.puntos.slice(0, c.cortado), c.puntos.slice(c.cortado)];
      for (const tramo of tramos) {
        for (const [ancho, color] of [[24, 0x111111], [16, COLORES[c.color]]]) {
          g.lineStyle(ancho, color, 1);
          g.beginPath();
          g.moveTo(tramo[0].x, tramo[0].y);
          for (const p of tramo) g.lineTo(p.x, p.y);
          g.strokePath();
        }
      }
    }
  }

  paso(dt, t) {
    if (!this.decidido) this.reloj.setText(`0:0${Math.max(0, Math.ceil(this.resta))}`);
    while (this.rastro.length && t - this.rastro[0].t > 0.12) this.rastro.shift();
    const g = this.trazo;
    g.clear();
    for (let i = 1; i < this.rastro.length; i++) {
      const a = this.rastro[i - 1], b = this.rastro[i];
      g.lineStyle(4 + (i / this.rastro.length) * 8, 0xffffff, 0.8);
      g.lineBetween(a.x, a.y, b.x, b.y);
    }
  }
}
