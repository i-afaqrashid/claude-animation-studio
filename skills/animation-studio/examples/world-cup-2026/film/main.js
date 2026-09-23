// Director: picks the shot for time t, choreographs everyone, applies transitions + post.
(function () {
  const U = globalThis.U, G = globalThis.G, Ch = globalThis.Ch, S = globalThis.SCORE, R = globalThis.R, P = globalThis.P, C = G.C;
  const { T, BEAT, OFFSET, ev } = S;
  const W = G.W, H = G.H;
  const { clamp, lerp, ease, tween, keys, pulse } = U;

  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d');
  let off1, off1c;

  // ---------- beat helpers ----------
  const beatPos = (t) => (t - OFFSET) / BEAT;
  const phase = (t) => ((beatPos(t) % 1) + 1) % 1;
  const hop = (t, amp) => amp * Math.sin(Math.PI * phase(t)); // 0 on each beat, airborne between
  const dip = (t, amp) => amp * Math.exp(-phase(t) * 6); // head-bob: down on the beat
  const sq = (t, t0, f = 2.5, d = 7) => (t < t0 ? 0 : Math.exp(-d * (t - t0)) * Math.cos(2 * Math.PI * f * (t - t0)));
  const blinkAt = (t, list) => { for (const b of list) if (Math.abs(t - b) < 0.09) return 1 - Math.abs(t - b) / 0.09; return 0; };
  const within = (t, a, b) => t >= a && t < b;

  function legLift(t) {
    let v = 0;
    for (const e of S.legBounces) if (t >= e.t && t < e.t + 0.11) v = Math.max(v, Math.sin((Math.PI * (t - e.t)) / 0.11) * e.strength);
    return v;
  }

  // ======================= ROOM: INTRO + ARRIVAL =======================
  function tvIntensity(t) {
    if (t < ev.tvClick) return 0;
    const a = t - ev.tvClick;
    if (a < 0.05) return 1.3;
    if (a < 0.1) return 0.25;
    if (a < 0.16) return 1.0;
    if (a < 0.2) return 0.55;
    return 0.95 + U.noise1(t * 7, 5) * 0.06;
  }

  function shotIntro(ctx, t) {
    const I = tvIntensity(t);
    if (I <= 0) return;
    let cam = {
      x: keys(t, [[0.3, 760], [T(2), 960, ease.inOutCubic]]),
      y: keys(t, [[0.3, 430], [T(2), 540, ease.inOutCubic]]),
      zoom: keys(t, [[0.3, 1.55], [T(2), 1.0, ease.inOutCubic], [T(5, 2), 1.0], [T(5, 3.4), 1.08, ease.inQuad]]),
    };
    Object.assign(cam, R.shake(t, [[T(4, 1), 9, 7]]));
    const lean = clamp((t - T(5, 2)) / 0.4);
    // --- Afaq ---
    const k = legLift(t);
    let eyes = 'normal', mouth = 'wavy', brows = 'worried', look = 0, sweat = 0;
    if (within(t, T(1, 2), T(3))) { mouth = 'smile'; }
    if (within(t, T(3), T(4))) { eyes = 'wide'; mouth = 'wavy'; sweat = 1; }
    if (within(t, T(4) - 0.1, T(4, 1))) { eyes = 'wide'; mouth = 'o'; look = 0.7; }
    if (t >= T(4, 1)) { brows = 'up'; mouth = within(t, T(4, 1.5), T(4, 3)) ? 'grin' : 'smile'; eyes = within(t, T(4, 1.5), T(4, 3)) ? 'happy' : 'normal'; look = t < T(5) ? 0.6 : 0; }
    if (t >= T(5, 2)) { eyes = 'wide'; mouth = 'o'; brows = 'determined'; look = 0; }
    const bob = t >= T(4, 1) ? dip(t, 6) : 0;
    const afaq = {
      x: 760, y: R.SEAT_Y + lean * 10, s: 1 + lean * 0.02, pose: 'sit', eyes, mouth, brows, look, sweat,
      blink: blinkAt(t, [2.1, 4.4, 6.0, 7.9, 10.3]), headY: bob, knee: [k, 0],
      handL: [-46, 24 - k * 14], handR: [52, 26],
    };
    // --- Claude pops up from behind the couch ---
    let claude = null, behind = false;
    const tS = T(4) - 0.2, tA = T(4) + 0.18, tL = T(4, 1);
    if (t >= tS) {
      let x = 1160, y = 700, sx = 1, sy = 1, eyesC = 'normal', armL = 0.15, armR = 0.15, lookC = 0, mouthC = 'none', blush = 0;
      if (t < tA) {
        const u = (t - tS) / (tA - tS);
        y = lerp(860, 330, ease.outQuad(u)); x = lerp(1250, 1180, u); sx = 0.86; sy = 1.2; eyesC = 'wide'; armL = armR = 1.0; behind = true;
      } else if (t < tL) {
        const u = (t - tA) / (tL - tA);
        y = lerp(330, 700, ease.inQuad(u)); x = lerp(1180, 1160, u); sy = 1.1 - 0.1 * u; sx = 0.92; eyesC = 'wide'; armL = armR = 1.0;
      } else {
        const s2 = sq(t, tL, 2.2, 6);
        sy = 1 - 0.24 * s2; sx = 1 + 0.18 * s2;
        eyesC = within(t, tL, T(4, 2.6)) ? 'happy' : 'normal';
        lookC = within(t, T(4, 2), T(5)) ? -0.8 : 0;
        blush = within(t, T(4, 1), T(5, 1)) ? 0.7 : 0.3;
        armR = within(t, T(4, 2), T(5)) ? 0.5 + 0.35 * Math.sin(t * 14) : 0.15;
        y = 700 + dip(t, 5);
        if (t >= T(5, 2)) { eyesC = 'wide'; lookC = 0; y += lean * 8; sy *= 1 - lean * 0.03; }
      }
      claude = { s: 1.12, x, y, sx, sy, eyes: eyesC, look: lookC, armL, armR, mouth: mouthC, blush, scarf: true, scarfWave: 0.12 * Math.sin(t * 5) + 0.2 * sq(t, tL, 3, 5), blink: blinkAt(t, [9.9, 11.4]) };
    }
    R.draw(ctx, t, { cam, afaq, claude, claudeBehind: behind, fireworks: false });
    R.light(ctx, 'tv', I);
  }

  // ======================= ROOM: TENSION =======================
  function shotTension(ctx, t) {
    let hb = 0;
    for (const h of S.heartbeats) hb = Math.max(hb, pulse(t, h, 9));
    const cam = { x: 920, y: keys(t, [[T(10), 520], [T(13), 470]]), zoom: keys(t, [[T(10), 1.12], [T(13), 1.32, ease.inOutQuad]]) + hb * 0.01 };
    const lower = ease.inOutCubic(clamp((t - T(12)) / (BEAT * 2)));
    const tremble = (1 - lower) * 2.2;
    const afaq = {
      x: 760 + U.noise1(t * 28, 9) * tremble, y: R.SEAT_Y + U.noise1(t * 31, 8) * tremble * 0.5, pose: 'sit',
      eyes: 'wide', brows: t > T(12, 2) ? 'determined' : 'worried', mouth: t > T(12, 2) ? 'smile' : 'wavy',
      look: within(t, T(11, 0.5), T(12)) ? 0.55 : 0, pillow: 1 - lower * 0.62, sweat: t < T(12, 2) ? 1 : 0,
      blink: blinkAt(t, [T(11, 3)]),
    };
    // Claude notices, hops over, leans in
    const hopU = clamp((t - T(10, 3)) / (BEAT * 1));
    const cx = lerp(1160, 1000, ease.inOutQuad(hopU));
    const cy = 700 - Math.sin(Math.PI * hopU) * 70;
    let eyes = 'worried', look = 0;
    if (t > T(10, 2)) look = -0.9;
    if (t > T(11)) eyes = 'normal';
    if (within(t, T(12, 2), T(12, 3))) eyes = 'happy';
    if (t >= T(12, 3)) { eyes = 'focus'; look = 0; }
    const land = sq(t, T(11), 2.4, 7);
    const claude = {
      s: 1.12, x: cx, y: cy + (within(t, T(12, 2), T(12, 3)) ? dip(t, 8) : 0), sx: 1 + 0.15 * land, sy: 1 - 0.2 * land,
      rot: t > T(11) && t < T(12, 3) ? -0.09 : 0, eyes, look, armL: t > T(11) ? 0.55 : 0.1, armR: 0.1,
      blush: t > T(11) ? 0.4 : 0, scarf: true, scarfWave: 0.08 * Math.sin(t * 3),
      blink: blinkAt(t, [T(11, 1.2), T(12, 1)]),
    };
    R.draw(ctx, t, { cam, afaq, claude, fireworks: false });
    R.light(ctx, 'tension', 0.9 - hb * 0.18);
    // bubbles (screen space, above Claude)
    const scr = (wx, wy) => [W / 2 + (wx - cam.x) * cam.zoom, H / 2 + (wy - cam.y) * cam.zoom];
    const top = scr(cx - 10, cy - 200);
    G.bubble(ctx, S.bubbles[0].text, top[0] - 30, top[1] - 200, top[0] + 10, top[1] - 20, t, S.bubbles[0].t, S.bubbles[0].end);
    G.bubble(ctx, S.bubbles[1].text, top[0] + 280, top[1] - 95, top[0] + 90, top[1] - 5, t, S.bubbles[1].t, S.bubbles[1].end);
    // game clock tag
    let tick = S.clockTicks[0];
    for (const c of S.clockTicks) if (t >= c.t) tick = c;
    const pop = 1 + 0.12 * pulse(t, tick.t, 14);
    ctx.save();
    ctx.translate(W / 2, 110);
    ctx.rotate(-0.02);
    ctx.scale(pop, pop);
    G.tornPaper(ctx, -230, -62, 460, 124, { fill: '#1C1F3F', seed: 77, edge: '#E9E2D2' });
    G.text(ctx, tick.label, -58, 26, { size: 72, fam: 'Bungee', weight: 400, color: '#FFFFFF', align: 'center', boil: 0.5 });
    G.text(ctx, '0–0', 150, 22, { size: 40, fam: 'Bungee', weight: 400, color: C.gold, align: 'center', boil: 0.5 });
    ctx.restore();
  }

  // ======================= CLOSE-UPS (the held breath) =======================
  function shotAfaqEyes(ctx, t) {
    const u = (t - T(15)) / BEAT;
    const s = lerp(6.0, 6.7, ease.outQuad(u));
    ctx.fillStyle = C.tealDark;
    ctx.fillRect(0, 0, W, H);
    Ch.afaq(ctx, { x: 960 + U.noise1(t * 40, 4) * 6, y: 600 + 254 * s, s, pose: 'sit', eyes: 'wide', brows: 'worried', mouth: 'o', pillow: 1, sweat: 1, look: U.noise1(t * 25, 3) * 0.15, shadow: false });
    closeLight(ctx);
  }
  function shotClaudeEyes(ctx, t) {
    const u = (t - T(15, 1)) / BEAT;
    const s = lerp(4.0, 4.5, ease.outQuad(u));
    const bg = ctx.createRadialGradient(960, 540, 100, 960, 540, 1100);
    bg.addColorStop(0, '#3A4486'); bg.addColorStop(1, '#141836');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    G.rays(ctx, 960, 540, { n: 48, r0: 620, r1: 1500, color: 'rgba(255,255,255,0.3)', lw: 5, seed: 71 });
    const ey = 560;
    Ch.claude(ctx, { x: 960, y: ey + 130.5 * s, s, eyes: 'wide', eyeScale: 1.55, shadow: false, scarf: false, blush: 0.6 });
    // the ball, reflected in both eyes
    for (const sd of [-1, 1]) {
      const ex = 960 + sd * 50 * s, ew = 30 * 1.55 * s, eh = 46 * 1.55 * s;
      ctx.save();
      ctx.beginPath(); ctx.ellipse(ex, ey, ew / 2 - 6, eh / 2 - 8, 0, 0, Math.PI * 2); ctx.clip();
      ctx.strokeStyle = 'rgba(170,200,255,0.75)'; ctx.setLineDash([6, 14]); ctx.lineWidth = 6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(ex - ew * 0.45, ey + eh * 0.35); ctx.quadraticCurveTo(ex - ew * 0.05, ey - eh * 0.45, ex + ew * 0.3, ey - eh * 0.05); ctx.stroke();
      ctx.setLineDash([]);
      Ch.ball(ctx, ex + ew * (0.05 + 0.18 * u), ey - eh * (0.18 + 0.05 * u), ew * 0.17, t * 3, { seed: 5 + sd });
      ctx.restore();
      G.star(ctx, ex + ew * 0.32, ey - eh * 0.36, 22, { fill: '#FFFFFF', seed: 80 + sd, lw: 2 });
    }
    closeLight(ctx);
  }

  function closeLight(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    const g = ctx.createRadialGradient(W / 2, H * 0.6, 200, W / 2, H * 0.55, W * 0.75);
    g.addColorStop(0, '#E6ECFF'); g.addColorStop(1, '#4A5390');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'screen';
    const r = ctx.createRadialGradient(W / 2, H * 1.2, 50, W / 2, H * 1.2, H);
    r.addColorStop(0, 'rgba(120,150,255,0.25)'); r.addColorStop(1, 'rgba(120,150,255,0)');
    ctx.fillStyle = r; ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  // ======================= GOAL =======================
  const LETTER_COLS = [['#E0703E', C.cream], ['#F6F0E2', C.ink], ['#F2B84B', C.ink], ['#3FA89B', C.cream], ['#E8718D', C.cream], ['#F6F0E2', '#E0703E'], ['#27305C', C.gold], ['#E0703E', C.cream]];
  function shotGoal(ctx, t) {
    const a = t - ev.goal;
    const amp = 70 * Math.exp(-a * 3.2) * Math.cos(a * 16);
    const shakeHits = [[ev.goal, 30, 5], ...S.goalStamps.map((s) => [s.t, 10, 12])];
    const sh = R.shake(t, shakeHits);
    ctx.save();
    ctx.translate(sh.shx, sh.shy);
    P.drawBuild(ctx, t, { ballInNet: true, bulge: { u: 0.62, v: 0.78, amp: Math.max(0, amp) + 18 } });
    ctx.restore();
    ctx.fillStyle = 'rgba(25,18,45,0.42)';
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.translate(W / 2, H / 2);
    ctx.rotate(a * 0.35);
    for (let i = 0; i < 24; i++) {
      ctx.fillStyle = i % 2 ? 'rgba(242,184,75,0.28)' : 'rgba(224,112,62,0.22)';
      ctx.beginPath(); ctx.moveTo(0, 0);
      const a0 = (i / 24) * Math.PI * 2, a1 = ((i + 0.5) / 24) * Math.PI * 2;
      ctx.lineTo(Math.cos(a0) * 1400, Math.sin(a0) * 1400); ctx.lineTo(Math.cos(a1) * 1400, Math.sin(a1) * 1400); ctx.fill();
    }
    ctx.restore();
    G.confetti(ctx, t, ev.goal, { n: 160, seed: 11, spawn: 0.8 });
    // stamped letters, one per 8th note
    const lw = 190, x0 = W / 2 - (lw * S.goalStamps.length) / 2 + lw / 2;
    for (const st of S.goalStamps) {
      const u = (t - st.t) / 0.13;
      if (u < 0) continue;
      const sc = u < 1 ? lerp(2.6, 1, ease.outBack(clamp(u), 1.6)) : 1 + 0.05 * pulse(t, T(16) + Math.floor((t - T(16)) / BEAT) * BEAT, 10);
      const rot = (G.rnd(st.i, 99) - 0.5) * 0.3;
      const [bg, fg] = LETTER_COLS[st.i];
      ctx.save();
      ctx.translate(x0 + st.i * lw + sh.shx * 0.5, 540 + (G.rnd(st.i, 98) - 0.5) * 50 + sh.shy * 0.5);
      ctx.rotate(rot);
      ctx.scale(sc, sc);
      ctx.globalAlpha = clamp(u * 3);
      G.tornPaper(ctx, -84, -118, 168, 236, { fill: bg, seed: 40 + st.i, tear: 6 });
      G.text(ctx, st.ch, 0, 72, { size: 190, fam: 'Bungee', weight: 400, color: fg, align: 'center', boil: 1.2 });
      ctx.restore();
    }
    P.tvOverlay(ctx, t, { clock: "90+4'", score: '1 – 0', flash: pulse(t, ev.goal + 0.3, 5) });
    const fl = 0.9 * Math.exp(-a * 12);
    if (fl > 0.01) { ctx.fillStyle = `rgba(255,252,240,${fl})`; ctx.fillRect(0, 0, W, H); }
  }

  // ======================= PARTY (room) =======================
  function partyPoses(t) {
    const j0 = ev.jump - 0.14, j1 = ev.jump + 0.62;
    const inJump = within(t, j0, j1);
    const ju = clamp((t - j0) / (j1 - j0));
    const bigJ = inJump ? 4 * 240 * ju * (1 - ju) : 0;
    const amp = t < T(18) ? 40 : 70;
    const bounce = inJump ? bigJ : t > j1 ? hop(t, amp) : 0;
    const air = bounce > 20;
    const bi = Math.floor(beatPos(t));
    const pump = 0.5 + 0.5 * Math.sin(Math.PI * beatPos(t));
    const land = t > j1 ? Math.max(0, 1 - phase(t) * 5) * (1 - clamp(bounce / 30)) : sq(t, j1, 2, 8);
    const afaq = {
      x: 740, y: 852 - bounce, pose: 'stand', eyes: 'happy', brows: 'up', mouth: t < T(18) ? 'open' : 'grin', blush: 0.7,
      legBend: air ? 0.35 : 0.1 + land * 0.35, sy: 1 - land * 0.06, sx: 1 + land * 0.04,
      handL: t < T(18) ? [-150, -560] : lerp(0, 1, bi % 2 ? pump : 1 - pump) > 0.5 ? [-150, -560] : [-120, -380],
      handR: t < T(18) ? [150, -560] : (bi % 2 ? 1 - pump : pump) > 0.5 ? [150, -570] : [125, -390],
    };
    const cb = inJump ? 4 * 300 * ju * (1 - ju) : t > j1 ? hop(t + BEAT * 0.5 * 0, 95) : 0;
    const cland = t > j1 ? Math.max(0, 1 - phase(t) * 4) : 0;
    const claude = {
      s: 1.12, x: 1160 + (t > T(18) ? Math.sin(Math.PI * beatPos(t)) * 20 : 0), y: 700 - cb,
      sy: 1 - cland * 0.25 + (cb > 40 ? 0.08 : 0), sx: 1 + cland * 0.2 - (cb > 40 ? 0.05 : 0),
      rot: t > T(18) ? Math.sin(Math.PI * beatPos(t) * 0.5) * 0.1 : 0,
      eyes: 'happy', mouth: t < T(18) || bi % 4 === 0 ? 'open' : 'smile', blush: 0.8,
      armL: 1.1 + 0.35 * Math.sin(t * 12), armR: 1.1 + 0.35 * Math.sin(t * 12 + 1.5),
      scarf: true, scarfWave: 0.35 * Math.sin(t * 9), legKick: cb > 30 ? 0.6 : 0,
    };
    return { afaq, claude };
  }

  function fireworkFlash(t, scene) {
    let f = 0;
    for (const fw of S.fireworks) if (fw.scene === scene) f = Math.max(f, pulse(t, fw.t, 6));
    return f;
  }

  function roomParty(ctx, t, { afaq, claude, cam, beforeChars }) {
    R.draw(ctx, t, {
      cam, afaq, claude, fireworks: true, beforeChars, popcornFly: true, popcornLeft: t < ev.jump ? 1 : 0.25,
      pillowFly: t >= ev.jump && t < ev.jump + 1.2 ? t - ev.jump : undefined, mess: clamp((t - ev.jump) / 3),
      pillowFloor: t > ev.jump + 1.2,
    });
    const kick = pulse(t, T(0) + Math.floor(beatPos(t)) * BEAT, 9);
    R.light(ctx, 'party', 1, { flash: fireworkFlash(t, 'window') * 0.14 + kick * 0.05, flashColor: '#FFD9A0' });
  }

  function shotParty(ctx, t) {
    const { afaq, claude } = partyPoses(t);
    const zp = pulse(t, T(0) + Math.floor(beatPos(t)) * BEAT, 8);
    const cam = Object.assign({ x: 960, y: 540, zoom: 1.0 + zp * 0.012 }, R.shake(t, [[ev.jump, 26, 5]]));
    roomParty(ctx, t, { afaq, claude, cam });
    G.confetti(ctx, t, ev.goal, { n: 170, seed: 11, spawn: 6, fall: 200 });
  }

  // ======================= STREET =======================
  const BUILDINGS = [
    { x: 40, top: 330, w: 560, cols: 4, rows: 4, col: '#4A3350' },
    { x: 650, top: 200, w: 620, cols: 5, rows: 5, col: '#5A3A4C' },
    { x: 1320, top: 350, w: 560, cols: 4, rows: 4, col: '#43304E' },
  ];
  const WINS = [];
  BUILDINGS.forEach((b, bi) => {
    const ww = 74, wh = 92;
    const gx = (b.w - b.cols * ww) / (b.cols + 1);
    for (let r = 0; r < b.rows; r++) for (let c = 0; c < b.cols; c++) {
      const ours = bi === 1 && r === 2 && c === 2;
      WINS.push({ x: b.x + gx + c * (ww + gx), y: b.top + 60 + r * 118, w: ww, h: wh, ours, idx: WINS.length, b: bi });
    }
  });
  const lightOrder = WINS.filter((w) => !w.ours);
  function winLitTime(w) {
    const k = lightOrder.indexOf(w);
    const hit = S.windowLights.find((l) => l.win === k);
    if (hit) return hit.t;
    return G.rnd(w.idx, 5) < 0.45 ? -1 : Infinity;
  }
  function silhouette(ctx, x, y, s, t, seed, col = '#2E2030') {
    const h = hop(t + G.rnd(seed, 2) * 0.12, 10);
    ctx.save();
    ctx.translate(x, y - h);
    ctx.scale(s, s);
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(0, -52, 10, 0, 7); ctx.fill();
    ctx.fillRect(-10, -42, 20, 34);
    ctx.strokeStyle = col; ctx.lineWidth = 6; ctx.lineCap = 'round';
    const up = G.rnd(seed, 3) < 0.7;
    ctx.beginPath(); ctx.moveTo(-8, -38); ctx.lineTo(up ? -20 : -18, up ? -66 : -16); ctx.moveTo(8, -38); ctx.lineTo(up ? 20 : 18, up ? -66 : -16); ctx.stroke();
    ctx.restore();
  }
  function shotStreet(ctx, t) {
    const u = clamp((t - T(20)) / (T(22) - T(20)));
    const cam = { x: 960, y: lerp(600, 520, ease.inOutQuad(u)), zoom: lerp(1.14, 1.0, ease.inOutQuad(u)) };
    R.withCam(ctx, cam, () => {
      const g = ctx.createLinearGradient(0, -200, 0, 900);
      g.addColorStop(0, '#0C1030'); g.addColorStop(0.6, '#2B2458'); g.addColorStop(1, '#5A3A66');
      ctx.fillStyle = g;
      ctx.fillRect(-300, -300, 2520, 1300);
      for (let i = 0; i < 90; i++) {
        const tw = 0.5 + 0.5 * Math.sin(t * (2 + G.rnd(i, 3) * 3) + i);
        ctx.fillStyle = `rgba(255,245,220,${0.3 + 0.6 * tw})`;
        ctx.fillRect(-200 + G.rnd(i, 1) * 2320, -250 + G.rnd(i, 2) * 700, 3, 3);
      }
      ctx.fillStyle = '#F5EBC8'; ctx.beginPath(); ctx.arc(1660, 110, 60, 0, 7); ctx.fill();
      ctx.fillStyle = '#0E1234'; ctx.beginPath(); ctx.arc(1688, 94, 54, 0, 7); ctx.fill();
      for (const f of S.fireworks) if (f.scene === 'street') G.firework(ctx, f, t, f.x * W, f.y * H, 1.05);
      // far skyline
      ctx.fillStyle = '#231B40';
      for (let i = 0; i < 22; i++) { const bx = -300 + i * 115, bh = 180 + G.rnd(i, 30) * 260; ctx.fillRect(bx, 880 - bh, 105, bh); }
      // bunting across the street
      const bun = (x0, y0, x1, y1, seed) => {
        const pts = []; for (let i = 0; i <= 12; i++) { const uu = i / 12; pts.push([lerp(x0, x1, uu), lerp(y0, y1, uu) + Math.sin(Math.PI * uu) * 60]); }
        G.line(ctx, pts, { lw: 2.5, seed, color: '#1A1428' });
        for (let i = 1; i < 12; i++) { const p = pts[i]; G.poly(ctx, [[p[0] - 14, p[1]], [p[0] + 14, p[1]], [p[0], p[1] + 30]], { fill: [C.kit, C.cream, C.teal, C.gold][i % 4], lw: 2.5, seed: seed + i, step: 10 }); }
      };
      // buildings
      BUILDINGS.forEach((b, bi) => {
        G.poly(ctx, [[b.x, b.top], [b.x + b.w, b.top], [b.x + b.w, 900], [b.x, 900]], { fill: b.col, lw: 5, seed: 500 + bi, hatch: { color: 'rgba(0,0,0,0.22)', gap: 9 } });
        G.rrect(ctx, b.x - 14, b.top - 22, b.w + 28, 30, 4, { fill: '#2E2236', lw: 4, seed: 510 + bi });
      });
      for (const w of WINS) {
        const lt = w.ours ? -1 : winLitTime(w);
        const lit = t >= lt;
        const justLit = lit && lt > 0 ? pulse(t, lt, 10) : 0;
        if (lit) {
          ctx.save();
          ctx.globalCompositeOperation = 'screen';
          const gg = ctx.createRadialGradient(w.x + w.w / 2, w.y + w.h / 2, 10, w.x + w.w / 2, w.y + w.h / 2, 110);
          gg.addColorStop(0, `rgba(255,200,110,${0.35 + justLit * 0.4})`); gg.addColorStop(1, 'rgba(255,200,110,0)');
          ctx.fillStyle = gg; ctx.fillRect(w.x - 80, w.y - 80, w.w + 160, w.h + 160);
          ctx.restore();
        }
        G.rrect(ctx, w.x, w.y, w.w, w.h, 3, { fill: lit ? (justLit > 0.5 ? '#FFF1C4' : '#F7D57A') : '#221A30', lw: 3.5, seed: 520 + w.idx, amp: 1 });
        if (lit) {
          ctx.save();
          ctx.beginPath(); ctx.rect(w.x, w.y, w.w, w.h); ctx.clip();
          if (w.ours) {
            // tiny Afaq + tiny Claude jumping in our window
            silhouette(ctx, w.x + 22, w.y + w.h + 4, 0.95, t, 7, '#3A2830');
            Ch.claude(ctx, { x: w.x + 54, y: w.y + w.h - 4 - hop(t, 14), s: 0.17, eyes: 'happy', armL: 1.2, armR: 1.2, shadow: false, scarf: true });
          } else {
            const n = 1 + Math.floor(G.rnd(w.idx, 6) * 2);
            for (let k = 0; k < n; k++) silhouette(ctx, w.x + (n === 1 ? w.w / 2 : 20 + k * 34), w.y + w.h + 6, 0.8, t, w.idx * 3 + k);
          }
          ctx.restore();
          G.line(ctx, [[w.x + w.w / 2, w.y], [w.x + w.w / 2, w.y + w.h]], { lw: 3, seed: 560 + w.idx, color: 'rgba(40,20,30,0.6)' });
          if (G.rnd(w.idx, 8) < 0.3 || w.ours) {
            const wave = Math.sin(t * 6 + w.idx) * 0.1;
            ctx.save(); ctx.translate(w.x + w.w / 2, w.y + w.h + 4); ctx.rotate(wave);
            G.poly(ctx, [[-30, 0], [30, 0], [26, 44], [-26, 44]], { fill: w.ours ? C.claude : (w.idx % 2 ? C.kit : C.cream), lw: 3, seed: 600 + w.idx, step: 12 });
            if (w.ours) G.text(ctx, 'AFAQ', 0, 30, { size: 20, fam: 'Bungee', weight: 400, color: C.cream, align: 'center', boil: 0.3 });
            ctx.restore();
          }
        }
      }
      bun(600, 250, 1330, 300, 700);
      bun(-20, 420, 660, 380, 720);
      bun(1260, 400, 1940, 430, 740);
      // street
      ctx.fillStyle = '#2C2438'; ctx.fillRect(-300, 900, 2520, 400);
      ctx.fillStyle = '#3A3046'; ctx.fillRect(-300, 890, 2520, 34);
      for (let i = 0; i < 12; i++) G.line(ctx, [[-200 + i * 220, 1010], [-90 + i * 220, 1010]], { lw: 8, color: 'rgba(240,220,160,0.5)', seed: 800 + i });
      // street lamps
      for (const lx of [360, 1560]) {
        ctx.save(); ctx.globalCompositeOperation = 'screen';
        const lg = ctx.createRadialGradient(lx, 600, 5, lx, 700, 330);
        lg.addColorStop(0, 'rgba(255,210,140,0.45)'); lg.addColorStop(1, 'rgba(255,210,140,0)');
        ctx.fillStyle = lg; ctx.fillRect(lx - 340, 420, 680, 560); ctx.restore();
        G.line(ctx, [[lx, 910], [lx, 600], [lx + 40, 580]], { lw: 9, seed: 810 + lx, color: '#1A1428' });
        G.ellipse(ctx, lx + 46, 590, 20, 12, { fill: '#FFE6A8', lw: 3, seed: 812 + lx });
      }
      // fans in the street
      for (let i = 0; i < 16; i++) {
        const fx = 60 + i * 118 + G.rnd(i, 40) * 40;
        const fy = 1000 + G.rnd(i, 41) * 50;
        const hh = hop(t + G.rnd(i, 42) * 0.15, 22);
        ctx.save(); ctx.translate(fx, fy - hh); ctx.scale(1.6, 1.6);
        ctx.fillStyle = i % 3 === 0 ? '#E0703E' : '#1E1628';
        ctx.beginPath(); ctx.arc(0, -52, 11, 0, 7); ctx.fill();
        ctx.fillRect(-12, -42, 24, 44);
        ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 7; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-9, -36); ctx.lineTo(-22, -70); ctx.moveTo(9, -36); ctx.lineTo(22, -70); ctx.stroke();
        if (i % 4 === 1) { ctx.fillStyle = C.cream; ctx.fillRect(20, -110, 4, 44); ctx.fillStyle = C.kit; ctx.fillRect(24, -110, 40, 24); }
        ctx.restore();
      }
    });
    // night grade + firework flashes
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    const ng = ctx.createLinearGradient(0, 0, 0, H);
    ng.addColorStop(0, '#D2D2F2'); ng.addColorStop(1, '#ACA4CA');
    ctx.fillStyle = ng; ctx.fillRect(0, 0, W, H);
    ctx.restore();
    const ff = fireworkFlash(t, 'street');
    if (ff > 0) { ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = `rgba(255,220,180,${ff * 0.18})`; ctx.fillRect(0, 0, W, H); ctx.restore(); }
  }

  // ======================= HIGH FIVE =======================
  const CONTACT = [912, 410];
  function highFivePoses(t) {
    const tf = Math.min(t, ev.highFive);
    let { afaq, claude } = partyPoses(tf);
    if (tf >= T(23)) {
      afaq.look = 0.8; claude.look = -0.8;
      afaq.handL = [-150, -290];
    }
    if (tf >= T(23, 2)) {
      const w = clamp((tf - T(23, 2)) / (BEAT * 1.4));
      afaq.handR = [lerp(130, 60, ease.outQuad(w)), lerp(-400, -610, ease.outQuad(w))];
      afaq.legBend = 0.1 + 0.25 * w;
      afaq.y = 852;
      afaq.mouth = 'grin';
      afaq.eyes = 'normal';
    }
    const launch = T(23, 3.5);
    if (tf >= T(23, 2) && tf < launch) {
      const c = clamp((tf - T(23, 2)) / (launch - T(23, 2)));
      claude.y = 700; claude.x = 1160; claude.rot = 0;
      claude.sy = 1 - 0.28 * ease.outQuad(c); claude.sx = 1 + 0.2 * ease.outQuad(c);
      claude.eyes = 'focus'; claude.mouth = 'none'; claude.armL = 0.2; claude.armR = 0.2;
    }
    if (tf >= launch) {
      const c = clamp((tf - launch) / (ev.highFive - launch));
      const e = ease.outQuad(c);
      claude.x = lerp(1160, 1066, e); claude.y = lerp(700, 512, e) - Math.sin(Math.PI * c) * 40;
      claude.rot = lerp(0, -0.35, e); claude.sy = 1.12; claude.sx = 0.92;
      claude.armL = lerp(0.3, 1.25, e); claude.armR = 0.4; claude.eyes = 'wide'; claude.mouth = 'open';
      afaq.handR = [lerp(60, 150, ease.inQuad(c)), lerp(-610, -445, ease.inQuad(c))];
      afaq.eyes = c > 0.5 ? 'happy' : 'normal';
      afaq.mouth = 'open';
    }
    if (t >= ev.highFive) { afaq.eyes = 'happy'; claude.eyes = 'happy'; claude.blush = 1; afaq.blush = 1; }
    return { afaq, claude };
  }
  function shotHighFive(ctx, t) {
    const { afaq, claude } = highFivePoses(t);
    const push = ease.inOutCubic(clamp((t - T(23, 2)) / (ev.highFive - T(23, 2))));
    const hold = clamp((t - ev.highFive) / (BEAT * 2));
    const cam = Object.assign({
      x: lerp(960, CONTACT[0] + 40, push), y: lerp(540, CONTACT[1] + 120, push),
      zoom: lerp(1.0, 1.22, push) + hold * 0.08,
    }, R.shake(t, [[ev.highFive, 30, 6]]));
    const tt = Math.min(t, ev.highFive);
    const burst = t >= ev.highFive ? (c) => {
      const a = t - ev.highFive;
      c.save();
      c.translate(CONTACT[0], CONTACT[1]);
      c.rotate(a * 0.4);
      c.globalAlpha = Math.min(1, a * 12) * 0.92;
      for (let i = 0; i < 28; i++) {
        c.fillStyle = i % 2 ? '#F2B84B' : '#FFF1D2';
        c.beginPath(); c.moveTo(0, 0);
        const a0 = (i / 28) * Math.PI * 2, a1 = ((i + 1) / 28) * Math.PI * 2;
        c.lineTo(Math.cos(a0) * 2600, Math.sin(a0) * 2600); c.lineTo(Math.cos(a1) * 2600, Math.sin(a1) * 2600); c.fill();
      }
      c.restore();
    } : null;
    roomParty(ctx, tt, { afaq, claude, cam, beforeChars: burst });
    G.confetti(ctx, tt, ev.goal, { n: 170, seed: 11, spawn: 6, fall: 200 });
    if (t >= ev.highFive) {
      const a = t - ev.highFive;
      const sp = [W / 2 + (CONTACT[0] - cam.x) * cam.zoom, H / 2 + (CONTACT[1] - cam.y) * cam.zoom];
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const g = ctx.createRadialGradient(sp[0], sp[1], 0, sp[0], sp[1], 900);
      g.addColorStop(0, `rgba(255,240,200,${0.6 * Math.exp(-a * 3)})`); g.addColorStop(1, 'rgba(255,240,200,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.restore();
      G.rays(ctx, sp[0], sp[1], { n: 30, r0: 560 + a * 60, r1: 1500, lw: 5, color: C.ink, seed: 91, alpha: 0.55 });
      G.star(ctx, sp[0], sp[1], 80 + 12 * Math.sin(a * 10), { fill: '#FFE9A8', seed: 92, rot: a });
      for (let i = 0; i < 6; i++) {
        const an = (i / 6) * Math.PI * 2 + 0.3;
        const d = 170 + ease.outCubic(clamp(a / 0.4)) * 120;
        G.star(ctx, sp[0] + Math.cos(an) * d, sp[1] + Math.sin(an) * d * 0.8, 24, { fill: i % 2 ? C.gold : C.cream, seed: 93 + i, rot: a * 2 + i });
      }
      const fl = 0.85 * Math.exp(-a * 14);
      if (fl > 0.01) { ctx.fillStyle = `rgba(255,252,240,${fl})`; ctx.fillRect(0, 0, W, H); }
    }
  }

  // ======================= OUTRO =======================
  function shotOutro(ctx, t) {
    const u = clamp((t - T(24, 2)) / (S.DURATION - T(24, 2)));
    const cam = { x: lerp(960, 900, u), y: lerp(540, 520, u), zoom: lerp(1.0, 1.1, ease.inOutQuad(u)) };
    const breathe = Math.sin(t * 2.1);
    const afaq = {
      x: 760, y: R.SEAT_Y, pose: 'sit', eyes: 'sleep', mouth: 'sleep', brows: 'neutral', headRot: -0.26, headX: -12, headY: 8,
      scarf: true, sy: 1 + breathe * 0.008, handL: [-60, -4], handR: [54, 0],
    };
    let eyes = 'normal', look = -0.6, rot = 0, cy = 700;
    if (t > T(26)) { eyes = 'happy'; }
    if (t > T(26, 2)) { eyes = 'closed'; look = -0.3; rot = keys(t, [[T(26, 2), 0], [T(26, 3.5), -0.13]]); cy = 704; }
    const claude = {
      s: 1.12, x: 1010, y: cy, eyes, look, rot, blink: blinkAt(t, [T(25, 1.5), T(25, 3.5)]), sy: 1 + Math.sin(t * 2.1 + 1) * 0.01,
      blush: 0.5, scarf: false, armL: 0.1, armR: 0.1,
    };
    R.draw(ctx, t, {
      cam, afaq, claude, fireworks: false, popcornFly: true, popcornLeft: 0.25, mess: 1, pillowFloor: true, lampOn: true,
      world: (c) => {
        // z z z
        const zs = [];
        for (let k = 0; k < 8; k++) zs.push({ t: T(25, 1) + k * 0.85, x: 700, y: 330, who: 'a' });
        for (let k = 0; k < 4; k++) zs.push({ t: T(26, 3) + k * 0.95 + 0.4, x: 960, y: 470, who: 'c' });
        for (const z of zs) {
          const a = t - z.t;
          if (a < 0 || a > 2.2) continue;
          G.text(c, 'z', z.x - 20 - a * 30 + Math.sin(a * 3) * 10, z.y - a * 90, { size: 44 + a * 16, color: '#F6EBD6', alpha: Math.min(1, a * 3) * (1 - a / 2.2), align: 'center' });
        }
      },
    });
    R.light(ctx, 'outro', 0.85, { lampOn: true });
    // handwriting: words land on the music-box notes
    const size = 112;
    const words = S.outroText.words;
    const full = words.map((w) => w.w).join(' ');
    const totalW = G.measure(ctx, full, size);
    let x = W / 2 - totalW / 2;
    const y = 190;
    words.forEach((w, i) => {
      const ww = G.measure(ctx, w.w + (i < words.length - 1 ? ' ' : ''), size);
      const p = ease.inOutQuad(clamp((t - w.t) / w.d));
      if (p > 0) {
        ctx.save();
        ctx.beginPath(); ctx.rect(x - 10, y - size, ww * p + 12, size * 1.6); ctx.clip();
        G.text(ctx, w.w, x + 3, y + 4, { size, color: 'rgba(10,8,20,0.5)' });
        G.text(ctx, w.w, x, y, { size, color: '#F6EBD6' });
        ctx.restore();
        if (p < 1) G.line(ctx, [[x + ww * p, y - 20], [x + ww * p + 18, y - 60]], { lw: 8, color: '#E3B04B', seed: 44 + i });
      }
      x += ww;
    });
    // underline swoosh under "alone."
    const ul = clamp((t - (words[3].t + words[3].d)) / 0.35);
    if (ul > 0) {
      const lastW = G.measure(ctx, words[3].w, size);
      const x1 = W / 2 + totalW / 2 - lastW, x2 = W / 2 + totalW / 2;
      const pts = [];
      for (let i = 0; i <= 12 * ul; i++) { const k = i / 12; pts.push([lerp(x1, x2, k), y + 26 + Math.sin(k * 3) * 6]); }
      if (pts.length > 1) G.line(ctx, pts, { lw: 6, color: C.kit, seed: 48 });
    }
    // signature + heart
    const sa = clamp((t - S.signature.t) / 0.8);
    if (sa > 0) G.text(ctx, S.signature.text, W / 2, 285, { size: 46, fam: 'Patrick Hand', weight: 400, color: '#E9DCC3', align: 'center', alpha: sa });
    const ha = t - ev.heart;
    if (ha > 0) {
      const s = ease.outBack(clamp(ha / 0.35), 3) * 3.2;
      const hx = W / 2 + (900 - cam.x) * cam.zoom, hy = H / 2 + (400 - cam.y) * cam.zoom - ha * 14 + Math.sin(ha * 3) * 5;
      G.heart(ctx, hx, hy, s, { seed: 60 });
    }
  }

  // ======================= TRANSITIONS =======================
  const WIPES = [
    { t0: T(5, 3), tc: T(6), label: 'KICK-OFF!' },
    { t0: T(12, 3), tc: T(13), label: "90+4'" },
    { t0: T(19, 3), tc: T(20), label: 'meanwhile, outside…' },
    { t0: T(21, 3), tc: T(22), label: '' },
  ];
  function drawWipe(ctx, t) {
    for (const w of WIPES) {
      const t1 = w.tc + (w.tc - w.t0) * 0.75;
      if (t < w.t0 || t > t1) continue;
      const SW = 2700;
      const left = t < w.tc ? lerp(W + 40, -390, ease.inQuad((t - w.t0) / (w.tc - w.t0))) : lerp(-390, -SW - 200, ease.outQuad((t - w.tc) / (t1 - w.tc)));
      ctx.save();
      ctx.translate(left, 0);
      ctx.rotate(0.02);
      G.tornPaper(ctx, 0, -120, SW, H + 240, { fill: '#F3EAD8', seed: Math.round(w.tc), tear: 14 });
      ctx.fillStyle = 'rgba(200,170,120,0.2)';
      for (let i = 0; i < 30; i++) ctx.fillRect(40 + i * 90, -100, 3, H + 200);
      if (w.label) G.text(ctx, w.label, 390 + W / 2, H / 2 + 60, { size: w.label.length > 10 ? 130 : 190, fam: 'Permanent Marker', weight: 400, color: C.kit, align: 'center', stroke: C.ink, strokeW: 10 });
      ctx.restore();
    }
  }

  // ======================= SHOT LIST =======================
  function drawShot(ctx, t) {
    if (t < T(6)) return shotIntro(ctx, t);
    if (t < T(10)) return P.drawMatch(ctx, t);
    if (t < T(13)) return shotTension(ctx, t);
    if (t < T(15)) { P.drawBuild(ctx, t); return P.tvOverlay(ctx, t, { clock: "90+4'" }); }
    if (t < T(15, 1)) return shotAfaqEyes(ctx, t);
    if (t < T(15, 2)) return shotClaudeEyes(ctx, t);
    if (t < T(15, 3)) { P.drawBuild(ctx, t); return P.tvOverlay(ctx, t, { clock: "90+4'" }); }
    if (t < T(16)) {
      // the held breath: freeze frame, drained of colour
      const tf = T(15, 3);
      off1c.setTransform(1, 0, 0, 1, 0, 0);
      off1c.fillStyle = '#000'; off1c.fillRect(0, 0, W, H);
      P.drawBuild(off1c, tf);
      P.tvOverlay(off1c, tf, { clock: "90+4'" });
      const z = 1 + (t - tf) * 0.1;
      ctx.save();
      ctx.filter = 'grayscale(1) contrast(1.35) brightness(1.05)';
      ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-W / 2, -H / 2);
      ctx.drawImage(off1, 0, 0);
      ctx.restore();
      ctx.filter = 'none';
      const cam = P.buildCam(tf);
      const f = P.flight(tf);
      const zc = (x, y) => [W / 2 + (((x - W / 2) * cam.zoom + W / 2) - W / 2) * z, H / 2 + ((((y - H * 0.62) * cam.zoom + H * 0.62)) - H / 2) * z];
      const bx = P.sx(f.wx, f.d, { x: cam.x, zoom: 1 }), by = P.sy(f.d) - 14 * P.sc(f.d) - f.h * P.sc(f.d);
      const p = zc(bx, by);
      G.ellipse(ctx, p[0], p[1], 70, 62, { fill: null, stroke: '#E24B3B', lw: 6, seed: 33 });
      return;
    }
    if (t < T(17)) return shotGoal(ctx, t);
    if (t < T(20)) return shotParty(ctx, t);
    if (t < T(22)) return shotStreet(ctx, t);
    if (t < T(24, 2)) return shotHighFive(ctx, t);
    // outro with a soft dissolve out of the frozen high five
    const d = clamp((t - T(24, 2)) / (BEAT * 1.6));
    if (d < 1) {
      shotHighFive(ctx, t);
      off1c.setTransform(1, 0, 0, 1, 0, 0);
      shotOutro(off1c, t);
      ctx.save();
      ctx.globalAlpha = ease.inOutQuad(d);
      ctx.drawImage(off1, 0, 0);
      ctx.restore();
      return;
    }
    shotOutro(ctx, t);
  }

  function renderAt(t, fmt = 'png') {
    G.setTime(t);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.filter = 'none';
    ctx.fillStyle = '#050508';
    ctx.fillRect(0, 0, W, H);
    drawShot(ctx, t);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    for (const c of S.captions) G.caption(ctx, c, t);
    drawWipe(ctx, t);
    const tvScene = (t >= T(6) && t < T(10)) || (t >= T(13) && t < T(17) && !(t >= T(15) && t < T(15, 2)));
    G.post(ctx, t, { paper: tvScene ? 0.35 : 0.55, vignette: 0.32, grain: 0.06 });
    const fade = clamp((t - (S.DURATION - 1.8)) / 1.6);
    if (fade > 0) { ctx.fillStyle = `rgba(5,5,8,${fade})`; ctx.fillRect(0, 0, W, H); }
    return fmt === 'none' ? '' : canvas.toDataURL(fmt === 'jpeg' ? 'image/jpeg' : 'image/png', 0.95);
  }

  async function boot() {
    const fams = ['Caveat', 'Bungee', 'Permanent Marker', 'Patrick Hand', 'Gochi Hand'];
    for (const f of fams) {
      try { await document.fonts.load(`${f === "Caveat" ? 700 : 400} 40px "${f}"`); } catch (e) { console.error('font failed', f, String(e)); }
    }
    try { await document.fonts.load('700 40px "Caveat"'); } catch (e) { console.error('font failed Caveat700', String(e)); }
    G.initTextures();
    P.init();
    off1 = G.makeCanvas(W, H);
    off1c = off1.getContext('2d');
    window.renderAt = renderAt;
    window.READY = true;
  }
  boot().catch((e) => console.error('boot failed', String(e), e && e.stack));
})();
