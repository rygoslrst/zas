// ¡ENCIERRA LA OVEJA! — Una oveja anda suelta por el campo: hay que dibujar
// con el dedo una vuelta cerrada a su alrededor (un lazo). En el nivel 3
// también anda un zorro: si queda dentro del lazo, pierdes.
//
// El lazo se cierra solo cuando el dedo vuelve cerca de donde pasó (o al
// soltar, si la punta quedó cerca del principio). Si no encierra a nadie, se
// borra y se puede probar otra vez.
import { Micro } from '../escenas/Micro.js';
import { COLOR } from '../config.js';

const PASO_MIN = 8;               // píxeles entre puntos del lazo
const CIERRA = 46;                // tan cerca de un punto anterior, el lazo se cierra
const LARGO_MIN = 240;            // un lazo más corto no cuenta (sería un garabato)
const CUERDA = 0xc8873f;

// ¿El punto (x, y) queda dentro del polígono? (rayo hacia la derecha)
function adentro(x, y, pts) {
  let dentro = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const a = pts[i], b = pts[j];
    if ((a.y > y) !== (b.y > y) && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) dentro = !dentro;
  }
  return dentro;
}

export class Lazo extends Micro {
  static ORDEN = '¡ENCIERRA LA OVEJA!';
  static ICONO = 'oveja';          // en la galería
  static CONTROL = 'enlazar';
  // La primera vez: el juego se congela y enseña (ver Director.revisarLeccion)
  static LECCION = {
    titulo: '¡DIBUJA UNA VUELTA!', sub: 'ALREDEDOR DE LA OVEJA, SIN LEVANTAR EL DEDO',
    gesto: 'enlazar', lugar: 'arriba', listo: () => true,
    objetivo: m => ({ x: m.animales[0].x, y: m.animales[0].y }),
  };

  armar() {
    this.tema('pasto');
    // El corral: una cerca alrededor del campo
    this.x0 = 60; this.x1 = this.W - 60;
    this.y0 = Math.max(this.arriba + 150, 140); this.y1 = this.bajo - 50;
    const g = this.add.graphics();
    g.lineStyle(10, 0x7a4a24, 1).strokeRoundedRect(this.x0 - 34, this.y0 - 54, this.x1 - this.x0 + 68, this.y1 - this.y0 + 98, 22);
    g.lineStyle(4, 0xa8703c, 1).strokeRoundedRect(this.x0 - 34, this.y0 - 60, this.x1 - this.x0 + 68, this.y1 - this.y0 + 98, 22);
    for (let x = this.x0 - 34; x <= this.x1 + 34; x += 76) {
      for (const y of [this.y0 - 54, this.y1 + 44]) this.rect(x, y - 6, 12, 34, 0x6b3f1d);
    }
    this.emoji('vaquero', this.x1 - 20, this.y0 - 110, 90);
    // Los animales: la oveja (y en el nivel 3, el zorro), cada uno con su rumbo
    const rapidez = [70, 120, 135][this.nivel - 1] * Math.sqrt(this.vel);
    const nombres = this.nivel >= 3 ? ['oveja', 'zorro'] : ['oveja'];
    const lugares = this.lugares(nombres.length, this.x0 + 40, this.y0 + 40, this.x1 - 40, this.y1 - 40, 230);
    this.animales = nombres.map((nombre, i) => {
      const { x, y } = lugares[i] || { x: this.cx, y: this.cy };
      return {
        nombre, x, y, rumbo: this.azar(0, Math.PI * 2), rapidez: rapidez * (nombre === 'zorro' ? 1.1 : 1),
        giro: 0, img: this.emoji(nombre, x, y, nombre === 'oveja' ? 96 : 90), sombra: this.sombra(x, y + 46, 70, 0.25),
      };
    });
    // El lazo que se dibuja
    this.trazo = this.add.graphics().setDepth(20);
    this.puntos = [];
    this.alTocar((x, y) => { this.puntos = [{ x, y }]; this.dibujar(); });
    this.alMover((x, y, p) => { if (p.isDown && this.puntos.length) this.agregar(x, y); });
    const soltar = () => {
      const p = this.puntos;
      if (!this.decidido && p.length > 3 && this.largo(p) >= LARGO_MIN &&
          Math.hypot(p[0].x - p[p.length - 1].x, p[0].y - p[p.length - 1].y) < CIERRA * 2) this.cerrar(p);
      else this.borrar();
    };
    this.input.on('pointerup', soltar);
    this.input.on('pointerupoutside', soltar);
  }

  largo(pts) {
    let l = 0;
    for (let i = 1; i < pts.length; i++) l += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    return l;
  }

  agregar(x, y) {
    if (this.decidido) return;
    const p = this.puntos, u = p[p.length - 1];
    if (Math.hypot(x - u.x, y - u.y) < PASO_MIN) return;
    p.push({ x, y });
    // ¿Volvió cerca de un punto de antes (con bastante lazo en el medio)? Se cierra
    let largo = 0;
    for (let i = p.length - 2; i > 0; i--) {
      largo += Math.hypot(p[i + 1].x - p[i].x, p[i + 1].y - p[i].y);
      if (largo >= LARGO_MIN && Math.hypot(p[i].x - x, p[i].y - y) < CIERRA) { this.cerrar(p.slice(i)); return; }
    }
    this.dibujar();
  }

  // El lazo quedó cerrado: ¿a quién encierra?
  cerrar(lazo) {
    const dentro = this.animales.filter(a => adentro(a.x, a.y, lazo));
    this.dibujar(lazo, true);
    if (dentro.some(a => a.nombre === 'zorro')) {
      this.perder();
      this.audio.error();
      this.cartel(this.cx, this.y0 - 20, '¡ENCERRASTE AL ZORRO!', COLOR.MAL, 46);
      return;
    }
    if (dentro.some(a => a.nombre === 'oveja')) {
      this.ganar();
      this.audio.bien();
      const o = this.animales[0];
      this.rebote(o.img, 1.4);
      this.emoji('corazon', o.x + 40, o.y - 50, 50).setDepth(25);
      this.chispas(o.x, o.y, 12);
      this.cartel(this.cx, this.y0 - 20, '¡LA ATRAPASTE!', COLOR.ORO, 58);
      return;
    }
    // No encerró a nadie: el lazo se pone rojo, se borra y se prueba otra vez
    this.audio.zas();
    this.dibujar(lazo, true, COLOR.MAL);
    this.puntos = [];
    this.time.delayedCall(180, () => { if (!this.decidido && !this.puntos.length) this.trazo.clear(); });
  }

  borrar() { this.puntos = []; if (!this.decidido) this.trazo.clear(); }

  dibujar(pts = this.puntos, cerrado = false, color = CUERDA) {
    const g = this.trazo;
    g.clear();
    if (pts.length < 2) return;
    for (const [ancho, c] of [[12, COLOR.OSCURO], [7, color]]) {
      g.lineStyle(ancho, c, 1).beginPath().moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
      if (cerrado) g.closePath();
      g.strokePath();
    }
  }

  paso(dt, t) {
    if (this.decidido) return;
    const oveja = this.animales[0];
    for (const a of this.animales) {
      // Cambia de rumbo cada tanto y rebota en la cerca. El zorro no se le pega
      // a la oveja: siempre queda lugar para dibujar el lazo entre los dos.
      a.giro -= dt;
      if (a.giro <= 0) { a.rumbo += this.azar(-1.4, 1.4); a.giro = this.azar(0.5, 1.1); }
      if (a !== oveja && Math.hypot(a.x - oveja.x, a.y - oveja.y) < 200) {
        a.rumbo = Math.atan2(a.y - oveja.y, a.x - oveja.x) + this.azar(-0.5, 0.5);
        a.giro = 0.3;
      }
      a.x += Math.cos(a.rumbo) * a.rapidez * dt;
      a.y += Math.sin(a.rumbo) * a.rapidez * dt;
      if (a.x < this.x0 + 30 || a.x > this.x1 - 30) { a.rumbo = Math.PI - a.rumbo; a.x = Math.max(this.x0 + 30, Math.min(this.x1 - 30, a.x)); }
      if (a.y < this.y0 + 30 || a.y > this.y1 - 30) { a.rumbo = -a.rumbo; a.y = Math.max(this.y0 + 30, Math.min(this.y1 - 30, a.y)); }
      this.mirar(a.img, a.nombre, Math.cos(a.rumbo));
      a.img.setPosition(a.x, a.y - Math.abs(Math.sin(t * 9 + a.x)) * 6);
      a.sombra.setPosition(a.x, a.y + 46);
    }
  }
}
