// ¡SIN CHOCAR! — Llevá la abeja por el camino hasta la flor, arrastrándola,
// sin tocar los bordes (están electrificados).
import { Micro } from '../escenas/Micro.js';
import { COLOR } from '../config.js';

const RADIO = 20;            // lo que ocupa la abeja para chocar

export class SinChocar extends Micro {
  static ORDEN = '¡SIN CHOCAR!';
  static CONTROL = 'arrastrar';

  armar() {
    this.tema('noche');
    this.ancho = [96, 80, 66][this.nivel - 1];
    // Un camino en zigzag de abajo hacia arriba; menos tramos si hay poco tiempo
    const tramos = Math.min([3, 4, 5][this.nivel - 1], 2 + Math.floor(this.dur / 1.1));
    const y0 = this.bajo - 70, y1 = this.arriba + 150;
    this.camino = [{ x: this.cx, y: y0 }];
    for (let i = 1; i <= tramos; i++) {
      const x = i === tramos ? this.cx : (i % 2 ? this.azar(80, 200) : this.azar(340, 460));
      this.camino.push({ x, y: y0 + ((y1 - y0) * i) / tramos });
    }
    // El dibujo: borde brillante, pasillo oscuro y línea central punteada
    const g = this.add.graphics();
    const trazar = (grosor, color, alfa) => {
      g.lineStyle(grosor, color, alfa);
      g.beginPath();
      g.moveTo(this.camino[0].x, this.camino[0].y);
      for (const p of this.camino) g.lineTo(p.x, p.y);
      g.strokePath();
      for (const p of this.camino) g.fillStyle(color, alfa).fillCircle(p.x, p.y, grosor / 2);
    };
    trazar(this.ancho + 22, 0x7b61ff, 0.35);
    trazar(this.ancho + 10, 0xb9a8ff, 1);
    trazar(this.ancho, 0x221a44, 1);
    const fin = this.camino[this.camino.length - 1];
    this.meta = this.emoji('flor', fin.x, fin.y, 80);
    this.abeja = this.emoji('abeja', this.camino[0].x, this.camino[0].y, 56);
    this.aro = this.add.image(this.abeja.x, this.abeja.y, 'atlas', 'anillo').setDisplaySize(80, 80).setTint(COLOR.ORO);
    this.agarrada = false;
    this.alTocar((x, y) => {
      if (Math.hypot(x - this.abeja.x, y - this.abeja.y) < 70) { this.agarrada = true; this.aro.setVisible(false); }
    });
    this.alMover((x, y, p) => { if (this.agarrada && (p.isDown || !p.wasTouch)) this.mover(x, y); });
    this.input.on('pointerup', () => { this.agarrada = false; });
  }

  // Distancia de un punto al camino (a la línea central)
  distancia(x, y) {
    let d = 1e9;
    for (let i = 1; i < this.camino.length; i++) {
      const a = this.camino[i - 1], b = this.camino[i];
      const dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy;
      const k = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / l2));
      d = Math.min(d, Math.hypot(a.x + k * dx - x, a.y + k * dy - y));
    }
    return d;
  }

  mover(x, y) {
    // Se revisa todo el tramo recorrido, no sólo el punto final: un
    // movimiento rápido no puede "saltar" la pared
    const x0 = this.abeja.x, y0 = this.abeja.y;
    const pasos = Math.max(1, Math.ceil(Math.hypot(x - x0, y - y0) / 8));
    for (let i = 1; i <= pasos; i++) {
      const px = x0 + ((x - x0) * i) / pasos, py = y0 + ((y - y0) * i) / pasos;
      if (this.distancia(px, py) > this.ancho / 2 - RADIO) { this.chocar(px, py); return; }
      this.abeja.setPosition(px, py);
    }
    this.abeja.setFlipX(x > x0);
    if (Math.hypot(this.abeja.x - this.meta.x, this.abeja.y - this.meta.y) < 34) {
      this.ganar();
      this.rebote(this.meta, 1.3);
      this.chispas(this.meta.x, this.meta.y, 12);
      this.cartel(this.cx, this.meta.y - 90, '¡LLEGÓ!', COLOR.ORO, 60);
    }
  }

  chocar(x, y) {
    this.abeja.setPosition(x, y).setTint(0x999999);
    this.agarrada = false;
    this.perder();
    this.audio.golpe();
    this.chispas(x, y, 10, 0xb9a8ff, 0.8);
    this.cartel(x, y - 70, '¡ZZZT!', COLOR.MAL);
  }

  paso(dt, t) {
    if (!this.agarrada && !this.decidido) this.aro.setScale(this.aro.scaleX, this.aro.scaleX).setAlpha(0.5 + Math.sin(t * 8) * 0.4);
    this.meta.setAngle(Math.sin(t * 3) * 8);
  }
}
