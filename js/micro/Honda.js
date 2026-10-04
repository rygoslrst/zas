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
    // La honda: un palo en Y; el pájaro descansa entre las puntas
    this.reposo = { x: 118, y: this.ySuelo - 175 };
    const g = this.add.graphics();
    g.fillStyle(0x7a4a24, 1).fillRoundedRect(this.reposo.x - 9, this.reposo.y + 20, 18, this.ySuelo - this.reposo.y - 16, 6);
    g.lineStyle(16, 0x7a4a24, 1).lineBetween(this.reposo.x, this.reposo.y + 28, this.reposo.x - 26, this.reposo.y - 14)
      .lineBetween(this.reposo.x, this.reposo.y + 28, this.reposo.x + 26, this.reposo.y - 14);
    this.puntas = [{ x: this.reposo.x - 26, y: this.reposo.y - 14 }, { x: this.reposo.x + 26, y: this.reposo.y - 14 }];
    this.gomas = this.add.graphics().setDepth(4);
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
    // Las gomas de la honda, de cada punta al pájaro
    this.gomas.clear();
    if (this.estado === 'listo' || this.estado === 'apuntando') {
      this.gomas.lineStyle(7, 0x5a2d0c, 1);
      for (const p of this.puntas) this.gomas.lineBetween(p.x, p.y, this.pajaro.x, this.pajaro.y);
    }
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
