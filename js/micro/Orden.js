// ¡EN ORDEN! — Burbujas numeradas: tocalas de la más chica a la más grande.
import { Micro } from '../escenas/Micro.js';
import { COLOR } from '../config.js';

export class Orden extends Micro {
  static ORDEN = '¡EN ORDEN!';
  static CONTROL = 'tocar';

  armar() {
    const fondo = this.fondo();
    const n = [3, 4, 5][this.nivel - 1];
    const colores = this.mezclar(COLOR.FONDOS.filter(c => c !== fondo));
    // Desde el nivel 2 los números no son 1, 2, 3...: saltean
    const numeros = [];
    let v = this.nivel >= 2 ? this.entero(1, 5) : 1;
    for (let i = 0; i < n; i++) { numeros.push(v); v += this.nivel >= 2 ? this.entero(1, 4) : 1; }
    const lugares = this.lugares(n, 90, this.arriba + 100, this.W - 90, this.bajo - 60, 140);
    this.burbujas = this.mezclar(numeros).map((num, i) => {
      const p = lugares[i];
      const fondoB = this.circulo(p.x, p.y, 56, colores[i % colores.length]);
      const anillo = this.add.image(p.x, p.y, 'atlas', 'anillo').setDisplaySize(118, 118).setTint(0xffffff);
      const texto = this.texto(p.x, p.y, String(num), 68);
      return { ...p, num, partes: [fondoB, anillo, texto], vx: this.azar(-40, 40), vy: this.azar(-40, 40), viva: true };
    });
    this.orden = [...numeros].sort((a, b) => a - b);
    this.siguiente = 0;
    this.alTocar((x, y) => {
      const b = this.burbujas.find(o => o.viva && Math.hypot(o.x - x, o.y - y) < 64);
      if (!b) return;
      if (b.num === this.orden[this.siguiente]) {
        b.viva = false;
        this.audio.acierto(this.siguiente);
        this.chispas(b.x, b.y, 8);
        this.tweens.add({ targets: b.partes, alpha: 0, scale: '*=1.4', duration: 160, onComplete: () => b.partes.forEach(o => o.destroy()) });
        this.siguiente++;
        if (this.siguiente >= this.orden.length) this.ganar();
      } else {
        this.perder();
        b.partes[0].setTint(COLOR.MAL);
        const bien = this.burbujas.find(o => o.num === this.orden[this.siguiente]);
        this.tweens.add({ targets: bien.partes, scale: '*=1.25', duration: 120, yoyo: true, repeat: 2 });
      }
    });
  }

  paso(dt) {
    if (this.nivel < 3 || this.decidido) return;
    // En el nivel 3 las burbujas se mueven
    for (const b of this.burbujas) {
      if (!b.viva) continue;
      b.x += b.vx * this.vel * dt; b.y += b.vy * this.vel * dt;
      if (b.x < 70 || b.x > this.W - 70) b.vx *= -1;
      if (b.y < this.arriba + 80 || b.y > this.bajo - 50) b.vy *= -1;
      for (const o of b.partes) o.setPosition(b.x, b.y);
    }
  }
}
