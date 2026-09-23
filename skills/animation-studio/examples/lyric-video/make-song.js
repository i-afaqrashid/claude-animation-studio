// The DEMO song for this example: "Chai aur Baarish", a lo-fi song with original Roman Urdu lyrics, made
// entirely in code (Genre 'lofi' + the formant singer), plus its lyrics as an enhanced LRC file with
// word times. It stands in for YOUR song: replace assets/song.m4a (+ .lrc) with your own and run
//   node engine/render.js analyze assets/song.m4a     (writes beats.js: tempo, beats, bars, sections, lyrics)
// To rebuild this demo song:   node make-song.js && node engine/render.js analyze assets/song.m4a
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { SR, Bus, reverb } = require('./engine/audio/dsp');
const MIX = require('./engine/audio/mix');
const Genre = require('./engine/audio/genres');
const Sing = require('./engine/audio/sing');
const I = require('./engine/audio/instruments');
const MU = require('./engine/music');
const { m } = MU;

const clock = MU.makeClock({ bpm: 84, offset: 0.4 });
const { T } = clock;
const { chordAt } = MU.makeChords(clock, {
  Cmaj7: { notes: ['E3', 'G3', 'B3'], bass: 'C2' }, Fmaj7: { notes: ['E3', 'A3', 'C4'], bass: 'F1' }, Em7: { notes: ['B2', 'D3', 'G3'], bass: 'E2' },
  Dm7: { notes: ['A2', 'C3', 'F3'], bass: 'D2' }, G7: { notes: ['B2', 'F3', 'G3'], bass: 'G1' }, Am7: { notes: ['E3', 'G3', 'C4'], bass: 'A1' },
}, [[0, 0, 4, 'Cmaj7'], [1, 0, 4, 'Fmaj7'], [2, 0, 4, 'Em7'], [3, 0, 4, 'Dm7'], [4, 0, 4, 'G7'], [5, 0, 4, 'Fmaj7'], [6, 0, 2, 'Em7'], [6, 2, 2, 'Am7'], [7, 0, 4, 'Dm7'], [8, 0, 4, 'Cmaj7']]);

// [note, start8th, length8ths, syllable] over two bars; words: [word, syllables]
const LINES = [
  { bar: 1, text: 'Baarish ki boondein, chai ki pyaali', urdu: 'بارش کی بوندیں، چائے کی پیالی', words: [['Baarish', 2], ['ki', 1], ['boondein,', 2], ['chai', 2], ['ki', 1], ['pyaali', 2]],
    notes: [['E4', 0, 1, 'baa'], ['G4', 1, 1, 'rish'], ['A4', 2, 1, 'kee'], ['C5', 3, 2, 'boon'], ['A4', 5, 3, 'dain'], ['G4', 8, 1, 'chaa'], ['A4', 9, 1, 'ay'], ['C5', 10, 1, 'kee'], ['D5', 11, 2, 'pyaa'], ['C5', 13, 3, 'lee']] },
  { bar: 3, text: 'Khirki pe baithe, shaam hai khaali', urdu: 'کھڑکی پہ بیٹھے، شام ہے خالی', words: [['Khirki', 2], ['pe', 1], ['baithe,', 2], ['shaam', 1], ['hai', 1], ['khaali', 2]],
    notes: [['E4', 0, 1, 'khir'], ['G4', 1, 1, 'kee'], ['A4', 2, 1, 'pe'], ['C5', 3, 2, 'bai'], ['A4', 5, 3, 'the'], ['G4', 8, 2, 'shaam'], ['A4', 10, 1, 'hai'], ['D5', 11, 2, 'khaa'], ['C5', 13, 3, 'lee']] },
  { bar: 5, text: 'Dil ne kaha, bas yahi hai zindagi', urdu: 'دل نے کہا، بس یہی ہے زندگی', words: [['Dil', 1], ['ne', 1], ['kaha,', 2], ['bas', 1], ['yahi', 2], ['hai', 1], ['zindagi', 3]],
    notes: [['C5', 0, 1, 'dil'], ['D5', 1, 1, 'ne'], ['E5', 2, 1, 'ka'], ['D5', 3, 3, 'haa'], ['C5', 6, 2, 'bas'], ['A4', 8, 1, 'ya'], ['C5', 9, 1, 'hee'], ['D5', 10, 1, 'hai'], ['E5', 11, 1, 'zin'], ['D5', 12, 1, 'da'], ['C5', 13, 3, 'gee']] },
];
const DURATION = T(9) + 2.5;
const N = Math.ceil(DURATION * SR);
const buses = { drums: new Bus(N), bass: new Bus(N), pad: new Bus(N), keys: new Bus(N) };
const vox = new Bus(N), verb = new Bus(N);
const { kicks } = Genre.play('lofi', { clock, from: 0, to: 1, chordAt, buses, drums: false });
Genre.play('lofi', { clock, from: 1, to: 8, chordAt, buses, fill: [4, 6], kicks });
Genre.play('lofi', { clock, from: 8, to: 9, chordAt, buses, drums: false, kicks });
// the voice
const lrc = ['[ti:Chai aur Baarish]', '[ar:made in code]'];
const stamp = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${(s % 60).toFixed(2).padStart(5, '0')}`;
for (const L of LINES) {
  const notes = L.notes.map(([n, s, d, syl]) => ({ t: T(L.bar, s / 2), dur: T(L.bar, (s + d) / 2) - T(L.bar, s / 2), midi: m(n), syl }));
  const x = Sing.phrase(notes.map((q) => ({ ...q, t: q.t - notes[0].t })), { type: 'alto', vib: 0.2, breath: 0.1, seed: L.bar, bright: 0.9 });
  vox.addMono(x, notes[0].t - x.lead, 0.5);
  verb.addMono(x, notes[0].t - x.lead, 0.3);
  // the lyric line with a time tag per word (the first syllable of each word)
  let k = 0;
  const tags = L.words.map(([w, n]) => { const tag = `<${stamp(notes[k].t)}>${w}`; k += n; return tag; });
  lrc.push(`[${stamp(notes[0].t - 0.05)}]${tags.join(' ')}`);
}
lrc.push(`[${stamp(T(7))}]…`);
// a soft e-piano answer in the intro and the outro
for (const [n, b8, d8, bar] of [['G5', 0, 2, 0], ['E5', 2, 2, 0], ['D5', 4, 4, 0], ['G5', 0, 2, 7], ['E5', 2, 2, 7], ['C5', 4, 8, 7]]) buses.keys.addMono(I.epiano(m(n), (T(0, d8 / 2) - T(0))), T(bar, b8 / 2), 0.12, 0.2);
const room = reverb(verb, { room: 0.75, damp: 0.4 });
const mix = MIX.mixdown({ ...buses, vox, verb: room }, { drums: 1, bass: 1, pad: 1, keys: 1, vox: 1, verb: 0.45 });
Genre.fx('lofi', mix, { kicks });
MIX.highpass(mix, 30);
MIX.fadeOut(mix, DURATION - 2, DURATION);
MIX.master(mix, 0.8, undefined, { lufs: -14 });
fs.mkdirSync(path.join(__dirname, 'assets'), { recursive: true });
const wav = path.join(__dirname, 'assets', 'song-demo.wav');
MIX.writeWav(wav, mix);
execFileSync(process.env.FFMPEG || 'ffmpeg', ['-v', 'error', '-y', '-i', wav, '-c:a', 'aac', '-b:a', '160k', path.join(__dirname, 'assets', 'song.m4a')]);
fs.rmSync(wav);
fs.writeFileSync(path.join(__dirname, 'assets', 'song.lrc'), lrc.join('\n') + '\n');
console.log(`assets/song.m4a (${DURATION.toFixed(1)}s, 84 BPM) + assets/song.lrc (${LINES.length} lines with word times)`);
