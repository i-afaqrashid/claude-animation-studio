// node engine/render.js pacing [name]  -> the hook and pacing report of the final film + out/pacing.svg
// Short-form platforms measure how many viewers get past the first 3 seconds, and retention research
// recommends a "pattern interrupt" (a cut, a big change) every 10–15 seconds. This measures both on the
// rendered file: picture change per frame, sound level, cuts, and on-screen text from the score.
module.exports = async function pacing(C, _mode, args) {
  const { fs, path, OUT, ROOT, SCORE, FPS, DURATION, FW, FH, execFileSync, FFMPEG } = C;
  const nameArg = args.find((a) => !a.startsWith('--'));
  let file = C.finalName(nameArg);
  if (!fs.existsSync(file)) file = C.VIDEO;
  if (!fs.existsSync(file)) throw new Error('render (and mux) the film first');
  // what text is really on screen in the first seconds (the probe sees every drawn word, not just captions)
  let probed = [];
  try {
    await C.serve();
    const w = await C.openWorker('probe');
    for (let t = 0.25; t <= 3.01; t += 0.25) {
      const texts = await C.evaluate(w.c, `window.probeAt(${t}, 0.5)`);
      if (texts.some((x) => x.onscreen && x.alpha > 0.5 && x.size >= Math.min(FW, FH) * 0.02)) { probed.push(t); break; }
    }
    w.close();
  } catch (e) { probed = []; }
  const report = analyse({ path, OUT, SCORE, FPS, FW, FH, execFileSync, FFMPEG, file, probedText: probed[0] });
  fs.writeFileSync(path.join(OUT, 'pacing.svg'), report.svg);
  console.log(`pacing of ${path.relative(ROOT, file)}  (${report.duration.toFixed(1)}s, ${report.cuts.length} cuts / big changes)`);
  for (const r of report.rows) console.log(`${r.ok ? '✓' : '⚠'} ${r.text}`);
  console.log('graph: out/pacing.svg (picture change, sound level, cuts, text)');
  if (report.rows.some((r) => !r.ok)) process.exitCode = 0; // advice, not failure
};

function analyse({ path, OUT, SCORE, FPS, FW, FH, execFileSync, FFMPEG, file, probedText }) {
  const tall = FH > FW;
  const VW = tall ? 2 * Math.round((48 * FW) / FH) : 96, VH = tall ? 96 : 2 * Math.round((48 * FH) / FW), FS = VW * VH;
  const vid = execFileSync(FFMPEG, ['-v', 'error', '-i', file, '-map', '0:v:0', '-vf', `scale=${VW}:${VH}:flags=area,format=gray`, '-f', 'rawvideo', '-pix_fmt', 'gray', '-'], { maxBuffer: 1 << 30 });
  const nF = Math.floor(vid.length / FS);
  const change = new Float32Array(nF), bright = new Float32Array(nF);
  for (let k = 0; k < nF; k++) {
    let n = 0, b = 0;
    for (let i = 0; i < FS; i++) { b += vid[k * FS + i]; if (k && Math.abs(vid[k * FS + i] - vid[(k - 1) * FS + i]) > 20) n++; }
    change[k] = (100 * n) / FS; bright[k] = b / FS;
  }
  let aud = null;
  const audioSrc = /video(-[^/]*)?\.mp4$/.test(file) ? path.join(OUT, 'music.wav') : file;
  try {
    const raw = execFileSync(FFMPEG, ['-v', 'error', '-i', audioSrc, '-map', '0:a:0', '-ac', '1', '-ar', '8000', '-f', 'f32le', '-'], { maxBuffer: 1 << 30 });
    aud = new Float32Array(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.length - (raw.length % 4)));
  } catch (e) { /* silent film */ }
  const hop = 0.1, nA = aud ? Math.floor(aud.length / 800) : 0, rms = new Float32Array(nA);
  for (let k = 0; k < nA; k++) { let e = 0; for (let i = k * 800; i < k * 800 + 800; i++) e += aud[i] * aud[i]; rms[k] = 10 * Math.log10(e / 800 + 1e-10); }
  const duration = nF / FPS;
  // the story starts at the first non-black frame
  let start = 0; while (start < nF - 1 && bright[start] < 8) start++;
  const t0 = start / FPS;
  // movement: a quarter of a percent of the picture changing a lot (the 12 fps pencil boil stays below 0.1%)
  const firstMotion = (() => { for (let k = start + 1; k < nF; k++) if (change[k] > 0.25) return k / FPS; return Infinity; })();
  const firstSound = (() => { for (let k = 0; k < nA; k++) if (rms[k] > -45) return k * hop; return Infinity; })();
  // cuts / pattern interrupts: frames where a quarter of the picture changes at once (or a local peak above 12%)
  const cuts = [];
  for (let k = start + 1; k < nF; k++) {
    const peak = change[k] >= (change[k - 1] || 0) && change[k] >= (change[k + 1] || 0);
    if ((change[k] > 25 || (peak && change[k] > 12)) && (!cuts.length || k / FPS - cuts[cuts.length - 1] > 0.4)) cuts.push(k / FPS);
  }
  const events3 = cuts.filter((c) => c < t0 + 3).length + (() => { let n = 0; for (let k = 2; k < Math.min(nA, (t0 + 3) / hop); k++) if (rms[k] - Math.min(rms[k - 1], rms[k - 2]) > 6 && rms[k] > -40) n++; return n; })();
  const bounds = [t0, ...cuts, duration];
  let longest = 0, longAt = t0;
  for (let i = 1; i < bounds.length; i++) if (bounds[i] - bounds[i - 1] > longest) { longest = bounds[i] - bounds[i - 1]; longAt = bounds[i - 1]; }
  const mean = (a, b) => { let s = 0, n = 0; for (let k = Math.floor(a / hop); k < Math.min(nA, b / hop); k++) { s += Math.pow(10, rms[k] / 10); n++; } return n ? 10 * Math.log10(s / n) : -99; };
  const intro = mean(t0, t0 + 3), whole = mean(t0, duration);
  // text on screen: from the score's subtitles / captions (muted viewers need words early)
  const texts = [...(SCORE.subtitles || []), ...(SCORE.captions || [])].map((c) => c.t).filter((x) => typeof x === 'number').sort((a, b) => a - b);
  const firstText = Math.min(texts.length ? texts[0] : Infinity, probedText ?? Infinity);
  const rows = [
    { ok: firstMotion - t0 <= 1, text: `first movement ${Number.isFinite(firstMotion) ? (firstMotion - t0).toFixed(2) + 's' : 'never'} after the picture starts (want ≤ 1s: feeds scroll past still openers)` },
    { ok: firstSound <= t0 + 1, text: `first sound at ${Number.isFinite(firstSound) ? firstSound.toFixed(2) + 's' : 'never'} (want ≤ 1s)` },
    { ok: events3 >= 2, text: `${events3} hits (cuts, big changes, sound onsets) in the first 3s (want ≥ 2)` },
    { ok: firstText <= t0 + 3, text: Number.isFinite(firstText) ? `first on-screen text at ${firstText.toFixed(2)}s (want ≤ 3s for muted viewers)` : 'no subtitles/captions in score.js (most people watch muted: add subtitles)' },
    { ok: duration < 20 || longest <= 12, text: `longest stretch without a cut: ${longest.toFixed(1)}s from ${longAt.toFixed(1)}s (want ≤ 12s)` },
    { ok: !aud || intro > whole - 12, text: aud ? `first 3s are ${(whole - intro).toFixed(1)} dB quieter than the film (want < 12 dB)` : 'no audio track' },
  ];
  // the graph
  const Wd = 1200, Hd = 260, X = (t) => 40 + (t / duration) * (Wd - 60);
  const pts = (arr, fps, scale, off) => Array.from(arr, (v, k) => `${X(k / fps).toFixed(1)},${(off - scale(v)).toFixed(1)}`).join(' ');
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${Wd}" height="${Hd}" font-family="system-ui,sans-serif" font-size="12"><rect width="100%" height="100%" fill="#fff"/>`;
  svg += `<rect x="${X(t0)}" y="10" width="${X(t0 + 3) - X(t0)}" height="${Hd - 40}" fill="#FFF3D6"/><text x="${X(t0) + 4}" y="24" fill="#B98500">hook (3s)</text>`;
  for (const c of cuts) svg += `<line x1="${X(c)}" y1="10" x2="${X(c)}" y2="${Hd - 30}" stroke="#E0703E" stroke-width="1.5" opacity="0.6"/>`;
  for (const x of texts) svg += `<circle cx="${X(x)}" cy="${Hd - 30}" r="4" fill="#3FA89B"/>`;
  svg += `<polyline fill="none" stroke="#27305C" stroke-width="1.5" points="${pts(change, FPS, (v) => Math.min(100, v) * 1.0, 130)}"/>`;
  if (nA) svg += `<polyline fill="none" stroke="#9BD17A" stroke-width="1.5" points="${pts(rms, 1 / hop, (v) => Math.max(0, v + 60) * 1.6, Hd - 32)}"/>`;
  for (let s = 0; s <= duration; s += 5) svg += `<text x="${X(s)}" y="${Hd - 10}" fill="#888">${s}s</text>`;
  svg += `<text x="${Wd - 330}" y="24" fill="#27305C">picture change</text><text x="${Wd - 230}" y="24" fill="#6BAF4B">sound level</text><text x="${Wd - 150}" y="24" fill="#E0703E">cuts</text><text x="${Wd - 110}" y="24" fill="#3FA89B">text</text></svg>`;
  return { rows, cuts, duration, svg };
}
module.exports.analyse = analyse;
