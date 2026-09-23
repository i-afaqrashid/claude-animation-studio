// THE SONG for the World Cup film: arrangement + mix. Reads the score, renders every part, writes out/music.wav
const fs = require('fs');
const path = require('path');
const { SR, Bus, Pink, SVF, OnePole, rng, reverb, pingpong } = require('./engine/audio/dsp');
const I = require('./engine/audio/instruments');
const sc = require('./score');
const { T, BEAT, BAR, DURATION, m, mtof, chords, eachStep, ev } = sc;
const { noise1, mulberry32 } = require('./engine/util');

const N = Math.ceil(DURATION * SR);
const bus = () => new Bus(N);
const drums = bus(), bass = bus(), pad = bus(), keys = bus(), brass = bus(), choir = bus(), crowd = bus(), fx = bus();
const sendVerb = bus(), sendBig = bus(), sendDelay = bus();

const between = (t, a, b) => t >= a && t < b;
function send(target, mono, t, gain, pan = 0) { target.addMono(mono, t, gain, pan); }

// =============== DRUMS ===============
const K = I.kick(), Kp = I.kick({ punch: 1.3, tail: 0.4, seed: 5 });
const SN = I.snare(), CL = I.clap(), CL2 = I.clap({ seed: 9, decay: 0.2 });
const HC = [I.hat(false, 11), I.hat(false, 12), I.hat(false, 13)], HO = I.hat(true, 14);
const SH = [I.shaker(1, 15), I.shaker(1, 16), I.shaker(1, 17)];
const CR = I.crash(18), CR2 = I.crash(19);
const AG_HI = I.bell(mtof(m('A5')) * 1.0, 0.16, 2.4), AG_LO = I.bell(mtof(m('E5')), 0.18, 2.4);
const SURDO = I.tom(62, 0.45, 20), SURDO_M = I.tom(62, 0.12, 21);

function kickAt(t, g = 1, big = false) { drums.addMono(big ? Kp : K, t, 0.95 * g); }
const kickTimes = [];
function kickSC(t, g, big) { kickAt(t, g, big); kickTimes.push(t); }

// arrive + match groove (bars 4–9), stops at the interception
eachStep(4, 10, 16, (t, b, s) => {
  if (t >= ev.intercept) return;
  const beat = s / 4;
  if (s % 8 === 0) kickSC(t, 1);
  if (b >= 6 && s === 14 && b % 2 === 1) kickSC(t, 0.6);
  if (s % 8 === 4) { drums.addMono(CL, t, 0.55, 0.05); send(sendVerb, CL, t, 0.25); }
  if (b >= 6 || s % 2 === 0) drums.addMono(SH[s % 3], t, (s % 4 === 2 ? 0.28 : 0.16) * (b >= 6 ? 1 : 0.8), 0.35);
  if (s % 4 === 2) drums.addMono(HC[s % 3], t, 0.2, -0.25);
  if (b >= 6) {
    // agogô samba bell (2-bar pattern)
    const pat = b % 2 === 0 ? [0, 3, 6, 8, 10, 13] : [0, 2, 4, 7, 10, 12];
    if (pat.includes(s)) drums.addMono(s % 4 === 0 ? AG_LO : AG_HI, t, 0.09, -0.45);
    if (s === 12) drums.addMono(SURDO, t, 0.45);
    if (s === 4 || s === 10) drums.addMono(SURDO_M, t, 0.22);
  }
  void beat;
});

// build: accelerating snare roll + kick in bar 15
for (const r of sc.snareRoll) { drums.addMono(SN, r.t, 0.45 * r.v, 0.05); send(sendVerb, SN, r.t, 0.15 * r.v); }
for (const t of ev.cutHits) { kickAt(t, 1.1, true); drums.addMono(I.tom(90 + ev.cutHits.indexOf(t) * 30, 0.3, 40), t, 0.6); send(sendBig, CL, t, 0.3); }

// goal bar + party
eachStep(16, 24, 16, (t, b, s) => {
  if (s % 4 === 0) kickSC(t, 1.05, b === 16 && s === 0);
  if (b === 16) {
    if (s % 8 === 4) { drums.addMono(CL, t, 0.6); send(sendVerb, CL, t, 0.3); }
    return;
  }
  const fill = b === 23 && s >= 8;
  if (s % 8 === 4 && !fill) { drums.addMono(CL, t, 0.62, 0.04); drums.addMono(SN, t, 0.28); send(sendVerb, CL, t, 0.3); }
  if (!fill) {
    drums.addMono(HC[s % 3], t, s % 2 === 0 ? 0.13 : 0.22, -0.3);
    if (s % 4 === 2) drums.addMono(HO, t, 0.13, 0.3);
    drums.addMono(SH[s % 3], t, s % 4 === 2 ? 0.2 : 0.1, 0.45);
    const pat = b % 2 === 0 ? [0, 3, 6, 8, 10, 13] : [0, 2, 4, 7, 10, 12];
    if (pat.includes(s)) drums.addMono(s % 4 === 0 ? AG_LO : AG_HI, t, 0.08, -0.5);
    if (s === 12) drums.addMono(SURDO, t, 0.35);
  }
});
// drum fill into the high five: toms tumbling down
for (let i = 0; i < 8; i++) {
  const t = T(23, 2) + i * BEAT / 4;
  const f = [220, 200, 175, 160, 140, 125, 110, 95][i];
  drums.addMono(I.tom(f, 0.22, 50 + i), t, 0.55 + i * 0.03, 0.5 - i * 0.14);
  if (i % 2 === 1) drums.addMono(SN, t, 0.3);
}
// crashes
for (const t of [T(16), T(17), T(18), T(20), T(22)]) { drums.addMono(CR, t, 0.32, -0.2); drums.addMono(CR2, t, 0.25, 0.3); }
// the high five
kickAt(ev.highFive, 1.3, true);
drums.addMono(CR, ev.highFive, 0.4, -0.25); drums.addMono(CR2, ev.highFive, 0.35, 0.3);
drums.addMono(CL2, ev.highFive, 1.0); drums.addMono(CL, ev.highFive + 0.006, 0.8, 0.2); drums.addMono(SN, ev.highFive, 0.5);
send(sendBig, CL2, ev.highFive, 0.8);

// =============== BASS ===============
function bassNote(midi, t, dur, g = 1, opts) { bass.addMono(I.bass(midi, dur, opts), t, g); }
eachStep(4, 10, 8, (t, b, s) => {
  if (t >= ev.intercept) return;
  const c = sc.chordAt(t);
  const R = c.bass + 12;
  const pat = { 0: [R, 1.4], 3: [R, 0.8], 4: [R + 7, 1.4], 7: [R + 12, 0.7] };
  if (pat[s]) bassNote(pat[s][0], t, pat[s][1] * BEAT / 2, 0.55);
});
eachStep(13, 16, 8, (t, b, s) => {
  if (t >= ev.silence[0]) return;
  const prog = (t - T(13)) / (ev.silence[0] - T(13));
  bassNote(m('C2'), t, BEAT / 2 * 0.8, 0.25 + 0.4 * prog, { bright: 0.4 + prog * 1.2 });
});
eachStep(16, 24, 8, (t, b, s) => {
  const c = sc.chordAt(t);
  const R = c.bass + 12;
  bassNote(s % 2 === 0 ? R : R + 12, t, BEAT / 2 * 0.8, 0.6, { bright: 1, sub: 0.8 });
});
bassNote(m('F1') + 12, ev.highFive, 2.2, 0.7, { bright: 0.6, sub: 1 });
for (const b of [25, 26, 27]) { const c = sc.chordAt(T(b)); bassNote(c.bass + 12, T(b), BAR * 0.95, 0.17, { bright: 0.15, sub: 1 }); }
bassNote(m('F1') + 12, T(28), 2.2, 0.2, { bright: 0.1, sub: 1 });
// tension drone
bassNote(m('D2'), T(10), BAR * 3 - 0.1, 0.22, { bright: 0.1, sub: 1 });

// =============== PADS ===============
function padChord(c, t0, t1, g, opts) {
  for (const n of c.notes) {
    const { L, R } = I.padNote(n, t1 - t0, opts);
    pad.addStereo(L, R, t0, g);
  }
}
for (const c of chords) {
  const t0 = c.t0, t1 = c.t1;
  if (t0 < T(4)) padChord(c, t0, t1, 0.085, { cutoff: 900, attack: 0.6 });
  else if (t0 < T(10)) padChord(c, t0, t1, 0.07, { cutoff: 1300, attack: 0.3 });
  else if (t0 < T(13)) padChord(c, t0, t1, 0.13, { cutoff: c.name === 'Bbmaj7' ? 1500 : 650, attack: 0.9, release: 1.2 });
  else if (t0 < T(16)) padChord(c, t0, Math.min(t1, ev.silence[0]), 0.1 + 0.03 * (c.bar - 13), { cutoff: 1100 + 700 * (c.bar - 13), attack: 1.2, release: 0.1 });
  else if (t0 < T(24)) padChord(c, t0, t1, 0.09, { cutoff: 2600, attack: 0.05, release: 0.3 });
  else if (t0 < T(25)) padChord(c, t0, t1 + 1, 0.12, { cutoff: 2200, attack: 0.01, release: 2.5 });
  else padChord(c, t0, t1, 0.1, { cutoff: 900, attack: 0.6, release: 1.8 });
}

// =============== KEYS ===============
for (const n of sc.musicbox) {
  const mb = I.musicBox(n.midi, { decay: n.t > T(24) ? 1.6 : 1.3 });
  const pan = ((n.midi % 12) / 12 - 0.5) * 0.5;
  keys.addMono(mb, n.t, 0.16, pan);
  send(sendVerb, mb, n.t, 0.15);
  send(sendDelay, mb, n.t, 0.08);
}
for (const n of sc.tensionBells) {
  const mb = I.musicBox(n.midi, { decay: 1.8 });
  keys.addMono(mb, n.t, 0.16, 0.2);
  send(sendBig, mb, n.t, 0.12);
}
// the ball plays the melody
sc.touches.forEach((n, i) => {
  const mr = I.marimba(n.midi, { thock: 0.4 });
  const pan = -0.35 + (i / sc.touches.length) * 0.7;
  keys.addMono(mr, n.t, 0.42, pan);
  send(sendVerb, mr, n.t, 0.2);
});
// offbeat skank plucks (arrive + match, and quieter under the party)
eachStep(4, 24, 8, (t, b, s) => {
  if (s % 2 !== 1) return;
  if (t >= ev.intercept && t < T(18)) return;
  const c = sc.chordAt(t);
  const g = b < 10 ? 0.07 : 0.045;
  for (const n of c.notes) { const p = I.pluck(n + 12, { decay: 0.12 }); keys.addMono(p, t, g, 0.25); }
});

// =============== BRASS ===============
for (const n of sc.brass) {
  const { L, R } = I.brassNote(n.midi, n.dur * 0.92, { bright: 1 });
  brass.addStereo(L, R, n.t, 0.3);
  const lo = I.brassNote(n.midi - 12, n.dur * 0.92, { bright: 0.8, seed: 99 });
  brass.addStereo(lo.L, lo.R, n.t, 0.16);
  sendVerb.addStereo(L, R, n.t, 0.12);
  sendDelay.addStereo(L, R, n.t, 0.06);
}
for (const st of sc.goalStamps) {
  st.notes.forEach((nn, k) => {
    const { L, R } = I.brassNote(nn, BEAT / 2 * 0.7, { stab: true, bright: 1.1, seed: 5 + k });
    brass.addStereo(L, R, st.t, 0.2);
    sendBig.addStereo(L, R, st.t, 0.06);
  });
}
// build: rising brass swells (3rds climbing) + cut hits
[[13, ['E4', 'G4']], [14, ['F4', 'A4']], [15, ['G4', 'Bb4']]].forEach(([b, ns]) => {
  const dur = b === 15 ? BEAT * 3 - 0.02 : BAR - 0.05;
  for (const n of ns) {
    const { L, R } = I.padNote(m(n), dur, { cutoff: 1800 + (b - 13) * 900, attack: dur * 0.9, release: 0.02, detune: 0.18 });
    brass.addStereo(L, R, T(b), 0.12);
  }
});
[[m('C4'), m('E4'), m('G4')], [m('E4'), m('G4'), m('C5')], [m('G4'), m('Bb4'), m('E5')]].forEach((ns, i) => {
  for (const n of ns) {
    const { L, R } = I.brassNote(n, 0.3, { stab: true, bright: 1.2, seed: 70 + i });
    brass.addStereo(L, R, ev.cutHits[i], 0.24);
    sendBig.addStereo(L, R, ev.cutHits[i], 0.1);
  }
});

// =============== CHOIR ("o-lé" from the whole street) ===============
{
  const r = mulberry32(31337);
  const singers = [];
  for (let v = 0; v < 12; v++) singers.push({ type: 'tenor', oct: -12, det: (r() - 0.5) * 0.35, lag: r() * 0.035, pan: (r() - 0.5) * 1.6, g: 0.7 + r() * 0.3 });
  for (let v = 0; v < 7; v++) singers.push({ type: 'alto', oct: 0, det: (r() - 0.5) * 0.3, lag: r() * 0.03, pan: (r() - 0.5) * 1.6, g: 0.5 + r() * 0.25 });
  sc.choir.forEach((n, i) => {
    singers.forEach((sg, k) => {
      const v = I.voice(n.midi + sg.oct + sg.det, n.dur * 0.9, { syl: n.syl, type: sg.type, seed: 1000 + i * 50 + k, breath: 0.1 });
      choir.addMono(v, n.t + sg.lag, 0.05 * sg.g, sg.pan);
      send(sendBig, v, n.t + sg.lag, 0.02 * sg.g);
    });
  });
}

// =============== CROWD ===============
function crowdLevel(t) {
  if (t < 0.3) return 0;
  if (t < T(6)) return 0.09 * Math.min(1, (t - 0.3) / 0.8);
  if (t < ev.intercept) return 0.2;
  if (t < T(10)) return 0.2 - 0.12 * ((t - ev.intercept) / (T(10) - ev.intercept));
  if (t < T(13)) return 0.07;
  if (t < ev.silence[0]) return 0.08 + 0.3 * Math.pow((t - T(13)) / (ev.silence[0] - T(13)), 2);
  if (t < ev.goal) return 0;
  if (t < T(24)) return 0.18 + 0.4 * Math.exp(-(t - ev.goal) / 2.5);
  return 0.2 * Math.exp(-(t - T(24)) / 1.2);
}
function crowdBright(t) {
  if (t < T(6)) return 1100; // coming through the TV speakers
  if (t < T(10)) return 6000;
  if (t < T(13)) return 1300;
  if (t < ev.goal) return 2500 + 4000 * ((t - T(13)) / (ev.goal - T(13)));
  return 7000;
}
{
  const bands = [300, 520, 850, 1300, 2000, 3100];
  for (const ch of ['L', 'R']) {
    const p = new Pink(ch === 'L' ? 101 : 202);
    const fs_ = bands.map(() => new SVF());
    const lp = new SVF();
    const out = crowd[ch];
    for (let i = 0; i < N; i++) {
      const t = i / SR;
      const lvl = crowdLevel(t);
      if (lvl <= 0) { p.next(); out[i] = 0; continue; }
      const x = p.next();
      let s = 0;
      for (let k = 0; k < bands.length; k++) {
        const mod = 0.55 + 0.45 * noise1(t * (3 + k * 1.7), k * 13 + (ch === 'L' ? 0 : 7));
        s += fs_[k].bp(x, bands[k], 1.3) * mod;
      }
      out[i] = lp.lp(s * 1.6, crowdBright(t), 0.7) * lvl;
    }
  }
}
// crowd babble: hundreds of individual synthesized voices shouting vowels
{
  const r = mulberry32(8080);
  const VOW = ['a', 'o', 'e', 'u', 'a', 'o'];
  const shout = (t, g, { long = false, rise = 0 } = {}) => {
    const female = r() < 0.35;
    const midi = 47 + Math.floor(r() * 14) + (female ? 12 : 0);
    const dur = long ? 1.4 + r() * 1.6 : 0.35 + r() * 1.0;
    const v = I.voice(midi, dur, { syl: VOW[Math.floor(r() * VOW.length)], type: female ? 'alto' : 'tenor', seed: Math.floor(r() * 1e6), glide: rise + (r() - 0.4) * 5, vib: 0.35, breath: 0.18, shout: 1.3 });
    const pan = (r() - 0.5) * 1.8;
    crowd.addMono(v, t, g * (0.6 + r() * 0.4), pan);
    send(sendBig, v, t, g * 0.25);
  };
  const spawn = (t0, t1, rateFn, gainFn, opts) => {
    let t = t0;
    while (t < t1) { t += -Math.log(1 - r() * 0.999) / rateFn(t); if (t < t1) shout(t, gainFn(t), opts); }
  };
  // stadium on TV during the match
  spawn(T(6), ev.intercept, () => 7, () => 0.018);
  // the last attack: the stadium rises with the riser
  spawn(T(13), ev.silence[0] - 0.1, (t) => 4 + 22 * ((t - T(13)) / (ev.silence[0] - T(13))), (t) => 0.012 + 0.03 * ((t - T(13)) / (ev.silence[0] - T(13))));
  // GOAL: a wall of voices
  for (let k = 0; k < 55; k++) shout(ev.goal + Math.pow(r(), 2) * 0.35, 0.05, { long: true, rise: 4 });
  spawn(ev.goal + 0.3, T(24), (t) => 26 - 12 * ((t - ev.goal) / (T(24) - ev.goal)), (t) => 0.032 * Math.exp(-(t - ev.goal) / 5) + 0.012);
}
// "ooooh" at the interception, cheers ("wooo!") at the goal
{
  const r = mulberry32(4242);
  for (let k = 0; k < 14; k++) {
    const v = I.voice(m('A3') + Math.floor(r() * 7) - 2 + (k % 3 === 0 ? 12 : 0), 1.1 + r() * 0.4, { syl: 'u', type: k % 3 === 0 ? 'alto' : 'tenor', seed: 500 + k, glide: -4, vib: 0.3 });
    crowd.addMono(v, ev.intercept + r() * 0.12, 0.05, (r() - 0.5) * 1.6);
    send(sendBig, v, ev.intercept, 0.02);
  }
  for (let k = 0; k < 22; k++) {
    const alto = k % 3 === 0;
    const v = I.voice(m('C4') + Math.floor(r() * 9) + (alto ? 7 : 0), 0.7 + r() * 0.8, { syl: r() < 0.5 ? 'u' : 'o', type: alto ? 'alto' : 'tenor', seed: 900 + k, glide: 5 + r() * 4, vib: 0.4, shout: 1.5 });
    crowd.addMono(v, ev.goal + 0.05 + Math.pow(r(), 1.5) * 1.6, 0.045, (r() - 0.5) * 1.7);
    send(sendBig, v, ev.goal, 0.015);
  }
}

// =============== FX ===============
fx.addMono(I.tvClick(), ev.tvClick, 0.55);
fx.addMono(I.boing(), ev.boing, 0.45, 0.35);
fx.addMono(I.thud(80, 0.08), ev.claudeLand, 0.5, 0.3);
for (const lb of sc.legBounces) fx.addMono(SH[Math.round(lb.t * 100) % 3], lb.t, 0.18 * lb.strength, -0.4);
for (const c of sc.captions) { const f = I.paperFwip(0.8 + (c.size % 7) * 0.05, Math.round(c.t * 10)); fx.addMono(f, c.t - 0.03, 0.22, c.x < 900 ? -0.3 : 0.3); }
const wsh = (t, len, f0, f1, g, pan) => { const w = I.noiseSweep(len, f0, f1, { q: 1.1, pink: true }); fx.addMono(w, t, g, pan); send(sendVerb, w, t, g * 0.3); };
wsh(ev.whooshToMatch, 0.55, 300, 3200, 0.5, 0);
wsh(T(12, 3), 0.55, 250, 2600, 0.45, 0);
wsh(ev.whooshToStreet, 0.55, 300, 3200, 0.45, 0);
wsh(ev.whooshBack, 0.55, 300, 3200, 0.4, 0);
fx.addMono(I.whistle(0.42), ev.whistle, 0.22, 0.1);
send(sendBig, I.whistle(0.42), ev.whistle, 0.12);
fx.addMono(I.bwomp(), ev.intercept, 0.5);
const HB = I.heartbeat();
for (const t of sc.heartbeats) fx.addMono(HB, t, 0.65);
for (const ck of sc.clockTicks) fx.addMono(I.woodTick(1), ck.t, 0.12, 0.4);
for (const b of sc.bubbles) fx.addMono(I.pop(1100, 3), b.t, 0.2, 0.3);
// build: riser + ball strike
{
  const len = ev.silence[0] - T(13);
  const rs = I.noiseSweep(len, 200, 9000, { q: 0.9, shape: (x) => x * x, pink: true });
  fx.addMono(rs, T(13), 0.55);
  const w = I.noiseSweep(1.6, 900, 300, { q: 1.2, shape: (x) => Math.sin(Math.PI * Math.min(1, x * 2)) * (1 - x) });
  fx.addMono(I.thwack(), ev.strike, 0.8);
  fx.addMono(w, ev.strike + 0.03, 0.35, 0.3);
  send(sendBig, I.thwack(), ev.strike, 0.3);
}
// goal
fx.addMono(I.subBoom(2.5), ev.goal, 0.75);
fx.addMono(I.noiseSweep(0.5, 6000, 800, { q: 0.7, shape: (x) => Math.exp(-x * 5), pink: true }), ev.goal, 0.4);
// jump + popcorn
fx.addMono(I.subBoom(1.5, 70, 35), ev.jump, 0.4);
for (const p of sc.popcorn) fx.addMono(I.pop(p.pitch, p.seed + 60), p.t, 0.2, Math.max(-1, Math.min(1, p.vx / 600)));
// fireworks (panned where they burst on screen)
for (const f of sc.fireworks) {
  const pan = (f.x - 0.5) * 1.4;
  fx.addMono(I.launchWhistle(f.launch, f.seed + 1), f.t - f.launch, f.scene === 'street' ? 0.18 : 0.08, pan * 0.6);
  const b = I.fireworkBurst(f.seed + 300, f.size);
  fx.addMono(b, f.t, (f.scene === 'street' ? 0.42 : 0.2) * f.size, pan);
  send(sendBig, b, f.t, 0.12);
}
// high five
fx.addMono(I.subBoom(3, 60, 26), ev.highFive, 0.8);
// outro: pencil writing each word, chime for the heart
for (const w of sc.outroText.words) fx.addMono(I.scribble(w.d, Math.round(w.t * 7)), w.t, 0.2, 0);
fx.addMono(I.scribble(1.1, 77), sc.signature.t, 0.12, 0);
{
  const b1 = I.bell(mtof(m('F6')), 1.2, 1.2, 3.5), b2 = I.bell(mtof(m('A6')), 1.1, 1.0, 3.5);
  fx.addMono(b1, ev.heart, 0.12, -0.1); fx.addMono(b2, ev.heart + 0.06, 0.1, 0.1);
  send(sendBig, b1, ev.heart, 0.2);
}

// =============== MIX ===============
console.log('effects…');
// sidechain pump in the party
const sc_ = new Float32Array(N).fill(1);
kickTimes.filter((t) => t >= T(16)).forEach((tk) => {
  const s = Math.round(tk * SR);
  for (let i = 0; i < SR * 0.5 && s + i < N; i++) {
    const x = i / SR;
    const g = 1 - 0.55 * Math.exp(-x / 0.11) * Math.min(1, x / 0.004 + 0.3);
    sc_[s + i] = Math.min(sc_[s + i], g);
  }
});
for (const b of [pad, bass, crowd]) for (let i = 0; i < N; i++) { b.L[i] *= sc_[i]; b.R[i] *= sc_[i]; }

const verbA = reverb(sendVerb, { room: 0.82, damp: 0.3, predelay: 0.015 });
const verbB = reverb(sendBig, { room: 0.93, damp: 0.25, predelay: 0.03, hp: 250 });
const del = pingpong(sendDelay, BEAT * 0.75, 0.38, 3500);
const choirVerb = reverb(choir, { room: 0.9, damp: 0.35, predelay: 0.02, hp: 200 });

const GAIN = { drums: 0.4, bass: 0.7, pad: 2.6, keys: 0.85, brass: 2.0, choir: 3.5, choirVerb: 3.0, crowd: 1.8, fx: 0.75, verbA: 1.0, verbB: 1.0, del: 1.0 };
if (process.env.GAIN) Object.assign(GAIN, JSON.parse(process.env.GAIN));
const stems = { drums, bass, pad, keys, brass, choir, choirVerb, crowd, fx, verbA, verbB, del };
const mix = bus();
for (const [k, b] of Object.entries(stems)) b.mixInto(mix, GAIN[k]);

// DC / rumble cleanup
{
  const hl = new OnePole(), hr = new OnePole();
  for (let i = 0; i < N; i++) { mix.L[i] = hl.hp(mix.L[i], 22); mix.R[i] = hr.hp(mix.R[i], 22); }
}
// the held breath: hard silence before the goal
for (let i = 0; i < N; i++) {
  const t = i / SR;
  let g = 1;
  if (t >= ev.silence[0] - 0.008 && t < ev.silence[1]) g = t < ev.silence[0] ? 1 - (t - (ev.silence[0] - 0.008)) / 0.008 : 0;
  if (t > DURATION - 1.6) g *= Math.max(0, (DURATION - t) / 1.6);
  mix.L[i] *= g;
  mix.R[i] *= g;
}

// master: gentle glue comp + lookahead limiter
function master(b, drive, ceiling = 0.93) {
  let env = 0;
  for (let i = 0; i < N; i++) {
    const l = b.L[i] * drive, r = b.R[i] * drive;
    const lvl = Math.max(Math.abs(l), Math.abs(r));
    env = lvl > env ? env + (lvl - env) * 0.002 : env + (lvl - env) * 0.00008;
    const thr = 0.5;
    const g = env > thr ? Math.pow(thr / env, 0.35) : 1;
    b.L[i] = l * g; b.R[i] = r * g;
  }
  // lookahead limiter (sliding max over 4ms, smooth release)
  const la = Math.round(0.004 * SR);
  const peak = new Float32Array(N);
  for (let i = 0; i < N; i++) peak[i] = Math.max(Math.abs(b.L[i]), Math.abs(b.R[i]));
  const want = new Float32Array(N);
  const dq = [];
  for (let i = 0; i < N + la; i++) {
    if (i < N) { while (dq.length && peak[dq[dq.length - 1]] <= peak[i]) dq.pop(); dq.push(i); }
    const j = i - la;
    if (j >= 0) {
      while (dq[0] < j - la) dq.shift();
      const pk = peak[dq[0]];
      want[j] = pk > ceiling ? ceiling / pk : 1;
    }
  }
  let g = 1;
  for (let i = 0; i < N; i++) {
    g = want[i] < g ? want[i] : g + (want[i] - g) * 0.0006;
    b.L[i] = Math.max(-ceiling, Math.min(ceiling, b.L[i] * g));
    b.R[i] = Math.max(-ceiling, Math.min(ceiling, b.R[i] * g));
  }
}
const DRIVE = parseFloat(process.env.DRIVE || '0.8');
master(mix, DRIVE);

// write 32-bit float WAV
function writeWav(file, b) {
  const n = b.n;
  const data = Buffer.alloc(n * 8);
  for (let i = 0; i < n; i++) { data.writeFloatLE(b.L[i], i * 8); data.writeFloatLE(b.R[i], i * 8 + 4); }
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + data.length, 4); h.write('WAVE', 8);
  h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(3, 20); h.writeUInt16LE(2, 22);
  h.writeUInt32LE(SR, 24); h.writeUInt32LE(SR * 8, 28); h.writeUInt16LE(8, 32); h.writeUInt16LE(32, 34);
  h.write('data', 36); h.writeUInt32LE(data.length, 40);
  fs.writeFileSync(file, Buffer.concat([h, data]));
}
const outDir = path.join(__dirname, 'out');
fs.mkdirSync(outDir, { recursive: true });
writeWav(path.join(outDir, 'music.wav'), mix);
if (process.env.STEMS) {
  for (const [name, b] of Object.entries(stems)) {
    const g = GAIN[name];
    const s = new Bus(b.n);
    for (let i = 0; i < b.n; i++) { s.L[i] = b.L[i] * g; s.R[i] = b.R[i] * g; }
    writeWav(path.join(outDir, `stem-${name}.wav`), s);
  }
}
console.log('wrote out/music.wav', (N / SR).toFixed(2) + 's');
