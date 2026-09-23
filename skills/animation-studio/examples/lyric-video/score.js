// LYRIC VIDEO (9:16): lyrics that land on the real beats of a song you did not write in code.
// The song and its timing come from `node engine/render.js analyze assets/song.m4a` → beats.js
// (tempo, every beat, bars, sections, strong hits, and the LRC lyrics with word times).
// This example ships a demo song made in code ("Chai aur Baarish", see make-song.js); put YOUR song at
// assets/song.m4a (+ assets/song.lrc for the words), run analyze, and the film follows it.
(function () {
  const node = typeof require !== 'undefined';
  const U = node ? require('./engine/util') : globalThis.U;
  const MU = node ? require('./engine/music') : globalThis.MUSIC;
  const A = node ? require('./beats.js') : globalThis.ANALYSIS;

  const FPS = 30;
  const FORMAT = '9:16';
  const [W, H] = U.formatSize(FORMAT);
  const SAFE = U.safeArea(W, H);
  const clock = MU.makeClock({ beats: A.beats, downbeat: A.downbeat, beatsPerBar: A.meter });
  const { T } = clock;
  const DURATION = Math.round(A.duration * FPS) / FPS;

  // a second caption line per lyric line (here the Urdu of the demo song; delete or replace for yours)
  const URDU = ['بارش کی بوندیں، چائے کی پیالی', 'کھڑکی پہ بیٹھے، شام ہے خالی', 'دل نے کہا، بس یہی ہے زندگی'];
  const lyrics = (A.lyrics || []).filter((l) => l.text && l.text !== '…').map((l, i) => ({ ...l, ...(URDU[i] ? { alt: URDU[i] } : {}) }));
  const S = Object.fromEntries(A.sections.map((s, i) => [`${s.label}${i}`, [s.t, s.end]]));
  // each lyric line slams in on its first word: the picture hit that `verify` measures
  const markers = Object.fromEntries(lyrics.map((l, i) => [`line${i + 1}`, { t: (l.words ? l.words[0].t : l.t), sync: 'v' }]));

  const SCORE = { FPS, FORMAT, W, H, SAFE, DURATION, clock, T, S, A, lyrics, markers, bars: A.bars, hits: A.hits, sections: A.sections, energy: A.energy };
  if (node) module.exports = SCORE; else globalThis.SCORE = SCORE;
})();
