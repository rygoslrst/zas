// ¡EL DISTINTO! — Una grilla de emoji iguales y uno distinto: encontralo.
import { Micro } from '../escenas/Micro.js';

// Parejas [el de todos, el distinto], cada vez más parecidas
const PAREJAS = [
  [['perro', 'gato'], ['manzana', 'banana'], ['pelota', 'basket'], ['auto', 'bici'], ['sol', 'luna'],
   ['pizza', 'dona'], ['sapo', 'pollito'], ['globo', 'regalo'], ['cerdo', 'mono']],
  [['manzana', 'tomate'], ['sapo', 'tortuga'], ['sonrisa', 'facha'], ['flor', 'girasol'], ['naranja', 'limon'],
   ['frutilla', 'cereza'], ['perro', 'conejo'], ['galleta', 'dona'], ['pez', 'pez_globo']],
  [['sonrisa', 'sonrisa2'], ['sonrisa2', 'sonrisa3'], ['neutra', 'sin_expresion'], ['sonrisa', 'guinio'],
   ['boca', 'asustado'], ['contento', 'lengua'], ['llave', 'candado']],
];
// Emoji que no son simétricos: el distinto puede ser el mismo, dado vuelta
const ASIMETRICOS = ['auto', 'corredor', 'pollito', 'pez', 'pajaro', 'cohete', 'pinguino', 'bici', 'lupa'];

export class Distinto extends Micro {
  static ORDEN = '¡EL DISTINTO!';
  static CONTROL = 'tocar';

  armar() {
    this.fondo();
    const lado = [3, 4, 5][this.nivel - 1];
    let comun, raro, espejo = false;
    if (this.nivel >= 2 && Math.random() < 0.3) {
      comun = raro = this.elegir(ASIMETRICOS);
      espejo = true;
    } else {
      [comun, raro] = this.mezclar(this.elegir(PAREJAS[this.nivel - 1]));
    }
    const paso = Math.min(140, 470 / lado);
    const tam = paso * 0.84;
    const y0 = this.cy + 40 - (paso * (lado - 1)) / 2;
    this.distinto = Math.floor(Math.random() * lado * lado);
    this.celdas = [];
    for (let i = 0; i < lado * lado; i++) {
      const x = this.cx + ((i % lado) - (lado - 1) / 2) * paso;
      const y = y0 + Math.floor(i / lado) * paso;
      const img = this.emoji(i === this.distinto ? raro : comun, x, y, tam);
      if (i === this.distinto && espejo) img.setFlipX(true);
      this.celdas.push({ img, x, y, fase: Math.random() * 6 });
    }
    this.tam = tam;
    this.alTocar((x, y) => {
      const i = this.celdas.findIndex(c => Math.abs(c.x - x) < paso / 2 && Math.abs(c.y - y) < paso / 2);
      if (i < 0) return;
      const c = this.celdas[i], bueno = this.celdas[this.distinto];
      if (i === this.distinto) {
        this.ganar();
        this.chispas(c.x, c.y, 10);
        this.tweens.add({ targets: c.img, displayWidth: tam * 1.5, displayHeight: tam * 1.5, duration: 200, ease: 'Back.easeOut' });
        for (const o of this.celdas) if (o !== c) o.img.setAlpha(0.35);
      } else {
        this.perder();
        c.img.setTint(0xff6b6b);
        this.tweens.add({ targets: bueno.img, displayWidth: tam * 1.4, displayHeight: tam * 1.4, duration: 180, yoyo: true, repeat: 2 });
      }
    });
  }

  paso(dt, t) {
    for (const c of this.celdas) c.img.y = c.y + Math.sin(t * 3 + c.fase) * 4;
  }
}
