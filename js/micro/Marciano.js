// JEFE — ¡DERROTA AL MARCIANO! Arrastra la nave de lado a lado: dispara sola.
// El marciano va y viene y tira meteoros; con tres golpes, pierdes. Hay que
// bajarle toda la vida antes de que se acabe el tiempo. En cada nivel se mueve
// más rápido y tira más seguido; en el 3, de a dos meteoros.
import { Micro } from '../escenas/Micro.js';
import { COLOR } from '../config.js';

const CADENCIA = 0.25;            // segundos entre disparo y disparo
const TOCADO = 52;                // distancia a la que un meteoro le pega a la nave

export class Marciano extends Micro {
  static ORDEN = '¡DERROTA AL MARCIANO!';
  static CONTROL = 'arrastrar';
  static PULSOS = 24;
  static JEFE = true;
  static RETRATO = 'marciano';
  static NOMBRE_JEFE = 'EL MARCIANO';
  // La primera vez: el juego se congela y enseña (ver Director.revisarLeccion)
  static LECCION = {
    titulo: '¡MUEVE TU NAVE!', sub: 'DISPARA SOLA. ESQUIVA LOS METEOROS Y GÁNALE AL MARCIANO',
    gesto: 'arrastrar', lugar: 'medio', listo: () => true,
    objetivo: m => ({ x: m.nave.x, y: m.yNave }),
  };

  armar() {
    this.tema('noche');
    // Estrellas que pasan rápido: la nave avanza por el espacio
    this.fugaces = [];
    for (let i = 0; i < 18; i++) {
      this.fugaces.push(this.rect(this.azar(0, this.W), this.azar(0, this.H), 3, this.azar(14, 34), 0xffffff, this.azar(0.25, 0.6)));
    }
    const k = Math.sqrt(this.vel);
    // El marciano y su vida: una parte de los tiros posibles (un jugador
    // automático que esquiva perfecto acierta ~55 % en los niveles 1 y 2 y ~35 %
    // en el 3; una persona, menos)
    this.yJefe = this.arriba + 170;
    this.jefe = this.emoji('marciano', this.cx, this.yJefe, 140);
    this.vidaMax = Math.floor((this.dur / CADENCIA) * [0.36, 0.32, 0.25][this.nivel - 1]);
    this.vida = this.vidaMax;
    // La barra de vida, a la derecha de los corazones
    this.rect(this.cx + 50, this.arriba + 60, 304, 26, COLOR.OSCURO, 0.8);
    this.barra = this.rect(this.cx + 50 - 148, this.arriba + 60, 296, 18, 0x3ddc84).setOrigin(0, 0.5);
    this.wJefe = [1.0, 1.25, 1.45][this.nivel - 1] * k;
    // La nave
    this.yNave = this.bajo - 70;
    this.nave = this.emoji('cohete', this.cx, this.yNave, 96).setAngle(-45);
    this.fuego = this.emoji('fuego', this.cx, this.yNave + 56, 44).setAngle(180);
    this.objetivoX = this.cx;
    this.vidas = [0, 1, 2].map(i => this.emoji('corazon', 40 + i * 46, this.arriba + 60, 40));
    this.golpes = 0;
    this.invulnerable = -1;
    // Disparos y meteoros
    this.tiros = [];
    this.meteoros = [];
    this.proximoTiro = 0.3;
    this.cadaMeteoro = [1.0, 0.8, 0.68][this.nivel - 1] / k;
    this.proximoMeteoro = 1.0;
    this.rapidezMeteoro = [300, 350, 400][this.nivel - 1] * k;
    const mover = x => { this.objetivoX = Math.max(50, Math.min(this.W - 50, x)); };
    this.alMover(mover);
    this.alTocar(mover);
  }

  alPerder() {
    this.nave.setTexture('emoji', 'explosion').setDisplaySize(150, 150).setAngle(0);
    this.fuego.setVisible(false);
    this.cartel(this.cx, this.cy - 40, '¡TE DERRIBÓ!', COLOR.MAL, 60);
  }

  paso(dt, t) {
    for (const f of this.fugaces) { f.y += 500 * dt; if (f.y > this.H + 20) { f.y = -20; f.x = this.azar(0, this.W); } }
    if (this.decidido) return;
    // La nave sigue al dedo
    this.nave.x += (this.objetivoX - this.nave.x) * Math.min(1, dt * 16);
    this.fuego.setPosition(this.nave.x, this.yNave + 56 + Math.sin(t * 40) * 3).setAlpha(0.8 + Math.random() * 0.2);
    this.nave.setAlpha(t < this.invulnerable && Math.floor(t * 14) % 2 ? 0.35 : 1);
    // El marciano va y viene (y se sacude cuando recibe un tiro)
    this.jefe.setPosition(this.cx + Math.sin(t * this.wJefe) * 175 + Math.sin(t * 3.1) * 20, this.yJefe + Math.sin(t * 2) * 14);
    // Dispara sola
    if (t >= this.proximoTiro) {
      this.proximoTiro = t + CADENCIA;
      this.tiros.push(this.rect(this.nave.x, this.yNave - 60, 7, 26, 0x7cf6ff));
      this.audio.toque();
    }
    for (const r of this.tiros) {
      if (!r.active) continue;
      r.y -= 950 * dt;
      if (Math.abs(r.x - this.jefe.x) < 62 && Math.abs(r.y - this.jefe.y) < 50) {
        r.destroy();
        this.vida--;
        this.barra.displayWidth = 296 * Math.max(0, this.vida / this.vidaMax);
        this.barra.setTint(this.vida / this.vidaMax < 0.3 ? COLOR.MAL : 0x3ddc84);
        this.chispas(this.jefe.x, this.jefe.y + 30, 4, 0x7cf6ff, 0.6);
        this.jefe.setTint(0xff9a9a);
        this.time.delayedCall(70, () => this.jefe.clearTint());
        if (this.vida <= 0) { this.derrotado(); return; }
      } else if (r.y < -40) r.destroy();
    }
    this.tiros = this.tiros.filter(r => r.active);
    // El marciano tira meteoros, un poco hacia donde está la nave
    if (t >= this.proximoMeteoro) {
      this.proximoMeteoro = t + this.cadaMeteoro * this.azar(0.8, 1.2);
      const n = this.nivel >= 3 && Math.random() < 0.5 ? 2 : 1;
      for (let i = 0; i < n; i++) {
        const x = this.jefe.x + (n === 2 ? (i ? 40 : -40) : 0);
        const destino = this.nave.x + this.azar(-90, 90) + (n === 2 ? (i ? 130 : -130) : 0);
        const tiempo = (this.yNave - this.yJefe) / this.rapidezMeteoro;
        const img = this.emoji('meteoro', x, this.yJefe + 50, 54).setAngle(135);
        this.meteoros.push({ img, vx: (destino - x) / tiempo, vy: this.rapidezMeteoro });
      }
    }
    for (const m of this.meteoros) {
      if (!m.img.active) continue;
      m.img.x += m.vx * dt;
      m.img.y += m.vy * dt;
      if (t >= this.invulnerable && Math.hypot(m.img.x - this.nave.x, m.img.y - this.yNave) < TOCADO) {
        m.img.destroy();
        this.golpe(t);
        if (this.decidido) return;
      } else if (m.img.y > this.H + 40) m.img.destroy();
    }
    this.meteoros = this.meteoros.filter(m => m.img.active);
  }

  golpe(t) {
    this.golpes++;
    this.invulnerable = t + 0.9;
    this.audio.golpe();
    this.cameras.main.shake(150, 0.01);
    const c = this.vidas[3 - this.golpes];
    if (c) c.setTexture('emoji', 'corazon_negro');
    if (this.golpes >= 3) this.perder();
  }

  derrotado() {
    this.ganar();
    this.audio.explosion();
    for (let i = 0; i < 5; i++) {
      this.time.delayedCall(i * 90, () => this.emoji('explosion', this.jefe.x + this.azar(-60, 60), this.jefe.y + this.azar(-40, 40), this.azar(90, 150)));
    }
    this.tweens.add({ targets: this.jefe, alpha: 0, scale: this.jefe.scaleX * 1.6, angle: 40, duration: 500 });
    this.confeti(this.cx, this.cy - 80, 30);
    this.cartel(this.cx, this.cy - 40, '¡MARCIANO DERROTADO!', COLOR.ORO, 52);
  }
}
