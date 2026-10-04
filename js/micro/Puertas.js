// ¡CIERRA LAS PUERTAS! — Un pasillo embrujado: por cada puerta se acerca un
// fantasma. Hay que deslizar el dedo de lado a lado sobre cada puerta para
// cerrarla de un portazo antes de que llegue. Más puertas cuanto más difícil.
import { Micro, mezcla } from '../escenas/Micro.js';
import { COLOR } from '../config.js';

const BARRIDO = 0.55;             // qué parte del ancho de la puerta hay que barrer para cerrarla
const COLORES = [0x8a4fbf, 0x2ec4b6, 0xff7a59, 0x4d96ff];

export class Puertas extends Micro {
  static ORDEN = '¡CIERRA LAS PUERTAS!';
  static ICONO = 'fantasma';          // en la galería
  static CONTROL = 'deslizar';
  // La primera vez: el juego se congela y enseña (ver Director.revisarLeccion)
  static LECCION = {
    titulo: '¡DESLIZA SOBRE CADA PUERTA!', sub: 'CIÉRRALAS ANTES DE QUE LLEGUEN LOS FANTASMAS',
    gesto: 'deslizar', lugar: 'arriba', listo: () => true,
    objetivo: m => ({ x: m.puertas[0].x, y: m.yPuerta }),
  };

  armar() {
    this.tema('noche');
    const n = [2, 3, 4][this.nivel - 1];
    // La pared del pasillo (tablas oscuras) y el piso
    const yPiso = this.cy + 190;
    this.tablas(0x4a3566, 96).setAlpha(0.95);
    this.vineta(0.5);
    this.piso(yPiso, 0x3b2a1e);
    // Una ventana con la luna arriba de las puertas, y telarañas
    const vy = this.cy - 270, vw = 170, vh = 130;
    const v = this.add.graphics();
    v.fillStyle(COLOR.OSCURO, 1).fillRoundedRect(this.cx - vw / 2 - 14, vy - vh / 2 - 14, vw + 28, vh + 28, { tl: 60, tr: 60, bl: 6, br: 6 });
    v.fillStyle(0x1d2a5c, 1).fillRoundedRect(this.cx - vw / 2, vy - vh / 2, vw, vh, { tl: 50, tr: 50, bl: 2, br: 2 });
    this.emoji('luna', this.cx + 30, vy - 10, 70);
    this.add.graphics().fillStyle(COLOR.OSCURO, 1).fillRect(this.cx - 4, vy - vh / 2, 8, vh).fillRect(this.cx - vw / 2, vy + 6, vw, 8);
    for (const lado of [-1, 1]) {
      const t = this.add.graphics(), ox = lado < 0 ? 0 : this.W, oy = this.arriba - 60, sx = -lado;
      t.lineStyle(2, 0xffffff, 0.35);
      for (let k = 0; k <= 4; k++) {
        const a = (k / 4) * Math.PI / 2;
        t.lineBetween(ox, oy, ox + sx * Math.cos(a) * 150, oy + Math.sin(a) * 150);
      }
      for (let r = 40; r <= 140; r += 33) {
        t.beginPath();
        for (let k = 0; k <= 4; k++) {
          const a = (k / 4) * Math.PI / 2, px = ox + sx * Math.cos(a) * r, py = oy + Math.sin(a) * r;
          if (k === 0) t.moveTo(px, py); else t.lineTo(px, py);
        }
        t.strokePath();
      }
    }
    // Las puertas, repartidas a lo ancho
    const ancho = Math.min(150, 470 / n - 14), alto = 300;
    this.yPuerta = yPiso - alto / 2;
    // Cuándo llega cada fantasma: entre la mitad y casi el final (desordenado)
    const llegadas = this.mezclar(Array.from({ length: n }, (_, i) => 0.5 + 0.38 * (i / Math.max(1, n - 1))));
    this.puertas = Array.from({ length: n }, (_, i) => {
      const x = this.cx + (i - (n - 1) / 2) * (ancho + 18);
      const g = this.add.graphics();
      // El marco y el hueco oscuro (adentro está el fantasma)
      g.fillStyle(COLOR.OSCURO, 1).fillRoundedRect(x - ancho / 2 - 10, this.yPuerta - alto / 2 - 10, ancho + 20, alto + 10, { tl: 18, tr: 18, bl: 0, br: 0 });
      g.fillStyle(0x0b0618, 1).fillRect(x - ancho / 2, this.yPuerta - alto / 2, ancho, alto);
      g.fillStyle(0x2a1f4a, 1).fillRect(x - ancho / 2, this.yPuerta + alto / 2 - 40, ancho, 40);
      const fantasma = this.emoji('fantasma', x, this.yPuerta + 10, ancho * 0.85);
      const escala = fantasma.scaleX;
      fantasma.setScale(escala * 0.25).setAlpha(0.35);
      // La hoja de la puerta: abierta, de canto contra el marco (se cierra
      // estirándose de un lado al otro)
      const color = COLORES[i % COLORES.length];
      const hoja = this.add.container(x - ancho / 2, this.yPuerta);
      const h = this.add.graphics();
      h.fillStyle(COLOR.OSCURO, 1).fillRect(0, -alto / 2, ancho, alto);
      h.fillStyle(color, 1).fillRect(4, -alto / 2 + 4, ancho - 8, alto - 8);
      h.fillStyle(mezcla(color, 0x000000, 0.25), 1).fillRect(14, -alto / 2 + 18, ancho - 28, alto / 2 - 30).fillRect(14, 14, ancho - 28, alto / 2 - 30);
      h.fillStyle(0xffd23f, 1).fillCircle(ancho - 22, 8, 9);
      hoja.add(h).setScale(0.12, 1);
      return {
        x, ancho, alto, fantasma, escala, hoja, cerrada: false, llegada: llegadas[i] * this.dur,
        barrido: null,              // { min, max } en x de lo que barrió el dedo en esta pasada
      };
    });
    // El dedo barre: lo que recorre de lado a lado sobre cada puerta
    this.dedo = null;
    this.alTocar((x, y) => { this.dedo = { x, y }; this.empezarBarrido(); this.barrer(x, y); });
    this.alMover((x, y, p) => { if (p.isDown && this.dedo) { this.barrerTramo(this.dedo.x, this.dedo.y, x, y); this.dedo = { x, y }; } });
    this.input.on('pointerup', () => { this.dedo = null; });
  }

  empezarBarrido() { for (const p of this.puertas) p.barrido = null; }

  // Un tramo del dedo, en pasitos (un movimiento rápido salta muchos píxeles)
  barrerTramo(x0, y0, x1, y1) {
    const pasos = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 12));
    for (let k = 1; k <= pasos; k++) this.barrer(x0 + (x1 - x0) * k / pasos, y0 + (y1 - y0) * k / pasos);
  }

  barrer(x, y) {
    if (this.decidido) return;
    for (const p of this.puertas) {
      if (p.cerrada || Math.abs(y - this.yPuerta) > p.alto / 2 + 30 || Math.abs(x - p.x) > p.ancho / 2 + 20) continue;
      p.barrido = p.barrido ? { min: Math.min(p.barrido.min, x), max: Math.max(p.barrido.max, x) } : { min: x, max: x };
      if (p.barrido.max - p.barrido.min >= p.ancho * BARRIDO) this.cerrar(p);
    }
  }

  cerrar(p) {
    p.cerrada = true;
    this.tweens.add({ targets: p.hoja, scaleX: 1, duration: 90, ease: 'Quad.easeIn' });
    this.tweens.add({ targets: p.fantasma, alpha: 0, duration: 90 });
    this.audio.golpe();
    this.cameras.main.shake(70, 0.006);
    this.cartel(p.x, this.yPuerta - p.alto / 2 - 40, '¡PUM!', COLOR.ORO, 40);
    if (this.puertas.every(o => o.cerrada)) {
      this.ganar();
      this.chispas(this.cx, this.yPuerta, 14);
    }
  }

  alGanar() { this.cartel(this.cx, this.arriba + 150, '¡A SALVO!', COLOR.ORO, 64); }

  paso(dt, t) {
    if (this.decidido) return;
    for (const p of this.puertas) {
      if (p.cerrada) continue;
      // El fantasma se acerca desde el fondo del pasillo (crece y se aclara)
      const k = Math.max(0, Math.min(1, t / p.llegada));
      const s = 0.25 + 0.75 * k * k;
      p.fantasma.setScale(s * p.escala).setAlpha(0.35 + 0.65 * k)
        .setPosition(p.x + Math.sin(t * 4 + p.x) * 6, this.yPuerta + 10 + Math.sin(t * 6 + p.x) * 5);
      if (k >= 1) {
        this.perder();
        p.fantasma.setScale(p.escala * 1.25);
        this.cartel(p.x, this.yPuerta - p.alto / 2 - 40, '¡BUU!', COLOR.MAL, 52);
        return;
      }
    }
  }
}
