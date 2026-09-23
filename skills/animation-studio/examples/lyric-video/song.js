// THE SOUNDTRACK is the song itself (assets/song.m4a), loudness-matched for the platforms.
//   node song.js   → out/music.wav
const path = require('path');
const MIX = require('./engine/audio/mix');
const sc = require('./score');

const mix = MIX.loadAudio(path.join(__dirname, 'assets', 'song.m4a'), { length: sc.DURATION });
MIX.fadeOut(mix, sc.DURATION - 0.6, sc.DURATION);
const res = MIX.master(mix, 1, undefined, { lufs: process.env.LUFS ? +process.env.LUFS : -14 });
MIX.writeWav(path.join(__dirname, 'out', 'music.wav'), mix);
console.log(`out/music.wav  ${sc.DURATION.toFixed(1)}s  ${res.lufs.toFixed(1)} LUFS  (${sc.A.bpm} BPM, ${sc.A.bars.length} bars, ${sc.lyrics.length} lyric lines)`);
