// node engine/render.js analyze <song.mp3> [--lrc lyrics.lrc] [--bpm 128] [--meter 3]
//   → out/analysis.json   tempo, beats, bars, sections, energy per bar, strong hits, lyrics
//   → beats.js            the same, loadable by score.js in Node AND the browser (add it to index.html
//                         before score.js):  const A = typeof module !== 'undefined' ? require('./beats.js') : globalThis.ANALYSIS;
//   → out/analysis.svg    waveform + beats + bars + sections + lyrics, to check it by eye
// Works before score.js exists (it is the first step of a film cut to someone else's song).
module.exports = async function analyze({ ROOT, OUT, fs, path }, _mode, args) {
  const A = require('../audio/analyze');
  const val = (f) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };
  const file = args.find((a, i) => !a.startsWith('--') && !['--lrc', '--bpm', '--meter'].includes(args[i - 1]));
  if (!file) { console.log('usage: node engine/render.js analyze <song.mp3|wav|m4a> [--lrc lyrics.lrc] [--bpm 128] [--meter 3]'); process.exitCode = 1; return; }
  const src = path.resolve(ROOT, file);
  if (!fs.existsSync(src)) throw new Error(`no such file: ${file}`);
  const lrcFile = val('--lrc') || [src.replace(/\.[^.]+$/, '.lrc')].find((f) => fs.existsSync(f));
  const t0 = Date.now();
  const a = A.analyse(src, { bpm: val('--bpm') ? +val('--bpm') : null, meter: val('--meter') ? +val('--meter') : 4, lrc: lrcFile ? fs.readFileSync(path.resolve(ROOT, lrcFile), 'utf8') : null });
  a.file = path.relative(ROOT, src);
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, 'analysis.json'), JSON.stringify(a, null, 1));
  fs.writeFileSync(path.join(ROOT, 'beats.js'), `// written by: node engine/render.js analyze ${a.file}  (re-run it after changing the song)\n(function () {\n  const A = ${JSON.stringify(a)};\n  if (typeof module !== 'undefined' && typeof window === 'undefined') module.exports = A; else globalThis.ANALYSIS = A;\n})();\n`);
  // a picture to check by eye
  const W = 1600, H = 360, sx = (t) => (t / a.duration) * W;
  const x = A.decode(src, 8000), px = Math.floor(x.length / W);
  let wave = '';
  for (let i = 0; i < W; i++) { let pk = 0; for (let j = i * px; j < (i + 1) * px; j++) pk = Math.max(pk, Math.abs(x[j] || 0)); wave += `M${i} ${190 - pk * 90}V${190 + pk * 90}`; }
  const secCol = { intro: '#6c8ebf', verse: '#82b366', chorus: '#d79b00', break: '#9673a6', outro: '#6c8ebf' };
  const svg = [`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" font-family="system-ui" font-size="12"><rect width="100%" height="100%" fill="#fff"/>`,
    ...a.sections.map((s) => `<rect x="${sx(s.t)}" y="20" width="${sx(s.end) - sx(s.t)}" height="40" fill="${secCol[s.label]}" opacity="0.8"/><text x="${sx(s.t) + 4}" y="45" fill="#fff" font-weight="700">${s.label} ${s.letter} · bar ${s.bar}</text>`),
    ...a.energy.map((e, i) => `<rect x="${sx(a.bars[i])}" y="${120 - e * 50}" width="${Math.max(1, sx(a.bars[i + 1] ?? a.duration) - sx(a.bars[i]) - 1)}" height="${e * 50}" fill="#e8b04a" opacity="0.6"/>`),
    `<path d="${wave}" stroke="#555" stroke-width="1"/>`,
    ...a.beats.map((t) => `<line x1="${sx(t)}" x2="${sx(t)}" y1="140" y2="240" stroke="#2d8cff" stroke-width="0.6" opacity="0.6"/>`),
    ...a.bars.map((t, i) => `<line x1="${sx(t)}" x2="${sx(t)}" y1="130" y2="250" stroke="#e03" stroke-width="1.4"/>${i % 4 === 0 ? `<text x="${sx(t) + 2}" y="262" fill="#e03">${i}</text>` : ''}`),
    ...(a.lyrics || []).map((l, i) => `<text x="${sx(l.t)}" y="${290 + (i % 3) * 22}" fill="#333">${l.text.replace(/[<&>]/g, '').slice(0, 28)}</text>`),
    `<text x="8" y="14" fill="#333">${a.file} · ${a.bpm} BPM · ${a.meter}/4 · ${a.bars.length} bars · ${a.sections.length} sections · energy per bar (gold) · beats (blue) · bars (red)</text></svg>`];
  fs.writeFileSync(path.join(OUT, 'analysis.svg'), svg.join(''));
  console.log(`${a.file}: ${a.duration.toFixed(1)}s · ${a.bpm} BPM · ${a.beats.length} beats · ${a.bars.length} bars (first downbeat ${a.bars[0]?.toFixed(2)}s) · ${a.hits.length} strong hits · ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  for (const s of a.sections) console.log(`  ${s.t.toFixed(2).padStart(7)}s  bar ${String(s.bar).padStart(3)}  ${s.label.padEnd(6)} ${s.letter}  energy ${s.energy.toFixed(2)}  (${s.bars} bars)`);
  if (a.lyrics) console.log(`  lyrics: ${a.lyrics.length} lines from ${path.relative(ROOT, path.resolve(ROOT, lrcFile))}${a.lyrics.some((l) => l.words) ? ' (with word times)' : ''}`);
  console.log('wrote out/analysis.json, beats.js (load it before score.js) and out/analysis.svg');
  console.log('score.js: const A = typeof module !== \'undefined\' ? require(\'./beats.js\') : globalThis.ANALYSIS;\n          const clock = MUSIC.makeClock({ beats: A.beats, downbeat: A.downbeat, beatsPerBar: A.meter });');
};
