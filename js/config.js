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
export const ESCALA = { k: 1 };
export function escalaParaPantalla(w, h, alto) {
  const forzada = new URLSearchParams(location.search).get('k');     // para probar: ?k=2
  if (forzada) return Math.max(1, Math.min(2, parseFloat(forzada) || 1));
  const anchoCss = Math.min(w, (h * ANCHO) / alto);      // cuánto ocupa el juego en la pantalla
  const fisico = anchoCss * (window.devicePixelRatio || 1);
  const k = Math.round((fisico / ANCHO) * 4) / 4;        // en pasos de 0,25
  return Math.max(1, Math.min(2, k));
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
  CADA_JEFE: 12,            // y justo antes, un JEFE: más largo; si lo ganás, vida extra
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
export const CLAVE_RECORD = 'zas_record_v1';
export const CLAVE_SONIDO = 'zas_sonido_v1';
