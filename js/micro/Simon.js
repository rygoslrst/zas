// JEFE — ¡REPETÍ! El marciano muestra una secuencia de colores: repetila.
// Dos rondas (la segunda, un paso más larga). Si ganás, vida extra.
import { Micro } from '../escenas/Micro.js';
import { COLOR } from '../config.js';

const BOTONES = [
  { color: 0xff4d5a, emoji: 'manzana', nota: 72 },
  { color: 0x3b82f6, emoji: 'gota', nota: 76 },
  { color: 0xffd23f, emoji: 'estrella', nota: 79 },
  { color: 0x3ddc84, emoji: 'trebol', nota: 84 },
];

export class Simon extends Micro {
  static ORDEN = '¡REPITE!';
  static CONTROL = 'tocar';
  static PULSOS = 30;
  static JEFE = true;

  armar() {
    this.tema('noche');
    this.jefe = this.emoji('marciano', this.cx, this.arriba + 120, 150);
    this.corona = this.emoji('corona', this.cx, this.arriba + 40, 80);
    this.dicho = this.texto(this.cx, this.arriba + 235, '', 44, COLOR.ORO);
    const r = 92, sep = 205, y0 = this.cy + 90;
    this.botones = BOTONES.map((b, i) => {
      const x = this.cx + (i % 2 ? sep / 2 : -sep / 2), y = y0 + (i < 2 ? -sep / 2 : sep / 2);
      const sombra = this.circulo(x, y + 10, r, COLOR.OSCURO, 0.35);
      const base = this.circulo(x, y, r, b.color);
      const brillo = this.add.image(x, y, 'atlas', 'brillo').setDisplaySize(r * 3, r * 3).setAlpha(0);
      const img = this.emoji(b.emoji, x, y, 90);
      return { ...b, x, y, r, base, brillo, img, sombra };
    });
    this.largo = [3, 4, 4][this.nivel - 1];
    this.secuencia = [];
    for (let i = 0; i < this.largo + 1; i++) this.secuencia.push(Math.floor(Math.random() * 4));
    this.ronda = 0;
    this.pasoSeg = Math.max(0.3, 0.55 / Math.sqrt(this.vel));
    this.mostrar(0.9);
    this.alTocar((x, y) => {
      if (this.fase !== 'turno') return;
      const i = this.botones.findIndex(b => Math.hypot(b.x - x, b.y - y) < b.r + 6);
      if (i < 0) return;
      this.prender(i);
      const esperado = this.secuencia[this.puesto];
      if (i !== esperado) {
        this.perder();
        this.jefe.setTexture('emoji', 'diablo');
        this.dicho.setText('¡JA, JA!');
        this.botones[i].base.setTint(0x555555);
        return;
      }
      this.puesto++;
      const n = this.largo + this.ronda;
      if (this.puesto >= n) {
        this.ronda++;
        if (this.ronda >= 2) {
          this.ganar();
          this.jefe.setTexture('emoji', 'estrellitas');
          this.tweens.add({ targets: [this.jefe, this.corona], y: '+=400', angle: 200, alpha: 0, duration: 900 });
          this.dicho.setText('');
          this.confeti(this.cx, this.cy);
          this.cartel(this.cx, this.cy - 40, '¡JEFE DERROTADO!', COLOR.ORO, 60);
        } else {
          this.dicho.setText('¡OTRA MÁS!');
          this.mostrar(this.t + 0.5);
        }
      }
    });
  }

  // Programa la muestra de la secuencia desde el instante "desde"
  mostrar(desde) {
    this.fase = 'muestra';
    this.tMuestra = desde;
    this.mostrados = 0;
    if (this.ronda === 0) this.dicho.setText('¡MIRA BIEN!');
  }

  prender(i) {
    const b = this.botones[i];
    this.audio.acierto([0, 2, 4, 5][i]);
    b.brillo.setAlpha(0.9);
    b.base.setTint(0xffffff);
    this.tweens.add({ targets: b.brillo, alpha: 0, duration: 260 });
    this.time.delayedCall(170, () => b.base.setTint(b.color));
    this.rebote(b.img, 1.25);
  }

  paso(dt, t) {
    this.jefe.y = this.arriba + 120 + Math.sin(t * 3) * 8;
    this.corona.y = this.jefe.y - 80;
    if (this.fase !== 'muestra' || this.decidido) return;
    const n = this.largo + this.ronda;
    const k = Math.floor((t - this.tMuestra) / this.pasoSeg);
    if (k >= 0 && k > this.mostrados - 1 && this.mostrados < n) {
      this.prender(this.secuencia[this.mostrados]);
      this.mostrados++;
    }
    if (this.mostrados >= n && t - this.tMuestra >= n * this.pasoSeg) {
      this.fase = 'turno';
      this.puesto = 0;
      this.dicho.setText('¡TU TURNO!');
    }
  }
}
