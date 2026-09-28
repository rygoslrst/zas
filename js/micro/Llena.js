// ¡LLENÁ EL VASO! — Mantené apretado para que caiga agua; soltá en la franja.
import { Micro } from '../escenas/Micro.js';
import { COLOR } from '../config.js';

export class Llena extends Micro {
  static ORDEN = '¡LLENÁ EL VASO!';
  static CONTROL = 'mantener';

  armar() {
    this.fondo(0xffe8c2, 'lunares');
    const ancho = 190, alto = 300;
    this.x0 = this.cx - ancho / 2;
    this.yFondo = this.bajo - 40;
    this.yBorde = this.yFondo - alto;
    this.alto = alto;
    // La franja donde hay que parar (fracción del vaso)
    const franja = [0.2, 0.15, 0.11][this.nivel - 1];
    const centro = this.azar(0.5, 0.78);
    this.lo = centro - franja / 2;
    this.hi = centro + franja / 2;
    // Qué tan rápido sube: más rápido con el nivel, y un poco con la velocidad
    this.ritmo = [0.42, 0.52, 0.6][this.nivel - 1] * (0.7 + 0.3 * this.vel);
    this.nivelAgua = 0;
    this.sirviendo = false;

    // Agua (debajo del vidrio) y franja objetivo
    this.agua = this.rect(this.cx, this.yFondo, ancho - 16, 1, 0x4d96ff, 0.9).setOrigin(0.5, 1);
    const yLo = this.yFondo - this.lo * alto, yHi = this.yFondo - this.hi * alto;
    this.rect(this.cx, (yLo + yHi) / 2, ancho + 60, yLo - yHi, COLOR.BIEN, 0.35);
    this.rect(this.cx, yHi, ancho + 60, 4, COLOR.BIEN);
    this.rect(this.cx, yLo, ancho + 60, 4, COLOR.BIEN);
    // El vaso: paredes y base oscuras, con un brillo
    this.rect(this.x0, this.yFondo - alto / 2, 10, alto, COLOR.OSCURO);
    this.rect(this.x0 + ancho, this.yFondo - alto / 2, 10, alto, COLOR.OSCURO);
    this.rect(this.cx, this.yFondo, ancho + 10, 12, COLOR.OSCURO);
    this.rect(this.x0 + 26, this.yFondo - alto / 2, 8, alto * 0.8, 0xffffff, 0.5);
    // La canilla (el emoji trae un vasito abajo: se recorta) y el chorro. El
    // pico está a la izquierda del dibujo: se corre para que caiga en el centro.
    const k = 160 / 128;
    const yCanilla = this.yBorde - 130;
    this.yCanilla = yCanilla + 14 * k;
    this.chorro = this.rect(this.cx, this.yCanilla, 20, 1, 0x4d96ff, 0.9).setOrigin(0.5, 0).setVisible(false);
    this.emoji('canilla', this.cx + 38 * k, yCanilla, 160).setCrop(0, 0, 128, 82);   // encima del chorro

    this.alTocar(() => { this.sirviendo = true; this.audio.chorro(true); });
    this.input.on('pointerup', () => this.cortar());
    this.input.on('pointerupoutside', () => this.cortar());
  }

  cortar() {
    if (!this.sirviendo) return;
    this.sirviendo = false;
    this.audio.chorro(false);
    if (this.decidido) return;
    if (this.nivelAgua >= this.lo) {
      this.ganar();
      this.cartel(this.cx, this.yBorde - 40, '¡JUSTO!', COLOR.ORO, 64);
      this.chispas(this.cx, this.yFondo - this.nivelAgua * this.alto, 10);
    }
  }

  alPerder() { this.sirviendo = false; this.audio.chorro(false); }

  paso(dt, t) {
    if (this.sirviendo && !this.decidido) {
      this.nivelAgua += this.ritmo * dt;
      if (this.nivelAgua > this.hi) {
        this.perder();
        this.cartel(this.cx, this.yBorde - 40, '¡TE PASASTE!', COLOR.MAL, 56);
      }
    }
    const yAgua = this.yFondo - this.nivelAgua * this.alto;
    this.agua.displayHeight = Math.max(1, this.nivelAgua * this.alto);
    this.chorro.setVisible(this.sirviendo);
    if (this.sirviendo) this.chorro.displayHeight = Math.max(1, yAgua - this.yCanilla);
    this.chorro.displayWidth = 18 + Math.sin(t * 40) * 2;
  }
}
