// ¡PEDALEA! — Una carrera en bici: se toca un pedal y después el otro
// (izquierda, derecha, izquierda...). Cada toque alternado avanza; tocar dos
// veces el mismo no sirve. Hay que llegar a la meta. Desde el nivel 2 corre
// otro ciclista: hay que llegar antes que él.
import { Micro } from '../escenas/Micro.js';
import { COLOR } from '../config.js';

export class Pedalea extends Micro {
  static ORDEN = '¡PEDALEA!';
  static ICONO = 'bici';          // en la galería
  static CONTROL = 'machacar';
  // La primera vez: el juego se congela y enseña (ver Director.revisarLeccion)
  static LECCION = {
    titulo: '¡UN PEDAL Y DESPUÉS EL OTRO!', sub: 'IZQUIERDA, DERECHA, IZQUIERDA... ¡RÁPIDO!',
    gesto: 'machacar', lugar: 'arriba', listo: () => true,
    objetivo: m => ({ x: m.pedales[0].x, y: m.pedales[0].y }),
  };

  armar() {
    this.tema('cielo');
    this.nubes(2);
    // La ruta: cerros, pasto, el camino y la meta
    this.yRuta = this.cy + 40;
    this.horizonte(this.yRuta - 70, 'cerros', 0x9fd88a);
    this.piso(this.yRuta - 30, 0x6cc04a);
    this.rect(this.cx, this.yRuta + 20, this.W, 70, 0x4a4a58).setOrigin(0.5);
    for (let x = 20; x < this.W; x += 70) this.rect(x + 20, this.yRuta + 20, 36, 5, 0xfff1a8);
    this.x0 = 70;
    this.meta = this.W - 70;
    this.rect(this.meta + 8, this.yRuta + 20, 10, 70, 0xffffff).setOrigin(0.5);
    this.emoji('bandera', this.meta + 30, this.yRuta - 60, 80);
    // Los ciclistas: el nuestro y (desde el nivel 2) el rival, un poco atrás
    this.rival = this.nivel >= 2 ? { x: this.x0, img: this.emoji('bici', this.x0, this.yRuta - 6, 92).setTint(0xffb3b3).setAlpha(0.95) } : null;
    this.x = this.x0;
    this.bici = this.emoji('bici', this.x, this.yRuta + 26, 104);
    this.mirar(this.bici, 'bici', 1);
    if (this.rival) this.mirar(this.rival.img, 'bici', 1);
    // Cuántos toques hacen falta (el tiempo alcanza a unos 5 por segundo)
    this.toques = Math.max(6, Math.round([7, 9, 11][this.nivel - 1] * Math.min(1, (this.dur - 0.4) / 2.3)));
    this.pasoX = (this.meta - this.x0) / this.toques;
    // El rival llega un poco antes de que se acabe la mecha
    if (this.rival) this.rival.v = (this.meta - this.x0) / (this.dur * [1, 0.9, 0.85][this.nivel - 1]);
    // Los dos pedales, abajo
    const yP = this.bajo - 110;
    this.pedales = [-1, 1].map((lado, i) => {
      const x = this.cx + lado * 120;
      const sombra = this.circulo(x, yP + 10, 92, COLOR.OSCURO, 0.3);
      const base = this.circulo(x, yP, 92, i === 0 ? 0x2f7dff : 0xff7a1a);
      const aro = this.add.image(x, yP, 'atlas', 'anillo').setDisplaySize(200, 200).setTint(0xffffff).setAlpha(0);
      const flecha = this.add.image(x, yP, 'atlas', 'flecha').setDisplaySize(90, 90).setAngle(lado < 0 ? 180 : 0);
      return { x, y: yP, base, aro, flecha, sombra };
    });
    this.siguiente = 0;          // qué pedal toca ahora
    this.hechos = 0;
    this.alTocar(x => {
      const lado = x < this.cx ? 0 : 1;
      const p = this.pedales[lado];
      this.tweens.add({ targets: p.base, scale: p.base.scaleX * 0.88, duration: 50, yoyo: true });
      if (lado !== this.siguiente) { this.audio.toque(); return; }
      this.siguiente = 1 - this.siguiente;
      this.hechos++;
      this.x = Math.min(this.meta, this.x0 + this.hechos * this.pasoX);
      this.audio.inflar(Math.min(8, this.hechos));
      if (this.hechos >= this.toques) this.llegar(true);
    });
  }

  llegar(nosotros) {
    if (this.decidido) return;
    if (nosotros) {
      this.ganar();
      this.confeti(this.meta, this.yRuta - 60);
      this.cartel(this.cx, this.arriba + 140, '¡PRIMERO!', COLOR.ORO, 66);
    } else {
      this.perder();
      this.cartel(this.cx, this.arriba + 140, '¡TE GANÓ!', COLOR.MAL, 62);
    }
  }

  paso(dt, t) {
    // La bici va hacia donde la llevan los pedales (suave) y rebota al andar
    const b = this.bici;
    b.x += (this.x - b.x) * Math.min(1, dt * 14);
    b.y = this.yRuta + 26 - Math.abs(Math.sin(t * 18)) * (Math.abs(this.x - b.x) > 2 ? 5 : 0);
    if (this.rival && !this.decidido) {
      this.rival.x = Math.min(this.meta, this.rival.x + this.rival.v * dt);
      this.rival.img.setPosition(this.rival.x, this.yRuta - 6 - Math.abs(Math.sin(t * 16)) * 4);
      if (this.rival.x >= this.meta) this.llegar(false);
    }
    // El pedal que toca ahora, iluminado
    this.pedales.forEach((p, i) => {
      const es = i === this.siguiente && !this.decidido;
      p.aro.setAlpha(es ? 0.6 + Math.sin(t * 16) * 0.3 : 0);
      p.flecha.setAlpha(es ? 1 : 0.35);
    });
  }
}
