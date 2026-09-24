// THE FILM: an animated wedding invitation in nine scenes. Every frame is a pure function of t, read from
// score.js. It lays itself out for 9:16, 1:1, 4:5 and 16:9 (G.W / G.H / G.SAFE), so one score makes every cut.
(function () {
  const U = globalThis.U, G = globalThis.G, Ch = globalThis.Ch, S = globalThis.SCORE, Studio = globalThis.Studio;
  const { clamp, lerp, ease } = U;
  const { T, BEAT, ev, clock, INVITE } = S;
  const W = G.W, H = G.H, SAFE = G.SAFE;

  // ---------- layout for any format ----------
  const AR = H / W;
  const TALL = AR > 1.5, PORT = AR > 1.1 && !TALL, WIDE = AR < 0.8;
  const K = Math.min(W, H) / 1080;
  const TXT = WIDE ? { x: W * 0.66, w: W * 0.52, top: H * 0.17 } : { x: W / 2, w: TALL ? 2 * (SAFE.x + SAFE.w - W / 2) - 20 : W * 0.84, top: SAFE.y + (TALL ? 70 : 34) }; // on 9:16 the right edge stays clear of the platform buttons
  const CP = WIDE ? { x: W * 0.28, ground: H * 0.95, s: 1.02 } : TALL ? { x: W / 2, ground: H * 0.905, s: 1.06 } : PORT ? { x: W / 2, ground: H * 0.955, s: 0.84 } : { x: W / 2, ground: H * 0.955, s: 0.7 };
  const SP = CP.s * 175; // half the gap between groom and bride

  // ---------- palette ----------
  const C = { maroon: '#5C0F1E', deep: '#2E0710', gold: '#D4A83A', gold2: '#F2D48A', ivory: '#FBF3E2', rose: '#D81E3A', marigold: '#F2A516', yellow: '#F7C93A', green: '#1F6F54', blush: '#F2B6C1' };
  // the couple: every Ch.person style key (skin, hair, beard, glasses, build, outfit, headwear…); make them look like the real couple
  const GROOM = { skin: '#C68B61', hair: '#1C1715', hairStyle: 'short', facialHair: 'trimmed', glasses: 'bold', build: 'heavy', outfit: 'sherwani', robe: '#F3E4C4', headwear: 'pagri', headwearColor: '#E7C36E', sehra: true, garland: 'flowers', shoes: '#D4A83A' };
  const BRIDE = { skin: '#D9A07A', hair: '#1C1715', hairStyle: 'long', outfit: 'lehenga', robe: '#B0102A', shirt: '#9A0E24', headwear: 'dupatta', headwearColor: '#C2183A', jewelry: true, bangles: '#D81E3A', mehndi: true, shoes: '#D4A83A' };
  globalThis.CAST = { groom: GROOM, bride: BRIDE };

  // ---------- text ----------
  const FONT = { script: '"Great Vibes", cursive', caps: 'Cinzel, serif', serif: '"Cormorant Garamond", serif' };
  // gold lettering: a metallic gradient, a dark outline, a soft shadow, and a light that sweeps across
  function goldText(ctx, str, x, y, { size = 80, fam = FONT.caps, weight = 700, align = 'center', alpha = 1, shine = -1, maxW = TXT.w, stroke = true, light = false } = {}) {
    if (alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha *= alpha;
    let sz = size;
    ctx.font = `${weight} ${sz}px ${fam}`;
    const w0 = ctx.measureText(str).width;
    if (w0 > maxW) { sz = (size * maxW) / w0; ctx.font = `${weight} ${sz}px ${fam}`; }
    const w = ctx.measureText(str).width, x0 = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    const g = ctx.createLinearGradient(0, y - sz * 0.85, 0, y + sz * 0.1);
    if (light) { g.addColorStop(0, '#FFFFFF'); g.addColorStop(1, '#FFF1D0'); } else { g.addColorStop(0, '#FFF3C4'); g.addColorStop(0.45, '#E8C267'); g.addColorStop(0.7, '#B8862A'); g.addColorStop(1, '#F6DE98'); }
    ctx.shadowColor = 'rgba(30,5,10,0.55)'; ctx.shadowBlur = sz * 0.12 * (G.scale || 1); ctx.shadowOffsetY = sz * 0.04 * (G.scale || 1);
    if (stroke) { ctx.lineJoin = 'round'; ctx.strokeStyle = light ? 'rgba(90,20,30,0.9)' : '#4A2A08'; ctx.lineWidth = Math.max(2, sz * 0.05); ctx.strokeText(str, x0, y); }
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = g; ctx.fillText(str, x0, y);
    if (shine >= 0 && shine <= 1) {
      const sx = x0 - w * 0.3 + shine * w * 1.6, sg = ctx.createLinearGradient(sx - sz * 0.6, 0, sx + sz * 0.6, 0);
      sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(0.5, 'rgba(255,255,255,0.85)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.globalCompositeOperation = 'source-atop'; ctx.fillStyle = sg; ctx.fillText(str, x0, y);
    }
    ctx.restore();
    return w;
  }
  function plainText(ctx, str, x, y, { size = 40, fam = FONT.serif, weight = 600, color = C.ivory, align = 'center', alpha = 1, maxW = TXT.w } = {}) {
    if (alpha <= 0) return;
    ctx.save(); ctx.globalAlpha *= alpha;
    let sz = size; ctx.font = `${weight} ${sz}px ${fam}`;
    const w0 = ctx.measureText(str).width; if (w0 > maxW) { sz = (size * maxW) / w0; ctx.font = `${weight} ${sz}px ${fam}`; }
    ctx.textAlign = align; ctx.textBaseline = 'alphabetic';
    ctx.shadowColor = 'rgba(20,5,10,0.5)'; ctx.shadowBlur = sz * 0.15 * (G.scale || 1);
    ctx.fillStyle = color; ctx.fillText(str, x, y);
    ctx.restore();
  }
  const urdu = (ctx, str, x, y, { size = 56, color = C.gold2, alpha = 1 } = {}) => G.text(ctx, str, x, y, { size, align: 'center', color, alpha, lang: 'ur', boil: 0.3, stroke: 'rgba(40,6,12,0.6)', strokeW: size * 0.08 });
  const stampIn = (t, t0, d = 0.3) => (t < t0 ? 0 : 0.35 + 0.65 * ease.outBack(clamp((t - t0) / d), 2)); // pops in from 35%
  const fadeIn = (t, t0, d = 0.5) => clamp((t - t0) / d);
  const shineAt = (t, t0) => (t >= t0 && t < t0 + 1.1 ? (t - t0) / 1.1 : -1);

  // ---------- the card: an ornate gold border on every scene ----------
  function frame(ctx, t, { color = C.gold, alpha = 1 } = {}) {
    const m = 24 * K, m2 = 40 * K;
    ctx.save(); ctx.globalAlpha *= alpha;
    ctx.strokeStyle = color; ctx.lineWidth = 5 * K; ctx.strokeRect(m, m, W - 2 * m, H - 2 * m);
    ctx.lineWidth = 2 * K; ctx.strokeRect(m2, m2, W - 2 * m2, H - 2 * m2);
    // corner ornaments: a paisley bud and three petals
    for (const [cx, cy, sx, sy] of [[m2, m2, 1, 1], [W - m2, m2, -1, 1], [m2, H - m2, 1, -1], [W - m2, H - m2, -1, -1]]) {
      ctx.save(); ctx.translate(cx, cy); ctx.scale(sx * K, sy * K);
      G.shape(ctx, [[0, 0], [70, 8], [96, 40], [80, 66], [52, 58], [44, 30], [8, 70], [0, 0]], { fill: color, stroke: '#6A4410', lw: 2.5, seed: 11, amp: 0.4 });
      for (let k = 0; k < 3; k++) G.ellipse(ctx, 18 + k * 30, 104 - k * 20, 9, 9, { fill: C.rose, stroke: '#6A4410', lw: 2, seed: 12 + k, amp: 0.3 });
      ctx.restore();
    }
    // top and bottom centre: a small crest
    for (const [yy, d] of [[m, 1], [H - m, -1]]) {
      ctx.save(); ctx.translate(W / 2, yy); ctx.scale(K, d * K);
      G.shape(ctx, [[-70, 0], [-30, 18], [0, 44], [30, 18], [70, 0], [0, 10]], { fill: color, stroke: '#6A4410', lw: 2.5, seed: 14, amp: 0.4 });
      G.ellipse(ctx, 0, 26, 9, 9, { fill: C.rose, stroke: '#6A4410', lw: 2, seed: 15, amp: 0.3 });
      ctx.restore();
    }
    ctx.restore();
  }

  // ---------- shared set pieces ----------
  function maroon(ctx, glow = 0.6) {
    const g = ctx.createRadialGradient(W / 2, H * 0.42, 50 * K, W / 2, H * 0.45, Math.max(W, H) * 0.75);
    g.addColorStop(0, '#8E1E2E'); g.addColorStop(0.55, C.maroon); g.addColorStop(1, C.deep);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    if (glow > 0) { const r = ctx.createRadialGradient(W / 2, H * 0.4, 0, W / 2, H * 0.4, Math.min(W, H) * 0.7); r.addColorStop(0, `rgba(255,200,120,${0.18 * glow})`); r.addColorStop(1, 'rgba(255,200,120,0)'); ctx.fillStyle = r; ctx.fillRect(0, 0, W, H); }
  }
  // gold dust rising
  function dust(ctx, t, n = 60, alpha = 1) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < n; i++) {
      const x = G.rnd(i, 1) * W, sp = 20 + G.rnd(i, 2) * 50, y = H - ((t * sp + G.rnd(i, 3) * H) % (H + 40));
      const a = (0.25 + 0.5 * G.rnd(i, 4)) * (0.6 + 0.4 * Math.sin(t * 3 + i)) * alpha;
      ctx.fillStyle = `rgba(255,214,140,${a})`; ctx.beginPath(); ctx.arc(x + Math.sin(t + i) * 10, y, (1.5 + G.rnd(i, 5) * 2.5) * K, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
  // strings of marigolds hanging from the top edge, swaying
  function marigolds(ctx, t, { y0 = 0, n = WIDE ? 14 : 9, len = 0.32, sway = 1 } = {}) {
    for (let i = 0; i < n; i++) {
      const x = ((i + 0.5) / n) * W, L = H * len * (0.6 + 0.4 * ((i % 3) / 2 + (i % 2 ? 0.3 : 0))) , sw = Math.sin(t * 1.3 + i) * 6 * sway;
      for (let y = y0 + 8; y < y0 + L; y += 22 * K) {
        const u = (y - y0) / L;
        G.ellipse(ctx, x + sw * u, y, 12 * K, 11 * K, { fill: Math.floor(y / (22 * K)) % 5 === 0 ? C.rose : (Math.floor(y / (22 * K)) % 2 ? C.marigold : C.yellow), stroke: '#8A4A08', lw: 1.8 * K, seed: 30 + i * 7 + Math.floor(y), amp: 0.4 });
      }
    }
  }
  // fairy lights: a sagging string with twinkling bulbs
  function fairy(ctx, t, y, sag = 60, n = 24) {
    const pts = []; for (let i = 0; i <= 30; i++) { const u = i / 30; pts.push([u * W, y + sag * K * 4 * u * (1 - u)]); }
    G.line(ctx, pts, { color: 'rgba(40,20,10,0.6)', lw: 2 * K, seed: 60 + y, step: 80 });
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5) / n, x = u * W, yy = y + sag * K * 4 * u * (1 - u) + 8 * K;
      const on = 0.5 + 0.5 * Math.sin(t * 4 + i * 1.7);
      const g = ctx.createRadialGradient(x, yy, 0, x, yy, 22 * K); g.addColorStop(0, `rgba(255,220,150,${0.8 * on})`); g.addColorStop(1, 'rgba(255,220,150,0)');
      ctx.fillStyle = g; ctx.fillRect(x - 22 * K, yy - 22 * K, 44 * K, 44 * K);
      ctx.fillStyle = `rgba(255,248,220,${0.6 + 0.4 * on})`; ctx.beginPath(); ctx.arc(x, yy, 4 * K, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
  // rose petals: born at their times, falling and turning
  function petals(ctx, t, from = 0, to = Infinity) {
    for (const p of S.petals) {
      if (p.t < from || p.t >= to) continue;
      const a = t - p.t; if (a < 0 || a > 6) continue;
      const y = -30 + a * (170 + p.size * 8) * K, x = p.x * W + Math.sin(a * 2 + p.sway) * 40 * K;
      if (y > H + 30) continue;
      ctx.save(); ctx.translate(x, y); ctx.rotate(a * 2.5 + p.sway); ctx.scale(1, 0.5 + 0.5 * Math.abs(Math.sin(a * 3 + p.sway)));
      ctx.fillStyle = p.rose ? '#C8102E' : '#F2A0B0'; ctx.beginPath(); ctx.ellipse(0, 0, p.size * K, p.size * 0.62 * K, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }
  // a Mughal arch (pointed), as a path, sized to the frame
  const ARCH = WIDE ? { cx: W / 2, top: H * 0.1, bot: H * 0.96, w: H * 0.78 } : { cx: W / 2, top: TALL ? H * 0.2 : H * 0.12, bot: TALL ? H * 0.93 : H * 0.97, w: W * (TALL ? 0.84 : 0.72) };
  // the stage's flower arch follows the couple (on 16:9 they stand left of the words)
  const SARCH = WIDE ? { cx: CP.x, top: H * 0.1, bot: H * 0.97, w: H * 0.66 } : ARCH;
  function archPath(ctx, inset = 0, A = ARCH) {
    const { cx, top, bot, w } = A, hw = w / 2 - inset, shoulder = top + w * 0.42;
    ctx.beginPath();
    ctx.moveTo(cx - hw, bot); ctx.lineTo(cx - hw, shoulder);
    ctx.quadraticCurveTo(cx - hw, top + inset + w * 0.12, cx, top + inset);
    ctx.quadraticCurveTo(cx + hw, top + inset + w * 0.12, cx + hw, shoulder);
    ctx.lineTo(cx + hw, bot); ctx.closePath();
  }
  // the groom's head and glasses (for the gleam), from Ch.person's standing geometry
  const glassesAt = (x, ground, s) => [x + 29 * s, ground - 412 * s];
  function sparkle(ctx, x, y, r, alpha = 1) {
    if (alpha <= 0) return;
    ctx.save(); ctx.globalAlpha *= alpha; ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = '#FFFFFF';
    ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + r * 0.18, y - r * 0.18); ctx.lineTo(x + r, y); ctx.lineTo(x + r * 0.18, y + r * 0.18); ctx.lineTo(x, y + r); ctx.lineTo(x - r * 0.18, y + r * 0.18); ctx.lineTo(x - r, y); ctx.lineTo(x - r * 0.18, y - r * 0.18); ctx.closePath(); ctx.fill();
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 0.8); g.addColorStop(0, 'rgba(255,240,200,0.9)'); g.addColorStop(1, 'rgba(255,240,200,0)'); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
    ctx.restore();
  }
  // a blink every few seconds (0 open … 1 closed), different rhythm for each of them
  const blinkAt = (t, every, off) => { const u = ((t + off) % every) / every * every; return u < 0.14 ? Math.sin(Math.PI * u / 0.14) : 0; };
  const couple = (ctx, t, { x = CP.x, ground = CP.ground, s = CP.s, groom = {}, bride = {}, gap = SP } = {}) => {
    const bob = clock.phase(t);
    Ch.person(ctx, { x: x + gap, y: ground, s, pose: 'stand', style: BRIDE, mouth: 'smile', eyes: 'normal', blink: blinkAt(t, 3.7, 1.1), blush: 0.5, handL: [-40, -196], handR: [30, -200], look: -0.3, seed: 520, ...bride });
    Ch.person(ctx, { x: x - gap, y: ground, s, pose: 'stand', style: GROOM, mouth: 'smile', eyes: 'happy', blink: blinkAt(t, 3.1, 0.4), look: 0.3, headRot: 0.02 * Math.sin(Math.PI * bob), seed: 500, ...groom });
  };

  // ================= 1. the doors (alaap) =================
  function doors(ctx, t) {
    maroon(ctx, 0.4 + 0.4 * clamp(t / T(2)));
    dust(ctx, t, 50);
  }
  // light leaking through the gap between the doors, growing toward the opening
  function leak(ctx, t) {
    const l = clamp((t - T(0, 2)) / (ev.doors - T(0, 2)));
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const lg = ctx.createLinearGradient(ARCH.cx - 70 * K, 0, ARCH.cx + 70 * K, 0);
    lg.addColorStop(0, 'rgba(255,210,130,0)'); lg.addColorStop(0.5, `rgba(255,220,150,${0.2 + 0.7 * l})`); lg.addColorStop(1, 'rgba(255,210,130,0)');
    ctx.fillStyle = lg; ctx.fillRect(ARCH.cx - 70 * K, ARCH.top, 140 * K, ARCH.bot - ARCH.top);
    ctx.restore();
    dust(ctx, t, 30, 0.7);
  }
  // the two door panels, swinging open from ev.doors (drawn over the scene behind them)
  function doorPanels(ctx, t) {
    const u = ease.inOutCubic(clamp((t - ev.doors) / 0.75));
    if (u >= 1) return;
    ctx.save(); archPath(ctx, 14 * K); ctx.clip();
    for (const sd of [-1, 1]) {
      const hinge = ARCH.cx + sd * ARCH.w / 2, w = (ARCH.w / 2) * (1 - u * 0.92);
      ctx.save();
      ctx.translate(hinge, 0); ctx.scale(-sd, 1); // draw each panel from its hinge inward
      const g = ctx.createLinearGradient(0, 0, w, 0); g.addColorStop(0, '#4A0C18'); g.addColorStop(1, `rgb(${Math.round(120 - 60 * u)},20,34)`);
      ctx.fillStyle = g; ctx.fillRect(0, ARCH.top - 10, w, ARCH.bot - ARCH.top + 20);
      // carved lattice (jaali): diamonds in gold
      ctx.strokeStyle = `rgba(212,168,58,${0.75 - 0.4 * u})`; ctx.lineWidth = 2.5 * K;
      const step = 46 * K;
      ctx.beginPath();
      for (let yy = ARCH.top; yy < ARCH.bot; yy += step) for (let xx = step * 0.3; xx < w - step * 0.2; xx += step) { ctx.moveTo(xx, yy); ctx.lineTo(xx + step / 2, yy + step / 2); ctx.lineTo(xx, yy + step); ctx.lineTo(xx - step / 2, yy + step / 2); ctx.closePath(); }
      ctx.stroke();
      ctx.strokeStyle = C.gold; ctx.lineWidth = 6 * K; ctx.strokeRect(10 * K, ARCH.top + 20 * K, w - 20 * K, ARCH.bot - ARCH.top - 40 * K);
      // a knocker ring
      if (u < 0.3) { ctx.beginPath(); ctx.arc(w - 50 * K, (ARCH.top + ARCH.bot) / 2, 22 * K, 0, Math.PI * 2); ctx.lineWidth = 6 * K; ctx.stroke(); }
      ctx.restore();
    }
    ctx.restore();
  }
  function archOutline(ctx, alpha = 1) {
    ctx.save(); ctx.globalAlpha *= alpha;
    archPath(ctx, 0); ctx.strokeStyle = C.gold; ctx.lineWidth = 10 * K; ctx.stroke();
    archPath(ctx, 18 * K); ctx.lineWidth = 3 * K; ctx.stroke();
    ctx.restore();
  }
  function alaapText(ctx, t) {
    const topY = TALL ? SAFE.y + 20 : WIDE ? H * 0.075 : SAFE.y - 6;
    if (INVITE.bismillah) {
      const a = fadeIn(t, 0.5, 1) * (1 - fadeIn(t, ev.doors + 0.2, 0.4));
      G.text(ctx, 'بسم اللہ الرحمن الرحیم', W / 2, topY + (WIDE ? 38 : TALL ? 20 : 42) * K, { size: (WIDE ? 48 : TALL ? 58 : 46) * K, align: 'center', color: C.gold2, alpha: a, lang: 'ar', boil: 0.2 });
    }
    const a2 = fadeIn(t, T(1), 0.7) * (1 - fadeIn(t, ev.doors - 0.15, 0.2));
    goldText(ctx, "You're invited", ARCH.cx, (ARCH.top + ARCH.bot) / 2 + 20 * K, { size: (WIDE ? 110 : 120) * K, fam: FONT.script, weight: 400, alpha: a2, maxW: ARCH.w * 0.8 });
  }

  // ================= 2–3. the reveal and the invitation =================
  function stage(ctx, t) {
    // a warm hall: blush-ivory, a floral arch behind the couple, fairy lights, marigold strings
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#FBEBD8'); g.addColorStop(1, '#F1D3B8');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.save(); archPath(ctx, 40 * K, SARCH); ctx.fillStyle = 'rgba(255,245,230,0.7)'; ctx.fill(); ctx.restore();
    // flowers along the arch
    const { cx, top, w } = SARCH, hw = w / 2 - 26 * K, ABOT = SARCH.bot;
    for (let i = 0; i < 46; i++) {
      const u = i / 45;
      let px, py;
      if (u < 0.3) { px = cx - hw; py = ABOT - (ABOT - (top + w * 0.42)) * (u / 0.3); }
      else if (u < 0.7) { const v = (u - 0.3) / 0.4, a = Math.PI + v * Math.PI; px = cx + Math.cos(a) * hw; py = top + 26 * K + w * 0.42 * (1 - Math.abs(Math.sin(a))) * 0.9 + (1 - Math.sin(Math.PI * v)) * w * 0.02; py = lerp(top + w * 0.42, top + 26 * K, Math.sin(Math.PI * v)); }
      else { px = cx + hw; py = (top + w * 0.42) + (ABOT - (top + w * 0.42)) * ((u - 0.7) / 0.3); }
      G.ellipse(ctx, px, py, 16 * K, 15 * K, { fill: i % 4 === 0 ? C.rose : i % 2 ? '#FBF7EE' : C.marigold, stroke: '#8A4A08', lw: 2 * K, seed: 70 + i, amp: 0.5 });
      if (i % 3 === 0) G.ellipse(ctx, px + 14 * K, py + 10 * K, 9 * K, 6 * K, { fill: C.green, stroke: '#0E3A2A', lw: 1.5 * K, seed: 120 + i, amp: 0.3 });
    }
    fairy(ctx, t, 70 * K, 70, WIDE ? 30 : 18);
    marigolds(ctx, t, { len: TALL ? 0.14 : WIDE ? 0.2 : 0.09, n: WIDE ? 16 : 10 });
    // the floor
    ctx.fillStyle = 'rgba(160,90,60,0.18)'; ctx.fillRect(0, CP.ground - 10 * K, W, H);
  }
  function reveal(ctx, t) {
    stage(ctx, t);
    couple(ctx, t);
    petals(ctx, t, ev.doors, ev.doors + 4);
    // the names, stamping in on the beats
    const [t1, t2, t3] = ev.names;
    const y1 = WIDE ? H * 0.3 : TALL ? H * 0.31 : PORT ? H * 0.25 : H * 0.245, y2 = y1 + (WIDE ? 190 : TALL ? 175 : PORT ? 160 : 150) * K, y3 = y2 + (WIDE ? 150 : TALL ? 140 : PORT ? 130 : 120) * K;
    const sz = (WIDE ? 104 : TALL ? 104 : PORT ? 88 : 80) * K;
    // a soft glow behind the names
    const gl = ctx.createRadialGradient(TXT.x, (y1 + y3) / 2, 0, TXT.x, (y1 + y3) / 2, Math.max(360, TXT.w * 0.55) * K); gl.addColorStop(0, 'rgba(255,250,240,0.85)'); gl.addColorStop(1, 'rgba(255,250,240,0)'); ctx.fillStyle = gl; ctx.fillRect(0, y1 - 300 * K, W, y3 - y1 + 500 * K);
    const k1 = stampIn(t, t1), k2 = stampIn(t, t2), k3 = stampIn(t, t3);
    ctx.save(); ctx.translate(TXT.x, y1); ctx.scale(k1, k1); goldText(ctx, INVITE.groom, 0, 0, { size: sz, shine: shineAt(t, t1 + 0.3) }); ctx.restore();
    ctx.save(); ctx.translate(TXT.x, y2); ctx.scale(k2, k2); goldText(ctx, 'weds', 0, 0, { size: sz * 1.05, fam: FONT.script, weight: 400, light: false }); ctx.restore();
    ctx.save(); ctx.translate(TXT.x, y3); ctx.scale(k3, k3); goldText(ctx, INVITE.bride, 0, 0, { size: sz, shine: shineAt(t, t3 + 0.3) }); ctx.restore();
    if (INVITE.groomUrdu) urdu(ctx, INVITE.groomUrdu, TXT.x, y1 + (WIDE || TALL ? 72 : 62) * K, { size: (WIDE || TALL ? 46 : 40) * K, color: '#8E1E2E', alpha: fadeIn(t, t1 + 0.3, 0.4) });
    if (INVITE.brideUrdu) urdu(ctx, INVITE.brideUrdu, TXT.x, y3 + (WIDE || TALL ? 72 : 62) * K, { size: (WIDE || TALL ? 46 : 40) * K, color: '#8E1E2E', alpha: fadeIn(t, t3 + 0.3, 0.4) });
  }
  function invite(ctx, t) {
    const u = ease.inOutCubic(clamp((t - ev.invite) / 0.8));
    stage(ctx, t);
    // the couple step back a little; at the gleam the groom's glasses catch the light
    const s = CP.s * lerp(1, 0.86, u), ground = CP.ground;
    const gl = t >= ev.gleam && t < ev.gleam + 0.9;
    couple(ctx, t, { s, gap: SP * lerp(1, 0.86, u), groom: { brows: gl ? 'up' : 'neutral', mouth: gl ? 'smirk' : 'smile', eyes: gl ? 'normal' : 'happy', handR: gl ? [46, -380] : undefined }, bride: { mouth: gl ? 'open' : 'smile', eyes: gl ? 'happy' : 'normal' } });
    if (gl) { const [gx, gy] = glassesAt(CP.x - SP * lerp(1, 0.86, u), ground, s); const a = t - ev.gleam; sparkle(ctx, gx - 29 * s + 28 * s * 0 + 10 * s, gy + 2 * s, 60 * K * Math.sin(Math.PI * clamp(a / 0.6)), 1); }
    petals(ctx, t, ev.doors, ev.doors + 4);
    // the scroll
    const sy = WIDE ? H * 0.2 : TXT.top + 20 * K, sw = WIDE ? W * 0.5 : TXT.w, shMax = WIDE ? H * 0.58 : TALL ? 600 * K : PORT ? 520 * K : 440 * K, sh = shMax * u;
    const sx = TXT.x - sw / 2;
    if (sh > 4) {
      ctx.save();
      ctx.fillStyle = '#FFF7E6'; ctx.strokeStyle = C.gold; ctx.lineWidth = 4 * K;
      ctx.shadowColor = 'rgba(80,30,10,0.3)'; ctx.shadowBlur = 20 * K * (G.scale || 1);
      ctx.beginPath(); ctx.roundRect(sx, sy, sw, sh, 16 * K); ctx.fill(); ctx.shadowColor = 'transparent'; ctx.stroke();
      ctx.beginPath(); ctx.roundRect(sx + 14 * K, sy + 14 * K, sw - 28 * K, Math.max(0, sh - 28 * K), 10 * K); ctx.lineWidth = 1.5 * K; ctx.stroke();
      for (const yy of [sy, sy + sh]) G.rrect(ctx, sx - 16 * K, yy - 14 * K, sw + 32 * K, 28 * K, 14 * K, { fill: '#B88A2A', stroke: '#5A3A10', lw: 3 * K, seed: 90 + Math.round(yy), amp: 0.4 });
      ctx.save(); ctx.beginPath(); ctx.rect(sx, sy + 16 * K, sw, Math.max(0, sh - 32 * K)); ctx.clip();
      const c = TXT.x, lh = (TALL ? 92 : WIDE ? 80 : 70) * K;
      let y = sy + (TALL ? 120 : 96) * K;
      const col = '#5A1A22';
      plainText(ctx, 'together with their families', c, y, { size: (TALL ? 44 : 38) * K, fam: FONT.serif, weight: 600, color: '#8E5A2A', maxW: sw * 0.86, alpha: fadeIn(t, ev.invite + 0.4) }); y += lh;
      goldText(ctx, INVITE.groom + ' & ' + INVITE.bride, c, y + 10 * K, { size: (TALL ? 80 : 66) * K, fam: FONT.script, weight: 400, maxW: sw * 0.86, alpha: fadeIn(t, ev.invite + 0.6) }); y += lh * 1.15;
      plainText(ctx, INVITE.line, c, y, { size: (TALL ? 46 : 40) * K, color: col, maxW: sw * 0.86, alpha: fadeIn(t, ev.invite + 0.9) }); y += lh;
      urdu(ctx, INVITE.lineUrdu, c, y + 10 * K, { size: (TALL ? 50 : 42) * K, color: '#8E1E2E', alpha: fadeIn(t, ev.invite + 1.2) }); y += lh * 1.15;
      plainText(ctx, `at their wedding · ${INVITE.city}`, c, y, { size: (TALL ? 42 : 36) * K, fam: FONT.serif, weight: 600, color: '#8E5A2A', maxW: sw * 0.86, alpha: fadeIn(t, ev.invite + 1.5) });
      ctx.restore();
      ctx.restore();
    }
  }

  // ================= 4–6. the three events =================
  function eventCard(ctx, t, e, t0, { dark = false, y = null } = {}) {
    const cy = y ?? (WIDE ? H * 0.34 : TXT.top + 90 * K);
    const x = TXT.x, big = (WIDE ? 150 : TALL ? 150 : 120) * K;
    const k = stampIn(t, t0 + 0.05);
    ctx.save(); ctx.translate(x, cy); ctx.scale(k, k);
    goldText(ctx, e.title, 0, 0, { size: big, fam: FONT.script, weight: 400, shine: shineAt(t, t0 + 0.3) });
    ctx.restore();
    urdu(ctx, e.urdu, x, cy + 90 * K, { size: 58 * K, color: dark ? C.gold2 : '#8E1E2E', alpha: fadeIn(t, t0 + 0.35, 0.3) });
    const col = dark ? C.ivory : '#4A1418';
    plainText(ctx, e.date, x, cy + 180 * K, { size: (TALL ? 50 : 44) * K, fam: FONT.caps, weight: 500, color: col, alpha: fadeIn(t, t0 + 0.55, 0.3) });
    plainText(ctx, `${e.time} · ${e.venue}`, x, cy + 245 * K, { size: (TALL ? 44 : 38) * K, fam: FONT.serif, weight: 600, color: col, alpha: fadeIn(t, t0 + 0.75, 0.3) });
  }
  // mehndi: a henna hand that draws itself, one stroke per 8th note
  function hennaHand(ctx, t, x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    // the open palm
    const skin = '#D9A07A';
    G.shape(ctx, [[-70, 140], [-78, 40], [-96, -20], [-92, -44], [-70, -40], [-58, -10], [-56, -110], [-40, -122], [-26, -110], [-24, -30], [-18, -140], [0, -152], [16, -140], [16, -30], [26, -128], [44, -136], [56, -122], [52, -26], [64, -100], [80, -104], [90, -92], [80, 20], [70, 140]], { fill: skin, lw: 5, seed: 150, amp: 1 });
    const strokes = [
      (c) => { c.beginPath(); c.arc(0, 40, 34, 0, Math.PI * 2); c.stroke(); },
      (c) => { c.beginPath(); c.arc(0, 40, 18, 0, Math.PI * 2); c.stroke(); },
      (c) => { for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; c.beginPath(); c.ellipse(Math.cos(a) * 50, 40 + Math.sin(a) * 50, 12, 6, a, 0, Math.PI * 2); c.stroke(); } },
      (c) => { c.beginPath(); c.moveTo(-50, 110); c.quadraticCurveTo(0, 90, 50, 110); c.stroke(); },
      (c) => { c.beginPath(); for (let k = 0; k < 7; k++) { c.moveTo(-44 + k * 15, 120); c.arc(-44 + k * 15, 120, 5, 0, Math.PI * 2); } c.stroke(); },
      (c) => { c.beginPath(); c.moveTo(-40, -30); c.lineTo(-40, -100); c.stroke(); },
      (c) => { c.beginPath(); c.moveTo(-2, -30); c.lineTo(-2, -128); c.stroke(); },
      (c) => { c.beginPath(); c.moveTo(34, -30); c.lineTo(38, -116); c.stroke(); },
      (c) => { c.beginPath(); c.moveTo(70, 0); c.lineTo(74, -86); c.stroke(); },
      (c) => { for (const fx of [-40, -2, 36, 72]) { c.beginPath(); c.arc(fx, -60, 7, 0, Math.PI * 2); c.stroke(); } },
      (c) => { for (const fx of [-40, -2, 36]) for (let k = 0; k < 3; k++) { c.beginPath(); c.moveTo(fx - 8, -90 - k * 12); c.lineTo(fx + 8, -90 - k * 12); c.stroke(); } },
      (c) => { c.beginPath(); c.moveTo(-80, -30); c.quadraticCurveTo(-70, 0, -60, 10); c.stroke(); },
      (c) => { c.beginPath(); for (let k = 0; k < 5; k++) { c.moveTo(-60 + k * 30, 150); c.lineTo(-45 + k * 30, 135); c.lineTo(-30 + k * 30, 150); } c.stroke(); },
      (c) => { c.beginPath(); c.arc(0, 40, 4, 0, Math.PI * 2); c.fill(); },
      (c) => { for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; c.beginPath(); c.arc(Math.cos(a) * 70, 40 + Math.sin(a) * 70, 3, 0, Math.PI * 2); c.fill(); } },
      (c) => { c.beginPath(); c.moveTo(-60, 70); c.quadraticCurveTo(-80, 40, -60, 10); c.moveTo(60, 70); c.quadraticCurveTo(80, 40, 60, 10); c.stroke(); },
    ];
    ctx.strokeStyle = '#7A2E10'; ctx.fillStyle = '#7A2E10'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    S.henna.forEach((ht, i) => { if (t >= ht) strokes[i % strokes.length](ctx); });
    ctx.restore();
  }
  function mehndi(ctx, t) {
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#FFE58A'); g.addColorStop(1, '#F2B63A');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // a green-and-gold mandala behind
    ctx.save(); ctx.translate(WIDE ? W * 0.3 : W / 2, WIDE ? H * 0.52 : TALL ? H * 0.64 : PORT ? H * 0.7 : H * 0.72); ctx.rotate((t - ev.mehndi) * 0.15);
    for (let r = 0; r < 3; r++) for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2; ctx.save(); ctx.rotate(a); G.ellipse(ctx, 0, -(130 + r * 90) * K, (24 - r * 4) * K, (46 - r * 6) * K, { fill: r % 2 ? 'rgba(31,111,84,0.35)' : 'rgba(255,255,255,0.35)', stroke: 'rgba(31,111,84,0.6)', lw: 2 * K, seed: 200 + r * 16 + k, amp: 0.5 }); ctx.restore(); }
    ctx.restore();
    marigolds(ctx, t, { len: 0.18 });
    petals(ctx, t, T(6), T(8));
    const hs = (WIDE ? 2.4 : TALL ? 2.6 : PORT ? 1.8 : 1.45) * K;
    hennaHand(ctx, t, WIDE ? W * 0.3 : W / 2, WIDE ? H * 0.52 : TALL ? H * 0.64 : PORT ? H * 0.68 : H * 0.68, hs);
    eventCard(ctx, t, INVITE.events[0], ev.mehndi, { y: WIDE ? H * 0.36 : TXT.top + 100 * K });
  }
  // where a firework bursts: in the open sky between the words and the people
  const skyAt = (f, drop = false) => {
    const u = f.y / 0.26;
    if (WIDE) return [lerp(W * 0.08, W * (drop ? 0.4 : 0.5), f.x), lerp(H * 0.12, H * 0.4, u)];
    const top = TXT.top + (drop ? 330 : 400) * K, bot = CP.ground - CP.s * (drop ? 640 : 560);
    return [lerp(W * 0.12, W * 0.88, f.x), lerp(top, Math.max(top + 80 * K, bot), u)];
  };
  // baraat: night, fireworks, the groom on his horse with a dhol player and dancing friends
  function baraat(ctx, t) {
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0C0A2A'); g.addColorStop(0.7, '#2A1240'); g.addColorStop(1, '#4A1A2A');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 60; i++) { ctx.fillStyle = `rgba(255,245,220,${0.3 + 0.5 * G.rnd(i, 3) * (0.6 + 0.4 * Math.sin(t * 3 + i))})`; ctx.fillRect(G.rnd(i, 1) * W, G.rnd(i, 2) * H * 0.6, 2.4 * K, 2.4 * K); }
    for (const f of S.fireworks.filter((q) => q.t < ev.walima)) { const [fx, fy] = skyAt(f); G.firework(ctx, { t: f.t, launch: 0.55, seed: f.i + 1, size: 1.3, color: ['#FFD66B', '#FF7A9A', '#8FE3FF', '#B6FF8A'][f.hue], color2: '#FFFFFF' }, t, fx, fy, K * (WIDE ? 1.2 : 1.5)); }
    fairy(ctx, t, H * (TALL ? 0.5 : 0.52), 50, WIDE ? 30 : 16);
    // the ground: a road with lights
    ctx.fillStyle = '#2A1420'; ctx.fillRect(0, CP.ground - 20 * K, W, H);
    // the procession walks in and stops in the middle
    const u = ease.outCubic(clamp((t - ev.baraat) / (BEAT * 5)));
    const walk = (clock.beatPos(t) / 2) % 1, moving = u < 0.999;
    const hs = CP.s * (WIDE ? 0.95 : TALL ? 0.92 : 0.8);
    const hx = lerp(-W * 0.25, WIDE ? W * 0.32 : W * 0.5, u);
    const dholX = hx + (WIDE ? 420 : 300) * hs;
    Ch.person(ctx, { x: dholX, y: CP.ground, s: hs * 0.9, pose: moving ? 'walk' : 'stand', walk: (walk * 2) % 1, gesture: 'dhol', style: { outfit: 'kameez', shirt: '#F2B84B', bottoms: 'shalwar', shorts: '#F4EEE0', skin: '#A86E4B', hairStyle: 'short', facialHair: 'mustache', headwear: 'turban', headwearColor: '#D81E3A' }, mouth: 'grin', seed: 640 });
    if (WIDE) Ch.person(ctx, { x: hx - 420 * hs, y: CP.ground, s: hs * 0.9, pose: 'stand', gesture: 'bhangra', style: { outfit: 'kameez', shirt: '#1F6F54', bottoms: 'shalwar', shorts: '#1F6F54', skin: '#C68B61', hairStyle: 'curlytop', facialHair: 'trimmed' }, mouth: 'open', eyes: 'happy', seed: 660 });
    const h = Ch.horse(ctx, { x: hx, y: CP.ground, s: hs * 1.25, walk: moving ? walk : 0.25 });
    Ch.person(ctx, { x: h.seat[0], y: h.seat[1], s: hs * 0.72, pose: 'sit', style: GROOM, handL: [-50, -40], handR: [60, -150 + 20 * Math.sin(t * 6)], mouth: 'smile', eyes: 'happy', seed: 500 });
    eventCard(ctx, t, INVITE.events[1], ev.baraat, { dark: true, y: WIDE ? H * 0.2 : TXT.top + 90 * K });
  }
  // walima: an elegant reception, the couple seated under a chandelier
  function walima(ctx, t) {
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#FDF8EE'); g.addColorStop(1, '#EADCC4');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // drapes
    for (const sd of [-1, 1]) { ctx.save(); ctx.translate(sd < 0 ? 0 : W, 0); ctx.scale(sd, 1); G.shape(ctx, [[0, 0], [W * 0.2, 0], [W * 0.12, H * 0.25], [W * 0.05, H * 0.7], [0, H]], { fill: 'rgba(212,168,58,0.35)', stroke: 'rgba(160,110,30,0.5)', lw: 3 * K, seed: 300 + sd, amp: 1 }); ctx.restore(); }
    // the chandelier: crystals sparkle on each note
    const lamps = WIDE ? [[W * 0.3, H * 0.22, 1]] : [[W * 0.14, TALL ? H * 0.2 : H * 0.18, 0.7], [W * 0.86, TALL ? H * 0.2 : H * 0.18, 0.7]];
    lamps.forEach(([chx, chy, sc], li) => { const cs = sc * K;
    G.line(ctx, [[chx, 0], [chx, chy - 60 * cs]], { color: '#8A6A2A', lw: 4 * cs, seed: 310 });
    G.ellipse(ctx, chx, chy - 50 * cs, 70 * cs, 16 * cs, { fill: C.gold, stroke: '#6A4410', lw: 3 * cs, seed: 311 });
    for (let k = 0; k < 9; k++) { const x = chx + (k - 4) * 22 * cs, len = (60 + 40 * Math.cos((k - 4) * 0.4)) * cs; G.line(ctx, [[x, chy - 40 * cs], [x, chy - 40 * cs + len]], { color: 'rgba(160,200,230,0.8)', lw: 2 * cs, seed: 312 + k }); G.ellipse(ctx, x, chy - 40 * cs + len, 7 * cs, 10 * cs, { fill: 'rgba(210,235,255,0.9)', stroke: 'rgba(120,150,180,0.8)', lw: 1.5 * cs, seed: 322 + k, amp: 0.3 }); }
    const last = S.sparkles.filter((q) => q <= t).pop();
    if (last !== undefined && S.sparkles.indexOf(last) % lamps.length === li) { const i = S.sparkles.indexOf(last), a = t - last; sparkle(ctx, chx + ((i * 3) % 9 - 4) * 22 * cs, chy + (40 + ((i * 5) % 4) * 14) * cs, 40 * cs, 1 - a / 0.5); }
    });
    // the couple on a stage sofa (walima outfits: a navy sherwani, a blush lehenga)
    const sy = WIDE ? H * 0.9 : CP.ground - 60 * K, sx = WIDE ? W * 0.3 : W / 2, ss = CP.s * (WIDE ? 1 : TALL ? 0.95 : 1.15);
    G.rrect(ctx, sx - 330 * ss, sy - 160 * ss, 660 * ss, 200 * ss, 70 * ss, { fill: '#8E1E2E', stroke: '#5A0E1A', lw: 5 * ss, seed: 330, hatch: { color: 'rgba(0,0,0,0.12)', gap: 9 } });
    G.rrect(ctx, sx - 360 * ss, sy - 10 * ss, 720 * ss, 70 * ss, 30 * ss, { fill: '#A8283A', stroke: '#5A0E1A', lw: 5 * ss, seed: 331 });
    Ch.person(ctx, { x: sx - 140 * ss, y: sy, s: ss, pose: 'sit', style: { ...GROOM, outfit: 'sherwani', robe: '#1E2A4A', headwear: 'none', sehra: false, garland: null, hairStyle: 'short' }, mouth: 'smile', eyes: 'happy', look: 0.3, seed: 500 });
    Ch.person(ctx, { x: sx + 140 * ss, y: sy, s: ss, pose: 'sit', style: { ...BRIDE, robe: '#E8A7B5', shirt: '#D98B9C', headwearColor: '#F0D9C8' }, mouth: 'smile', look: -0.3, blush: 0.5, seed: 520 });
    eventCard(ctx, t, INVITE.events[2], ev.walima, { y: WIDE ? H * 0.34 : TXT.top + 90 * K });
  }

  // ================= 7. the build =================
  function build(ctx, t) {
    maroon(ctx, 0.8);
    const beat = Math.min(2, Math.floor((t - ev.build) / BEAT));
    const icons = [(c) => hennaHand(c, t + 10, W / 2, H * 0.5, 1.5 * K), (c) => { const h = Ch.horse(c, { x: W / 2 - 40 * K, y: H * 0.5 + 250 * K, s: 1.1 * K, walk: 0.25 }); return h; }, (c) => { for (let k = 0; k < 7; k++) sparkle(c, W / 2 + (k - 3) * 80 * K, H * 0.5 + Math.sin(k) * 60 * K, 50 * K, 1); }];
    const since = t - (ev.build + beat * BEAT), k = 1 + 0.12 * Math.exp(-since * 6);
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(k, k); ctx.translate(-W / 2, -H / 2);
    if (t < T(12, 3)) icons[beat](ctx);
    ctx.restore();
    if (t >= T(12, 3)) { const a = clamp((t - T(12, 3)) / (BEAT * 0.5)); goldText(ctx, '…', W / 2, H / 2, { size: 200 * K, alpha: 1 - a }); }
    // the held breath: everything drops to black for an 8th
    if (t >= ev.breath[0]) { ctx.fillStyle = '#0A0206'; ctx.fillRect(0, 0, W, H); }
  }

  // ================= 8. SHAADI MUBARAK =================
  function mubarak(ctx, t) {
    maroon(ctx, 1);
    G.rays(ctx, W / 2, WIDE ? H * 0.45 : H * 0.36, { n: 40, r0: 200 * K, r1: Math.max(W, H), color: 'rgba(242,212,138,0.35)', lw: 20 * K, seed: 5, spin: (t - ev.drop) * 0.25 });
    for (const f of S.fireworks.filter((q) => q.t >= ev.drop)) { const [fx, fy] = skyAt(f, true); G.firework(ctx, { t: f.t, launch: 0.55, seed: f.i + 1, size: 1.3, color: ['#FFD66B', '#FF7A9A', '#8FE3FF', '#B6FF8A'][f.hue], color2: '#FFFFFF' }, t, fx, fy, K * (WIDE ? 1.2 : 1.4)); }
    fairy(ctx, t, 90 * K, 60, WIDE ? 30 : 18);
    // everyone dances: the groom does bhangra, the bride claps, friends at the sides
    const hop = 18 * Math.abs(Math.sin(Math.PI * clock.phase(t)));
    if (WIDE || !TALL) {
      for (const [dx, st, g, seed] of [[-2.2, { outfit: 'kameez', shirt: '#1F6F54', bottoms: 'shalwar', shorts: '#1F6F54', skin: '#C68B61', hairStyle: 'curlytop', facialHair: 'trimmed' }, 'bhangra', 660], [2.2, { outfit: 'kameez', shirt: '#E8718D', bottoms: 'shalwar', shorts: '#F4EEE0', skin: '#D59B72', hairStyle: 'ponytail' }, 'clap', 680]]) {
        if (!WIDE && Math.abs(dx) > 2) continue;
        Ch.person(ctx, { x: CP.x + dx * SP * (WIDE && dx > 0 ? 1.6 : 1), y: CP.ground - hop, s: CP.s * 0.85, pose: 'stand', gesture: g, style: st, mouth: 'open', eyes: 'happy', seed });
      }
    }
    Ch.person(ctx, { x: CP.x + SP, y: CP.ground - hop * 0.5, s: CP.s, pose: 'stand', style: BRIDE, gesture: 'clap', mouth: 'open', eyes: 'happy', blush: 0.7, seed: 520 });
    Ch.person(ctx, { x: CP.x - SP, y: CP.ground - hop, s: CP.s, pose: 'stand', style: { ...GROOM, sehra: false }, gesture: 'bhangra', mouth: 'open', eyes: 'happy', seed: 500 });
    petals(ctx, t, ev.drop, Infinity);
    const k = stampIn(t, ev.drop, 0.35);
    const ty = WIDE ? H * 0.3 : TXT.top + 110 * K;
    ctx.save(); ctx.translate(WIDE ? W * 0.68 : W / 2, ty); ctx.scale(k, k); ctx.rotate(-0.03);
    goldText(ctx, 'Shaadi Mubarak!', 0, 0, { size: (WIDE ? 150 : TALL ? 150 : 124) * K, fam: FONT.script, weight: 400, shine: shineAt(t, ev.drop + 0.35), maxW: WIDE ? W * 0.56 : TXT.w });
    ctx.restore();
    urdu(ctx, 'شادی مبارک', WIDE ? W * 0.68 : W / 2, ty + 110 * K, { size: 80 * K, color: C.gold2, alpha: fadeIn(t, ev.drop + 0.25, 0.3) });
    plainText(ctx, `${INVITE.groom} & ${INVITE.bride}`, WIDE ? W * 0.68 : W / 2, ty + 200 * K, { size: 50 * K, fam: FONT.caps, weight: 500, color: C.ivory, alpha: fadeIn(t, ev.drop + 0.6, 0.4) });
  }

  // ================= 9. save the date =================
  function saveTheDate(ctx, t) {
    maroon(ctx, 0.7);
    dust(ctx, t, 60, 0.8);
    petals(ctx, t, ev.drop, Infinity);
    const cx = W / 2;
    // a medallion with the couple
    const my = WIDE ? H * 0.52 : TALL ? H * 0.6 : PORT ? H * 0.66 : H * 0.68, mr = (WIDE ? 250 : TALL ? 270 : PORT ? 210 : 170) * K;
    const mxx = WIDE ? W * 0.27 : cx;
    const a0 = fadeIn(t, ev.end, 0.5);
    ctx.save(); ctx.globalAlpha *= a0;
    ctx.beginPath(); ctx.arc(mxx, my, mr, 0, Math.PI * 2); ctx.fillStyle = '#FBEBD8'; ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.arc(mxx, my, mr - 6 * K, 0, Math.PI * 2); ctx.clip();
    const cs = mr / (300 * K) * K * 0.95;
    Ch.person(ctx, { x: mxx + 95 * cs, y: my + 480 * cs, s: cs, pose: 'stand', style: BRIDE, mouth: 'smile', blush: 0.6, look: -0.3, handL: [-40, -196], handR: [30, -200], seed: 520 });
    Ch.person(ctx, { x: mxx - 95 * cs, y: my + 480 * cs, s: cs, pose: 'stand', style: GROOM, mouth: 'smile', eyes: 'happy', look: 0.3, seed: 500 });
    ctx.restore();
    ctx.beginPath(); ctx.arc(mxx, my, mr, 0, Math.PI * 2); ctx.strokeStyle = C.gold; ctx.lineWidth = 10 * K; ctx.stroke();
    ctx.beginPath(); ctx.arc(mxx, my, mr + 16 * K, 0, Math.PI * 2); ctx.lineWidth = 3 * K; ctx.stroke();
    for (let k = 0; k < 24; k++) { const a = (k / 24) * Math.PI * 2 + t * 0.1; G.ellipse(ctx, mxx + Math.cos(a) * (mr + 16 * K), my + Math.sin(a) * (mr + 16 * K), 8 * K, 8 * K, { fill: k % 3 === 0 ? C.rose : C.gold2, stroke: '#6A4410', lw: 1.5 * K, seed: 400 + k, amp: 0.3 }); }
    ctx.restore();
    // the words
    const x = WIDE ? W * 0.66 : cx;
    let y = WIDE ? H * 0.22 : TXT.top + 70 * K;
    const L = (dy) => (y += dy * K);
    goldText(ctx, 'SAVE THE DATE', x, y, { size: (TALL ? 50 : 44) * K, fam: FONT.caps, weight: 500, alpha: fadeIn(t, ev.end + 0.2), stroke: false }); L(TALL ? 110 : 96);
    goldText(ctx, `${INVITE.groom} & ${INVITE.bride}`, x, y, { size: (TALL ? 100 : WIDE ? 104 : 84) * K, fam: FONT.script, weight: 400, shine: shineAt(t, ev.end + 0.6), alpha: fadeIn(t, ev.end + 0.35), maxW: WIDE ? W * 0.56 : TXT.w }); L(TALL ? 90 : 80);
    plainText(ctx, `${INVITE.saveTheDate} · ${INVITE.city}`, x, y, { size: (TALL ? 46 : 40) * K, fam: FONT.caps, weight: 500, color: C.gold2, alpha: fadeIn(t, ev.end + 0.6) }); L(TALL ? 70 : 60);
    const evs = INVITE.events.map((e) => `${e.title} · ${e.date.split('·')[0].trim().slice(0, 3)} ${e.date.split('·')[1].trim().split(' ').slice(0, 2).join(' ')}`);
    if (TALL || WIDE) evs.forEach((s, i) => { plainText(ctx, s, x, y, { size: (TALL ? 40 : 36) * K, fam: FONT.serif, weight: 600, color: C.ivory, alpha: fadeIn(t, ev.end + 0.8 + i * 0.15) }); L(TALL ? 56 : 50); });
    else { plainText(ctx, evs.join('   ·   ').replace(/ · /g, ' '), x, y, { size: 30 * K, fam: FONT.serif, weight: 600, color: C.ivory, alpha: fadeIn(t, ev.end + 0.8), maxW: TXT.w }); L(52); }
    plainText(ctx, INVITE.hosts, x, y, { size: (TALL ? 40 : 34) * K, fam: FONT.serif, weight: 600, color: C.blush, alpha: fadeIn(t, ev.end + 1.3) });
    if (INVITE.credit) G.decor(() => plainText(ctx, INVITE.credit, W / 2, TALL ? SAFE.y + SAFE.h - 10 : H - 58 * K, { size: 24 * K, fam: FONT.serif, weight: 600, color: 'rgba(242,212,138,0.7)', alpha: fadeIn(t, ev.end + 1.6) }));
  }

  // ================= the cut =================
  const SCENES = [[0, (c, t) => { doors(c, t); doorPanels(c, t); leak(c, t); archOutline(c); alaapText(c, t); }], [ev.doors, reveal], [ev.invite, invite], [ev.mehndi, mehndi], [ev.baraat, baraat], [ev.walima, walima], [ev.build, build], [ev.drop, mubarak], [ev.end, saveTheDate]];
  Studio.film({
    post: { vignette: 0.3, grain: 0.04, paper: 0.25 },
    fadeOut: 1,
    async init() {
      await Promise.all([
        Studio.loadFont('Great Vibes', 'assets/fonts/GreatVibes-400.ttf', 400),
        Studio.loadFont('Cinzel', 'assets/fonts/Cinzel-700.ttf', 700), Studio.loadFont('Cinzel', 'assets/fonts/Cinzel-500.ttf', 500),
        Studio.loadFont('Cormorant Garamond', 'assets/fonts/CormorantGaramond-600.ttf', 600),
      ]);
    },
    draw(ctx, t) {
      const [, scene] = SCENES.filter(([t0]) => t >= t0).pop();
      // a small push on the drum hits
      const hit = [ev.doors, ev.baraat, ev.drop].filter((h) => t >= h).pop();
      const kick = hit !== undefined ? 0.035 * Math.exp(-(t - hit) * 5) : 0;
      ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(1 + kick, 1 + kick); ctx.translate(-W / 2, -H / 2);
      scene(ctx, t);
      ctx.restore();
      if (t >= ev.doors && t < ev.doors + 0.8) { doorPanels(ctx, t); archOutline(ctx, 1 - clamp((t - ev.doors) / 0.8)); }
      // flashes on the three big hits
      for (const h of [ev.doors, ev.baraat, ev.drop]) if (t >= h && t < h + 0.25) { ctx.fillStyle = `rgba(255,240,210,${0.55 * (1 - (t - h) / 0.25)})`; ctx.fillRect(0, 0, W, H); }
      if (!(t >= ev.breath[0] && t < ev.drop)) frame(ctx, t, { alpha: t < ev.doors ? 0.9 : 1 });
    },
  });
})();
