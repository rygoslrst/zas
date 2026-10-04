// ============================================================================
//  ui.js — menú principal, fin de partida, pausa, récords y créditos
// ----------------------------------------------------------------------------
//  Son HTML encima del canvas: texto nítido en cualquier pantalla y cero costo
//  para el motor. Se juega sólo con el botón "Jugar" (tocar el fondo no hace
//  nada: así nadie empieza una partida sin querer).
// ============================================================================

import { EMOJI, CELDA_EMOJI } from './datos/emoji.js';
import { svgMascota } from './datos/mascota.js';
import { MICROS, JEFES } from './micro/indice.js';
import { CLAVE_GALERIA, MODO_STAND, STAND, URL_JUEGO, ANCHO } from './config.js';
import { dibujarTarjeta } from './tarjeta.js';
import { leerTabla, entraEnTabla, anotar, revisarNombre, ultimoNombre, recordarNombre, precargar, enLinea,
  hayPendientes, subirPendientes, terminarPartida, contarPartidas } from './tabla.js';

const $ = id => document.getElementById(id);
const AVISO_PANTALLA_S = 3.8;      // lo que tarda en irse el aviso de pantalla completa (Chrome en Android)
const conPuntos = n => n.toLocaleString('es-CL');
const EN_JUEGO = ['micro', 'intermedio', 'cerrando', 'leccion'];

const ICONO_SONIDO = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
const ICONO_MUDO = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16.5 9.5l5 5M21.5 9.5l-5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
const NOTA = '<path d="M9 18V6.5l10-2.5v11.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><circle cx="6.5" cy="18" r="2.8" fill="currentColor"/><circle cx="16.5" cy="15.5" r="2.8" fill="currentColor"/>';
const ICONO_MUSICA = `<svg viewBox="0 0 24 24" aria-hidden="true">${NOTA}</svg>`;
const ICONO_SIN_MUSICA = `<svg viewBox="0 0 24 24" aria-hidden="true">${NOTA}<path d="M3.5 3.5l17 17" stroke="#1b1030" stroke-width="5" stroke-linecap="round"/><path d="M3.5 3.5l17 17" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;

// "Quedaste #57 de 230 partidas · hoy, #5 de 40"
function textoPuesto(r) {
  const n = conPuntos;
  if (r.total > 1 && r.puesto === 1) return `¡La mejor de las ${n(r.total)} partidas!`;
  if (r.total_hoy > 1 && r.puesto_hoy === 1) return `¡La mejor de hoy! · #${n(r.puesto)} de ${n(r.total)} en total`;
  let t = `Quedaste #${n(r.puesto)} de ${n(r.total)} ${r.total === 1 ? 'partida' : 'partidas'}`;
  if (r.total_hoy > 1 && r.total_hoy < r.total) t += ` · hoy, #${n(r.puesto_hoy)} de ${n(r.total_hoy)}`;
  return t;
}

// Qué decir según cuántos aguantaste
function veredicto(p) {
  if (p === 0) return '¡Uy! Otra vez: ya le vas a tomar el ritmo.';
  if (p < 5) return 'Buen comienzo. ¿Llegas a 5?';
  if (p < 10) return '¡Bien! Ya vas rápido.';
  if (p < 20) return '¡Muy bien! Pocos llegan hasta aquí.';
  if (p < 30) return '¡Tremendo! Reflejos de acero.';
  return '¡Leyenda! ¿Eres humano?';
}

// El ancho mínimo a cada costado del juego para mostrar el QR y los récords
// (210: entra también en una tablet acostada, 1024 x 768)
const LADO_MIN = 210;

export class UI {
  constructor(audio, imagenEmoji, instalar) {
    this.audio = audio;
    this.imagenEmoji = imagenEmoji;
    this.director = null;
    this.titulo = $('titulo');
    this.fin = $('fin');
    this.pausa = $('pausa');
    this.creditos = $('creditos');
    this.records = $('records');
    this.btnPausa = $('btn-pausa');
    this.cajaNombre = $('fin-nombre');
    this.inputNombre = $('nombre');
    this.pidiendoNombre = false;
    this.ultimaPartida = null;
    this.finDesde = 0;
    this.arrancando = false;
    this.tactil = window.matchMedia('(pointer: coarse)').matches;
    document.body.classList.toggle('tactil', this.tactil);

    // Los botones no tienen que disparar "empezar" ni "reintentar".
    for (const b of document.querySelectorAll('.boton')) {
      b.addEventListener('pointerdown', e => e.stopPropagation());
      b.addEventListener('pointerup', e => e.stopPropagation());
    }
    for (const b of document.querySelectorAll('[data-accion="sonido"]')) {
      b.addEventListener('click', () => this.alternarEfectos());
    }
    for (const b of document.querySelectorAll('[data-accion="musica"]')) {
      b.addEventListener('click', () => this.alternarMusica());
    }
    // El navegador no deja sonar nada hasta que la persona toca la página: el
    // primer toque EN CUALQUIER PARTE (o una tecla) destraba el audio, y la
    // música del menú arranca sola (Audio._alArrancar). iOS sólo acepta
    // algunos tipos de toque: se intenta con todos hasta que anda.
    const destrabar = e => { if (e.isTrusted && !this.audio.audioVivo) this.audio.desbloquear(); };
    for (const tipo of ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown']) window.addEventListener(tipo, destrabar, true);
    // Cada botón suena
    document.addEventListener('click', e => {
      if (e.target.closest && e.target.closest('.boton, .cta') && this.audio.audioVivo) this.audio.clic();
    }, true);
    for (const b of document.querySelectorAll('[data-accion="practica"]')) {
      b.addEventListener('click', () => this.empezar(true));
    }
    this.saltar = $('saltar');
    this.saltar.addEventListener('click', () => this.director && this.director.saltarPractica());
    for (const b of document.querySelectorAll('[data-accion="creditos"]')) {
      b.addEventListener('click', () => this.abrirCreditos(true));
    }
    $('cerrar-creditos').addEventListener('click', () => this.abrirCreditos(false));
    for (const b of document.querySelectorAll('[data-accion="records"]')) {
      b.addEventListener('click', () => this.abrirRecords(true));
    }
    $('cerrar-records').addEventListener('click', () => this.abrirRecords(false));
    // Dos tablas: la de HOY (el día del torneo es la que importa) y la de siempre
    for (const b of document.querySelectorAll('[data-tabla]')) {
      b.addEventListener('click', () => this.abrirRecords(true, this.resaltar, false, b.dataset.tabla));
    }
    this.galeria = $('galeria');
    for (const b of document.querySelectorAll('[data-accion="galeria"]')) {
      b.addEventListener('click', () => this.abrirGaleria(true));
    }
    $('cerrar-galeria').addEventListener('click', () => this.abrirGaleria(false));
    // Duelo: empezar, y el "¡Listo!" de cada turno
    this.turno = $('turno');
    for (const b of document.querySelectorAll('[data-accion="duelo"]')) b.addEventListener('click', () => this.empezarDuelo());
    $('turno-listo').addEventListener('click', () => this.listoTurno());
    for (const b of document.querySelectorAll('[data-accion="menu"]')) {
      b.addEventListener('click', () => this.director && this.director.irAlMenu());
    }
    this.btnPausa.addEventListener('click', () => this.director && this.director.pausar());
    // El nombre para la tabla: ni los toques ni las teclas llegan al juego
    $('form-nombre').addEventListener('submit', e => { e.preventDefault(); this.guardarNombre(); });
    // "No, gracias" no es para siempre: queda un botón para anotarse igual
    $('no-guardar').addEventListener('click', () => { this.cerrarNombre(); $('anotar-luego').hidden = !this.ultimaPartida; });
    $('anotar-luego').addEventListener('click', () => this.pedirNombre());
    for (const el of [this.creditos, this.records, this.galeria, this.cajaNombre]) {
      el.addEventListener('pointerdown', e => e.stopPropagation());
      el.addEventListener('pointerup', e => e.stopPropagation());
    }
    window.addEventListener('resize', () => requestAnimationFrame(() => this.ajustarColumna()));
    this.pintarSonido();

    // Compartir el resultado (con una imagen, si el teléfono deja)
    for (const b of document.querySelectorAll('[data-accion="compartir"]')) b.addEventListener('click', () => this.compartir());
    // Instalar en la pantalla de inicio (Chrome en Android lo ofrece; el
    // aviso llega antes de que exista la interfaz: lo guarda main.js)
    this.instalar = instalar;
    instalar.alCambiar = () => { $('btn-instalar').hidden = !instalar.pedido || MODO_STAND; };
    instalar.alCambiar();
    $('btn-instalar').addEventListener('click', () => this.pedirInstalar());
    this.iniciarEspera();

    // "click" llega al levantar el dedo: en iOS el audio sólo se destraba ahí.
    $('btn-jugar').addEventListener('click', () => this.empezar());
    $('fin-cta').addEventListener('click', () => this.otraVez());
    this.pausa.addEventListener('pointerup', () => this.seguirConCuenta());
    // Lo que no se pudo subir a la tabla la vez pasada, se intenta al abrir
    setTimeout(() => subirPendientes().catch(() => {}), 1500);

    window.addEventListener('keydown', e => {
      if (e.repeat || (e.target && e.target.tagName === 'INPUT')) return;     // escribiendo el nombre
      const est = this.director && this.director.estado;
      if (e.code === 'Escape') {
        if (!this.creditos.hidden) this.abrirCreditos(false);
        else if (!this.records.hidden) this.abrirRecords(false);
        else if (!this.galeria.hidden) this.abrirGaleria(false);
        else if (EN_JUEGO.includes(est)) this.director.pausar();
        else if (est === 'pausa') this.seguirConCuenta();
        return;
      }
      if (e.code === 'KeyM') { this.alternarTodo(); return; }
      if (e.code !== 'Space' && e.code !== 'Enter') return;
      if (!this.creditos.hidden || !this.records.hidden || !this.galeria.hidden || !this.director) return;
      if (!this.turno.hidden && est === 'intermedio') { e.preventDefault(); this.listoTurno(); return; }
      if (est === 'titulo') { e.preventDefault(); this.empezar(); }
      else if (est === 'fin') { e.preventDefault(); this.otraVez(); }
      else if (est === 'pausa') { e.preventDefault(); this.seguirConCuenta(); }
    });
  }

  conectar(director) {
    this.director = director;
    this.mostrarRecord();
    this.mostrarContador();
    this.titulo.hidden = false;
    document.body.classList.add('listo');
    this.ajustarColumna();
  }

  // Cuántas partidas se jugaron (de todos, en todos los aparatos)
  async mostrarContador() {
    const c = await contarPartidas();
    this.partidasHoy = c ? c.hoy : null;
    const p = $('titulo-contador');
    p.hidden = !c || c.total < 1;
    if (!c) return;
    p.textContent = `${conPuntos(c.total)} ${c.total === 1 ? 'partida jugada' : 'partidas jugadas'}`
      + (c.hoy && c.hoy < c.total ? ` · ${conPuntos(c.hoy)} hoy` : '');
  }

  // El mejor puntaje de este aparato (la tabla de récords es otra cosa: la de todos)
  mostrarRecord() {
    const d = this.director;
    $('titulo-record').textContent = d && d.recordPuntaje > 0
      ? `Tu mejor partida: ${conPuntos(d.recordPuntaje)} puntos · ${d.record} microjuegos` : '';
  }

  // En la computadora el juego es una franja vertical: los botones que van
  // sobre el juego se acomodan a sus bordes y no a los de la ventana.
  ajustarColumna() {
    const c = document.querySelector('#juego canvas');
    if (!c) return;
    const r = c.getBoundingClientRect(), raiz = document.documentElement.style;
    const izq = Math.max(0, Math.round(r.left)), der = Math.max(0, Math.round(window.innerWidth - r.right));
    raiz.setProperty('--col-izq', `${izq}px`);
    raiz.setProperty('--col-der', `${der}px`);
    // Si a los costados sobra lugar (la computadora del stand), el QR para
    // jugar en el celular y la tabla de récords en vivo
    const lado = Math.min(izq, der);
    raiz.setProperty('--ancho-lado', `${Math.min(340, lado - 36)}px`);
    for (const id of ['lado-qr', 'lado-tabla']) $(id).classList.toggle('estrecho', lado < 280);
    this.mostrarLados(lado >= LADO_MIN && window.innerHeight >= 560);
  }

  mostrarLados(v) {
    if (v === this.ladosVisibles) return;
    this.ladosVisibles = v;
    $('lado-qr').hidden = $('lado-tabla').hidden = !v;
    clearInterval(this.relojLados);
    if (!v) return;
    this.actualizarLado();
    // Cada 45 s se vuelve a leer (no a mitad de un microjuego: espera al telón)
    this.relojLados = setInterval(() => {
      const est = this.director && this.director.estado;
      if (!document.hidden && est !== 'micro' && est !== 'leccion') this.actualizarLado();
    }, 45000);
  }

  // La tabla del costado. nuevo: { nombre, puntaje } recién anotado (se resalta)
  async actualizarLado(nuevo = null) {
    if (!this.ladosVisibles) return;
    // La de hoy (el día del torneo, la que importa); si hoy no hay, la de siempre
    let cual = 'hoy', tabla = await leerTabla(false, 'hoy');
    if (!tabla.length) { cual = 'siempre'; tabla = await leerTabla(); }
    const ol = $('lado-lista');
    ol.textContent = '';
    $('lado-tabla').querySelector('.lado-titulo').textContent = cual === 'hoy' ? 'Récords de hoy' : 'Récords';
    // Lo que entró desde la última lectura (alguien jugando en su celular, o
    // el que acaba de anotarse acá) se ilumina un momento
    const antes = this.ladoCual === cual ? this.ladoAntes : null;
    const ahora = new Set(tabla.map(e => `${e.nombre}|${e.puntaje}`));
    this.ladoAntes = ahora;
    this.ladoCual = cual;
    tabla.forEach((e, i) => {
      const li = document.createElement('li');
      const recien = nuevo ? e.nombre === nuevo.nombre && e.puntaje === nuevo.puntaje
        : antes && !antes.has(`${e.nombre}|${e.puntaje}`);
      if (recien) li.className = 'nuevo';
      for (const [clase, texto] of [['pos', i + 1], ['nom', e.nombre], ['pts', conPuntos(e.puntaje)]]) {
        const span = document.createElement('span');
        span.className = clase;
        span.textContent = String(texto);
        li.appendChild(span);
      }
      ol.appendChild(li);
    });
    ol.hidden = tabla.length === 0;
    const c = enLinea ? await contarPartidas() : null;
    $('lado-nota').textContent = !tabla.length ? '¡Todavía no hay récords! ¿Serás el primero?'
      : !enLinea ? 'Los mejores de este aparato (sin conexión)'
        : 'En vivo' + (c && c.hoy ? ` · ${conPuntos(c.hoy)} ${c.hoy === 1 ? 'partida' : 'partidas'} hoy` : '');
  }

  // El botón de pausa se ve sólo durante la partida
  mostrarEnJuego(v) { this.btnPausa.hidden = !v; }

  // --------------------------------------------------------------------------
  //  SIN TOCAR NADA: la demo, y volver solo al título (en cualquier aparato;
  //  con ?stand, además, la pausa abandonada)
  // --------------------------------------------------------------------------
  iniciarEspera() {
    if (MODO_STAND) this.iniciarStand();
    this.ultimoToque = performance.now();
    // Al volver a la pestaña o prender la pantalla, el reloj de espera empieza
    // de nuevo (si no, al volver saltaría la demo o se iría del final)
    document.addEventListener('visibilitychange', () => { if (!document.hidden) this.ultimoToque = performance.now(); });
    // Los bots de las pruebas juegan la demo; tocan la pantalla con eventos
    // de mouse sobre el canvas (como el arnés de pruebas)
    window.__paso = window.__paso || (() => {});
    window.__ev = window.__ev || ((tipo, x, y) => {
      const c = document.querySelector('#juego canvas');
      if (!c) return;
      const r = c.getBoundingClientRect(), k = r.width / ANCHO;
      const t = { pointerdown: 'mousedown', pointermove: 'mousemove', pointerup: 'mouseup' }[tipo];
      c.dispatchEvent(new MouseEvent(t, { clientX: r.left + x * k, clientY: r.top + y * k, bubbles: true, button: 0,
        buttons: t === 'mouseup' ? 0 : 1 }));
    });
    import('../herramientas/pruebas/bots.js').catch(() => { /* sin bots, sin demo */ });
    // Un toque de verdad (no los de los bots) corta la demo y nada más
    const tocado = e => {
      if (!e.isTrusted) return;
      this.ultimoToque = performance.now();
      if (this.director && this.director.demo) {
        e.preventDefault();
        e.stopImmediatePropagation();
        this.director.terminarDemo();
      }
    };
    window.addEventListener('pointerdown', tocado, true);
    window.addEventListener('keydown', tocado, true);
    setInterval(() => this.revisarEspera(), 1000);
  }

  // MODO STAND: el aparato queda todo el día a la vista de la gente
  iniciarStand() {
    document.body.classList.add('stand');
    // Que la pantalla no se apague ni se oscurezca (si el navegador deja; se
    // vuelve a pedir al volver a la pestaña, porque el permiso se pierde)
    const pedirLuz = async () => {
      if (!navigator.wakeLock || document.hidden || this.luz) return;
      try {
        this.luz = await navigator.wakeLock.request('screen');
        this.luz.addEventListener('release', () => { this.luz = null; });
      } catch (e) { /* sin permiso: se intenta con el próximo toque */ }
    };
    pedirLuz();
    document.addEventListener('visibilitychange', pedirLuz);
    // El primer toque (o clic) pone pantalla completa. Una sola vez: si el que
    // atiende el stand la saca con Esc, no se insiste.
    let pedida = false;
    window.addEventListener('pointerup', e => {
      if (!e.isTrusted) return;
      pedirLuz();
      if (pedida || document.fullscreenElement || document.webkitFullscreenElement) return;
      pedida = true;
      const el = document.documentElement, pedir = el.requestFullscreen || el.webkitRequestFullscreen;
      try {
        const p = pedir && pedir.call(el, { navigationUI: 'hide' });
        if (p && p.catch) p.catch(() => {});
      } catch (err) { /* nada */ }
    }, true);
  }

  revisarEspera() {
    const d = this.director;
    if (!d || document.hidden) return;
    const quieto = (performance.now() - this.ultimoToque) / 1000;
    if (!this.records.hidden || !this.galeria.hidden || !this.creditos.hidden) {
      if (quieto > STAND.CERRAR_PANEL_S) {
        this.abrirRecords(false); this.abrirGaleria(false); this.abrirCreditos(false);
        this.ultimoToque = performance.now();
      }
      return;
    }
    if (d.estado === 'titulo' && !d.demo && !this.arrancando && quieto > STAND.DEMO_TRAS_S) d.empezarDemo();
    else if (d.estado === 'fin' && quieto > (this.pidiendoNombre ? STAND.VOLVER_NOMBRE_S : STAND.VOLVER_FIN_S)) d.irAlMenu();
    // En un teléfono, una partida en pausa no se pierde nunca; en el stand, sí
    else if (MODO_STAND && d.estado === 'pausa' && !this.contando && quieto > STAND.VOLVER_PAUSA_S) d.irAlMenu();
  }

  mostrarDemo(v) {
    clearTimeout(this.relojDemo);
    if (v) {
      $('demo').hidden = false;
      this.titulo.hidden = true;
      this.btnPausa.hidden = true;
    } else {
      // La capa se va un poco después: el dedo que cortó la demo no tiene que
      // caer en un botón del título al levantarse
      this.relojDemo = setTimeout(() => { $('demo').hidden = true; }, 400);
      this.ultimoToque = performance.now();
    }
  }

  // --------------------------------------------------------------------------
  //  Compartir el resultado
  // --------------------------------------------------------------------------
  // Se prepara al mostrar el final (la imagen tarda un poco, y al tocar el
  // botón ya tiene que estar: el teléfono sólo deja compartir justo al tocar)
  prepararCompartir(texto, tarjeta) {
    this.aCompartir = { texto, archivo: null };
    const yo = this.aCompartir;
    let puede = false;
    try { puede = !!(navigator.canShare && navigator.canShare({ files: [new File(['x'], 'x.jpg', { type: 'image/jpeg' })] })); } catch (e) { /* nada */ }
    if (!puede) return;
    setTimeout(async () => {
      try {
        const c = await dibujarTarjeta({ ...tarjeta, url: URL_JUEGO.replace(/^https:\/\//, '').replace(/\/$/, ''), atlas: this.imagenEmoji });
        // JPEG: pesa un quinto que PNG y se arma más rápido en un teléfono lento
        const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.9));
        if (blob && this.aCompartir === yo) yo.archivo = new File([blob], 'zas.jpg', { type: 'image/jpeg' });
      } catch (e) { /* sin imagen: se comparte el texto */ }
    }, 700);
  }

  async compartir() {
    const c = this.aCompartir;
    if (!c) return;
    const conLink = `${c.texto}\n${URL_JUEGO}`;
    if (navigator.share) {
      try {
        if (c.archivo && navigator.canShare({ files: [c.archivo] })) await navigator.share({ files: [c.archivo], title: 'ZAS', text: conLink });
        else await navigator.share({ title: 'ZAS', text: c.texto, url: URL_JUEGO });
        return;
      } catch (e) {
        if (e && e.name === 'AbortError') return;          // lo cerró sin elegir: nada
      }
    }
    // Sin "compartir" (en la computadora): se copia el texto
    try {
      await navigator.clipboard.writeText(conLink);
      this.avisar('¡Copiado! Pégalo en WhatsApp o donde quieras.');
    } catch (e) {
      this.avisar(conLink, 6);
    }
  }

  // Un aviso corto abajo de la pantalla
  avisar(texto, segundos = 3) {
    const a = $('aviso');
    a.textContent = texto;
    a.hidden = false;
    clearTimeout(this.relojAviso);
    this.relojAviso = setTimeout(() => { a.hidden = true; }, segundos * 1000);
  }

  async pedirInstalar() {
    const p = this.instalar.pedido;
    if (!p) return;
    this.instalar.pedido = null;
    this.instalar.alCambiar();
    try {
      p.prompt();
      const r = await p.userChoice;
      if (r && r.outcome === 'accepted') this.avisar('¡Listo! ZAS queda en tu pantalla de inicio.');
    } catch (e) { /* nada */ }
  }

  // Seguir después de la pausa. Si se estaba en pleno microjuego, antes una
  // cuenta 3, 2, 1: la mecha sigue donde quedó y nadie tiene que perder por
  // sorpresa. (Si se vuelve a esconder la página en la cuenta, se cancela.)
  seguirConCuenta() {
    const d = this.director;
    if (!d || d.estado !== 'pausa' || this.contando) return;
    if (d.previo !== 'micro') { d.seguir(); return; }
    this.contando = true;
    this.pausa.classList.add('contando');
    const cuenta = $('pausa-cuenta');
    cuenta.textContent = '';
    let n = 3;
    const paso = () => {
      if (!this.contando) return;
      if (document.hidden) { this.cancelarCuenta(); this.audio.pausar(); return; }
      if (n === 0) { this.cancelarCuenta(); this.audio.cuenta(0); d.seguir(); return; }
      this.audio.cuenta(n);
      cuenta.textContent = String(n--);
      cuenta.classList.remove('pum');
      void cuenta.offsetWidth;                         // para que la animación vuelva a arrancar
      cuenta.classList.add('pum');
      this.relojCuenta = setTimeout(paso, 600);
    };
    // El audio vuelve ya (para que la cuenta suene); el juego, recién al final
    this.audio.despertar().then(paso);
  }

  cancelarCuenta() {
    clearTimeout(this.relojCuenta);
    this.contando = false;
    this.pausa.classList.remove('contando');
  }

  // De vuelta al menú principal
  mostrarMenu() {
    this.ultimoToque = performance.now();          // (stand: la demo espera su rato en el título)
    this.mostrarContador();
    this.cancelarCuenta();
    this.turno.hidden = true;
    this.pausa.hidden = true;
    this.fin.hidden = true;
    this.cerrarNombre();
    this.mostrarRecord();
    this.titulo.hidden = false;
  }

  // practica: true = "Cómo jugar"; null = la decide el Director (sólo la primera vez)
  empezar(practica = null) { return this.arrancar(d => d.empezar(practica)); }

  // Práctica libre de un microjuego (desde la galería)
  empezarGaleria(Clase) {
    this.claseGaleria = Clase;
    return this.arrancar(d => d.empezarGaleria(Clase));
  }

  // Duelo de dos jugadores turnándose el teléfono
  empezarDuelo() { return this.arrancar(d => d.empezarDuelo()); }

  // Antes de cada turno del duelo: de quién es y cómo van
  mostrarTurno(du) {
    const quien = $('turno-quien');
    quien.textContent = `Jugador ${du.turno + 1}`;
    quien.className = `grande turno-quien j${du.turno + 1}`;
    const marcador = $('turno-marcador');
    marcador.textContent = '';
    for (const j of [0, 1]) {
      const fila = document.createElement('span');
      fila.append(`Jugador ${j + 1}: ${du.puntos[j]} ${du.puntos[j] === 1 ? 'superado' : 'superados'} · `);
      const vidas = document.createElement('span');
      vidas.className = du.vidas[j] > 0 ? 'corazones' : 'sin-vidas';
      vidas.textContent = du.vidas[j] > 0 ? '♥'.repeat(du.vidas[j]) : 'sin vidas';
      fila.append(vidas);
      marcador.append(fila);
    }
    $('turno-aviso').textContent = du.inicio ? 'Toca cuando estés listo.' : 'Pásale el teléfono y toca cuando esté listo.';
    this.turno.hidden = false;
    this.audio.turno();
    this.btnPausa.hidden = true;
    $('turno-listo').focus({ preventScroll: true });
  }

  listoTurno() {
    if (this.turno.hidden) return;
    this.turno.hidden = true;
    this.btnPausa.hidden = false;
    if (this.director) this.director.seguirDuelo();
  }

  // "Jugar otra vez" del final: otra partida, el mismo microjuego si se venía
  // practicando uno de la galería, o la revancha del duelo
  otraVez() {
    if (this.fin.classList.contains('galeria') && this.claseGaleria) this.empezarGaleria(this.claseGaleria);
    else if (this.fin.classList.contains('duelo')) this.empezarDuelo();
    else this.empezar();
  }

  async arrancar(fn) {
    const d = this.director;
    if (this.arrancando || this.pidiendoNombre || !d || (d.estado !== 'titulo' && d.estado !== 'fin')) return;
    // Medio segundo de guarda: el toque desesperado del final no reinicia solo.
    if (d.estado === 'fin' && performance.now() - this.finDesde < 700) return;
    this.arrancando = true;
    this.pantallaCompleta();
    precargar();                // la tabla de récords, para saber al final si entras
    if (!this.audio.audioVivo) await this.audio.desbloquear();
    this.titulo.hidden = true;
    this.fin.hidden = true;
    fn(d);
    this.arrancando = false;
  }

  // La galería: todos los microjuegos y jefes. Los que todavía no te salieron
  // en este aparato, con signo de pregunta (hay que descubrirlos jugando).
  abrirGaleria(v) {
    this.galeria.hidden = !v;
    if (!v) return;
    const d = this.director, vistos = d ? d.vistos : new Set();
    let mejores = {};
    try { mejores = JSON.parse(localStorage.getItem(CLAVE_GALERIA)) || {}; } catch (e) { /* nada */ }
    const grilla = $('galeria-grilla');
    grilla.textContent = '';
    const todos = [...MICROS, ...JEFES];
    let descubiertos = 0;
    for (const C of todos) {
      const visto = vistos.has(C.name);
      if (visto) descubiertos++;
      const ficha = document.createElement(visto ? 'button' : 'div');
      ficha.className = 'ficha' + (C.JEFE ? ' jefe' : '') + (visto ? '' : ' bloqueada');
      if (visto) {
        ficha.type = 'button';
        ficha.addEventListener('click', () => { this.abrirGaleria(false); this.empezarGaleria(C); });
      }
      const c = document.createElement('canvas');
      c.width = c.height = 96;
      const icono = EMOJI[C.ICONO] ? C.ICONO : 'estrella';
      const [x, y] = EMOJI[icono];
      c.getContext('2d').drawImage(this.imagenEmoji, x, y, CELDA_EMOJI, CELDA_EMOJI, 0, 0, 96, 96);
      const nom = document.createElement('span');
      nom.className = 'nom-ficha';
      nom.textContent = visto ? C.ORDEN.replace(/[¡!¿?]/g, '') : '???';
      const mejor = document.createElement('span');
      mejor.className = 'mejor-ficha';
      mejor.textContent = visto && mejores[C.name] ? `Mejor: ${mejores[C.name]}` : (C.JEFE ? 'JEFE' : '');
      ficha.append(c, nom, mejor);
      grilla.append(ficha);
    }
    $('galeria-nota').textContent = descubiertos
      ? `Descubriste ${descubiertos} de ${todos.length}. Toca uno para practicarlo: cada vez más rápido, hasta que pierdas 4 vidas.`
      : `Hay ${todos.length} para descubrir: juega una partida y van apareciendo aquí.`;
    $('cerrar-galeria').focus({ preventScroll: true });
    this.galeria.querySelector('.panel-cuerpo').scrollTop = 0;
  }

  // En el celular, al empezar se pide pantalla completa. Si el navegador no
  // deja (iPhone), no pasa nada: el juego anda igual.
  pantallaCompleta() {
    if (!this.tactil) return;
    // Instalado en la pantalla de inicio ya se abre a pantalla completa
    if (window.matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches) return;
    const el = document.documentElement;
    const pedir = el.requestFullscreen || el.webkitRequestFullscreen;
    if (!pedir || document.fullscreenElement) return;
    try {
      const p = pedir.call(el, { navigationUI: 'hide' });
      if (p && p.then) {
        p.then(() => {
          // El aviso del navegador ("desliza para salir") dura unos segundos y
          // no se puede quitar: el primer microjuego espera a que se vaya.
          if (this.director) this.director.esperarAviso(AVISO_PANTALLA_S);
          // En el teléfono, se traba en vertical. En una tablet no: si está
          // acostada sobre una mesa (en el stand), girarle la pantalla molesta.
          const telefono = Math.min(screen.width, screen.height) < 500;
          if (telefono && screen.orientation && screen.orientation.lock) screen.orientation.lock('portrait').catch(() => {});
        }).catch(() => {});
      }
    } catch (e) { /* nada */ }
  }

  mostrarFin(d) {
    this.turno.hidden = true;
    this.fin.classList.remove('galeria', 'duelo');
    this.fin.querySelector('.causa').textContent = '¡Se acabó!';
    if (d.galeria) { this.mostrarFinGaleria(d); return; }
    if (d.duelo) { this.mostrarFinDuelo(d); return; }
    $('fin-cta').textContent = 'Jugar otra vez';
    // En qué microjuego se perdió la última vida
    const micro = $('fin-micro');
    micro.textContent = '';
    if (d.ultimo) {
      const b = document.createElement('b');
      b.textContent = d.ultimo;
      micro.append('Perdiste en ', b);
    }
    $('fin-puntos').textContent = conPuntos(d.puntaje);
    $('fin-detalle').textContent = `puntos · ${d.puntos} ${d.puntos === 1 ? 'microjuego' : 'microjuegos'}`;
    $('fin-veredicto').textContent = veredicto(d.puntos);
    const cara = d.nuevo && d.puntos > 0 ? 'euforico' : d.puntos === 0 ? 'triste' : 'feliz';
    this.dibujarMedalla(d.medalla, cara);
    const juegos = `${d.puntos} ${d.puntos === 1 ? 'microjuego' : 'microjuegos'}`;
    this.prepararCompartir(`¡Hice ${conPuntos(d.puntaje)} puntos en ZAS (${juegos})! ¿Me ganas?`,
      { grande: conPuntos(d.puntaje), linea: `PUNTOS · ${juegos.toUpperCase()}`, cara, medalla: d.medalla });
    // El mejor de ESTE aparato ("¡Entraste a la tabla!" es la de todos)
    const rec = $('fin-record');
    rec.textContent = d.nuevo ? '¡Tu mejor partida!' : `Tu mejor partida: ${conPuntos(d.recordPuntaje)} puntos · ${d.record} microjuegos`;
    rec.classList.toggle('nuevo', d.nuevo);
    this.mostrarRecord();
    this.fin.hidden = false;
    this.finDesde = performance.now();
    // En qué puesto quedó entre TODAS las partidas (llega de internet: aparece
    // cuando llega; sin conexión no se muestra y la partida se sube después)
    const puesto = $('fin-puesto');
    puesto.hidden = true;
    const esta = this.finId = (this.finId || 0) + 1;
    terminarPartida(d.puntaje, d.puntos).then(r => {
      if (!r || esta !== this.finId || this.fin.hidden) return;
      puesto.textContent = textoPuesto(r);
      puesto.hidden = false;
      if (this.ladosVisibles) this.actualizarLado();
    });
    // ¿Entra en la tabla? Entonces se pide el nombre (con el último ya escrito)
    this.ultimaPartida = null;
    this.cerrarNombre();
    $('anotar-luego').hidden = true;
    const partida = { puntaje: d.puntaje, rondas: d.puntos };
    entraEnTabla(d.puntaje).then(entra => {
      if (!entra || this.fin.hidden) return;
      this.ultimaPartida = partida;
      this.pedirNombre();
    });
  }

  // El final de una práctica de la galería: cuántos seguidos y tu mejor marca
  // (no hay tabla ni medalla: es para practicar)
  mostrarFinGaleria(d) {
    this.fin.classList.add('galeria');
    $('fin-puesto').hidden = true;
    this.ultimaPartida = null;
    this.cerrarNombre();
    const micro = $('fin-micro');
    micro.textContent = '';
    const b = document.createElement('b');
    b.textContent = d.ultimo;
    micro.append('Práctica: ', b);
    $('fin-puntos').textContent = String(d.puntos);
    $('fin-detalle').textContent = `${d.puntos === 1 ? 'superado' : 'superados'} · tu mejor: ${d.mejor}`;
    $('fin-veredicto').textContent = d.nuevoMejor && d.puntos > 0 ? '¡Tu mejor marca en este microjuego!' : 'Cada uno que pasas, va más rápido.';
    $('fin-cta').textContent = 'Otra vez';
    const cara = d.nuevoMejor && d.puntos > 0 ? 'euforico' : d.puntos === 0 ? 'triste' : 'feliz';
    this.dibujarMedalla(null, cara);
    this.prepararCompartir(`¡Pasé ${d.puntos} seguidos de ${d.ultimo} en ZAS! ¿Me ganas?`,
      { arriba: d.ultimo, grande: String(d.puntos), linea: d.puntos === 1 ? 'SUPERADO' : 'SUPERADOS SEGUIDOS', cara });
    this.fin.hidden = false;
    this.finDesde = performance.now();
  }

  // El final del duelo: quién ganó y cuántos superó cada uno
  mostrarFinDuelo(d) {
    this.fin.classList.add('duelo');
    $('fin-puesto').hidden = true;
    this.ultimaPartida = null;
    this.cerrarNombre();
    this.fin.querySelector('.causa').textContent = d.ganador ? `¡Gana el jugador ${d.ganador}!` : '¡Empate!';
    const micro = $('fin-micro');
    micro.textContent = '';
    if (d.ultimo) {
      const b = document.createElement('b');
      b.textContent = d.ultimo;
      micro.append('Se definió en ', b);
    }
    $('fin-puntos').textContent = `${d.puntos[0]} – ${d.puntos[1]}`;
    $('fin-detalle').textContent = 'jugador 1 · jugador 2';
    $('fin-veredicto').textContent = d.ganador ? '¿Revancha?' : 'Superaron los mismos. ¿Desempate?';
    $('fin-cta').textContent = 'Revancha';
    this.dibujarMedalla(null, d.ganador ? 'euforico' : 'guino');
    const marcador = `${d.puntos[0]} – ${d.puntos[1]}`;
    this.prepararCompartir(`Duelo en ZAS: ${marcador}. ${d.ganador ? `¡Ganó el jugador ${d.ganador}!` : '¡Empate!'} ¿Se atreven?`,
      { arriba: d.ganador ? `¡GANA EL JUGADOR ${d.ganador}!` : '¡EMPATE!', grande: marcador, linea: 'DUELO DE 2 JUGADORES',
        cara: d.ganador ? 'euforico' : 'guino', pie: '¿SE ATREVEN?' });
    this.fin.hidden = false;
    this.finDesde = performance.now();
  }

  pedirNombre() {
    if (!this.ultimaPartida) return;
    this.pidiendoNombre = true;
    this.fin.classList.add('pidiendo');
    this.cajaNombre.hidden = false;
    $('anotar-luego').hidden = true;
    $('fin-cta').hidden = true;
    this.inputNombre.value = ultimoNombre();
    $('nombre-error').hidden = true;
    // En la computadora se escribe directo; en el celular, al tocar la caja
    // (si no, el teclado tapa el puntaje apenas termina la partida)
    if (!this.tactil) { this.inputNombre.focus(); this.inputNombre.select(); }
  }

  cerrarNombre() {
    this.pidiendoNombre = false;
    this.fin.classList.remove('pidiendo');
    this.cajaNombre.hidden = true;
    $('fin-cta').hidden = false;
    this.inputNombre.blur();
  }

  async guardarNombre() {
    const p = this.ultimaPartida;
    if (!p || this.guardando) return;
    this.guardando = true;
    const boton = $('form-nombre').querySelector('button');
    boton.textContent = 'Revisando…';
    $('nombre-error').hidden = true;
    // Un nombre con groserías no se guarda: se pide otro
    const revisado = await revisarNombre(this.inputNombre.value);
    if (!revisado.ok) {
      this.guardando = false;
      boton.textContent = 'Guardar';
      $('nombre-error').hidden = false;
      this.inputNombre.classList.remove('temblar');
      void this.inputNombre.offsetWidth;            // para que la animación vuelva a arrancar
      this.inputNombre.classList.add('temblar');
      this.inputNombre.select();
      return;
    }
    boton.textContent = 'Guardando…';
    recordarNombre(revisado.nombre);
    const r = await anotar(revisado.nombre, p.puntaje, p.rondas);
    this.guardando = false;
    boton.textContent = 'Guardar';
    this.ultimaPartida = null;
    this.cerrarNombre();
    this.finDesde = performance.now();
    if (!this.fin.hidden) this.abrirRecords(true, { nombre: revisado.nombre, puntaje: p.puntaje }, !r.enLinea, 'hoy');
    this.actualizarLado({ nombre: revisado.nombre, puntaje: p.puntaje });
  }

  // La tabla de récords. cual: 'hoy' o 'siempre' (sin decir: la de hoy, y si
  // hoy todavía no hay, la de siempre). resaltar: { nombre, puntaje } de la
  // fila que se acaba de anotar. Se abre al instante y se llena cuando llega.
  async abrirRecords(v, resaltar = null, soloLocal = false, cual = null) {
    if (!v) { this.records.hidden = true; this.resaltar = null; return; }
    this.resaltar = resaltar;
    const ol = $('tabla'), nota = $('nota-tabla');
    const pedido = this.pedidoTabla = (this.pedidoTabla || 0) + 1;
    ol.textContent = '';
    $('tabla-vacia').hidden = true;
    nota.textContent = 'Cargando…';
    this.records.hidden = false;
    this.marcarPestana(cual || 'hoy');
    if (!cual) $('cerrar-records').focus();
    let tabla = await leerTabla(soloLocal, cual || 'hoy');
    if (!cual && !tabla.length) {
      cual = 'siempre';
      this.marcarPestana(cual);
      tabla = await leerTabla(soloLocal, cual);
    }
    cual = cual || 'hoy';
    if (this.records.hidden || pedido !== this.pedidoTabla) return;
    nota.textContent = !enLinea ? `Los 10 mejores de ${cual === 'hoy' ? 'hoy en ' : ''}este aparato (sin conexión).`
      : cual === 'hoy' ? 'Los 10 mejores de hoy, de todos.' : 'Los 10 mejores de todos los tiempos.';
    if (hayPendientes()) nota.textContent += ' Tu puntaje se subirá a la tabla de todos apenas haya conexión.';
    $('tabla-vacia').textContent = cual === 'hoy' ? 'Hoy todavía no hay récords. ¡Juega una partida!'
      : 'Todavía no hay récords. ¡Juega una partida!';
    $('tabla-vacia').hidden = tabla.length > 0;
    if (tabla.length) {
      const cabeza = document.createElement('li');
      cabeza.className = 'cabeza';
      for (const [clase, texto] of [['pos', '#'], ['nom', 'Nombre'], ['pts', 'Puntos'], ['ron', 'Juegos']]) {
        const s = document.createElement('span');
        s.className = clase + '-cab';
        s.textContent = texto;
        cabeza.appendChild(s);
      }
      ol.appendChild(cabeza);
    }
    tabla.forEach((e, i) => {
      const li = document.createElement('li');
      if (resaltar && e.nombre === resaltar.nombre && e.puntaje === resaltar.puntaje) li.className = 'yo';
      for (const [clase, texto] of [['pos', i + 1], ['nom', e.nombre], ['pts', conPuntos(e.puntaje)], ['ron', e.rondas]]) {
        const s = document.createElement('span');
        s.className = clase;
        s.textContent = String(texto);
        li.appendChild(s);
      }
      ol.appendChild(li);
    });
  }

  marcarPestana(cual) {
    for (const b of document.querySelectorAll('[data-tabla]')) b.setAttribute('aria-selected', String(b.dataset.tabla === cual));
  }

  // La medalla (un emoji del atlas, dibujado en un canvas del HTML). Sin
  // medalla, en su lugar va Zas con la cara que corresponda.
  dibujarMedalla(nombre, cara = 'feliz') {
    const c = $('fin-medalla'), zas = $('fin-zas');
    const hay = !!nombre && !!EMOJI[nombre];
    c.hidden = !hay;
    zas.hidden = hay;
    if (!hay) {
      zas.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgMascota(cara));
      return;
    }
    const g = c.getContext('2d');
    const [x, y] = EMOJI[nombre];
    g.clearRect(0, 0, c.width, c.height);
    g.drawImage(this.imagenEmoji, x, y, CELDA_EMOJI, CELDA_EMOJI, 0, 0, c.width, c.height);
  }

  mostrarPausa(v) {
    this.cancelarCuenta();
    this.pausa.hidden = !v;
    this.btnPausa.hidden = v;
    if (this.director && this.director.practica) this.saltar.hidden = v;    // en pausa no se salta
  }
  mostrarSaltar(v) { this.saltar.hidden = !v; }

  // Dos botones: la música y los efectos. La tecla M apaga (o prende) todo.
  alternarMusica() { this.audio.setMusica(!this.audio.musicaOn); this.pintarSonido(); }
  alternarEfectos() { this.audio.setEfectos(!this.audio.efectos); this.pintarSonido(); }
  alternarTodo() {
    const prender = !this.audio.musicaOn && !this.audio.efectos;
    this.audio.setMusica(prender);
    this.audio.setEfectos(prender);
    this.pintarSonido();
  }

  pintarSonido() {
    const a = this.audio;
    for (const b of document.querySelectorAll('[data-accion="sonido"]')) {
      b.innerHTML = a.efectos ? ICONO_SONIDO : ICONO_MUDO;
      b.classList.toggle('apagado', !a.efectos);
      b.setAttribute('aria-label', 'Efectos de sonido');
      b.setAttribute('aria-pressed', String(a.efectos));
      b.title = a.efectos ? 'Efectos de sonido: sí' : 'Efectos de sonido: no';
    }
    for (const b of document.querySelectorAll('[data-accion="musica"]')) {
      b.innerHTML = a.musicaOn ? ICONO_MUSICA : ICONO_SIN_MUSICA;
      b.classList.toggle('apagado', !a.musicaOn);
      b.setAttribute('aria-label', 'Música');
      b.setAttribute('aria-pressed', String(a.musicaOn));
      b.title = a.musicaOn ? 'Música: sí' : 'Música: no';
    }
  }

  abrirCreditos(v) {
    this.creditos.hidden = !v;
    if (!v) return;
    $('cerrar-creditos').focus();
    // Qué versión quedó guardada en el aparato (la del service worker): sirve
    // para saber si ya llegó la última que se publicó
    const p = $('version');
    if (window.caches) {
      caches.keys().then(nombres => {
        const v2 = nombres.find(n => n.startsWith('zas-'));
        p.textContent = v2 ? `Versión ${v2.slice(4, 10)}` : '';
      }).catch(() => {});
    }
  }
}
