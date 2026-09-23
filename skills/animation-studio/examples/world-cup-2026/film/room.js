// The living room: set, furniture, lighting, props.
(function () {
  const U = globalThis.U, G = globalThis.G, Ch = globalThis.Ch, S = globalThis.SCORE, C = G.C;
  const R = {};
  // Afaq = the real Afaq (curly hair, trimmed beard) in his custom #10 jersey: the engine's Ch.STYLES.afaqFan preset
  Ch.afaq = (ctx, o) => Ch.person(ctx, Object.assign({}, o, { style: Object.assign({}, Ch.STYLES.afaqFan, o.style || {}) }));
  const W = G.W, H = G.H;

  const hex = (c) => { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  R.mix = (a, b, t) => { const A = hex(a), B = hex(b); return `rgb(${Math.round(A[0] + (B[0] - A[0]) * t)},${Math.round(A[1] + (B[1] - A[1]) * t)},${Math.round(A[2] + (B[2] - A[2]) * t)})`; };

  // layout
  R.WIN = { x: 1330, y: 130, w: 400, h: 410 };
  R.SEAT_Y = 652;
  R.BOWL = { x: 840, y: 918 };

  R.withCam = (ctx, cam, fn) => {
    ctx.save();
    ctx.translate(W / 2 + (cam.shx || 0), H / 2 + (cam.shy || 0));
    ctx.rotate(cam.rot || 0);
    ctx.scale(cam.zoom || 1, cam.zoom || 1);
    ctx.translate(-(cam.x ?? W / 2), -(cam.y ?? H / 2));
    fn();
    ctx.restore();
  };

  // trauma-style shake from a list of [t0, amp, decay]
  R.shake = (t, hits) => {
    let a = 0;
    for (const [t0, amp, dec] of hits) if (t >= t0) a += amp * Math.exp(-(t - t0) * (dec || 8));
    return { shx: U.noise1(t * 30, 1) * a, shy: U.noise1(t * 30, 2) * a, rot: U.noise1(t * 20, 3) * a * 0.0008 };
  };

  // ---------------- set pieces ----------------
  function wall(ctx) {
    ctx.fillStyle = C.wall;
    ctx.fillRect(-500, -500, 2920, 1320);
    ctx.fillStyle = 'rgba(150,110,70,0.07)';
    for (let x = -500; x < 2420; x += 64) ctx.fillRect(x, -500, 22, 1310);
    // tiny wallpaper dots
    ctx.fillStyle = 'rgba(150,100,60,0.12)';
    for (let x = -468; x < 2420; x += 64) for (let y = -480; y < 800; y += 58) { ctx.beginPath(); ctx.arc(x + 11, y + ((x / 64) % 2 ? 29 : 0), 3, 0, Math.PI * 2); ctx.fill(); }
    G.rrect(ctx, -500, 784, 2920, 28, 0, { fill: '#D8C29C', lw: 3.5, seed: 5, amp: 1, step: 40 });
    ctx.fillStyle = C.wood;
    ctx.fillRect(-500, 810, 2920, 800);
    ctx.strokeStyle = 'rgba(90,55,30,0.35)';
    ctx.lineWidth = 2.5;
    const rows = [810, 836, 868, 908, 958, 1020, 1095, 1180];
    for (let i = 0; i < rows.length; i++) {
      G.line(ctx, [[-500, rows[i]], [2420, rows[i]]], { lw: 2.5, color: 'rgba(90,55,30,0.4)', seed: 70 + i, step: 80, amp: 1 });
      if (i < rows.length - 1) {
        const h = rows[i + 1] - rows[i];
        for (let x = -500 + ((i * 173) % 300); x < 2420; x += 300 + i * 20) G.line(ctx, [[x, rows[i]], [x - h * 0.2, rows[i + 1]]], { lw: 2, color: 'rgba(90,55,30,0.3)', seed: 90 + i + x, amp: 0.8 });
      }
    }
  }

  function windowPane(ctx, t, st) {
    const { x, y, w, h } = R.WIN;
    // curtains back
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, '#11163A'); g.addColorStop(0.7, '#2E2A5C'); g.addColorStop(1, '#4B3A6A');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    for (let i = 0; i < 34; i++) {
      const sx = x + G.rnd(i, 1) * w, sy = y + G.rnd(i, 2) * h * 0.7;
      const tw = 0.5 + 0.5 * Math.sin(t * (2 + G.rnd(i, 3) * 3) + i);
      ctx.fillStyle = `rgba(255,245,220,${0.35 + 0.6 * tw})`;
      ctx.fillRect(sx, sy, 2.5, 2.5);
    }
    // moon
    ctx.fillStyle = '#F5EBC8';
    ctx.beginPath(); ctx.arc(x + 300, y + 80, 34, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#131840';
    ctx.beginPath(); ctx.arc(x + 316, y + 70, 30, 0, Math.PI * 2); ctx.fill();
    // fireworks through the window
    if (st.fireworks) for (const f of S.fireworks) if (f.scene === 'window') G.firework(ctx, f, t, x + f.x * w, y + f.y * h, 0.42);
    // skyline
    ctx.fillStyle = '#171A3C';
    const bl = [[0, 300, 60], [55, 330, 50], [100, 270, 70], [165, 320, 45], [205, 250, 80], [280, 310, 60], [335, 280, 70]];
    for (const [bx, by, bw] of bl) ctx.fillRect(x + bx, y + by, bw, h - by);
    for (let i = 0; i < 26; i++) {
      const b = bl[i % bl.length];
      const on = G.rnd(i, 7) > 0.45 || (st.fireworks && G.rnd(i, 8) > 0.2);
      if (!on) continue;
      ctx.fillStyle = 'rgba(247,213,122,0.85)';
      ctx.fillRect(x + b[0] + 8 + (G.rnd(i, 9) * (b[2] - 20)), y + b[1] + 12 + G.rnd(i, 10) * 70, 7, 9);
    }
    ctx.restore();
    // frame + mullions + sill
    const frame = '#EFE6D6';
    G.shape(ctx, G.rrPts(x - 20, y - 20, w + 40, h + 40, 4, 30), { fill: null, lw: 26, stroke: frame, seed: 30, second: false, amp: 1 });
    G.rrect(ctx, x - 33, y - 33, w + 66, h + 66, 6, { lw: 4, seed: 31, step: 30 });
    G.rrect(ctx, x - 7, y - 7, w + 14, h + 14, 3, { lw: 3.5, seed: 32, step: 30 });
    G.rrect(ctx, x + w / 2 - 7, y, 14, h, 2, { fill: frame, lw: 3.5, seed: 33 });
    G.rrect(ctx, x, y + h / 2 - 7, w, 14, 2, { fill: frame, lw: 3.5, seed: 34 });
    G.rrect(ctx, x - 56, y + h + 22, w + 112, 26, 5, { fill: '#E6DAC4', lw: 4, seed: 35 });
    // curtains
    const cur = (sx, dir) => {
      G.poly(ctx, [[sx, y - 60], [sx + dir * 105, y - 60], [sx + dir * 70, y + h * 0.45], [sx + dir * 95, y + h + 70], [sx - dir * 10, y + h + 70]], { fill: '#D9A441', lw: 4, seed: 36 + dir, hatch: { color: 'rgba(120,70,10,0.22)', gap: 9, angle: 1.4 } });
      for (let k = 1; k < 4; k++) G.line(ctx, [[sx + dir * k * 22, y - 50], [sx + dir * (k * 20 - 6), y + h + 60]], { lw: 2.5, color: 'rgba(120,70,10,0.4)', seed: 40 + k + dir });
    };
    cur(x - 60, 1);
    cur(x + w + 60, -1);
    G.line(ctx, [[x - 110, y - 62], [x + w + 110, y - 62]], { lw: 7, seed: 44 });
  }

  function bunting(ctx, t) {
    const a = [40, 60], b = [1240, 72], c = [640, 190];
    const q = (u) => [(1 - u) * (1 - u) * a[0] + 2 * (1 - u) * u * c[0] + u * u * b[0], (1 - u) * (1 - u) * a[1] + 2 * (1 - u) * u * c[1] + u * u * b[1]];
    const pts = [];
    for (let i = 0; i <= 20; i++) pts.push(q(i / 20));
    G.line(ctx, pts, { lw: 3, seed: 50 });
    const cols = [C.kit, C.cream, C.teal, C.gold];
    for (let i = 0; i < 16; i++) {
      const u = (i + 0.5) / 16;
      const p = q(u);
      const sway = Math.sin(t * 2 + i) * 0.06;
      ctx.save();
      ctx.translate(p[0], p[1]);
      ctx.rotate(sway);
      G.poly(ctx, [[-30, 0], [30, 0], [0, 62]], { fill: cols[i % 4], lw: 3.5, seed: 51 + i, step: 14, hatch: { color: 'rgba(0,0,0,0.1)', gap: 6 } });
      ctx.restore();
    }
  }

  function framePic(ctx) {
    G.rrect(ctx, 300, 250, 190, 170, 4, { fill: C.woodDark, lw: 4, seed: 60 });
    G.rrect(ctx, 318, 268, 154, 134, 2, { fill: '#F6EFE0', lw: 3, seed: 61 });
    Ch.ball(ctx, 372, 330, 34, 0.3, { seed: 62 });
    G.text(ctx, '2026', 430, 392, { size: 34, fam: 'Caveat', color: C.kit, align: 'center' });
    G.line(ctx, [[395, 240], [460, 250]], { lw: 2, seed: 63 });
  }

  function lamp(ctx, t, on) {
    G.ellipse(ctx, 170, 812, 70, 14, { fill: '#5A4A40', lw: 3.5, seed: 64 });
    G.line(ctx, [[170, 810], [170, 380]], { lw: 8, seed: 65 });
    if (on) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const g = ctx.createRadialGradient(170, 330, 10, 170, 330, 520);
      g.addColorStop(0, 'rgba(255,214,140,0.55)');
      g.addColorStop(1, 'rgba(255,214,140,0)');
      ctx.fillStyle = g;
      ctx.fillRect(-400, -200, 1200, 1100);
      ctx.restore();
    }
    G.poly(ctx, [[115, 260], [225, 260], [262, 370], [78, 370]], { fill: on ? '#FFE3A6' : '#E9CFA0', lw: 4, seed: 66, hatch: on ? null : { color: 'rgba(120,80,30,0.2)', gap: 8 } });
  }

  function plant(ctx, t) {
    for (let i = 0; i < 9; i++) {
      const a = -Math.PI / 2 + (i - 4) * 0.32 + Math.sin(t * 1.3 + i) * 0.03;
      const len = 130 + G.rnd(i, 70) * 90;
      ctx.save();
      ctx.translate(1830, 700);
      ctx.rotate(a + Math.PI / 2);
      G.ellipse(ctx, 0, -len / 2, 26, len / 2, { fill: i % 2 ? '#5C9A5A' : '#4E8A4E', lw: 3.5, seed: 71 + i, hatch: { color: 'rgba(20,60,20,0.25)', gap: 7 } });
      ctx.restore();
    }
    G.poly(ctx, [[1760, 690], [1900, 690], [1880, 812], [1780, 812]], { fill: '#C4683F', lw: 4, seed: 80, hatch: { color: 'rgba(80,30,10,0.25)', gap: 7 } });
  }

  function couch(ctx) {
    const hatch = { color: 'rgba(10,40,40,0.25)', gap: 8 };
    G.rrect(ctx, 510, 440, 900, 280, 46, { fill: C.tealDark, lw: 5, seed: 100, hatch });
    G.rrect(ctx, 556, 468, 400, 180, 32, { fill: '#467F79', lw: 4.5, seed: 101, hatch });
    G.rrect(ctx, 964, 468, 400, 180, 32, { fill: '#467F79', lw: 4.5, seed: 102, hatch });
    G.rrect(ctx, 500, 694, 920, 104, 20, { fill: C.teal, lw: 5, seed: 103, hatch });
    G.rrect(ctx, 548, 626, 414, 84, 24, { fill: '#4F9189', lw: 4.5, seed: 104, hatch });
    G.rrect(ctx, 958, 626, 414, 84, 24, { fill: '#4F9189', lw: 4.5, seed: 105, hatch });
    G.rrect(ctx, 450, 560, 128, 240, 44, { fill: C.teal, lw: 5, seed: 106, hatch });
    G.rrect(ctx, 1342, 560, 128, 240, 44, { fill: C.teal, lw: 5, seed: 107, hatch });
    G.rrect(ctx, 520, 796, 26, 24, 4, { fill: C.ink, lw: 2, seed: 108 });
    G.rrect(ctx, 1374, 796, 26, 24, 4, { fill: C.ink, lw: 2, seed: 109 });
  }

  function table(ctx, t, st) {
    // foreground coffee table + bowl + cans
    const bx = R.BOWL.x, by = R.BOWL.y;
    const left = st.popcornLeft ?? 1;
    // popcorn heap
    if (left > 0.05) {
      for (let i = 0; i < 26 * left; i++) {
        const px = bx + (G.rnd(i, 11) - 0.5) * 150 * Math.min(1, left + 0.3);
        const py = by - 44 - G.rnd(i, 12) * 40 * left - (1 - Math.abs(px - bx) / 90) * 20 * left;
        kernel(ctx, px, py, 13 + G.rnd(i, 13) * 6, i * 0.7, 200 + i);
      }
    }
    G.poly(ctx, [[bx - 100, by - 50], [bx + 100, by - 50], [bx + 70, by + 6], [bx - 70, by + 6]], { fill: '#E24B3B', lw: 4.5, seed: 120, step: 16 });
    ctx.save();
    ctx.fillStyle = '#F6F0E2';
    for (let k = 0; k < 4; k++) ctx.fillRect(bx - 90 + k * 50, by - 44, 22, 44);
    ctx.restore();
    G.poly(ctx, [[bx - 100, by - 50], [bx + 100, by - 50], [bx + 70, by + 6], [bx - 70, by + 6]], { lw: 4.5, seed: 120, step: 16 });
    // cans
    for (const [cx, col, sd] of [[1130, '#3FA89B', 121], [1188, '#E0703E', 122]]) {
      G.rrect(ctx, cx - 22, by - 78, 44, 84, 10, { fill: col, lw: 4, seed: sd, hatch: { color: 'rgba(0,0,0,0.15)', gap: 6 } });
      G.ellipse(ctx, cx, by - 76, 20, 6, { fill: '#D7D7D7', lw: 3, seed: sd + 5 });
    }
    // remote
    G.rrect(ctx, 960, by - 16, 110, 24, 8, { fill: '#3A3A44', lw: 3.5, seed: 125 });
    ctx.fillStyle = '#E24B3B'; ctx.beginPath(); ctx.arc(1050, by - 4, 5, 0, 7); ctx.fill();
    // table top + legs
    G.rrect(ctx, 600, by + 4, 720, 40, 8, { fill: C.wood, lw: 5, seed: 126, hatch: { color: 'rgba(80,40,10,0.25)', gap: 8 } });
    G.rrect(ctx, 640, by + 44, 34, 200, 4, { fill: C.woodDark, lw: 4, seed: 127 });
    G.rrect(ctx, 1246, by + 44, 34, 200, 4, { fill: C.woodDark, lw: 4, seed: 128 });
  }

  function kernel(ctx, x, y, s, rot, seed) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    G.shape(ctx, [[-s * 0.6, 0], [-s * 0.5, -s * 0.5], [0, -s * 0.7], [s * 0.5, -s * 0.45], [s * 0.6, 0.1 * s], [s * 0.2, s * 0.5], [-s * 0.3, s * 0.45]], { fill: '#FFF4D6', lw: 2.5, seed, amp: 0.7 });
    ctx.fillStyle = 'rgba(230,170,70,0.7)';
    ctx.beginPath(); ctx.arc(s * 0.1, s * 0.15, s * 0.16, 0, 7); ctx.fill();
    ctx.restore();
  }
  R.kernel = kernel;

  // popcorn in flight + landed (analytic)
  R.popcorn = (ctx, t) => {
    const g = 2400;
    for (const p of S.popcorn) {
      if (t < p.t) continue;
      const x0 = R.BOWL.x + (G.rnd(p.seed, 1) - 0.5) * 80, y0 = R.BOWL.y - 60;
      const rest = 830 + G.rnd(p.seed, 2) * 230;
      // time to land: y0 + vy a + g a^2/2 = rest
      const A = g / 2, B = p.vy, Cc = y0 - rest;
      const land = (-B + Math.sqrt(B * B - 4 * A * Cc)) / (2 * A);
      const a = Math.min(t - p.t, land);
      const x = x0 + p.vx * a, y = y0 + p.vy * a + A * a * a;
      kernel(ctx, x, y, p.size, p.spin * a, 300 + p.seed);
    }
  };

  // confetti settled on the floor
  function floorMess(ctx, amt) {
    if (amt <= 0) return;
    ctx.save();
    ctx.globalAlpha *= amt;
    for (let i = 0; i < 160; i++) {
      const x = -100 + G.rnd(i, 21) * 2120, y = 815 + G.rnd(i, 22) * 260;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(G.rnd(i, 23) * 6);
      ctx.fillStyle = G.confettiColors[i % 6];
      ctx.fillRect(-7, -4, 14, 7);
      ctx.restore();
    }
    ctx.restore();
  }

  // ---------------- lighting ----------------
  const LIGHTS = {
    tv: ['#FFFFFF', '#C3C8EE', '#4E5080'],
    tension: ['#C4D0FA', '#6A72B0', '#1E2046'],
    party: ['#FFFFFF', '#FFF0E0', '#D9A8A0'],
    outro: ['#E4E6F6', '#8C86B0', '#2E2A48'],
  };
  R.light = (ctx, mode, intensity = 1, { flash = 0, flashColor = '#FFFFFF', lampOn = false } = {}) => {
    const L = LIGHTS[mode];
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'multiply';
    const k = U.clamp(intensity, 0, 1.3);
    const core = k >= 1 ? L[0] : R.mix('#08080F', L[0], k);
    const mid = k >= 1 ? L[1] : R.mix('#06060C', L[1], k);
    const edge = R.mix('#040408', L[2], Math.min(1, k * 1.2));
    const g = ctx.createRadialGradient(W * 0.5, H * 1.25, 60, W * 0.5, H * 0.95, W * 0.95);
    g.addColorStop(0, core);
    g.addColorStop(0.55, mid);
    g.addColorStop(1, edge);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    if (lampOn) {
      ctx.globalCompositeOperation = 'screen';
      const lg = ctx.createRadialGradient(170, 330, 20, 170, 400, 900);
      lg.addColorStop(0, 'rgba(255,190,110,0.5)');
      lg.addColorStop(0.5, 'rgba(255,170,90,0.12)');
      lg.addColorStop(1, 'rgba(255,170,90,0)');
      ctx.fillStyle = lg;
      ctx.fillRect(0, 0, W, H);
    }
    if (mode === 'tv' || mode === 'tension') {
      // cool TV spill
      ctx.globalCompositeOperation = 'screen';
      const tg = ctx.createRadialGradient(W * 0.5, H * 1.1, 10, W * 0.5, H * 1.1, H * 0.9);
      tg.addColorStop(0, `rgba(120,150,255,${0.18 * k})`);
      tg.addColorStop(1, 'rgba(120,150,255,0)');
      ctx.fillStyle = tg;
      ctx.fillRect(0, 0, W, H);
    }
    if (flash > 0) {
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = U.clamp(flash);
      ctx.fillStyle = flashColor;
      ctx.fillRect(0, 0, W, H);
    }
    ctx.restore();
  };

  // ---------------- full room draw ----------------
  // st: { cam, afaq, claude, claudeBehind, popcornLeft, popcornFly, mess, fireworks, lampOn, pillowFly, extra(ctx) }
  R.draw = (ctx, t, st) => {
    R.withCam(ctx, st.cam, () => {
      wall(ctx);
      windowPane(ctx, t, st);
      bunting(ctx, t);
      framePic(ctx);
      lamp(ctx, t, st.lampOn);
      plant(ctx, t);
      floorMess(ctx, st.mess || 0);
      if (st.claude && st.claudeBehind) Ch.claude(ctx, st.claude);
      couch(ctx);
      if (st.pillowFloor) G.rrect(ctx, 250, 800, 190, 100, 36, { fill: '#E3B04B', lw: 4.5, seed: 345, hatch: { color: 'rgba(140,90,20,0.25)', gap: 8 } });
      if (st.beforeChars) st.beforeChars(ctx);
      const drawA = () => st.afaq && Ch.afaq(ctx, st.afaq);
      const drawC = () => st.claude && !st.claudeBehind && Ch.claude(ctx, st.claude);
      if (st.claudeFirst) { drawC(); drawA(); } else { drawA(); drawC(); }
      if (st.afterChars) st.afterChars(ctx);
      table(ctx, t, st);
      if (st.popcornFly) R.popcorn(ctx, t);
      if (st.pillowFly !== undefined && st.pillowFly >= 0) {
        const a = st.pillowFly;
        ctx.save();
        ctx.translate(760 - 900 * a, 520 - 900 * a + 1500 * a * a);
        ctx.rotate(-a * 9);
        G.rrect(ctx, -104, -58, 208, 116, 40, { fill: '#E3B04B', lw: 4.5, seed: 345, hatch: { color: 'rgba(140,90,20,0.25)', gap: 8 } });
        ctx.restore();
      }
      if (st.world) st.world(ctx);
    });
  };

  globalThis.R = R;
})();
