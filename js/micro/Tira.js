// JEFE — ¡TIRA DE LA CUERDA! Zas contra el león, cada uno de un lado de un
// charco de barro. Hay que tocar rápido, muchas veces: cada toque tira de la
// cuerda hacia nuestro lado. El león tira todo el tiempo y, de a ratos, ruge
// y da un tirón más fuerte (avisa: se sacude un momento antes). Gana el que
// arrastra al otro hasta el barro. La fuerza del león sale del tiempo que
// hay: tocando a ritmo de persona (5,5 a 7 toques por segundo, según el
// nivel) se gana con un cuarto del tiempo de sobra.
import { Micro, mezcla } from '../escenas/Micro.js';
import { COLOR } from '../config.js';

const IMPULSO = 0.045;            // cuánto tira cada toque (la cuerda va de -1 a 1)
const LADO = 170;                 // px del medio a cada uno (el león a la izquierda, Zas a la derecha)
const BARRO = 0x7a4a2a;

export class Tira extends Micro {
  static ORDEN = '¡TIRA DE LA CUERDA!';
  static ICONO = 'leon';          // en la galería
  static CONTROL = 'machacar';
  static PULSOS = 20;
  static JEFE = true;
  static RETRATO = 'leon';
  static NOMBRE_JEFE = 'EL LEÓN FORZUDO';
  // La de "toca rápido" se enseña una sola vez (con ¡INFLA!, ¡DESPEGA!...)
  static LECCION = {
    grupo: 'machacar', titulo: '¡TOCA MUY RÁPIDO!', sub: 'CADA TOQUE TIRA DE LA CUERDA: ¡LLEVA AL LEÓN AL BARRO!',
    gesto: 'machacar', lugar: 'arriba', listo: () => true,
    objetivo: m => ({ x: m.cx + 120, y: m.yPiso - 220 }),
  };

  armar() {
    this.tema('cielo');
    this.yPiso = Math.min(this.cy + 150, this.bajo - 120);
    this.horizonte(this.yPiso, 'cerros', 0x8fd18a);
    this.piso(this.yPiso, 0x5fbf4a);
    // El suelo que se corre: el charco de barro (empieza en el medio) y matas
    // de pasto. Los dos se quedan en su lugar y el barro se acerca al que va
    // perdiendo: así nadie se sale de la pantalla.
    const g = this.add.graphics();
    g.fillStyle(mezcla(BARRO, 0x000000, 0.3), 1).fillEllipse(0, 44, 200, 74);
    g.fillStyle(BARRO, 1).fillEllipse(0, 40, 184, 62);
    g.fillStyle(mezcla(BARRO, 0xffffff, 0.2), 1).fillEllipse(-36, 30, 54, 14).fillEllipse(44, 46, 36, 10);
    g.fillStyle(0x3f8f46, 1);
    for (let x = -500; x <= 500; x += 70) {
      if (Math.abs(x) < 130) continue;
      const y = 70 + ((x * 7) % 3) * 12;
      g.fillTriangle(x - 10, y, x - 4, y - 18, x + 2, y).fillTriangle(x, y, x + 6, y - 22, x + 12, y);
    }
    this.suelo = this.add.container(this.cx, this.yPiso, [g]);
    // La fuerza del león: lo que no alcanza a ganarle una persona tocando a buen ritmo
    const toques = [5.5, 6.3, 7.0][this.nivel - 1];
    const media = Math.max(0.05, toques * IMPULSO - 1 / (0.75 * this.dur));
    this.cadaRugido = [2.6, 2.3, 2.0][this.nivel - 1];
    this.fuerza = media / (1 + 0.8 / this.cadaRugido);       // los tirones fuertes suman, en promedio, eso
    this.proximoRugido = this.cadaRugido * this.azar(0.6, 0.9);
    this.rugeDesde = -1;          // aviso: se sacude
    this.tironHasta = -1;         // tirón fuerte (el doble)
    this.p = 0;                   // -1: el león nos arrastró · 1: lo arrastramos al barro
    this.visto = 0;               // lo que se ve (sigue a p, suave)
    // La cuerda, la cinta del medio, el león y Zas
    this.yCuerda = this.yPiso - 52;
    this.cuerda = this.add.graphics().setDepth(2);
    this.cinta = this.add.container(this.cx, this.yCuerda, [
      this.rect(0, 16, 14, 40, COLOR.OSCURO), this.rect(0, 16, 8, 34, 0xff4d5a),
    ]).setDepth(3);
    this.sombra(this.cx - LADO, this.yPiso + 4, 140, 0.3);
    this.sombra(this.cx + LADO, this.yPiso + 4, 120, 0.3);
    this.leon = this.emoji('leon', this.cx - LADO, this.yPiso - 70, 150).setDepth(1);
    this.zas = this.add.image(this.cx + LADO, this.yPiso - 72, 'emoji', 'bomba').setDisplaySize(120, 120).setDepth(1);
    this.caraZas = null;          // (la escena se reutiliza: la cara de la vez anterior no cuenta)
    this.cara('feliz');
    // Arriba, quién va ganando: una barra con el león a la izquierda y Zas a la derecha
    this.yBarra = this.arriba + 130;
    this.rect(this.cx, this.yBarra, 340, 30, COLOR.OSCURO, 0.85);
    this.rect(this.cx - 84, this.yBarra, 164, 20, 0xff9f1c);
    this.rect(this.cx + 84, this.yBarra, 164, 20, 0x3d8bff);
    this.rect(this.cx, this.yBarra, 4, 30, 0xffffff);
    this.emoji('leon', this.cx - 200, this.yBarra, 52);
    this.emoji('bomba', this.cx + 200, this.yBarra, 52);
    this.marca = this.rect(this.cx, this.yBarra, 12, 44, 0xffffff);
    this.alTocar(() => this.tirar());
  }

  // La cara de Zas (la mascota; si no está, la bomba de siempre)
  cara(nombre) {
    if (this.caraZas === nombre) return;
    this.caraZas = nombre;
    if (this.director.hayMascota) this.director.ponerCara(this.zas, nombre, 112);
  }

  tirar() {
    if (this.decidido) return;
    this.p += IMPULSO;
    this.audio.tiron();
    this.zas.setAngle(16);
    this.tweens.add({ targets: this.zas, angle: 6, duration: 120 });
    if (Math.random() < 0.3) this.humo(this.zas.x + 50, this.yPiso - 6, 40);
    if (this.p >= 1) this.final(true);
  }

  final(gano) {
    this.p = gano ? 1 : -1;
    this.visto = this.p;
    this.ubicar(0);
    const quien = gano ? this.leon : this.zas;
    const xMedio = gano ? this.cx - LADO : this.cx + LADO;
    if (gano) {
      this.ganar();
      this.cara('euforico');
      this.confeti(this.cx, this.cy - 80, 28);
      this.cartel(this.cx, this.cy - 120, '¡AL BARRO!', COLOR.ORO, 72);
    } else {
      this.perder();
      this.cara('llorando');
      this.cartel(this.cx, this.cy - 120, '¡TE GANÓ!', COLOR.MAL, 66);
    }
    this.audio.plaf();
    quien.setTint(0xb08060);
    this.tweens.add({ targets: quien, y: this.yPiso + 10, angle: gano ? -40 : 40, duration: 300, ease: 'Quad.easeIn' });
    for (let i = 0; i < 6; i++) this.chispas(xMedio + this.azar(-60, 60), this.yPiso + 30, 2, BARRO, 0.9);
  }

  // El barro se acerca al que va perdiendo (p = 1: está debajo del león)
  ubicar(t) {
    const xl = this.cx - LADO, xz = this.cx + LADO;
    const sacude = t < this.tironHasta ? Math.sin(t * 50) * 4 : 0;
    this.leon.x = xl + sacude + this.visto * 14;
    this.zas.x = xz + this.visto * 14;
    this.suelo.x = this.cx - this.visto * LADO;
    this.marca.x = this.cx + this.visto * 160;
    const g = this.cuerda;
    g.clear();
    g.lineStyle(14, COLOR.OSCURO, 1).lineBetween(xl + 40, this.yCuerda, xz - 40, this.yCuerda);
    g.lineStyle(8, 0xd9b38c, 1).lineBetween(xl + 40, this.yCuerda, xz - 40, this.yCuerda);
    g.lineStyle(3, 0xa5784f, 1);
    for (let x = xl + 50; x < xz - 50; x += 18) g.lineBetween(x, this.yCuerda - 4, x + 8, this.yCuerda + 4);
  }

  paso(dt, t) {
    if (this.decidido) return;
    // Los rugidos: primero se sacude (aviso) y después tira el doble
    if (t >= this.proximoRugido) {
      this.proximoRugido = t + this.cadaRugido * this.azar(0.85, 1.15);
      this.rugeDesde = t;
      this.tironHasta = t + 0.45 + 0.8;
      this.audio.rugido();
      this.cartel(this.leon.x, this.yPiso - 190, '¡GRRR!', COLOR.MAL, 48);
      this.cara('asustado');
    }
    const tironFuerte = t >= this.rugeDesde + 0.45 && t < this.tironHasta;
    if (t >= this.tironHasta) this.cara(this.p > 0.4 ? 'cool' : 'feliz');
    this.p -= this.fuerza * (tironFuerte ? 2 : 1) * dt;
    this.leon.setAngle(-12 - (tironFuerte ? 10 : 0));
    if (this.p <= -1) { this.final(false); return; }
    this.visto += (this.p - this.visto) * Math.min(1, dt * 14);
    this.ubicar(t);
  }
}
