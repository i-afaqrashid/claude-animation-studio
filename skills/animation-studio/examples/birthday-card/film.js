// THE FILM: a watercolour birthday card (STYLE in score.js). Every frame is a pure function of t.
(function () {
  const U = globalThis.U, G = globalThis.G, Ch = globalThis.Ch, Subs = globalThis.Subs, S = globalThis.SCORE, Studio = globalThis.Studio;
  const { clamp, lerp, ease } = U;
  const { T, BEAT, ev, clock } = S;
  const W = G.W, H = G.H;
  const CAKE = { x: W / 2, y: 820 };
  const BALLOON = ['#E8718D', '#F2B84B', '#3FA89B', '#B79CFF', '#E0703E'];

  const bob = (t) => (t >= S.notes[0].t && t < ev.blow + 1 ? Math.abs(Math.sin(Math.PI * clock.beatPos(t))) : 0);
  function bunting(ctx, t) {
    const pts = []; for (let i = 0; i <= 12; i++) { const u = i / 12; pts.push([u * W, 70 + 90 * 4 * u * (1 - u)]); }
    G.line(ctx, pts, { color: '#8E6444', lw: 3, seed: 10 });
    for (let i = 0; i < 11; i++) {
      const u = (i + 0.5) / 12, x = u * W, y = 70 + 90 * 4 * u * (1 - u), sw = 0.08 * Math.sin(t * 2 + i);
      ctx.save(); ctx.translate(x, y); ctx.rotate(sw);
      G.poly(ctx, [[-34, 0], [34, 0], [0, 70]], { fill: BALLOON[i % 5], lw: 3, seed: 20 + i, step: 14 });
      ctx.restore();
    }
  }
  function balloon(ctx, x, y, col, seed, t) {
    const sway = Math.sin(t * 1.6 + seed) * 10;
    G.line(ctx, [[x + sway, y + 95], [x + sway * 0.3 + 10, y + 180], [x, y + 260]], { color: '#6B5A4A', lw: 2.5, seed: seed + 1, step: 20 });
    G.ellipse(ctx, x + sway, y, 70, 88, { fill: col, lw: 3.5, seed });
    G.poly(ctx, [[x + sway - 10, y + 88], [x + sway + 10, y + 88], [x + sway, y + 100]], { fill: col, lw: 3, seed: seed + 2, step: 8 });
    ctx.save(); ctx.globalAlpha = 0.5; ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.ellipse(x + sway - 24, y - 34, 12, 22, -0.4, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
  function balloons(ctx, t) {
    ev.haps.forEach((t0, i) => {
      if (t < t0) return;
      const u = ease.outCubic(clamp((t - t0) / 1.4));
      const x = [190, 890, 130, 950][i % 4], y = lerp(1250, [380, 330, 560, 520][i % 4], u);
      balloon(ctx, x, y, BALLOON[i % 5], 100 + i * 10, t);
    });
  }
  function cake(ctx, t) {
    const { x, y } = CAKE;
    G.ellipse(ctx, x, y + 150, 330, 44, { fill: '#F6F0E2', lw: 3.5, seed: 200 }); // the plate
    G.rrect(ctx, x - 260, y + 10, 520, 150, 22, { fill: '#E8A0B4', lw: 4, seed: 201 });
    G.rrect(ctx, x - 190, y - 110, 380, 130, 20, { fill: '#F6D6DE', lw: 4, seed: 202 });
    // icing drips and sprinkles
    for (let i = 0; i < 9; i++) G.ellipse(ctx, x - 230 + i * 57, y + 22, 22, 18 + (i % 3) * 8, { fill: '#FFF6F0', lw: 0, seed: 210 + i });
    G.decor(() => { for (let i = 0; i < 26; i++) { ctx.fillStyle = BALLOON[i % 5]; ctx.save(); ctx.translate(x - 230 + G.rnd(i, 1) * 460, y + 60 + G.rnd(i, 2) * 80); ctx.rotate(G.rnd(i, 3) * 3); ctx.fillRect(-8, -2.5, 16, 5); ctx.restore(); } });
    // candles: lit one by one in the intro, blown out on the last note
    const n = S.AGE;
    for (let i = 0; i < n; i++) {
      const cx = x - 150 + (300 * (i + 0.5)) / n, cy = y - 110;
      G.rrect(ctx, cx - 8, cy - 70, 16, 72, 5, { fill: BALLOON[i % 5], lw: 2.5, seed: 230 + i });
      const lit = t >= ev.candles[i] && t < ev.blow;
      if (lit) {
        const fl = 1 + 0.12 * Math.sin(t * 23 + i * 2) + 0.06 * Math.sin(t * 37 + i);
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createRadialGradient(cx, cy - 90, 0, cx, cy - 90, 60); g.addColorStop(0, 'rgba(255,200,90,0.5)'); g.addColorStop(1, 'rgba(255,200,90,0)');
        ctx.fillStyle = g; ctx.fillRect(cx - 60, cy - 150, 120, 120);
        ctx.restore();
        G.shape(ctx, [[cx, cy - 112 * fl], [cx + 10, cy - 88], [cx, cy - 74], [cx - 10, cy - 88]], { fill: '#FFB43C', lw: 2, seed: 240 + i, amp: 0.5 });
      }
      if (t >= ev.blow && t < ev.blow + 2.5) { // smoke curls
        const a = t - ev.blow;
        ctx.save(); ctx.globalAlpha = Math.max(0, 0.6 - a * 0.25);
        G.line(ctx, [[cx, cy - 74], [cx + 10 * Math.sin(a * 3 + i), cy - 110 - a * 40], [cx - 8 * Math.sin(a * 4 + i), cy - 150 - a * 70]], { color: '#9A9AA0', lw: 4, seed: 250 + i });
        ctx.restore();
      }
    }
  }
  // the name stamps in, one sung syllable at a time
  function name(ctx, t) {
    const size = S.NAME.length > 8 ? 120 : 150;
    const parts = ev.name;
    const full = parts.map((p) => p.text).join('');
    const disp = (s) => s.charAt(0).toUpperCase() + s.slice(1);
    let x = W / 2 - G.measure(ctx, disp(full), size, 'Caveat', 700) / 2;
    parts.forEach((p, i) => {
      const txt = i === 0 ? disp(p.text) : p.text;
      const w = G.measure(ctx, txt, size, 'Caveat', 700);
      const pop = t >= p.t ? ease.outBack(clamp((t - p.t) / 0.25), 3) : 0;
      if (pop > 0) {
        ctx.save(); ctx.translate(x + w / 2, 520); ctx.scale(pop, pop); ctx.rotate(-0.04 + i * 0.03);
        G.text(ctx, txt, 0, 0, { size, align: 'center', color: ['#D1495B', '#2E86AB', '#E8A33C', '#3FA89B'][i % 4] });
        ctx.restore();
      }
      x += w;
    });
  }
  function titles(ctx, t) {
    const a = clamp((t - 0.3) / 0.8);
    ctx.save(); ctx.globalAlpha = a;
    G.text(ctx, 'Happy Birthday', W / 2, 330, { size: 110, align: 'center', color: '#8E3B5E' });
    ctx.restore();
  }
  function pets(ctx, t) {
    const b = bob(t) * 14;
    Ch.dog(ctx, { x: 175, y: 1000 - b, s: 0.8, t, happy: t >= ev.blow ? 1 : 0.6, color: '#C98A4B' });
    partyHat(ctx, 175, 1000 - b - 0.8 * 205, '#3FA89B', 1);
    Ch.cat(ctx, { x: 905, y: 1000 - bob(t + BEAT / 2) * 10, s: 0.8, t, look: -0.6, meow: t >= ev.blow + 0.4 && t < ev.blow + 1 ? 0.8 : 0 });
    partyHat(ctx, 905, 1000 - bob(t + BEAT / 2) * 10 - 0.8 * 175, '#E8718D', 2);
  }
  function partyHat(ctx, x, y, col, seed) {
    G.poly(ctx, [[x - 34, y], [x + 34, y], [x, y - 90]], { fill: col, lw: 3, seed: 300 + seed, step: 16 });
    G.ellipse(ctx, x, y - 92, 12, 12, { fill: '#F2B84B', lw: 2.5, seed: 310 + seed });
  }

  Studio.film({
    fadeOut: 1,
    draw(ctx, t) {
      G.bg(ctx, '#F7EFE3');
      bunting(ctx, t);
      balloons(ctx, t);
      titles(ctx, t);
      name(ctx, t);
      cake(ctx, t);
      pets(ctx, t);
      if (t >= ev.blow) G.confetti(ctx, t, ev.blow, { n: 160, seed: 4 });
      // a camera flash on the blow (the birthday photo)
      if (t >= ev.blow && t < ev.blow + 0.3) { ctx.fillStyle = `rgba(255,250,240,${0.8 * (1 - (t - ev.blow) / 0.3)})`; ctx.fillRect(0, 0, W, G.H); }
      Subs.draw(ctx, t, S.subtitles, { style: 'clean', size: 44, color: '#5A3A4A', y: G.SAFE.y + G.SAFE.h - 20 });
    },
  });
})();
