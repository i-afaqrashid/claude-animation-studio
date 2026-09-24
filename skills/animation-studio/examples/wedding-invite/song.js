// THE SONG: every sound comes from an event in score.js.   node song.js   (STEMS=1 writes stems, LUFS=-14 sets loudness)
// A shehnai over a drone, a dholak mehndi groove with taali, a baraat on the dhol with a brass band and
// fireworks, a soft walima, a dhol roll into a held breath, then "shaadi mubarak!" on the drop.
const path = require('path');
const { SR, Bus, reverb, pingpong } = require('./engine/audio/dsp');
const I = require('./engine/audio/instruments');
const MIX = require('./engine/audio/mix');
const Sing = require('./engine/audio/sing');
const U = require('./engine/util');
const sc = require('./score');
const { T, BEAT, DURATION, m, ev } = sc;

const N = Math.ceil(DURATION * SR);
const bus = () => new Bus(N);
const drone = bus(), shehnai = bus(), harm = bus(), dholak = bus(), taali = bus(), dhol = bus(), tabla = bus(), bass = bus();
const chorus = bus(), brass = bus(), strings = bus(), fx = bus(), crowd = bus(), verb = bus(), dly = bus();
const rng = U.mulberry32(9);

// ---------- the drone: Sa and Pa on the harmonium, from the first note to the last ----------
for (const [n, g] of [[m('D3'), 0.06], [m('A3'), 0.045], [m('D4'), 0.03]]) {
  const { L, R } = I.harmonium(n, DURATION - 1.2, { attack: 1.5, release: 1, bright: 0.55, seed: n });
  drone.addStereo(L, R, 0.1, g);
}

// ---------- the shehnai: one continuous line per phrase (a new line after a rest) ----------
const phrases = [];
for (const n of sc.shehnai) { const last = phrases[phrases.length - 1]; if (last && n.t - (last[last.length - 1].t + last[last.length - 1].dur) < 0.12) last.push(n); else phrases.push([n]); }
for (const ph of phrases) {
  const t0 = ph[0].t;
  const x = I.shehnaiLine(ph.map((n) => ({ ...n, t: n.t - t0 })), { seed: Math.round(t0 * 10), vib: 0.32, bright: 1 });
  shehnai.addMono(x, t0, 0.55, 0.08);
  verb.addMono(x, t0, 0.2);
  dly.addMono(x, t0, 0.05);
}

// ---------- harmonium chords (light, on the beat in the grooves; held in the walima) ----------
for (const c of sc.chords) {
  const walima = c.t0 >= ev.walima && c.t0 < ev.build;
  for (const n of c.notes) {
    const { L, R } = I.harmonium(n, (c.t1 - c.t0) * (walima ? 1 : 0.95), { attack: walima ? 0.3 : 0.05, release: 0.3, bright: 0.8, seed: n + Math.round(c.t0) });
    harm.addStereo(L, R, c.t0, walima ? 0.05 : 0.035);
  }
  // a short, plucked bass on beats 1 and 3 (the dholak's ghe carries the rest of the low end)
  bass.addMono(I.bass(c.bass + 12, BEAT * 0.7, { bright: 0.35, sub: 0.7 }), c.t0, 0.4);
  if (c.t1 - c.t0 >= BEAT * 3.5 && !walima) bass.addMono(I.bass(c.bass + 12, BEAT * 0.6, { bright: 0.35, sub: 0.7 }), c.t0 + BEAT * 2, 0.3);
}

// ---------- the doors open: a rising swell, the dhol, a harp-like glissando ----------
fx.addMono(I.noiseSweep(BEAT * 2, 400, 5000, { q: 1, pink: true, shape: (x) => x * x }), ev.doors - BEAT * 2, 0.16);
dhol.addMono(I.dhol('both'), ev.doors, 1);
fx.addMono(I.subBoom(1.2, 80, 36), ev.doors, 0.45);
fx.addMono(I.crash(7), ev.doors, 0.22);
['D5', 'E5', 'F#5', 'A5', 'B5', 'D6', 'E6', 'F#6', 'A6'].forEach((n, i) => { const x = I.pluck(m(n)); strings.addMono(x, ev.doors + 0.02 + i * 0.045, 0.16, -0.5 + i * 0.12); verb.addMono(x, ev.doors + i * 0.045, 0.1); });
for (let k = 0; k < 3; k++) fx.addMono(I.ghungroo(k + 2), ev.doors + 0.1 + k * 0.2, 0.18, (k - 1) * 0.5);
// names stamping in; the glasses gleam
for (const t of ev.names) { fx.addMono(I.thud(90, 0.1), t, 0.35); fx.addMono(I.bell(1760, 0.5, 1.4, 2.01), t + 0.01, 0.06, 0.2); }
fx.addMono(I.ting(m('E7')), ev.gleam, 0.35, 0.3);
// ghungroo shimmer through the alaap
for (let k = 0; k < 6; k++) fx.addMono(I.ghungroo(20 + k, { size: 1.5 }), 0.6 + k * 0.62, 0.05 + k * 0.01, (rng() - 0.5));

// ---------- drums ----------
const DK = { G: I.dholak('ghe'), N: I.dholak('na'), K: I.dholak('ka') };
for (const h of sc.dholak) dholak.addMono(DK[h.c], h.t, h.c === 'G' ? 0.75 : h.c === 'N' ? 0.45 : 0.35, h.c === 'N' ? 0.2 : -0.1);
const CL = [I.clap({ spread: 1.5, seed: 1 }), I.clap({ spread: 1.3, seed: 2 }), I.clap({ spread: 1.7, seed: 3 })];
for (const t of sc.taali) CL.forEach((c, k) => { taali.addMono(c, t + k * 0.008, 0.3, [-0.4, 0.1, 0.45][k]); verb.addMono(c, t, 0.05); });
const DH = { B: I.dhol('both'), D: I.dhol('dagga'), t: I.dhol('tilli', { seed: 3 }) };
for (const h of sc.dhol) dhol.addMono(DH[h.c], h.t, h.c === 'B' ? 0.95 : h.c === 'D' ? 0.8 : 0.45, h.c === 't' ? 0.25 : 0);
for (const [a, b] of sc.rolls) { const n = 24; for (let i = 0; i < n; i++) { const u = i / n; dhol.addMono(i % 2 ? DH.t : DH.D, a + (b - a) * Math.pow(u, 0.8), 0.3 + u * 0.6, i % 2 ? 0.25 : -0.1); } }
const TB = { D: I.tabla('dha', { midi: 62 }), t: I.tabla('tin', { midi: 62 }), d: I.tabla('ge', { midi: 62 }) };
for (const h of sc.tabla) tabla.addMono(TB[h.c], h.t, h.c === 'D' ? 0.5 : 0.28, 0.15);
// the drop lands on a real hit (after the held breath)
dhol.addMono(I.dhol('both'), ev.drop, 1.1);
fx.addMono(I.subBoom(1.4, 80, 34), ev.drop, 0.55);
fx.addMono(I.crash(9), ev.drop, 0.3);

// ---------- the baraat: a brass band doubling the shehnai, hooves on the 8ths, fireworks ----------
for (const n of sc.shehnai.filter((q) => (q.t >= ev.baraat && q.t < ev.walima) || (q.t >= ev.drop && q.t < ev.end))) {
  const { L, R } = I.brassNote(n.midi - 12, n.dur * 0.9, { bright: 1.1, seed: Math.round(n.t * 10) });
  brass.addStereo(L, R, n.t, 0.09);
}
for (let k = 0; k < 16; k++) fx.addMono(I.woodTick(k % 2 ? 1.3 : 1.1), T(8, k / 2) + 0.01, 0.07, k % 2 ? 0.3 : -0.3);
for (const f of sc.fireworks) {
  fx.addMono(I.launchWhistle(0.55), f.t - 0.55, 0.06, (f.x - 0.5) * 1.4);
  fx.addMono(I.fireworkBurst(f.i + 3, 1), f.t, 0.22, (f.x - 0.5) * 1.4);
}

// ---------- the walima: strings, chandelier sparkles ----------
for (const c of sc.chords.filter((q) => q.t0 >= ev.walima && q.t0 < ev.build)) for (const n of c.notes) { const { L, R } = I.strings(n + 12, c.t1 - c.t0 + 0.4, { attack: 0.4, release: 0.8 }); strings.addStereo(L, R, c.t0, 0.06); }
for (const t of sc.sparkles) fx.addMono(I.bell(2800 + rng() * 1200, 0.4, 1.2, 2.7), t + 0.02, 0.035, (rng() - 0.5));

// ---------- the build: a riser under the dhol roll ----------
fx.addMono(I.noiseSweep(T(12, 3.5) - ev.build, 300, 7000, { q: 1.1, pink: true, shape: (x) => x * x }), ev.build, 0.2);

// ---------- the drop: the chorus sings "shaadi mubarak!", the crowd cheers ----------
for (const [bar] of [[13], [14]]) {
  const notes = sc.chant.filter((n) => n.t >= T(bar) && n.t < T(bar + 1));
  for (let v = 0; v < 6; v++) {
    const x = Sing.phrase(notes.map((n) => ({ ...n, t: n.t - notes[0].t, midi: n.midi + 12 * (v % 3 === 2 ? 0 : 1) + (rng() - 0.5) * 0.2 })), { type: v % 2 ? 'soprano' : 'alto', vib: 0.15, breath: 0.08, seed: 40 + v + bar, bright: 1.1 });
    chorus.addMono(x, notes[0].t - x.lead + v * 0.01, 0.2, (v - 2.5) * 0.28);
    verb.addMono(x, notes[0].t - x.lead, 0.07);
  }
}
for (let i = 0; i < 30; i++) {
  const t = ev.drop + 0.2 + rng() * (ev.end - ev.drop);
  crowd.addMono(I.voice(m('A4') + Math.floor(rng() * 7) - (rng() < 0.4 ? 12 : 0), 0.35 + rng() * 0.3, { syl: rng() < 0.5 ? 'a' : 'e', type: rng() < 0.5 ? 'alto' : 'tenor', seed: 80 + i, glide: 2 + rng() * 3, breath: 0.2, shout: 1.3 }), t, 0.06, (rng() - 0.5) * 1.5);
}
// the end: a last chord, bells
for (const n of [m('D4'), m('F#4'), m('A4'), m('D5')]) { const { L, R } = I.strings(n, 3, { attack: 0.1, release: 1.5 }); strings.addStereo(L, R, ev.end, 0.07); }
for (let k = 0; k < 4; k++) fx.addMono(I.ghungroo(60 + k), ev.end + k * 0.4, 0.12, (k - 1.5) * 0.4);

// ---------- mix ----------
const hall = reverb(verb, { room: 0.82, damp: 0.35, predelay: 0.02 });
const echo = pingpong(dly, BEAT * 0.75, 0.3, 3200);
const music = [drone, shehnai, harm, dholak, taali, dhol, tabla, bass, chorus, brass, strings, fx, crowd, hall, echo];
for (const b of music) MIX.gate(b, ev.breath[0], ev.breath[1], 0.006); // the held breath before the drop
const stems = { drone, shehnai, harm, dholak, taali, dhol, tabla, bass, chorus, brass, strings, fx, crowd, verb: hall, dly: echo };
// balanced with engine/tools/levels.js: the shehnai leads, the drums sit under it, the taali is clear
const GAIN = { drone: 1, shehnai: 1, harm: 1.8, dholak: 0.45, taali: 9, dhol: 0.42, tabla: 0.85, bass: 0.42, chorus: 3.2, brass: 2, strings: 2, fx: 0.75, crowd: 2.2, verb: 0.45, dly: 0.25 };
const mix = MIX.mixdown(stems, GAIN, { stemDir: process.env.STEMS ? path.join(__dirname, 'out') : null });
MIX.highpass(mix, 28);
MIX.fadeOut(mix, DURATION - 1.4, DURATION);
const res = MIX.master(mix, 0.8, undefined, { lufs: process.env.LUFS ? +process.env.LUFS : -14 });
MIX.writeWav(path.join(__dirname, 'out', 'music.wav'), mix);
console.log(`out/music.wav  ${DURATION.toFixed(1)}s  ${res.lufs.toFixed(1)} LUFS`);
