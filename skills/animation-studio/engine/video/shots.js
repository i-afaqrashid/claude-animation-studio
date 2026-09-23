// Shots, transitions and camera: write a film as a list of shots instead of an if/else chain.
//
//   const film = Shots.film([
//     { at: 0,     draw: intro },
//     { at: T(4),  draw: verse,  cam: Shots.push(1, 1.08) },
//     { at: T(8),  draw: drop,   in: 'flash', cam: Shots.shake(14, T(8)) },
//     { at: T(12), draw: outro,  in: { type: 'iris', color: '#F2B84B', at: [960, 540] } },
//   ]);
//   Studio.film({ draw: film });
//
// Each shot's draw(ctx, t, s) gets s = { t0, t1, u (0..1 through the shot), dt (time since its start), cam }.
// A transition belongs to the shot it brings in and is centred on that shot's `at` (the cut):
//   cut · fade · dip (via a colour) · iris (closes on the old shot, opens on the new) · irisIn (closes, hard cut:
//   the cleanest "hit") · wipe (left|right|up|down) · push (slide, same directions) · whip (fast push with
//   streaks) · zoom (punch through) · flash (white flash after the cut) · paper (a torn sheet sweeps across)
// Camera: cam(s) → { x, y, zoom, rot } applied around the frame centre; Shots.push / pan / shake / combine.
// Parallax: Shots.layers(ctx, s.cam, [{ depth: 0.2, draw }, { depth: 1, draw }]) moves far layers less.
(function () {
  const U = globalThis.U, G = globalThis.G;
  const { clamp, lerp, ease } = U;
  const Shots = {};

  // ---------- camera ----------
  Shots.cam = (ctx, c) => {
    if (!c) return;
    const { x = 0, y = 0, zoom = 1, rot = 0 } = c;
    ctx.translate(G.W / 2, G.H / 2);
    ctx.scale(zoom, zoom);
    ctx.rotate(rot);
    ctx.translate(-G.W / 2 - x, -G.H / 2 - y);
  };
  // slow push-in (or pull-out) across the shot
  Shots.push = (z0 = 1, z1 = 1.08, e = ease.inOutQuad) => (s) => ({ zoom: lerp(z0, z1, e(s.u)) });
  Shots.pan = (x0, x1, y0 = 0, y1 = 0, e = ease.inOutQuad) => (s) => ({ x: lerp(x0, x1, e(s.u)), y: lerp(y0, y1, e(s.u)) });
  // trauma shake that decays from time `from` (e.g. a drop): amp in px
  Shots.shake = (amp = 14, from = 0, decay = 5, freq = 30) => (s) => {
    const a = s.t < from ? 0 : amp * Math.exp(-(s.t - from) * decay);
    return { x: U.noise1(s.t * freq, 11) * a, y: U.noise1(s.t * freq, 23) * a, rot: U.noise1(s.t * freq, 37) * a * 0.0012 };
  };
  // gentle handheld drift
  Shots.handheld = (amp = 6) => (s) => ({ x: U.noise1(s.t * 0.7, 3) * amp, y: U.noise1(s.t * 0.6, 5) * amp, rot: U.noise1(s.t * 0.5, 7) * 0.004 });
  Shots.combine = (...fns) => (s) => {
    const o = { x: 0, y: 0, zoom: 1, rot: 0 };
    for (const f of fns) { const c = typeof f === 'function' ? f(s) : f; o.x += c.x || 0; o.y += c.y || 0; o.zoom *= c.zoom || 1; o.rot += c.rot || 0; }
    return o;
  };
  // parallax: layers further away (depth < 1) move and zoom less than the camera
  Shots.layers = (ctx, cam, layers) => {
    const c = cam || {};
    for (const L of layers) {
      const d = L.depth ?? 1;
      ctx.save();
      Shots.cam(ctx, { x: (c.x || 0) * d, y: (c.y || 0) * d, zoom: 1 + ((c.zoom || 1) - 1) * d, rot: (c.rot || 0) * d });
      L.draw(ctx);
      ctx.restore();
    }
  };

  // ---------- offscreen buffers for transitions (reused; sized to the current render scale) ----------
  const bufs = [];
  function buffer(i) {
    const s = G.scale || 1, w = Math.round(G.W * s), h = Math.round(G.H * s);
    if (!bufs[i] || bufs[i].width !== w || bufs[i].height !== h) bufs[i] = G.makeCanvas(w, h);
    const c = bufs[i], x = c.getContext('2d');
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.clearRect(0, 0, w, h);
    x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; x.filter = 'none';
    x.setTransform(s, 0, 0, s, 0, 0);
    return c;
  }
  const blit = (ctx, c) => ctx.drawImage(c, 0, 0, G.W, G.H);

  const DEFAULT_DUR = { cut: 0, fade: 0.5, dip: 0.6, iris: 0.6, irisIn: 0.3, wipe: 0.45, push: 0.4, whip: 0.28, zoom: 0.35, flash: 0.45, paper: 0.6 };
  const norm = (tr) => {
    const o = typeof tr === 'string' ? { type: tr } : { ...(tr || { type: 'cut' }) };
    o.type = o.type || 'cut';
    o.dur = o.dur ?? DEFAULT_DUR[o.type] ?? 0.4;
    return o;
  };
  // [start, end] of a transition around the cut at time `at`
  const span = (tr, at) => (['iris', 'irisIn', 'paper', 'dip'].includes(tr.type) ? (tr.type === 'irisIn' ? [at - tr.dur, at] : [at - tr.dur / 2, at + tr.dur / 2]) : tr.type === 'flash' ? [at, at + tr.dur] : [at - tr.dur / 2, at + tr.dur / 2]);

  Shots.film = (list, { end = Infinity } = {}) => {
    const shots = list.map((s, i) => ({ ...s, i, in: norm(s.in) })).sort((a, b) => a.at - b.at);
    shots.forEach((s, i) => { s.t1 = i + 1 < shots.length ? shots[i + 1].at : end; });
    const info = (s, t) => {
      const t1 = Number.isFinite(s.t1) ? s.t1 : (globalThis.SCORE && SCORE.DURATION) || s.at + 10;
      const st = { t, t0: s.at, t1, u: clamp((t - s.at) / Math.max(1e-6, t1 - s.at)), dt: t - s.at };
      st.cam = typeof s.cam === 'function' ? s.cam(st) : s.cam || null;
      return st;
    };
    const drawShot = (ctx, s, t) => {
      const st = info(s, t);
      ctx.save();
      if (st.cam && !s.parallax) Shots.cam(ctx, st.cam);
      s.draw(ctx, t, st);
      ctx.restore();
    };
    const draw = (ctx, t) => {
      let k = 0;
      for (let i = 0; i < shots.length; i++) if (t >= shots[i].at) k = i;
      const cur = shots[k], next = shots[k + 1];
      // are we inside the incoming transition of the next shot (it starts before its cut)?
      if (next && next.in.type !== 'cut') {
        const [a] = span(next.in, next.at);
        if (t >= a && t < next.at) return transition(ctx, t, cur, next, next.in, (x) => drawShot(x, cur, t), (x) => drawShot(x, next, Math.max(t, next.at)));
      }
      if (k > 0 && cur.in.type !== 'cut') {
        const [, b] = span(cur.in, cur.at);
        if (t < b) return transition(ctx, t, shots[k - 1], cur, cur.in, (x) => drawShot(x, shots[k - 1], Math.min(t, cur.at - 1e-3)), (x) => drawShot(x, cur, t));
      }
      drawShot(ctx, cur, t);
    };
    draw.shots = shots;
    draw.at = (t) => { let k = 0; for (let i = 0; i < shots.length; i++) if (t >= shots[i].at) k = i; return shots[k]; };
    return draw;
  };

  // ---------- transitions ----------
  function transition(ctx, t, _from, to, tr, drawFrom, drawTo) {
    const [a, b] = span(tr, to.at);
    const p = clamp((t - a) / Math.max(1e-6, b - a)); // 0..1 across the whole transition
    const before = t < to.at;
    const W = G.W, H = G.H, dir = tr.dir || 'left';
    const color = tr.color || G.C.ink;
    switch (tr.type) {
      case 'fade': {
        const A = buffer(0), B = buffer(1);
        drawFrom(A.getContext('2d')); drawTo(B.getContext('2d'));
        blit(ctx, A); ctx.save(); ctx.globalAlpha = ease.inOutQuad(p); blit(ctx, B); ctx.restore();
        return;
      }
      case 'dip': {
        if (before) drawFrom(ctx); else drawTo(ctx);
        ctx.save(); ctx.fillStyle = color; ctx.globalAlpha = 1 - Math.abs(p * 2 - 1); ctx.fillRect(-W, -H, W * 3, H * 3); ctx.restore();
        return;
      }
      case 'iris': case 'irisIn': {
        const [cx, cy] = tr.at || [W / 2, H / 2];
        const R = Math.hypot(Math.max(cx, W - cx), Math.max(cy, H - cy));
        if (before) {
          drawFrom(ctx);
          const q = tr.type === 'irisIn' ? p : clamp(p * 2);
          ctx.save(); ctx.fillStyle = tr.color || '#000'; ctx.beginPath(); ctx.arc(cx, cy, R * ease.inCubic(q), 0, Math.PI * 2); ctx.fill(); ctx.restore();
        } else {
          drawTo(ctx);
          const r = R * ease.outCubic(clamp(p * 2 - 1));
          ctx.save(); ctx.fillStyle = tr.color || '#000'; ctx.beginPath(); ctx.rect(-W, -H, W * 3, H * 3); ctx.moveTo(cx + r, cy); ctx.arc(cx, cy, r, 0, Math.PI * 2, true); ctx.fill('evenodd'); ctx.restore();
        }
        return;
      }
      case 'wipe': {
        drawFrom(ctx);
        const B = buffer(1); drawTo(B.getContext('2d'));
        const e = ease.inOutCubic(p);
        ctx.save(); ctx.beginPath();
        if (dir === 'left') ctx.rect(W * (1 - e), 0, W * e, H);
        else if (dir === 'right') ctx.rect(0, 0, W * e, H);
        else if (dir === 'up') ctx.rect(0, H * (1 - e), W, H * e);
        else ctx.rect(0, 0, W, H * e);
        ctx.clip(); blit(ctx, B); ctx.restore();
        return;
      }
      case 'push': case 'whip': {
        const e = tr.type === 'whip' ? (p < 0.5 ? ease.inExpo(p * 2) / 2 : 0.5 + ease.outExpo(p * 2 - 1) / 2) : ease.inOutCubic(p);
        const A = buffer(0), B = buffer(1);
        drawFrom(A.getContext('2d')); drawTo(B.getContext('2d'));
        const [dx, dy] = dir === 'left' ? [-W, 0] : dir === 'right' ? [W, 0] : dir === 'up' ? [0, -H] : [0, H];
        const blur = tr.type === 'whip' ? Math.sin(Math.PI * p) : 0;
        const streaks = (c, ox, oy) => {
          if (blur < 0.05) { ctx.drawImage(c, ox, oy, W, H); return; }
          ctx.save(); for (let k = -3; k <= 3; k++) { ctx.globalAlpha = 0.18; ctx.drawImage(c, ox + (dx ? k * 22 * blur * Math.sign(dx) : 0), oy + (dy ? k * 22 * blur * Math.sign(dy) : 0), W, H); } ctx.restore();
        };
        streaks(A, dx * e, dy * e);
        streaks(B, dx * (e - 1), dy * (e - 1));
        return;
      }
      case 'zoom': {
        const A = buffer(0), B = buffer(1);
        drawFrom(A.getContext('2d')); drawTo(B.getContext('2d'));
        const zin = (c, z, al) => { ctx.save(); ctx.globalAlpha = al; ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.drawImage(c, -W / 2, -H / 2, W, H); ctx.restore(); };
        if (before) zin(A, 1 + ease.inQuad(p * 2) * 0.6, 1);
        else { zin(B, 1.25 - 0.25 * ease.outCubic(p * 2 - 1), 1); zin(A, 1.6, Math.max(0, 0.55 - (p * 2 - 1) * 2.5)); }
        return;
      }
      case 'flash': {
        drawTo(ctx);
        ctx.save(); ctx.fillStyle = tr.color || 'rgb(255,250,235)'; ctx.globalAlpha = 0.85 * Math.exp(-(t - to.at) * (4 / Math.max(0.05, tr.dur))); ctx.fillRect(-W, -H, W * 3, H * 3); ctx.restore();
        return;
      }
      case 'paper': {
        // a torn cream sheet sweeps across: fully covering the frame exactly at the cut
        if (before) drawFrom(ctx); else drawTo(ctx);
        const x = lerp(-W * 0.8, W * 1.8, ease.inOutCubic(p)); // the sheet's centre: at the cut it is mid-frame, covering all of it
        ctx.save(); ctx.translate(x, 0); ctx.rotate(-0.04);
        G.tornPaper(ctx, -W * 0.72, -H * 0.2, W * 1.44, H * 1.4, { fill: tr.color || G.C.cream, seed: Math.round(to.at * 10), tear: 10 });
        if (tr.text) G.text(ctx, tr.text, 0, H / 2 + 40, { size: Math.min(W, H) * 0.13, fam: 'Permanent Marker', weight: 400, align: 'center', color: G.C.ink });
        ctx.restore();
        return;
      }
      default: if (before) drawFrom(ctx); else drawTo(ctx);
    }
  }

  globalThis.Shots = Shots;
})();
