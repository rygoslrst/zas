// ¡INFLÁ! — Tocá rápido, muchas veces, hasta que el globo explote.
import { Micro } from '../escenas/Micro.js';
import { COLOR } from '../config.js';

const AZUL = 0x3a86ff, AZUL_OSCURO = 0x1d4ed8, GRIS = 0x4a4f63;

export class Infla extends Micro {
  static ORDEN = '¡INFLA!';
  static CONTROL = 'machacar';

  armar() {
    this.fondo();
    // Los toques que se piden salen del tiempo que hay: 4, 5 o 6 por segundo
    // (se puede tocar a 7-8 por segundo sin problema).
    this.necesarios = Math.max(6, Math.round([4, 5, 6][this.nivel - 1] * (this.dur - 0.3)));
    this.pierde = this.nivel >= 2 ? 0.8 : 0;       // aire que se escapa por segundo
    this.aire = 0;
    // El globo sale del pico, a la izquierda; el inflador, a la derecha
    this.xGlobo = this.cx - 80;
    this.yPico = this.bajo - 30;
    const xb = this.cx + 140, yb = this.yPico - 60;
    this.sombra(xb, this.yPico + 14, 150, 0.3);
    this.sombra(this.xGlobo, this.yPico + 14, 90, 0.2);
    // La manguera: una curva del pie del inflador al pico del globo
    const g = this.add.graphics();
    const curva = new Phaser.Curves.QuadraticBezier(
      new Phaser.Math.Vector2(xb - 30, this.yPico + 2), new Phaser.Math.Vector2((xb + this.xGlobo) / 2, this.yPico + 40),
      new Phaser.Math.Vector2(this.xGlobo, this.yPico - 4));
    g.lineStyle(14, COLOR.OSCURO, 1); curva.draw(g);
    g.lineStyle(8, 0x6b7280, 1); curva.draw(g);
    // Vástago (detrás del cuerpo: al bajar, se mete adentro)
    this.yManija = yb - 118;
    this.palo = this.rect(xb, yb - 90, 14, 64, GRIS);
    // Cuerpo con tapas redondas y un brillo
    this.rect(xb, this.yPico + 4, 150, 16, COLOR.OSCURO);                    // base
    this.rect(xb, yb, 92, 120, AZUL_OSCURO);
    this.rect(xb, yb, 84, 120, AZUL);
    this.rect(xb - 26, yb, 12, 104, 0xffffff, 0.35);                         // brillo
    this.add.image(xb, yb - 60, 'atlas', 'circulo').setDisplaySize(92, 26).setTint(AZUL_OSCURO);
    this.add.image(xb, yb + 60, 'atlas', 'circulo').setDisplaySize(92, 26).setTint(AZUL);
    // Manómetro: la aguja sube con el aire
    this.circulo(xb + 8, yb + 10, 26, COLOR.OSCURO);
    this.circulo(xb + 8, yb + 10, 21, 0xffffff);
    this.aguja = this.rect(xb + 8, yb + 10, 4, 18, COLOR.MAL).setOrigin(0.5, 1).setAngle(-120);
    this.circulo(xb + 8, yb + 10, 4, COLOR.OSCURO);
    // Manija con agarraderas (el vástago se dibuja antes, detrás del cuerpo)
    this.manija = this.add.container(xb, this.yManija, [
      this.rect(0, 0, 130, 20, COLOR.OSCURO),
      this.add.image(-62, 0, 'atlas', 'circulo').setDisplaySize(34, 34).setTint(0xff4d5a),
      this.add.image(62, 0, 'atlas', 'circulo').setDisplaySize(34, 34).setTint(0xff4d5a),
    ]);
    this.globo = this.emoji('globo', this.xGlobo, this.yPico - 40, 80);
    this.cuenta = this.texto(this.cx, this.arriba + 110, '', 72);
    this.alTocar(() => this.inflar());
  }

  inflar() {
    this.aire++;
    this.audio.inflar(Math.min(12, this.aire));
    this.tweens.killTweensOf([this.palo, this.manija]);
    this.manija.y = this.yManija + 34; this.palo.y = this.yManija + 62;
    this.tweens.add({ targets: this.manija, y: this.yManija, duration: 110 });
    this.tweens.add({ targets: this.palo, y: this.yManija + 28, duration: 110 });
    if (this.aire >= this.necesarios) this.explotar();
  }

  explotar() {
    const y = this.globo.y;
    this.globo.setTexture('emoji', 'explosion').setDisplaySize(260, 260);
    this.tweens.add({ targets: this.globo, alpha: 0, displayWidth: 320, displayHeight: 320, duration: 350 });
    this.audio.pop();
    this.chispas(this.xGlobo, y, 16, COLOR.MAL, 1.8);
    this.confeti(this.xGlobo, y);
    this.cartel(this.cx, y - 40, '¡PUM!', COLOR.ORO, 90);
    this.cuenta.setText('');
    this.ganar();
  }

  paso(dt, t) {
    if (this.decidido) return;
    // Desde el nivel 2 el globo pierde aire si parás
    this.aire = Math.max(0, this.aire - dt * this.pierde);
    const k = this.aire / this.necesarios;
    const tam = 80 + k * 210;
    // El nudo del globo queda en el pico: crece hacia arriba
    this.globo.setDisplaySize(tam, tam).setPosition(this.xGlobo + Math.sin(t * 30) * k * 4, this.yPico - tam * 0.45);
    this.aguja.setAngle(-120 + k * 240 + Math.sin(t * 50) * k * 4);
    this.cuenta.setText(`${Math.ceil(this.necesarios - this.aire)}`);
  }
}
