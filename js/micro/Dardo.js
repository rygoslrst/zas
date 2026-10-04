// ¡DALE AL BLANCO! — Un tiro al blanco en dos toques: primero una línea
// vertical va y viene de lado a lado (el toque fija dónde, a lo ancho);
// después una horizontal sube y baja (el segundo toque fija la altura). El
// dardo va al cruce de las dos: tiene que caer en el centro rojo.
import { Micro } from '../escenas/Micro.js';
import { COLOR } from '../config.js';

export class Dardo extends Micro {
  static ORDEN = '¡DALE AL BLANCO!';
  static ICONO = 'trofeo';          // en la galería
  static CONTROL = 'tocar';
  // La primera vez: el juego se congela y enseña (ver Director.revisarLeccion)
  static LECCION = {
    titulo: '¡TOCA CUANDO LA LÍNEA PASE POR EL CENTRO!', sub: 'DOS VECES: UNA PARA CADA LÍNEA',
    gesto: 'tocar', lugar: 'arriba', listo: () => true,
    objetivo: m => ({ x: m.bx, y: m.by }),
  };

  armar() {
    this.tablas(0x6b4a32, 100);
    this.vineta(0.45);
    // El tablero: aros de colores sobre un círculo de corcho
    this.bx = this.cx;
    this.by = this.cy - 20;
    this.R = 190;
    this.centro = [56, 48, 42][this.nivel - 1];      // el radio que gana
    const g = this.add.graphics();
    g.fillStyle(COLOR.OSCURO, 0.35).fillCircle(this.bx + 8, this.by + 12, this.R + 18);
    g.fillStyle(0xc9965f, 1).fillCircle(this.bx, this.by, this.R + 18);
    const aros = [[this.R, 0xffffff], [this.R * 0.78, 0x2b2b3a], [this.R * 0.56, 0x3d8bff], [this.R * 0.34, 0xfff1d6]];
    for (const [r, c] of aros) g.fillStyle(c, 1).fillCircle(this.bx, this.by, r);
    g.fillStyle(0xff4d5a, 1).fillCircle(this.bx, this.by, this.centro);
    g.fillStyle(0xffd23f, 1).fillCircle(this.bx, this.by, this.centro * 0.35);
    g.lineStyle(4, COLOR.OSCURO, 0.8).strokeCircle(this.bx, this.by, this.R);
    // Las dos líneas que van y vienen
    this.amp = this.R - 6;
    this.w = [2.2, 2.6, 3.0][this.nivel - 1] * Math.sqrt(this.vel);     // radianes por segundo
    this.fase = this.azar(0, Math.PI * 2);
    this.lineaV = this.add.image(this.bx, this.by, 'atlas', 'blanco').setDisplaySize(8, this.R * 2 + 60).setTint(COLOR.OSCURO).setDepth(3);
    this.lineaH = this.add.image(this.bx, this.by, 'atlas', 'blanco').setDisplaySize(this.R * 2 + 60, 8).setTint(COLOR.OSCURO).setDepth(3).setVisible(false);
    this.etapa = 0;              // 0: elige x · 1: elige y · 2: tiró
    this.xFija = null;
    this.alTocar(() => this.tocar());
  }

  tocar() {
    if (this.etapa === 0) {
      this.xFija = this.lineaV.x;
      this.lineaV.setTint(0xff4d5a).setDisplaySize(6, this.R * 2 + 60);
      this.etapa = 1;
      this.fase = this.azar(0, Math.PI * 2);
      this.lineaH.setVisible(true);
      this.audio.toque();
    } else if (this.etapa === 1) {
      this.etapa = 2;
      this.lanzar(this.xFija, this.lineaH.y);
    }
  }

  // El dardo vuela desde abajo hasta el cruce y se clava
  lanzar(x, y) {
    this.audio.zas();
    this.lineaH.setTint(0xff4d5a);
    const d = this.add.graphics().setDepth(5);
    const dibujar = (px, py, k) => {
      d.clear();
      d.lineStyle(8, COLOR.OSCURO, 1).lineBetween(px, py, px + 18 * k, py + 70 * k);
      d.lineStyle(4, 0xcfd4dc, 1).lineBetween(px, py, px + 18 * k, py + 70 * k);
      d.fillStyle(0xff4d5a, 1).fillTriangle(px + 12 * k, py + 60 * k, px + 30 * k, py + 82 * k, px + 2 * k, py + 84 * k);
    };
    const desde = { x: this.cx + 60, y: this.H + 60 };
    this.tweens.addCounter({
      from: 0, to: 1, duration: 140, ease: 'Quad.easeIn',
      onUpdate: tw => { const p = tw.getValue(); dibujar(desde.x + (x - desde.x) * p, desde.y + (y - desde.y) * p, 1.6 - 0.6 * p); },
      onComplete: () => {
        dibujar(x, y, 1);
        if (this.decidido) return;                    // se acabó el tiempo en el vuelo
        const dist = Math.hypot(x - this.bx, y - this.by);
        if (dist <= this.centro) {
          this.ganar();
          this.audio.clavar();
          this.chispas(x, y, 14);
          this.cartel(this.cx, this.arriba + 110, dist <= this.centro * 0.35 ? '¡JUSTO AL CENTRO!' : '¡EN EL BLANCO!', COLOR.ORO, 56);
        } else {
          this.perder();
          this.audio.clavar();
          this.cartel(this.cx, this.arriba + 110, '¡AFUERA!', COLOR.MAL, 62);
        }
      },
    });
  }

  paso(dt, t) {
    if (this.etapa >= 2 || this.decidido) return;
    this.fase += this.w * dt;
    const off = Math.sin(this.fase) * this.amp;
    if (this.etapa === 0) this.lineaV.x = this.bx + off;
    else {
      this.lineaH.y = this.by + off;
      this.lineaV.x = this.xFija;
    }
  }
}
