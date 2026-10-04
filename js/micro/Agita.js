// ¡AGITA LA BOTELLA! — Una bebida con gas: hay que sacudir el dedo de un lado
// a otro (o de arriba abajo), rápido y sin levantarlo. Cada ida y vuelta la
// espuma sube; cuando llega arriba, ¡la tapa sale volando! Las sacudidas que
// hacen falta salen del tiempo que hay. Desde el nivel 2, si se deja de
// agitar, la espuma baja.
import { Micro, mezcla } from '../escenas/Micro.js';
import { COLOR } from '../config.js';

const UMBRAL = 45;                // px de vuelta para que cuente una sacudida (menos es temblor)
const BEBIDA = 0xc0552b, ESPUMA = 0xfff6e8, VIDRIO = 0x7fe0a8;
// La botella (relativa a su centro): el cuerpo, el hombro, el cuello y la tapa
const CUERPO = { w: 150, arriba: -140, abajo: 150 };
const CUELLO = { w: 56, arriba: -270 };

export class Agita extends Micro {
  static ORDEN = '¡AGITA LA BOTELLA!';
  static ICONO = 'estrellitas';          // en la galería
  static CONTROL = 'sacudir';
  // La primera vez: el juego se congela y enseña (ver Director.revisarLeccion)
  static LECCION = {
    titulo: '¡SACUDE EL DEDO DE UN LADO A OTRO!', sub: 'RÁPIDO Y SIN LEVANTARLO, HASTA QUE SALTE LA TAPA',
    gesto: 'sacudir', lugar: 'arriba', listo: () => true,
    objetivo: m => ({ x: m.bx, y: m.by }),
  };

  armar() {
    this.fondo([0xffe29a, 0xff7e5f], 'rayas');
    this.papelitos(10);
    this.bx = this.cx;
    this.by = this.bajo - 190;
    this.mesada(this.by + CUERPO.abajo + 4, 0x8ecae6);
    this.vineta(0.3);
    this.sombra(this.bx, this.by + CUERPO.abajo + 10, 200, 0.3);
    this.necesarias = Math.max(4, Math.round([2.6, 3.0, 3.4][this.nivel - 1] * (this.dur - 0.5)));
    this.pierde = this.nivel >= 2 ? 0.7 : 0;     // sacudidas por segundo que se pierden sin agitar
    this.carga = 0;
    this.ultima = -1;            // cuándo fue la última sacudida
    // La botella: un contenedor (para inclinarla entera), con el líquido
    // redibujado adentro y el vidrio y la etiqueta encima
    this.liquido = this.add.graphics();
    const vidrio = this.add.graphics();
    const pts = this.contorno();
    vidrio.fillStyle(VIDRIO, 0.28).fillPoints(pts, true);
    vidrio.lineStyle(9, COLOR.OSCURO, 1).strokePoints(pts, true);
    vidrio.lineStyle(10, 0xffffff, 0.5).lineBetween(-CUERPO.w / 2 + 22, CUERPO.arriba + 20, -CUERPO.w / 2 + 22, CUERPO.abajo - 30);
    vidrio.fillStyle(0xff4d5a, 1).fillRect(-CUERPO.w / 2, -20, CUERPO.w, 76);
    vidrio.fillStyle(0xffd23f, 1).fillRect(-CUERPO.w / 2, -20, CUERPO.w, 8).fillRect(-CUERPO.w / 2, 48, CUERPO.w, 8);
    vidrio.lineStyle(6, COLOR.OSCURO, 1).strokeRect(-CUERPO.w / 2, -20, CUERPO.w, 76);
    const marca = this.texto(0, 18, 'ZAS', 46);
    this.tapa = this.add.container(0, CUELLO.arriba - 10, [
      this.rect(0, 0, 76, 30, COLOR.OSCURO), this.rect(0, -1, 68, 22, 0xff4d5a), this.rect(-18, -4, 12, 8, 0xffffff, 0.6),
    ]);
    this.botella = this.add.container(this.bx, this.by, [this.liquido, vidrio, marca, this.tapa]).setDepth(2);
    this.burbujitas = Array.from({ length: 10 }, () => ({ x: this.azar(-55, 55), y: this.azar(0, 1), v: this.azar(0.3, 0.7), r: this.azar(3, 7) }));
    this.ejes = null;
    this.dedo = null;
    this.alTocar((x, y) => { this.ejes = { x: { dir: 0, ext: x }, y: { dir: 0, ext: y } }; this.desde = { x, y }; this.dedo = { x, y }; });
    this.alMover((x, y, p) => { if (p.isDown && this.ejes) { this.dedo = { x, y }; this.mover(x, y); } });
    const soltar = () => { this.ejes = null; this.dedo = null; };
    this.input.on('pointerup', soltar);
    this.input.on('pointerupoutside', soltar);
    this.dibujarLiquido(0);
  }

  // El contorno de la botella (puntos relativos a su centro)
  contorno() {
    const c = CUERPO, n = CUELLO;
    return [
      { x: -n.w / 2, y: n.arriba }, { x: n.w / 2, y: n.arriba }, { x: n.w / 2, y: c.arriba - 50 },
      { x: c.w / 2, y: c.arriba }, { x: c.w / 2, y: c.abajo - 16 }, { x: c.w / 2 - 16, y: c.abajo },
      { x: -c.w / 2 + 16, y: c.abajo }, { x: -c.w / 2, y: c.abajo - 16 }, { x: -c.w / 2, y: c.arriba },
      { x: -n.w / 2, y: c.arriba - 50 },
    ];
  }

  // Una sacudida: cuando el dedo vuelve más de UMBRAL px en algún eje
  mover(x, y) {
    for (const [eje, v] of [['x', x], ['y', y]]) {
      const s = this.ejes[eje];
      if (s.dir === 0) { if (Math.abs(v - s.ext) > UMBRAL) { s.dir = Math.sign(v - s.ext); s.ext = v; } }
      else if ((v - s.ext) * s.dir >= 0) s.ext = v;
      else if (Math.abs(v - s.ext) > UMBRAL) { s.dir = -s.dir; s.ext = v; this.sacudida(); }
    }
  }

  sacudida() {
    if (this.decidido) return;
    this.carga += 1;
    this.ultima = this.t;
    const k = Math.min(1, this.carga / this.necesarias);
    this.audio.agitar(k);
    if (this.carga >= this.necesarias) this.destapar();
  }

  destapar() {
    this.ganar();
    this.audio.destapar();
    this.dibujarLiquido(1);
    // La tapa sale volando y la espuma sale a chorros
    const tapa = this.tapa, x = this.botella.x, y = this.botella.y + CUELLO.arriba - 10;
    this.botella.remove(tapa);
    tapa.setPosition(x, y).setDepth(5);
    this.tweens.add({ targets: tapa, y: y - 420, x: x + this.azar(-80, 80), angle: 540, duration: 650, ease: 'Quad.easeOut' });
    for (let i = 0; i < 16; i++) {
      const g = this.circulo(x, y, this.azar(10, 22), ESPUMA).setDepth(4);
      this.tweens.add({
        targets: g, x: x + this.azar(-150, 150), y: y - this.azar(140, 380), alpha: 0, scale: g.scaleX * 1.6,
        delay: i * 22, duration: 600, ease: 'Quad.easeOut', onComplete: () => g.destroy(),
      });
    }
    this.botella.setAngle(0).setX(this.bx);
    this.cartel(this.cx, this.arriba + 120, '¡PSSSHHH!', COLOR.ORO, 66);
  }

  // La bebida (abajo) y la espuma (que sube con k hasta el cuello)
  dibujarLiquido(k, t = 0) {
    const g = this.liquido, c = CUERPO;
    g.clear();
    const yBebida = c.arriba + 70;                                     // la superficie de la bebida
    g.fillStyle(BEBIDA, 1).fillRoundedRect(-c.w / 2 + 6, yBebida, c.w - 12, c.abajo - yBebida - 6, 12);
    g.fillStyle(mezcla(BEBIDA, 0xffffff, 0.25), 1).fillRect(-c.w / 2 + 6, yBebida, c.w - 12, 8);
    // Burbujas que suben (más rápido cuanto más agitada)
    g.fillStyle(0xffffff, 0.55);
    for (const b of this.burbujitas) g.fillCircle(b.x, c.abajo - 10 - b.y * (c.abajo - yBebida - 20), b.r);
    if (k <= 0.01) return;
    // La espuma: de la superficie hacia arriba, primero el hombro y después el cuello
    const yEspuma = yBebida - k * (yBebida - CUELLO.arriba - 6);
    g.fillStyle(ESPUMA, 0.95);
    for (let y = yBebida + 6; y > yEspuma; y -= 16) {
      const w = y < c.arriba - 50 ? CUELLO.w - 12 : y < c.arriba ? CUELLO.w + (c.w - CUELLO.w) * ((y - (c.arriba - 50)) / 50) - 14 : c.w - 14;
      for (let x = -w / 2 + 8; x <= w / 2 - 8; x += 16) g.fillCircle(x + Math.sin(t * 9 + y) * 2, y, 11);
    }
  }

  paso(dt, t) {
    if (!this.decidido && this.pierde && t - this.ultima > 0.35) this.carga = Math.max(0, this.carga - this.pierde * dt);
    const k = this.decidido && this.resultado === 'gano' ? 1 : Math.min(1, this.carga / this.necesarias);
    for (const b of this.burbujitas) b.y = (b.y + b.v * (1 + 3 * k) * dt) % 1;
    this.dibujarLiquido(k, t);
    if (this.decidido) return;
    // La botella sigue un poco al dedo y se inclina; la tapa tiembla más cuanto más espuma
    const dx = this.dedo ? Math.max(-90, Math.min(90, (this.dedo.x - this.desde.x) * 0.6)) : 0;
    this.botella.x += (this.bx + dx - this.botella.x) * Math.min(1, dt * 20);
    this.botella.setAngle((this.botella.x - this.bx) * 0.18);
    this.tapa.setY(CUELLO.arriba - 10 - (k > 0.6 ? Math.abs(Math.sin(t * 40)) * 6 * k : 0));
  }
}
