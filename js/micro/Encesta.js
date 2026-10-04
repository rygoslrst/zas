// ¡ENCESTA! — Desliza el dedo hacia arriba para tirar la pelota: va hacia
// donde apunta el gesto. Desde el nivel 2 el aro se mueve y hay que tirar un
// poco adelantado. Si fallas, la pelota vuelve y puedes tirar de nuevo.
import { Micro } from '../escenas/Micro.js';
import { COLOR } from '../config.js';

const G = 1500;                   // gravedad de la pelota
const MARGEN = 40;                // cuánto puede errarle al centro del aro y entrar igual

export class Encesta extends Micro {
  static ORDEN = '¡ENCESTA!';
  static ICONO = 'basket';          // en la galería
  static CONTROL = 'deslizar';
  static PULSOS = 10;
  // La primera vez: el juego se congela y enseña (ver Director.revisarLeccion)
  static LECCION = {
    titulo: '¡DESLIZA HACIA EL ARO!', sub: 'LA PELOTA VA HACIA DONDE MUEVES EL DEDO',
    gesto: 'deslizar', lugar: 'medio', listo: () => true,
    objetivo: m => ({ x: m.xBase, y: m.yBase }),
  };

  armar() {
    // Un gimnasio: pared de bloques pintados y piso de madera con la línea
    this.fondo([0x7fa3d9, 0x3b5a8f], null);
    const yPiso = this.bajo - 26;
    this.azulejos(0, yPiso, 0x6f93c9, 128, 64);
    this.rect(this.cx, yPiso - 200, this.W, 14, 0xffd23f).setOrigin(0.5);
    this.piso(yPiso, 0xd99a5b);
    this.tablasPiso = this.add.graphics();
    this.tablasPiso.lineStyle(3, 0xb87945, 0.6);
    for (let x = 30; x < this.W; x += 64) this.tablasPiso.lineBetween(x, yPiso + 8, x - 40, this.H);
    this.rect(this.cx, yPiso + 60, this.W, 6, 0xffffff, 0.85).setOrigin(0.5);
    this.vineta(0.35);
    this.yAro = this.arriba + 240;
    this.xAro = this.cx;
    this.vAro = [0, 95, 140][this.nivel - 1] * Math.sqrt(this.vel) * (Math.random() < 0.5 ? -1 : 1);
    // El tablero y el aro (se mueven juntos)
    this.cesto = this.add.container(this.xAro, this.yAro);
    const tablero = [
      this.rect(0, -92, 186, 128, COLOR.OSCURO), this.rect(0, -92, 176, 118, 0xffffff),
      this.rect(0, -70, 74, 4, 0xff4d5a), this.rect(0, -110, 74, 4, 0xff4d5a),
      this.rect(-35, -90, 4, 44, 0xff4d5a), this.rect(35, -90, 4, 44, 0xff4d5a),
    ];
    this.red = this.add.graphics();
    this.sacudida = 0;                 // la red tiembla cuando entra la pelota
    this.dibujarRed(0);
    this.cesto.add([...tablero, this.red]);
    this.aroFrente = this.add.image(this.xAro, this.yAro, 'atlas', 'anillo').setDisplaySize(104, 26).setTint(0xff6b1a).setDepth(5);
    // La pelota: sube y llega al aro desde arriba (la cima, 60 px sobre el aro)
    this.xBase = this.cx;
    this.yBase = this.bajo - 70;
    this.vy0 = -Math.sqrt(2 * G * (this.yBase - this.yAro + 60));
    this.tVuelo = -this.vy0 / G + Math.sqrt(2 * 60 / G);
    this.sombraPelota = this.sombra(this.xBase, this.yBase + 44, 70, 0.3);
    this.pelota = this.emoji('basket', this.xBase, this.yBase, 84).setDepth(4);
    this.volando = false;
    this.desde = null;
    this.alTocar((x, y) => { if (!this.volando) this.desde = { x, y }; });
    this.alMover((x, y) => {
      if (!this.desde || this.volando) return;
      const dx = x - this.desde.x, dy = this.desde.y - y;
      if (dy < 50) return;
      this.desde = null;
      this.tirar(dx / dy);
    });
    this.alSoltar(() => { this.desde = null; });
  }

  dibujarRed(t) {
    const g = this.red.clear().lineStyle(3, 0xffffff, 0.9);
    for (let i = 0; i <= 6; i++) {
      const x0 = -46 + i * 15.3, x1 = -30 + i * 10 + Math.sin(t * 20 + i) * 3 * this.sacudida;
      g.lineBetween(x0, 0, x1, 62);
    }
    for (let j = 1; j <= 3; j++) {
      const a = 46 - j * 5;
      g.lineBetween(-a, j * 18, a, j * 18);
    }
  }

  // Tira hacia donde apunta el gesto: a la altura del aro, la pelota pasa por
  // la recta que dibujó el dedo.
  tirar(pendiente) {
    this.volando = true;
    this.vx = pendiente * (this.yBase - this.yAro) / this.tVuelo;
    this.vy = this.vy0;
    this.audio.zas();
  }

  paso(dt, t) {
    // El aro va y viene
    if (!this.decidido && this.vAro) {
      this.xAro += this.vAro * dt;
      if (this.xAro < 120) { this.xAro = 120; this.vAro = Math.abs(this.vAro); }
      else if (this.xAro > this.W - 120) { this.xAro = this.W - 120; this.vAro = -Math.abs(this.vAro); }
    }
    this.cesto.x = this.xAro;
    this.aroFrente.x = this.xAro;
    this.sacudida = Math.max(0, this.sacudida - dt * 2);
    this.dibujarRed(t);
    if (!this.volando) return;
    const yAntes = this.pelota.y;
    this.vy += G * dt;
    const x = this.pelota.x + this.vx * dt, y = yAntes + this.vy * dt;
    // Más lejos, más chica
    const k = 1 - 0.3 * Math.min(1, (this.yBase - y) / (this.yBase - this.yAro));
    this.pelota.setPosition(x, y).setDisplaySize(84 * k, 84 * k).setAngle(this.pelota.angle + this.vx * dt * 0.8);
    // ¿Cruzó la altura del aro bajando?
    if (this.vy > 0 && yAntes < this.yAro && y >= this.yAro && !this.decidido) {
      const error = Math.abs(x - this.xAro);
      if (error < MARGEN) {
        this.ganar();
        this.audio.red();
        this.sacudida = 1;
        this.vx = (this.xAro - x) * 2;
        this.confeti(this.xAro, this.yAro);
        this.cartel(this.cx, this.yAro + 150, '¡CANASTA!', COLOR.ORO, 64);
        return;
      }
      if (error < MARGEN + 34) {                 // pega en el aro y sale
        this.vx = Math.sign(x - this.xAro) * 260;
        this.vy = -280;
        this.audio.aro();
        this.cartel(x, this.yAro - 70, '¡CASI!', COLOR.MAL, 44);
      }
    }
    // Se fue: vuelve abajo para otro tiro
    if (!this.decidido && (y > this.H + 60 || x < -60 || x > this.W + 60)) {
      this.volando = false;
      this.pelota.setPosition(this.xBase, this.yBase).setDisplaySize(84, 84).setAngle(0);
      this.rebote(this.pelota, 1.2);
    }
  }
}
