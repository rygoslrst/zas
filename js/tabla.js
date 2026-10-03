// ============================================================================
//  tabla.js — la tabla de récords: los 10 mejores puntajes
// ----------------------------------------------------------------------------
//  EN LÍNEA (Supabase, proyecto "zas"): una sola tabla para todos, desde
//  cualquier celular. El juego sólo puede llamar a dos funciones de la base
//  de datos: mejores_records y anotar_record, que rechaza puntajes imposibles,
//  limpia el nombre y frena a quien quiera llenarla (ver CLAUDE.md).
//  La llave de abajo es pública a propósito: lo que protege son esas reglas.
//
//  EN EL APARATO (localStorage): copia de respaldo. Si no hay internet o la
//  base de datos no contesta, se usa ésta y el juego sigue igual.
// ============================================================================

import { CLAVE_TABLA, CLAVE_NOMBRE } from './config.js';
import { nombreProhibido } from './filtroNombres.js';

export const TAMANO_TABLA = 10;
export const LARGO_NOMBRE = 10;

const EN_LINEA = {
  url: 'https://eouuvfqpktumfwlebmqz.supabase.co/rest/v1/rpc/',
  llave: 'sb_publishable_bEC0jMG9Ls2YGHzx2faIcg_xFMQU6WG',
};
const ESPERA_MS = 3500;         // si no contesta en este tiempo, se usa la del aparato
const VIGENCIA_MS = 30000;      // cuánto sirve la última tabla leída para decidir si "entras"

// true si la última tabla que se mostró es la de todos (en línea)
export let enLinea = false;
let ultima = null;              // { lista, momento } de la última lectura en línea

async function rpc(funcion, datos) {
  const ctl = new AbortController();
  const plazo = setTimeout(() => ctl.abort(), ESPERA_MS);
  try {
    const r = await fetch(EN_LINEA.url + funcion, {
      method: 'POST',
      headers: { apikey: EN_LINEA.llave, 'Content-Type': 'application/json' },
      body: JSON.stringify(datos),
      signal: ctl.signal,
    });
    if (!r.ok) throw new Error(`${funcion}: ${r.status}`);
    return await r.json();
  } finally {
    clearTimeout(plazo);
  }
}

function leerLocal() {
  try {
    const v = JSON.parse(localStorage.getItem(CLAVE_TABLA));
    return Array.isArray(v) ? v.filter(e => e && typeof e.puntaje === 'number') : [];
  } catch (e) { return []; }
}

function ordenar(lista) {
  return lista.sort((a, b) => b.puntaje - a.puntaje || b.rondas - a.rondas || a.fecha - b.fecha);
}

function tablaLocal() { return ordenar(leerLocal()).slice(0, TAMANO_TABLA); }

// soloLocal: para mostrar la del aparato aunque haya red (si anotar en línea falló)
export async function leerTabla(soloLocal = false) {
  if (soloLocal) { enLinea = false; return tablaLocal(); }
  try {
    const filas = await rpc('mejores_records', { cuantos: TAMANO_TABLA });
    const lista = filas.map(f => ({ nombre: f.nombre, puntaje: f.puntaje, rondas: f.rondas, fecha: Date.parse(f.creado) }));
    ultima = { lista, momento: Date.now() };
    enLinea = true;
    return lista;
  } catch (e) {
    enLinea = false;
    return tablaLocal();
  }
}

// Se llama al empezar cada partida: así, al terminar, ya se sabe al instante
// si el puntaje entra (sin esperar a la red).
export function precargar() { leerTabla().catch(() => {}); }

// ¿Este puntaje entra en la tabla?
export async function entraEnTabla(puntaje) {
  if (puntaje <= 0) return false;
  const t = ultima && Date.now() - ultima.momento < VIGENCIA_MS ? ultima.lista : await leerTabla();
  return t.length < TAMANO_TABLA || puntaje > t[t.length - 1].puntaje;
}

// Anota una partida (en línea y, por las dudas, en el aparato). Devuelve el
// puesto (1 = el mejor) y si quedó en la tabla en línea o sólo en el aparato.
export async function anotar(nombre, puntaje, rondas) {
  const e = { nombre, puntaje, rondas, fecha: Date.now() };
  const t = ordenar([...leerLocal(), e]).slice(0, TAMANO_TABLA);
  try { localStorage.setItem(CLAVE_TABLA, JSON.stringify(t)); } catch (err) { /* modo privado */ }
  try {
    const puesto = await rpc('anotar_record', { p_nombre: nombre, p_puntaje: puntaje, p_rondas: rondas });
    ultima = null;
    return { puesto, enLinea: true };
  } catch (err) {
    return { puesto: t.indexOf(e) + 1, enLinea: false };
  }
}

// El último nombre que se usó (para no tener que escribirlo cada vez)
export function ultimoNombre() {
  try { return localStorage.getItem(CLAVE_NOMBRE) || ''; } catch (e) { return ''; }
}
export function recordarNombre(nombre) {
  try { localStorage.setItem(CLAVE_NOMBRE, nombre); } catch (e) { /* nada */ }
}

// --------------------------------------------------------------------------
//  Nombres: en mayúsculas, sólo letras, números y espacios, hasta 10. La tabla
//  se ve en el stand del colegio: los nombres con groserías no se aceptan
//  (ver filtroNombres.js; la última palabra la tiene la base de datos).
// --------------------------------------------------------------------------
export function limpiarNombre(texto) {
  return String(texto || '').toUpperCase().replace(/[^A-ZÁÉÍÓÚÑÜ0-9 ]/g, '').replace(/\s+/g, ' ')
    .trim().slice(0, LARGO_NOMBRE).trim();
}

// ¿Se puede usar este nombre? Devuelve { ok, nombre } con el nombre como
// quedaría guardado. Revisa acá y, si hay internet, en la base de datos (que
// puede tener palabras nuevas agregadas desde el panel de Supabase).
export async function revisarNombre(texto) {
  const nombre = limpiarNombre(texto) || 'JUGADOR';
  if (nombreProhibido(texto) || nombreProhibido(nombre)) return { ok: false, nombre };
  try {
    const r = await rpc('revisar_nombre', { p_nombre: nombre });
    return r === null ? { ok: false, nombre } : { ok: true, nombre: r };
  } catch (e) {
    return { ok: true, nombre };                  // sin red: alcanza con la revisión de acá
  }
}
