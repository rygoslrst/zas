// Arnés de pruebas de ZAS: se pega en la consola (o con javascript_tool).
// Toma el control del reloj, avanza el juego cuadro por cuadro y manda
// capturas del canvas al servidor de desarrollo (capturas/).
const esperar = ms => new Promise(r => setTimeout(r, ms));
for (let i = 0; i < 400 && !(window.juego && window.juego.loop); i++) await esperar(50);   // (window.juego solo es el div con ese id)
const J = window.juego;
J.loop.sleep();
for (let i = 0; i < 200 && !(window.director && window.director.ui); i++) { J.step(performance.now(), 1000 / 60); await esperar(10); }
const d = window.director, a = d.audio;
let T = a.ahora();
a.ahora = () => T;
// Las animaciones (tweens) de Phaser miden el tiempo con Date.now(): también se controla.
const T0 = T, fecha0 = Date.now();
Date.now = () => fecha0 + Math.round((T - T0) * 1000);
window.__T = () => T;
// Las animaciones (tweens) leen el delta del bucle: hay que dárselo a mano.
let reloj = performance.now();
window.__paso = (n = 1) => { for (let i = 0; i < n; i++) { T += 1 / 60; reloj += 1000 / 60; J.loop.delta = J.loop.rawDelta = 1000 / 60; J.loop.time = reloj; J.step(reloj, 1000 / 60); } };
window.__micro = () => d.clave ? J.scene.getScene(d.clave) : null;
window.__ver = (nombre, tCap, nivel = 1, vel = 1) => {
  if (d.clave) { d.scene.stop(d.clave); d.clave = null; window.__paso(2); }
  d.soloEste = J.scene.getScene(nombre).constructor;
  d.nivelForzado = nivel; d.velForzada = vel;
  d.estado = 'fin';
  for (const id of ['titulo', 'fin', 'pausa']) document.getElementById(id).hidden = true;
  d.empezar();
  d.finIntermedio = T;
  let g = 0;
  while (g++ < 3000 && !(d.estado === 'micro' && T - d.t0 >= tCap)) window.__paso(1);
  return `${nombre} n${nivel} v${vel} t=${(T - d.t0).toFixed(2)} estado=${d.estado}`;
};
// Avanza hasta t (segundos del microjuego actual) o hasta que se decida
window.__hasta = (t) => { let g = 0; while (g++ < 3000 && d.estado === 'micro' && T - d.t0 < t) window.__paso(1); };
window.__foto = async (nombre, escala = 0.5) => {
  window.__paso(1);
  const c = J.canvas, w = Math.round(c.width * escala), h = Math.round(c.height * escala);
  const o = document.createElement('canvas');
  o.width = w; o.height = h;
  o.getContext('2d').drawImage(c, 0, 0, w, h);
  const blob = await new Promise(r => o.toBlob(r, 'image/jpeg', 0.82));
  await fetch('/__captura/' + nombre + '.jpg', { method: 'POST', body: blob });
  return nombre;
};
// Toques simulados en coordenadas del juego
// Coordenadas del juego (540 de ancho) → pantalla. El canvas puede dibujarse más grande (zoom k).
const aPantalla = (x, y) => { const r = J.canvas.getBoundingClientRect(), s = r.width / 540; return [r.left + x * s, r.top + y * s]; };
window.__ev = (tipo, x, y) => {
  // Phaser escucha eventos de mouse (y de touch), no "pointer": se simula el mouse.
  const [cx, cy] = aPantalla(x, y);
  const t = { pointerdown: 'mousedown', pointermove: 'mousemove', pointerup: 'mouseup' }[tipo];
  J.canvas.dispatchEvent(new MouseEvent(t, { clientX: cx, clientY: cy, bubbles: true, button: 0, buttons: t === 'mouseup' ? 0 : 1 }));
};
window.__tocar = (x, y) => { window.__ev('pointerdown', x, y); window.__paso(1); window.__ev('pointerup', x, y); window.__paso(1); };
window.__arrastrar = (x0, y0, x1, y1, pasos = 6) => {
  window.__ev('pointerdown', x0, y0); window.__paso(1);
  for (let k = 1; k <= pasos; k++) { window.__ev('pointermove', x0 + (x1 - x0) * k / pasos, y0 + (y1 - y0) * k / pasos); window.__paso(1); }
  window.__ev('pointerup', x1, y1); window.__paso(1);
};
'arnés listo';
