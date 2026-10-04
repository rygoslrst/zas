// ¡SIN HACER RUIDO! — El hámster tiene que llegar a la galleta pasando al lado
// del gato dormido. Se arrastra; si va muy rápido hace ruido (la barra sube) y
// si la barra se llena, el gato se despierta. Despacito... pero sin quedarse:
// la mecha se quema igual.
import { Micro, mezcla } from '../escenas/Micro.js';
import { COLOR } from '../config.js';

export class Puntillas extends Micro {
  static ORDEN = '¡SIN HACER RUIDO!';
  static ICONO = 'hamster';          // en la galería
  static CONTROL = 'arrastrar';
  static PULSOS = 10;
  // La primera vez: el juego se congela y enseña (ver Director.revisarLeccion)
  static LECCION = {
    titulo: '¡ARRÁSTRALO DESPACITO!', sub: 'SI VAS MUY RÁPIDO, EL GATO SE DESPIERTA',
    gesto: 'arrastrar', lugar: 'arriba', listo: () => true,
    objetivo: m => ({ x: m.x, y: m.yPiso - 40 }),
  };

  armar() {
    this.tema('madera');
    this.yPiso = this.cy + 150;
    this.tablas(0x9a6a44, 110).setAlpha(0.9);
    this.vineta(0.45);
    this.piso(this.yPiso, 0x6e4a2e);
    this.emoji('reloj', 80, this.cy - 190, 90).setAlpha(0.95);
    // La alfombra con el gato dormido, en el medio del camino
    const g = this.add.graphics();
    g.fillStyle(0xd94f6b, 1).fillEllipse(this.cx, this.yPiso + 12, 300, 54);
    g.lineStyle(5, 0xffd23f, 0.8).strokeEllipse(this.cx, this.yPiso + 12, 270, 40);
    this.gato = this.emoji('gato', this.cx, this.yPiso - 52, 130);
    this.zzz = this.texto(this.cx + 70, this.yPiso - 140, 'Z Z Z', 34, 0xcfe8ff);
    // El hámster (izquierda) y la galleta (derecha)
    this.x0 = 60;
    this.meta = this.W - 70;
    this.emoji('galleta', this.meta + 10, this.yPiso - 30, 80);
    this.sombraH = this.sombra(this.x0, this.yPiso + 4, 70, 0.3);
    this.x = this.x0;
    this.hamster = this.emoji('hamster', this.x, this.yPiso - 36, 84);
    this.mirar(this.hamster, 'hamster', 1);
    // La barra de ruido, arriba
    this.texto(this.cx, this.arriba + 120, 'RUIDO', 34, 0xfff1d6);
    this.add.image(this.cx, this.arriba + 168, 'atlas', 'blanco').setDisplaySize(330, 30).setTint(COLOR.OSCURO);
    this.barra = this.add.image(this.cx - 160, this.arriba + 168, 'atlas', 'blanco').setOrigin(0, 0.5)
      .setDisplaySize(1, 20).setTint(COLOR.BIEN);
    // Qué tan rápido se puede ir sin hacer ruido (px/s). Hay que ir al menos a
    // un tercio del límite para llegar a tiempo; más justo cuanto más difícil.
    const necesaria = (this.meta - this.x0) / Math.max(0.6, this.dur - 0.5);
    this.limite = necesaria * [2.6, 2.1, 1.75][this.nivel - 1];
    this.ruido = 0;
    this.destino = this.x;
    this.agarrado = false;
    this.pasos = 0;
    this.alTocar((x, y) => { if (Math.abs(x - this.x) < 110 && y > this.yPiso - 220) { this.agarrado = true; this.dx = this.x - x; } });
    this.alMover((x, y, p) => { if (p.isDown && this.agarrado) this.destino = x + this.dx; });
    this.input.on('pointerup', () => { this.agarrado = false; });
  }

  paso(dt, t) {
    if (this.decidido) {
      if (this.resultado === 'perdio') this.gato.setAngle(Math.sin(t * 30) * 8);
      return;
    }
    // El hámster sigue al dedo (no se teletransporta, pero puede ir muy rápido)
    const antes = this.x;
    const d = Math.max(this.x0, Math.min(this.meta, this.destino)) - this.x;
    this.x += Math.sign(d) * Math.min(Math.abs(d), 1100 * dt);
    const v = Math.abs(this.x - antes) / Math.max(dt, 0.001);
    this.hamster.setPosition(this.x, this.yPiso - 36 - (v > 5 ? Math.abs(Math.sin(t * 22)) * 7 : 0));
    this.sombraH.x = this.x;
    // Pasitos: más fuertes y seguidos cuanto más rápido
    this.pasos += Math.abs(this.x - antes);
    if (this.pasos > 34) { this.pasos = 0; this.audio.tictac(); }
    // El ruido sube si va más rápido que el límite y baja de a poco si no
    if (v > this.limite) this.ruido += ((v - this.limite) / this.limite) * dt * 2.6 + dt * 0.4;
    else this.ruido = Math.max(0, this.ruido - dt * 0.35);
    const k = Math.min(1, this.ruido);
    this.barra.setDisplaySize(1 + 319 * k, 20).setTint(mezcla(COLOR.BIEN, COLOR.MAL, k));
    this.gato.setAngle(k > 0.6 ? Math.sin(t * 25) * 4 * k : 0);
    this.zzz.setAlpha(1 - k * 0.8).setY(this.yPiso - 140 + Math.sin(t * 2) * 6);
    if (this.ruido >= 1) {
      this.perder();
      this.gato.setDisplaySize(170, 170);
      this.zzz.setText('');
      this.audio.alerta();
      this.cartel(this.cx, this.yPiso - 230, '¡MIAU!', COLOR.MAL, 70);
      this.tweens.add({ targets: this.hamster, y: this.hamster.y - 60, duration: 160, yoyo: true });
      return;
    }
    if (this.x >= this.meta - 2) {
      this.ganar();
      this.chispas(this.meta, this.yPiso - 40, 12);
      this.cartel(this.cx, this.arriba + 240, '¡QUÉ SIGILO!', COLOR.ORO, 60);
    }
  }
}
