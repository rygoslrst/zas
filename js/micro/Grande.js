// ¡EL MÁS GRANDE! / ¡EL MÁS CHICO! — Varios iguales de distinto tamaño: tocá el pedido.
import { Micro } from '../escenas/Micro.js';

const COSAS = ['pelota', 'dona', 'sandia', 'gato', 'panda', 'hongo', 'dado', 'huevo', 'unicornio', 'robot', 'leon', 'globo'];

export class Grande extends Micro {
  static ORDEN = '¡EL MÁS GRANDE!';
  static ICONO = 'sandia';          // en la galería
  static CONTROL = 'tocar';
  static VARIANTES = [{ orden: '¡EL MÁS GRANDE!', grande: true }, { orden: '¡EL MÁS CHICO!', grande: false }];

  armar() {
    this.tema('escenario');
    const grande = this.variante ? this.variante.grande : true;
    const n = [4, 5, 6][this.nivel - 1];
    const factor = [1.5, 1.28, 1.16][this.nivel - 1];     // cuánto se distingue del resto
    const cosa = this.elegir(COSAS);
    const lugares = this.lugares(n, 90, this.arriba + 110, this.W - 90, this.bajo - 80, 150);
    this.elegido = Math.floor(Math.random() * lugares.length);
    this.cosas = lugares.map((p, i) => {
      let tam;
      if (grande) tam = i === this.elegido ? 112 * factor : this.azar(80, 112);
      else tam = i === this.elegido ? 96 / factor : this.azar(96, 130);
      return { ...p, tam, img: this.emoji(cosa, p.x, p.y, tam), fase: this.azar(0, 6) };
    });
    this.alTocar((x, y) => {
      let mejor = null, dMejor = 1e9;
      for (const c of this.cosas) {
        const d = Math.hypot(c.x - x, c.y - y);
        if (d < Math.max(60, c.tam * 0.6) && d < dMejor) { dMejor = d; mejor = c; }
      }
      if (!mejor) return;
      const bueno = this.cosas[this.elegido];
      if (mejor === bueno) { this.ganar(); this.chispas(mejor.x, mejor.y, 10); this.rebote(mejor.img); }
      else {
        this.perder();
        mejor.img.setTint(0xff6b6b);
        this.tweens.add({ targets: bueno.img, angle: 20, duration: 90, yoyo: true, repeat: 3 });
      }
    });
  }

  paso(dt, t) {
    // Todos laten igual: el orden de tamaños no cambia, pero cuesta más comparar
    for (const c of this.cosas) c.img.setDisplaySize(c.tam * (1 + Math.sin(t * 4 + c.fase) * 0.05), c.tam * (1 + Math.sin(t * 4 + c.fase) * 0.05));
  }
}
