// JEFE — ¡CORTA LOS TENTÁCULOS! Un pulpo gigante quiere robarse el tesoro del
// fondo del mar: sus tentáculos salen de los costados y crecen hacia el tesoro.
// Hay que cortarlos deslizando el dedo por encima: cada corte le baja vida. Si
// tres tentáculos llegan al tesoro, pierdes. En el nivel 3, a veces salen de a
// dos. (El primer jefe que se juega deslizando.)
import { Micro } from '../escenas/Micro.js';
import { COLOR } from '../config.js';

const PIEL = 0xb06be0, PIEL_OSCURA = 0x5b2a86, VENTOSA = 0xf3d6ff;
const SEPARACION = 22;            // px entre los puntos con que se dibuja un tentáculo

export class Pulpo extends Micro {
  static ORDEN = '¡CORTA LOS TENTÁCULOS!';
  static ICONO = 'pulpo';          // en la galería
  static CONTROL = 'deslizar';
  static PULSOS = 24;
  static JEFE = true;
  static RETRATO = 'pulpo';
  static NOMBRE_JEFE = 'EL PULPO GIGANTE';
  // La primera vez: se congela cuando el primer tentáculo ya asomó
  static LECCION = {
    titulo: '¡DESLIZA PARA CORTAR!', sub: 'CORTA LOS TENTÁCULOS ANTES DE QUE LLEGUEN AL TESORO',
    gesto: 'deslizar', lugar: 'arriba',
    listo: m => m.tentaculos.some(o => o.estado === 'crece' && o.largo > 150),
    objetivo: m => { const o = m.tentaculos.find(e => e.estado === 'crece' && e.largo > 150); const p = o.puntos[Math.max(1, o.puntos.length - 3)]; return { x: p.x, y: p.y }; },
  };

  armar() {
    this.tema('mar');
    this.piso(this.bajo - 20, 0xe8c27a);
    // El tesoro, sobre la arena
    this.tx = this.cx;
    this.ty = this.bajo - 70;
    this.tesoro = [
      this.emoji('corona', this.tx - 62, this.ty + 6, 70),
      this.emoji('diamante', this.tx + 64, this.ty + 8, 66),
      this.emoji('plata', this.tx, this.ty - 10, 100),
    ];
    this.brillo = this.add.image(this.tx, this.ty, 'atlas', 'brillo').setDisplaySize(260, 200).setTint(0xffd23f).setAlpha(0.35).setDepth(-1);
    // El pulpo, arriba, con su barra de vida; tus vidas (las del tesoro), a la izquierda
    this.yPulpo = this.arriba + 190;
    this.pulpo = this.emoji('pulpo', this.cx, this.yPulpo, 170);
    this.vidas = [0, 1, 2].map(i => this.emoji('corazon', 40 + i * 46, this.arriba + 60, 40));
    this.rect(this.cx + 50, this.arriba + 60, 304, 26, COLOR.OSCURO, 0.8);
    this.barra = this.rect(this.cx + 50 - 148, this.arriba + 60, 296, 18, 0x3ddc84).setOrigin(0, 0.5);
    this.golpes = 0;

    // Los tentáculos: cuándo sale cada uno y de qué lado (en el nivel 3, a veces dos)
    const k = Math.sqrt(this.vel);
    this.rapidez = [115, 135, 155][this.nivel - 1] * k;
    const cada = [1.15, 0.95, 0.82][this.nivel - 1] / k;
    this.tentaculos = [];
    for (let t = 0.7; t < this.dur - 1.6; t += cada * this.azar(0.85, 1.15)) {
      const lado = Math.random() < 0.5 ? -1 : 1;
      this.tentaculos.push(this.nuevoTentaculo(t, lado));
      if (this.nivel >= 3 && Math.random() < 0.35) this.tentaculos.push(this.nuevoTentaculo(t + 0.15, -lado));
    }
    // La vida del pulpo: una parte de los tentáculos (calibrada con un bot que
    // corta todo lo que ve; una persona corta menos)
    this.vidaMax = Math.max(4, Math.round(this.tentaculos.length * [0.66, 0.62, 0.62][this.nivel - 1]));
    this.vida = this.vidaMax;
    this.tinta = this.add.graphics().setDepth(5);
    this.cortes = [];             // pedazos cortados que caen

    // El rastro del dedo (como en ¡CORTA!)
    this.rastro = [];
    this.trazo = this.add.graphics().setDepth(40);
    this.abajoDedo = false;
    this.alTocar((x, y) => { this.abajoDedo = true; this.rastro.length = 0; this.rastro.push({ x, y, t: this.t }); });
    this.input.on('pointerup', () => { this.abajoDedo = false; });
    this.alMover((x, y) => {
      if (!this.abajoDedo) return;
      const u = this.rastro[this.rastro.length - 1];
      this.rastro.push({ x, y, t: this.t });
      if (u && Math.hypot(x - u.x, y - u.y) > 6) this.cortarEntre(u.x, u.y, x, y);
    });
  }

  // Un tentáculo nace en un costado (a una altura al azar) y crece hacia el tesoro
  nuevoTentaculo(tSale, lado) {
    const x0 = lado < 0 ? -30 : this.W + 30;
    const y0 = this.azar(this.yPulpo + 90, this.ty - 140);
    const fin = { x: this.tx + lado * 40, y: this.ty - 20 };
    return {
      tSale, lado, x0, y0, fin, total: Math.hypot(fin.x - x0, fin.y - y0), largo: 0, estado: 'espera',
      fase: this.azar(0, 6), puntos: [],
    };
  }

  // Los puntos del tentáculo (de la base a la punta), con una ondulación
  calcularPuntos(o, t) {
    const dx = (o.fin.x - o.x0) / o.total, dy = (o.fin.y - o.y0) / o.total;
    const pts = [];
    const n = Math.max(2, Math.ceil(o.largo / SEPARACION));
    for (let i = 0; i <= n; i++) {
      const s = (o.largo * i) / n;
      const onda = Math.sin(s / 55 - t * 5 + o.fase) * 16 * Math.min(1, s / 80);
      pts.push({ x: o.x0 + dx * s - dy * onda, y: o.y0 + dy * s + dx * onda, s });
    }
    o.puntos = pts;
  }

  // ¿El tramo del dedo pasó por encima de algún tentáculo? Se corta por ahí
  cortarEntre(x0, y0, x1, y1) {
    const dx = x1 - x0, dy = y1 - y0, l2 = dx * dx + dy * dy;
    for (const o of this.tentaculos) {
      if (o.estado !== 'crece') continue;
      for (let i = 1; i < o.puntos.length; i++) {
        const p = o.puntos[i];
        if ((o.lado < 0 && p.x < 4) || (o.lado > 0 && p.x > this.W - 4)) continue;   // lo que no se ve, no
        const k = Math.max(0, Math.min(1, ((p.x - x0) * dx + (p.y - y0) * dy) / l2));
        if (Math.hypot(x0 + k * dx - p.x, y0 + k * dy - p.y) < this.ancho(o, p.s) / 2 + 16) { this.cortar(o, i); break; }
      }
    }
  }

  ancho(o, s) { return 34 - 20 * Math.min(1, s / Math.max(1, o.total)); }

  cortar(o, i) {
    if (this.decidido) return;
    // El pedazo de la punta cae y se desvanece; el resto se retira
    const pedazo = o.puntos.slice(i - 1);
    const g = this.add.graphics().setDepth(4);
    this.dibujarTentaculo(g, o, pedazo);
    this.tweens.add({ targets: g, y: 140, alpha: 0, duration: 700, ease: 'Quad.easeIn', onComplete: () => g.destroy() });
    o.largo = o.puntos[i - 1].s;
    o.estado = 'retira';
    const p = o.puntos[i];
    this.chispas(p.x, p.y, 8, PIEL_OSCURA);
    this.audio.corte();
    this.vida--;
    this.barra.displayWidth = 296 * Math.max(0, this.vida / this.vidaMax);
    this.barra.setTint(this.vida / this.vidaMax < 0.3 ? COLOR.MAL : 0x3ddc84);
    this.pulpo.setTint(0xff9a9a);
    this.time.delayedCall(90, () => this.pulpo.clearTint());
    if (this.vida <= 0) this.derrotado();
  }

  tesoroTocado(o) {
    o.estado = 'retira';
    this.golpes++;
    this.audio.golpe();
    this.cameras.main.shake(150, 0.01);
    const c = this.vidas[3 - this.golpes];
    if (c) c.setTexture('emoji', 'corazon_negro');
    // Se lleva una pieza del tesoro
    const pieza = this.tesoro[3 - this.golpes];
    if (pieza) this.tweens.add({ targets: pieza, x: o.lado < 0 ? -80 : this.W + 80, y: o.y0, angle: 200, duration: 600, ease: 'Quad.easeIn' });
    if (this.golpes >= 3) this.perder();
  }

  derrotado() {
    this.ganar();
    this.audio.explosion();
    for (const o of this.tentaculos) if (o.estado === 'crece') o.estado = 'retira';
    for (let i = 0; i < 5; i++) {
      this.time.delayedCall(i * 90, () => this.humo(this.pulpo.x + this.azar(-60, 60), this.pulpo.y + this.azar(-30, 50), this.azar(80, 130)));
    }
    this.tweens.add({ targets: this.pulpo, y: this.H + 120, angle: 200, duration: 900, ease: 'Quad.easeIn' });
    this.confeti(this.cx, this.cy - 80, 30);
    this.cartel(this.cx, this.cy - 60, '¡PULPO DERROTADO!', COLOR.ORO, 56);
  }

  alPerder() {
    this.cartel(this.cx, this.cy - 60, '¡SE LLEVÓ EL TESORO!', COLOR.MAL, 52);
  }

  dibujarTentaculo(g, o, pts) {
    if (pts.length < 2) return;
    for (const [extra, color] of [[8, COLOR.OSCURO], [0, PIEL]]) {
      for (let i = 1; i < pts.length; i++) {
        g.lineStyle(this.ancho(o, pts[i].s) + extra, color, 1).lineBetween(pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y);
        g.fillStyle(color, 1).fillCircle(pts[i].x, pts[i].y, (this.ancho(o, pts[i].s) + extra) / 2);
      }
    }
    for (let i = 2; i < pts.length; i += 2) g.fillStyle(VENTOSA, 0.9).fillCircle(pts[i].x, pts[i].y, this.ancho(o, pts[i].s) * 0.22);
  }

  paso(dt, t) {
    this.pulpo.setPosition(this.cx + Math.sin(t * 1.3) * 40, this.yPulpo + Math.sin(t * 2.2) * 12)
      .setAngle(this.decidido && this.resultado === 'gano' ? this.pulpo.angle : Math.sin(t * 2) * 6);
    this.brillo.setAlpha(0.28 + Math.sin(t * 4) * 0.08);
    const g = this.tinta;
    g.clear();
    for (const o of this.tentaculos) {
      if (o.estado === 'espera') { if (t >= o.tSale && !this.decidido) o.estado = 'crece'; else continue; }
      if (o.estado === 'crece') {
        o.largo += this.rapidez * dt;
        if (o.largo >= o.total - 30) { o.largo = o.total - 30; this.tesoroTocado(o); }
      } else if (o.estado === 'retira') {
        o.largo -= 700 * dt;
        if (o.largo <= 0) { o.estado = 'fin'; continue; }
      } else continue;
      this.calcularPuntos(o, t);
      this.dibujarTentaculo(g, o, o.puntos);
    }
    this.dibujarRastro(t);
  }

  dibujarRastro(t) {
    while (this.rastro.length && t - this.rastro[0].t > 0.12) this.rastro.shift();
    const g = this.trazo;
    g.clear();
    for (let i = 1; i < this.rastro.length; i++) {
      const a = this.rastro[i - 1], b = this.rastro[i];
      const k = i / this.rastro.length;
      g.lineStyle(4 + k * 10, 0xffffff, 0.35 + k * 0.6);
      g.lineBetween(a.x, a.y, b.x, b.y);
    }
  }
}
