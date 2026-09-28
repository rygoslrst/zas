// ¡APILÁ! — Una caja se hamaca arriba: tocá para soltarla sobre la pila.
import { Micro } from '../escenas/Micro.js';
import { COLOR } from '../config.js';

const LADO = 96;             // tamaño de cada caja

export class Apila extends Micro {
  static ORDEN = '¡APILÁ!';
  static CONTROL = 'tocar';

  armar() {
    this.tema('cielo');
    this.yPiso = this.bajo - 20;
    this.piso(this.yPiso, 0x8ac926);
    // Cada caja lleva ~0,8 s (esperar, caer, asentarse): se piden las que entran en el tiempo
    this.necesarias = Math.max(2, Math.min([2, 3, 3][this.nivel - 1], Math.floor(this.dur / 0.85)));
    this.amplitud = [140, 170, 190][this.nivel - 1];
    this.ritmo = [2.2, 2.8, 3.3][this.nivel - 1] * this.vel;
    // La primera caja ya está en el piso
    this.pila = [{ x: this.cx, img: this.emoji('caja', this.cx, this.yPiso - LADO / 2, LADO) }];
    this.puestas = 0;
    this.nueva();
    this.alTocar(() => {
      if (this.cayendo || !this.colgada) return;
      this.cayendo = this.colgada;
      this.colgada = null;
      this.cayendo.vy = 0;
      this.audio.zas();
    });
  }

  get yTope() { return this.yPiso - this.pila.length * LADO; }

  nueva() {
    const y = Math.max(this.arriba + 90, this.yTope - 270);     // cerca de la pila: cae rápido
    this.fase = Math.random() * Math.PI * 2;
    this.colgada = { img: this.emoji('caja', this.cx, y, LADO), x: this.cx, y };
    this.cuerda = this.cuerda || this.rect(this.cx, 0, 4, 1, 0x555555).setOrigin(0.5, 0);
  }

  paso(dt, t) {
    const c = this.colgada;
    if (c) {
      c.x = this.cx + Math.sin(t * this.ritmo + this.fase) * this.amplitud;
      c.img.setPosition(c.x, c.y).setAngle(Math.sin(t * this.ritmo + this.fase) * -8);
      this.cuerda.setVisible(true).setPosition(c.x, 0).setDisplaySize(4, c.y - LADO / 2);
    } else if (this.cuerda) this.cuerda.setVisible(false);

    const f = this.cayendo;
    if (!f) return;
    f.vy += 2600 * this.vel * dt;
    f.y += f.vy * dt;
    f.img.setPosition(f.x, f.y).setAngle(f.img.angle * 0.9);
    const tope = this.pila[this.pila.length - 1];
    const yApoyo = this.yTope - LADO / 2;
    if (f.y >= yApoyo && !f.fuera) {
      if (Math.abs(f.x - tope.x) <= LADO * 0.55) {
        // Apoyó: queda donde cayó
        f.img.setPosition(f.x, yApoyo).setAngle(0);
        this.pila.push({ x: f.x, img: f.img });
        this.cayendo = null;
        this.rebote(f.img, 1.18);
        this.humo(f.x - LADO / 2, yApoyo + LADO / 2, 50);
        this.audio.acierto(this.puestas++);
        if (this.puestas >= this.necesarias) {
          this.ganar();
          this.confeti(this.cx, yApoyo - 40);
          this.cartel(this.cx, this.yTope - 90, '¡QUÉ TORRE!', COLOR.ORO, 60);
        } else this.time.delayedCall(90, () => { if (!this.decidido) this.nueva(); });
      } else {
        // Se sale de la pila: cae de costado
        f.fuera = true;
        f.giro = Math.sign(f.x - tope.x) || 1;
      }
    }
    if (f.fuera) {
      f.x += f.giro * 160 * dt;
      f.img.angle += f.giro * 400 * dt;
      if (!this.decidido) { this.perder(); this.audio.golpe(); this.cartel(this.cx, this.yTope - 90, '¡SE CAYÓ!', COLOR.MAL); }
    }
  }
}
