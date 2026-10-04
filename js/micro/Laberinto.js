// ¡CRUZA EL LABERINTO! — Un camino entre arbustos, con vueltas: hay que
// arrastrar al pingüino desde abajo hasta el pez, arriba, sin salirse del
// camino (si toca el borde, chispazo y perdiste). Se puede levantar el dedo y
// volver a agarrarlo. Más vueltas y un camino más angosto con el nivel.
import { Micro } from '../escenas/Micro.js';
import { COLOR } from '../config.js';

const PASO = 8;                   // px: el camino del dedo se revisa de a estos pasos (que no atraviese paredes)
const ARENA = 0xf3e1b5, BORDE = 0x8a5a2b;

export class Laberinto extends Micro {
  static ORDEN = '¡CRUZA EL LABERINTO!';
  static ICONO = 'pinguino';          // en la galería
  static CONTROL = 'arrastrar';
  static PULSOS = 12;
  // La primera vez: el juego se congela y enseña (ver Director.revisarLeccion)
  static LECCION = {
    titulo: '¡ARRASTRA AL PINGÜINO HASTA EL PEZ!', sub: 'SIN TOCAR LOS BORDES DEL CAMINO',
    gesto: 'arrastrar', lugar: 'medio', listo: () => true,
    objetivo: m => ({ x: m.xP, y: m.yP }),
  };

  armar() {
    this.fondo([0x6fcf6a, 0x2d7a3e], 'lunares');
    this.ancho = [118, 100, 86][this.nivel - 1];
    this.limite = this.ancho / 2 - 8;            // hasta dónde puede ir el centro del pingüino
    // El camino: sube en zigzag. Tramos horizontales a alturas parejas y, entre
    // uno y otro, tramos verticales.
    const tramos = [1, 2, 3][this.nivel - 1];
    const yIni = this.bajo - 80, yFin = this.arriba + 180;
    let x = this.azar(110, this.W - 110);
    this.camino = [{ x, y: yIni }];
    for (let i = 1; i <= tramos; i++) {
      const y = yIni - ((yIni - yFin) * i) / (tramos + 1);
      let x2;
      do { x2 = this.azar(90, this.W - 90); } while (Math.abs(x2 - x) < 170);
      this.camino.push({ x, y }, { x: x2, y });
      x = x2;
    }
    this.camino.push({ x, y: yFin });
    // Arbustos y flores, lejos del camino
    for (let i = 0; i < 40; i++) {
      const px = this.azar(20, this.W - 20), py = this.azar(this.arriba + 110, this.bajo);
      if (this.distancia(px, py) > this.ancho / 2 + 34) this.emoji(i % 3 ? 'planta' : 'flor', px, py, i % 3 ? 54 : 40).setAlpha(0.95);
    }
    // El camino: borde oscuro, borde de madera y arena (con círculos en las
    // esquinas, que los trazos gruesos no las redondean)
    const g = this.add.graphics();
    for (const [extra, color] of [[16, 0x1b1030], [10, BORDE], [0, ARENA]]) {
      const w = this.ancho + extra;
      g.lineStyle(w, color, 1);
      for (let i = 1; i < this.camino.length; i++) {
        const a = this.camino[i - 1], b = this.camino[i];
        g.lineBetween(a.x, a.y, b.x, b.y);
      }
      g.fillStyle(color, 1);
      for (const p of this.camino) g.fillCircle(p.x, p.y, w / 2);
    }
    // Huellitas en el medio del camino (para que se vea por dónde va)
    g.fillStyle(0xd8c08a, 1);
    this.recorrer(26, (px, py) => g.fillCircle(px, py, 4));
    // El pez (la meta) y el pingüino
    const fin = this.camino[this.camino.length - 1];
    this.add.image(fin.x, fin.y, 'atlas', 'brillo').setDisplaySize(170, 170).setTint(0xfff1a8).setAlpha(0.7);
    this.pez = this.emoji('pez', fin.x, fin.y, 70);
    this.xP = this.camino[0].x;
    this.yP = this.camino[0].y;
    this.sombraP = this.sombra(this.xP, this.yP + 26, 50, 0.3);
    this.pinguino = this.emoji('pinguino', this.xP, this.yP, 64).setDepth(3);
    this.agarre = null;           // la distancia del dedo al pingüino al agarrarlo
    this.alTocar((x, y) => {
      if (Math.hypot(x - this.xP, y - this.yP) < 75) { this.agarre = { dx: this.xP - x, dy: this.yP - y }; this.audio.toque(); }
    });
    this.alMover((x, y, p) => { if (p.isDown && this.agarre) this.llevar(x + this.agarre.dx, y + this.agarre.dy); });
    const soltar = () => { this.agarre = null; };
    this.input.on('pointerup', soltar);
    this.input.on('pointerupoutside', soltar);
  }

  // Distancia de un punto al camino (al tramo más cercano)
  distancia(px, py) {
    let d = Infinity;
    for (let i = 1; i < this.camino.length; i++) {
      const a = this.camino[i - 1], b = this.camino[i];
      const lx = b.x - a.x, ly = b.y - a.y, l2 = lx * lx + ly * ly || 1;
      const k = Math.max(0, Math.min(1, ((px - a.x) * lx + (py - a.y) * ly) / l2));
      d = Math.min(d, Math.hypot(px - a.x - lx * k, py - a.y - ly * k));
    }
    return d;
  }

  // Llama a fn cada 'cada' px a lo largo del camino
  recorrer(cada, fn) {
    for (let i = 1; i < this.camino.length; i++) {
      const a = this.camino[i - 1], b = this.camino[i], l = Math.hypot(b.x - a.x, b.y - a.y);
      for (let s = 0; s < l; s += cada) fn(a.x + ((b.x - a.x) * s) / l, a.y + ((b.y - a.y) * s) / l);
    }
  }

  // Lleva al pingüino hacia (x, y) de a pasos cortos: si en el medio toca el borde, perdió
  llevar(x, y) {
    if (this.decidido) return;
    const d = Math.hypot(x - this.xP, y - this.yP), n = Math.max(1, Math.ceil(d / PASO));
    const x0 = this.xP, y0 = this.yP;
    for (let i = 1; i <= n; i++) {
      const px = x0 + ((x - x0) * i) / n, py = y0 + ((y - y0) * i) / n;
      this.xP = px; this.yP = py;
      if (this.distancia(px, py) > this.limite) { this.chocar(); return; }
      if (Math.hypot(px - this.pez.x, py - this.pez.y) < 44) { this.llegar(); return; }
    }
  }

  chocar() {
    this.perder();
    this.audio.zumbido();
    this.chispas(this.xP, this.yP, 12, 0xfff1a8, 0.8);
    this.pinguino.setTint(0x6b6b6b);
    this.cartel(this.cx, this.arriba + 110, '¡CHISPAZO!', COLOR.MAL, 62);
  }

  llegar() {
    this.ganar();
    this.agarre = null;
    this.pinguino.setPosition(this.pez.x - 26, this.pez.y + 4);
    this.tweens.add({ targets: this.pez, scale: 0, duration: 260, delay: 80 });
    this.chispas(this.pez.x, this.pez.y, 12);
    this.cartel(this.cx, this.arriba + 110, '¡QUÉ RICO!', COLOR.ORO, 62);
  }

  paso(dt, t) {
    if (!this.decidido) this.pinguino.setPosition(this.xP, this.yP - (this.agarre ? 6 + Math.abs(Math.sin(t * 16)) * 4 : 0));
    this.pinguino.setAngle(this.agarre && !this.decidido ? Math.sin(t * 16) * 8 : 0);
    this.sombraP.setPosition(this.pinguino.x, this.pinguino.y + 30);
    this.pez.setAngle(Math.sin(t * 5) * 10);
  }
}
