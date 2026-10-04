// ¡DISPARÁ! — Duelo del oeste: esperá la señal y tocá antes que el otro.
// Si tocás antes de tiempo, perdiste. Desde el nivel 2 hay señales falsas.
import { Micro } from '../escenas/Micro.js';
import { COLOR } from '../config.js';

export class Duelo extends Micro {
  static ORDEN = '¡DISPARA!';
  static ICONO = 'vaquero';          // en la galería
  static CONTROL = 'tocar';

  armar() {
    this.tema('atardecer');
    this.emoji('sol', this.cx, this.cy - 40, 170).setAlpha(0.9);
    this.emoji('cactus', 60, this.bajo - 120, 90);
    this.emoji('cactus', 490, this.bajo - 150, 70);
    const yPiso = this.bajo - 60;
    this.piso(yPiso, 0xd9a066);
    this.yo = this.emoji('vaquero', 110, yPiso - 60, 120);
    this.otro = this.emoji('ogro', 430, yPiso - 60, 120);
    this.sombra(110, yPiso, 110); this.sombra(430, yPiso, 110);
    this.pistolaYo = this.emoji('pistola', 180, yPiso - 40, 60).setFlipX(true).setVisible(false);
    this.pistolaOtro = this.emoji('pistola', 360, yPiso - 40, 60).setVisible(false);
    this.senal = this.texto(this.cx, this.cy - 200, '', 110);
    this.espera = this.texto(this.cx, this.cy - 200, 'ESPERA...', 60, 0xfff1d6);
    // Cuándo sale la señal y cuánto hay para reaccionar
    this.tSenal = this.azar(1.1, 2.0) / this.vel + 0.2;
    this.ventana = [0.7, 0.58, 0.5][this.nivel - 1] / Math.sqrt(this.vel);   // hay que poder reaccionar (~0,3 s)
    this.tFalsa = this.nivel >= 2 && Math.random() < 0.7 ? this.tSenal - this.azar(0.35, 0.6) / this.vel : -1;
    this.alTocar(() => this.tiro());
  }

  tiro() {
    const t = this.t;
    this.pistolaYo.setVisible(true);
    this.audio.golpe();
    if (t < this.tSenal) {
      this.perder();
      this.cartel(this.cx, this.cy - 90, '¡MUY PRONTO!', COLOR.MAL, 60);
      this.yo.setTexture('emoji', 'asustado');
    } else {
      this.ganar();
      this.otro.setTexture('emoji', 'estrellitas');
      this.tweens.add({ targets: this.otro, angle: 90, y: this.otro.y + 30, duration: 300 });
      this.humo(210, this.pistolaYo.y - 10, 60);
      this.cartel(this.cx, this.cy - 90, '¡BANG!', COLOR.ORO, 80);
    }
  }

  paso(dt, t) {
    if (this.decidido) return;
    // La señal falsa (en gris, y dice otra cosa)
    if (this.tFalsa > 0 && t >= this.tFalsa && t < this.tFalsa + 0.3) this.senal.setText('¿YA?').setTint(0x9aa0a6).setVisible(true);
    else if (t < this.tSenal) this.senal.setVisible(false);
    if (t >= this.tSenal && !this.salio) {
      this.salio = true;
      this.espera.setVisible(false);
      this.senal.setText('¡YA!').setTint(COLOR.MAL).setVisible(true).setScale(0.4);
      this.tweens.add({ targets: this.senal, scale: 1, duration: 120, ease: 'Back.easeOut' });
      this.audio.tic(true);
    }
    // Si tardás demasiado, dispara el otro
    if (this.salio && t > this.tSenal + this.ventana) {
      this.pistolaOtro.setVisible(true);
      this.audio.golpe();
      this.perder();
      this.yo.setTexture('emoji', 'estrellitas');
      this.tweens.add({ targets: this.yo, angle: -90, y: this.yo.y + 30, duration: 300 });
      this.cartel(this.cx, this.cy - 90, '¡MUY TARDE!', COLOR.MAL, 60);
    }
    this.espera.setAlpha(0.6 + Math.sin(t * 8) * 0.4);
  }
}
