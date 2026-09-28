// ============================================================================
//  Director.js — el que maneja la partida
// ----------------------------------------------------------------------------
//  Elige el próximo microjuego, lo lanza, mide el tiempo con la música, dibuja
//  la consigna y la mecha, y entre uno y otro baja el TELÓN del intermedio:
//  puntos, vidas y la carita de cómo te fue. Cada tanto, "¡MÁS RÁPIDO!", y
//  cada 12 microjuegos, un JEFE (más largo; si lo ganás, vida extra).
//  La primera vez, antes de la partida, corre la PRÁCTICA (ver Practica.js).
//
//  El Director es la escena de ARRIBA (se agrega última): el telón tapa al
//  microjuego en las transiciones y la consigna y la mecha van siempre encima.
// ============================================================================

import { ANCHO, VISTA, ESCALA, RITMO, PARTIDA, COLOR, DEBUG, CLAVE_RECORD, CLAVE_ESCALA, CLAVE_PRACTICA } from '../config.js';
import { crearAtlas } from '../motor/Atlas.js';
import { EMOJI, TAM_EMOJI, CELDA_EMOJI } from '../datos/emoji.js';
import { MICROS, JEFES } from '../micro/indice.js';
import { mezcla } from './Micro.js';
import { LECCIONES, VEL_PRACTICA, CartelLeccion } from './Practica.js';

const AYUDA = {
  tocar: 'TOCA', arrastrar: 'ARRASTRA', deslizar: 'DESLIZA EL DEDO', mantener: 'MANTÉN PRESIONADO',
  machacar: 'TOCA RÁPIDO', nada: 'NO TOQUES NADA',
};
const CARAS_BIEN = ['contento', 'facha', 'guinio', 'lengua', 'rico'];
const CARAS_MAL = ['mareado', 'asustado', 'enojado', 'calavera'];
const DESFILE = ['globo', 'pizza', 'gato', 'cohete', 'sandia', 'pelota', 'pollito', 'diamante', 'dona', 'sapo'];
// Colores del estallido de la consigna (el texto va en blanco encima)
const ESTALLIDOS = [0xff4d5a, 0x7b61ff, 0xff7a1a, 0x2f7dff, 0xe0339b, 0x16a37a];
const COLOR_MECHA = 0xffc14d;
const MEDALLAS = [[40, 'diamante'], [30, 'trofeo'], [20, 'medalla_oro'], [10, 'medalla_plata'], [5, 'medalla_bronce']];

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
    this.cameras.main.setOrigin(0, 0).setZoom(ESCALA.k);
    this.prepararTexturas();
    this.record = parseInt(leer(CLAVE_RECORD, '0'), 10) || 0;
    this.color = 3;
    this.crearTelon();
    this.crearConsigna();
    this.crearMecha();
    this.cartelLeccion = new CartelLeccion(this);
    this.estado = 'titulo';
    this.clave = null;
    this.practica = null;
    this.congelado = false;
    // En una lección de la práctica, el primer toque descongela el juego. (El
    // Director está arriba: recibe el toque antes que el microjuego, que
    // después lo recibe también y lo cuenta como jugada.)
    this.input.on('pointerdown', () => {
      if (this.estado === 'leccion' && this.time.now >= this.leccionDesde) this.descongelar();
    });
    // Para probar: ?micro=Nombre repite siempre el mismo microjuego (o jefe), y
    // ?nivel=3&vel=1.5 fuerzan la dificultad y la velocidad.
    const q = new URLSearchParams(location.search);
    const solo = q.get('micro');
    this.soloEste = solo ? [...MICROS, ...JEFES].find(M => M.name.toLowerCase() === solo.toLowerCase()) : null;
    this.nivelForzado = q.has('nivel') ? parseInt(q.get('nivel'), 10) : null;
    this.velForzada = q.has('vel') ? parseFloat(q.get('vel')) : null;
    this.fps = DEBUG ? this.add.bitmapText(8, 8, 'anton', '', 22).setTint(COLOR.ORO).setDepth(100) : null;
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
    // Cada emoji ocupa una celda con borde blanco y sombra. El marco "nombre"
    // mide lo que mide el dibujo (el borde y la sombra se dibujan por fuera,
    // como un recorte de atlas al revés): así los tamaños son los del dibujo.
    // "nombre#" es la celda entera, para recortar con setCrop.
    const te = this.textures.addImage('emoji', this.imagenEmoji);
    const m = (CELDA_EMOJI - TAM_EMOJI) / 2;
    for (const [nombre, [x, y]] of Object.entries(EMOJI)) {
      te.add(nombre, 0, x, y, CELDA_EMOJI, CELDA_EMOJI).setTrim(TAM_EMOJI, TAM_EMOJI, -m, -m, CELDA_EMOJI, CELDA_EMOJI);
      te.add(nombre + '#', 0, x, y, CELDA_EMOJI, CELDA_EMOJI);
    }
  }

  // --------------------------------------------------------------------------
  //  El telón (intermedio, título y final): un contenedor que sube y baja
  // --------------------------------------------------------------------------
  crearTelon() {
    const bt = (tam, color) => this.add.bitmapText(0, 0, 'anton', '', tam).setOrigin(0.5).setTint(color);
    this.telon = this.add.container(0, 0).setDepth(10);
    this.fondoCapa = this.add.image(0, 0, 'atlas', 'blanco').setOrigin(0);
    this.fondoDeg = this.add.image(0, 0, 'atlas', 'degradeV').setOrigin(0);
    this.rayos = this.add.image(0, 0, 'atlas', 'rayos').setScale(2.8).setAlpha(0.14);
    this.vinetaCapa = this.add.image(0, 0, 'atlas', 'vineta').setOrigin(0).setTint(COLOR.OSCURO).setAlpha(0.4);
    this.dientes = this.add.tileSprite(0, 0, ANCHO, 32, 'atlas', 'dientes').setOrigin(0, 0);
    this.sombraPuntos = bt(190, COLOR.OSCURO).setAlpha(0.25);
    this.puntosTxt = bt(190, COLOR.TEXTO);
    this.corazones = [];
    for (let i = 0; i < PARTIDA.VIDAS; i++) this.corazones.push(this.add.image(0, 0, 'emoji', 'corazon').setDisplaySize(82, 82));
    this.sombraCara = this.add.image(0, 0, 'atlas', 'circulo').setTint(COLOR.OSCURO).setAlpha(0.22).setDisplaySize(130, 30);
    this.reaccion = this.add.image(0, 0, 'emoji', 'contento').setDisplaySize(170, 170);
    this.cinta = this.add.image(0, 0, 'atlas', 'estallido').setAlpha(0);
    this.mensaje = bt(64, COLOR.TEXTO);
    this.velTxt = bt(30, COLOR.TEXTO).setAlpha(0.9);
    this.telon.add([this.fondoCapa, this.fondoDeg, this.rayos, this.vinetaCapa, this.dientes,
      this.sombraPuntos, this.puntosTxt, ...this.corazones, this.sombraCara, this.reaccion,
      this.cinta, this.mensaje, this.velTxt]);
    this.detalles = [this.sombraPuntos, this.puntosTxt, ...this.corazones, this.sombraCara, this.reaccion,
      this.cinta, this.mensaje, this.velTxt];
    // Emoji que desfilan detrás del título y del final
    this.desfile = DESFILE.map((n, i) => ({
      img: this.add.image(0, 0, 'emoji', n).setDisplaySize(90, 90).setAlpha(0.75).setDepth(11),
      x: 40 + (i * 97) % 480, fase: i * 0.37, vel: 30 + (i % 4) * 12,
    }));
  }

  mostrarDesfile(v) { for (const d of this.desfile) d.img.setVisible(v); }
  mostrarDetalles(v) { for (const o of this.detalles) o.setVisible(v); }

  // Colores del telón: un color vivo, más claro arriba y más oscuro abajo
  pintarTelon(color) {
    this.fondoCapa.setTint(mezcla(color, 0x000000, 0.25));
    this.fondoDeg.setTint(mezcla(color, 0xffffff, 0.3));
    this.dientes.setTint(mezcla(color, 0x000000, 0.25));
  }

  colorSiguiente() {
    this.color = (this.color + 1 + Math.floor(Math.random() * (COLOR.FONDOS.length - 1))) % COLOR.FONDOS.length;
    this.pintarTelon(COLOR.FONDOS[this.color]);
  }

  // El telón baja (tapa) o sube (destapa). Sin "suave", es instantáneo.
  // (Los rayos son más grandes que el telón: se apagan mientras se mueve,
  // si no asomarían por el borde.)
  telonAbajo(suave, alTerminar) {
    this.tweens.killTweensOf([this.telon, this.rayos]);
    this.telon.setVisible(true);
    if (!suave) { this.telon.y = 0; this.rayos.setAlpha(0.14); return; }
    this.telon.y = -(VISTA.alto + 40);
    this.rayos.setAlpha(0);
    this.tweens.add({ targets: this.telon, y: 0, duration: 170, ease: 'Quad.easeIn', onComplete: () => {
      this.rayos.setAlpha(0.14);
      if (alTerminar) alTerminar();
    } });
  }

  telonArriba() {
    this.tweens.killTweensOf([this.telon, this.rayos]);
    this.rayos.setAlpha(0);
    this.tweens.add({ targets: this.telon, y: -(VISTA.alto + 40), duration: 230, ease: 'Quad.easeIn',
      onComplete: () => this.telon.setVisible(false) });
  }

  // --------------------------------------------------------------------------
  //  La consigna: estallido de historieta, texto, y una manito que hace el gesto
  // --------------------------------------------------------------------------
  crearConsigna() {
    this.consignaGrupo = this.add.container(0, 0).setDepth(30);
    this.estallidoSombra = this.add.image(0, 0, 'atlas', 'estallido').setTint(COLOR.OSCURO);
    this.estallido = this.add.image(0, 0, 'atlas', 'estallido');
    this.consigna = this.add.bitmapText(0, 0, 'anton', '', 96).setOrigin(0.5).setTint(COLOR.TEXTO);
    this.consignaGrupo.add([this.estallidoSombra, this.estallido, this.consigna]);
    this.ayuda = this.add.bitmapText(0, 0, 'anton', '', 38).setOrigin(0, 0.5).setTint(COLOR.ORO).setDepth(31);
    this.anilloMano = this.add.image(0, 0, 'atlas', 'anillo').setTint(0xffffff).setDepth(31);
    this.mano = this.add.image(0, 0, 'emoji', 'dedo').setDisplaySize(64, 64).setDepth(32);
    this.hudConsigna = [this.consignaGrupo, this.ayuda, this.anilloMano, this.mano];
    for (const o of this.hudConsigna) o.setVisible(false);
  }

  mostrarConsigna(texto, control) {
    const cx = ANCHO / 2, cy = VISTA.alto / 2;
    this.tweens.killTweensOf([...this.hudConsigna, this.estallido, this.estallidoSombra, this.consigna]);
    const color = Phaser.Utils.Array.GetRandom(ESTALLIDOS);
    this.consignaGrupo.setPosition(cx, cy - 40).setVisible(true).setAlpha(1).setScale(1).setAngle(0);
    this.consigna.setText(texto).setScale(1).setPosition(0, -8);
    const k = Math.min(1, 440 / Math.max(1, this.consigna.width));
    this.estallido.setTint(color).setDisplaySize(560, 380).setAngle(-3);
    this.estallidoSombra.setDisplaySize(590, 410).setPosition(6, 10).setAngle(-3);
    // Entrada: el estallido revienta y el texto cae encima
    this.estallido.setScale(this.estallido.scaleX * 0.2, this.estallido.scaleY * 0.2);
    this.estallidoSombra.setScale(this.estallidoSombra.scaleX * 0.2, this.estallidoSombra.scaleY * 0.2);
    this.tweens.add({ targets: [this.estallido, this.estallidoSombra], scaleX: '*=5', scaleY: '*=5', duration: 190, ease: 'Back.easeOut' });
    this.consigna.setScale(k * 2.2).setAngle(-8);
    this.tweens.add({ targets: this.consigna, scale: k, angle: -3, duration: 170, delay: 40, ease: 'Back.easeOut' });
    // La ayuda: la manito y el texto, debajo
    this.control = control;
    this.ayuda.setText(AYUDA[control]).setAlpha(1).setVisible(true);
    const ancho = this.ayuda.width + 80;
    this.manoBase = { x: cx - ancho / 2 + 30, y: cy + 150 };
    this.ayuda.setPosition(cx - ancho / 2 + 80, cy + 150);
    this.mano.setVisible(true).setAlpha(1).setFrame(control === 'nada' ? 'diablo' : 'dedo').setDisplaySize(64, 64);
    this.anilloMano.setVisible(control !== 'nada' && control !== 'arrastrar').setAlpha(0);
    this.tManoCero = this.time.now;
    // Salida: todo se agranda y se desvanece
    const quieta = Math.max(0.6, 0.95 / this.vel) * 1000;
    this.tFinConsigna = (quieta + 200) / 1000;
    this.tweens.add({ targets: this.consignaGrupo, scale: 1.2, alpha: 0, delay: quieta, duration: 170, ease: 'Quad.easeIn' });
    this.tweens.add({ targets: [this.ayuda, this.mano, this.anilloMano], alpha: 0, delay: quieta, duration: 170 });
  }

  ocultarConsigna() {
    this.tweens.killTweensOf(this.hudConsigna);
    this.tweens.add({ targets: this.hudConsigna, alpha: 0, duration: 110 });
  }

  // La manito hace el gesto que pide el microjuego, una y otra vez
  animarMano(ahora) {
    if (!this.mano.visible || this.mano.alpha <= 0) return;
    const t = (ahora - this.tManoCero) / 1000, b = this.manoBase;
    const g = this.estado === 'leccion' ? 2.6 : 1;          // en la práctica, gestos amplios
    let x = b.x, y = b.y, anillo = -1;
    switch (this.control) {
      case 'tocar': { const f = (t * 1.6) % 1; y += f < 0.25 ? f * 40 : Math.max(0, 10 - (f - 0.25) * 40); if (f >= 0.25) anillo = (f - 0.25) / 0.75; break; }
      case 'machacar': { const f = (t * 5) % 1; y += f < 0.5 ? f * 20 : (1 - f) * 20; anillo = f; break; }
      case 'arrastrar': x += Math.sin(t * 5 / g) * 34 * g; break;
      case 'deslizar': { const f = (t * 1.4) % 1; x += (-20 + f * 60) * g; y += (24 - f * 60) * g; this.mano.setAlpha(f < 0.8 ? 1 : (1 - f) * 5); break; }
      case 'mantener': y += 8; anillo = (t * 1.1) % 1; break;
      case 'nada': this.mano.setAngle(Math.sin(t * 8) * 12); break;
    }
    this.mano.setPosition(x, y);
    if (anillo >= 0 && this.anilloMano.visible) {
      const tam = 30 + anillo * 70;
      this.anilloMano.setPosition(b.x - 4, b.y - 26).setDisplaySize(tam, tam).setAlpha((1 - anillo) * this.mano.alpha);
    }
  }

  // --------------------------------------------------------------------------
  //  La mecha: una cuerda que se quema de derecha a izquierda, con brasas
  // --------------------------------------------------------------------------
  crearMecha() {
    this.mechaFondo = this.add.image(0, 0, 'atlas', 'blanco').setOrigin(0, 0.5).setTint(COLOR.OSCURO).setAlpha(0.85);
    this.cuerda = this.add.tileSprite(0, 0, 400, 14, 'atlas', 'rayas').setOrigin(0, 0.5).setTint(COLOR_MECHA);
    this.quemado = this.add.image(0, 0, 'atlas', 'blanco').setOrigin(0, 0.5).setTint(COLOR.OSCURO);
    this.chispaMecha = this.add.image(0, 0, 'atlas', 'chispa').setTint(0xfff1a8).setScale(1.3);
    this.brillo = this.add.image(0, 0, 'atlas', 'brillo').setTint(0xffb347).setAlpha(0.8).setDisplaySize(70, 70);
    this.bomba = this.add.image(0, 0, 'emoji', 'bomba').setDisplaySize(74, 74);
    this.brasas = [];
    for (let i = 0; i < 10; i++) this.brasas.push({ img: this.add.image(0, 0, 'atlas', 'punto').setVisible(false), vivo: false });
    this.hudMecha = [this.mechaFondo, this.cuerda, this.quemado, this.brillo, this.chispaMecha, this.bomba];
    for (const o of [...this.hudMecha]) o.setVisible(false).setDepth(25);
    for (const b of this.brasas) b.img.setDepth(25);
  }

  mostrarMecha(v) {
    for (const o of this.hudMecha) o.setVisible(v).setAlpha(1);
    if (!v) for (const b of this.brasas) { b.vivo = false; b.img.setVisible(false); }
  }

  // Cuando cambia el alto de la pantalla (girar, cambiar la ventana).
  redimensionar(h) {
    VISTA.alto = h;
    this.cameras.main.setSize(Math.round(ANCHO * ESCALA.k), Math.round(h * ESCALA.k)).setZoom(ESCALA.k);
    if (this.clave) {
      const m = this.scene.get(this.clave);
      if (m && m.cameras && m.cameras.main) m.cameras.main.setSize(this.cameras.main.width, this.cameras.main.height).setZoom(ESCALA.k);
    }
    const cx = ANCHO / 2, cy = h / 2;
    this.fondoCapa.setDisplaySize(ANCHO, h);
    this.fondoDeg.setDisplaySize(ANCHO, h);
    this.vinetaCapa.setDisplaySize(ANCHO, h);
    this.dientes.setPosition(0, h - 1);
    this.rayos.setPosition(cx, cy);
    this.cinta.setPosition(cx, cy - 270);
    this.mensaje.setPosition(cx, cy - 274);
    this.velTxt.setPosition(cx, cy - 352);
    this.puntosTxt.setPosition(cx, cy - 130);
    this.sombraPuntos.setPosition(cx, cy - 120);
    this.corazones.forEach((c, i) => c.setPosition(cx + (i - (PARTIDA.VIDAS - 1) / 2) * 98, cy + 50));
    this.reaccion.setPosition(cx, cy + 215);
    this.sombraCara.setPosition(cx, cy + 305);
    this.mechaY = h - 38;
    this.mechaX0 = 82;
    this.mechaLargo = ANCHO - 26 - this.mechaX0;
    this.mechaFondo.setPosition(this.mechaX0 - 6, this.mechaY).setDisplaySize(this.mechaLargo + 12, 26);
    this.cuerda.setPosition(this.mechaX0, this.mechaY).setSize(this.mechaLargo, 14);
    this.quemado.setPosition(this.mechaX0 + this.mechaLargo, this.mechaY).setDisplaySize(1, 16);
    this.bomba.setPosition(42, this.mechaY - 8);
    if (this.telon.y !== 0) this.telon.y = -(h + 40);
  }

  modoTitulo() {
    this.estado = 'titulo';
    this.telonAbajo(false);
    this.pintarTelon(COLOR.FONDOS[3]);
    this.mostrarDetalles(false);
    this.mostrarDesfile(true);
  }

  // --------------------------------------------------------------------------
  //  La partida
  // --------------------------------------------------------------------------
  // Lo llama la interfaz, con el audio ya desbloqueado. practica: true la
  // fuerza ("Cómo jugar"); si no se dice nada, corre sólo si nunca se hizo acá.
  empezar(practica = null) {
    if (this.estado !== 'titulo' && this.estado !== 'fin') return;
    this.audio.iniciarPartida();
    const hacer = practica === true || (practica === null && leer(CLAVE_PRACTICA, '') !== '1');
    this.practica = hacer && !this.soloEste ? { paso: 0, intentos: 0 } : null;
    this.ui.mostrarSaltar(!!this.practica);
    this.reiniciarPartida();
    this.intermedio(null);
  }

  reiniciarPartida() {
    this.vidas = PARTIDA.VIDAS;
    this.puntos = 0;
    this.rondas = 0;
    this.vel = 1;
    this.nivel = 1;
    this.bolsa = [];
    this.bolsaJefes = [];
    this.ultimo = null;
    this.Clase = null;
    this.mostrarDesfile(false);
  }

  // Terminó la práctica (o la saltearon): empieza la partida de verdad.
  terminarPractica() {
    guardar(CLAVE_PRACTICA, '1');
    this.practica = null;
    this.ui.mostrarSaltar(false);
    this.reiniciarPartida();
    this.trasPractica = true;
    this.intermedio(null);
  }

  saltarPractica() {
    if (!this.practica || !['intermedio', 'micro', 'leccion', 'cerrando'].includes(this.estado)) return;
    this.congelado = false;
    this.cartelLeccion.ocultar();
    if (this.clave) { this.scene.stop(this.clave); this.clave = null; }
    this.audio.detenerPista();
    this.audio.chorro(false);
    this.mostrarMecha(false);
    this.ocultarConsigna();
    this.terminarPractica();
  }

  velocidadPara(rondas) {
    return Math.min(PARTIDA.VEL_MAX, 1 + PARTIDA.ACELERA * Math.floor(rondas / PARTIDA.CADA_ACELERA));
  }

  // ¿Le toca un jefe a la próxima ronda?
  tocaJefe() {
    return JEFES.length > 0 && !this.soloEste && !this.practica && (this.rondas + 1) % PARTIDA.CADA_JEFE === 0;
  }

  siguiente() {
    if (this.practica) return MICROS.find(M => M.name === LECCIONES[this.practica.paso].micro);
    if (this.soloEste) return this.soloEste;
    if (this.tocaJefe()) {
      if (!this.bolsaJefes.length) this.bolsaJefes = Phaser.Utils.Array.Shuffle([...JEFES]);
      return this.bolsaJefes.pop();
    }
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
    this.aplicarResolucion();
    const a = this.audio.ahora();
    const p = this.practica;
    const velNueva = p ? VEL_PRACTICA : this.velocidadPara(this.rondas);
    const nivelNuevo = p ? 1 : Math.min(3, 1 + Math.floor(this.rondas / PARTIDA.CADA_NIVEL));
    const acelera = !p && velNueva > this.vel;
    const sube = !p && nivelNuevo > this.nivel;
    const jefeGanado = gano === true && this.Clase && this.Clase.JEFE;
    this.vel = p ? velNueva : this.velForzada || velNueva;
    this.nivel = p ? nivelNuevo : this.nivelForzado || nivelNuevo;

    this.telonAbajo(false);
    this.mostrarDetalles(true);
    this.mostrarDesfile(false);
    this.ocultarConsigna();
    this.mostrarMecha(false);
    this.velTxt.setText(p ? 'PRÁCTICA' : this.vel > 1.001 ? `VELOCIDAD ×${this.vel.toFixed(2).replace('.', ',')}` : '');

    // Puntos y vidas (en la práctica: qué lección va, y sin corazones)
    const arriba = p ? `${p.paso + 1}/${LECCIONES.length}` : String(this.puntos);
    this.puntosTxt.setText(arriba).setScale(1);
    this.sombraPuntos.setText(arriba);
    this.corazones.forEach((c, i) => c.setFrame(i < this.vidas ? 'corazon' : 'corazon_negro').setDisplaySize(82, 82)
      .setAngle(0).setAlpha(1).setVisible(!p));
    if (gano === true) {
      this.puntosTxt.setScale(1.5);
      this.tweens.add({ targets: this.puntosTxt, scale: 1, duration: 280, ease: 'Back.easeOut' });
      this.confeti(ANCHO / 2, VISTA.alto / 2 - 130, 22);
      this.audio.gano();
      if (jefeGanado) {
        const c = this.corazones[this.vidas - 1];
        c.setDisplaySize(10, 10);
        this.tweens.add({ targets: c, displayWidth: 82, displayHeight: 82, duration: 420, ease: 'Back.easeOut' });
      }
    } else if (gano === false) {
      if (!p) this.romperCorazon(this.corazones[this.vidas]);
      this.cameras.main.shake(160, 0.008);
      this.audio.perdio();
    } else {
      this.audio.empieza();
    }

    // La carita
    const cara = gano === null ? 'facha' : Phaser.Utils.Array.GetRandom(gano ? CARAS_BIEN : CARAS_MAL);
    this.reaccion.setFrame(cara).setDisplaySize(170, 170).setAngle(0);
    this.tweens.add({ targets: this.reaccion, displayWidth: 205, displayHeight: 205, duration: 150, yoyo: true, ease: 'Quad.easeOut' });

    // Los carteles: se muestran uno después del otro
    const carteles = [];
    if (gano === null && p) carteles.push(['¡A PRACTICAR!', null, 0x2f7dff]);
    else if (gano === null && this.trasPractica) {
      carteles.push(['¡AHORA EN SERIO!', null, 0xe0339b], ['¡TIENES 4 VIDAS!', () => this.audio.record(), 0x16a37a]);
    } else if (gano === null) carteles.push(['¡PREPÁRATE!', null, 0x2f7dff]);
    if (p && gano === false && p.intentos > 0) carteles.push(['¡OTRA VEZ!', null, 0xff7a1a]);
    this.trasPractica = false;
    if (jefeGanado) carteles.push(['¡VIDA EXTRA!', () => this.audio.record(), 0x16a37a]);
    if (gano === false && this.vidas === 1) carteles.push(['¡ÚLTIMA VIDA!', null, 0xff4d5a]);
    if (sube) carteles.push(['¡MÁS DIFÍCIL!', () => this.audio.acelera(), 0xe0339b]);
    if (acelera) carteles.push(['¡MÁS RÁPIDO!', () => this.audio.acelera(), 0xff7a1a]);
    if (this.tocaJefe()) carteles.push(['¡JEFE!', () => this.audio.jefe(), 0x1b1030]);

    let dur = Math.max(0.8, 1.25 / this.vel);
    this.fases = [];
    this.mensaje.setText('');
    this.cinta.setAlpha(0);
    carteles.forEach(([txt, sonido, color], i) => {
      const t = a + (i === 0 && gano === null ? 0 : dur * 0.55 + i * 0.95);
      this.fases.push({ t, fn: () => this.cartelTelon(txt, color, sonido) });
    });
    if (carteles.length) dur += 0.95 * carteles.length - (gano === null ? 0.3 : 0);
    this.finIntermedio = a + dur;
  }

  // Un cartel sobre un estallido en el telón ("¡MÁS RÁPIDO!")
  cartelTelon(texto, color, sonido) {
    this.mensaje.setText(texto).setScale(0.4).setAngle(-4);
    const k = Math.min(1, 440 / Math.max(1, this.mensaje.width / 0.4));
    this.tweens.add({ targets: this.mensaje, scale: k, duration: 220, ease: 'Back.easeOut' });
    this.cinta.setTint(color).setAlpha(1).setDisplaySize(110, 60).setAngle(-4);
    this.tweens.add({ targets: this.cinta, displayWidth: 520, displayHeight: 200, duration: 220, ease: 'Back.easeOut' });
    if (sonido) sonido();
  }

  // El corazón que se pierde se parte en dos y se cae
  romperCorazon(c) {
    const k = CELDA_EMOJI / TAM_EMOJI, tam = 82 * k;
    for (const lado of [-1, 1]) {
      const m = this.add.image(c.x, c.y + this.telon.y, 'emoji', 'corazon#').setDisplaySize(tam, tam).setDepth(12)
        .setCrop(lado < 0 ? 0 : CELDA_EMOJI / 2, 0, CELDA_EMOJI / 2, CELDA_EMOJI);
      this.tweens.add({
        targets: m, x: c.x + lado * 60, y: c.y + 260, angle: lado * 70, alpha: 0,
        duration: 650, ease: 'Quad.easeIn', onComplete: () => m.destroy(),
      });
    }
  }

  // Papelitos de colores (se crean y se destruyen: sólo al ganar)
  confeti(x, y, n) {
    for (let i = 0; i < n; i++) {
      const c = this.add.image(x, y, 'atlas', 'blanco').setDisplaySize(12, 18).setDepth(12)
        .setTint(COLOR.FONDOS[i % COLOR.FONDOS.length]).setAngle(Math.random() * 180);
      const vx = (Math.random() - 0.5) * 560, vy = -220 - Math.random() * 340;
      this.tweens.add({
        targets: c, x: x + vx, y: y + vy + 520, angle: c.angle + (Math.random() - 0.5) * 900, alpha: 0,
        duration: 1000, ease: 'Quad.easeIn', onComplete: () => c.destroy(),
      });
    }
  }

  empezarMicro() {
    const Clase = this.siguiente();
    this.Clase = Clase;
    this.clave = Clase.name;
    const bpm = RITMO.BPM_BASE * this.vel;
    this.pulso = 60 / bpm;
    // Los jefes sienten la velocidad sólo a medias: si no, no alcanza el tiempo
    this.dur = Clase.PULSOS * this.pulso * (Clase.JEFE ? Math.sqrt(this.vel) : 1);
    this.t0 = this.audio.ahora();
    this.decididoEn = null;
    this.gano = null;
    this.tics = 0;
    this.leccionMostrada = false;
    // Algunos microjuegos traen variantes con su propia consigna ("¡CORTA EL ROJO!")
    const variante = Clase.VARIANTES ? Phaser.Utils.Array.GetRandom(Clase.VARIANTES) : null;
    this.orden = variante ? variante.orden : Clase.ORDEN;
    this.audio.empezarPista(bpm, this.t0, (Math.random() * 1e9) | 0);
    this.scene.launch(this.clave, {
      director: this, audio: this.audio, nivel: this.nivel, vel: this.vel, dur: this.dur, t0: this.t0, variante,
    });
    this.estado = 'micro';
    this.telonArriba();
    this.mostrarConsigna(this.orden, Clase.CONTROL);
    this.mostrarMecha(true);
    this.cuerda.setTint(COLOR_MECHA);
    this.bomba.setFrame('bomba').setDisplaySize(74, 74);
  }

  // Lo llama el microjuego (con ganar() / perder()).
  decidir(gano) {
    if (this.estado !== 'micro' || this.decididoEn !== null) return;
    this.gano = gano;
    this.decididoEn = this.audio.ahora();
    if (gano) {
      this.audio.bien();
      this.cuerda.setTint(COLOR.BIEN);
      this.bomba.setFrame('estrella').setDisplaySize(74, 74);
      this.tweens.add({ targets: this.bomba, angle: 360, duration: 400 });
      this.chispaMecha.setVisible(false);
      this.brillo.setVisible(false);
    } else {
      this.audio.error();
      this.cuerda.setTint(COLOR.MAL);
    }
    this.ocultarConsigna();
  }

  cerrar() {
    this.estado = 'cerrando';
    this.audio.detenerPista();
    this.audio.chorro(false);
    this.colorSiguiente();
    this.mostrarDetalles(false);
    this.telonAbajo(true, () => { if (this.estado === 'cerrando') this.terminarMicro(); });
  }

  terminarMicro() {
    this.scene.stop(this.clave);
    this.clave = null;
    const p = this.practica;
    if (p) {
      // En la práctica no se pierden vidas: si sale mal, se repite una vez
      this.mostrarMecha(false);
      if (this.gano || ++p.intentos >= 2) { p.paso++; p.intentos = 0; }
      if (p.paso >= LECCIONES.length) this.terminarPractica();
      else this.intermedio(this.gano);
      return;
    }
    this.rondas++;
    if (this.gano) {
      this.puntos++;
      if (this.Clase.JEFE) this.vidas = Math.min(PARTIDA.VIDAS, this.vidas + 1);
    } else this.vidas--;
    this.mostrarMecha(false);
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
    this.telonAbajo(false);
    this.pintarTelon(0x3a2a6b);
    this.mostrarDetalles(false);
    this.mostrarDesfile(true);
    this.audio.finPartida();
    if (nuevo) this.time.delayedCall(1300, () => this.audio.record());
    const medalla = (MEDALLAS.find(([min]) => this.puntos >= min) || [0, null])[1];
    this.ui.mostrarFin({ puntos: this.puntos, record: this.record, nuevo, ultimo: this.orden || '', medalla });
  }

  // --------------------------------------------------------------------------
  //  Pausa (al salir de la pestaña o apagar la pantalla)
  // --------------------------------------------------------------------------
  pausar() {
    if (!['micro', 'intermedio', 'cerrando'].includes(this.estado)) return;
    this.previo = this.estado;
    this.estado = 'pausa';
    if (this.clave) this.scene.pause(this.clave);
    this.tweens.pauseAll();
    this.audio.chorro(false);
    this.audio.pausar();
    this.ui.mostrarPausa(true);
  }

  async seguir() {
    if (this.estado !== 'pausa') return;
    await this.audio.reanudar();
    if (this.clave) this.scene.resume(this.clave);
    this.tweens.resumeAll();
    this.estado = this.previo;
    this.ui.mostrarPausa(false);
  }

  // --------------------------------------------------------------------------
  //  Bucle
  // --------------------------------------------------------------------------
  update(time, deltaMs) {
    const dt = Math.min(0.05, deltaMs / 1000);
    this.rayos.angle += dt * 14;
    this.dientes.tilePositionX += dt * 40;
    if (this.fps) this.fps.setText(`${Math.round(this.game.loop.actualFps)} FPS  x${ESCALA.k}`);
    this.medirRendimiento(deltaMs);
    if (this.desfile[0].img.visible) this.animarDesfile(dt);
    this.animarMano(time);
    this.animarBrasas(dt);
    const a = this.audio.ahora();
    switch (this.estado) {
      case 'intermedio':
        while (this.fases.length && this.fases[0].t <= a) this.fases.shift().fn();
        this.reaccion.y = VISTA.alto / 2 + 215 + Math.sin(time / 120) * 7;
        this.reaccion.angle = Math.sin(time / 200) * 6;
        break;
      case 'micro': this.cuadroMicro(a); break;
      case 'leccion': this.cartelLeccion.animar(time); break;
    }
    if (this.estado === 'intermedio' && a >= this.finIntermedio) this.empezarMicro();
  }

  cuadroMicro(a) {
    const t = a - this.t0;
    this.audio.programar();
    if (this.decididoEn !== null) {
      if (a - this.decididoEn >= PARTIDA.DESPUES_DE_DECIDIR_S) this.cerrar();
      return;
    }
    if (this.practica && !this.leccionMostrada && t >= this.tFinConsigna && this.revisarLeccion()) return;
    // La mecha se quema: la parte quemada tapa la cuerda desde la derecha
    const frac = limitar(1 - t / this.dur, 0, 1);
    const punta = this.mechaX0 + this.mechaLargo * frac;
    this.quemado.setPosition(punta, this.mechaY).setDisplaySize(this.mechaLargo * (1 - frac) + 1, 16);
    this.cuerda.tilePositionX -= 0.6;
    this.chispaMecha.setVisible(true).setPosition(punta, this.mechaY).setAngle(t * 900).setScale(1.1 + Math.random() * 0.6);
    this.brillo.setVisible(true).setPosition(punta, this.mechaY).setAlpha(0.5 + Math.random() * 0.4);
    if (Math.random() < 0.5) this.soltarBrasa(punta, this.mechaY);
    // La bomba tiembla cada vez más
    const nervio = t > this.dur - 3 * this.pulso ? 7 : 2;
    this.bomba.setAngle(Math.sin(t * 40) * nervio);
    // Tic en cada uno de los últimos tres pulsos
    if (this.tics < 3 && this.dur - t <= (3 - this.tics) * this.pulso) {
      this.audio.tic(this.tics === 2);
      this.tics++;
      this.bomba.setDisplaySize(98, 98);
      this.tweens.add({ targets: this.bomba, displayWidth: 74, displayHeight: 74, duration: 160 });
    }
    if (t >= this.dur) {
      const micro = this.scene.get(this.clave);
      if (this.Clase.GANA_AL_FINAL) micro.ganar();
      else {
        micro.perder();
        this.audio.explosion();
        this.bomba.setFrame('explosion').setDisplaySize(150, 150);
        this.cameras.main.shake(220, 0.015);
      }
    }
  }

  // --------------------------------------------------------------------------
  //  Lecciones de la práctica: congelar y descongelar
  // --------------------------------------------------------------------------
  // ¿Llegó el momento de la lección? Si llegó, congela todo y devuelve true.
  revisarLeccion() {
    const m = this.scene.get(this.clave), lec = LECCIONES[this.practica.paso];
    if (!m || !m.sys.isActive() || m.decidido || !lec.listo(m)) return false;
    this.leccionMostrada = true;
    this.estado = 'leccion';
    this.congelado = true;                    // Micro.update no avanza
    this.congeladoEn = this.audio.ahora();
    this.leccionDesde = this.time.now + 250;  // un dedo que ya estaba apoyado no cuenta
    // Si el aparato se trabó, las animaciones pueden ir atrasadas respecto
    // del reloj: el telón y la consigna se sacan igual, que no tapen nada.
    this.tweens.killTweensOf([this.telon, this.rayos, ...this.hudConsigna]);
    this.telon.setVisible(false).setY(-(VISTA.alto + 40));
    this.tweens.add({ targets: this.consignaGrupo, alpha: 0, duration: 120 });
    // La mano hace el gesto sobre el objeto (la punta del dedo, en el objeto)
    const o = lec.objetivo(m) || { x: ANCHO / 2, y: VISTA.alto / 2 };
    this.ayuda.setVisible(false);
    this.control = lec.gesto;
    this.manoBase = { x: o.x + 4, y: o.y + 30 };
    this.mano.setVisible(true).setAlpha(1).setFrame('dedo').setDisplaySize(76, 76);
    this.anilloMano.setVisible(lec.gesto === 'tocar').setAlpha(0);
    this.tManoCero = this.time.now;
    this.cartelLeccion.mostrar(lec, VISTA.alto, this.mechaY);
    return true;
  }

  // El tiempo que estuvo congelado se le descuenta a todo lo que mide el
  // reloj: la mecha, el microjuego y la música siguen justo donde quedaron.
  descongelar() {
    const pausa = this.audio.ahora() - this.congeladoEn;
    this.t0 += pausa;
    const m = this.scene.get(this.clave);
    if (m) m.t0 += pausa;
    this.audio.correrPista(pausa);
    this.congelado = false;
    this.estado = 'micro';
    this.cartelLeccion.ocultar();
    this.tweens.add({ targets: [this.mano, this.anilloMano], alpha: 0, duration: 140 });
  }

  // --------------------------------------------------------------------------
  //  Red de seguridad del rendimiento: si este aparato no llega a ~50 cuadros
  //  por segundo dibujando a resolución alta, se baja la resolución (en el
  //  próximo intermedio, para no cortar un microjuego) y se recuerda en el
  //  aparato para la próxima vez. En la computadora (k = 1) no hace nada.
  // --------------------------------------------------------------------------
  medirRendimiento(deltaMs) {
    if (ESCALA.k <= 1 || this.estado !== 'micro') return;
    this.muestras = this.muestras || [];
    this.muestras.push(deltaMs);
    if (this.muestras.length < 150) return;
    const orden = this.muestras.sort((a, b) => a - b);
    const mediana = orden[orden.length >> 1];
    this.muestras = [];
    if (mediana > 1000 / 50) {
      ESCALA.max = Math.max(1, ESCALA.k - 0.25);
      guardar(CLAVE_ESCALA, String(ESCALA.max));
      this.bajarResolucion = true;
    }
  }

  aplicarResolucion() {
    if (!this.bajarResolucion) return;
    this.bajarResolucion = false;
    ESCALA.k = Math.min(ESCALA.k, ESCALA.max);
    this.game.scale.setGameSize(Math.round(ANCHO * ESCALA.k), Math.round(VISTA.alto * ESCALA.k));
    this.game.scale.refresh();
    this.redimensionar(VISTA.alto);
  }

  soltarBrasa(x, y) {
    const b = this.brasas.find(o => !o.vivo);
    if (!b) return;
    b.vivo = true; b.x = x; b.y = y; b.vx = (Math.random() - 0.5) * 80; b.vy = -60 - Math.random() * 80; b.t = 0;
    b.img.setVisible(true).setTint(Math.random() < 0.5 ? 0xffd23f : 0xff7a1a).setScale(0.35 + Math.random() * 0.3);
  }

  animarBrasas(dt) {
    for (const b of this.brasas) {
      if (!b.vivo) continue;
      b.t += dt;
      if (b.t > 0.5) { b.vivo = false; b.img.setVisible(false); continue; }
      b.vy += 500 * dt; b.x += b.vx * dt; b.y += b.vy * dt;
      b.img.setPosition(b.x, b.y).setAlpha(1 - b.t / 0.5);
    }
  }

  animarDesfile(dt) {
    const h = VISTA.alto + 120;
    for (const d of this.desfile) {
      d.fase += dt;
      const y = h - ((d.fase * d.vel * 4) % h) - 60;
      d.img.setPosition(d.x + Math.sin(d.fase * 1.3) * 18, y).setAngle(Math.sin(d.fase * 2) * 12);
    }
  }
}
