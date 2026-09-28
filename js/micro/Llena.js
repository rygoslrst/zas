// ¡LLENÁ EL VASO! — Mantené apretado para que caiga agua; soltá en la franja.
import { Micro } from '../escenas/Micro.js';
import { COLOR } from '../config.js';

const AGUA = 0x4d96ff, AGUA_CLARA = 0x9fd0ff, VIDRIO = 0xdff3ff;

export class Llena extends Micro {
  static ORDEN = '¡LLENA EL VASO!';
  static CONTROL = 'mantener';

  armar() {
    this.tema('cocina');
    // El vaso: más ancho arriba que abajo
    this.anchoAbajo = 150;
    this.anchoArriba = 210;
    this.alto = 300;
    this.yFondo = this.bajo - 40;
    this.yBorde = this.yFondo - this.alto;
    // La franja donde hay que parar (fracción del vaso)
    const franja = [0.2, 0.15, 0.11][this.nivel - 1];
    const centro = this.azar(0.5, 0.78);
    this.lo = centro - franja / 2;
    this.hi = centro + franja / 2;
    // Qué tan rápido sube: más rápido con el nivel, y un poco con la velocidad
    this.ritmo = [0.42, 0.52, 0.6][this.nivel - 1] * (0.7 + 0.3 * this.vel);
    this.nivelAgua = 0;
    this.sirviendo = false;

    this.sombra(this.cx, this.yFondo + 8, 230, 0.25);
    // Interior del vaso (vidrio), agua y burbujas: se redibujan en cada cuadro
    this.dibujo = this.add.graphics();
    this.burbujas = [];
    for (let i = 0; i < 7; i++) this.burbujas.push({ x: this.azar(-0.4, 0.4), y: Math.random(), v: this.azar(0.15, 0.35), r: this.azar(3, 6) });
    // Franja objetivo, por encima del agua
    const yLo = this.yNivel(this.lo), yHi = this.yNivel(this.hi);
    this.rect(this.cx, (yLo + yHi) / 2, this.anchoArriba + 70, yLo - yHi, COLOR.BIEN, 0.3);
    this.rect(this.cx, yHi, this.anchoArriba + 70, 4, COLOR.BIEN);
    this.rect(this.cx, yLo, this.anchoArriba + 70, 4, COLOR.BIEN);
    this.flechaI = this.add.image(this.cx - this.anchoArriba / 2 - 52, (yLo + yHi) / 2, 'atlas', 'flecha').setDisplaySize(40, 40).setTint(COLOR.BIEN);
    this.flechaD = this.add.image(this.cx + this.anchoArriba / 2 + 52, (yLo + yHi) / 2, 'atlas', 'flecha').setDisplaySize(40, 40).setTint(COLOR.BIEN).setFlipX(true);
    // El contorno del vaso, encima de todo
    this.contorno = this.add.graphics();
    this.dibujarContorno();
    // La canilla (el emoji trae un vasito abajo: se recorta) y el chorro. El
    // pico está a la izquierda del dibujo: se corre para que caiga en el centro.
    const k = 160 / 128;
    const yCanilla = this.yBorde - 130;
    this.yCanilla = yCanilla + 14 * k;
    this.chorro = this.rect(this.cx, this.yCanilla, 20, 1, AGUA, 0.9).setOrigin(0.5, 0).setVisible(false);
    this.emojiEntero('canilla', this.cx + 38 * k, yCanilla, 160).setCrop(0, 0, 152, 94);   // encima del chorro

    this.alTocar(() => { this.sirviendo = true; this.audio.chorro(true); });
    this.input.on('pointerup', () => this.cortar());
    this.input.on('pointerupoutside', () => this.cortar());
  }

  // Altura en pantalla de un nivel (0 = fondo, 1 = borde)
  yNivel(f) { return this.yFondo - f * this.alto; }
  // Medio ancho del vaso a un nivel
  medioAncho(f) { return (this.anchoAbajo + (this.anchoArriba - this.anchoAbajo) * f) / 2; }

  dibujarContorno() {
    const g = this.contorno, c = this.cx;
    g.lineStyle(9, COLOR.OSCURO, 1);
    g.beginPath();
    g.moveTo(c - this.medioAncho(1) - 4, this.yBorde);
    g.lineTo(c - this.medioAncho(0), this.yFondo);
    g.lineTo(c + this.medioAncho(0), this.yFondo);
    g.lineTo(c + this.medioAncho(1) + 4, this.yBorde);
    g.strokePath();
    g.fillStyle(COLOR.OSCURO, 1).fillRect(c - this.medioAncho(0) - 6, this.yFondo, this.medioAncho(0) * 2 + 12, 12);
    // Brillo del vidrio
    g.lineStyle(7, 0xffffff, 0.55);
    g.lineBetween(c - this.medioAncho(0.9) + 18, this.yNivel(0.9), c - this.medioAncho(0.15) + 16, this.yNivel(0.15));
  }

  cortar() {
    if (!this.sirviendo) return;
    this.sirviendo = false;
    this.audio.chorro(false);
    if (this.decidido) return;
    if (this.nivelAgua >= this.lo) {
      this.ganar();
      this.cartel(this.cx, this.yBorde - 40, '¡JUSTO!', COLOR.ORO, 64);
      this.chispas(this.cx, this.yNivel(this.nivelAgua), 10);
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
    // El vidrio y el agua (con una onda arriba si está cayendo el chorro)
    const g = this.dibujo, c = this.cx, f = Math.max(0, this.nivelAgua);
    g.clear();
    g.fillStyle(VIDRIO, 0.35);
    g.fillPoints([{ x: c - this.medioAncho(1), y: this.yBorde }, { x: c + this.medioAncho(1), y: this.yBorde },
      { x: c + this.medioAncho(0), y: this.yFondo }, { x: c - this.medioAncho(0), y: this.yFondo }], true);
    if (f > 0.005) {
      const y = this.yNivel(f), m = this.medioAncho(f), onda = this.sirviendo ? 5 : 2;
      const pts = [{ x: c - this.medioAncho(0), y: this.yFondo }, { x: c + this.medioAncho(0), y: this.yFondo }];
      for (let i = 8; i >= 0; i--) {
        const u = i / 8;
        pts.push({ x: c - m + 2 * m * u, y: y + Math.sin(t * 9 + u * 6) * onda });
      }
      g.fillStyle(AGUA, 0.9).fillPoints(pts, true);
      g.fillStyle(AGUA_CLARA, 0.8).fillRect(c - m + 4, y - 2, 2 * m - 8, 5);
      // Burbujas que suben dentro del agua
      g.fillStyle(0xffffff, 0.55);
      for (const b of this.burbujas) {
        b.y = (b.y + b.v * dt) % 1;
        const by = this.yFondo - b.y * f * this.alto;
        g.fillCircle(c + b.x * this.medioAncho(b.y * f) * 1.6, by, b.r);
      }
    }
    // El chorro, con salpicaduras donde pega
    this.chorro.setVisible(this.sirviendo);
    if (this.sirviendo) {
      const yAgua = this.yNivel(f);
      this.chorro.displayHeight = Math.max(1, yAgua - this.yCanilla);
      this.chorro.displayWidth = 18 + Math.sin(t * 40) * 2;
      if (Math.random() < 0.4) this.chispas(c, yAgua, 1, AGUA_CLARA, 0.5);
    }
    // Las flechitas de la franja laten
    const d = Math.sin(t * 8) * 6;
    this.flechaI.x = c - this.anchoArriba / 2 - 52 + d;
    this.flechaD.x = c + this.anchoArriba / 2 + 52 - d;
  }
}
