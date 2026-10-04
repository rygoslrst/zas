// JEFE — ¡NOQUEA AL PANDA! Un ring de box, visto desde los ojos del jugador
// (abajo, sus guantes). El panda se cubre y, de a ratos, carga un puñetazo:
// echa el guante atrás, el guante parpadea en rojo y suena un "uuuh". Hay
// que tocar la pantalla JUSTO antes de que pegue para esquivar (hacia el lado
// que se toca). Si el golpe no da, el panda queda mareado un momento: cada
// toque es un golpe nuestro. Tres puñetazos recibidos y perdiste. Tocar
// cuando no hace falta gasta el esquive (y hay un instante sin poder volver a
// esquivar). En el nivel 3, a veces amaga: carga y no pega.
import { Micro } from '../escenas/Micro.js';
import { COLOR } from '../config.js';

const ESQUIVE = 0.5;              // segundos que dura el esquive
const RECUPERA = 0.25;            // y después, un ratito sin poder volver a esquivar
const CADA_PINA = 0.12;           // segundos entre golpe y golpe nuestro
const VIAJE = 0.1;                // lo que tarda el puñetazo en llegar

// Un guante de box (el emoji de guante es de lana): se dibuja una vez, a
// 240 x 280, mirando hacia arriba, con el pulgar a la izquierda. Los del
// panda, rojos; los nuestros, azules.
const GUANTES = { guanteRojo: [0xe63946, 0xb5162a, 0xff8a95], guanteAzul: [0x3d8bff, 0x1d5bd8, 0x9cc4ff] };
function guanteDeBox(escena, clave) {
  if (escena.textures.exists(clave)) return;
  const [ROJO, OSCURO, CLARO] = GUANTES[clave];
  const g = escena.make.graphics({ add: false }), o = 0x1b1030;
  g.fillStyle(o, 1).fillRoundedRect(52, 182, 136, 92, 26);                 // el puño (borde)
  g.fillStyle(o, 1).fillEllipse(128, 112, 196, 212);
  g.fillStyle(o, 1).fillEllipse(48, 150, 84, 124);                         // el pulgar (borde)
  g.fillStyle(ROJO, 1).fillEllipse(128, 112, 180, 196);
  g.fillStyle(ROJO, 1).fillEllipse(50, 150, 68, 108);
  g.fillStyle(OSCURO, 1).fillEllipse(140, 168, 150, 70);                 // sombra abajo
  g.fillStyle(ROJO, 1).fillEllipse(128, 120, 168, 150);
  g.fillStyle(CLARO, 1).fillEllipse(96, 70, 70, 40);                    // brillo
  g.fillStyle(0xf1faee, 1).fillRoundedRect(60, 196, 120, 72, 20);          // el puño de tela
  g.fillStyle(0xd6d9e0, 1).fillRect(60, 214, 120, 10).fillRect(60, 240, 120, 10);
  g.generateTexture(clave, 240, 280);
  g.destroy();
}

export class Boxeo extends Micro {
  static ORDEN = '¡NOQUEA AL PANDA!';
  static ICONO = 'musculo';          // en la galería
  static CONTROL = 'tocar';
  static PULSOS = 24;
  static JEFE = true;
  static RETRATO = 'panda';
  static NOMBRE_JEFE = 'EL PANDA BOXEADOR';
  // Se congela cuando el primer puñetazo está por salir: el toque que
  // descongela es el esquive (ver Director.revisarLeccion)
  static LECCION = {
    titulo: '¡TOCA PARA ESQUIVAR EL PUÑETAZO!', sub: 'SI NO TE DA, SE MAREA: ¡AHÍ TOCA RÁPIDO PARA PEGARLE!',
    gesto: 'tocar', lugar: 'medio', listo: m => m.estadoP === 'carga' && !m.amago && m.t >= m.tFin - 0.25,
    objetivo: m => ({ x: m.cx - m.lado * 170, y: m.yGuantes - 40 }),
  };

  armar() {
    this.tema('escenario');
    const k = 1 / Math.pow(this.vel, 0.35);
    this.tiempos = {
      guardia: [1.0, 0.85, 0.7][this.nivel - 1] * k,
      carga: [0.85, 0.7, 0.58][this.nivel - 1] * k,
      mareo: [1.4, 1.2, 1.05][this.nivel - 1] * k,
    };
    this.vidaMax = [12, 14, 15][this.nivel - 1];
    this.vida = this.vidaMax;
    // El ring: la lona, las cuerdas del fondo y los postes
    this.yPanda = Math.max(this.arriba + 260, this.cy - 150);
    const yLona = this.yPanda + 40;
    const g = this.add.graphics();
    g.fillStyle(0x3d8bff, 1).fillRect(0, yLona, this.W, this.H);
    g.fillStyle(0x6fb1ff, 1).fillRect(0, yLona, this.W, 14);
    g.fillStyle(0xffffff, 0.12);
    for (let y = yLona + 60; y < this.H; y += 80) g.fillRect(0, y, this.W, 6);
    for (const [dy, c] of [[-150, 0xff4d5a], [-100, 0xffffff], [-50, 0x2f7dff]]) {
      g.fillStyle(COLOR.OSCURO, 1).fillRect(0, yLona + dy - 6, this.W, 12);
      g.fillStyle(c, 1).fillRect(0, yLona + dy - 4, this.W, 8);
    }
    for (const x of [16, this.W - 16]) {
      g.fillStyle(COLOR.OSCURO, 1).fillRect(x - 13, yLona - 190, 26, 200);
      g.fillStyle(0xd9dde3, 1).fillRect(x - 9, yLona - 186, 18, 192);
    }
    this.vineta(0.35);
    // El panda y sus guantes
    this.sombra(this.cx, yLona + 30, 240, 0.35);
    this.panda = this.emoji('panda', this.cx, this.yPanda, 230);
    guanteDeBox(this, 'guanteRojo');
    guanteDeBox(this, 'guanteAzul');
    const guante = (clave, x, y, tam) => this.add.image(x, y, clave).setDisplaySize(tam * 0.86, tam);
    this.guantesP = [-1, 1].map(l => guante('guanteRojo', this.cx + l * 105, this.yPanda + 100, 110).setFlipX(l > 0).setDepth(2));
    this.estrellas = this.emoji('estrellitas', this.cx, this.yPanda - 130, 100).setVisible(false).setDepth(3);
    // Nuestros guantes, abajo
    this.yGuantes = this.bajo - 70;
    this.mios = [-1, 1].map(l => guante('guanteAzul', this.cx + l * 150, this.yGuantes, 160).setFlipX(l < 0).setAngle(l * 20).setDepth(5));
    // Corazones (los nuestros) y la vida del panda
    this.vidas = [0, 1, 2].map(i => this.emoji('corazon', 40 + i * 46, this.arriba + 60, 40).setDepth(6));
    this.rect(this.cx + 50, this.arriba + 60, 304, 26, COLOR.OSCURO, 0.8).setDepth(6);
    this.barra = this.rect(this.cx + 50 - 148, this.arriba + 60, 296, 18, 0x3ddc84).setOrigin(0, 0.5).setDepth(6);
    this.golpes = 0;
    this.estadoP = 'guardia';       // guardia · carga · golpe · mareado
    this.tFin = 0.9;
    this.lado = 1;
    this.amago = false;
    this.esquiveHasta = -1;
    this.recuperaHasta = -1;
    this.proximaPina = 0;
    this.mano = 0;
    this.alTocar(x => this.tocar(x));
  }

  tocar(x) {
    const t = this.t;
    if (this.estadoP === 'mareado') {
      if (t >= this.proximaPina) { this.proximaPina = t + CADA_PINA; this.pegar(); }
      return;
    }
    if (t < this.recuperaHasta) return;
    // Esquiva hacia el lado que se tocó (si fue en el medio, lejos del guante que viene)
    const lado = x < this.cx - 60 ? -1 : x > this.cx + 60 ? 1 : -this.lado;
    this.esquiveHasta = t + ESQUIVE;
    this.recuperaHasta = t + ESQUIVE + RECUPERA;
    this.audio.aleteo();
    this.mios.forEach((g, i) => {
      this.tweens.killTweensOf(g);
      g.setPosition(this.cx + (i ? 150 : -150), this.yGuantes);
      this.tweens.add({ targets: g, x: g.x + lado * 170, duration: 90, yoyo: true, hold: (ESQUIVE - 0.2) * 1000 });
    });
  }

  pegar() {
    const i = this.mano, g = this.mios[i];
    this.mano = 1 - i;
    this.tweens.killTweensOf(g);
    g.setPosition(this.cx + (i ? 150 : -150), this.yGuantes);
    this.tweens.add({ targets: g, x: this.cx + (i ? 40 : -40), y: this.yPanda + 30, duration: 60, yoyo: true });
    this.vida--;
    this.barra.displayWidth = 296 * Math.max(0, this.vida / this.vidaMax);
    this.barra.setTint(this.vida / this.vidaMax < 0.3 ? COLOR.MAL : 0x3ddc84);
    this.audio.patada();
    this.panda.setTint(0xff9a9a);
    this.time.delayedCall(70, () => this.panda.clearTint());
    this.chispas(this.cx + (i ? 30 : -30), this.yPanda + 10, 5, COLOR.ORO, 0.7);
    if (this.vida <= 0) this.noquear();
  }

  noquear() {
    this.ganar();
    this.audio.campana(3);
    this.estrellas.setVisible(true);
    this.tweens.add({ targets: this.panda, angle: -95, y: this.yPanda + 90, x: this.cx - 40, duration: 520, ease: 'Quad.easeIn' });
    this.guantesP.forEach((g, i) => this.tweens.add({ targets: g, y: this.yPanda + 170, x: g.x + (i ? 60 : -60), angle: i ? 80 : -80, duration: 520, ease: 'Quad.easeIn' }));
    this.confeti(this.cx, this.cy - 80, 30);
    this.cartel(this.cx, this.cy - 40, '¡K.O.!', COLOR.ORO, 110);
  }

  // El puñetazo llegó: ¿estábamos esquivando?
  impacto(t) {
    const T = this.tiempos;
    if (t < this.esquiveHasta) {
      this.estadoP = 'mareado';
      this.tFin = t + T.mareo;
      this.estrellas.setVisible(true);
      this.audio.salto();
      this.cartel(this.cx, this.yPanda + 240, '¡PÉGALE!', COLOR.ORO, 60);
      return;
    }
    this.golpes++;
    this.audio.golpe();
    this.destello(COLOR.MAL, 0.8);
    this.cameras.main.shake(220, 0.02);
    const c = this.vidas[3 - this.golpes];
    if (c) c.setTexture('emoji', 'corazon_negro');
    if (this.golpes >= 3) {
      this.perder();
      this.mios.forEach(g => this.tweens.add({ targets: g, y: this.H + 120, angle: g.angle * 3, duration: 500, ease: 'Quad.easeIn' }));
      this.cartel(this.cx, this.cy - 40, '¡TE NOQUEÓ!', COLOR.MAL, 64);
      return;
    }
    this.estadoP = 'guardia';
    this.tFin = t + T.guardia * this.azar(0.7, 1.3);
  }

  paso(dt, t) {
    if (this.estrellas.visible) this.estrellas.setPosition(this.panda.x, this.panda.y - 130).setAngle(t * 300);
    if (this.decidido) return;
    const T = this.tiempos;
    const g = this.guantesP[this.lado > 0 ? 1 : 0];
    switch (this.estadoP) {
      case 'guardia':
        this.panda.setPosition(this.cx + Math.sin(t * 3) * 14, this.yPanda + Math.sin(t * 6) * 4).setAngle(Math.sin(t * 3) * 3);
        this.guantesP.forEach((o, i) => o.setPosition(this.panda.x + (i ? 105 : -105), this.yPanda + 100 + Math.sin(t * 6 + i * 2) * 8)
          .setDisplaySize(95, 110).setAngle(0).clearTint());
        if (t >= this.tFin) {
          this.lado = Math.random() < 0.5 ? -1 : 1;
          this.amago = this.nivel >= 3 && Math.random() < 0.3;
          this.estadoP = 'carga';
          this.tIni = t;
          this.tFin = t + T.carga;
          this.audio.carga();
        }
        break;
      case 'carga': {
        // El guante se echa atrás y parpadea en rojo; el panda se inclina
        const f = Math.min(1, (t - this.tIni) / T.carga);
        g.setPosition(this.panda.x + this.lado * (105 + 60 * f), this.yPanda + 100 - 50 * f).setDisplaySize((110 + 20 * f) * 0.86, 110 + 20 * f);
        g.setTint(Math.floor(t * 12) % 2 ? 0xff6b6b : 0xffffff);
        this.panda.setAngle(-this.lado * 9 * f);
        if (t >= this.tFin) {
          if (this.amago) { this.estadoP = 'guardia'; this.tFin = t + 0.35; }
          else { this.estadoP = 'golpe'; this.tIni = t; this.tFin = t + VIAJE; this.desde = { x: g.x, y: g.y }; this.audio.zas(); }
        }
        break;
      }
      case 'golpe': {
        // El guante viene hacia la pantalla
        const f = Math.min(1, (t - this.tIni) / VIAJE);
        g.setPosition(this.desde.x + (this.cx + this.lado * 20 - this.desde.x) * f, this.desde.y + (this.yGuantes - 140 - this.desde.y) * f)
          .setDisplaySize((130 + 200 * f) * 0.86, 130 + 200 * f).clearTint();
        this.panda.setAngle(this.lado * 6 * f);
        if (t >= this.tFin) this.impacto(t);
        break;
      }
      case 'mareado':
        // Tambalea, con los guantes caídos
        this.panda.setPosition(this.cx + Math.sin(t * 5) * 22, this.yPanda + 10).setAngle(Math.sin(t * 5) * 9);
        this.guantesP.forEach((o, i) => o.setPosition(this.panda.x + (i ? 125 : -125), this.yPanda + 160).setDisplaySize(86, 100).setAngle(i ? 30 : -30).clearTint());
        if (t >= this.tFin) {
          this.estadoP = 'guardia';
          this.tFin = t + T.guardia * this.azar(0.7, 1.3);
          this.estrellas.setVisible(false);
        }
        break;
    }
  }
}
