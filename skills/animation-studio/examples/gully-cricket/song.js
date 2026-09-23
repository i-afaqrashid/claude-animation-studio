// THE SONG: every sound comes from an event in score.js.   node song.js   (STEMS=1 writes stems, LUFS=-14 sets loudness)
// A desi dholak groove (Genre 'desi'), a suspense riser while the ball climbs, the drop on the six,
// then glass, a record scratch and dead silence under aunty. The commentary is a real TTS voiceover.
const path = require('path');
const { SR, Bus, reverb } = require('./engine/audio/dsp');
const I = require('./engine/audio/instruments');
const MIX = require('./engine/audio/mix');
const Genre = require('./engine/audio/genres');
const Sing = require('./engine/audio/sing');
const Voice = require('./engine/audio/voice');
const U = require('./engine/util');
const sc = require('./score');
const { T, BEAT, DURATION, m, ev, clock, chordAt } = sc;

const N = Math.ceil(DURATION * SR);
const bus = () => new Bus(N);
const drums = bus(), bass = bus(), pad = bus(), keys = bus(), brass = bus(), chant = bus(), fx = bus(), crowd = bus(), verb = bus();
const rng = U.mulberry32(5);

// ---------- the groove: light intro, full from bar 2, a roll into the hit ----------
Genre.play('desi', { clock, from: 0, to: 2, chordAt, buses: { drums, bass, pad, keys }, gain: 0.65, chords: false });
Genre.play('desi', { clock, from: 2, to: 4, chordAt, buses: { drums, bass, pad, keys }, fill: [3] });
// the hit: bat on ball
fx.addMono(I.thwack(), ev.hit, 0.9);
drums.addMono(I.dholak('ghe'), ev.hit, 0.9);
fx.addMono(I.subBoom(0.8, 90, 40), ev.hit, 0.4);
// the ball climbs: no drums, a clock ticking on the beat, a rising sweep, a harmonium trill that climbs
for (let b = 0; b < 7; b++) fx.addMono(I.woodTick(b % 2 ? 1.2 : 1), T(4, 1 + b), 0.18, b % 2 ? 0.3 : -0.3);
fx.addMono(I.noiseSweep(T(6) - ev.rise, 300, 6000, { q: 1.2, pink: true, shape: (x) => x * x }), ev.rise, 0.14);
for (let i = 0; i < 24; i++) {
  const t = ev.rise + ((T(6) - ev.rise) * i) / 24, n = m('A4') + Math.floor(i / 3) + (i % 2 ? 1 : 0);
  const { L, R } = I.harmonium(n, (T(6) - ev.rise) / 24, { attack: 0.01, release: 0.03, bright: 1.2, seed: i });
  keys.addStereo(L, R, t, 0.05 + i * 0.002);
}
bass.addMono(I.bass(m('A1'), T(6) - ev.hit, { bright: 0.2, sub: 1 }), ev.hit, 0.4);
// ---------- SIX: the drop ----------
Genre.play('desi', { clock, from: 6, to: 8, chordAt, buses: { drums, bass, pad, keys }, gain: 1.1 });
drums.addMono(I.crash(3), ev.six, 0.5);
fx.addMono(I.subBoom(1.2, 80, 34), ev.six, 0.55);
for (const [bar, name] of [[6, 'F'], [7, 'C']]) for (const beat of [0, 1.5, 3]) {
  const c = sc.chords.find((q) => q.name === name && q.bar === bar);
  for (const n of c.notes) { const { L, R } = I.brassNote(n, BEAT * 0.4, { stab: true, bright: 1.2, seed: n + beat * 10 }); brass.addStereo(L, R, T(bar, beat), 0.09); }
}
// the kids chant "chhak-kaa!": five young voices, a little apart
for (let k = 0; k < 5; k++) {
  const x = Sing.phrase(sc.chant.map((n) => ({ ...n, t: n.t - sc.chant[0].t, midi: n.midi + (rng() - 0.5) * 0.3 })), { type: k % 2 ? 'soprano' : 'alto', vib: 0.1, breath: 0.12, seed: 30 + k, bright: 1.3 });
  chant.addMono(x, sc.chant[0].t - x.lead + k * 0.012, 0.22, (k - 2) * 0.25);
  verb.addMono(x, sc.chant[0].t - x.lead, 0.08);
}
// cheering: short shouts all over the drop
for (let i = 0; i < 26; i++) {
  const t = ev.six + 0.1 + rng() * (ev.crash - ev.six - 0.4);
  crowd.addMono(I.voice(m('A4') + Math.floor(rng() * 8), 0.3 + rng() * 0.3, { syl: rng() < 0.5 ? 'a' : 'e', type: 'alto', seed: 70 + i, glide: 2 + rng() * 3, breath: 0.2, shout: 1.3 }), t, 0.07, (rng() - 0.5) * 1.4);
}
// ---------- CRASH: glass, a record scratch, and the music just stops ----------
fx.addMono(I.glass(4), ev.crash, 0.8, 0.35);
fx.addMono(I.scratch(0.34), ev.crash, 0.45);
fx.addMono(I.bwomp(), ev.point, 0.35); // everyone points at Bilal
// ---------- the escape: the groove comes back, a whistle, running feet ----------
Genre.play('desi', { clock, from: 11, to: 13, chordAt, buses: { drums, bass, pad, keys } });
fx.addMono(I.whistle(0.5), ev.run - 0.05, 0.25);
for (let i = 0; i < 16; i++) fx.addMono(I.woodTick(0.6 + (i % 2) * 0.2), ev.run + i * BEAT / 2, 0.12, (i % 2 ? 0.4 : -0.4));
for (const n of [m('D4'), m('G4'), m('B4'), m('D5')]) { const { L, R } = I.harmonium(n, 1.2, { attack: 0.01, release: 0.8, bright: 1.1, seed: n }); keys.addStereo(L, R, T(13), 0.08); }
drums.addMono(I.dholak('ghe'), T(13), 0.9);
drums.addMono(I.clap({ spread: 1.4 }), T(13), 0.6);

// ---------- the voiceover ----------
const vo = Voice.speak(sc.vo, { out: path.join(__dirname, 'out'), length: DURATION });

// ---------- mix ----------
const room = reverb(verb, { room: 0.6, damp: 0.4 });
const music = [drums, bass, pad, keys, brass, chant, crowd];
for (const b of music) MIX.gate(b, ev.crash + 0.02, ev.run - 0.05, 0.01); // the silence after the crash (then the chase)
MIX.duck(music, vo.bus, { depth: 0.55 });
const stems = { drums, bass, pad, keys, brass, chant, crowd, fx, voice: vo.bus, verb: room };
const GAIN = { drums: 1, bass: 0.7, pad: 1, keys: 1, brass: 2.5, chant: 2.8, crowd: 2, fx: 1, voice: 1.8, verb: 0.4 }; // set with engine/tools/levels.js: the voice sits on top
const mix = MIX.mixdown(stems, GAIN, { stemDir: process.env.STEMS ? path.join(__dirname, 'out') : null });
MIX.highpass(mix, 28);
MIX.fadeOut(mix, DURATION - 0.8, DURATION);
const res = MIX.master(mix, 0.8, undefined, { lufs: process.env.LUFS ? +process.env.LUFS : -14 });
MIX.writeWav(path.join(__dirname, 'out', 'music.wav'), mix);
console.log(`out/music.wav  ${DURATION.toFixed(1)}s  ${res.lufs.toFixed(1)} LUFS  voice: ${vo.engine} (${vo.lines.length} lines)`);
