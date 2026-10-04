// ¡ESQUIVÁ! — Caen piedras: movete para que no te peguen hasta que suene la bomba.
import { Micro } from '../escenas/Micro.js';
import { COLOR } from '../config.js';

export class Esquiva extends Micro {
  static ORDEN = '¡ESQUIVA!';
  static ICONO = 'roca';          // en la galería
  static CONTROL = 'arrastrar';
  static GANA_AL_FINAL = true;

  armar() {
    this.tema('noche');
    this.yJugador = this.bajo - 60;
    this.jugador = this.emoji('facha', this.cx, this.yJugador, 96);
    this.objetivoX = this.cx;
    const n = [5, 6, 7][this.nivel - 1];
    // Las piedras salen repartidas; una de cada tres apunta adonde estás
    // (la última llega abajo un poco antes de que se acabe el tiempo)
    // Caen más rápido con la velocidad, pero no tanto: tiene que dar para reaccionar.
    // En una pantalla alta caen de más arriba: más rápido, para que tarden lo
    // mismo que en una baja (si no, salían más juntas y a veces no había por
    // dónde escapar en el nivel 3).
    const distancia = this.yJugador + 70;
    this.cae = 560 * Math.pow(this.vel, 0.7) * Math.max(1, distancia / 680);
    const caida = distancia / this.cae;
    const desde = 0.35 / this.vel, hasta = this.dur - caida - 0.1;
    this.piedras = [];
    for (let i = 0; i < n; i++) {
      this.piedras.push({ tSale: desde + (i / Math.max(1, n - 1)) * (hasta - desde), apunta: i % 3 === 0, img: null, x: 0, y: -70 });
    }
    const mover = x => { this.objetivoX = Math.max(50, Math.min(this.W - 50, x)); };
    this.alMover(mover);
    this.alTocar(mover);
  }

  alPerder() {
    this.jugador.setTexture('emoji', 'mareado').setDisplaySize(96, 96);
    this.audio.golpe();
    this.cartel(this.jugador.x, this.yJugador - 90, '¡PUM!', COLOR.MAL);
  }

  alGanar() {
    this.cartel(this.cx, this.cy - 80, '¡TE SALVASTE!', COLOR.ORO, 64);
  }

  // Una piedra "al azar" nunca cae pegada a otra que llega casi al mismo
  // tiempo: así siempre queda un pasillo por donde escapar.
  lugarLibre(t) {
    const cerca = this.piedras.filter(o => o.img && o.tSale > t - 0.3);
    for (let intento = 0; intento < 12; intento++) {
      const x = this.azar(50, this.W - 50);
      if (cerca.every(o => Math.abs(o.x - x) > 160)) return x;
    }
    return this.azar(50, this.W - 50);
  }

  paso(dt, t) {
    if (this.resultado !== 'perdio') this.jugador.x += (this.objetivoX - this.jugador.x) * Math.min(1, dt * 20);
    for (const p of this.piedras) {
      if (!p.img) {
        if (t < p.tSale) continue;
        p.x = p.apunta ? this.jugador.x + this.azar(-25, 25) : this.lugarLibre(t);
        p.img = this.emoji('roca', p.x, p.y, 84);
        p.giro = this.azar(-300, 300);
      }
      p.y += this.cae * dt;
      p.img.setPosition(p.x, p.y);
      p.img.angle += p.giro * dt;
      if (!this.decidido && Math.hypot(p.x - this.jugador.x, p.y - this.yJugador) < 60) this.perder();
    }
  }
}
