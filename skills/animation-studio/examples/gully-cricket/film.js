// THE FILM: gully cricket, last ball. A list of shots (Shots.film); every frame is a pure function of t.
// Chacha's and aunty's mouths move with the real voiceover (out/voice.json), the captions are its words.
(function () {
  const U = globalThis.U, G = globalThis.G, Ch = globalThis.Ch, Subs = globalThis.Subs, Shots = globalThis.Shots, S = globalThis.SCORE, Studio = globalThis.Studio;
  const { clamp, lerp, ease } = U;
  const { T, ev, clock } = S;
  const W = G.W, H = G.H, SAFE = G.SAFE;
  let VO = null, SUBS = [];

  // ---------- the cast ----------
  const CAST = {
    bilal: { outfit: 'jersey', shirt: '#0F7B4F', trim: '#F6F0E2', collar: '#F6F0E2', shorts: '#27305C', name: 'BILAL', number: '10', skin: '#B97D55', hairStyle: 'short', shoes: '#F4F1EA' },
    hamza: { outfit: 'tee', shirt: '#E0703E', bottoms: 'pants', pants: '#3A3A44', skin: '#8D5A3B', hairStyle: 'curly', shoes: '#2A2A2A' },
    sana: { outfit: 'kameez', shirt: '#E8718D', bottoms: 'shalwar', shorts: '#F6F0E2', skin: '#D59B72', hairStyle: 'ponytail', shoes: '#F4F1EA' },
    zain: { outfit: 'tee', shirt: '#3D7A74', print: 'Z', skin: '#C98A62', hairStyle: 'buzz', shorts: '#F2B84B' },
    chacha: { outfit: 'kameez', shirt: '#F3F1EA', bottoms: 'shalwar', shorts: '#F3F1EA', skin: '#A86E4B', hairStyle: 'bald', hair: '#9A9A9A', facialHair: 'mustache', glasses: 'square', headwear: 'topi', build: 'broad' },
    aunty: { outfit: 'kameez', shirt: '#6B4E8A', hairStyle: 'hijab', hijab: '#2F7D6D', skin: '#C98A62' },
  };
  globalThis.CAST = CAST; // render.js cast auditions these

  // ---------- helpers ----------
  const mouthOf = (who, t) => { const m = Subs.mouth(VO, t, who); return m.talking ? m : null; };
  const hop = (t) => { const k = S.celebrate.filter((c) => c <= t).pop(); return k === undefined ? 0 : Math.max(0, Math.sin(Math.PI * clamp((t - k) / (S.BEAT * 1.6)))) * 60; };
  const frozen = (t) => t >= ev.crash && t < ev.aunty; // the freeze after the crash
  const tf = (t) => (frozen(t) ? ev.crash : t); // animation time stops in the freeze
  function tapeBall(ctx, x, y, r, spin = 0) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(spin);
    G.ellipse(ctx, 0, 0, r, r, { fill: '#D8E84A', lw: Math.max(2, r * 0.12), seed: 11, amp: 0.4 });
    ctx.save(); ctx.beginPath(); ctx.arc(0, 0, r * 0.94, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = '#D62E2E'; ctx.fillRect(-r, -r * 0.28, r * 2, r * 0.56); // the electrical tape
    ctx.restore();
    ctx.restore();
  }
  // a house front: plaster colour, a door, windows with iron grills, an AC unit, a balcony with laundry
  function house(ctx, x, y, w, h, col, seed, { balcony = true, crack = null } = {}) {
    G.rrect(ctx, x, y, w, h, 4, { fill: col, lw: 4, seed, hatch: { color: 'rgba(80,40,20,0.12)', gap: 10 } });
    G.rrect(ctx, x - 8, y - 18, w + 16, 22, 3, { fill: Ch.shade(col, 0.75), lw: 3.5, seed: seed + 1 });
    const floors = Math.max(1, Math.round(h / 330));
    for (let f = 0; f < floors; f++) {
      const fy = y + 60 + f * 330;
      for (let k = 0; k < 2; k++) {
        const wx = x + 40 + k * (w - 190);
        const isCrack = crack && f === crack.floor && k === crack.k;
        G.rrect(ctx, wx, fy, 110, 140, 6, { fill: isCrack ? '#2A2A38' : '#5A7C8C', lw: 4, seed: seed + 10 + f * 3 + k });
        if (!isCrack) { ctx.save(); ctx.globalAlpha = 0.25; ctx.fillStyle = '#FFFFFF'; ctx.fillRect(wx + 12, fy + 10, 26, 120); ctx.restore(); }
        for (let g = 1; g < 4; g++) G.line(ctx, [[wx + g * 27.5, fy + 4], [wx + g * 27.5, fy + 136]], { color: '#2A2320', lw: 3, seed: seed + 20 + g });
        G.line(ctx, [[wx + 4, fy + 70], [wx + 106, fy + 70]], { color: '#2A2320', lw: 3, seed: seed + 25 });
      }
      if (balcony && f === floors - 1 && floors > 1) {
        G.rrect(ctx, x + 20, fy + 150, w - 40, 22, 3, { fill: '#8E6444', lw: 3, seed: seed + 30 });
        const cols = ['#E8718D', '#F2B84B', '#3FA89B', '#F6F0E2'];
        G.line(ctx, [[x + 30, fy + 190], [x + w - 30, fy + 200]], { color: '#2A2320', lw: 2, seed: seed + 31 });
        for (let c = 0; c < 4; c++) G.rrect(ctx, x + 50 + c * ((w - 100) / 4), fy + 192 + c, 44, 60 + (c % 2) * 20, 4, { fill: cols[(c + seed) % 4], lw: 2.5, seed: seed + 32 + c });
      }
    }
    G.rrect(ctx, x + w - 150, y + h - 200, 44, 30, 4, { fill: '#DADAD6', lw: 3, seed: seed + 40 }); // an AC unit
  }
  function wires(ctx, y0) {
    for (let k = 0; k < 4; k++) {
      const pts = []; for (let i = 0; i <= 20; i++) { const u = i / 20; pts.push([u * W, y0 + k * 26 + 40 * 4 * u * (1 - u) + k * 10 * Math.sin(u * 7)]); }
      G.line(ctx, pts, { color: '#1E1A1A', lw: 2.5, seed: 500 + k, step: 60 });
    }
    // a kite stuck in the wires since last Basant
    G.poly(ctx, [[760, y0 + 40], [800, y0 + 90], [760, y0 + 150], [720, y0 + 90]], { fill: '#E8718D', lw: 3, seed: 510, step: 16 });
    G.line(ctx, [[760, y0 + 150], [750, y0 + 200], [770, y0 + 240]], { color: '#2A2320', lw: 2, seed: 511 });
  }
  function charpai(ctx, x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    for (const lx of [-150, 150]) G.rrect(ctx, lx - 10, -10, 20, 90, 4, { fill: '#8E6444', lw: 3, seed: 600 + lx });
    G.rrect(ctx, -170, -30, 340, 36, 6, { fill: '#B98A5E', lw: 4, seed: 602 });
    ctx.save(); ctx.beginPath(); ctx.rect(-160, -26, 320, 28); ctx.clip();
    G.hatch(ctx, [-160, -26, 160, 2], { color: 'rgba(90,50,20,0.55)', gap: 9, angle: 0.8, lw: 2.2, seed: 603 });
    G.hatch(ctx, [-160, -26, 160, 2], { color: 'rgba(90,50,20,0.55)', gap: 9, angle: -0.8, lw: 2.2, seed: 604 });
    ctx.restore(); ctx.restore();
  }
  // the chalk stumps and the chalk scoreboard on the wall
  function chalk(ctx, x, y, t) {
    ctx.save(); ctx.globalAlpha = 0.92;
    for (const dx of [-36, 0, 36]) G.line(ctx, [[x + dx, y], [x + dx, y + 170]], { color: '#F6F2E8', lw: 7, seed: 700 + dx });
    G.line(ctx, [[x - 44, y - 6], [x + 44, y - 6]], { color: '#F6F2E8', lw: 6, seed: 710 });
    ctx.restore();
  }
  function scoreboard(ctx, x, y, t) {
    const b = S.board.filter((q) => t >= q.t).pop();
    G.rrect(ctx, x, y, 250, 170, 10, { fill: '#2E4638', lw: 5, seed: 720, hatch: { color: 'rgba(255,255,255,0.05)', gap: 8 } });
    const redo = t >= S.board[1].t ? clamp((t - S.board[1].t) / 0.35) : 1;
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, 250 * (t >= S.board[1].t ? redo : 1), 170); ctx.clip();
    G.text(ctx, b.need, x + 125, y + 75, { size: 58, align: 'center', color: '#F6F2E8', fam: 'Permanent Marker', weight: 400 });
    G.text(ctx, b.balls, x + 125, y + 135, { size: 36, align: 'center', color: '#F2D08A', fam: 'Permanent Marker', weight: 400 });
    ctx.restore();
  }

  // ---------- the street (wide) ----------
  function street(ctx, t, { pose = 'watch' } = {}) {
    const tt = tf(t);
    ctx.fillStyle = '#9FC9E0'; ctx.fillRect(-400, -400, W + 800, H + 800);
    house(ctx, -300, 260, 660, 900, '#E9C46A', 10, { crack: t >= ev.crash ? { floor: 1, k: 1 } : null });
    house(ctx, 350, 380, 390, 780, '#8AB6A8', 50);
    house(ctx, 730, 220, 400, 940, '#E07A5F', 90);
    wires(ctx, 330);
    // the ground and the back wall with the stumps
    G.rrect(ctx, -20, 1130, W + 40, 820, 0, { fill: '#C9B79C', lw: 4, seed: 800, hatch: { color: 'rgba(90,60,30,0.12)', gap: 12 } });
    G.rrect(ctx, 330, 1000, 420, 150, 4, { fill: '#B7A48A', lw: 4, seed: 801 });
    chalk(ctx, 540, 985, tt);
    scoreboard(ctx, 740, 870, t);
    // shards from aunty's window
    if (t >= ev.crash) {
      const a = t - ev.crash;
      for (let i = 0; i < 14; i++) {
        const vx = (G.rnd(i, 1) - 0.3) * 520, vy = -200 - G.rnd(i, 2) * 300;
        const x = 265 + vx * a, y = 720 + vy * a + 900 * a * a;
        if (y > 1300) continue;
        G.poly(ctx, [[x, y - 10], [x + 12, y + 4], [x - 6, y + 10]], { fill: '#CFE8F2', lw: 2, seed: 820 + i, step: 8 });
      }
    }
    // Chacha on his charpai with the microphone
    charpai(ctx, 200, 1630, 1);
    const cheer = t >= ev.six && t < ev.crash;
    const cm = mouthOf('chacha', t);
    Ch.person(ctx, { x: 200, y: 1600, s: 0.85, pose: 'sit', style: CAST.chacha, gesture: pose === 'blame' ? 'point' : cheer ? 'cheer' : 'mic', mouth: cm || (cheer ? 'open' : frozen(t) ? 'o' : 'smile'), eyes: frozen(t) ? 'wide' : cheer ? 'happy' : 'normal', brows: pose === 'blame' ? 'up' : 'neutral', look: 0.4, seed: 900, shadow: false });
    // Bilal at the crease
    const bilalGesture = pose === 'blame' ? 'shrug' : cheer ? 'cheer' : 'bat';
    Ch.person(ctx, { x: 540, y: 1520 - (cheer ? hop(t) : 0), s: 0.95, pose: 'stand', style: CAST.bilal, gesture: bilalGesture, mouth: cheer ? 'open' : frozen(t) || pose === 'blame' ? 'o' : 'flat', eyes: frozen(t) ? 'wide' : cheer ? 'happy' : 'normal', brows: pose === 'blame' ? 'worried' : 'determined', sweat: pose === 'blame' ? 0.9 : 0, seed: 950 });
    // the fielders
    const kids = [['sana', 870, 1400, 0.72, 0], ['zain', 880, 1760, 0.8, 1], ['hamza', 330, 1330, 0.66, 2]];
    for (const [who, x, y, s, i] of kids) {
      const g = pose === 'blame' ? 'point' : cheer ? 'cheer' : who === 'hamza' ? 'thumbsUp' : 'akimbo';
      const flip = pose === 'blame' && x > 540 ? -1 : 1; // point toward Bilal
      Ch.person(ctx, { x, y: y - (cheer ? hop(t + i * 0.13) : 0), s, sx: flip, pose: 'stand', style: CAST[who], gesture: g, mouth: cheer ? 'open' : frozen(t) ? 'o' : 'smile', eyes: frozen(t) ? 'wide' : cheer ? 'happy' : 'normal', look: flip < 0 ? 1 : -0.4, seed: 1000 + i * 40 });
    }
    // confetti over the celebration
    if (cheer || frozen(t)) G.confetti(ctx, tt, ev.six, { n: 90, seed: 3 });
  }

  // ---------- the shots ----------
  function wide(ctx, t, s) { street(ctx, t); }
  function strike(ctx, t, s) {
    ctx.fillStyle = '#B7A48A'; ctx.fillRect(0, 0, W, H);
    G.rrect(ctx, -20, 300, W + 40, 1000, 0, { fill: '#C4B195', lw: 4, seed: 1100, hatch: { color: 'rgba(90,60,30,0.1)', gap: 14 } });
    ctx.save(); ctx.translate(540, 360); ctx.scale(2.2, 2.2); ctx.translate(-540, -985); chalk(ctx, 540, 985, t); ctx.restore();
    const breathe = Math.sin(t * 5) * 4;
    Ch.person(ctx, { x: 540, y: 2350 + breathe, s: 2.6, pose: 'stand', style: CAST.bilal, gesture: 'bat', brows: 'determined', eyes: 'normal', look: -0.2, mouth: 'flat', sweat: 0.7, seed: 950 });
    G.decor(() => G.text(ctx, 'BILAL · 10', SAFE.x + 30, SAFE.y + 60, { size: 54, fam: 'Bungee', weight: 400, color: '#F6F0E2', stroke: '#2A2320', strokeW: 8 }));
  }
  // looking up the gully: Hamza runs in, grows, bowls; the ball comes at the camera
  function runup(ctx, t, s) {
    const vx = 540, vy = 640;
    ctx.fillStyle = '#9FC9E0'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#C9B79C'; ctx.beginPath(); ctx.moveTo(vx - 40, vy); ctx.lineTo(vx + 40, vy); ctx.lineTo(W + 300, H); ctx.lineTo(-300, H); ctx.fill();
    const cols = ['#E9C46A', '#8AB6A8', '#E07A5F', '#F4F1DE'];
    for (let k = 0; k < 4; k++) { // house fronts receding on both sides
      const a = k / 4, b = (k + 1) / 4, f = (u) => Math.pow(u, 1.6);
      for (const sd of [-1, 1]) {
        const x0 = vx + sd * (40 + 700 * (1 - f(1 - a))), x1 = vx + sd * (40 + 700 * (1 - f(1 - b)));
        G.poly(ctx, [[x0, vy - 60 - 700 * (1 - f(1 - a))], [x1, vy - 60 - 700 * (1 - f(1 - b))], [x1, vy + 20 + 900 * (1 - f(1 - b))], [x0, vy + 20 + 900 * (1 - f(1 - a))]], { fill: cols[(k + (sd > 0 ? 2 : 0)) % 4], lw: 3.5, seed: 1200 + k * 2 + sd, step: 40 });
      }
    }
    wires(ctx, 240);
    const u = clamp((t - ev.runUp) / (ev.release - ev.runUp));
    const sc = lerp(0.3, 1.05, ease.inQuad(u)), y = lerp(760, 1560, ease.inQuad(u));
    const released = t >= ev.release;
    Ch.person(ctx, { x: 540 + Math.sin(u * 9) * 20, y, s: sc, ...Ch.walk(t, { speed: 900, t0: ev.runUp, stride: 300 }), x0: 0, pose: released ? 'stand' : 'walk', gesture: released ? 'pointUp' : null, style: CAST.hamza, brows: 'determined', mouth: released ? 'open' : 'flat', seed: 1040 });
    if (released) { // the ball flies at the camera
      const k = clamp((t - ev.release) / (ev.hit - ev.release));
      tapeBall(ctx, lerp(540 + 115 * 1.05, 520, k), lerp(1560 - 480 * 1.05, 980, k), lerp(14, 300, ease.inCubic(k)), k * 9);
    }
  }
  // the impact frame
  function hit(ctx, t, s) {
    const a = t - ev.hit;
    ctx.fillStyle = '#FFF4D6'; ctx.fillRect(0, 0, W, H);
    G.rays(ctx, 600, 820, { n: 28, r0: 160, r1: 1600, color: '#F2B84B', lw: 14, seed: 3, spin: a * 0.5 });
    const swing = ease.outCubic(clamp(a / 0.18));
    Ch.person(ctx, { x: 470, y: 2150, s: 2.2, pose: 'stand', style: CAST.bilal, handL: [lerp(66, 150, swing), lerp(-208, -380, swing)], handR: [lerp(80, 170, swing), lerp(-238, -420, swing)], brows: 'determined', eyes: 'closed', mouth: 'grin', seed: 950 });
    // the bat, swung through
    ctx.save(); ctx.translate(470 + 2.2 * lerp(80, 170, swing), 2150 + 2.2 * lerp(-238, -420, swing)); ctx.rotate(lerp(0.4, -2.3, swing));
    G.rrect(ctx, -12, 0, 24, 110, 8, { fill: '#3A2A22', lw: 4, seed: 1300 });
    G.rrect(ctx, -44, 100, 88, 330, 22, { fill: '#E7C98E', lw: 5, seed: 1301, hatch: { color: 'rgba(140,90,30,0.2)', gap: 9 } });
    ctx.restore();
    tapeBall(ctx, 660 + a * 900, 820 - a * 1900, 70, a * 20);
    const pop = ease.outBack(clamp(a / 0.15), 2.5);
    ctx.save(); ctx.translate(560, 560); ctx.rotate(-0.12); ctx.scale(pop, pop);
    G.text(ctx, 'THWACK!', 0, 0, { size: 150, align: 'center', fam: 'Bungee', weight: 400, color: '#E0503E', stroke: '#2A2320', strokeW: 14 });
    ctx.restore();
  }
  // up the building: the camera climbs with the ball
  function rise(ctx, t, s) {
    const u = ease.inOutQuad(clamp((t - ev.rise) / (ev.six - ev.rise)));
    const climb = u * 2600; // how far up the camera has gone
    ctx.fillStyle = '#9FC9E0'; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.translate(0, climb);
    // the tall building: four floors of flats, a roof with a water tank
    house(ctx, 80, -2300, 920, 3400, '#E9C46A', 1400);
    G.rrect(ctx, 700, -2470, 180, 170, 16, { fill: '#2A2A38', lw: 4, seed: 1450 }); // the black water tank
    Ch.cat(ctx, { x: 240, y: -2300, s: 0.9, t, look: 1 - u });
    // pigeons that scatter as the ball goes past
    for (let i = 0; i < 5; i++) {
      const by = -1200 + i * 90, gone = t > ev.rise + 0.8 + i * 0.05;
      const k = gone ? (t - ev.rise - 0.8 - i * 0.05) : 0;
      Ch.bird(ctx, { x: 260 + i * 130 + k * (i % 2 ? 300 : -300), y: by - k * 260, s: 1.3, t: t + i, flap: gone ? 1 : 0.1, color: '#8C8C9A', facing: i % 2 ? 1 : -1 });
    }
    // the kids at the bottom, looking up
    for (const [who, x, i] of [['sana', 300, 0], ['zain', 540, 1], ['hamza', 780, 2]]) Ch.person(ctx, { x, y: 1900, s: 1.1, pose: 'stand', style: CAST[who], lookY: -1, eyes: 'wide', mouth: 'o', seed: 1000 + i * 40 });
    ctx.restore();
    // the ball stays ahead of the camera, climbing the frame
    const by = lerp(1500, 330, ease.outQuad(clamp((t - ev.rise) / (ev.six - ev.rise))));
    for (let k = 1; k <= 5; k++) G.line(ctx, [[540 - 30 + k * 12, by + 60 + k * 30], [540 - 30 + k * 12, by + 140 + k * 40]], { color: 'rgba(255,255,255,0.7)', lw: 5, seed: 1500 + k });
    tapeBall(ctx, 540, by, 46, t * 14);
  }
  // SIX! in the sky
  function sky(ctx, t, s) {
    const a = t - ev.six;
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#4FA3D8'); g.addColorStop(1, '#BFE3F2');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    G.rays(ctx, 540, 800, { n: 36, r0: 120, r1: 1800, color: 'rgba(255,255,255,0.6)', lw: 10, seed: 5, spin: a * 0.4 });
    tapeBall(ctx, 540 + a * 160, 800 - a * 420, lerp(46, 12, clamp(a)), a * 12);
    const pop = ease.outBack(clamp(a / 0.22), 3);
    ctx.save(); ctx.translate(540, 1000); ctx.rotate(-0.06 + 0.02 * Math.sin(a * 8)); ctx.scale(pop, pop);
    G.text(ctx, 'SIX!', 0, 0, { size: 260, align: 'center', fam: 'Bungee', weight: 400, color: '#F2B84B', stroke: '#2A2320', strokeW: 18 });
    G.text(ctx, 'چھکا!', 0, 190, { size: 150, align: 'center', color: '#FFFFFF', stroke: '#2A2320', strokeW: 12, lang: 'ur' });
    ctx.restore();
  }
  function celebrate(ctx, t, s) { street(ctx, t); }
  // aunty in her broken window
  function aunty(ctx, t, s) {
    ctx.fillStyle = '#E9C46A'; ctx.fillRect(0, 0, W, H);
    G.hatch(ctx, [0, 0, W, H], { color: 'rgba(80,40,20,0.1)', gap: 14 });
    G.rrect(ctx, 160, 380, 760, 960, 16, { fill: '#2A2A38', lw: 8, seed: 1600 });
    Ch.person(ctx, { x: 540, y: 1620, s: 1.9, pose: 'stand', style: CAST.aunty, handR: [150, -520 + Math.sin(t * 16) * 12], handL: [-100, -380], brows: 'determined', eyes: 'normal', mouth: mouthOf('aunty', t) || 'flat', seed: 1650 });
    tapeBall(ctx, 540 + 1.9 * 150, 1620 + 1.9 * (-520 + Math.sin(t * 16) * 12) - 40, 34, 0);
    // what is left of the glass and the grill
    for (let g = 1; g < 4; g++) G.line(ctx, [[160 + g * 190, 384], [160 + g * 190, 1336]], { color: '#2A2320', lw: 8, seed: 1660 + g });
    G.poly(ctx, [[166, 386], [400, 386], [250, 560], [166, 700]], { fill: 'rgba(200,230,242,0.55)', lw: 3, seed: 1670, step: 30 });
    G.poly(ctx, [[914, 1334], [700, 1334], [860, 1150], [914, 1000]], { fill: 'rgba(200,230,242,0.55)', lw: 3, seed: 1671, step: 30 });
    G.rrect(ctx, 130, 1330, 820, 60, 8, { fill: '#8E6444', lw: 5, seed: 1680 });
    // angry lines
    if (mouthOf('aunty', t)) for (let k = 0; k < 3; k++) G.line(ctx, [[260 + k * 30, 540 - k * 40], [220 + k * 30, 500 - k * 40]], { color: '#E0503E', lw: 8, seed: 1690 + k });
  }
  function blame(ctx, t, s) { street(ctx, t, { pose: 'blame' }); }
  // everyone runs for it
  function escape(ctx, t, s) {
    const a = t - ev.run;
    ctx.fillStyle = '#9FC9E0'; ctx.fillRect(0, 0, W, H);
    house(ctx, -300, 260, 660, 900, '#E9C46A', 10, { crack: { floor: 1, k: 1 } });
    house(ctx, 350, 380, 390, 780, '#8AB6A8', 50);
    house(ctx, 730, 220, 400, 940, '#E07A5F', 90);
    wires(ctx, 330);
    G.rrect(ctx, -20, 1130, W + 40, 820, 0, { fill: '#C9B79C', lw: 4, seed: 800, hatch: { color: 'rgba(90,60,30,0.12)', gap: 12 } });
    // Chacha stays on his charpai, laughing
    charpai(ctx, 200, 1630, 1);
    Ch.person(ctx, { x: 200, y: 1600, s: 0.85, pose: 'sit', style: CAST.chacha, gesture: 'clap', mouth: 'grin', eyes: 'happy', headRot: 0.08 * Math.sin(t * 9), seed: 900, shadow: false });
    // aunty shaking her fist from the window
    ctx.save(); ctx.translate(265, 740); ctx.scale(0.3, 0.3);
    Ch.person(ctx, { x: 0, y: 300, s: 1, pose: 'stand', style: CAST.aunty, handR: [140, -470 + Math.sin(t * 18) * 20], brows: 'determined', mouth: 'open', seed: 1650 });
    ctx.restore();
    const runners = [['bilal', 540, 1520, -1, 0.95], ['sana', 870, 1400, 1, 0.72], ['zain', 880, 1760, 1, 0.8], ['hamza', 330, 1330, -1, 0.66]];
    runners.forEach(([who, x0, y, dir, s0], i) => {
      const w = Ch.walk(t, { x0, speed: 470 * dir, t0: ev.run + i * 0.12, stride: 200 });
      Ch.person(ctx, { x: w.x, y, s: s0, sx: dir, pose: 'walk', walk: Math.abs(w.walk), style: CAST[who], gesture: who === 'bilal' ? 'bat' : null, eyes: 'wide', mouth: 'open', brows: 'worried', seed: 1000 + i * 40 });
      // dust puffs behind the runner
      for (let k = 0; k < 4; k++) { const pa = a - k * 0.12; if (pa < 0) continue; ctx.save(); ctx.globalAlpha = Math.max(0, 0.5 - pa * 0.5); G.ellipse(ctx, x0 + 470 * dir * Math.max(0, pa - 0.1) - dir * 40, y + 10, 30 + pa * 40, 16 + pa * 14, { fill: '#E8DCC8', lw: 0, seed: 1700 + k + i * 5 }); ctx.restore(); }
    });
    // the end card
    const e = clamp((t - ev.end) / 0.5);
    if (e > 0) {
      ctx.save(); ctx.globalAlpha = e;
      ctx.fillStyle = 'rgba(20,16,30,0.72)'; ctx.fillRect(0, 0, W, H);
      const pop = ease.outBack(e, 2);
      ctx.translate(540, 780); ctx.scale(pop, pop);
      G.text(ctx, 'GULLY', 0, -40, { size: 150, align: 'center', fam: 'Bungee', weight: 400, color: '#F2B84B', stroke: '#2A2320', strokeW: 12 });
      G.text(ctx, 'CRICKET', 0, 110, { size: 150, align: 'center', fam: 'Bungee', weight: 400, color: '#F2B84B', stroke: '#2A2320', strokeW: 12 });
      G.text(ctx, 'گلی کرکٹ', 0, 280, { size: 110, align: 'center', color: '#FFFFFF', lang: 'ur' });
      G.text(ctx, 'every mohalla has one.', 0, 400, { size: 60, align: 'center', color: '#F6F0E2' });
      ctx.restore();
    }
  }

  const film = Shots.film([
    { at: 0, draw: wide, cam: Shots.push(1.0, 1.05) },
    { at: T(2), draw: strike, in: 'whip', cam: Shots.push(1, 1.08) },
    { at: T(3), draw: runup, in: 'cut' },
    { at: ev.hit, draw: hit, in: 'cut', cam: Shots.shake(26, ev.hit, 6) },
    { at: ev.rise, draw: rise, in: 'cut' },
    { at: ev.six, draw: sky, in: 'flash', cam: Shots.shake(20, ev.six, 5) },
    { at: T(6, 2), draw: celebrate, in: 'cut', cam: Shots.combine(Shots.shake(10, T(6, 2), 4), (s) => { const k = s.t >= ev.crash ? ease.outCubic(clamp((s.t - ev.crash) / 0.12)) : 0; return { zoom: 1 + 0.7 * k, x: -275 * k, y: -240 * k }; }) },
    { at: ev.aunty, draw: aunty, in: 'cut', cam: Shots.push(1, 1.06) },
    { at: ev.point, draw: blame, in: 'cut' },
    { at: ev.run, draw: escape, in: 'cut' },
  ]);

  Studio.film({
    post: { vignette: 0.25, grain: 0.05, paper: 0.4 },
    fadeOut: 0.8,
    async init() {
      VO = await Studio.loadJSON('out/voice.json');
      SUBS = [...Subs.fromVoice(VO, { maxWords: 5 }), { t: S.chant[0].t, end: T(8), text: 'Chhakka! Chhakka!', alt: 'چھکا! چھکا!' }].sort((a, b) => a.t - b.t);
    },
    draw(ctx, t) {
      film(ctx, t);
      if (t < ev.end) Subs.draw(ctx, t, SUBS, { style: 'pop' });
    },
  });
})();
