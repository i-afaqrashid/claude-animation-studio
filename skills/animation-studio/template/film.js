// THE FILM — draws frame t. Everything is a pure function of t (no state), so any frame
// can be rendered in any order by any worker, and it always lines up with song.js.
(function () {
  const U = globalThis.U, G = globalThis.G, Ch = globalThis.Ch, S = globalThis.SCORE, Studio = globalThis.Studio;
  const { BEAT, ev, clock } = S;
  const { clamp, lerp, ease, pulse } = U;
  const W = G.W, H = G.H;
  const GROUND = 860;

  const hop = (t, amp) => amp * Math.sin(Math.PI * clock.phase(t)); // 0 on every beat
  const squash = (t) => Math.max(0, 1 - clock.phase(t) * 5); // 1 right on the beat

  function background(ctx, t) {
    const drop = t >= ev.drop && t < ev.end;
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, drop ? '#2B2458' : '#1C2046');
    g.addColorStop(1, drop ? '#6A3F6E' : '#3A3566');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    if (drop) {
      // sunburst, rotating, pulsing on the beat
      ctx.save();
      ctx.translate(W / 2, GROUND - 120);
      ctx.rotate((t - ev.drop) * 0.3);
      ctx.globalAlpha = 0.5 + 0.2 * pulse(t, ev.drop + Math.floor((t - ev.drop) / BEAT) * BEAT, 8);
      for (let i = 0; i < 24; i++) {
        ctx.fillStyle = i % 2 ? '#F2B84B' : '#E0703E';
        const a0 = (i / 24) * Math.PI * 2, a1 = ((i + 1) / 24) * Math.PI * 2;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a0) * 2200, Math.sin(a0) * 2200); ctx.lineTo(Math.cos(a1) * 2200, Math.sin(a1) * 2200); ctx.fill();
      }
      ctx.restore();
    }
    // paper hills + ground
    G.poly(ctx, [[-50, GROUND - 40], [500, GROUND - 110], [1100, GROUND - 60], [1600, GROUND - 130], [1980, GROUND - 70], [1980, H + 50], [-50, H + 50]], { fill: '#3E8A6A', lw: 5, seed: 3, hatch: { color: 'rgba(0,0,0,0.15)', gap: 9 } });
    G.poly(ctx, [[-50, GROUND], [1980, GROUND], [1980, H + 50], [-50, H + 50]], { fill: '#E8D9BC', lw: 5, seed: 4, hatch: { color: 'rgba(120,80,40,0.15)', gap: 8 } });
  }

  function stars(ctx, t) {
    const notes = S.starNotes;
    // constellation lines appear on the drop: the melody, drawn in the sky
    if (t >= ev.drop - 0.05) {
      const k = clamp((t - ev.drop) / 1.2) * (notes.length - 1);
      const pts = notes.slice(0, Math.floor(k) + 1).map((n) => [n.x, n.y]);
      if (pts.length > 1) G.line(ctx, pts, { color: 'rgba(255,240,200,0.7)', lw: 3, seed: 9, step: 30 });
    }
    for (const n of notes) {
      const a = t - n.t;
      if (a < 0) continue;
      const pop = ease.outBack(clamp(a / 0.25), 3);
      const flash = t >= ev.drop ? 1 + 0.35 * pulse(t, ev.drop + Math.floor((t - ev.drop) / BEAT) * BEAT, 6) : 1;
      const r = (18 + (n.midi % 5) * 3) * pop * flash;
      if (a < 0.5) {
        const gl = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, r * 3.2);
        gl.addColorStop(0, `rgba(255,233,168,${0.75 * (1 - a / 0.5)})`); gl.addColorStop(1, 'rgba(255,233,168,0)');
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = gl; ctx.fillRect(n.x - r * 3.2, n.y - r * 3.2, r * 6.4, r * 6.4); ctx.restore();
      }
      G.star(ctx, n.x, n.y, r, { fill: n.i % 3 ? '#F2B84B' : '#FFF1D2', seed: 100 + n.i, rot: Math.sin(t * 2 + n.i) * 0.2 });
    }
  }

  function claude(ctx, t) {
    if (t < ev.claudeFall) return;
    const o = { x: 960, y: GROUND, s: 1.4, eyes: 'normal', scarf: false, blush: 0.4, armL: 0.2, armR: 0.2 };
    if (t < ev.claudeLand) {
      const u = (t - ev.claudeFall) / (ev.claudeLand - ev.claudeFall);
      o.y = lerp(-200, GROUND, ease.inQuad(u)); o.sy = 1.2; o.sx = 0.88; o.eyes = 'wide'; o.armL = o.armR = 1.1;
    } else if (t < ev.breath) {
      const land = Math.max(squash(t), Math.exp(-(t - ev.claudeLand) * 8));
      o.y = GROUND - hop(t, 70); o.sy = 1 - 0.22 * land; o.sx = 1 + 0.16 * land;
      o.eyes = 'happy';
      const last = [...S.starNotes].reverse().find((n) => n.t <= t);
      if (last && t - last.t < 0.3) { o.eyes = 'wide'; o.look = clamp((last.x - 960) / 600, -1, 1); o.lookY = -1; }
      o.armL = o.armR = 0.3 + 0.3 * hop(t, 1);
    } else if (t < ev.drop) {
      o.sy = 0.78; o.sx = 1.2; o.eyes = 'focus'; o.x += U.noise1(t * 40, 1) * 3; // held breath, crouched
    } else if (t < ev.end) {
      const j = clamp((t - ev.drop) / 0.7);
      const big = t < ev.drop + 0.7 ? 4 * 300 * j * (1 - j) : hop(t, 90);
      o.y = GROUND - big; o.eyes = 'happy'; o.mouth = 'open'; o.blush = 0.9;
      o.armL = 1.2 + 0.3 * Math.sin(t * 12); o.armR = 1.2 + 0.3 * Math.sin(t * 12 + 1.5);
      o.sy = big > 30 ? 1.08 : 1 - 0.2 * squash(t); o.sx = big > 30 ? 0.94 : 1 + 0.15 * squash(t);
      o.rot = Math.sin(Math.PI * clock.beatPos(t) * 0.5) * 0.1;
    } else {
      o.eyes = 'closed'; o.blush = 0.8; o.sy = 1 + Math.sin(t * 2) * 0.01;
    }
    Ch.claude(ctx, o);
  }

  function endText(ctx, t) {
    const e = S.endText;
    const size = 120;
    const full = e.words.map((w) => w.w).join(' ');
    let x = W / 2 - G.measure(ctx, full, size) / 2;
    const y = 250;
    e.words.forEach((w, i) => {
      const ww = G.measure(ctx, w.w + (i < e.words.length - 1 ? ' ' : ''), size);
      const p = ease.inOutQuad(clamp((t - w.t) / w.d));
      if (p > 0) {
        ctx.save();
        ctx.beginPath(); ctx.rect(x - 10, y - size, ww * p + 12, size * 1.6); ctx.clip();
        G.text(ctx, w.w, x, y, { size, color: '#F6EBD6' });
        ctx.restore();
      }
      x += ww;
    });
    const sa = clamp((t - e.sub.t) / 0.6);
    if (sa > 0) G.text(ctx, e.sub.text, W / 2, 330, { size: 48, fam: 'Patrick Hand', weight: 400, color: '#E9DCC3', align: 'center', alpha: sa });
  }

  Studio.film({
    draw(ctx, t) {
      if (t < 0.25) return; // a beat of black before the first frame of the story
      const shake = t >= ev.drop ? 18 * Math.exp(-(t - ev.drop) * 5) : 0;
      ctx.save();
      ctx.translate(U.noise1(t * 30, 1) * shake, U.noise1(t * 30, 2) * shake);
      background(ctx, t);
      stars(ctx, t);
      claude(ctx, t);
      if (t >= ev.drop) G.confetti(ctx, t, ev.drop, { n: 150, seed: 7, spawn: 2.5 });
      ctx.restore();
      if (t >= ev.breath && t < ev.drop) { ctx.fillStyle = 'rgba(10,8,20,0.35)'; ctx.fillRect(0, 0, W, H); } // the world holds its breath
      const flash = t >= ev.drop ? 0.8 * Math.exp(-(t - ev.drop) * 12) : 0;
      if (flash > 0.01) { ctx.fillStyle = `rgba(255,250,235,${flash})`; ctx.fillRect(0, 0, W, H); }
      for (const c of S.captions) G.caption(ctx, c, t);
      if (t >= ev.end) endText(ctx, t);
    },
    post: { paper: 0.5, vignette: 0.35, grain: 0.06 },
  });
})();
