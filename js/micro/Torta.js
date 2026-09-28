// JEFE — ¡DEFENDÉ LA TORTA! Vienen hormigas de todos lados: aplastalas antes
// de que lleguen. Si llegan tres, se la comen. Aguantá hasta que suene la bomba.
import { Micro } from '../escenas/Micro.js';
import { COLOR } from '../config.js';

export class Torta extends Micro {
  static ORDEN = '¡DEFIENDE EL PASTEL!';
  static CONTROL = 'tocar';
  static PULSOS = 24;
  static GANA_AL_FINAL = true;
  static JEFE = true;

  armar() {
    this.tema('cocina');
    this.tx = this.cx; this.ty = this.cy + 40;
    this.circulo(this.tx, this.ty + 10, 110, 0xffffff, 0.9);
    this.circulo(this.tx, this.ty + 10, 96, 0xf2e6d8);
    this.torta = this.emoji('torta', this.tx, this.ty - 10, 150);
    this.vidasTorta = 3;
    this.marcas = [0, 1, 2].map(i => this.emoji('torta', this.cx + (i - 1) * 56, this.arriba + 60, 44));
    // Oleadas: cada vez más seguidas y más rápidas
    this.total = [12, 16, 20][this.nivel - 1];
    this.rapidez = [90, 105, 120][this.nivel - 1] * Math.sqrt(this.vel);
    const primera = 0.8, ultima = this.dur - 2.8;
    this.hormigas = [];
    for (let i = 0; i < this.total; i++) {
      const u = i / Math.max(1, this.total - 1);
      this.hormigas.push({ tSale: primera + (ultima - primera) * Math.pow(u, 0.85), img: null, viva: true });
    }
    this.alTocar((x, y) => {
      let mejor = null, dMejor = 62;
      for (const h of this.hormigas) {
        if (!h.img || !h.viva) continue;
        const d = Math.hypot(h.x - x, h.y - y);
        if (d < dMejor) { dMejor = d; mejor = h; }
      }
      if (!mejor) { this.audio.zas(); return; }
      mejor.viva = false;
      this.circulo(mejor.x, mejor.y + 4, 22, 0x3b2a1a, 0.5).setScale(0.5, 0.25);
      mejor.img.setScale(mejor.img.scaleX * 1.2, mejor.img.scaleY * 0.35).setTint(0x555555);
      this.audio.plaf();
      this.chispas(mejor.x, mejor.y, 5, 0x7a5230);
    });
  }

  alGanar() {
    this.confeti(this.tx, this.ty - 60);
    this.cartel(this.cx, this.cy - 200, '¡PASTEL A SALVO!', COLOR.ORO, 60);
  }

  // Sale de un borde al azar (justo afuera de la pantalla), mirando a la torta
  soltar(h) {
    const a = Math.random() * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
    const hastaX = c > 0 ? (this.W - this.tx) / c : c < 0 ? -this.tx / c : 1e9;
    const hastaY = s > 0 ? (this.H - this.ty) / s : s < 0 ? -this.ty / s : 1e9;
    const r = Math.min(hastaX, hastaY) + 40;
    h.x = this.tx + Math.cos(a) * r;
    h.y = this.ty + Math.sin(a) * r;
    h.img = this.emoji('hormiga', h.x, h.y, 58);
    h.img.setAngle((a + Math.PI) * 57.3 + 180);   // la hormiga de Noto mira a la izquierda
    h.fase = Math.random() * 6;
  }

  paso(dt, t) {
    this.torta.setScale(this.torta.scaleX, this.torta.scaleX * (1 + Math.sin(t * 5) * 0.02));
    for (const h of this.hormigas) {
      if (!h.img) { if (t >= h.tSale && !this.decidido) this.soltar(h); continue; }
      if (!h.viva) continue;
      const dx = this.tx - h.x, dy = this.ty - h.y, d = Math.hypot(dx, dy);
      if (d < 70) {
        h.viva = false;
        h.img.setVisible(false);
        this.vidasTorta--;
        this.marcas[this.vidasTorta].setTint(0x444444).setAlpha(0.5);
        this.audio.mordida();
        this.rebote(this.torta, 0.85);
        this.cartel(this.tx, this.ty - 120, '¡ÑAM!', COLOR.MAL, 50);
        if (this.vidasTorta <= 0) { this.perder(); this.torta.setTexture('emoji', 'galleta'); }
        continue;
      }
      // Caminan zigzagueando un poco
      const vx = dx / d, vy = dy / d, z = Math.sin(t * 9 + h.fase) * 0.35;
      h.x += (vx - vy * z) * this.rapidez * dt;
      h.y += (vy + vx * z) * this.rapidez * dt;
      h.img.setPosition(h.x, h.y);
    }
  }
}
