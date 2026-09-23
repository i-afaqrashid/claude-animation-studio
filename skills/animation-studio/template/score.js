// THE SCORE — the single source of truth for music AND picture.
// Every visual beat is an event here, and song.js renders sound for the very same events.
// Change a time here and both the audio and the animation move together.
(function () {
  const node = typeof require !== 'undefined';
  const U = node ? require('./engine/util') : globalThis.U;
  const MU = node ? require('./engine/music') : globalThis.MUSIC;
  const { m, makeClock, placeBar, makeChords } = MU;

  const FPS = 30;
  const clock = makeClock({ bpm: 120, offset: 0.5 }); // 120 BPM: 1 beat = 0.5s, 1 bar = 2s
  const { T, BEAT } = clock;
  const DURATION = T(10) + 2.5; // 23s

  // ---------- sections (also used by engine/tools/levels.js) ----------
  const S = {
    intro: [0, T(2)],
    groove: [T(2), T(5, 3)],
    breath: [T(5, 3), T(6)],
    drop: [T(6), T(9)],
    outro: [T(9), DURATION],
  };

  // ---------- harmony ----------
  const { chords, chordAt } = makeChords(clock, {
    F: { notes: ['A3', 'C4', 'F4'], bass: 'F2' },
    C: { notes: ['G3', 'C4', 'E4'], bass: 'C2' },
    Dm: { notes: ['A3', 'D4', 'F4'], bass: 'D2' },
    Bb: { notes: ['Bb3', 'D4', 'F4'], bass: 'Bb1' },
    Fmaj9: { notes: ['A3', 'C4', 'E4', 'G4'], bass: 'F1' },
  }, [
    [0, 0, 4, 'F'], [1, 0, 4, 'C'],
    [2, 0, 4, 'F'], [3, 0, 4, 'C'], [4, 0, 4, 'Dm'], [5, 0, 3, 'Bb'],
    [6, 0, 4, 'F'], [7, 0, 4, 'C'], [8, 0, 2, 'Bb'], [8, 2, 2, 'C'],
    [9, 0, 4, 'Fmaj9'], [10, 0, 4, 'Fmaj9'],
  ]);

  // ---------- the hook (8th-note grid: [note, start8th, dur8ths]) ----------
  const HOOK = {
    1: [['C5', 0, 2], ['A4', 2, 1], ['C5', 3, 1], ['F5', 4, 2], ['E5', 6, 1], ['D5', 7, 1]],
    2: [['C5', 0, 3], ['G4', 3, 1], ['C5', 4, 2], ['E5', 6, 2]],
    3: [['D5', 0, 2], ['A4', 2, 1], ['D5', 3, 1], ['F5', 4, 2], ['E5', 6, 1], ['D5', 7, 1]],
    4: [['D5', 0, 3], ['C5', 3, 1], ['Bb4', 4, 2]],
    end: [['D5', 0, 2], ['C5', 2, 1], ['Bb4', 3, 1], ['C5', 4, 4]],
  };

  const ev = {
    claudeFall: T(2) - 0.55, // falls from the sky...
    claudeLand: T(2), // ...and lands exactly on the downbeat where the drums start
    breath: T(5, 3), // total silence + freeze
    drop: T(6),
    end: T(9),
  };

  // music box intro, and the melody that the stars draw (every note = one star)
  const musicbox = [...placeBar(clock, HOOK[1], 0, 12), ...placeBar(clock, HOOK[2], 1, 12), { t: T(9), dur: 3, midi: m('F6') }];
  const starNotes = [...placeBar(clock, HOOK[1], 2), ...placeBar(clock, HOOK[2], 3), ...placeBar(clock, HOOK[3], 4), ...placeBar(clock, HOOK[4], 5)]
    .filter((n) => n.t < ev.breath - 1e-6)
    .map((n, i, all) => ({
      ...n, i,
      x: U.remap(n.t, all[0].t, all[all.length - 1].t, 240, 1680),
      y: U.remap(n.midi, m('G4'), m('F5'), 600, 190), // higher note = higher star
    }));
  const brass = [...placeBar(clock, HOOK[1], 6), ...placeBar(clock, HOOK[2], 7), ...placeBar(clock, HOOK.end, 8), { t: T(9), dur: 2.5, midi: m('F5') }];

  const captions = [
    { t: T(0, 1), end: T(1, 3.5), text: 'a tiny film, made of code.', x: 140, y: 110, rot: -0.04, size: 60 },
    { t: T(3, 0), end: T(5, 2.5), text: 'every star is a note.', x: 1180, y: 110, rot: 0.04, size: 56 },
  ];
  const endText = { words: [{ w: 'made', t: T(9, 0), d: 0.45 }, { w: 'with', t: T(9, 1), d: 0.4 }, { w: 'code.', t: T(9, 2), d: 0.5 }], sub: { t: T(9, 2.6), text: '(the music too)' } };

  const SCORE = { FPS, DURATION, clock, T, BEAT, S, m, chords, chordAt, HOOK, ev, musicbox, starNotes, brass, captions, endText };
  if (node) module.exports = SCORE; else globalThis.SCORE = SCORE;
})();
