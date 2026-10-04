// ¡SACA EL PELUCHE! — Una máquina de peluches: mientras se mantiene apretado,
// la garra avanza; al soltar, baja. Si cae sobre el peluche, lo saca. Un solo
// intento. Desde el nivel 2 hay bombas al lado del peluche (agarrar una
// pierde) y en el 3, además, la garra va más rápido.
import { Micro } from '../escenas/Micro.js';
import { COLOR } from '../config.js';

const PELUCHES = ['panda', 'conejo', 'unicornio', 'mono', 'pollito', 'gato', 'perro', 'pinguino', 'sapo', 'leon'];

export class Grua extends Micro {
  static ORDEN = '¡SACA EL PELUCHE!';
  static ICONO = 'panda';          // en la galería
  static CONTROL = 'mantener';
  // La primera vez: el juego se congela y enseña (ver Director.revisarLeccion)
  static LECCION = {
    titulo: '¡MANTÉN PRESIONADO!', sub: 'LA GARRA AVANZA. SUELTA ENCIMA DEL PELUCHE',
    gesto: 'mantener', lugar: 'medio', listo: () => true,
    objetivo: m => ({ x: m.cx, y: m.cy + 120 }),
  };

  armar() {
    this.fondo([0xff9ad5, 0x8a3fbf], 'lunares');
    // La máquina: el mueble, el vidrio y el riel de arriba
    const x0 = 40, x1 = this.W - 40, yTecho = this.arriba + 120, yPiso = this.cy + 210;
    this.yRiel = yTecho + 26;
    this.yPremios = yPiso - 46;
    const g = this.add.graphics();
    g.fillStyle(COLOR.OSCURO, 0.3).fillRoundedRect(x0 - 14, yTecho - 70, x1 - x0 + 40, yPiso - yTecho + 210, 30);
    g.fillStyle(0xff4d6d, 1).fillRoundedRect(x0 - 22, yTecho - 78, x1 - x0 + 44, yPiso - yTecho + 210, 30);
    g.fillStyle(0xffd23f, 1).fillRoundedRect(x0 - 8, yTecho - 66, x1 - x0 + 16, 46, 14);
    g.fillStyle(0xbfeaff, 1).fillRect(x0, yTecho, x1 - x0, yPiso - yTecho);
    g.fillStyle(0xffffff, 0.35).fillRect(x0 + 18, yTecho + 10, 22, yPiso - yTecho - 20);
    g.fillStyle(0x8a3fbf, 1).fillRect(x0, yPiso, x1 - x0, 40);
    g.fillStyle(COLOR.OSCURO, 0.8).fillRect(x0 + 10, this.yRiel - 4, x1 - x0 - 20, 8);
    // Luces en el cartel de arriba
    for (let x = x0 + 20; x < x1 - 10; x += 40) {
      this.circulo(x, yTecho - 43, 7, (x / 40) % 2 < 1 ? 0xfff6a8 : 0xffffff);
    }
    // El montón de premios del fondo (pelotitas de colores) y los que se pueden sacar
    const m = this.add.graphics();
    for (let i = 0; i < 26; i++) {
      m.fillStyle(COLOR.FONDOS[i % COLOR.FONDOS.length], 0.9).fillCircle(x0 + 20 + ((i * 47) % (x1 - x0 - 40)), yPiso - 10 - (i % 3) * 14, 22);
    }
    // El peluche, en un lugar que la garra alcanza; al lado, bombas (nivel 2+)
    this.xMin = x0 + 50;
    this.xMax = x1 - 50;
    this.xPeluche = this.azar(this.xMin + 110, this.xMax - 10);
    this.premios = [{ x: this.xPeluche, bueno: true, img: this.emoji(this.elegir(PELUCHES), this.xPeluche, this.yPremios, 96) }];
    const lado = [0, 1, 2][this.nivel - 1];
    for (const k of [-1, 1].slice(0, lado)) {
      const x = this.xPeluche + k * 100;
      if (x > this.xMin - 20 && x < this.xMax + 20) this.premios.push({ x, bueno: false, img: this.emoji('bomba', x, this.yPremios + 6, 80) });
    }
    // Qué tan justo hay que soltar
    this.tolerancia = [52, 44, 38][this.nivel - 1];
    // La garra: el cable, el cabezal y dos dedos (se dibujan cada cuadro)
    this.x = this.xMin;
    this.yGarra = this.yRiel + 70;
    this.garra = this.add.graphics().setDepth(4);
    this.rapidez = 330 * [1, 1.15, 1.3][this.nivel - 1] * Math.sqrt(this.vel);
    this.bajada = 0.32 / Math.sqrt(this.vel);
    this.estadoG = 'espera';        // espera → avanza → baja → sube
    this.abierta = 1;
    this.llevando = null;
    this.alTocar(() => { if (this.estadoG === 'espera') { this.estadoG = 'avanza'; this.audio.toque(); } });
    const soltar = () => { if (this.estadoG === 'avanza') this.bajar(); };
    this.input.on('pointerup', soltar);
    this.input.on('pointerupoutside', soltar);
    this.dibujarGarra();
  }

  bajar() {
    this.estadoG = 'baja';
    this.tBajada = this.t;
    this.audio.zas();
  }

  dibujarGarra() {
    const g = this.garra, x = this.x, y = this.yGarra, a = this.abierta;
    g.clear();
    g.lineStyle(5, COLOR.OSCURO, 1).lineBetween(x, this.yRiel, x, y - 22);
    g.fillStyle(COLOR.OSCURO, 1).fillRoundedRect(x - 26, this.yRiel - 12, 52, 24, 8);
    g.fillStyle(0x9aa3ad, 1).fillRoundedRect(x - 22, y - 26, 44, 26, 8);
    g.lineStyle(7, COLOR.OSCURO, 1);
    for (const k of [-1, 1]) {
      const ax = x + k * 16, bx = x + k * (12 + 22 * a), cx = x + k * (4 + 14 * a);
      g.beginPath().moveTo(ax, y - 4).lineTo(bx, y + 26).lineTo(cx, y + 46).strokePath();
    }
    g.lineStyle(4, 0xd7dde3, 1);
    for (const k of [-1, 1]) {
      const ax = x + k * 16, bx = x + k * (12 + 22 * a), cx = x + k * (4 + 14 * a);
      g.beginPath().moveTo(ax, y - 4).lineTo(bx, y + 26).lineTo(cx, y + 46).strokePath();
    }
  }

  paso(dt, t) {
    if (this.estadoG === 'avanza') {
      this.x = Math.min(this.xMax, this.x + this.rapidez * dt);
      if (Math.floor(t * 10) !== Math.floor((t - dt) * 10)) this.audio.tictac();       // el motor
    } else if (this.estadoG === 'baja') {
      const p = Math.min(1, (t - this.tBajada) / this.bajada);
      this.yGarra = this.yRiel + 70 + (this.yPremios - 40 - (this.yRiel + 70)) * p;
      if (p >= 1) this.agarrar(t);
    } else if (this.estadoG === 'sube') {
      const p = Math.min(1, (t - this.tSubida) / this.bajada);
      this.yGarra = this.yPremios - 40 - (this.yPremios - 40 - (this.yRiel + 70)) * p;
      if (this.llevando) this.llevando.img.setPosition(this.x, this.yGarra + 48);
    }
    if (this.estadoG === 'espera' && !this.decidido) this.abierta = 1 + Math.sin(t * 6) * 0.1;
    this.dibujarGarra();
  }

  // Abajo: se cierra y ve qué agarró (lo más cerca, si está a tiro)
  agarrar(t) {
    this.estadoG = 'sube';
    this.tSubida = t;
    this.abierta = 0.25;
    const cerca = this.premios.filter(p => Math.abs(p.x - this.x) <= this.tolerancia)
      .sort((a, b) => Math.abs(a.x - this.x) - Math.abs(b.x - this.x))[0];
    if (!cerca) {
      this.perder();
      this.audio.clac();
      this.cartel(this.x, this.yPremios - 140, '¡NADA!', COLOR.MAL, 56);
      return;
    }
    this.llevando = cerca;
    if (cerca.bueno) {
      this.ganar();
      this.audio.pop();
      this.chispas(this.x, this.yPremios, 12);
      this.cartel(this.cx, this.arriba + 60, '¡LO SACASTE!', COLOR.ORO, 56);
    } else {
      this.perder();
      this.audio.explosion();
      this.cameras.main.shake(200, 0.014);
      cerca.img.setTexture('emoji', 'explosion');
      this.cartel(this.cx, this.arriba + 60, '¡ERA UNA BOMBA!', COLOR.MAL, 50);
    }
  }

  alPerder() {
    // Si se acabó el tiempo sin soltar (o sin empezar), la garra queda donde estaba
    if (this.estadoG === 'avanza' || this.estadoG === 'espera') this.estadoG = 'fin';
  }
}
