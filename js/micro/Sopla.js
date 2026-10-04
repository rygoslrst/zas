// ¡APAGA LAS VELAS! — Toca rápido para soplar las velas de la torta, una por
// una. Desde el nivel 2, si dejas de soplar un momento, la vela que estabas
// soplando se vuelve a avivar.
import { Micro } from '../escenas/Micro.js';
import { COLOR } from '../config.js';

const COLORES_VELA = [0xff70a6, 0x4d96ff, 0xffd23f, 0x3ddc84];

export class Sopla extends Micro {
  static ORDEN = '¡APAGA LAS VELAS!';
  static CONTROL = 'machacar';
  // La primera vez que sale uno de "toca rápido" (este, ¡INFLA! o ¡DESPEGA!)
  static LECCION = {
    grupo: 'machacar', titulo: '¡TOCA MUY RÁPIDO!', sub: 'MUCHAS VECES, SIN PARAR, HASTA LOGRARLO',
    gesto: 'machacar', lugar: 'arriba', listo: () => true,
    objetivo: m => { const v = m.velas[m.actual] || m.velas[0]; return { x: v.x, y: v.y + 40 }; },
  };

  armar() {
    this.tema('fiesta');
    const yMesa = this.bajo - 40;
    this.piso(yMesa, 0xb5651d);
    // La torta, dibujada: plato, bizcocho, crema con gotas y una frutilla
    const yT = yMesa - 90, g = this.add.graphics();
    g.fillStyle(COLOR.OSCURO, 0.25).fillEllipse(this.cx, yMesa + 4, 380, 50);
    g.fillStyle(0xffffff, 1).fillEllipse(this.cx, yMesa - 6, 360, 46);
    g.fillStyle(0x8b4a2b, 1).fillRoundedRect(this.cx - 150, yT - 60, 300, 140, 18);
    g.fillStyle(0xffb3d1, 1).fillRoundedRect(this.cx - 150, yT - 26, 300, 22, 6);
    g.fillStyle(0xfff4f8, 1).fillRoundedRect(this.cx - 158, yT - 82, 316, 44, 20);
    for (let x = this.cx - 140; x <= this.cx + 140; x += 40) g.fillCircle(x, yT - 40, 12);
    this.emoji('frutilla', this.cx + 112, yT + 30, 46);
    // Las velas, sobre la torta
    const n = [2, 3, 4][this.nivel - 1];
    this.necesarios = Math.max(6, Math.round([4, 5, 6][this.nivel - 1] * (this.dur - 0.3)));
    this.porVela = this.necesarios / n;
    this.velas = [];
    for (let i = 0; i < n; i++) {
      const x = this.cx + (i - (n - 1) / 2) * 62, y = yT - 82;
      this.rect(x, y - 38, 18, 76, COLORES_VELA[i % COLORES_VELA.length]);
      this.rect(x, y - 52, 18, 6, 0xffffff, 0.8);
      this.rect(x, y - 24, 18, 6, 0xffffff, 0.8);
      this.rect(x, y - 80, 3, 10, COLOR.OSCURO);
      const llama = this.emoji('fuego', x, y - 104, 50);
      const brillo = this.add.image(x, y - 104, 'atlas', 'brillo').setDisplaySize(110, 110).setTint(0xffd23f).setAlpha(0.5);
      this.velas.push({ x, y: y - 104, llama, brillo, vida: 1, prendida: true, fase: i * 1.3 });
    }
    this.actual = 0;
    this.ultimoSoplo = -1;
    this.soplos = 0;
    this.alTocar(() => this.soplar());
  }

  soplar() {
    const v = this.velas[this.actual];
    if (!v) return;
    this.ultimoSoplo = this.t;
    v.vida -= 1 / this.porVela;
    this.humo(v.x - 30 - this.azar(0, 20), v.y + 10, 40);
    this.audio.inflar(Math.min(1, this.soplos++ / this.necesarios));
    if (v.vida <= 1e-6) {                       // (1 - 1/3 - 1/3 - 1/3 no da justo 0)
      v.prendida = false;
      v.llama.setVisible(false);
      v.brillo.setVisible(false);
      this.humo(v.x, v.y - 10, 60);
      this.audio.pop();
      this.actual++;
      // Lo que sobró de ese soplido sirve para la vela siguiente
      const sig = this.velas[this.actual];
      if (sig) sig.vida += Math.min(0, v.vida);
      if (this.actual >= this.velas.length) {
        this.ganar();
        this.confeti(this.cx, this.cy - 60, 26);
        this.cartel(this.cx, this.cy - 220, '¡FELIZ CUMPLE!', COLOR.ORO, 60);
      }
    }
  }

  paso(dt, t) {
    // Desde el nivel 2: si hace un rato que no soplas, la vela se aviva
    const v = this.velas[this.actual];
    if (v && this.nivel >= 2 && !this.decidido && t - this.ultimoSoplo > 0.35) v.vida = Math.min(1, v.vida + 0.6 * dt);
    for (const o of this.velas) {
      if (!o.prendida) continue;
      const k = 0.35 + 0.65 * o.vida;
      const tiembla = 1 + Math.sin(t * 18 + o.fase) * 0.08;
      o.llama.setDisplaySize(50 * k * tiembla, 50 * k).setAngle(Math.sin(t * 9 + o.fase) * 8 * (o === v ? 2 : 1));
      o.llama.y = o.y + (1 - k) * 18;
      o.brillo.setAlpha(0.2 + 0.35 * o.vida);
    }
  }
}
