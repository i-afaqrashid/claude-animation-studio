// APP PROMO (9:16): "Pantrio: cook with what you have." A FICTIONAL app, made up for this example.
// A musical explainer for Reels / TikTok / Shorts: every step of the app is one bar with its own sync
// gimmick, and the whole story is timed here, the single source of truth for music AND picture.
(function () {
  const node = typeof require !== 'undefined';
  const U = node ? require('./engine/util') : globalThis.U;
  const MU = node ? require('./engine/music') : globalThis.MUSIC;
  const { m, makeClock, placeBar, makeChords } = MU;

  const FPS = 30;
  const FORMAT = '9:16';
  const [W, H] = U.formatSize(FORMAT);
  const SAFE = U.safeArea(W, H); // platform UI covers the top, bottom and right edge: text stays inside
  const clock = makeClock({ bpm: 112, offset: 0.5 });
  const { T, BEAT, BAR } = clock;
  const DURATION = T(8) + 2.2; // ≈ 19.8s: short-form length, the end card holds ~2.5s

  const S = {
    fridge: [0, T(1)], snap: [T(1), T(2)], recipes: [T(2), T(3)], cook: [T(3), T(4)],
    share: [T(4), T(5)], payoff: [T(5), T(6)], stats: [T(6), T(7)], end: [T(7), DURATION],
  };

  const { chords, chordAt } = makeChords(clock, {
    G: { notes: ['G3', 'B3', 'D4'], bass: 'G1' },
    Em: { notes: ['G3', 'B3', 'E4'], bass: 'E2' },
    C: { notes: ['G3', 'C4', 'E4'], bass: 'C2' },
    D: { notes: ['F#3', 'A3', 'D4'], bass: 'D2' },
    Am7: { notes: ['G3', 'C4', 'E4'], bass: 'A1' },
    Dsus: { notes: ['G3', 'A3', 'D4'], bass: 'D2' },
    Gadd9: { notes: ['B3', 'D4', 'G4', 'A4'], bass: 'G1' },
  }, [
    [0, 0, 4, 'G'], [1, 0, 4, 'Em'], [2, 0, 4, 'C'], [3, 0, 4, 'D'], [4, 0, 4, 'Am7'],
    [5, 0, 4, 'G'], [6, 0, 4, 'C'], [7, 0, 2, 'Dsus'], [7, 2, 2, 'D'], [8, 0, 4, 'Gadd9'],
  ]);

  // the hook: a rising arpeggio that falls home (8th grid: [note, start8th, dur8ths])
  const HK = {
    1: [['G4', 0, 1], ['B4', 1, 1], ['D5', 2, 2], ['B4', 4, 1], ['A4', 5, 1], ['G4', 6, 2]],
    2: [['E4', 0, 1], ['G4', 1, 1], ['B4', 2, 2], ['A4', 4, 1], ['G4', 5, 1], ['E4', 6, 2]],
    3: [['C5', 0, 1], ['E5', 1, 1], ['G5', 2, 2], ['E5', 4, 1], ['D5', 5, 1], ['C5', 6, 2]],
    4: [['D5', 0, 1], ['F#5', 1, 1], ['A5', 2, 2], ['G5', 4, 1], ['F#5', 5, 1], ['D5', 6, 2]],
  };

  const ev = {
    doorOpen: T(0, 0), // the fridge door swings open on the first downbeat
    question: T(0, 2), // "what's for dinner?"
    phoneUp: T(1) - 0.3,
    shutter: T(1, 2), // snap the fridge: flash + click
    tap: T(2, 3), // tap the first recipe
    breath: [T(4, 3.5), T(5)], // half a beat of silence and a freeze
    plate: T(5), // the plate lands: the payoff downbeat
    logo: T(7),
  };

  // SNAP: the app recognises what's in the fridge, one chip per 8th, a rising guitar line
  const INGREDIENTS = [['Egg', 'egg'], ['Tomato', 'tomato'], ['Bread', 'bread']];
  const chips = INGREDIENTS.map(([label, kind], i) => ({ label, kind, i, t: T(1, 2.5 + i * 0.5), midi: m(['G4', 'B4', 'D5'][i]) }));

  // RECIPES: a card slides in on each beat (a guitar note), its title stamps on the off-8th
  const RECIPES = [
    { title: 'Tomato egg toast', meta: '15 min · Easy · 3 of 3 you have', dish: 'toast' },
    { title: 'Shakshuka for one', meta: '20 min · Easy · 2 of 3 you have', dish: 'pan' },
    { title: 'Eggy bread', meta: '10 min · Easy · 2 of 3 you have', dish: 'eggy' },
  ];
  const cards = RECIPES.map((r, i) => ({ ...r, i, tIn: T(2, i), tTitle: T(2, i + 0.5), midi: m(['C5', 'E5', 'G5'][i]) }));

  // COOK: one step ticks off per beat, climbing the D chord
  const STEPS = ['Toast the bread', 'Soften the tomato', 'Crack in two eggs', 'Season & serve'];
  const steps = STEPS.map((text, i) => ({ text, i, t: T(3, i), midi: m(['D5', 'F#5', 'A5', 'D6'][i]) }));

  // SHARE: call and response, one bubble per beat (them = e-piano, me = guitar)
  const chat = [
    { t: T(4, 0), who: 'them', text: 'what are you making?', midi: m('E5') },
    { t: T(4, 1), who: 'me', text: 'tomato egg toast!', midi: m('G5') },
    { t: T(4, 2), who: 'them', text: 'save me some', midi: m('C5') },
  ];

  // STATS + END
  const stats = [
    { t: T(6, 0), big: '3', small: 'things already in your fridge', midi: m('G4') },
    { t: T(6, 2), big: '15 min', small: 'from fridge to plate', midi: m('D5') },
  ];
  const tagline = [{ w: 'Cook', t: T(7, 1) }, { w: 'with what', t: T(7, 1.5) }, { w: 'you have.', t: T(7, 2) }];
  const cta = T(7, 3);

  const musicbox = [...placeBar(clock, HK[1], 0, 12)];
  const payoffHook = [...placeBar(clock, HK[1], 5), ...placeBar(clock, HK[3], 6)];
  const leaves = [];
  { const r = U.mulberry32(31); for (let i = 0; i < 46; i++) leaves.push({ x: r(), spin: r() * 6, s: 0.6 + r() * 0.7, d: r() * 0.4, seed: i }); }

  const captions = [
    { t: T(1, 0.2), end: T(1, 3.7), n: '1', text: 'Snap your fridge' },
    { t: T(2, 0.2), end: T(2, 3.7), n: '2', text: 'Get recipes that fit' },
    { t: T(3, 0.2), end: T(3, 3.7), n: '3', text: 'Cook it, step by step' },
    { t: T(4, 0.2), end: T(4, 3.3), n: '4', text: 'Share the good stuff' },
  ];

  // named moments: `render.js stills @plate`, `clip @plate-2 @plate+2`, `board`, and `verify` (sync: 'av')
  const markers = {
    door: { t: ev.doorOpen, sync: 'a' },
    shutter: { t: ev.shutter, sync: 'av' },
    tap: { t: ev.tap, sync: 'a' },
    cook: T(3),
    share: T(4),
    breath: ev.breath[0],
    plate: { t: ev.plate, sync: 'av' },
    stats: T(6),
    logo: { t: ev.logo, sync: 'av' },
  };

  const SCORE = {
    FPS, FORMAT, W, H, SAFE, DURATION, clock, T, BEAT, BAR, S, m, chords, chordAt, HK, ev, markers,
    chips, cards, steps, chat, stats, tagline, cta, musicbox, payoffHook, leaves, captions,
  };
  if (node) module.exports = SCORE; else globalThis.SCORE = SCORE;
})();
