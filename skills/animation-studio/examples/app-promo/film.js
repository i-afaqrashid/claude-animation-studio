// THE FILM (9:16) — a hand-drawn kitchen around a crisp app built with the UI kit.
// Every frame is a pure function of t, laid out inside G.SAFE (the part no platform UI covers).
(function () {
  const U = globalThis.U, G = globalThis.G, Ch = globalThis.Ch, UI = globalThis.UI, S = globalThis.SCORE, Studio = globalThis.Studio;
  const { T, BEAT, BAR, ev, clock } = S;
  const { clamp, lerp, ease, pulse } = U;
  const W = G.W, H = G.H, SAFE = G.SAFE;

  // the (fictional) brand
  UI.setTheme({ accent: '#E4572E', accent2: '#2E9E6B', ok: '#2E9E6B', ink: '#2B2118', muted: '#8C8075', app: '#FBF6EE' });
  const C = { wall: '#F6EEDD', floor: '#D9B48A', fridge: '#CFE8DF', fridgeEdge: '#A9D2C5', inside: '#FFF7DC', leaf: '#2E9E6B', tomato: '#E4572E', yolk: '#F4B72E', crust: '#B9773F', crumb: '#F2D3A0', wood: '#B98556', woodTop: '#D9A56F' };
  const COOK = { hairStyle: 'curly', hair: '#2B211E', skin: '#C98A62', glasses: 'round', outfit: 'tee', shirt: '#2E9E6B', bottoms: 'pants', shorts: '#2B2F45' };
  const FRIEND = { hairStyle: 'bun', hair: '#5A3A22', skin: '#E6B48C', outfit: 'hoodie', shirt: '#F4B72E', bottoms: 'pants', shorts: '#3A3F5C' };
  const hop = (t, amp) => amp * Math.sin(Math.PI * clock.phase(t)); // 0 on every beat
  globalThis.CAST = { cook: COOK, friend: FRIEND }; // `render.js cast` auditions these

  // ---------- food (hand-drawn: it lives in the real world, even inside the camera) ----------
  function food(ctx, kind, x, y, s, seed = 1) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    if (kind === 'egg') G.ellipse(ctx, 0, 0, 34, 44, { fill: '#FFFDF6', lw: 4, seed });
    if (kind === 'tomato') {
      G.ellipse(ctx, 0, 4, 52, 46, { fill: C.tomato, lw: 4, seed, hatch: { color: 'rgba(0,0,0,0.10)', gap: 9 } });
      G.poly(ctx, [[-22, -38], [0, -30], [22, -38], [8, -46], [0, -58], [-8, -46]], { fill: C.leaf, lw: 3, seed: seed + 1, step: 8 });
    }
    if (kind === 'bread') {
      G.rrect(ctx, -58, -52, 116, 104, 34, { fill: C.crust, lw: 4, seed });
      G.rrect(ctx, -44, -38, 88, 78, 24, { fill: C.crumb, lw: 0, seed: seed + 1, stroke: 'transparent' });
    }
    ctx.restore();
  }
  function friedEgg(ctx, x, y, s, seed) {
    const pts = [];
    for (let i = 0; i < 18; i++) { const a = (i / 18) * Math.PI * 2, r = 1 + 0.16 * Math.sin(a * 3 + seed); pts.push([x + Math.cos(a) * 60 * s * r, y + Math.sin(a) * 38 * s * r]); }
    G.shape(ctx, pts, { fill: '#FFFDF6', lw: 3.5, seed });
    G.ellipse(ctx, x + 6 * s, y - 4 * s, 20 * s, 17 * s, { fill: C.yolk, lw: 3, seed: seed + 1 });
  }
  // a finished dish, centred at (x, y)
  function dish(ctx, kind, x, y, s, seed = 1) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    if (kind === 'toast' || kind === 'eggy') {
      G.rrect(ctx, -150, -40, 300, 96, 40, { fill: kind === 'eggy' ? '#E7A94B' : C.crust, lw: 4.5, seed });
      G.rrect(ctx, -134, -46, 268, 80, 34, { fill: kind === 'eggy' ? '#F2C66D' : C.crumb, lw: 4, seed: seed + 1 });
      if (kind === 'toast') {
        for (const [dx, dy] of [[-80, -12], [0, -20], [80, -12]]) G.ellipse(ctx, dx, dy, 34, 22, { fill: C.tomato, lw: 3, seed: seed + dx });
        friedEgg(ctx, -40, -30, 0.9, seed + 7); friedEgg(ctx, 56, -26, 0.8, seed + 9);
      } else G.rrect(ctx, -110, -90, 250, 80, 34, { fill: '#F2C66D', lw: 4, seed: seed + 3 });
    }
    if (kind === 'pan') {
      G.rrect(ctx, 120, -14, 150, 28, 12, { fill: '#2B2B30', lw: 4, seed });
      G.ellipse(ctx, 0, 0, 150, 70, { fill: '#2B2B30', lw: 4.5, seed: seed + 1 });
      G.ellipse(ctx, 0, -4, 126, 56, { fill: '#C8452B', lw: 3, seed: seed + 2 });
      friedEgg(ctx, -44, -6, 0.75, seed + 4); friedEgg(ctx, 50, 0, 0.7, seed + 6);
    }
    ctx.restore();
  }

  // ---------- the kitchen ----------
  function kitchen(ctx, t) {
    ctx.fillStyle = C.wall; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.strokeStyle = 'rgba(120,90,60,0.09)'; ctx.lineWidth = 2;
    for (let y = 120; y < 1560; y += 110) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    for (let x = 0; x < W; x += 110) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 1560); ctx.stroke(); }
    ctx.restore();
    G.poly(ctx, [[-40, 1560], [W + 40, 1560], [W + 40, H + 40], [-40, H + 40]], { fill: C.floor, lw: 5, seed: 2, hatch: { color: 'rgba(90,50,20,0.14)', gap: 9 } });
  }
  function fridge(ctx, t) {
    const open = ease.outBack(clamp((t - ev.doorOpen) / 0.45), 1.2); // swings open on the downbeat
    const x0 = 110, x1 = 650, y0 = 520, y1 = 1566;
    G.rrect(ctx, x0 - 14, y0 - 14, x1 - x0 + 28, y1 - y0 + 14, 40, { fill: C.fridgeEdge, lw: 5, seed: 20 });
    if (open > 0.02) {
      // the inside: warm light and three lonely ingredients that bob on the beat
      G.rrect(ctx, x0 + 14, y0 + 14, x1 - x0 - 28, y1 - y0 - 40, 20, { fill: C.inside, lw: 4, seed: 21 });
      const gl = ctx.createRadialGradient(380, 900, 40, 380, 900, 600);
      gl.addColorStop(0, `rgba(255,240,190,${0.55 * open})`); gl.addColorStop(1, 'rgba(255,240,190,0)');
      ctx.fillStyle = gl; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
      for (const sy of [820, 1110, 1380]) G.line(ctx, [[x0 + 20, sy], [x1 - 20, sy]], { lw: 5, color: '#D8CDB0', seed: sy });
      ['egg', 'tomato', 'bread'].forEach((k, i) => food(ctx, k, 230 + i * 150, 1060 - hop(t + i * 0.08, t > ev.doorOpen + 0.4 ? 12 : 0), 1.1, 30 + i));
    }
    // the door, hinged on the left: its free edge swings toward us and past the hinge
    const ang = open * 2.1, fx = x0 + (x1 - x0) * Math.cos(ang), bulge = 60 * Math.sin(ang);
    const inner = Math.cos(ang) < 0;
    G.poly(ctx, [[x0, y0], [fx, y0 - bulge * 0.5], [fx, y1 + bulge * 0.3], [x0, y1]], { fill: inner ? '#E4F2EC' : C.fridge, lw: 5, seed: 22, step: 30 });
    if (!inner) G.rrect(ctx, fx - 70 * Math.cos(ang), 760, 22, 260, 10, { fill: '#F4F4F0', lw: 4, seed: 23 });
    else for (const sy of [760, 1000, 1240]) G.line(ctx, [[Math.min(x0, fx) + 12, sy], [Math.max(x0, fx) - 12, sy + bulge * 0.1]], { lw: 5, color: '#BFD9CF', seed: sy + 3 });
  }
  function shotFridge(ctx, t) {
    kitchen(ctx, t);
    fridge(ctx, t);
    const q = t >= ev.question;
    Ch.person(ctx, { x: 850, y: 1600, s: 1.55, pose: 'stand', style: COOK, look: -1, lookY: 0.1, seed: 300, eyes: q ? 'wide' : 'normal', brows: q ? 'up' : 'neutral', mouth: q ? 'o' : 'flat', handR: q ? [60, -350] : undefined });
    if (q) {
      const p = UI.pop(t, ev.question, 0.35, 2);
      ctx.save(); ctx.translate(W / 2, 400); ctx.scale(p, p); ctx.rotate(-0.03);
      G.text(ctx, "what's for dinner?", 0, 0, { size: 104, align: 'center', color: UI.theme.ink });
      ctx.restore();
    }
  }

  // ---------- the app (screens are drawn in phone points: 412 wide) ----------
  const NAV = ['Home', 'Recipes', 'Cook', 'Friends'];
  function cameraScreen(ctx, w, h, t) {
    ctx.fillStyle = '#111114'; ctx.fillRect(0, 0, w, h);
    // the viewfinder shows the real fridge shelf
    ctx.save(); ctx.beginPath(); ctx.roundRect(12, 70, w - 24, 560, 24); ctx.clip();
    ctx.fillStyle = C.inside; ctx.fillRect(12, 70, w - 24, 560);
    G.line(ctx, [[12, 470], [w - 12, 470]], { lw: 5, color: '#D8CDB0', seed: 40 });
    ['egg', 'tomato', 'bread'].forEach((k, i) => food(ctx, k, 90 + i * 118, 410, 0.95, 30 + i));
    ctx.restore();
    const found = t >= ev.shutter;
    const fp = pulse(t, T(1, 0), 3);
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 4;
    for (const [cx, cy, sx, sy] of [[40, 110, 1, 1], [w - 40, 110, -1, 1], [40, 600, 1, -1], [w - 40, 600, -1, -1]]) {
      const k = found ? 0 : 6 * fp;
      ctx.beginPath(); ctx.moveTo(cx + sx * k, cy + sy * (40 + k)); ctx.lineTo(cx + sx * k, cy + sy * k); ctx.lineTo(cx + sx * (40 + k), cy + sy * k); ctx.stroke();
    }
    // after the shutter: a box + chip per ingredient, one per 8th
    S.chips.forEach((c) => {
      const p = UI.pop(t, c.t, 0.25, 2.4);
      if (p <= 0) return;
      const cx = 90 + c.i * 118;
      ctx.save(); ctx.globalAlpha = clamp(p); ctx.strokeStyle = UI.theme.accent2; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.roundRect(cx - 52, 340, 104, 130, 14); ctx.stroke(); ctx.restore();
      ctx.save(); ctx.translate(cx, 510); ctx.scale(p, p);
      const pw = UI.measure(ctx, c.label, 17, 800) + 30;
      UI.pill(ctx, -pw / 2, -18, c.label, { bg: UI.theme.accent2, size: 17, h: 36, weight: 800 });
      ctx.restore();
    });
    // shutter button, then a result toast
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(w / 2, h - 96, 44, 0, Math.PI * 2); ctx.stroke();
    const press = t >= ev.shutter ? 1 - 0.25 * pulse(t, ev.shutter, 12) : 1;
    ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(w / 2, h - 96, 34 * press, 0, Math.PI * 2); ctx.fill();
    UI.text(ctx, found ? 'Ingredients found' : 'Point at your fridge', w / 2, 676, { size: 21, weight: 700, color: '#FFFFFF', align: 'center' });
    const toast = UI.pop(t, T(1, 3.8), 0.3, 2);
    if (toast > 0) { ctx.save(); ctx.translate(w / 2, 716); ctx.scale(toast, toast); UI.text(ctx, '3 recipes use all of them  →', 0, 0, { size: 18, weight: 600, color: '#FFD9CC', align: 'center' }); ctx.restore(); }
    if (t >= ev.shutter && t < ev.shutter + 0.3) { ctx.fillStyle = `rgba(255,255,255,${0.9 * (1 - (t - ev.shutter) / 0.3)})`; ctx.fillRect(0, 0, w, h); }
  }
  function recipesScreen(ctx, w, h, t) {
    UI.header(ctx, w, '3 recipes found', { kicker: 'With what you have' });
    S.cards.forEach((c) => {
      const a = UI.fadeIn(t, c.tIn, 0.15), slide = (1 - ease.outCubic(clamp((t - c.tIn) / 0.3))) * 90;
      if (a <= 0) return;
      const y = 150 + c.i * 214;
      const press = t >= ev.tap && c.i === 0 ? 1 - 0.04 * pulse(t, ev.tap, 9) : 1;
      ctx.save(); ctx.globalAlpha *= a; ctx.translate(slide + w / 2, y + 100); ctx.scale(press, press); ctx.translate(-w / 2, -(y + 100));
      UI.card(ctx, 16, y, w - 32, 200, 22);
      ctx.save(); ctx.beginPath(); ctx.roundRect(16, y, 150, 200, [22, 0, 0, 22]); ctx.clip();
      ctx.fillStyle = ['#FFE7D6', '#FBE3D3', '#FFF1CF'][c.i]; ctx.fillRect(16, y, 150, 200);
      dish(ctx, c.dish, 91, y + 104, 0.4, 50 + c.i * 5);
      ctx.restore();
      const [time, level, have] = c.meta.split(' · ');
      const ts = UI.pop(t, c.tTitle, 0.3, 2);
      if (ts <= 0) { UI.skeleton(ctx, 184, y + 48, 170, 20, t); UI.skeleton(ctx, 184, y + 84, 110, 14, t); }
      else {
        ctx.save(); ctx.translate(184, y + 66); ctx.scale(0.85 + 0.15 * ts, 0.85 + 0.15 * ts);
        UI.text(ctx, c.title, 0, 0, { size: 21, weight: 800, maxW: 196 });
        ctx.restore();
        UI.text(ctx, `${time} · ${level}`, 184, y + 98, { size: 15, weight: 500, color: UI.theme.muted, alpha: clamp(ts) });
        UI.pill(ctx, 184, y + 124, have.replace(' you have', ' in your fridge'), { bg: c.i === 0 ? UI.theme.accent2 : '#E9E2D8', fg: c.i === 0 ? '#FFFFFF' : UI.theme.ink, size: 12, h: 28 });
      }
      ctx.restore();
    });
    UI.tap(ctx, w / 2 + 40, 250, t, ev.tap, { color: 'rgba(228,87,46,0.9)', size: 90 });
    UI.navBar(ctx, w, h, NAV, 'Recipes');
  }
  function cookScreen(ctx, w, h, t) {
    UI.header(ctx, w, 'Tomato egg toast', { kicker: 'Cooking' });
    const done = S.steps.filter((s) => t >= s.t).length;
    UI.card(ctx, 16, 150, w - 32, 170, 22);
    const el = clamp((t - T(3)) / BAR);
    UI.ring(ctx, 92, 235, 54, 0.05 + el * 0.28, { color: UI.theme.accent });
    const secs = Math.max(0, 900 - Math.floor(el * 170));
    UI.text(ctx, `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`, 92, 243, { size: 22, weight: 800, align: 'center' });
    UI.text(ctx, 'TIMER', 172, 214, { size: 12, weight: 700, color: UI.theme.muted, spacing: 2 });
    UI.text(ctx, `Step ${Math.min(4, done + 1)} of 4`, 172, 250, { size: 24, weight: 800 });
    UI.text(ctx, 'Hands free: it talks you through', 172, 280, { size: 13, weight: 500, color: UI.theme.muted, maxW: 210 });
    S.steps.forEach((s) => {
      const y = 340 + s.i * 94;
      UI.card(ctx, 16, y, w - 32, 80, 18, { shadow: false });
      const p = clamp((t - s.t) / 0.18);
      UI.check(ctx, 52, y + 40, 20, p);
      UI.text(ctx, s.text, 88, y + 47, { size: 19, weight: 600, color: p > 0 ? UI.theme.muted : UI.theme.ink });
      if (p > 0) { ctx.save(); ctx.strokeStyle = UI.theme.muted; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(88, y + 41); ctx.lineTo(88 + UI.measure(ctx, s.text, 19, 600) * ease.outCubic(p), y + 41); ctx.stroke(); ctx.restore(); }
      const glow = pulse(t, s.t, 6);
      if (glow > 0.03) { ctx.save(); ctx.strokeStyle = `rgba(46,158,107,${glow})`; ctx.lineWidth = 4; ctx.beginPath(); ctx.roundRect(14, y - 2, w - 28, 84, 20); ctx.stroke(); ctx.restore(); }
    });
    UI.navBar(ctx, w, h, NAV, 'Cook');
  }
  function chatScreen(ctx, w, h, t) {
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 60, w, 88);
    ctx.fillStyle = UI.theme.line; ctx.fillRect(0, 148, w, 1.5);
    UI.text(ctx, '‹', 22, 116, { size: 38, weight: 400, color: UI.theme.accent });
    ctx.fillStyle = FRIEND.shirt; ctx.beginPath(); ctx.arc(76, 104, 24, 0, Math.PI * 2); ctx.fill();
    UI.text(ctx, 'S', 76, 111, { size: 19, weight: 800, color: '#FFFFFF', align: 'center' });
    UI.text(ctx, 'Sam', 112, 100, { size: 20, weight: 800 });
    UI.text(ctx, 'cooking buddy', 112, 124, { size: 13, weight: 600, color: UI.theme.muted });
    UI.chat(ctx, w, S.chat, t, { y0: 180, typing: BEAT * 0.8, size: 18 });
    // the photo of the dish rides along with "tomato egg toast!"
    const pp = UI.pop(t, S.chat[1].t + BEAT / 2, 0.3, 2);
    if (pp > 0) {
      ctx.save(); ctx.translate(w - 110, 420); ctx.scale(pp, pp); ctx.rotate(0.04);
      UI.card(ctx, -92, -70, 184, 140, 20, { fill: '#FFE7D6' });
      dish(ctx, 'toast', 0, 6, 0.46, 70);
      ctx.restore();
    }
    ctx.fillStyle = '#F1ECE5'; ctx.beginPath(); ctx.roundRect(16, h - 142, 330, 48, 24); ctx.fill();
    UI.text(ctx, 'Message…', 36, h - 111, { size: 16, weight: 500, color: UI.theme.muted });
    ctx.fillStyle = UI.theme.accent; ctx.beginPath(); ctx.arc(372, h - 118, 24, 0, Math.PI * 2); ctx.fill();
    UI.navBar(ctx, w, h, NAV, 'Friends');
  }
  const SCREENS = [cameraScreen, recipesScreen, cookScreen, chatScreen]; // bars 1, 2, 3, 4
  // each new screen slides in from the right on its bar line
  function appScreen(ctx, w, h, t) {
    const i = clamp(Math.floor((t - T(1)) / BAR), 0, 3);
    const u = i > 0 ? clamp((t - T(1 + i)) / 0.24) : 1;
    if (u < 1) { ctx.save(); ctx.translate(-u * 120, 0); SCREENS[i - 1](ctx, w, h, t); ctx.fillStyle = `rgba(0,0,0,${0.25 * u})`; ctx.fillRect(0, 0, w, h); ctx.restore(); }
    ctx.save(); ctx.translate((1 - ease.outCubic(u)) * w, 0);
    ctx.fillStyle = i === 0 ? '#111114' : UI.theme.app; ctx.fillRect(0, 0, w, h);
    SCREENS[i](ctx, w, h, t);
    ctx.restore();
  }
  function stepCaption(ctx, t) {
    for (const c of S.captions) {
      if (t < c.t || t > c.end + 0.25) continue;
      const a = UI.fadeIn(t, c.t, 0.25) * (1 - clamp((t - c.end) / 0.25));
      const dy = (1 - ease.outCubic(UI.fadeIn(t, c.t, 0.35))) * 30;
      ctx.save(); ctx.globalAlpha = a; ctx.translate(0, dy);
      ctx.fillStyle = UI.theme.accent; ctx.beginPath(); ctx.arc(SAFE.x + 42, 318, 40, 0, Math.PI * 2); ctx.fill();
      UI.text(ctx, c.n, SAFE.x + 42, 334, { size: 44, weight: 900, color: '#FFFFFF', align: 'center' });
      UI.text(ctx, c.text, SAFE.x + 102, 338, { size: 60, weight: 800, maxW: SAFE.w - 110 });
      ctx.restore();
    }
  }
  function shotApp(ctx, t) {
    kitchen(ctx, t); fridge(ctx, t);
    Ch.person(ctx, { x: 850, y: 1600, s: 1.55, pose: 'stand', style: COOK, look: -0.4, lookY: 0.3, seed: 300, eyes: 'happy', mouth: 'smile' });
    const rise = ease.outCubic(clamp((t - ev.phoneUp) / 0.45));
    ctx.fillStyle = `rgba(246,238,221,${0.72 * rise})`; ctx.fillRect(0, 0, W, H); // push the kitchen back
    UI.phone(ctx, W / 2, lerp(H + 700, 1030, rise), 1260, appScreen, t, { rot: lerp(0.12, 0.02, rise), dark: t < T(2) + 0.12 });
    stepCaption(ctx, t);
  }

  // ---------- payoff: the plate lands ----------
  function shotPayoff(ctx, t) {
    ctx.fillStyle = C.wall; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.translate(W / 2, 1180); ctx.rotate((t - ev.plate) * 0.25);
    ctx.globalAlpha = 0.55 + 0.2 * pulse(t, ev.plate + Math.floor((t - ev.plate) / BEAT) * BEAT, 8);
    for (let i = 0; i < 20; i++) {
      ctx.fillStyle = i % 2 ? '#F9D9A8' : '#F6C08A';
      const a0 = (i / 20) * Math.PI * 2, a1 = ((i + 1) / 20) * Math.PI * 2;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a0) * 2400, Math.sin(a0) * 2400); ctx.lineTo(Math.cos(a1) * 2400, Math.sin(a1) * 2400); ctx.fill();
    }
    ctx.restore();
    [[250, COOK, 300], [830, FRIEND, 340]].forEach(([x, style, seed], i) => {
      const b = hop(t + i * 0.07, 40);
      Ch.person(ctx, { x, y: 1560 - b, s: 1.45, pose: 'stand', style, seed, eyes: 'happy', mouth: i ? 'open' : 'grin', blush: 0.6, handL: [-150, -560], handR: [150, -560], legBend: b > 14 ? 0.3 : 0.05 });
    });
    G.rrect(ctx, -40, 1250, W + 80, 80, 14, { fill: C.woodTop, lw: 5, seed: 60 });
    G.rrect(ctx, -40, 1320, W + 80, 700, 0, { fill: C.wood, lw: 5, seed: 61, hatch: { color: 'rgba(60,30,10,0.14)', gap: 10 } });
    const land = t - ev.plate, sq = 1 - 0.22 * Math.exp(-land * 9) * Math.cos(land * 34);
    ctx.save(); ctx.translate(W / 2, 1262); ctx.scale(2 - sq, sq);
    G.ellipse(ctx, 0, 0, 330, 78, { fill: '#FFFFFF', lw: 5, seed: 62 });
    G.ellipse(ctx, 0, -6, 250, 52, { fill: '#F4F1EA', lw: 3, seed: 63 });
    dish(ctx, 'toast', 0, -40, 0.95, 64);
    ctx.restore();
    for (let i = 0; i < 3; i++) {
      const a = 0.55 * clamp((t - ev.plate - 0.2) / 0.4) * (0.6 + 0.4 * Math.sin(t * 3 + i * 2));
      const pts = []; for (let k = 0; k < 8; k++) pts.push([W / 2 - 110 + i * 110 + Math.sin(t * 2.4 + k * 0.9 + i) * 18, 1150 - k * 26 - ((t * 60) % 26)]);
      G.line(ctx, pts, { lw: 6, color: `rgba(255,255,255,${a})`, seed: 70 + i });
    }
    for (const l of S.leaves) {
      const a = t - ev.plate - l.d;
      if (a < 0 || a > 3.2) continue;
      const x = l.x * W + Math.sin(a * 2 + l.seed) * 40, y = -40 + a * 560;
      ctx.save(); ctx.translate(x, y); ctx.rotate(a * l.spin); ctx.scale(l.s, l.s * Math.abs(Math.cos(a * 3 + l.seed)));
      ctx.fillStyle = l.seed % 3 ? C.leaf : '#7BC47F'; ctx.beginPath(); ctx.ellipse(0, 0, 18, 9, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(14, 0); ctx.stroke();
      ctx.restore();
    }
    // the title card (hidden while the stats are up)
    const tp = UI.pop(t, T(5, 0.5), 0.35, 2) * (1 - clamp((t - T(6)) / 0.2));
    if (tp > 0) {
      ctx.save(); ctx.translate(W / 2, 360); ctx.rotate(-0.025); ctx.scale(tp, tp);
      UI.card(ctx, -SAFE.w / 2, -86, SAFE.w, 172, 40, { fill: '#FFFDF7' });
      UI.text(ctx, 'Dinner in 15 min.', 0, 30, { size: 90, weight: 900, align: 'center', maxW: SAFE.w - 70 });
      ctx.restore();
    }
    if (t >= T(6)) {
      ctx.fillStyle = `rgba(246,238,221,${0.78 * UI.fadeIn(t, T(6) - 0.05, 0.2)})`; ctx.fillRect(0, 0, W, H);
      UI.stat(ctx, W / 2, 640, SAFE.w - 40, 380, S.stats[0].big, S.stats[0].small, t, S.stats[0].t, { rot: -0.02 });
      UI.stat(ctx, W / 2, 1080, SAFE.w - 40, 380, S.stats[1].big, S.stats[1].small, t, S.stats[1].t, { rot: 0.02, color: UI.theme.accent2 });
    }
    const fl = 0.75 * Math.exp(-(t - ev.plate) * 10);
    if (fl > 0.01) { ctx.fillStyle = `rgba(255,252,240,${fl})`; ctx.fillRect(0, 0, W, H); }
  }

  // ---------- the end card ----------
  function logoMark(ctx, cx, cy, size) {
    const k = size / 300;
    ctx.save(); ctx.translate(cx, cy); ctx.scale(k, k);
    ctx.fillStyle = UI.theme.accent; ctx.beginPath(); ctx.roundRect(-150, -150, 300, 300, 78); ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath(); ctx.roundRect(-82, -8, 164, 104, [10, 10, 40, 40]); ctx.fill(); // pot
    ctx.beginPath(); ctx.roundRect(-100, -26, 200, 26, 13); ctx.fill(); // lid
    ctx.beginPath(); ctx.roundRect(-116, 12, 40, 18, 9); ctx.fill(); ctx.beginPath(); ctx.roundRect(76, 12, 40, 18, 9); ctx.fill(); // handles
    ctx.fillStyle = '#9BE3B0'; // a sprout from the lid
    ctx.beginPath(); ctx.ellipse(-26, -70, 34, 17, -0.7, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(28, -80, 38, 18, 0.6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#9BE3B0'; ctx.lineWidth = 10; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, -26); ctx.quadraticCurveTo(0, -60, -8, -84); ctx.stroke();
    ctx.restore();
  }
  function shotEnd(ctx, t) {
    ctx.fillStyle = '#FBF4E8'; ctx.fillRect(0, 0, W, H);
    const g = ctx.createRadialGradient(W / 2, 700, 50, W / 2, 700, 700);
    g.addColorStop(0, 'rgba(255,214,190,0.55)'); g.addColorStop(1, 'rgba(255,214,190,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const lp = UI.pop(t, ev.logo, 0.45, 1.8);
    if (lp > 0) { ctx.save(); ctx.translate(W / 2, 690); ctx.scale(lp, lp); ctx.rotate((1 - clamp(lp)) * -0.3); logoMark(ctx, 0, 0, 300); ctx.restore(); }
    const wp = UI.fadeIn(t, ev.logo + 0.2, 0.3);
    UI.text(ctx, 'pantrio', W / 2, 1010 + (1 - wp) * 20, { size: 136, weight: 900, align: 'center', alpha: wp, spacing: -3 });
    const words = S.tagline, size = 58, gap = UI.measure(ctx, ' ', size, 600);
    const total = words.reduce((a, w2) => a + UI.measure(ctx, w2.w, size, 600), 0) + gap * (words.length - 1);
    let x = W / 2 - total / 2;
    for (const w2 of words) {
      const a = UI.fadeIn(t, w2.t, 0.25);
      UI.text(ctx, w2.w, x, 1110 + (1 - a) * 14, { size, weight: 600, color: UI.theme.ink, alpha: a });
      x += UI.measure(ctx, w2.w, size, 600) + gap;
    }
    const cp = UI.pop(t, S.cta, 0.35, 2);
    if (cp > 0) {
      ctx.save(); ctx.translate(W / 2, 1240); ctx.scale(cp, cp);
      const pw = UI.measure(ctx, 'Free on iOS & Android', 34, 800, 0.5) + 70 * 0.9;
      UI.pill(ctx, -pw / 2, -35, 'Free on iOS & Android', { bg: UI.theme.ink, size: 34, h: 70, weight: 800 });
      ctx.restore();
    }
    UI.text(ctx, 'a fictional app, made for this demo', W / 2, SAFE.y + SAFE.h - 10, { size: 24, weight: 500, color: UI.theme.muted, align: 'center', alpha: wp });
  }

  Studio.film({
    draw(ctx, t) {
      if (t < 0.2) return;
      if (t < ev.phoneUp) shotFridge(ctx, t);
      else if (t < ev.breath[0]) shotApp(ctx, t);
      else if (t < ev.plate) { // the held breath: the frame freezes and dims
        shotApp(ctx, ev.breath[0] - 0.001);
        ctx.fillStyle = 'rgba(30,20,10,0.35)'; ctx.fillRect(0, 0, W, H);
      } else if (t < ev.logo) shotPayoff(ctx, t);
      else shotEnd(ctx, t);
      // circle wipe into the end card: it closes on the plate and the logo pops the moment it's full
      if (t > ev.logo - 0.3 && t < ev.logo) UI.iris(ctx, t, ev.logo, { cx: W / 2, cy: 1180, dur: 0.3 });
    },
    post: { paper: 0.3, vignette: 0.18, grain: 0.035 },
    fadeOut: 1.2,
  });
})();
