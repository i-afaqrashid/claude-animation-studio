// WEDDING INVITE: an animated shaadi card (≈39s): doors open on the couple, the names stamp in, then
// Mehndi, Baraat and Walima each get a scene and a card, then "Shaadi Mubarak!" and a save-the-date.
// Everything the card SAYS is in INVITE below: change it and re-render (node song.js, then the renders).
// Everything that HAPPENS is timed here too, so the shehnai, the dhol and the picture move together.
(function () {
  const node = typeof require !== 'undefined';
  const U = node ? require('./engine/util') : globalThis.U;
  const MU = node ? require('./engine/music') : globalThis.MUSIC;
  const { m, makeClock, makeChords } = MU;

  // ================= THE INVITATION (edit me) =================
  // ⚠ Every value here is a PLACEHOLDER: confirm the names, dates, times and venues with the family before sharing.
  const INVITE = {
    groom: 'Zain',
    bride: 'Hira',
    groomUrdu: 'زین', // '' hides the Urdu name
    brideUrdu: 'حرا',
    city: 'Lahore',
    bismillah: true, // "بسم اللہ الرحمن الرحیم" at the top of the opening, as on printed cards
    line: 'request the pleasure of your company', // under the names
    lineUrdu: 'آپ کی شرکت ہمارے لیے باعثِ مسرت ہوگی', // "your presence will be a joy for us"
    events: [
      { key: 'mehndi', title: 'Mehndi', urdu: 'مہندی', date: 'Friday · 25 December 2026', time: '7:00 PM', venue: 'Lahore' },
      { key: 'baraat', title: 'Baraat', urdu: 'بارات', date: 'Saturday · 26 December 2026', time: '8:00 PM', venue: 'Lahore' },
      { key: 'walima', title: 'Walima', urdu: 'ولیمہ', date: 'Sunday · 27 December 2026', time: '8:00 PM', venue: 'Lahore' },
    ],
    saveTheDate: 'December 2026',
    hosts: 'with love, from both families',
    credit: '', // a small line on the last card, e.g. 'animated invitation by <your studio>'
  };

  const FPS = 30;
  const FORMAT = U.pickFormat('9:16'); // made for Status / Reels / TikTok first; `render.js formats` does the rest
  const [W, H] = U.formatSize(FORMAT);
  const SAFE = U.safeArea(W, H);
  const clock = makeClock({ bpm: 108, offset: 0.4 });
  const { T, BEAT } = clock;
  const DURATION = T(16) + 2.8;

  // ================= THE FORM =================
  const S = {
    alaap: [0, T(2)], // the doors, closed: a shehnai alone over a drone
    reveal: [T(2), T(4)], // the doors open on the couple: names stamp in
    invite: [T(4), T(6)], // "request the pleasure of your company"
    mehndi: [T(6), T(8)],
    baraat: [T(8), T(10)],
    walima: [T(10), T(12)],
    build: [T(12), T(13)],
    mubarak: [T(13), T(15)], // the drop: SHAADI MUBARAK
    end: [T(15), DURATION], // save the date
  };
  const ev = {
    doors: T(2), names: [T(2, 1), T(2, 3), T(3, 1)], invite: T(4), gleam: T(5, 2),
    mehndi: T(6), baraat: T(8), walima: T(10), build: T(12), breath: [T(12, 3.5), T(13)], drop: T(13), end: T(15),
  };

  // harmony: a drone on Sa (D) all through; light harmonium chords on top
  const { chords, chordAt } = makeChords(clock, {
    D: { notes: ['D4', 'F#4', 'A4'], bass: 'D2' }, G: { notes: ['D4', 'G4', 'B4'], bass: 'G1' }, A: { notes: ['C#4', 'E4', 'A4'], bass: 'A1' },
    Bm: { notes: ['D4', 'F#4', 'B4'], bass: 'B1' }, E: { notes: ['E4', 'G#4', 'B4'], bass: 'E2' },
  }, [
    [2, 0, 4, 'D'], [3, 0, 4, 'G'], [4, 0, 4, 'A'], [5, 0, 4, 'D'],
    [6, 0, 4, 'D'], [7, 0, 4, 'A'], [8, 0, 4, 'Bm'], [9, 0, 2, 'A'], [9, 2, 2, 'D'],
    [10, 0, 4, 'G'], [11, 0, 4, 'A'], [12, 0, 4, 'E'], [13, 0, 4, 'D'], [14, 0, 2, 'G'], [14, 2, 2, 'A'], [15, 0, 4, 'D'],
  ]);

  // the shehnai: an original tune in a Yaman colour (D E F# G# A B C#). [note, start8th, length8ths, kan?]
  const place = (bar, list) => list.map(([n, s, d, kan]) => ({ t: T(bar, s / 2), dur: T(bar, (s + d) / 2) - T(bar, s / 2), midi: m(n), kan: kan || 0 }));
  const shehnai = [
    // alaap: rising to Sa above, then resting on Pa
    ...place(0, [['A4', 0, 3], ['B4', 3, 1], ['C#5', 4, 2, 2], ['D5', 6, 4], ['E5', 10, 1], ['D5', 11, 1], ['C#5', 12, 2], ['A4', 14, 2]]),
    // the doors open: the tune (melody A)
    ...place(2, [['D5', 0, 2], ['E5', 2, 1], ['F#5', 3, 1], ['A5', 4, 3, 2], ['G#5', 7, 1]]),
    ...place(3, [['A5', 0, 2], ['F#5', 2, 1], ['E5', 3, 1], ['D5', 4, 2], ['E5', 6, 2]]),
    ...place(4, [['F#5', 0, 1], ['G#5', 1, 1], ['A5', 2, 2], ['B5', 4, 2, 2], ['A5', 6, 1], ['F#5', 7, 1]]),
    ...place(5, [['E5', 0, 2], ['F#5', 2, 1], ['E5', 3, 1], ['D5', 4, 4]]),
    // mehndi: short calls, answered by the taali
    ...place(6, [['A5', 0, 1], ['A5', 1, 1], ['F#5', 2, 2], ['A5', 4, 1], ['A5', 5, 1], ['E5', 6, 2]]),
    ...place(7, [['F#5', 0, 1], ['E5', 1, 1], ['D5', 2, 2], ['E5', 4, 2], ['D5', 6, 2]]),
    // baraat: high and proud over the dhol
    ...place(8, [['B5', 0, 2], ['A5', 2, 1], ['B5', 3, 1], ['D6', 4, 3, 2], ['C#6', 7, 1]]),
    ...place(9, [['B5', 0, 2], ['A5', 2, 2], ['F#5', 4, 2], ['A5', 6, 2]]),
    // walima: long and sweet
    ...place(10, [['G#5', 0, 3], ['F#5', 3, 1], ['E5', 4, 4]]),
    ...place(11, [['F#5', 0, 2], ['E5', 2, 1], ['D5', 3, 1], ['C#5', 4, 2], ['E5', 6, 2]]),
    // the build: a run up the scale
    ...place(12, [['E5', 0, 1], ['F#5', 1, 1], ['G#5', 2, 1], ['A5', 3, 1], ['B5', 4, 1], ['C#6', 5, 1], ['D6', 6, 0.9]]),
    // mubarak: the tune again, full band, then Sa high and long
    ...place(13, [['D6', 0, 2], ['E6', 2, 1], ['F#6', 3, 1], ['A6', 4, 3, 2], ['G#6', 7, 1]]),
    ...place(14, [['A6', 0, 2], ['F#6', 2, 1], ['E6', 3, 1], ['D6', 4, 2], ['E6', 6, 2]]),
    ...place(15, [['D6', 0, 8]]),
  ];
  // the chorus on the drop: "shaa-di mu-baa-rak!" (bars 13 and 14, beats 1–3)
  const chant = [13, 14].flatMap((bar) => [['shaa', 0, 1, 'D5'], ['dee', 1, 1, 'D5'], ['mu', 2, 1, 'F#5'], ['baa', 3, 2, 'A5'], ['rak', 5, 2, 'A5']]
    .map(([syl, s, d, n]) => ({ t: T(bar, s / 2), dur: T(bar, (s + d) / 2) - T(bar, s / 2) - 0.03, midi: m(n) - 12, syl })));

  // ================= RHYTHM =================
  const grid = (bars, pattern) => bars.flatMap((b) => [...pattern].map((c, s) => (c === '.' ? null : { t: T(b, s / 4), c })).filter(Boolean));
  // dholak (mehndi groove): G = ghe (bass), N = na, K = ka; taali claps on 2 and 4
  const dholak = grid([2, 3, 4, 5, 6, 7, 13, 14], 'G..N.KN.G.N.NKN.');
  const taali = [2, 3, 4, 5, 6, 7, 13, 14].flatMap((b) => [T(b, 1), T(b, 3)]);
  // dhol (baraat chaal): D = dagga (bass), t = tilli (stick), B = both
  const dhol = [...grid([8, 9], 'B.t.tD.tB.t.tD.t'), ...grid([13, 14], 'B.t.tD.tB.t.tD.t')];
  const rolls = [[T(12), T(12, 3.5)]]; // the dhol rolls up the build
  // tabla (walima, soft): dha on 1, tin on the rest
  const tabla = grid([10, 11], 'D...t...d...t.t.');
  // fireworks in the baraat sky (on the dhol's big beats) and on the drop
  const fireworks = [T(8), T(8, 2), T(9), T(9, 2), T(13), T(13, 1), T(13, 2), T(14), T(14, 2), T(15)].map((t, i) => ({ t, i, x: [0.25, 0.75, 0.4, 0.62, 0.5, 0.2, 0.8, 0.35, 0.68, 0.5][i], y: [0.2, 0.16, 0.26, 0.12, 0.14, 0.22, 0.2, 0.1, 0.18, 0.12][i], hue: i % 4 }));
  // the henna pattern draws itself one stroke per 8th through the mehndi
  const henna = Array.from({ length: 16 }, (_, i) => T(6, i / 2));
  // chandelier sparkles on each walima note
  const sparkles = shehnai.filter((n) => n.t >= T(10) && n.t < T(12)).map((n) => n.t);
  // petals: a shower on the doors, the taali of the mehndi, and the drop
  const rng = U.mulberry32(26);
  const petals = Array.from({ length: 160 }, (_, i) => {
    const t0 = i < 50 ? ev.doors + rng() * 3 : i < 90 ? T(6) + rng() * (T(8) - T(6)) : ev.drop + rng() * (DURATION - ev.drop - 1);
    return { t: t0, x: rng(), sway: rng() * 6, size: 8 + rng() * 9, rose: rng() < 0.6, seed: 300 + i };
  });

  const markers = {
    doors: { t: ev.doors, sync: 'av' }, // the doors open on the dhol + the shehnai's Sa
    mehndi: { t: ev.mehndi, sync: 'v' },
    baraat: { t: ev.baraat, sync: 'av' }, // dhol "both" + the first firework
    walima: { t: ev.walima, sync: 'v' },
    drop: { t: ev.drop, sync: 'av' }, // SHAADI MUBARAK
    end: ev.end,
  };

  const SCORE = { FPS, FORMAT, W, H, SAFE, DURATION, clock, T, BEAT, S, m, INVITE, ev, chords, chordAt, shehnai, chant, dholak, taali, dhol, rolls, tabla, fireworks, henna, sparkles, petals, markers };
  if (node) module.exports = SCORE; else globalThis.SCORE = SCORE;
})();
