// Instruments: each function renders ONE note/hit into a mono Float32Array.
const { SR, TAU, rng, Pink, Saw, Square, Sine, SVF, OnePole, adsr, expDecay } = require('./dsp');
const { mtof } = require('../music');

const buf = (sec) => new Float32Array(Math.max(1, Math.ceil(sec * SR)));

// ================= DRUMS =================
function kick({ punch = 1, tail = 0.32, seed = 1 } = {}) {
  const out = buf(tail * 2.4);
  const w = rng(seed);
  let ph = 0;
  const hp = new OnePole();
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    const f = 46 + (175 - 46) * Math.exp(-t / 0.032) + 30 * Math.exp(-t / 0.006);
    ph += f / SR;
    const body = Math.sin(TAU * ph) * Math.exp(-t / tail) * Math.min(1, t / 0.0015);
    const click = hp.hp(w(), 1500) * Math.exp(-t / 0.004) * 0.45 * punch;
    out[i] = Math.tanh((body * 1.25 + click) * 1.4) * 0.9;
  }
  return out;
}

function snare({ tone = 1, snap = 1, decay = 0.13, seed = 2 } = {}) {
  const out = buf(decay * 4);
  const w = rng(seed);
  const hp = new SVF(), bp = new SVF();
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    const tn = (Math.sin(TAU * 185 * t) * Math.exp(-t / 0.055) * 0.55 + Math.sin(TAU * 330 * t) * Math.exp(-t / 0.035) * 0.3) * tone;
    let n = w();
    n = hp.hp(n, 1400, 0.7);
    n = n * 0.7 + bp.bp(n, 5200, 0.9) * 0.6;
    const nz = n * Math.exp(-t / decay) * 0.9 * snap;
    out[i] = Math.tanh((tn + nz) * 1.3) * 0.8;
  }
  return out;
}

function clap({ decay = 0.16, seed = 3, spread = 0.011 } = {}) {
  const out = buf(0.7);
  const w = rng(seed);
  const bp = new SVF(), hp = new SVF();
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    let env = 0;
    for (let k = 0; k < 3; k++) {
      const tk = t - k * spread;
      if (tk >= 0) env = Math.max(env, Math.exp(-tk / 0.0045));
    }
    const tt = t - 3 * spread;
    if (tt >= 0) env = Math.max(env, Math.exp(-tt / decay) * 0.85);
    let n = w();
    n = bp.bp(n, 1250, 1.4) * 1.6 + hp.hp(n, 3000, 0.7) * 0.25;
    out[i] = n * env;
  }
  return out;
}

const HAT_FREQS = [205.3, 304.4, 369.6, 522.7, 540.0, 800.0];
function metal(len, decay, { hpHz = 7000, seed = 4, noiseMix = 0.35, gain = 1 } = {}) {
  const out = buf(len);
  const w = rng(seed);
  const oscs = HAT_FREQS.map((f, i) => new Square(i * 0.13));
  const hp = new SVF(), bp = new SVF();
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    let s = 0;
    for (let k = 0; k < oscs.length; k++) s += oscs[k].next(HAT_FREQS[k] * 1.9);
    s = s / 6 * (1 - noiseMix) + w() * noiseMix;
    s = hp.hp(s, hpHz, 0.8);
    s = s * 0.6 + bp.bp(s, 10500, 1) * 0.6;
    out[i] = s * expDecay(t, decay) * Math.min(1, t / 0.0008) * gain;
  }
  return out;
}
const hat = (open = false, seed = 5) => metal(open ? 0.9 : 0.12, open ? 0.2 : 0.028, { seed });
const crash = (seed = 6) => metal(3.2, 1.05, { hpHz: 4200, seed, noiseMix: 0.55, gain: 0.9 });

function tom(freq = 110, decay = 0.26, seed = 7) {
  const out = buf(decay * 4);
  const w = rng(seed);
  let ph = 0;
  const lp = new OnePole();
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    const f = freq * (1 + 0.55 * Math.exp(-t / 0.03));
    ph += f / SR;
    const s = Math.sin(TAU * ph) * Math.exp(-t / decay) + lp.lp(w(), 2000) * Math.exp(-t / 0.02) * 0.4;
    out[i] = Math.tanh(s * 1.3) * 0.8;
  }
  return out;
}

function shaker(accent = 1, seed = 8) {
  const out = buf(0.12);
  const w = rng(seed);
  const bp = new SVF();
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    const env = (t < 0.012 ? t / 0.012 : Math.exp(-(t - 0.012) / 0.03)) * accent;
    out[i] = bp.bp(w(), 6500, 1.3) * env * 1.6;
  }
  return out;
}

// agogô / samba bell via FM
function bell(freq, decay = 0.18, index = 2.2, ratio = 1.414) {
  const out = buf(decay * 5);
  let pc = 0, pm = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    pm += (freq * ratio) / SR;
    const mod = Math.sin(TAU * pm) * index * Math.exp(-t / (decay * 0.6));
    pc += freq / SR;
    out[i] = Math.sin(TAU * pc + mod) * Math.exp(-t / decay) * Math.min(1, t / 0.001);
  }
  return out;
}

// ================= BASS =================
function bass(midi, dur, { bright = 1, sub = 0.6, seed = 9 } = {}) {
  const f = mtof(midi);
  const out = buf(dur + 0.08);
  const saw = new Saw(0.3), sq = new Square(0.1), sine = new Sine();
  const lp = new SVF();
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    const env = adsr(t, dur, 0.004, 0.14, 0.72, 0.05);
    const cutoff = 160 + (1500 * bright) * Math.exp(-t / 0.09) + 250 * bright;
    let s = saw.next(f) * 0.6 + sq.next(f * 0.5 * 2) * 0.2;
    s = lp.lp(s, cutoff, 1.1);
    s += sine.next(f) * sub;
    out[i] = Math.tanh(s * 1.4 * env) * 0.8;
  }
  return out;
}

// ================= PAD (supersaw) =================
function padNote(midi, dur, { cutoff = 1600, attack = 0.35, release = 0.9, detune = 0.12, seed = 10 } = {}) {
  const f = mtof(midi);
  const L = buf(dur + release + 0.05), R = buf(dur + release + 0.05);
  const n = 5;
  const oscL = [], oscR = [], dt = [];
  const r = rng(seed + midi);
  for (let k = 0; k < n; k++) {
    oscL.push(new Saw(Math.abs(r())));
    oscR.push(new Saw(Math.abs(r())));
    dt.push(((k - (n - 1) / 2) / ((n - 1) / 2)) * detune);
  }
  const fl = new SVF(), fr = new SVF();
  for (let i = 0; i < L.length; i++) {
    const t = i / SR;
    const env = adsr(t, dur, attack, 0.3, 0.85, release);
    let sl = 0, sr = 0;
    for (let k = 0; k < n; k++) {
      sl += oscL[k].next(f * Math.pow(2, (dt[k] + 0.013 * Math.sin(t * 0.7 + k)) / 12));
      sr += oscR[k].next(f * Math.pow(2, (-dt[k] + 0.013 * Math.sin(t * 0.9 + k * 2)) / 12));
    }
    const c = cutoff * (0.85 + 0.15 * Math.sin(t * 1.3));
    L[i] = fl.lp(sl / n, c, 0.8) * env;
    R[i] = fr.lp(sr / n, c, 0.8) * env;
  }
  return { L, R };
}

// offbeat keyboard "skank" pluck (one note)
function pluck(midi, { decay = 0.16, cutoff = 3200, seed = 11 } = {}) {
  const f = mtof(midi);
  const out = buf(decay * 4);
  const s1 = new Saw(0.1), s2 = new Square(0.4, 0.35);
  const lp = new SVF();
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    let s = s1.next(f * 1.003) * 0.5 + s2.next(f * 0.997) * 0.4;
    s = lp.lp(s, 350 + cutoff * Math.exp(-t / 0.05), 1.3);
    out[i] = s * Math.exp(-t / decay) * Math.min(1, t / 0.002);
  }
  return out;
}

// plucked acoustic guitar (Karplus-Strong). An allpass sets the fractional delay, so every note
// is in tune (±2 cents measured); two body resonances give the wooden box. dur = how long it rings
// before the string is damped. bright 0.3 (warm, thumb) … 0.8 (pick), sustain 0.99 (short) … 0.998 (long).
function guitar(midi, dur = 0.8, { bright = 0.55, sustain = 0.9965, seed = 1 } = {}) {
  const P = SR / mtof(midi);
  const Nd = Math.max(2, Math.floor(P - 0.6));
  const d = P - 0.5 - Nd, c = (1 - d) / (1 + d); // allpass for the fractional part of the loop delay
  const out = buf(dur + 0.9);
  const line = new Float32Array(Nd);
  const r = rng(seed * 7 + midi);
  let lp = 0;
  for (let i = 0; i < Nd; i++) { lp += (r() - lp) * bright; line[i] = lp; }
  let w = 0, last = 0, apX = 0, apY = 0;
  const bodyA = new SVF(), bodyB = new SVF();
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    const y0 = line[w];
    const avg = 0.5 * (y0 + last); last = y0;
    const ap = c * avg + apX - c * apY; apX = avg; apY = ap;
    line[w] = ap * (t < dur ? sustain : 0.93);
    w = (w + 1) % Nd;
    const s = y0 * 0.7 + bodyA.bp(y0, 330, 1.2) * 0.5 + bodyB.bp(y0, 1900, 2.5) * 0.22;
    out[i] = s * Math.min(1, t / 0.002) * 0.9;
  }
  return out;
}

// warm FM electric piano (a Rhodes-like bell tine). index = brightness of the attack.
function epiano(midi, dur = 0.6, { index = 1.6, decay = 1.1 } = {}) {
  const f = mtof(midi);
  const out = buf(dur + 0.8);
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    const idx = index * Math.exp(-t / 0.22) + 0.25;
    const env = Math.min(1, t / 0.003) * Math.exp(-t / decay) * (t > dur ? Math.max(0, 1 - (t - dur) / 0.3) : 1);
    const s = Math.sin(TAU * f * t + idx * Math.sin(TAU * f * t)) + 0.22 * Math.sin(TAU * 2 * f * t) * Math.exp(-t / 0.25) + 0.08 * Math.sin(TAU * 14 * f * t) * Math.exp(-t / 0.02);
    out[i] = s * env * 0.6;
  }
  return out;
}

// ================= MALLETS =================
function musicBox(midi, { decay = 1.4, seed = 12 } = {}) {
  const f = mtof(midi);
  const out = buf(decay * 3.5);
  const w = rng(seed + midi);
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    const a = Math.min(1, t / 0.0015);
    let s = Math.sin(TAU * f * t) * Math.exp(-t / decay);
    s += 0.28 * Math.sin(TAU * f * 3.0 * t + 0.4) * Math.exp(-t / (decay * 0.18));
    s += 0.12 * Math.sin(TAU * f * 5.43 * t) * Math.exp(-t / 0.06);
    s += 0.05 * Math.sin(TAU * f * 8.1 * t) * Math.exp(-t / 0.025);
    s += w() * Math.exp(-t / 0.0015) * 0.15;
    out[i] = s * a * 0.8;
  }
  return out;
}

function marimba(midi, { decay = 0.42, thock = 0.35, seed = 13 } = {}) {
  const f = mtof(midi);
  const out = buf(decay * 4);
  const w = rng(seed + midi);
  const lp = new OnePole();
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    let s = Math.sin(TAU * f * t) * Math.exp(-t / decay);
    s += 0.45 * Math.sin(TAU * f * 3.93 * t) * Math.exp(-t / 0.07);
    s += 0.12 * Math.sin(TAU * f * 9.2 * t) * Math.exp(-t / 0.018);
    // the ball being kicked: a soft leathery thock
    s += lp.lp(w(), 900) * Math.exp(-t / 0.012) * thock * 3;
    s += Math.sin(TAU * 120 * t) * Math.exp(-t / 0.03) * thock * 0.6;
    out[i] = s * Math.min(1, t / 0.001) * 0.75;
  }
  return out;
}

// ================= BRASS =================
function brassNote(midi, dur, { bright = 1, seed = 14, stab = false } = {}) {
  const f = mtof(midi);
  const rel = stab ? 0.09 : 0.14;
  const L = buf(dur + rel + 0.05), R = buf(dur + rel + 0.05);
  const r = rng(seed + midi * 7);
  const sl = [new Saw(Math.abs(r())), new Saw(Math.abs(r())), new Saw(Math.abs(r()))];
  const sr = [new Saw(Math.abs(r())), new Saw(Math.abs(r())), new Saw(Math.abs(r()))];
  const sub = new Square(0.2, 0.5);
  const fl = new SVF(), fr = new SVF();
  const vibPh = Math.abs(r()) * TAU;
  for (let i = 0; i < L.length; i++) {
    const t = i / SR;
    const env = adsr(t, dur, stab ? 0.006 : 0.018, stab ? 0.12 : 0.25, stab ? 0.55 : 0.82, rel);
    const scoop = -0.45 * Math.exp(-t / 0.028);
    const vib = t > 0.2 ? 0.12 * Math.min(1, (t - 0.2) / 0.3) * Math.sin(TAU * 5.6 * t + vibPh) : 0;
    const semis = scoop + vib;
    const ff = f * Math.pow(2, semis / 12);
    const fEnv = Math.min(1, t / 0.035) * (0.55 + 0.45 * Math.exp(-t / 0.28));
    const cutoff = (500 + 3200 * fEnv * bright) * (1 + 0.1 * Math.sin(TAU * 5.6 * t));
    const d = [1, 1.0045, 0.9955];
    let a = 0, b = 0;
    for (let k = 0; k < 3; k++) { a += sl[k].next(ff * d[k]); b += sr[k].next(ff * d[2 - k] * 1.0007); }
    const s2 = sub.next(ff * 0.5) * 0.25;
    L[i] = Math.tanh(fl.lp(a / 3 + s2, cutoff, 1.1) * 1.6 * env) * 0.7;
    R[i] = Math.tanh(fr.lp(b / 3 + s2, cutoff, 1.1) * 1.6 * env) * 0.7;
  }
  return { L, R };
}

// ================= CHOIR (formant synthesis) =================
// Tenor / alto vowel formants: [freq, gainDb, bandwidth]
const VOWELS = {
  tenor: {
    o: [[400, 0, 40], [800, -10, 80], [2600, -12, 100], [2800, -12, 120], [3000, -26, 120]],
    e: [[400, 0, 60], [1700, -14, 90], [2600, -16, 120], [3200, -22, 150], [3580, -35, 200]],
    l: [[330, 0, 60], [1100, -18, 90], [2500, -26, 120], [3000, -30, 150], [3500, -40, 200]],
    u: [[350, 0, 40], [600, -20, 60], [2700, -17, 100], [2900, -14, 120], [3300, -26, 120]],
    a: [[650, 0, 80], [1080, -6, 90], [2650, -7, 120], [2900, -8, 130], [3250, -22, 140]],
  },
  alto: {
    o: [[450, 0, 70], [800, -9, 80], [2830, -16, 100], [3500, -28, 130], [4950, -55, 135]],
    e: [[420, 0, 60], [1650, -20, 80], [2700, -26, 120], [3300, -32, 150], [4950, -50, 200]],
    l: [[350, 0, 60], [1200, -20, 90], [2600, -30, 120], [3300, -36, 150], [4950, -55, 200]],
    u: [[325, 0, 50], [700, -12, 60], [2530, -30, 170], [3500, -40, 180], [4950, -64, 200]],
    a: [[800, 0, 80], [1150, -4, 90], [2800, -20, 120], [3500, -36, 130], [4950, -60, 140]],
  },
};
const lerpF = (A, B, x) => A.map((fa, i) => [fa[0] + (B[i][0] - fa[0]) * x, fa[1] + (B[i][1] - fa[1]) * x, fa[2] + (B[i][2] - fa[2]) * x]);

// One singer, one syllable. syl: 'o' | 'le' | 'u' | 'a' ; glide: semitones over the note
function voice(midi, dur, { syl = 'o', type = 'tenor', seed = 1, vib = 0.18, glide = 0, breath = 0.08, shout = 1 } = {}) {
  const f0 = mtof(midi);
  const rel = 0.09;
  const out = buf(dur + rel + 0.02);
  const r = rng(seed);
  const saw = new Saw(Math.abs(r()));
  const saw2 = new Saw(Math.abs(r()));
  const nz = rng(seed * 31 + 7);
  const filters = [new SVF(), new SVF(), new SVF(), new SVF(), new SVF()];
  const tilt = new OnePole();
  const V = VOWELS[type];
  const vibRate = 5.2 + r() * 1.2;
  const vibPh = Math.abs(r()) * TAU;
  const drift = r() * 0.12;
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    // syllable shape: "le" starts with a short 'l' then opens to 'e'
    let F;
    let ampShape = 1;
    if (syl === 'le') {
      const x = Math.min(1, t / 0.07);
      F = lerpF(V.l, V.e, x * x * (3 - 2 * x));
      ampShape = 0.55 + 0.45 * x;
    } else if (syl === 'o') {
      F = V.o;
    } else if (syl === 'u') {
      const x = Math.min(1, t / Math.max(0.1, dur));
      F = lerpF(V.u, V.o, x * 0.5);
    } else {
      F = V[syl] || V.a;
    }
    const env = adsr(t, dur, 0.035, 0.12, 0.85, rel) * ampShape;
    const vibAmt = t > 0.12 ? vib * Math.min(1, (t - 0.12) / 0.25) : 0;
    const semis = drift + vibAmt * Math.sin(TAU * vibRate * t + vibPh) + glide * Math.min(1, t / Math.max(0.05, dur)) - 0.35 * Math.exp(-t / 0.04);
    const f = f0 * Math.pow(2, semis / 12);
    // glottal-ish source: two slightly detuned saws, tilted, plus breath
    let src = saw.next(f) * 0.7 + saw2.next(f * 1.003) * 0.3;
    src = tilt.lp(src, 1800 * shout + 600) * 0.7 + src * 0.3;
    src += nz() * breath;
    let s = 0;
    for (let k = 0; k < 5; k++) {
      const [ff, db, bw] = F[k];
      s += filters[k].bp(src, ff, ff / bw) * Math.pow(10, db / 20);
    }
    out[i] = s * env * 1.4;
  }
  return out;
}

// ================= FX =================
function noiseSweep(len, f0, f1, { q = 1.2, shape = (x) => Math.sin(Math.PI * x), seed = 20, pink = false } = {}) {
  const out = buf(len);
  const w = rng(seed);
  const p = new Pink(seed);
  const bp = new SVF();
  for (let i = 0; i < out.length; i++) {
    const x = i / out.length;
    const f = f0 * Math.pow(f1 / f0, x);
    out[i] = bp.bp(pink ? p.next() * 3 : w(), f, q) * shape(x);
  }
  return out;
}

function boing() {
  const out = buf(0.8);
  let ph = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    const base = 170 + 260 * Math.min(1, t / 0.18);
    const f = base * (1 + 0.28 * Math.sin(TAU * 16 * t) * Math.exp(-t / 0.22));
    ph += f / SR;
    const s = Math.sin(TAU * ph) * 0.8 + Math.sin(TAU * ph * 2) * 0.15;
    out[i] = s * Math.exp(-t / 0.22) * Math.min(1, t / 0.004) * 0.8;
  }
  return out;
}

function thud(freq = 90, decay = 0.09, seed = 21) {
  const out = buf(decay * 5);
  const w = rng(seed);
  const lp = new OnePole();
  let ph = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    ph += (freq * (0.55 + 0.45 * Math.exp(-t / 0.04))) / SR;
    out[i] = (Math.sin(TAU * ph) * 0.9 + lp.lp(w(), 500) * 1.2) * Math.exp(-t / decay);
  }
  return out;
}

function paperFwip(pitch = 1, seed = 22) {
  const out = buf(0.16);
  const w = rng(seed);
  const bp = new SVF();
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    const x = t / 0.16;
    const f = 1800 * pitch * Math.pow(3.2, x);
    const env = Math.sin(Math.PI * Math.min(1, x * 1.4)) * (1 - x);
    out[i] = bp.bp(w(), f, 1.6) * env * 1.2 + Math.sin(TAU * 900 * pitch * t) * Math.exp(-t / 0.02) * 0.15;
  }
  return out;
}

function tvClick() {
  const out = buf(0.9);
  const w = rng(23);
  const hp = new SVF(), lp = new OnePole();
  let ph = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    let s = 0;
    s += (i < 30 ? 1 - i / 30 : 0) * 0.9; // the click
    s += hp.hp(w(), 2500, 0.7) * Math.exp(-t / 0.004) * 0.6;
    ph += (58 + 30 * Math.exp(-t / 0.05)) / SR;
    s += Math.sin(TAU * ph) * Math.exp(-t / 0.18) * 0.7 * Math.min(1, t / 0.01); // thoom
    s += lp.lp(w(), 5000) * Math.exp(-t / 0.22) * 0.18 * Math.min(1, t / 0.02); // static
    out[i] = s;
  }
  return out;
}

function whistle(len = 0.42) {
  const out = buf(len + 0.05);
  const w = rng(24);
  const bp = new SVF();
  let ph = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    const trill = Math.sin(TAU * 27 * t);
    ph += (2850 + 95 * trill) / SR;
    const env = Math.min(1, t / 0.02) * (t > len ? Math.max(0, 1 - (t - len) / 0.04) : 1);
    const am = 0.72 + 0.28 * trill;
    out[i] = (Math.sin(TAU * ph) * am * 0.5 + bp.bp(w(), 2900, 4) * 0.35) * env;
  }
  return out;
}

function bwomp() {
  const out = buf(0.9);
  const saw = new Saw(), lp = new SVF();
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    const f = 98 * Math.pow(0.5, t / 0.6);
    const s = lp.lp(saw.next(f) + saw.next(f * 1.006) * 0.0, 300 + 900 * Math.exp(-t / 0.1), 2.5);
    out[i] = Math.tanh(s * 2) * Math.exp(-t / 0.35) * 0.8;
  }
  return out;
}

function heartbeat() {
  const out = buf(0.55);
  const w = rng(25);
  const lp = new OnePole();
  let p1 = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    let s = 0;
    for (const [t0, a] of [[0, 1], [0.19, 0.6]]) {
      const tt = t - t0;
      if (tt < 0) continue;
      const f = 52 + 32 * Math.exp(-tt / 0.025);
      s += Math.sin(TAU * f * tt) * Math.exp(-tt / 0.075) * a * Math.min(1, tt / 0.004);
    }
    p1 = lp.lp(w(), 180);
    out[i] = Math.tanh((s + p1 * 0.4 * Math.exp(-t / 0.1)) * 1.8);
  }
  return out;
}

function woodTick(pitch = 1) {
  const out = buf(0.08);
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    out[i] = (Math.sin(TAU * 1900 * pitch * t) * 0.6 + Math.sin(TAU * 2870 * pitch * t) * 0.3) * Math.exp(-t / 0.014);
  }
  return out;
}

function thwack() {
  const out = buf(0.8);
  const w = rng(26);
  const hp = new SVF(), lp = new OnePole();
  let ph = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    ph += (48 + 110 * Math.exp(-t / 0.03)) / SR;
    let s = Math.sin(TAU * ph) * Math.exp(-t / 0.22) * 1.1;
    s += hp.hp(w(), 1800, 0.8) * Math.exp(-t / 0.018) * 1.1;
    s += lp.lp(w(), 700) * Math.exp(-t / 0.06) * 1.4;
    out[i] = Math.tanh(s * 1.6) * 0.9;
  }
  return out;
}

function subBoom(len = 2.2, f0 = 62, f1 = 28) {
  const out = buf(len);
  const w = rng(27);
  const lp = new OnePole();
  let ph = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    ph += (f1 + (f0 - f1) * Math.exp(-t / 0.35)) / SR;
    const s = Math.sin(TAU * ph) * Math.exp(-t / 0.9) + lp.lp(w(), 300) * Math.exp(-t / 0.3) * 1.4;
    out[i] = Math.tanh(s * 1.5) * Math.min(1, t / 0.003);
  }
  return out;
}

function pop(pitch = 2000, seed = 28) {
  const out = buf(0.04);
  const w = rng(seed);
  const bp = new SVF();
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    out[i] = (Math.sin(TAU * pitch * t) * 0.6 + bp.bp(w(), pitch * 1.6, 2) * 0.8) * Math.exp(-t / 0.006);
  }
  return out;
}

function fireworkBurst(seed = 29, size = 1) {
  const len = 2.2;
  const out = buf(len);
  const w = rng(seed);
  const lp = new OnePole(), lp2 = new OnePole();
  let ph = 0;
  // crackle times
  const cr = [];
  for (let k = 0; k < 70; k++) {
    const u = Math.abs(w());
    cr.push({ t: 0.12 + Math.pow(u, 1.6) * 1.5, a: 0.2 + Math.abs(w()) * 0.5, f: 2500 + Math.abs(w()) * 5000 });
  }
  cr.sort((a, b) => a.t - b.t);
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    ph += (38 + 50 * Math.exp(-t / 0.06)) / SR;
    let s = Math.sin(TAU * ph) * Math.exp(-t / 0.28) * 0.9 * size;
    s += lp.lp(w(), 1400) * Math.exp(-t / 0.12) * 1.3 * size;
    s += lp2.lp(w(), 5000) * Math.exp(-t / 0.5) * 0.12;
    out[i] = Math.tanh(s * 1.3);
  }
  for (const c of cr) {
    const st = Math.round(c.t * SR);
    const decay = 0.9 - c.t * 0.35;
    for (let j = 0; j < 180 && st + j < out.length; j++) {
      out[st + j] += Math.sin((TAU * c.f * j) / SR) * Math.exp(-j / 40) * c.a * decay * 0.5 * (w() * 0.5 + 0.5);
    }
  }
  return out;
}

function launchWhistle(len = 0.6, seed = 30) {
  const out = buf(len);
  const w = rng(seed);
  const bp = new SVF();
  let ph = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    const x = t / len;
    ph += (700 + 1600 * x * x) / SR;
    out[i] = (Math.sin(TAU * ph) * 0.25 + bp.bp(w(), 3000 + 3000 * x, 3) * 0.3) * Math.sin(Math.PI * Math.min(1, x * 1.1)) * 0.6;
  }
  return out;
}

function scribble(len, seed = 31) {
  const out = buf(len);
  const w = rng(seed);
  const bp = new SVF(), hp = new OnePole();
  const r = rng(seed * 3);
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    const stroke = Math.pow(Math.abs(Math.sin(TAU * (7 + 3 * Math.sin(t * 5)) * t + r() * 0.02)), 0.5);
    const f = 2600 + 900 * Math.sin(TAU * 3.1 * t);
    const env = Math.min(1, t / 0.03) * Math.min(1, (len - t) / 0.05);
    out[i] = hp.hp(bp.bp(w(), f, 0.9), 900) * stroke * env * 0.9;
  }
  return out;
}

module.exports = {
  kick, snare, clap, hat, crash, tom, shaker, bell, bass, padNote, pluck, guitar, epiano, musicBox, marimba, brassNote, voice,
  noiseSweep, boing, thud, paperFwip, tvClick, whistle, bwomp, heartbeat, woodTick, thwack, subBoom, pop,
  fireworkBurst, launchWhistle, scribble, buf,
};
