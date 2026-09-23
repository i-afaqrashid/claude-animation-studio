// THE SONG: every sound comes from an event in score.js.   node song.js   (STEMS=1 writes stems, LUFS=-14 sets loudness)
const path = require('path');
const { SR, Bus, reverb, pingpong, Pink, SVF } = require('./engine/audio/dsp');
const I = require('./engine/audio/instruments');
const MIX = require('./engine/audio/mix');
const Sing = require('./engine/audio/sing');
const U = require('./engine/util');
const sc = require('./score');
const { T, DURATION, m, clock } = sc;

const N = Math.ceil(DURATION * SR);
const bus = () => new Bus(N);
const drums = bus(), claps = bus(), harm = bus(), drone = bus(), lead = bus(), chorus = bus(), crowd = bus(), amb = bus();
const verb = bus(), dly = bus();
const rng = U.mulberry32(11);

// ---------- the drone: Sa and Pa on the harmonium, all night ----------
for (const n of [sc.TONIC, sc.TONIC + 7, sc.TONIC + 12]) {
  const { L, R } = I.harmonium(n, sc.ev.hit - 0.3, { attack: 1.2, release: 0.3, bright: 0.6, seed: n });
  drone.addStereo(L, R, 0.2, n === sc.TONIC + 7 ? 0.05 : 0.07);
}

// ---------- voices ----------
// the lead (a tenor) sings his lines; the chorus answers in unison: four men, each a little off in time and pitch
const leadNotes = sc.sung.filter((n) => n.who !== 'chorus');
const chorusNotes = sc.sung.filter((n) => n.who !== 'lead');
const phraseAt = (notes, opts, gain, busOut, pan = 0, shift = 0, detune = 0) => {
  // one phrase per run of notes (split at gaps longer than half a second)
  let group = [];
  const flush = () => {
    if (!group.length) return;
    const t0 = group[0].t;
    const x = Sing.phrase(group.map((n) => ({ ...n, t: n.t - t0, midi: n.midi + detune })), opts);
    busOut.addMono(x, t0 - x.lead + shift, gain, pan);
    verb.addMono(x, t0 - x.lead + shift, gain * 0.35);
    group = [];
  };
  for (const n of notes) { if (group.length && n.t - (group[group.length - 1].t + group[group.length - 1].dur) > 0.5) flush(); group.push(n); }
  flush();
};
phraseAt(leadNotes, { type: 'tenor', vib: 0.28, breath: 0.05, seed: 3, bright: 1.1 }, 0.62, lead);
[[-0.45, 0.012, 0.1, 21], [-0.15, 0.024, -0.12, 22], [0.2, 0.006, 0.07, 23], [0.5, 0.03, -0.06, 24]].forEach(([pan, shift, det, seed]) =>
  phraseAt(chorusNotes, { type: 'tenor', vib: 0.2, breath: 0.08, seed, bright: 0.9 }, 0.22, chorus, pan, shift, det));
// one chorus voice an octave down gives the unison its weight
phraseAt(chorusNotes, { type: 'bass', vib: 0.15, seed: 25 }, 0.16, chorus, 0.05, 0.018, -12);

// ---------- harmonium: doubles every sung note, plus the runs ----------
for (const n of sc.sung) {
  if (n.syl === '~' && n.who === 'lead' && n.t < T(2)) continue; // the alaap melisma is the voice alone over the drone
  const { L, R } = I.harmonium(n.midi, n.dur * 0.95, { attack: 0.03, release: 0.12, bright: 1.15, seed: Math.round(n.t * 100) });
  harm.addStereo(L, R, n.t, 0.085);
}
for (const r of sc.runs) { const { L, R } = I.harmonium(r.midi, 0.16, { attack: 0.01, release: 0.06, bright: 1.3, seed: Math.round(r.t * 100) }); harm.addStereo(L, R, r.t, 0.07); }

// ---------- taali + tabla ----------
const CL = [I.clap({ spread: 1.6, seed: 1 }), I.clap({ spread: 1.4, seed: 2 }), I.clap({ spread: 1.8, seed: 3 })];
for (const t of sc.claps) {
  const late = t >= sc.ev.hit;
  CL.forEach((c, k) => claps.addMono(c, t + k * 0.009 + (rng() - 0.5) * 0.004, late ? 0.34 : 0.22, [-0.4, 0.1, 0.45][k]));
  verb.addMono(CL[0], t, 0.08);
}
const TB = { dha: I.tabla('dha', { midi: 62 }), ge: I.tabla('ge', { midi: 62 }), na: I.tabla('na', { midi: 62 }), tin: I.tabla('tin', { midi: 62 }) };
for (const s of sc.strokes) drums.addMono(TB[s.bol], s.t, s.bol === 'dha' ? 0.7 : s.bol === 'tin' ? 0.3 : 0.45, s.bol === 'ge' ? -0.25 : 0.2);
for (const [a, b] of sc.rolls) {
  const n = 12;
  for (let i = 0; i < n; i++) drums.addMono(i % 2 ? TB.na : TB.tin, a + ((b - a) * i) / n, 0.22 + i * 0.03, i % 2 ? 0.25 : -0.1);
}
// the peak lands on a real hit (after the breath): dha, a boom
drums.addMono(TB.dha, sc.ev.peak, 1);
drums.addMono(I.subBoom(0.9, 80, 38), sc.ev.peak, 0.45);
// the final hit: every drum, a deep boom, and a harmonium chord that rings into the silence
drums.addMono(TB.dha, sc.ev.hit, 1);
drums.addMono(I.subBoom(1.4, 70, 36), sc.ev.hit, 0.5);
for (const n of [sc.TONIC + 12, sc.TONIC + 19, sc.TONIC + 24]) { const { L, R } = I.harmonium(n, 2.4, { attack: 0.01, release: 1.2, bright: 1.1, seed: n + 5 }); harm.addStereo(L, R, sc.ev.hit, 0.1); }

// ---------- the crowd ----------
// "wah!": a few men shouting together, gliding down
for (const w of sc.wah) {
  for (let k = 0; k < 4; k++) {
    const x = I.voice(m('A3') + Math.floor(rng() * 7), 0.4 + rng() * 0.25, { syl: 'a', type: rng() < 0.3 ? 'alto' : 'tenor', seed: 400 + k + Math.round(w.t * 10), glide: -3 - rng() * 3, breath: 0.2, shout: 1.4 });
    crowd.addMono(x, w.t + rng() * 0.08, 0.1, (w.x - 960) / 1100 + (rng() - 0.5) * 0.3);
  }
}
// applause after the final hit
for (let i = 0; i < 260; i++) {
  const t = sc.ev.hit + 0.25 + Math.pow(rng(), 1.6) * 3.6;
  crowd.addMono(CL[i % 3], t, 0.05 * (1 - (t - sc.ev.hit) / 4.2), (rng() - 0.5) * 1.6);
}
// the night: crickets in the alaap, a murmuring audience under everything
for (let i = 0; i < 26; i++) {
  const t = 0.3 + rng() * (T(2) - 0.5);
  for (let k = 0; k < 3; k++) amb.addMono(I.bell(4200 + rng() * 600, 0.03, 0.3, 1), t + k * 0.045, 0.012, (rng() - 0.5) * 1.4);
}
{
  const pk = new Pink(9), f = new SVF();
  for (let i = 0; i < N; i++) {
    const t = i / SR, lv = t < T(2) ? 0.35 : t < sc.ev.hit ? 0.55 : 0.8 * Math.max(0, 1 - (t - sc.ev.hit) / 4);
    const v = f.bp(pk.next(), 500 + 200 * Math.sin(t * 0.7), 0.8) * 0.05 * lv;
    amb.L[i] += v; amb.R[i] += v * 0.9;
  }
}

// ---------- mix ----------
const hall = reverb(verb, { room: 0.86, damp: 0.35, predelay: 0.03 });
const echo = pingpong(dly, 0.34, 0.3, 3500);
const stems = { drums, claps, harm, drone, lead, chorus, crowd, amb, verb: hall, dly: echo };
const GAIN = { drums: 0.5, claps: 8, harm: 2, drone: 0.8, lead: 1, chorus: 1.4, crowd: 1, amb: 1, verb: 0.5, dly: 0.3 }; // balanced with engine/tools/levels.js: voices on top, taali clear, tabla under them
for (const b of [drums, claps, harm, lead, chorus, hall, echo]) MIX.gate(b, sc.breath[0], sc.breath[1], 0.006); // the held breath
const mix = MIX.mixdown(stems, GAIN, { stemDir: process.env.STEMS ? path.join(__dirname, 'out') : null });
MIX.highpass(mix, 28);
MIX.fadeOut(mix, DURATION - 1.2, DURATION);
const res = MIX.master(mix, 0.8, undefined, { lufs: process.env.LUFS ? +process.env.LUFS : -14 });
MIX.writeWav(path.join(__dirname, 'out', 'music.wav'), mix);
console.log(`out/music.wav  ${DURATION.toFixed(1)}s  ${res.lufs ? res.lufs.toFixed(1) + ' LUFS' : ''}  tempo ${clock.bpmAt(0.1).toFixed(0)} → ${clock.bpmAt(sc.ev.hit - 0.1).toFixed(0)} BPM`);
