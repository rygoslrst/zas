// ¡UNE LAS PAREJAS! — Animales a la izquierda y comidas a la derecha (en
// desorden): hay que arrastrar una línea de cada animal a su comida. Una línea
// a la comida que no es, perdiste. 2, 3 o 4 parejas según el nivel.
import { Micro } from '../escenas/Micro.js';
import { COLOR } from '../config.js';

const PAREJAS = [['mono', 'banana'], ['conejo', 'zanahoria'], ['abeja', 'flor'], ['pinguino', 'pez'], ['sapo', 'mosca']];
const COLORES = [0xff4d5a, 0x3d8bff, 0x2ec4b6, 0xffb703];

export class Une extends Micro {
  static ORDEN = '¡UNE LAS PAREJAS!';
  static ICONO = 'sapo';          // en la galería
  static CONTROL = 'arrastrar';
  static PULSOS = 10;
  // La primera vez: el juego se congela y enseña (ver Director.revisarLeccion)
  static LECCION = {
    titulo: '¡ARRASTRA CADA ANIMAL A SU COMIDA!', sub: 'SE DIBUJA UNA LÍNEA. SI NO ES SU COMIDA, PIERDES',
    gesto: 'arrastrar', lugar: 'arriba', listo: () => true,
    objetivo: m => ({ x: m.izq[0].x, y: m.izq[0].y }),
  };

  armar() {
    this.fondo([0xc8f1a6, 0x6fbf73], 'lunares');
    const n = [2, 3, 4][this.nivel - 1];
    const parejas = this.mezclar(PAREJAS).slice(0, n);
    // Dos columnas de fichas redondas; las comidas, en otro orden
    // (entre arriba y la mecha: en pantallas bajas, más juntas)
    const yMin = this.arriba + 150, yMax = this.bajo - 80;
    const sep = Math.min(170, (yMax - yMin) / Math.max(1, n - 1)), y0 = (yMin + yMax) / 2 - ((n - 1) * sep) / 2;
    const r = Math.min(66, sep * 0.42);
    const ficha = (x, y, nombre) => {
      this.circulo(x + 5, y + 8, r, COLOR.OSCURO, 0.25).setDepth(2);
      const base = this.circulo(x, y, r, 0xffffff).setDepth(2);
      const img = this.emoji(nombre, x, y, r * 1.4).setDepth(2);
      return { x, y, nombre, base, img, unida: false };
    };
    this.izq = parejas.map(([animal], i) => ({ ...ficha(110, y0 + i * sep, animal), pareja: parejas[i][1] }));
    const comidas = this.mezclar(parejas.map(p => p[1]));
    this.der = comidas.map((comida, i) => ficha(this.W - 110, y0 + i * sep, comida));
    // Las líneas hechas van por debajo de las fichas; la que se está tirando, por encima
    this.lineas = this.add.graphics().setDepth(1);
    this.trazo = this.add.graphics().setDepth(3);
    this.hechas = 0;
    this.desde = null;            // la ficha de la que sale la línea
    this.alTocar((x, y) => {
      const f = [...this.izq, ...this.der].find(o => !o.unida && Math.hypot(o.x - x, o.y - y) < 72);
      if (f) { this.desde = f; this.punta = { x, y }; this.audio.toque(); }
    });
    this.alMover((x, y, p) => { if (p.isDown && this.desde) this.punta = { x, y }; });
    this.alSoltar((x, y) => this.soltar(x, y));
  }

  soltar(x, y) {
    const a = this.desde;
    this.desde = null;
    this.trazo.clear();
    if (!a || this.decidido) return;
    // ¿Dónde terminó? En una ficha del otro lado
    const otroLado = this.izq.includes(a) ? this.der : this.izq;
    const b = otroLado.find(o => !o.unida && Math.hypot(o.x - x, o.y - y) < 80);
    if (!b) return;
    const animal = this.izq.includes(a) ? a : b, comida = animal === a ? b : a;
    if (animal.pareja !== comida.nombre) {
      this.perder();
      this.lineas.lineStyle(10, COLOR.MAL, 1).lineBetween(a.x, a.y, b.x, b.y);
      comida.base.setTint(COLOR.MAL);
      this.cartel(this.cx, this.arriba + 110, '¡ESA NO ES!', COLOR.MAL, 58);
      return;
    }
    const color = COLORES[this.hechas % COLORES.length];
    this.lineas.lineStyle(14, COLOR.OSCURO, 0.5).lineBetween(a.x, a.y + 4, b.x, b.y + 4);
    this.lineas.lineStyle(10, color, 1).lineBetween(a.x, a.y, b.x, b.y);
    animal.unida = comida.unida = true;
    animal.base.setTint(color); comida.base.setTint(color);
    this.rebote(animal.img, 1.2); this.rebote(comida.img, 1.2);
    this.audio.acierto(this.hechas);
    this.hechas++;
    if (this.hechas >= this.izq.length) {
      this.ganar();
      this.chispas(this.cx, this.cy, 14);
      this.cartel(this.cx, this.arriba + 110, '¡TODOS FELICES!', COLOR.ORO, 56);
    }
  }

  paso(dt, t) {
    const g = this.trazo;
    if (!this.desde || this.decidido) return;
    g.clear();
    g.lineStyle(10, 0xffffff, 0.9).lineBetween(this.desde.x, this.desde.y, this.punta.x, this.punta.y);
    g.fillStyle(0xffffff, 1).fillCircle(this.punta.x, this.punta.y, 10);
  }
}
