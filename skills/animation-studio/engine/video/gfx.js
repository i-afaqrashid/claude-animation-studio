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
    G.boil = Math.floor(t * (G.style ? G.style.boilFps : 12)); // lines re-draw at 12fps, like hand animation "on twos"
  };

  // ---------- style packs: one switch changes how every shape, line, text and the finish look ----------
  // score.js: STYLE: 'chalk' (or render with --style chalk). Films keep their own colours; a style changes
  // the technique. Dark styles (chalk, neon) also give G.C.ink a light colour and G.bg(ctx) a board.
  G.STYLES = {
    paper: { amp: 1, lw: 1, second: true, hatch: true, textBoil: 1, boilFps: 12, post: { paper: 0.55, grain: 0.05, vignette: 0.35 } },
    flat: { amp: 0, lw: 0, second: false, hatch: false, textBoil: 0, boilFps: 12, flat: true, post: { paper: 0, grain: 0, vignette: 0.1 } },
    pixel: { amp: 0, lw: 1, second: false, hatch: false, textBoil: 0, boilFps: 8, pixel: 6, post: { paper: 0, grain: 0, vignette: 0.12 } },
    chalk: { amp: 1.5, lw: 0.9, second: true, hatch: true, textBoil: 1.2, boilFps: 8, chalk: true, bg: '#2E4638', ink: '#F2EEE3', post: { paper: 0, grain: 0.06, vignette: 0.45, chalk: 1 } },
    neon: { amp: 0.3, lw: 0.8, second: false, hatch: false, textBoil: 0.2, boilFps: 12, neon: true, bg: '#07071A', ink: '#DDF3FF', post: { paper: 0, grain: 0.04, vignette: 0.5, bloom: 0.9 } },
    watercolor: { amp: 1.4, lw: 0.5, second: false, hatch: false, textBoil: 0.6, boilFps: 6, wash: true, post: { paper: 0.95, grain: 0.03, vignette: 0.22 } },
  };
  const INK0 = G.C.ink;
  G.setStyle = (name = 'paper', over = {}) => {
    const base = G.STYLES[name];
    if (!base) throw new Error(`unknown style "${name}" (${Object.keys(G.STYLES).join(', ')})`);
    G.styleName = name;
    G.style = Object.assign({}, base, over, { post: Object.assign({}, base.post, over.post || {}) });
    G.C.ink = G.style.ink || INK0;
    return G.style;
  };
  // the style's background (a chalkboard, a night for neon, paper otherwise); `color` for the paper look
  G.bg = (ctx, color = G.C.paper) => {
    const S = G.style;
    ctx.save();
    ctx.fillStyle = S.bg || color;
    ctx.fillRect(0, 0, G.W, G.H);
    if (S.chalk) { // smudges of old chalk
      for (let i = 0; i < 26; i++) {
        const x = H(i, 1) * G.W, y = H(i, 2) * G.H, r = 120 + H(i, 3) * 380;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, `rgba(255,255,255,${0.025 + H(i, 4) * 0.035})`); g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g; ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
      }
    }
    if (S.neon) { const g = ctx.createRadialGradient(G.W / 2, G.H * 0.6, 0, G.W / 2, G.H * 0.6, Math.max(G.W, G.H) * 0.8); g.addColorStop(0, 'rgba(60,30,120,0.35)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, G.W, G.H); }
    ctx.restore();
  };
  const hexRGB = (c) => { const m = /^#([0-9a-f]{6})$/i.exec(String(c).trim()); if (!m) return null; const n = parseInt(m[1], 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
  // a colour pushed toward full brightness (neon tubes), or darkened (a watercolour's pooled edge)
  G.tint = (c, k) => { const v = hexRGB(c); if (!v) return c; const f = (x) => Math.round(k >= 0 ? x + (255 - x) * k : x * (1 + k)); return `rgb(${f(v[0])},${f(v[1])},${f(v[2])})`; };
  // a wobble that does not boil (watercolour washes stay put)
  const still = (pts, seed, amp) => pts.map((p, i) => [p[0] + (H(seed, i) - 0.5) * 2 * amp, p[1] + (H(seed, i + 7919) - 0.5) * 2 * amp]);
  // chalk and neon strokes
  const styledStroke = (ctx, pts, closed, color, lw, seed) => {
    const S = G.style;
    if (S.neon) {
      ctx.save();
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.shadowColor = color; ctx.shadowBlur = 22 * (G.scale || 1);
      ctx.strokeStyle = color; ctx.lineWidth = Math.max(2, lw);
      ctx.beginPath(); G.path(ctx, pts, closed); ctx.stroke();
      ctx.shadowBlur = 0; ctx.strokeStyle = G.tint(color, 0.75); ctx.lineWidth = Math.max(1, lw * 0.35);
      ctx.stroke();
      ctx.restore();
      return true;
    }
    if (S.chalk) {
      ctx.save();
      ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.strokeStyle = color;
      for (let pass = 0; pass < 2; pass++) {
        const p = pass ? G.wobble(pts, seed + 17, 2.4) : pts;
        ctx.globalAlpha *= pass ? 0.55 : 0.9;
        ctx.lineWidth = Math.max(1.5, lw * (pass ? 0.6 : 0.95));
        const d = lw * 3;
        ctx.setLineDash([d * (1.2 + H(seed, pass)), d * 0.18, d * (0.7 + H(seed, pass + 3)), d * 0.3]);
        ctx.lineDashOffset = H(seed, G.boil, pass) * d * 3;
        ctx.beginPath(); G.path(ctx, p, closed); ctx.stroke();
      }
      ctx.restore();
      return true;
    }
    return false;
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

  // the workhorse: fill + hatch + double pencil outline (each style draws it its own way)
  G.shape = (ctx, pts, o = {}) => {
    const S = G.style;
    const { fill, stroke = G.C.ink, seed = 1, closed = true, alpha = 1 } = o;
    const amp = (o.amp ?? 1.6) * S.amp, lw = (o.lw ?? 4) * (S.flat && fill ? 0 : S.flat ? 1 : S.lw);
    const hatch = S.hatch ? o.hatch : null, second = (o.second ?? true) && S.second;
    const p = amp > 0 ? G.wobble(pts, seed, amp) : pts;
    ctx.save();
    if (alpha !== 1) ctx.globalAlpha *= alpha;
    if (S.wash && fill && closed) {
      // watercolour: three thin, slightly different washes, and pigment pooled at the edge
      const edge = G.tint(fill, -0.25);
      for (let k = 0; k < 3; k++) { const q = still(pts, seed + k * 31, 5 + k * 3); ctx.beginPath(); G.path(ctx, q, true); ctx.globalAlpha = alpha * 0.36; ctx.fillStyle = fill; ctx.fill(); if (k === 0) { ctx.globalAlpha = alpha * 0.3; ctx.strokeStyle = edge; ctx.lineWidth = 3.5; ctx.stroke(); } }
      ctx.globalAlpha = alpha;
    } else if (S.neon && fill && closed) {
      ctx.beginPath(); G.path(ctx, p, closed);
      ctx.globalAlpha *= 0.16; ctx.fillStyle = fill; ctx.fill(); ctx.globalAlpha /= 0.16;
    } else {
      ctx.beginPath();
      G.path(ctx, p, closed);
      if (fill && closed) { if (S.chalk) ctx.globalAlpha *= 0.6; ctx.fillStyle = fill; ctx.fill(); if (S.chalk) ctx.globalAlpha /= 0.6; }
      if (S.chalk && fill && closed) { ctx.save(); ctx.clip(); G.hatch(ctx, bbox(p), { color: fill, gap: 5, lw: 2.4, jitter: 3, angle: -0.8, seed: seed + 3 }); ctx.restore(); }
    }
    if (hatch && closed && !S.wash) {
      ctx.save();
      ctx.beginPath(); G.path(ctx, p, closed);
      ctx.clip();
      G.hatch(ctx, bbox(p), Object.assign({ seed: seed + 11 }, hatch));
      ctx.restore();
    }
    const col = S.neon && (!stroke || stroke === G.C.ink) && fill ? G.tint(fill, 0.25) : stroke;
    if (col && lw > 0) {
      if (!styledStroke(ctx, p, closed, col, lw, seed)) {
        ctx.beginPath();
        G.path(ctx, p, closed);
        ctx.lineWidth = lw;
        ctx.strokeStyle = col;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        if (S.wash) ctx.globalAlpha *= 0.55;
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
    }
    ctx.restore();
    return p;
  };

  G.rrect = (ctx, x, y, w, h, r, o) => G.shape(ctx, G.rrPts(x, y, w, h, r, o && o.step), o);
  G.ellipse = (ctx, cx, cy, rx, ry, o) => G.shape(ctx, G.ellPts(cx, cy, rx, ry), o);
  G.poly = (ctx, corners, o) => G.shape(ctx, G.polyPts(corners, (o && o.step) || 22), o);

  // wobbly pencil line (open)
  G.line = (ctx, pts, { color = G.C.ink, lw = 4, seed = 9, amp = 1.4, step = 20, alpha = 1 } = {}) => {
    amp *= G.style.amp; if (!G.style.flat) lw *= G.style.lw;
    const sub = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / step));
      for (let k = 0; k < n; k++) sub.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]);
    }
    sub.push(pts[pts.length - 1]);
    const p = amp > 0 ? G.wobble(sub, seed, amp) : sub;
    ctx.save();
    ctx.globalAlpha *= alpha;
    if (styledStroke(ctx, p, false, color, lw, seed)) { ctx.restore(); return; }
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
    const p = G.style.amp > 0 ? G.wobble(pts, seed, 1.2 * G.style.amp) : pts;
    if (G.style.flat) outline = 0;
    if (G.style.neon) { styledStroke(ctx, p, false, G.tint(color, 0.2), lw * 0.5, seed); return; }
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

  // ---------- text (any script) ----------
  // A string is split into runs by script, and each run gets a font that has its letters:
  // Nastaliq for Urdu, Naskh for Arabic, Noto Sans Devanagari for Hindi (bundled in engine/fonts),
  // the requested font for everything else. Right-to-left runs are drawn with direction 'rtl' and
  // the runs are laid out in reading order, so "Order on WhatsApp · آرڈر کریں" just works.
  G.SCRIPT_FONTS = { urdu: 'Noto Nastaliq Urdu', arabic: 'Noto Naskh Arabic', devanagari: 'Noto Sans Devanagari' };
  G.SCRIPT_SCALE = { urdu: 0.9, arabic: 1, devanagari: 0.92 }; // match the Latin x-height
  const NEUTRAL = /[\s\d.,:;!?'"()[\]\-–—·•…/%+&@#*=<>|_~^$€£¥₹]/;
  const scriptOf = (ch) => {
    const cp = ch.codePointAt(0);
    if ((cp >= 0x0600 && cp <= 0x06ff) || (cp >= 0x0750 && cp <= 0x077f) || (cp >= 0xfb50 && cp <= 0xfdff) || (cp >= 0xfe70 && cp <= 0xfeff)) return 'arab';
    if ((cp >= 0x0900 && cp <= 0x097f) || (cp >= 0xa8e0 && cp <= 0xa8ff)) return 'deva';
    return NEUTRAL.test(ch) ? 'neutral' : 'latin';
  };
  G.runs = (str) => {
    const out = [];
    for (const ch of String(str)) {
      const sc = scriptOf(ch), last = out[out.length - 1];
      if (sc === 'neutral') { if (last) last.text += ch; else out.push({ script: 'latin', text: ch }); continue; }
      if (last && last.script === sc) last.text += ch;
      else if (last && last.script === 'latin' && /^\s*$/.test(last.text)) { last.script = sc; last.text += ch; }
      else out.push({ script: sc, text: ch });
    }
    // trailing spaces of a run belong between runs: move them to the next run's start for correct spacing
    return out;
  };
  G.isRTL = (str) => /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/.test(String(str));
  // which font family draws this Arabic-script run: lang 'ur' | 'ar' forces it, otherwise Urdu/Persian
  // letters (ی ک گ ٹ ڈ ڑ ں ہ ھ ے) pick Nastaliq and Arabic letters pick Naskh
  const arabKind = (text, lang) => (lang === 'ar' ? 'arabic' : lang === 'ur' || lang === 'fa' ? 'urdu' : /[یکگٹڈڑںہھے]/.test(text) ? 'urdu' : /[يكة]/.test(text) ? 'arabic' : 'urdu');
  // lay out runs: fontFn(fam, size, weight) → CSS font for Latin runs
  G.layoutText = (ctx, str, { size = 48, fam = 'Caveat', weight = 700, lang, fontFn = G.font } = {}) => {
    const runs = G.runs(str);
    // bidi: spaces/punctuation between runs of opposite direction belong to the base direction,
    // so a run that goes against the base hands its trailing neutrals to the next run
    const firstStrong = runs.find((r) => /[^\s\d.,:;!?'"()[\]\-–—·•…/%+&@#*=<>|_~^$€£¥₹]/.test(r.text));
    const rtlBase = !!firstStrong && firstStrong.script === 'arab';
    for (let i = 0; i < runs.length - 1; i++) {
      const against = rtlBase ? runs[i].script !== 'arab' : runs[i].script === 'arab';
      if (!against) continue;
      const m = /[\s.,:;!?'"()[\]\-–—·•…/%+&@#*=<>|_~^]*$/.exec(runs[i].text)[0]; // digits stay with their run
      if (m && m.length < runs[i].text.length) { runs[i].text = runs[i].text.slice(0, -m.length); runs[i + 1].text = m + runs[i + 1].text; }
    }
    let total = 0;
    ctx.save();
    for (const r of runs) {
      if (r.script === 'latin') { r.font = fontFn(size, fam, weight); r.dir = 'ltr'; }
      else {
        const kind = r.script === 'deva' ? 'devanagari' : arabKind(r.text, lang);
        const w = kind === 'urdu' ? 400 : weight >= 600 ? 700 : 400;
        r.font = `${w} ${Math.round(size * G.SCRIPT_SCALE[kind])}px "${G.SCRIPT_FONTS[kind]}"`;
        r.dir = r.script === 'arab' ? 'rtl' : 'ltr';
      }
      ctx.font = r.font; ctx.direction = r.dir;
      r.w = ctx.measureText(r.text).width;
      total += r.w;
    }
    ctx.restore();
    return { runs, total, rtlBase };
  };
  // draw laid-out text at (x, y); align is visual: 'left' | 'center' | 'right' ('start'/'end' follow the text's direction)
  G.drawRuns = (ctx, lay, x, y, { align = 'left', baseline = 'alphabetic', color, stroke, strokeW = 8 } = {}) => {
    let a = align;
    if (a === 'start') a = lay.rtlBase ? 'right' : 'left';
    if (a === 'end') a = lay.rtlBase ? 'left' : 'right';
    const left = a === 'center' ? x - lay.total / 2 : a === 'right' ? x - lay.total : x;
    const order = lay.rtlBase ? [...lay.runs].reverse() : lay.runs;
    let cx = left;
    ctx.save();
    ctx.textBaseline = baseline; ctx.textAlign = 'left';
    for (const r of order) {
      ctx.font = r.font; ctx.direction = r.dir;
      if (stroke) { ctx.lineJoin = 'round'; ctx.strokeStyle = stroke; ctx.lineWidth = strokeW; ctx.strokeText(r.text, cx, y); }
      if (color) ctx.fillStyle = color;
      ctx.fillText(r.text, cx, y);
      cx += r.w;
    }
    ctx.restore();
    return lay.total;
  };
  const simple = (str) => { for (const ch of String(str)) { const sc = scriptOf(ch); if (sc === 'arab' || sc === 'deva') return false; } return true; };

  // decorative text (tiny timestamps, background signage) that the visual QA should not judge: G.decor(() => { … })
  G.decorDepth = 0;
  G.decor = (fn) => { G.decorDepth++; try { return fn(); } finally { G.decorDepth--; } };
  // fam: one family name ('Caveat') or a CSS stack ('"Inter", system-ui, sans-serif')
  G.font = (size, fam = 'Caveat', weight = 700) => `${weight} ${size}px ${/[,"]/.test(fam) ? fam : '"' + fam + '", system-ui, sans-serif'}`;
  G.text = (ctx, str, x, y, { size = 48, fam = 'Caveat', weight = 700, color = G.C.ink, align = 'left', baseline = 'alphabetic', boil = 0.8, alpha = 1, stroke, strokeW = 8, lang } = {}) => {
    str = String(str);
    ctx.save();
    ctx.globalAlpha *= alpha;
    const j = G.jit(str.length * 13 + size, 1, boil * G.style.textBoil);
    if (G.style.neon) { ctx.shadowColor = color; ctx.shadowBlur = size * 0.35 * (G.scale || 1); }
    if (simple(str)) {
      ctx.font = G.font(size, fam, weight);
      ctx.textAlign = align;
      ctx.textBaseline = baseline;
      if (stroke) {
        ctx.lineJoin = 'round';
        ctx.strokeStyle = stroke;
        ctx.lineWidth = strokeW;
        ctx.strokeText(str, x + j[0], y + j[1]);
      }
      ctx.fillStyle = color;
      ctx.fillText(str, x + j[0], y + j[1]);
    } else {
      G.drawRuns(ctx, G.layoutText(ctx, str, { size, fam, weight, lang }), x + j[0], y + j[1], { align, baseline, color, stroke, strokeW });
    }
    ctx.restore();
  };
  G.measure = (ctx, str, size, fam = 'Caveat', weight = 700, lang) => {
    str = String(str);
    if (!simple(str)) return G.layoutText(ctx, str, { size, fam, weight, lang }).total;
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
    // chalk dust: white with dark specks and streaks (multiplied, it breaks up strokes like real chalk)
    G.chalkTex = [0, 1].map((k) => {
      const c = G.makeCanvas(512, 512), cx = c.getContext('2d'), rr = U.mulberry32(300 + k);
      cx.fillStyle = '#FFFFFF'; cx.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 9000; i++) { const v = Math.floor(90 + rr() * 110); cx.fillStyle = `rgba(${v},${v},${v},${0.25 + rr() * 0.5})`; cx.fillRect(rr() * 512, rr() * 512, 1 + rr() * 2.2, 1 + rr() * 1.4); }
      cx.strokeStyle = 'rgba(120,120,120,0.25)'; cx.lineWidth = 1;
      for (let i = 0; i < 140; i++) { const x = rr() * 512, y = rr() * 512, a = -0.9 + rr() * 0.3; cx.beginPath(); cx.moveTo(x, y); cx.lineTo(x + Math.cos(a) * 40, y + Math.sin(a) * 40); cx.stroke(); }
      return c;
    });
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

  // the finish, after the film draws: paper texture, vignette, grain, and each style's own pass
  // (pixel: blocky pixels · neon: bloom · chalk: dusty, broken strokes). A film's own options win.
  G.post = (ctx, t, opts = {}) => {
    const S = G.style;
    const { vignette = 0.35, grain = 0.05, paper = 0.55, bloom = 0, chalk = 0 } = Object.assign({}, S.post, opts);
    const cv = ctx.canvas, k = G.scale || 1;
    ctx.save();
    if (S.pixel) {
      // draw the frame tiny, then back up with hard edges
      const px = S.pixel * k, w = Math.max(1, Math.round(cv.width / px)), h = Math.max(1, Math.round(cv.height / px));
      const off = G.scratch('pixel', w, h), ox = off.getContext('2d');
      ox.imageSmoothingEnabled = true; ox.clearRect(0, 0, w, h); ox.drawImage(cv, 0, 0, w, h);
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = false; ctx.drawImage(off, 0, 0, w, h, 0, 0, cv.width, cv.height); ctx.imageSmoothingEnabled = true;
    }
    if (bloom > 0) {
      const w = Math.ceil(cv.width / 4), h = Math.ceil(cv.height / 4);
      const off = G.scratch('bloom', w, h), ox = off.getContext('2d');
      ox.clearRect(0, 0, w, h); ox.filter = `blur(${Math.max(2, 6 * k)}px)`; ox.drawImage(cv, 0, 0, w, h); ox.filter = 'none';
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = bloom * 0.55; ctx.drawImage(off, 0, 0, w, h, 0, 0, cv.width, cv.height);
    }
    ctx.setTransform(k, 0, 0, k, 0, 0);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    if (chalk > 0 && G.chalkTex) {
      ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = chalk;
      const tile = G.chalkTex[G.boil % 2];
      for (let y = 0; y < G.H; y += 512) for (let x = 0; x < G.W; x += 512) ctx.drawImage(tile, x, y);
    }
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
  const SCRATCH = {};
  G.scratch = (key, w, h) => { let c = SCRATCH[key]; if (!c) c = SCRATCH[key] = G.makeCanvas(w, h); if (c.width !== w || c.height !== h) { c.width = w; c.height = h; } return c; };

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

  // Ken Burns: an image (a photo, a screenshot) filling a box, slowly zooming and panning from one framing
  // to another between t0 and t1. from / to: { zoom, x, y } where x, y (0..1) is the point to centre on.
  G.kenBurns = (ctx, img, x, y, w, h, t, t0, t1, { from = { zoom: 1, x: 0.5, y: 0.5 }, to = { zoom: 1.15, x: 0.5, y: 0.45 }, ease = U.ease.inOutQuad, radius = 0 } = {}) => {
    if (!img || !img.width) return;
    const u = ease(U.clamp((t - t0) / Math.max(1e-6, t1 - t0)));
    const zoom = U.lerp(from.zoom, to.zoom, u), fx = U.lerp(from.x, to.x, u), fy = U.lerp(from.y, to.y, u);
    const cover = Math.max(w / img.width, h / img.height) * zoom, iw = img.width * cover, ih = img.height * cover;
    const ox = U.clamp(w / 2 - fx * iw, w - iw, 0), oy = U.clamp(h / 2 - fy * ih, h - ih, 0);
    ctx.save();
    ctx.beginPath(); if (radius) ctx.roundRect(x, y, w, h, radius); else ctx.rect(x, y, w, h); ctx.clip();
    ctx.drawImage(img, x + ox, y + oy, iw, ih);
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

  // the film's look: score.js STYLE, or a --style override (paper by default)
  try { G.setStyle(U.pickStyle((globalThis.SCORE && globalThis.SCORE.STYLE) || 'paper')); } catch (e) { console.warn(e.message); G.setStyle('paper'); }

  globalThis.G = G;
})();
