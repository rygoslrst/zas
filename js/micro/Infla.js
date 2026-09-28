// ¡INFLÁ! — Tocá rápido, muchas veces, hasta que el globo explote.
import { Micro } from '../escenas/Micro.js';
import { COLOR } from '../config.js';

export class Infla extends Micro {
  static ORDEN = '¡INFLÁ!';
  static CONTROL = 'machacar';

  armar() {
    this.fondo();
    // Los toques que se piden salen del tiempo que hay: 4, 5 o 6 por segundo
    // (se puede tocar a 7-8 por segundo sin problema).
    this.necesarios = Math.max(6, Math.round([4, 5, 6][this.nivel - 1] * (this.dur - 0.3)));
    this.pierde = this.nivel >= 2 ? 0.8 : 0;       // aire que se escapa por segundo
    this.aire = 0;
    // El globo sale del pico, a la izquierda; el inflador, a la derecha
    this.xGlobo = this.cx - 70;
    this.yPico = this.bajo - 30;
    const xBomba = this.cx + 150;
    this.rect((this.xGlobo + xBomba) / 2, this.yPico + 8, xBomba - this.xGlobo, 10, 0x333333);
    this.rect(xBomba, this.yPico - 45, 84, 110, 0x3a86ff);
    this.rect(xBomba, this.yPico - 95, 84, 12, 0x1d4ed8);
    this.palo = this.rect(xBomba, this.yPico - 130, 14, 70, 0x666666);
    this.manija = this.rect(xBomba, this.yPico - 168, 116, 20, 0x222222);
    this.yManija = this.yPico - 168;
    this.globo = this.emoji('globo', this.xGlobo, this.yPico - 40, 80);
    this.cuenta = this.texto(this.cx, this.arriba + 110, '', 72);
    this.alTocar(() => this.inflar());
  }

  inflar() {
    this.aire++;
    this.audio.inflar(Math.min(12, this.aire));
    this.tweens.killTweensOf([this.palo, this.manija]);
    this.manija.y = this.yManija + 40; this.palo.y = this.yPico - 110;
    this.tweens.add({ targets: this.manija, y: this.yManija, duration: 110 });
    this.tweens.add({ targets: this.palo, y: this.yPico - 130, duration: 110 });
    if (this.aire >= this.necesarios) this.explotar();
  }

  explotar() {
    const y = this.globo.y;
    this.globo.setTexture('emoji', 'explosion').setDisplaySize(260, 260);
    this.tweens.add({ targets: this.globo, alpha: 0, displayWidth: 320, displayHeight: 320, duration: 350 });
    this.audio.pop();
    this.chispas(this.xGlobo, y, 16, COLOR.MAL, 1.8);
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
    this.cuenta.setText(`${Math.ceil(this.necesarios - this.aire)}`);
  }
}
