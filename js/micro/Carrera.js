// JEFE — ¡ESCAPÁ! Una carrera con obstáculos: tocá para saltar. Un ogro te
// persigue: cada choque lo acerca; al tercero, te atrapa. Llegá a la bandera.
import { Micro } from '../escenas/Micro.js';
import { COLOR } from '../config.js';

const TIPOS = [
  { nombre: 'cactus', tam: 80, alto: 66 },
  { nombre: 'roca', tam: 64, alto: 44 },
  { nombre: 'caja', tam: 66, alto: 56 },
];

export class Carrera extends Micro {
  static ORDEN = '¡ESCAPA!';
  static ICONO = 'ogro';          // en la galería
  static CONTROL = 'tocar';
  static PULSOS = 26;
  static JEFE = true;
  static RETRATO = 'ogro';
  static NOMBRE_JEFE = 'EL OGRO';
  // La primera vez: se congela justo cuando hay que saltar la primera piedra
  static LECCION = {
    titulo: '¡TOCA PARA SALTAR!', sub: 'SI CHOCAS TRES VECES, EL OGRO TE ATRAPA',
    gesto: 'tocar', lugar: 'arriba',
    listo: m => m.obstaculos[0].x - m.x <= m.rapidez * m.duracionSalto * 0.5 + 10,
    objetivo: m => ({ x: m.x, y: m.suelo - 48 }),
  };

  armar() {
    this.tema('atardecer');
    this.emoji('sol', 440, this.arriba + 240, 130);
    // Cerros lejanos (se mueven despacio: dan profundidad)
    this.suelo = this.cy + 170;
    this.cerros = [];
    for (let i = 0; i < 4; i++) {
      const c = this.add.image(i * 220, this.suelo + 30, 'atlas', 'circulo').setDisplaySize(320, 200).setTint(0xd9824f).setAlpha(0.8);
      this.cerros.push(c);
    }
    this.piso(this.suelo, 0xe0a458);
    this.rapidez = 360 * Math.sqrt(this.vel);
    this.duracionSalto = 0.62 / Math.sqrt(this.vel);
    this.x = 170;
    this.corredor = this.emoji('corredor', this.x, this.suelo - 48, 96);
    this.mirar(this.corredor, 'corredor', 1);
    this.sombraCorredor = this.sombra(this.x, this.suelo + 2, 70);
    this.enAire = false;
    this.tSalto = 0;
    this.golpes = 0;
    this.invulnerable = -1;
    this.ogro = this.emoji('ogro', 40, this.suelo - 55, 110);
    // La pista: obstáculos con separaciones variadas; desde el nivel 2, algunos de a dos.
    // Nunca más larga de lo que se llega a correr con el tiempo (sobra un 15 %)
    const n = [8, 10, 12][this.nivel - 1];
    const tope = this.x + this.rapidez * this.dur * 0.85 - 60;
    this.obstaculos = [];
    let x = this.W + 120;
    for (let i = 0; i < n && x + 72 < tope; i++) {
      // Los pares van siempre de dos piedras bajas: se pasan con un solo salto
      const doble = this.nivel >= 2 && Math.random() < 0.3;
      const tipo = doble ? TIPOS[1] : this.elegir(TIPOS);
      this.obstaculos.push({ ...tipo, x, img: this.emoji(tipo.nombre, x, this.suelo - tipo.tam / 2 + 4, tipo.tam) });
      if (doble) {
        x += 72;
        this.obstaculos.push({ ...TIPOS[1], x, img: this.emoji('roca', x, this.suelo - 28, 64) });
      }
      x += this.azar(270, 380);
    }
    this.xMeta = Math.min(x, tope) + 60;
    this.bandera = this.emoji('bandera', this.xMeta, this.suelo - 50, 100);
    this.largo = this.xMeta - this.x;
    this.recorrido = 0;
    // Arriba: vidas de la carrera y el avance hasta la bandera
    this.vidas = [0, 1, 2].map(i => this.emoji('corazon', this.cx - 60 + i * 60, this.arriba + 40, 46));
    this.rect(this.cx, this.arriba + 100, 380, 10, COLOR.OSCURO, 0.6);
    this.emoji('bandera', this.cx + 200, this.arriba + 88, 40);
    this.marcador = this.emoji('corredor', this.cx - 190, this.arriba + 92, 40);
    this.mirar(this.marcador, 'corredor', 1);
    this.alTocar(() => {
      if (this.enAire) return;
      this.enAire = true;
      this.tSalto = this.t;
      this.audio.salto();
      this.humo(this.x - 20, this.suelo - 10, 44);
    });
  }

  alPerder() {
    this.corredor.setTexture('emoji', 'mareado');
    this.tweens.add({ targets: this.ogro, x: this.x - 30, duration: 250 });
    this.cartel(this.cx, this.cy - 60, '¡TE ATRAPÓ!', COLOR.MAL, 64);
  }

  paso(dt, t) {
    if (this.decidido) return;
    // El corredor (salto en parábola) y su sombra
    let y = this.suelo - 48;
    if (this.enAire) {
      const p = (t - this.tSalto) / this.duracionSalto;
      if (p >= 1) this.enAire = false;
      else y -= 4 * 170 * p * (1 - p);
    }
    const parpadeo = t < this.invulnerable && Math.floor(t * 16) % 2;
    this.corredor.setPosition(this.x, y + (this.enAire ? 0 : -Math.abs(Math.sin(t * 16)) * 5))
      .setAngle(this.enAire ? -10 : 0).setAlpha(parpadeo ? 0.35 : 1);
    this.sombraCorredor.setScale(this.sombraCorredor.scaleX, this.sombraCorredor.scaleY).setAlpha(this.enAire ? 0.12 : 0.25);
    // Todo avanza hacia la izquierda
    const dx = this.rapidez * dt;
    this.recorrido += dx;
    for (const c of this.cerros) { c.x -= dx * 0.25; if (c.x < -170) c.x += 880; }
    for (const o of this.obstaculos) {
      o.x -= dx;
      o.img.x = o.x;
      const altura = this.suelo - 48 - y;                       // cuánto subió el corredor
      if (!o.chocado && t >= this.invulnerable && Math.abs(o.x - this.x) < 32 && altura < o.alto - 8) this.choque(o, t);
    }
    this.xMeta -= dx;
    this.bandera.x = this.xMeta;
    // El ogro te sigue, más cerca con cada choque
    this.ogro.setPosition(40 + this.golpes * 34 + Math.sin(t * 12) * 4, this.suelo - 55 - Math.abs(Math.sin(t * 12)) * 6);
    this.marcador.x = this.cx - 190 + 380 * Math.min(1, this.recorrido / this.largo);
    if (this.xMeta <= this.x) {
      this.ganar();
      this.confeti(this.x, this.suelo - 100);
      this.cartel(this.cx, this.cy - 60, '¡ESCAPASTE!', COLOR.ORO, 64);
    }
  }

  choque(o, t) {
    o.chocado = true;
    this.golpes++;
    this.invulnerable = t + 0.8;
    this.audio.golpe();
    this.cameras.main.shake(150, 0.01);
    this.tweens.add({ targets: o.img, y: o.img.y - 120, angle: 200, alpha: 0, duration: 400 });
    const v = this.vidas[3 - this.golpes];
    if (v) v.setTexture('emoji', 'corazon_negro');
    if (this.golpes >= 3) this.perder();
  }
}
