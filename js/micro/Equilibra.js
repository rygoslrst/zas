// ¡EQUILIBRA! — Una pelota sobre un tablón. Mantén presionado el lado
// izquierdo o el derecho de la pantalla para inclinarlo hacia ese lado; la
// pelota rueda hacia abajo. Hay que aguantar sin que se caiga. Desde el nivel
// 2, el viento la empuja; en el 3, el tablón es más corto.
import { Micro } from '../escenas/Micro.js';
import { COLOR } from '../config.js';

const INCLINACION = 0.28;         // radianes (unos 16°) con el lado apretado
const RADIO = 34;

export class Equilibra extends Micro {
  static ORDEN = '¡EQUILIBRA!';
  static CONTROL = 'mantener';
  static GANA_AL_FINAL = true;

  armar() {
    this.tema('escenario');
    this.px = this.cx;
    this.py = this.cy + 150;
    this.largo = [400, 360, 320][this.nivel - 1];
    // El pie: un triángulo sobre una base
    const g = this.add.graphics();
    g.fillStyle(COLOR.OSCURO, 0.3).fillEllipse(this.px, this.py + 132, 220, 30);
    g.fillStyle(0x6b7280, 1).fillTriangle(this.px, this.py + 4, this.px - 70, this.py + 124, this.px + 70, this.py + 124);
    g.fillStyle(0x9ca3af, 1).fillTriangle(this.px, this.py + 4, this.px - 20, this.py + 124, this.px + 22, this.py + 124);
    g.fillStyle(0x374151, 1).fillRoundedRect(this.px - 100, this.py + 118, 200, 18, 6);
    // El tablón (gira alrededor del pie)
    this.tablon = this.add.container(this.px, this.py);
    this.tablon.add([
      this.rect(0, 0, this.largo + 8, 26, COLOR.OSCURO),
      this.rect(0, 0, this.largo, 18, 0xc98a52),
      this.rect(0, -5, this.largo, 4, 0xe8b27a),
      this.rect(-this.largo / 2 + 6, -16, 12, 16, 0xff4d5a),
      this.rect(this.largo / 2 - 6, -16, 12, 16, 0xff4d5a),
    ]);
    this.pelota = this.emoji('pelota', this.px, this.py - 40, RADIO * 2);
    // Flechas a los costados: cada mitad de la pantalla inclina hacia su lado
    this.flechas = [
      this.add.image(52, this.py - 10, 'atlas', 'flecha').setDisplaySize(70, 70).setAngle(180).setTint(0xffffff).setAlpha(0.35),
      this.add.image(this.W - 52, this.py - 10, 'atlas', 'flecha').setDisplaySize(70, 70).setTint(0xffffff).setAlpha(0.35),
    ];
    // Arranca un poco corrida y rodando hacia afuera: hay que corregir enseguida
    this.s = (Math.random() < 0.5 ? -1 : 1) * this.azar(15, 35);
    this.v = Math.sign(this.s) * this.azar(35, 60);
    this.angulo = 0;
    this.lado = 0;
    this.fase = this.azar(0, 6);
    this.alTocar(x => { this.lado = x < this.cx ? -1 : 1; });
    this.alMover((x, y, p) => { if (p.isDown) this.lado = x < this.cx ? -1 : 1; });
    this.input.on('pointerup', () => { this.lado = 0; });
    this.input.on('pointerupoutside', () => { this.lado = 0; });
  }

  alGanar() { this.cartel(this.cx, this.cy - 150, '¡QUÉ EQUILIBRIO!', COLOR.ORO, 56); }

  paso(dt, t) {
    if (this.resultado === 'perdio') return;
    const k = Math.sqrt(this.vel);
    // Sin apretar nada, el tablón se va hacia el lado donde está la pelota (el
    // más pesado): quedarse quieto no sirve, hay que equilibrar
    const solo = Math.max(-1, Math.min(1, this.s / 80)) * INCLINACION * 0.8;
    const objetivo = this.lado ? this.lado * INCLINACION : solo;
    this.angulo += (objetivo - this.angulo) * Math.min(1, dt * 6);
    // La pelota rueda hacia el lado más bajo; desde el nivel 2, además, viento
    const viento = Math.sin(t * 1.7 + this.fase) * [0, 70, 110][this.nivel - 1];
    this.v += (Math.sin(this.angulo) * 950 + viento) * k * dt;
    this.v *= 1 - 0.35 * dt;
    this.s += this.v * dt;
    const c = Math.cos(this.angulo), sn = Math.sin(this.angulo);
    this.tablon.setRotation(this.angulo);
    this.pelota.setPosition(this.px + c * this.s + sn * (RADIO + 13), this.py + sn * this.s - c * (RADIO + 13))
      .setAngle(this.pelota.angle + (this.v * dt / RADIO) * 57.3);
    for (const [i, f] of this.flechas.entries()) f.setAlpha(this.lado === (i ? 1 : -1) ? 0.9 : 0.35);
    // ¿Se cayó por una punta?
    if (!this.decidido && Math.abs(this.s) > this.largo / 2) {
      this.perder();
      this.audio.golpe();
      this.tweens.add({ targets: this.pelota, y: this.H + 80, x: this.pelota.x + Math.sign(this.s) * 80, duration: 600, ease: 'Quad.easeIn' });
      this.cartel(this.cx, this.cy - 150, '¡SE CAYÓ!', COLOR.MAL, 60);
    }
  }
}
