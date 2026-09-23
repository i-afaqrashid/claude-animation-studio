// Sing: short sung lines (jingles, a name in "Happy Birthday", a chant) from spelled syllables.
// A formant singer: a glottal source at the note's pitch through five vowel formants (the classic
// soprano/alto/tenor/bass tables), consonants made of noise bursts, hisses, hums and glides.
// Consonants start just before the note so the vowel lands on the beat, like a real singer.
//
//   const Sing = require('./engine/audio/sing');
//   const notes = [{ t: 0, dur: 0.3, midi: m('D5') }, …];                // times relative to the phrase
//   const audio = Sing.line('si-tey dot pee-kay', notes, { type: 'alto' }); // one syllable per note
//   keys.addMono(audio, T(8), 0.5);                                      // place it in the song
//   Sing.happyBirthday('Afaq', { bpm: 100, key: 'C' }) → { notes, lyric, audio }
//
// Syllables: split words with '-' (si-tey), spell by sound: 'ee' (see), 'oo' (too), 'ay'/'ey' (day),
// 'ai'/'eye' (my), 'ow' (now), 'oy' (boy), 'aa' (father), 'uh' (the), 'ae' (cat). Roman Urdu works:
// 'dil', 'ki', 'baat', 'jaan', 'mast'.
const { SR, TAU, rng, Saw, SVF, OnePole } = require('./dsp');
const { mtof, m } = require('../music');

// formants [freq Hz, gain dB, bandwidth Hz] × 5 (Csound's classic singing tables)
const F = {
  soprano: { a: [[800, 0, 80], [1150, -6, 90], [2900, -32, 120], [3900, -20, 130], [4950, -50, 140]], e: [[350, 0, 60], [2000, -20, 100], [2800, -15, 120], [3600, -40, 150], [4950, -56, 200]], i: [[270, 0, 60], [2140, -12, 90], [2950, -26, 100], [3900, -26, 120], [4950, -44, 120]], o: [[450, 0, 70], [800, -11, 80], [2830, -22, 100], [3800, -22, 130], [4950, -50, 135]], u: [[325, 0, 50], [700, -16, 60], [2700, -35, 170], [3800, -40, 180], [4950, -60, 200]] },
  alto: { a: [[800, 0, 80], [1150, -4, 90], [2800, -20, 120], [3500, -36, 130], [4950, -60, 140]], e: [[400, 0, 60], [1600, -24, 80], [2700, -30, 120], [3300, -35, 150], [4950, -60, 200]], i: [[350, 0, 50], [1700, -20, 100], [2700, -30, 120], [3700, -36, 150], [4950, -60, 200]], o: [[450, 0, 70], [800, -9, 80], [2830, -16, 100], [3500, -28, 130], [4950, -55, 135]], u: [[325, 0, 50], [700, -12, 60], [2530, -30, 170], [3500, -40, 180], [4950, -64, 200]] },
  tenor: { a: [[650, 0, 80], [1080, -6, 90], [2650, -7, 120], [2900, -8, 130], [3250, -22, 140]], e: [[400, 0, 70], [1700, -14, 80], [2600, -12, 100], [3200, -14, 120], [3580, -20, 120]], i: [[290, 0, 40], [1870, -15, 90], [2800, -18, 100], [3250, -20, 120], [3540, -30, 120]], o: [[400, 0, 40], [800, -10, 80], [2600, -12, 100], [2800, -12, 120], [3000, -26, 120]], u: [[350, 0, 40], [600, -20, 60], [2700, -17, 100], [2900, -14, 120], [3300, -26, 120]] },
  bass: { a: [[600, 0, 60], [1040, -7, 70], [2250, -9, 110], [2450, -9, 120], [2750, -20, 130]], e: [[400, 0, 40], [1620, -12, 80], [2400, -9, 100], [2800, -12, 120], [3100, -18, 120]], i: [[250, 0, 60], [1750, -30, 90], [2600, -16, 100], [3050, -22, 120], [3340, -28, 120]], o: [[400, 0, 40], [750, -11, 80], [2400, -21, 100], [2600, -20, 120], [2900, -40, 120]], u: [[350, 0, 40], [600, -20, 80], [2400, -32, 100], [2675, -28, 120], [2950, -36, 120]] },
};
const mix = (A, B, x) => A.map((f, i) => [f[0] + (B[i][0] - f[0]) * x, f[1] + (B[i][1] - f[1]) * x, f[2] + (B[i][2] - f[2]) * x]);
for (const v of Object.values(F)) { v.ae = mix(v.a, v.e, 0.45); v.uh = mix(mix(v.a, v.o, 0.4), v.e, 0.3); v.aw = mix(v.a, v.o, 0.6); }
// consonant "shapes": where the tongue is (formant loci for the transition) and what they sound like
const C = {
  p: { kind: 'stop', burst: 900, voiced: false }, b: { kind: 'stop', burst: 900, voiced: true },
  t: { kind: 'stop', burst: 4200, voiced: false }, d: { kind: 'stop', burst: 3600, voiced: true },
  k: { kind: 'stop', burst: 2200, voiced: false }, g: { kind: 'stop', burst: 2000, voiced: true },
  s: { kind: 'fric', lo: 4500, hi: 9000, amp: 0.55, voiced: false }, z: { kind: 'fric', lo: 4000, hi: 8500, amp: 0.4, voiced: true },
  sh: { kind: 'fric', lo: 2000, hi: 5500, amp: 0.6, voiced: false }, zh: { kind: 'fric', lo: 2000, hi: 5000, amp: 0.4, voiced: true },
  f: { kind: 'fric', lo: 1500, hi: 8000, amp: 0.22, voiced: false }, v: { kind: 'fric', lo: 1500, hi: 7000, amp: 0.2, voiced: true },
  th: { kind: 'fric', lo: 1800, hi: 8000, amp: 0.18, voiced: false }, h: { kind: 'aspire', amp: 0.3 }, kh: { kind: 'fric', lo: 900, hi: 3000, amp: 0.4, voiced: false },
  ch: { kind: 'affric', stop: 't', fric: 'sh' }, j: { kind: 'affric', stop: 'd', fric: 'zh' },
  m: { kind: 'nasal', f1: 250 }, n: { kind: 'nasal', f1: 280 }, ng: { kind: 'nasal', f1: 260 },
  l: { kind: 'glide', to: [[360, 0, 60], [1300, -10, 90], [2800, -20, 120], [3300, -30, 150], [3800, -40, 200]] },
  r: { kind: 'glide', to: [[420, 0, 60], [1300, -8, 90], [1600, -12, 120], [3200, -30, 150], [3800, -40, 200]] },
  w: { kind: 'glide', vowel: 'u' }, y: { kind: 'glide', vowel: 'i' },
};
const VOWEL_SPELL = [['eye', ['a', 'i']], ['ee', 'i'], ['ea', 'i'], ['oo', 'u'], ['aa', 'a'], ['ae', 'ae'], ['uh', 'uh'], ['ay', ['e', 'i']], ['ey', ['e', 'i']], ['ai', ['a', 'i']], ['ow', ['a', 'u']], ['ou', ['a', 'u']], ['oy', ['o', 'i']], ['oi', ['o', 'i']], ['aw', 'aw'], ['a', 'a'], ['e', 'e'], ['i', 'i'], ['o', 'o'], ['u', 'u'], ['y', 'i']];
const CONS_SPELL = ['sh', 'ch', 'th', 'ng', 'kh', 'gh', 'ph', 'zh', 'ck', 'qu', 'b', 'c', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm', 'n', 'p', 'q', 'r', 's', 't', 'v', 'w', 'x', 'z'];
const CONS_MAP = { ph: ['f'], ck: ['k'], gh: ['g'], qu: ['k', 'w'], c: ['k'], q: ['k'], x: ['k', 's'] };

// "tey" → { onset: ['t'], vowel: ['e','i'], coda: [] }
function parse(syl) {
  let s = String(syl).toLowerCase().replace(/[^a-z]/g, '');
  const onset = [], coda = [];
  let vowel = null;
  const takeCons = (arr) => { for (const c of CONS_SPELL) if (s.startsWith(c)) { s = s.slice(c.length); arr.push(...(CONS_MAP[c] || [c])); return true; } return false; };
  while (s && !VOWEL_SPELL.some(([v]) => s.startsWith(v) && !(v === 'y' && onset.length === 0 && s.length > 1))) { if (!takeCons(onset)) s = s.slice(1); }
  if (s && s[0] === 'y' && s.length > 1 && /[aeiou]/.test(s[1])) { onset.push('y'); s = s.slice(1); }
  for (const [v, ph] of VOWEL_SPELL) if (s.startsWith(v)) { vowel = Array.isArray(ph) ? ph : [ph]; s = s.slice(v.length); break; }
  while (s) { if (!takeCons(coda)) s = s.slice(1); }
  return { onset, vowel: vowel || ['uh'], coda };
}
// "si-tey dot pee-kay" → ['si', 'tey', 'dot', 'pee', 'kay']
const syllables = (text) => String(text).trim().split(/[\s-]+/).filter(Boolean);

// split a word into sung syllables by its vowels: "Ayesha" → a-ye-sha, "Hassan" → has-san, "Afaq" → a-faq
function split(word) {
  const w = String(word).toLowerCase().replace(/[^a-z]/g, '');
  const isV = (i) => /[aeiou]/.test(w[i]) || (w[i] === 'y' && !/[aeiou]/.test(w[i + 1] || ''));
  const DI = ['sh', 'ch', 'th', 'kh', 'gh', 'ph', 'ng'];
  const out = [];
  let cur = '', i = 0;
  while (i < w.length) {
    while (i < w.length && !isV(i)) cur += w[i++];
    while (i < w.length && isV(i)) cur += w[i++];
    let j = i; while (j < w.length && !isV(j)) j++;
    if (j >= w.length) { cur += w.slice(i); out.push(cur); break; }
    const cons = w.slice(i, j);
    const keep = cons.length <= 1 ? 0 : DI.includes(cons.slice(-2)) ? cons.length - 2 : cons.length - 1;
    out.push(cur + cons.slice(0, keep)); cur = ''; i += keep;
  }
  return out.filter(Boolean);
}

// sing a phrase: notes [{ t, dur, midi, syl }] (t relative to the phrase start) → mono Float32Array
function phrase(notes, { type = 'alto', vib = 0.22, breath = 0.06, glide = 0.035, seed = 1, bright = 1 } = {}) {
  const V = F[type] || F.alto;
  const lead = 0.09; // room before the first note for its consonants
  const end = Math.max(...notes.map((n) => n.t + n.dur)) + 0.25;
  const out = new Float32Array(Math.ceil((end + lead) * SR));
  const r = rng(seed), noise = rng(seed * 13 + 5);
  const s1 = new Saw(Math.abs(r())), s2 = new Saw(Math.abs(r()));
  const tilt = new OnePole(), filt = [new SVF(), new SVF(), new SVF(), new SVF(), new SVF()], cf = new SVF(), cf2 = new SVF(), nasal = new SVF();
  // schedule: per note, the segments with absolute times (seconds from buffer start)
  // '~' holds the previous syllable over this note (a melisma: "dear Sa~am"): no new consonant,
  // the previous syllable's final consonants move to the end of the held note
  const parsed = notes.map((n) => (n.syl === '~' ? null : parse(n.syl || 'a')));
  parsed.forEach((P, i) => {
    if (P || !i) { if (!P) parsed[i] = parse('a'); return; }
    const prev = parsed[i - 1];
    parsed[i] = { onset: [], vowel: [prev.vowel[prev.vowel.length - 1]], coda: prev.coda };
    parsed[i - 1] = { ...prev, coda: [] };
  });
  const segs = notes.map((n, i) => {
    const P = parsed[i];
    const t0 = n.t + lead, t1 = t0 + n.dur;
    const onDur = Math.min(0.09, 0.28 * n.dur) * Math.min(1, P.onset.length);
    const codaDur = P.coda.length ? Math.min(0.08, 0.25 * n.dur) : 0;
    return { ...n, P, t0, t1, on0: t0 - onDur, codaStart: t1 - codaDur, prevMidi: i ? notes[i - 1].midi : n.midi, vowels: P.vowel.map((v) => V[v] || V.a) };
  });
  const vibRate = 5.4 + r() * 0.6;
  let curF = segs[0].vowels[0], amp = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    // the active note (the next one takes over from its consonant onset)
    let k = -1;
    for (let j = 0; j < segs.length; j++) if (t >= segs[j].on0) k = j;
    if (k < 0) continue;
    const g = segs[k];
    const inNote = t >= g.t0 && t < g.t1;
    const after = t >= g.t1;
    // pitch: glide from the previous note, then vibrato that grows in
    const u = t - g.t0;
    const semis = (u < glide && g.prevMidi !== g.midi ? (g.prevMidi - g.midi) * (1 - u / glide) : 0) + (u > 0.15 ? vib * Math.min(1, (u - 0.15) / 0.25) * Math.sin(TAU * vibRate * t) : 0);
    const f = mtof(g.midi) * Math.pow(2, semis / 12);
    // vowel target (diphthongs move from the first to the second vowel over the note)
    const vx = g.vowels.length > 1 ? Math.min(1, Math.max(0, (u - g.t1 + g.t0 + (g.t1 - g.t0) * 0.55) / ((g.t1 - g.t0) * 0.45))) : 0;
    let target = g.vowels.length > 1 ? mix(g.vowels[0], g.vowels[1], vx) : g.vowels[0];
    // which consonant (if any) is sounding right now
    let cons = null, cu = 0;
    if (t < g.t0 && g.P.onset.length) { const d = (g.t0 - g.on0) / g.P.onset.length; const idx = Math.min(g.P.onset.length - 1, Math.floor((t - g.on0) / d)); cons = C[g.P.onset[idx]]; cu = (t - g.on0 - idx * d) / d; }
    else if (inNote && t >= g.codaStart && g.P.coda.length) { const d = (g.t1 - g.codaStart) / g.P.coda.length; const idx = Math.min(g.P.coda.length - 1, Math.floor((t - g.codaStart) / d)); cons = C[g.P.coda[idx]]; cu = (t - g.codaStart - idx * d) / d; }
    if (cons && cons.kind === 'affric') cons = cu < 0.4 ? C[cons.stop] : C[cons.fric];
    if (cons && cons.kind === 'glide') target = cons.to || V[cons.vowel];
    // formants glide smoothly (≈ 25 ms) towards the target
    const a = 1 - Math.exp(-1 / (0.025 * SR));
    curF = curF.map((x, q) => [x[0] + (target[q][0] - x[0]) * a, x[1] + (target[q][1] - x[1]) * a, x[2] + (target[q][2] - x[2]) * a]);
    // amplitude envelope: voiced during the note (and glides / nasals / voiced consonants), a fast release after
    const next = segs[k + 1];
    const gap = next ? next.on0 - g.t1 : 1;
    const want = after ? (gap > 0.02 ? 0 : 1) : (cons && (cons.kind === 'stop' || (cons.kind === 'fric' && !cons.voiced) || cons.kind === 'aspire') ? 0.08 : 1);
    amp += (want - amp) * (want > amp ? 0.012 : 0.004);
    // the voice: two detuned saws, tilted by the brightness, through the five formants
    let src = s1.next(f) * 0.7 + s2.next(f * 1.004) * 0.3;
    src = tilt.lp(src, 1400 + 1200 * bright) * 0.75 + src * 0.25 + noise() * breath;
    let v = 0;
    if (cons && cons.kind === 'nasal') v = nasal.bp(src, cons.f1, 2.2) * 1.6 + filt[1].bp(src, 1200, 8) * 0.08;
    else for (let q = 0; q < 5; q++) v += filt[q].bp(src, curF[q][0], curF[q][0] / curF[q][2]) * Math.pow(10, curF[q][1] / 20);
    let s = v * amp * 1.3;
    // unvoiced parts: hiss, bursts, aspiration
    if (cons) {
      const n = noise();
      if (cons.kind === 'fric' || cons.kind === 'affric') s += cf2.bp(cf.hp(n, cons.lo), (cons.lo + cons.hi) / 2, 1.2) * cons.amp * Math.sin(Math.PI * Math.min(1, cu)) * 0.9;
      if (cons.kind === 'stop' && cu > 0.55) s += cf.bp(n, cons.burst, 1.5) * 0.7 * Math.exp(-(cu - 0.55) * 18);
      if (cons.kind === 'aspire') { let h = 0; for (let q = 0; q < 3; q++) h += filt[q].bp(n * 0.4, target[q][0], target[q][0] / target[q][2]) * Math.pow(10, target[q][1] / 20); s += h * cons.amp * 2; }
    }
    out[i] = s * 0.55;
  }
  out.lead = lead; // the phrase audio starts `lead` seconds before note time 0: place it at T - lead
  return out;
}
// zip spelled syllables with notes
const line = (text, notes, opts) => { const syl = syllables(text); return phrase(notes.map((n, i) => ({ ...n, syl: syl[i] || syl[syl.length - 1] })), opts); };

// "Happy birthday" with a name, in any key and tempo: { notes, lyric, audio } (notes relative to 0).
// The name is split into syllables by its vowels ("Afaq" → a-faq); pass 'A-faq' to choose yourself.
function happyBirthday(name = 'you', { bpm = 100, key = 'C', type = 'alto', octave = 4 } = {}) {
  const b = 60 / bpm, k = m(`${key}${octave}`) - m('C4');
  const nameSyl = /-/.test(name) ? syllables(name.toLowerCase()) : split(name);
  const L1 = [['G4', 0.75, 'hap'], ['G4', 0.25, 'pee'], ['A4', 1, 'birth'], ['G4', 1, 'day'], ['C5', 1, 'too'], ['B4', 2, 'yoo']];
  const L2 = [['G4', 0.75, 'hap'], ['G4', 0.25, 'pee'], ['A4', 1, 'birth'], ['G4', 1, 'day'], ['D5', 1, 'too'], ['C5', 2, 'yoo']];
  const L3 = [['G4', 0.75, 'hap'], ['G4', 0.25, 'pee'], ['G5', 1, 'birth'], ['E5', 1, 'day'], ['C5', 1, 'dear']];
  // the name fills B4 (1 beat) + A4 (2 beats): one syllable holds across both, more split the A4
  const n = nameSyl.length;
  if (n <= 1) L3.push(['B4', 1, nameSyl[0] || 'yoo'], ['A4', 2, '~']);
  else { L3.push(['B4', 1, nameSyl[0]]); for (let i = 1; i < n; i++) L3.push(['A4', 2 / (n - 1), nameSyl[i]]); }
  const L4 = [['F5', 0.75, 'hap'], ['F5', 0.25, 'pee'], ['E5', 1, 'birth'], ['C5', 1, 'day'], ['D5', 1, 'too'], ['C5', 3, 'yoo']];
  let t = 0;
  const notes = [];
  for (const [nn, d, syl] of [...L1, ...L2, ...L3, ...L4]) { notes.push({ t: t * b, dur: d * b * 0.94, midi: m(nn) + k, syl }); t += d; }
  return { notes, lyric: notes.map((x) => x.syl).filter((x) => x !== '~').join(' '), audio: phrase(notes, { type }) };
}

module.exports = { phrase, line, syllables, split, parse, happyBirthday, FORMANTS: F };
