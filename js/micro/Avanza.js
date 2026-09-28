// ¡QUE NO TE VEA! — Mantené apretado para avanzar hasta la bandera, pero cuando
// el guardia se despierta, quieto. Si te ve moviéndote, perdiste.
import { Micro } from '../escenas/Micro.js';
import { COLOR } from '../config.js';

export class Avanza extends Micro {
  static ORDEN = '¡QUE NO TE VEA!';
  static CONTROL = 'mantener';

  armar() {
    this.fondo(0xffe0a3, 'rayas');
    this.yPista = this.cy + 170;
    this.x0 = 70;
    this.meta = 400;
    this.rect(this.cx, this.yPista + 40, this.W, 16, 0xc9971a);
    this.rect(this.meta + 20, this.yPista + 10, 8, 80, 0xffffff);
    this.emoji('bandera', this.meta + 40, this.yPista - 40, 80);
    // El guardia: duerme (se puede avanzar), bosteza (aviso) y mira (quieto)
    this.guardia = this.emoji('dormido', 430, this.cy - 110, 170);
    this.ojos = this.emoji('ojos', 430, this.cy - 230, 90).setVisible(false);
    this.estadoG = 'duerme';
    this.cambio = 1.3 / this.vel;           // la primera siesta es larga: da tiempo a leer
    // El aviso (bostezo) no se achica tanto con la velocidad: tiene que dar
    // tiempo a reaccionar (~0,2 s) aun en lo más rápido.
    this.aviso = [0.45, 0.38, 0.32][this.nivel - 1] / Math.sqrt(this.vel);
    this.tMira = 0;
    // Hay que avanzar entre un tercio y la mitad del tiempo
    this.rapidez = (this.meta - this.x0) / ((this.dur - 0.3) * [0.35, 0.4, 0.45][this.nivel - 1]);
    this.x = this.x0;
    this.corredor = this.emoji('corredor', this.x, this.yPista, 100);
    this.mirar(this.corredor, 'corredor', 1);
    this.apretado = false;
    this.alTocar(() => { this.apretado = true; });
    this.input.on('pointerup', () => { this.apretado = false; });
    this.input.on('pointerupoutside', () => { this.apretado = false; });
  }

  paso(dt, t) {
    // El guardia
    if (!this.decidido && t >= this.cambio) {
      if (this.estadoG === 'duerme') {
        this.estadoG = 'aviso';
        this.guardia.setTexture('emoji', 'boca').setDisplaySize(170, 170);
        this.cambio = t + this.aviso;
      } else if (this.estadoG === 'aviso') {
        // En el nivel 3, a veces es un amague y vuelve a dormir
        if (this.nivel >= 3 && Math.random() < 0.3) { this.dormir(t); }
        else {
          this.estadoG = 'mira';
          this.tMira = t;
          this.guardia.setTexture('emoji', 'enojado').setDisplaySize(170, 170);
          this.ojos.setVisible(true);
          this.cambio = t + this.azar(0.45, 0.7) / this.vel;
        }
      } else {
        this.dormir(t);
      }
    }
    // El corredor
    if (this.decidido) {
      if (this.resultado === 'perdio') this.corredor.angle = Math.max(-90, this.corredor.angle - 300 * dt);
      return;
    }
    if (this.apretado) {
      if (this.estadoG === 'mira' && t - this.tMira > 0.06) {      // 60 ms de perdón
        this.perder();
        this.cartel(430, this.cy - 300, '¡TE VI!', COLOR.MAL, 64);
        this.audio.golpe();
        return;
      }
      this.x += this.rapidez * dt;
      this.corredor.setPosition(this.x, this.yPista - Math.abs(Math.sin(t * 16)) * 8);
      if (this.x >= this.meta) {
        this.ganar();
        this.chispas(this.x, this.yPista - 40, 12);
        this.cartel(this.cx, this.cy - 30, '¡LLEGASTE!', COLOR.ORO, 64);
      }
    }
  }

  dormir(t) {
    this.estadoG = 'duerme';
    this.guardia.setTexture('emoji', 'dormido').setDisplaySize(170, 170);
    this.ojos.setVisible(false);
    this.cambio = t + this.azar(0.9, 1.4) / this.vel;
  }
}
