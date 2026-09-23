// The match on TV: stadium, pitch, players, ball, goal, TV bezel + score bug.
(function () {
  const U = globalThis.U, G = globalThis.G, Ch = globalThis.Ch, S = globalThis.SCORE, C = G.C;
  const P = {};
  const W = G.W, H = G.H, T = S.T;

  // ground plane: depth d 0 (far) .. 1 (near)
  const FAR_Y = 440, NEAR_Y = 1010;
  P.sy = (d) => U.lerp(FAR_Y, NEAR_Y, d);
  P.sc = (d) => U.lerp(0.72, 1.22, d);
  P.sx = (wx, d, cam) => W / 2 + (wx - cam.x) * P.sc(d) * cam.zoom;

  // ---------- crowd texture (pre-rendered) ----------
  P.init = () => {
    P.crowd = [0, 1].map((variant) => {
      const c = G.makeCanvas(2400, 330);
      const x = c.getContext('2d');
      const g = x.createLinearGradient(0, 0, 0, 330);
      g.addColorStop(0, '#2A2346'); g.addColorStop(1, '#3E3358');
      x.fillStyle = g;
      x.fillRect(0, 0, 2400, 330);
      const r = U.mulberry32(11);
      const shirt = ['#E0703E', '#F6F0E2', '#E0703E', '#F2B84B', '#3FA89B', '#E0703E', '#2F3A78', '#F6F0E2', '#E8718D'];
      const skin = ['#C98A62', '#8D5A3B', '#E7B48F', '#6B4430', '#D9A07A'];
      for (let row = 0; row < 9; row++) {
        const y = 40 + row * 34;
        for (let col = 0; col < 110; col++) {
          const px = col * 22 + (row % 2) * 11 + r() * 6;
          const s = 0.75 + row * 0.04;
          x.fillStyle = shirt[Math.floor(r() * shirt.length)];
          x.beginPath(); x.ellipse(px, y + 14 * s, 10 * s, 12 * s, 0, 0, Math.PI * 2); x.fill();
          if (variant === 1 && r() < 0.55) {
            x.strokeStyle = skin[Math.floor(r() * skin.length)];
            x.lineWidth = 4 * s;
            x.beginPath(); x.moveTo(px - 7 * s, y + 6 * s); x.lineTo(px - 11 * s, y - 14 * s); x.moveTo(px + 7 * s, y + 6 * s); x.lineTo(px + 11 * s, y - 14 * s); x.stroke();
          }
          x.fillStyle = skin[Math.floor(r() * skin.length)];
          x.beginPath(); x.arc(px, y, 7 * s, 0, Math.PI * 2); x.fill();
          if (r() < 0.05) { x.fillStyle = r() < 0.5 ? '#E0703E' : '#F6F0E2'; x.fillRect(px - 2, y - 40, 3, 34); x.fillRect(px + 1, y - 40, 22, 14); }
        }
      }
      // pencil hatch over the stands
      x.strokeStyle = 'rgba(0,0,0,0.12)';
      x.lineWidth = 1.5;
      for (let i = -330; i < 2400; i += 9) { x.beginPath(); x.moveTo(i, 330); x.lineTo(i + 330, 0); x.stroke(); }
      return c;
    });
    // scanlines
    const sl = G.makeCanvas(8, 8);
    const sx = sl.getContext('2d');
    sx.fillStyle = 'rgba(0,0,0,0.10)';
    sx.fillRect(0, 0, 8, 2);
    P.scan = sl;
  };

  const ADS = [['AFAQ', C.kit, C.cream], ['CLAUDE', C.cream, C.claudeDark], ['2026', '#2F3A78', C.cream], ['OLÉ!', C.gold, C.ink], ['AFAQ', C.teal, C.cream], ['CLAUDE', C.kit, C.cream], ['GOAL?', C.cream, C.navy], ['★★★', '#2F3A78', C.gold]];

  P.stadium = (ctx, t, cam, { cheer = 0 } = {}) => {
    // stands
    const par = 0.3;
    const off = ((cam.x * par) % 2400 + 2400) % 2400;
    const img = P.crowd[cheer > 0 && Math.floor(t * 6) % 2 === 0 ? 1 : 0];
    const bob = Math.floor(t * 8) % 2 ? 2 : 0;
    ctx.save();
    ctx.translate(0, -30 + bob);
    ctx.drawImage(img, -off, 0);
    ctx.drawImage(img, 2400 - off, 0);
    ctx.restore();
    // ad boards
    const bw = 300, by = 316, bh = 66;
    const px = cam.x * 0.72;
    const start = Math.floor((px - W) / bw);
    for (let k = start; k < start + 12; k++) {
      const x = W / 2 + k * bw - px;
      const ad = ADS[((k % ADS.length) + ADS.length) % ADS.length];
      ctx.fillStyle = ad[1];
      ctx.fillRect(x, by, bw - 4, bh);
      G.text(ctx, ad[0], x + bw / 2, by + 48, { size: 38, fam: 'Bungee', weight: 400, color: ad[2], align: 'center', boil: 0.4 });
    }
    ctx.strokeStyle = C.ink; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(0, by); ctx.lineTo(W, by); ctx.moveTo(0, by + bh); ctx.lineTo(W, by + bh); ctx.stroke();
    // pitch
    const g = ctx.createLinearGradient(0, by + bh, 0, H);
    g.addColorStop(0, '#3F8A4A'); g.addColorStop(1, '#5DAE63');
    ctx.fillStyle = g;
    ctx.fillRect(0, by + bh, W, H);
    // mowing stripes (perspective)
    const bw2 = 220;
    const s0 = Math.floor((cam.x - 2000) / bw2);
    for (let k = s0; k < s0 + 24; k++) {
      if (k % 2) continue;
      const a0 = W / 2 + (k * bw2 - cam.x) * 0.66 * cam.zoom, a1 = W / 2 + ((k + 1) * bw2 - cam.x) * 0.66 * cam.zoom;
      const b0 = W / 2 + (k * bw2 - cam.x) * 1.4 * cam.zoom, b1 = W / 2 + ((k + 1) * bw2 - cam.x) * 1.4 * cam.zoom;
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.beginPath(); ctx.moveTo(a0, by + bh); ctx.lineTo(a1, by + bh); ctx.lineTo(b1, H); ctx.lineTo(b0, H); ctx.fill();
    }
    // far touchline
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 5;
    G.line(ctx, [[0, FAR_Y - 22], [W, FAR_Y - 22]], { color: 'rgba(255,255,255,0.85)', lw: 5, seed: 900, step: 60 });
  };

  // a line on the ground between world points (wx,d)
  P.groundLine = (ctx, cam, a, b, seed) => {
    G.line(ctx, [[P.sx(a[0], a[1], cam), P.sy(a[1])], [P.sx(b[0], b[1], cam), P.sy(b[1])]], { color: 'rgba(255,255,255,0.8)', lw: 5, seed, step: 50 });
  };

  // musical note glyph (drawn, not a font)
  P.note = (ctx, x, y, s, alpha, seed) => {
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.translate(x, y);
    ctx.scale(s, s);
    G.line(ctx, [[10, 0], [10, -46], [26, -36]], { lw: 5, seed, color: C.ink });
    G.ellipse(ctx, 0, 2, 12, 9, { fill: C.cream, lw: 4, seed: seed + 1, amp: 0.6 });
    ctx.restore();
  };

  // ---------- goal (side-on, net to the right) ----------
  P.GOAL_X = 1450;
  P.goal = (ctx, cam, t, bulge) => {
    const gx = P.GOAL_X;
    const dN = 0.66, dF = 0.26, depth = 150;
    const post = (d) => [P.sx(gx, d, cam), P.sy(d)];
    const s = (d) => P.sc(d) * cam.zoom;
    const hgt = 250;
    const nF = post(dF), nN = post(dN);
    // back of net positions
    const bF = [P.sx(gx + depth, dF, cam), P.sy(dF)], bN = [P.sx(gx + depth, dN, cam), P.sy(dN)];
    // net mesh: grid between front frame and back
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 1.6;
    const bu = (u, v) => {
      if (!bulge) return [0, 0];
      const du = u - bulge.u, dv = v - bulge.v;
      const f = Math.exp(-(du * du + dv * dv) / 0.05) * bulge.amp;
      return [f, -f * 0.2];
    };
    const pt = (u, v) => {
      // u: 0 near post .. 1 far post ; v: 0 ground .. 1 crossbar ; back plane
      const fx = U.lerp(bN[0], bF[0], u), fy = U.lerp(bN[1], bF[1], u);
      const sc = U.lerp(s(dN), s(dF), u);
      const b = bu(u, v);
      return [fx + b[0] * sc, fy - v * hgt * sc * 0.92 + b[1] * sc];
    };
    for (let i = 0; i <= 10; i++) { ctx.beginPath(); for (let j = 0; j <= 10; j++) { const p = pt(i / 10, j / 10); j ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); } ctx.stroke(); }
    for (let j = 0; j <= 10; j++) { ctx.beginPath(); for (let i = 0; i <= 10; i++) { const p = pt(i / 10, j / 10); i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); } ctx.stroke(); }
    // roof lines
    for (let i = 0; i <= 6; i++) {
      const u = i / 6;
      const fx = U.lerp(nN[0], nF[0], u), fy = U.lerp(nN[1], nF[1], u) - hgt * U.lerp(s(dN), s(dF), u);
      const p = pt(u, 1);
      ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(p[0], p[1]); ctx.stroke();
    }
    ctx.restore();
    // frame: posts + crossbar
    const top = (p, d) => [p[0], p[1] - hgt * s(d)];
    G.line(ctx, [nF, top(nF, dF)], { lw: 12 * s(dF), color: '#FFFFFF', seed: 901 });
    G.line(ctx, [top(nF, dF), top(nN, dN)], { lw: 12, color: '#FFFFFF', seed: 902 });
    G.line(ctx, [nN, top(nN, dN)], { lw: 12 * s(dN), color: '#FFFFFF', seed: 903 });
    G.line(ctx, [nF, top(nF, dF), top(nN, dN), nN], { lw: 3, color: C.ink, seed: 904 });
    return { hgt, dN, dF };
  };

  // ---------- TV overlay ----------
  P.tvOverlay = (ctx, t, { clock = '71:04', score = '0 – 0', flash = 0, live = true } = {}) => {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // scanlines + glare
    ctx.fillStyle = ctx.createPattern(P.scan, 'repeat');
    ctx.fillRect(0, 0, W, H);
    const gl = ctx.createLinearGradient(0, 0, W * 0.6, H * 0.6);
    gl.addColorStop(0, 'rgba(255,255,255,0.10)'); gl.addColorStop(0.5, 'rgba(255,255,255,0)');
    ctx.fillStyle = gl;
    ctx.fillRect(0, 0, W, H);
    // score bug
    const x = 110, y = 86;
    ctx.fillStyle = 'rgba(18,20,44,0.92)';
    ctx.beginPath(); ctx.roundRect(x, y, 470, 66, 14); ctx.fill();
    ctx.fillStyle = C.kit; ctx.fillRect(x + 18, y + 18, 30, 30);
    ctx.fillStyle = '#2F3A78'; ctx.fillRect(x + 228, y + 18, 30, 30);
    ctx.strokeStyle = '#FFF'; ctx.lineWidth = 2; ctx.strokeRect(x + 228, y + 18, 30, 30);
    const pop = 1 + flash * 0.4;
    ctx.save();
    ctx.translate(x + 138, y + 46);
    ctx.scale(pop, pop);
    G.text(ctx, score, 0, 0, { size: 36, fam: 'Bungee', weight: 400, color: flash > 0 ? C.gold : '#FFFFFF', align: 'center', boil: 0 });
    ctx.restore();
    G.text(ctx, clock, x + 372, y + 46, { size: 34, fam: 'Bungee', weight: 400, color: '#FFFFFF', align: 'center', boil: 0 });
    if (live) {
      ctx.fillStyle = '#E24B3B';
      ctx.beginPath(); ctx.roundRect(x + 486, y + 14, 92, 38, 8); ctx.fill();
      if (Math.floor(t * 2) % 2 === 0) { ctx.fillStyle = '#FFF'; ctx.beginPath(); ctx.arc(x + 504, y + 33, 6, 0, 7); ctx.fill(); }
      G.text(ctx, 'LIVE', x + 544, y + 45, { size: 24, fam: 'Bungee', weight: 400, color: '#FFFFFF', align: 'center', boil: 0 });
    }
    // bezel
    const b = 34;
    ctx.fillStyle = '#16151C';
    ctx.beginPath();
    ctx.rect(0, 0, W, H);
    ctx.roundRect(b, b, W - 2 * b, H - 2 * b, 42);
    ctx.fill('evenodd');
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.roundRect(b, b, W - 2 * b, H - 2 * b, 42); ctx.stroke();
    ctx.restore();
  };

  // ======================= MATCH (bars 6–9) =======================
  const touches = S.touches;
  const PX_PER_S = 680;
  const layout = [];
  {
    let wx = -1400;
    touches.forEach((n, i) => {
      if (i > 0) wx += (n.t - touches[i - 1].t) * PX_PER_S;
      layout.push({ t: n.t, wx, d: U.remap(n.midi, 67, 77, 0.86, 0.1), midi: n.midi, i });
    });
  }
  const last = layout[layout.length - 1];
  const icpt = { t: S.interceptT, wx: last.wx + (S.interceptT - last.t) * PX_PER_S, d: U.remap(72, 67, 77, 0.86, 0.1) };
  P.matchLayout = layout;

  const DRIFT = 60;
  function ballAt(t) {
    if (t <= layout[0].t) return { wx: layout[0].wx + 22, d: layout[0].d, h: 0 };
    if (t >= icpt.t) {
      // stolen: dribbled away to the left
      const a = t - icpt.t;
      return { wx: icpt.wx - 10 - a * 380, d: icpt.d + a * 0.05, h: Math.abs(Math.sin(a * 14)) * 8 };
    }
    let k = layout.length - 1;
    for (let i = 0; i < layout.length - 1; i++) if (t < layout[i + 1].t) { k = i; break; }
    const A = layout[k];
    const B = k < layout.length - 1 ? layout[k + 1] : icpt;
    const dur = B.t - A.t;
    const u = (t - A.t) / dur;
    const lob = dur >= 0.49 ? 70 * dur * 1.6 : 12;
    return { wx: U.lerp(A.wx + 22, B.wx - 18, u), d: U.lerp(A.d, B.d, u), h: lob * 4 * u * (1 - u), spin: u };
  }
  P.ballAt = ballAt;

  P.drawMatch = (ctx, t) => {
    const b = ballAt(t);
    const lagB = ballAt(t - 0.25);
    let camx = (b.wx * 0.4 + lagB.wx * 0.6) + 260;
    if (t > icpt.t) camx = ballAt(icpt.t).wx + 260 - U.ease.outCubic(U.clamp((t - icpt.t) / 0.8)) * 220;
    const cam = { x: camx, zoom: 1 };
    P.stadium(ctx, t, cam, { cheer: 0 });
    // halfway line + circle
    P.groundLine(ctx, cam, [0, 0], [0, 1], 910);
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.ellipse(P.sx(0, 0.5, cam), P.sy(0.5), 250, 95, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();

    const actors = [];
    // our players: one per touch
    layout.forEach((L, i) => {
      const wx = L.wx + (t - L.t) * DRIFT;
      const kickP = U.clamp((t - (L.t - 0.14)) / 0.26);
      const pose = kickP > 0 && kickP < 1 ? 'kick' : 'run';
      const vis = U.clamp((t - (L.t - 2.2)) / 0.4) * (1 - U.clamp((t - (L.t + 1.6)) / 0.5));
      let p = { kit: 'home', pose, kick: kickP, phase: t * 10 + i * 1.7, seed: 400 + i, alpha: vis };
      if (i === layout.length - 1 && t > icpt.t) p = { kit: 'home', pose: 'celebrate', seed: 400 + i };
      if (vis <= 0.01 && !(i === layout.length - 1 && t > icpt.t)) return;
      actors.push({ wx, d: L.d, draw: (x, y, s) => Ch.player(ctx, Object.assign({ x, y, s: s * 1.55, facing: 1 }, p)) });
    });
    // the would-be receiver of the last pass (too late)
    actors.push({ wx: icpt.wx + 90 + (t - icpt.t) * 20, d: icpt.d - 0.05, draw: (x, y, s) => Ch.player(ctx, { x, y, s: s * 1.55, kit: 'home', pose: t > icpt.t ? 'celebrate' : 'run', phase: t * 10, seed: 470 }) });
    // defenders lunging at long passes
    layout.forEach((L, i) => {
      const N = i < layout.length - 1 ? layout[i + 1] : null;
      if (!N || N.t - L.t < 0.49) return;
      const mid = (L.t + N.t) / 2;
      const wx = (L.wx + N.wx) / 2 + 30 - (t - mid) * 40;
      const d = U.clamp((L.d + N.d) / 2 + (i % 2 ? 0.16 : -0.16), 0.02, 0.98);
      const lunging = Math.abs(t - mid) < 0.22;
      const vis = U.clamp((t - (mid - 2.2)) / 0.4) * (1 - U.clamp((t - (mid + 1.4)) / 0.5));
      if (vis <= 0.01) return;
      actors.push({ wx, d, draw: (x, y, s) => Ch.player(ctx, { alpha: vis, x, y, s: s * 1.55, kit: 'away', facing: -1, pose: lunging ? 'lunge' : 'run', phase: t * 8 + i, seed: 600 + i }) });
    });
    // the interceptor
    {
      const a = Math.max(0, t - icpt.t);
      const stepIn = U.ease.outCubic(U.clamp((t - (icpt.t - 0.45)) / 0.45));
      const wx = icpt.wx + 40 - stepIn * 30 - a * 380;
      const d = icpt.d + 0.08 * (1 - stepIn) + a * 0.05;
      actors.push({ wx, d, draw: (x, y, s) => Ch.player(ctx, { x, y, s: s * 1.55, kit: 'away', facing: -1, pose: t < icpt.t - 0.1 ? 'run' : t < icpt.t + 0.15 ? 'lunge' : 'run', phase: t * 12, seed: 699, num: 4 }) });
    }
    // ball as an actor so depth-sorting works
    actors.push({ wx: b.wx, d: b.d + 0.001, draw: (x, y, s) => Ch.ball(ctx, x, y - 19 * s - b.h * s, 19 * s, t * 12, { shadowY: y }) });
    actors.sort((a, b2) => a.d - b2.d);
    for (const a of actors) {
      const x = P.sx(a.wx, a.d, cam);
      if (x < -200 || x > W + 200) continue;
      a.draw(x, P.sy(a.d), P.sc(a.d));
    }
    // notes pop from each touch — the ball is literally playing the tune
    layout.forEach((L, i) => {
      const a = t - L.t;
      if (a < 0 || a > 0.9) return;
      const wx = L.wx + a * DRIFT;
      const x = P.sx(wx, L.d, cam), y = P.sy(L.d) - 215 * P.sc(L.d) - a * 110;
      P.note(ctx, x + 36, y - 20, 1.3 + 0.4 * U.ease.outBack(U.clamp(a / 0.2)), 1 - U.clamp((a - 0.5) / 0.4), 950 + i);
    });
    // interception scribble
    if (t > icpt.t) {
      const a = t - icpt.t;
      const x = P.sx(icpt.wx, icpt.d, cam) - a * 200, y = P.sy(icpt.d) - 230;
      G.text(ctx, '!!', x, y, { size: 90 * U.ease.outBack(U.clamp(a / 0.2)), fam: 'Permanent Marker', weight: 400, color: '#E24B3B', align: 'center' });
    }
    const secs = 4 + Math.floor((t - T(6)) * 1);
    P.tvOverlay(ctx, t, { clock: `71:${String(secs).padStart(2, '0')}` });
  };

  // ======================= BUILD (bars 13–15) =======================
  const STRIKE = S.ev.strike, GOALT = S.ev.goal;
  const striker = (t) => {
    // run from -500 to plant at 820
    const plant = 820;
    const tPlant = T(14, 1);
    if (t < tPlant) {
      const u = U.clamp((t - T(13)) / (tPlant - T(13)));
      return { wx: U.lerp(-700, plant, U.ease.outQuad(u)), d: 0.6, pose: 'run', speed: 1 - u * 0.6 };
    }
    const kick = U.clamp((t - (STRIKE - 0.3)) / 0.55);
    return { wx: plant, d: 0.6, pose: t > STRIKE - 0.3 ? 'kick' : 'run', kick, speed: 0.2 };
  };
  const TARGET = { wx: P.GOAL_X + 20, d: 0.36, h: 205 };
  const flight = (t) => {
    const x = U.clamp((t - STRIKE) / (GOALT - STRIKE));
    const u = x < 0.12 ? (x / 0.12) * 0.5 : 0.5 + 0.5 * U.ease.outQuad((x - 0.12) / 0.88);
    const from = { wx: 820 + 46, d: 0.6 };
    return {
      wx: U.lerp(from.wx, TARGET.wx, u), d: U.lerp(from.d, TARGET.d, u),
      h: U.lerp(0, TARGET.h, u) + 170 * Math.sin(Math.PI * u) * (1 - u * 0.3), u, x,
    };
  };
  P.flight = flight;
  const keeper = (t) => {
    const dive = U.clamp((t - T(15, 1.5)) / (GOALT - T(15, 1.5) + 0.3));
    return { wx: P.GOAL_X - 40 - dive * 10, d: 0.47 - dive * 0.08, lift: U.ease.outQuad(dive) * 120, rot: -dive * 1.2, dive };
  };

  P.buildCam = (t) => {
    const s = striker(Math.min(t, STRIKE));
    if (t < STRIKE) {
      const z = U.tween(t, T(14, 0), STRIKE, 1, 1.12, U.ease.inOutQuad);
      return { x: s.wx + 420 - (1 - U.clamp((t - T(13)) / 1)) * 100, zoom: z };
    }
    const f = flight(t);
    const k = U.ease.inOutCubic(U.clamp((t - STRIKE) / 1.2));
    return { x: U.lerp(s.wx + 420, (f.wx + P.GOAL_X) / 2 + 60, k), zoom: U.lerp(1.12, 1.45, U.ease.inOutQuad(U.clamp((t - STRIKE) / (GOALT - STRIKE)))) };
  };

  P.drawBuild = (ctx, t, { bulge = null, ballInNet = false } = {}) => {
    const cam = P.buildCam(Math.min(t, GOALT));
    const zc = (fn) => { ctx.save(); ctx.translate(W / 2, H * 0.62); ctx.scale(cam.zoom, cam.zoom); ctx.translate(-W / 2, -H * 0.62); fn(); ctx.restore(); };
    const camFlat = { x: cam.x, zoom: 1 };
    zc(() => {
      P.stadium(ctx, t, camFlat, { cheer: t > GOALT ? 1 : 0 });
      // penalty box lines
      P.groundLine(ctx, camFlat, [P.GOAL_X - 330, 0.08], [P.GOAL_X - 330, 0.92], 920);
      P.groundLine(ctx, camFlat, [P.GOAL_X - 330, 0.08], [P.GOAL_X, 0.08], 921);
      P.groundLine(ctx, camFlat, [P.GOAL_X - 330, 0.92], [P.GOAL_X, 0.92], 922);
      P.groundLine(ctx, camFlat, [P.GOAL_X, 0.0], [P.GOAL_X, 1], 923);
      const actors = [];
      const s = striker(t);
      actors.push({ wx: s.wx, d: s.d, draw: (x, y, sc) => Ch.player(ctx, { x, y, s: sc * 1.45, kit: 'home', pose: t > GOALT ? 'celebrate' : s.pose, kick: s.kick, phase: t * 13, seed: 777, num: 10 }) });
      // defenders beaten
      [[-150, 0.45, T(13, 1.3)], [330, 0.75, T(13, 3.1)]].forEach(([wx, d, tl], i) => {
        const lunge = t > tl - 0.15;
        const fall = U.clamp((t - tl) / 0.4);
        actors.push({ wx: wx - fall * 40, d, draw: (x, y, sc) => { ctx.save(); ctx.translate(x, y); ctx.rotate(fall * 0.5 * (i ? 1 : -1)); Ch.player(ctx, { x: 0, y: 0, s: sc * 1.4, kit: 'away', facing: -1, pose: lunge ? 'lunge' : 'run', phase: t * 9 + i, seed: 650 + i }); ctx.restore(); } });
      });
      // keeper
      const kp = keeper(t);
      actors.push({ wx: kp.wx, d: kp.d, draw: (x, y, sc) => { ctx.save(); ctx.translate(x, y - kp.lift * sc); ctx.rotate(kp.rot); Ch.player(ctx, { x: 0, y: 0, s: sc * 1.45, kit: 'gk', facing: -1, pose: kp.dive > 0 ? 'dive' : 'stand', seed: 680 }); ctx.restore(); } });
      // ball
      let ball;
      if (t < STRIKE) ball = { wx: s.wx + 40 + Math.abs(Math.sin(t * 12)) * 16, d: s.d + 0.01, h: Math.abs(Math.sin(t * 12)) * 8 };
      else if (!ballInNet) ball = flight(t);
      else ball = { wx: TARGET.wx + 60 + (bulge ? bulge.amp * 0.8 : 0), d: TARGET.d, h: TARGET.h - 20 };
      actors.push({ wx: ball.wx, d: ball.d + 0.002, draw: (x, y, sc) => Ch.ball(ctx, x, y - 14 * sc - ball.h * sc, 15 * sc, t * (t > STRIKE + 0.3 ? 3 : 14), { shadowY: y }) });
      actors.sort((a, b) => a.d - b.d);
      // goal is drawn between far and near actors
      let goalDrawn = false;
      for (const a of actors) {
        if (!goalDrawn && a.d > 0.4) { P.goal(ctx, camFlat, t, bulge); goalDrawn = true; }
        a.draw(P.sx(a.wx, a.d, camFlat), P.sy(a.d), P.sc(a.d));
      }
      if (!goalDrawn) P.goal(ctx, camFlat, t, bulge);
      // dotted trajectory + target circle (the prediction line)
      if (t > STRIKE - 0.05 && !ballInNet) {
        const pts = [];
        for (let i = 0; i <= 40; i++) {
          const tt = STRIKE + (i / 40) * (GOALT - STRIKE);
          const f = flight(tt);
          pts.push([P.sx(f.wx, f.d, camFlat), P.sy(f.d) - 14 * P.sc(f.d) - f.h * P.sc(f.d)]);
        }
        const reveal = U.clamp((t - STRIKE) / 0.35);
        ctx.save();
        ctx.setLineDash([4, 16]);
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#3B5BDB';
        ctx.lineWidth = 5;
        ctx.beginPath();
        const n = Math.floor(pts.length * reveal);
        for (let i = 0; i < n; i++) (i ? ctx.lineTo(pts[i][0], pts[i][1]) : ctx.moveTo(pts[i][0], pts[i][1]));
        ctx.stroke();
        ctx.restore();
        if (t > STRIKE + 0.25) {
          const p = pts[pts.length - 1];
          const r = 50 * U.ease.outBack(U.clamp((t - STRIKE - 0.25) / 0.3));
          G.ellipse(ctx, p[0], p[1], r, r * 0.8, { fill: null, stroke: '#3B5BDB', lw: 4, seed: 930, second: true });
        }
      }
      // strike impact
      if (t >= STRIKE && t < STRIKE + 0.25) {
        const a = (t - STRIKE) / 0.25;
        const x = P.sx(866, 0.6, camFlat), y = P.sy(0.6) - 20;
        G.rays(ctx, x, y, { n: 18, r0: 30 + a * 40, r1: 160 + a * 120, lw: 6, color: '#FFFFFF', alpha: 1 - a, seed: 931 });
        G.star(ctx, x, y, 60 * (1 - a) + 20, { fill: '#FFF6D0', seed: 932 });
      }
      // speed lines while the striker sprints
      if (t < T(14, 1)) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,0.55)';
        ctx.lineCap = 'round';
        for (let i = 0; i < 9; i++) {
          const y = 520 + G.rnd(i, G.boil) * 420;
          const x = W * 0.25 + G.rnd(i + 20, G.boil) * W * 0.5;
          ctx.lineWidth = 3;
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 140 - G.rnd(i, 3) * 100, y); ctx.stroke();
        }
        ctx.restore();
      }
    });
    return cam;
  };

  globalThis.P = P;
})();
