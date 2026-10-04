// Jugadores automáticos "perfectos" (sin tiempo de reacción) para cada
// microjuego: prueban que todos se pueden ganar en todos los niveles.
// Cada bot se llama una vez por cuadro con la escena del microjuego (m).
const B = {};
let cuadro = 0;
const ev = (...a) => window.__ev(...a);

B.Reventa = m => { const g = m.globos.find(o => o.vivo); if (g && m.vale()) { ev('pointerdown', g.x, g.y - 12); ev('pointerup', g.x, g.y - 12); } };
B.Aplasta = m => { const b = m.bichos.find(o => o.vivo); if (b && m.vale()) { ev('pointerdown', b.x, b.y); ev('pointerup', b.x, b.y); } };
B.Distinto = m => { if (m.t > 0.6) { const c = m.celdas[m.distinto]; ev('pointerdown', c.x, c.y); ev('pointerup', c.x, c.y); } };
B.NoToques = () => {};
B.Cuantos = m => { if (m.t > 0.8) { const b = m.botones.find(o => o.v === m.cosas.length); ev('pointerdown', b.x, b.y); ev('pointerup', b.x, b.y); } };
B.Frena = m => {
  const medio = (m.zona0 + m.borde) / 2;
  if (!m.frenando && m.x + 52 + 70 >= medio) { ev('pointerdown', 270, 400); ev('pointerup', 270, 400); }
};
B.Salta = m => {
  const c = m.cactus.find(o => o.x > 110);
  const mitad = 340 * m.vel * m.duracionSalto / 2;
  if (c && !m.enAire && c.x - 120 <= mitad) { ev('pointerdown', 270, 400); ev('pointerup', 270, 400); }
};
B.Atrapa = m => {
  const cayendo = m.caen.filter(c => c.estado === 'cae');
  const comida = cayendo.filter(c => c.esComida).sort((a, b) => b.y - a.y)[0];
  let x = comida ? comida.x : m.canasta.x;
  const bomba = cayendo.find(c => !c.esComida && c.y > (comida ? comida.y : -99) - 200);
  if (bomba && Math.abs(bomba.x - x) < 110 && (!comida || bomba.y > comida.y)) x = bomba.x < 270 ? bomba.x + 180 : bomba.x - 180;
  ev('pointermove', x, 500);
};
B.Esquiva = m => {
  // Simula los próximos 0,9 s yendo hacia cada destino posible (el jugador
  // se mueve como en el juego: se acerca un 20·dt por cuadro) y elige el que
  // pasa más lejos de todas las piedras
  const piedras = m.piedras.filter(p => p.img && p.y < m.yJugador + 60);
  const dt = 1 / 60;
  let mejor = m.jugador.x, dMejor = -1e9;
  for (let x = 50; x <= 490; x += 10) {
    let jx = m.jugador.x, dMin = 1e9;
    for (let k = 1; k <= 54; k++) {
      jx += (x - jx) * Math.min(1, dt * 20);
      for (const p of piedras) {
        const y = p.y + m.cae * dt * k;
        dMin = Math.min(dMin, Math.hypot(p.x - jx, y - m.yJugador));
      }
    }
    const valor = Math.min(dMin, 150) - Math.abs(x - m.jugador.x) * 0.01;
    if (valor > dMejor) { dMejor = valor; mejor = x; }
  }
  ev('pointermove', mejor, 500);
};
B.Comer = m => {
  if (!m.comida || m.t < 0.3 || m.tweens.isTweening(m.comida)) return;
  const b = m.boca;
  ev('pointerdown', m.comida.x, m.comida.y); window.__paso(1);
  ev('pointermove', b.x, b.y); window.__paso(1);
  ev('pointerup', b.x, b.y);
};
B.Corta = m => {
  const f = m.frutas.find(o => o.estado === 'vuela' && o.esFruta && o.y < m.H - 80);
  if (f) {
    ev('pointerdown', f.x - 120, f.y + 5); window.__paso(1);
    ev('pointermove', f.x - 40, f.y + 2); window.__paso(1);
    ev('pointermove', f.x + 60, f.y); window.__paso(1);
    ev('pointerup', f.x + 120, f.y);
  }
};
B.Patea = m => {
  if (m.pateada || m.t < 0.4) return;
  // Se patea hacia el lado del que se aleja el arquero
  const destino = m.dirArquero > 0 ? m.palo0 + 35 : m.palo1 - 35;
  const dy = -120, dx = (destino - m.pelota.x) * -dy / (m.pelota.y - (m.yLinea - 60));
  ev('pointerdown', m.pelota.x, m.pelota.y); window.__paso(1);
  ev('pointermove', m.pelota.x + dx / 2, m.pelota.y + dy / 2); window.__paso(1);
  ev('pointerup', m.pelota.x + dx, m.pelota.y + dy);
};
// Infla: a un ritmo humano (7 toques por segundo), no a uno de máquina
B.Infla = m => { if (++cuadro % 9 === 0) { ev('pointerdown', 270, 400); ev('pointerup', 270, 400); } };
B.Llena = m => {
  const meta = (m.lo + m.hi) / 2;
  if (!m.sirviendo && m.nivelAgua < meta && m.t > 0.3) ev('pointerdown', 270, 400);
  if (m.sirviendo && m.nivelAgua >= meta) ev('pointerup', 270, 400);
};
window.__bots = B;

// Juega n veces un microjuego con su bot y cuenta cuántas gana.
window.__probar = (nombre, nivel, vel, n = 5) => {
  const d = window.director;
  let ganadas = 0;
  const detalle = [];
  for (let i = 0; i < n; i++) {
    window.__ver(nombre, 0.02, nivel, vel);
    let g = 0;
    while (g++ < 1200 && d.estado === 'micro' && d.decididoEn === null) {
      const m = window.__micro();
      if (m && m.sys.isActive()) B[nombre](m);
      window.__paso(1);
    }
    if (d.gano) ganadas++;
    else detalle.push(`t=${(window.__T() - d.t0).toFixed(2)}`);
    // Algunos bots no levantan el dedo: si quedara apretado, el primer toque
    // del microjuego siguiente se perdería
    window.__ev('pointerup', 270, 400);
    window.__paso(1);
  }
  return `${nombre} n${nivel} v${vel}: ${ganadas}/${n}` + (detalle.length ? ` (perdió en ${detalle.join(', ')})` : '');
};
window.__B = B;            // para partidas completas jugadas por los bots
'bots listos';

// --- segunda tanda ---
B.Pesca = m => {
  if (m.estadoAnzuelo !== 'arriba' || m.t < 0.3) return;
  const td = (m.yPeces - m.yArriba) / m.bajada;
  const donde = p => p.x + p.dir * p.rapidez * td;
  const bueno = m.peces.find(p => !p.malo && Math.abs(donde(p) - m.cx) < 25);
  const malo = m.peces.find(p => p.malo && Math.abs(donde(p) - m.cx) < 110);
  if (bueno && !malo) { ev('pointerdown', 270, 500); ev('pointerup', 270, 500); }
};
B.Foto = m => {
  const b = m.bicho, l = m.lado / 2 - 40;
  if (m.t > 0.3 && Math.abs(b.x - m.mx) < l && Math.abs(b.y - m.my) < l) { ev('pointerdown', 270, 500); ev('pointerup', 270, 500); }
};
B.Vuela = m => {
  const c = m.canos.find(o => o.x > m.x - 60);
  const meta = c ? (c.arribaAlto + c.abajoY) / 2 + 25 : m.cy;
  if (m.y > meta && m.vy > -50) { ev('pointerdown', 270, 500); ev('pointerup', 270, 500); }
};
B.Cable = m => {
  if (m.t < 0.4) return;
  const c = m.cables.find(o => o.color === m.objetivo);
  let mejorK = 6, mejorD = -1;
  for (let k = 2; k < c.puntos.length - 1; k++) {
    const p = c.puntos[k];
    const d = Math.min(...m.cables.filter(o => o !== c).map(o => Math.abs(o.puntos[k].x - p.x)));
    if (d > mejorD) { mejorD = d; mejorK = k; }
  }
  const p = c.puntos[mejorK], a = Math.min(26, mejorD / 2 - 2);
  ev('pointerdown', p.x - a, p.y); window.__paso(1);
  ev('pointermove', p.x, p.y + 1); window.__paso(1);
  ev('pointermove', p.x + a, p.y + 2); window.__paso(1);
  ev('pointerup', p.x + a, p.y + 2);
};
B.Suma = m => { if (m.t > 0.8) { const b = m.botones.find(o => o.v === m.r); ev('pointerdown', b.x, b.y); ev('pointerup', b.x, b.y); } };
B.Grande = m => { if (m.t > 0.6) { const c = m.cosas[m.elegido]; ev('pointerdown', c.x, c.y); ev('pointerup', c.x, c.y); } };
B.Orden = m => {
  if (m.t < 0.4) return;
  const b = m.burbujas.find(o => o.viva && o.num === m.orden[m.siguiente]);
  if (b) { ev('pointerdown', b.x, b.y); ev('pointerup', b.x, b.y); }
};
let lado = 1;
B.Limpia = m => {
  const s = m.manchas.find(o => o.vida > 0);
  if (!s || m.t < 0.3) return;
  if (!m.apretado) ev('pointerdown', s.x, s.y);
  lado *= -1;
  ev('pointermove', s.x + lado * 20, s.y);         // ~40 px por cuadro: 2400 px/s de frote
};
B.Avanza = m => {
  if (m.estadoG === 'duerme' && !m.apretado) ev('pointerdown', 270, 500);
  if (m.estadoG !== 'duerme' && m.apretado) ev('pointerup', 270, 500);
};

// --- tercera tanda y jefes ---
// Ritmo: toca cuando la nota llega al aro (con el retraso del toque descontado)
B.Ritmo = m => {
  const o = m.notas.find(n => !n.hecha);
  if (o && m.t - 0.03 >= o.t - 0.008) { ev('pointerdown', 270, 500); ev('pointerup', 270, 500); }
};
B.Memoria = m => {
  if (!m.vueltas) return;
  const c = m.cartas.find(o => o.nombre === m.buscada);
  ev('pointerdown', c.x, c.y); ev('pointerup', c.x, c.y);
};
B.Despega = m => { if (++cuadro % 9 === 0) { ev('pointerdown', 270, 400); ev('pointerup', 270, 400); } };
// Duelo: reacciona como una persona, 0,2 s después de la señal
B.Duelo = m => { if (m.salio && m.t - m.tSenal >= 0.2) { ev('pointerdown', 270, 400); ev('pointerup', 270, 400); } };
B.Flechas = m => {
  const f = m.flechas[m.actual];
  if (!f || m.t < 0.3 || ++cuadro % 6) return;
  ev('pointerdown', 270, 500); window.__paso(1);
  ev('pointermove', 270 + f.d[0] * 30, 500 + f.d[1] * 30); window.__paso(1);
  ev('pointerup', 270 + f.d[0] * 80, 500 + f.d[1] * 80);
};
// Sigue: como una persona, el dedo va adonde estaba el bicho hace 0,1 s y
// se acerca de a poco (si el bicho pega un salto, el dedo lo pierde)
let agarrado = false, dedo = null, historia = [];
B.Sigue = m => {
  if (m.t < 0.3) { agarrado = false; historia = []; return; }
  historia.push({ x: m.bicho.x, y: m.bicho.y });
  if (!agarrado) { dedo = { x: m.bicho.x, y: m.bicho.y }; ev('pointerdown', dedo.x, dedo.y); agarrado = true; return; }
  const meta = historia[Math.max(0, historia.length - 7)];
  dedo.x += (meta.x - dedo.x) * 0.5; dedo.y += (meta.y - dedo.y) * 0.5;
  ev('pointermove', dedo.x, dedo.y);
};
B.Simon = m => {
  if (m.decidido || m.fase !== 'turno' || ++cuadro % 8) return;
  const b = m.botones[m.secuencia[m.puesto]];
  ev('pointerdown', b.x, b.y); ev('pointerup', b.x, b.y);
};
// Torta: aplasta la hormiga más cercana a la torta, 10 veces por segundo como mucho
B.Torta = m => {
  if (++cuadro % 6) return;
  const vivas = m.hormigas.filter(h => h.img && h.viva && h.x > 0 && h.x < m.W && h.y > 0 && h.y < m.H);
  if (!vivas.length) return;
  const h = vivas.sort((a, b) => Math.hypot(a.x - m.tx, a.y - m.ty) - Math.hypot(b.x - m.tx, b.y - m.ty))[0];
  ev('pointerdown', h.x, h.y); ev('pointerup', h.x, h.y);
};

// --- cuarta tanda y jefe Carrera ---
B.Colores = m => { if (m.t > 0.5) { const o = m.circulos.find(k => k.c === m.pedido); ev('pointerdown', o.base.x, o.base.y); ev('pointerup', o.base.x, o.base.y); } };
// Ataja: reacciona como una persona, 0,22 s después de la patada
B.Ataja = m => {
  if (m.salto || m.t < m.tPatada + 0.22) return;
  const x = m.lado < 0 ? 100 : 440;
  ev('pointerdown', x, 500); ev('pointerup', x, 500);
};
// Ruleta: toca cuando, contando lo que tarda en frenar, la estrella va a quedar arriba
B.Ruleta = m => {
  if (m.frenando >= 0 || m.t < 0.3) return;
  const paso = Math.PI * 2 / m.n;
  const giroFinal = m.giro + m.w * 0.42 / 2;
  let a = (-giroFinal) % (Math.PI * 2); if (a < 0) a += Math.PI * 2;
  if (Math.round(a / paso) % m.n === m.estrella && Math.abs(a / paso - Math.round(a / paso)) < 0.25) { ev('pointerdown', 270, 500); ev('pointerup', 270, 500); }
};
B.Carrera = m => {
  if (m.enAire) return;
  const o = m.obstaculos.find(k => !k.chocado && k.x > m.x - 20);
  const mitad = m.rapidez * m.duracionSalto / 2;
  // Si vienen dos pegados, apunta al medio del par (salta un poco después)
  const otro = o && m.obstaculos.find(k => k !== o && k.x > o.x && k.x - o.x < 120);
  const centro = otro ? (otro.x - o.x) / 2 : 0;
  if (o && o.x + centro - m.x <= mitad) { ev('pointerdown', 270, 400); ev('pointerup', 270, 400); }
};

// --- quinta tanda ---
// Rebota: toca cada globo cuando baja por la mitad de abajo (no más de 4 por segundo)
B.Rebota = m => {
  for (const g of m.globos) {
    g.__ultimo = m.t < 0.3 ? -1 : (g.__ultimo ?? -1);
    if (g.vy > 0 && g.y > m.cy + 10 && m.t - g.__ultimo > 0.25) {
      g.__ultimo = m.t;
      ev('pointerdown', g.x, g.y - 12); ev('pointerup', g.x, g.y - 12);
      return;
    }
  }
};
// Cruza: planifica el cruce entero (saltar o esperar, de a 40 ms) y salta
// sólo si saltar ahora lleva a cruzar sin que lo atropellen
B.Cruza = m => {
  if (m.saltando || m.t < 0.3 || m.decidido) return;
  const PASO = 0.04, SALTO = 0.12, LIMITE = m.dur - m.t;
  const choca = (i, t) => {
    if (i < 0 || i >= m.n) return false;
    const p = m.pistas[i];
    return p.autos.some(a => {
      const d = (((p.x0 + a.k * a.separacion + p.v * t) % p.largo) + p.largo) % p.largo - 110;
      return Math.abs(d - m.pollo.x) < 66;
    });
  };
  const libre = (i, t0, t1) => { for (let t = t0; t <= t1 + 1e-6; t += PASO / 2) if (choca(i, t)) return false; return true; };
  const memo = new Map();
  const llega = (i, t) => {
    if (i >= m.n) return true;
    if (t - m.t > LIMITE) return false;
    const clave = i + ':' + Math.round(t / PASO);
    if (memo.has(clave)) return memo.get(clave);
    let r = false;
    if (libre(i + 1, t, t + SALTO) && llega(i + 1, t + SALTO)) r = true;
    else if (libre(i, t, t + PASO) && llega(i, t + PASO)) r = true;
    memo.set(clave, r);
    return r;
  };
  if (libre(m.carril + 1, m.t, m.t + SALTO) && llega(m.carril + 1, m.t + SALTO)) { ev('pointerdown', 270, 300); ev('pointerup', 270, 300); }
};
// Encesta: apunta adonde va a estar el aro cuando llegue la pelota
B.Encesta = m => {
  if (m.volando || m.t < 0.3 || m.decidido) return;
  let x = m.xAro, v = m.vAro;
  for (let t = 0; t < m.tVuelo; t += 1 / 120) {
    x += v / 120;
    if (x < 120) { x = 120; v = Math.abs(v); } else if (x > m.W - 120) { x = m.W - 120; v = -Math.abs(v); }
  }
  const pendiente = (x - m.xBase) / (m.yBase - m.yAro);
  ev('pointerdown', m.xBase, m.yBase); window.__paso(1);
  ev('pointermove', m.xBase + pendiente * 40, m.yBase - 40); window.__paso(1);
  ev('pointermove', m.xBase + pendiente * 80, m.yBase - 80); window.__paso(1);
  ev('pointerup', m.xBase + pendiente * 80, m.yBase - 80);
};
// Equilibra: inclina hacia el otro lado de donde se va la pelota (control PD)
B.Equilibra = m => {
  const e = m.s + 0.45 * m.v;
  const quiere = e > 10 ? -1 : e < -10 ? 1 : 0;
  if (quiere === m.lado) return;
  if (m.lado !== 0) ev('pointerup', 270, 500);
  if (quiere !== 0) ev('pointerdown', quiere < 0 ? 90 : 450, 500);
};
// Encaja: lleva la pieza a su sombra
B.Encaja = m => {
  if (m.t < 0.3 || m.decidido || m.agarrada) return;
  const h = m.huecos.find(o => o.nombre === m.buscada);
  const x0 = m.pieza.x, y0 = m.pieza.y;
  ev('pointerdown', x0, y0); window.__paso(1);
  for (let k = 1; k <= 5; k++) { ev('pointermove', x0 + (h.x - x0) * k / 5, y0 + (h.y - y0) * k / 5); window.__paso(1); }
  ev('pointerup', h.x, h.y);
};
// Sopla: unos 6,7 toques por segundo
B.Sopla = m => { if (++cuadro % 9 === 0) { ev('pointerdown', 270, 400); ev('pointerup', 270, 400); } };

// --- sexta tanda: reemplazos y el jefe Marciano ---
// Vasos: toca el vaso que tiene el diamante cuando se puede elegir
B.Vasos = m => {
  if (m.estadoV !== 'elegir') return;
  const v = m.vasos.find(o => o.lugar === m.conDiamante);
  ev('pointerdown', v.x, m.yMesa - 60); ev('pointerup', v.x, m.yMesa - 60);
};
// Honda: prueba estiradas y ángulos, simula el vuelo y tira el que pasa más cerca del cerdo
B.Honda = m => {
  if (m.estado !== 'listo' || m.t < 0.3 || m.decidido) return;
  const FUERZA = 6.2, G = 900;
  let mejor = null, dMejor = 1e9;
  for (let ang = 95; ang <= 215; ang += 3) {
    for (let largo = 40; largo <= 115; largo += 5) {
      const dx = Math.cos(ang * Math.PI / 180) * largo, dy = Math.sin(ang * Math.PI / 180) * largo;
      const x0 = m.reposo.x + dx, y0 = m.reposo.y + dy, vx = -dx * FUERZA, vy = -dy * FUERZA;
      for (let t = 0.02; t < 2; t += 0.02) {
        const x = x0 + vx * t, y = y0 + vy * t + 0.5 * G * t * t;
        if (y > m.ySuelo) break;
        const tt = m.t + t + 0.12;
        const yc = m.yCerdo0 - (m.subeBaja ? Math.abs(Math.sin(tt * 2.2)) * m.subeBaja : 0);
        const d = Math.hypot(x - m.xTorre, y - yc);
        if (d < dMejor) { dMejor = d; mejor = { dx, dy }; }
      }
    }
  }
  const x0 = m.pajaro.x, y0 = m.pajaro.y;
  ev('pointerdown', x0, y0); window.__paso(1);
  for (let k = 1; k <= 4; k++) { ev('pointermove', x0 + mejor.dx * k / 4, y0 + mejor.dy * k / 4); window.__paso(1); }
  ev('pointerup', x0 + mejor.dx, y0 + mejor.dy);
};
// Marciano: simula el próximo segundo yendo a cada lugar posible (la nave se
// acerca un 16·dt por cuadro, como en el juego); entre los lugares seguros,
// elige el que queda más cerca de abajo del marciano
B.Marciano = m => {
  if (m.t < 0.2 || m.decidido) return;
  const dt = 1 / 60;
  let mejor = m.nave.x, puntaje = -1e9;
  for (let x = 50; x <= m.W - 50; x += 15) {
    let nx = m.nave.x, dMin = 1e9;
    for (let k = 1; k <= 60; k++) {
      nx += (x - nx) * Math.min(1, dt * 16);
      for (const o of m.meteoros) {
        const ox = o.img.x + o.vx * dt * k, oy = o.img.y + o.vy * dt * k;
        dMin = Math.min(dMin, Math.hypot(ox - nx, oy - m.yNave));
      }
    }
    const p = (dMin > 80 ? 0 : (dMin - 80) * 20) - Math.abs(x - m.jefe.x);
    if (p > puntaje) { puntaje = p; mejor = x; }
  }
  ev('pointermove', mejor, m.yNave);
};
// --- 2026-10-03: gestos nuevos y el quinto jefe ---
// Gira el dedo en círculos (2,6 vueltas por segundo), para el lado pedido
B.Manivela = m => {
  if (m.t < 0.25 || m.decidido) return;
  // (la escena se reusa: la memoria del bot es de esta vuelta, la de este t0)
  if (!m.__bot || m.__bot.t0 !== m.t0) m.__bot = { t0: m.t0, ang: 0, abajo: false };
  const b = m.__bot;
  const cx = m.ejeX - 160, cy = m.ejeY - 120, R = 70, dir = m.sentido || 1;
  if (!b.abajo) { b.abajo = true; ev('pointerdown', cx + R, cy); return; }
  b.ang += dir * 2.6 * 2 * Math.PI / 60;
  ev('pointermove', cx + Math.cos(b.ang) * R, cy + Math.sin(b.ang) * R);
};
// Dibuja una vuelta alrededor de donde va a estar la oveja (con el zorro lejos)
B.Lazo = m => {
  if (m.t < 0.3 || m.decidido) return;
  if (!m.__bot || m.__bot.t0 !== m.t0) m.__bot = { t0: m.t0, puntos: null, i: 0 };
  const b = m.__bot;
  if (b.puntos) {
    if (b.i < b.puntos.length) { const p = b.puntos[b.i++]; ev('pointermove', p.x, p.y); }
    else { const p = b.puntos[b.puntos.length - 1]; ev('pointerup', p.x, p.y); b.puntos = null; }
    return;
  }
  const o = m.animales.find(a => a.nombre === 'oveja'), z = m.animales.find(a => a.nombre === 'zorro');
  const dz = z ? Math.hypot(z.x - o.x, z.y - o.y) : 1e9;
  if (dz < 180) return;
  const cx = o.x + Math.cos(o.rumbo) * o.rapidez * 0.2, cy = o.y + Math.sin(o.rumbo) * o.rapidez * 0.2;
  const R = Math.min(95, Math.max(70, dz - 105));
  b.puntos = [];
  for (let k = 0; k <= 24; k++) { const a = (k / 22) * 2 * Math.PI; b.puntos.push({ x: cx + Math.cos(a) * R, y: cy + Math.sin(a) * R }); }
  b.i = 1;
  ev('pointerdown', b.puntos[0].x, b.puntos[0].y);
};
// Corta de través cada tentáculo apenas asoma
B.Pulpo = m => {
  if (m.t < 0.2 || m.decidido) return;
  for (const o of m.tentaculos) {
    if (o.estado !== 'crece' || o.puntos.length < 3) continue;
    const i = Math.max(1, Math.floor(o.puntos.length * 0.7)), p = o.puntos[i], q = o.puntos[i - 1];
    if (p.x < 30 || p.x > m.W - 30) continue;
    const l = Math.hypot(p.x - q.x, p.y - q.y) || 1, nx = -(p.y - q.y) / l, ny = (p.x - q.x) / l;
    ev('pointerdown', p.x + nx * 60, p.y + ny * 60); window.__paso(1);
    ev('pointermove', p.x, p.y);
    ev('pointermove', p.x - nx * 60, p.y - ny * 60);
    ev('pointerup', p.x - nx * 60, p.y - ny * 60);
    return;
  }
};

// --- séptima tanda (2026-10-04) ---
// Puertas: barre de lado a lado la puerta cuyo fantasma llega primero
B.Puertas = m => {
  if (m.t < 0.25 || m.decidido) return;
  const p = m.puertas.filter(o => !o.cerrada).sort((a, b) => a.llegada - b.llegada)[0];
  if (!p) return;
  const y = m.yPuerta, x0 = p.x - p.ancho * 0.45, x1 = p.x + p.ancho * 0.45;
  ev('pointerdown', x0, y); window.__paso(1);
  for (let k = 1; k <= 4; k++) { ev('pointermove', x0 + (x1 - x0) * k / 4, y); window.__paso(1); }
  ev('pointerup', x1, y);
};
// Separa: lleva cada cosa a su lugar (comida a la canasta, cosas a la caja)
B.Separa = m => {
  const p = m.pieza;
  if (!p || p.yendo || m.decidido || m.t < 0.25 || m.agarre) return;
  const lugar = m.lugares.find(l => l.comida === p.esComida);
  const x0 = p.img.x, y0 = p.img.y;
  ev('pointerdown', x0, y0); window.__paso(1);
  for (let k = 1; k <= 3; k++) { ev('pointermove', x0 + (lugar.x - x0) * k / 3, y0 + (m.yLugar - y0) * k / 3); window.__paso(1); }
  ev('pointerup', lugar.x, m.yLugar);
};
// Traza: recorre la figura del punto verde al final, en algo más de la mitad del tiempo
B.Traza = m => {
  if (m.t < 0.25 || m.decidido) return;
  if (!m.__bot || m.__bot.t0 !== m.t0) m.__bot = { t0: m.t0, i: 0, abajo: false };
  const b = m.__bot, r = m.ruta;
  if (!b.abajo) { b.abajo = true; ev('pointerdown', r[0].x, r[0].y); return; }
  b.i = Math.min(r.length - 1, b.i + Math.ceil(r.length / (m.dur * 60 * 0.55)));
  ev('pointermove', r[b.i].x, r[b.i].y);
};
// Puntillas: arrastra al 70 % de la velocidad que despierta al gato
B.Puntillas = m => {
  if (m.t < 0.25 || m.decidido) return;
  if (!m.__bot || m.__bot.t0 !== m.t0) m.__bot = { t0: m.t0, x: m.x, abajo: false };
  const b = m.__bot;
  if (!b.abajo) { b.abajo = true; ev('pointerdown', m.x, m.yPiso - 36); return; }
  b.x = Math.min(m.meta + 10, b.x + m.limite * 0.7 / 60);
  ev('pointermove', b.x, m.yPiso - 36);
};
