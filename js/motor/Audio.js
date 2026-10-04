// ============================================================================
//  Audio.js — el reloj, la música y los efectos (todo sintetizado)
// ----------------------------------------------------------------------------
//  1) RELOJ. Los microjuegos duran una cantidad de pulsos de la música, así
//     que se miden con el reloj del audio (AudioContext.currentTime). Si el
//     audio no arranca, hay un reloj de respaldo con performance.now().
//
//  2) MÚSICA. Cada microjuego tiene su propia cancioncita, inventada al azar
//     a partir de una semilla: otra tonalidad, otra progresión, otra melodía.
//     Como en WarioWare, cada juego "suena distinto" sin un solo archivo.
//
//  3) EFECTOS. Sintetizados: cero descargas, cero licencias.
// ============================================================================

const midi = n => 440 * Math.pow(2, (n - 69) / 12);
const esperar = ms => new Promise(r => setTimeout(r, ms));

const PENTA_MAYOR = [0, 2, 4, 7, 9];
// Progresiones en grados de la escala mayor (un acorde por compás)
const PROGRESIONES = [[0, 4, 5, 3], [0, 5, 3, 4], [5, 3, 0, 4], [0, 3, 4, 3], [0, 0, 3, 4]];
const GRADOS = [0, 2, 4, 5, 7, 9, 11];
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

export class Audio {
  constructor(claveSonido) {
    this.ctx = null;
    this.claveSonido = claveSonido;
    this.sonido = true;
    try { this.sonido = localStorage.getItem(claveSonido) !== '0'; } catch (e) { /* sin almacenamiento */ }
    this._ultAudio = 0; this._ultPerf = 0; this._ultEst = 0;
    this._usarPerf = true;
    this._perfPausado = 0; this._pausadoEn = null;
    this.pista = null;
    this.chorroActivo = null;
  }

  // --------------------------------------------------------------------------
  //  Desbloqueo: en el PRIMER toque. iOS no deja sonar nada antes.
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
    this.master.gain.value = this.sonido ? 0.9 : 0;
    this.master.connect(this.comp);
    this.musica = c.createGain();
    this.musica.gain.value = 0.5;
    this.musica.connect(this.master);
    this.sfx = c.createGain();
    this.sfx.gain.value = 0.9;
    this.sfx.connect(this.master);
    const n = c.sampleRate;
    this.ruido = c.createBuffer(1, n, n);
    const d = this.ruido.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  }

  get audioVivo() { return this.ctx !== null && this.ctx.state === 'running'; }

  setSonido(on) {
    this.sonido = on;
    try { localStorage.setItem(this.claveSonido, on ? '1' : '0'); } catch (e) { /* nada */ }
    if (this.master) this.master.gain.setTargetAtTime(on ? 0.9 : 0, this.ctx.currentTime, 0.02);
  }

  // --------------------------------------------------------------------------
  //  RELOJ — currentTime avanza a saltos; entre salto y salto se interpola con
  //  performance.now() para que el movimiento sea suave.
  // --------------------------------------------------------------------------
  // El reloj se elige al empezar cada partida y no se cambia a mitad.
  iniciarPartida() {
    this._usarPerf = !this.audioVivo;
    this._perfPausado = 0; this._pausadoEn = null;
    this.resincronizar();
  }

  ahora() {
    if (this._usarPerf) {
      const p = this._pausadoEn !== null ? this._pausadoEn : performance.now() / 1000;
      return p - this._perfPausado;
    }
    const a = this.ctx.currentTime, p = performance.now() / 1000;
    if (a !== this._ultAudio) { this._ultAudio = a; this._ultPerf = p; }
    let est = this._ultAudio + (p - this._ultPerf);
    if (est > a + 0.06) est = a + 0.06;
    if (est < this._ultEst) est = this._ultEst;
    this._ultEst = est;
    return est;
  }

  resincronizar() {
    if (!this.ctx) return;
    this._ultAudio = this.ctx.currentTime;
    this._ultPerf = performance.now() / 1000;
    this._ultEst = this.ctx.currentTime;
  }

  async pausar() {
    if (this._usarPerf) {
      if (this._pausadoEn === null) this._pausadoEn = performance.now() / 1000;
    } else if (this.ctx && this.ctx.state === 'running') {
      await this.ctx.suspend();
    }
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
  }

  // --------------------------------------------------------------------------
  //  MÚSICA — una pista por microjuego
  // --------------------------------------------------------------------------
  empezarPista(bpm, t0, semilla) {
    const r = azar(semilla);
    const raiz = 48 + Math.floor(r() * 8);
    const prog = elegir(r, PROGRESIONES);
    const ritmo = elegir(r, RITMOS);
    const bajo = elegir(r, BAJOS);
    // Melodía: un paseo por la pentatónica, con saltos cortos
    const mel = [];
    let g = Math.floor(r() * 5);
    for (let k = 0; k < 16; k++) {
      if (!ritmo[k]) { mel.push(0); continue; }
      g = Math.max(0, Math.min(9, g + Math.floor(r() * 5) - 2));
      mel.push(raiz + 24 + PENTA_MAYOR[g % 5] + 12 * Math.floor(g / 5));
    }
    this.pista = {
      bpm, t0, paso: 0, raiz, prog, mel, bajo,
      caja: r() < 0.5, onda: r() < 0.5 ? 'square' : 'triangle',
    };
  }

  detenerPista() { this.pista = null; }

  // La práctica congela el juego: la pista retoma donde quedó, corrida en el tiempo.
  correrPista(seg) { if (this.pista) this.pista.t0 += seg; }

  // Se llama cada cuadro: agenda los pasos que caen en los próximos 150 ms.
  programar() {
    const p = this.pista;
    if (!p || this._usarPerf) return;
    const hasta = this.ahora() + 0.15;
    const seg16 = 60 / p.bpm / 4;
    for (let guarda = 0; guarda < 32; guarda++) {
      const t = p.t0 + p.paso * seg16;
      if (t > hasta) break;
      if (t >= this.ctx.currentTime - 0.005) this._paso(p, p.paso, t, seg16);
      p.paso++;
    }
  }

  _paso(p, paso, t, seg16) {
    const k = paso % 16;
    const compas = Math.floor(paso / 16);
    const grado = p.prog[compas % p.prog.length];
    const raizAcorde = p.raiz + GRADOS[grado];
    if (k % 4 === 0) this._bombo(t);
    if (p.caja ? (k === 4 || k === 12) : (k === 8)) this._caja(t);
    if (k % 4 === 2) this._hat(t, 0.5);
    if (p.bajo.includes(k)) this._bajo(t, raizAcorde - 12, seg16 * 1.6);
    if (p.mel[k]) this._nota(p.onda, t, p.mel[k], seg16 * 1.4, 0.07);
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

  _bombo(t) { this._osc('sine', 150, t, 0.22, 0.9, this.musica, 45); }
  _caja(t) { this._ruido(t, 0.12, 0.35, this.musica, 'highpass', 1500); }
  _hat(t, v) { this._ruido(t, 0.04, 0.25 * v, this.musica, 'highpass', 7500); }
  _bajo(t, n, dur) {
    const c = this.ctx;
    const o = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain();
    o.type = 'sawtooth'; o.frequency.value = midi(n);
    f.type = 'lowpass'; f.Q.value = 6;
    f.frequency.setValueAtTime(900, t);
    f.frequency.exponentialRampToValueAtTime(200, t + dur);
    this._env(g, t, 0.3, dur);
    o.connect(f); f.connect(g); g.connect(this.musica);
    o.start(t); o.stop(t + dur + 0.02);
  }
  _nota(onda, t, n, dur, v) { this._osc(onda, midi(n), t, dur, v, this.musica); }

  // Varias notas seguidas (jingles)
  _arpegio(notas, sep, dur, onda = 'square', v = 0.12, t0 = null) {
    const t = t0 === null ? this._t : t0;
    notas.forEach((n, i) => this._osc(onda, midi(n), t + i * sep, dur, v, this.sfx));
  }

  // --------------------------------------------------------------------------
  //  JINGLES Y EFECTOS — todos protegidos: si no hay audio, no hacen nada.
  // --------------------------------------------------------------------------
  get _t() { return this.ctx.currentTime + 0.005; }
  get _ok() { return this.audioVivo; }

  gano() {
    if (!this._ok) return;
    this._arpegio([72, 76, 79, 84], 0.07, 0.18, 'square', 0.1);
    this._arpegio([84, 88], 0.07, 0.3, 'triangle', 0.14, this._t + 0.28);
  }
  perdio() {
    if (!this._ok) return;
    this._arpegio([67, 63, 60], 0.11, 0.22, 'square', 0.1);
    this._osc('sawtooth', 110, this._t + 0.33, 0.45, 0.16, this.sfx, 55);
  }
  acelera() {
    if (!this._ok) return;
    this._ruido(this._t, 0.5, 0.18, this.sfx, 'bandpass', 300, 4000, 1.2);
    this._arpegio([60, 64, 67, 72, 76, 79, 84], 0.05, 0.12, 'square', 0.09, this._t + 0.2);
  }
  masDificil() {
    if (!this._ok) return;
    this._arpegio([48, 55, 60, 63, 67, 72], 0.06, 0.2, 'sawtooth', 0.07);
  }
  finPartida() {
    if (!this._ok) return;
    this._arpegio([72, 71, 70, 69], 0.2, 0.3, 'triangle', 0.14);
    this._osc('sine', 90, this._t + 0.85, 0.8, 0.5, this.sfx, 35);
  }
  record() {
    if (!this._ok) return;
    this._arpegio([72, 76, 79, 84, 79, 84, 88], 0.09, 0.2, 'square', 0.1);
  }
  // Anuncio de jefe: redoble grave y un acorde amenazante
  jefe() {
    if (!this._ok) return;
    for (let i = 0; i < 8; i++) this._osc('sine', 90, this._t + i * 0.06, 0.08, 0.4, this.sfx, 60);
    this._arpegio([48, 51, 54, 57], 0.03, 0.8, 'sawtooth', 0.07, this._t + 0.5);
  }
  empieza() {
    if (!this._ok) return;
    this._ruido(this._t, 0.35, 0.18, this.sfx, 'bandpass', 400, 3000, 1);
    this._osc('sine', 330, this._t, 0.3, 0.12, this.sfx, 880);
  }
  // La mecha: tic en cada uno de los últimos pulsos
  tic(urgente) {
    if (!this._ok) return;
    this._osc('sine', urgente ? 1700 : 1250, this._t, 0.05, 0.25, this.sfx);
  }
  explosion() {
    if (!this._ok) return;
    this._ruido(this._t, 0.6, 0.7, this.sfx, 'lowpass', 2500, 120);
    this._osc('sine', 90, this._t, 0.5, 0.6, this.sfx, 30);
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
  error() {
    if (!this._ok) return;
    this._osc('square', 160, this._t, 0.22, 0.14, this.sfx, 120);
    this._osc('square', 168, this._t, 0.22, 0.1, this.sfx, 126);
  }
  bien() {
    if (!this._ok) return;
    this._osc('triangle', midi(84), this._t, 0.12, 0.18, this.sfx);
    this._osc('triangle', midi(91), this._t + 0.07, 0.2, 0.18, this.sfx);
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

  // Chorro de agua continuo (microjuego LLENÁ): ruido filtrado mientras dure.
  chorro(on) {
    if (!this._ok) return;
    const c = this.ctx;
    if (on && !this.chorroActivo) {
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
