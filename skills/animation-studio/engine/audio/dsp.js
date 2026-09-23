// Tiny DSP toolkit — everything the soundtrack needs, written from scratch.
const SR = 48000;
const TAU = Math.PI * 2;

class Bus {
  constructor(n) {
    this.L = new Float32Array(n);
    this.R = new Float32Array(n);
    this.n = n;
  }
  // mix a mono buffer in at time t (seconds), gain + constant-power pan (-1..1)
  addMono(buf, t, gain = 1, pan = 0) {
    const start = Math.round(t * SR);
    const a = ((pan + 1) * Math.PI) / 4;
    const gl = Math.cos(a) * gain * Math.SQRT2;
    const gr = Math.sin(a) * gain * Math.SQRT2;
    for (let i = 0; i < buf.length; i++) {
      const j = start + i;
      if (j < 0) continue;
      if (j >= this.n) break;
      this.L[j] += buf[i] * gl;
      this.R[j] += buf[i] * gr;
    }
  }
  addStereo(bl, br, t, gain = 1) {
    const start = Math.round(t * SR);
    for (let i = 0; i < bl.length; i++) {
      const j = start + i;
      if (j < 0) continue;
      if (j >= this.n) break;
      this.L[j] += bl[i] * gain;
      this.R[j] += br[i] * gain;
    }
  }
  mixInto(dst, gain = 1) {
    for (let i = 0; i < this.n; i++) {
      dst.L[i] += this.L[i] * gain;
      dst.R[i] += this.R[i] * gain;
    }
  }
  applyGain(fn) {
    // fn(tSeconds) -> gain, evaluated per sample
    for (let i = 0; i < this.n; i++) {
      const g = fn(i / SR);
      this.L[i] *= g;
      this.R[i] *= g;
    }
  }
}

// ---------- noise ----------
function rng(seed) {
  let a = seed >>> 0 || 1;
  return () => {
    a ^= a << 13; a >>>= 0;
    a ^= a >>> 17;
    a ^= a << 5; a >>>= 0;
    return (a / 4294967296) * 2 - 1;
  };
}
class Pink {
  constructor(seed = 1) {
    this.w = rng(seed);
    this.b = [0, 0, 0, 0, 0, 0, 0];
  }
  next() {
    const w = this.w();
    const b = this.b;
    b[0] = 0.99886 * b[0] + w * 0.0555179;
    b[1] = 0.99332 * b[1] + w * 0.0750759;
    b[2] = 0.969 * b[2] + w * 0.153852;
    b[3] = 0.8665 * b[3] + w * 0.3104856;
    b[4] = 0.55 * b[4] + w * 0.5329522;
    b[5] = -0.7616 * b[5] - w * 0.016898;
    const out = b[0] + b[1] + b[2] + b[3] + b[4] + b[5] + b[6] + w * 0.5362;
    b[6] = w * 0.115926;
    return out * 0.11;
  }
}

// ---------- oscillators ----------
function polyblep(t, dt) {
  if (t < dt) { t /= dt; return t + t - t * t - 1; }
  if (t > 1 - dt) { t = (t - 1) / dt; return t * t + t + t + 1; }
  return 0;
}
class Saw {
  constructor(phase = 0) { this.p = phase; }
  next(freq) {
    const dt = freq / SR;
    this.p += dt;
    if (this.p >= 1) this.p -= 1;
    return 2 * this.p - 1 - polyblep(this.p, dt);
  }
}
class Square {
  constructor(phase = 0, pw = 0.5) { this.p = phase; this.pw = pw; }
  next(freq) {
    const dt = freq / SR;
    this.p += dt;
    if (this.p >= 1) this.p -= 1;
    let v = this.p < this.pw ? 1 : -1;
    v += polyblep(this.p, dt);
    let p2 = this.p - this.pw; if (p2 < 0) p2 += 1;
    v -= polyblep(p2, dt);
    return v;
  }
}
class Sine {
  constructor(phase = 0) { this.p = phase; }
  next(freq) {
    this.p += freq / SR;
    if (this.p >= 1) this.p -= 1;
    return Math.sin(TAU * this.p);
  }
}

// ---------- filters ----------
// Cytomic / Simper TPT state-variable filter
class SVF {
  constructor() { this.a = 0; this.b = 0; this.low = 0; this.band = 0; this.high = 0; this.k = 1; this.cf = -1; this.cq = -1; }
  run(x, cutoff, q = 0.707) {
    if (cutoff !== this.cf || q !== this.cq) {
      this.cf = cutoff; this.cq = q;
      const fc = Math.min(Math.max(cutoff, 10), SR * 0.45);
      const g = Math.tan((Math.PI * fc) / SR);
      const k = 1 / q;
      this.ck = k;
      this.a1 = 1 / (1 + g * (g + k));
      this.a2 = g * this.a1;
      this.a3 = g * this.a2;
    }
    const k = this.ck, a1 = this.a1, a2 = this.a2, a3 = this.a3;
    const v3 = x - this.b;
    const v1 = a1 * this.a + a2 * v3;
    const v2 = this.b + a2 * this.a + a3 * v3;
    this.a = 2 * v1 - this.a;
    this.b = 2 * v2 - this.b;
    this.low = v2;
    this.band = v1;
    this.high = x - k * v1 - v2;
    this.k = k;
    return v2;
  }
  lp(x, c, q) { this.run(x, c, q); return this.low; }
  hp(x, c, q) { this.run(x, c, q); return this.high; }
  bp(x, c, q) { this.run(x, c, q); return this.band * this.k; } // unity peak
}
class OnePole {
  constructor() { this.z = 0; }
  lp(x, c) { const a = Math.exp((-TAU * c) / SR); this.z = x * (1 - a) + this.z * a; return this.z; }
  hp(x, c) { return x - this.lp(x, c); }
}

// ---------- envelopes ----------
function adsr(t, dur, a, d, s, r) {
  if (t < 0) return 0;
  let v;
  if (t < a) v = t / a;
  else if (t < a + d) v = 1 - (1 - s) * ((t - a) / d);
  else v = s;
  if (t > dur) {
    const rt = t - dur;
    if (rt >= r) return 0;
    // release from level at note-off
    const atOff = dur < a ? dur / a : dur < a + d ? 1 - (1 - s) * ((dur - a) / d) : s;
    return atOff * (1 - rt / r);
  }
  return v;
}
const expDecay = (t, tau) => (t < 0 ? 0 : Math.exp(-t / tau));

// ---------- reverb (Freeverb) ----------
class Comb {
  constructor(size) { this.buf = new Float32Array(size); this.i = 0; this.store = 0; }
  run(x, fb, damp) {
    const out = this.buf[this.i];
    this.store = out * (1 - damp) + this.store * damp;
    this.buf[this.i] = x + this.store * fb;
    if (++this.i >= this.buf.length) this.i = 0;
    return out;
  }
}
class Allpass {
  constructor(size) { this.buf = new Float32Array(size); this.i = 0; }
  run(x) {
    const b = this.buf[this.i];
    const out = -x + b;
    this.buf[this.i] = x + b * 0.5;
    if (++this.i >= this.buf.length) this.i = 0;
    return out;
  }
}
function reverb(bus, { room = 0.84, damp = 0.25, predelay = 0.012, hp = 180, lp = 9000 } = {}) {
  const sc = SR / 44100;
  const combT = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617];
  const apT = [556, 441, 341, 225];
  const spread = 23;
  const cl = combT.map((c) => new Comb(Math.round(c * sc)));
  const cr = combT.map((c) => new Comb(Math.round((c + spread) * sc)));
  const al = apT.map((c) => new Allpass(Math.round(c * sc)));
  const ar = apT.map((c) => new Allpass(Math.round((c + spread) * sc)));
  const out = new Bus(bus.n);
  const pd = Math.round(predelay * SR);
  const hpf = new OnePole(), lpf = new OnePole();
  const fb = room;
  for (let i = 0; i < bus.n; i++) {
    const j = i - pd;
    let x = j >= 0 ? (bus.L[j] + bus.R[j]) * 0.5 : 0;
    x = hpf.hp(x, hp);
    x = lpf.lp(x, lp) * 0.03;
    let l = 0, r = 0;
    for (let c = 0; c < 8; c++) { l += cl[c].run(x, fb, damp); r += cr[c].run(x, fb, damp); }
    for (let a = 0; a < 4; a++) { l = al[a].run(l); r = ar[a].run(r); }
    out.L[i] = l;
    out.R[i] = r;
  }
  return out;
}

// stereo ping-pong delay (wet only)
function pingpong(bus, time, fb = 0.35, lpHz = 4000) {
  const d = Math.round(time * SR);
  const out = new Bus(bus.n);
  const bl = new Float32Array(d), br = new Float32Array(d);
  let i2 = 0;
  const f1 = new OnePole(), f2 = new OnePole();
  for (let i = 0; i < bus.n; i++) {
    const dl = bl[i2], dr = br[i2];
    const inp = (bus.L[i] + bus.R[i]) * 0.5;
    bl[i2] = f1.lp(inp + dr * fb, lpHz);
    br[i2] = f2.lp(dl * fb, lpHz);
    out.L[i] = dl;
    out.R[i] = dr;
    if (++i2 >= d) i2 = 0;
  }
  return out;
}

module.exports = { SR, TAU, Bus, rng, Pink, Saw, Square, Sine, SVF, OnePole, adsr, expDecay, reverb, pingpong, polyblep };
