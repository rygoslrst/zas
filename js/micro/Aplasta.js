// ¡APLASTÁ! — Un bicho da vueltas por la pantalla: tocalo.
import { Micro } from '../escenas/Micro.js';

export class Aplasta extends Micro {
  static ORDEN = '¡APLASTA!';
  static ICONO = 'cucaracha';          // en la galería
  static CONTROL = 'tocar';

  armar() {
    this.tema('cocina');
    // Una cocina: azulejos, ventana, la mesada y una torta que el bicho quiere
    const yMesa = this.bajo - 150;
    this.azulejos(0, yMesa, 0xe6f2f7);
    this.ventana(150, Math.max(this.arriba + 170, 170), 170, 150);
    this.mesada(yMesa);
    this.sombra(395, yMesa + 12, 150, 0.25);
    this.add.image(395, yMesa + 4, 'atlas', 'circulo').setDisplaySize(170, 34).setTint(0xffffff);
    this.emoji('torta', 395, yMesa - 40, 110);
    this.emoji('planta', 470, Math.max(this.arriba + 170, 170) + 30, 70);
    this.vineta(0.3);
    const bicho = this.elegir(['mosquito', 'cucaracha', 'mariquita', 'mosca']);
    const n = this.nivel >= 3 ? 2 : 1;
    const rapidez = [210, 270, 290][this.nivel - 1] * this.vel;
    this.bichos = [];
    for (let i = 0; i < n; i++) {
      const x = this.elegir([90, 450]) + this.azar(-20, 20);
      const y = this.azar(this.arriba + 100, this.bajo - 100);
      this.bichos.push({
        img: this.emoji(bicho, x, y, 92), x, y, rumbo: this.azar(0, Math.PI * 2),
        rapidez: rapidez * this.azar(0.9, 1.1), giro: 0, vivo: true,
      });
    }
    this.alTocar((x, y) => {
      for (const b of this.bichos) {
        if (b.vivo && Math.hypot(b.x - x, b.y - y) < 64) { this.aplastar(b); return; }
      }
      this.audio.zas();           // manotazo al aire
    });
  }

  aplastar(b) {
    b.vivo = false;
    this.circulo(b.x, b.y + 6, 46, 0x3b2a1a, 0.55).setScale(0.8, 0.45).setDepth(-1);
    b.img.setScale(b.img.scaleX * 1.25, b.img.scaleY * 0.35).setTint(0x555555);
    this.audio.plaf();
    this.cartel(b.x, b.y - 70, '¡PLAF!');
    this.chispas(b.x, b.y, 6, 0x7a5230);
    if (this.bichos.every(o => !o.vivo)) this.ganar();
  }

  paso(dt, t) {
    const x0 = 60, x1 = this.W - 60, y0 = this.arriba + 70, y1 = this.bajo - 50;
    for (const b of this.bichos) {
      if (!b.vivo) continue;
      // Cambia de rumbo cada tanto, de golpe: así se mueve un bicho
      b.giro -= dt;
      if (b.giro <= 0) { b.rumbo += this.azar(-1.9, 1.9); b.giro = this.azar(0.22, 0.55) / this.vel; }
      b.x += Math.cos(b.rumbo) * b.rapidez * dt;
      b.y += Math.sin(b.rumbo) * b.rapidez * dt;
      if (b.x < x0 || b.x > x1) { b.rumbo = Math.PI - b.rumbo; b.x = Math.max(x0, Math.min(x1, b.x)); }
      if (b.y < y0 || b.y > y1) { b.rumbo = -b.rumbo; b.y = Math.max(y0, Math.min(y1, b.y)); }
      b.img.setPosition(b.x, b.y).setAngle(Math.sin(t * 40) * 8);
    }
  }
}
