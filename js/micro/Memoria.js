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
    const paso = Math.min(170, 500 / n), y = this.cy + 150;
    this.cartas = cosas.map((nombre, i) => {
      const x = this.cx + (i - (n - 1) / 2) * paso;
      const dorso = this.rect(x, y, paso * 0.86, 150, 0x7b61ff).setVisible(false);
      const signo = this.texto(x, y, '?', 80).setVisible(false);
      const marco = this.rect(x, y, paso * 0.86, 150, 0xffffff, 0.92);
      const img = this.emoji(nombre, x, y, Math.min(100, paso * 0.66));
      return { x, y, nombre, img, dorso, signo, marco, ancho: paso * 0.86 };
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
      const c = this.cartas.find(o => Math.abs(o.x - x) < o.ancho / 2 && Math.abs(o.y - yT) < 80);
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
