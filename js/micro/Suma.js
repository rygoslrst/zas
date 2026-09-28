// ¿CUÁNTO ES? — Una cuenta cortita: tocá el resultado.
import { Micro } from '../escenas/Micro.js';
import { COLOR } from '../config.js';

export class Suma extends Micro {
  static ORDEN = '¿CUÁNTO ES?';
  static CONTROL = 'tocar';
  static PULSOS = 10;

  armar() {
    this.fondo();
    let a, b, op, r;
    if (this.nivel === 1) { a = this.entero(1, 5); b = this.entero(1, 4); op = '+'; r = a + b; }
    else if (this.nivel === 2) {
      if (Math.random() < 0.5) { a = this.entero(4, 9); b = this.entero(3, 9); op = '+'; r = a + b; }
      else { a = this.entero(7, 15); b = this.entero(2, a - 1); op = '-'; r = a - b; }
    } else { a = this.entero(2, 6); b = this.entero(2, 6); op = '×'; r = a * b; }
    this.r = r;
    this.cuenta = this.texto(this.cx, this.cy - 150, `${a} ${op} ${b}`, 130);
    this.texto(this.cx, this.cy + 10, '?', 90, COLOR.ORO);
    // Tres opciones: la correcta y dos que se le parecen
    const cerca = [r - 1, r + 1, r - 2, r + 2, r + 10, r - 10].filter(v => v >= 0 && v !== r);
    const opciones = this.mezclar([r, ...this.mezclar(cerca.slice(0, 4)).slice(0, 2)]);
    const by = this.bajo - 70;
    this.botones = opciones.map((v, i) => ({ ...this.boton(this.cx + (i - 1) * 165, by, 66, v), v }));
    this.alTocar((x, y) => {
      const b = this.botones.find(o => Math.hypot(o.x - x, o.y - y) < 74);
      if (!b) return;
      if (b.v === r) { this.ganar(); b.fondo.setTint(COLOR.BIEN); this.chispas(b.x, b.y, 10); }
      else {
        this.perder();
        b.fondo.setTint(COLOR.MAL);
        this.botones.find(o => o.v === r).fondo.setTint(COLOR.BIEN);
      }
      this.rebote(b.fondo);
    });
  }

  paso(dt, t) { this.cuenta.setScale(1 + Math.sin(t * 5) * 0.03); }
}
