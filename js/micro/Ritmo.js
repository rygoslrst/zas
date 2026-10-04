// ¡TOCA AL RITMO! — Bajan notas por una pista: hay que tocar justo cuando
// pasan por el aro. Caen en los golpes del bombo de la música (desde el nivel
// 3, también a contratiempo). Tocar a lo loco no sirve: un toque cerca de una
// nota pero fuera de tiempo, pierde.
import { Micro } from '../escenas/Micro.js';
import { COLOR } from '../config.js';

// En qué pulso cae cada nota
const PATRONES = [
  [[3, 4, 5], [3, 4, 6], [3, 5, 6]],
  [[3, 4, 5, 6], [3, 4, 5, 5.5], [3, 3.5, 4.5, 5.5]],
  [[3, 3.5, 4.5, 5, 6], [3, 4, 4.5, 5, 6], [3, 3.5, 4, 5, 5.5]],
];
const FORMAS = ['estrella', 'corazon', 'diamante', 'trebol', 'fuego'];
const BRILLOS = [0xffd23f, 0xff4d6d, 0x6fd3ff, 0x3ddc84, 0xff9f1c];
const LATENCIA = 0.03;       // el toque llega un poquito tarde a la página
const CERCA = 0.5;           // un toque a menos de esto de una nota, cuenta

export class Ritmo extends Micro {
  static ORDEN = '¡TOCA AL RITMO!';
  static CONTROL = 'tocar';
  // La primera vez: se congela con la primera figura justo en el círculo
  static LECCION = {
    titulo: '¡TOCA JUSTO A TIEMPO!', sub: 'CUANDO CADA FIGURA PASE POR EL CÍRCULO',
    gesto: 'tocar', lugar: 'arriba', listo: m => m.t >= m.notas[0].t - 0.02,
    objetivo: m => ({ x: m.cx, y: m.yAro }),
  };

  armar() {
    this.tema('noche');
    this.haces(3);
    this.pulso = this.dur / Ritmo.PULSOS;
    this.ventana = Math.max(0.13, 0.3 * this.pulso);
    this.viaje = Math.max(0.75, 2 * this.pulso);          // lo que tarda una nota en bajar
    this.yAro = this.bajo - 140;
    this.yArriba = this.arriba + 30;
    // La pista: una franja oscura con bordes de luz
    const alto = this.yAro - this.yArriba + 120;
    this.rect(this.cx, this.yArriba + alto / 2 - 40, 150, alto, 0x000000, 0.3);
    for (const lado of [-1, 1]) this.rect(this.cx + lado * 75, this.yArriba + alto / 2 - 40, 4, alto, 0xb9a8ff, 0.6);
    // Las rayas de cada pulso bajan con las notas (se ve el compás)
    this.rayas = [];
    for (let k = 1; k <= Ritmo.PULSOS; k++) this.rayas.push({ k, img: this.rect(this.cx, -50, 140, 3, 0xffffff, 0.22) });
    // El aro donde hay que tocar
    this.circulo(this.cx, this.yAro, 60, 0xffffff, 0.12);
    this.aro = this.add.image(this.cx, this.yAro, 'atlas', 'anillo').setDisplaySize(132, 132).setTint(0xffffff);
    // Dos bailarines a los costados, que saltan con cada pulso
    this.bailarines = [
      { img: this.emoji('facha', this.cx - 175, this.yAro, 120), x: this.cx - 175 },
      { img: this.emoji('robot', this.cx + 175, this.yAro, 120), x: this.cx + 175 },
    ];
    for (const b of this.bailarines) this.sombra(b.x, this.yAro + 66, 90);
    // Las notas
    const patron = this.elegir(PATRONES[this.nivel - 1]);
    this.notas = patron.map((p, i) => {
      const c = i % FORMAS.length;
      const brillo = this.add.image(this.cx, -100, 'atlas', 'brillo').setDisplaySize(150, 150).setTint(BRILLOS[c]).setAlpha(0.55);
      const img = this.emoji(FORMAS[c], this.cx, -100, 84);
      return { t: p * this.pulso, img, brillo, hecha: false, color: BRILLOS[c] };
    });
    this.aciertos = 0;
    this.alTocar(() => this.tocar());
  }

  tocar() {
    const t = this.t - LATENCIA;
    let nota = null, d = Infinity;
    for (const o of this.notas) {
      if (o.hecha) continue;
      const e = o.t - t;
      if (Math.abs(e) < Math.abs(d)) { d = e; nota = o; }
    }
    if (!nota || Math.abs(d) >= CERCA) return;           // lejos de toda nota: no cuenta
    if (Math.abs(d) <= this.ventana) this.acertar(nota);
    else this.fallar(d > 0 ? '¡MUY PRONTO!' : '¡MUY TARDE!');
  }

  acertar(o) {
    o.hecha = true;
    this.audio.acierto(this.aciertos++);
    this.chispas(this.cx, this.yAro, 10, o.color);
    this.tweens.add({ targets: [o.img, o.brillo], scale: '*=1.8', alpha: 0, duration: 220, onComplete: () => { o.img.destroy(); o.brillo.destroy(); } });
    this.aro.setTint(o.color).setDisplaySize(160, 160);
    this.tweens.add({ targets: this.aro, displayWidth: 132, displayHeight: 132, duration: 160 });
    for (const b of this.bailarines) this.rebote(b.img, 1.3);
    if (this.notas.every(n => n.hecha)) {
      this.ganar();
      this.confeti(this.cx, this.yAro - 60);
      this.cartel(this.cx, this.cy - 140, '¡QUÉ RITMO!', COLOR.ORO, 64);
    }
  }

  fallar(texto) {
    if (!this.perder()) return;
    this.aro.setTint(COLOR.MAL);
    for (const b of this.bailarines) b.img.setTexture('emoji', 'mareado');
    this.cartel(this.cx, this.cy - 140, texto, COLOR.MAL, 56);
  }

  paso(dt, t) {
    const caida = this.yAro - this.yArriba;
    const y = tn => this.yAro - ((tn - t) / this.viaje) * caida;
    // Notas: bajan hacia el aro; la que se pasa sin tocar, pierde
    for (const o of this.notas) {
      if (o.hecha) continue;
      const yo = y(o.t);
      const ver = yo > this.yArriba - 60;
      o.img.setVisible(ver).setPosition(this.cx, yo).setAngle(Math.sin(t * 6 + o.t) * 10);
      o.brillo.setVisible(ver).setPosition(this.cx, yo);
      if (!this.decidido && t - LATENCIA > o.t + this.ventana) this.fallar('¡TE LA PERDISTE!');
    }
    for (const r of this.rayas) {
      const yr = y(r.k * this.pulso);
      r.img.setVisible(yr > this.yArriba - 40 && yr < this.yAro + 70).setY(yr);
    }
    // Los bailarines saltan en cada pulso; el aro late
    const f = (t / this.pulso) % 1;
    for (const b of this.bailarines) {
      if (!this.decidido || this.resultado === 'gano') b.img.y = this.yAro - Math.sin(f * Math.PI) * 22;
    }
    if (!this.decidido) this.aro.setAlpha(0.65 + 0.35 * (1 - f));
  }
}
