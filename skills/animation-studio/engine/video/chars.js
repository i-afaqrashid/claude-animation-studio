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
    // mouth (an object { open, wide, talking } from Subs.mouth lip-syncs it)
    if (mouth && typeof mouth === 'object') {
      const op = Math.max(0, Math.min(1, mouth.open || 0)), wd = mouth.wide ?? 0.5;
      if (!mouth.talking || op < 0.08) G.line(ctx, [[lx - 12, mid + 22], [lx, mid + 27], [lx + 12, mid + 22]], { lw: 4.5, seed: seed + 31 });
      else G.ellipse(ctx, lx, mid + 26 + op * 6, 10 + wd * 14 + op * 6, 4 + op * 22, { fill: '#3A1D1A', lw: 3.5, seed: seed + 32, amp: 0.8 });
    } else if (mouth === 'open') {
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
  // Every style option is optional — the defaults draw the original jersey look.
  const shade = (c, f) => {
    if (typeof c !== 'string' || c[0] !== '#') return c;
    const n = parseInt(c.slice(1), 16);
    const k = (v) => Math.max(0, Math.min(255, Math.round(v * f)));
    return `rgb(${k((n >> 16) & 255)},${k((n >> 8) & 255)},${k(n & 255)})`;
  };
  const alpha = (c, a) => {
    if (typeof c !== 'string' || c[0] !== '#') return c;
    const n = parseInt(c.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  };
  Ch.shade = shade;
  Ch.SKIN_TONES = ['#F3D2B3', '#E6B48C', '#C98A62', '#A86E4B', '#8D5A3B', '#6B4430'];
  Ch.HAIR_COLORS = ['#2B211E', '#5A3A22', '#8C5A2B', '#C9A063', '#B8452A', '#9A9A9A', '#E8E4DA'];
  Ch.PERSON_STYLE = {
    skin: C.skin, skinDark: null, hair: C.hair, shirt: C.kit, trim: C.teal, collar: C.cream, shorts: C.navy,
    robe: null, // thobe / abaya / sari colour (defaults: white thobe, black abaya, magenta sari); suit: jacket colour
    headwear: 'none', // none | topi (prayer cap) | cap | turban | ghutra (headscarf + agal)
    headwearColor: null,
    shoes: '#F4F1EA', name: '', number: '',
    hairStyle: 'quiff', // quiff | short | buzz | curlytop | long | curly | bun | ponytail | bald | hijab
    hijab: '#6B4E8A',
    facialHair: 'none', // none | stubble | mustache | trimmed (short beard + mustache) | beard
    glasses: 'none', // none | round | square | sun (round sunglasses)
    glassesColor: null, // frame colour (default ink; gold for sun)
    outfit: 'jersey', // jersey | tee | hoodie | shirt | dress | kameez | thobe | abaya | sari | suit
    bottoms: 'shorts', // shorts | pants | shalwar | skirt   (a dress brings its own skirt)
    sleeves: null, // short | long | none   (default depends on the outfit)
    build: 'regular', // slim | regular | broad
    print: '', printColor: C.cream, // big text on a tee / hoodie
    freckles: false,
  };
  const SLEEVES = { jersey: 'short', tee: 'short', dress: 'short', hoodie: 'long', shirt: 'long', kameez: 'long', thobe: 'long', abaya: 'long', sari: 'short', suit: 'long' };
  const ROBE = { thobe: '#F3F1EA', abaya: '#1F1D24', sari: '#C2185B', suit: '#2C3550' };
  const ROBES = ['thobe', 'abaya', 'sari'];
  const isDark = (c) => { if (typeof c !== 'string' || c[0] !== '#') return false; const n = parseInt(c.slice(1), 16); return (0.3 * ((n >> 16) & 255) + 0.59 * ((n >> 8) & 255) + 0.11 * (n & 255)) < 70; };
  const BUILD = { slim: 0.86, regular: 1, broad: 1.18 };

  Ch.person = (ctx, o) => {
    const st = Object.assign({}, Ch.PERSON_STYLE, o.style || {});
    if (!st.skinDark) st.skinDark = st.skin === C.skin ? C.skinDark : shade(st.skin, 0.84);
    const {
      x, y, s = 1, sx = 1, sy = 1, rot = 0, pose = 'sit', headRot = 0, headX = 0, headY = 0,
      eyes = 'normal', look = 0, lookY = 0, blink = 0, brows = 'neutral', mouth = 'smile',
      handL, handR, knee = [0, 0], pillow = 0, blanket = false, sweat = 0, blush = 0, seed = 300,
      shadow = true, legBend = 0, jersey = true, scarf = false, crossArms = false,
      gesture = null, walk = 0,
    } = o;
    const outfit = st.outfit, dress = outfit === 'dress', kameez = outfit === 'kameez';
    const robe = ROBES.includes(outfit), suit = outfit === 'suit';
    const robeCol = st.robe || ROBE[outfit] || st.shirt;
    if (robe) { if (outfit !== 'sari') st.shirt = robeCol; st.pants = robeCol; }
    if (suit) st.pants = st.pants || robeCol;
    let bottoms = dress ? 'skirt' : robe || suit ? 'pants' : st.bottoms;
    const loose = bottoms === 'shalwar'; // loose trousers
    const dark = isDark(st.shirt);
    const detail = dark ? '#5E5B66' : shade(st.shirt, 0.7); // seams/buttons that read on any fabric
    const legCol = robe ? robeCol : st.pants || st.shorts; // colour of shorts / pants / skirt
    const skirtCol = dress ? st.shirt : legCol;
    const sleeves = st.sleeves || SLEEVES[outfit] || 'short';
    const bw = BUILD[st.build] || 1;
    const hs = st.hairStyle;
    ctx.save();
    ctx.translate(x, y);
    if (shadow && pose !== 'sit') {
      ctx.fillStyle = 'rgba(20,10,20,0.22)';
      ctx.beginPath(); ctx.ellipse(0, 4, 110 * s, 14 * s, 0, 0, Math.PI * 2); ctx.fill();
    }
    // walking (front view): the body bobs twice per cycle and sways; `walk` is the cycle phase (see Ch.walk)
    const wph = 2 * Math.PI * walk;
    if (pose === 'walk') ctx.translate(0, -Math.abs(Math.sin(wph)) * 12 * s);
    ctx.scale(s * sx, s * sy);
    ctx.rotate(rot + (pose === 'walk' ? Math.sin(wph) * 0.025 : 0));
    const hip = pose === 'sit' ? 0 : -150;
    const sh = hip - 172; // shoulder line
    const headC = [headX, sh - 82 + headY];
    const skirtHatch = { color: 'rgba(0,0,0,0.12)', gap: 7 };

    // ---- legs ----
    if (pose === 'sit') {
      const pants = bottoms === 'pants' || loose;
      for (const sd of [-1, 1]) {
        const lift = sd < 0 ? knee[0] : knee[1];
        const K = [sd * 50, 58 - lift * 18];
        const F = [sd * 56, 150 - lift * 24];
        G.limb(ctx, [K, [(K[0] + F[0]) / 2 + sd * 2, (K[1] + F[1]) / 2], F], { color: pants ? legCol : st.skin, lw: pants ? 34 : 30, seed: seed + 1 + sd });
        G.ellipse(ctx, F[0] + sd * 4, F[1] + 4, 32, 16, { fill: st.shoes, lw: 3.5, seed: seed + 3 + sd, hatch: { color: 'rgba(0,0,0,0.1)', gap: 6 } });
        G.line(ctx, [[F[0] - 22 + sd * 4, F[1] + 6], [F[0] + 26 + sd * 4, F[1] + 6]], { lw: 2.5, color: st.shirt, seed: seed + 5 + sd });
      }
      // thighs coming toward camera + knee caps
      for (const sd of [-1, 1]) {
        const lift = sd < 0 ? knee[0] : knee[1];
        G.ellipse(ctx, sd * 50, 44 - lift * 18, 23, 18, { fill: pants ? legCol : st.skin, lw: 4, seed: seed + 8 + sd });
        if (bottoms !== 'skirt') G.rrect(ctx, sd * 50 - 44, -22 - lift * 8, 88, 70, 30, { fill: legCol, lw: 4, seed: seed + 7 + sd, hatch: { color: 'rgba(255,255,255,0.08)', gap: 7 } });
      }
      if (bottoms === 'skirt') G.rrect(ctx, -104 * bw, -30, 208 * bw, 80, 34, { fill: skirtCol, lw: 4, seed: seed + 71, hatch: skirtHatch });
    } else {
      const pants = bottoms === 'pants' || loose;
      for (const sd of [-1, 1]) {
        let lift = 0, swing = 0;
        if (pose === 'walk') { const a = wph + (sd > 0 ? Math.PI : 0); lift = Math.max(0, Math.sin(a)); swing = Math.cos(a); }
        const Hp = [sd * 36, hip + 30];
        const F = [sd * (46 + legBend * 30) + swing * 8, 0 - legBend * 10 - lift * 34];
        const K = [(Hp[0] + F[0]) / 2 + sd * legBend * 40 + sd * lift * 12, (Hp[1] + F[1]) / 2 - lift * 14];
        G.limb(ctx, [Hp, K, F], { color: pants ? legCol : st.skin, lw: loose ? 44 : pants ? 34 : 30, seed: seed + 1 + sd });
        G.rrect(ctx, F[0] - 30 + sd * 8, F[1] - 18, 58, 26, 11, { fill: st.shoes, lw: 3.5, seed: seed + 3 + sd, hatch: { color: 'rgba(0,0,0,0.1)', gap: 6 } });
      }
      if (bottoms === 'skirt') G.poly(ctx, [[-78 * bw, hip - 26], [78 * bw, hip - 26], [104 * bw, hip + 74], [-104 * bw, hip + 74]], { fill: skirtCol, lw: 4, seed: seed + 71, step: 22, hatch: skirtHatch });
      else G.rrect(ctx, -80 * bw, hip - 18, 160 * bw, pants ? 46 : 70, 18, { fill: legCol, lw: 4, seed: seed + 7, hatch: { color: 'rgba(255,255,255,0.08)', gap: 7 } });
    }

    // ---- arms (IK now, drawn last so hands can hold things) ----
    const SL = [-70 * bw, sh + 16], SR = [70 * bw, sh + 16];
    const aw = pose === 'walk' ? Math.cos(wph) : 0; // arms swing against the legs
    const restL = pose === 'sit' ? [-62, -6] : [-92 - 6 * aw, hip - 30 - 16 * Math.max(0, aw)];
    const restR = pose === 'sit' ? [62, -6] : [92 - 6 * aw, hip - 30 - 16 * Math.max(0, -aw)];
    const gh = Ch.gestureHands(gesture, { sh, hip, t: G.t });
    let pL = handL || gh.L || restL, pR = handR || gh.R || restR;
    if (crossArms) { pL = [48 * bw, sh + 94]; pR = [-50 * bw, sh + 80]; }
    if (pillow > 0) {
      const py = U.lerp(-20, headC[1] + 62, pillow);
      pL = [-82, py + 10];
      pR = [82, py + 10];
    }
    // elbows always bend outward, away from the body
    const armL = Ch.ik(SL, pL, 82, 80, pL[1] < sh ? -1 : 1);
    const armR = Ch.ik(SR, pR, 82, 80, pR[1] < sh ? 1 : -1);

    // ---- torso ----
    if (outfit === 'hoodie') G.rrect(ctx, -72 * bw, sh - 46, 144 * bw, 74, 34, { fill: shade(st.shirt, 0.8), lw: 4, seed: seed + 72 });
    const torsoHatch = dark ? { color: 'rgba(255,255,255,0.07)', gap: 7 } : { color: 'rgba(120,40,10,0.22)', gap: 7 };
    if (kameez) {
      // sitting: the long shirt drapes over the thighs
      if (pose === 'sit') G.rrect(ctx, -96 * bw, -34, 192 * bw, 84, 30, { fill: st.shirt, lw: 4, seed: seed + 140, hatch: torsoHatch });
    }
    if (robe && pose === 'sit') G.rrect(ctx, -100 * bw, -34, 200 * bw, 88, 30, { fill: robeCol, lw: 4, seed: seed + 140, hatch: torsoHatch });
    // a sari's long wrapped skirt (the pleats show as lines), under the blouse
    if (outfit === 'sari' && pose !== 'sit') {
      G.poly(ctx, [[-78 * bw, hip - 20], [78 * bw, hip - 20], [96 * bw, -12], [-96 * bw, -12]], { fill: robeCol, lw: 4, seed: seed + 142, step: 22, hatch: skirtHatch });
      for (let k = 0; k < 4; k++) G.line(ctx, [[8 + k * 9, hip + 10], [12 + k * 13, -16]], { lw: 2.5, color: shade(robeCol, 0.72), seed: seed + 143 + k });
      G.line(ctx, [[-96 * bw, -16], [96 * bw, -16]], { lw: 7, color: st.trim === C.teal ? '#E2B33C' : st.trim, seed: seed + 148 });
    }
    // standing in a kameez, the shirt is ONE long piece from shoulders to knees (no waist seam);
    // a thobe or an abaya runs all the way to the ankles
    const longShirt = kameez && pose !== 'sit';
    const fullRobe = (outfit === 'thobe' || outfit === 'abaya') && pose !== 'sit';
    const torsoPts = fullRobe
      ? [[-78 * bw, sh], [78 * bw, sh], [82 * bw, hip - 10], [98 * bw, -16], [-98 * bw, -16], [-82 * bw, hip - 10]]
      : longShirt
        ? [[-78 * bw, sh], [78 * bw, sh], [80 * bw, hip - 10], [90 * bw, hip + 104], [-90 * bw, hip + 104], [-80 * bw, hip - 10]]
        : [[-78 * bw, sh], [78 * bw, sh], [74 * bw, hip + (suit ? 30 : 10)], [-74 * bw, hip + (suit ? 30 : 10)]];
    const torso = G.poly(ctx, torsoPts, { fill: suit ? robeCol : st.shirt, lw: 4.5, seed: seed + 9, step: 20, hatch: torsoHatch });
    if (fullRobe) {
      G.line(ctx, [[0, sh + 14], [0, outfit === 'abaya' ? -20 : sh + 110]], { lw: 3, color: outfit === 'abaya' ? (st.trim === C.teal ? '#8C6A9E' : st.trim) : detail, seed: seed + 144 });
      if (outfit === 'thobe') { G.ellipse(ctx, 0, sh + 2, 26, 12, { fill: shade(robeCol, 0.9), lw: 3, seed: seed + 145 }); for (let k = 0; k < 3; k++) G.ellipse(ctx, 0, sh + 36 + k * 22, 3, 3, { fill: detail, lw: 1, seed: seed + 146 + k, amp: 0.3 }); }
    }
    if (suit) {
      // shirt V, tie, lapels
      G.poly(ctx, [[-30, sh - 2], [30, sh - 2], [0, sh + 96]], { fill: st.collar === C.cream ? '#F4F2EC' : st.collar, lw: 3, seed: seed + 150, step: 12 });
      G.poly(ctx, [[-8, sh + 8], [8, sh + 8], [12, sh + 70], [0, sh + 90], [-12, sh + 70]], { fill: st.trim === C.teal ? '#B23A3A' : st.trim, lw: 2.5, seed: seed + 151, step: 10 });
      for (const sd of [-1, 1]) G.poly(ctx, [[sd * 30, sh - 2], [sd * 58 * bw, sh + 6], [sd * 20, sh + 110], [sd * 4, sh + 100]], { fill: shade(robeCol, 0.8), lw: 3.5, seed: seed + 152 + sd, step: 14 });
      G.ellipse(ctx, 0, hip - 8, 4, 4, { fill: shade(robeCol, 0.6), lw: 1.5, seed: seed + 155, amp: 0.3 });
    }
    if (outfit === 'sari') {
      // the pallu: over the blouse from the right hip to the left shoulder, with a gold border
      const border = st.trim === C.teal ? '#E2B33C' : st.trim;
      const pal = pose === 'sit'
        ? [[72 * bw, -20], [40 * bw, -30], [-50 * bw, sh + 6], [-84 * bw, sh + 4], [-88 * bw, sh + 40], [-10, -10]]
        : [[74 * bw, hip + 20], [50 * bw, hip + 30], [-44 * bw, sh + 2], [-84 * bw, sh - 2], [-94 * bw, sh + 60], [-20, hip + 6]];
      G.poly(ctx, pal, { fill: robeCol, lw: 4, seed: seed + 156, step: 16, hatch: skirtHatch });
      G.line(ctx, [pal[0], pal[1], pal[2], pal[3]], { lw: 6, color: border, seed: seed + 157 });
    }
    if (longShirt) for (const sd of [-1, 1]) G.line(ctx, [[sd * 86 * bw, hip + 40], [sd * 89 * bw, hip + 100]], { lw: 3, color: detail, seed: seed + 141 + sd });
    if (outfit === 'jersey') {
      ctx.save();
      ctx.beginPath(); G.path(ctx, torso); ctx.clip();
      ctx.fillStyle = st.trim; // side panels
      ctx.fillRect(-80 * bw, sh, 16, hip - sh + 20);
      ctx.fillRect(80 * bw - 16, sh, 16, hip - sh + 20);
      ctx.restore();
      G.poly(ctx, [[-26, sh - 2], [26, sh - 2], [0, sh + 30]], { fill: st.collar, lw: 3.5, seed: seed + 11, step: 12 });
      if (jersey && st.name) G.text(ctx, st.name, 0, sh + 70, { size: 30, fam: 'Bungee', weight: 400, color: C.cream, align: 'center', stroke: C.ink, strokeW: 5 });
      if (jersey && st.number) G.text(ctx, String(st.number), 0, sh + (st.name ? 142 : 110), { size: 70, fam: 'Bungee', weight: 400, color: C.cream, align: 'center', stroke: C.ink, strokeW: 7 });
    } else if (outfit === 'tee' || dress) {
      G.ellipse(ctx, 0, sh + 2, dress ? 38 : 30, dress ? 24 : 14, { fill: dress ? st.skin : shade(st.shirt, 0.82), lw: 3.5, seed: seed + 73 });
      if (dress) G.line(ctx, [[-74 * bw, hip - 26], [74 * bw, hip - 26]], { lw: 4, color: shade(st.shirt, 0.7), seed: seed + 74 });
    } else if (outfit === 'hoodie') {
      G.rrect(ctx, -52 * bw, hip - 84, 104 * bw, 56, 18, { fill: shade(st.shirt, 0.9), lw: 3.5, seed: seed + 75 });
      for (const sd of [-1, 1]) {
        G.line(ctx, [[sd * 14, sh + 4], [sd * 17, sh + 64]], { lw: 3, color: C.cream, seed: seed + 76 + sd });
        G.ellipse(ctx, sd * 17, sh + 68, 4, 4, { fill: C.cream, lw: 2, seed: seed + 78 + sd, amp: 0.4 });
      }
    } else if (outfit === 'shirt' || kameez) {
      const collar = kameez ? st.shirt : st.collar;
      for (const sd of [-1, 1]) G.poly(ctx, [[sd * 30, sh - 4], [sd * 4, sh - 2], [sd * 18, sh + 28]], { fill: collar, lw: 3.5, seed: seed + 80 + sd, step: 12, stroke: dark ? detail : C.ink });
      G.line(ctx, [[0, sh + 12], [0, kameez ? sh + 120 : hip + 6]], { lw: 3, color: detail, seed: seed + 82 });
      for (let k = 0; k < 4; k++) G.ellipse(ctx, 7, sh + 30 + k * (kameez ? 26 : 34), 3.5, 3.5, { fill: dark ? '#2E2C33' : C.cream, stroke: dark ? detail : C.ink, lw: 1.5, seed: seed + 83 + k, amp: 0.3 });
      G.rrect(ctx, 26 * bw, sh + 40, 32, 34, 4, { lw: 3, seed: seed + 88, stroke: dark ? detail : C.ink });
    }
    if (st.print && outfit !== 'jersey') G.text(ctx, st.print, 0, sh + (outfit === 'hoodie' ? 70 : 92), { size: st.print.length > 6 ? 26 : 34, fam: 'Bungee', weight: 400, color: st.printColor, align: 'center', stroke: C.ink, strokeW: 5 });

    // arms
    const drawArm = (S, a, sd) => {
      G.limb(ctx, [S, a.E, a.H], { color: st.skin, lw: 27, seed: seed + 13 + sd });
      if (sleeves === 'short') {
        const sx2 = S[0] + (a.E[0] - S[0]) * 0.42, sy2 = S[1] + (a.E[1] - S[1]) * 0.42;
        G.limb(ctx, [[S[0] - sd * 4, S[1] - 6], [sx2, sy2]], { color: st.shirt, lw: 36, seed: seed + 15 + sd });
      } else if (sleeves === 'long') {
        const wx = a.E[0] + (a.H[0] - a.E[0]) * 0.78, wy = a.E[1] + (a.H[1] - a.E[1]) * 0.78;
        const sc = suit ? robeCol : st.shirt;
        G.limb(ctx, [[S[0] - sd * 4, S[1] - 6], a.E, [wx, wy]], { color: isDark(sc) ? shade(sc, 1.45) : sc, lw: outfit === 'abaya' ? 44 : 34, seed: seed + 15 + sd });
      }
      G.ellipse(ctx, a.H[0], a.H[1], 20, 20, { fill: st.skin, lw: 4, seed: seed + 17 + sd });
      Ch.gestureProp(ctx, gesture, sd, S, a, { seed, skin: st.skin });
    };
    // neck
    G.rrect(ctx, -20, sh - 24, 40, 30, 8, { fill: st.skinDark, lw: 3.5, seed: seed + 19 });
    if (scarf) Ch.scarf(ctx, -96, sh - 34, 192, 0.05 * Math.sin(G.t * 2), seed + 60);

    // ---- head ----
    ctx.save();
    ctx.translate(headC[0], headC[1]);
    ctx.rotate(headRot);
    // hair behind the head
    if (hs === 'long') {
      G.poly(ctx, [[-70, -48], [-42, -80], [0, -88], [42, -80], [70, -48], [80, 10], [86, 96], [66, 130], [36, 118], [40, 50], [-40, 50], [-36, 118], [-66, 130], [-86, 96], [-80, 10]], { fill: st.hair, lw: 4, seed: seed + 90, step: 16 });
    } else if (hs === 'curly') {
      for (let k = 0; k <= 13; k++) {
        const a = Math.PI + (k / 13) * Math.PI;
        G.ellipse(ctx, Math.cos(a) * 70, Math.sin(a) * 74 - 4, 26, 26, { fill: st.hair, lw: 3.5, seed: seed + 90 + k, amp: 1 });
      }
      for (const sd of [-1, 1]) {
        G.ellipse(ctx, sd * 74, 12, 22, 24, { fill: st.hair, lw: 3.5, seed: seed + 105 + sd, amp: 1 });
        G.ellipse(ctx, sd * 68, 36, 17, 18, { fill: st.hair, lw: 3.5, seed: seed + 108 + sd, amp: 1 });
      }
    } else if (hs === 'bun') {
      G.ellipse(ctx, 0, -98, 32, 27, { fill: st.hair, lw: 4, seed: seed + 90 });
      G.rrect(ctx, -16, -76, 32, 10, 4, { fill: shade(st.hair, 1.8), lw: 2.5, seed: seed + 91 });
    } else if (hs === 'ponytail') {
      G.poly(ctx, [[48, -62], [86, -52], [106, -12], [102, 48], [84, 94], [74, 42], [68, -8]], { fill: st.hair, lw: 4, seed: seed + 90, step: 14 });
      G.rrect(ctx, 60, -56, 22, 16, 5, { fill: C.kit, lw: 2.5, seed: seed + 91 });
    }
    if (st.headwear === 'ghutra') {
      G.poly(ctx, [[-82, -30], [-60, -84], [0, -100], [60, -84], [82, -30], [92, 60], [104, 130], [0, 150], [-104, 130], [-92, 60]], { fill: st.headwearColor || '#F5F3EE', lw: 4, seed: seed + 92, step: 18, hatch: { color: 'rgba(0,0,0,0.08)', gap: 8 } });
    }
    if (hs === 'hijab') {
      G.poly(ctx, [[-80, -10], [-72, -62], [-40, -94], [0, -102], [40, -94], [72, -62], [80, -10], [86, 60], [100, 124], [62, 146], [0, 154], [-62, 146], [-100, 124], [-86, 60]], { fill: st.hijab, lw: 4, seed: seed + 90, step: 18, hatch: { color: 'rgba(0,0,0,0.12)', gap: 8 } });
    }
    // ears
    if (hs !== 'hijab' && st.headwear !== 'ghutra') {
      G.ellipse(ctx, -64, 6, 14, 18, { fill: st.skin, lw: 3.5, seed: seed + 21 });
      G.ellipse(ctx, 64, 6, 14, 18, { fill: st.skin, lw: 3.5, seed: seed + 22 });
    }
    G.ellipse(ctx, 0, 0, 64, 70, { fill: st.skin, lw: 4.5, seed: seed + 23, hatch: { color: 'rgba(120,60,30,0.14)', gap: 8 } });
    // hair in front
    const cap = [[-66, 2], [-62, -42], [-36, -70], [0, -78], [36, -70], [62, -42], [66, 2], [56, -30], [0, -50], [-56, -30]];
    if (hs === 'quiff') {
      G.poly(ctx, [[-66, 2], [-62, -40], [-40, -66], [-4, -80], [36, -76], [62, -52], [68, -8], [52, -30], [30, -44], [6, -40], [-18, -48], [-44, -36], [-56, -10]], { fill: st.hair, lw: 4, seed: seed + 25, step: 14 });
      G.poly(ctx, [[-10, -78], [8, -96], [30, -86], [16, -74]], { fill: st.hair, lw: 3.5, seed: seed + 26, step: 10 });
    } else if (hs === 'curlytop') {
      // short sides, a mop of dark curls on top (Afaq's hair)
      G.poly(ctx, [[-66, 4], [-64, -36], [-44, -64], [0, -74], [44, -64], [64, -36], [66, 4], [54, -22], [28, -34], [0, -36], [-28, -34], [-54, -22]], { fill: st.hair, lw: 4, seed: seed + 25, step: 14 });
      const curls = [[-50, -58, 17], [-30, -74, 20], [-6, -82, 21], [18, -80, 20], [40, -68, 18], [56, -50, 14], [-40, -44, 13], [-16, -54, 14], [8, -58, 14], [30, -50, 13]];
      curls.forEach(([cx, cy, r], k) => G.ellipse(ctx, cx, cy, r, r * 0.92, { fill: st.hair, lw: 3, seed: seed + 150 + k, amp: 0.9 }));
      for (let k = 0; k < 6; k++) G.line(ctx, [[-40 + k * 16, -70 + (k % 2) * 10], [-34 + k * 16, -64 + (k % 2) * 10], [-38 + k * 16, -58 + (k % 2) * 10]], { lw: 2.2, color: 'rgba(255,255,255,0.18)', seed: seed + 165 + k, step: 4 });
    } else if (hs === 'short') {
      G.poly(ctx, [[-66, 0], [-63, -40], [-38, -68], [0, -78], [38, -70], [63, -42], [66, 0], [54, -28], [22, -42], [-14, -44], [-50, -30]], { fill: st.hair, lw: 4, seed: seed + 25, step: 14 });
    } else if (hs === 'buzz') {
      G.poly(ctx, [[-64, -6], [-60, -42], [-34, -66], [0, -72], [34, -66], [60, -42], [64, -6], [52, -30], [0, -50], [-52, -30]], { fill: st.hair, lw: 3, seed: seed + 25, step: 14, alpha: 0.85, hatch: { color: 'rgba(255,255,255,0.18)', gap: 4 } });
    } else if (hs === 'long') {
      G.poly(ctx, [[-66, 6], [-64, -40], [-40, -68], [-2, -80], [40, -72], [64, -44], [67, 4], [56, -24], [40, -38], [14, -44], [-6, -34], [-30, -46], [-54, -22]], { fill: st.hair, lw: 4, seed: seed + 25, step: 14 });
    } else if (hs === 'curly') {
      for (let k = 0; k < 6; k++) G.ellipse(ctx, -46 + k * 18.4, -54 + (k % 2) * 6, 15, 15, { fill: st.hair, lw: 3, seed: seed + 110 + k, amp: 0.8 });
    } else if (hs === 'bun' || hs === 'ponytail') {
      G.poly(ctx, cap, { fill: st.hair, lw: 4, seed: seed + 25, step: 14 });
    } else if (hs === 'bald') {
      G.line(ctx, [[-34, -54], [-12, -62]], { lw: 5, color: 'rgba(255,255,255,0.5)', seed: seed + 25 });
    } else if (hs === 'hijab') {
      const band = [];
      for (let i = 0; i <= 20; i++) { const a = (150 + (i / 20) * 240) * Math.PI / 180; band.push([Math.cos(a) * 78, -2 + Math.sin(a) * 86]); }
      for (let i = 20; i >= 0; i--) { const a = (150 + (i / 20) * 240) * Math.PI / 180; band.push([Math.cos(a) * 58, 8 + Math.sin(a) * 66]); }
      G.shape(ctx, band, { fill: st.hijab, lw: 4, seed: seed + 25, hatch: { color: 'rgba(0,0,0,0.12)', gap: 8 } });
    }
    Ch.headwear(ctx, st, seed);
    if (st.freckles) {
      ctx.fillStyle = alpha(shade(st.skin, 0.6), 0.8);
      for (const sd of [-1, 1]) for (const [dx, dy] of [[-6, 0], [4, -4], [8, 6], [-2, 9]]) { ctx.beginPath(); ctx.arc(sd * 36 + dx, 16 + dy, 2.2, 0, Math.PI * 2); ctx.fill(); }
    }
    // facial hair
    const mx = look * 8, my = 40;
    if (st.facialHair === 'stubble') {
      ctx.save();
      ctx.beginPath(); ctx.ellipse(0, 0, 63, 69, 0, 0, Math.PI * 2); ctx.clip();
      ctx.beginPath(); ctx.rect(-70, 18, 140, 70); ctx.clip();
      G.hatch(ctx, [-70, 18, 70, 80], { color: alpha(st.hair, 0.35), gap: 4, angle: 0.7, lw: 1.6, seed: seed + 120 });
      ctx.restore();
    } else if (st.facialHair === 'beard') {
      G.poly(ctx, [[-64, -2], [-62, 34], [-44, 64], [-14, 80], [14, 80], [44, 64], [62, 34], [64, -2], [52, 16], [30, 26], [0, 30], [-30, 26], [-52, 16]], { fill: st.hair, lw: 4, seed: seed + 120, step: 14 });
      G.ellipse(ctx, mx, my, 22, 11, { fill: st.skin, lw: 2, seed: seed + 121 });
    } else if (st.facialHair === 'trimmed') {
      // short, neat beard along the jaw, fuller at the chin, joined to a mustache
      G.shape(ctx, [[-64, 0], [-62, 30], [-46, 58], [-20, 74], [0, 79], [20, 74], [46, 58], [62, 30], [64, 0], [56, 18], [40, 38], [20, 52], [0, 56], [-20, 52], [-40, 38], [-56, 18]], { fill: st.hair, lw: 3.5, seed: seed + 120, hatch: { color: 'rgba(255,255,255,0.12)', gap: 4 } });
      G.poly(ctx, [[-24, 33], [-11, 27], [0, 30], [11, 27], [24, 33], [11, 36], [0, 34], [-11, 36]], { fill: st.hair, lw: 2.5, seed: seed + 121, step: 8 });
      for (const sd of [-1, 1]) G.line(ctx, [[sd * 23, 34], [sd * 26, 50]], { lw: 5, color: st.hair, seed: seed + 122 + sd });
    } else if (st.facialHair === 'mustache') {
      G.poly(ctx, [[-28, 34], [-16, 26], [-2, 30], [2, 30], [16, 26], [28, 34], [16, 38], [0, 34], [-16, 38]], { fill: st.hair, lw: 2.5, seed: seed + 120, step: 8 });
    }
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
    // glasses
    if (st.glasses === 'round' || st.glasses === 'square' || st.glasses === 'sun') {
      const gx = look * 10;
      const sun = st.glasses === 'sun';
      const frame = st.glassesColor || (sun ? '#C9A063' : C.ink);
      for (const sd of [-1, 1]) {
        if (st.glasses === 'square') G.rrect(ctx, sd * 26 + gx - 19, -20, 38, 29, 7, { fill: 'rgba(255,255,255,0.16)', lw: 4, stroke: frame, seed: seed + 125 + sd });
        else G.ellipse(ctx, sd * 27 + gx, -6, sun ? 20 : 18, sun ? 17 : 17, { fill: sun ? '#34323D' : 'rgba(255,255,255,0.16)', lw: sun ? 5 : 4, stroke: frame, seed: seed + 125 + sd, second: !sun });
        if (sun) {
          G.line(ctx, [[sd * 27 + gx - 11, -9], [sd * 27 + gx - 2, -18]], { lw: 3.5, color: 'rgba(255,255,255,0.6)', seed: seed + 131 + sd });
          G.line(ctx, [[sd * 27 + gx + 2, -3], [sd * 27 + gx + 7, -8]], { lw: 2.5, color: 'rgba(255,255,255,0.4)', seed: seed + 133 + sd });
        }
        G.line(ctx, [[sd * (sun ? 47 : 44) + gx, -9], [sd * 62, -4]], { lw: 3.5, color: frame, seed: seed + 128 + sd });
      }
      G.line(ctx, [[-7 + gx, -10], [7 + gx, -10]], { lw: 3.5, color: frame, seed: seed + 130 });
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
    // mouth (an object { open, wide, talking } from Subs.mouth lip-syncs it)
    if (mouth && typeof mouth === 'object') {
      const op = Math.max(0, Math.min(1, mouth.open || 0)), wd = mouth.wide ?? 0.5;
      if (!mouth.talking || op < 0.08) G.line(ctx, [[mx - 14, my - 2], [mx, my + 3], [mx + 14, my - 2]], { lw: 4.5, seed: seed + 39 });
      else {
        const ww = 9 + wd * 12 + op * 4, hh = 3 + op * 15;
        G.ellipse(ctx, mx, my + 2, ww, hh, { fill: '#3A1D1A', lw: 3.5, seed: seed + 40, amp: 0.6 });
        if (op > 0.45) { ctx.save(); ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.ellipse(mx, my + 2 - hh * 0.62, ww * 0.62, hh * 0.22, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
      }
    } else if (mouth === 'flat') G.line(ctx, [[mx - 14, my], [mx + 14, my]], { lw: 4.5, seed: seed + 37 });
    else if (mouth === 'smirk') G.line(ctx, [[mx - 15, my + 1], [mx + 2, my + 4], [mx + 18, my - 7]], { lw: 4.5, seed: seed + 42 });
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
    if (crossArms) {
      const sleeve = sleeves === 'none' ? st.skin : dark ? shade(st.shirt, 1.45) : st.shirt;
      const long = sleeves === 'long';
      const ey = sh + 92;
      for (const sd of [-1, 1]) {
        const S = sd < 0 ? SL : SR;
        G.limb(ctx, [S, [sd * 94 * bw, ey - 10]], { color: long ? sleeve : st.skin, lw: 32, seed: seed + 170 + sd });
        if (!long && sleeves === 'short') G.limb(ctx, [[S[0] - sd * 4, S[1] - 6], [S[0] + sd * 8, S[1] + 34]], { color: st.shirt, lw: 36, seed: seed + 172 + sd });
      }
      // lower forearm (tucked hand on the right), then the upper forearm on top (hand on the left)
      G.limb(ctx, [[-96 * bw, ey + 4], [0, ey + 10], [80 * bw, ey + 2]], { color: long ? sleeve : st.skin, lw: 34, seed: seed + 174 });
      G.ellipse(ctx, 84 * bw, ey - 8, 17, 15, { fill: st.skin, lw: 3.5, seed: seed + 175 });
      G.limb(ctx, [[96 * bw, ey + 24], [0, ey + 30], [-80 * bw, ey + 20]], { color: long ? sleeve : st.skin, lw: 34, seed: seed + 176 });
      G.ellipse(ctx, -86 * bw, ey + 10, 17, 15, { fill: st.skin, lw: 3.5, seed: seed + 177 });
    } else {
      drawArm(SL, armL, -1);
      drawArm(SR, armR, 1);
    }
    if (blanket) Ch.blanket(ctx, sh, hip, seed + 50);
    ctx.restore();
  };

  // Named looks. Use: Ch.person(ctx, { ..., style: Ch.STYLES.afaq })  or extend: { ...Ch.STYLES.afaq, glasses: 'none' }
  Ch.STYLES = {
    // Afaq (github.com/i-afaqrashid), who made this plugin: curly black hair, trimmed beard,
    // round gold sunglasses, black shalwar kameez, arms crossed with a smirk (pass crossArms: true, mouth: 'smirk').
    afaq: { skin: '#C68B61', hair: '#1C1715', hairStyle: 'curlytop', facialHair: 'trimmed', glasses: 'sun', outfit: 'kameez', shirt: '#24232A', bottoms: 'shalwar', shorts: '#24232A', build: 'broad', shoes: '#4A3A32' },
    // the same Afaq as a football fan in the custom #10 jersey (eyes visible for acting)
    afaqFan: { skin: '#C68B61', hair: '#1C1715', hairStyle: 'curlytop', facialHair: 'trimmed', outfit: 'jersey', name: 'AFAQ', number: '10', build: 'broad' },
  };

  // ---- gestures: where the hands go (sh = shoulder line, hip = hip line, in the person's own units) ----
  // wave · point · pointUp · thumbsUp · phone · typing · cheer · shrug · facepalm · think · clap · akimbo ·
  // dua (hands raised, palms up) · mic (holding a microphone) · bat (a cricket batting stance)
  Ch.GESTURES = ['wave', 'point', 'pointUp', 'thumbsUp', 'phone', 'typing', 'cheer', 'shrug', 'facepalm', 'think', 'clap', 'akimbo', 'dua', 'mic', 'bat'];
  Ch.gestureHands = (g, { sh, hip, t }) => {
    switch (g) {
      case 'wave': return { R: [150 + Math.sin(t * 9) * 28, sh - 120] };
      case 'point': return { R: [205, sh + 18] };
      case 'pointUp': return { R: [118, sh - 175] };
      case 'thumbsUp': return { R: [104, sh + 66] };
      case 'phone': return { R: [26, sh + 74], L: [-24, sh + 98] };
      case 'typing': return { L: [-58, hip - 34 + Math.sin(t * 22) * 5], R: [58, hip - 34 + Math.sin(t * 22 + 2.1) * 5] };
      case 'cheer': { const b = Math.abs(Math.sin(t * 6)) * 16; return { L: [-150, sh - 150 - b], R: [150, sh - 150 - b] }; }
      case 'shrug': return { L: [-165, sh + 46], R: [165, sh + 46] };
      case 'facepalm': return { R: [14, sh - 78] };
      case 'think': return { R: [24, sh - 18] };
      case 'clap': { const c = Math.abs(Math.sin(t * 9)); return { L: [-(10 + 44 * c), sh + 70], R: [10 + 44 * c, sh + 70] }; }
      case 'akimbo': return { L: [-60, hip - 34], R: [60, hip - 34] };
      case 'dua': return { L: [-52, sh + 34], R: [52, sh + 34] };
      case 'mic': return { R: [34, sh - 30] };
      case 'bat': return { L: [66, hip - 28], R: [80, hip - 58] };
      default: return {};
    }
  };
  // what a hand holds or does (drawn right after the hand; sd -1 left, 1 right)
  Ch.gestureProp = (ctx, g, sd, S, a, { seed = 1, skin } = {}) => {
    const [hx, hy] = a.H;
    const dx = hx - a.E[0], dy = hy - a.E[1], d = Math.hypot(dx, dy) || 1;
    if (sd > 0 && (g === 'point' || g === 'pointUp')) {
      G.limb(ctx, [[hx, hy], [hx + (dx / d) * 34, hy + (dy / d) * 34]], { color: skin, lw: 10, outline: 3, seed: seed + 190 });
    } else if (sd > 0 && g === 'thumbsUp') {
      G.limb(ctx, [[hx - 2, hy - 8], [hx - 4, hy - 34]], { color: skin, lw: 12, outline: 3, seed: seed + 191 });
    } else if (sd > 0 && g === 'phone') {
      G.rrect(ctx, hx - 20, hy - 58, 44, 78, 8, { fill: '#26242C', lw: 3.5, seed: seed + 192 });
      ctx.save(); ctx.fillStyle = 'rgba(160,220,255,0.85)'; ctx.fillRect(hx - 14, hy - 51, 32, 60); ctx.restore();
      G.ellipse(ctx, hx - 6, hy + 4, 14, 12, { fill: skin, lw: 3, seed: seed + 193 });
    } else if (sd > 0 && g === 'mic') {
      G.limb(ctx, [[hx + 2, hy + 12], [hx + 6, hy + 46]], { color: '#2A2A30', lw: 12, outline: 3, seed: seed + 194 });
      G.ellipse(ctx, hx - 2, hy - 18, 15, 17, { fill: '#55535E', lw: 3.5, seed: seed + 195, hatch: { color: 'rgba(255,255,255,0.25)', gap: 4 } });
    } else if (sd > 0 && g === 'bat') {
      // a cricket bat held down and to the side: handle in the hands, blade toward the ground
      ctx.save(); ctx.translate(hx - 4, hy + 10); ctx.rotate(-0.35);
      G.rrect(ctx, -6, 0, 12, 60, 5, { fill: '#3A2A22', lw: 3, seed: seed + 196 });
      G.rrect(ctx, -22, 56, 44, 150, 12, { fill: '#E7C98E', lw: 4, seed: seed + 197, hatch: { color: 'rgba(140,90,30,0.2)', gap: 7 } });
      ctx.restore();
    }
  };
  // headwear on top of the hair: topi (prayer cap), cap, turban, ghutra (with its black agal ring)
  Ch.headwear = (ctx, st, seed = 1) => {
    const hw = st.headwear, col = st.headwearColor;
    if (!hw || hw === 'none') return;
    if (hw === 'topi') {
      G.shape(ctx, [[-60, -40], [-56, -64], [-34, -84], [0, -90], [34, -84], [56, -64], [60, -40], [0, -48]], { fill: col || '#F4F1E8', lw: 4, seed: seed + 200, hatch: { color: 'rgba(120,100,60,0.2)', gap: 5 } });
      G.line(ctx, [[-56, -52], [0, -60], [56, -52]], { lw: 2.5, color: 'rgba(160,130,70,0.8)', seed: seed + 201 });
    } else if (hw === 'cap') {
      G.shape(ctx, [[-64, -30], [-60, -66], [-30, -88], [10, -92], [46, -80], [64, -50], [66, -30]], { fill: col || C.kit, lw: 4, seed: seed + 200 });
      G.shape(ctx, [[-10, -32], [66, -34], [118, -24], [110, -14], [60, -18], [-6, -20]], { fill: shade(col || C.kit, 0.8), lw: 4, seed: seed + 202 });
      G.ellipse(ctx, 4, -90, 7, 5, { fill: shade(col || C.kit, 0.7), lw: 2, seed: seed + 203 });
    } else if (hw === 'turban') {
      const c = col || '#E8E1CF';
      G.shape(ctx, [[-72, -20], [-74, -62], [-48, -100], [0, -114], [48, -100], [74, -62], [72, -20], [0, -34]], { fill: c, lw: 4, seed: seed + 200 });
      for (let k = 0; k < 4; k++) G.line(ctx, [[-66 + k * 8, -30 - k * 20], [0, -46 - k * 18], [66 - k * 8, -64 - k * 12]], { lw: 3, color: shade(c, 0.78), seed: seed + 204 + k });
    } else if (hw === 'ghutra') {
      G.shape(ctx, [[-70, -18], [-66, -62], [-36, -90], [0, -96], [36, -90], [66, -62], [70, -18], [52, -40], [0, -54], [-52, -40]], { fill: col || '#F5F3EE', lw: 4, seed: seed + 200 });
      G.shape(ctx, [[-64, -52], [-36, -76], [0, -82], [36, -76], [64, -52], [58, -44], [0, -66], [-58, -44]], { fill: '#1E1C22', lw: 3, seed: seed + 205 });
    }
  };
  // walking across the frame: where a walker is at t, and the leg phase to pass as `walk`
  // (stride = the distance of one full cycle, in pixels at s = 1)
  Ch.walk = (t, { x0 = 0, speed = 220, t0 = 0, stride = 300, s = 1 } = {}) => {
    const d = Math.max(0, t - t0) * speed;
    return { x: x0 + d, walk: (d / (stride * s)) % 1, pose: 'walk' };
  };

  // ---- animals (front-ish, hand-drawn): dog, cat, bird ----
  // o: { x, y (ground), s, color, t, look, happy (0..1 wags + open mouth), pose: 'sit' | 'stand', flap (bird) }
  Ch.dog = (ctx, o) => {
    const { x, y, s = 1, color = '#C98A4B', ear = null, t = G.t, happy = 0.6, look = 0, pose = 'sit', seed = 700, shadow = true, bark = 0 } = o;
    const ec = ear || shade(color, 0.6);
    ctx.save(); ctx.translate(x, y);
    if (shadow) { ctx.fillStyle = 'rgba(20,10,20,0.2)'; ctx.beginPath(); ctx.ellipse(0, 4, 90 * s, 12 * s, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.scale(s, s);
    const wag = Math.sin(t * (6 + happy * 14)) * (0.3 + happy * 0.6);
    // tail
    ctx.save(); ctx.translate(64, -60); ctx.rotate(-0.9 + wag);
    G.limb(ctx, [[0, 0], [22, -28], [30, -60]], { color, lw: 16, seed: seed + 1 });
    ctx.restore();
    // body + legs
    if (pose === 'stand') { for (const lx of [-50, -22, 22, 50]) G.limb(ctx, [[lx, -60], [lx, -4]], { color, lw: 20, seed: seed + 2 + lx }); G.ellipse(ctx, 0, -80, 86, 44, { fill: color, lw: 4.5, seed: seed + 6 }); }
    else { G.ellipse(ctx, 0, -62, 70, 62, { fill: color, lw: 4.5, seed: seed + 6 }); for (const sd of [-1, 1]) G.ellipse(ctx, sd * 30, -8, 22, 14, { fill: color, lw: 4, seed: seed + 7 + sd }); G.ellipse(ctx, 0, -50, 36, 40, { fill: shade(color, 1.18), lw: 0, seed: seed + 9, amp: 0.6 }); }
    // head
    const hx = look * 10, hy = pose === 'stand' ? -150 : -150;
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(look * 0.12);
    for (const sd of [-1, 1]) { ctx.save(); ctx.translate(sd * 46, -24); ctx.rotate(sd * (0.5 + Math.sin(t * 3 + sd) * 0.05)); G.ellipse(ctx, 0, 24, 18, 36, { fill: ec, lw: 4, seed: seed + 10 + sd }); ctx.restore(); }
    G.ellipse(ctx, 0, 0, 56, 50, { fill: color, lw: 4.5, seed: seed + 12 });
    G.ellipse(ctx, 0, 24, 30, 22, { fill: shade(color, 1.22), lw: 3.5, seed: seed + 13 });
    G.ellipse(ctx, 0, 12, 11, 8, { fill: '#2A2320', lw: 2, seed: seed + 14 });
    for (const sd of [-1, 1]) { ctx.fillStyle = '#2A2320'; ctx.beginPath(); ctx.ellipse(sd * 22 + look * 5, -12, 6, 8, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#FFF'; ctx.beginPath(); ctx.arc(sd * 22 + look * 5 - 2, -15, 2, 0, Math.PI * 2); ctx.fill(); }
    const open = Math.max(bark, happy > 0.5 ? 0.6 : 0);
    if (open > 0.1) { G.ellipse(ctx, 0, 36, 13, 6 + open * 9, { fill: '#3A1D1A', lw: 3, seed: seed + 15 }); if (happy > 0.5) G.ellipse(ctx, 0, 44 + open * 5, 8, 8, { fill: '#E8718D', lw: 2.5, seed: seed + 16 }); }
    else G.line(ctx, [[-12, 34], [0, 38], [12, 34]], { lw: 3.5, seed: seed + 17 });
    ctx.restore();
    ctx.restore();
  };
  Ch.cat = (ctx, o) => {
    const { x, y, s = 1, color = '#8E8A94', t = G.t, look = 0, happy = 0.4, seed = 740, shadow = true, meow = 0 } = o;
    ctx.save(); ctx.translate(x, y);
    if (shadow) { ctx.fillStyle = 'rgba(20,10,20,0.2)'; ctx.beginPath(); ctx.ellipse(0, 4, 70 * s, 10 * s, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.scale(s, s);
    const sway = Math.sin(t * 2.2) * 0.35;
    G.line(ctx, [[46, -16], [80, -30 + sway * 20], [92, -70 + sway * 30], [78, -104 + sway * 36]], { color, lw: 14, seed: seed + 1, step: 10 });
    G.ellipse(ctx, 0, -56, 52, 56, { fill: color, lw: 4.5, seed: seed + 2 });
    for (const sd of [-1, 1]) G.ellipse(ctx, sd * 22, -6, 16, 10, { fill: color, lw: 3.5, seed: seed + 3 + sd });
    ctx.save(); ctx.translate(look * 8, -128);
    for (const sd of [-1, 1]) G.poly(ctx, [[sd * 20, -30], [sd * 44, -62], [sd * 48, -20]], { fill: color, lw: 4, seed: seed + 5 + sd, step: 12 });
    G.ellipse(ctx, 0, 0, 50, 42, { fill: color, lw: 4.5, seed: seed + 7 });
    for (const sd of [-1, 1]) { G.ellipse(ctx, sd * 18 + look * 4, -4, 8, 10, { fill: '#C8D86A', lw: 2.5, seed: seed + 8 + sd }); ctx.fillStyle = '#2A2320'; ctx.beginPath(); ctx.ellipse(sd * 18 + look * 5, -4, 2.4, 8, 0, 0, Math.PI * 2); ctx.fill(); }
    G.poly(ctx, [[-5, 8], [5, 8], [0, 14]], { fill: '#E8718D', lw: 2, seed: seed + 10, step: 6 });
    if (meow > 0.1) G.ellipse(ctx, 0, 22, 7, 4 + meow * 7, { fill: '#3A1D1A', lw: 2.5, seed: seed + 11 });
    else G.line(ctx, [[-10, 18], [0, 16 + happy * 4], [10, 18]], { lw: 3, seed: seed + 11 });
    for (const sd of [-1, 1]) for (let k = 0; k < 2; k++) G.line(ctx, [[sd * 16, 12 + k * 6], [sd * 50, 6 + k * 12]], { lw: 1.8, color: 'rgba(40,30,30,0.6)', seed: seed + 12 + k + sd });
    ctx.restore();
    ctx.restore();
  };
  Ch.bird = (ctx, o) => {
    const { x, y, s = 1, color = '#3FA89B', t = G.t, flap = 1, facing = 1, seed = 780, sing = 0 } = o;
    ctx.save(); ctx.translate(x, y); ctx.scale(s * facing, s);
    const w = Math.sin(t * 22) * flap;
    G.ellipse(ctx, 0, 0, 30, 24, { fill: color, lw: 3.5, seed: seed + 1 });
    G.poly(ctx, [[-26, -4], [-50, -14], [-46, 8]], { fill: shade(color, 0.8), lw: 3, seed: seed + 2, step: 10 });
    ctx.save(); ctx.rotate(-0.3 - w * 0.9); G.shape(ctx, [[-6, -6], [22, -34], [34, -10], [10, 4]], { fill: shade(color, 0.85), lw: 3, seed: seed + 3 }); ctx.restore();
    G.ellipse(ctx, 24, -14, 16, 15, { fill: color, lw: 3.5, seed: seed + 4 });
    ctx.fillStyle = '#2A2320'; ctx.beginPath(); ctx.arc(28, -17, 3, 0, Math.PI * 2); ctx.fill();
    G.poly(ctx, [[36, -16], [52, -12 + sing * 4], [36, -8]], { fill: '#F2B84B', lw: 2.5, seed: seed + 5, step: 8 });
    if (sing > 0.1) G.poly(ctx, [[36, -10], [50, -4 - sing * 2], [36, -6]], { fill: '#F2B84B', lw: 2, seed: seed + 6, step: 8 });
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
