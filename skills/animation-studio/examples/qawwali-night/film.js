// THE FILM: a qawwali party on a stage under a shamiana. Every frame is a pure function of t,
// read from score.js: the chorus claps land on the taali, the tabla player's hands hit on the strokes,
// the harmonium player's right hand follows the notes, and every mouth sings its own part.
(function () {
  const U = globalThis.U, G = globalThis.G, Ch = globalThis.Ch, Subs = globalThis.Subs, S = globalThis.SCORE, Studio = globalThis.Studio;
  const { clamp, lerp, ease } = U;
  const { clock, T, ev } = S;
  const W = G.W, H = G.H;
  const STAGE = 800; // the carpet's back edge

  // ---------- timing helpers (all from the score) ----------
  const lastBefore = (list, t) => { let lo = -1; for (const x of list) { if (x <= t) lo = x; else break; } return lo; };
  const nextAfter = (list, t) => { for (const x of list) if (x > t) return x; return Infinity; };
  // 0 exactly on each event, rising to 1 halfway to the next: hands meet on the claps, strike on the strokes
  const arc = (list, t) => { const a = lastBefore(list, t), b = nextAfter(list, t); if (a < 0 || b === Infinity) return 1; return Math.sin(Math.PI * clamp((t - a) / (b - a))); };
  const clapTimes = S.claps;
  const rightStrokes = S.strokes.filter((s) => s.hand !== 'left').map((s) => s.t);
  const leftStrokes = S.strokes.filter((s) => s.hand !== 'right').map((s) => s.t);
  for (const [a, b] of S.rolls) for (let i = 0; i < 12; i++) (i % 2 ? rightStrokes : leftStrokes).push(a + ((b - a) * i) / 12);
  rightStrokes.sort((a, b) => a - b); leftStrokes.sort((a, b) => a - b);
  const VOWEL_OPEN = { a: [0.9, 0.5], e: [0.6, 0.8], i: [0.45, 1], o: [0.75, 0.25], u: [0.5, 0.1] };
  // the mouth while singing: open on the vowel, closed on the consonant just before the note
  const singMouth = (who, t) => {
    const n = S.sung.find((x) => (x.who === who || x.who === 'all') && t >= x.t - 0.02 && t < x.t + x.dur);
    if (!n) return { open: 0, talking: false };
    const v = (n.syl === '~' ? 'a' : (n.syl.match(/[aeiou]/) || ['a'])[0]);
    const [open, wide] = VOWEL_OPEN[v];
    const u = (t - n.t) / n.dur;
    return { open: open * clamp(u * 10) * (0.85 + 0.15 * Math.sin(t * 31)), wide, talking: true };
  };
  const lightLevel = (t) => (t < T(2) ? lerp(0.35, 1, ease.inOutQuad(clamp(t / T(2)))) : 1);

  // ---------- the set ----------
  function sky(ctx, t) { // a few stars twinkle
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#0B0C26'); g.addColorStop(1, '#2A173A');
    ctx.fillStyle = g; ctx.fillRect(-100, -100, W + 200, H + 200);
    G.decor(() => { for (let i = 0; i < 40; i++) { const x = G.rnd(i, 1) * W, y = G.rnd(i, 2) * 180; ctx.fillStyle = `rgba(255,245,220,${0.25 + 0.3 * G.rnd(i, 3) * (0.6 + 0.4 * Math.sin(t * 2 + i))})`; ctx.fillRect(x, y, 2.2, 2.2); } });
  }
  // the shamiana: appliqué panels in red, green, saffron and indigo, a scalloped valance on top
  const PANEL = ['#B8322A', '#1F6F54', '#E0A33E', '#2B4C8C'];
  function shamiana(ctx, t, lv) {
    const x0 = 90, x1 = W - 90, y0 = 150, y1 = STAGE + 10, n = 14, pw = (x1 - x0) / n;
    ctx.save();
    ctx.globalAlpha = 0.55 + 0.45 * lv;
    for (let i = 0; i < n; i++) {
      const x = x0 + i * pw, col = PANEL[i % 4];
      G.rrect(ctx, x, y0, pw + 1, y1 - y0, 2, { fill: col, lw: 3, seed: 10 + i, amp: 0.8, hatch: { color: 'rgba(0,0,0,0.12)', gap: 10 } });
      // appliqué: a diamond and two dots per panel
      const cx = x + pw / 2;
      for (const cy of [y0 + 150, y0 + 400]) {
        G.poly(ctx, [[cx, cy - 46], [cx + 34, cy], [cx, cy + 46], [cx - 34, cy]], { fill: PANEL[(i + 2) % 4], lw: 3, seed: 40 + i + cy, step: 14 });
        G.ellipse(ctx, cx, cy, 11, 11, { fill: '#F6EBD6', lw: 2.5, seed: 70 + i + cy, amp: 0.5 });
      }
    }
    // valance
    for (let i = 0; i < n * 2; i++) {
      const x = x0 + (i + 0.5) * pw / 2;
      G.ellipse(ctx, x, y0, pw / 4 + 2, 34, { fill: PANEL[(i + 1) % 4], lw: 3, seed: 90 + i, amp: 0.7 });
    }
    G.rrect(ctx, x0 - 10, y0 - 40, x1 - x0 + 20, 44, 6, { fill: '#7A1F1A', lw: 4, seed: 120, hatch: { color: 'rgba(255,200,120,0.15)', gap: 7 } });
    ctx.restore();
    // darken the backdrop toward the edges (it is lit from the front)
    const v = ctx.createRadialGradient(W / 2, STAGE - 200, 200, W / 2, STAGE - 200, 1100);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, `rgba(8,5,20,${0.75 - 0.3 * lv})`);
    ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  }
  // strings of bulbs: a light runs along them in 8ths, all bulbs flash on the taali at the peak
  function bulbs(ctx, t, lv) {
    const beat = clock.beatPos(t);
    for (const [yA, sag, off] of [[70, 70, 0], [120, 50, 0.5]]) {
      const pts = [];
      for (let i = 0; i <= 40; i++) { const u = i / 40; pts.push([u * W, yA + sag * 4 * u * (1 - u)]); }
      G.line(ctx, pts, { color: '#1A1414', lw: 2.5, seed: 5 + yA, step: 60 });
      for (let i = 0; i < 32; i++) {
        const u = (i + 0.5 + off) / 32, x = u * W, y = yA + sag * 4 * u * (1 - u) + 12;
        const chase = t > T(2) ? Math.max(0, Math.cos(((i - beat * 2) % 8) * Math.PI / 4)) : 0.5;
        const flash = t >= ev.peak && t < ev.hit ? 0.5 * (1 - arc(clapTimes, t)) : 0;
        const on = clamp((0.35 + 0.65 * chase + flash) * lv);
        const col = ['#FFD66B', '#FF7A59', '#7BE0B0', '#8FB6FF'][i % 4];
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createRadialGradient(x, y, 0, x, y, 26);
        g.addColorStop(0, col + 'AA'); g.addColorStop(1, col + '00');
        ctx.globalAlpha = on; ctx.fillStyle = g; ctx.fillRect(x - 26, y - 26, 52, 52);
        ctx.restore();
        G.ellipse(ctx, x, y, 6, 8, { fill: on > 0.6 ? '#FFF6D8' : col, lw: 2, seed: 300 + i, amp: 0.3 });
      }
    }
  }
  function stage(ctx) {
    G.rrect(ctx, 60, STAGE, W - 120, 150, 10, { fill: '#8E2A22', lw: 4, seed: 130, hatch: { color: 'rgba(0,0,0,0.18)', gap: 9 } });
    G.rrect(ctx, 90, STAGE + 16, W - 180, 110, 8, { fill: '#B83A2C', lw: 3, seed: 131 });
    G.line(ctx, [[110, STAGE + 30], [W - 110, STAGE + 30]], { color: '#E2B33C', lw: 5, seed: 132 });
    G.line(ctx, [[110, STAGE + 112], [W - 110, STAGE + 112]], { color: '#E2B33C', lw: 5, seed: 133 });
    G.decor(() => { for (let i = 0; i < 30; i++) G.ellipse(ctx, 140 + i * 57, STAGE + 71, 9, 9, { fill: '#E2B33C', lw: 2, seed: 140 + i, amp: 0.4 }); });
    G.rrect(ctx, 40, STAGE + 150, W - 80, 60, 6, { fill: '#5A3A28', lw: 4, seed: 134, hatch: { color: 'rgba(0,0,0,0.2)', gap: 8 } });
    // bolsters (gao takiya) behind the front row
    for (const x of [470, 800, 1120, 1450]) G.rrect(ctx, x - 70, STAGE - 40, 140, 56, 28, { fill: '#D9A441', lw: 3.5, seed: 150 + x, hatch: { color: 'rgba(120,60,10,0.2)', gap: 7 } });
  }
  // the spotlight on the singers, breathing with the claps
  function spot(ctx, t, lv) {
    const pulse = t >= ev.start && t < ev.hit ? 0.12 * (1 - arc(clapTimes, t)) : 0;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(W / 2, STAGE - 60, 60, W / 2, STAGE - 60, 760);
    g.addColorStop(0, `rgba(255,190,110,${(0.24 + pulse) * lv})`); g.addColorStop(1, 'rgba(255,190,110,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // at the peak, two beams sweep from the top corners
    if (t >= ev.peak && t < ev.hit + 0.4) {
      const k = clamp((t - ev.peak) / 0.4) * (t > ev.hit ? 1 - (t - ev.hit) / 0.4 : 1);
      for (const [sx, dir] of [[120, 1], [W - 120, -1]]) {
        const a = 0.9 + 0.35 * Math.sin((t - ev.peak) * 2.4 + (dir > 0 ? 0 : 1.6));
        const ex = sx + dir * Math.sin(a) * 1500, ey = Math.cos(a) * 1500 * 0.9;
        const bg = ctx.createLinearGradient(sx, 0, ex, ey);
        bg.addColorStop(0, `rgba(255,240,200,${0.3 * k})`); bg.addColorStop(1, 'rgba(255,240,200,0)');
        ctx.fillStyle = bg;
        ctx.beginPath(); ctx.moveTo(sx, 0); ctx.lineTo(ex - 150, ey); ctx.lineTo(ex + 150, ey); ctx.closePath(); ctx.fill();
      }
    }
    ctx.restore();
  }

  // ---------- instruments ----------
  function harmonium(ctx, x, y, s, t) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    // bellows at the back: the left hand pumps them
    const open = 0.5 + 0.5 * Math.sin(clock.beatPos(t) * Math.PI);
    G.poly(ctx, [[-150, -58], [-40, -58], [-50, -58 - 20 - open * 26], [-150, -58 - 12 - open * 30]], { fill: '#3B2A22', lw: 3, seed: 400, step: 16 });
    for (let k = 1; k < 4; k++) G.line(ctx, [[-150, -58 - k * (4 + open * 8)], [-45, -58 - k * (5 + open * 6)]], { color: '#6B5040', lw: 2, seed: 401 + k });
    // the box, the key bed
    G.rrect(ctx, -160, -60, 320, 120, 10, { fill: '#7A4A2A', lw: 4, seed: 402, hatch: { color: 'rgba(0,0,0,0.18)', gap: 8 } });
    G.rrect(ctx, -140, -52, 290, 30, 4, { fill: '#F4EFE2', lw: 3, seed: 403, amp: 0.6 });
    ctx.save(); ctx.fillStyle = '#1C1818';
    for (let k = 0; k < 13; k++) if ([1, 2, 4, 5, 6].includes(k % 7)) ctx.fillRect(-140 + k * 22.3 + 14, -52, 11, 17);
    ctx.restore();
    for (let k = 0; k < 6; k++) G.ellipse(ctx, -110 + k * 44, 20, 10, 10, { fill: '#E2B33C', lw: 2.5, seed: 404 + k, amp: 0.4 }); // stops
    ctx.restore();
  }
  function tabla(ctx, x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    // bayan (left, metal) and dayan (right, wood), each on a cloth ring
    G.ellipse(ctx, -80, 40, 82, 26, { fill: '#6B2E7A', lw: 3, seed: 420 });
    G.ellipse(ctx, 80, 40, 62, 22, { fill: '#6B2E7A', lw: 3, seed: 421 });
    G.poly(ctx, [[-150, -40], [-10, -40], [-24, 34], [-136, 34]], { fill: '#B7B1A6', lw: 4, seed: 422, step: 18, hatch: { color: 'rgba(0,0,0,0.14)', gap: 7 } });
    G.ellipse(ctx, -80, -40, 70, 20, { fill: '#E9DFC8', lw: 3.5, seed: 423 });
    G.ellipse(ctx, -70, -40, 22, 8, { fill: '#1C1818', lw: 2, seed: 424, amp: 0.4 });
    G.poly(ctx, [[30, -52], [130, -52], [124, 34], [36, 34]], { fill: '#8E5A34', lw: 4, seed: 425, step: 18, hatch: { color: 'rgba(0,0,0,0.16)', gap: 7 } });
    for (let k = 0; k < 5; k++) G.line(ctx, [[36 + k * 22, -48], [40 + k * 21, 30]], { color: '#D8C8A8', lw: 2, seed: 426 + k });
    G.ellipse(ctx, 80, -52, 50, 15, { fill: '#E9DFC8', lw: 3.5, seed: 431 });
    G.ellipse(ctx, 80, -52, 17, 6, { fill: '#1C1818', lw: 2, seed: 432, amp: 0.4 });
    ctx.restore();
  }

  // ---------- people ----------
  const SK = ['#C98A62', '#A86E4B', '#B97D55', '#8D5A3B', '#D59B72'];
  const sway = (t, k) => (t >= ev.start && t < ev.hit + 0.8 ? 0.05 * Math.sin(Math.PI * clock.beatPos(t) + k) : 0.015 * Math.sin(t * 1.3 + k));
  function chorusMember(ctx, x, y, s, t, i) {
    const st = { outfit: 'kameez', shirt: ['#F3F1EA', '#E8DDC0', '#D6E6DE', '#F0E0D0'][i], bottoms: 'shalwar', shorts: '#EDE6D6', skin: SK[i + 1], hairStyle: ['short', 'buzz', 'short', 'curly'][i], facialHair: ['stubble', 'beard', 'mustache', 'trimmed'][i], headwear: i % 2 ? 'topi' : 'none', build: i === 1 ? 'broad' : 'regular' };
    let handL = [-98, 12], handR = [98, 12];
    if (t >= ev.start - 0.3 && t < ev.hit + 0.6) {
      const a = arc(clapTimes, t);
      const sep = 8 + 70 * a, hy = -118 - 40 * a;
      handL = [-sep, hy]; handR = [sep, hy + 6];
    }
    if (t >= ev.hit + 0.15) { const u = ease.outBack(clamp((t - ev.hit - 0.15) / 0.4)); handL = [-120, lerp(-80, -300, u)]; handR = [120, lerp(-80, -300, u)]; }
    const m = singMouth('chorus', t);
    Ch.person(ctx, { x, y, s, pose: 'floor', style: st, handL, handR, headRot: sway(t, i * 1.3), mouth: m.talking ? m : t >= ev.hit ? 'open' : 'smile', eyes: t >= ev.peak ? 'happy' : 'normal', seed: 600 + i * 50, shadow: false });
  }
  function lead(ctx, t) {
    const st = { outfit: 'kameez', shirt: '#F6F4EE', bottoms: 'shalwar', shorts: '#F6F4EE', skin: '#C98A62', hairStyle: 'short', hair: '#231B18', facialHair: 'beard', headwear: 'topi', headwearColor: '#F1E3B8', build: 'broad' };
    const m = singMouth('lead', t);
    const n = S.sung.find((x) => x.who !== 'chorus' && t >= x.t && t < x.t + x.dur);
    let handL = [-98, 10], handR = [98, 10];
    if (n) {
      // the right hand draws the melody in the air: higher notes, higher hand
      const hgt = (n.midi - S.m('D4')) / 10;
      const u = (t - n.t) / n.dur;
      handR = [110 + 20 * Math.sin(u * Math.PI), -120 - 120 * hgt - 20 * Math.sin(u * Math.PI)];
      if (n.syl === '~') handL = [-130, -150 - 40 * Math.sin(u * Math.PI)];
    }
    if (t >= ev.peak && t < ev.hit) { const a = arc(clapTimes, t); handL = [-150, -300 + 40 * a]; handR = [150, -300 + 40 * a]; }
    if (t >= ev.hit) { const u = ease.outBack(clamp((t - ev.hit) / 0.35)); handL = [-170, lerp(-200, -330, u)]; handR = [170, lerp(-200, -330, u)]; }
    Ch.person(ctx, { x: W / 2, y: STAGE + 92, s: 1.05, pose: 'floor', style: st, handL, handR, headRot: sway(t, 0) * 1.4, headY: m.talking ? -2 : 0, mouth: m.talking ? m : t >= ev.hit ? 'open' : 'smile', eyes: t < T(2) || (n && n.syl === '~') ? 'closed' : t >= ev.peak ? 'happy' : 'normal', brows: n && n.syl === '~' ? 'up' : 'neutral', seed: 700, shadow: false });
  }
  function harmoniumPlayer(ctx, t) {
    const x = 610, y = STAGE + 70, s = 0.98;
    const st = { outfit: 'kameez', shirt: '#E8DDC0', bottoms: 'shalwar', shorts: '#E8DDC0', skin: '#A86E4B', hairStyle: 'short', facialHair: 'trimmed', build: 'regular' };
    // the note he plays right now: the doubled melody or a run
    const cur = [...S.runs.map((r) => ({ t: r.t, dur: 0.16, midi: r.midi })), ...S.sung].filter((q) => t >= q.t && t < q.t + q.dur).pop();
    const kx = cur ? lerp(-10, 150, clamp((cur.midi - S.m('D4')) / 14)) : 60;
    const press = cur ? 1 - clamp((t - cur.t) / 0.06) : 0;
    const pump = Math.sin(clock.beatPos(t) * Math.PI);
    const handR = [kx, -68 + press * 4];
    const handL = [-150, -86 - 18 * pump];
    const m = singMouth('chorus', t);
    Ch.person(ctx, { x, y, s, pose: 'floor', style: st, handL, handR, headRot: sway(t, 2) + (cur ? 0.05 : 0), lookY: 0.6, mouth: m.talking ? m : 'smile', eyes: t >= ev.peak ? 'happy' : 'normal', seed: 800, shadow: false });
    harmonium(ctx, x, y, s, t);
  }
  function tablaPlayer(ctx, t) {
    const x = 1310, y = STAGE + 70, s = 0.98;
    const st = { outfit: 'kameez', shirt: '#CFE0EA', bottoms: 'shalwar', shorts: '#CFE0EA', skin: '#8D5A3B', hairStyle: 'curly', facialHair: 'stubble', build: 'slim' };
    const playing = t >= ev.start - 0.2 && t < ev.hit + 0.3;
    const aR = playing ? arc(rightStrokes, t) : 0.6, aL = playing ? arc(leftStrokes, t) : 0.6;
    const handR = [82, -58 - 70 * aR], handL = [-78, -46 - 60 * aL];
    Ch.person(ctx, { x, y, s, pose: 'floor', style: st, handL, handR, headRot: sway(t, 3) * 1.6, lookY: 0.4, mouth: t >= ev.peak ? 'grin' : 'smile', eyes: t >= ev.peak ? 'happy' : 'normal', seed: 900, shadow: false });
    tabla(ctx, x, y, s);
    // a little burst of dust on the big strokes
    if (playing) { const a = lastBefore(S.strokes.filter((q) => q.bol === 'dha').map((q) => q.t), t); if (a > 0 && t - a < 0.15) { ctx.save(); ctx.globalAlpha = 1 - (t - a) / 0.15; G.line(ctx, [[x + 60 * s, y - 70 * s], [x + 40 * s, y - 110 * s]], { color: '#FFF1C8', lw: 4, seed: 950 }); G.line(ctx, [[x + 100 * s, y - 70 * s], [x + 120 * s, y - 110 * s]], { color: '#FFF1C8', lw: 4, seed: 951 }); ctx.restore(); } }
  }

  // ---------- the crowd, the vail, the petals ----------
  function audience(ctx, t) {
    for (let i = 0; i < 11; i++) {
      const x = 90 + i * 176 + (i % 2) * 30, bob = t >= ev.start ? 6 * Math.sin(Math.PI * clock.beatPos(t) + i) : 0;
      const y = H + 30 + (i % 3) * 18 + bob;
      const raise = S.wah.some((w) => Math.abs(w.x - x) < 130 && t >= w.t && t < w.t + 1) || (t >= ev.peak && i % 3 === 0) || t >= ev.hit;
      ctx.save();
      ctx.fillStyle = '#120C1C';
      if (raise) { ctx.save(); ctx.strokeStyle = '#120C1C'; ctx.lineWidth = 26; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x + 50, y - 140); ctx.lineTo(x + 80 + 10 * Math.sin(t * 9 + i), y - 290); ctx.stroke(); ctx.restore(); }
      ctx.beginPath(); ctx.ellipse(x, y - 30, 120, 90, 0, Math.PI, 0); ctx.fill();
      ctx.beginPath(); ctx.ellipse(x, y - 170, 52, 60, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }
  function wahBubbles(ctx, t) {
    for (const w of S.wah) G.bubble(ctx, w.text, w.x, H - 250, w.x + 30, H - 160, t, w.t, w.t + 0.9, { size: 46 });
  }
  function vail(ctx, t) {
    const COL = { 100: '#C9463D', 500: '#3E8A5A', 1000: '#3D5FA8' };
    for (const n of S.notesRain) {
      const a = t - n.t;
      if (a < 0) continue;
      const land = STAGE + 20 + G.rnd(n.seed, 3) * 110;
      const y = Math.min(land, -60 + a * 360);
      const onFloor = y >= land;
      const x = n.x + (onFloor ? Math.sin((land + 60) / 360 * 2.1 + n.rot) * 50 : Math.sin(a * 2.1 + n.rot) * 50);
      const rot = onFloor ? n.rot + n.spin * ((land + 60) / 360) : n.rot + n.spin * a;
      ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(1, onFloor ? 0.5 : 0.6 + 0.4 * Math.abs(Math.cos(a * 4 + n.rot)));
      G.rrect(ctx, -44, -20, 88, 40, 4, { fill: COL[n.kind], lw: 2.5, seed: n.seed, amp: 0.5 });
      G.decor(() => G.text(ctx, String(n.kind), 0, 8, { size: 22, align: 'center', fam: 'Inter', weight: 800, color: '#F6EBD6', boil: 0 }));
      ctx.restore();
    }
  }
  function petals(ctx, t) {
    for (const p of S.petals) {
      const a = t - p.t;
      if (a < 0 || a > 4) continue;
      const y = -30 + a * 260, x = p.x + Math.sin(a * 2 + p.sway) * 40;
      if (y > H + 20) continue;
      ctx.save(); ctx.translate(x, y); ctx.rotate(a * 3 + p.sway);
      ctx.fillStyle = G.rnd(p.seed, 1) < 0.7 ? '#D6283A' : '#F2A0B0';
      ctx.beginPath(); ctx.ellipse(0, 0, p.size, p.size * 0.55, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }

  // ---------- titles ----------
  function titles(ctx, t) {
    const a = clamp((t - 0.5) / 1) * (1 - clamp((t - (T(2) - 0.9)) / 0.8));
    if (a > 0) {
      ctx.save(); ctx.globalAlpha = a;
      G.text(ctx, 'قوالی کی رات', W / 2, 330, { size: 120, align: 'center', color: '#FFE7B0', stroke: '#2A1414', strokeW: 10, lang: 'ur' });
      G.text(ctx, 'Qawwali Night', W / 2, 430, { size: 70, align: 'center', color: '#F6EBD6', stroke: '#2A1414', strokeW: 8 });
      ctx.restore();
    }
    // the end card
    const e = clamp((t - (ev.hit + 1.5)) / 0.7);
    if (e > 0) {
      ctx.save();
      ctx.fillStyle = `rgba(12,8,24,${0.82 * e})`; ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = e;
      G.text(ctx, 'قوالی کی رات', W / 2, 420, { size: 150, align: 'center', color: '#FFE7B0', lang: 'ur' });
      G.text(ctx, 'Qawwali Night', W / 2, 560, { size: 84, align: 'center', color: '#F6EBD6' });
      G.text(ctx, 'every note, every voice and every frame: made in code', W / 2, 660, { size: 40, align: 'center', color: '#D8C8A8', fam: 'Patrick Hand', weight: 400 });
      ctx.restore();
    }
  }

  Studio.film({
    post: { vignette: 0.45, grain: 0.06, paper: 0.35 },
    fadeOut: 0.8,
    draw(ctx, t) {
      const lv = lightLevel(t);
      // a slow push-in over the whole song; small kicks on the big strokes at the peak
      const zoom = 1 + 0.07 * ease.inOutQuad(clamp((t - T(2)) / (ev.hit - T(2)))) + (t >= ev.hit ? 0.04 * Math.exp(-(t - ev.hit) * 3) : 0);
      const kick = t >= ev.peak && t < ev.hit ? 6 * (1 - arc(clapTimes, t)) : 0;
      ctx.save();
      ctx.translate(W / 2, 640); ctx.scale(zoom, zoom); ctx.translate(-W / 2, -640 + kick);
      sky(ctx, t);
      shamiana(ctx, t, lv);
      bulbs(ctx, t, lv);
      stage(ctx);
      [[450, 0], [800, 1], [1120, 2], [1470, 3]].forEach(([x, i]) => chorusMember(ctx, x, STAGE + 6, 0.74, t, i));
      harmoniumPlayer(ctx, t);
      tablaPlayer(ctx, t);
      lead(ctx, t);
      vail(ctx, t);
      spot(ctx, t, lv);
      ctx.restore();
      petals(ctx, t);
      audience(ctx, t);
      wahBubbles(ctx, t);
      // the room is dark before the lights come up
      if (lv < 1) { ctx.fillStyle = `rgba(6,4,14,${(1 - lv) * 0.8})`; ctx.fillRect(0, 0, W, H); }
      // the final hit: a white flash
      if (t >= ev.hit && t < ev.hit + 0.5) { ctx.fillStyle = `rgba(255,248,230,${0.85 * Math.exp(-(t - ev.hit) * 9)})`; ctx.fillRect(0, 0, W, H); }
      titles(ctx, t);
      if (t < ev.hit + 1.4) Subs.draw(ctx, t, S.subtitles, { style: 'box', size: 50, y: 150 });
    },
  });
})();
