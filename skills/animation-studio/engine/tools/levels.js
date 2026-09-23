// "Ears" for a model that can't listen: RMS / peak (dBFS) of each WAV, per section of the film.
// Run from the project root:  node engine/tools/levels.js out/music.wav out/stem-*.wav
// Sections come from SCORE.S ({ name: [t0, t1] }) if present, otherwise 8 equal slices.
const fs = require('fs');
const path = require('path');

function read(f) {
  const b = fs.readFileSync(f);
  const n = (b.length - 44) / 8;
  const L = new Float32Array(n), R = new Float32Array(n);
  for (let i = 0; i < n; i++) { L[i] = b.readFloatLE(44 + i * 8); R[i] = b.readFloatLE(48 + i * 8); }
  return { L, R, n };
}
const SR = 48000;
let sections;
try {
  const S = require(path.join(process.cwd(), 'score.js'));
  sections = S.S ? Object.entries(S.S).map(([k, [a, b]]) => [k, a, b]) : null;
  if (!sections) { const d = S.DURATION; sections = Array.from({ length: 8 }, (_, i) => [`${(i * d / 8).toFixed(0)}s`, (i * d) / 8, ((i + 1) * d) / 8]); }
} catch (e) { sections = null; }
const files = process.argv.slice(2);
if (!files.length) { console.log('usage: node engine/tools/levels.js out/music.wav [out/stem-*.wav]'); process.exit(0); }
if (!sections) { const w = read(files[0]); const d = w.n / SR; sections = Array.from({ length: 8 }, (_, i) => [`${(i * d / 8).toFixed(0)}s`, (i * d) / 8, ((i + 1) * d) / 8]); }
console.log('rms/peak dBFS'.padEnd(16) + sections.map((s) => s[0].slice(0, 10).padStart(11)).join(''));
for (const f of files) {
  const w = read(f);
  let row = path.basename(f).replace('.wav', '').slice(0, 15).padEnd(16);
  for (const [, a, b] of sections) {
    let s = 0, pk = 0;
    const i0 = Math.floor(a * SR), i1 = Math.min(w.n, Math.floor(b * SR));
    for (let i = i0; i < i1; i++) { const v = (w.L[i] + w.R[i]) / 2; s += v * v; pk = Math.max(pk, Math.abs(w.L[i]), Math.abs(w.R[i])); }
    const rms = i1 > i0 ? Math.sqrt(s / (i1 - i0)) : 0;
    const db = (x) => (x > 1e-9 ? (20 * Math.log10(x)).toFixed(1) : '-inf');
    row += `${db(rms)}/${db(pk).split('.')[0]}`.padStart(11);
  }
  console.log(row);
}
// integrated loudness of the first file (BS.1770, same meter as MIX.master's { lufs } target)
try { console.log(`\nintegrated loudness (${path.basename(files[0])}): ${require(path.join(__dirname, '..', 'audio', 'mix')).lufs(read(files[0])).toFixed(1)} LUFS`); } catch (e) { /* not a float WAV */ }
