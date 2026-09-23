// node engine/render.js qa [t …] [--every 1]  -> visual QA of every drawn word + out/qa.png
// For frames every second (and one frame after each marker) it checks all text the film draws:
//   outside the safe area (platform buttons/captions would cover it) · too small to read on a phone ·
//   overlapping other text · low contrast against what is behind it (outlined text is exempt).
// out/qa.png shows the frames with problems: red = outside safe area, orange = too small,
// purple = overlap, blue = low contrast; the green frame is the safe area.
const ANNOTATE_JS = `((t, issues) => {
  window.renderAt(t, 'none', 0.5);
  const src = document.getElementById('c'), k = src.width / G.W;
  const c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
  const x = c.getContext('2d'); x.drawImage(src, 0, 0);
  const S = G.SAFE;
  x.strokeStyle = 'rgba(40,200,90,0.9)'; x.setLineDash([8, 6]); x.lineWidth = 2; x.strokeRect(S.x * k, S.y * k, S.w * k, S.h * k); x.setLineDash([]);
  const col = { safe: '#FF2D2D', small: '#FF9A1F', overlap: '#B04CFF', contrast: '#2D8CFF' };
  for (const it of issues) { x.strokeStyle = col[it.kind]; x.lineWidth = 3; x.strokeRect(it.x * k - 2, it.y * k - 2, it.w * k + 4, it.h * k + 4); }
  x.fillStyle = 'rgba(0,0,0,0.7)'; x.fillRect(0, 0, 150, 34); x.fillStyle = '#FFF'; x.font = '700 20px system-ui'; x.fillText(t.toFixed(2) + 's', 10, 24);
  return c.toDataURL('image/png');
})`;

module.exports = async function qa(C, _mode, args) {
  const { fs, path, OUT, DURATION, FPS, FW, FH, MARKERS } = C;
  const every = parseFloat((() => { const i = args.indexOf('--every'); return i >= 0 ? args[i + 1] : '1'; })());
  const pos = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--every');
  let ts = pos.map(C.parseTime);
  if (!ts.length) {
    for (let t = 0.5; t < DURATION - 0.3; t += every) ts.push(+t.toFixed(3));
    for (const m of Object.values(MARKERS)) { const t = (typeof m === 'number' ? m : m.t) + 1.5 / FPS; if (t < DURATION) ts.push(+t.toFixed(3)); }
    ts = [...new Set(ts)].sort((a, b) => a - b);
  }
  const short = Math.min(FW, FH);
  const MIN_SIZE = short * 0.015; // ~16 px on a 1080-wide frame: unreadable on a phone below this
  const WARN_SIZE = short * 0.021; // ~23 px: small but legible (reported as a count only)
  const S = require('../util').safeArea(FW, FH);
  const inside = (b) => b.x >= S.x - 4 && b.y >= S.y - 4 && b.x + b.w <= S.x + S.w + 4 && b.y + b.h <= S.y + S.h + 4;
  const edge = (b) => [b.y < S.y ? 'top' : '', b.y + b.h > S.y + S.h ? 'bottom' : '', b.x < S.x ? 'left' : '', b.x + b.w > S.x + S.w ? 'right' : ''].filter(Boolean).join('/');
  const area = (b) => Math.max(0, b.w) * Math.max(0, b.h);
  const inter = (a, b) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  await C.serve();
  const w = await C.openWorker('qa');
  const found = [], shots = [];
  let smallCount = 0;
  for (const t of ts) {
    const texts = (await C.evaluate(w.c, `window.probeAt(${t}, 0.5)`)).filter((x) => x.onscreen && x.alpha > 0.35 && x.w > 1);
    const issues = [];
    for (const x of texts) {
      if (!inside(x)) issues.push({ kind: 'safe', ...x, msg: `"${x.text.slice(0, 40)}" crosses the safe area (${edge(x)})` });
      if (x.size < MIN_SIZE && x.text.replace(/\s/g, '').length >= 4) issues.push({ kind: 'small', ...x, msg: `"${x.text.slice(0, 40)}" is ${x.size.toFixed(0)} px (under ${MIN_SIZE.toFixed(0)} px: unreadable on a phone)` });
      else if (x.size < WARN_SIZE) smallCount++;
      if (!x.outlined && x.contrast && x.contrast < 3 && x.size >= MIN_SIZE) issues.push({ kind: 'contrast', ...x, msg: `"${x.text.slice(0, 40)}" contrast ${x.contrast}:1 against what is behind it (want ≥ 3:1)` });
    }
    for (let i = 0; i < texts.length; i++) for (let j = i + 1; j < texts.length; j++) {
      const a = texts[i], b = texts[j];
      if (a.text === b.text && Math.abs(a.x - b.x) < 6 && Math.abs(a.y - b.y) < 6) continue; // the same word drawn twice (shadow, glow)
      const ov = inter(a, b);
      if (ov > 0.3 * Math.min(area(a), area(b))) issues.push({ kind: 'overlap', ...(area(a) < area(b) ? a : b), msg: `"${a.text.slice(0, 24)}" overlaps "${b.text.slice(0, 24)}"` });
    }
    if (issues.length) {
      found.push(...issues.map((i) => ({ t, ...i })));
      if (shots.length < 12) shots.push(await C.evaluate(w.c, `${ANNOTATE_JS}(${t}, ${JSON.stringify(issues.map(({ kind, x, y, w: ww, h }) => ({ kind, x, y, w: ww, h })))})`));
    }
  }
  w.close();
  // group identical problems across frames ("from 3.00s to 7.00s")
  const groups = new Map();
  for (const f of found) { const key = `${f.kind}|${f.msg}`; const g = groups.get(key) || { kind: f.kind, msg: f.msg, ts: [] }; g.ts.push(f.t); groups.set(key, g); }
  const label = { safe: 'SAFE AREA', small: 'TOO SMALL', overlap: 'OVERLAP', contrast: 'CONTRAST' };
  console.log(`visual QA: ${ts.length} frames, ${groups.size} distinct problems${smallCount ? ` (+${smallCount} small-but-legible texts, fine inside phone mockups)` : ''}`);
  const order = { safe: 0, overlap: 1, contrast: 2, small: 3 };
  for (const g of [...groups.values()].sort((a, b) => order[a.kind] - order[b.kind] || b.ts.length - a.ts.length || a.ts[0] - b.ts[0])) {
    const range = g.ts.length > 1 ? `${g.ts[0].toFixed(2)}–${g.ts[g.ts.length - 1].toFixed(2)}s (${g.ts.length} frames)` : `${g.ts[0].toFixed(2)}s (1 frame: maybe mid-transition)`;
    console.log(`⚠ ${label[g.kind].padEnd(9)} ${range}: ${g.msg}`);
  }
  if (!groups.size) console.log('✓ no text outside the safe area, too small, overlapping or low in contrast');
  if (shots.length) {
    const dir = path.join(OUT, `.qa-${process.pid}`);
    fs.mkdirSync(dir, { recursive: true });
    shots.forEach((u, i) => fs.writeFileSync(path.join(dir, `q${String(i).padStart(2, '0')}.png`), Buffer.from(u.slice(u.indexOf(',') + 1), 'base64')));
    const cols = Math.min(4, shots.length);
    C.execFileSync(C.FFMPEG, ['-v', 'error', '-y', '-i', path.join(dir, 'q%02d.png'), '-vf', `${C.thumb(480)},tile=${cols}x${Math.ceil(shots.length / cols)}:padding=6:color=white`, '-frames:v', '1', path.join(OUT, 'qa.png')]);
    fs.rmSync(dir, { recursive: true, force: true });
    console.log('annotated frames: out/qa.png (red safe area · orange too small · purple overlap · blue contrast)');
  }
};
