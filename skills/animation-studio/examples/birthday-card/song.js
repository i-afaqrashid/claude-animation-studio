// THE SONG: every sound comes from an event in score.js.   node song.js   (STEMS=1 writes stems, LUFS=-14 sets loudness)
// A music box and pizzicato strings under a sung "Happy Birthday" (the formant singer, engine/audio/sing.js).
const path = require('path');
const { SR, Bus, reverb } = require('./engine/audio/dsp');
const I = require('./engine/audio/instruments');
const MIX = require('./engine/audio/mix');
const Sing = require('./engine/audio/sing');
const U = require('./engine/util');
const sc = require('./score');
const { T, BEAT, DURATION, m, ev, notes } = sc;

const N = Math.ceil(DURATION * SR);
const bus = () => new Bus(N);
const voice = bus(), box = bus(), strings = bus(), bass = bus(), fx = bus(), verb = bus();
const rng = U.mulberry32(3);

// ---------- intro: a music-box arpeggio while the candles are lit one by one ----------
[['C5', 0], ['E5', 0.5], ['G5', 1], ['C6', 1.5], ['G5', 2], ['E5', 2.5], ['D5', 3], ['G5', 3.5], ['B5', 4]].forEach(([n, b]) => { const x = I.musicBox(m(n)); box.addMono(x, T(0, b), 0.22, 0.2); verb.addMono(x, T(0, b), 0.2); });
for (const t of ev.candles) { fx.addMono(I.paperFwip(1.6, Math.round(t * 10)), t, 0.1, (rng() - 0.5) * 0.6); fx.addMono(I.bell(2400 + rng() * 800, 0.12, 1.2, 2), t + 0.03, 0.04); }

// ---------- the song ----------
const sung = Sing.phrase(notes.map((n) => ({ ...n, t: n.t - notes[0].t })), { type: 'alto', vib: 0.25, breath: 0.05, seed: 7, bright: 1.1 });
voice.addMono(sung, notes[0].t - sung.lead, 0.7);
verb.addMono(sung, notes[0].t - sung.lead, 0.25);
for (const n of notes) { const x = I.musicBox(n.midi + 12); box.addMono(x, n.t, 0.07, -0.2); }
// harmony: one chord per 3/4 bar (bar 2 is the first "BIRTH-day")
const CH = { C: ['C4', 'E4', 'G4', 'C3'], G: ['B3', 'D4', 'G4', 'G2'], C7: ['Bb3', 'E4', 'G4', 'C3'], F: ['A3', 'C4', 'F4', 'F2'] };
const bars = ['C', 'G', 'G', 'C', 'C7', 'F', 'C', 'C'];
bars.forEach((name, i) => {
  const bar = 2 + i, [a, b2, c, root] = CH[name];
  const last = i === bars.length - 1;
  bass.addMono(I.pizz(m(root)), T(bar), 0.5);
  if (!last) for (const beat of [1, 2]) for (const n of [a, b2, c]) strings.addMono(I.pizz(m(n)), T(bar, beat), 0.13, n === a ? -0.3 : 0.3);
  else for (const n of [a, b2, c]) { const { L, R } = I.strings(m(n), 2.6, { attack: 0.08, release: 1 }); strings.addStereo(L, R, T(bar), 0.12); }
});
// the dominant under "birth-day to" in bar 8 (beat 2)
for (const n of ['B3', 'D4', 'G4']) strings.addMono(I.pizz(m(n)), T(8, 2), 0.13);

// ---------- blow out the candles: a whoosh, a party popper, a little cheer ----------
fx.addMono(I.noiseSweep(0.45, 700, 2600, { q: 0.7, pink: true, shape: (x) => x * x }), ev.blow - 0.45, 0.3); // the big breath in…
fx.addMono(I.pop(1500), ev.blow, 0.7); // …and the party popper, right on the blow
fx.addMono(I.thud(90, 0.08), ev.blow, 0.4);
fx.addMono(I.noiseSweep(0.25, 800, 6000, { q: 1 }), ev.blow, 0.2);
for (let i = 0; i < 8; i++) fx.addMono(I.voice(m('C5') + Math.floor(rng() * 6), 0.4, { syl: 'e', type: 'alto', seed: 90 + i, glide: 3, breath: 0.2, shout: 1.2 }), ev.blow + 0.3 + rng() * 0.2, 0.06, (rng() - 0.5));
[['C5', 0], ['E5', 0.15], ['G5', 0.3], ['C6', 0.45]].forEach(([n, d]) => { const x = I.musicBox(m(n)); box.addMono(x, ev.blow + 0.6 + d, 0.2); verb.addMono(x, ev.blow + 0.6 + d, 0.25); });

const hall = reverb(verb, { room: 0.8, damp: 0.3 });
const stems = { voice, box, strings, bass, fx, verb: hall };
const GAIN = { voice: 1, box: 1, strings: 1, bass: 1, fx: 1, verb: 0.5 };
const mix = MIX.mixdown(stems, GAIN, { stemDir: process.env.STEMS ? path.join(__dirname, 'out') : null });
MIX.highpass(mix, 30);
MIX.fadeOut(mix, DURATION - 1, DURATION);
const res = MIX.master(mix, 0.8, undefined, { lufs: process.env.LUFS ? +process.env.LUFS : -15 });
MIX.writeWav(path.join(__dirname, 'out', 'music.wav'), mix);
console.log(`out/music.wav  ${DURATION.toFixed(1)}s  ${res.lufs.toFixed(1)} LUFS  sung for ${sc.NAME} (${sc.nameSyl.join('-')})`);
