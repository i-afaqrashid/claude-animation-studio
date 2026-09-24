// BIRTHDAY CARD (1:1, ~22s, watercolour): "Happy Birthday" sung with a name, in 3/4 time.
// Change NAME (and AGE) below and run `node song.js`: the singer, the lettering and the candles follow.
// The candles light one per beat in the intro, the name stamps one letter-group per sung syllable,
// a balloon rises on every "hap-py", and the candles blow out on the last note.
(function () {
  const node = typeof require !== 'undefined';
  const U = node ? require('./engine/util') : globalThis.U;
  const MU = node ? require('./engine/music') : globalThis.MUSIC;
  const Sing = node ? require('./engine/audio/sing') : null;
  const { m, makeClock } = MU;

  const NAME = 'Ayesha';
  const AGE = 7; // the number of candles (1–12 look good)

  const FPS = 30;
  const FORMAT = '1:1';
  const STYLE = 'watercolor';
  const [W, H] = U.formatSize(FORMAT);
  const SAFE = U.safeArea(W, H);
  const clock = makeClock({ bpm: 100, offset: 0.4, beatsPerBar: 3 });
  const { T, BEAT } = clock;

  // the tune, one note per syllable (Sing.split turns the name into syllables: A-ye-sha)
  const nameSyl = split(NAME);
  const tune = [
    ['G4', 0.75, 'hap'], ['G4', 0.25, 'pee'], ['A4', 1, 'birth'], ['G4', 1, 'day'], ['C5', 1, 'too'], ['B4', 2, 'yoo'],
    ['G4', 0.75, 'hap'], ['G4', 0.25, 'pee'], ['A4', 1, 'birth'], ['G4', 1, 'day'], ['D5', 1, 'too'], ['C5', 2, 'yoo'],
    ['G4', 0.75, 'hap'], ['G4', 0.25, 'pee'], ['G5', 1, 'birth'], ['E5', 1, 'day'], ['C5', 1, 'dear'],
    ...(nameSyl.length <= 1 ? [['B4', 1, nameSyl[0] || 'yoo'], ['A4', 2, '~']] : [['B4', 1, nameSyl[0]], ...nameSyl.slice(1).map((sy) => ['A4', 2 / (nameSyl.length - 1), sy])]),
    ['F5', 0.75, 'hap'], ['F5', 0.25, 'pee'], ['E5', 1, 'birth'], ['C5', 1, 'day'], ['D5', 1, 'too'], ['C5', 3, 'yoo'],
  ];
  // the pickup ("hap-py") comes one beat before bar 2's downbeat
  let b = 2 * 3 - 1;
  const notes = tune.map(([n, d, syl]) => { const o = { t: T(0, b), dur: d * BEAT * 0.94, midi: m(n), syl }; b += d; return o; });
  const lastNote = notes[notes.length - 1];
  const ev = {
    candles: Array.from({ length: AGE }, (_, i) => T(0, 1 + (i * 4) / Math.max(1, AGE))), // lit across the intro
    dear: notes.find((n) => n.syl === 'dear').t,
    name: notes.slice(17, 17 + nameSyl.length).map((n, i) => ({ t: n.t, text: nameSyl[i] })),
    haps: notes.filter((n) => n.syl === 'hap').map((n) => n.t),
    blow: lastNote.t + lastNote.dur + 0.15,
  };
  const DURATION = ev.blow + 3.2;
  const S = { intro: [0, notes[0].t], song: [notes[0].t, ev.blow], blow: [ev.blow, DURATION] };
  // `first` is a name only: a sung downbeat right after the sung pickup "hap-py" has no single sharp onset,
  // so it cannot be measured reliably (verify reports such markers as unclear). The blow is the real hit.
  const markers = { first: notes[2].t, dear: { t: ev.dear, sync: 'a' }, blow: { t: ev.blow, sync: 'av' } };
  const l4 = 17 + Math.max(2, nameSyl.length); // where the last line starts
  const subtitles = [
    { t: notes[0].t, end: notes[6].t - 0.05, text: 'Happy birthday to you' },
    { t: notes[6].t, end: notes[12].t - 0.05, text: 'Happy birthday to you' },
    { t: notes[12].t, end: notes[l4].t - 0.05, text: `Happy birthday, dear ${NAME}` },
    { t: notes[l4].t, end: ev.blow, text: 'Happy birthday to you' },
  ];

  // the same splitter the singer uses (engine/audio/sing.js), so the browser needs no audio code
  function split(word) {
    if (Sing) return Sing.split(word);
    const w = String(word).toLowerCase().replace(/[^a-z]/g, '');
    const isV = (i) => /[aeiou]/.test(w[i]) || (w[i] === 'y' && !/[aeiou]/.test(w[i + 1] || ''));
    const DI = ['sh', 'ch', 'th', 'kh', 'gh', 'ph', 'ng'];
    const out = []; let cur = '', i = 0;
    while (i < w.length) {
      while (i < w.length && !isV(i)) cur += w[i++];
      while (i < w.length && isV(i)) cur += w[i++];
      let j = i; while (j < w.length && !isV(j)) j++;
      if (j >= w.length) { cur += w.slice(i); out.push(cur); break; }
      const cons = w.slice(i, j), keep = cons.length <= 1 ? 0 : DI.includes(cons.slice(-2)) ? cons.length - 2 : cons.length - 1;
      out.push(cur + cons.slice(0, keep)); cur = ''; i += keep;
    }
    return out.filter(Boolean);
  }

  const SCORE = { FPS, FORMAT, STYLE, W, H, SAFE, DURATION, clock, T, BEAT, S, m, NAME, AGE, nameSyl, notes, ev, markers, subtitles };
  if (node) module.exports = SCORE; else globalThis.SCORE = SCORE;
})();
