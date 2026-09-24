// PRODUCT LAUNCH (16:9, ~36s): a launch film with a voiceover, word-timed captions, counters, a style
// montage and a genre montage. The product here is this plugin (every claim below is true of it);
// swap in yours: the voice lines, the facts, the brand colours.
(function () {
  const node = typeof require !== 'undefined';
  const U = node ? require('./engine/util') : globalThis.U;
  const MU = node ? require('./engine/music') : globalThis.MUSIC;
  const { m, makeClock, makeChords } = MU;

  const FPS = 30;
  const FORMAT = '16:9';
  const [W, H] = U.formatSize(FORMAT);
  const SAFE = U.safeArea(W, H);
  const clock = makeClock({ bpm: 112, offset: 0.5 });
  const { T, BEAT } = clock;
  const DURATION = T(16) + 1.6;

  const S = { intro: [0, T(2)], code: [T(2), T(4)], looks: [T(4), T(6)], sounds: [T(6), T(10)], people: [T(10), T(12)], data: [T(12), T(14)], end: [T(14), DURATION] };
  const loop = ['C', 'G', 'Am', 'F'];
  const { chords, chordAt } = makeChords(clock, {
    C: { notes: ['E3', 'G3', 'C4'], bass: 'C2' }, G: { notes: ['D3', 'G3', 'B3'], bass: 'G1' }, Am: { notes: ['E3', 'A3', 'C4'], bass: 'A1' }, F: { notes: ['F3', 'A3', 'C4'], bass: 'F1' },
  }, [...Array.from({ length: 16 }, (_, b) => [b, 0, 4, loop[b % 4]]), [16, 0, 4, 'C']]);

  // the voiceover (engine/audio/voice.js). Keep ~2.5 words a second, and leave the montages unspoken.
  const vo = [
    { at: T(0, 1), text: 'This is Animation Studio.', who: 'narrator' },
    { at: T(2, 0.2), text: 'Every frame is drawn in code, and every sound is synthesized.', who: 'narrator' },
    { at: T(4, 0), text: 'Pick a look.', who: 'narrator' },
    { at: T(6, 0), text: 'Pick a sound.', who: 'narrator' },
    { at: T(10, 0), text: 'Characters walk, talk and dance.', who: 'narrator' },
    { at: T(12, 0), text: 'Maps, charts, and captions in any language.', who: 'narrator' },
    { at: T(14, 0.3), text: 'Free and open source. Made by Afaq, with Claude.', who: 'narrator' },
  ];
  const STYLES = ['paper', 'flat', 'pixel', 'chalk', 'neon', 'watercolor'];
  const looks = STYLES.map((name, i) => ({ name, t: T(4, i * (8 / 6)) })); // six looks across two bars
  const GENRES = [
    { name: 'lofi', label: 'lo-fi', what: 'e-piano · vinyl · tape wobble', style: 'watercolor', bar: 6 },
    { name: 'chiptune', label: 'chiptune', what: 'pulse waves · noise drums', style: 'pixel', bar: 7 },
    { name: 'qawwali', label: 'qawwali', what: 'tabla · harmonium · taali', style: 'paper', bar: 8 },
    { name: 'edm', label: 'EDM', what: 'supersaws · sidechain pump', style: 'neon', bar: 9 },
  ];
  const facts = [
    { t: T(3, 0), big: '0', small: 'samples' }, { t: T(3, 1), big: '0', small: 'npm installs' },
    { t: T(3, 2), big: '8', small: 'genre packs' }, { t: T(3, 3), big: '6', small: 'looks' },
  ];
  const pins = ['Karachi', 'Lahore', 'Islamabad', 'Peshawar', 'Quetta', 'Multan', 'Gilgit'].map((c, i) => ({ c, t: T(12, 1 + i * 0.5) }));
  const ev = { title: T(1), looks: T(4), sounds: T(6), people: T(10), data: T(12), end: T(14) };
  const markers = {
    title: { t: ev.title, sync: 'av' }, // the title stamps in
    looks: { t: ev.looks, sync: 'av' }, // the first style cut
    sounds: { t: ev.sounds, sync: 'av' }, // the genre montage starts
    end: { t: ev.end, sync: 'av' }, // the drop into the end card
  };

  const SCORE = { FPS, FORMAT, W, H, SAFE, DURATION, clock, T, BEAT, S, m, chords, chordAt, vo, looks, STYLES, GENRES, facts, pins, ev, markers };
  if (node) module.exports = SCORE; else globalThis.SCORE = SCORE;
})();
