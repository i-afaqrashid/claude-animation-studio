// node engine/render.js poster [@t …] [--title "Price?"] [--sub "Show the price"]
//   -> out/poster-1..3.png (1280x720 YouTube thumbnails, three layouts for Test & Compare),
//      out/posters.png (all three side by side) and, for tall films, out/cover.png (1080x1920 Reels/TikTok cover).
// What wins clicks (thumbnail CTR studies): one dominant subject, high contrast, ≤ 5 words of bold text that
// still reads when the thumbnail is ~210 px wide on a phone. Frames default to the film's sync markers
// (its hits), else three moments across the film. Title/sub default to score.js `poster`, then brand.json.
const POSTER_JS = `(async (items, o) => {
  const src = document.getElementById('c');
  const tall = src.height > src.width;
  const fam = o.font;
  const fit = (x, text, maxW, start, weight) => { let s = start; do { x.font = weight + ' ' + s + 'px ' + fam; if (x.measureText(text).width <= maxW) break; s -= 3; } while (s > 18); return s; };
  const wrap2 = (x, text, maxW, size, weight) => {
    x.font = weight + ' ' + size + 'px ' + fam;
    if (x.measureText(text).width <= maxW) return [text];
    const w = text.split(/\\s+/); let best = [text, ''], score = 1e9;
    for (let i = 1; i < w.length; i++) { const a = w.slice(0, i).join(' '), b = w.slice(i).join(' '); const m = Math.max(x.measureText(a).width, x.measureText(b).width); if (m < score) { score = m; best = [a, b]; } }
    return best;
  };
  const frame = (x, it, W, H) => {
    window.renderAt(it.t, 'none', 1);
    const z = it.zoom || 1, fx = it.fx ?? 0.5, fy = it.fy ?? 0.45;
    x.save();
    if (!tall || W / H < 1) {
      const r = W / H, sw0 = Math.min(src.width, src.height * r), sh0 = sw0 / r, sw = sw0 / z, sh = sh0 / z;
      const sx = Math.min(src.width - sw, Math.max(0, fx * src.width - sw / 2)), sy = Math.min(src.height - sh, Math.max(0, fy * src.height - sh / 2));
      x.filter = 'saturate(1.25) contrast(1.08)'; x.drawImage(src, sx, sy, sw, sh, 0, 0, W, H);
    } else {
      x.filter = 'blur(26px) saturate(1.3) brightness(0.62)';
      x.drawImage(src, 0, src.height * 0.2, src.width, src.width * H / W, -60, -60, W + 120, H + 120);
      x.filter = 'saturate(1.25) contrast(1.08)';
      const fw = H * src.width / src.height;
      x.shadowColor = 'rgba(0,0,0,0.5)'; x.shadowBlur = 30; x.drawImage(src, W - fw - 36, 0, fw, H);
    }
    x.restore();
  };
  const outs = [];
  items.forEach((it, i) => {
    const W = 1280, H = 720, c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d');
    frame(x, it, W, H);
    const area = tall ? 780 : 1160, left = 56, layout = i % 3;
    const title = o.title, sub = o.sub;
    x.lineJoin = 'round';
    if (layout === 0) { // gradient + bold title bottom-left + accent underline
      const g = x.createLinearGradient(0, H * 0.45, 0, H); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.78)');
      x.fillStyle = g; x.fillRect(0, 0, W, H);
      const lines = wrap2(x, title, area, 120, 900), s = Math.min(...lines.map((l) => fit(x, l, area, 132, 900)));
      x.font = '900 ' + s + 'px ' + fam; x.fillStyle = '#FFFFFF';
      lines.forEach((l, k) => x.fillText(l, left, H - 70 - (lines.length - 1 - k) * s * 1.02 - (sub ? 46 : 0)));
      x.fillStyle = o.accent; x.fillRect(left, H - 52 - (sub ? 46 : 0), Math.min(area, 260), 12);
      if (sub) { x.font = '700 38px ' + fam; x.fillStyle = '#FFFFFF'; x.fillText(sub, left, H - 30); }
    } else if (layout === 1) { // a solid brand block with the title, slightly rotated
      const lines = wrap2(x, title, area - 60, 104, 900), s = Math.min(...lines.map((l) => fit(x, l, area - 60, 112, 900)));
      x.font = '900 ' + s + 'px ' + fam;
      const bw = Math.max(...lines.map((l) => x.measureText(l).width)) + 60, bh = lines.length * s * 1.05 + 40;
      x.save(); x.translate(left, 56); x.rotate(-0.03);
      x.shadowColor = 'rgba(0,0,0,0.35)'; x.shadowBlur = 24; x.fillStyle = o.accent; x.fillRect(0, 0, bw, bh); x.shadowColor = 'transparent';
      x.fillStyle = o.onAccent; lines.forEach((l, k) => x.fillText(l, 30, 20 + s * 0.86 + k * s * 1.05));
      x.restore();
      if (sub) { x.font = '800 40px ' + fam; x.lineWidth = 10; x.strokeStyle = '#000'; x.strokeText(sub, left, H - 48); x.fillStyle = '#FFF'; x.fillText(sub, left, H - 48); }
    } else { // a huge hook word (or two) with a thick outline
      const hook = title.split(/\\s+/).slice(0, 2).join(' ').toUpperCase();
      const s = fit(x, hook, area, 200, 900);
      x.save(); x.translate(left + 6, H * 0.56); x.rotate(-0.06);
      x.font = '900 ' + s + 'px ' + fam; x.lineWidth = s * 0.16; x.strokeStyle = '#000'; x.strokeText(hook, 0, 0);
      x.fillStyle = o.hook; x.fillText(hook, 0, 0);
      x.restore();
      const rest = title.split(/\\s+/).slice(2).join(' ') || sub;
      if (rest) { const s2 = fit(x, rest, area, 56, 800); x.font = '800 ' + s2 + 'px ' + fam; x.lineWidth = 10; x.strokeStyle = '#000'; x.strokeText(rest, left + 10, H * 0.56 + s2 * 1.4); x.fillStyle = '#FFF'; x.fillText(rest, left + 10, H * 0.56 + s2 * 1.4); }
    }
    outs.push(c.toDataURL('image/png'));
  });
  let cover = null;
  if (tall) { // a vertical cover: the first frame + the title inside the safe area
    const W = src.width, H = src.height, c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d');
    window.renderAt(items[0].t, 'none', 1);
    x.filter = 'saturate(1.2) contrast(1.06)'; x.drawImage(src, 0, 0); x.filter = 'none';
    const S = G.SAFE, lines = wrap2(x, o.title, S.w - 40, 120, 900), s = Math.min(...lines.map((l) => fit(x, l, S.w - 40, 130, 900)));
    x.font = '900 ' + s + 'px ' + fam; x.textAlign = 'center';
    const y0 = S.y + s * 1.05;
    x.fillStyle = 'rgba(0,0,0,0.55)'; x.fillRect(0, S.y - 20, W, lines.length * s * 1.1 + 60);
    x.fillStyle = '#FFFFFF'; lines.forEach((l, k) => x.fillText(l, W / 2, y0 + k * s * 1.1));
    cover = c.toDataURL('image/png');
  }
  return { outs, cover };
})`;

module.exports = async function poster(C, _mode, args) {
  const { fs, path, OUT, ROOT, SCORE, MARKERS, DURATION, FPS } = C;
  const flag = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
  const pos = args.filter((a, i) => !a.startsWith('--') && !['--title', '--sub'].includes(args[i - 1]));
  let brand = null;
  try { brand = JSON.parse(fs.readFileSync(path.join(ROOT, 'brand.json'), 'utf8')); } catch (e) { /* none */ }
  const P = SCORE.poster || {};
  const title = flag('--title') || P.title || (brand && brand.name) || path.basename(ROOT).replace(/[-_]/g, ' ');
  const sub = flag('--sub') || P.sub || (brand && brand.tagline && brand.tagline.length < 40 ? brand.tagline : '');
  // frames: arguments, score.js poster.frames, the sync markers (the film's hits), or three moments
  let ts = pos.map(C.parseTime);
  if (!ts.length && P.frames) ts = P.frames.map(C.parseTime);
  if (!ts.length) ts = Object.values(MARKERS).filter((m) => typeof m === 'object' && m.sync).map((m) => m.t + 0.35).slice(-3);
  if (!ts.length) ts = [0.3, 0.55, 0.8].map((f) => DURATION * f);
  while (ts.length < 3) ts.push(ts[ts.length - 1]);
  ts = ts.slice(0, 3).map((t) => Math.min(DURATION - 1 / FPS, Math.max(0, t)));
  const words = title.trim().split(/\s+/).length;
  const bf = brand && brand.fonts && (brand.fonts.display || brand.fonts.body);
  const o = { title, sub, font: `${bf ? '"' + bf.family + '", ' : ''}"Inter", system-ui, sans-serif`, accent: (brand && brand.colors && brand.colors.primary) || '#E0703E', onAccent: (brand && brand.colors && brand.colors.onPrimary) || '#FFFFFF', hook: '#FFD23F' };
  await C.serve();
  const w = await C.openWorker('poster');
  const res = await C.evaluate(w.c, `${POSTER_JS}(${JSON.stringify(ts.map((t) => ({ t, ...(P.focus || {}) })))}, ${JSON.stringify(o)})`);
  w.close();
  const save = (name, url) => fs.writeFileSync(path.join(OUT, name), Buffer.from(url.slice(url.indexOf(',') + 1), 'base64'));
  res.outs.forEach((u, i) => save(`poster-${i + 1}.png`, u));
  if (res.cover) save('cover.png', res.cover);
  C.execFileSync(C.FFMPEG, ['-v', 'error', '-y', ...res.outs.flatMap((_, i) => ['-i', path.join(OUT, `poster-${i + 1}.png`)]), '-filter_complex', `${res.outs.map((_, i) => `[${i}]scale=640:-2[s${i}]`).join(';')};${res.outs.map((_, i) => `[s${i}]`).join('')}hstack=inputs=${res.outs.length}`, path.join(OUT, 'posters.png')]);
  console.log(`thumbnails: out/poster-1.png … poster-${res.outs.length}.png (1280x720) + out/posters.png${res.cover ? ' + out/cover.png (vertical cover)' : ''}`);
  console.log(`title "${title}"${sub ? `, sub "${sub}"` : ''}, frames at ${ts.map((t) => t.toFixed(2) + 's').join(', ')}`);
  if (words > 5) console.log(`⚠ the title has ${words} words: thumbnails that win use 5 or fewer (set score.js poster.title or --title)`);
};
