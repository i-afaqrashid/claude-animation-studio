// GULLY CRICKET (9:16, ~28s): the last ball of a street match in a Pakistani mohalla. Six needed.
// A comic escalation: the hit, the ball goes up… and up… SIX! Then the crash: it is aunty's window.
// Chacha commentates on a microphone (a real text-to-speech voiceover, lip-synced), the kids chant
// "chhakka!" (sung by the formant singer), and every hit, stamp and freeze is timed here.
// All characters and the match are made up.
(function () {
  const node = typeof require !== 'undefined';
  const U = node ? require('./engine/util') : globalThis.U;
  const MU = node ? require('./engine/music') : globalThis.MUSIC;
  const { m, makeClock, makeChords } = MU;

  const FPS = 30;
  const FORMAT = '9:16'; // staged for Reels / TikTok / Shorts
  const [W, H] = U.formatSize(FORMAT);
  const SAFE = U.safeArea(W, H);
  const clock = makeClock({ bpm: 124, offset: 0.5 });
  const { T, BEAT } = clock;
  const DURATION = T(13) + 1.6;

  const ev = {
    runUp: T(3), release: T(3, 3.4), hit: T(4), rise: T(4, 1), six: T(6), crash: T(8, 2), aunty: T(9), point: T(10), run: T(11), end: T(12),
  };
  const S = { intro: [0, T(2)], strike: [T(2), T(3)], runup: [T(3), T(4)], rise: [T(4), T(6)], six: [T(6), T(8, 2)], crash: [T(8, 2), T(10)], blame: [T(10), T(11)], escape: [T(11), DURATION] };

  const { chords, chordAt } = makeChords(clock, {
    Dm: { notes: ['D4', 'F4', 'A4'], bass: 'D2' }, Bb: { notes: ['D4', 'F4', 'Bb4'], bass: 'Bb1' }, C: { notes: ['E4', 'G4', 'C5'], bass: 'C2' }, A: { notes: ['C#4', 'E4', 'A4'], bass: 'A1' },
    F: { notes: ['F4', 'A4', 'C5'], bass: 'F2' }, G: { notes: ['D4', 'G4', 'B4'], bass: 'G2' },
  }, [
    [0, 0, 4, 'Dm'], [1, 0, 4, 'Bb'], [2, 0, 4, 'C'], [3, 0, 4, 'A'], [4, 0, 4, 'Dm'], [5, 0, 4, 'A'],
    [6, 0, 4, 'F'], [7, 0, 4, 'C'], [8, 0, 2, 'Dm'], [11, 0, 4, 'Dm'], [12, 0, 4, 'G'],
  ]);

  // the commentary (and aunty). `display` is the caption when the spoken text is in another script:
  // the Hindi voice reads Devanagari, which sounds exactly like the Urdu it is captioned with.
  const vo = [
    { at: T(0, 0.5), text: 'Last ball of the match. Six runs needed!', who: 'chacha', voice: 'Rishi', rate: 190 },
    { at: T(2, 0.25), text: 'Bilal on strike. Big hitter!', who: 'chacha', voice: 'Rishi', rate: 200 },
    { at: T(3, 0.2), text: 'Here comes Hamza…', who: 'chacha', voice: 'Rishi', rate: 180 },
    { at: T(4, 1.2), text: "It's up… it's up…", who: 'chacha', voice: 'Rishi', rate: 170 },
    { at: T(6, 2.4), text: 'What a shot!', who: 'chacha', voice: 'Rishi', rate: 190 },
    { at: T(9, 0.35), text: 'किसने मारा?!', display: 'Kis ne maara?!', alt: 'کس نے مارا؟!', who: 'aunty', voice: 'Lekha', rate: 175 },
    { at: T(10, 1.4), text: 'And that… is the match.', who: 'chacha', voice: 'Rishi', rate: 175 },
  ];
  // the kids' chant after the six: "chhak-kaa!" twice, rising
  const chant = [
    { t: T(6, 1), dur: BEAT * 0.5, midi: m('A4'), syl: 'chak' }, { t: T(6, 1.5), dur: BEAT * 1.2, midi: m('D5'), syl: 'kaa' },
    { t: T(7, 1), dur: BEAT * 0.5, midi: m('C5'), syl: 'chak' }, { t: T(7, 1.5), dur: BEAT * 1.2, midi: m('F5'), syl: 'kaa' },
  ];

  // the ball: bowled from the far end (it grows as it comes), hit, then up past the building
  const ball = { release: ev.release, hit: ev.hit, top: ev.six };
  // what the chalk scoreboard on the wall says
  const board = [{ t: 0, need: 'NEED 6', balls: '1 BALL' }, { t: ev.six + 0.3, need: 'WON!', balls: '0 BALLS' }];
  // confetti bursts and the celebration hops
  const celebrate = [T(6), T(6, 2), T(7), T(7, 2), T(8)];

  const markers = {
    hit: { t: ev.hit, sync: 'av' }, // the bat meets the ball: thwack + impact frame
    six: { t: ev.six, sync: 'av' }, // the ball clears the roof: SIX! stamp + the drop
    crash: { t: ev.crash, sync: 'av' }, // aunty's window: glass + a record scratch, everyone freezes
    aunty: ev.aunty,
    end: ev.end,
  };

  const SCORE = { FPS, FORMAT, W, H, SAFE, DURATION, clock, T, BEAT, S, m, chords, chordAt, ev, vo, chant, ball, board, celebrate, markers };
  if (node) module.exports = SCORE; else globalThis.SCORE = SCORE;
})();
