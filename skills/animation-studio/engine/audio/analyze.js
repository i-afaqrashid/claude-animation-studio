// Song analysis: cut a film to a song you did not write. Tempo, beats, downbeats (bars), sections,
// a per-bar energy curve, strong hits and LRC lyrics, from any audio file (ffmpeg decodes it).
//
//   node engine/render.js analyze assets/song.mp3 [--lrc assets/song.lrc] [--bpm 128] [--meter 3]
//     → out/analysis.json, beats.js (for score.js: bars, sections, lyrics) and out/analysis.svg (a picture to check)
//   score.js:  const A = typeof module !== 'undefined' ? require('./beats.js') : globalThis.ANALYSIS;
//              const clock = MUSIC.makeClock({ beats: A.beats, downbeat: A.downbeat, beatsPerBar: A.meter });
//              // T(bar, beat) now lands on the song's real beats, even when a live band drifts
//
// Method (the classic, well-tested one): a log-band spectral-flux onset envelope; tempo from its
// autocorrelation with a prior around 120 BPM; beats by dynamic programming (Ellis 2007); the bar phase
// from where the low end (kick) and the harmony change; sections from a novelty curve over bars.
const { spawnSync } = require('child_process');

const SRA = 22050, N = 1024, HOP = 128, FPS = SRA / HOP; // 5.8 ms frames

function decode(file, sr = SRA) {
  const r = spawnSync(process.env.FFMPEG || 'ffmpeg', ['-v', 'error', '-i', file, '-f', 'f32le', '-ac', '1', '-ar', String(sr), '-'], { maxBuffer: 1 << 30 });
  if (r.status !== 0) throw new Error(`could not decode ${file}: ${String(r.stderr).trim()}`);
  return new Float32Array(r.stdout.buffer.slice(r.stdout.byteOffset, r.stdout.byteOffset + r.stdout.length));
}

// in-place radix-2 FFT
function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
  for (let len = 2; len <= n; len <<= 1) {
    const a = (-2 * Math.PI) / len, wr = Math.cos(a), wi = Math.sin(a);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const ur = re[i + k], ui = im[i + k], vr = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci, vi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr;
        re[i + k] = ur + vr; im[i + k] = ui + vi; re[i + k + len / 2] = ur - vr; im[i + k + len / 2] = ui - vi;
        const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t;
      }
    }
  }
}
// magnitude spectrogram, centred frames → Float32Array[frames] of n/2 bins
function stft(x, n, hop) {
  const win = new Float64Array(n).map((_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / n));
  const frames = Math.floor(x.length / hop) + 1, out = [];
  const re = new Float64Array(n), im = new Float64Array(n);
  for (let f = 0; f < frames; f++) {
    const s = f * hop - n / 2;
    for (let i = 0; i < n; i++) { const j = s + i; re[i] = j >= 0 && j < x.length ? x[j] * win[i] : 0; im[i] = 0; }
    fft(re, im);
    const mag = new Float32Array(n / 2);
    for (let k = 0; k < n / 2; k++) mag[k] = Math.hypot(re[k], im[k]);
    out.push(mag);
  }
  return out;
}
// log-spaced bands (a mel-like filterbank, triangular)
function bands(nb, n, sr, lo = 30, hi = 8000) {
  const edges = [];
  for (let i = 0; i < nb + 2; i++) edges.push(lo * Math.pow(hi / lo, i / (nb + 1)));
  return Array.from({ length: nb }, (_, b) => {
    const a = edges[b], c = edges[b + 1], d = edges[b + 2], w = [];
    for (let k = Math.floor((a * n) / sr); k <= Math.ceil((d * n) / sr) && k < n / 2; k++) {
      const f = (k * sr) / n;
      const v = f < c ? (f - a) / (c - a) : (d - f) / (d - c);
      if (v > 0) w.push([k, v]);
    }
    if (!w.length) w.push([Math.round((c * n) / sr), 1]);
    return { hz: c, w };
  });
}
const mean = (a) => a.reduce((s, v) => s + v, 0) / (a.length || 1);
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };
const std = (a) => { const m = mean(a); return Math.sqrt(mean(a.map((v) => (v - m) ** 2))); };

function onsetEnvelope(spec) {
  const fb = bands(40, N, SRA);
  const nb = fb.length, frames = spec.length;
  const logb = spec.map((mag) => fb.map(({ w }) => { let s = 0; for (const [k, v] of w) s += mag[k] * v; return Math.log1p(40 * s); }));
  const on = new Float32Array(frames), low = new Float32Array(frames), level = new Float32Array(frames);
  const LAG = 2; // compare with the frame 11.6 ms back (smooths the flux of a 5.8 ms hop)
  for (let f = 0; f < frames; f++) {
    let s = 0, l = 0, e = 0;
    for (let b = 0; b < nb; b++) { const d = logb[f][b] - (f >= LAG ? logb[f - LAG][b] : logb[f][b]); if (d > 0) { s += d; if (fb[b].hz < 160) l += d; } e += logb[f][b]; }
    on[f] = s / nb; low[f] = l; level[f] = e / nb;
  }
  // remove the slow trend (a 1 s moving mean), keep the rises
  const w = Math.round(FPS * 0.5), cs = new Float64Array(frames + 1);
  for (let f = 0; f < frames; f++) cs[f + 1] = cs[f] + on[f];
  const env = new Float32Array(frames);
  for (let f = 0; f < frames; f++) { const a = Math.max(0, f - w), b = Math.min(frames, f + w); env[f] = Math.max(0, on[f] - (cs[b] - cs[a]) / (b - a)); }
  const sd = std(Array.from(env)) || 1;
  for (let f = 0; f < frames; f++) env[f] /= sd;
  return { env, low, level, logb, fb };
}

// tempo: autocorrelation of the onset envelope, weighted by a log-normal prior around `prior` BPM
function tempo(env, { prior = 120, lo = 55, hi = 215, hint = null } = {}) {
  const n = env.length, maxLag = Math.ceil((60 * FPS) / lo), minLag = Math.floor((60 * FPS) / hi);
  const ac = new Float64Array(maxLag * 3 + 2);
  for (let L = 1; L < ac.length && L < n; L++) { let s = 0; for (let i = L; i < n; i++) s += env[i] * env[i - L]; ac[L] = s / (n - L); }
  let best = 0, bl = minLag;
  const center = hint || prior, spread = hint ? 0.15 : 1;
  const score = (L) => {
    const bpm = (60 * FPS) / L;
    // the beat period and its multiples line up with the onsets (a comb over 1, 2 and 4 beats)
    const comb = ac[L] + 0.5 * (ac[2 * L] || 0) + 0.25 * (ac[4 * L] || ac[3 * L] || 0);
    return comb * Math.exp(-0.5 * (Math.log2(bpm / center) / spread) ** 2);
  };
  for (let L = minLag; L <= maxLag; L++) { const s = score(L); if (s > best) { best = s; bl = L; } }
  // refine to a fraction of a frame
  const y0 = score(bl - 1), y1 = score(bl), y2 = score(bl + 1);
  const d = y0 - 2 * y1 + y2 ? (0.5 * (y0 - y2)) / (y0 - 2 * y1 + y2) : 0;
  const period = bl + Math.max(-0.5, Math.min(0.5, d));
  return { bpm: (60 * FPS) / period, period, ac };
}

// beats by dynamic programming (Ellis 2007): reward onsets, penalise deviating from the period
function trackBeats(env, period, { tightness = 400 } = {}) {
  const n = env.length;
  // local score: the envelope smoothed by a Gaussian of width period/32
  const half = Math.round(period), win = [];
  for (let k = -half; k <= half; k++) win.push(Math.exp(-0.5 * ((k * 32) / period) ** 2));
  const local = new Float64Array(n);
  for (let i = 0; i < n; i++) { let s = 0; for (let k = -half; k <= half; k++) { const j = i + k; if (j >= 0 && j < n) s += env[j] * win[k + half]; } local[i] = s; }
  const cum = new Float64Array(n), back = new Int32Array(n).fill(-1);
  const lo = Math.round(period / 2), hi = Math.round(period * 2);
  for (let i = 0; i < n; i++) {
    let best = -Infinity, bj = -1;
    for (let j = i - hi; j <= i - lo; j++) { if (j < 0) continue; const s = cum[j] - tightness * Math.log((i - j) / period) ** 2; if (s > best) { best = s; bj = j; } }
    cum[i] = local[i] + (bj >= 0 ? best : 0); back[i] = bj;
  }
  // start from the last strong local maximum of the cumulative score
  const maxes = [];
  for (let i = 1; i < n - 1; i++) if (cum[i] > cum[i - 1] && cum[i] >= cum[i + 1]) maxes.push(i);
  const med = median(maxes.map((i) => cum[i]));
  let last = maxes.filter((i) => cum[i] >= 0.5 * med).pop() ?? n - 1;
  const beats = [];
  while (last >= 0) { beats.unshift(last); last = back[last]; }
  // trim weak beats at the edges (silence before the song starts / after it ends)
  const strength = beats.map((b) => local[b]);
  const rms = Math.sqrt(mean(strength.map((v) => v * v)));
  while (beats.length && local[beats[0]] < 0.5 * rms) beats.shift();
  while (beats.length && local[beats[beats.length - 1]] < 0.5 * rms) beats.pop();
  return regularize(beats, period, local);
}
// a beat that sits well off the local grid (a swung 8th, a quiet stretch with no drums) is moved back
// onto the line through its neighbours, unless it has a strong onset of its own
function regularize(beats, period, local) {
  const out = beats.slice();
  const strong = Math.max(...beats.map((b) => local[b])) * 0.6;
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < out.length; i++) {
      const nb = [];
      for (let k = Math.max(0, i - 4); k <= Math.min(out.length - 1, i + 4); k++) if (k !== i) nb.push([k, out[k]]);
      if (nb.length < 3) continue;
      // least-squares line through the neighbours (index → frame)
      const mk = nb.reduce((a, [k]) => a + k, 0) / nb.length, mf = nb.reduce((a, [, f]) => a + f, 0) / nb.length;
      let sxy = 0, sxx = 0; for (const [k, f] of nb) { sxy += (k - mk) * (f - mf); sxx += (k - mk) ** 2; }
      const pred = mf + (sxy / sxx) * (i - mk);
      if (Math.abs(out[i] - pred) > 0.12 * period && local[out[i]] < strong) out[i] = Math.round(pred);
    }
  }
  // the ends (a fade-out, a free intro): continue the steady grid of the 8 beats next to them
  const line = (idx) => { const mk = idx.reduce((a, k) => a + k, 0) / idx.length, mf = idx.reduce((a, k) => a + out[k], 0) / idx.length; let sxy = 0, sxx = 0; for (const k of idx) { sxy += (k - mk) * (out[k] - mf); sxx += (k - mk) ** 2; } return (i) => mf + (sxy / sxx) * (i - mk); };
  if (out.length > 12) {
    for (let i = out.length - 4; i < out.length; i++) { const f = line([...Array(8).keys()].map((k) => out.length - 12 + k)); if (Math.abs(out[i] - f(i)) > 0.06 * period && local[out[i]] < strong) out[i] = Math.round(f(i)); }
    for (let i = 3; i >= 0; i--) { const f = line([...Array(8).keys()].map((k) => 4 + k)); if (Math.abs(out[i] - f(i)) > 0.06 * period && local[out[i]] < strong) out[i] = Math.round(f(i)); }
  }
  return out;
}

// 12-bin chroma per frame (from a longer FFT, for pitch resolution)
function chroma(x) {
  const n = 4096, hop = 1024, spec = stft(x, n, hop);
  return spec.map((mag) => {
    const c = new Float64Array(12);
    for (let k = Math.ceil((80 * n) / SRA); k < (2000 * n) / SRA; k++) { const midi = 69 + 12 * Math.log2((k * SRA) / n / 440); c[((Math.round(midi) % 12) + 12) % 12] += mag[k]; }
    const s = Math.hypot(...c) || 1;
    return Array.from(c, (v) => v / s);
  });
}

function analyse(file, { bpm: hint = null, meter = 4, lrc = null } = {}) {
  const x = decode(file);
  const duration = x.length / SRA;
  const spec = stft(x, N, HOP);
  const { env, low, level, logb } = onsetEnvelope(spec);
  const T = tempo(env, { hint });
  const bf = trackBeats(env, T.period);
  // frame → seconds, with the analysis delay measured on synthetic drums (the flux peaks a little early)
  const DELAY = 0.006;
  const beats = bf.map((f) => +(f / FPS + DELAY).toFixed(4));
  // downbeat: the beat phase where the low end and the harmony change most
  const ch = chroma(x), chAt = (t) => ch[Math.min(ch.length - 1, Math.max(0, Math.round((t * SRA) / 1024)))];
  const lowAt = (f) => { let s = 0; for (let k = -3; k <= 3; k++) s += low[Math.max(0, Math.min(low.length - 1, f + k))]; return s; };
  const beatLow = bf.map(lowAt), mL = mean(beatLow) || 1;
  const change = beats.map((t, i) => { if (!i) return 0; const a = chAt(t - (beats[i] - beats[i - 1]) / 2), b = chAt(t + (beats[Math.min(i + 1, beats.length - 1)] - t) / 2); return 1 - a.reduce((s, v, k) => s + v * b[k], 0); });
  const mC = mean(change) || 1;
  const phaseScore = Array.from({ length: meter }, (_, p) => { let s = 0, c = 0; for (let i = p; i < beats.length; i += meter) { s += beatLow[i] / mL + change[i] / mC; c++; } return c ? s / c : 0; });
  const downbeat = phaseScore.indexOf(Math.max(...phaseScore));
  const bars = beats.filter((_, i) => i >= downbeat && (i - downbeat) % meter === 0);
  // per-bar features → energy curve + novelty → sections
  const frameOf = (t) => Math.max(0, Math.min(spec.length - 1, Math.round(t * FPS)));
  const barFeat = bars.map((t, i) => {
    const t1 = bars[i + 1] ?? Math.min(duration, t + (bars[i] - (bars[i - 1] ?? t - 2)));
    const f0 = frameOf(t), f1 = Math.max(f0 + 1, frameOf(t1));
    const v = new Array(40).fill(0); let lv = 0;
    for (let f = f0; f < f1; f++) { for (let b = 0; b < 40; b++) v[b] += logb[f][b]; lv += level[f]; }
    const c0 = Math.round((t * SRA) / 1024), c1 = Math.max(c0 + 1, Math.round((t1 * SRA) / 1024)), cc = new Array(12).fill(0);
    for (let f = c0; f < Math.min(c1, ch.length); f++) for (let k = 0; k < 12; k++) cc[k] += ch[f][k];
    return { t, end: t1, timbre: v.map((a) => a / (f1 - f0)), chroma: cc.map((a) => a / (c1 - c0)), level: lv / (f1 - f0) };
  });
  const lv = barFeat.map((b) => b.level), lmin = Math.min(...lv), lmax = Math.max(...lv);
  const energy = barFeat.map((b) => +((b.level - lmin) / (lmax - lmin || 1)).toFixed(3));
  const vec = (b) => { const z = [...b.timbre.map((v) => v * 0.6), ...b.chroma.map((v) => v * 3)]; const s = Math.hypot(...z) || 1; return z.map((v) => v / s); };
  const V = barFeat.map(vec);
  const cos = (a, b) => a.reduce((s, v, k) => s + v * b[k], 0);
  const K = 4, nov = V.map((_, i) => { if (i < 2 || i > V.length - 2) return 0; let s = 0, c = 0; for (let a = Math.max(0, i - K); a < i; a++) for (let b = i; b < Math.min(V.length, i + K); b++) { s += 1 - cos(V[a], V[b]); c++; } let w = 0, cw = 0; for (let a = Math.max(0, i - K); a < i; a++) for (let b = a + 1; b < i; b++) { w += 1 - cos(V[a], V[b]); cw++; } for (let a = i; a < Math.min(V.length, i + K); a++) for (let b = a + 1; b < Math.min(V.length, i + K); b++) { w += 1 - cos(V[a], V[b]); cw++; } return c ? s / c - (cw ? w / cw : 0) + Math.abs(energy[i] - energy[i - 1]) * 0.15 : 0; });
  // boundaries: novelty peaks at least 4 bars apart, above the mean + half a deviation (and energy jumps)
  const thr = mean(nov) + 0.5 * std(nov);
  const cand = nov.map((v, i) => [v, i]).filter(([v, i]) => v > thr && v >= (nov[i - 1] ?? 0) && v >= (nov[i + 1] ?? 0)).sort((a, b) => b[0] - a[0]);
  const cuts = [0];
  for (const [, i] of cand) if (cuts.every((c) => Math.abs(c - i) >= 4)) cuts.push(i);
  cuts.sort((a, b) => a - b);
  const segs = cuts.map((b0, k) => {
    const b1 = cuts[k + 1] ?? barFeat.length;
    const e = mean(energy.slice(b0, b1));
    const mv = V[b0].map((_, q) => mean(V.slice(b0, b1).map((v) => v[q])));
    return { bar: b0, bars: b1 - b0, t: barFeat[b0] ? barFeat[b0].t : 0, end: barFeat[b1 - 1] ? barFeat[b1 - 1].end : duration, energy: +e.toFixed(3), mv };
  });
  // letters by similarity (A, B, A…) and a role by energy
  const letters = [];
  segs.forEach((s, i) => { const j = segs.slice(0, i).findIndex((p) => cos(p.mv, s.mv) / (Math.hypot(...p.mv) * Math.hypot(...s.mv)) > 0.985); letters.push(j >= 0 ? letters[j] : String.fromCharCode(65 + new Set(letters).size)); });
  const eSorted = segs.map((s) => s.energy).sort((a, b) => a - b), hiE = eSorted[Math.floor(eSorted.length * 0.66)] ?? 1;
  const sections = segs.map((s, i) => ({
    t: +s.t.toFixed(3), end: +s.end.toFixed(3), bar: s.bar, bars: s.bars, letter: letters[i], energy: s.energy,
    label: i === 0 && s.energy < 0.45 ? 'intro' : i === segs.length - 1 && s.energy < 0.45 ? 'outro' : s.energy >= hiE && s.energy > 0.55 ? 'chorus' : s.energy < 0.3 ? 'break' : 'verse',
  }));
  // strong hits: onset peaks well above the typical onset (for accents that are not on the grid)
  const hits = [];
  for (let f = 2; f < env.length - 2; f++) if (env[f] > 3 && env[f] === Math.max(...env.slice(f - 8, f + 9))) hits.push(+(f / FPS + DELAY).toFixed(3));
  const out = { file: require('path').basename(file), duration: +duration.toFixed(3), bpm: +T.bpm.toFixed(2), meter, beats, downbeat, bars, sections, energy, hits };
  if (lrc) out.lyrics = parseLRC(lrc, duration);
  return out;
}

// LRC lyrics: [mm:ss.xx] line, with optional enhanced word tags <mm:ss.xx>word
function parseLRC(text, duration = Infinity) {
  const ts = (s) => { const m = /(\d+):(\d+(?:\.\d+)?)/.exec(s); return m ? +m[1] * 60 + +m[2] : null; };
  let offset = 0;
  const lines = [];
  for (const raw of String(text).split(/\r?\n/)) {
    const off = /^\[offset:\s*([+-]?\d+)\]/i.exec(raw);
    if (off) { offset = +off[1] / 1000; continue; }
    const tags = [...raw.matchAll(/\[(\d+:\d+(?:\.\d+)?)\]/g)];
    if (!tags.length) continue;
    const body = raw.replace(/\[[^\]]*\]/g, '').trim();
    const words = [...body.matchAll(/<(\d+:\d+(?:\.\d+)?)>\s*([^<]*)/g)].map((m) => ({ t: ts(m[1]) - offset, w: m[2].trim() })).filter((w) => w.w);
    const plain = body.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    for (const tg of tags) lines.push({ t: +(ts(tg[1]) - offset).toFixed(3), text: plain, ...(words.length ? { words } : {}) });
  }
  lines.sort((a, b) => a.t - b.t);
  lines.forEach((l, i) => { l.end = +(lines[i + 1] ? lines[i + 1].t : Math.min(duration, l.t + 5)).toFixed(3); if (l.words) l.words.forEach((w, k) => { w.end = l.words[k + 1] ? l.words[k + 1].t : l.end; }); });
  return lines.filter((l) => l.text);
}

module.exports = { analyse, parseLRC, decode, fft, stft, onsetEnvelope, tempo, trackBeats };
