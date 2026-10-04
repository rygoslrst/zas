// ¡ARMA EL PUENTE! — Dos acantilados con un río abajo. Mientras se mantiene
// presionado, una tabla crece hacia arriba desde el borde; al soltar, cae
// hacia el otro lado. Si la punta queda sobre la otra orilla, el corredor
// cruza; si es corta o se pasa, se cae al río. Un solo intento. Con el
// nivel, la otra orilla es más angosta y la tabla crece más rápido.
import { Micro, mezcla } from '../escenas/Micro.js';
import { COLOR } from '../config.js';

const ROCA = 0x9c6b4e, PASTO = 0x5fbf4a, TABLA = 0xd9a066;

export class Puente extends Micro {
  static ORDEN = '¡ARMA EL PUENTE!';
  static ICONO = 'corredor';          // en la galería
  static CONTROL = 'mantener';
  static PULSOS = 10;
  // La primera vez: el juego se congela y enseña (ver Director.revisarLeccion)
  static LECCION = {
    titulo: '¡MANTÉN PRESIONADO PARA ALARGAR LA TABLA!', sub: 'SUELTA CUANDO ALCANCE LA OTRA ORILLA',
    gesto: 'mantener', lugar: 'arriba', listo: () => true,
    objetivo: m => ({ x: m.xBorde, y: m.yTope - 70 }),
  };

  armar() {
    this.tema('atardecer');
    this.yTope = Math.min(this.cy + 120, this.bajo - 170);
    this.horizonte(this.yTope - 60, 'cerros', 0xe8a07a);
    // El río, abajo, con olitas
    this.rect(this.cx, this.yTope + 120, this.W, this.H, 0x3a86ff).setOrigin(0.5, 0);
    this.rect(this.cx, this.yTope + 120, this.W, 10, 0x9fd0ff).setOrigin(0.5, 0);
    this.olas = this.add.graphics();
    // La orilla de acá (izquierda) y la de allá: el hueco y el ancho, al azar
    this.xBorde = 150;
    this.anchoOrilla = [130, 104, 82][this.nivel - 1];
    this.xA = this.xBorde + this.azar(90, this.W - 30 - this.anchoOrilla - this.xBorde);
    this.acantilado(0, this.xBorde);
    this.acantilado(this.xA, this.xA + this.anchoOrilla);
    // El centro de la otra orilla, marcado (lo que da "justo")
    this.rect(this.xA + this.anchoOrilla / 2, this.yTope + 3, 18, 6, 0xff4d5a);
    this.bandera = this.emoji('bandera', this.xA + this.anchoOrilla - 22, this.yTope - 40, 66);
    // El corredor, en el borde
    this.corredor = this.emoji('corredor', this.xBorde - 36, this.yTope - 40, 78).setDepth(3);
    this.mirar(this.corredor, 'corredor', 1);
    // La tabla: crece desde el borde hacia arriba (el origen, abajo)
    this.tabla = this.add.container(this.xBorde - 4, this.yTope, [
      this.rect(0, 0, 18, 1, COLOR.OSCURO).setOrigin(0.5, 1),
      this.rect(0, 0, 10, 1, TABLA).setOrigin(0.5, 1),
    ]).setDepth(2);
    this.largo = 0;
    this.rapidez = [430, 490, 550][this.nivel - 1] * (0.7 + 0.3 * this.vel);
    this.estadoP = 'espera';      // espera · crece · cae · listo
    this.alTocar(() => { if (this.estadoP === 'espera') { this.estadoP = 'crece'; this.ultimoClic = 0; } });
    const soltar = () => { if (this.estadoP === 'crece') this.soltar(); };
    this.input.on('pointerup', soltar);
    this.input.on('pointerupoutside', soltar);
  }

  // Un acantilado de roca con pasto arriba, de x0 a x1
  acantilado(x0, x1) {
    const g = this.add.graphics();
    g.fillStyle(COLOR.OSCURO, 1).fillRect(x0 - 4, this.yTope - 4, x1 - x0 + 8, this.H);
    g.fillStyle(ROCA, 1).fillRect(x0, this.yTope, x1 - x0, this.H);
    g.fillStyle(mezcla(ROCA, 0x000000, 0.2), 1);
    for (let y = this.yTope + 40, i = 0; y < this.H; y += 46, i++) g.fillRect(x0 + ((i * 37) % Math.max(1, x1 - x0 - 40)), y, 34, 10);
    g.fillStyle(PASTO, 1).fillRect(x0, this.yTope, x1 - x0, 16);
    g.fillStyle(mezcla(PASTO, 0xffffff, 0.3), 1).fillRect(x0, this.yTope, x1 - x0, 5);
  }

  dibujarTabla() {
    const [borde, madera] = this.tabla.list;
    borde.setDisplaySize(18, this.largo + 4);
    madera.setDisplaySize(10, Math.max(1, this.largo));
  }

  soltar() {
    this.estadoP = 'cae';
    this.audio.zas();
    this.tweens.add({
      targets: this.tabla, angle: 90, duration: 280, ease: 'Quad.easeIn',
      onComplete: () => this.caer(),
    });
  }

  // La tabla quedó acostada: ¿la punta está sobre la otra orilla?
  caer() {
    if (this.decidido) return;
    this.audio.portazo();
    this.cameras.main.shake(70, 0.005);
    const punta = this.xBorde - 4 + this.largo;
    if (punta >= this.xA && punta <= this.xA + this.anchoOrilla) {
      this.ganar();
      this.estadoP = 'listo';
      const justo = Math.abs(punta - (this.xA + this.anchoOrilla / 2)) < 12;
      this.tweens.add({ targets: this.corredor, x: this.xA + this.anchoOrilla / 2, duration: 420, ease: 'Sine.easeInOut' });
      this.cartel(this.cx, this.arriba + 120, justo ? '¡JUSTO AL MEDIO!' : '¡CRUZÓ!', COLOR.ORO, 58);
      this.chispas(punta, this.yTope, 10);
    } else {
      this.perder();
      this.estadoP = 'listo';
      // Camina hasta la punta y se cae al río
      const hasta = Math.min(punta, this.W + 40);
      this.tweens.add({
        targets: this.corredor, x: hasta, duration: 260, ease: 'Sine.easeIn',
        onComplete: () => {
          this.audio.caida();
          this.tweens.add({ targets: this.corredor, y: this.H + 80, angle: 200, duration: 600, ease: 'Quad.easeIn' });
          if (punta < this.xA) this.tweens.add({ targets: this.tabla, angle: 180, duration: 400, ease: 'Quad.easeIn' });
        },
      });
      this.cartel(this.cx, this.arriba + 120, punta < this.xA ? '¡MUY CORTA!' : '¡MUY LARGA!', COLOR.MAL, 60);
    }
  }

  paso(dt, t) {
    // Las olitas del río
    const g = this.olas;
    g.clear().lineStyle(5, 0xffffff, 0.5);
    for (let y = this.yTope + 140; y < this.H; y += 70) {
      for (let x = ((t * 40 + y) % 60) - 60; x < this.W; x += 60) g.lineBetween(x, y, x + 24, y);
    }
    if (this.estadoP !== 'crece' || this.decidido) return;
    this.largo = Math.min(this.largo + this.rapidez * dt, this.yTope - this.arriba);
    this.dibujarTabla();
    // Un clic de trinquete cada tanto mientras crece (más agudo cuanto más larga)
    if (this.largo - this.ultimoClic >= 34) { this.ultimoClic = this.largo; this.audio.trinquete(Math.min(1, this.largo / 400)); }
  }
}
