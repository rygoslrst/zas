// ============================================================================
//  tabla.js — la tabla de récords: los 10 mejores puntajes de este aparato
// ----------------------------------------------------------------------------
//  Se guarda en el aparato (localStorage): en el stand, la tabla es la de
//  todos los que jugaron ahí; en un celular, la de su dueño y sus amigos.
//  Las funciones son async para poder cambiarla por una tabla en línea sin
//  tocar la interfaz.
// ============================================================================

import { CLAVE_TABLA, CLAVE_NOMBRE } from './config.js';

export const TAMANO_TABLA = 10;
export const LARGO_NOMBRE = 10;

function leerLocal() {
  try {
    const v = JSON.parse(localStorage.getItem(CLAVE_TABLA));
    return Array.isArray(v) ? v.filter(e => e && typeof e.puntaje === 'number') : [];
  } catch (e) { return []; }
}

function ordenar(lista) {
  return lista.sort((a, b) => b.puntaje - a.puntaje || b.rondas - a.rondas || a.fecha - b.fecha);
}

export async function leerTabla() { return ordenar(leerLocal()).slice(0, TAMANO_TABLA); }

// ¿Este puntaje entra en la tabla?
export async function entraEnTabla(puntaje) {
  if (puntaje <= 0) return false;
  const t = await leerTabla();
  return t.length < TAMANO_TABLA || puntaje > t[t.length - 1].puntaje;
}

// Anota una partida; devuelve el puesto (1 = el mejor) o 0 si no entró.
export async function anotar(nombre, puntaje, rondas) {
  const e = { nombre, puntaje, rondas, fecha: Date.now() };
  const t = ordenar([...leerLocal(), e]).slice(0, TAMANO_TABLA);
  try { localStorage.setItem(CLAVE_TABLA, JSON.stringify(t)); } catch (err) { /* modo privado */ }
  return t.indexOf(e) + 1;
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
//  se ve en el stand del colegio: si el nombre trae una grosería, va "JUGADOR".
// --------------------------------------------------------------------------
// Dentro de cualquier palabra, y sólo como palabra entera (para no rechazar
// nombres como PENÉLOPE o PICOLO)
const EN_CUALQUIER_LADO = ['PUTA', 'PUTO', 'MIERDA', 'CULIA', 'CTM', 'CHUCHA', 'WEON', 'HUEON', 'HUEVON',
  'AWEON', 'MARICON', 'MARACO', 'VERGA', 'PICHULA', 'ZORRA', 'NAZI', 'CABRON', 'PENDEJ', 'POLLA', 'QLO'];
const PALABRA_ENTERA = ['CULO', 'CONCHA', 'PENE', 'PICO', 'PERRA', 'CACA', 'SEXO', 'CONO', 'JOTO',
  'NALGA', 'TETA', 'TETAS', 'CHUPA', 'CHUPALA'];

const sinTildes = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const deNumeros = s => s.replace(/0/g, 'O').replace(/1/g, 'I').replace(/3/g, 'E').replace(/4/g, 'A')
  .replace(/5/g, 'S').replace(/7/g, 'T').replace(/@/g, 'A');

export function limpiarNombre(texto) {
  const n = String(texto || '').toUpperCase().replace(/[^A-ZÁÉÍÓÚÑÜ0-9 ]/g, '').replace(/\s+/g, ' ')
    .trim().slice(0, LARGO_NOMBRE).trim();
  if (!n) return '';
  const palabras = deNumeros(sinTildes(n)).split(' ');
  const junto = palabras.join('');
  if (EN_CUALQUIER_LADO.some(g => junto.includes(g)) || palabras.some(w => PALABRA_ENTERA.includes(w))) return 'JUGADOR';
  return n;
}
