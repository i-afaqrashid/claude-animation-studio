// Subtitles / burned-in captions: one list, drawn word by word in the film AND exported as .srt/.vtt.
// Many people watch muted, and platforms read caption text for search, so every film should have them.
//
// score.js:  subtitles: [{ t, end, text, alt?, words?: [{ w, t }] }]
//   - words (optional): exact word times (the voiceover writes them into out/voice.json); otherwise the
//     line's time is shared out by word length.  alt: a second language line (e.g. Urdu) drawn under it.
// film.js:   Subs.draw(ctx, t, SCORE.subtitles, { style: 'pop' | 'karaoke' | 'box' | 'clean' })
// Node:      render.js srt  -> out/<name>.srt + .vtt ;  render.js mux --subs adds a soft subtitle track
(function () {
  const node = typeof module !== 'undefined' && typeof window === 'undefined';
  const Subs = {};

  // word timings for a line: given, or shared out by length (a short lead-in, a little air at the end)
  Subs.words = (line) => {
    if (line.words && line.words.length) return line.words.map((w, i, a) => ({ w: w.w, t: w.t, end: w.end ?? (a[i + 1] ? a[i + 1].t : line.end) }));
    const ws = String(line.text).split(/\s+/).filter(Boolean);
    const len = ws.reduce((a, w) => a + w.length + 2, 0);
    const span = Math.max(0.2, (line.end - line.t) * 0.92);
    let t = line.t;
    return ws.map((w) => { const d = (span * (w.length + 2)) / len; const o = { w, t, end: t + d }; t += d; return o; });
  };
  // subtitles from the film's own caption list (a fallback when no subtitles were written)
  Subs.fromCaptions = (captions) => (captions || []).filter((c) => c.text).map((c) => ({ t: c.t, end: c.end, text: c.text }));
  // subtitles from the voiceover (out/voice.json, loaded with Studio.loadJSON): exact word times, long
  // lines split into chunks of at most `maxWords` (breaking after punctuation when it can), each held
  // `hold` seconds after its last word (but never over the next chunk)
  Subs.fromVoice = (vo, { maxWords = 7, hold = 0.5 } = {}) => {
    const out = [];
    for (const l of (vo && vo.lines) || []) {
      if (l.display) { out.push({ t: l.t, end: l.end + hold, text: l.display, ...(l.alt ? { alt: l.alt } : {}), ...(l.who ? { who: l.who } : {}) }); continue; }
      const ws = l.words && l.words.length ? l.words : Subs.words(l);
      let i = 0;
      while (i < ws.length) {
        let n = Math.min(maxWords, ws.length - i);
        if (ws.length - i > maxWords) { for (let k = n; k >= Math.ceil(maxWords / 2); k--) if (/[,.;:!?،۔]$/.test(ws[i + k - 1].w)) { n = k; break; } }
        const chunk = ws.slice(i, i + n);
        out.push({ t: chunk[0].t, end: chunk[chunk.length - 1].end + hold, text: chunk.map((w) => w.w).join(' '), words: chunk, ...(l.who ? { who: l.who } : {}), ...(l.alt && i === 0 ? { alt: l.alt } : {}) });
        i += n;
      }
    }
    for (let k = 0; k + 1 < out.length; k++) out[k].end = Math.min(out[k].end, out[k + 1].t);
    return out;
  };
  // lip-sync from the voiceover: { open 0..1, wide 0..1, talking } at time t. With `who`, only lines
  // spoken by that character move its mouth. Feed it to a character: Ch.draw(ctx, { …, mouth: Subs.mouth(VO, t, 'mum') })
  Subs.mouth = (vo, t, who) => {
    const none = { open: 0, wide: 0.5, talking: false };
    if (!vo || !vo.mouth) return none;
    const line = (vo.lines || []).find((l) => t >= l.t - 0.05 && t <= l.end + 0.05);
    if (!line || (who && line.who && line.who !== who) || (who && !line.who && who !== true)) return none;
    const M = vo.mouth, f = t * M.fps, i = Math.floor(f), u = f - i;
    const at = (arr, j) => arr[Math.max(0, Math.min(arr.length - 1, j))] ?? 0;
    return { open: at(M.open, i) * (1 - u) + at(M.open, i + 1) * u, wide: at(M.wide, i) * (1 - u) + at(M.wide, i + 1) * u, talking: true };
  };

  const stamp = (s, sep) => {
    const ms = Math.max(0, Math.round(s * 1000));
    const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000), sec = Math.floor((ms % 60000) / 1000), r = ms % 1000;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}${sep}${String(r).padStart(3, '0')}`;
  };
  Subs.toSRT = (subs) => subs.map((s, i) => `${i + 1}\n${stamp(s.t, ',')} --> ${stamp(s.end, ',')}\n${s.text}${s.alt ? '\n' + s.alt : ''}\n`).join('\n');
  Subs.toVTT = (subs) => 'WEBVTT\n\n' + subs.map((s) => `${stamp(s.t, '.')} --> ${stamp(s.end, '.')}\n${s.text}${s.alt ? '\n' + s.alt : ''}\n`).join('\n');

  // ---------- drawing (browser) ----------
  if (!node) {
    const G = globalThis.G;
    // wrap words into lines no wider than maxW
    const wrap = (ctx, words, size, font, maxW) => {
      const lines = [[]];
      let w = 0;
      const sp = Math.max(G.measure(ctx, ' ', size, font, 800), size * 0.3);
      for (const wd of words) {
        const ww = G.measure(ctx, wd.w, size, font, 800);
        if (lines[lines.length - 1].length && w + sp + ww > maxW) { lines.push([]); w = 0; }
        lines[lines.length - 1].push(wd);
        w += (w ? sp : 0) + ww;
      }
      return lines;
    };
    Subs.draw = (ctx, t, subs, o = {}) => {
      if (!subs || !subs.length) return;
      const line = subs.find((s) => t >= s.t && t < s.end + 0.15);
      if (!line) return;
      const tall = G.H > G.W * 1.2;
      const S = G.SAFE;
      const style = o.style || 'pop';
      const size = o.size || Math.round(Math.min(G.W, G.H) * (tall ? 0.062 : 0.052));
      const brandFont = globalThis.Studio && Studio.brand && Studio.brand.fonts && (Studio.brand.fonts.body || Studio.brand.fonts.display);
      const hi = o.highlight || '#FFD23F';
      const color = o.color || '#FFFFFF';
      const maxW = o.maxW || S.w * 0.92;
      const cx = o.x ?? S.x + S.w / 2;
      const baseY = o.y ?? (tall ? S.y + S.h - size * 1.2 : S.y + S.h - size * 0.8);
      const words = Subs.words(line);
      const cur = words.filter((w) => t >= w.t).length - 1;
      const out = Math.min(1, Math.max(0, (t - line.end) / 0.15));
      const fontName = o.fam || (brandFont && brandFont.family) || 'Inter';
      const lines = wrap(ctx, words, size, fontName, maxW);
      const lh = size * 1.22;
      const y0 = baseY - (lines.length - 1) * lh - (line.alt ? size * 0.9 : 0);
      ctx.save();
      ctx.globalAlpha *= 1 - out;
      if (style === 'box') {
        const widest = Math.max(...lines.map((l) => G.measure(ctx, l.map((w) => w.w).join(' '), size, fontName, 800)));
        ctx.fillStyle = 'rgba(0,0,0,0.62)';
        ctx.beginPath(); ctx.roundRect(cx - widest / 2 - size * 0.5, y0 - size * 1.02, widest + size, lines.length * lh + size * 0.45 + (line.alt ? size * 1.1 : 0), size * 0.3); ctx.fill();
      }
      let k = 0;
      lines.forEach((ln, li) => {
        const sp = Math.max(G.measure(ctx, ' ', size, fontName, 800), size * 0.3); // a real word gap, and room for the popped word
        const widths = ln.map((w) => G.measure(ctx, w.w, size, fontName, 800));
        const total = widths.reduce((a, b) => a + b, 0) + sp * (ln.length - 1);
        let x = cx - total / 2;
        const y = y0 + li * lh;
        ln.forEach((w, wi) => {
          const idx = k++;
          const spoken = idx <= cur;
          if (style === 'pop' && !spoken) { x += widths[wi] + sp; return; } // words appear as they are said
          const isCur = idx === cur;
          const pop = style === 'pop' && isCur ? 1 + 0.18 * Math.max(0, 1 - (t - w.t) / 0.12) : 1;
          if (style === 'karaoke' && isCur) { ctx.fillStyle = hi; ctx.beginPath(); ctx.roundRect(x - size * 0.12, y - size * 0.88, widths[wi] + size * 0.24, size * 1.12, size * 0.2); ctx.fill(); }
          ctx.save();
          ctx.translate(x, y - size * 0.35); ctx.scale(pop, pop); ctx.translate(-x, -(y - size * 0.35)); // pops from its left edge, never into the word before
          const fill = style === 'karaoke' ? (isCur ? '#111111' : color) : style === 'pop' && isCur ? hi : color;
          const stroke = style === 'box' || (style === 'karaoke' && isCur) ? null : '#000000';
          if (style === 'clean') { ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = size * 0.25; }
          G.text(ctx, w.w, x, y, { size, fam: fontName, weight: 800, color: fill, stroke: style === 'clean' ? null : stroke, strokeW: size * 0.2, boil: 0 });
          ctx.restore();
          x += widths[wi] + sp;
        });
      });
      if (line.alt) G.text(ctx, line.alt, cx, y0 + lines.length * lh + size * 0.1, { size: Math.round(size * 0.78), fam: fontName, weight: 700, color, stroke: style === 'box' ? null : '#000000', strokeW: size * 0.16, align: 'center', boil: 0 });
      ctx.restore();
    };
  }

  if (node) module.exports = Subs; else globalThis.Subs = Subs;
})();
