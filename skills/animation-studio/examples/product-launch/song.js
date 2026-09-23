// THE SONG: every sound comes from an event in score.js.   node song.js   (STEMS=1 writes stems, LUFS=-14 sets loudness)
// A voiceover over a soft bed, a pluck on every style cut, one bar of each genre pack, and an EDM drop
// for the end card. The music ducks under the voice.
const path = require('path');
const { SR, Bus, reverb } = require('./engine/audio/dsp');
const I = require('./engine/audio/instruments');
const MIX = require('./engine/audio/mix');
const Genre = require('./engine/audio/genres');
const Voice = require('./engine/audio/voice');
const sc = require('./score');
const { T, BEAT, DURATION, m, ev, clock, chordAt } = sc;

const N = Math.ceil(DURATION * SR);
const bus = () => new Bus(N);
const buses = { drums: bus(), bass: bus(), pad: bus(), keys: bus() };
const lead = bus(), fx = bus(), verb = bus();

// intro: a music box plays the hook while the mascot draws itself; the title stamps on bar 1
[['E5', 0], ['G5', 0.5], ['C6', 1], ['B5', 2], ['G5', 2.5], ['E5', 3], ['D5', 3.5]].forEach(([n, b]) => { const x = I.musicBox(m(n)); lead.addMono(x, T(0, b), 0.2, 0.2); verb.addMono(x, T(0, b), 0.2); });
fx.addMono(I.thud(80, 0.12), ev.title, 0.6);
fx.addMono(I.woodTick(0.8), ev.title, 0.3);
Genre.play('lofi', { clock, from: 0, to: 2, chordAt, buses, drums: false, bassline: false });
// code: a soft boom-bap bed under the voice
Genre.play('boombap', { clock, from: 2, to: 4, chordAt, buses, gain: 0.7 });
// looks: a bright pluck on every style cut, climbing
sc.looks.forEach((l, i) => { const x = I.pluck(m(['C5', 'E5', 'G5', 'C6', 'E6', 'G6'][i])); lead.addMono(x, l.t, 0.35, (i % 2 ? 0.3 : -0.3)); verb.addMono(x, l.t, 0.15); fx.addMono(I.paperFwip(1.2 + i * 0.1, i + 3), l.t - 0.04, 0.15); });
Genre.play('edm', { clock, from: 4, to: 6, chordAt, buses, gain: 0.5, bassline: false });
// sounds: one bar of each genre pack
for (const g of sc.GENRES) {
  Genre.play(g.name, { clock, from: g.bar, to: g.bar + 1, chordAt, buses });
  const lf = Genre.lead(g.name), c = chordAt(T(g.bar));
  for (let i = 0; i < 4; i++) { const n = c.notes[i % c.notes.length] + 12; const x = lf(n, BEAT * 0.9); if (x.L) lead.addStereo(x.L, x.R, T(g.bar, i), 0.14); else lead.addMono(x, T(g.bar, i), 0.2, 0.1); }
}
fx.addMono(I.crash(2), ev.sounds, 0.3);
// people: an afrobeats walk
Genre.play('afrobeats', { clock, from: 10, to: 12, chordAt, buses, gain: 0.8 });
// data: orchestral, with a pop per map pin
Genre.play('orchestral', { clock, from: 12, to: 14, chordAt, buses, gain: 0.9 });
for (const p of sc.pins) fx.addMono(I.pop(1800 + (p.t - ev.data) * 200), p.t + 0.36, 0.25, 0.2);
// the end: an EDM drop
const { kicks } = Genre.play('edm', { clock, from: 14, to: 16, chordAt, buses });
fx.addMono(I.crash(5), ev.end, 0.45);
fx.addMono(I.subBoom(1.2, 80, 34), ev.end, 0.5);
for (const n of [m('C4'), m('E4'), m('G4'), m('C5')]) { const { L, R } = I.supersaw(n, 1.4, { release: 1 }); lead.addStereo(L, R, T(16), 0.1); }
buses.drums.addMono(I.kick({ punch: 1.2 }), T(16), 0.9);
MIX.sidechain([buses.pad, buses.keys], kicks, { depth: 0.45 });

// the voiceover, and the music ducks under it
const vo = Voice.speak(sc.vo, { out: path.join(__dirname, 'out'), length: DURATION, voice: 'Samantha', rate: 180 });
const music = [buses.drums, buses.bass, buses.pad, buses.keys, lead];
MIX.duck(music, vo.bus, { depth: 0.55 });

const room = reverb(verb, { room: 0.7, damp: 0.4 });
const stems = { ...buses, lead, fx, voice: vo.bus, verb: room };
const GAIN = { drums: 0.9, bass: 0.8, pad: 1, keys: 1, lead: 1, fx: 1, voice: 1.7, verb: 0.4 };
const mix = MIX.mixdown(stems, GAIN, { stemDir: process.env.STEMS ? path.join(__dirname, 'out') : null });
MIX.highpass(mix, 28);
MIX.fadeOut(mix, DURATION - 1, DURATION);
const res = MIX.master(mix, 0.8, undefined, { lufs: process.env.LUFS ? +process.env.LUFS : -14 });
MIX.writeWav(path.join(__dirname, 'out', 'music.wav'), mix);
console.log(`out/music.wav  ${DURATION.toFixed(1)}s  ${res.lufs.toFixed(1)} LUFS  voice: ${vo.engine}`);
