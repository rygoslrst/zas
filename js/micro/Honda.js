// ¡TUMBA AL CERDO! — Una honda: arrastra el pájaro hacia atrás, apunta y
// suéltalo para botar al cerdo de su torre de cajas. Mientras apuntas, unos
// puntos muestran el camino (en el nivel 3, sólo el principio, y el cerdo salta
// sobre la torre: hay que darle a él). Si fallas, el pájaro vuelve y puedes
// tirar otra vez.
import { Micro } from '../escenas/Micro.js';
import { COLOR } from '../config.js';

const G = 900;                    // gravedad del pájaro
const FUERZA = 6.2;               // velocidad por cada píxel que se estira la honda
const ESTIRA = 115;               // cuánto se puede estirar como mucho

export class Honda extends Micro {
  static ORDEN = '¡TUMBA AL CERDO!';
  static ICONO = 'cerdo';          // en la galería
  static CONTROL = 'arrastrar';
  static PULSOS = 10;
  // La primera vez: el juego se congela y enseña (ver Director.revisarLeccion)
  static LECCION = {
    titulo: '¡TIRA HACIA ATRÁS Y SUELTA!', sub: 'LOS PUNTOS MUESTRAN POR DÓNDE VA A VOLAR',
    gesto: 'tirar', lugar: 'arriba', listo: () => true,
    objetivo: m => ({ x: m.pajaro.x, y: m.pajaro.y }),
  };

  armar() {
    this.tema('cielo');
    this.ySuelo = this.bajo - 24;
    this.piso(this.ySuelo, 0x7cc95a);
    // La honda: una horqueta de madera en Y; el pájaro descansa entre las
    // puntas, sobre la goma. La punta de atrás y su goma van detrás del pájaro;
    // la de adelante, delante (como una honda de verdad).
    this.reposo = { x: 118, y: this.ySuelo - 175 };
    const { x: hx, y: hy } = this.reposo;
    const cruce = hy + 46;                              // donde se abre la Y
    this.puntas = [{ x: hx - 44, y: hy - 30 }, { x: hx + 40, y: hy - 22 }];     // [adelante, atrás]
    const brazo = (g, p, ancho) => {
      g.lineStyle(ancho + 8, COLOR.OSCURO, 1).lineBetween(hx, cruce, p.x, p.y);
      g.lineStyle(ancho, 0x8b5a2b, 1).lineBetween(hx, cruce, p.x, p.y);
      g.lineStyle(ancho * 0.35, 0xb07a45, 1).lineBetween(hx - 3, cruce - 4, p.x - 3, p.y + 2);
      g.fillStyle(0x8b5a2b, 1).fillCircle(p.x, p.y, ancho / 2);
    };
    const atras = this.add.graphics().setDepth(2);
    atras.fillStyle(COLOR.OSCURO, 0.25).fillEllipse(hx + 6, this.ySuelo + 4, 70, 16);
    atras.fillStyle(COLOR.OSCURO, 1).fillRoundedRect(hx - 15, cruce - 6, 30, this.ySuelo - cruce + 10, 10);
    atras.fillStyle(0x8b5a2b, 1).fillRoundedRect(hx - 11, cruce - 4, 22, this.ySuelo - cruce + 6, 8);
    atras.fillStyle(0xb07a45, 1).fillRoundedRect(hx - 7, cruce, 5, this.ySuelo - cruce - 6, 3);
    brazo(atras, this.puntas[1], 18);
    const frente = this.add.graphics().setDepth(7);
    brazo(frente, this.puntas[0], 20);
    frente.fillStyle(0x5a2d0c, 1).fillRect(this.puntas[0].x - 9, this.puntas[0].y + 8, 18, 7);     // atadura
    this.gomaAtras = this.add.graphics().setDepth(4);
    this.gomas = this.add.graphics().setDepth(6);
    // La torre: cajas apiladas y el cerdo arriba
    this.xTorre = [395, 420, 430][this.nivel - 1];
    const pisos = [2, 3, 3][this.nivel - 1];
    this.cajas = [];
    for (let i = 0; i < pisos; i++) this.cajas.push(this.emoji('caja', this.xTorre, this.ySuelo - 34 - i * 64, 70));
    this.yCerdo0 = this.ySuelo - 34 - pisos * 64 - 6;
    this.cerdo = this.emoji('cerdo', this.xTorre, this.yCerdo0, 74);
    this.subeBaja = this.nivel >= 3 ? 70 : 0;
    // El pájaro y los puntos de la puntería
    this.pajaro = this.emoji('pajaro', this.reposo.x, this.reposo.y, 64).setDepth(5);
    this.mirar(this.pajaro, 'pajaro', 1);
    this.puntos = [];
    for (let i = 0; i < 10; i++) this.puntos.push(this.circulo(0, 0, 6 - i * 0.3, 0xffffff, 0.9).setVisible(false));
    this.mostrarPuntos = [10, 10, 4][this.nivel - 1];
    this.estado = 'listo';                   // listo | apuntando | volando | fin
    this.alTocar((x, y) => {
      if (this.estado !== 'listo' || Math.hypot(x - this.pajaro.x, y - this.pajaro.y) > 110) return;
      this.estado = 'apuntando';
    });
    this.alMover((x, y) => { if (this.estado === 'apuntando') this.apuntar(x, y); });
    this.alSoltar(() => { if (this.estado === 'apuntando') this.soltar(); });
  }

  apuntar(x, y) {
    let dx = x - this.reposo.x, dy = y - this.reposo.y;
    const d = Math.hypot(dx, dy);
    if (d > ESTIRA) { dx *= ESTIRA / d; dy *= ESTIRA / d; }
    this.pajaro.setPosition(this.reposo.x + dx, this.reposo.y + dy);
    // El camino que va a hacer
    const vx = -dx * FUERZA, vy = -dy * FUERZA;
    this.puntos.forEach((p, i) => {
      const t = (i + 1) * 0.07;
      p.setPosition(this.pajaro.x + vx * t, this.pajaro.y + vy * t + 0.5 * G * t * t).setVisible(i < this.mostrarPuntos && d > 12);
    });
  }

  soltar() {
    const dx = this.pajaro.x - this.reposo.x, dy = this.pajaro.y - this.reposo.y;
    for (const p of this.puntos) p.setVisible(false);
    if (Math.hypot(dx, dy) < 15) {                    // casi no la estiró: vuelve
      this.estado = 'listo';
      this.pajaro.setPosition(this.reposo.x, this.reposo.y);
      return;
    }
    this.vx = -dx * FUERZA;
    this.vy = -dy * FUERZA;
    this.estado = 'volando';
    this.audio.zas();
  }

  paso(dt, t) {
    // En el nivel 3 el cerdo salta sobre la torre
    const sube = this.subeBaja ? Math.abs(Math.sin(t * 2.2)) * this.subeBaja : 0;
    if (this.estado !== 'fin') {
      this.cerdo.y = this.yCerdo0 - sube;
      this.cerdo.setAngle(Math.sin(t * 4) * 6);
    }
    // Las gomas de la honda, de cada punta al pájaro (sin pájaro, tensas entre
    // las dos puntas)
    this.gomas.clear();
    this.gomaAtras.clear();
    const [pf, pa] = this.puntas;
    const cargada = this.estado === 'listo' || this.estado === 'apuntando';
    const bx = cargada ? this.pajaro.x - 14 : null, by = cargada ? this.pajaro.y + 6 : null;
    for (const [g, p] of [[this.gomaAtras, pa], [this.gomas, pf]]) {
      g.lineStyle(9, COLOR.OSCURO, 1);
      if (cargada) g.lineBetween(p.x, p.y + 4, bx, by); else g.lineBetween(pf.x, pf.y + 4, pa.x, pa.y + 4);
      g.lineStyle(5, 0x7a2e12, 1);
      if (cargada) g.lineBetween(p.x, p.y + 4, bx, by); else g.lineBetween(pf.x, pf.y + 4, pa.x, pa.y + 4);
    }
    if (cargada) this.gomas.fillStyle(0x5a2d0c, 1).fillRoundedRect(bx - 12, by - 9, 24, 18, 6);   // el cuero
    if (this.estado !== 'volando') return;
    this.vy += G * dt;
    this.pajaro.x += this.vx * dt;
    this.pajaro.y += this.vy * dt;
    this.pajaro.angle = Math.atan2(this.vy, this.vx) * 57.3 * 0.5;
    // ¿Le dio al cerdo (o a la torre)?
    const alCerdo = Math.hypot(this.pajaro.x - this.cerdo.x, this.pajaro.y - this.cerdo.y) < 62;
    const aLaTorre = this.cajas.some(c => Math.abs(this.pajaro.x - c.x) < 58 && Math.abs(this.pajaro.y - c.y) < 50);
    if (!this.decidido && (alCerdo || (this.nivel < 3 && aLaTorre))) {
      this.estado = 'fin';
      this.ganar();
      this.audio.golpe();
      this.chispas(this.cerdo.x, this.cerdo.y, 12);
      this.tweens.add({ targets: this.cerdo, x: this.cerdo.x + 140, y: this.ySuelo + 40, angle: 280, duration: 700, ease: 'Quad.easeIn' });
      this.cajas.forEach((c, i) => this.tweens.add({
        targets: c, x: c.x + 60 + i * 30, y: this.ySuelo - 30, angle: 90 + i * 40, duration: 500 + i * 80, ease: 'Bounce.easeOut',
      }));
      this.vx *= -0.3;
      this.cartel(this.cx, this.cy - 200, '¡LE DISTE!', COLOR.ORO, 64);
      return;
    }
    // Se fue o tocó el suelo: vuelve a la honda para otro tiro
    if (this.pajaro.y > this.ySuelo - 20 || this.pajaro.x > this.W + 60 || this.pajaro.x < -60) {
      this.humo(this.pajaro.x, Math.min(this.pajaro.y, this.ySuelo - 20), 50);
      this.estado = 'listo';
      this.pajaro.setPosition(this.reposo.x, this.reposo.y).setAngle(0);
      this.rebote(this.pajaro, 1.3);
    }
  }
}
