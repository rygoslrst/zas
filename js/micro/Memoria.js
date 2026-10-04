// ¿DÓNDE ESTABA? — Mirá las cartas antes de que se den vuelta y tocá la pedida.
import { Micro } from '../escenas/Micro.js';
import { COLOR } from '../config.js';

const COSAS = ['sapo', 'gato', 'pizza', 'cohete', 'unicornio', 'pelota', 'hongo', 'robot', 'banana', 'pulpo', 'dado', 'panda'];

export class Memoria extends Micro {
  static ORDEN = '¿DÓNDE ESTABA?';
  static ICONO = 'hongo';          // en la galería
  static CONTROL = 'tocar';
  static PULSOS = 10;

  armar() {
    this.tema('madera');
    const n = [3, 4, 5][this.nivel - 1];
    const cosas = this.mezclar(COSAS).slice(0, n);
    this.buscada = this.elegir(cosas);
    // Cartas grandes: en una fila si son 3, en dos si son 4 o 5
    const filas = n <= 3 ? [n] : n === 4 ? [2, 2] : [3, 2];
    const anchoC = 140, altoC = 176, sepX = anchoC + 22, sepY = altoC + 22;
    const y0 = this.cy + 110 - ((filas.length - 1) * sepY) / 2;
    const lugares = [];
    filas.forEach((cuantas, f) => {
      for (let i = 0; i < cuantas; i++) lugares.push([this.cx + (i - (cuantas - 1) / 2) * sepX, y0 + f * sepY]);
    });
    this.cartas = cosas.map((nombre, i) => {
      const [x, y] = lugares[i];
      this.rect(x + 6, y + 8, anchoC, altoC, COLOR.OSCURO, 0.25);
      const dorso = this.rect(x, y, anchoC, altoC, 0x7b61ff).setVisible(false);
      const signo = this.texto(x, y, '?', 90).setVisible(false);
      const marco = this.rect(x, y, anchoC, altoC, 0xffffff, 0.94);
      const img = this.emoji(nombre, x, y, 108);
      return { x, y, nombre, img, dorso, signo, marco, ancho: anchoC, alto: altoC };
    });
    // Las cartas se dan vuelta después de un momento
    // (se cuenta desde que se va la consigna, que tapa un poco las cartas)
    this.tDarVuelta = Math.max(0.6, 0.95 / this.vel) + Math.max(0.7, 1.2 / this.vel);
    this.vueltas = false;
    // Arriba, lo que se busca (aparece cuando se dan vuelta)
    this.globo = this.circulo(this.cx, this.arriba + 170, 90, 0xffffff).setVisible(false);
    this.pedido = this.emoji(this.buscada, this.cx, this.arriba + 170, 120).setVisible(false);
    this.alTocar((x, yT) => {
      if (!this.vueltas) return;
      const c = this.cartas.find(o => Math.abs(o.x - x) < o.ancho / 2 && Math.abs(o.y - yT) < o.alto / 2);
      if (!c) return;
      this.destapar(c);
      if (c.nombre === this.buscada) {
        this.ganar();
        this.chispas(c.x, c.y, 12);
        this.rebote(c.img, 1.3);
      } else {
        this.perder();
        c.marco.setTint(COLOR.MAL);
        this.destapar(this.cartas.find(o => o.nombre === this.buscada));
      }
    });
  }

  destapar(c) {
    c.dorso.setVisible(false); c.signo.setVisible(false);
    c.marco.setVisible(true); c.img.setVisible(true);
  }

  paso(dt, t) {
    if (!this.vueltas && t >= this.tDarVuelta) {
      this.vueltas = true;
      this.audio.zas();
      for (const c of this.cartas) {
        c.img.setVisible(false); c.marco.setVisible(false);
        c.dorso.setVisible(true); c.signo.setVisible(true);
        c.dorso.displayWidth = 4;
        this.tweens.add({ targets: c.dorso, displayWidth: c.ancho, duration: 120 });
      }
      this.globo.setVisible(true).setScale(0.1);
      this.tweens.add({ targets: this.globo, scale: 180 / 128, duration: 180, ease: 'Back.easeOut' });
      this.pedido.setVisible(true);
      this.rebote(this.pedido, 1.3);
    }
    if (this.vueltas) this.pedido.setAngle(Math.sin(t * 6) * 8);
  }
}
