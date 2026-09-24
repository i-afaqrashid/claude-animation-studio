// THE SONG — every sound comes from an event in score.js.   node song.js   (STEMS=1 writes stems)
const path = require('path');
const { SR, Bus, reverb, pingpong } = require('./engine/audio/dsp');
const I = require('./engine/audio/instruments');
const MIX = require('./engine/audio/mix');
const { mtof } = require('./engine/music');
const sc = require('./score');
const { T, BEAT, DURATION, m, ev, clock } = sc;

const N = Math.ceil(DURATION * SR);
const bus = () => new Bus(N);
const drums = bus(), bass = bus(), pad = bus(), keys = bus(), lead = bus(), brass = bus(), fx = bus();
const verb = bus(), dly = bus();
const pan = (x) => Math.max(-1, Math.min(1, x));

// ---------- drums: light in the app steps, full on the payoff ----------
const K = I.kick({ tail: 0.26 }), CL = I.clap(), SN = I.snare(), HC = [I.hat(false, 11), I.hat(false, 12)], HO = I.hat(true, 14), CR = I.crash(18);
const SH = [I.shaker(1, 15), I.shaker(0.6, 16)];
const kicks = [];
clock.eachStep(1, 8, 16, (t, b, s) => {
  if (t >= ev.breath[0] && t < ev.breath[1]) return; // the held breath
  const full = b >= 5;
  if (full ? s % 4 === 0 : s % 8 === 0) { drums.addMono(K, t, full ? 0.9 : 0.7); kicks.push(t); }
  if (b >= 2 && s % 8 === 4) { drums.addMono(CL, t, full ? 0.55 : 0.38); verb.addMono(CL, t, 0.2); if (full) drums.addMono(SN, t, 0.2); }
  if (full) { drums.addMono(HC[s % 2], t, s % 2 ? 0.2 : 0.11, -0.3); if (s % 4 === 2) drums.addMono(HO, t, 0.11, 0.3); }
  else if (s % 2 === 0) drums.addMono(SH[s % 4 === 0 ? 1 : 0], t, 0.14, 0.35);
});
for (let i = 0; i < 6; i++) drums.addMono(SN, T(4, 2) + i * BEAT / 4, 0.14 + i * 0.035, 0.05); // roll into the breath
drums.addMono(CR, ev.plate, 0.42, -0.2);
drums.addMono(CR, ev.logo, 0.3, 0.2);

// ---------- bass ----------
clock.eachStep(1, 8, 8, (t, b, s) => {
  if (t >= ev.breath[0] && t < ev.breath[1]) return;
  const c = sc.chordAt(t);
  if (!c) return;
  const R = c.bass + 12;
  if (b >= 5) bass.addMono(I.bass(s % 2 ? R + 12 : R, BEAT / 2 * 0.8, { sub: 0.8 }), t, 0.55);
  else if (s === 0 || s === 3 || s === 4 || s === 6) bass.addMono(I.bass(s === 4 ? R + 7 : R, BEAT / 2 * (s === 0 ? 1.5 : 0.8)), t, 0.5);
});
bass.addMono(I.bass(m('G1'), 2.4, { bright: 0.3, sub: 1 }), T(8), 0.5);

// ---------- pads ----------
for (const c of sc.chords) {
  const t1 = c.t0 < ev.breath[0] && c.t1 > ev.breath[0] ? ev.breath[0] : c.t1;
  const opts = c.t0 >= ev.plate && c.t0 < T(8) ? { cutoff: 2400, attack: 0.05 } : { cutoff: 1100, attack: 0.4, release: 1.4 };
  for (const n of c.notes) { const { L, R } = I.padNote(n, t1 - c.t0 + (c.t0 >= T(8) ? 1.5 : 0), opts); pad.addStereo(L, R, c.t0, 0.085); }
}

// ---------- FRIDGE: the door, the light, the question ----------
fx.addMono(I.thud(70, 0.1), ev.doorOpen, 0.5);
fx.addMono(I.woodTick(0.7), ev.doorOpen, 0.25, -0.2);
for (const [i, f] of [m('D6'), m('G6'), m('B6')].entries()) keys.addMono(I.bell(mtof(f), 0.8, 1.2, 3.5), ev.doorOpen + 0.08 + i * 0.05, 0.05, 0.3);
for (const n of sc.musicbox) { const mb = I.musicBox(n.midi); keys.addMono(mb, n.t, 0.17, 0.15); verb.addMono(mb, n.t, 0.15); dly.addMono(mb, n.t, 0.06); }
fx.addMono(I.paperFwip(1.0, 7), ev.question - 0.03, 0.2, -0.2);

// ---------- SNAP: whoosh up, shutter, one guitar note per ingredient chip ----------
fx.addMono(I.noiseSweep(0.35, 500, 4000, { q: 1, pink: true }), ev.phoneUp, 0.22);
fx.addMono(I.tvClick(), ev.shutter, 0.5);
fx.addMono(I.noiseSweep(0.12, 6000, 1500, { q: 0.8 }), ev.shutter, 0.35);
fx.addMono(I.thud(140, 0.05), ev.shutter, 0.35);
for (const c of sc.chips) { const g = I.guitar(c.midi, 0.5, { bright: 0.6, seed: c.i + 1 }); lead.addMono(g, c.t, 0.5, pan(-0.3 + c.i * 0.3)); verb.addMono(g, c.t, 0.12); }

// ---------- RECIPES: a guitar note per card, a pop on each title, the tap ----------
for (const c of sc.cards) {
  const g = I.guitar(c.midi, 0.7, { bright: 0.55, seed: 10 + c.i });
  lead.addMono(g, c.tIn, 0.55, pan(0.2 * c.i - 0.2)); verb.addMono(g, c.tIn, 0.12); dly.addMono(g, c.tIn, 0.05);
  fx.addMono(I.pop(1800 + c.i * 300, 40 + c.i), c.tTitle, 0.16, 0.1);
}
fx.addMono(I.pop(1200, 60), ev.tap, 0.3);
for (const f of ['G4', 'C5', 'E5']) keys.addMono(I.epiano(m(f), 0.5), ev.tap, 0.13, 0.1);

// ---------- COOK: every tick is a plucked note + a wood tick, climbing ----------
for (const s of sc.steps) {
  const g = I.guitar(s.midi, 0.45, { bright: 0.65, seed: 20 + s.i });
  lead.addMono(g, s.t, 0.5, pan(-0.15 + s.i * 0.1)); verb.addMono(g, s.t, 0.1);
  drums.addMono(I.woodTick(1 + s.i * 0.08), s.t, 0.12, 0.25);
}

// ---------- SHARE: call (e-piano, left) and response (guitar, right) ----------
for (const c of sc.chat) {
  if (c.who === 'me') { const g = I.guitar(c.midi, 0.6, { bright: 0.6, seed: 30 }); lead.addMono(g, c.t, 0.55, 0.35); verb.addMono(g, c.t, 0.12); }
  else { const e = I.epiano(c.midi, 0.5); keys.addMono(e, c.t, 0.32, -0.35); keys.addMono(I.epiano(c.midi - 12, 0.5), c.t, 0.14, -0.35); verb.addMono(e, c.t, 0.1); }
  fx.addMono(I.pop(2400, 70 + c.t * 10), c.t, 0.08, c.who === 'me' ? 0.4 : -0.4);
}
fx.addMono(I.noiseSweep(ev.breath[0] - T(4, 1), 300, 7000, { q: 0.9, shape: (x) => x * x, pink: true }), T(4, 1), 0.35); // riser

// ---------- PAYOFF: the plate lands; the hook on guitar + brass ----------
fx.addMono(I.subBoom(1.8), ev.plate, 0.6);
fx.addMono(I.thud(85, 0.09), ev.plate, 0.6);
for (const n of sc.payoffHook) {
  const g = I.guitar(n.midi, n.dur, { bright: 0.7, seed: 40 });
  lead.addMono(g, n.t, 0.42, 0.15);
  const a = I.brassNote(n.midi, n.dur * 0.9), b = I.brassNote(n.midi - 12, n.dur * 0.9, { bright: 0.8, seed: 99 });
  brass.addStereo(a.L, a.R, n.t, 0.2); brass.addStereo(b.L, b.R, n.t, 0.1); verb.addStereo(a.L, a.R, n.t, 0.08); dly.addStereo(a.L, a.R, n.t, 0.04);
}
for (const s of sc.stats) { const st = I.brassNote(s.midi, 0.3, { stab: true }); brass.addStereo(st.L, st.R, s.t, 0.4); fx.addMono(I.pop(900, 80), s.t, 0.2); }

// ---------- END: logo bells, the tagline on music-box notes, a final chord ----------
for (const [i, f] of ['G5', 'B5', 'D6', 'G6'].entries()) keys.addMono(I.bell(mtof(m(f)), 1.4, 1.6, 3.5), ev.logo + i * 0.06, 0.08, pan(-0.3 + i * 0.2));
for (const f of ['G3', 'B3', 'D4', 'G4']) { const a = I.brassNote(m(f), BEAT * 1.5); brass.addStereo(a.L, a.R, ev.logo, 0.14); }
for (const [i, w] of sc.tagline.entries()) { const mb = I.musicBox(m(['D6', 'E6', 'G6'][i])); keys.addMono(mb, w.t, 0.16); verb.addMono(mb, w.t, 0.12); }
fx.addMono(I.pop(1500, 90), sc.cta, 0.22);
{ const mb = I.musicBox(m('G5'), { decay: 2.2 }); keys.addMono(mb, T(8), 0.18); verb.addMono(mb, T(8), 0.2); }

// ---------- mix ----------
MIX.sidechain([pad, bass], kicks.filter((t) => t >= ev.plate && t < T(8)));
const stems = {
  drums, bass, pad, keys, lead, brass, fx,
  verb: reverb(verb, { room: 0.82, damp: 0.35 }),
  dly: pingpong(dly, BEAT * 0.75, 0.35, 3500),
};
const GAIN = { drums: 0.42, bass: 0.7, pad: 2.4, keys: 1.0, lead: 3.4, brass: 1.7, fx: 0.8, verb: 1, dly: 1 };
const out = path.join(__dirname, 'out');
const mix = MIX.mixdown(stems, GAIN, { stemDir: process.env.STEMS ? out : null });
MIX.highpass(mix, 22);
MIX.gate(mix, ev.breath[0], ev.breath[1]);
MIX.fadeOut(mix, DURATION - 1.4, DURATION);
// LUFS=-14 node song.js masters to a target loudness (±0.2 LU) (-14 suits YouTube/Spotify-normalised platforms)
const M = MIX.master(mix, parseFloat(process.env.DRIVE || '0.8'), undefined, { lufs: process.env.LUFS ? parseFloat(process.env.LUFS) : null });
MIX.writeWav(path.join(out, 'music.wav'), mix);
console.log(`wrote out/music.wav (${DURATION.toFixed(2)}s${M.lufs !== undefined ? `, ${M.lufs.toFixed(1)} LUFS at drive ${M.drive.toFixed(2)}` : ''})`);
