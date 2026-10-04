// ¿CUÁNTOS HAY? — Contá los emoji y tocá el número correcto.
import { Micro } from '../escenas/Micro.js';
import { COLOR } from '../config.js';

export class Cuantos extends Micro {
  static ORDEN = '¿CUÁNTOS HAY?';
  static ICONO = 'mariquita';          // en la galería
  static CONTROL = 'tocar';
  static PULSOS = 10;

  armar() {
    const cosa = this.elegir(['oveja', 'pollito', 'estrella', 'dona', 'pez', 'mariquita', 'globo', 'cerdo', 'pinguino']);
    // El lugar según lo que hay que contar (los animales de granja, en el campo)
    const escena = { pez: 'mar', pinguino: 'mar', estrella: 'noche', globo: 'cielo', dona: 'cocina' }[cosa];
    if (escena) this.tema(escena);
    else { this.tema('cielo'); this.piso(this.cy + 150, 0x7cc95a); }
    const [min, max] = [[2, 4], [3, 6], [5, 8]][this.nivel - 1];
    const k = this.entero(min, max);
    // Lugares sin encimarse, en la parte de arriba
    this.cosas = [];
    for (let intento = 0; this.cosas.length < k && intento < 400; intento++) {
      const x = this.azar(70, this.W - 70), y = this.azar(this.arriba + 70, this.cy + 110);
      if (this.cosas.every(c => Math.hypot(c.x - x, c.y - y) > 100)) {
        this.cosas.push({ img: this.emoji(cosa, x, y, 88), x, y, rumbo: this.azar(0, 6.3), fase: this.azar(0, 6) });
      }
    }
    const correcto = this.cosas.length;
    // Tres botones: el correcto y dos vecinos
    const otros = this.mezclar([-2, -1, 1, 2].map(d => correcto + d).filter(v => v >= 1)).slice(0, 2);
    const opciones = this.mezclar([correcto, ...otros]);
    const by = this.bajo - 60;
    this.botones = opciones.map((v, i) => ({ ...this.boton(this.cx + (i - 1) * 160, by, 64, v), v }));
    this.alTocar((x, y) => {
      const b = this.botones.find(o => Math.hypot(o.x - x, o.y - y) < 70);
      if (!b) return;
      if (b.v === correcto) {
        this.ganar();
        b.fondo.setTint(COLOR.BIEN);
        this.chispas(b.x, b.y, 10);
      } else {
        this.perder();
        b.fondo.setTint(COLOR.MAL);
        const bueno = this.botones.find(o => o.v === correcto);
        bueno.fondo.setTint(COLOR.BIEN);
      }
      this.rebote(b.fondo);
    });
  }

  paso(dt, t) {
    // En el nivel 3 se mueven un poco: contar cuesta más
    const mueve = this.nivel >= 3 ? 26 : 0;
    for (const c of this.cosas) {
      c.img.setPosition(c.x + Math.cos(t * 1.6 + c.fase) * mueve, c.y + Math.sin(t * 2.2 + c.fase) * (mueve + 4))
        .setAngle(Math.sin(t * 3 + c.fase) * 8);
    }
  }
}
