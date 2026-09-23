// THE FILM: a rainy window, a glass of chai, a cat on the sill, and the lyrics, all timed from beats.js.
// The city lights pulse on every bar, the steam puffs on every beat, the sky flashes as each lyric line
// lands, and the palette follows the song's sections (intro, verse, chorus…).
(function () {
  const U = globalThis.U, G = globalThis.G, Ch = globalThis.Ch, Subs = globalThis.Subs, S = globalThis.SCORE, Studio = globalThis.Studio;
  const { clamp, ease, pulse } = U;
  const { clock, A, lyrics } = S;
  const W = G.W, H = G.H;
  const PANE = { x: 70, y: 170, w: W - 140, h: 1330 };

  const lastOf = (list, t) => { let v = -Infinity; for (const x of list) { if (x <= t) v = x; else break; } return v; };
  const section = (t) => A.sections.find((s) => t >= s.t && t < s.end) || A.sections[A.sections.length - 1];
  const lineStarts = lyrics.map((l) => (l.words ? l.words[0].t : l.t));
  const PAL = { intro: ['#161B38', '#40305E'], verse: ['#1C2448', '#5A3A66'], chorus: ['#23305E', '#7A4A6E'], break: ['#141830', '#34284E'], outro: ['#11152C', '#2E2446'] };

  function sky(ctx, t) {
    const [a, b] = PAL[section(t).label] || PAL.verse;
    const g = ctx.createLinearGradient(0, PANE.y, 0, PANE.y + PANE.h);
    g.addColorStop(0, a); g.addColorStop(1, b);
    ctx.fillStyle = g; ctx.fillRect(PANE.x, PANE.y, PANE.w, PANE.h);
    // the city: dark blocks with lit windows
    for (let i = 0; i < 9; i++) {
      const bx = PANE.x + i * 110 - 20, bh = 300 + G.rnd(i, 1) * 420, by = PANE.y + PANE.h - bh;
      ctx.fillStyle = '#0E1022'; ctx.fillRect(bx, by, 104, bh);
      G.decor(() => { for (let k = 0; k < 18; k++) { if (G.rnd(i, k, 3) < 0.55) continue; ctx.fillStyle = G.rnd(i, k) < 0.5 ? '#F2C66B' : '#9FC4E8'; ctx.fillRect(bx + 12 + (k % 3) * 30, by + 30 + Math.floor(k / 3) * 55, 16, 24); } });
    }
    // bokeh: the lights of the street, swelling on every bar
    const bar = lastOf(A.bars, t), pb = bar > 0 ? pulse(t, bar, 3) : 0;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 34; i++) {
      const x = PANE.x + G.rnd(i, 7) * PANE.w, y = PANE.y + 500 + G.rnd(i, 8) * 780, r = (26 + G.rnd(i, 9) * 50) * (1 + 0.35 * pb);
      const col = ['255,196,110', '255,120,140', '140,200,255', '200,160,255'][i % 4];
      const gr = ctx.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, `rgba(${col},0.45)`); gr.addColorStop(1, `rgba(${col},0)`);
      ctx.fillStyle = gr; ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
    }
    ctx.restore();
    // rain outside
    ctx.save(); ctx.beginPath(); ctx.rect(PANE.x, PANE.y, PANE.w, PANE.h); ctx.clip();
    ctx.strokeStyle = 'rgba(200,220,255,0.35)'; ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 140; i++) { const x = PANE.x + G.rnd(i, 11) * PANE.w, y = PANE.y + ((t * 1300 + G.rnd(i, 12) * 4000) % (PANE.h + 120)) - 60; ctx.moveTo(x, y); ctx.lineTo(x - 6, y + 46); }
    ctx.stroke();
    ctx.restore();
    // lightning-soft: the sky flashes as each lyric line lands
    const ls = lastOf(lineStarts, t);
    if (ls > 0 && t - ls < 0.35) { ctx.fillStyle = `rgba(230,235,255,${0.5 * (1 - (t - ls) / 0.35)})`; ctx.fillRect(PANE.x, PANE.y, PANE.w, PANE.h); }
  }
  // drops sliding down the glass
  function glass(ctx, t) {
    ctx.save(); ctx.beginPath(); ctx.rect(PANE.x, PANE.y, PANE.w, PANE.h); ctx.clip();
    for (let i = 0; i < 26; i++) {
      const x = PANE.x + 30 + G.rnd(i, 21) * (PANE.w - 60), sp = 40 + G.rnd(i, 22) * 90;
      const y = PANE.y + ((t * sp + G.rnd(i, 23) * 2000) % (PANE.h + 80)) - 40;
      ctx.fillStyle = 'rgba(220,235,255,0.5)'; ctx.beginPath(); ctx.ellipse(x, y, 7, 10, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(220,235,255,0.18)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y - 10); ctx.lineTo(x + 2, y - 70); ctx.stroke();
    }
    ctx.restore();
  }
  function frame(ctx) {
    ctx.fillStyle = '#3A2A24'; ctx.fillRect(0, 0, W, PANE.y); ctx.fillRect(0, PANE.y, PANE.x, H); ctx.fillRect(PANE.x + PANE.w, PANE.y, W, H); ctx.fillRect(0, PANE.y + PANE.h, W, H);
    G.rrect(ctx, PANE.x - 26, PANE.y - 26, PANE.w + 52, PANE.h + 52, 10, { fill: null, stroke: '#7A5238', lw: 22, seed: 40, amp: 0.8 });
    G.line(ctx, [[W / 2, PANE.y], [W / 2, PANE.y + PANE.h]], { color: '#7A5238', lw: 16, seed: 41 });
    G.line(ctx, [[PANE.x, PANE.y + 560], [PANE.x + PANE.w, PANE.y + 560]], { color: '#7A5238', lw: 16, seed: 42 });
    G.rrect(ctx, 20, PANE.y + PANE.h + 10, W - 40, 70, 8, { fill: '#8E6444', lw: 4, seed: 43, hatch: { color: 'rgba(0,0,0,0.15)', gap: 8 } });
  }
  function sill(ctx, t) {
    const y = PANE.y + PANE.h + 12;
    // the cat, watching the rain; its tail keeps the beat
    Ch.cat(ctx, { x: 290, y, s: 1.75, t: clock.beatPos(t) * 0.9, look: 0.2, color: '#E09A4A' });
    // a glass of chai; the steam puffs on every beat
    const cx = 780;
    ctx.save(); ctx.translate(cx, y); ctx.scale(1.45, 1.45); ctx.translate(-cx, -y);
    G.poly(ctx, [[cx - 58, y - 150], [cx + 58, y - 150], [cx + 44, y], [cx - 44, y]], { fill: 'rgba(230,240,245,0.35)', lw: 4, seed: 50, step: 20 });
    G.poly(ctx, [[cx - 52, y - 118], [cx + 52, y - 118], [cx + 44, y - 4], [cx - 44, y - 4]], { fill: '#B5703A', lw: 0, seed: 51, step: 20 });
    G.ellipse(ctx, cx, y - 118, 52, 10, { fill: '#D9A06A', lw: 2, seed: 52 });
    const beat = Math.floor(clock.beatPos(t));
    for (let k = 0; k < 3; k++) {
      const age = clock.beatPos(t) - (beat - k), a = clamp(1 - age / 3);
      if (a <= 0) continue;
      ctx.save(); ctx.globalAlpha = 0.5 * a;
      const bx = cx + (k - 1) * 24, by = y - 140 - age * 70;
      G.line(ctx, [[bx, by + 60], [bx + 14 * Math.sin(age * 3 + k), by + 30], [bx - 10 * Math.sin(age * 2 + k), by]], { color: '#F4F1EA', lw: 6, seed: 60 + k });
      ctx.restore();
    }
    ctx.restore();
  }
  function titles(ctx, t) {
    const first = lineStarts[0] || 3;
    const a = clamp((t - 0.3) / 0.6) * (1 - clamp((t - (first - 0.8)) / 0.6));
    if (a > 0) {
      ctx.save(); ctx.globalAlpha = a;
      G.text(ctx, 'Chai aur Baarish', W / 2, 700, { size: 104, align: 'center', color: '#FFF1D6', stroke: '#1A1430', strokeW: 10 });
      G.text(ctx, 'چائے اور بارش', W / 2, 830, { size: 84, align: 'center', color: '#F2C66B', lang: 'ur' });
      ctx.restore();
    }
    const e = clamp((t - (A.duration - 3.2)) / 0.6);
    if (e > 0) {
      ctx.save(); ctx.globalAlpha = e;
      G.text(ctx, 'song, voice and picture', W / 2, 700, { size: 64, align: 'center', color: '#FFF1D6', fam: 'Patrick Hand', weight: 400 });
      G.text(ctx, 'all made in code', W / 2, 790, { size: 84, align: 'center', color: '#F2C66B' });
      ctx.restore();
    }
  }

  Studio.film({
    post: { vignette: 0.4, grain: 0.07, paper: 0.35 },
    fadeOut: 1.2,
    draw(ctx, t) {
      const z = 1 + 0.04 * ease.inOutQuad(clamp(t / A.duration));
      ctx.save(); ctx.translate(W / 2, H * 0.45); ctx.scale(z, z); ctx.translate(-W / 2, -H * 0.45);
      sky(ctx, t);
      glass(ctx, t);
      frame(ctx);
      sill(ctx, t);
      ctx.restore();
      titles(ctx, t);
      // the lyric line: karaoke on the sung word, the Urdu under it
      const cur = lyrics.find((l) => t >= l.t && t < l.end);
      if (cur) {
        const k = lineStarts[lyrics.indexOf(cur)], pop = ease.outBack(clamp((t - k + 0.05) / 0.25), 2);
        ctx.save(); ctx.translate(W / 2, 760); ctx.scale(0.8 + 0.2 * pop, 0.8 + 0.2 * pop); ctx.translate(-W / 2, -760);
        Subs.draw(ctx, t, lyrics, { style: 'karaoke', size: 66, y: 760, maxW: 860, color: '#FFF6E6' });
        ctx.restore();
      }
    },
  });
})();
