// Characters: Claude (the little orange block), a customizable person, footballers, a ball.
(function () {
  const U = globalThis.U, G = globalThis.G, C = G.C;
  const Ch = {};

  // two-bone IK: shoulder S, target P, lengths a,b, bend +1/-1 -> elbow
  Ch.ik = (S, P, a, b, bend = 1) => {
    let dx = P[0] - S[0], dy = P[1] - S[1];
    let d = Math.hypot(dx, dy);
    const maxd = a + b - 0.01;
    if (d > maxd) { dx *= maxd / d; dy *= maxd / d; d = maxd; }
    const ang = Math.atan2(dy, dx);
    const cosA = U.clamp((a * a + d * d - b * b) / (2 * a * d), -1, 1);
    const A = Math.acos(cosA) * bend;
    const E = [S[0] + Math.cos(ang + A) * a, S[1] + Math.sin(ang + A) * a];
    const H = [S[0] + dx, S[1] + dy];
    return { E, H };
  };

  // ======================= CLAUDE =======================
  Ch.claude = (ctx, o) => {
    const {
      x, y, s = 1, sx = 1, sy = 1, rot = 0, eyes = 'normal', look = 0, lookY = 0, blink = 0,
      armL = 0, armR = 0, mouth = 'none', blush = 0, scarf = false, scarfWave = 0, seed = 100,
      legKick = 0, legH = 46, shadow = true, tint = null, eyeScale = 1,
    } = o;
    const bw = 210, bh = 145;
    ctx.save();
    ctx.translate(x, y);
    if (shadow) {
      ctx.fillStyle = 'rgba(20,10,20,0.22)';
      ctx.beginPath(); ctx.ellipse(0, 4, 120 * s * sx, 14 * s, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.scale(s * sx, s * sy);
    ctx.rotate(rot);
    const top = -legH - bh, mid = -legH - bh * 0.5;
    // legs
    const legX = [-82, -54, 54, 82];
    legX.forEach((lx, i) => {
      const kick = i % 2 === 0 ? legKick : -legKick;
      G.rrect(ctx, lx - 9, -legH - 6 + (kick < 0 ? kick * 10 : 0), 18, legH + 6 - Math.abs(kick) * 8, 3, { fill: C.claude, lw: 3.5, seed: seed + i, hatch: { color: 'rgba(120,50,30,0.3)', gap: 6 } });
    });
    // arms (nubs) pivot at body sides
    const arm = (side, ang) => {
      ctx.save();
      ctx.translate(side * (bw / 2 - 4), mid + 6);
      ctx.rotate(-side * ang);
      G.rrect(ctx, side > 0 ? 0 : -34, -18, 34, 36, 4, { fill: C.claude, lw: 3.5, seed: seed + 10 + side, hatch: { color: 'rgba(120,50,30,0.3)', gap: 6 } });
      ctx.restore();
    };
    arm(-1, armL);
    arm(1, armR);
    // body
    G.rrect(ctx, -bw / 2, top, bw, bh, 8, { fill: tint || C.claude, lw: 4.5, seed, step: 26, hatch: { color: 'rgba(130,55,30,0.32)', gap: 7, angle: -0.9 } });
    // blush
    if (blush > 0) {
      ctx.save();
      ctx.globalAlpha *= blush;
      for (const sd of [-1, 1]) {
        ctx.save();
        ctx.beginPath(); ctx.ellipse(sd * 66 + look * 10, mid + 20, 20, 9, 0, 0, Math.PI * 2); ctx.clip();
        G.hatch(ctx, [sd * 66 - 22, mid + 8, sd * 66 + 22, mid + 32], { color: 'rgba(235,90,120,0.8)', gap: 4.5, angle: -1.1, lw: 2 });
        ctx.restore();
      }
      ctx.restore();
    }
    // eyes
    const ex = 50, ey = mid - 12;
    const lx = look * 16, ly = lookY * 10;
    for (const sd of [-1, 1]) {
      const cx = sd * ex + lx, cy = ey + ly;
      if (eyes === 'happy') {
        G.line(ctx, [[cx - 15, cy + 8], [cx, cy - 10], [cx + 15, cy + 8]], { lw: 6, seed: seed + 20 + sd });
      } else if (eyes === 'closed') {
        G.line(ctx, [[cx - 15, cy], [cx, cy + 9], [cx + 15, cy]], { lw: 5.5, seed: seed + 22 + sd });
      } else if (eyes === 'focus') {
        G.poly(ctx, [[cx - 14, cy - 6 - sd * 6], [cx + 14, cy - 6 + sd * 6], [cx + 12, cy + 14], [cx - 12, cy + 14]], { fill: C.ink, lw: 2, seed: seed + 24 + sd, step: 10 });
      } else {
        const wide = eyes === 'wide' || eyes === 'sparkle';
        const w = (wide ? 30 : 22) * eyeScale, h = (wide ? 46 : 38) * (1 - blink * 0.9) * eyeScale;
        G.rrect(ctx, cx - w / 2, cy - h / 2, w, h, w / 2, { fill: C.ink, lw: 2, seed: seed + 26 + sd, step: 12 });
        if (h > 10) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(cx - w / 2 + 5 * eyeScale, cy - h / 2 + 6 * eyeScale, (wide ? 9 : 7) * eyeScale, (wide ? 11 : 9) * eyeScale);
          if (wide) { ctx.fillRect(cx + 3 * eyeScale, cy + h / 2 - 14 * eyeScale, 5 * eyeScale, 5 * eyeScale); }
        }
        if (eyes === 'worried') {
          G.line(ctx, [[cx - 16, cy - 30 - sd * 5], [cx + 14, cy - 30 + sd * 5]].map((p) => [p[0], p[1]]), { lw: 4.5, seed: seed + 28 + sd });
        }
      }
    }
    // mouth
    if (mouth === 'open') {
      const pts = [];
      for (let i = 0; i <= 16; i++) { const a = Math.PI * (i / 16); pts.push([Math.cos(a) * 34 + lx, mid + 22 + Math.sin(a) * 36]); }
      pts.push([-34 + lx, mid + 22]);
      G.shape(ctx, pts, { fill: '#3A1D1A', lw: 4, seed: seed + 30 });
      ctx.save();
      ctx.beginPath(); G.path(ctx, pts); ctx.clip();
      ctx.fillStyle = '#E8718D';
      ctx.beginPath(); ctx.ellipse(lx, mid + 58, 22, 14, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    } else if (mouth === 'smile') {
      G.line(ctx, [[lx - 12, mid + 20], [lx, mid + 28], [lx + 12, mid + 20]], { lw: 4.5, seed: seed + 31 });
    } else if (mouth === 'o') {
      G.ellipse(ctx, lx, mid + 26, 9, 11, { fill: '#3A1D1A', lw: 3, seed: seed + 32 });
    }
    // scarf
    if (scarf) Ch.scarf(ctx, -bw / 2 - 6, top + 6, bw + 12, scarfWave, seed + 40);
    ctx.restore();
  };

  // striped scarf band + hanging tail
  Ch.scarf = (ctx, x, y, w, wave, seed) => {
    const h = 34;
    const band = G.shape(ctx, G.rrPts(x, y, w, h, 12, 18), { fill: C.cream, lw: 4, seed });
    ctx.save();
    ctx.beginPath(); G.path(ctx, band); ctx.clip();
    ctx.fillStyle = '#D9482B';
    for (let k = 0; k < 8; k++) if (k % 2 === 0) ctx.fillRect(x + (k * w) / 8, y - 5, w / 8, h + 10);
    ctx.restore();
    G.shape(ctx, band, { lw: 4, seed, amp: 0 });
    // tail
    ctx.save();
    ctx.translate(x + w - 22, y + h - 8);
    ctx.rotate(0.12 + wave);
    const tail = G.shape(ctx, G.rrPts(-18, 0, 38, 110, 6, 16), { fill: C.cream, lw: 4, seed: seed + 1 });
    ctx.save();
    ctx.beginPath(); G.path(ctx, tail); ctx.clip();
    ctx.fillStyle = '#D9482B';
    for (let k = 0; k < 5; k++) if (k % 2 === 0) ctx.fillRect(-25, (k * 110) / 5, 60, 110 / 5);
    ctx.restore();
    G.shape(ctx, tail, { lw: 4, seed, amp: 0 });
    for (let k = 0; k < 5; k++) G.line(ctx, [[-14 + k * 7.5, 110], [-14 + k * 7.5 + wave * 20, 128]], { lw: 3, seed: seed + 5 + k, color: '#D9482B' });
    ctx.restore();
  };

  // ======================= PERSON =======================
  // A friendly paper-cutout human. pose 'sit': origin = middle of hips on the seat.
  // pose 'stand': origin = between the feet. Arms are posed by hand targets (2-bone IK).
  // style: { skin, skinDark, hair, shirt, trim, collar, shorts, name, number }
  Ch.PERSON_STYLE = { skin: C.skin, skinDark: C.skinDark, hair: C.hair, shirt: C.kit, trim: C.teal, collar: C.cream, shorts: C.navy, name: '', number: '' };
  Ch.person = (ctx, o) => {
    const st = Object.assign({}, Ch.PERSON_STYLE, o.style || {});
    const {
      x, y, s = 1, sx = 1, sy = 1, rot = 0, pose = 'sit', headRot = 0, headX = 0, headY = 0,
      eyes = 'normal', look = 0, lookY = 0, blink = 0, brows = 'neutral', mouth = 'smile',
      handL, handR, knee = [0, 0], pillow = 0, blanket = false, sweat = 0, blush = 0, seed = 300,
      shadow = true, legBend = 0, jersey = true, scarf = false,
    } = o;
    ctx.save();
    ctx.translate(x, y);
    if (shadow && pose === 'stand') {
      ctx.fillStyle = 'rgba(20,10,20,0.22)';
      ctx.beginPath(); ctx.ellipse(0, 4, 110 * s, 14 * s, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.scale(s * sx, s * sy);
    ctx.rotate(rot);
    const hip = pose === 'sit' ? 0 : -150;
    const sh = hip - 172; // shoulder line
    const headC = [headX, sh - 82 + headY];

    // ---- legs ----
    if (pose === 'sit') {
      for (const sd of [-1, 1]) {
        const lift = sd < 0 ? knee[0] : knee[1];
        const K = [sd * 50, 58 - lift * 18];
        const F = [sd * 56, 150 - lift * 24];
        G.limb(ctx, [K, [(K[0] + F[0]) / 2 + sd * 2, (K[1] + F[1]) / 2], F], { color: st.skin, lw: 30, seed: seed + 1 + sd });
        G.ellipse(ctx, F[0] + sd * 4, F[1] + 4, 32, 16, { fill: '#F4F1EA', lw: 3.5, seed: seed + 3 + sd, hatch: { color: 'rgba(0,0,0,0.1)', gap: 6 } });
        G.line(ctx, [[F[0] - 22 + sd * 4, F[1] + 6], [F[0] + 26 + sd * 4, F[1] + 6]], { lw: 2.5, color: st.shirt, seed: seed + 5 + sd });
      }
      // thighs coming toward camera (shorts) + knee caps
      for (const sd of [-1, 1]) {
        const lift = sd < 0 ? knee[0] : knee[1];
        G.ellipse(ctx, sd * 50, 44 - lift * 18, 23, 18, { fill: st.skin, lw: 4, seed: seed + 8 + sd });
        G.rrect(ctx, sd * 50 - 44, -22 - lift * 8, 88, 70, 30, { fill: st.shorts, lw: 4, seed: seed + 7 + sd, hatch: { color: 'rgba(255,255,255,0.08)', gap: 7 } });
      }
    } else {
      for (const sd of [-1, 1]) {
        const Hp = [sd * 36, hip + 30];
        const F = [sd * (46 + legBend * 30), 0 - legBend * 10];
        const K = [(Hp[0] + F[0]) / 2 + sd * legBend * 40, (Hp[1] + F[1]) / 2];
        G.limb(ctx, [Hp, K, F], { color: st.skin, lw: 30, seed: seed + 1 + sd });
        G.rrect(ctx, F[0] - 30 + sd * 8, F[1] - 18, 58, 26, 11, { fill: '#F4F1EA', lw: 3.5, seed: seed + 3 + sd, hatch: { color: 'rgba(0,0,0,0.1)', gap: 6 } });
      }
      G.rrect(ctx, -80, hip - 18, 160, 70, 18, { fill: st.shorts, lw: 4, seed: seed + 7, hatch: { color: 'rgba(255,255,255,0.08)', gap: 7 } });
    }

    // ---- arms (behind torso part) ----
    const SL = [-70, sh + 16], SR = [70, sh + 16];
    const restL = pose === 'sit' ? [-62, -6] : [-92, hip - 30];
    const restR = pose === 'sit' ? [62, -6] : [92, hip - 30];
    let pL = handL || restL, pR = handR || restR;
    if (pillow > 0) {
      const py = U.lerp(-20, headC[1] + 62, pillow);
      pL = [-82, py + 10];
      pR = [82, py + 10];
    }
    // elbows always bend outward, away from the body
    const armL = Ch.ik(SL, pL, 82, 80, pL[1] < sh ? -1 : 1);
    const armR = Ch.ik(SR, pR, 82, 80, pR[1] < sh ? 1 : -1);

    // ---- torso (jersey) ----
    const torso = G.poly(ctx, [[-78, sh], [78, sh], [74, hip + 10], [-74, hip + 10]], { fill: st.shirt, lw: 4.5, seed: seed + 9, step: 20, hatch: { color: 'rgba(120,40,10,0.22)', gap: 7 } });
    ctx.save();
    ctx.beginPath(); G.path(ctx, torso); ctx.clip();
    // side panels
    ctx.fillStyle = st.trim;
    ctx.fillRect(-80, sh, 16, hip - sh + 20);
    ctx.fillRect(64, sh, 16, hip - sh + 20);
    ctx.restore();
    // collar
    G.poly(ctx, [[-26, sh - 2], [26, sh - 2], [0, sh + 30]], { fill: st.collar, lw: 3.5, seed: seed + 11, step: 12 });
    if (jersey && st.name) {
      G.text(ctx, st.name, 0, sh + 70, { size: 30, fam: 'Bungee', weight: 400, color: C.cream, align: 'center', stroke: C.ink, strokeW: 5 });
    }
    if (jersey && st.number) {
      G.text(ctx, String(st.number), 0, sh + (st.name ? 142 : 110), { size: 70, fam: 'Bungee', weight: 400, color: C.cream, align: 'center', stroke: C.ink, strokeW: 7 });
    }
    // arms
    const drawArm = (S, a, sd) => {
      G.limb(ctx, [S, a.E, a.H], { color: st.skin, lw: 27, seed: seed + 13 + sd });
      // sleeve over upper arm
      const sx2 = S[0] + (a.E[0] - S[0]) * 0.42, sy2 = S[1] + (a.E[1] - S[1]) * 0.42;
      G.limb(ctx, [[S[0] - sd * 4, S[1] - 6], [sx2, sy2]], { color: st.shirt, lw: 36, seed: seed + 15 + sd });
      G.ellipse(ctx, a.H[0], a.H[1], 20, 20, { fill: st.skin, lw: 4, seed: seed + 17 + sd });
    };
    // neck
    G.rrect(ctx, -20, sh - 24, 40, 30, 8, { fill: st.skinDark, lw: 3.5, seed: seed + 19 });
    if (scarf) Ch.scarf(ctx, -96, sh - 34, 192, 0.05 * Math.sin(G.t * 2), seed + 60);

    // ---- head ----
    ctx.save();
    ctx.translate(headC[0], headC[1]);
    ctx.rotate(headRot);
    // ears
    G.ellipse(ctx, -64, 6, 14, 18, { fill: st.skin, lw: 3.5, seed: seed + 21 });
    G.ellipse(ctx, 64, 6, 14, 18, { fill: st.skin, lw: 3.5, seed: seed + 22 });
    G.ellipse(ctx, 0, 0, 64, 70, { fill: st.skin, lw: 4.5, seed: seed + 23, hatch: { color: 'rgba(120,60,30,0.14)', gap: 8 } });
    // hair
    G.poly(ctx, [[-66, 2], [-62, -40], [-40, -66], [-4, -80], [36, -76], [62, -52], [68, -8], [52, -30], [30, -44], [6, -40], [-18, -48], [-44, -36], [-56, -10]], { fill: st.hair, lw: 4, seed: seed + 25, step: 14 });
    G.poly(ctx, [[-10, -78], [8, -96], [30, -86], [16, -74]], { fill: st.hair, lw: 3.5, seed: seed + 26, step: 10 });
    // brows
    const bl = { neutral: [0, 0], worried: [8, -6], up: [-6, -6], determined: [-8, 5] }[brows] || [0, 0];
    for (const sd of [-1, 1]) {
      const inner = [sd * 12 + look * 8, -32 - bl[0] + (brows === 'up' ? -6 : 0)];
      const outer = [sd * 42 + look * 8, -30 - bl[1] + (brows === 'up' ? -6 : 0)];
      G.line(ctx, [inner, outer], { lw: 7, seed: seed + 27 + sd, color: st.hair });
    }
    // eyes
    for (const sd of [-1, 1]) {
      const cx = sd * 26 + look * 10, cy = -6 + lookY * 6;
      if (eyes === 'happy') G.line(ctx, [[cx - 11, cy + 5], [cx, cy - 7], [cx + 11, cy + 5]], { lw: 5, seed: seed + 29 + sd });
      else if (eyes === 'closed' || eyes === 'sleep') G.line(ctx, [[cx - 11, cy], [cx, cy + 7], [cx + 11, cy]], { lw: 4.5, seed: seed + 31 + sd });
      else {
        const wide = eyes === 'wide';
        const w = wide ? 17 : 12, h = (wide ? 22 : 16) * (1 - blink * 0.9);
        if (wide) G.ellipse(ctx, cx, cy, w + 5, h / 2 + 6, { fill: '#FFFFFF', lw: 3, seed: seed + 33 + sd });
        ctx.fillStyle = C.ink;
        ctx.beginPath(); ctx.ellipse(cx, cy, w / 2, Math.max(1.5, h / 2), 0, 0, Math.PI * 2); ctx.fill();
        if (h > 6) { ctx.fillStyle = '#FFF'; ctx.beginPath(); ctx.arc(cx - w * 0.18, cy - h * 0.2, wide ? 3.2 : 2.4, 0, Math.PI * 2); ctx.fill(); }
      }
    }
    // nose
    G.line(ctx, [[-2 + look * 6, 8], [6 + look * 6, 20], [-4 + look * 6, 24]], { lw: 3.5, seed: seed + 35, color: st.skinDark });
    // cheeks
    if (blush > 0) {
      ctx.save();
      ctx.globalAlpha *= blush * 0.8;
      ctx.fillStyle = '#E8718D';
      for (const sd of [-1, 1]) { ctx.beginPath(); ctx.ellipse(sd * 38, 22, 13, 7, 0, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
    }
    // mouth
    const mx = look * 8, my = 40;
    if (mouth === 'flat') G.line(ctx, [[mx - 14, my], [mx + 14, my]], { lw: 4.5, seed: seed + 37 });
    else if (mouth === 'wavy') G.line(ctx, [[mx - 18, my], [mx - 9, my - 5], [mx, my], [mx + 9, my - 5], [mx + 18, my]], { lw: 4, seed: seed + 38, step: 6 });
    else if (mouth === 'smile') G.line(ctx, [[mx - 16, my - 4], [mx, my + 6], [mx + 16, my - 4]], { lw: 4.5, seed: seed + 39 });
    else if (mouth === 'o' || mouth === 'sleep') G.ellipse(ctx, mx, my + 2, mouth === 'o' ? 9 : 6, mouth === 'o' ? 11 : 6, { fill: '#3A1D1A', lw: 3, seed: seed + 40 });
    else if (mouth === 'open' || mouth === 'grin') {
      const pts = [];
      const ww = mouth === 'open' ? 30 : 34, hh = mouth === 'open' ? 34 : 26;
      for (let i = 0; i <= 14; i++) { const a = Math.PI * (i / 14); pts.push([mx + Math.cos(a) * ww, my - 8 + Math.sin(a) * hh]); }
      pts.push([mx - ww, my - 8]);
      G.shape(ctx, pts, { fill: '#3A1D1A', lw: 4, seed: seed + 41 });
      ctx.save(); ctx.beginPath(); G.path(ctx, pts); ctx.clip();
      ctx.fillStyle = '#FFFFFF'; ctx.fillRect(mx - ww, my - 10, ww * 2, 9);
      ctx.fillStyle = '#E8718D'; ctx.beginPath(); ctx.ellipse(mx, my - 8 + hh, ww * 0.6, 12, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    if (sweat > 0) {
      ctx.save(); ctx.globalAlpha *= sweat;
      G.shape(ctx, [[58, -40], [66, -24], [62, -14], [52, -16], [50, -26]], { fill: '#9FD3F0', lw: 3, seed: seed + 43 });
      ctx.restore();
    }
    ctx.restore(); // head

    // arms on top (so hands can hold pillow / wave in front)
    if (pillow > 0) {
      const py = U.lerp(-20, headC[1] + 62, pillow);
      ctx.save();
      ctx.translate(0, py);
      ctx.rotate(Math.sin(G.t * 40) * 0.006 * pillow);
      G.rrect(ctx, -104, -58, 208, 116, 40, { fill: '#E3B04B', lw: 4.5, seed: seed + 45, hatch: { color: 'rgba(140,90,20,0.25)', gap: 8 } });
      G.line(ctx, [[-60, -20], [-50, -10]], { lw: 3, seed: seed + 46, color: 'rgba(120,80,20,0.6)' });
      G.line(ctx, [[50, 18], [62, 26]], { lw: 3, seed: seed + 47, color: 'rgba(120,80,20,0.6)' });
      ctx.restore();
    }
    drawArm(SL, armL, -1);
    drawArm(SR, armR, 1);
    if (blanket) Ch.blanket(ctx, sh, hip, seed + 50);
    ctx.restore();
  };

  // a scarf laid over a sitting person like a blanket
  Ch.blanket = (ctx, sh, hip, seed) => {
    ctx.save();
    ctx.translate(0, (sh + hip) / 2 + 40);
    ctx.rotate(-0.22);
    const w = 250, h = 46;
    const b = G.shape(ctx, G.rrPts(-w / 2, -h / 2, w, h, 12, 18), { fill: C.cream, lw: 4, seed });
    ctx.save(); ctx.beginPath(); G.path(ctx, b); ctx.clip();
    ctx.fillStyle = '#D9482B';
    for (let k = 0; k < 10; k++) if (k % 2 === 0) ctx.fillRect(-w / 2 + (k * w) / 10, -h, w / 10, h * 2);
    ctx.restore();
    G.shape(ctx, b, { lw: 4, seed, amp: 0 });
    for (let k = 0; k < 6; k++) G.line(ctx, [[w / 2 - 2, -h / 2 + 6 + k * 7], [w / 2 + 16, -h / 2 + 8 + k * 7]], { lw: 3, seed: seed + k, color: '#D9482B' });
    ctx.restore();
  };

  // ======================= FOOTBALLERS =======================
  const KITS = {
    home: { shirt: C.kit, shorts: C.cream, socks: C.kit },
    away: { shirt: '#2F3A78', shorts: '#1A2045', socks: '#2F3A78' },
    gk: { shirt: '#3FB07A', shorts: '#1E5C41', socks: '#3FB07A' },
  };
  const SKINS = ['#C98A62', '#8D5A3B', '#E7B48F', '#6B4430', '#D9A07A', '#A8704C'];
  Ch.player = (ctx, o) => {
    const { x, y, s = 1, kit = 'home', facing = 1, pose = 'run', phase = 0, kick = 0, seed = 1, lean = 0, num, alpha = 1 } = o;
    const K = KITS[kit];
    const skin = SKINS[Math.floor(U.hash(seed, 3) * SKINS.length)];
    const hair = U.hash(seed, 4) < 0.7 ? C.hair : '#7A4B2A';
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.translate(x, y);
    ctx.fillStyle = 'rgba(10,40,15,0.28)';
    ctx.beginPath(); ctx.ellipse(0, 2, 34 * s, 7 * s, 0, 0, Math.PI * 2); ctx.fill();
    ctx.scale(s * facing, s);
    let bodyRot = lean;
    if (pose === 'dive') bodyRot = -1.2;
    ctx.rotate(bodyRot);
    const hipY = -58;
    // legs
    const legs = [];
    if (pose === 'run') {
      const a = Math.sin(phase) * 0.7;
      legs.push([a, Math.max(0, -Math.cos(phase)) * 0.9], [-a, Math.max(0, Math.cos(phase)) * 0.9]);
    } else if (pose === 'kick') {
      const sw = U.lerp(-1.1, 1.35, U.ease.outCubic(kick));
      legs.push([-0.15, 0.05], [sw, kick < 0.5 ? 0.9 * (1 - kick * 2) : 0]);
    } else if (pose === 'lunge') {
      legs.push([-0.5, 0.2], [1.1, 0]);
    } else if (pose === 'dive') {
      legs.push([-0.3, 0.2], [0.2, 0.4]);
    } else {
      legs.push([0.12, 0.05], [-0.12, 0.05]);
    }
    legs.forEach(([th, kn], i) => {
      const Hp = [i ? 6 : -6, hipY];
      const Kp = [Hp[0] + Math.sin(th) * 30, Hp[1] + Math.cos(th) * 30];
      const Fp = [Kp[0] + Math.sin(th - kn) * 30, Kp[1] + Math.cos(th - kn) * 30];
      G.limb(ctx, [Hp, Kp, Fp], { color: i ? K.socks : skin, lw: 11, outline: 3, seed: seed + i });
      G.ellipse(ctx, Fp[0] + 5, Fp[1] - 1, 10, 6, { fill: '#222', lw: 2.5, seed: seed + 10 + i, amp: 0.6 });
    });
    // shorts
    G.rrect(ctx, -17, hipY - 8, 34, 20, 5, { fill: K.shorts, lw: 3, seed: seed + 20, amp: 1 });
    // arms
    const armA = pose === 'run' ? Math.sin(phase) * 0.8 : pose === 'kick' ? -1.4 : pose === 'celebrate' ? -2.6 : pose === 'dive' ? -2.9 : 0.35;
    for (const sd of [-1, 1]) {
      const S = [sd * 14, hipY - 42];
      const a = sd < 0 ? armA : pose === 'run' ? -armA : armA * (pose === 'kick' ? -0.6 : 1);
      const E = [S[0] + Math.sin(a) * 22 * (pose === 'kick' ? sd : 1), S[1] + Math.cos(a) * 22];
      const Hh = [E[0] + Math.sin(a + 0.4) * 20, E[1] + Math.cos(a + 0.4) * 20];
      G.limb(ctx, [S, E, Hh], { color: skin, lw: 9, outline: 3, seed: seed + 30 + sd });
    }
    // torso
    G.rrect(ctx, -19, hipY - 50, 38, 46, 9, { fill: K.shirt, lw: 3.5, seed: seed + 40, amp: 1, hatch: { color: 'rgba(0,0,0,0.12)', gap: 6 } });
    if (num) G.text(ctx, String(num), 0, hipY - 17, { size: 22, fam: 'Bungee', weight: 400, color: kit === 'home' ? C.cream : '#FFF', align: 'center', boil: 0.3 });
    // head
    G.ellipse(ctx, 2, hipY - 68, 16, 17, { fill: skin, lw: 3.5, seed: seed + 50, amp: 1 });
    G.poly(ctx, [[-15, hipY - 70], [-12, hipY - 84], [4, hipY - 88], [17, hipY - 78], [16, hipY - 72], [2, hipY - 78]], { fill: hair, lw: 2.5, seed: seed + 51, step: 8, amp: 0.8 });
    ctx.fillStyle = C.ink;
    ctx.beginPath(); ctx.arc(10, hipY - 68, 2.3, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  };

  Ch.ball = (ctx, x, y, r, spin, { shadowY = null, seed = 7 } = {}) => {
    if (shadowY !== null) {
      ctx.fillStyle = 'rgba(10,40,15,0.3)';
      ctx.beginPath(); ctx.ellipse(x, shadowY, r * 1.1, r * 0.3, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(spin);
    G.ellipse(ctx, 0, 0, r, r, { fill: '#FFFFFF', lw: Math.max(2, r * 0.16), seed, amp: 0.5 });
    ctx.fillStyle = C.ink;
    const pent = (cx, cy, rr) => { ctx.beginPath(); for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5; ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } ctx.closePath(); ctx.fill(); };
    pent(0, 0, r * 0.36);
    for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5; pent(Math.cos(a) * r * 0.86, Math.sin(a) * r * 0.86, r * 0.22); }
    ctx.restore();
  };

  globalThis.Ch = Ch;
})();
