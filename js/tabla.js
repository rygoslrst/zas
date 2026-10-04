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

import { CLAVE_TABLA, CLAVE_NOMBRE, CLAVE_PENDIENTES } from './config.js';
import { nombreProhibido } from './filtroNombres.js';

export const TAMANO_TABLA = 10;
export const LARGO_NOMBRE = 10;

const EN_LINEA = {
  url: 'https://eouuvfqpktumfwlebmqz.supabase.co/rest/v1/rpc/',
  llave: 'sb_publishable_bEC0jMG9Ls2YGHzx2faIcg_xFMQU6WG',
};
const ESPERA_MS = 3500;         // si no contesta en este tiempo, se usa la del aparato
const ESPERA_ANOTAR_MS = 8000;  // para guardar se espera más (con mala señal tarda)
const VIGENCIA_MS = 30000;      // cuánto sirve la última tabla leída para decidir si "entras"
const MAX_PENDIENTES = 10;

// true si la última tabla que se mostró es la de todos (en línea)
export let enLinea = false;
let ultima = null;              // { lista, momento } de la última lectura en línea

async function rpc(funcion, datos, espera = ESPERA_MS) {
  const ctl = new AbortController();
  const plazo = setTimeout(() => ctl.abort(), espera);
  try {
    const r = await fetch(EN_LINEA.url + funcion, {
      method: 'POST',
      headers: { apikey: EN_LINEA.llave, 'Content-Type': 'application/json' },
      body: JSON.stringify(datos),
      signal: ctl.signal,
    });
    if (!r.ok) {
      // La base explica por qué ("puntaje imposible", "demasiadas anotaciones")
      let motivo = '';
      try { motivo = (await r.json()).message || ''; } catch (e) { /* sin detalle */ }
      const err = new Error(`${funcion}: ${r.status} ${motivo}`);
      err.motivo = motivo;
      throw err;
    }
    return await r.json();
  } finally {
    clearTimeout(plazo);
  }
}

const esperar = ms => new Promise(r => setTimeout(r, ms));

// Cada partida anotada lleva una clave única: si se manda dos veces (porque la
// respuesta no llegó y se reintentó), la base la guarda una sola vez.
function claveNueva() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  const h = () => Math.floor(Math.random() * 0x10000).toString(16).padStart(4, '0');
  return `${h()}${h()}-${h()}-4${h().slice(1)}-a${h().slice(1)}-${h()}${h()}${h()}`;
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
// si el puntaje entra (sin esperar a la red). De paso sube lo pendiente.
export function precargar() {
  subirPendientes().catch(() => {}).then(() => leerTabla()).catch(() => {});
}

// ¿Este puntaje entra en la tabla?
export async function entraEnTabla(puntaje) {
  if (puntaje <= 0) return false;
  const t = ultima && Date.now() - ultima.momento < VIGENCIA_MS ? ultima.lista : await leerTabla();
  return t.length < TAMANO_TABLA || puntaje > t[t.length - 1].puntaje;
}

// Anota una partida (en línea y, por las dudas, en el aparato). Devuelve el
// puesto (1 = el mejor) y si quedó en la tabla en línea o sólo en el aparato.
// Si no se pudo subir (sin internet, o muchos guardando a la vez), queda
// PENDIENTE y se vuelve a intentar al empezar la próxima partida.
export async function anotar(nombre, puntaje, rondas) {
  const e = { nombre, puntaje, rondas, fecha: Date.now() };
  const t = ordenar([...leerLocal(), e]).slice(0, TAMANO_TABLA);
  try { localStorage.setItem(CLAVE_TABLA, JSON.stringify(t)); } catch (err) { /* modo privado */ }
  const p = { nombre, puntaje, rondas, clave: claveNueva() };
  for (let intento = 0; ; intento++) {
    try {
      const puesto = await subir(p);
      ultima = null;
      return { puesto, enLinea: true };
    } catch (err) {
      const motivo = err.motivo || '';
      if (/imposible/.test(motivo)) break;                             // no tiene arreglo
      if (/demasiadas/.test(motivo) && intento === 0) { await esperar(2500); continue; }   // mucha gente a la vez
      guardarPendiente(p);
      break;
    }
  }
  return { puesto: t.indexOf(e) + 1, enLinea: false };
}

function subir(p) {
  return rpc('anotar_record', { p_nombre: p.nombre, p_puntaje: p.puntaje, p_rondas: p.rondas, p_clave: p.clave },
    ESPERA_ANOTAR_MS);
}

function leerPendientes() {
  try {
    const v = JSON.parse(localStorage.getItem(CLAVE_PENDIENTES));
    return Array.isArray(v) ? v.filter(p => p && typeof p.puntaje === 'number' && p.clave) : [];
  } catch (e) { return []; }
}

function guardarPendientes(lista) {
  try { localStorage.setItem(CLAVE_PENDIENTES, JSON.stringify(lista.slice(-MAX_PENDIENTES))); } catch (e) { /* nada */ }
}

function guardarPendiente(p) { guardarPendientes([...leerPendientes().filter(o => o.clave !== p.clave), p]); }

export function hayPendientes() { return leerPendientes().length > 0; }

// Sube lo que quedó pendiente (de a uno; si falla por la red, se deja para después)
let subiendo = null;
export function subirPendientes() {
  if (subiendo) return subiendo;
  subiendo = (async () => {
    for (const p of leerPendientes()) {
      try {
        await subir(p);
      } catch (err) {
        if (!/imposible/.test(err.motivo || '')) break;             // sin red o muy ocupada: más tarde
      }
      guardarPendientes(leerPendientes().filter(o => o.clave !== p.clave));
      ultima = null;
    }
  })().finally(() => { subiendo = null; });
  return subiendo;
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
