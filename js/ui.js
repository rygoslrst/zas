// ============================================================================
//  ui.js — menú principal, fin de partida, pausa, récords y créditos
// ----------------------------------------------------------------------------
//  Son HTML encima del canvas: texto nítido en cualquier pantalla y cero costo
//  para el motor. Se juega sólo con el botón "Jugar" (tocar el fondo no hace
//  nada: así nadie empieza una partida sin querer).
// ============================================================================

import { EMOJI, CELDA_EMOJI } from './datos/emoji.js';
import { leerTabla, entraEnTabla, anotar, revisarNombre, ultimoNombre, recordarNombre, precargar, enLinea,
  hayPendientes, subirPendientes } from './tabla.js';

const $ = id => document.getElementById(id);
const AVISO_PANTALLA_S = 3.8;      // lo que tarda en irse el aviso de pantalla completa (Chrome en Android)
const conPuntos = n => n.toLocaleString('es-CL');
const EN_JUEGO = ['micro', 'intermedio', 'cerrando', 'leccion'];

const ICONO_SONIDO = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
const ICONO_MUDO = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16.5 9.5l5 5M21.5 9.5l-5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

// Qué decir según cuántos aguantaste
function veredicto(p) {
  if (p === 0) return '¡Uy! Otra vez: ya le vas a tomar el ritmo.';
  if (p < 5) return 'Buen comienzo. ¿Llegas a 5?';
  if (p < 10) return '¡Bien! Ya vas rápido.';
  if (p < 20) return '¡Muy bien! Pocos llegan hasta aquí.';
  if (p < 30) return '¡Tremendo! Reflejos de acero.';
  return '¡Leyenda! ¿Eres humano?';
}

export class UI {
  constructor(audio, imagenEmoji) {
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
      b.addEventListener('click', () => this.alternarSonido());
    }
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
    for (const b of document.querySelectorAll('[data-accion="menu"]')) {
      b.addEventListener('click', () => this.director && this.director.irAlMenu());
    }
    this.btnPausa.addEventListener('click', () => this.director && this.director.pausar());
    // El nombre para la tabla: ni los toques ni las teclas llegan al juego
    $('form-nombre').addEventListener('submit', e => { e.preventDefault(); this.guardarNombre(); });
    // "No, gracias" no es para siempre: queda un botón para anotarse igual
    $('no-guardar').addEventListener('click', () => { this.cerrarNombre(); $('anotar-luego').hidden = !this.ultimaPartida; });
    $('anotar-luego').addEventListener('click', () => this.pedirNombre());
    for (const el of [this.creditos, this.records, this.cajaNombre]) {
      el.addEventListener('pointerdown', e => e.stopPropagation());
      el.addEventListener('pointerup', e => e.stopPropagation());
    }
    window.addEventListener('resize', () => requestAnimationFrame(() => this.ajustarColumna()));
    this.pintarSonido();

    // "click" llega al levantar el dedo: en iOS el audio sólo se destraba ahí.
    $('btn-jugar').addEventListener('click', () => this.empezar());
    $('fin-cta').addEventListener('click', () => this.empezar());
    this.pausa.addEventListener('pointerup', () => this.seguirConCuenta());
    // Lo que no se pudo subir a la tabla la vez pasada, se intenta al abrir
    setTimeout(() => subirPendientes().catch(() => {}), 1500);

    window.addEventListener('keydown', e => {
      if (e.repeat || (e.target && e.target.tagName === 'INPUT')) return;     // escribiendo el nombre
      const est = this.director && this.director.estado;
      if (e.code === 'Escape') {
        if (!this.creditos.hidden) this.abrirCreditos(false);
        else if (!this.records.hidden) this.abrirRecords(false);
        else if (EN_JUEGO.includes(est)) this.director.pausar();
        else if (est === 'pausa') this.seguirConCuenta();
        return;
      }
      if (e.code === 'KeyM') { this.alternarSonido(); return; }
      if (e.code !== 'Space' && e.code !== 'Enter') return;
      if (!this.creditos.hidden || !this.records.hidden || !this.director) return;
      if (est === 'titulo' || est === 'fin') { e.preventDefault(); this.empezar(); }
      else if (est === 'pausa') { e.preventDefault(); this.seguirConCuenta(); }
    });
  }

  conectar(director) {
    this.director = director;
    this.mostrarRecord();
    this.titulo.hidden = false;
    document.body.classList.add('listo');
    this.ajustarColumna();
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
    raiz.setProperty('--col-izq', `${Math.max(0, Math.round(r.left))}px`);
    raiz.setProperty('--col-der', `${Math.max(0, Math.round(window.innerWidth - r.right))}px`);
  }

  // El botón de pausa se ve sólo durante la partida
  mostrarEnJuego(v) { this.btnPausa.hidden = !v; }

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
    let n = 3;
    const paso = () => {
      if (!this.contando) return;
      if (document.hidden) { this.cancelarCuenta(); return; }
      if (n === 0) { this.cancelarCuenta(); d.seguir(); return; }
      cuenta.textContent = String(n--);
      cuenta.classList.remove('pum');
      void cuenta.offsetWidth;                         // para que la animación vuelva a arrancar
      cuenta.classList.add('pum');
      this.relojCuenta = setTimeout(paso, 600);
    };
    paso();
  }

  cancelarCuenta() {
    clearTimeout(this.relojCuenta);
    this.contando = false;
    this.pausa.classList.remove('contando');
  }

  // De vuelta al menú principal
  mostrarMenu() {
    this.cancelarCuenta();
    this.pausa.hidden = true;
    this.fin.hidden = true;
    this.cerrarNombre();
    this.mostrarRecord();
    this.titulo.hidden = false;
  }

  // practica: true = "Cómo jugar"; null = la decide el Director (sólo la primera vez)
  async empezar(practica = null) {
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
    d.empezar(practica);
    this.arrancando = false;
  }

  // En el celular, al empezar se pide pantalla completa. Si el navegador no
  // deja (iPhone), no pasa nada: el juego anda igual.
  pantallaCompleta() {
    if (!this.tactil) return;
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
    this.dibujarMedalla(d.medalla);
    // El mejor de ESTE aparato ("¡Entraste a la tabla!" es la de todos)
    const rec = $('fin-record');
    rec.textContent = d.nuevo ? '¡Tu mejor partida!' : `Tu mejor partida: ${conPuntos(d.recordPuntaje)} puntos · ${d.record} microjuegos`;
    rec.classList.toggle('nuevo', d.nuevo);
    this.mostrarRecord();
    this.fin.hidden = false;
    this.finDesde = performance.now();
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
    if (!this.fin.hidden) this.abrirRecords(true, r.puesto, !r.enLinea);
  }

  // La tabla de récords (puesto: la fila que se acaba de anotar, resaltada).
  // Se abre al instante y se llena cuando llega (de internet puede tardar).
  async abrirRecords(v, puesto = 0, soloLocal = false) {
    if (!v) { this.records.hidden = true; return; }
    const ol = $('tabla'), nota = $('nota-tabla');
    ol.textContent = '';
    $('tabla-vacia').hidden = true;
    nota.textContent = 'Cargando…';
    this.records.hidden = false;
    $('cerrar-records').focus();
    const tabla = await leerTabla(soloLocal);
    if (this.records.hidden) return;
    nota.textContent = enLinea ? 'Los 10 mejores puntajes de todos.' : 'Los 10 mejores de este aparato (sin conexión).';
    if (hayPendientes()) nota.textContent += ' Tu puntaje se subirá a la tabla de todos apenas haya conexión.';
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
      if (i + 1 === puesto) li.className = 'yo';
      for (const [clase, texto] of [['pos', i + 1], ['nom', e.nombre], ['pts', conPuntos(e.puntaje)], ['ron', e.rondas]]) {
        const s = document.createElement('span');
        s.className = clase;
        s.textContent = String(texto);
        li.appendChild(s);
      }
      ol.appendChild(li);
    });
  }

  // La medalla (un emoji del atlas, dibujado en un canvas del HTML)
  dibujarMedalla(nombre) {
    const c = $('fin-medalla');
    c.hidden = !nombre;
    if (!nombre || !EMOJI[nombre]) return;
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

  alternarSonido() {
    this.audio.setSonido(!this.audio.sonido);
    this.pintarSonido();
  }

  pintarSonido() {
    for (const b of document.querySelectorAll('[data-accion="sonido"]')) {
      b.innerHTML = this.audio.sonido ? ICONO_SONIDO : ICONO_MUDO;
      b.setAttribute('aria-label', this.audio.sonido ? 'Silenciar' : 'Activar sonido');
    }
  }

  abrirCreditos(v) {
    this.creditos.hidden = !v;
    if (v) $('cerrar-creditos').focus();
  }
}
