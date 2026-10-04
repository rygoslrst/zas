// ============================================================================
//  Audio.js — el reloj, la música y los efectos (todo sintetizado)
// ----------------------------------------------------------------------------
//  1) RELOJ. Los microjuegos duran una cantidad de pulsos de la música, así
//     que se miden con el reloj del audio (AudioContext.currentTime). Si el
//     audio no arranca, hay un reloj de respaldo con performance.now().
//     En la pausa el reloj del juego se congela (aunque el audio siga sonando:
//     la cuenta 3, 2, 1 suena con el juego todavía quieto).
//
//  2) MÚSICA. Cada microjuego tiene su propia cancioncita, inventada al azar
//     a partir de una semilla: otra tonalidad, otra progresión, otra melodía.
//     Como en WarioWare, cada juego "suena distinto" sin un solo archivo.
//     Los jefes van en tono menor; entre microjuego y microjuego (el telón)
//     sigue un ritmo, y en el menú, una música tranquila.
//
//  3) EFECTOS. Sintetizados: cero descargas, cero licencias. En Android,
//     algunos además vibran (van con el botón de los efectos).
//
//  Música y efectos se apagan por separado; si la música está apagada, ni se
//  programa (en los aparatos lentos, es trabajo que se ahorra).
// ============================================================================

const midi = n => 440 * Math.pow(2, (n - 69) / 12);
const esperar = ms => new Promise(r => setTimeout(r, ms));

const MAYOR = [0, 2, 4, 5, 7, 9, 11];
const MENOR = [0, 2, 3, 5, 7, 8, 10];
const PENTA_MAYOR = [0, 2, 4, 7, 9];
const PENTA_MENOR = [0, 3, 5, 7, 10];
// Progresiones en grados de la escala (un acorde por compás)
const PROGRESIONES = [[0, 4, 5, 3], [0, 5, 3, 4], [5, 3, 0, 4], [0, 3, 4, 3], [0, 0, 3, 4]];
const PROG_MENOR = [[0, 5, 2, 6], [0, 3, 4, 0], [0, 6, 5, 4], [0, 5, 3, 4]];
// Ritmos de melodía de un compás (1 = nota)
const RITMOS = [
  [1, 0, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0],
  [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0],
  [1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 0],
  [1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 0],
];
const BAJOS = [[0, 6, 8, 14], [0, 3, 8, 11], [0, 4, 8, 12], [0, 7, 10]];

// Azar con semilla: la misma semilla, la misma canción.
function azar(semilla) {
  let s = semilla >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const elegir = (r, lista) => lista[Math.floor(r() * lista.length)];

// Las tres notas del acorde de un grado de la escala. En menor, el V con la
// sensible (más tensión: suena a jefe).
function triada(raiz, escala, grado, menor) {
  return [0, 2, 4].map(i => {
    const g = grado + i;
    let n = raiz + escala[g % 7] + 12 * Math.floor(g / 7);
    if (menor && grado === 4 && i === 1) n += 1;
    return n;
  });
}

// Una melodía de dos compases: un paseo por la pentatónica, con saltos
// cortos; el segundo compás repite el primero y cambia el final (pregunta y
// respuesta)
function melodia(r, ritmo, base, penta) {
  const mel = [];
  let g = Math.floor(r() * 5);
  const paso = () => {
    g = Math.max(0, Math.min(9, g + Math.floor(r() * 5) - 2));
    return base + penta[g % 5] + 12 * Math.floor(g / 5);
  };
  for (let k = 0; k < 16; k++) mel.push(ritmo[k] ? paso() : 0);
  for (let k = 0; k < 16; k++) mel.push(k < 10 ? mel[k] : ritmo[k] ? paso() : 0);
  return mel;
}

export class Audio {
  constructor(claveEfectos, claveMusica) {
    this.ctx = null;
    this.claveEfectos = claveEfectos;
    this.claveMusica = claveMusica;
    this.efectos = true;
    this.musicaOn = true;
    try {
      this.efectos = localStorage.getItem(claveEfectos) !== '0';
      // Antes había un solo botón: si se había silenciado todo, la música también
      const m = localStorage.getItem(claveMusica);
      this.musicaOn = m === null ? this.efectos : m !== '0';
    } catch (e) { /* sin almacenamiento */ }
    this._ultAudio = 0; this._ultPerf = 0; this._ultEst = 0;
    this._usarPerf = true;
    this._perfPausado = 0; this._pausadoEn = null;
    this._desfase = 0; this._congeladoEn = null;
    this.pista = null;
    this.chorroActivo = null;
    this.puedeVibrar = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
  }

  // --------------------------------------------------------------------------
  //  Desbloqueo: en el PRIMER toque. iOS no deja sonar nada antes.
  //  (En el iPhone, con el interruptor de silencio puesto el juego no suena,
  //  como cualquier juego del iPhone.)
  // --------------------------------------------------------------------------
  async desbloquear() {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return false;
        this.ctx = new AC({ latencyHint: 'interactive' });
        this._construir();
      }
      const reanudar = this.ctx.resume();            // tiene que ser dentro del gesto
      const b = this.ctx.createBufferSource();       // buffer mudo: destraba iOS viejos
      b.buffer = this.ctx.createBuffer(1, 1, 22050);
      b.connect(this.ctx.destination);
      b.start(0);
      await Promise.race([reanudar, esperar(500)]);
    } catch (e) { /* seguimos con el reloj de respaldo */ }
    this.resincronizar();
    return this.audioVivo;
  }

  _construir() {
    const c = this.ctx;
    this.comp = c.createDynamicsCompressor();
    this.comp.threshold.value = -12; this.comp.ratio.value = 4;
    this.comp.connect(c.destination);
    this.master = c.createGain();
    this.master.gain.value = 0.9;
    this.master.connect(this.comp);
    this.musica = c.createGain();
    this.musica.gain.value = this.musicaOn ? 0.5 : 0;
    this.musica.connect(this.master);
    this.sfx = c.createGain();
    this.sfx.gain.value = this.efectos ? 0.9 : 0;
    this.sfx.connect(this.master);
    // El eco de la melodía: un retardo que se realimenta, cada vez más opaco
    this.ecoEnvio = c.createGain();
    this.eco = c.createDelay(1);
    this.eco.delayTime.value = 0.3;
    const opaco = c.createBiquadFilter();
    opaco.type = 'lowpass'; opaco.frequency.value = 2200;
    const vuelta = c.createGain();
    vuelta.gain.value = 0.3;
    const salidaEco = c.createGain();
    salidaEco.gain.value = 0.28;
    this.ecoEnvio.connect(this.eco); this.eco.connect(opaco); opaco.connect(vuelta); vuelta.connect(this.eco);
    opaco.connect(salidaEco);
    salidaEco.connect(this._paneo(0.3, this.musica));
    const n = c.sampleRate;
    this.ruido = c.createBuffer(1, n, n);
    const d = this.ruido.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  }

  // Una entrada que suena corrida a un costado y sigue a 'hacia' (si el
  // navegador no sabe panear, la entrada es 'hacia' mismo)
  _paneo(lado, hacia) {
    if (!this.ctx.createStereoPanner) return hacia;
    const p = this.ctx.createStereoPanner();
    p.pan.value = lado;
    p.connect(hacia);
    return p;
  }

  get audioVivo() { return this.ctx !== null && this.ctx.state === 'running'; }

  // Los dos botones: la música y los efectos (que incluyen la vibración)
  setMusica(on) {
    this.musicaOn = on;
    try { localStorage.setItem(this.claveMusica, on ? '1' : '0'); } catch (e) { /* nada */ }
    if (this.musica) this.musica.gain.setTargetAtTime(on ? 0.5 : 0, this.ctx.currentTime, 0.03);
  }

  setEfectos(on) {
    this.efectos = on;
    try { localStorage.setItem(this.claveEfectos, on ? '1' : '0'); } catch (e) { /* nada */ }
    if (this.sfx) this.sfx.gain.setTargetAtTime(on ? 0.9 : 0, this.ctx.currentTime, 0.02);
  }

  // Vibración corta (Android; el iPhone no deja). Va con los efectos.
  vibrar(patron) {
    if (!this.efectos || !this.puedeVibrar) return;
    try { navigator.vibrate(patron); } catch (e) { /* nada */ }
  }

  // --------------------------------------------------------------------------
  //  RELOJ — currentTime avanza a saltos; entre salto y salto se interpola con
  //  performance.now() para que el movimiento sea suave.
  // --------------------------------------------------------------------------
  // El reloj se elige al empezar cada partida y no se cambia a mitad.
  iniciarPartida() {
    this.detenerPista();
    if (this.ctx && this._congeladoEn !== null) {        // (no debería pasar: por las dudas)
      this._desfase += this._crudo() - this._congeladoEn;
      this._congeladoEn = null;
    }
    this._usarPerf = !this.audioVivo;
    this._perfPausado = 0; this._pausadoEn = null;
    this.resincronizar();
  }

  // El reloj del audio, suavizado (sin descontar las pausas)
  _crudo() {
    const a = this.ctx.currentTime, p = performance.now() / 1000;
    if (a !== this._ultAudio) { this._ultAudio = a; this._ultPerf = p; }
    let est = this._ultAudio + (p - this._ultPerf);
    if (est > a + 0.06) est = a + 0.06;
    if (est < this._ultEst) est = this._ultEst;
    this._ultEst = est;
    return est;
  }

  // El reloj del juego
  ahora() {
    if (this._usarPerf) {
      const p = this._pausadoEn !== null ? this._pausadoEn : performance.now() / 1000;
      return p - this._perfPausado;
    }
    if (this._congeladoEn !== null) return this._congeladoEn - this._desfase;
    return this._crudo() - this._desfase;
  }

  resincronizar() {
    if (!this.ctx) return;
    this._ultAudio = this.ctx.currentTime;
    this._ultPerf = performance.now() / 1000;
    this._ultEst = this.ctx.currentTime;
  }

  // Congela el reloj del juego y apaga el audio. Se puede llamar de más.
  async pausar() {
    if (this._usarPerf) {
      if (this._pausadoEn === null) this._pausadoEn = performance.now() / 1000;
    } else if (this.ctx && this._congeladoEn === null) {
      this._congeladoEn = this._crudo();
    }
    this.chorro(false);
    if (this.ctx && this.ctx.state === 'running') {
      try { await this.ctx.suspend(); } catch (e) { /* nada */ }
    }
  }

  // Vuelve el audio, con el reloj del juego todavía congelado (la cuenta 3, 2, 1)
  async despertar() {
    if (this.ctx && this.ctx.state !== 'running') {
      try { await Promise.race([this.ctx.resume(), esperar(300)]); } catch (e) { /* nada */ }
    }
    if (this.ctx) this.resincronizar();
  }

  async reanudar() {
    if (this._usarPerf && this._pausadoEn !== null) {
      this._perfPausado += performance.now() / 1000 - this._pausadoEn;
      this._pausadoEn = null;
    }
    if (this.ctx && this.ctx.state !== 'running') {
      try { await this.ctx.resume(); } catch (e) { /* nada */ }
    }
    this.resincronizar();
    // Lo que el audio sonó con el juego congelado no cuenta para el juego
    if (this.ctx && this._congeladoEn !== null) {
      this._desfase += this._crudo() - this._congeladoEn;
      this._congeladoEn = null;
    }
  }

  // --------------------------------------------------------------------------
  //  MÚSICA — una pista a la vez. Cada pista tiene su salida (para apagarla
  //  con un fundido) y sus costados (los platillos a la derecha, los acordes
  //  a la izquierda).
  //  tipo: 'micro' | 'jefe' | 'telon' | 'menu'
  //  reloj: 'juego' (los tiempos son del reloj del juego) o 'audio' (el menú,
  //  que no depende de ninguna partida)
  // --------------------------------------------------------------------------
  _nuevaPista(datos) {
    this.detenerPista();
    const c = this.ctx;
    const salida = c.createGain();
    salida.gain.value = datos.volumen || 1;
    salida.connect(this.musica);
    this.pista = { paso: 0, salida, izq: this._paneo(-0.3, salida), der: this._paneo(0.25, salida), ...datos };
    // El eco, a una corchea con puntillo
    const seg16 = 60 / datos.bpm / 4;
    this.eco.delayTime.setTargetAtTime(Math.min(0.95, seg16 * 3), c.currentTime, 0.05);
    return this.pista;
  }

  // La música de un microjuego. op: { jefe, fin } (fin: cuándo se acaba la
  // mecha, en el reloj del juego: antes, un redoble)
  empezarPista(bpm, t0, semilla, op = {}) {
    if (!this.ctx) return;
    const r = azar(semilla);
    const menor = !!op.jefe;
    const raiz = (menor ? 45 : 48) + Math.floor(r() * 8);
    const ritmo = elegir(r, RITMOS);
    this._nuevaPista({
      tipo: menor ? 'jefe' : 'micro', reloj: 'juego', bpm, t0, fin: op.fin || 0, menor, raiz,
      escala: menor ? MENOR : MAYOR,
      prog: elegir(r, menor ? PROG_MENOR : PROGRESIONES),
      mel: melodia(r, ritmo, raiz + 24, menor ? PENTA_MENOR : PENTA_MAYOR),
      bajo: elegir(r, BAJOS),
      caja: r() < 0.5,
      acordes: r() < 0.5 ? 'golpes' : 'colchon',
      onda: menor ? 'sawtooth' : r() < 0.5 ? 'square' : 'triangle',
      doble: r() < 0.35,                   // la melodía, doblada una octava arriba
    });
    if (this._ok && this.musicaOn && !this._usarPerf) this._platillo(t0 + this._desfase, 0.5, this.pista.der);
  }

  // Entre microjuego y microjuego: un ritmo liviano al pulso de la partida
  // (en Do: pega con los jingles de ganar y perder)
  empezarTelon(bpm, t0) {
    if (!this.ctx) return;
    this._nuevaPista({
      tipo: 'telon', reloj: 'juego', bpm, t0, raiz: 48, escala: MAYOR, prog: [0, 0, 3, 4],
      mel: [], bajo: [0, 6, 8, 14], volumen: 0.7,
    });
  }

  // El menú y el final: tranquila, sin bombo fuerte
  empezarMenu() {
    if (!this._ok || (this.pista && this.pista.tipo === 'menu')) return;
    const r = azar(20261011);
    this._nuevaPista({
      tipo: 'menu', reloj: 'audio', bpm: 96, t0: this.ctx.currentTime + 0.1, raiz: 48, escala: MAYOR,
      prog: [0, 5, 3, 4], mel: melodia(r, RITMOS[1], 72, PENTA_MAYOR), bajo: [0, 10], volumen: 0.7,
      onda: 'triangle',
    });
  }

  detenerPista() {
    const p = this.pista;
    this.pista = null;
    if (!p || !this.ctx) return;
    // Lo que ya estaba programado se apaga con un fundido corto
    const t = this.ctx.currentTime;
    p.salida.gain.setTargetAtTime(0, t, 0.04);
    setTimeout(() => { try { p.salida.disconnect(); } catch (e) { /* nada */ } }, 600);
  }

  // Ya se decidió el microjuego: sin redoble final
  calmar() { if (this.pista) this.pista.calma = true; }

  // La lección congela el juego: la pista retoma donde quedó, corrida en el tiempo.
  correrPista(seg) {
    if (!this.pista || this.pista.reloj !== 'juego') return;
    this.pista.t0 += seg;
    if (this.pista.fin) this.pista.fin += seg;
  }

  // Se llama cada cuadro: agenda los pasos que caen en los próximos 150 ms.
  programar() {
    const p = this.pista;
    if (!p || !this.ctx) return;
    const enJuego = p.reloj === 'juego';
    if (enJuego && this._usarPerf) return;
    const ahora = enJuego ? this.ahora() : this.ctx.currentTime;
    const corrimiento = enJuego ? this._desfase : 0;      // reloj del juego → reloj del audio
    const hasta = ahora + 0.15;
    const seg16 = 60 / p.bpm / 4;
    const sonar = this.musicaOn && this.audioVivo;
    for (let guarda = 0; guarda < 64; guarda++) {
      const t = p.t0 + p.paso * seg16;
      if (t > hasta) break;
      const tA = t + corrimiento;
      if (sonar && tA >= this.ctx.currentTime - 0.005) this._paso(p, p.paso, tA, t, seg16);
      p.paso++;
    }
  }

  // Un paso (semicorchea) de la pista. tA: en el reloj del audio; tJ: en el
  // del juego (para saber si ya viene el final de la mecha)
  _paso(p, paso, tA, tJ, seg16) {
    const k = paso % 16;
    const compas = Math.floor(paso / 16);
    const acorde = triada(p.raiz, p.escala, p.prog[compas % p.prog.length], p.menor);
    const raizAcorde = acorde[0];
    const pulso = seg16 * 4;
    const redoble = p.fin && !p.calma && tJ >= p.fin - 2 * pulso - 0.001 && tJ < p.fin - 0.001;

    // --- Batería -------------------------------------------------------------
    if (redoble) {
      // Los dos últimos pulsos antes de que explote: redoble que crece
      const f = 1 - (p.fin - tJ) / (2 * pulso);
      if (k % 4 === 0) this._bombo(tA, p.salida, 0.9);
      if (k % 2 === 0 || f > 0.5) this._caja(tA, p.salida, 0.35 + 0.5 * f);
      this._hat(tA, 0.5, p.der);
    } else if (p.tipo === 'micro') {
      if (k % 4 === 0) this._bombo(tA, p.salida, 1);
      if (p.caja ? (k === 4 || k === 12) : (k === 8)) this._caja(tA, p.salida, 0.9);
      if (k % 4 === 2) this._hat(tA, 0.55, p.der);
      else if (k % 2 === 1 && p.doble) this._hat(tA, 0.2, p.der);
      if (k === 14 && compas % 2 === 1) this._hatAbierto(tA, p.der);
    } else if (p.tipo === 'jefe') {
      if (k % 4 === 0 || k === 10) this._bombo(tA, p.salida, 1);
      if (k === 4 || k === 12) this._caja(tA, p.salida, 1);
      this._hat(tA, k % 2 === 0 ? 0.5 : 0.25, p.der);
    } else if (p.tipo === 'telon') {
      if (k === 0 || k === 8 || k === 10) this._bombo(tA, p.salida, 0.85);
      if (k === 4 || k === 12) this._palmas(tA, p.salida);
      if (k % 4 === 2) this._hat(tA, 0.5, p.der);
    } else if (p.tipo === 'menu') {
      if (k === 0 || k === 10) this._bombo(tA, p.salida, 0.45);
      if (k === 8) this._palmas(tA, p.salida, 0.5);
      if (k % 4 === 2) this._hat(tA, 0.3, p.der);
    }

    // --- Bajo ----------------------------------------------------------------
    if (p.tipo === 'jefe') {
      if (k % 2 === 0) this._bajo(tA, raizAcorde - 12 + (k % 8 === 6 ? 12 : 0), seg16 * 1.5, p.salida, 0.2);
    } else if (p.tipo === 'menu') {
      if (p.bajo.includes(k)) this._bajo(tA, raizAcorde - 12 + (k === 10 ? 7 : 0), seg16 * 5, p.salida, 0.2, 500);
    } else if (p.bajo.includes(k)) {
      this._bajo(tA, raizAcorde - 12 + (p.tipo === 'telon' && k === 14 ? 7 : 0), seg16 * 1.6, p.salida);
    }

    // --- Acordes -------------------------------------------------------------
    if (p.tipo === 'menu' || p.acordes === 'colchon' || p.tipo === 'telon') {
      // un colchón largo al empezar cada compás
      if (k === 0) for (const n of acorde) this._osc('triangle', midi(n + 12), tA, seg16 * 15, p.tipo === 'menu' ? 0.035 : 0.03, p.izq);
    } else if (p.acordes === 'golpes' || p.tipo === 'jefe') {
      // golpecitos a contratiempo
      if (k % 4 === 2) for (const n of acorde) this._osc(p.tipo === 'jefe' ? 'sawtooth' : 'square', midi(n + 12), tA, seg16 * 0.9, p.tipo === 'jefe' ? 0.015 : 0.022, p.izq);
    }

    // --- Melodía (con eco) ---------------------------------------------------
    const n = p.mel.length ? p.mel[paso % p.mel.length] : 0;
    if (n) {
      const v = p.tipo === 'jefe' ? 0.04 : p.tipo === 'menu' ? 0.06 : 0.07;
      this._nota(p.onda, tA, n, seg16 * (p.tipo === 'menu' ? 2.2 : 1.4), v, p.salida, true);
      if (p.doble) this._nota('triangle', tA, n + 12, seg16 * 1.2, 0.035, p.salida, false);
    }
  }

  // --------------------------------------------------------------------------
  //  VOCES
  // --------------------------------------------------------------------------
  _env(g, t, pico, dur) {
    g.gain.setValueAtTime(pico, t);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  }

  _osc(tipo, f, t, dur, pico, destino, fFinal) {
    const c = this.ctx;
    const o = c.createOscillator(), g = c.createGain();
    o.type = tipo;
    o.frequency.setValueAtTime(f, t);
    if (fFinal) o.frequency.exponentialRampToValueAtTime(fFinal, t + dur);
    this._env(g, t, pico, dur);
    o.connect(g); g.connect(destino);
    o.start(t); o.stop(t + dur + 0.02);
    return g;
  }

  _ruido(t, dur, pico, destino, tipoFiltro, fFiltro, fFinal, q = 1) {
    const c = this.ctx;
    const s = c.createBufferSource();
    s.buffer = this.ruido;
    const f = c.createBiquadFilter();
    f.type = tipoFiltro; f.Q.value = q;
    f.frequency.setValueAtTime(fFiltro, t);
    if (fFinal) f.frequency.exponentialRampToValueAtTime(fFinal, t + dur);
    const g = c.createGain();
    this._env(g, t, pico, dur);
    s.connect(f); f.connect(g); g.connect(destino);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  }

  // Bombo: el golpe grave que baja, con un "clic" arriba para que se oiga en
  // los parlantes chicos del celular
  _bombo(t, d = this.musica, v = 1) {
    this._osc('sine', 150, t, 0.22, 0.9 * v, d, 45);
    this._osc('triangle', 2200, t, 0.012, 0.12 * v, d, 900);
  }
  // Caja: ruido brillante y un cuerpo afinado
  _caja(t, d = this.musica, v = 1) {
    this._ruido(t, 0.12, 0.35 * v, d, 'highpass', 1500);
    this._osc('triangle', 210, t, 0.08, 0.22 * v, d, 150);
  }
  _palmas(t, d = this.musica, v = 1) {
    for (const [dt, pico] of [[0, 0.22], [0.012, 0.18], [0.024, 0.26]]) this._ruido(t + dt, 0.06, pico * v, d, 'bandpass', 1300, null, 1.4);
  }
  _hat(t, v, d = this.musica) { this._ruido(t, 0.04, 0.25 * v, d, 'highpass', 7500); }
  _hatAbierto(t, d = this.musica) { this._ruido(t, 0.22, 0.1, d, 'highpass', 6500); }
  _platillo(t, v, d = this.musica) { this._ruido(t, 0.9, 0.16 * v, d, 'highpass', 5000, 3000); }
  _bajo(t, n, dur, d = this.musica, v = 0.3, fPico = 900) {
    const c = this.ctx;
    const o = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain();
    o.type = 'sawtooth'; o.frequency.value = midi(n);
    f.type = 'lowpass'; f.Q.value = 6;
    f.frequency.setValueAtTime(fPico, t);
    f.frequency.exponentialRampToValueAtTime(200, t + dur);
    this._env(g, t, v, dur);
    o.connect(f); f.connect(g); g.connect(d);
    o.start(t); o.stop(t + dur + 0.02);
  }
  _nota(onda, t, n, dur, v, d = this.musica, eco = false) {
    const g = this._osc(onda, midi(n), t, dur, v, d);
    if (eco) g.connect(this.ecoEnvio);
  }

  // Varias notas seguidas (jingles)
  _arpegio(notas, sep, dur, onda = 'square', v = 0.12, t0 = null) {
    const t = t0 === null ? this._t : t0;
    notas.forEach((n, i) => this._osc(onda, midi(n), t + i * sep, dur, v, this.sfx));
  }

  // Un acorde de "metales": dientes de sierra que se abren con un filtro
  _metales(notas, t, dur, v, f0 = 400, f1 = 2600) {
    const c = this.ctx;
    const f = c.createBiquadFilter(), g = c.createGain();
    f.type = 'lowpass'; f.Q.value = 2;
    f.frequency.setValueAtTime(f0, t);
    f.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.35);
    f.frequency.exponentialRampToValueAtTime(f0, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    f.connect(g); g.connect(this.sfx);
    for (const n of notas) {
      for (const desafino of [-6, 6]) {
        const o = c.createOscillator();
        o.type = 'sawtooth'; o.frequency.value = midi(n); o.detune.value = desafino;
        o.connect(f); o.start(t); o.stop(t + dur + 0.02);
      }
    }
  }

  // --------------------------------------------------------------------------
  //  JINGLES Y EFECTOS — todos protegidos: si no hay audio, no hacen nada.
  // --------------------------------------------------------------------------
  get _t() { return this.ctx.currentTime + 0.005; }
  get _ok() { return this.audioVivo; }

  gano() {
    if (!this._ok) return;
    this._bombo(this._t, this.sfx, 0.6);
    this._arpegio([72, 76, 79, 84], 0.07, 0.18, 'square', 0.1);
    this._arpegio([84, 88], 0.07, 0.3, 'triangle', 0.14, this._t + 0.28);
  }
  perdio() {
    if (!this._ok) return;
    this._arpegio([67, 63, 60], 0.11, 0.22, 'square', 0.1);
    this._osc('sawtooth', 110, this._t + 0.33, 0.45, 0.16, this.sfx, 55);
  }
  // ¡MÁS RÁPIDO!: un ventarrón que sube, un acelerón y un arpegio a toda
  // velocidad que remata en un acorde
  acelera() {
    if (!this._ok) return;
    const t = this._t;
    this._ruido(t, 0.5, 0.2, this.sfx, 'bandpass', 300, 5000, 1.2);
    this._osc('sawtooth', 110, t, 0.42, 0.05, this.sfx, 880);
    this._arpegio([60, 64, 67, 72, 76, 79], 0.045, 0.12, 'square', 0.08, t + 0.18);
    for (const n of [84, 88, 91]) this._osc('triangle', midi(n), t + 0.46, 0.35, 0.09, this.sfx);
    this._caja(t + 0.46, this.sfx, 0.8);
  }
  // ¡MÁS DIFÍCIL!: un golpe grave, metales en menor que se abren y un arpegio
  masDificil() {
    this.vibrar(40);
    if (!this._ok) return;
    const t = this._t;
    this._osc('sine', 120, t, 0.4, 0.8, this.sfx, 38);
    this._ruido(t, 0.3, 0.35, this.sfx, 'lowpass', 1800, 200);
    this._metales([48, 51, 55, 60], t, 0.75, 0.09);
    this._arpegio([60, 63, 67, 72, 75], 0.06, 0.16, 'square', 0.07, t + 0.3);
  }
  finPartida() {
    this.vibrar([90, 60, 160]);
    if (!this._ok) return;
    this._arpegio([72, 71, 70, 69], 0.2, 0.3, 'triangle', 0.14);
    this._osc('sine', 90, this._t + 0.85, 0.8, 0.5, this.sfx, 35);
  }
  record() {
    if (!this._ok) return;
    this._arpegio([72, 76, 79, 84, 79, 84, 88], 0.09, 0.2, 'square', 0.1);
  }
  // ¡VIDA EXTRA!: arpegio brillante y un destello arriba
  vidaExtra() {
    if (!this._ok) return;
    this._arpegio([72, 79, 84, 88, 91], 0.06, 0.16, 'square', 0.09);
    this._arpegio([96, 103, 108], 0.05, 0.25, 'triangle', 0.08, this._t + 0.32);
  }
  // ¡RACHA!: una llamarada y un arpegio (más agudo con ×2)
  racha(mult) {
    if (!this._ok) return;
    const b = mult >= 2 ? 76 : 72;
    this._ruido(this._t, 0.4, 0.18, this.sfx, 'bandpass', 700, 3200, 1.5);
    this._arpegio([b, b + 4, b + 7, b + 12, b + 16], 0.055, 0.16, 'square', 0.09, this._t + 0.08);
  }
  // ¡ÚLTIMA VIDA!: dos latidos
  latido() {
    this.vibrar([40, 120, 30]);
    if (!this._ok) return;
    for (const t of [0, 0.2, 0.75, 0.95]) {
      this._osc('sine', 70, this._t + t, 0.16, t % 0.75 ? 0.35 : 0.55, this.sfx, 40);
      this._osc('triangle', 150, this._t + t, 0.08, 0.1, this.sfx, 90);     // (para los parlantes chicos)
    }
  }
  // Anuncio de jefe: redoble que crece, un golpe de gong y metales disonantes
  jefe() {
    this.vibrar([30, 70, 30, 70, 120]);
    if (!this._ok) return;
    const t = this._t;
    for (let i = 0; i < 12; i++) {
      const ti = t + 0.5 * (1 - Math.pow(1 - i / 12, 1.4));
      this._ruido(ti, 0.07, 0.12 + 0.03 * i, this.sfx, 'highpass', 1400);
    }
    this._osc('sine', 70, t + 0.5, 1.1, 0.85, this.sfx, 30);
    this._ruido(t + 0.5, 1.2, 0.4, this.sfx, 'lowpass', 1500, 120);
    this._metales([45, 48, 51, 54], t + 0.5, 1.1, 0.1, 300, 2000);
  }
  // ¡DUELO!: una fanfarria del oeste y un latigazo
  duelo() {
    if (!this._ok) return;
    const t = this._t;
    this._arpegio([67, 67, 72], 0.12, 0.14, 'square', 0.1, t);
    this._osc('square', midi(79), t + 0.36, 0.4, 0.1, this.sfx);
    this._ruido(t + 0.36, 0.12, 0.35, this.sfx, 'highpass', 2500, 6000);
  }
  empieza() {
    if (!this._ok) return;
    this._ruido(this._t, 0.35, 0.18, this.sfx, 'bandpass', 400, 3000, 1);
    this._osc('sine', 330, this._t, 0.3, 0.12, this.sfx, 880);
  }
  // Aparece la orden en grande: un "¡ta-dá!" corto
  orden() {
    if (!this._ok) return;
    this._osc('square', midi(79), this._t, 0.08, 0.07, this.sfx);
    this._osc('square', midi(84), this._t + 0.07, 0.16, 0.08, this.sfx);
  }
  // La lección congela el juego: el sonido se "frena" y suena una campanita
  congelar() {
    if (!this._ok) return;
    this._osc('sawtooth', 520, this._t, 0.24, 0.05, this.sfx, 70);
    this._osc('sine', midi(93), this._t + 0.12, 0.5, 0.12, this.sfx);
    this._osc('sine', midi(100), this._t + 0.12, 0.4, 0.05, this.sfx);
  }
  descongelar() { if (this._ok) this._ruido(this._t, 0.16, 0.5, this.sfx, 'bandpass', 500, 2600, 1.2); }
  // El corazón que se parte
  corazon() {
    if (!this._ok) return;
    this._ruido(this._t, 0.05, 0.4, this.sfx, 'highpass', 2500);
    this._osc('triangle', 1300, this._t, 0.22, 0.12, this.sfx, 260);
  }
  // La cuenta 3, 2, 1 al volver de la pausa (0: ¡ya!)
  cuenta(n) {
    if (!this._ok) return;
    if (n > 0) this._osc('sine', 880, this._t, 0.1, 0.22, this.sfx);
    else { this._osc('sine', 1320, this._t, 0.2, 0.22, this.sfx); this._osc('triangle', 1760, this._t, 0.15, 0.06, this.sfx); }
  }
  // Duelo: le toca al otro (una campanita de dos notas)
  turno() {
    if (!this._ok) return;
    this._osc('triangle', midi(84), this._t, 0.3, 0.14, this.sfx);
    this._osc('triangle', midi(91), this._t + 0.12, 0.45, 0.14, this.sfx);
  }
  // Un botón del menú
  clic() { if (this._ok) this._osc('triangle', 1500, this._t, 0.035, 0.14, this.sfx, 900); }

  // La mecha: tic en cada uno de los últimos pulsos
  tic(urgente) {
    if (!this._ok) return;
    this._osc('sine', urgente ? 1700 : 1250, this._t, 0.05, 0.25, this.sfx);
  }
  explosion() {
    this.vibrar([70, 40, 110]);
    if (!this._ok) return;
    this._ruido(this._t, 0.6, 0.7, this.sfx, 'lowpass', 2500, 120);
    this._osc('sine', 90, this._t, 0.5, 0.6, this.sfx, 30);
  }
  // Al decidirse el microjuego (además del sonido de cada uno)
  bien() {
    this.vibrar(15);
    if (!this._ok) return;
    this._osc('triangle', midi(84), this._t, 0.12, 0.18, this.sfx);
    this._osc('triangle', midi(91), this._t + 0.07, 0.2, 0.18, this.sfx);
  }
  error() {
    this.vibrar(50);
    if (!this._ok) return;
    this._osc('square', 160, this._t, 0.22, 0.14, this.sfx, 120);
    this._osc('square', 168, this._t, 0.22, 0.1, this.sfx, 126);
  }

  toque() { if (this._ok) this._osc('sine', 900, this._t, 0.05, 0.18, this.sfx, 600); }
  pop() {
    if (!this._ok) return;
    this._ruido(this._t, 0.08, 0.5, this.sfx, 'highpass', 2500);
    this._osc('sine', 700, this._t, 0.08, 0.3, this.sfx, 180);
  }
  plaf() {
    if (!this._ok) return;
    this._ruido(this._t, 0.14, 0.6, this.sfx, 'lowpass', 1400, 300);
    this._osc('sine', 160, this._t, 0.12, 0.4, this.sfx, 60);
  }
  corte() { if (this._ok) this._ruido(this._t, 0.14, 0.45, this.sfx, 'bandpass', 2500, 8000, 2); }
  zas() { if (this._ok) this._ruido(this._t, 0.18, 0.3, this.sfx, 'bandpass', 600, 2500, 1.5); }
  salto() {
    if (!this._ok) return;
    this._osc('sine', 300, this._t, 0.14, 0.2, this.sfx, 760);
  }
  golpe() {
    if (!this._ok) return;
    this._ruido(this._t, 0.2, 0.6, this.sfx, 'lowpass', 1200, 200);
    this._osc('sawtooth', 110, this._t, 0.18, 0.25, this.sfx, 45);
  }
  // Una nota que sube con cada acierto (reventar globos, contar...)
  acierto(k) {
    if (!this._ok) return;
    this._osc('triangle', midi(76 + [0, 2, 4, 7, 9, 12, 14, 16, 19][Math.min(8, k)]), this._t, 0.14, 0.16, this.sfx);
  }
  mordida() {
    if (!this._ok) return;
    this._ruido(this._t, 0.06, 0.5, this.sfx, 'lowpass', 1800);
    this._ruido(this._t + 0.1, 0.06, 0.5, this.sfx, 'lowpass', 1500);
  }
  freno() {
    if (!this._ok) return;
    this._ruido(this._t, 0.45, 0.35, this.sfx, 'bandpass', 2200, 1200, 6);
    this._osc('sawtooth', 820, this._t, 0.4, 0.05, this.sfx, 700);
  }
  inflar(k) {
    if (!this._ok) return;
    this._ruido(this._t, 0.07, 0.3, this.sfx, 'bandpass', 500 + k * 90, 900 + k * 120, 2);
  }
  patada() {
    if (!this._ok) return;
    this._osc('sine', 180, this._t, 0.1, 0.6, this.sfx, 60);
    this._ruido(this._t, 0.05, 0.4, this.sfx, 'lowpass', 2000);
  }
  silbato() {
    if (!this._ok) return;
    const c = this.ctx, t = this._t;
    const o = c.createOscillator(), lfo = c.createOscillator(), lg = c.createGain(), g = c.createGain();
    o.frequency.value = 2600; lfo.frequency.value = 38; lg.gain.value = 120;
    lfo.connect(lg); lg.connect(o.frequency);
    this._env(g, t, 0.12, 0.5);
    o.connect(g); g.connect(this.sfx);
    o.start(t); lfo.start(t); o.stop(t + 0.52); lfo.stop(t + 0.52);
  }

  obturador() {
    if (!this._ok) return;
    this._ruido(this._t, 0.03, 0.6, this.sfx, 'highpass', 3000);
    this._ruido(this._t + 0.07, 0.05, 0.4, this.sfx, 'bandpass', 1800, 1200, 2);
  }
  aleteo() {
    if (!this._ok) return;
    this._ruido(this._t, 0.1, 0.3, this.sfx, 'bandpass', 700, 1600, 1.5);
  }

  // --- De algunos microjuegos ----------------------------------------------------
  // La ruleta: un clic de madera por cada gajo que pasa por la flecha
  tictac() {
    if (!this._ok) return;
    this._ruido(this._t, 0.025, 0.7, this.sfx, 'bandpass', 3200, null, 4);
    this._osc('sine', 1900, this._t, 0.018, 0.08, this.sfx);
  }
  // ¡QUE NO TE VEA!: el guardia bosteza ("¡oh, oh!": suelta ya) y despierta
  bostezo() {
    if (!this._ok) return;
    this._osc('triangle', 560, this._t, 0.16, 0.2, this.sfx, 430);
    this._osc('triangle', 470, this._t + 0.17, 0.24, 0.2, this.sfx, 320);
  }
  alerta() {
    if (!this._ok) return;
    this._osc('square', 1400, this._t, 0.06, 0.1, this.sfx);
    this._osc('square', 1400, this._t + 0.09, 0.08, 0.1, this.sfx);
  }
  // ¡DISPARA!: la señal (la falsa suena apagada) y el disparo
  senal(falsa) {
    if (!this._ok) return;
    if (falsa) { this._osc('square', 300, this._t, 0.12, 0.07, this.sfx, 260); return; }
    this._ruido(this._t, 0.02, 0.4, this.sfx, 'highpass', 4000);
    for (const [n, v] of [[91, 0.16], [98, 0.08], [103, 0.05]]) this._osc('sine', midi(n), this._t, 0.45, v, this.sfx);
  }
  disparo() {
    if (!this._ok) return;
    this._ruido(this._t, 0.03, 0.7, this.sfx, 'highpass', 3000);
    this._ruido(this._t, 0.3, 0.8, this.sfx, 'lowpass', 3500, 250);
    this._osc('sine', 170, this._t, 0.2, 0.6, this.sfx, 45);
  }
  // ¡ENCUENTRA EL DIAMANTE!: el vaso que baja a la mesa y el que se levanta
  tapa() {
    if (!this._ok) return;
    this._osc('sine', 240, this._t, 0.09, 0.4, this.sfx, 120);
    this._ruido(this._t, 0.05, 0.25, this.sfx, 'lowpass', 900);
  }
  revelar(diamante) {
    if (!this._ok) return;
    this._ruido(this._t, 0.15, 0.15, this.sfx, 'bandpass', 600, 2400, 1.2);
    if (diamante) this._arpegio([88, 95, 100], 0.05, 0.3, 'triangle', 0.08, this._t + 0.1);
  }
  // ¡NO LO SUELTES!: lo agarraste / se te está escapando
  agarra() { if (this._ok) this._osc('sine', 500, this._t, 0.09, 0.16, this.sfx, 950); }
  seEscapa() {
    if (!this._ok) return;
    this._osc('square', 760, this._t, 0.05, 0.08, this.sfx);
    this._osc('square', 640, this._t + 0.08, 0.07, 0.08, this.sfx);
  }

  // Chorro de agua continuo (microjuego LLENÁ): ruido filtrado mientras dure.
  // (Apagarlo funciona siempre; prenderlo, sólo con el audio andando.)
  chorro(on) {
    if (!this.ctx) return;
    const c = this.ctx;
    if (on && !this.chorroActivo) {
      if (!this._ok) return;
      const s = c.createBufferSource();
      s.buffer = this.ruido; s.loop = true;
      const f = c.createBiquadFilter();
      f.type = 'bandpass'; f.frequency.value = 1100; f.Q.value = 0.8;
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.28, c.currentTime + 0.05);
      s.connect(f); f.connect(g); g.connect(this.sfx);
      s.start();
      this.chorroActivo = { s, g };
    } else if (!on && this.chorroActivo) {
      const { s, g } = this.chorroActivo;
      g.gain.setTargetAtTime(0.0001, c.currentTime, 0.03);
      s.stop(c.currentTime + 0.2);
      this.chorroActivo = null;
    }
  }
}
