// ¡CRUZA LA CALLE! — El pollito tiene que llegar donde su mamá, al otro lado.
// Cada toque lo hace saltar una pista hacia arriba; los autos no frenan.
import { Micro } from '../escenas/Micro.js';
import { COLOR } from '../config.js';

const ALTO = 108;                 // alto de cada pista
const CHOCA = 54;                 // distancia (en x) a la que un auto atropella (con algo de margen)

export class Cruza extends Micro {
  static ORDEN = '¡CRUZA LA CALLE!';
  static ICONO = 'pollito';          // en la galería
  static CONTROL = 'tocar';
  static PULSOS = 11;
  // La primera vez: se congela cuando la primera pista está libre
  static LECCION = {
    titulo: '¡CADA TOQUE, UN SALTO!', sub: 'EL POLLITO AVANZA UNA PISTA. ESPERA A QUE PASEN LOS AUTOS',
    gesto: 'tocar', lugar: 'arriba',
    listo: m => {
      const p = m.pistas[0];
      for (let k = 0; k <= 8; k++) if (p.autos.some(a => Math.abs(m.xAuto(p, a, m.t + k * 0.05) - m.cx) < CHOCA + 30)) return false;
      return true;
    },
    objetivo: m => ({ x: m.pollo.x, y: m.pollo.y }),
  };

  armar() {
    this.fondo([0x9be07a, 0x4e9a3a], null);
    const n = [2, 3, 3][this.nivel - 1];
    this.n = n;
    this.yInicio = this.bajo - 46;
    this.yMeta = this.yInicio - (n + 1) * ALTO;
    // La calle, las veredas y las líneas entre pistas
    const yArriba = this.yMeta + ALTO / 2, yAbajo = this.yInicio - ALTO / 2;
    this.rect(this.cx, (yArriba + yAbajo) / 2, this.W, yAbajo - yArriba, 0x4a4e5a);
    for (const y of [this.yInicio, this.yMeta]) {
      this.rect(this.cx, y, this.W, ALTO - 16, 0xc9ccd6);
      this.rect(this.cx, y + (y === this.yInicio ? -1 : 1) * (ALTO / 2 - 10), this.W, 6, 0x8e93a3);
    }
    for (let i = 1; i < n; i++) {
      const y = this.yInicio - ALTO / 2 - i * ALTO;
      for (let x = 20; x < this.W; x += 70) this.rect(x + 18, y, 36, 5, 0xffffff, 0.8);
    }
    // Los autos: cada pista para un lado, con huecos entre auto y auto
    const rapidez = [150, 185, 210][this.nivel - 1] * Math.sqrt(this.vel);
    this.pistas = [];
    for (let i = 0; i < n; i++) {
      const y = this.yInicio - (i + 1) * ALTO;
      const dir = (i + (Math.random() < 0.5 ? 0 : 1)) % 2 ? -1 : 1;
      const separacion = this.azar(320, 380);
      const pista = { y, v: rapidez * this.azar(0.85, 1.15) * dir, largo: separacion * 3, x0: this.azar(0, separacion), autos: [] };
      for (let k = 0; k < 3; k++) {
        const img = this.emoji('auto', 0, y - 6, 100);
        this.mirar(img, 'auto', dir);
        pista.autos.push({ img, k, separacion, x: 0 });
      }
      this.pistas.push(pista);
    }
    // Nunca una calle imposible: si con estos autos no se puede cruzar, se reacomodan
    for (let i = 0; i < 30 && !this.hayCamino(); i++) for (const p of this.pistas) p.x0 = this.azar(0, p.largo / 3);
    this.moverAutos(0);
    // El pollito abajo; su mamá arriba
    this.carril = -1;               // -1: vereda de abajo; n: la de arriba
    this.pollo = this.emoji('pollito', this.cx, this.yInicio - 8, 70);
    this.mama = this.emoji('pato', this.cx + 70, this.yMeta - 6, 96);
    this.mirar(this.mama, 'pato', -1);
    this.saltando = false;
    this.alTocar(() => this.saltar());
  }

  // Dónde está un auto en el segundo t (dan la vuelta: salen por un lado y entran por el otro)
  xAuto(p, a, t) {
    const d = (p.x0 + a.k * a.separacion + p.v * t) % p.largo;
    return (d < 0 ? d + p.largo : d) - 110;
  }

  moverAutos(t) {
    for (const p of this.pistas) for (const a of p.autos) { a.x = this.xAuto(p, a, t); a.img.x = a.x; }
  }

  // ¿Se puede cruzar? Prueba saltar o esperar de a 40 ms, con margen, dando
  // medio segundo para mirar y dejando un cuarto del tiempo de sobra.
  hayCamino() {
    const PASO = 0.04, SALTO = 0.12, fin = this.dur * 0.75, margen = CHOCA + 14;
    const choca = (i, t) => i >= 0 && i < this.n && this.pistas[i].autos.some(a => Math.abs(this.xAuto(this.pistas[i], a, t) - this.cx) < margen);
    const libre = (i, t0, t1) => { for (let t = t0; t <= t1 + 1e-6; t += PASO / 2) if (choca(i, t)) return false; return true; };
    const memo = new Map();
    const llega = (i, t) => {
      if (i >= this.n) return true;
      if (t > fin) return false;
      const clave = i * 10000 + Math.round(t / PASO);
      if (memo.has(clave)) return memo.get(clave);
      const r = (libre(i + 1, t, t + SALTO) && llega(i + 1, t + SALTO)) || (libre(i, t, t + PASO) && llega(i, t + PASO));
      memo.set(clave, r);
      return r;
    };
    return llega(-1, 0.6);
  }

  saltar() {
    if (this.saltando || this.carril >= this.n) return;
    this.carril++;
    const y = this.carril >= this.n ? this.yMeta - 8 : this.pistas[this.carril].y - 8;
    this.saltando = true;
    this.audio.salto();
    this.tweens.add({
      targets: this.pollo, y, duration: 110, ease: 'Quad.easeOut',
      onComplete: () => { this.saltando = false; },
    });
    if (this.carril >= this.n) {
      this.ganar();
      this.rebote(this.mama, 1.3);
      this.chispas(this.cx + 30, this.yMeta - 20, 12);
      this.cartel(this.cx, this.yMeta - 100, '¡LLEGÓ!', COLOR.ORO, 60);
    }
  }

  paso(dt, t) {
    this.moverAutos(t);
    if (this.decidido || this.carril < 0 || this.carril >= this.n) return;
    for (const a of this.pistas[this.carril].autos) {
      if (Math.abs(a.x - this.pollo.x) < CHOCA) {
        this.perder();
        this.audio.plaf();
        this.tweens.killTweensOf(this.pollo);
        this.pollo.setScale(this.pollo.scaleX * 1.35, this.pollo.scaleY * 0.4);
        this.cartel(this.pollo.x, this.pollo.y - 80, '¡PLAF!', COLOR.MAL);
        return;
      }
    }
  }
}
