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
import { Topo } from './Topo.js';
import { Vuela } from './Vuela.js';
import { Cable } from './Cable.js';
import { Suma } from './Suma.js';
import { Grande } from './Grande.js';
import { Orden } from './Orden.js';
import { Limpia } from './Limpia.js';
import { Avanza } from './Avanza.js';
import { Apila } from './Apila.js';
import { Memoria } from './Memoria.js';
import { Despega } from './Despega.js';
import { Duelo } from './Duelo.js';
import { Flechas } from './Flechas.js';
import { Sigue } from './Sigue.js';
import { Simon } from './Simon.js';
import { Torta } from './Torta.js';

export const MICROS = [
  // tocar
  Reventa, Aplasta, Distinto, NoToques, Cuantos, Frena, Salta, Pesca, Foto, Topo, Vuela, Suma, Grande, Orden,
  Apila, Memoria, Duelo,
  // arrastrar
  Atrapa, Esquiva, Comer, Limpia, Sigue,
  // deslizar
  Corta, Patea, Cable, Flechas,
  // machacar y mantener
  Infla, Llena, Avanza, Despega,
];

// Jefes: cada 12 microjuegos, uno de estos (más largo; si lo ganás, vida extra)
export const JEFES = [Simon, Torta];
