// ¡CAMBIA DE CARRIL! — Un auto en una carretera de tres carriles; vienen
// piedras de frente. Deslizar a un lado (o tocar ese lado) cambia de carril.
// Hay que aguantar sin chocar hasta que se acabe la mecha. Desde el nivel 3
// vienen de a dos.
import { Micro } from '../escenas/Micro.js';
import { COLOR } from '../config.js';

const DESLIZ = 45;                // píxeles de lado a lado que cuentan como deslizar

export class Carril extends Micro {
  static ORDEN = '¡CAMBIA DE CARRIL!';
  static ICONO = 'bandera';          // en la galería
  static CONTROL = 'deslizar';
  static GANA_AL_FINAL = true;

  armar() {
    this.fondo([0x8fd67a, 0x3f8f46], null);
    // La carretera: asfalto, bordes y las líneas que corren hacia abajo
    this.carriles = [this.cx - 150, this.cx, this.cx + 150];
    const g = this.add.graphics();
    g.fillStyle(0x3d3d4a, 1).fillRect(this.cx - 230, 0, 460, this.H);
    g.fillStyle(0xffffff, 1).fillRect(this.cx - 230, 0, 10, this.H).fillRect(this.cx + 220, 0, 10, this.H);
    for (let i = 0; i < 9; i++) {
      this.emoji(i % 2 ? 'planta' : 'flor', i % 2 ? 22 : this.W - 22, 60 + i * 130, 44).setAlpha(0.9);
    }
    this.rayas = [-75, 75].map(dx => ({ r: this.add.graphics(), dx }));
    this.desplazo = 0;
    // El auto: en el carril del medio, abajo
    this.carril = 1;
    this.yAuto = this.bajo - 110;
    this.auto = this.emoji('auto', this.carriles[1], this.yAuto, 116).setAngle(-90).setDepth(3);
    this.sombra(this.carriles[1], this.yAuto + 10, 90, 0.25);
    // Las piedras: salen arriba, en carriles al azar (nunca los tres a la vez)
    this.rapidez = [420, 480, 520][this.nivel - 1] * this.vel;
    const cada = [0.75, 0.68, 0.66][this.nivel - 1] / this.vel;
    this.piedras = [];
    // Cada fila deja libre al menos un carril que también estaba libre en la
    // anterior: siempre hay por dónde pasar sin tener que cruzar dos carriles
    // de golpe entre una fila y la siguiente
    let libresAntes = [0, 1, 2];
    for (let t = 0.55, i = 0; t < this.dur - 0.45; t += cada * this.azar(0.9, 1.15), i++) {
      const dobles = this.nivel >= 3 && i % 2 === 1;
      const queda = this.elegir(libresAntes);
      const tapados = this.mezclar([0, 1, 2].filter(c => c !== queda)).slice(0, dobles ? 2 : 1);
      for (const c of tapados) this.piedras.push({ t, c, img: null, y: -60 });
      libresAntes = [0, 1, 2].filter(c => !tapados.includes(c));
    }
    this.desde = null;
    this.alTocar((x, y) => { this.desde = { x, y, movio: false }; });
    this.alMover((x, y, p) => {
      if (!p.isDown || !this.desde) return;
      const dx = x - this.desde.x;
      if (Math.abs(dx) >= DESLIZ) { this.cambiar(dx > 0 ? 1 : -1); this.desde = { x, y, movio: true }; }
    });
    this.alSoltar(x => {
      // Un toque sin deslizar: hacia el lado que se tocó
      if (this.desde && !this.desde.movio) this.cambiar(x < this.auto.x - 40 ? -1 : x > this.auto.x + 40 ? 1 : 0);
      this.desde = null;
    });
  }

  cambiar(dir) {
    if (!dir || this.decidido) return;
    const nuevo = Math.max(0, Math.min(2, this.carril + dir));
    if (nuevo === this.carril) return;
    this.carril = nuevo;
    this.audio.zas();
    this.tweens.killTweensOf(this.auto);
    this.tweens.add({ targets: this.auto, x: this.carriles[nuevo], duration: 110, ease: 'Quad.easeOut' });
    this.auto.setAngle(-90 + dir * 12);
    this.tweens.add({ targets: this.auto, angle: -90, duration: 160, delay: 60 });
  }

  alGanar() { this.cartel(this.cx, this.arriba + 120, '¡SIN UN RASGUÑO!', COLOR.ORO, 54); }

  paso(dt, t) {
    // Las rayas del medio corren hacia abajo
    this.desplazo = (this.desplazo + this.rapidez * dt) % 120;
    for (const { r, dx } of this.rayas) {
      r.clear().fillStyle(0xfff1a8, 0.9);
      for (let y = -120 + this.desplazo; y < this.H; y += 120) r.fillRect(this.cx + dx - 5, y, 10, 60);
    }
    if (this.decidido) return;
    for (const p of this.piedras) {
      if (t < p.t) continue;
      if (!p.img) p.img = this.emoji('roca', this.carriles[p.c], -60, 96).setDepth(2);
      p.y = -60 + (t - p.t) * this.rapidez;
      p.img.setPosition(this.carriles[p.c], p.y).setAngle(p.y * 0.3);
      // ¿Choca? Mismo carril (el auto ya casi llegó al carril nuevo) y a la altura del auto
      const xAuto = this.auto.x;
      if (Math.abs(p.y - this.yAuto) < 80 && Math.abs(this.carriles[p.c] - xAuto) < 70) {
        this.perder();
        this.audio.choque();
        this.cameras.main.shake(200, 0.012);
        this.auto.setAngle(-60);
        this.cartel(this.cx, this.arriba + 120, '¡CRASH!', COLOR.MAL, 66);
        return;
      }
    }
  }
}
