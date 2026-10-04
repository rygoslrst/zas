// ============================================================================
//  indice.js — la lista de microjuegos
// ----------------------------------------------------------------------------
//  Para sumar uno: crear su archivo en esta carpeta (ver js/escenas/Micro.js)
//  e importarlo acá. El Director los mezcla y los va sacando sin repetir.
// ============================================================================

import { Reventa } from './Reventa.js';
import { Aplasta } from './Aplasta.js';
import { Distinto } from './Distinto.js';
import { NoToques } from './NoToques.js';
import { Cuantos } from './Cuantos.js';
import { Frena } from './Frena.js';
import { Salta } from './Salta.js';
import { Atrapa } from './Atrapa.js';
import { Esquiva } from './Esquiva.js';
import { Comer } from './Comer.js';
import { Corta } from './Corta.js';
import { Patea } from './Patea.js';
import { Infla } from './Infla.js';
import { Llena } from './Llena.js';
import { Pesca } from './Pesca.js';
import { Foto } from './Foto.js';
import { Vuela } from './Vuela.js';
import { Cable } from './Cable.js';
import { Suma } from './Suma.js';
import { Grande } from './Grande.js';
import { Orden } from './Orden.js';
import { Limpia } from './Limpia.js';
import { Ritmo } from './Ritmo.js';
import { Memoria } from './Memoria.js';
import { Despega } from './Despega.js';
import { Duelo } from './Duelo.js';
import { Flechas } from './Flechas.js';
import { Sigue } from './Sigue.js';
import { Simon } from './Simon.js';
import { Torta } from './Torta.js';
import { Colores } from './Colores.js';
import { Ataja } from './Ataja.js';
import { Ruleta } from './Ruleta.js';
import { Carrera } from './Carrera.js';
import { Rebota } from './Rebota.js';
import { Cruza } from './Cruza.js';
import { Encesta } from './Encesta.js';
import { Equilibra } from './Equilibra.js';
import { Encaja } from './Encaja.js';
import { Sopla } from './Sopla.js';
import { Vasos } from './Vasos.js';
import { Honda } from './Honda.js';
import { Marciano } from './Marciano.js';
import { Manivela } from './Manivela.js';
import { Lazo } from './Lazo.js';
import { Pulpo } from './Pulpo.js';
import { Puertas } from './Puertas.js';
import { Separa } from './Separa.js';
import { Traza } from './Traza.js';
import { Puntillas } from './Puntillas.js';
import { Grua } from './Grua.js';
import { Cuerda } from './Cuerda.js';
import { Fuego } from './Fuego.js';
import { Pedalea } from './Pedalea.js';
import { Dardo } from './Dardo.js';
import { Une } from './Une.js';
import { Revuelve } from './Revuelve.js';
import { Carril } from './Carril.js';
import { Apila } from './Apila.js';
import { Laberinto } from './Laberinto.js';
import { Agita } from './Agita.js';
import { Puente } from './Puente.js';
import { Boxeo } from './Boxeo.js';
import { Tira } from './Tira.js';

export const MICROS = [
  // tocar
  Reventa, Aplasta, Distinto, NoToques, Cuantos, Frena, Salta, Pesca, Foto, Vasos, Vuela, Suma, Grande, Orden,
  Ritmo, Memoria, Duelo, Colores, Ataja, Ruleta, Rebota, Cruza, Dardo, Apila,
  // arrastrar
  Atrapa, Esquiva, Comer, Limpia, Sigue, Honda, Encaja, Separa, Traza, Puntillas, Fuego, Une, Laberinto,
  // deslizar
  Corta, Patea, Cable, Flechas, Encesta, Puertas, Cuerda, Carril,
  // machacar y mantener
  Infla, Llena, Grua, Despega, Equilibra, Sopla, Pedalea, Puente,
  // girar en círculos, dibujar un lazo y sacudir
  Manivela, Lazo, Revuelve, Agita,
];

// Jefes: el 8.º microjuego y después cada 12, uno de estos (más largo; si lo
// ganas, vida extra)
export const JEFES = [Simon, Torta, Carrera, Marciano, Pulpo, Boxeo, Tira];
