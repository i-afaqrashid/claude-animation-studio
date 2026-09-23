// THE SCORE — single source of truth for music AND animation.
// Every visual beat (ball touch, firework, popcorn pop, caption, letter stamp)
// is an event in here, and the synth renders sound for the exact same events.

(function () {
const { mulberry32 } = typeof require !== 'undefined' ? require('./engine/util') : globalThis.U;

const FPS = 30;
const W = 1920;
const H = 1080;
const BPM = 120;
const BEAT = 60 / BPM; // 0.5s
const BAR = BEAT * 4; // 2s
const OFFSET = 0.5; // half a second of black + TV click before bar 0
const T = (bar, beat = 0) => OFFSET + bar * BAR + beat * BEAT;
const DURATION = T(28) + 2.0; // 58.5s

// ---------- pitch helpers ----------
const NOTE_IDX = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
function m(name) {
  const mm = /^([A-G](?:#|b)?)(-?\d)$/.exec(name);
  return NOTE_IDX[mm[1]] + (parseInt(mm[2], 10) + 1) * 12;
}
const mtof = (midi) => 440 * Math.pow(2, (midi - 69) / 12);

// ---------- sections ----------
const S = {
  intro: [0, T(4)],
  arrive: [T(4), T(6)],
  match: [T(6), T(10)],
  tension: [T(10), T(13)],
  build: [T(13), T(16)],
  goal: [T(16), T(17)],
  party: [T(17), T(24)],
  outro: [T(24), DURATION],
};

// ---------- harmony (one entry per bar, optional half-bar split) ----------
const CH = {
  F: { notes: ['A3', 'C4', 'F4'], bass: 'F2' },
  C: { notes: ['G3', 'C4', 'E4'], bass: 'C2' },
  Dm: { notes: ['A3', 'D4', 'F4'], bass: 'D2' },
  Bb: { notes: ['Bb3', 'D4', 'F4'], bass: 'Bb1' },
  Gm7: { notes: ['Bb3', 'D4', 'F4', 'G4'], bass: 'G1' },
  Bbmaj7: { notes: ['Bb3', 'D4', 'F4', 'A4'], bass: 'Bb1' },
  C7: { notes: ['G3', 'Bb3', 'C4', 'E4'], bass: 'C2' },
  Csus: { notes: ['G3', 'C4', 'F4'], bass: 'C2' },
  Fmaj9: { notes: ['A3', 'C4', 'E4', 'G4'], bass: 'F1' },
};
// [bar, beatStart, beats, chordName]
const progression = [
  [0, 0, 4, 'F'], [1, 0, 4, 'C'], [2, 0, 4, 'Dm'], [3, 0, 2, 'Bb'], [3, 2, 2, 'C'],
  [4, 0, 4, 'F'], [5, 0, 4, 'C'],
  [6, 0, 4, 'F'], [7, 0, 4, 'C'], [8, 0, 4, 'Dm'], [9, 0, 4, 'Bb'],
  [10, 0, 4, 'Dm'], [11, 0, 4, 'Bbmaj7'], [12, 0, 4, 'Gm7'],
  [13, 0, 4, 'Csus'], [14, 0, 4, 'C'], [15, 0, 3, 'C7'],
  [16, 0, 4, 'F'], [17, 0, 4, 'F'],
  [18, 0, 4, 'F'], [19, 0, 4, 'C'], [20, 0, 4, 'Dm'], [21, 0, 4, 'Bb'], [22, 0, 4, 'Gm7'], [23, 0, 4, 'C'],
  [24, 0, 4, 'F'], [25, 0, 4, 'F'], [26, 0, 4, 'C'], [27, 0, 4, 'Bb'], [28, 0, 4, 'Fmaj9'],
];
const chords = progression.map(([bar, beat, beats, name]) => ({
  t0: T(bar, beat),
  t1: T(bar, beat + beats),
  bar,
  name,
  notes: CH[name].notes.map(m),
  bass: m(CH[name].bass),
}));
function chordAt(t) {
  for (const c of chords) if (t >= c.t0 && t < c.t1) return c;
  return null;
}

// ---------- THE HOOK (in 8th notes: [note, start8th, dur8ths]) ----------
const HOOK = {
  1: [['C5', 0, 2], ['A4', 2, 1], ['C5', 3, 1], ['F5', 4, 2], ['E5', 6, 1], ['D5', 7, 1]], // over F
  2: [['C5', 0, 3], ['G4', 3, 1], ['C5', 4, 2], ['E5', 6, 2]], // over C
  3: [['D5', 0, 2], ['A4', 2, 1], ['D5', 3, 1], ['F5', 4, 2], ['E5', 6, 1], ['D5', 7, 1]], // over Dm
  4: [['D5', 0, 3], ['C5', 3, 1], ['Bb4', 4, 2], ['C5', 6, 2]], // over Bb
  5: [['D5', 0, 2], ['Bb4', 2, 1], ['D5', 3, 1], ['G5', 4, 2], ['F5', 6, 1], ['E5', 7, 1]], // over Gm7
  6: [['E5', 0, 3], ['D5', 3, 1], ['E5', 4, 2], ['G5', 6, 2]], // over C
  intro4: [['D5', 0, 2], ['C5', 2, 1], ['Bb4', 3, 1], ['C5', 4, 4]],
  outro3: [['D5', 0, 2], ['C5', 2, 1], ['Bb4', 3, 1], ['A4', 4, 2], ['G4', 6, 2]],
};
function placeBar(hookBar, bar, transpose = 0) {
  return hookBar.map(([n, s, d]) => ({ t: T(bar) + s * (BEAT / 2), dur: d * (BEAT / 2), midi: m(n) + transpose }));
}

// ---------- melodies ----------
const musicbox = [
  ...placeBar(HOOK[1], 0, 12), ...placeBar(HOOK[2], 1, 12), ...placeBar(HOOK[3], 2, 12), ...placeBar(HOOK.intro4, 3, 12),
  // outro reprise
  ...placeBar(HOOK[1], 25, 12), ...placeBar(HOOK[2], 26, 12), ...placeBar(HOOK.outro3, 27, 12),
  { t: T(28), dur: 3, midi: m('F5') + 12 },
];

// The ball PLAYS the hook: every note is a touch on the ball.
const matchNotes = [...placeBar(HOOK[1], 6), ...placeBar(HOOK[2], 7), ...placeBar(HOOK[3], 8), ...placeBar(HOOK[4], 9)];
const interceptT = T(9, 3); // last note of hook bar 4 is stolen by the other team
const touches = matchNotes.filter((n) => n.t < interceptT - 1e-6);

const brassFanfare = [['A5', 0, 3], ['G5', 3, 1], ['F5', 4, 1], ['E5', 5, 1], ['D5', 6, 1], ['E5', 7, 1]];
const brass = [
  ...placeBar(brassFanfare, 17),
  ...placeBar(HOOK[1], 18), ...placeBar(HOOK[2], 19), ...placeBar(HOOK[3], 20),
  ...placeBar(HOOK[4], 21), ...placeBar(HOOK[5], 22), ...placeBar(HOOK[6], 23),
  { t: T(24), dur: 2.6, midi: m('F5') },
];

// The neighbours join in, chanting "o-lé" on the hook.
const choir = [
  ...placeBar(HOOK[3], 20), ...placeBar(HOOK[4], 21), ...placeBar(HOOK[5], 22), ...placeBar(HOOK[6], 23),
  { t: T(24), dur: 2.4, midi: m('F5') },
].map((n, i) => ({ ...n, syl: i % 2 === 0 ? 'o' : 'le' }));

// GOOOOOAL: one letter per 8th note, each stamped with a brass stab climbing the scale
const GOAL_LETTERS = 'GOOOOOAL'.split('');
const stabVoicings = [
  ['F4', 'A4', 'C5'], ['F4', 'Bb4', 'D5'], ['G4', 'C5', 'E5'], ['A4', 'C5', 'F5'],
  ['C5', 'E5', 'G5'], ['C5', 'F5', 'A5'], ['D5', 'F5', 'Bb5'], ['E5', 'G5', 'C6'],
];
const goalStamps = GOAL_LETTERS.map((ch, i) => ({ t: T(16) + i * (BEAT / 2), ch, notes: stabVoicings[i].map(m), i }));

// ---------- sound-effect / animation events ----------
const ev = {
  tvClick: 0.3,
  boing: T(4, 0) - 0.02,
  claudeLand: T(4, 1),
  whooshToMatch: T(5, 3),
  whistle: T(6, 0) - 0.05,
  intercept: interceptT,
  strike: T(14, 2),
  cutHits: [T(15, 0), T(15, 1), T(15, 2)],
  silence: [T(15, 3), T(16, 0)],
  goal: T(16, 0),
  jump: T(17, 0),
  whooshToStreet: T(19, 3),
  whooshBack: T(21, 3),
  highFive: T(24, 0),
  outroDissolve: T(24, 2),
  heart: T(27, 2),
};

// nervous leg: 8ths in bar 2, 16ths in bar 3 ("not calm")
const legBounces = [];
for (let i = 0; i < 8; i++) legBounces.push({ t: T(2) + i * BEAT / 2, strength: 0.6 });
for (let i = 0; i < 16; i++) legBounces.push({ t: T(3) + i * BEAT / 4, strength: 1 });

// tension: heartbeat + scoreboard clock ticks
const heartbeats = [];
for (let b = 10; b <= 11; b++) for (const beat of [0, 2]) heartbeats.push(T(b, beat));
for (let beat = 0; beat < 4; beat++) heartbeats.push(T(12, beat));
for (let beat = 0; beat < 4; beat++) heartbeats.push(T(13, beat));
const clockTicks = [];
for (let i = 0; i < 12; i++) clockTicks.push({ t: T(10) + i * BEAT, label: `89:${String(47 + i).padStart(2, '0')}` });

// build: accelerating snare roll
const snareRoll = [];
for (let i = 0; i < 4; i++) snareRoll.push({ t: T(13, i), v: 0.35 + i * 0.04 });
for (let i = 0; i < 8; i++) snareRoll.push({ t: T(14) + i * BEAT / 2, v: 0.5 + i * 0.03 });
for (let i = 0; i < 8; i++) snareRoll.push({ t: T(15) + i * BEAT / 4, v: 0.75 + i * 0.02 });
for (let i = 0; i < 4; i++) snareRoll.push({ t: T(15, 2) + i * BEAT / 8, v: 0.95 });

// popcorn explosion at the jump (visual kernels == audio pops)
const popcorn = [];
{
  const r = mulberry32(777);
  for (let i = 0; i < 42; i++) {
    const delay = Math.pow(r(), 1.8) * 0.9;
    popcorn.push({
      t: ev.jump + 0.03 + delay,
      vx: (r() - 0.5) * 900,
      vy: -(700 + r() * 900),
      spin: (r() - 0.5) * 20,
      size: 14 + r() * 12,
      seed: i,
      pitch: 1400 + r() * 1800,
    });
  }
}

// fireworks: burst on beats 2 & 4 (the claps) through the window, then over the street
const fireworks = [];
{
  const r = mulberry32(2026);
  const cols = ['#F2B84B', '#E8718D', '#7FD1C7', '#F4EBDD', '#E0703E', '#B79CFF'];
  const add = (t, scene, x, y, size) => fireworks.push({ t, scene, x, y, size, color: cols[fireworks.length % cols.length], color2: cols[(fireworks.length + 3) % cols.length], seed: fireworks.length, launch: 0.55 + r() * 0.2 });
  for (const b of [18, 19]) for (const beat of [1, 3]) add(T(b, beat), 'window', 0.15 + r() * 0.7, 0.2 + r() * 0.35, 0.7 + r() * 0.3);
  add(T(20, 1), 'street', 0.25, 0.22, 1.0);
  add(T(20, 3), 'street', 0.72, 0.16, 1.1);
  add(T(21, 1), 'street', 0.45, 0.12, 1.25);
  add(T(21, 2.5), 'street', 0.15, 0.25, 0.8);
  add(T(21, 3), 'street', 0.85, 0.2, 0.95);
  add(T(21, 3.5), 'street', 0.58, 0.28, 0.8);
  for (const beat of [1, 3]) add(T(22, beat), 'window', 0.2 + r() * 0.6, 0.2 + r() * 0.3, 0.8);
  add(T(23, 1), 'window', 0.5, 0.25, 0.9);
}

// street windows light up on every 16th note over bars 20–21
const windowLights = [];
{
  const r = mulberry32(99);
  const idx = [];
  for (let i = 0; i < 48; i++) idx.push(i);
  for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
  for (let i = 0; i < 32; i++) windowLights.push({ t: T(20) + i * BEAT / 4, win: idx[i] });
}

// captions (taped paper notes). The synth adds a paper "fwip" on each one.
const captions = [
  { t: T(0, 2), end: T(4, 2), text: 'the World Cup final.', x: 150, y: 120, rot: -0.05, size: 64 },
  { t: T(1, 2), end: T(4, 2), text: 'Afaq: totally calm.', x: 170, y: 250, rot: 0.03, size: 56 },
  { t: T(3, 0), end: T(4, 0), text: '(not calm)', x: 560, y: 1000, rot: -0.08, size: 48, small: true },
  { t: T(4, 2), end: T(5, 3.5), text: 'then Claude showed up.', x: 1180, y: 130, rot: 0.04, size: 60 },
  { t: T(5, 1), end: T(5, 3.5), text: 'with a scarf.', x: 1320, y: 255, rot: -0.04, size: 52 },
  { t: T(17, 2), end: T(19, 3.5), text: 'popcorn: everywhere.', x: 150, y: 140, rot: -0.04, size: 58 },
  { t: T(20, 2), end: T(21, 3.5), text: 'the whole street heard us.', x: 120, y: 900, rot: 0.03, size: 60 },
];

const bubbles = [
  { t: T(11, 0), end: T(12, 2), text: 'breathe.' },
  { t: T(11, 2), end: T(12, 2), text: "i've got you." },
];

// outro handwriting — words land on music-box notes
const outroWords = [
  { w: "you'll", t: T(25, 0), d: 0.6 },
  { w: 'never', t: T(25, 2), d: 0.6 },
  { w: 'watch', t: T(26, 0), d: 0.6 },
  { w: 'alone.', t: T(26, 2), d: 0.75 },
];
const outroText = { line: "you'll never watch alone.", words: outroWords, t0: T(25, 0), t1: T(26, 3) };
// soft bells in the tension section; "i've got you." lands on the high D
const tensionBells = [
  ['D5', T(10, 0)], ['A5', T(10, 2)], ['F5', T(10, 3)],
  ['Bb4', T(11, 0)], ['D5', T(11, 0.5)], ['F5', T(11, 1)], ['A5', T(11, 1.5)], ['D6', T(11, 2)], ['C6', T(11, 3)],
  ['G5', T(12, 0)], ['F5', T(12, 2)], ['D5', T(12, 3)],
].map(([n, t]) => ({ t, midi: m(n) }));
const signature = { t: T(27, 0), text: 'Claude × Afaq · World Cup 2026' };

// drum grid helpers
function eachStep(bar0, bar1, stepsPerBar, fn) {
  for (let b = bar0; b < bar1; b++) for (let s = 0; s < stepsPerBar; s++) fn(T(b) + (s * BAR) / stepsPerBar, b, s);
}

const SCORE = {
  FPS, W, H, BPM, BEAT, BAR, OFFSET, T, DURATION, S,
  m, mtof, chords, chordAt, HOOK, musicbox, matchNotes, touches, interceptT, brass, choir,
  goalStamps, ev, legBounces, heartbeats, clockTicks, snareRoll, popcorn, fireworks, windowLights,
  captions, bubbles, outroText, signature, eachStep, tensionBells,
};
if (typeof module !== 'undefined') module.exports = SCORE; else globalThis.SCORE = SCORE;
})();
