// THE FILM: a launch film in seven sections. The narrator (the Claude mascot) lip-syncs the voiceover,
// the captions are its words, the look changes on every pluck, and each genre bar gets its own style.
(function () {
  const U = globalThis.U, G = globalThis.G, Ch = globalThis.Ch, UI = globalThis.UI, Data = globalThis.Data, Subs = globalThis.Subs, S = globalThis.SCORE, Studio = globalThis.Studio;
  const { clamp, ease, pulse } = U;
  const { T, BEAT, ev, clock } = S;
  const W = G.W, H = G.H;
  let VO = null, SUBS = [];
  const sectionOf = (t) => Object.entries(S.S).find(([, [a, b]]) => t >= a && t < b)?.[0] || 'end';
  const talk = (t) => { const m = Subs.mouth(VO, t, 'narrator'); return m.talking ? m : 'smile'; };
  const beatHop = (t, amp) => amp * Math.sin(Math.PI * clock.phase(t));
  // a stamp: full size on its very first frame (a clean hit for verify), dropping from 135% to 100%
  const stamp = (t, t0) => (t < t0 ? 0 : 1 + 0.35 * (1 - ease.outCubic(clamp((t - t0) / 0.2))));

  function hills(ctx) {
    G.poly(ctx, [[-50, 820], [500, 740], [1100, 800], [1600, 720], [1980, 780], [1980, 1130], [-50, 1130]], { fill: '#3E8A6A', lw: 5, seed: 3, hatch: { color: 'rgba(0,0,0,0.15)', gap: 9 } });
    G.poly(ctx, [[-50, 900], [1980, 900], [1980, 1130], [-50, 1130]], { fill: '#E8D9BC', lw: 5, seed: 4, hatch: { color: 'rgba(120,80,40,0.15)', gap: 8 } });
  }

  // ---------- 1. intro: the mascot draws itself, the title stamps on bar 1 ----------
  function intro(ctx, t) {
    G.bg(ctx, '#F4EDE0');
    hills(ctx);
    const reveal = ease.inOutQuad(clamp((t - 0.2) / (ev.title - 0.3)));
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W * reveal, H); ctx.clip();
    Ch.claude(ctx, { x: 960, y: 900, s: 1.5, eyes: t > ev.title ? 'happy' : 'normal', armL: 0.4 + beatHop(t, 0.3), armR: 1.1, mouth: talk(t), blush: 0.4 });
    ctx.restore();
    if (reveal < 1) G.line(ctx, [[W * reveal, 300], [W * reveal, 950]], { color: '#2A2320', lw: 5, seed: 7 }); // the pencil's edge
    const k = stamp(t, ev.title);
    if (k > 0) {
      ctx.save(); ctx.translate(960, 300); ctx.scale(k, k); ctx.rotate(-0.03);
      G.text(ctx, 'Animation Studio', 0, 0, { size: 150, align: 'center', color: '#D97757', stroke: '#2A2320', strokeW: 10 });
      G.text(ctx, 'a Claude Code plugin', 0, 90, { size: 56, align: 'center', fam: 'Patrick Hand', weight: 400 });
      ctx.restore();
    }
  }
  // ---------- 2. code: a score being typed, a waveform being drawn, the facts ----------
  const CODE = ['const clock = makeClock({ bpm: 112 });', 'ev.stamp = T(1);          // one moment…', "fx.addMono(I.thud(), ev.stamp); // …its sound", "stamp(ctx, 'Hi!', t - ev.stamp); // …its picture"];
  function code(ctx, t) {
    G.bg(ctx, '#1E1B2E');
    UI.card(ctx, 90, 150, 900, 520, 28, { fill: '#15131F', stroke: '#3A3552' });
    const typed = (t - S.S.code[0]) * 48; // characters per second
    let left = typed;
    CODE.forEach((line, i) => {
      const n = Math.max(0, Math.min(line.length, Math.floor(left)));
      left -= line.length + 6;
      if (n > 0) G.decor(() => G.text(ctx, line.slice(0, n), 140, 260 + i * 100, { size: 34, fam: 'Menlo, Consolas, monospace', weight: 400, color: ['#9FD3F0', '#F2B84B', '#E8718D', '#8FE3B0'][i], boil: 0 }));
    });
    // the waveform draws itself
    const u = clamp((t - S.S.code[0]) / (T(3) - S.S.code[0]));
    const pts = [];
    for (let i = 0; i <= 160 * u; i++) { const x = 1060 + i * 5; pts.push([x, 410 + Math.sin(i * 0.31) * 60 * Math.sin(i * 0.045) + Math.sin(i * 1.7) * 14]); }
    if (pts.length > 1) G.line(ctx, pts, { color: '#F2B84B', lw: 5, seed: 20, step: 12 });
    G.text(ctx, 'the same score drives the sound…', 1060, 250, { size: 36, color: '#E8E2F2', fam: 'Patrick Hand', weight: 400, alpha: clamp(u * 3) });
    G.text(ctx, '…and the picture', 1060, 600, { size: 36, color: '#E8E2F2', fam: 'Patrick Hand', weight: 400, alpha: clamp(u * 3 - 1) });
    // four facts, one per beat of bar 3
    S.facts.forEach((f, i) => UI.stat(ctx, 290 + i * 450, 860, 380, 230, f.big, f.small, t, f.t, { color: ['#E0703E', '#3FA89B', '#F2B84B', '#B79CFF'][i] }));
  }
  // ---------- 3. looks: the same little scene in six styles, one per pluck ----------
  function looks(ctx, t) {
    G.bg(ctx, '#F4EDE0');
    hills(ctx);
    G.ellipse(ctx, 1600, 220, 110, 110, { fill: '#F2B84B', lw: 5, seed: 2 });
    G.star(ctx, 300, 260, 60, { seed: 4 });
    Ch.claude(ctx, { x: 620, y: 900 - beatHop(t, 40), s: 1.2, eyes: 'happy', armL: 1, armR: 0.3, mouth: talk(t), blush: 0.5 });
    Ch.person(ctx, { x: 1250, y: 930, s: 1.05, pose: 'stand', gesture: 'wave', style: { outfit: 'hoodie', shirt: '#3D7A74', hairStyle: 'curly', skin: '#A86E4B', bottoms: 'pants', pants: '#27305C' } });
    const cur = S.looks.filter((l) => t >= l.t).pop();
    UI.pill(ctx, 960 - 170, 90, cur.name, { size: 64, h: 110, bg: '#2A2320', fg: '#FFFFFF' });
  }
  // ---------- 4. sounds: one bar per genre, each in its own look ----------
  function sounds(ctx, t) {
    const g = S.GENRES.filter((q) => t >= T(q.bar)).pop();
    G.bg(ctx, g.name === 'lofi' ? '#EFE3D0' : g.name === 'qawwali' ? '#2A1A3A' : '#F4EDE0');
    // a record spinning
    const spin = (t - T(g.bar)) * 3;
    G.ellipse(ctx, 480, 560, 300, 300, { fill: '#1C1A22', lw: 5, seed: 30 });
    for (let r = 120; r < 290; r += 34) G.ellipse(ctx, 480, 560, r, r, { fill: null, stroke: 'rgba(255,255,255,0.12)', lw: 2, seed: 31 + r });
    G.ellipse(ctx, 480, 560, 90, 90, { fill: ['#E8718D', '#3FA89B', '#E0A33E', '#B79CFF'][S.GENRES.indexOf(g)], lw: 4, seed: 40 });
    G.line(ctx, [[480 + Math.cos(spin) * 60, 560 + Math.sin(spin) * 60], [480 + Math.cos(spin) * 250, 560 + Math.sin(spin) * 250]], { color: 'rgba(255,255,255,0.35)', lw: 6, seed: 41 });
    // the name and what makes the sound
    const k = stamp(t, T(g.bar));
    ctx.save(); ctx.translate(1300, 420); ctx.scale(k, k);
    G.text(ctx, g.label, 0, 0, { size: 170, align: 'center', fam: 'Bungee', weight: 400, color: g.name === 'qawwali' ? '#F2B84B' : '#E0703E', stroke: '#2A2320', strokeW: 12 });
    ctx.restore();
    G.text(ctx, g.what, 1300, 530, { size: 54, align: 'center', color: g.name === 'qawwali' ? '#F6EBD6' : undefined, alpha: clamp((t - T(g.bar) - 0.2) * 4) });
    // an equaliser bouncing on the 8ths
    for (let i = 0; i < 12; i++) {
      const e = pulse(t, T(g.bar) + Math.floor((t - T(g.bar)) / (BEAT / 2)) * (BEAT / 2), 7);
      const h = 60 + 160 * e * (0.4 + 0.6 * G.rnd(i, Math.floor((t - T(g.bar)) / (BEAT / 2))));
      G.rrect(ctx, 960 + i * 58, 900 - h, 44, h, 8, { fill: ['#E0703E', '#F2B84B', '#3FA89B', '#E8718D'][i % 4], lw: 3, seed: 50 + i });
    }
  }
  // ---------- 5. people: a parade that walks in, then dances ----------
  const PARADE = [
    { outfit: 'sari', robe: '#C2185B', shirt: '#E2B33C', hairStyle: 'bun', skin: '#A86E4B' },
    { outfit: 'thobe', headwear: 'ghutra', facialHair: 'beard', hairStyle: 'short', skin: '#C98A62' },
    { outfit: 'suit', robe: '#2C3550', hairStyle: 'short', skin: '#F3D2B3' },
    { outfit: 'kameez', shirt: '#E8E1CF', bottoms: 'shalwar', shorts: '#E8E1CF', headwear: 'topi', facialHair: 'beard', hair: '#9A9A9A', hairStyle: 'short', skin: '#8D5A3B' },
    { outfit: 'abaya', hairStyle: 'hijab', hijab: '#2B2A35', skin: '#E6B48C' },
  ];
  function people(ctx, t) {
    G.bg(ctx, '#F4EDE0');
    hills(ctx);
    const t0 = S.S.people[0], stop = T(11);
    PARADE.forEach((st, i) => {
      const x1 = 260 + i * 270;
      const walking = t < stop;
      const w = Ch.walk(Math.min(t, stop), { x0: x1 - 700, speed: 700 / (stop - t0), t0, stride: 260 });
      Ch.person(ctx, { x: walking ? Math.min(w.x, x1) : x1, y: 1010 - (walking ? 0 : beatHop(t + i * 0.1, 30)), s: 0.85, pose: walking ? 'walk' : 'stand', walk: w.walk, gesture: walking ? null : ['cheer', 'clap', 'wave', 'clap', 'cheer'][i], mouth: walking ? 'smile' : 'open', eyes: walking ? 'normal' : 'happy', style: st, seed: 300 + i * 30 });
    });
    const dw = Ch.walk(Math.min(t, stop), { x0: -300, speed: 900 / (stop - t0), t0 });
    Ch.dog(ctx, { x: Math.min(dw.x, 1600), y: 1030 - (t >= stop ? beatHop(t, 20) : 0), s: 0.7, t, happy: 1, pose: 'stand' });
    Ch.claude(ctx, { x: 1690, y: 1000, s: 0.9, eyes: 'happy', mouth: talk(t), armL: 0.5 + beatHop(t, 0.5), armR: 0.5, blush: 0.4 });
  }
  // ---------- 6. data: pins across Pakistan, a chart, any script ----------
  function data(ctx, t) {
    G.bg(ctx, '#EEF3F4');
    const map = Data.map({ region: 'Pakistan', x: 60, y: 90, w: 820, h: 920 });
    Data.drawMap(ctx, map, { highlight: { Pakistan: '#3FA89B' }, t, t0: S.S.data[0], dur: 0.8 });
    S.pins.forEach((p, i) => Data.pin(ctx, ...map.city(p.c), { t, at: p.t, label: p.c, labelSide: ['Quetta', 'Peshawar'].includes(p.c) ? 'left' : 'right', size: 30, labelSize: 26 }));
    Data.bars(ctx, { x: 1000, y: 260, w: 780, h: 380, data: [{ label: 'genres', value: 8 }, { label: 'looks', value: 6 }, { label: 'gestures', value: 15 }, { label: 'formats', value: 4 }], t, t0: T(12, 1), stagger: 0.18, labelSize: 30 });
    const words = [['Hello', 'en'], ['سلام', 'ur'], ['नमस्ते', 'hi'], ['مرحبا', 'ar']];
    words.forEach(([w, lang], i) => { const k = stamp(t, T(13, i * 0.75)); if (k <= 0) return; ctx.save(); ctx.translate(1080 + i * 200, 850); ctx.scale(k, k); G.text(ctx, w, 0, 0, { size: 70, align: 'center', color: ['#E0703E', '#3D7A74', '#B9532A', '#27305C'][i], lang: lang === 'en' ? undefined : lang === 'hi' ? undefined : lang }); ctx.restore(); });
  }
  // ---------- 7. the end card: Afaq and Claude ----------
  function end(ctx, t) {
    G.bg(ctx, '#F4EDE0');
    G.rays(ctx, 960, 620, { n: 36, r0: 150, r1: 1600, color: 'rgba(242,184,75,0.35)', lw: 18, seed: 9, spin: (t - ev.end) * 0.2 });
    Ch.person(ctx, { x: 700, y: 1000 - beatHop(t, 16), s: 1.1, pose: 'stand', style: Ch.STYLES.afaq, crossArms: true, mouth: 'smirk', seed: 400 });
    Ch.claude(ctx, { x: 1230, y: 990 - beatHop(t + BEAT / 2, 40), s: 1.2, eyes: 'happy', armL: 1.2, armR: 1.2, mouth: talk(t), blush: 0.5 });
    const k = stamp(t, ev.end);
    ctx.save(); ctx.translate(960, 190); ctx.scale(k, k);
    G.text(ctx, 'Animation Studio', 0, 0, { size: 120, align: 'center', color: '#D97757', stroke: '#2A2320', strokeW: 9 });
    ctx.restore();
    G.text(ctx, 'github.com/i-afaqrashid/claude-animation-studio', 960, 290, { size: 44, align: 'center', fam: 'Inter', weight: 700, alpha: clamp((t - ev.end - 0.4) * 3) });
    G.text(ctx, 'free · open source · made in code', 960, 350, { size: 40, align: 'center', fam: 'Patrick Hand', weight: 400, alpha: clamp((t - ev.end - 0.8) * 3) });
    if (t >= ev.end) G.confetti(ctx, t, ev.end, { n: 160, seed: 6 });
  }

  const SECTIONS = { intro, code, looks, sounds, people, data, end };
  Studio.film({
    fadeOut: 1,
    async init() { VO = await Studio.loadJSON('out/voice.json'); SUBS = Subs.fromVoice(VO, { maxWords: 6 }); },
    draw(ctx, t) {
      const sec = sectionOf(t);
      // the look: the style montage and the genre bars pick their own; everything else is paper
      const style = sec === 'looks' ? S.looks.filter((l) => t >= l.t).pop().name : sec === 'sounds' ? S.GENRES.filter((q) => t >= T(q.bar)).pop().style : 'paper';
      G.setStyle(style);
      // a flash + a small shake on the big cuts
      const cut = [ev.looks, ev.sounds, ev.end].filter((c) => t >= c).pop();
      const shake = cut !== undefined ? 12 * Math.exp(-(t - cut) * 8) : 0;
      ctx.save(); ctx.translate(U.noise1(t * 30, 1) * shake, U.noise1(t * 30, 2) * shake);
      SECTIONS[sec](ctx, t);
      ctx.restore();
      if (cut !== undefined && t - cut < 0.2) { ctx.fillStyle = `rgba(255,255,255,${0.7 * (1 - (t - cut) / 0.2)})`; ctx.fillRect(0, 0, W, H); }
      Subs.draw(ctx, t, SUBS, { style: 'pop', size: 56 });
    },
  });
})();
