// ============================================================================
//  ui.js — título, fin de partida, pausa y créditos
// ----------------------------------------------------------------------------
//  Son HTML encima del canvas: texto nítido en cualquier pantalla y cero costo
//  para el motor. Reintentar es tocar en cualquier lado: el ciclo "otra vez"
//  tiene que ser lo más corto posible.
// ============================================================================

import { EMOJI, CELDA_EMOJI } from './datos/emoji.js';

const $ = id => document.getElementById(id);
const AVISO_PANTALLA_S = 3.8;      // lo que tarda en irse el aviso de pantalla completa (Chrome en Android)

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
    this.creditos.addEventListener('pointerdown', e => e.stopPropagation());
    this.creditos.addEventListener('pointerup', e => e.stopPropagation());
    this.pintarSonido();

    // pointerup y no pointerdown: en iOS el audio sólo se destraba al levantar el dedo.
    this.titulo.addEventListener('pointerup', () => this.empezar());
    this.fin.addEventListener('pointerup', () => this.empezar());
    this.pausa.addEventListener('pointerup', () => this.director && this.director.seguir());

    window.addEventListener('keydown', e => {
      if (e.repeat) return;
      if (e.code === 'Escape' && !this.creditos.hidden) { this.abrirCreditos(false); return; }
      if (e.code === 'KeyM') { this.alternarSonido(); return; }
      if (e.code !== 'Space' && e.code !== 'Enter') return;
      if (!this.creditos.hidden || !this.director) return;
      const est = this.director.estado;
      if (est === 'titulo' || est === 'fin') { e.preventDefault(); this.empezar(); }
      else if (est === 'pausa') { e.preventDefault(); this.director.seguir(); }
    });
  }

  conectar(director) {
    this.director = director;
    this.mostrarRecord(director.record);
    this.titulo.hidden = false;
    document.body.classList.add('listo');
  }

  mostrarRecord(record) {
    $('titulo-record').textContent = record > 0 ? `Tu récord: ${record}` : '';
  }

  // practica: true = "Cómo jugar"; null = la decide el Director (sólo la primera vez)
  async empezar(practica = null) {
    const d = this.director;
    if (this.arrancando || !d || (d.estado !== 'titulo' && d.estado !== 'fin')) return;
    // Medio segundo de guarda: el toque desesperado del final no reinicia solo.
    if (d.estado === 'fin' && performance.now() - this.finDesde < 700) return;
    this.arrancando = true;
    this.pantallaCompleta();
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
          if (screen.orientation && screen.orientation.lock) screen.orientation.lock('portrait').catch(() => {});
        }).catch(() => {});
      }
    } catch (e) { /* nada */ }
  }

  mostrarFin(d) {
    $('fin-puntos').textContent = d.puntos;
    $('fin-detalle').textContent = d.puntos === 1 ? 'microjuego superado' : 'microjuegos superados';
    $('fin-veredicto').textContent = veredicto(d.puntos);
    this.dibujarMedalla(d.medalla);
    const rec = $('fin-record');
    rec.textContent = d.nuevo ? '¡Nuevo récord!' : `Tu récord: ${d.record}`;
    rec.classList.toggle('nuevo', d.nuevo);
    this.mostrarRecord(d.record);
    this.fin.hidden = false;
    this.finDesde = performance.now();
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
    this.pausa.hidden = !v;
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
