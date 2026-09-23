// Mixing + mastering helpers: sidechain pump, gates, master bus, WAV writer.
const fs = require('fs');
const path = require('path');
const { SR, Bus, OnePole } = require('./dsp');

// Duck buses on every kick (the "pump" of dance music). kickTimes in seconds.
function sidechain(buses, kickTimes, { depth = 0.55, release = 0.11, n } = {}) {
  n = n || buses[0].n;
  const g = new Float32Array(n).fill(1);
  for (const tk of kickTimes) {
    const s = Math.round(tk * SR);
    for (let i = 0; i < SR * 0.5 && s + i < n; i++) {
      const x = i / SR;
      const v = 1 - depth * Math.exp(-x / release) * Math.min(1, x / 0.004 + 0.3);
      if (v < g[s + i]) g[s + i] = v;
    }
  }
  for (const b of buses) for (let i = 0; i < n; i++) { b.L[i] *= g[i]; b.R[i] *= g[i]; }
}

// Hard silence between t0..t1 (the "held breath" before a drop). Applied AFTER reverbs.
function gate(bus, t0, t1, fade = 0.008) {
  for (let i = 0; i < bus.n; i++) {
    const t = i / SR;
    let g = 1;
    if (t >= t0 - fade && t < t1) g = t < t0 ? 1 - (t - (t0 - fade)) / fade : 0;
    if (g !== 1) { bus.L[i] *= g; bus.R[i] *= g; }
  }
}

function fadeOut(bus, t0, t1) {
  for (let i = 0; i < bus.n; i++) {
    const t = i / SR;
    if (t <= t0) continue;
    const g = Math.max(0, 1 - (t - t0) / (t1 - t0));
    bus.L[i] *= g; bus.R[i] *= g;
  }
}

function highpass(bus, hz = 22) {
  const hl = new OnePole(), hr = new OnePole();
  for (let i = 0; i < bus.n; i++) { bus.L[i] = hl.hp(bus.L[i], hz); bus.R[i] = hr.hp(bus.R[i], hz); }
}

// Glue compressor + 4ms lookahead brickwall limiter. drive ~0.8 lands near -11 LUFS for a busy mix.
function master(b, drive = 0.8, ceiling = 0.93) {
  const N = b.n;
  let env = 0;
  for (let i = 0; i < N; i++) {
    const l = b.L[i] * drive, r = b.R[i] * drive;
    const lvl = Math.max(Math.abs(l), Math.abs(r));
    env = lvl > env ? env + (lvl - env) * 0.002 : env + (lvl - env) * 0.00008;
    const thr = 0.5;
    const g = env > thr ? Math.pow(thr / env, 0.35) : 1;
    b.L[i] = l * g; b.R[i] = r * g;
  }
  const la = Math.round(0.004 * SR);
  const peak = new Float32Array(N);
  for (let i = 0; i < N; i++) peak[i] = Math.max(Math.abs(b.L[i]), Math.abs(b.R[i]));
  const want = new Float32Array(N);
  const dq = [];
  let head = 0;
  for (let i = 0; i < N + la; i++) {
    if (i < N) { while (dq.length > head && peak[dq[dq.length - 1]] <= peak[i]) dq.pop(); dq.push(i); }
    const j = i - la;
    if (j >= 0) {
      while (dq[head] < j - la) head++;
      const pk = peak[dq[head]];
      want[j] = pk > ceiling ? ceiling / pk : 1;
    }
  }
  let g = 1;
  for (let i = 0; i < N; i++) {
    g = want[i] < g ? want[i] : g + (want[i] - g) * 0.0006;
    b.L[i] = Math.max(-ceiling, Math.min(ceiling, b.L[i] * g));
    b.R[i] = Math.max(-ceiling, Math.min(ceiling, b.R[i] * g));
  }
}

// 32-bit float stereo WAV
function writeWav(file, b) {
  const n = b.n;
  const data = Buffer.alloc(n * 8);
  for (let i = 0; i < n; i++) { data.writeFloatLE(b.L[i], i * 8); data.writeFloatLE(b.R[i], i * 8 + 4); }
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + data.length, 4); h.write('WAVE', 8);
  h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(3, 20); h.writeUInt16LE(2, 22);
  h.writeUInt32LE(SR, 24); h.writeUInt32LE(SR * 8, 28); h.writeUInt16LE(8, 32); h.writeUInt16LE(32, 34);
  h.write('data', 36); h.writeUInt32LE(data.length, 40);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, Buffer.concat([h, data]));
}

// Sum named stems into one bus with a gain table; optionally write each (gained) stem.
function mixdown(stems, gains, { stemDir = null } = {}) {
  const first = Object.values(stems)[0];
  const out = new Bus(first.n);
  for (const [k, b] of Object.entries(stems)) {
    const g = gains[k] ?? 1;
    b.mixInto(out, g);
    if (stemDir) {
      const s = new Bus(b.n);
      for (let i = 0; i < b.n; i++) { s.L[i] = b.L[i] * g; s.R[i] = b.R[i] * g; }
      writeWav(path.join(stemDir, `stem-${k}.wav`), s);
    }
  }
  return out;
}

module.exports = { sidechain, gate, fadeOut, highpass, master, writeWav, mixdown };
