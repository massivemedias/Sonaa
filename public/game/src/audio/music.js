// =====================================================================
//  MUSIQUE PROCÉDURALE — 123 BPM, fa# mineur. Kick / hats / basse / nappe
// =====================================================================
const BPM = 123;
const F_SHARP = 46.25; // F#1

export class Music {
  constructor() {
    this.ctx = null; this.on = false; this.step = 0; this.timer = null;
    this.night = false;
  }
  toggle() { this.on ? this.stop() : this.start(); return this.on; }
  start() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.0001;
      this.comp = this.ctx.createDynamicsCompressor();
      this.master.connect(this.comp).connect(this.ctx.destination);
      this.rev = this.ctx.createConvolver();
      this.rev.buffer = impulse(this.ctx, 1.6, 2.4);
      this.revGain = this.ctx.createGain(); this.revGain.gain.value = 0.28;
      this.revGain.connect(this.master); this.rev.connect(this.revGain);
    }
    this.ctx.resume();
    this.on = true;
    this.master.gain.cancelScheduledValues(this.ctx.currentTime);
    this.master.gain.setTargetAtTime(0.38, this.ctx.currentTime, 0.6);
    if (!this.timer) {
      this.nextTime = this.ctx.currentTime + 0.1;
      this.timer = setInterval(() => this.schedule(), 40);
    }
    return true;
  }
  stop() {
    this.on = false;
    if (this.master) this.master.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.3);
  }
  schedule() {
    if (!this.ctx || !this.on) return;
    const spb = 60 / BPM / 4; // pas de double-croche
    while (this.nextTime < this.ctx.currentTime + 0.25) {
      this.playStep(this.step, this.nextTime);
      this.step = (this.step + 1) % 64;
      this.nextTime += spb;
    }
  }
  playStep(i, t) {
    const c = this.ctx, b = i % 16;
    // kick 4/4
    if (b % 4 === 0) this.kick(t);
    // hats : fort / ghost
    if (b % 2 === 1) this.hat(t, b % 4 === 3 ? 0.16 : 0.07);
    // basse : 16ths avec accent sur le "a" (100/66/100/127)
    const vel = [1, .55, .85, 1][b % 4];
    this.bass(t, F_SHARP * (i >= 32 ? 1.122 : 1), vel * 0.5);
    // nappe tous les 2 temps
    if (b === 0) this.pad(t, i >= 32 ? 'A#' : 'F#');
    if (b === 10 && Math.random() < 0.5) this.perc(t);
  }
  kick(t) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.frequency.setValueAtTime(128, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.09);
    g.gain.setValueAtTime(0.95, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
    o.connect(g).connect(this.master); o.start(t); o.stop(t + 0.34);
  }
  hat(t, amp) {
    const c = this.ctx;
    const src = c.createBufferSource();
    src.buffer = noise(c);
    const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 8200;
    const g = c.createGain();
    g.gain.setValueAtTime(amp, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    src.connect(hp).connect(g).connect(this.master);
    g.connect(this.rev);
    src.start(t); src.stop(t + 0.06);
  }
  bass(t, f, amp) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain(), lp = c.createBiquadFilter();
    o.type = 'sawtooth'; o.frequency.value = f;
    lp.type = 'lowpass'; lp.frequency.setValueAtTime(180 + amp * 900, t);
    lp.Q.value = 6;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(amp * 0.32, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);
    o.connect(lp).connect(g).connect(this.master);
    o.start(t); o.stop(t + 0.13);
  }
  pad(t, root) {
    const c = this.ctx;
    const base = root === 'F#' ? 185 : 233; // F#3 / A#3
    const chord = [1, 1.189, 1.498];
    chord.forEach((m, i) => {
      const o = c.createOscillator(), g = c.createGain();
      o.type = 'triangle'; o.frequency.value = base * m;
      o.detune.value = (i - 1) * 7;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.05, t + 0.6);
      g.gain.linearRampToValueAtTime(0.0001, t + 1.9);
      o.connect(g); g.connect(this.master); g.connect(this.rev);
      o.start(t); o.stop(t + 2.0);
    });
  }
  perc(t) {
    const c = this.ctx, src = c.createBufferSource(); src.buffer = noise(c);
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1400; bp.Q.value = 3;
    const g = c.createGain();
    g.gain.setValueAtTime(0.12, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    src.connect(bp).connect(g).connect(this.master); g.connect(this.rev);
    src.start(t); src.stop(t + 0.18);
  }
}

let noiseBuf = null;
function noise(c) {
  if (noiseBuf) return noiseBuf;
  const n = c.sampleRate * 0.4, b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  noiseBuf = b; return b;
}
function impulse(c, dur, decay) {
  const n = c.sampleRate * dur, b = c.createBuffer(2, n, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = b.getChannelData(ch);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decay);
  }
  return b;
}
