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
  // Piedras que llegan a la altura del jugador en los próximos 0,8 s
  const llegan = m.piedras.filter(p => p.img && p.y < m.yJugador + 40 && (m.yJugador - p.y) / m.cae < 0.8);
  // Las que están por pegar (menos de 0,18 s): no se puede cruzar por debajo
  const yaMismo = llegan.filter(p => (m.yJugador - 70 - p.y) / m.cae < 0.18);
  const x0 = m.jugador.x;
  let mejor = x0, dMejor = -1e9;
  for (let x = 60; x <= 480; x += 20) {
    // Bloquea sólo lo que queda en el camino (alejarse de una piedra siempre vale)
    const bloquea = p => (x > x0 ? p.x > x0 - 10 && p.x < x + 70 : x < x0 ? p.x < x0 + 10 && p.x > x - 70 : false);
    if (yaMismo.some(bloquea)) continue;
    const d = llegan.length ? Math.min(...llegan.map(p => Math.abs(p.x - x))) : 999;
    const valor = Math.min(d, 200) - Math.abs(x - x0) * 0.02;
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
  }
  return `${nombre} n${nivel} v${vel}: ${ganadas}/${n}` + (detalle.length ? ` (perdió en ${detalle.join(', ')})` : '');
};
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
B.Topo = m => { const h = m.hoyos.find(o => o.fuera); if (h && m.vale()) { ev('pointerdown', h.x, h.y - 20); ev('pointerup', h.x, h.y - 20); } };
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
