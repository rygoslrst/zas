// ============================================================================
//  config.js — los números que definen cómo se siente ZAS
// ----------------------------------------------------------------------------
//  Si algo "se siente mal" (muy rápido, muy lento, muy difícil), se toca acá.
// ============================================================================

// --- Pantalla ---------------------------------------------------------------
// Se juega con el celular en VERTICAL. El ancho es fijo; el alto se adapta a
// la pantalla (un celular alargado muestra más fondo arriba y abajo). Todo lo
// importante de cada microjuego cabe en la ZONA SEGURA de 540 x 760 del medio.
export const ANCHO = 540;
export const ALTO_MIN = 760;
export const ALTO_MAX = 1170;
export const VISTA = { alto: 960 };
export function altoParaPantalla(w, h) {
  const alto = Math.round((ANCHO * h) / w / 2) * 2;
  return Math.max(ALTO_MIN, Math.min(ALTO_MAX, alto));
}

// NITIDEZ. Las coordenadas del juego son siempre de 540 de ancho, pero se
// DIBUJA a la resolución real de la pantalla: en un celular con pantalla
// densa, k = 2 (el doble de píxeles, todo nítido); en la computadora, k = 1.
// Todas las escenas usan una cámara con zoom k: nada más se entera.
// "max" es el techo: si un aparato no da abasto dibujando tanto, el Director
// lo baja solo (y se recuerda en este aparato para la próxima vez).
export const CLAVE_ESCALA = 'zas_escala_max_v1';
function techoGuardado() {
  try { return parseFloat(localStorage.getItem(CLAVE_ESCALA)) || 2; } catch (e) { return 2; }
}
export const ESCALA = { k: 1, max: techoGuardado() };
export function escalaParaPantalla(w, h, alto) {
  const forzada = new URLSearchParams(location.search).get('k');     // para probar: ?k=2
  if (forzada) return Math.max(1, Math.min(2, parseFloat(forzada) || 1));
  const anchoCss = Math.min(w, (h * ANCHO) / alto);      // cuánto ocupa el juego en la pantalla
  const fisico = anchoCss * (window.devicePixelRatio || 1);
  const k = Math.round((fisico / ANCHO) * 4) / 4;        // en pasos de 0,25
  return Math.max(1, Math.min(ESCALA.max, 2, k));
}

// --- Ritmo --------------------------------------------------------------------
// Cada microjuego dura una cantidad de PULSOS de la música (8 casi siempre).
// Cuando el juego acelera, sube el pulso: todo dura menos y se mueve más rápido.
export const RITMO = {
  BPM_BASE: 112,           // 8 pulsos a 112 = 4,3 segundos
  PULSOS: 8,
};

// --- La partida -----------------------------------------------------------------
export const PARTIDA = {
  VIDAS: 4,
  CADA_ACELERA: 5,          // cada 5 microjuegos, más rápido
  ACELERA: 0.12,            // cuánto más rápido cada vez (x1,12, x1,24...)
  VEL_MAX: 1.85,
  CADA_NIVEL: 12,           // cada 12 microjuegos, más difíciles (nivel 1 → 2 → 3)
  // JEFES: el 8.º microjuego (así lo ve casi todo el que juega una vez) y
  // después cada 12 (20.º, 32.º...). Son más largos; si lo ganas, vida extra.
  PRIMER_JEFE: 8,
  CADA_JEFE: 12,
  // RACHA: microjuegos seguidos sin fallar → el puntaje se multiplica.
  // (Si se cambia, cambiar el tope de puntaje en herramientas/tabla_en_linea.sql)
  RACHA: [[10, 2], [5, 1.5]],
  // La primera vez que se ve un microjuego en el aparato, la orden queda un
  // poco más en pantalla (con un sello de NUEVO)
  EXTRA_NUEVO_S: 0.5,
  // Después de decidir (ganaste o perdiste) el microjuego sigue un ratito,
  // para que se vea qué pasó, y enseguida viene el siguiente.
  DESPUES_DE_DECIDIR_S: 0.55,
  // Al empezar cada microjuego se ignoran los toques un instante: el dedo del
  // microjuego anterior no tiene que contar en el nuevo.
  GRACIA_S: 0.18,
};

// --- Colores ---------------------------------------------------------------------
export const COLOR = {
  TEXTO: 0xfffaf0,
  ORO: 0xffd23f,
  BIEN: 0x3ddc84,
  MAL: 0xff4d5a,
  OSCURO: 0x1b1030,
  // Fondos de los microjuegos: vivos, que el emoji de encima se lea igual.
  FONDOS: [0xffd23f, 0x3ec1d3, 0xff6b6b, 0x7b61ff, 0x2ec4b6, 0xff9f1c, 0x8ac926, 0xff70a6, 0x4d96ff],
};

export const DEBUG = new URLSearchParams(location.search).has('debug');
// MODO STAND (para el notebook o la tablet del stand del torneo): abrir el
// juego con ?stand. Si nadie toca el título en un rato, el juego se juega solo
// (demo); el final, la pausa y los paneles vuelven solos al título; y cada
// jugador nuevo recibe las lecciones de primera vez (no se recuerdan).
export const MODO_STAND = new URLSearchParams(location.search).has('stand');
export const STAND = {
  DEMO_TRAS_S: 20,          // sin tocar nada en el título, empieza la demo
  DEMO_RONDAS: 12,          // la demo juega esto y vuelve al título
  VOLVER_FIN_S: 25,         // en el final, sin tocar nada, vuelve al título
  VOLVER_NOMBRE_S: 60,      // ...si estaba escribiendo su nombre, espera más
  VOLVER_PAUSA_S: 60,       // una partida en pausa abandonada
  CERRAR_PANEL_S: 40,       // récords, galería o créditos abiertos
};
// Si el aparato pide "reducir movimiento" (accesibilidad), sin sacudidas de
// pantalla y con destellos más suaves
export const MENOS_MOVIMIENTO = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export const CLAVE_RECORD = 'zas_record_v1';
export const CLAVE_SONIDO = 'zas_sonido_v1';          // los efectos ('0': apagados)
export const CLAVE_MUSICA = 'zas_musica_v1';          // la música ('0': apagada)
export const CLAVE_PRACTICA = 'zas_practica_v1';      // '1' cuando ya se hizo la práctica
export const CLAVE_PUNTAJE = 'zas_puntaje_v1';        // el mejor puntaje de este aparato
export const CLAVE_TABLA = 'zas_tabla_v1';            // la tabla de récords (ver tabla.js)
export const CLAVE_NOMBRE = 'zas_nombre_v1';          // el último nombre anotado
export const CLAVE_PENDIENTES = 'zas_pendientes_v1';  // puntajes que no se pudieron subir todavía
export const CLAVE_VISTOS = 'zas_vistos_v1';          // microjuegos que ya se jugaron en este aparato
export const CLAVE_LECCIONES = 'zas_lecciones_v1';    // lecciones de "primera vez" ya mostradas
export const CLAVE_GALERIA = 'zas_galeria_v1';        // la mejor marca de cada microjuego en la galería
export const URL_JUEGO = 'https://rygoslrst.github.io/zas/';
