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
// ============================================================================

import { ANCHO, VISTA, COLOR, PARTIDA } from '../config.js';

// Emoji de Noto que miran hacia la izquierda
const MIRAN_IZQUIERDA = new Set(['pez', 'pez_globo', 'pollito', 'abeja', 'tiburon', 'corredor', 'pato',
  'ballena', 'dinosaurio', 'unicornio', 'tortuga', 'cohete']);

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
  }

  create() {
    this.armar();
  }

  update(time, deltaMs) {
    this.paso(Math.min(0.05, deltaMs / 1000), this.t);
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
  //  microjuego anterior) y los que llegan cuando ya se decidió.
  // --------------------------------------------------------------------------
  vale() { return !this.resultado && this.t >= PARTIDA.GRACIA_S; }
  alTocar(fn) { this.input.on('pointerdown', p => { if (this.vale()) fn(p.x, p.y, p); }); }
  alSoltar(fn) { this.input.on('pointerup', p => { if (this.vale()) fn(p.x, p.y, p); }); }
  alMover(fn) { this.input.on('pointermove', p => { if (this.vale()) fn(p.x, p.y, p); }); }

  // --------------------------------------------------------------------------
  //  Ayudas para armar la escena
  // --------------------------------------------------------------------------
  azar(a, b) { return a + Math.random() * (b - a); }
  entero(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
  elegir(lista) { return lista[Math.floor(Math.random() * lista.length)]; }
  mezclar(lista) {
    const l = [...lista];
    for (let i = l.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [l[i], l[j]] = [l[j], l[i]]; }
    return l;
  }

  // Fondo de color liso con un patrón suave encima.
  fondo(color = this.elegir(COLOR.FONDOS), patron = this.elegir(['rayas', 'lunares'])) {
    this.add.image(0, 0, 'atlas', 'blanco').setOrigin(0).setDisplaySize(this.W, this.H).setTint(color);
    if (patron) {
      this.add.tileSprite(0, 0, this.W, this.H, 'atlas', patron).setOrigin(0).setTint(0xffffff).setAlpha(0.14);
    }
    return color;
  }

  emoji(nombre, x, y, tam = 110) {
    return this.add.image(x, y, 'emoji', nombre).setDisplaySize(tam, tam);
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

  // Estallido de chispitas (sólo en momentos puntuales: crea y destruye).
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

  // Un cartelito que salta y se va ("¡PLAF!", "¡GOL!").
  cartel(x, y, cadena, color = COLOR.TEXTO, tam = 56) {
    const t = this.texto(x, y, cadena, tam, color).setDepth(60).setScale(0.3);
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

  // Rebote al tocar algo: agranda y vuelve.
  rebote(obj, k = 1.25) {
    const sx = obj.scaleX, sy = obj.scaleY;
    this.tweens.add({ targets: obj, scaleX: sx * k, scaleY: sy * k, duration: 70, yoyo: true });
  }
}
