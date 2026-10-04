// ¡SEPARA! — Van saliendo cosas de a una: la comida va a la canasta (a la
// izquierda) y lo que no se come, a la caja (a la derecha). Se arrastran o se
// lanzan hacia su lado. Una equivocada, perdiste.
import { Micro } from '../escenas/Micro.js';
import { COLOR } from '../config.js';

const COMIDA = ['manzana', 'banana', 'pizza', 'hamburguesa', 'sandia', 'uva', 'frutilla', 'cereza', 'dona',
  'galleta', 'helado', 'pancho', 'zanahoria', 'tomate', 'naranja', 'limon', 'anana', 'durazno', 'huevo'];
const COSAS = ['pelota', 'llave', 'martillo', 'tijera', 'reloj', 'paraguas', 'dado', 'candado', 'foco', 'camara',
  'guante', 'escoba', 'campana', 'iman', 'roca', 'bici', 'auto', 'regalo'];
const LANZADA = 70;               // soltarla tras moverla esto hacia un lado la lanza a ese lado

export class Separa extends Micro {
  static ORDEN = '¡SEPARA!';
  static ICONO = 'caja';          // en la galería
  static CONTROL = 'arrastrar';

  armar() {
    this.tema('cocina');
    const n = [3, 4, 5][this.nivel - 1];
    // Mitad comida, mitad cosas, en desorden (nunca todas iguales)
    const comidas = this.mezclar(COMIDA), cosas = this.mezclar(COSAS);
    this.cola = [];
    for (let i = 0; i < n; i++) {
      const esComida = i === 0 ? Math.random() < 0.5 : i === 1 ? !this.cola[0].esComida : Math.random() < 0.5;
      this.cola.push({ nombre: esComida ? comidas.pop() : cosas.pop(), esComida });
    }
    this.cola = this.mezclar(this.cola);
    // La mesa y los dos lugares, con su cartel
    const yMesa = this.cy + 180;
    this.mesada(yMesa, 0xc98a52);
    this.yLugar = yMesa - 60;
    this.lugares = [
      { lado: -1, x: 95, comida: true, img: this.emoji('canasta', 95, this.yLugar, 170) },
      { lado: 1, x: this.W - 95, comida: false, img: this.emoji('caja', this.W - 95, this.yLugar, 160) },
    ];
    this.texto(95, this.yLugar - 120, 'COMIDA', 40, COLOR.ORO);
    this.texto(this.W - 95, this.yLugar - 120, 'COSAS', 40, 0x7fd3ff);
    this.origen = { x: this.cx, y: this.cy - 30 };
    // Flechas suaves hacia los costados, al lado de la cosa que espera
    this.add.image(this.cx - 120, this.origen.y, 'atlas', 'flecha').setDisplaySize(50, 50).setAngle(180).setAlpha(0.4);
    this.add.image(this.cx + 120, this.origen.y, 'atlas', 'flecha').setDisplaySize(50, 50).setAlpha(0.4);
    this.cuenta = this.texto(this.cx, this.arriba + 110, '', 44);
    this.listas = 0;
    this.pieza = null;
    this.agarre = null;
    this.siguiente();
    this.alTocar((x, y) => {
      if (!this.pieza || this.pieza.yendo || Math.hypot(this.pieza.img.x - x, this.pieza.img.y - y) > 110) return;
      this.agarre = { x0: x, dx: this.pieza.img.x - x, dy: this.pieza.img.y - y };
      this.tweens.killTweensOf(this.pieza.img);
      this.pieza.img.setDisplaySize(150, 150);
    });
    this.alMover((x, y) => { if (this.agarre && this.pieza) this.pieza.img.setPosition(x + this.agarre.dx, y + this.agarre.dy); });
    this.alSoltar(x => this.soltar(x));
  }

  siguiente() {
    const e = this.cola[this.listas];
    this.cuenta.setText(`${this.listas} / ${this.cola.length}`);
    if (!e) return;
    const img = this.emoji(e.nombre, this.origen.x, this.origen.y, 10).setDepth(5);
    this.tweens.add({ targets: img, displayWidth: 140, displayHeight: 140, duration: 140, ease: 'Back.easeOut' });
    this.pieza = { ...e, img, yendo: false };
  }

  soltar(x) {
    const a = this.agarre, p = this.pieza;
    this.agarre = null;
    if (!a || !p) return;
    // ¿Hacia qué lado? Encima de un lugar, o lanzada hacia un costado
    const sobre = this.lugares.find(l => Math.abs(p.img.x - l.x) < 110 && Math.abs(p.img.y - this.yLugar) < 150);
    const lanzada = Math.abs(x - a.x0) >= LANZADA ? (x > a.x0 ? 1 : -1) : 0;
    const lugar = sobre || (lanzada ? this.lugares.find(l => l.lado === lanzada) : null);
    if (!lugar) {
      this.tweens.add({ targets: p.img, x: this.origen.x, y: this.origen.y, displayWidth: 140, displayHeight: 140, duration: 150 });
      return;
    }
    p.yendo = true;
    this.tweens.add({ targets: p.img, x: lugar.x, y: this.yLugar - 20, displayWidth: 90, displayHeight: 90, duration: 130, ease: 'Quad.easeIn' });
    if (lugar.comida !== p.esComida) {
      this.perder();
      this.cartel(lugar.x, this.yLugar - 180, p.esComida ? '¡ESO SE COME!' : '¡ESO NO SE COME!', COLOR.MAL, 38);
      return;
    }
    this.audio.acierto(this.listas);
    this.rebote(lugar.img, 1.15);
    this.listas++;
    this.pieza = null;
    if (this.listas >= this.cola.length) {
      this.cuenta.setText(`${this.listas} / ${this.cola.length}`);
      this.ganar();
      this.chispas(this.cx, this.yLugar - 60, 12);
      this.cartel(this.cx, this.cy - 200, '¡ORDENADO!', COLOR.ORO, 60);
    } else {
      this.time.delayedCall(90, () => { if (!this.decidido) this.siguiente(); });
    }
  }

  paso(dt, t) {
    // La pieza que espera, se mece un poco
    const p = this.pieza;
    if (p && !this.agarre && !p.yendo && !this.decidido) p.img.setAngle(Math.sin(t * 6) * 6);
  }
}
