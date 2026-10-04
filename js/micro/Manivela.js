// ¡GIRA LA MANIVELA! — Una caja sorpresa: hay que darle cuerda girando el dedo
// en círculos. Con las vueltas que pide, la tapa salta y sale la sorpresa. En
// el nivel 3 hay que girar para el lado de la flecha (al revés, se desenrolla).
//
// Cómo se cuentan las vueltas: no hace falta girar justo alrededor de la
// manivela. Se mide cuánto gira la DIRECCIÓN del dedo mientras se mueve: un
// círculo en cualquier parte es una vuelta; un zigzag de ida y vuelta, nada.
import { Micro } from '../escenas/Micro.js';
import { COLOR } from '../config.js';

const PASO_MIN = 9;               // píxeles entre muestras del dedo (menos es ruido)
const GIRO_MAX = 1.6;             // un cambio de dirección mayor es un "ida y vuelta": no cuenta
const SORPRESAS = ['sapo', 'mono', 'pollito', 'fantasma', 'unicornio', 'robot', 'pulpo'];

export class Manivela extends Micro {
  static ORDEN = '¡GIRA LA MANIVELA!';
  static ICONO = 'regalo';          // en la galería
  static CONTROL = 'girar';
  // La primera vez: el juego se congela y enseña (ver Director.revisarLeccion)
  static LECCION = {
    titulo: '¡GIRA EL DEDO EN CÍRCULOS!', sub: 'DA VUELTAS SIN LEVANTARLO, COMO CON UNA MANIVELA',
    gesto: 'girar', lugar: 'arriba', listo: () => true, grupo: 'girar',
    objetivo: m => ({ x: m.ejeX, y: m.ejeY }),
  };

  armar() {
    this.tema('fiesta');
    const yPiso = this.bajo - 40;
    this.piso(yPiso, 0x8a4fbf);
    // Las vueltas que hacen falta salen del tiempo que hay (unas 2,5 por segundo
    // se dan sin apuro)
    this.vueltas = Math.max(2, Math.round([0.85, 1.0, 1.15][this.nivel - 1] * (this.dur - 0.5)));
    this.sentido = this.nivel >= 3 ? (Math.random() < 0.5 ? 1 : -1) : 0;      // 0: cualquiera
    this.giro = 0;                 // radianes acumulados (con signo)
    this.cuartos = 0;              // para el ruidito de cada cuarto de vuelta

    // La caja: cuerpo con rombos, la tapa y la sombra
    const bx = this.cx - 40, by = yPiso - 110, ancho = 230, alto = 200;
    this.sombra(bx, yPiso + 6, 280, 0.3);
    this.caja = this.add.container(bx, by);
    const g = this.add.graphics();
    g.fillStyle(COLOR.OSCURO, 1).fillRoundedRect(-ancho / 2 - 5, -alto / 2 - 5, ancho + 10, alto + 10, 18);
    g.fillStyle(0xff4d5a, 1).fillRoundedRect(-ancho / 2, -alto / 2, ancho, alto, 14);
    g.fillStyle(0xffd23f, 1);
    for (let i = 0; i < 3; i++) {
      const x = -70 + i * 70;
      g.fillPoints([{ x, y: -38 }, { x: x + 26, y: 0 }, { x, y: 38 }, { x: x - 26, y: 0 }], true);
    }
    g.fillStyle(0xffffff, 0.25).fillRoundedRect(-ancho / 2 + 12, -alto / 2 + 10, 18, alto - 20, 8);
    this.caja.add(g);
    this.tapa = this.add.container(bx, by - alto / 2 - 4);
    const t = this.add.graphics();
    t.fillStyle(COLOR.OSCURO, 1).fillRoundedRect(-ancho / 2 - 15, -15, ancho + 30, 30, 10);
    t.fillStyle(0x3d8bff, 1).fillRoundedRect(-ancho / 2 - 10, -11, ancho + 20, 22, 8);
    this.tapa.add(t);
    this.yTapa = this.tapa.y;

    // La manivela, al costado: el eje, el brazo y la perilla (gira con el giro)
    this.ejeX = bx + ancho / 2 + 46;
    this.ejeY = by + 10;
    this.circulo(this.ejeX - 26, this.ejeY, 12, COLOR.OSCURO);
    this.rect(this.ejeX - 16, this.ejeY, 34, 12, 0x8a8f98);
    this.brazo = this.add.container(this.ejeX, this.ejeY);
    const b = this.add.graphics();
    b.fillStyle(COLOR.OSCURO, 1).fillRoundedRect(-8, -64, 16, 72, 8);
    b.fillStyle(0xcfd4dc, 1).fillRoundedRect(-5, -61, 10, 66, 5);
    b.fillStyle(COLOR.OSCURO, 1).fillCircle(0, -62, 17);
    b.fillStyle(0xffd23f, 1).fillCircle(0, -62, 13);
    b.fillStyle(COLOR.OSCURO, 1).fillCircle(0, 0, 11);
    b.fillStyle(0x8a8f98, 1).fillCircle(0, 0, 8);
    this.brazo.add(b);

    // En el nivel 3, una flecha curva dice para qué lado
    if (this.sentido) {
      const f = this.add.graphics();
      const r = 100, a0 = -2.4, a1 = 0.6;
      f.lineStyle(12, COLOR.OSCURO, 1).beginPath().arc(this.ejeX, this.ejeY, r, a0, a1).strokePath();
      f.lineStyle(7, COLOR.BIEN, 1).beginPath().arc(this.ejeX, this.ejeY, r, a0, a1).strokePath();
      const fin = this.sentido > 0 ? a1 : a0, px = this.ejeX + Math.cos(fin) * r, py = this.ejeY + Math.sin(fin) * r;
      const ang = fin + (this.sentido > 0 ? Math.PI / 2 : -Math.PI / 2);
      this.add.image(px, py, 'atlas', 'flecha').setDisplaySize(46, 46).setRotation(ang).setTint(COLOR.BIEN);
    }

    // La cuerda que se va cargando: una barra arriba de la caja
    this.rect(bx, by - alto / 2 - 70, 200, 22, COLOR.OSCURO, 0.7);
    this.barra = this.rect(bx - 96, by - alto / 2 - 70, 192, 14, COLOR.ORO).setOrigin(0, 0.5);
    this.barra.displayWidth = 1;
    this.cuenta = this.texto(bx, by - alto / 2 - 118, `0 / ${this.vueltas}`, 44);

    this.sorpresa = this.elegir(SORPRESAS);
    this.ultimo = null;            // última muestra del dedo
    this.rumbo = null;             // dirección del último tramo
    const soltar = () => { this.ultimo = null; this.rumbo = null; };
    this.alTocar((x, y) => { this.ultimo = { x, y }; this.rumbo = null; });
    this.alMover((x, y, p) => { if (p.isDown) this.mover(x, y); });
    this.input.on('pointerup', soltar);
    this.input.on('pointerupoutside', soltar);
  }

  // Cada tramo del dedo: cuánto giró su dirección respecto del anterior
  mover(x, y) {
    if (!this.ultimo) { this.ultimo = { x, y }; return; }
    const dx = x - this.ultimo.x, dy = y - this.ultimo.y;
    if (Math.hypot(dx, dy) < PASO_MIN) return;
    const rumbo = Math.atan2(dy, dx);
    if (this.rumbo !== null) {
      let d = rumbo - this.rumbo;
      while (d > Math.PI) d -= 2 * Math.PI;
      while (d < -Math.PI) d += 2 * Math.PI;
      if (Math.abs(d) < GIRO_MAX) this.girar(d);
    }
    this.rumbo = rumbo;
    this.ultimo = { x, y };
  }

  // Cuánto se lleva dado, en vueltas (en el nivel 3, sólo para el lado pedido)
  get dadas() {
    const v = this.giro / (2 * Math.PI);
    return this.sentido ? Math.max(0, v * this.sentido) : Math.abs(v);
  }

  girar(d) {
    if (this.decidido) return;
    this.giro += d;
    // En el nivel 3, para el otro lado se desenrolla (pero no baja de cero)
    if (this.sentido && this.giro * this.sentido < 0) this.giro = 0;
    const v = this.dadas;
    this.brazo.setRotation(this.giro);
    this.barra.displayWidth = Math.max(1, 192 * Math.min(1, v / this.vueltas));
    this.cuenta.setText(`${Math.min(this.vueltas, Math.floor(v))} / ${this.vueltas}`);
    const cuartos = Math.floor(v * 4);
    if (cuartos > this.cuartos) this.audio.inflar(Math.min(1, v / this.vueltas));
    this.cuartos = cuartos;
    if (v >= this.vueltas) this.abrir();
  }

  abrir() {
    if (!this.ganar()) return;
    this.audio.pop();
    // La tapa sale volando y aparece la sorpresa sobre un resorte
    this.tweens.add({ targets: this.tapa, y: this.yTapa - 260, x: this.tapa.x - 120, angle: -160, alpha: 0, duration: 650, ease: 'Quad.easeOut' });
    const resorte = this.add.graphics().setDepth(2);
    const x = this.caja.x, y0 = this.yTapa;
    const sorpresa = this.emoji(this.sorpresa, x, y0, 130).setDepth(3).setScale(0.2);
    this.tweens.addCounter({
      from: 0, to: 1, duration: 420, ease: 'Back.easeOut',
      onUpdate: tw => {
        const k = tw.getValue(), alto = 150 * k;
        resorte.clear().lineStyle(8, COLOR.OSCURO, 1).beginPath().moveTo(x, y0);
        for (let i = 1; i <= 8; i++) resorte.lineTo(x + (i % 2 ? 22 : -22), y0 - (alto * i) / 8);
        resorte.strokePath();
        sorpresa.setPosition(x, y0 - alto - 50).setDisplaySize(130 * Math.max(0.2, k), 130 * Math.max(0.2, k));
      },
    });
    this.confeti(x, y0 - 160, 24);
    this.cartel(this.cx, this.cy - 260, '¡SORPRESA!', COLOR.ORO, 66);
  }

  alPerder() {
    this.tweens.add({ targets: this.tapa, angle: 6, duration: 70, yoyo: true, repeat: 3 });
    this.cartel(this.cx, this.cy - 260, '¡LE FALTÓ CUERDA!', COLOR.MAL, 52);
  }

  paso(dt, t) {
    // La caja tiembla cada vez más a medida que se carga
    if (this.decidido) return;
    const k = Math.min(1, this.dadas / this.vueltas);
    this.caja.setAngle(Math.sin(t * 40) * 2.5 * k);
    this.tapa.setY(this.yTapa - Math.abs(Math.sin(t * 30)) * 6 * k);
  }
}
