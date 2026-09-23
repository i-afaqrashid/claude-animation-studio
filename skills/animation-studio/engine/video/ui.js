// Product / brand UI kit: crisp app screens inside the hand-drawn world (phone mockup, cards,
// pills, buttons, chat, stats, progress, wipes). Text uses the system UI font like real apps do;
// colours come from UI.theme, so a film can wear any brand: UI.setTheme({ accent: '#…' }).
// Every function is a pure function of its arguments (and t), like the rest of the engine.
(function () {
  const U = globalThis.U, G = globalThis.G;
  const { clamp, ease } = U;
  const UI = {};

  UI.FONT = 'system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif';
  UI.theme = {
    accent: '#D97757', // brand colour: primary buttons, my chat bubbles, highlights
    accent2: '#3FA89B', // secondary colour
    ok: '#2F8A4E', // success / verified / done
    ink: '#2A2320', muted: '#8A8078', onAccent: '#FFFFFF',
    app: '#F7F4EF', // app screen background
    card: '#FFFFFF', line: 'rgba(42,35,32,0.10)', shadow: 'rgba(90,55,30,0.16)',
    font: null, // null = UI.FONT; or a loaded brand font family
  };
  // setTheme = the film's own choice; setThemeDefaults = the brand kit's (never overrides the film)
  const chosen = new Set();
  UI.setTheme = (o) => { for (const k of Object.keys(o)) chosen.add(k); return Object.assign(UI.theme, o); };
  UI.setThemeDefaults = (o) => { for (const [k, v] of Object.entries(o)) if (!chosen.has(k) && v !== undefined) UI.theme[k] = v; return UI.theme; };
  const th = UI.theme;
  const fam = (f) => f || th.font || UI.FONT;

  // ---------- timing ----------
  UI.pop = (t, t0, dur = 0.28, s = 2.2) => (t < t0 ? 0 : ease.outBack(clamp((t - t0) / dur), s)); // 0 → overshoot → 1
  UI.fadeIn = (t, t0, d = 0.25) => clamp((t - t0) / d);

  // ---------- text ----------
  // Urdu / Arabic / Hindi (and mixed lines) go through G.layoutText, which picks a font per script
  const uiFont = (size, stack, weight) => `${weight} ${size}px ${stack}`;
  const multi = (str) => /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF\u0900-\u097F]/.test(String(str));
  UI.measure = (ctx, str, size, weight = 700, spacing = 0, font) => {
    if (multi(str)) return G.layoutText(ctx, str, { size, fam: fam(font), weight, fontFn: uiFont }).total;
    ctx.save(); ctx.font = `${weight} ${size}px ${fam(font)}`; ctx.letterSpacing = `${spacing}px`;
    const w = ctx.measureText(str).width; ctx.restore(); return w;
  };
  // the largest size <= size at which str fits in maxW
  UI.fit = (ctx, str, maxW, size, weight = 700, spacing = 0, font) => Math.min(size, Math.floor((size * maxW) / Math.max(1, UI.measure(ctx, str, size, weight, spacing, font))));
  UI.text = (ctx, str, x, y, { size = 40, weight = 700, color = th.ink, align = 'left', italic = false, spacing = 0, alpha = 1, base = 'alphabetic', font, maxW } = {}) => {
    if (maxW) size = UI.fit(ctx, str, maxW, size, weight, spacing, font);
    if (multi(str)) {
      ctx.save(); ctx.globalAlpha *= alpha;
      G.drawRuns(ctx, G.layoutText(ctx, str, { size, fam: fam(font), weight, fontFn: uiFont }), x, y, { align, baseline: base, color });
      ctx.restore();
      return;
    }
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.font = `${italic ? 'italic ' : ''}${weight} ${size}px ${fam(font)}`;
    ctx.letterSpacing = `${spacing}px`;
    ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = base;
    ctx.fillText(str, x, y);
    ctx.restore();
  };

  // ---------- surfaces ----------
  UI.card = (ctx, x, y, w, h, r = 24, { fill = th.card, stroke = th.line, shadow = true } = {}) => {
    ctx.save();
    if (shadow) { ctx.shadowColor = th.shadow; ctx.shadowBlur = 22; ctx.shadowOffsetY = 8; }
    ctx.fillStyle = fill;
    ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill();
    ctx.shadowColor = 'transparent';
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke(); }
    ctx.restore();
  };
  // a rounded label; returns its width so pills can be laid out in a row
  UI.pill = (ctx, x, y, text, { bg = th.accent, fg = th.onAccent, size = 15, h = 30, weight = 700, spacing = 0.5 } = {}) => {
    const w = UI.measure(ctx, text, size, weight, spacing) + h * 0.9;
    ctx.save(); ctx.fillStyle = bg; ctx.beginPath(); ctx.roundRect(x, y, w, h, h / 2); ctx.fill(); ctx.restore();
    UI.text(ctx, text, x + h * 0.45, y + h / 2 + size * 0.36, { size, weight, color: fg, spacing });
    return w;
  };
  // grey placeholder bar (a list item still "loading")
  UI.skeleton = (ctx, x, y, w, h, t = 0) => {
    ctx.save();
    ctx.fillStyle = '#ECE6DD'; ctx.beginPath(); ctx.roundRect(x, y, w, h, h / 2); ctx.fill();
    const sx = x + ((t * 1.6) % 1.4 - 0.2) * w;
    const g = ctx.createLinearGradient(sx - 60, 0, sx + 60, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,0.7)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.clip(); ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    ctx.restore();
  };

  // ---------- interaction ----------
  // finger-tap ripple at (x, y), starting at t0
  UI.tap = (ctx, x, y, t, t0, { color = 'rgba(255,255,255,0.85)', size = 120 } = {}) => {
    if (t < t0 || t > t0 + 0.5) return;
    const a = (t - t0) / 0.5;
    ctx.save(); ctx.strokeStyle = color; ctx.globalAlpha = 1 - a; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(x, y, 18 + a * size, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
  };
  // a primary button centred at (cx, cy); tapped at tTap it squashes, turns `doneBg` and shows `done`
  UI.button = (ctx, cx, cy, w, h, label, t, { tTap = Infinity, done = null, bg = th.accent, doneBg = th.ok, fg = th.onAccent, size = 22 } = {}) => {
    const tapped = t >= tTap;
    const press = tapped ? 1 - 0.06 * U.pulse(t, tTap, 10) : 1;
    ctx.save(); ctx.translate(cx, cy); ctx.scale(press, press);
    ctx.fillStyle = tapped && done ? doneBg : bg; ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, h / 2); ctx.fill();
    UI.text(ctx, tapped && done ? done : label, 0, size * 0.36, { size, weight: 800, color: fg, align: 'center' });
    ctx.restore();
    UI.tap(ctx, cx + w * 0.15, cy, t, tTap);
  };
  // checkbox that ticks at p (0..1)
  UI.check = (ctx, x, y, r, p, { color = th.ok } = {}) => {
    ctx.save();
    ctx.lineWidth = r * 0.16; ctx.strokeStyle = p > 0 ? color : th.muted;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
    if (p > 0) { ctx.fillStyle = color; ctx.fill(); } else ctx.stroke();
    if (p > 0) {
      const k = clamp(p * 1.4);
      const pts = [[x - r * 0.45, y + r * 0.02], [x - r * 0.1, y + r * 0.36], [x + r * 0.5, y - r * 0.34]];
      ctx.strokeStyle = th.onAccent; ctx.lineWidth = r * 0.22; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(...pts[0]);
      if (k < 0.4) ctx.lineTo(U.lerp(pts[0][0], pts[1][0], k / 0.4), U.lerp(pts[0][1], pts[1][1], k / 0.4));
      else { ctx.lineTo(...pts[1]); ctx.lineTo(U.lerp(pts[1][0], pts[2][0], (k - 0.4) / 0.6), U.lerp(pts[1][1], pts[2][1], (k - 0.4) / 0.6)); }
      ctx.stroke();
    }
    ctx.restore();
  };
  // progress ring, u = 0..1 (a timer, an upload, a streak)
  UI.ring = (ctx, cx, cy, r, u, { color = th.accent, track = 'rgba(0,0,0,0.08)', lw = r * 0.16 } = {}) => {
    ctx.save(); ctx.lineWidth = lw; ctx.lineCap = 'round';
    ctx.strokeStyle = track; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    if (u > 0) { ctx.strokeStyle = color; ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp(u)); ctx.stroke(); }
    ctx.restore();
  };

  // ---------- the phone ----------
  // A phone centred at (cx, cy), `h` px tall. The screen is drawn by screen(ctx, w, h, t) in POINTS:
  // 412 wide (a real phone's width in points) × h tall, so app layouts use real-app numbers.
  // The status bar (time, island, battery) is drawn on top.
  UI.PHONE_W = 412;
  UI.phone = (ctx, cx, cy, h, screen, t, { rot = 0, time = '9:41', bezel = '#1B1A1F', shadow = true, sketch = true, dark = false } = {}) => {
    const w = h * 0.47, r = h * 0.075, b = h * 0.016;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    if (shadow) { ctx.fillStyle = 'rgba(70,40,25,0.16)'; ctx.beginPath(); ctx.roundRect(-w / 2 + h * 0.023, -h / 2 + h * 0.031, w, h, r); ctx.fill(); }
    ctx.fillStyle = bezel;
    ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, r); ctx.fill();
    const sw = w - 2 * b, sh = h - 2 * b, k = sw / UI.PHONE_W, ph = sh / k;
    ctx.save();
    ctx.beginPath(); ctx.roundRect(-sw / 2, -sh / 2, sw, sh, r - b); ctx.clip();
    ctx.translate(-sw / 2, -sh / 2);
    ctx.scale(k, k);
    ctx.fillStyle = dark ? '#121214' : th.app; ctx.fillRect(0, 0, UI.PHONE_W, ph);
    if (screen) screen(ctx, UI.PHONE_W, ph, t);
    const fg = dark ? '#FFFFFF' : th.ink;
    UI.text(ctx, time, 36, 38, { size: 17, weight: 600, color: fg });
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.roundRect(150, 14, 112, 34, 17); ctx.fill();
    ctx.fillStyle = fg; ctx.beginPath(); ctx.roundRect(344, 26, 30, 13, 4); ctx.fill();
    ctx.restore();
    if (sketch) G.rrect(ctx, -w / 2, -h / 2, w, h, r, { lw: Math.max(2, h * 0.004), seed: 5, amp: 1.2, stroke: bezel, second: false });
    ctx.restore();
  };
  // bottom tab bar: items = ['Home', 'Search', …], active = the highlighted one
  UI.navBar = (ctx, w, h, items, active) => {
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, h - 78, w, 78);
    ctx.fillStyle = th.line; ctx.fillRect(0, h - 78, w, 1.5);
    const step = w / items.length;
    items.forEach((n, i) => {
      const x = step * (i + 0.5), on = n === active;
      ctx.strokeStyle = on ? th.accent : th.muted; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.roundRect(x - 11, h - 64, 22, 20, 5); ctx.stroke();
      UI.text(ctx, n, x, h - 22, { size: 12, weight: on ? 700 : 500, color: on ? th.accent : th.muted, align: 'center' });
    });
  };
  // a screen title block: small caps kicker + big title
  UI.header = (ctx, w, title, { kicker = '', y = 92 } = {}) => {
    if (kicker) UI.text(ctx, kicker.toUpperCase(), 24, y, { size: 13, weight: 700, color: th.muted, spacing: 2 });
    UI.text(ctx, title, 24, y + 34, { size: 26, weight: 800, maxW: w - 48 });
  };

  // ---------- chat ----------
  // msgs = [{ t, who: 'me' | 'them', text }]: each bubble pops at its t; 'them' shows typing dots
  // for most of a beat before its bubble. Draws from y0 down; returns the y below the last bubble.
  UI.chat = (ctx, w, msgs, t, { y0 = 186, typing = 0.45, size = 17 } = {}) => {
    let y = y0;
    msgs.forEach((c, i) => {
      const me = c.who === 'me';
      const bwid = Math.min(w - 90, UI.measure(ctx, c.text, size, 500) + 36), bh = size * 2.8;
      if (!me && typing > 0 && t < c.t && t > c.t - typing && (i === 0 || t >= msgs[i - 1].t)) {
        ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.roundRect(18, y, 74, 40, 20); ctx.fill();
        for (let k = 0; k < 3; k++) { ctx.fillStyle = '#B8AFA6'; ctx.beginPath(); ctx.arc(40 + k * 15, y + 20 - Math.abs(Math.sin(t * 9 + k)) * 6, 4.5, 0, Math.PI * 2); ctx.fill(); }
      }
      const a = UI.pop(t, c.t, 0.28, 2.4);
      if (a <= 0) return;
      const bx = me ? w - 18 - bwid : 18;
      ctx.save();
      ctx.translate(bx + (me ? bwid : 0), y + bh); ctx.scale(a, a); ctx.translate(-(me ? bwid : 0), -bh);
      UI.card(ctx, 0, 0, bwid, bh, bh / 2, { fill: me ? th.accent : '#FFFFFF', stroke: me ? null : th.line, shadow: false });
      UI.text(ctx, c.text, 18, bh / 2 + size * 0.36, { size, weight: 500, color: me ? th.onAccent : th.ink, maxW: bwid - 36 });
      ctx.restore();
      y += bh + 14;
    });
    return y;
  };

  // ---------- numbers ----------
  // a stat card centred at (cx, cy), popping in at t0: big number over a small label
  UI.stat = (ctx, cx, cy, w, h, big, small, t, t0, { color = th.accent, rot = 0 } = {}) => {
    const p = UI.pop(t, t0, 0.3, 2.4);
    if (p <= 0) return;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot); ctx.scale(p, p);
    UI.card(ctx, -w / 2, -h / 2, w, h, Math.min(w, h) * 0.1);
    UI.text(ctx, big, 0, h * 0.06, { size: h * 0.32, weight: 900, color, align: 'center', maxW: w * 0.84 });
    UI.text(ctx, small, 0, h * 0.28, { size: h * 0.085, weight: 600, color: th.muted, align: 'center', maxW: w * 0.86 });
    ctx.restore();
  };

  // ---------- transitions ----------
  // circle wipe: a disc grows from (cx, cy) until the frame is `color` at tc, then a hole opens
  // from the same point to reveal the next shot. Draw it last, over both shots.
  UI.iris = (ctx, t, tc, { cx = G.W / 2, cy = G.H / 2, dur = 0.3, color = th.accent } = {}) => {
    if (t < tc - dur || t > tc + dur) return;
    const R = Math.hypot(Math.max(cx, G.W - cx), Math.max(cy, G.H - cy));
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    if (t < tc) ctx.arc(cx, cy, R * ease.inCubic((t - (tc - dur)) / dur), 0, Math.PI * 2);
    else {
      const r = R * ease.outCubic((t - tc) / dur);
      ctx.rect(0, 0, G.W, G.H);
      ctx.moveTo(cx + r, cy); // without this the arc is joined to the rect by a line (a wedge)
      ctx.arc(cx, cy, r, 0, Math.PI * 2, true);
    }
    ctx.fill('evenodd');
    ctx.restore();
  };

  // an image (a logo from Studio.loadImage) centred at (cx, cy), `size` px on its long side, popping in at t0
  UI.logo = (ctx, img, cx, cy, size, t, t0 = -Infinity) => {
    const p = t0 === -Infinity ? 1 : UI.pop(t, t0, 0.45, 1.8);
    if (p <= 0 || !img) return;
    const k = size / Math.max(img.width, img.height);
    ctx.save(); ctx.translate(cx, cy); ctx.scale(p, p);
    ctx.drawImage(img, (-img.width * k) / 2, (-img.height * k) / 2, img.width * k, img.height * k);
    ctx.restore();
  };

  globalThis.UI = UI;
})();
