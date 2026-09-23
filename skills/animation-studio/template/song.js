// THE SONG — renders every sound from the score into out/music.wav.
//   node song.js            (STEMS=1 also writes out/stem-*.wav, DRIVE=0.8 sets master loudness)
const path = require('path');
const { SR, Bus, reverb, pingpong } = require('./engine/audio/dsp');
const I = require('./engine/audio/instruments');
const MIX = require('./engine/audio/mix');
const sc = require('./score');
const { T, BEAT, DURATION, m, ev, clock } = sc;

const N = Math.ceil(DURATION * SR);
const bus = () => new Bus(N);
const drums = bus(), bass = bus(), pad = bus(), keys = bus(), brass = bus(), fx = bus();
const verb = bus(), dly = bus();

// ---------- drums: groove (bars 2-5), drop (bars 6-8) ----------
const K = I.kick(), SN = I.snare(), CL = I.clap(), HC = [I.hat(false, 11), I.hat(false, 12)], HO = I.hat(true, 14), CR = I.crash(18);
const SH = [I.shaker(1, 15), I.shaker(1, 16)];
const kicks = [];
clock.eachStep(2, 9, 16, (t, b, s) => {
  if (t >= ev.breath && t < ev.drop) return; // the held breath
  const drop = b >= 6;
  if (drop ? s % 4 === 0 : s % 8 === 0) { drums.addMono(K, t, 0.95); kicks.push(t); }
  if (s % 8 === 4) { drums.addMono(CL, t, 0.6); verb.addMono(CL, t, 0.3); if (drop) drums.addMono(SN, t, 0.25); }
  if (drop) { drums.addMono(HC[s % 2], t, s % 2 ? 0.22 : 0.12, -0.3); if (s % 4 === 2) drums.addMono(HO, t, 0.12, 0.3); }
  else if (s % 2 === 0) drums.addMono(s % 4 === 2 ? HC[0] : SH[s % 2], t, 0.18, s % 4 === 2 ? -0.3 : 0.35);
});
drums.addMono(CR, ev.drop, 0.4, -0.2);
drums.addMono(CR, ev.end, 0.3, 0.2);
// accelerating snare roll into the breath
for (let i = 0; i < 8; i++) drums.addMono(SN, T(5, 1) + i * BEAT / 4, 0.2 + i * 0.03, 0.05);

// ---------- bass ----------
clock.eachStep(2, 9, 8, (t, b, s) => {
  if (t >= ev.breath && t < ev.drop) return;
  const c = sc.chordAt(t);
  if (!c) return;
  const R = c.bass + 12;
  if (b >= 6) bass.addMono(I.bass(s % 2 ? R + 12 : R, BEAT / 2 * 0.8, { sub: 0.8 }), t, 0.6);
  else if (s === 0 || s === 3 || s === 4 || s === 7) bass.addMono(I.bass(s === 4 ? R + 7 : R, BEAT / 2 * (s % 4 === 0 ? 1.4 : 0.7)), t, 0.55);
});
bass.addMono(I.bass(m('F2'), 2.5, { bright: 0.3, sub: 1 }), ev.end, 0.5);

// ---------- pads ----------
for (const c of sc.chords) {
  const t1 = c.t1 > ev.breath && c.t0 < ev.breath ? ev.breath : c.t1;
  const opts = c.t0 >= ev.drop && c.t0 < ev.end ? { cutoff: 2600, attack: 0.05 } : { cutoff: 1000, attack: 0.5, release: 1.4 };
  for (const n of c.notes) { const { L, R } = I.padNote(n, t1 - c.t0, opts); pad.addStereo(L, R, c.t0, 0.09); }
}

// ---------- keys: music box + the melody that draws the stars ----------
for (const n of sc.musicbox) { const mb = I.musicBox(n.midi); keys.addMono(mb, n.t, 0.18); verb.addMono(mb, n.t, 0.18); dly.addMono(mb, n.t, 0.08); }
for (const n of sc.starNotes) {
  const x = I.marimba(n.midi, { thock: 0 });
  const pan = (n.x / sc.W - 0.5) * 1.2; // the sound comes from where the star appears
  keys.addMono(x, n.t, 0.45, pan);
  verb.addMono(x, n.t, 0.2);
}

// ---------- brass hook on the drop ----------
for (const n of sc.brass) {
  const a = I.brassNote(n.midi, n.dur * 0.92), b = I.brassNote(n.midi - 12, n.dur * 0.92, { bright: 0.8, seed: 99 });
  brass.addStereo(a.L, a.R, n.t, 0.3); brass.addStereo(b.L, b.R, n.t, 0.16);
  verb.addStereo(a.L, a.R, n.t, 0.12); dly.addStereo(a.L, a.R, n.t, 0.05);
}

// ---------- fx, each one tied to an event in the score ----------
fx.addMono(I.noiseSweep(0.5, 3000, 400, { q: 1, pink: true }), ev.claudeFall, 0.3); // falling whoosh
fx.addMono(I.boing(), ev.claudeLand - 0.02, 0.4);
fx.addMono(I.thud(80, 0.08), ev.claudeLand, 0.6);
for (const c of sc.captions) fx.addMono(I.paperFwip(0.9, Math.round(c.t * 10)), c.t - 0.03, 0.22, c.x < 900 ? -0.3 : 0.3);
fx.addMono(I.noiseSweep(ev.breath - T(4), 200, 8000, { q: 0.9, shape: (x) => x * x, pink: true }), T(4), 0.45); // riser
fx.addMono(I.subBoom(2.2), ev.drop, 0.7);
for (const w of sc.endText.words) fx.addMono(I.scribble(w.d, Math.round(w.t * 7)), w.t, 0.2);

// ---------- mix ----------
MIX.sidechain([pad, bass], kicks.filter((t) => t >= ev.drop));
const stems = {
  drums, bass, pad, keys, brass, fx,
  verb: reverb(verb, { room: 0.84, damp: 0.3 }),
  dly: pingpong(dly, BEAT * 0.75, 0.38, 3500),
};
const GAIN = { drums: 0.4, bass: 0.7, pad: 2.6, keys: 0.9, brass: 2.0, fx: 0.8, verb: 1, dly: 1 };
const out = path.join(__dirname, 'out');
const mix = MIX.mixdown(stems, GAIN, { stemDir: process.env.STEMS ? out : null });
MIX.highpass(mix, 22);
MIX.gate(mix, ev.breath, ev.drop); // the held breath is truly silent (reverb tails too)
MIX.fadeOut(mix, DURATION - 1.6, DURATION);
MIX.master(mix, parseFloat(process.env.DRIVE || '0.8'));
MIX.writeWav(path.join(out, 'music.wav'), mix);
console.log(`wrote out/music.wav (${DURATION.toFixed(2)}s)`);
