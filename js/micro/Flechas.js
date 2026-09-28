// ¡SEGUÍ LAS FLECHAS! — Deslizá el dedo hacia donde apunta cada flecha, en orden.
import { Micro } from '../escenas/Micro.js';
import { COLOR } from '../config.js';

const DIRS = [[1, 0, 0], [0, 1, 90], [-1, 0, 180], [0, -1, 270]];   // [dx, dy, ángulo]

export class Flechas extends Micro {
  static ORDEN = '¡SIGUE LAS FLECHAS!';
  static CONTROL = 'deslizar';

  armar() {
    this.fondo();
    const n = [3, 4, 5][this.nivel - 1];
    const paso = Math.min(120, 480 / n), y = this.cy + 150;
    this.flechas = [];
    for (let i = 0; i < n; i++) {
      const d = this.elegir(DIRS);
      const x = this.cx + (i - (n - 1) / 2) * paso;
      const base = this.circulo(x, y, paso * 0.44, 0xffffff, 0.9);
      const img = this.add.image(x, y, 'atlas', 'flecha').setDisplaySize(paso * 0.62, paso * 0.62).setAngle(d[2]).setTint(COLOR.OSCURO);
      this.flechas.push({ d, x, y, base, img });
    }
    this.actual = 0;
    this.marcar();
    this.desde = null;
    this.alTocar((x, yT) => { this.desde = { x, y: yT }; });
    const mirar = (x, yT) => {
      if (!this.desde) return;
      const dx = x - this.desde.x, dy = yT - this.desde.y;
      if (Math.hypot(dx, dy) < 45) return;
      this.desde = null;
      const d = Math.abs(dx) > Math.abs(dy) ? [Math.sign(dx), 0] : [0, Math.sign(dy)];
      this.gesto(d);
    };
    this.alMover(mirar);
    this.alSoltar((x, yT) => { mirar(x, yT); this.desde = null; });
  }

  marcar() {
    this.flechas.forEach((f, i) => {
      f.base.setTint(i < this.actual ? COLOR.BIEN : i === this.actual ? COLOR.ORO : 0xffffff);
      f.img.setAlpha(i < this.actual ? 0.4 : 1);
    });
  }

  gesto([dx, dy]) {
    const f = this.flechas[this.actual];
    if (!f) return;
    if (f.d[0] === dx && f.d[1] === dy) {
      this.audio.acierto(this.actual);
      this.rebote(f.base, 1.3);
      this.actual++;
      this.marcar();
      if (this.actual >= this.flechas.length) { this.ganar(); this.chispas(this.cx, f.y, 14); }
    } else {
      this.perder();
      f.base.setTint(COLOR.MAL);
      this.tweens.add({ targets: f.img, angle: f.d[2] + 20, duration: 60, yoyo: true, repeat: 3 });
    }
  }

  paso(dt, t) {
    const f = this.flechas[this.actual];
    if (f && !this.decidido) f.img.setPosition(f.x + f.d[0] * Math.sin(t * 10) * 6, f.y + f.d[1] * Math.sin(t * 10) * 6);
  }
}
