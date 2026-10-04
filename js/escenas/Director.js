// ============================================================================
//  Director.js — el que maneja la partida
// ----------------------------------------------------------------------------
//  Elige el próximo microjuego, lo lanza, mide el tiempo con la música, dibuja
//  la consigna y la mecha, y entre uno y otro baja el TELÓN del intermedio:
//  primero el resultado y después, con el telón todavía abajo, la ORDEN del
//  próximo. Al subir el telón la orden se achica y queda chiquita junto a la
//  mecha: el microjuego se ve entero desde el primer instante.
//  puntos, vidas y la carita de cómo te fue. Cada tanto, "¡MÁS RÁPIDO!", y
//  cada 12 microjuegos, un JEFE (más largo; si lo ganás, vida extra).
//  La primera vez, antes de la partida, corre la PRÁCTICA (ver Practica.js).
//
//  El Director es la escena de ARRIBA (se agrega última): el telón tapa al
//  microjuego en las transiciones y la consigna y la mecha van siempre encima.
// ============================================================================

import { ANCHO, VISTA, ESCALA, RITMO, PARTIDA, COLOR, DEBUG, CLAVE_RECORD, CLAVE_ESCALA, CLAVE_PRACTICA,
  CLAVE_PUNTAJE, CLAVE_VISTOS, CLAVE_LECCIONES, CLAVE_GALERIA, MODO_STAND, STAND } from '../config.js';
import { crearAtlas } from '../motor/Atlas.js';
import { EMOJI, TAM_EMOJI, CELDA_EMOJI } from '../datos/emoji.js';
import { MICROS, JEFES } from '../micro/indice.js';
import { mezcla } from './Micro.js';
import { LECCIONES, VEL_PRACTICA, CartelLeccion } from './Practica.js';

const AYUDA = {
  tocar: 'TOCA', arrastrar: 'ARRASTRA', deslizar: 'DESLIZA EL DEDO', mantener: 'MANTÉN PRESIONADO',
  machacar: 'TOCA RÁPIDO', nada: 'NO TOQUES NADA', girar: 'GIRA EN CÍRCULOS', enlazar: 'DIBUJA UNA VUELTA',
};
// Las reacciones del telón: las caras de Zas, la mascota (si no se pudo
// dibujar, los emoji de siempre)
const CARAS_BIEN = ['feliz', 'euforico', 'guino', 'cool', 'enamorado', 'sorprendido'];
const CARAS_MAL = ['triste', 'mareado', 'asustado', 'llorando'];
const EMOJI_BIEN = ['contento', 'facha', 'guinio', 'lengua', 'rico'];
const EMOJI_MAL = ['mareado', 'asustado', 'enojado', 'calavera'];
const DESFILE = ['globo', 'pizza', 'gato', 'cohete', 'sandia', 'pelota', 'pollito', 'diamante', 'dona', 'sapo'];
// Colores del estallido de la consigna (el texto va en blanco encima)
const ESTALLIDOS = [0xff4d5a, 0x7b61ff, 0xff7a1a, 0x2f7dff, 0xe0339b, 0x16a37a];
const COLOR_MECHA = 0xffc14d;
const ANCHO_BOMBA = 92;          // Zas, al final de la mecha
const MEDALLAS = [[40, 'diamante'], [30, 'trofeo'], [20, 'medalla_oro'], [10, 'medalla_plata'], [5, 'medalla_bronce']];

const limitar = (v, a, b) => (v < a ? a : v > b ? b : v);
const conPuntos = n => n.toLocaleString('es-CL');          // 12.340
function leer(clave, porDefecto) {
  try { const v = localStorage.getItem(clave); return v === null ? porDefecto : v; } catch (e) { return porDefecto; }
}
function guardar(clave, valor) {
  try { localStorage.setItem(clave, valor); } catch (e) { /* modo privado */ }
}
// Un conjunto de nombres guardado en el aparato (microjuegos vistos, lecciones)
function leerConjunto(clave) {
  try { const v = JSON.parse(leer(clave, '[]')); return new Set(Array.isArray(v) ? v : []); } catch (e) { return new Set(); }
}
// Cuánto se multiplica el puntaje con esta racha (aciertos seguidos)
export function multiplicador(racha) {
  for (const [desde, k] of PARTIDA.RACHA) if (racha >= desde) return k;
  return 1;
}
const conComa = k => String(k).replace('.', ',');

export class Director extends Phaser.Scene {
  constructor() { super({ key: 'Director' }); }

  init(d) {
    this.audio = d.audio;
    this.ui = d.ui;
    this.imagenEmoji = d.imagenEmoji;
    this.mascota = d.mascota;
  }

  create() {
    this.cameras.main.setOrigin(0, 0).setZoom(ESCALA.k);
    this.prepararTexturas();
    this.record = parseInt(leer(CLAVE_RECORD, '0'), 10) || 0;              // microjuegos
    this.recordPuntaje = parseInt(leer(CLAVE_PUNTAJE, '0'), 10) || 0;
    this.color = 3;
    this.crearTelon();
    this.crearConsigna();
    this.crearMecha();
    this.cartelLeccion = new CartelLeccion(this);
    this.estado = 'titulo';
    this.clave = null;
    this.practica = null;
    this.congelado = false;
    this.golpeHasta = 0;
    this.proximo = null;
    this.avisoHasta = 0;
    this.leccion = null;
    this.vistos = leerConjunto(CLAVE_VISTOS);          // microjuegos ya jugados en este aparato
    // lecciones de "primera vez" ya vistas (en el stand no se recuerdan: cada
    // jugador nuevo las recibe; ver volverAlTitulo)
    this.lecciones = MODO_STAND ? new Set() : leerConjunto(CLAVE_LECCIONES);
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
    this.soloEsteUrl = this.soloEste;           // (la galería usa soloEste y después lo devuelve)
    this.galeria = null;
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
    // Zas, la mascota: un marco por cara
    this.hayMascota = !!(this.mascota && Object.keys(this.mascota.marcos).length);
    if (this.hayMascota) {
      const tm = this.textures.addCanvas('mascota', this.mascota.lienzo);
      for (const [cara, [x, y, w, h]] of Object.entries(this.mascota.marcos)) tm.add(cara, 0, x, y, w, h);
      const [, , w, h] = Object.values(this.mascota.marcos)[0];
      this.altoMascota = h / w;                     // alto/ancho del marco
    }
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
    this.puntajeTxt = bt(40, COLOR.ORO);
    this.sumaTxt = bt(40, COLOR.BIEN).setOrigin(0, 0.5);
    this.corazones = [];
    for (let i = 0; i < PARTIDA.VIDAS; i++) this.corazones.push(this.add.image(0, 0, 'emoji', 'corazon').setDisplaySize(82, 82));
    this.sombraCara = this.add.image(0, 0, 'atlas', 'circulo').setTint(COLOR.OSCURO).setAlpha(0.22).setDisplaySize(130, 30);
    this.reaccion = this.add.image(0, 0, 'emoji', 'contento').setDisplaySize(170, 170);
    this.cinta = this.add.image(0, 0, 'atlas', 'estallido').setAlpha(0);
    this.mensaje = bt(64, COLOR.TEXTO);
    this.velTxt = bt(30, COLOR.TEXTO).setAlpha(0.9);
    // La racha (aciertos seguidos): un fueguito y "RACHA 6 · ×1,5"
    this.rachaFuego = this.add.image(0, 0, 'emoji', 'fuego').setDisplaySize(44, 44);
    this.rachaTxt = bt(34, COLOR.ORO).setOrigin(0, 0.5);
    // El nombre del jefe que viene, debajo de su retrato
    this.nombreJefe = bt(48, COLOR.ORO);
    this.telon.add([this.fondoCapa, this.fondoDeg, this.rayos, this.vinetaCapa, this.dientes,
      this.sombraPuntos, this.puntosTxt, this.puntajeTxt, this.sumaTxt, ...this.corazones, this.rachaFuego,
      this.rachaTxt, this.sombraCara, this.reaccion, this.nombreJefe, this.cinta, this.mensaje, this.velTxt]);
    this.detalles = [this.sombraPuntos, this.puntosTxt, this.puntajeTxt, this.sumaTxt, ...this.corazones,
      this.rachaFuego, this.rachaTxt, this.sombraCara, this.reaccion, this.nombreJefe, this.cinta, this.mensaje,
      this.velTxt];
    // Emoji que desfilan detrás del título y del final, por los costados (por
    // el medio pasaban detrás del logo y del puntaje y los ensuciaban)
    // (a la misma velocidad y repartidos parejo: así no se amontonan)
    this.desfile = DESFILE.map((n, i) => ({
      img: this.add.image(0, 0, 'emoji', n).setDisplaySize(80, 80).setAlpha(0.75).setDepth(11),
      x: i % 2 ? ANCHO - 46 - (i * 13) % 34 : 46 + (i * 13) % 34,
      lugar: Math.floor(i / 2) / Math.ceil(DESFILE.length / 2) + (i % 2) * 0.1, fase: 0, onda: i * 0.9,
    }));
  }

  // El desfile de emoji que suben por los costados: en el título y el final
  // bien a la vista; en el telón, tenue y más chico (que no tape el puntaje)
  mostrarDesfile(v, tenue = false) {
    for (const d of this.desfile) d.img.setVisible(v).setAlpha(tenue ? 0.3 : 0.75).setDisplaySize(tenue ? 60 : 80, tenue ? 60 : 80);
  }

  // Pone una cara de Zas en una imagen, de "ancho" de ancho (el marco trae
  // el borde blanco). Sin mascota, el emoji que más se le parece.
  ponerCara(img, cara, ancho) {
    if (this.hayMascota) return img.setTexture('mascota', cara).setDisplaySize(ancho, ancho * this.altoMascota);
    const emoji = { feliz: 'contento', euforico: 'lengua', guino: 'guinio', cool: 'facha', triste: 'enojado', mareado: 'mareado', asustado: 'asustado',
      enamorado: 'contento', sorprendido: 'boca', llorando: 'mareado' };
    return img.setTexture('emoji', emoji[cara] || 'contento').setDisplaySize(ancho * 0.82, ancho * 0.82);
  }
  mostrarDetalles(v) { for (const o of this.detalles) o.setVisible(v).setAlpha(1); }

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
    // Sello de "¡NUEVO!" (la primera vez que se ve ese microjuego en el aparato)
    this.sello = this.add.container(150, -150, [
      this.add.image(4, 6, 'atlas', 'estallido').setDisplaySize(190, 112).setTint(COLOR.OSCURO),
      this.add.image(0, 0, 'atlas', 'estallido').setDisplaySize(190, 112).setTint(0xff4d5a),
      this.add.bitmapText(0, -2, 'anton', '¡NUEVO!', 34).setOrigin(0.5).setTint(COLOR.TEXTO),
    ]).setAngle(12);
    this.consignaGrupo.add([this.estallidoSombra, this.estallido, this.consigna, this.sello]);
    this.ayuda = this.add.bitmapText(0, 0, 'anton', '', 38).setOrigin(0, 0.5).setTint(COLOR.ORO).setDepth(31);
    this.anilloMano = this.add.image(0, 0, 'atlas', 'anillo').setTint(0xffffff).setDepth(31);
    this.mano = this.add.image(0, 0, 'emoji', 'dedo').setDisplaySize(64, 64).setDepth(32);
    // La orden en chico, junto a la mecha, mientras se juega (de recordatorio)
    this.ordenChica = this.add.bitmapText(0, 0, 'anton', '', 34).setOrigin(0, 0.5).setTint(COLOR.TEXTO).setDepth(26);
    this.hudConsigna = [this.consignaGrupo, this.ayuda, this.anilloMano, this.mano, this.ordenChica];
    for (const o of this.hudConsigna) o.setVisible(false);
  }

  mostrarConsigna(texto, control, nuevo = false) {
    const cx = ANCHO / 2, cy = VISTA.alto / 2;
    this.tweens.killTweensOf([...this.hudConsigna, this.estallido, this.estallidoSombra, this.consigna, this.sello]);
    this.sello.setVisible(nuevo);
    if (nuevo) {
      this.sello.setScale(0).setAngle(30);
      this.tweens.add({ targets: this.sello, scale: 1, angle: 12, delay: 200, duration: 260, ease: 'Back.easeOut' });
    }
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
  }

  // Sube el telón: la consigna se achica hacia la mecha y queda en chico ahí
  // abajo (la franja que los microjuegos dejan libre) mientras se juega.
  consignaAlJuego() {
    this.tweens.killTweensOf([...this.hudConsigna, this.estallido, this.estallidoSombra, this.consigna]);
    this.tweens.add({
      targets: this.consignaGrupo, x: ANCHO / 2, y: this.mechaY - 30, scale: 0.12, alpha: 0,
      duration: 200, ease: 'Quad.easeIn',
    });
    this.tweens.add({ targets: [this.ayuda, this.mano, this.anilloMano], alpha: 0, duration: 120 });
    this.ordenChica.setText(this.orden).setScale(1).setVisible(true).setAlpha(0);
    const k = Math.min(1, (ANCHO - this.ordenChica.x - 24) / Math.max(1, this.ordenChica.width));
    this.ordenChica.setScale(k * 1.5);
    this.tweens.add({ targets: this.ordenChica, scale: k, alpha: 1, delay: 140, duration: 200, ease: 'Back.easeOut' });
  }

  // Al entrar en pantalla completa, el navegador muestra unos segundos un
  // aviso ("desliza para salir...") que la página no puede quitar: el primer
  // microjuego espera a que se vaya, con el telón abajo.
  esperarAviso(seg) { this.avisoHasta = performance.now() + seg * 1000; }

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
      case 'girar': x += Math.cos(t * 7) * 26 * g; y += Math.sin(t * 7) * 26 * g; break;
      case 'enlazar': x += Math.cos(t * 4.5) * 42 * g; y += Math.sin(t * 4.5) * 34 * g; break;
      case 'tirar': {                                   // la honda: estira hacia atrás y suelta
        const f = (t * 0.9) % 1, e = f < 0.7 ? f / 0.7 : 1 - (f - 0.7) / 0.3;
        x -= e * 70; y += e * 45; break;
      }
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
    this.bomba = this.add.image(0, 0, 'emoji', 'bomba');
    this.ponerCara(this.bomba, 'feliz', ANCHO_BOMBA);
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
    this.puntajeTxt.setPosition(cx, cy - 14);
    this.sumaTxt.setY(cy - 14);
    this.corazones.forEach((c, i) => c.setPosition(cx + (i - (PARTIDA.VIDAS - 1) / 2) * 98, cy + 50));
    this.rachaTxt.setY(cy + 116);
    this.rachaFuego.setY(cy + 112);
    this.reaccion.setPosition(cx, cy + 232);
    this.sombraCara.setPosition(cx, cy + 322);
    this.nombreJefe.setPosition(cx, cy + 114);          // en el lugar de la racha (se esconde)
    this.mechaY = h - 38;
    this.mechaX0 = 82;
    this.mechaLargo = ANCHO - 26 - this.mechaX0;
    this.ordenChica.setPosition(this.mechaX0 + 4, this.mechaY - 34);
    this.mechaFondo.setPosition(this.mechaX0 - 6, this.mechaY).setDisplaySize(this.mechaLargo + 12, 26);
    this.cuerda.setPosition(this.mechaX0, this.mechaY).setSize(this.mechaLargo, 14);
    this.quemado.setPosition(this.mechaX0 + this.mechaLargo, this.mechaY).setDisplaySize(1, 16);
    this.bomba.setPosition(46, this.mechaY - 12);
    if (this.telon.y !== 0) this.telon.y = -(h + 40);
  }

  modoTitulo() {
    this.estado = 'titulo';
    this.audio.empezarMenu();           // (si todavía no hay audio, suena con el primer toque)
    this.ui.mostrarEnJuego(false);
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
    if (this.galeria) { this.galeria = null; this.soloEste = this.soloEsteUrl; }
    this.audio.iniciarPartida();
    const hacer = practica === true || (practica === null && leer(CLAVE_PRACTICA, '') !== '1');
    this.practica = hacer && !this.soloEste ? { paso: 0, intentos: 0 } : null;
    this.ui.mostrarSaltar(!!this.practica);
    this.ui.mostrarEnJuego(true);
    this.reiniciarPartida();
    this.intermedio(null);
  }

  // Práctica libre de un microjuego (desde la galería): siempre el mismo, cada
  // vez más rápido (cada 2) y más difícil (cada 4), con las 4 vidas. No cuenta
  // para la tabla; se guarda la mejor marca de ese microjuego.
  empezarGaleria(Clase) {
    if (this.estado !== 'titulo' && this.estado !== 'fin') return;
    this.audio.iniciarPartida();
    this.practica = null;
    this.galeria = { Clase };
    this.soloEste = Clase;
    this.ui.mostrarSaltar(false);
    this.ui.mostrarEnJuego(true);
    this.reiniciarPartida();
    this.intermedio(null);
  }

  // --------------------------------------------------------------------------
  //  DUELO: dos jugadores se turnan el mismo teléfono. En cada ronda los dos
  //  juegan EL MISMO microjuego (con la misma variante) a la misma velocidad.
  //  Entre turno y turno, un cartel pide pasar el teléfono y espera el
  //  "¡Listo!". Cada uno tiene sus vidas; al terminar una ronda, si alguien se
  //  quedó sin vidas, se acaba. No hay puntaje ni tabla: gana el que aguanta.
  // --------------------------------------------------------------------------
  empezarDuelo() {
    if (this.estado !== 'titulo' && this.estado !== 'fin') return;
    this.audio.iniciarPartida();
    this.practica = null;
    if (this.galeria) { this.galeria = null; this.soloEste = this.soloEsteUrl; }
    this.ui.mostrarSaltar(false);
    this.ui.mostrarEnJuego(true);
    this.reiniciarPartida();
    this.duelo = { turno: 0, vidas: [PARTIDA.VIDAS, PARTIDA.VIDAS], puntos: [0, 0], clase: null, variante: null, inicio: true };
    this.intermedio(null);
  }

  // Después del turno de un jugador: se anota, y si la ronda terminó (jugaron
  // los dos), se ve si alguien se quedó sin vidas
  terminarTurno() {
    const du = this.duelo, j = du.turno;
    if (this.gano) {
      du.puntos[j]++;
      if (this.Clase.JEFE) du.vidas[j] = Math.min(PARTIDA.VIDAS, du.vidas[j] + 1);
    } else du.vidas[j]--;
    // El telón muestra cómo le fue al que acaba de jugar
    this.vidas = du.vidas[j];
    this.puntos = du.puntos[j];
    this.mostrarMecha(false);
    if (j === 1) {
      this.rondas++;
      if (du.vidas[0] <= 0 || du.vidas[1] <= 0) { this.finDuelo(); return; }
    }
    du.turno = 1 - j;
    this.intermedio(this.gano);
  }

  // "¡Listo!": el que sigue ya tiene el teléfono
  seguirDuelo() {
    if (!this.duelo || !this.esperandoTurno) return;
    this.esperandoTurno = false;
    this.duelo.inicio = false;
    this.tConsigna = this.audio.ahora();
  }

  finDuelo() {
    const du = this.duelo;
    this.estado = 'fin';
    this.ui.mostrarEnJuego(false);
    const vivos = du.vidas.map(v => v > 0);
    let ganador = vivos[0] && !vivos[1] ? 1 : vivos[1] && !vivos[0] ? 2 : 0;
    if (!ganador && du.puntos[0] !== du.puntos[1]) ganador = du.puntos[0] > du.puntos[1] ? 1 : 2;
    this.telonAbajo(false);
    this.pintarTelon(0x3a2a6b);
    this.mostrarDetalles(false);
    this.mostrarDesfile(true);
    this.audio.finPartida();
    if (ganador) this.time.delayedCall(900, () => this.audio.record());
    this.musicaDelFinal();
    this.ui.mostrarFin({ duelo: true, ganador, puntos: [...du.puntos], ultimo: this.orden || '' });
  }

  reiniciarPartida() {
    this.puntaje = 0;
    this.sumado = 0;
    this.vidas = PARTIDA.VIDAS;
    this.puntos = 0;
    this.rondas = 0;
    this.racha = 0;
    this.rachaPerdida = 0;
    this.vel = 1;
    this.nivel = 1;
    this.bolsa = [];
    this.bolsaJefes = [];
    this.jefePreparado = null;
    this.ultimo = null;
    this.Clase = null;
    this.duelo = null;
    this.esperandoTurno = false;
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

  // ¿Le toca un jefe a la próxima ronda? (el 8.º microjuego y después cada 12)
  tocaJefe() {
    if (!JEFES.length || this.soloEste || this.practica) return false;
    const n = this.rondas + 1, p = PARTIDA.PRIMER_JEFE;
    return n === p || (n > p && (n - p) % PARTIDA.CADA_JEFE === 0);
  }

  // El jefe que viene se elige antes, en el telón, para presentarlo
  elegirJefe() {
    if (!this.bolsaJefes.length) this.bolsaJefes = Phaser.Utils.Array.Shuffle([...JEFES]);
    return this.bolsaJefes.pop();
  }

  siguiente() {
    if (this.practica) return MICROS.find(M => M.name === LECCIONES[this.practica.paso].micro);
    if (this.soloEste) return this.soloEste;
    if (this.duelo && this.duelo.turno === 1 && this.duelo.clase) return this.duelo.clase;     // el mismo que jugó el 1
    if (this.jefePreparado) { const J = this.jefePreparado; this.jefePreparado = null; return J; }
    if (this.tocaJefe()) return this.elegirJefe();
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
    const p = this.practica, gal = this.galeria, du = this.duelo;
    this.turnoPendiente = !!du;               // en el duelo, antes de la orden se pasa el teléfono
    // (en la galería todo sube más seguido: es un solo microjuego)
    const velNueva = p ? VEL_PRACTICA
      : gal ? Math.min(PARTIDA.VEL_MAX, 1 + PARTIDA.ACELERA * Math.floor(this.rondas / 2))
      : this.velocidadPara(this.rondas);
    const nivelNuevo = p ? 1 : Math.min(3, 1 + Math.floor(this.rondas / (gal ? 4 : PARTIDA.CADA_NIVEL)));
    const acelera = !p && velNueva > this.vel;
    const sube = !p && nivelNuevo > this.nivel;
    const jefeGanado = gano === true && this.Clase && this.Clase.JEFE;
    this.vel = p ? velNueva : this.velForzada || velNueva;
    this.nivel = p ? nivelNuevo : this.nivelForzado || nivelNuevo;

    this.telonAbajo(false);
    this.tweens.killTweensOf(this.detalles);
    this.mostrarDetalles(true);
    this.mostrarDesfile(true, true);
    this.ocultarConsigna();
    this.mostrarMecha(false);
    this.proximo = null;
    const velocidad = this.vel > 1.001 ? `VELOCIDAD ×${this.vel.toFixed(2).replace('.', ',')}` : '';
    const jugo = du && gano !== null ? `JUGADOR ${2 - du.turno}` : 'DUELO';          // el que acaba de jugar
    this.velTxt.setText(p ? 'PRÁCTICA' : gal ? 'PRÁCTICA LIBRE' + (velocidad ? ` · ${velocidad}` : '')
      : du ? jugo + (velocidad ? ` · ${velocidad}` : '') : velocidad);

    // Puntos y vidas (en la práctica: qué lección va, y sin corazones; en la
    // galería, tu mejor marca en vez del puntaje)
    const arriba = p ? `${p.paso + 1}/${LECCIONES.length}` : String(this.puntos);
    this.puntosTxt.setText(arriba).setScale(1);
    this.sombraPuntos.setText(arriba);
    this.puntajeTxt.setText(p ? '' : gal ? `TU MEJOR: ${this.mejorGaleria(gal.Clase)}`
      : du ? `J1: ${du.puntos[0]}  ·  J2: ${du.puntos[1]}` : `${conPuntos(this.puntaje)} PUNTOS`).setScale(1);
    this.sumaTxt.setText('').setAlpha(0);
    this.corazones.forEach((c, i) => c.setFrame(i < this.vidas ? 'corazon' : 'corazon_negro').setDisplaySize(82, 82)
      .setAngle(0).setAlpha(1).setVisible(!p));
    if (gano === true) {
      this.puntosTxt.setScale(1.5);
      this.tweens.add({ targets: this.puntosTxt, scale: 1, duration: 280, ease: 'Back.easeOut' });
      if (!p && !gal && !du && this.sumado) {
        // "+160" al lado del puntaje, que salta y se va
        this.sumaTxt.setText(`+${conPuntos(this.sumado)}`).setX(ANCHO / 2 + this.puntajeTxt.width / 2 + 14)
          .setAlpha(1).setScale(0.4);
        this.tweens.add({ targets: this.sumaTxt, scale: 1, duration: 260, ease: 'Back.easeOut' });
        this.tweens.add({ targets: this.sumaTxt, alpha: 0, delay: 700, duration: 250 });
        this.puntajeTxt.setScale(1.25);
        this.tweens.add({ targets: this.puntajeTxt, scale: 1, duration: 300, ease: 'Back.easeOut' });
      }
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
    // Mientras está el telón, la música sigue: un ritmo al pulso que viene
    this.audio.empezarTelon(RITMO.BPM_BASE * this.vel, a + (gano === null ? 0.3 : 0.6));

    // La carita
    this.ponerCara(this.reaccion, gano === null ? 'cool' : Phaser.Utils.Array.GetRandom(gano ? CARAS_BIEN : CARAS_MAL), 210);
    this.reaccion.setAngle(0);
    const ancho = this.reaccion.displayWidth, alto = this.reaccion.displayHeight;
    this.tweens.add({ targets: this.reaccion, displayWidth: ancho * 1.2, displayHeight: alto * 1.2, duration: 150, yoyo: true, ease: 'Quad.easeOut' });
    this.nombreJefe.setText('');

    // La racha (no en las prácticas: no hay puntaje)
    this.mostrarRacha(!p && !gal && !du && gano === false);
    if (p || gal || du) { this.rachaTxt.setText(''); this.rachaFuego.setVisible(false); }
    const mult = multiplicador(this.racha);
    const subeRacha = !p && !gal && !du && gano === true && mult > multiplicador(this.racha - 1);

    // Los carteles: se muestran uno después del otro
    const carteles = [];
    if (gano === null && p) carteles.push(['¡A PRACTICAR!', null, 0x2f7dff]);
    else if (gano === null && gal) carteles.push(['¡PRÁCTICA LIBRE!', null, 0x2f7dff]);
    else if (gano === null && du) carteles.push(['¡DUELO!', () => this.audio.duelo(), 0xe0339b]);
    else if (gano === null && this.trasPractica) {
      carteles.push(['¡AHORA EN SERIO!', null, 0xe0339b], [`¡TIENES ${PARTIDA.VIDAS} VIDAS!`, () => this.audio.record(), 0x16a37a]);
    } else if (gano === null) carteles.push(['¡PREPÁRATE!', null, 0x2f7dff]);
    if (p && gano === false && p.intentos > 0) carteles.push(['¡OTRA VEZ!', null, 0xff7a1a]);
    this.trasPractica = false;
    if (jefeGanado) carteles.push(['¡VIDA EXTRA!', () => this.audio.vidaExtra(), 0x16a37a]);
    if (subeRacha) carteles.push([`¡RACHA ×${conComa(mult)}!`, () => this.audio.racha(mult), 0xff7a1a]);
    if (gano === false && this.vidas === 1) carteles.push(['¡ÚLTIMA VIDA!', () => this.audio.latido(), 0xff4d5a]);
    if (sube) carteles.push(['¡MÁS DIFÍCIL!', () => { this.audio.masDificil(); this.destelloTelon(0xe0339b); }, 0xe0339b]);
    if (acelera) carteles.push(['¡MÁS RÁPIDO!', () => { this.audio.acelera(); this.efectoVelocidad(); }, 0xff7a1a]);
    // El jefe se elige ya, para presentarlo: su cara en grande y su nombre
    // (en el duelo, el jugador 2 enfrenta al mismo jefe que el 1)
    const jefe = !this.tocaJefe() ? null : du && du.turno === 1 ? du.clase : (this.jefePreparado = this.elegirJefe());
    if (jefe) carteles.push(['¡JEFE!', () => { this.audio.jefe(); this.presentarJefe(jefe); }, 0x1b1030]);

    // Cuánto se ve el resultado; después viene la consigna (prepararMicro)
    let dur = Math.max(0.65, 0.9 / this.vel);
    this.fases = [];
    this.mensaje.setText('');
    this.cinta.setAlpha(0);
    carteles.forEach(([txt, sonido, color], i) => {
      const t = a + (i === 0 && gano === null ? 0 : dur * 0.55 + i * 0.95);
      this.fases.push({ t, fn: () => this.cartelTelon(txt, color, sonido) });
    });
    if (carteles.length) dur += 0.95 * carteles.length - (gano === null ? 0.3 : 0);
    if (jefe) dur += 0.7;                               // que se vea bien quién viene
    this.tConsigna = a + dur;
  }

  // "RACHA 6 · ×1,5" debajo de los corazones (o "¡SE CORTÓ LA RACHA!")
  mostrarRacha(seCorto) {
    const r = this.racha, m = multiplicador(r);
    let texto = '';
    if (seCorto && this.rachaPerdida >= 3) texto = '¡SE CORTÓ LA RACHA!';
    else if (r >= 2) {
      const prox = PARTIDA.RACHA.map(([desde]) => desde).filter(d => d > r).pop();
      texto = `RACHA ${r}` + (m > 1 ? ` · ×${conComa(m)}` : '') + (prox && prox - r <= 2 ? ` · ¡A ${prox - r} DEL ×${conComa(multiplicador(prox))}!` : '');
    }
    this.rachaTxt.setText(texto).setTint(seCorto ? COLOR.MAL : COLOR.ORO).setScale(1);
    const k = Math.min(1, 440 / Math.max(1, this.rachaTxt.width));
    this.rachaTxt.setScale(k);
    const fuego = !!texto && !seCorto;
    const ancho = this.rachaTxt.width + (fuego ? 50 : 0);
    this.rachaTxt.setX(ANCHO / 2 - ancho / 2 + (fuego ? 50 : 0));
    this.rachaFuego.setVisible(fuego).setX(ANCHO / 2 - ancho / 2 + 20);
  }

  // El jefe que viene: su cara en grande, con un sacudón, y su nombre
  presentarJefe(J) {
    this.tweens.killTweensOf(this.reaccion);
    this.rachaTxt.setVisible(false);
    this.rachaFuego.setVisible(false);
    this.reaccion.setTexture('emoji', J.RETRATO || 'calavera').setDisplaySize(60, 60).setAngle(-20);
    this.tweens.add({ targets: this.reaccion, displayWidth: 210, displayHeight: 210, angle: 0, duration: 380, ease: 'Back.easeOut' });
    this.nombreJefe.setText(J.NOMBRE_JEFE || '').setScale(0.3).setAlpha(1);
    this.tweens.add({ targets: this.nombreJefe, scale: 1, duration: 300, delay: 120, ease: 'Back.easeOut' });
    this.cameras.main.shake(260, 0.012);
    // El telón se pone rojo oscuro, con un relámpago
    this.pintarTelon(0x8a1c2c);
    this.destelloTelon(0xffffff);
  }

  // Un relámpago de color sobre el telón
  destelloTelon(color) {
    const f = this.add.image(0, 0, 'atlas', 'blanco').setOrigin(0).setDisplaySize(ANCHO, VISTA.alto)
      .setTint(color).setAlpha(0.7).setDepth(10.5);
    this.tweens.add({ targets: f, alpha: 0, duration: 260, ease: 'Quad.easeOut', onComplete: () => f.destroy() });
  }

  // ¡MÁS RÁPIDO!: los rayos giran a toda velocidad y cruzan líneas de viento
  efectoVelocidad() {
    this.rayosRapidosHasta = this.time.now + 1100;
    for (let i = 0; i < 14; i++) {
      const y = 40 + Math.random() * (VISTA.alto - 80), largo = 120 + Math.random() * 220;
      const l = this.add.image(-largo, y, 'atlas', 'blanco').setOrigin(0, 0.5).setDisplaySize(largo, 3 + Math.random() * 5)
        .setAlpha(0.55).setDepth(10.2);
      this.tweens.add({
        targets: l, x: ANCHO + 40, duration: 260 + Math.random() * 260, delay: i * 45, ease: 'Quad.easeIn',
        onComplete: () => l.destroy(),
      });
    }
  }

  // Con el telón todavía abajo: elige el próximo microjuego y muestra su orden
  // en grande (los puntos y las vidas se apagan para dejarle el lugar).
  prepararMicro() {
    const Clase = this.siguiente();
    // Algunos microjuegos traen variantes con su propia consigna ("¡CORTA EL ROJO!")
    let variante = Clase.VARIANTES ? Phaser.Utils.Array.GetRandom(Clase.VARIANTES) : null;
    // En el duelo, el jugador 2 juega lo mismo que el 1 (con la misma variante)
    if (this.duelo) {
      if (this.duelo.turno === 0) { this.duelo.clase = Clase; this.duelo.variante = variante; }
      else variante = this.duelo.variante;
    }
    // ¿Primera vez que se ve en este aparato? Sello de NUEVO y la orden dura más
    // (en el duelo, el jugador 2 recibe lo mismo que el 1, aunque ya "se vio")
    let nuevo = !this.practica && !this.soloEste && !this.demo && !this.vistos.has(Clase.name);
    if (this.duelo) {
      if (this.duelo.turno === 0) this.duelo.nuevo = nuevo;
      else nuevo = !!this.duelo.nuevo;
    }
    this.proximo = { Clase, variante, orden: variante ? variante.orden : Clase.ORDEN };
    this.tweens.killTweensOf(this.detalles);
    this.tweens.add({ targets: this.detalles, alpha: 0, duration: 120 });
    this.mostrarConsigna(this.proximo.orden, Clase.CONTROL, nuevo);
    this.audio.orden();
    this.finIntermedio = this.audio.ahora() + Math.max(0.55, 0.75 / this.vel) + (nuevo ? PARTIDA.EXTRA_NUEVO_S : 0);
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
    this.audio.corazon();
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
    if (!this.proximo) this.prepararMicro();
    const { Clase, variante, orden } = this.proximo;
    this.proximo = null;
    this.Clase = Clase;
    this.clave = Clase.name;
    const bpm = RITMO.BPM_BASE * this.vel;
    this.pulso = 60 / bpm;
    // Los jefes sienten la velocidad sólo a medias: si no, no alcanza el tiempo
    this.dur = Clase.PULSOS * this.pulso * (Clase.JEFE ? Math.sqrt(this.vel) : 1);
    this.t0 = this.audio.ahora();
    this.decididoEn = null;
    this.golpeHasta = 0;
    this.gano = null;
    this.tics = 0;
    // La lección de este microjuego: la de la práctica o, la primera vez que se
    // ve uno con mecánica menos obvia (static LECCION), la suya. Una vez por
    // aparato (por grupo: las de "toca rápido" se enseñan una sola vez).
    this.leccion = this.practica ? LECCIONES[this.practica.paso] : null;
    if (!this.practica && !this.soloEste && !this.demo && Clase.LECCION) {
      const id = Clase.LECCION.grupo || Clase.name;
      if (!this.lecciones.has(id)) this.leccion = { ...Clase.LECCION, id };
    }
    // En el duelo, si el jugador 1 tuvo lección, el 2 también
    if (this.duelo) {
      if (this.duelo.turno === 0) this.duelo.leccion = this.leccion;
      else if (this.duelo.leccion) this.leccion = this.duelo.leccion;
    }
    this.leccionMostrada = false;
    this.tFinConsigna = 0.3;          // la lección congela recién con el juego a la vista
    this.orden = orden;
    if (!this.soloEste && !this.demo && !this.vistos.has(Clase.name)) {
      this.vistos.add(Clase.name);
      guardar(CLAVE_VISTOS, JSON.stringify([...this.vistos]));
    }
    // (la música sabe cuándo se acaba la mecha: antes, un redoble; los jefes, en menor)
    this.audio.empezarPista(bpm, this.t0, (Math.random() * 1e9) | 0, { jefe: !!Clase.JEFE, fin: this.t0 + this.dur });
    this.scene.launch(this.clave, {
      director: this, audio: this.audio, nivel: this.nivel, vel: this.vel, dur: this.dur, t0: this.t0, variante,
    });
    this.estado = 'micro';
    this.mostrarDesfile(false);           // (va encima del telón: se va con él)
    this.telonArriba();
    this.consignaAlJuego();
    this.mostrarMecha(true);
    this.cuerda.setTint(COLOR_MECHA);
    this.ponerCara(this.bomba, 'feliz', ANCHO_BOMBA).setAngle(0);
    this.bombaAsustada = false;
  }

  // Lo llama el microjuego (con ganar() / perder()).
  decidir(gano) {
    if (this.estado !== 'micro' || this.decididoEn !== null) return;
    this.gano = gano;
    this.decididoEn = this.audio.ahora();
    this.restante = limitar(1 - (this.decididoEn - this.t0) / this.dur, 0, 1);
    this.audio.calmar();
    if (gano) {
      this.golpeHasta = this.decididoEn + 0.075;     // el microjuego se congela un instante: "¡pum!"
      this.audio.bien();
      this.cuerda.setTint(COLOR.BIEN);
      this.ponerCara(this.bomba, 'euforico', ANCHO_BOMBA);
      this.tweens.add({ targets: this.bomba, angle: 360, duration: 400 });
      this.chispaMecha.setVisible(false);
      this.brillo.setVisible(false);
    } else {
      this.audio.error();
      this.cuerda.setTint(COLOR.MAL);
      this.ponerCara(this.bomba, 'mareado', ANCHO_BOMBA);
    }
    this.ocultarConsigna();
  }

  cerrar() {
    this.estado = 'cerrando';
    // En la demo, el bot levanta el dedo (si quedara apretado, el primer toque
    // del microjuego siguiente se perdería)
    if (this.demo && window.__ev) window.__ev('pointerup', ANCHO / 2, VISTA.alto / 2);
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
    if (this.duelo) { this.terminarTurno(); return; }
    this.rondas++;
    // La demo del stand: juega un rato y vuelve al título (sin récords)
    if (this.demo && ((!this.gano && this.vidas <= 1) || this.rondas >= STAND.DEMO_RONDAS)) { this.terminarDemo(); return; }
    if (this.gano) this.racha++;
    else { this.rachaPerdida = this.racha; this.racha = 0; }
    if (this.gano) {
      this.puntos++;
      this.sumado = this.puntosPorMicro();
      this.puntaje += this.sumado;
      if (this.Clase.JEFE) this.vidas = Math.min(PARTIDA.VIDAS, this.vidas + 1);
    } else this.vidas--;
    this.mostrarMecha(false);
    if (this.vidas <= 0) this.fin();
    else this.intermedio(this.gano);
  }

  // Puntaje de un microjuego superado: 100, más hasta 100 por terminarlo rápido,
  // todo por la velocidad y por la racha (×1,5 con 5 seguidos, ×2 con 10). Los
  // jefes valen el triple. (Los que se ganan aguantando hasta el final cuentan
  // como "a medias" de rápido.) OJO: el tope de la base de datos sale de acá.
  puntosPorMicro() {
    const rapidez = this.Clase.GANA_AL_FINAL ? 0.5 : this.restante;
    const base = (100 + 100 * rapidez) * this.vel * (this.Clase.JEFE ? 3 : 1) * multiplicador(this.racha);
    return Math.round(base / 10) * 10;
  }

  // La mejor marca de un microjuego en la galería
  mejorGaleria(Clase) {
    try { return (JSON.parse(leer(CLAVE_GALERIA, '{}')) || {})[Clase.name] || 0; } catch (e) { return 0; }
  }

  fin() {
    if (this.galeria) { this.finGaleria(); return; }
    this.estado = 'fin';
    this.ui.mostrarEnJuego(false);
    if (this.puntos > this.record) {
      this.record = this.puntos;
      guardar(CLAVE_RECORD, String(this.record));
    }
    const nuevo = this.puntaje > this.recordPuntaje;
    if (nuevo) {
      this.recordPuntaje = this.puntaje;
      guardar(CLAVE_PUNTAJE, String(this.recordPuntaje));
    }
    this.telonAbajo(false);
    this.pintarTelon(0x3a2a6b);
    this.mostrarDetalles(false);
    this.mostrarDesfile(true);
    this.audio.finPartida();
    if (nuevo) this.time.delayedCall(1300, () => this.audio.record());
    this.musicaDelFinal();
    const medalla = (MEDALLAS.find(([min]) => this.puntos >= min) || [0, null])[1];
    this.ui.mostrarFin({
      puntos: this.puntos, puntaje: this.puntaje, record: this.record, recordPuntaje: this.recordPuntaje,
      nuevo, ultimo: this.orden || '', medalla,
    });
  }

  // El final de una práctica de la galería: sin récords ni tabla, sólo la
  // mejor marca de ese microjuego
  finGaleria() {
    const C = this.galeria.Clase;
    this.estado = 'fin';
    this.ui.mostrarEnJuego(false);
    let mejores = {};
    try { mejores = JSON.parse(leer(CLAVE_GALERIA, '{}')) || {}; } catch (e) { /* nada */ }
    const antes = mejores[C.name] || 0;
    if (this.puntos > antes) { mejores[C.name] = this.puntos; guardar(CLAVE_GALERIA, JSON.stringify(mejores)); }
    this.telonAbajo(false);
    this.pintarTelon(0x3a2a6b);
    this.mostrarDetalles(false);
    this.mostrarDesfile(true);
    this.audio.finPartida();
    this.musicaDelFinal();
    this.ui.mostrarFin({ galeria: true, ultimo: C.ORDEN, puntos: this.puntos, mejor: Math.max(antes, this.puntos),
      nuevoMejor: this.puntos > antes });
  }

  // Pasados los jingles del final, la música tranquila del menú
  musicaDelFinal() {
    this.time.delayedCall(2600, () => { if (this.estado === 'fin') this.audio.empezarMenu(); });
  }

  // Vuelve al menú principal (desde la pausa o desde el final). Si había una
  // partida en curso, se abandona.
  irAlMenu() {
    if (this.estado !== 'pausa' && this.estado !== 'fin') return;
    this.volverAlTitulo();
  }

  // MODO STAND: si nadie toca el título, el juego se juega solo con los bots
  // de las pruebas (herramientas/pruebas/bots.js, los carga la interfaz). Sin
  // lecciones, sin récords y sin marcar microjuegos como vistos. El primer
  // toque de verdad la corta y vuelve al título.
  empezarDemo() {
    if (this.estado !== 'titulo' || !window.__B) return;
    this.demo = true;
    this.audio.enDemo = true;            // la demo no hace vibrar el aparato
    this.audio.iniciarPartida();
    this.practica = null;
    if (this.galeria) { this.galeria = null; this.soloEste = this.soloEsteUrl; }
    this.ui.mostrarDemo(true);
    this.reiniciarPartida();
    this.intermedio(null);
  }

  terminarDemo() {
    if (this.demo) this.volverAlTitulo();
  }

  // Cada cuadro de la demo: el bot de ese microjuego juega
  jugarDemo() {
    const m = this.clave && this.scene.get(this.clave), bot = window.__B && window.__B[this.clave];
    if (!m || !bot || m.decidido || !m.sys.isActive()) return;
    try { bot(m); } catch (e) { /* si el bot falla, el microjuego se pierde solo */ }
  }

  // Al título, abandonando lo que hubiera (pausa, final o demo)
  volverAlTitulo() {
    if (this.demo) { this.demo = false; this.audio.enDemo = false; this.ui.mostrarDemo(false); }
    this.galeria = null;
    this.duelo = null;
    this.esperandoTurno = false;
    this.soloEste = this.soloEsteUrl;
    if (this.clave) { this.scene.stop(this.clave); this.clave = null; }
    this.tweens.resumeAll();
    this.congelado = false;
    this.cartelLeccion.ocultar();
    this.audio.detenerPista();
    this.audio.chorro(false);
    this.mostrarMecha(false);
    this.ocultarConsigna();
    this.proximo = null;
    this.practica = null;
    this.ui.mostrarSaltar(false);
    if (MODO_STAND) this.lecciones = new Set();        // el que sigue, las recibe de nuevo
    this.modoTitulo();
    // (si venía de la pausa, el audio estaba suspendido: suena cuando vuelva)
    this.audio.reanudar();
    this.audio.empezarMenu();
    this.ui.mostrarMenu();
  }

  // --------------------------------------------------------------------------
  //  Pausa (al salir de la pestaña o apagar la pantalla)
  // --------------------------------------------------------------------------
  pausar() {
    if (this.demo) { this.terminarDemo(); return; }          // la demo no se pausa: se corta
    if (!['micro', 'intermedio', 'cerrando', 'leccion'].includes(this.estado)) return;
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
    this.rayos.angle += dt * (time < (this.rayosRapidosHasta || 0) ? 160 : 14);
    this.dientes.tilePositionX += dt * 40;
    if (this.fps) this.fps.setText(`${Math.round(this.game.loop.actualFps)} FPS  x${ESCALA.k}`);
    this.medirRendimiento(deltaMs);
    if (this.desfile[0].img.visible) this.animarDesfile(dt);
    this.animarMano(time);
    this.animarBrasas(dt);
    const a = this.audio.ahora();
    // La música (en la lección no: la pista espera congelada, como el juego)
    if (this.estado !== 'leccion' && this.estado !== 'pausa') this.audio.programar();
    switch (this.estado) {
      case 'intermedio':
        while (this.fases.length && this.fases[0].t <= a) this.fases.shift().fn();
        this.reaccion.y = VISTA.alto / 2 + 232 + Math.sin(time / 120) * 7;
        this.reaccion.angle = Math.sin(time / 200) * 6;
        if (!this.proximo && a >= this.tConsigna && performance.now() >= this.avisoHasta) {
          // En el duelo, antes de la orden: "pásale el teléfono" (espera el "¡Listo!")
          if (this.turnoPendiente) { this.turnoPendiente = false; this.esperandoTurno = true; this.ui.mostrarTurno(this.duelo); }
          else if (!this.esperandoTurno) this.prepararMicro();
        }
        break;
      case 'micro': if (this.demo) this.jugarDemo(); this.cuadroMicro(a); break;
      case 'leccion': this.cartelLeccion.animar(time); break;
    }
    if (this.estado === 'intermedio' && this.proximo && a >= this.finIntermedio) this.empezarMicro();
  }

  cuadroMicro(a) {
    const t = a - this.t0;
    if (this.decididoEn !== null) {
      if (a - this.decididoEn >= PARTIDA.DESPUES_DE_DECIDIR_S) this.cerrar();
      return;
    }
    if (this.leccion && !this.leccionMostrada && t >= this.tFinConsigna && this.revisarLeccion()) return;
    // La mecha se quema: la parte quemada tapa la cuerda desde la derecha
    const frac = limitar(1 - t / this.dur, 0, 1);
    const punta = this.mechaX0 + this.mechaLargo * frac;
    this.quemado.setPosition(punta, this.mechaY).setDisplaySize(this.mechaLargo * (1 - frac) + 1, 16);
    this.cuerda.tilePositionX -= 0.6;
    this.chispaMecha.setVisible(true).setPosition(punta, this.mechaY).setAngle(t * 900).setScale(1.1 + Math.random() * 0.6);
    this.brillo.setVisible(true).setPosition(punta, this.mechaY).setAlpha(0.5 + Math.random() * 0.4);
    if (Math.random() < 0.5) this.soltarBrasa(punta, this.mechaY);
    // Zas tiembla cada vez más, y en los últimos pulsos se asusta
    const apurado = t > this.dur - 3 * this.pulso;
    this.bomba.setAngle(Math.sin(t * 40) * (apurado ? 7 : 2));
    if (apurado && !this.bombaAsustada && !this.Clase.GANA_AL_FINAL) {
      this.bombaAsustada = true;
      this.ponerCara(this.bomba, 'asustado', ANCHO_BOMBA);
    }
    // Tic en cada uno de los últimos tres pulsos
    if (this.tics < 3 && this.dur - t <= (3 - this.tics) * this.pulso) {
      this.audio.tic(this.tics === 2);
      this.tics++;
      const w = this.bomba.displayWidth, h = this.bomba.displayHeight;
      this.bomba.setDisplaySize(w * 1.3, h * 1.3);
      this.tweens.add({ targets: this.bomba, displayWidth: w, displayHeight: h, duration: 160 });
    }
    if (t >= this.dur) {
      const micro = this.scene.get(this.clave);
      if (this.Clase.GANA_AL_FINAL) micro.ganar();
      else {
        micro.perder();
        this.audio.explosion();
        this.tweens.killTweensOf(this.bomba);
        this.bomba.setTexture('emoji', 'explosion').setDisplaySize(150, 150);
        this.cameras.main.shake(220, 0.015);
      }
    }
  }

  // --------------------------------------------------------------------------
  //  Lecciones de la práctica: congelar y descongelar
  // --------------------------------------------------------------------------
  // ¿Llegó el momento de la lección? Si llegó, congela todo y devuelve true.
  revisarLeccion() {
    const m = this.scene.get(this.clave), lec = this.leccion;
    if (!m || !m.sys.isActive() || m.decidido || !lec.listo(m)) return false;
    this.leccionMostrada = true;
    if (lec.id) {                             // las de "primera vez", una sola vez por aparato
      this.lecciones.add(lec.id);
      if (!MODO_STAND) guardar(CLAVE_LECCIONES, JSON.stringify([...this.lecciones]));
    }
    this.estado = 'leccion';
    this.audio.congelar();
    this.congelado = true;                    // Micro.update no avanza
    this.congeladoEn = this.audio.ahora();
    this.leccionDesde = this.time.now + 250;  // un dedo que ya estaba apoyado no cuenta
    // Si el aparato se trabó, las animaciones pueden ir atrasadas respecto
    // del reloj: el telón y la consigna se sacan igual, que no tapen nada.
    this.tweens.killTweensOf([this.telon, this.rayos, this.consignaGrupo, this.ayuda, this.anilloMano, this.mano]);
    this.telon.setVisible(false).setY(-(VISTA.alto + 40));
    this.tweens.add({ targets: this.consignaGrupo, alpha: 0, duration: 120 });
    // La mano hace el gesto sobre el objeto (la punta del dedo, en el objeto)
    const o = lec.objetivo(m) || { x: ANCHO / 2, y: VISTA.alto / 2 };
    this.ayuda.setVisible(false);
    this.control = lec.gesto;
    this.manoBase = { x: o.x + 4, y: o.y + 30 };
    this.mano.setVisible(true).setAlpha(1).setFrame('dedo').setDisplaySize(76, 76);
    this.anilloMano.setVisible(['tocar', 'machacar', 'mantener'].includes(lec.gesto)).setAlpha(0);
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
    this.audio.descongelar();
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
      const y = h - ((d.lugar * h + d.fase * 120) % h) - 60;
      d.img.setPosition(d.x + Math.sin(d.fase * 1.3 + d.onda) * 10, y).setAngle(Math.sin(d.fase * 2 + d.onda) * 12);
    }
  }
}
