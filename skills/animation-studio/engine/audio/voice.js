// Voiceover: offline text-to-speech, placed on the timeline, with word timings (for captions) and a
// mouth envelope (for lip-sync). Runs inside song.js, synchronously.
//
//   const Voice = require('./engine/audio/voice');
//   const vo = Voice.speak([
//     { at: T(1), text: 'Meet Pantrio.', voice: 'Samantha' },
//     { at: T(3), text: 'It plans your week of meals in ten seconds.', who: 'mum' },
//   ], { out: path.join(__dirname, 'out'), length: DURATION });
//   MIX.duck([music], vo.bus);            // the music dips under the voice
//   vo.bus.mixInto(mix, 1);               // (or mixdown({ …, voice: vo.bus }))
//   // out/voice.json now holds lines + word times + the mouth envelope: the film reads it with
//   // Studio.loadJSON('out/voice.json'); `render.js srt` turns it into subtitles.
//
// Engines, picked in this order unless `engine` (or env ANIM_TTS) says otherwise:
//   kokoro (python package `kokoro`, voices like af_heart) · piper (binary + env PIPER_MODEL=model.onnx) ·
//   say (macOS: Samantha, Daniel, Karen, Moira, Tessa, Rishi/Aman en-IN, Lekha hi-IN, Majed ar) ·
//   espeak-ng · none (silent placeholder with estimated timings, so the film can still be built).
// Every line is cached in out/.vo-cache by (engine, voice, rate, text): re-running song.js is instant.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync, spawnSync } = require('child_process');
const { SR, Bus, OnePole, SVF } = require('./dsp');

const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const has = (cmd, args = ['--version']) => { try { return spawnSync(cmd, args, { stdio: 'ignore', timeout: 8000 }).status === 0; } catch { return false; } };
let ENGINES = null;
function engines() {
  if (ENGINES) return ENGINES;
  ENGINES = [];
  if (has('python3', ['-c', 'import kokoro, soundfile'])) ENGINES.push('kokoro');
  if (process.env.PIPER_MODEL && has('piper', ['--help'])) ENGINES.push('piper');
  if (process.platform === 'darwin' && has('say', ['-v', '?'])) ENGINES.push('say');
  if (has('espeak-ng')) ENGINES.push('espeak-ng');
  ENGINES.push('none');
  return ENGINES;
}
const DEFAULT_VOICE = { kokoro: 'af_heart', piper: '', say: 'Samantha', 'espeak-ng': 'en-us', none: '' };

// any audio file → mono Float32Array at 48 kHz (through ffmpeg)
function decode(file) {
  const r = spawnSync(FFMPEG, ['-v', 'error', '-i', file, '-f', 'f32le', '-ac', '1', '-ar', String(SR), '-'], { maxBuffer: 1 << 30 });
  if (r.status !== 0) throw new Error(`could not decode ${file}: ${r.stderr}`);
  const b = r.stdout;
  return new Float32Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.length));
}
const clean = (s) => String(s).replace(/\[\[|\]\]/g, '').replace(/\s+/g, ' ').trim();
const wordsOf = (s) => clean(s).split(' ').filter((w) => /[\p{L}\p{N}]/u.test(w));

// 10 ms energy frames
function energy(x) {
  const hop = SR / 100, e = new Float32Array(Math.floor(x.length / hop));
  for (let i = 0; i < e.length; i++) { let s = 0; for (let j = 0; j < hop; j++) { const v = x[i * hop + j]; s += v * v; } e[i] = Math.sqrt(s / hop); }
  return e;
}
// voiced segments [start, end] in 10 ms frames, merging gaps shorter than `merge` frames
function segments(x, { thr = 0.03, merge = 25 } = {}) {
  const e = energy(x), pk = e.reduce((a, v) => Math.max(a, v), 0), th = pk * thr;
  const segs = [];
  let s = -1;
  for (let i = 0; i <= e.length; i++) {
    const on = i < e.length && e[i] > th;
    if (on && s < 0) s = i;
    if (!on && s >= 0) { if (segs.length && s - segs[segs.length - 1][1] < merge) segs[segs.length - 1][1] = i; else segs.push([s, i]); s = -1; }
  }
  return segs.filter(([a, b]) => b - a >= 3);
}

// synthesize one text with one engine → Float32Array (48 kHz mono)
function synth(engine, text, { voice, rate, tmp }) {
  const f = path.join(tmp, `tts-${process.pid}-${Math.random().toString(36).slice(2)}.wav`);
  try {
    if (engine === 'say') execFileSync('say', [...(voice ? ['-v', voice] : []), ...(rate ? ['-r', String(rate)] : []), '--data-format=LEF32@48000', '-o', f, text]);
    else if (engine === 'espeak-ng') execFileSync('espeak-ng', ['-v', voice || 'en-us', ...(rate ? ['-s', String(rate)] : []), '-w', f, text]);
    else if (engine === 'piper') execFileSync('piper', ['--model', voice || process.env.PIPER_MODEL, '--output_file', f], { input: text });
    else if (engine === 'kokoro') execFileSync('python3', ['-c', `import sys, soundfile as sf, numpy as np\nfrom kokoro import KPipeline\nv=sys.argv[2]\np=KPipeline(lang_code=v[0])\na=np.concatenate([np.asarray(x.audio) for x in p(sys.argv[1], voice=v, speed=float(sys.argv[3]))])\nsf.write(sys.argv[4], a, 24000)`, text, voice || 'af_heart', String(rate ? rate / 175 : 1), f]);
    return decode(f);
  } finally { fs.rmSync(f, { force: true }); }
}

// speak a batch of lines that share an engine/voice/rate → [{ audio, words: [{ w, t, end }] }]
// `say` does it in two calls however many lines there are: every line with a long silence between
// (split on the longest gaps), then every word with a short silence between (the gaps give each word's
// length); the word lengths are then fitted to the real line and snapped to its quietest moments.
function speakBatch(engine, lines, opts) {
  const results = [];
  if (engine === 'say' && lines.length) {
    const GAP = 1400;
    const all = synth(engine, lines.map((l) => clean(l.text)).join(` [[slnc ${GAP}]] `), opts);
    const e = energy(all), pk = e.reduce((a, v) => Math.max(a, v), 0);
    // the lines: cut at the (n - 1) longest silences
    const quiet = []; let s = -1;
    for (let i = 0; i <= e.length; i++) { const q = i === e.length || e[i] < pk * 0.01; if (q && s < 0) s = i; if (!q && s >= 0) { quiet.push([s, i]); s = -1; } }
    const cuts = quiet.filter(([a, b]) => a > 0 && b < e.length).sort((p, q) => (q[1] - q[0]) - (p[1] - p[0])).slice(0, lines.length - 1).sort((p, q) => p[0] - q[0]);
    const bounds = [0, ...cuts.map(([a, b]) => Math.round((a + b) / 2)), e.length];
    const wordsAll = lines.map((l) => wordsOf(l.text));
    const wAudio = synth(engine, wordsAll.map((ws) => ws.join(' [[slnc 500]] ')).join(' [[slnc 500]] '), opts);
    const wsegs = segments(wAudio, { merge: 28 });
    const total = wordsAll.reduce((a, ws) => a + ws.length, 0);
    const wlen = wsegs.length === total ? wsegs.map(([a, b]) => b - a) : null;
    let wi = 0;
    lines.forEach((l, k) => {
      const seg = all.subarray(bounds[k] * SR / 100, bounds[k + 1] * SR / 100);
      const ws = wordsAll[k];
      results.push({ audio: trim(seg), words: fit(trim(seg), ws, wlen ? wlen.slice(wi, wi + ws.length) : null) });
      wi += ws.length;
    });
    if (!wlen) console.warn(`voice: word timing fell back to syllable estimates (${wsegs.length} word sounds for ${total} words)`);
    return results;
  }
  for (const l of lines) {
    const ws = wordsOf(l.text);
    if (engine === 'none') {
      const d = ws.reduce((a, w) => a + syl(w), 0) * 0.2 + 0.2;
      const audio = new Float32Array(Math.round(d * SR));
      let t = 0.05; const words = ws.map((w) => { const len = syl(w) * 0.2; const o = { w, t, end: t + len * 0.95 }; t += len; return o; });
      results.push({ audio, words, silent: true });
    } else { const audio = trim(synth(engine, clean(l.text), opts)); results.push({ audio, words: fit(audio, ws, null) }); }
  }
  return results;
}
const syl = (w) => Math.max(1, (String(w).toLowerCase().match(/[aeiouy]+/g) || []).length + (/\d/.test(w) ? String(w).replace(/\D/g, '').length : 0));
// cut leading/trailing silence, keeping 30 ms either side
function trim(x) {
  const e = energy(x), pk = e.reduce((a, v) => Math.max(a, v), 0);
  let a = 0, b = e.length;
  while (a < b && e[a] < pk * 0.02) a++;
  while (b > a && e[b - 1] < pk * 0.02) b--;
  return x.slice(Math.max(0, (a - 3) * SR / 100), Math.min(x.length, (b + 3) * SR / 100));
}
// word times inside a spoken line: spread the voiced time by each word's length (measured, or by
// syllables), then move every boundary to the quietest 10 ms within ±90 ms
function fit(x, ws, lens) {
  const e = energy(x), n = e.length;
  if (!ws.length) return [];
  const w = lens || ws.map(syl);
  const sum = w.reduce((a, v) => a + v, 0);
  const a0 = 3, a1 = Math.max(a0 + 1, n - 3);
  const b = [a0]; let acc = 0;
  for (let i = 0; i < ws.length - 1; i++) { acc += w[i]; b.push(a0 + ((a1 - a0) * acc) / sum); }
  b.push(a1);
  for (let i = 1; i < b.length - 1; i++) {
    let best = Math.round(b[i]), bv = Infinity;
    for (let j = Math.max(b[i - 1] + 2, Math.round(b[i]) - 9); j <= Math.min(n - 1, Math.round(b[i]) + 9); j++) if (e[j] < bv) { bv = e[j]; best = j; }
    b[i] = best;
  }
  return ws.map((word, i) => ({ w: word, t: b[i] / 100, end: b[i + 1] / 100 }));
}

// mouth data at `fps`: open (loudness, 0..1) and wide (bright vowels like "ee" vs round "oo", 0..1)
function mouthTrack(bus, fps = 30) {
  const n = bus.n, hop = SR / fps, frames = Math.ceil(n / hop);
  const open = new Array(frames).fill(0), wide = new Array(frames).fill(0.5);
  const lo = new SVF(), hi = new SVF();
  let el = 0, eh = 0, peak = 1e-6;
  const lv = new Float32Array(frames), hv = new Float32Array(frames);
  for (let f = 0; f < frames; f++) {
    let sl = 0, sh = 0;
    for (let i = f * hop; i < Math.min(n, (f + 1) * hop); i++) { const x = bus.L[i]; const a = lo.bp(x, 600, 1.2), b = hi.bp(x, 2400, 1.2); sl += a * a; sh += b * b; }
    lv[f] = Math.sqrt(sl / hop); hv[f] = Math.sqrt(sh / hop); peak = Math.max(peak, lv[f] + hv[f]);
  }
  for (let f = 0; f < frames; f++) {
    el += ((lv[f] + hv[f]) / peak - el) * 0.6; eh = hv[f] / (lv[f] + hv[f] + 1e-9);
    open[f] = +Math.min(1, Math.pow(el * 1.6, 0.8)).toFixed(3);
    wide[f] = +Math.min(1, eh * 2.2).toFixed(3);
  }
  return { fps, open, wide };
}

function speak(lines, { out = 'out', engine = process.env.ANIM_TTS, voice, rate, length, gain = 1, save = true, fps = 30 } = {}) {
  const avail = engines();
  const eng = engine && avail.includes(engine) ? engine : avail[0];
  if (engine && eng !== engine) console.warn(`voice: engine "${engine}" not available (have: ${avail.join(', ')}), using ${eng}`);
  if (eng === 'none' && engine !== 'none') console.warn('voice: no text-to-speech found (macOS `say`, piper, kokoro, espeak-ng): the voiceover is SILENT, with estimated word times');
  const cacheDir = path.join(out, '.vo-cache');
  fs.mkdirSync(cacheDir, { recursive: true });
  const key = (l) => crypto.createHash('sha1').update(JSON.stringify([eng, l.voice || voice || DEFAULT_VOICE[eng], l.rate || rate || 0, clean(l.text)])).digest('hex').slice(0, 16);
  // group uncached lines by voice + rate, synthesize each group in one go, cache every line
  const todo = new Map();
  for (const l of lines) {
    const k = key(l);
    if (fs.existsSync(path.join(cacheDir, k + '.json')) && fs.existsSync(path.join(cacheDir, k + '.f32'))) continue;
    const g = `${l.voice || voice || DEFAULT_VOICE[eng]}|${l.rate || rate || 0}`;
    if (!todo.has(g)) todo.set(g, []);
    if (!todo.get(g).some((x) => key(x) === k)) todo.get(g).push(l);
  }
  for (const [g, ls] of todo) {
    const [v, r] = g.split('|');
    const res = speakBatch(eng, ls, { voice: v, rate: +r || 0, tmp: cacheDir });
    ls.forEach((l, i) => {
      const k = key(l);
      fs.writeFileSync(path.join(cacheDir, k + '.f32'), Buffer.from(res[i].audio.buffer, res[i].audio.byteOffset, res[i].audio.byteLength));
      fs.writeFileSync(path.join(cacheDir, k + '.json'), JSON.stringify({ words: res[i].words, silent: !!res[i].silent }));
    });
  }
  // place the lines
  const placed = lines.map((l) => {
    const k = key(l);
    const b = fs.readFileSync(path.join(cacheDir, k + '.f32'));
    const audio = new Float32Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.length));
    const meta = JSON.parse(fs.readFileSync(path.join(cacheDir, k + '.json'), 'utf8'));
    const dur = audio.length / SR;
    return { l, audio, dur, words: meta.words.map((w) => ({ w: w.w, t: +(l.at + w.t).toFixed(3), end: +(l.at + w.end).toFixed(3) })), silent: meta.silent };
  });
  const end = Math.max(length || 0, ...placed.map((p) => p.l.at + p.dur + 0.5));
  const bus = new Bus(Math.ceil(end * SR));
  const hp = new OnePole();
  for (const p of placed) {
    // level each line to the same loudness (RMS of its voiced part), then high-pass the rumble away
    let s = 0, c = 0; for (let i = 0; i < p.audio.length; i++) if (Math.abs(p.audio[i]) > 0.01) { s += p.audio[i] * p.audio[i]; c++; }
    const g = c ? Math.min(6, 0.12 / Math.sqrt(s / c)) : 0;
    const x = new Float32Array(p.audio.length);
    for (let i = 0; i < x.length; i++) x[i] = hp.hp(p.audio[i] * g, 90);
    bus.addMono(x, p.l.at, gain * (p.l.gain ?? 1), p.l.pan || 0);
  }
  const vo = {
    engine: eng,
    lines: placed.map((p) => ({ t: +p.l.at.toFixed(3), end: +(p.l.at + p.dur).toFixed(3), text: clean(p.l.text), ...(p.l.alt ? { alt: p.l.alt } : {}), ...(p.l.who ? { who: p.l.who } : {}), words: p.words })),
    mouth: mouthTrack(bus, fps),
  };
  if (save) { fs.writeFileSync(path.join(out, 'voice.json'), JSON.stringify(vo)); }
  vo.bus = bus;
  return vo;
}

module.exports = { speak, engines, decode, segments, fit, mouthTrack };
