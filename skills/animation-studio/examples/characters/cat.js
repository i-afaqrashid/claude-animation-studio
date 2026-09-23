// A custom character built only from G.* primitives: a sitting cat.
// Copy this file into a film project, add <script src="cat.js"></script> after
// engine/video/boot.js in index.html, then call Ch.cat(ctx, {...}) from film.js.
//
// Recipe used here (reuse it for any new character):
//  1. Origin at the feet, body built upward in local coordinates; x/y/s/sx/sy/rot applied first.
//  2. Draw back-to-front: tail -> haunches -> body -> paws -> ears -> head -> face -> accessories.
//  3. Every part gets its own seed (seed + n) so the boil is stable per part.
//  4. Expressions and poses are just parameters (eyes, mouth, tailWave, ...), animated from the score.
(function () {
  const G = globalThis.G, Ch = globalThis.Ch, C = G.C;
  const shade = Ch.shade;

  Ch.cat = (ctx, o) => {
    const {
      x, y, s = 1, sx = 1, sy = 1, rot = 0, seed = 700,
      color = '#E89A4E', pattern = 'tabby', // tabby | tuxedo | plain
      eyes = 'normal', look = 0, mouth = 'w', // eyes: normal | wide | happy | closed ; mouth: w | open | none
      tailWave = 0, earWiggle = 0, blush = 0, hat = null, collar = '#3FA89B', shadow = true,
    } = o;
    const dark = shade(color, 0.72);
    const white = '#FBF6EC';
    const hatch = { color: 'rgba(90,40,10,0.22)', gap: 7 };
    ctx.save();
    ctx.translate(x, y);
    if (shadow) { ctx.fillStyle = 'rgba(20,10,20,0.22)'; ctx.beginPath(); ctx.ellipse(0, 4, 100 * s, 13 * s, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.scale(s * sx, s * sy);
    ctx.rotate(rot);

    // tail (behind everything), waving
    const w = tailWave;
    G.limb(ctx, [[46, -24], [118, -34 + w * 10], [134 + w * 12, -104], [110 + w * 34, -150]], { color, lw: 26, seed: seed + 1 });
    if (pattern === 'tabby') for (let k = 0; k < 3; k++) G.line(ctx, [[112 + k * 8 + w * 6, -54 - k * 30], [136 + k * 4 + w * 10, -62 - k * 30]], { lw: 6, color: dark, seed: seed + 2 + k });

    // haunches + body
    for (const sd of [-1, 1]) G.ellipse(ctx, sd * 60, -34, 34, 38, { fill: color, lw: 4, seed: seed + 6 + sd, hatch });
    const body = G.poly(ctx, [[-66, 0], [66, 0], [78, -40], [62, -110], [34, -152], [-34, -152], [-62, -110], [-78, -40]], { fill: color, lw: 4.5, seed: seed + 9, step: 18, hatch });
    ctx.save();
    ctx.beginPath(); G.path(ctx, body); ctx.clip();
    if (pattern === 'tuxedo') G.ellipse(ctx, 0, -64, 40, 66, { fill: white, lw: 0, seed: seed + 10, second: false });
    if (pattern === 'tabby') for (const sd of [-1, 1]) for (let k = 0; k < 3; k++) G.line(ctx, [[sd * 80, -40 - k * 30], [sd * 50, -50 - k * 30]], { lw: 8, color: dark, seed: seed + 11 + k + (sd > 0 ? 5 : 0) });
    ctx.restore();

    // front paws
    for (const sd of [-1, 1]) {
      G.ellipse(ctx, sd * 26, -8, 24, 15, { fill: pattern === 'tuxedo' ? white : color, lw: 4, seed: seed + 20 + sd });
      for (const t of [-7, 7]) G.line(ctx, [[sd * 26 + t, -2], [sd * 26 + t, -10]], { lw: 2.5, seed: seed + 23 + t + sd });
    }

    // collar + bell
    if (collar) {
      G.rrect(ctx, -52, -156, 104, 16, 8, { fill: collar, lw: 3.5, seed: seed + 30 });
      G.ellipse(ctx, 0, -138, 10, 10, { fill: C.gold, lw: 3, seed: seed + 31 });
    }

    // head
    const hy = -214;
    for (const sd of [-1, 1]) {
      const wig = sd < 0 ? earWiggle : 0;
      ctx.save();
      ctx.translate(sd * 44, hy - 36);
      ctx.rotate(sd * 0.12 - wig * 0.3);
      G.poly(ctx, [[-24, 16], [0, -52], [24, 16]], { fill: color, lw: 4, seed: seed + 40 + sd, step: 12 });
      G.poly(ctx, [[-12, 10], [0, -30], [12, 10]], { fill: '#F2A7B5', lw: 0, seed: seed + 42 + sd, step: 10, second: false });
      ctx.restore();
    }
    G.ellipse(ctx, 0, hy, 76, 60, { fill: color, lw: 4.5, seed: seed + 45, hatch });
    if (pattern === 'tabby') {
      G.line(ctx, [[-16, hy - 58], [-8, hy - 38], [0, hy - 50], [8, hy - 38], [16, hy - 58]], { lw: 6, color: dark, seed: seed + 46, step: 6 });
      for (const sd of [-1, 1]) G.line(ctx, [[sd * 76, hy - 6], [sd * 56, hy - 2]], { lw: 6, color: dark, seed: seed + 47 + sd });
    }
    if (pattern === 'tuxedo') G.ellipse(ctx, 0, hy + 22, 36, 26, { fill: white, lw: 0, seed: seed + 49, second: false });

    // eyes
    for (const sd of [-1, 1]) {
      const ex = sd * 30 + look * 10, ey = hy - 8;
      if (eyes === 'happy') G.line(ctx, [[ex - 11, ey + 5], [ex, ey - 7], [ex + 11, ey + 5]], { lw: 5, seed: seed + 50 + sd });
      else if (eyes === 'closed') G.line(ctx, [[ex - 11, ey], [ex, ey + 7], [ex + 11, ey]], { lw: 4.5, seed: seed + 52 + sd });
      else {
        const big = eyes === 'wide' ? 1.3 : 1;
        G.ellipse(ctx, ex, ey, 12 * big, 16 * big, { fill: C.ink, lw: 2, seed: seed + 54 + sd, amp: 0.6 });
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath(); ctx.arc(ex - 4 * big, ey - 6 * big, 3.6 * big, 0, Math.PI * 2); ctx.fill();
      }
    }
    // nose, mouth, whiskers, blush
    G.poly(ctx, [[-8, hy + 12], [8, hy + 12], [0, hy + 20]], { fill: '#E8718D', lw: 2.5, seed: seed + 60, step: 8 });
    if (mouth === 'w') G.line(ctx, [[-14, hy + 28], [-7, hy + 32], [0, hy + 24], [7, hy + 32], [14, hy + 28]], { lw: 3.5, seed: seed + 61, step: 5 });
    else if (mouth === 'open') {
      const pts = [];
      for (let i = 0; i <= 12; i++) { const a = Math.PI * (i / 12); pts.push([Math.cos(a) * 16, hy + 24 + Math.sin(a) * 20]); }
      G.shape(ctx, pts, { fill: '#3A1D1A', lw: 3, seed: seed + 62 });
      ctx.fillStyle = '#E8718D'; ctx.beginPath(); ctx.ellipse(0, hy + 38, 9, 5, 0, 0, Math.PI * 2); ctx.fill();
    }
    for (const sd of [-1, 1]) for (let k = 0; k < 3; k++) G.line(ctx, [[sd * 40, hy + 14 + k * 7], [sd * 96, hy + 6 + k * 12]], { lw: 2.5, seed: seed + 64 + k + (sd > 0 ? 3 : 0), alpha: 0.85 });
    if (blush > 0) {
      ctx.save(); ctx.globalAlpha *= blush; ctx.fillStyle = '#E8718D';
      for (const sd of [-1, 1]) { ctx.beginPath(); ctx.ellipse(sd * 50, hy + 16, 12, 6, 0, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
    }

    // party hat
    if (hat === 'party') {
      ctx.save();
      ctx.translate(14, hy - 50);
      ctx.rotate(0.14);
      const cone = G.poly(ctx, [[-32, 0], [32, 0], [0, -96]], { fill: C.gold, lw: 4, seed: seed + 70, step: 14 });
      ctx.save(); ctx.beginPath(); G.path(ctx, cone); ctx.clip();
      for (let k = -2; k < 6; k++) G.line(ctx, [[-40, -k * 22], [40, -k * 22 - 26]], { lw: 8, color: C.pink, seed: seed + 71 + k });
      ctx.restore();
      G.shape(ctx, cone, { lw: 4, seed: seed + 70, amp: 0 });
      G.ellipse(ctx, 0, -100, 12, 12, { fill: C.cream, lw: 3, seed: seed + 80 });
      ctx.restore();
    }
    ctx.restore();
  };
})();
