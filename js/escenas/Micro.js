// ============================================================================
//  Micro.js — lo que tienen en común todos los microjuegos
// ----------------------------------------------------------------------------
//  Cada microjuego es una escena de Phaser que el Director lanza, deja correr
//  unos segundos y apaga. Al apagarse, Phaser destruye todo lo que creó: por
//  eso un microjuego puede crear sus objetos sin pools ni limpieza.
//
//  Para hacer uno nuevo: una clase que extiende Micro, con
//    static ORDEN = '¡ATRAPÁ!'      la consigna que se ve al empezar
//    static CONTROL = 'arrastrar'   tocar | arrastrar | deslizar | mantener | machacar | girar |
//                                   enlazar | sacudir | nada (la ayuda y la mano de la orden, en el Director)
//    static ICONO = 'globo'         el emoji que lo representa en la galería
//    static LECCION = {...}         opcional: lección de "primera vez" (ver Director.revisarLeccion)
//    static PULSOS = 8              cuánto dura, en pulsos de la música
//    static GANA_AL_FINAL = false   true: aguantar hasta el final es ganar
//    static VARIANTES = [...]       opcional: [{ orden: '¡CORTÁ EL ROJO!', ... }]; la
//                                   que toque llega en this.variante
//    armar()                        crea la escena (usa this.nivel y this.vel)
//    paso(dt, t)                    cada cuadro; t = segundos desde que empezó
//  y llamando a this.ganar() o this.perder() cuando corresponda. Después se
//  agrega a js/micro/indice.js. Nada más.
//
//  Coordenadas: siempre 540 de ancho (ver ESCALA en config.js). La cámara
//  tiene zoom para dibujar a la resolución real de la pantalla.
// ============================================================================

import { ANCHO, VISTA, ESCALA, COLOR, PARTIDA, MENOS_MOVIMIENTO } from '../config.js';
import { CELDA_EMOJI, TAM_EMOJI } from '../datos/emoji.js';

// Emoji de Noto que miran hacia la izquierda
const MIRAN_IZQUIERDA = new Set(['pez', 'pez_globo', 'pollito', 'abeja', 'tiburon', 'corredor', 'pato',
  'ballena', 'dinosaurio', 'unicornio', 'tortuga', 'cohete', 'hormiga', 'oveja']);

// Fondos temáticos: [color de arriba, color de abajo], patrón y decoración animada
export const TEMAS = {
  cielo:     { colores: [0xc4f1ff, 0x4d96ff], patron: null, deco: 'nubes' },
  atardecer: { colores: [0xffe29a, 0xff7e5f], patron: null, deco: null },
  noche:     { colores: [0x3a2a7a, 0x0d0826], patron: null, deco: 'estrellas' },
  mar:       { colores: [0x49c6e5, 0x0b3d91], patron: null, deco: 'mar' },
  pasto:     { colores: [0xc5ef6a, 0x3fa34d], patron: 'rayas', deco: null },
  madera:    { colores: [0xb87945, 0x5c3a1e], patron: 'rayas', deco: null },
  cocina:    { colores: [0xfff4e0, 0xffc9a0], patron: 'cuadros', deco: null },
  oscuro:    { colores: [0x44476a, 0x17182b], patron: 'rayas', deco: null },
  fiesta:    { colores: [0xffb3e6, 0x7b3fa0], patron: 'lunares', deco: 'fiesta' },
  escenario: { colores: [0xb83a8a, 0x2a0f3d], patron: 'rayas', deco: 'escenario' },
};

// Mezcla de colores (k = 0: a; k = 1: b)
export function mezcla(a, b, k) {
  const c = (s) => ((a >> s & 255) * (1 - k) + (b >> s & 255) * k) & 255;
  return (c(16) << 16) | (c(8) << 8) | c(0);
}

export class Micro extends Phaser.Scene {
  static ORDEN = '¡YA!';
  static CONTROL = 'tocar';
  static PULSOS = 8;
  static GANA_AL_FINAL = false;

  init(d) {
    this.director = d.director;
    this.audio = d.audio;
    this.nivel = d.nivel;          // 1, 2 o 3: cuánto más difícil
    this.vel = d.vel;              // 1 a ~1,85: cuánto más rápido
    this.dur = d.dur;              // segundos que dura
    this.t0 = d.t0;
    this.variante = d.variante;    // si la clase define VARIANTES, la que tocó
    this.resultado = null;
    this.W = ANCHO;
    this.H = VISTA.alto;
    this.cx = ANCHO / 2;
    this.cy = VISTA.alto / 2;
    // Zona segura: lo importante va entre estas dos alturas. "bajo" deja libre
    // la franja de abajo, donde se quema la mecha.
    this.arriba = this.cy - 380;
    this.abajo = this.cy + 380;
    this.bajo = Math.min(this.abajo, this.H - 90);
    this.deco = [];
  }

  create() {
    this.cameras.main.setOrigin(0, 0).setZoom(ESCALA.k);
    this.armar();
  }

  update(time, deltaMs) {
    if (this.director.congelado) return;       // lección de la práctica: todo quieto
    if (this.audio.ahora() < this.director.golpeHasta) return;  // "golpe" al ganar: un instante quieto (en el reloj del juego)
    const dt = Math.min(0.05, deltaMs / 1000), t = this.t;
    if (this.deco.length) this.animarDeco(dt, t);
    this.paso(dt, t);
  }

  // Segundos desde que empezó, con el reloj de la música.
  get t() { return this.audio.ahora() - this.t0; }
  get resta() { return this.dur - this.t; }
  get decidido() { return this.resultado !== null; }

  // Los microjuegos los redefinen
  armar() {}
  paso() {}
  alGanar() {}     // por ejemplo, cuando gana porque se acabó el tiempo
  alPerder() {}

  // --------------------------------------------------------------------------
  //  Resultado
  // --------------------------------------------------------------------------
  ganar() {
    if (this.resultado) return false;
    this.resultado = 'gano';
    this.director.decidir(true);
    this.destello(0xffd23f, 0.75);
    this.alGanar();
    return true;
  }

  perder() {
    if (this.resultado) return false;
    this.resultado = 'perdio';
    this.director.decidir(false);
    this.destello(COLOR.MAL, 0.85);
    this.cameras.main.shake(180, 0.012);
    this.alPerder();
    return true;
  }

  // Un brillo de color en los bordes de la pantalla, que se apaga enseguida
  destello(color, alfa) {
    const v = this.add.image(0, 0, 'atlas', 'vineta').setOrigin(0).setDisplaySize(this.W, this.H)
      .setTint(color).setAlpha(MENOS_MOVIMIENTO ? alfa * 0.4 : alfa).setDepth(60);
    this.tweens.add({ targets: v, alpha: 0, duration: 420, ease: 'Quad.easeOut', onComplete: () => v.destroy() });
  }

  // --------------------------------------------------------------------------
  //  Entrada: se ignoran los toques de los primeros instantes (el dedo del
  //  microjuego anterior) y los que llegan cuando ya se decidió. Las
  //  coordenadas llegan ya en el sistema de 540 de ancho.
  // --------------------------------------------------------------------------
  vale() { return !this.resultado && this.t >= PARTIDA.GRACIA_S; }
  punto(p) { return this.cameras.main.getWorldPoint(p.x, p.y); }
  alTocar(fn) { this.input.on('pointerdown', p => { if (this.vale()) { const q = this.punto(p); fn(q.x, q.y, p); } }); }
  alSoltar(fn) { this.input.on('pointerup', p => { if (this.vale()) { const q = this.punto(p); fn(q.x, q.y, p); } }); }
  alMover(fn) { this.input.on('pointermove', p => { if (this.vale()) { const q = this.punto(p); fn(q.x, q.y, p); } }); }

  // --------------------------------------------------------------------------
  //  Azar
  // --------------------------------------------------------------------------
  azar(a, b) { return a + Math.random() * (b - a); }
  entero(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
  elegir(lista) { return lista[Math.floor(Math.random() * lista.length)]; }
  mezclar(lista) {
    const l = [...lista];
    for (let i = l.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [l[i], l[j]] = [l[j], l[i]]; }
    return l;
  }

  // --------------------------------------------------------------------------
  //  Fondos: degradé vertical (claro arriba, oscuro abajo), una luz suave en
  //  el centro, un patrón, luces desenfocadas que flotan (dan profundidad) y
  //  una viñeta en los bordes. fondo() sin nada elige un color vivo al azar.
  // --------------------------------------------------------------------------
  fondo(color = this.elegir(COLOR.FONDOS), patron = this.elegir(['rayas', 'lunares', null])) {
    const [c1, c2] = Array.isArray(color) ? color : [mezcla(color, 0xffffff, 0.28), mezcla(color, 0x000000, 0.22)];
    this.add.image(0, 0, 'atlas', 'blanco').setOrigin(0).setDisplaySize(this.W, this.H).setTint(c2);
    this.add.image(0, 0, 'atlas', 'degradeV').setOrigin(0).setDisplaySize(this.W, this.H).setTint(c1);
    this.add.image(this.cx, this.cy - 60, 'atlas', 'brillo').setDisplaySize(this.W * 1.5, this.H * 0.85)
      .setTint(mezcla(c1, 0xffffff, 0.45)).setAlpha(0.3);
    if (patron) this.add.tileSprite(0, 0, this.W, this.H, 'atlas', patron).setOrigin(0).setAlpha(0.1);
    const luz = mezcla(c1, 0xffffff, 0.55);
    for (let i = 0; i < 7; i++) {
      const tam = this.azar(70, 210);
      const obj = this.add.image(this.azar(0, this.W), this.azar(0, this.H), 'atlas', i % 2 ? 'circulo' : 'brillo')
        .setDisplaySize(tam, tam).setTint(luz).setAlpha(i % 2 ? this.azar(0.05, 0.09) : this.azar(0.12, 0.22));
      this.deco.push({ obj, tipo: 'bokeh', vx: this.azar(-8, 8), vy: -this.azar(6, 18), r: tam / 2 });
    }
    this.add.image(0, 0, 'atlas', 'vineta').setOrigin(0).setDisplaySize(this.W, this.H).setTint(COLOR.OSCURO).setAlpha(0.42);
    this.colorFondo = Array.isArray(color) ? c2 : color;
    return this.colorFondo;
  }

  tema(nombre) {
    const t = TEMAS[nombre];
    this.fondo(t.colores, t.patron);
    if (t.deco === 'nubes') this.nubes(3);
    else if (t.deco === 'estrellas') this.estrellas(28);
    else if (t.deco === 'mar') { this.haces(3); this.burbujas(12); }
    else if (t.deco === 'fiesta') { this.papelitos(16); this.banderines(); }
    else if (t.deco === 'escenario') { this.haces(3); this.ampolletas(); }
    return t.colores[1];
  }

  // Piso: bloque de color con un borde más claro arriba
  piso(y, color) {
    this.add.image(0, y, 'atlas', 'blanco').setOrigin(0).setDisplaySize(this.W, this.H - y).setTint(color);
    this.add.image(0, y, 'atlas', 'degradeV').setOrigin(0).setDisplaySize(this.W, 60).setTint(mezcla(color, 0xffffff, 0.25)).setAlpha(0.8);
    this.add.image(0, y, 'atlas', 'blanco').setOrigin(0, 0.5).setDisplaySize(this.W, 8).setTint(mezcla(color, 0x000000, 0.35));
  }

  // --------------------------------------------------------------------------
  //  Escenografía quieta (cocinas, paredes, ventanas, horizontes). Se dibuja
  //  después del fondo y antes de las piezas del juego.
  // --------------------------------------------------------------------------
  // La viñeta oscura de los bordes (si la escenografía tapó la del fondo)
  vineta(alfa = 0.42) {
    return this.add.image(0, 0, 'atlas', 'vineta').setOrigin(0).setDisplaySize(this.W, this.H).setTint(COLOR.OSCURO).setAlpha(alfa);
  }

  // Pared de azulejos rectangulares, cada fila corrida media pieza
  azulejos(y0, y1, color, ancho = 76, alto = 38) {
    const g = this.add.graphics();
    g.fillStyle(color, 1).fillRect(0, y0, this.W, y1 - y0);
    const junta = mezcla(color, 0x000000, 0.16), brillo = mezcla(color, 0xffffff, 0.45);
    for (let y = y0, f = 0; y < y1; y += alto, f++) {
      for (let x = -((f % 2) * ancho) / 2; x < this.W; x += ancho) {
        g.fillStyle(brillo, 0.5).fillRect(x + 6, y + 5, ancho * 0.4, 4);
        g.fillStyle(junta, 1).fillRect(x, y, 3, Math.min(alto, y1 - y));
      }
      g.fillStyle(junta, 1).fillRect(0, y, this.W, 3);
    }
    return g;
  }

  // Una ventana: marco, cielo con una nube, cortinas y la repisa
  ventana(x, y, w, h, cortina = 0xff6b6b) {
    const g = this.add.graphics();
    g.fillStyle(COLOR.OSCURO, 0.22).fillRoundedRect(x - w / 2 - 2, y - h / 2 + 4, w + 20, h + 20, 12);
    g.fillStyle(0xffffff, 1).fillRoundedRect(x - w / 2 - 10, y - h / 2 - 10, w + 20, h + 20, 12);
    g.fillStyle(0x7cc8ff, 1).fillRect(x - w / 2, y - h / 2, w, h);
    g.fillStyle(0xc2e8ff, 1).fillRect(x - w / 2, y + h * 0.1, w, h * 0.4);
    g.fillStyle(0xffffff, 0.95).fillEllipse(x - w * 0.18, y - h * 0.18, w * 0.34, h * 0.16).fillEllipse(x + w * 0.02, y - h * 0.24, w * 0.3, h * 0.2);
    g.fillStyle(0xffffff, 1).fillRect(x - 4, y - h / 2, 8, h).fillRect(x - w / 2, y - 4, w, 8);
    g.fillStyle(cortina, 1)
      .fillTriangle(x - w / 2 - 16, y - h / 2 - 16, x - w / 2 + w * 0.3, y - h / 2 - 16, x - w / 2 - 16, y + h / 2 + 8)
      .fillTriangle(x + w / 2 + 16, y - h / 2 - 16, x + w / 2 - w * 0.3, y - h / 2 - 16, x + w / 2 + 16, y + h / 2 + 8);
    g.fillStyle(COLOR.OSCURO, 1).fillRoundedRect(x - w / 2 - 28, y - h / 2 - 22, w + 56, 9, 4);
    g.fillStyle(0xc98a52, 1).fillRect(x - w / 2 - 16, y + h / 2 + 8, w + 32, 12);
    g.fillStyle(COLOR.OSCURO, 0.25).fillRect(x - w / 2 - 16, y + h / 2 + 20, w + 32, 4);
    return g;
  }

  // La mesada de la cocina: tablero claro arriba y muebles con puertas abajo
  mesada(y, color = 0xd9a066) {
    const g = this.add.graphics();
    g.fillStyle(mezcla(color, 0x000000, 0.22), 1).fillRect(0, y + 22, this.W, this.H - y);
    g.lineStyle(4, mezcla(color, 0x000000, 0.42), 1);
    for (let x = 12; x < this.W; x += 132) {
      g.strokeRoundedRect(x, y + 40, 118, this.H - y, 8);
      g.fillStyle(mezcla(color, 0xffffff, 0.5), 1).fillCircle(x + (x % 264 < 132 ? 100 : 18), y + 66, 6);
    }
    g.fillStyle(mezcla(color, 0xffffff, 0.2), 1).fillRect(0, y, this.W, 22);
    g.fillStyle(mezcla(color, 0xffffff, 0.45), 1).fillRect(0, y, this.W, 5);
    g.fillStyle(COLOR.OSCURO, 0.3).fillRect(0, y + 22, this.W, 6);
    return g;
  }

  // Pared de tablas verticales, con juntas y nudos
  tablas(color = 0xb87945, ancho = 90) {
    const g = this.add.graphics();
    for (let x = 0, i = 0; x < this.W; x += ancho, i++) {
      g.fillStyle(mezcla(color, i % 2 ? 0x000000 : 0xffffff, 0.08), 1).fillRect(x, 0, ancho, this.H);
      g.fillStyle(mezcla(color, 0x000000, 0.35), 1).fillRect(x, 0, 4, this.H);
      g.fillStyle(mezcla(color, 0xffffff, 0.25), 0.6).fillRect(x + 4, 0, 3, this.H);
      for (let k = 0; k < 3; k++) {
        const ny = ((i * 397 + k * 541) % 1000) / 1000 * this.H;
        g.fillStyle(mezcla(color, 0x000000, 0.3), 0.7).fillEllipse(x + ancho * (0.3 + 0.4 * ((i + k) % 2)), ny, 16, 26);
      }
    }
    return g;
  }

  // Un horizonte lejano para los cielos muy grandes de las pantallas altas:
  // 'cerros', 'ciudad' o 'dunas', en un color apagado
  horizonte(y, tipo, color) {
    const g = this.add.graphics();
    if (tipo === 'ciudad') {
      for (let x = -10, i = 0; x < this.W; i++) {
        const w = 40 + ((i * 37) % 50), h = 60 + ((i * 53) % 140);
        g.fillStyle(color, 1).fillRect(x, y - h, w, h + 400);
        g.fillStyle(mezcla(color, 0xffffff, 0.35), 0.8);
        for (let wy = y - h + 12; wy < y - 10; wy += 20) for (let wx = x + 8; wx < x + w - 10; wx += 14) if ((wx * 7 + wy * 3) % 5 > 1) g.fillRect(wx, wy, 6, 8);
        x += w + 4;
      }
    } else {
      const alto = tipo === 'dunas' ? 70 : 120, ancho = tipo === 'dunas' ? 300 : 230;
      for (let x = -ancho / 2, i = 0; x < this.W + ancho; x += ancho * 0.7, i++) {
        const h = alto * (0.6 + 0.4 * ((i * 7) % 5) / 4);
        g.fillStyle(i % 2 ? color : mezcla(color, 0xffffff, 0.12), 1).fillEllipse(x, y, ancho, h * 2);
      }
      g.fillStyle(color, 1).fillRect(0, y, this.W, 400);
    }
    return g;
  }

  // Una cancha de fútbol: franjas de pasto cortado y, arriba (hasta yTribuna),
  // la tribuna llena de gente con los carteles de publicidad
  cancha(yTribuna) {
    const g = this.add.graphics();
    for (let y = 0, i = 0; y < this.H; y += 70, i++) if (i % 2) g.fillStyle(0xffffff, 0.08).fillRect(0, y, this.W, 70);
    if (yTribuna > 24) {
      g.fillStyle(0x2b2d42, 1).fillRect(0, 0, this.W, yTribuna);
      for (let fila = 0, y = yTribuna - 16; y > -20; y -= 24, fila++) {
        for (let x = (fila % 2) * 12 + 6; x < this.W; x += 24) {
          const c = COLOR.FONDOS[(x * 7 + fila * 13) % COLOR.FONDOS.length];
          g.fillStyle(mezcla(c, 0x000000, 0.25), 1).fillRect(x - 9, y + 4, 18, 14);     // la camiseta
          g.fillStyle(0xf2c9a0, 1).fillCircle(x, y, 7);                                  // la cara
        }
      }
    }
    if (yTribuna > 0) {
      g.fillStyle(0xffffff, 1).fillRect(0, yTribuna, this.W, 24);
      for (let x = 0, i = 0; x < this.W; x += 90, i++) g.fillStyle(COLOR.FONDOS[(i * 3) % COLOR.FONDOS.length], 1).fillRect(x + 4, yTribuna + 4, 82, 16);
      g.fillStyle(COLOR.OSCURO, 0.25).fillRect(0, yTribuna + 24, this.W, 8);
    }
    return g;
  }

  // Lo que hay debajo del piso (tierra o arena), para que en las pantallas
  // altas no quede un bloque liso: vetas onduladas y piedritas
  subsuelo(x0, x1, y0, color, tipo = 'tierra') {
    const g = this.add.graphics();
    const oscuro = mezcla(color, 0x000000, 0.2), claro = mezcla(color, 0xffffff, 0.16);
    for (let y = y0 + 60, i = 0; y < this.H; y += 64 + ((i * 23) % 34), i++) {
      g.fillStyle(i % 2 ? oscuro : claro, 0.55);
      g.beginPath();
      g.moveTo(x0, y);
      for (let x = x0; x <= x1 + 30; x += 30) g.lineTo(Math.min(x, x1), y + Math.sin(x * 0.021 + i) * 7);
      for (let x = x1; x >= x0 - 30; x -= 30) g.lineTo(Math.max(x, x0), y + 16 + Math.sin(x * 0.027 + i * 2) * 5);
      g.closePath();
      g.fillPath();
    }
    const piedra = tipo === 'arena' ? mezcla(color, 0xffffff, 0.35) : mezcla(color, 0x000000, 0.38);
    for (let k = 0; k < 16; k++) {
      const x = x0 + ((k * 137 + 40) % Math.max(1, x1 - x0));
      const y = y0 + 36 + ((k * 211) % Math.max(1, this.H - y0 - 50));
      g.fillStyle(piedra, 0.85).fillEllipse(x, y, 16 + (k % 3) * 9, 10 + (k % 2) * 6);
    }
    return g;
  }

  // --------------------------------------------------------------------------
  //  Decoración animada (se mueve sola)
  // --------------------------------------------------------------------------
  nubes(n, y0 = this.arriba + 40, y1 = this.cy) {
    for (let i = 0; i < n; i++) {
      const obj = this.emoji('nube', this.azar(0, this.W), this.azar(y0, y1), this.azar(110, 170)).setAlpha(0.9);
      this.deco.push({ obj, tipo: 'nube', vx: this.azar(10, 24) });
    }
  }

  estrellas(n) {
    for (let i = 0; i < n; i++) {
      const obj = this.add.image(this.azar(0, this.W), this.azar(0, this.H), 'atlas', 'chispa').setScale(this.azar(0.25, 0.6));
      this.deco.push({ obj, tipo: 'estrella', fase: this.azar(0, 6), rapidez: this.azar(1.5, 4) });
    }
  }

  burbujas(n) {
    for (let i = 0; i < n; i++) {
      const tam = this.azar(10, 28);
      const obj = this.add.image(this.azar(0, this.W), this.azar(0, this.H), 'atlas', 'anillo').setDisplaySize(tam, tam).setAlpha(0.35);
      this.deco.push({ obj, tipo: 'burbuja', vy: -this.azar(30, 70), fase: this.azar(0, 6) });
    }
  }

  haces(n) {
    for (let i = 0; i < n; i++) {
      const obj = this.add.image(this.azar(60, this.W - 60), -20, 'atlas', 'haz').setOrigin(0.5, 0)
        .setDisplaySize(this.azar(90, 160), this.H * 0.8).setAlpha(0.13).setAngle(this.azar(-14, 14));
      this.deco.push({ obj, tipo: 'haz', fase: this.azar(0, 6), angulo: obj.angle });
    }
  }

  // Guirnaldas de banderines arriba (para las fiestas)
  banderines() {
    const g = this.add.graphics();
    const colores = [0xff4d5a, 0xffd23f, 0x2f7dff, 0x3ddc84, 0xff70a6, 0xff9f1c];
    [[Math.max(26, this.arriba + 6), 0], [Math.max(78, this.arriba + 58), 1]].forEach(([y0, fila]) => {
      const curva = x => y0 + Math.sin((x / this.W) * Math.PI) * 34;
      g.lineStyle(3, COLOR.OSCURO, 0.7).beginPath();
      for (let x = -10; x <= this.W + 10; x += 10) (x === -10 ? g.moveTo(x, curva(x)) : g.lineTo(x, curva(x)));
      g.strokePath();
      for (let i = 0, x = 14 + fila * 22; x < this.W; x += 44, i++) {
        const y = curva(x), c = colores[(i + fila * 3) % colores.length];
        g.fillStyle(COLOR.OSCURO, 0.25).fillTriangle(x - 15, y + 3, x + 17, y + 3, x + 1, y + 37);
        g.fillStyle(c, 1).fillTriangle(x - 16, y, x + 16, y, x, y + 34);
      }
    });
  }

  // Una fila de ampolletas arriba, que se prenden y apagan como en un concurso
  ampolletas() {
    const y = Math.max(20, this.arriba + 4);
    this.rect(this.cx, y, this.W, 34, COLOR.OSCURO, 0.55);
    for (let i = 0, x = 20; x < this.W; x += 40, i++) {
      this.circulo(x, y, 11, 0x5a3a2a);
      const obj = this.add.image(x, y, 'atlas', 'brillo').setDisplaySize(44, 44).setTint(0xffd23f);
      this.circulo(x, y, 8, 0xfff1a8);
      this.deco.push({ obj, tipo: 'ampolleta', par: i % 2 });
    }
  }

  // Papelitos de colores que caen despacio
  papelitos(n) {
    for (let i = 0; i < n; i++) {
      const obj = this.add.image(this.azar(0, this.W), this.azar(0, this.H), 'atlas', 'blanco')
        .setDisplaySize(9, 15).setTint(this.elegir(COLOR.FONDOS)).setAlpha(0.8).setAngle(this.azar(0, 180));
      this.deco.push({ obj, tipo: 'papelito', vy: this.azar(30, 60), giro: this.azar(-160, 160), fase: this.azar(0, 6) });
    }
  }

  animarDeco(dt, t) {
    for (const d of this.deco) {
      const o = d.obj;
      if (d.tipo === 'nube') { o.x += d.vx * dt; if (o.x > this.W + 110) o.x = -110; }
      else if (d.tipo === 'estrella') o.setAlpha(0.35 + 0.65 * Math.abs(Math.sin(t * d.rapidez + d.fase)));
      else if (d.tipo === 'burbuja') {
        o.y += d.vy * dt;
        o.x += Math.sin(t * 3 + d.fase) * 12 * dt;
        if (o.y < -20) { o.y = this.H + 20; o.x = this.azar(0, this.W); }
      } else if (d.tipo === 'haz') o.setAngle(d.angulo + Math.sin(t * 0.8 + d.fase) * 4);
      else if (d.tipo === 'bokeh') {
        o.x += d.vx * dt; o.y += d.vy * dt;
        if (o.y < -d.r) { o.y = this.H + d.r; o.x = this.azar(0, this.W); }
        if (o.x < -d.r) o.x = this.W + d.r; else if (o.x > this.W + d.r) o.x = -d.r;
      } else if (d.tipo === 'ampolleta') {
        o.setAlpha(Math.floor(t * 4) % 2 === d.par ? 1 : 0.25);
      } else if (d.tipo === 'papelito') {
        o.y += d.vy * dt;
        o.x += Math.sin(t * 2 + d.fase) * 20 * dt;
        o.angle += d.giro * dt;
        if (o.y > this.H + 20) { o.y = -20; o.x = this.azar(0, this.W); }
      }
    }
  }

  // --------------------------------------------------------------------------
  //  Piezas
  // --------------------------------------------------------------------------
  // Un emoji (con su borde blanco y su sombra) que mide "tam" de lado.
  emoji(nombre, x, y, tam = 110) {
    return this.add.image(x, y, 'emoji', nombre).setDisplaySize(tam, tam);
  }

  // Un emoji recortable: la celda entera (con borde y sombra). Para setCrop.
  // Devuelve también cuánto mide la celda en coordenadas de la textura.
  emojiEntero(nombre, x, y, tam = 110) {
    const k = CELDA_EMOJI / TAM_EMOJI;
    return this.add.image(x, y, 'emoji', nombre + '#').setDisplaySize(tam * k, tam * k);
  }

  texto(x, y, cadena, tam = 48, color = COLOR.TEXTO) {
    return this.add.bitmapText(x, y, 'anton', cadena, tam).setOrigin(0.5).setTint(color);
  }

  rect(x, y, w, h, color, alfa = 1) {
    return this.add.image(x, y, 'atlas', 'blanco').setDisplaySize(w, h).setTint(color).setAlpha(alfa);
  }

  circulo(x, y, r, color, alfa = 1) {
    return this.add.image(x, y, 'atlas', 'circulo').setDisplaySize(r * 2, r * 2).setTint(color).setAlpha(alfa);
  }

  // Botón redondo con un número o una palabra: fondo oscuro, aro blanco y
  // texto blanco (con su borde). Se lee sobre cualquier fondo. Para marcarlo
  // bien o mal: b.fondo.setTint(COLOR.BIEN / COLOR.MAL).
  boton(x, y, r, etiqueta, color = 0x3a2a6b) {
    const sombra = this.circulo(x, y + 7, r, COLOR.OSCURO, 0.35);
    const fondo = this.circulo(x, y, r, color);
    const aro = this.add.image(x, y, 'atlas', 'anillo').setDisplaySize(r * 2.1, r * 2.1).setTint(0xffffff);
    const num = this.texto(x, y, String(etiqueta), r * 1.1);
    const k = Math.min(1, (r * 1.45) / Math.max(1, num.width));    // que entre en el círculo
    num.setScale(k);
    return { x, y, r, sombra, fondo, aro, num, partes: [fondo, aro, num] };
  }

  // Sombra ovalada en el piso, debajo de algo
  sombra(x, y, ancho, alfa = 0.25) {
    return this.add.image(x, y, 'atlas', 'circulo').setDisplaySize(ancho, ancho * 0.28).setTint(COLOR.OSCURO).setAlpha(alfa);
  }

  // --------------------------------------------------------------------------
  //  Efectos (sólo en momentos puntuales: crean y destruyen)
  // --------------------------------------------------------------------------
  chispas(x, y, n = 8, color = COLOR.ORO, fuerza = 1) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.4;
      const d = (60 + Math.random() * 70) * fuerza;
      const c = this.add.image(x, y, 'atlas', 'chispa').setTint(color).setScale(0.6 + Math.random() * 0.6).setDepth(50);
      this.tweens.add({
        targets: c, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, scale: 0, angle: 180,
        duration: 380 + Math.random() * 200, ease: 'Cubic.easeOut', onComplete: () => c.destroy(),
      });
    }
  }

  // Papelitos de colores que saltan y caen
  confeti(x, y, n = 18) {
    for (let i = 0; i < n; i++) {
      const c = this.add.image(x, y, 'atlas', 'blanco').setDisplaySize(10, 16).setDepth(55)
        .setTint(COLOR.FONDOS[i % COLOR.FONDOS.length]).setAngle(this.azar(0, 180));
      const vx = this.azar(-260, 260), vy = this.azar(-520, -220);
      this.tweens.add({
        targets: c, x: x + vx * 0.9, y: y + vy * 0.9 + 420, angle: c.angle + this.azar(-540, 540), alpha: 0,
        duration: 900, ease: 'Quad.easeIn', onComplete: () => c.destroy(),
      });
    }
  }

  // Nubecita de humo (al chocar, al frenar, al aparecer)
  humo(x, y, tam = 70) {
    const h = this.emoji('humo', x, y, tam).setAlpha(0.9).setDepth(45);
    this.tweens.add({ targets: h, x: x - tam * 0.6, alpha: 0, scale: h.scaleX * 1.5, duration: 420, onComplete: () => h.destroy() });
  }

  // Un cartelito que salta y se va ("¡PLAF!", "¡GOL!").
  cartel(x, y, cadena, color = COLOR.TEXTO, tam = 56) {
    const t = this.texto(x, y, cadena, tam, color).setDepth(60).setScale(0.3).setAngle(this.azar(-6, 6));
    this.tweens.add({ targets: t, scale: 1, duration: 160, ease: 'Back.easeOut' });
    this.tweens.add({ targets: t, y: y - 40, alpha: 0, delay: 450, duration: 300, onComplete: () => t.destroy() });
    return t;
  }

  // Muchos emoji miran a la izquierda: para que miren hacia donde van.
  mirar(img, nombre, dir) {
    img.setFlipX(MIRAN_IZQUIERDA.has(nombre) ? dir > 0 : dir < 0);
  }

  // Lugares al azar sin encimarse dentro de un rectángulo.
  lugares(n, x0, y0, x1, y1, separacion) {
    const l = [];
    for (let intento = 0; l.length < n && intento < 500; intento++) {
      const x = this.azar(x0, x1), y = this.azar(y0, y1);
      if (l.every(p => Math.hypot(p.x - x, p.y - y) > separacion)) l.push({ x, y });
    }
    return l;
  }

  // Rebote al tocar algo: se aplasta y vuelve (squash & stretch).
  rebote(obj, k = 1.25) {
    const sx = obj.scaleX, sy = obj.scaleY;
    this.tweens.add({ targets: obj, scaleX: sx * k, scaleY: sy / Math.sqrt(k), duration: 70, yoyo: true,
      onComplete: () => obj.setScale(sx, sy) });
  }
}
