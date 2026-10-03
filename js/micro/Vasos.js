// ¡ENCUENTRA EL DIAMANTE! — El juego de los vasos: se ve el diamante, lo tapan,
// los vasos se mezclan y hay que tocar el que lo tiene. Más mezclas y más
// rápidas cuanto más difícil; en el nivel 3 son cuatro vasos.
import { Micro } from '../escenas/Micro.js';
import { COLOR } from '../config.js';

const ALZADO = 92;                // cuánto se levanta un vaso para mostrar

export class Vasos extends Micro {
  static ORDEN = '¡ENCUENTRA EL DIAMANTE!';
  static CONTROL = 'tocar';
  static PULSOS = 12;

  armar() {
    // Una mesa de mago: paño verde sobre un fondo de terciopelo
    this.fondo([0x8e2d6e, 0x2a0f2a], 'rayas');
    this.haces(2);
    this.yMesa = this.cy + 120;
    this.piso(this.yMesa + 52, 0x2e8b57);
    const n = [3, 3, 4][this.nivel - 1];
    const k = Math.sqrt(this.vel);
    this.paso_ = Math.min(150, 440 / n);
    this.lugares = Array.from({ length: n }, (_, i) => this.cx + (i - (n - 1) / 2) * this.paso_);
    // Cuándo pasa cada cosa: se muestra, se tapa, se mezcla y se elige
    this.tMostrar = 0.75 / k;
    this.tTapar = this.tMostrar + 0.25 / k;
    this.dSwap = [0.42, 0.34, 0.28][this.nivel - 1] / k;
    const mezclas = [3, 5, 6][this.nivel - 1];
    this.swaps = [];
    for (let i = 0; i < mezclas; i++) {
      // En el nivel 1, sólo vasos vecinos; después, cualquiera
      let a = this.entero(0, n - 1), b;
      if (this.nivel === 1) b = a === n - 1 ? a - 1 : a + 1;
      else do { b = this.entero(0, n - 1); } while (b === a);
      this.swaps.push({ a, b, t0: this.tTapar + i * this.dSwap });
    }
    this.tElegir = this.tTapar + mezclas * this.dSwap;
    // El diamante, en un lugar al azar; los vasos (empiezan levantados)
    this.conDiamante = this.entero(0, n - 1);
    this.diamante = this.emoji('diamante', this.lugares[this.conDiamante], this.yMesa + 18, 66);
    this.vasos = this.lugares.map((x, i) => ({ lugar: i, x, cont: this.dibujarVaso(x), alzado: 1 }));
    this.swapActual = -1;
    this.estadoV = 'mostrar';
    this.aviso = this.texto(this.cx, this.yMesa - 230, '', 46, COLOR.ORO);
    this.alTocar((x, y) => this.elegirVaso(x, y));
  }

  dibujarVaso(x) {
    const g = this.add.graphics();
    g.fillStyle(COLOR.OSCURO, 0.3).fillEllipse(4, 92, 120, 22);
    g.fillStyle(0xd62839, 1).fillPoints([{ x: -42, y: -60 }, { x: 42, y: -60 }, { x: 56, y: 86 }, { x: -56, y: 86 }], true);
    g.fillStyle(0xff6b6b, 1).fillPoints([{ x: -30, y: -60 }, { x: -16, y: -60 }, { x: -18, y: 86 }, { x: -38, y: 86 }], true);
    g.fillStyle(0xffffff, 0.9).fillRect(-50, 30, 100, 12);
    g.fillStyle(0xa01828, 1).fillEllipse(0, -60, 84, 18);
    g.fillStyle(0xd62839, 1).fillEllipse(0, 86, 112, 20);
    // Con cuatro vasos, un poco más angostos (si no, quedan pegados)
    return this.add.container(x, this.yMesa - 70).add(g).setDepth(3).setScale(this.lugares.length > 3 ? 0.82 : 1, 1);
  }

  elegirVaso(x, y) {
    if (this.estadoV !== 'elegir') return;
    const v = this.vasos.find(o => Math.abs(o.x - x) < this.paso_ / 2 && y > this.yMesa - 200 && y < this.yMesa + 80);
    if (!v) return;
    this.estadoV = 'fin';
    this.aviso.setText('');
    const correcto = this.vasos.find(o => o.lugar === this.conDiamante);
    this.levantar(v);
    if (v === correcto) {
      this.ganar();
      this.chispas(v.x, this.yMesa, 14);
      this.cartel(this.cx, this.yMesa - 240, '¡AHÍ ESTABA!', COLOR.ORO, 60);
    } else {
      this.perder();
      this.time.delayedCall(250, () => this.levantar(correcto));
      this.cartel(this.cx, this.yMesa - 240, '¡NO ERA ESE!', COLOR.MAL, 56);
    }
  }

  levantar(v) {
    this.diamante.setPosition(this.lugares[this.conDiamante], this.yMesa + 18).setVisible(true);
    this.tweens.add({ targets: v.cont, y: this.yMesa - 70 - ALZADO, duration: 180, ease: 'Quad.easeOut' });
  }

  paso(dt, t) {
    if (this.estadoV === 'fin') return;
    const yBase = this.yMesa - 70;
    if (t < this.tMostrar) {
      for (const v of this.vasos) v.cont.y = yBase - ALZADO;
      return;
    }
    if (t < this.tTapar) {
      const p = (t - this.tMostrar) / (this.tTapar - this.tMostrar);
      for (const v of this.vasos) v.cont.y = yBase - ALZADO * (1 - p);
      return;
    }
    this.diamante.setVisible(false);
    // Las mezclas: dos vasos cambian de lugar, uno por arriba y otro por abajo
    let i = this.swaps.findIndex(s => t < s.t0 + this.dSwap);
    if (i < 0) i = this.swaps.length;
    if (i !== this.swapActual) {
      // Termina la anterior: los vasos quedan en su lugar nuevo
      if (this.swapActual >= 0 && this.swapActual < this.swaps.length) this.cerrarSwap(this.swaps[this.swapActual]);
      for (let j = this.swapActual + 1; j < Math.min(i, this.swaps.length); j++) this.cerrarSwap(this.swaps[j]);
      this.swapActual = i;
      if (i < this.swaps.length) this.audio.zas();
    }
    if (i < this.swaps.length) {
      const s = this.swaps[i];
      const p = Math.min(1, Math.max(0, (t - s.t0) / this.dSwap)), e = p * p * (3 - 2 * p);
      const va = this.vasos.find(o => o.lugar === s.a), vb = this.vasos.find(o => o.lugar === s.b);
      const xa = this.lugares[s.a], xb = this.lugares[s.b];
      va.cont.setPosition(xa + (xb - xa) * e, yBase - Math.sin(e * Math.PI) * 40);
      vb.cont.setPosition(xb + (xa - xb) * e, yBase + Math.sin(e * Math.PI) * 18);
      va.cont.setDepth(4); vb.cont.setDepth(3);
      return;
    }
    if (this.estadoV === 'mostrar') {
      this.estadoV = 'elegir';
      this.aviso.setText('¿DÓNDE ESTÁ?').setScale(0.5);
      this.tweens.add({ targets: this.aviso, scale: 1, duration: 200, ease: 'Back.easeOut' });
    }
    for (const v of this.vasos) v.cont.y = yBase + Math.sin(t * 6 + v.x) * 2;
  }

  // Al terminar una mezcla, cada vaso queda en el lugar del otro (y el
  // diamante viaja con el suyo)
  cerrarSwap(s) {
    if (s.hecho) return;
    s.hecho = true;
    const va = this.vasos.find(o => o.lugar === s.a), vb = this.vasos.find(o => o.lugar === s.b);
    va.lugar = s.b; vb.lugar = s.a;
    va.x = this.lugares[s.b]; vb.x = this.lugares[s.a];
    va.cont.setPosition(va.x, this.yMesa - 70);
    vb.cont.setPosition(vb.x, this.yMesa - 70);
    if (this.conDiamante === s.a) this.conDiamante = s.b;
    else if (this.conDiamante === s.b) this.conDiamante = s.a;
  }
}
