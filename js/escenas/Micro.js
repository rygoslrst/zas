// ============================================================================
//  Micro.js — lo que tienen en común todos los microjuegos
// ----------------------------------------------------------------------------
//  Cada microjuego es una escena de Phaser que el Director lanza, deja correr
//  unos segundos y apaga. Al apagarse, Phaser destruye todo lo que creó: por
//  eso un microjuego puede crear sus objetos sin pools ni limpieza.
//
//  Para hacer uno nuevo: una clase que extiende Micro, con
//    static ORDEN = '¡ATRAPÁ!'      la consigna que se ve al empezar
//    static CONTROL = 'arrastrar'   tocar | arrastrar | deslizar | mantener | machacar | nada
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

import { ANCHO, VISTA, ESCALA, COLOR, PARTIDA } from '../config.js';
import { CELDA_EMOJI, TAM_EMOJI } from '../datos/emoji.js';

// Emoji de Noto que miran hacia la izquierda
const MIRAN_IZQUIERDA = new Set(['pez', 'pez_globo', 'pollito', 'abeja', 'tiburon', 'corredor', 'pato',
  'ballena', 'dinosaurio', 'unicornio', 'tortuga', 'cohete', 'hormiga']);

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
    this.alGanar();
    return true;
  }

  perder() {
    if (this.resultado) return false;
    this.resultado = 'perdio';
    this.director.decidir(false);
    this.cameras.main.shake(180, 0.012);
    this.alPerder();
    return true;
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
  //  Fondos: degradé vertical (claro arriba, oscuro abajo), un patrón suave y
  //  una viñeta en los bordes. fondo() sin nada elige un color vivo al azar.
  // --------------------------------------------------------------------------
  fondo(color = this.elegir(COLOR.FONDOS), patron = this.elegir(['rayas', 'lunares', null])) {
    const [c1, c2] = Array.isArray(color) ? color : [mezcla(color, 0xffffff, 0.28), mezcla(color, 0x000000, 0.22)];
    this.add.image(0, 0, 'atlas', 'blanco').setOrigin(0).setDisplaySize(this.W, this.H).setTint(c2);
    this.add.image(0, 0, 'atlas', 'degradeV').setOrigin(0).setDisplaySize(this.W, this.H).setTint(c1);
    if (patron) this.add.tileSprite(0, 0, this.W, this.H, 'atlas', patron).setOrigin(0).setAlpha(0.1);
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
    return t.colores[1];
  }

  // Piso: bloque de color con un borde más claro arriba
  piso(y, color) {
    this.add.image(0, y, 'atlas', 'blanco').setOrigin(0).setDisplaySize(this.W, this.H - y).setTint(color);
    this.add.image(0, y, 'atlas', 'degradeV').setOrigin(0).setDisplaySize(this.W, 60).setTint(mezcla(color, 0xffffff, 0.25)).setAlpha(0.8);
    this.add.image(0, y, 'atlas', 'blanco').setOrigin(0, 0.5).setDisplaySize(this.W, 8).setTint(mezcla(color, 0x000000, 0.35));
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
