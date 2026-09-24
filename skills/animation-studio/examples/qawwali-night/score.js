// QAWWALI NIGHT (16:9, ~40s): a qawwali party on a stage under a shamiana, one summer night.
// Original lyrics (Roman Urdu, with Nastaliq captions). The tempo speeds up the whole way, from a free
// alaap at 88 BPM to 152 at the peak, like a real qawwali. The lead sings each line and the chorus
// answers it. The claps (taali) land on beats 1, 2 and 3, and beat 4 stays open (khali). At the peak
// the crowd showers the singers with notes (vail) and rose petals.
// Every event lives here, the single source of truth for music AND picture.
(function () {
  const node = typeof require !== 'undefined';
  const U = node ? require('./engine/util') : globalThis.U;
  const MU = node ? require('./engine/music') : globalThis.MUSIC;
  const { m, makeClock } = MU;

  const FPS = 30;
  const FORMAT = '16:9'; // staged for a wide frame (a vertical cut would re-stage it, not crop it)
  const [W, H] = U.formatSize(FORMAT);
  const SAFE = U.safeArea(W, H);
  // accelerando: 88 BPM for the alaap and the first line, then a steady climb to 152 by bar 18
  const clock = makeClock({ bpm: 88, offset: 0.6, tempo: [[0, 88], [2, 88], [18, 152]] });
  const { T } = clock;
  const DURATION = T(18) + 4.2;

  const S = {
    alaap: [0, T(2)], line1: [T(2), T(6)], line2: [T(6), T(10)], refrain: [T(10), T(14)], peak: [T(14), T(18)], end: [T(18), DURATION],
  };
  const TONIC = m('D3'); // Sa = D. The scale is Bhairavi-flavoured: D Eb F G A Bb C

  // ---------- the words (8th-note grid over two bars: [note, start8th, length8ths, syllable]) ----------
  // '~' holds the previous syllable over another note (a melisma)
  const L1 = [['A4', 0, 2, 'raat'], ['Bb4', 2, 1, 'jaa'], ['A4', 3, 1, 'gee'], ['G4', 4, 3, 'hai'], ['F4', 8, 2, 'saaz'], ['G4', 10, 1, 'jaa'], ['A4', 11, 1, 'gaa'], ['G4', 12, 1, 'hai'], ['D4', 13, 3, '~']];
  const L2 = [['A4', 0, 1, 'dil'], ['C5', 1, 1, 'me'], ['Bb4', 2, 1, 'raa'], ['A4', 3, 3, 'aaj'], ['G4', 8, 1, 'mast'], ['A4', 9, 1, 'hu'], ['F4', 10, 2, 'aa'], ['Eb4', 12, 1, 'hai'], ['D4', 13, 3, '~']];
  const RF = [['A4', 0, 1, 'mast'], ['A4', 1, 1, 'mast'], ['C5', 2, 2, 'mast'], ['Bb4', 4, 1, 'hai'], ['A4', 5, 3, 'dil']];
  const ALAAP = [['D4', 0, 4, 'aa'], ['Eb4', 4, 2, '~'], ['F4', 6, 2, '~'], ['G4', 8, 3, '~'], ['F4', 11, 1, '~'], ['Eb4', 12, 2, '~'], ['D4', 14, 2, '~']];
  const place = (notes, bar, who) => notes.map(([n, s, d, syl]) => ({ t: T(bar, s / 2), dur: T(bar, (s + d) / 2) - T(bar, s / 2), midi: m(n), syl, who }));
  const sung = [
    ...place(ALAAP, 0, 'lead'),
    ...place(L1, 2, 'lead'), ...place(L1, 4, 'chorus'),
    ...place(L2, 6, 'lead'), ...place(L2, 8, 'chorus'),
    ...place(RF, 10, 'lead'), ...place(RF, 11, 'chorus'), ...place(RF, 12, 'lead'), ...place(RF, 13, 'chorus'),
  ];
  // the peak: everyone on "mast!" on beats 1 and 3, then the last shout on the final hit
  for (let b = 14; b < 18; b++) for (const beat of [0, 2]) sung.push({ t: T(b, beat), dur: T(b, beat + 0.8) - T(b, beat), midi: m(beat ? 'C5' : 'A4'), syl: 'mast', who: 'all' });
  sung.push({ t: T(18), dur: 1.4, midi: m('D5'), syl: 'hai', who: 'all' });

  // the harmonium doubles the singer (as it does in every qawwali) and fills between lines with fast runs
  const runs = [];
  const RUN = ['D4', 'Eb4', 'F4', 'G4', 'A4', 'Bb4', 'C5', 'D5'];
  for (const [bar, beat] of [[3, 3.5], [5, 3.5], [7, 3.5], [9, 3.5], [13, 3.5]]) RUN.forEach((n, i) => runs.push({ t: T(bar, beat) + (i * (T(bar + 1) - T(bar, beat))) / RUN.length, midi: m(n) }));
  // two bars of harmonium solo in the peak: up and down the scale in 16ths
  for (let b = 16; b < 18; b++) for (let s = 0; s < 16; s++) runs.push({ t: T(b, s / 4), midi: m(RUN[s < 8 ? s : 15 - s]) + (b === 17 ? 12 : 0) });

  // ---------- rhythm ----------
  // taali: the chorus claps on beats 1, 2, 3 of every bar once the rhythm starts (beat 4 is khali)
  const claps = [];
  for (let b = 2; b < 18; b++) for (const beat of [0, 1, 2]) claps.push(T(b, beat));
  claps.push(T(18));
  // the tabla player's strokes (the hands hit on these): dha on 1, na / tin on the others
  const strokes = [];
  clock.eachStep(2, 18, 8, (t, b, s) => {
    if (s === 0) strokes.push({ t, bol: 'dha', hand: 'both' });
    else if (s % 2 === 0) strokes.push({ t, bol: s === 4 ? 'ge' : 'na', hand: s === 4 ? 'left' : 'right' });
    else if (b >= 10) strokes.push({ t, bol: 'tin', hand: 'right' });
  });
  // a tabla roll into the peak and into the end
  const rolls = [[T(13, 3), T(13, 3.7)], [T(17, 3), T(17, 3.7)]];
  // a held breath (an 8th of silence) before the peak and before the final hit, so everyone lands
  // on them together (and verify can tell the hit from the last stroke of the roll)
  const breaths = [[T(13, 3.72), T(14)], [T(17, 3.72), T(18)]];

  // ---------- the crowd ----------
  const rng = U.mulberry32(7);
  const wah = [T(4, 3.2), T(6, 0.2), T(8, 3.2), T(10, 0.3), T(11, 3.3), T(12, 2.5), T(13, 3.4), T(14, 0.3), T(15, 1.5), T(16, 0.5), T(16, 2.6), T(17, 1.2), T(18, 0.4), T(18, 1.0)]
    .map((t, i) => ({ t, x: [300, 1600, 520, 1420, 760, 1180, 380, 1520, 900, 640, 1300, 480, 1000, 1450][i], text: i % 3 === 1 ? 'Wah wah!' : i % 3 === 2 ? 'Kya baat hai!' : 'واہ!' }));
  // vail: notes of money thrown over the singers at the peak, and rose petals
  const notesRain = Array.from({ length: 34 }, (_, i) => ({ t: T(14) + rng() * (T(18) - T(14)), x: 380 + rng() * 1160, rot: rng() * 6, spin: (rng() - 0.5) * 5, kind: rng() < 0.6 ? 100 : rng() < 0.5 ? 500 : 1000, seed: 50 + i }));
  const petals = Array.from({ length: 90 }, (_, i) => ({ t: T(12) + rng() * (T(18) + 2 - T(12)), x: 100 + rng() * 1720, sway: rng() * 6, size: 7 + rng() * 7, seed: 200 + i }));

  const ev = { start: T(2), refrain: T(10), peak: T(14), hit: T(18) };
  const markers = {
    start: { t: ev.start, sync: 'av' }, // the rhythm enters: first taali + dha
    refrain: ev.refrain,
    peak: { t: ev.peak, sync: 'av' }, // everyone: "mast!", the vail begins
    hit: { t: ev.hit, sync: 'av' }, // the final hit, then silence
  };

  // subtitles: the line while it is sung and answered (Roman Urdu, with the Urdu under it)
  const subtitles = [
    { t: T(0, 0.5), end: T(2) - 0.1, text: 'Aaa…', alt: 'آ…' },
    { t: T(2), end: T(6) - 0.1, text: 'Raat jaagi hai, saaz jaaga hai', alt: 'رات جاگی ہے، ساز جاگا ہے' },
    { t: T(6), end: T(10) - 0.1, text: 'Dil mera aaj mast hua hai', alt: 'دل میرا آج مست ہوا ہے' },
    { t: T(10), end: T(14) - 0.1, text: 'Mast, mast, mast hai dil', alt: 'مست، مست، مست ہے دل' },
    { t: T(14), end: T(18) + 1, text: 'Mast! Mast!', alt: 'مست! مست!' },
  ];
  // (the English meaning, for the description: "The night is awake, the music is awake / Today my heart
  //  is joyful / Joyful, joyful, the heart is joyful")

  const SCORE = { FPS, FORMAT, W, H, SAFE, DURATION, clock, T, S, m, TONIC, sung, runs, claps, strokes, rolls, breaths, wah, notesRain, petals, ev, markers, subtitles };
  if (node) module.exports = SCORE; else globalThis.SCORE = SCORE;
})();
