// ============================================================================
//  Director.js — el que maneja la partida
// ----------------------------------------------------------------------------
//  Elige el próximo microjuego, lo lanza, mide el tiempo con la música, dibuja
//  la consigna y la mecha, y entre uno y otro muestra el "intermedio": puntos,
//  vidas y la carita de cómo te fue. Cada tanto, "¡MÁS RÁPIDO!".
//
//  El Director es la escena de ARRIBA (se agrega última): su capa tapa al
//  microjuego en las transiciones, y su interfaz se dibuja siempre encima.
// ============================================================================

import { ANCHO, VISTA, RITMO, PARTIDA, COLOR, DEBUG, CLAVE_RECORD } from '../config.js';
import { crearAtlas } from '../motor/Atlas.js';
import { EMOJI, TAM_EMOJI } from '../datos/emoji.js';
import { MICROS } from '../micro/indice.js';

const AYUDA = {
  tocar: 'TOCÁ', arrastrar: 'ARRASTRÁ', deslizar: 'DESLIZÁ EL DEDO', mantener: 'MANTENÉ APRETADO',
  machacar: 'TOCÁ RÁPIDO', nada: 'NO TOQUES NADA',
};
const CARAS_BIEN = ['contento', 'facha', 'guinio', 'lengua', 'rico'];
const CARAS_MAL = ['mareado', 'asustado', 'enojado', 'calavera'];
const COLOR_MECHA = 0xffe14d;
const DESFILE = ['globo', 'pizza', 'gato', 'cohete', 'sandia', 'pelota', 'pollito', 'diamante', 'dona', 'sapo'];

const limitar = (v, a, b) => (v < a ? a : v > b ? b : v);
function leer(clave, porDefecto) {
  try { const v = localStorage.getItem(clave); return v === null ? porDefecto : v; } catch (e) { return porDefecto; }
}
function guardar(clave, valor) {
  try { localStorage.setItem(clave, valor); } catch (e) { /* modo privado */ }
}

export class Director extends Phaser.Scene {
  constructor() { super({ key: 'Director' }); }

  init(d) {
    this.audio = d.audio;
    this.ui = d.ui;
    this.imagenEmoji = d.imagenEmoji;
  }

  create() {
    this.prepararTexturas();
    this.record = parseInt(leer(CLAVE_RECORD, '0'), 10) || 0;
    this.color = 0;
    this.crearCapa();
    this.crearHud();
    this.estado = 'titulo';
    this.clave = null;
    // Para probar: ?micro=Nombre repite siempre el mismo microjuego, y
    // ?nivel=3&vel=1.5 fuerzan la dificultad y la velocidad.
    const q = new URLSearchParams(location.search);
    const solo = q.get('micro');
    this.soloEste = solo ? MICROS.find(M => M.name.toLowerCase() === solo.toLowerCase()) : null;
    this.nivelForzado = q.has('nivel') ? parseInt(q.get('nivel'), 10) : null;
    this.velForzada = q.has('vel') ? parseFloat(q.get('vel')) : null;
    this.redimensionar(VISTA.alto);
    this.modoTitulo();
    this.ui.conectar(this);
    if (DEBUG) window.director = this;
  }

  prepararTexturas() {
    const { canvas, marcos, xmlFuente } = crearAtlas();
    const tex = this.textures.addCanvas('atlas', canvas);
    for (const m of marcos) tex.add(m.nombre, 0, m.x, m.y, m.w, m.h);
    const xml = new DOMParser().parseFromString(xmlFuente, 'text/xml');
    this.cache.xml.add('fuente_xml', xml);
    Phaser.GameObjects.BitmapText.ParseFromAtlas(this, 'anton', 'atlas', 'fuente', 'fuente_xml');
    const te = this.textures.addImage('emoji', this.imagenEmoji);
    for (const [nombre, [x, y]] of Object.entries(EMOJI)) te.add(nombre, 0, x, y, TAM_EMOJI, TAM_EMOJI);
  }

  // --------------------------------------------------------------------------
  //  La capa del intermedio (también es el fondo del título y del final)
  // --------------------------------------------------------------------------
  crearCapa() {
    const bt = (tam, color) => this.add.bitmapText(0, 0, 'anton', '', tam).setOrigin(0.5).setTint(color);
    this.fondoCapa = this.add.image(0, 0, 'atlas', 'blanco').setOrigin(0);
    this.rayos = this.add.image(0, 0, 'atlas', 'rayos').setScale(2.8).setAlpha(0.16);
    this.desfile = DESFILE.map((n, i) => ({
      img: this.add.image(0, 0, 'emoji', n).setDisplaySize(90, 90).setAlpha(0.6),
      x: 40 + (i * 97) % 480, fase: i * 0.37, vel: 30 + (i % 4) * 12,
    }));
    this.puntosTxt = bt(180, COLOR.TEXTO);
    this.corazones = [];
    for (let i = 0; i < PARTIDA.VIDAS; i++) this.corazones.push(this.add.image(0, 0, 'emoji', 'corazon').setDisplaySize(80, 80));
    this.reaccion = this.add.image(0, 0, 'emoji', 'contento').setDisplaySize(160, 160);
    this.mensaje = bt(66, COLOR.ORO);
    this.capa = [this.fondoCapa, this.rayos, this.puntosTxt, ...this.corazones, this.reaccion, this.mensaje];
  }

  // Los emoji que desfilan detrás del título y del final
  mostrarDesfile(v) { for (const d of this.desfile) d.img.setVisible(v); }

  crearHud() {
    this.banda = this.add.image(0, 0, 'atlas', 'degrade').setTint(COLOR.OSCURO).setAlpha(0);
    this.consigna = this.add.bitmapText(0, 0, 'anton', '', 96).setOrigin(0.5).setTint(COLOR.TEXTO);
    this.ayuda = this.add.bitmapText(0, 0, 'anton', '', 36).setOrigin(0, 0.5).setTint(COLOR.ORO);
    this.dedo = this.add.image(0, 0, 'emoji', 'dedo').setDisplaySize(48, 48);
    // La mecha: un riel oscuro con la mecha amarilla adentro (se ve sobre cualquier fondo)
    this.mechaFondo = this.add.image(0, 0, 'atlas', 'blanco').setOrigin(0, 0.5).setTint(COLOR.OSCURO).setAlpha(0.8);
    this.mecha = this.add.image(0, 0, 'atlas', 'blanco').setOrigin(0, 0.5).setTint(COLOR_MECHA);
    this.chispaMecha = this.add.image(0, 0, 'atlas', 'chispa').setTint(0xfff1a8).setScale(1.3);
    this.bomba = this.add.image(0, 0, 'emoji', 'bomba').setDisplaySize(70, 70);
    this.hudConsigna = [this.banda, this.consigna, this.ayuda, this.dedo];
    this.hudMecha = [this.mechaFondo, this.mecha, this.chispaMecha, this.bomba];
    for (const o of [...this.hudConsigna, ...this.hudMecha]) o.setVisible(false);
    this.fps = DEBUG ? this.add.bitmapText(8, 8, 'anton', '', 22).setTint(COLOR.ORO) : null;
  }

  // Cuando cambia el alto de la pantalla (girar, cambiar la ventana).
  redimensionar(h) {
    VISTA.alto = h;
    this.cameras.main.setSize(ANCHO, h);
    const cx = ANCHO / 2, cy = h / 2;
    this.fondoCapa.setDisplaySize(ANCHO, h);
    this.rayos.setPosition(cx, cy);
    this.mensaje.setPosition(cx, cy - 290);
    this.puntosTxt.setPosition(cx, cy - 130);
    this.corazones.forEach((c, i) => c.setPosition(cx + (i - (PARTIDA.VIDAS - 1) / 2) * 96, cy + 50));
    this.reaccion.setPosition(cx, cy + 215);
    this.banda.setPosition(cx, cy + 10).setDisplaySize(ANCHO, 330);
    this.consigna.setPosition(cx, cy - 20);
    this.ayuda.setY(cy + 75);
    this.dedo.setY(cy + 72);
    this.mechaY = h - 38;
    this.mechaX0 = 78;
    this.mechaLargo = ANCHO - 24 - this.mechaX0;
    this.mechaFondo.setPosition(this.mechaX0 - 5, this.mechaY).setDisplaySize(this.mechaLargo + 10, 24);
    this.mecha.setPosition(this.mechaX0, this.mechaY).setDisplaySize(this.mechaLargo, 12);
    this.bomba.setPosition(40, this.mechaY - 6);
  }

  mostrarCapa(v, suave = false) {
    this.tweens.killTweensOf(this.capa);
    if (!v && suave) {
      this.tweens.add({ targets: this.capa, alpha: 0, duration: 140, onComplete: () => { for (const o of this.capa) o.setVisible(false); } });
    } else {
      for (const o of this.capa) { o.setVisible(v); o.setAlpha(1); }
      this.rayos.setAlpha(0.16);
    }
  }

  colorSiguiente() {
    this.color = (this.color + 1 + Math.floor(Math.random() * (COLOR.FONDOS.length - 1))) % COLOR.FONDOS.length;
    this.fondoCapa.setTint(COLOR.FONDOS[this.color]);
  }

  modoTitulo() {
    this.estado = 'titulo';
    this.mostrarCapa(true);
    this.fondoCapa.setTint(COLOR.FONDOS[3]);
    for (const o of [this.puntosTxt, ...this.corazones, this.reaccion, this.mensaje]) o.setVisible(false);
    this.mostrarDesfile(true);
  }

  // --------------------------------------------------------------------------
  //  La partida
  // --------------------------------------------------------------------------
  // Lo llama la interfaz, con el audio ya desbloqueado.
  empezar() {
    if (this.estado !== 'titulo' && this.estado !== 'fin') return;
    this.audio.iniciarPartida();
    this.vidas = PARTIDA.VIDAS;
    this.puntos = 0;
    this.rondas = 0;
    this.vel = 1;
    this.nivel = 1;
    this.bolsa = [];
    this.ultimo = null;
    this.Clase = null;
    this.mostrarDesfile(false);
    this.intermedio(null);
  }

  velocidadPara(rondas) {
    return Math.min(PARTIDA.VEL_MAX, 1 + PARTIDA.ACELERA * Math.floor(rondas / PARTIDA.CADA_ACELERA));
  }

  siguiente() {
    if (this.soloEste) return this.soloEste;
    if (!this.bolsa.length) {
      this.bolsa = Phaser.Utils.Array.Shuffle([...MICROS]);
      const n = this.bolsa.length;
      if (n > 1 && this.bolsa[n - 1] === this.ultimo) [this.bolsa[0], this.bolsa[n - 1]] = [this.bolsa[n - 1], this.bolsa[0]];
    }
    this.ultimo = this.bolsa.pop();
    return this.ultimo;
  }

  // gano: null al empezar la partida, true / false después de cada microjuego
  intermedio(gano) {
    this.estado = 'intermedio';
    const a = this.audio.ahora();
    const velNueva = this.velocidadPara(this.rondas);
    const nivelNuevo = Math.min(3, 1 + Math.floor(this.rondas / PARTIDA.CADA_NIVEL));
    const acelera = velNueva > this.vel;
    const sube = nivelNuevo > this.nivel;
    this.vel = this.velForzada || velNueva;
    this.nivel = this.nivelForzado || nivelNuevo;

    this.colorSiguiente();
    this.mostrarCapa(true);
    this.mostrarDesfile(false);
    for (const o of [...this.hudConsigna, ...this.hudMecha]) o.setVisible(false);

    // Puntos y vidas
    this.puntosTxt.setText(String(this.puntos)).setScale(1);
    this.corazones.forEach((c, i) => c.setFrame(i < this.vidas ? 'corazon' : 'corazon_negro').setDisplaySize(80, 80).setAngle(0));
    if (gano === true) {
      this.puntosTxt.setScale(1.45);
      this.tweens.add({ targets: this.puntosTxt, scale: 1, duration: 260, ease: 'Back.easeOut' });
      this.audio.gano();
    } else if (gano === false) {
      const c = this.corazones[this.vidas];
      c.setDisplaySize(120, 120);
      this.tweens.add({ targets: c, displayWidth: 80, displayHeight: 80, angle: { from: -25, to: 0 }, duration: 380, ease: 'Back.easeOut' });
      this.audio.perdio();
    } else {
      this.audio.empieza();
    }

    // La carita
    const cara = gano === null ? 'facha' : Phaser.Utils.Array.GetRandom(gano ? CARAS_BIEN : CARAS_MAL);
    this.reaccion.setFrame(cara).setDisplaySize(160, 160).setAngle(0);
    this.tweens.add({ targets: this.reaccion, displayWidth: 190, displayHeight: 190, duration: 150, yoyo: true, ease: 'Quad.easeOut' });

    // Los carteles: se muestran uno después del otro
    const carteles = [];
    if (gano === null) carteles.push(['¡PREPARATE!', null]);
    if (gano === false && this.vidas === 1) carteles.push(['¡ÚLTIMA VIDA!', null]);
    if (sube) carteles.push(['¡MÁS DIFÍCIL!', () => this.audio.acelera()]);
    if (acelera) carteles.push(['¡MÁS RÁPIDO!', () => this.audio.acelera()]);

    let dur = Math.max(0.8, 1.25 / this.vel);
    this.fases = [];
    this.mensaje.setText('');
    carteles.forEach(([txt, sonido], i) => {
      const t = a + (i === 0 && gano === null ? 0 : dur * 0.55 + i * 0.95);
      this.fases.push({ t, fn: () => {
        this.mensaje.setText(txt).setScale(0.4);
        this.tweens.add({ targets: this.mensaje, scale: 1, duration: 220, ease: 'Back.easeOut' });
        if (sonido) sonido();
      } });
    });
    if (carteles.length) dur += 0.95 * carteles.length - (gano === null ? 0.3 : 0);
    this.finIntermedio = a + dur;
  }

  empezarMicro() {
    const Clase = this.siguiente();
    this.Clase = Clase;
    this.clave = Clase.name;
    const bpm = RITMO.BPM_BASE * this.vel;
    this.pulso = 60 / bpm;
    this.dur = Clase.PULSOS * this.pulso;
    this.t0 = this.audio.ahora();
    this.decididoEn = null;
    this.gano = null;
    this.tics = 0;
    // Algunos microjuegos traen variantes con su propia consigna ("¡CORTÁ EL ROJO!")
    const variante = Clase.VARIANTES ? Phaser.Utils.Array.GetRandom(Clase.VARIANTES) : null;
    this.orden = variante ? variante.orden : Clase.ORDEN;
    this.audio.empezarPista(bpm, this.t0, (Math.random() * 1e9) | 0);
    this.scene.launch(this.clave, {
      director: this, audio: this.audio, nivel: this.nivel, vel: this.vel, dur: this.dur, t0: this.t0, variante,
    });
    this.estado = 'micro';
    this.mostrarCapa(false, true);

    // La consigna: entra grande, se queda un momento y se va
    this.tweens.killTweensOf([...this.hudConsigna, ...this.hudMecha]);
    this.consigna.setText(this.orden).setScale(1);
    const k = Math.min(1, 500 / Math.max(1, this.consigna.width));
    this.consigna.setScale(k * 1.6).setAlpha(1);
    this.tweens.add({ targets: this.consigna, scale: k, duration: 160, ease: 'Back.easeOut' });
    this.ayuda.setText(AYUDA[Clase.CONTROL]).setAlpha(1);
    const anchoAyuda = this.ayuda.width + 56;
    this.dedo.setX(ANCHO / 2 - anchoAyuda / 2 + 20).setAlpha(1).setFrame(Clase.CONTROL === 'nada' ? 'diablo' : 'dedo').setDisplaySize(48, 48);
    this.ayuda.setX(ANCHO / 2 - anchoAyuda / 2 + 56);
    this.banda.setAlpha(0.6);
    for (const o of this.hudConsigna) o.setVisible(true);
    const quieta = Math.max(0.55, 0.9 / this.vel) * 1000;
    this.tweens.add({ targets: this.hudConsigna, alpha: 0, delay: quieta, duration: 180 });

    // La mecha
    for (const o of this.hudMecha) o.setVisible(true).setAlpha(1);
    this.mecha.setTint(COLOR_MECHA);
    this.bomba.setFrame('bomba').setDisplaySize(70, 70);
  }

  // Lo llama el microjuego (con ganar() / perder()).
  decidir(gano) {
    if (this.estado !== 'micro' || this.decididoEn !== null) return;
    this.gano = gano;
    this.decididoEn = this.audio.ahora();
    if (gano) {
      this.audio.bien();
      this.mecha.setTint(COLOR.BIEN);
      this.bomba.setFrame('estrella').setDisplaySize(70, 70);
      this.chispaMecha.setVisible(false);
    } else {
      this.audio.error();
      this.mecha.setTint(COLOR.MAL);
    }
    // Si decidió antes de que se fuera la consigna, se va ya.
    this.tweens.killTweensOf(this.hudConsigna);
    this.tweens.add({ targets: this.hudConsigna, alpha: 0, duration: 120 });
  }

  cerrar() {
    this.estado = 'cerrando';
    this.audio.detenerPista();
    this.audio.chorro(false);
    this.colorSiguiente();
    this.mostrarCapa(true);
    for (const o of [this.puntosTxt, ...this.corazones, this.reaccion, this.mensaje]) o.setVisible(false);
    this.cierreHasta = this.audio.ahora() + 0.09;
  }

  terminarMicro() {
    this.scene.stop(this.clave);
    this.clave = null;
    this.rondas++;
    if (this.gano) this.puntos++;
    else this.vidas--;
    if (this.vidas <= 0) this.fin();
    else this.intermedio(this.gano);
  }

  fin() {
    this.estado = 'fin';
    const nuevo = this.puntos > this.record;
    if (nuevo) {
      this.record = this.puntos;
      guardar(CLAVE_RECORD, String(this.record));
    }
    this.mostrarCapa(true);
    this.fondoCapa.setTint(COLOR.OSCURO);
    for (const o of [this.puntosTxt, ...this.corazones, this.reaccion, this.mensaje]) o.setVisible(false);
    this.mostrarDesfile(true);
    this.audio.finPartida();
    if (nuevo) this.time.delayedCall(1300, () => this.audio.record());
    this.ui.mostrarFin({ puntos: this.puntos, record: this.record, nuevo, ultimo: this.orden || '' });
  }

  // --------------------------------------------------------------------------
  //  Pausa (al salir de la pestaña o apagar la pantalla)
  // --------------------------------------------------------------------------
  pausar() {
    if (!['micro', 'intermedio', 'cerrando'].includes(this.estado)) return;
    this.previo = this.estado;
    this.estado = 'pausa';
    if (this.clave) this.scene.pause(this.clave);
    this.audio.chorro(false);
    this.audio.pausar();
    this.ui.mostrarPausa(true);
  }

  async seguir() {
    if (this.estado !== 'pausa') return;
    await this.audio.reanudar();
    if (this.clave) this.scene.resume(this.clave);
    this.estado = this.previo;
    this.ui.mostrarPausa(false);
  }

  // --------------------------------------------------------------------------
  //  Bucle
  // --------------------------------------------------------------------------
  update(time, deltaMs) {
    const dt = Math.min(0.05, deltaMs / 1000);
    this.rayos.angle += dt * 14;
    if (this.fps) this.fps.setText(`${Math.round(this.game.loop.actualFps)} FPS`);
    if (this.desfile[0].img.visible) this.animarDesfile(dt);
    const a = this.audio.ahora();
    switch (this.estado) {
      case 'intermedio':
        while (this.fases.length && this.fases[0].t <= a) this.fases.shift().fn();
        this.reaccion.y = VISTA.alto / 2 + 215 + Math.sin(time / 120) * 6;
        if (a >= this.finIntermedio) this.empezarMicro();
        break;
      case 'micro': this.cuadroMicro(a); break;
      case 'cerrando': if (a >= this.cierreHasta) this.terminarMicro(); break;
    }
  }

  cuadroMicro(a) {
    const t = a - this.t0;
    this.audio.programar();
    if (this.decididoEn !== null) {
      if (a - this.decididoEn >= PARTIDA.DESPUES_DE_DECIDIR_S) this.cerrar();
      return;
    }
    // La mecha se quema
    const frac = limitar(1 - t / this.dur, 0, 1);
    this.mecha.displayWidth = this.mechaLargo * frac;
    this.chispaMecha.setVisible(true).setPosition(this.mechaX0 + this.mechaLargo * frac, this.mechaY)
      .setAngle(t * 900).setScale(1.1 + Math.random() * 0.5);
    // Tic en cada uno de los últimos tres pulsos
    if (this.tics < 3 && this.dur - t <= (3 - this.tics) * this.pulso) {
      this.audio.tic(this.tics === 2);
      this.tics++;
      this.bomba.setDisplaySize(92, 92);
      this.tweens.add({ targets: this.bomba, displayWidth: 70, displayHeight: 70, duration: 160 });
    }
    if (t >= this.dur) {
      const micro = this.scene.get(this.clave);
      if (this.Clase.GANA_AL_FINAL) micro.ganar();
      else {
        micro.perder();
        this.audio.explosion();
        this.bomba.setFrame('explosion').setDisplaySize(130, 130);
        this.cameras.main.shake(220, 0.015);
      }
    }
  }

  animarDesfile(dt) {
    const h = VISTA.alto + 120;
    for (const d of this.desfile) {
      d.fase += dt;
      let y = h - ((d.fase * d.vel * 4) % h) - 60;
      d.img.setPosition(d.x + Math.sin(d.fase * 1.3) * 18, y).setAngle(Math.sin(d.fase * 2) * 12);
    }
  }
}
