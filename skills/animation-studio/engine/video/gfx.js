// Hand-drawn graphics toolkit: boiling pencil lines, hatching, torn paper, tape, text.
(function () {
  const U = globalThis.U;
  const G = {};
  // frame size from score.js (FORMAT: '16:9' | '9:16' | '1:1' | '4:5' | [w, h]), 1920x1080 by default.
  // Lay films out with G.W / G.H and keep text inside G.SAFE (see U.safeArea).
  [G.W, G.H] = U.formatSize(globalThis.SCORE && globalThis.SCORE.FORMAT);
  G.SAFE = U.safeArea(G.W, G.H);
  G.t = 0;
  G.boil = 0;

  G.C = {
    ink: '#2A2320',
    paper: '#F4EDE0',
    cream: '#F6F0E2',
    claude: '#D97757',
    claudeDark: '#B45A3C',
    kit: '#E0703E',
    kitDark: '#B9532A',
    teal: '#3D7A74',
    tealDark: '#2B5C57',
    navy: '#27305C',
    navyDark: '#1A2045',
    gold: '#F2B84B',
    pink: '#E8718D',
    skin: '#C98A62',
    skinDark: '#A86E4B',
    hair: '#2B211E',
    grass: '#4E9A57',
    grassDark: '#3E8549',
    wall: '#E7D6BC',
    wood: '#B98A5E',
    woodDark: '#8E6444',
  };

  G.setTime = (t) => {
    G.t = t;
    G.boil = Math.floor(t * 12); // lines re-draw at 12fps, like hand animation "on twos"
  };

  const H = U.hash;
  G.rnd = (...xs) => H(...xs);
  G.jit = (seed, i, amp) => [(H(seed, i, G.boil) - 0.5) * 2 * amp, (H(seed, i + 7919, G.boil) - 0.5) * 2 * amp];
  G.wobble = (pts, seed, amp = 1.8) => pts.map((p, i) => { const j = G.jit(seed, i, amp); return [p[0] + j[0], p[1] + j[1]]; });

  // ---------- point generators ----------
  G.rrPts = (x, y, w, h, r, step = 22) => {
    r = Math.min(r, w / 2, h / 2);
    const pts = [];
    const edge = (x0, y0, x1, y1) => {
      const len = Math.hypot(x1 - x0, y1 - y0);
      const n = Math.max(1, Math.round(len / step));
      for (let i = 0; i < n; i++) pts.push([x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n]);
    };
    const arc = (cx, cy, a0) => {
      const n = Math.max(2, Math.round((r * Math.PI) / 2 / step));
      for (let i = 0; i < n; i++) { const a = a0 + (i / n) * (Math.PI / 2); pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
    };
    edge(x + r, y, x + w - r, y); arc(x + w - r, y + r, -Math.PI / 2);
    edge(x + w, y + r, x + w, y + h - r); arc(x + w - r, y + h - r, 0);
    edge(x + w - r, y + h, x + r, y + h); arc(x + r, y + h - r, Math.PI / 2);
    edge(x, y + h - r, x, y + r); arc(x + r, y + r, Math.PI);
    return pts;
  };
  G.ellPts = (cx, cy, rx, ry, n = 0) => {
    n = n || Math.max(10, Math.round((Math.PI * (rx + ry)) / 20));
    const pts = [];
    for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); }
    return pts;
  };
  G.polyPts = (arr, step = 22) => {
    // arr: corner points of a closed polygon -> subdivided points
    const pts = [];
    for (let i = 0; i < arr.length; i++) {
      const a = arr[i], b = arr[(i + 1) % arr.length];
      const n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / step));
      for (let k = 0; k < n; k++) pts.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]);
    }
    return pts;
  };

  // smooth closed/open path through points
  G.path = (ctx, p, closed = true) => {
    const n = p.length;
    if (n < 2) return;
    if (!closed) {
      ctx.moveTo(p[0][0], p[0][1]);
      for (let i = 1; i < n - 1; i++) {
        const mx = (p[i][0] + p[i + 1][0]) / 2, my = (p[i][1] + p[i + 1][1]) / 2;
        ctx.quadraticCurveTo(p[i][0], p[i][1], mx, my);
      }
      ctx.lineTo(p[n - 1][0], p[n - 1][1]);
      return;
    }
    let mx = (p[n - 1][0] + p[0][0]) / 2, my = (p[n - 1][1] + p[0][1]) / 2;
    ctx.moveTo(mx, my);
    for (let i = 0; i < n; i++) {
      const a = p[i], b = p[(i + 1) % n];
      ctx.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
    }
    ctx.closePath();
  };

  const bbox = (p) => {
    let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity;
    for (const q of p) { if (q[0] < a) a = q[0]; if (q[1] < b) b = q[1]; if (q[0] > c) c = q[0]; if (q[1] > d) d = q[1]; }
    return [a, b, c, d];
  };
  G.bbox = bbox;

  // pencil hatching inside current clip
  G.hatch = (ctx, box, { color = 'rgba(0,0,0,0.18)', gap = 8, angle = -0.95, lw = 1.6, seed = 3, jitter = 1.5 } = {}) => {
    const [x0, y0, x1, y1] = box;
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    const R = Math.hypot(x1 - x0, y1 - y0) / 2 + 4;
    const ca = Math.cos(angle), sa = Math.sin(angle);
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = lw;
    ctx.lineCap = 'round';
    ctx.beginPath();
    let k = 0;
    for (let d = -R; d <= R; d += gap, k++) {
      const j1 = (H(seed, k, G.boil) - 0.5) * jitter * 2, j2 = (H(seed + 1, k, G.boil) - 0.5) * jitter * 2;
      const ax = cx + ca * -R - sa * (d + j1), ay = cy + sa * -R + ca * (d + j1);
      const bx = cx + ca * R - sa * (d + j2), by = cy + sa * R + ca * (d + j2);
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
    }
    ctx.stroke();
    ctx.restore();
  };

  // the workhorse: fill + hatch + double pencil outline
  G.shape = (ctx, pts, o = {}) => {
    const { fill, stroke = G.C.ink, lw = 4, seed = 1, amp = 1.6, hatch, closed = true, alpha = 1, second = true } = o;
    const p = amp > 0 ? G.wobble(pts, seed, amp) : pts;
    ctx.save();
    if (alpha !== 1) ctx.globalAlpha *= alpha;
    ctx.beginPath();
    G.path(ctx, p, closed);
    if (fill && closed) { ctx.fillStyle = fill; ctx.fill(); }
    if (hatch && closed) {
      ctx.save();
      ctx.clip();
      G.hatch(ctx, bbox(p), Object.assign({ seed: seed + 11 }, hatch));
      ctx.restore();
      ctx.beginPath();
      G.path(ctx, p, closed);
    }
    if (stroke && lw > 0) {
      ctx.lineWidth = lw;
      ctx.strokeStyle = stroke;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.stroke();
      if (second) {
        const p2 = G.wobble(pts, seed + 5, amp * 1.4 + 0.6);
        ctx.beginPath();
        G.path(ctx, p2, closed);
        ctx.globalAlpha *= 0.3;
        ctx.lineWidth = Math.max(1, lw * 0.55);
        ctx.stroke();
      }
    }
    ctx.restore();
    return p;
  };

  G.rrect = (ctx, x, y, w, h, r, o) => G.shape(ctx, G.rrPts(x, y, w, h, r, o && o.step), o);
  G.ellipse = (ctx, cx, cy, rx, ry, o) => G.shape(ctx, G.ellPts(cx, cy, rx, ry), o);
  G.poly = (ctx, corners, o) => G.shape(ctx, G.polyPts(corners, (o && o.step) || 22), o);

  // wobbly pencil line (open)
  G.line = (ctx, pts, { color = G.C.ink, lw = 4, seed = 9, amp = 1.4, step = 20, alpha = 1 } = {}) => {
    const sub = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / step));
      for (let k = 0; k < n; k++) sub.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]);
    }
    sub.push(pts[pts.length - 1]);
    const p = G.wobble(sub, seed, amp);
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = lw;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    G.path(ctx, p, false);
    ctx.stroke();
    ctx.restore();
  };

  // noodle limb: thick outlined curve
  G.limb = (ctx, pts, { color, lw = 26, ink = G.C.ink, outline = 4.5, seed = 1 } = {}) => {
    const p = G.wobble(pts, seed, 1.2);
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    G.path(ctx, p, false);
    ctx.strokeStyle = ink;
    ctx.lineWidth = lw + outline * 2;
    ctx.stroke();
    ctx.strokeStyle = color;
    ctx.lineWidth = lw;
    ctx.stroke();
    ctx.restore();
  };

  // ---------- torn paper ----------
  G.tornPts = (x, y, w, h, seed, tear = 4, step = 11) => {
    const pts = [];
    const r = (i) => (H(seed, i) - 0.5) * 2 * tear;
    let i = 0;
    for (let s = 0; s < w; s += step) pts.push([x + s, y + r(i++)]);
    for (let s = 0; s < h; s += step) pts.push([x + w + r(i++), y + s]);
    for (let s = w; s > 0; s -= step) pts.push([x + s, y + h + r(i++)]);
    for (let s = h; s > 0; s -= step) pts.push([x + r(i++), y + s]);
    return pts;
  };
  G.tornPaper = (ctx, x, y, w, h, { fill = G.C.cream, seed = 1, shadow = true, edge = '#FFFFFF', tear = 4 } = {}) => {
    const pts = G.tornPts(x, y, w, h, seed, tear);
    ctx.save();
    if (shadow) {
      ctx.fillStyle = 'rgba(30,20,15,0.28)';
      ctx.beginPath();
      pts.forEach((p, i) => (i ? ctx.lineTo(p[0] + 6, p[1] + 8) : ctx.moveTo(p[0] + 6, p[1] + 8)));
      ctx.closePath();
      ctx.fill();
    }
    if (edge) {
      // white torn fibre edge under the coloured paper
      const pe = G.tornPts(x - 5, y - 5, w + 10, h + 10, seed + 3, tear * 1.2, 9);
      ctx.fillStyle = edge;
      ctx.beginPath();
      pe.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = fill;
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    return pts;
  };

  G.tape = (ctx, x, y, w, h, rot, seed = 1) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    const pts = G.tornPts(-w / 2, -h / 2, w, h, seed, 1.6, 7);
    ctx.fillStyle = 'rgba(236,222,180,0.82)';
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(160,140,100,0.25)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  };

  // ---------- text ----------
  G.font = (size, fam = 'Caveat', weight = 700) => `${weight} ${size}px "${fam}"`;
  G.text = (ctx, str, x, y, { size = 48, fam = 'Caveat', weight = 700, color = G.C.ink, align = 'left', baseline = 'alphabetic', boil = 0.8, alpha = 1, stroke, strokeW = 8 } = {}) => {
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.font = G.font(size, fam, weight);
    ctx.textAlign = align;
    ctx.textBaseline = baseline;
    const j = G.jit(str.length * 13 + size, 1, boil);
    if (stroke) {
      ctx.lineJoin = 'round';
      ctx.strokeStyle = stroke;
      ctx.lineWidth = strokeW;
      ctx.strokeText(str, x + j[0], y + j[1]);
    }
    ctx.fillStyle = color;
    ctx.fillText(str, x + j[0], y + j[1]);
    ctx.restore();
  };
  G.measure = (ctx, str, size, fam = 'Caveat', weight = 700) => {
    ctx.save();
    ctx.font = G.font(size, fam, weight);
    const w = ctx.measureText(str).width;
    ctx.restore();
    return w;
  };

  // taped caption note with a pop-in
  G.caption = (ctx, c, t) => {
    if (t < c.t || t > c.end + 0.2) return;
    const u = U.clamp((t - c.t) / 0.32);
    const out = U.clamp((t - c.end) / 0.2);
    const sc = (0.55 + 0.45 * U.ease.outBack(u, 2.2)) * (1 - 0.3 * out);
    const alpha = U.clamp(u * 4) * (1 - out);
    const wob = U.springKick(t, c.t, 3.2, 6) * 0.06;
    const size = c.size || 56;
    const tw = G.measure(ctx, c.text, size);
    const w = tw + 70, h = size * 1.45;
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.translate(c.x + w / 2, c.y + h / 2 - 30 * (1 - U.ease.outCubic(u)));
    ctx.rotate(c.rot + wob);
    ctx.scale(sc, sc);
    G.tornPaper(ctx, -w / 2, -h / 2, w, h, { seed: Math.round(c.t * 10), fill: c.small ? '#FFF7D6' : G.C.cream });
    G.text(ctx, c.text, 0, size * 0.33, { size, align: 'center', color: G.C.ink });
    G.tape(ctx, -w / 2 + 16, -h / 2 + 2, 70, 26, -0.6, Math.round(c.t * 3));
    G.tape(ctx, w / 2 - 16, -h / 2 + 2, 70, 26, 0.55, Math.round(c.t * 5));
    ctx.restore();
  };

  // speech bubble with tail pointing at (tx, ty)
  G.bubble = (ctx, text, x, y, tx, ty, t, t0, t1, { size = 58 } = {}) => {
    if (t < t0 || t > t1 + 0.2) return;
    const u = U.clamp((t - t0) / 0.3);
    const out = U.clamp((t - t1) / 0.2);
    const sc = (0.3 + 0.7 * U.ease.outBack(u, 2.5)) * (1 - out * 0.4);
    const tw = G.measure(ctx, text, size);
    const w = tw + 70, h = size * 1.5;
    ctx.save();
    ctx.globalAlpha *= U.clamp(u * 4) * (1 - out);
    ctx.translate(x, y);
    ctx.scale(sc, sc);
    const seed = Math.round(t0 * 10);
    const pts = G.rrPts(-w / 2, -h / 2, w, h, 36, 18);
    // tail
    const ax = (tx - x) / sc, ay = (ty - y) / sc;
    ctx.fillStyle = 'rgba(20,15,30,0.25)';
    ctx.beginPath(); G.path(ctx, pts.map((p) => [p[0] + 6, p[1] + 8])); ctx.fill();
    G.poly(ctx, [[-22, h / 2 - 4], [ax * 0.55, ay * 0.55], [18, h / 2 - 4]], { fill: '#FFFFFF', lw: 4, seed: seed + 1 });
    G.shape(ctx, pts, { fill: '#FFFFFF', lw: 4.5, seed });
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(-26, h / 2 - 14, 48, 14);
    G.text(ctx, text, 0, size * 0.3, { size, align: 'center' });
    ctx.restore();
  };

  // ---------- textures ----------
  G.makeCanvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  G.initTextures = () => {
    // paper grain: near-white with specks and fibres (multiplied over everything)
    const pg = G.makeCanvas(G.W, G.H);
    const x = pg.getContext('2d');
    x.fillStyle = '#FFFFFF';
    x.fillRect(0, 0, G.W, G.H);
    const r = U.mulberry32(5);
    for (let i = 0; i < 90000; i++) {
      const v = 200 + Math.floor(r() * 55);
      x.fillStyle = `rgba(${v - 20},${v - 28},${v - 40},${0.08 + r() * 0.12})`;
      x.fillRect(r() * G.W, r() * G.H, 1 + r() * 2, 1 + r() * 2);
    }
    x.lineCap = 'round';
    for (let i = 0; i < 900; i++) {
      x.strokeStyle = `rgba(150,130,100,${0.04 + r() * 0.06})`;
      x.lineWidth = 0.6 + r();
      const px = r() * G.W, py = r() * G.H, a = r() * Math.PI * 2, l = 6 + r() * 26;
      x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + Math.cos(a) * l * 0.5 + r() * 6, py + Math.sin(a) * l * 0.5 + r() * 6, px + Math.cos(a) * l, py + Math.sin(a) * l); x.stroke();
    }
    // large soft blotches
    for (let i = 0; i < 40; i++) {
      const gx = r() * G.W, gy = r() * G.H, gr = 80 + r() * 260;
      const gg = x.createRadialGradient(gx, gy, 0, gx, gy, gr);
      gg.addColorStop(0, `rgba(210,190,160,${0.05 + r() * 0.05})`);
      gg.addColorStop(1, 'rgba(210,190,160,0)');
      x.fillStyle = gg;
      x.fillRect(gx - gr, gy - gr, gr * 2, gr * 2);
    }
    G.paperTex = pg;
    // film grain tiles
    G.grain = [];
    for (let k = 0; k < 4; k++) {
      const c = G.makeCanvas(512, 512);
      const gx = c.getContext('2d');
      const img = gx.createImageData(512, 512);
      const rr = U.mulberry32(100 + k);
      for (let i = 0; i < img.data.length; i += 4) {
        const v = 128 + (rr() - 0.5) * 120;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
        img.data[i + 3] = 255;
      }
      gx.putImageData(img, 0, 0);
      G.grain.push(c);
    }
  };

  G.post = (ctx, t, { vignette = 0.35, grain = 0.05, paper = 0.55 } = {}) => {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (paper > 0) {
      ctx.globalCompositeOperation = 'multiply';
      ctx.globalAlpha = paper;
      ctx.drawImage(G.paperTex, 0, 0);
    }
    if (vignette > 0) {
      ctx.globalCompositeOperation = 'multiply';
      ctx.globalAlpha = 1;
      const m = Math.min(G.W, G.H);
      const g = ctx.createRadialGradient(G.W / 2, G.H / 2, m * 0.35, G.W / 2, G.H / 2, m * 1.05);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(1, `rgba(${Math.round(255 * (1 - vignette))},${Math.round(250 * (1 - vignette))},${Math.round(245 * (1 - vignette))},1)`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, G.W, G.H);
    }
    if (grain > 0) {
      ctx.globalCompositeOperation = 'overlay';
      ctx.globalAlpha = grain;
      const tile = G.grain[G.boil % 4];
      const ox = -Math.floor(H(G.boil, 1) * 512), oy = -Math.floor(H(G.boil, 2) * 512);
      for (let y = oy; y < G.H; y += 512) for (let x = ox; x < G.W; x += 512) ctx.drawImage(tile, x, y);
    }
    ctx.restore();
  };

  // ---------- particles ----------
  G.confettiColors = ['#E0703E', '#F2B84B', '#F6F0E2', '#3FA89B', '#E8718D', '#B79CFF'];
  // falling confetti, analytic in t (starts at t0)
  G.confetti = (ctx, t, t0, { n = 140, seed = 1, x0 = 0, x1 = G.W, spawn = 1.2, fall = 260, until = Infinity } = {}) => {
    if (t < t0) return;
    ctx.save();
    for (let i = 0; i < n; i++) {
      const born = t0 + H(seed, i, 1) * spawn;
      const age = t - born;
      if (age < 0) continue;
      if (t > until && age > 0) { /* keep falling */ }
      const x = x0 + H(seed, i, 2) * (x1 - x0) + Math.sin(age * (1.5 + H(seed, i, 3) * 2) + i) * 40;
      const burst = H(seed, i, 9) < 0.5 ? -420 * Math.exp(-age * 3) : 0;
      const y = -40 + age * (fall + H(seed, i, 4) * 180) + burst * 0.4;
      if (y > G.H + 40) continue;
      const rot = age * (3 + H(seed, i, 5) * 6) + i;
      const w = 10 + H(seed, i, 6) * 10, h = 6 + H(seed, i, 7) * 6;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.scale(1, Math.cos(age * (4 + H(seed, i, 8) * 5)));
      ctx.fillStyle = G.confettiColors[i % G.confettiColors.length];
      ctx.fillRect(-w / 2, -h / 2, w, h);
      ctx.restore();
    }
    ctx.restore();
  };

  // firework burst at (x,y) px; t relative to burst time
  G.firework = (ctx, f, t, x, y, scale = 1) => {
    const age = t - f.t;
    const la = f.launch;
    if (age < -la || age > 2.2) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    if (age < 0) {
      // rising rocket
      const u = 1 + age / la; // 0..1
      const sy = y + (1 - U.ease.outQuad(u)) * 520 * scale;
      const sx = x + Math.sin(u * 9 + f.seed) * 6;
      for (let k = 0; k < 8; k++) {
        const uu = Math.max(0, u - k * 0.025);
        const ty = y + (1 - U.ease.outQuad(uu)) * 520 * scale;
        ctx.fillStyle = `rgba(255,220,160,${0.5 * (1 - k / 8)})`;
        ctx.beginPath(); ctx.arc(sx, ty, 3 * scale * (1 - k / 10), 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
      return;
    }
    const size = f.size * scale;
    // flash
    if (age < 0.25) {
      const g = ctx.createRadialGradient(x, y, 0, x, y, 180 * size);
      g.addColorStop(0, `rgba(255,245,220,${0.6 * (1 - age / 0.25)})`);
      g.addColorStop(1, 'rgba(255,245,220,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - 200 * size, y - 200 * size, 400 * size, 400 * size);
    }
    const n = 54;
    const fade = Math.max(0, 1 - age / 1.9);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + H(f.seed, i) * 0.12;
      const sp = (230 + H(f.seed, i, 2) * 90) * size;
      const drag = (1 - Math.exp(-age * 2.6)) / 2.6;
      const px = x + Math.cos(a) * sp * drag;
      const py = y + Math.sin(a) * sp * drag + 60 * age * age * size;
      const col = i % 3 === 0 ? f.color2 : f.color;
      // trail
      const drag2 = (1 - Math.exp(-Math.max(0, age - 0.08) * 2.6)) / 2.6;
      const qx = x + Math.cos(a) * sp * drag2, qy = y + Math.sin(a) * sp * drag2 + 60 * Math.max(0, age - 0.08) ** 2 * size;
      ctx.strokeStyle = col;
      ctx.globalAlpha = fade * 0.8;
      ctx.lineWidth = 3 * size;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(qx, qy); ctx.lineTo(px, py); ctx.stroke();
      const tw = age > 0.9 ? (H(f.seed, i, G.boil) > 0.5 ? 1 : 0.25) : 1;
      ctx.globalAlpha = fade * tw;
      ctx.fillStyle = '#FFF6E0';
      ctx.beginPath(); ctx.arc(px, py, 2.6 * size, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  };

  // ink burst rays (impact frames)
  G.rays = (ctx, cx, cy, { n = 36, r0 = 120, r1 = 1400, color = G.C.ink, lw = 5, seed = 1, alpha = 1, spin = 0 } = {}) => {
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.strokeStyle = color;
    ctx.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + H(seed, i, G.boil) * 0.12 + spin;
      const a0 = r0 * (0.8 + H(seed, i, 3) * 0.6);
      const a1 = r1 * (0.6 + H(seed, i, 4) * 0.5);
      ctx.lineWidth = lw * (0.5 + H(seed, i, 5));
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * a0, cy + Math.sin(a) * a0);
      ctx.lineTo(cx + Math.cos(a) * a1, cy + Math.sin(a) * a1);
      ctx.stroke();
    }
    ctx.restore();
  };

  // a user's own image (photo, logo, drawing) as a taped paper print, so it sits in the hand-drawn world.
  // img comes from Studio.loadImage('assets/xyz.png') inside Studio.film({ init }). Cover-fits the frame.
  G.photo = (ctx, img, x, y, w, h, { rot = 0, seed = 1, caption = '', border = 18, tape = true } = {}) => {
    const bottom = caption ? border * 3.2 : border;
    const W2 = w + border * 2, H2 = h + border + bottom;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    G.tornPaper(ctx, -W2 / 2, -H2 / 2, W2, H2, { fill: '#FBF8F0', seed, tear: 1.5, edge: null });
    if (img && img.width) {
      const ir = img.width / img.height, r = w / h;
      let sw = img.width, sh = img.height, sx = 0, sy = 0;
      if (ir > r) { sw = img.height * r; sx = (img.width - sw) / 2; } else { sh = img.width / r; sy = (img.height - sh) / 2; }
      ctx.drawImage(img, sx, sy, sw, sh, -W2 / 2 + border, -H2 / 2 + border, w, h);
    }
    ctx.strokeStyle = 'rgba(40,30,20,0.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(-W2 / 2 + border, -H2 / 2 + border, w, h);
    if (caption) G.text(ctx, caption, 0, H2 / 2 - bottom * 0.3, { size: bottom * 0.52, align: 'center' });
    if (tape) G.tape(ctx, 0, -H2 / 2 + 4, 110, 30, 0.04, seed + 3);
    ctx.restore();
  };

  G.star = (ctx, x, y, r, { fill = G.C.gold, rot = 0, seed = 1, lw = 3 } = {}) => {
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const a = rot - Math.PI / 2 + (i * Math.PI) / 5;
      const rr = i % 2 === 0 ? r : r * 0.45;
      pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]);
    }
    G.shape(ctx, pts, { fill, lw, seed, amp: 0.8 });
  };

  G.heart = (ctx, x, y, s, { fill = '#E0506A', seed = 1 } = {}) => {
    const pts = [];
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2;
      const hx = 16 * Math.pow(Math.sin(a), 3);
      const hy = -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a));
      pts.push([x + hx * s, y + hy * s]);
    }
    G.shape(ctx, pts, { fill, lw: 3, seed, amp: 0.7, hatch: { color: 'rgba(120,20,40,0.25)', gap: 6 } });
  };

  globalThis.G = G;
})();
