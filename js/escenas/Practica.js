// ============================================================================
//  Practica.js — la práctica guiada de la primera partida
// ----------------------------------------------------------------------------
//  Tres microjuegos lentos, uno por gesto (tocar, arrastrar, deslizar). En el
//  momento justo el juego se CONGELA: aparece un cartel que explica y una mano
//  que hace el gesto sobre el objeto. El primer toque del jugador lo
//  descongela (y además cuenta como jugada). Como en FUGA: se aprende jugando.
//
//  En la práctica no se pierden vidas: si sale mal, se repite una vez.
//  El Director la corre sola la primera vez en cada aparato, y cuando se
//  toca "Cómo jugar" en el título. Se puede saltar con el botón de arriba.
// ============================================================================

import { ANCHO, COLOR } from '../config.js';

export const VEL_PRACTICA = 0.85;      // un poco más lento que la partida

// Cada lección: qué microjuego, qué gesto muestra la mano, dónde va el cartel,
// cuándo congelar (listo) y sobre qué objeto se hace el gesto (objetivo).
export const LECCIONES = [
  {
    micro: 'Reventa', gesto: 'tocar', lugar: 'arriba', mecha: true,
    titulo: '¡CUMPLE LA ORDEN!',
    sub: 'TOCA LOS GLOBOS ANTES DE QUE SE QUEME LA MECHA',
    listo: () => true,
    objetivo: m => { const g = m.globos.find(o => o.vivo); return g ? { x: g.x, y: g.y - 12 } : null; },
  },
  {
    micro: 'Atrapa', gesto: 'arrastrar', lugar: 'medio',
    titulo: 'ALGUNOS SE JUEGAN ARRASTRANDO',
    sub: 'MUEVE LA CANASTA CON EL DEDO Y ATRAPA LA COMIDA',
    listo: m => m.caen[0].estado === 'cae' && m.caen[0].y > 90,
    objetivo: m => ({ x: m.canasta.x, y: m.cy0 }),
  },
  {
    micro: 'Corta', gesto: 'deslizar', lugar: 'arriba',
    titulo: 'OTROS SE JUEGAN DESLIZANDO',
    sub: 'PASA EL DEDO RÁPIDO POR ENCIMA DE LA FRUTA',
    listo: m => m.frutas[0].estado === 'vuela' && m.frutas[0].vy > -260,
    objetivo: m => ({ x: m.frutas[0].x, y: m.frutas[0].y }),
  },
];

// El cartel de la lección: un velo suave sobre el juego, una tarjeta oscura con
// la explicación y, en la primera, una flecha que señala la mecha.
export class CartelLeccion {
  constructor(escena) {
    this.e = escena;
    this.velo = escena.add.image(0, 0, 'atlas', 'blanco').setOrigin(0).setTint(COLOR.OSCURO).setDepth(24);
    this.grupo = escena.add.container(0, 0).setDepth(36);
    this.caja = escena.add.graphics();
    this.titulo = escena.add.bitmapText(0, 0, 'anton', '', 46).setOrigin(0.5).setCenterAlign().setMaxWidth(430);
    this.sub = escena.add.bitmapText(0, 0, 'anton', '', 30).setOrigin(0.5).setCenterAlign().setMaxWidth(430)
      .setTint(COLOR.ORO);
    this.grupo.add([this.caja, this.titulo, this.sub]);
    this.flecha = escena.add.image(0, 0, 'atlas', 'flecha').setDisplaySize(84, 84).setAngle(90)
      .setTint(COLOR.ORO).setDepth(37);
    this.partes = [this.velo, this.grupo, this.flecha];
    for (const p of this.partes) p.setVisible(false);
  }

  mostrar(lec, alto, mechaY) {
    const e = this.e;
    e.tweens.killTweensOf(this.partes);
    this.velo.setDisplaySize(ANCHO, alto).setVisible(true).setAlpha(0);
    e.tweens.add({ targets: this.velo, alpha: 0.35, duration: 160 });
    // La tarjeta se arma a la medida del texto
    this.titulo.setText(lec.titulo);
    this.sub.setText(lec.sub);
    const hT = this.titulo.height, hS = this.sub.height, pad = 26, gap = 12;
    const w = 480, h = pad * 2 + hT + gap + hS;
    this.caja.clear()
      .fillStyle(COLOR.OSCURO, 0.35).fillRoundedRect(-w / 2 + 6, -h / 2 + 10, w, h, 26)
      .fillStyle(COLOR.OSCURO, 0.94).fillRoundedRect(-w / 2, -h / 2, w, h, 26)
      .lineStyle(5, COLOR.ORO, 1).strokeRoundedRect(-w / 2, -h / 2, w, h, 26);
    this.titulo.setPosition(0, -h / 2 + pad + hT / 2);
    this.sub.setPosition(0, h / 2 - pad - hS / 2);
    // (sin salirse por arriba en las pantallas bajas)
    const y = Math.max(h / 2 + 24, lec.lugar === 'medio' ? alto / 2 - 40 : alto / 2 - 270);
    this.grupo.setPosition(ANCHO / 2, y).setVisible(true).setAlpha(1).setScale(0.6).setAngle(-3);
    e.tweens.add({ targets: this.grupo, scale: 1, angle: 0, duration: 260, ease: 'Back.easeOut' });
    // En la primera lección, la flecha apunta a la mecha
    this.mechaY = mechaY;
    this.flecha.setVisible(!!lec.mecha).setAlpha(1).setPosition(ANCHO / 2 + 40, mechaY - 70);
  }

  animar(ms) {
    if (this.flecha.visible) this.flecha.y = this.mechaY - 70 - Math.abs(Math.sin(ms / 170)) * 18;
  }

  ocultar() {
    const e = this.e;
    e.tweens.killTweensOf(this.partes);
    e.tweens.add({
      targets: this.partes, alpha: 0, duration: 140,
      onComplete: () => { for (const p of this.partes) p.setVisible(false); },
    });
  }
}
