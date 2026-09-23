// Data on screen: numbers that count up on the beat, bar / line / donut charts, and maps with pins and
// routes (pins dropping across Pakistan, a flight from Lahore to London). Everything is a pure function
// of t, drawn with the hand-drawn toolkit (so it follows the film's style pack).
// index.html: <script src="engine/data/geo.js"></script> (maps only) then <script src="engine/video/data.js"></script>
//
//   Data.counter(ctx, { x, y, from: 0, to: 25000, t, t0: T(4), t1: T(6), prefix: 'Rs ', size: 140 })
//   Data.bars(ctx, { x, y, w, h, data: [{ label: 'Jan', value: 12 }, …], t, t0: T(8) })
//   const map = Data.map({ region: 'Pakistan', x: 80, y: 300, w: 920, h: 1100 });
//   Data.drawMap(ctx, map, { highlight: { Pakistan: '#3FA89B' }, t, t0: T(2) });
//   Data.pin(ctx, ...map.city('Lahore'), { t, at: T(4), label: 'Lahore' });
//   Data.route(ctx, map.city('Lahore'), map.city('London'), { t, t0: T(6), t1: T(8), icon: 'plane' });
// Keep the times in score.js (e.g. one pin per beat) so song.js can play a pop on each one.
(function () {
  const U = globalThis.U, G = globalThis.G;
  const { clamp, lerp, ease } = U;
  const Data = {};
  const FONT = 'Inter';

  // ---------- numbers ----------
  // 1234567 → "1,234,567"; { lakh: true } → "12,34,567" (South Asian grouping); decimals, prefix, suffix
  Data.number = (v, { decimals = 0, prefix = '', suffix = '', lakh = false, sep = ',' } = {}) => {
    const neg = v < 0, [int, frac] = Math.abs(v).toFixed(decimals).split('.');
    let s;
    if (lakh && int.length > 3) { const last = int.slice(-3), rest = int.slice(0, -3); s = rest.replace(/\B(?=(\d{2})+(?!\d))/g, sep) + sep + last; }
    else s = int.replace(/\B(?=(\d{3})+(?!\d))/g, sep);
    return `${neg ? '-' : ''}${prefix}${s}${frac ? '.' + frac : ''}${suffix}`;
  };
  // value of a count-up at t (eased), and the count-up drawn as text
  Data.count = (t, t0, t1, from, to, e = ease.outCubic) => lerp(from, to, e(clamp((t - t0) / Math.max(1e-6, t1 - t0))));
  Data.counter = (ctx, { x, y, from = 0, to, t, t0, t1, e, size = 120, color, align = 'center', fam = FONT, weight = 800, stroke, pop = true, ...fmt }) => {
    const v = Data.count(t, t0, t1, from, to, e);
    const done = t >= t1;
    const k = pop && done ? 1 + 0.12 * Math.exp(-(t - t1) * 10) : 1; // a small pop when it lands
    ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
    G.text(ctx, Data.number(v, fmt), 0, 0, { size, color: color || G.C.ink, align, fam, weight, boil: 0.4, stroke, strokeW: size * 0.08 });
    ctx.restore();
    return v;
  };

  // ---------- charts ----------
  const PALETTE = ['#E0703E', '#3FA89B', '#F2B84B', '#27305C', '#E8718D', '#B79CFF', '#4E9A57'];
  const grow = (t, t0, dur) => ease.outBack(clamp((t - t0) / dur), 1.4);
  // bars grow in one by one (stagger seconds apart). horizontal: true for a ranking.
  Data.bars = (ctx, { x, y, w, h, data, t, t0 = 0, stagger = 0.12, dur = 0.55, max, gap = 0.28, horizontal = false, format = {}, labelSize, valueSize, color, axis = true, fam = FONT, seed = 50 }) => {
    const n = data.length, top = max ?? Math.max(...data.map((d) => d.value)) * 1.08;
    const ls = labelSize || Math.max(18, (horizontal ? h / n : w / n) * 0.22), vs = valueSize || ls * 1.15;
    if (axis) G.line(ctx, horizontal ? [[x, y], [x, y + h]] : [[x, y + h], [x + w, y + h]], { lw: 4, seed });
    data.forEach((d, i) => {
      const u = grow(t, t0 + i * stagger, dur);
      if (u <= 0) return;
      const col = d.color || color || PALETTE[i % PALETTE.length];
      if (horizontal) {
        const bh = h / n, by = y + i * bh + bh * gap / 2, len = (w * 0.78 * d.value / top) * u;
        G.rrect(ctx, x, by, Math.max(2, len), bh * (1 - gap), Math.min(14, bh * 0.2), { fill: col, lw: 3.5, seed: seed + i, hatch: { color: 'rgba(0,0,0,0.12)', gap: 8 } });
        G.text(ctx, d.label, x - 14, by + bh * (1 - gap) / 2 + ls * 0.35, { size: ls, align: 'right', fam, weight: 700 });
        G.text(ctx, Data.number(d.value * Math.min(1, u), format), x + len + 14, by + bh * (1 - gap) / 2 + vs * 0.35, { size: vs, fam, weight: 800, alpha: clamp(u * 2 - 1) });
      } else {
        const bw = w / n, bx = x + i * bw + bw * gap / 2, len = (h * d.value / top) * u;
        G.rrect(ctx, bx, y + h - len, bw * (1 - gap), Math.max(2, len), Math.min(14, bw * 0.2), { fill: col, lw: 3.5, seed: seed + i, hatch: { color: 'rgba(0,0,0,0.12)', gap: 8 } });
        G.text(ctx, d.label, bx + bw * (1 - gap) / 2, y + h + ls * 1.3, { size: ls, align: 'center', fam, weight: 700 });
        G.text(ctx, Data.number(d.value * Math.min(1, u), format), bx + bw * (1 - gap) / 2, y + h - len - vs * 0.45, { size: vs, align: 'center', fam, weight: 800, alpha: clamp(u * 2 - 1) });
      }
    });
  };
  // a line that draws itself from t0 to t1 (with dots popping at each point, an optional filled area)
  Data.line = (ctx, { x, y, w, h, data, labels, t, t0 = 0, t1 = t0 + 1.5, color = '#E0703E', lw = 7, dots = true, area = true, min, max, format = {}, fam = FONT, labelSize = 26, valueLabels = 'last', seed = 70 }) => {
    const vs = data.map((d) => (typeof d === 'number' ? d : d.value));
    const lo = min ?? Math.min(0, ...vs), hi = max ?? Math.max(...vs) * 1.1;
    const P = vs.map((v, i) => [x + (w * i) / Math.max(1, vs.length - 1), y + h - (h * (v - lo)) / (hi - lo || 1)]);
    G.line(ctx, [[x, y + h], [x + w, y + h]], { lw: 4, seed });
    const u = clamp((t - t0) / (t1 - t0)) * (P.length - 1);
    const k = Math.floor(u), f = u - k;
    const pts = P.slice(0, k + 1);
    if (k < P.length - 1 && f > 0) pts.push([lerp(P[k][0], P[k + 1][0], f), lerp(P[k][1], P[k + 1][1], f)]);
    if (labels) labels.forEach((l, i) => G.text(ctx, l, P[i][0], y + h + labelSize * 1.3, { size: labelSize, align: 'center', fam, weight: 600 }));
    if (pts.length < 2) return;
    if (area) { ctx.save(); ctx.globalAlpha *= 0.18; ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(pts[0][0], y + h); pts.forEach((p) => ctx.lineTo(p[0], p[1])); ctx.lineTo(pts[pts.length - 1][0], y + h); ctx.fill(); ctx.restore(); }
    G.line(ctx, pts, { color, lw, seed: seed + 1, step: 14 });
    if (dots) pts.forEach((p, i) => { if (i > k) return; const pop = ease.outBack(clamp((u - i) * 3 + 0.001), 2); G.ellipse(ctx, p[0], p[1], 11 * pop, 11 * pop, { fill: '#FFFFFF', stroke: color, lw: 4, seed: seed + 10 + i }); });
    const last = Math.min(k, P.length - 1);
    if (valueLabels === 'all' || (valueLabels === 'last' && u >= P.length - 1)) {
      const idx = valueLabels === 'all' ? [...Array(last + 1).keys()] : [P.length - 1];
      for (const i of idx) G.text(ctx, Data.number(vs[i], format), P[i][0], P[i][1] - 26, { size: labelSize * 1.2, align: 'center', fam, weight: 800 });
    }
  };
  // a donut whose slices sweep in; center text optional
  Data.donut = (ctx, { x, y, r, thickness = r * 0.38, data, t, t0 = 0, t1 = t0 + 1, center, centerSub, fam = FONT, labels = true, labelSize = 28, seed = 90 }) => {
    const total = data.reduce((a, d) => a + d.value, 0);
    const u = ease.inOutCubic(clamp((t - t0) / (t1 - t0)));
    let a0 = -Math.PI / 2;
    data.forEach((d, i) => {
      const sweep = (d.value / total) * Math.PI * 2 * u;
      if (sweep <= 0.001) return;
      const pts = [], steps = Math.max(6, Math.ceil(sweep * 20));
      for (let k = 0; k <= steps; k++) { const a = a0 + (sweep * k) / steps; pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r]); }
      for (let k = steps; k >= 0; k--) { const a = a0 + (sweep * k) / steps; pts.push([x + Math.cos(a) * (r - thickness), y + Math.sin(a) * (r - thickness)]); }
      G.shape(ctx, pts, { fill: d.color || PALETTE[i % PALETTE.length], lw: 3.5, seed: seed + i, amp: 1 });
      if (labels && d.label && u >= 1) {
        const am = a0 + sweep / 2, lr = r + labelSize * 1.2;
        G.text(ctx, d.label, x + Math.cos(am) * lr, y + Math.sin(am) * lr + labelSize * 0.35, { size: labelSize, align: Math.cos(am) > 0.2 ? 'left' : Math.cos(am) < -0.2 ? 'right' : 'center', fam, weight: 700 });
      }
      a0 += sweep;
    });
    if (center) G.text(ctx, center, x, y + r * 0.12, { size: r * 0.42, align: 'center', fam, weight: 800 });
    if (centerSub) G.text(ctx, centerSub, x, y + r * 0.36, { size: r * 0.16, align: 'center', fam, weight: 600 });
  };

  // ---------- maps ----------
  Data.REGIONS = {
    world: [-168, -56, 190, 76], Pakistan: [60.4, 23.4, 77.9, 37.2], 'South Asia': [60, 5, 98, 38], 'Middle East': [34, 12, 64, 38],
    Gulf: [44, 16, 60, 31], Europe: [-11, 35, 32, 60], UK: [-8.5, 49.8, 2, 59], 'North America': [-128, 14, -60, 56],
  };
  const merc = (lat) => Math.log(Math.tan(Math.PI / 4 + (clamp(lat, -80, 84) * Math.PI) / 360));
  // a projection that fits a region into a box (Mercator, aspect kept, centred)
  Data.map = ({ region = 'world', x = 0, y = 0, w = G.W, h = G.H, pad = 0.05 } = {}) => {
    const b = Array.isArray(region) ? region : Data.REGIONS[region];
    if (!b) throw new Error(`unknown region "${region}" (${Object.keys(Data.REGIONS).join(', ')} or [lon0, lat0, lon1, lat1])`);
    const [lon0, lat0, lon1, lat1] = b;
    const X0 = (lon0 * Math.PI) / 180, X1 = (lon1 * Math.PI) / 180, Y0 = merc(lat0), Y1 = merc(lat1);
    const k = Math.min((w * (1 - 2 * pad)) / (X1 - X0), (h * (1 - 2 * pad)) / (Y1 - Y0));
    const ox = x + (w - (X1 - X0) * k) / 2, oy = y + (h - (Y1 - Y0) * k) / 2;
    const proj = (lon, lat) => [ox + ((lon * Math.PI) / 180 - X0) * k, oy + (Y1 - merc(lat)) * k];
    const GEO = globalThis.GEO;
    return {
      bounds: b, box: { x, y, w, h }, k, proj,
      city: (name) => { const c = GEO && GEO.cities[name]; if (!c) throw new Error(`no city "${name}" in GEO.cities (add it: GEO.cities['${name}'] = [lon, lat])`); return proj(c[0], c[1]); },
      detail: k > 900, // zoomed in enough for the 1:50m outlines
    };
  };
  // draw countries: highlight { name: colour } (others in `land`); reveal from t0 (the outline draws on)
  Data.drawMap = (ctx, map, { highlight = {}, land = '#E7DCC6', sea = null, stroke = G.C.ink, lw = 3, only = null, t = G.t, t0 = -1, dur = 1.2, seed = 400, labels = false, labelSize = 30, clip = false } = {}) => {
    const GEO = globalThis.GEO;
    if (!GEO) throw new Error('maps need engine/data/geo.js loaded before engine/video/data.js');
    if (clip) { ctx.save(); ctx.beginPath(); ctx.rect(map.box.x, map.box.y, map.box.w, map.box.h); ctx.clip(); }
    try { drawCountries(ctx, map, GEO, { highlight, land, sea, stroke, lw, only, t, t0, dur, seed, labels, labelSize }); } finally { if (clip) ctx.restore(); }
  };
  const drawCountries = (ctx, map, GEO, { highlight, land, sea, stroke, lw, only, t, t0, dur, seed, labels, labelSize }) => {
    if (sea) { ctx.save(); ctx.fillStyle = sea; ctx.fillRect(map.box.x, map.box.y, map.box.w, map.box.h); ctx.restore(); }
    const [lon0, lat0, lon1, lat1] = map.bounds, m = 8;
    const reveal = t0 < 0 ? 1 : clamp((t - t0) / dur);
    if (reveal <= 0) return;
    const names = only || Object.keys(GEO.world);
    let i = 0;
    for (const name of names) {
      const rings = (map.detail && GEO.detail[name]) || GEO.world[name];
      if (!rings) continue;
      i++;
      for (const r0 of rings) {
        const r = unwrap(r0);
        let inside = false;
        for (let q = 0; q < r.length; q += 2) if (r[q] > lon0 - m && r[q] < lon1 + m && r[q + 1] > lat0 - m && r[q + 1] < lat1 + m) { inside = true; break; }
        if (!inside) continue;
        const pts = [];
        for (let q = 0; q < r.length; q += 2) pts.push(map.proj(r[q], r[q + 1]));
        const fill = highlight[name] || land;
        if (reveal >= 1) G.shape(ctx, pts, { fill, stroke, lw, seed: seed + i, amp: 0.9, hatch: highlight[name] ? { color: 'rgba(0,0,0,0.12)', gap: 9 } : null, second: false });
        else {
          ctx.save(); ctx.globalAlpha *= clamp(reveal * 2 - 0.6);
          G.shape(ctx, pts, { fill, stroke: null, lw: 0, seed: seed + i, amp: 0.9 });
          ctx.restore();
          G.line(ctx, pts.slice(0, Math.max(2, Math.ceil(pts.length * reveal))), { color: stroke, lw, seed: seed + i, amp: 0.9, step: 1000 });
        }
      }
      if (labels && highlight[name] && reveal >= 1) {
        const c = GEO.world[name] ? centroid(GEO.world[name][0]) : null;
        if (c) G.text(ctx, name, ...map.proj(c[0], c[1]), { size: labelSize, align: 'center', fam: FONT, weight: 800, color: '#FFFFFF', stroke: G.C.ink, strokeW: 6 });
      }
    }
  };
  // rings that cross the date line (Russia, Fiji): continue past 180° instead of jumping back to -180°
  const UNWRAPPED = new WeakMap();
  const unwrap = (r) => {
    let u = UNWRAPPED.get(r);
    if (u) return u;
    let hi = false, lo = false;
    for (let q = 0; q < r.length; q += 2) { if (r[q] > 150) hi = true; if (r[q] < -150) lo = true; }
    u = hi && lo ? r.map((v, q) => (q % 2 === 0 && v < 0 ? v + 360 : v)) : r;
    UNWRAPPED.set(r, u);
    return u;
  };
  const centroid = (r) => { let sx = 0, sy = 0, n = r.length / 2; for (let q = 0; q < r.length; q += 2) { sx += r[q]; sy += r[q + 1]; } return [sx / n, sy / n]; };
  // a map pin that drops in at `at`, bounces, sends out a ripple; its label slides in after
  Data.pin = (ctx, x, y, { t = G.t, at = 0, color = '#E0503E', size = 34, label = '', labelSide = 'right', labelSize = 30, fam = FONT, seed = 500 } = {}) => {
    const a = t - at;
    if (a < 0) return;
    const drop = ease.outBounce(clamp(a / 0.45));
    const py = y - (1 - drop) * 260;
    ctx.save();
    ctx.fillStyle = `rgba(20,10,20,${0.25 * drop})`; ctx.beginPath(); ctx.ellipse(x, y + 2, size * 0.5 * drop, size * 0.18 * drop, 0, 0, Math.PI * 2); ctx.fill();
    if (a > 0.3 && a < 1.2) { const u = (a - 0.3) / 0.9; ctx.strokeStyle = color; ctx.globalAlpha = 1 - u; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(x, y, size * (0.5 + u * 1.8), size * (0.2 + u * 0.7), 0, 0, Math.PI * 2); ctx.stroke(); }
    ctx.restore();
    const r = size * 0.5, pts = [];
    for (let k = 0; k <= 16; k++) { const an = Math.PI * 0.8 + (k / 16) * Math.PI * 1.4; pts.push([x + Math.cos(an) * r, py - size * 1.05 + Math.sin(an) * r]); }
    pts.push([x, py]);
    G.shape(ctx, pts, { fill: color, lw: 3.5, seed, amp: 0.7 });
    G.ellipse(ctx, x, py - size * 1.05, r * 0.38, r * 0.38, { fill: '#FFFFFF', lw: 2.5, seed: seed + 1, amp: 0.4 });
    if (label && a > 0.35) {
      const u = ease.outCubic(clamp((a - 0.35) / 0.3));
      const right = labelSide === 'right', tw = G.measure(ctx, label, labelSize, fam, 700) + labelSize * 0.9;
      const lx = right ? x + size * 0.7 : x - size * 0.7 - tw, ly = py - size * 1.05 - labelSize * 0.75;
      ctx.save(); ctx.globalAlpha *= u;
      G.rrect(ctx, lx + (right ? -1 : 1) * (1 - u) * 20, ly, tw, labelSize * 1.5, labelSize * 0.5, { fill: '#FFFFFF', lw: 3, seed: seed + 2, amp: 0.6 });
      G.text(ctx, label, lx + tw / 2 + (right ? -1 : 1) * (1 - u) * 20, ly + labelSize * 1.08, { size: labelSize, align: 'center', fam, weight: 700 });
      ctx.restore();
    }
  };
  // an arc from A to B that draws from t0 to t1, with a plane / dot riding its tip
  Data.route = (ctx, A, B, { t = G.t, t0 = 0, t1 = 1, color = '#D8433A', halo = 'rgba(255,255,255,0.85)', lw = 5, arc = 0.25, dash = true, icon = 'dot', seed = 600 } = {}) => {
    const u = ease.inOutCubic(clamp((t - t0) / (t1 - t0)));
    if (u <= 0) return;
    const mx = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2, dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy);
    let px = -dy / (L || 1), py = dx / (L || 1);
    if (py > 0) { px = -px; py = -py; } // the arc bows upward
    const C = [mx + px * L * arc, my + py * L * arc];
    const Q = (s) => [(1 - s) ** 2 * A[0] + 2 * (1 - s) * s * C[0] + s * s * B[0], (1 - s) ** 2 * A[1] + 2 * (1 - s) * s * C[1] + s * s * B[1]];
    const n = 40, pts = [];
    for (let k = 0; k <= n * u; k++) pts.push(Q(k / n));
    pts.push(Q(u));
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    if (halo) { ctx.strokeStyle = halo; ctx.lineWidth = lw + 6; ctx.stroke(); } // keeps the route readable over borders
    if (dash) ctx.setLineDash([lw * 3, lw * 2.2]);
    ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.stroke();
    ctx.restore();
    const tip = Q(u), prev = Q(Math.max(0, u - 0.02)), ang = Math.atan2(tip[1] - prev[1], tip[0] - prev[0]);
    if (u < 1 && icon === 'plane') {
      ctx.save(); ctx.translate(tip[0], tip[1]); ctx.rotate(ang);
      G.shape(ctx, [[26, 0], [8, -5], [-4, -24], [-12, -24], [-4, -5], [-20, -4], [-26, -13], [-31, -13], [-26, 0], [-31, 13], [-26, 13], [-20, 4], [-4, 5], [-12, 24], [-4, 24], [8, 5]], { fill: '#FFFFFF', lw: 3, seed: seed + 1, amp: 0.4 });
      ctx.restore();
    } else if (u < 1) G.ellipse(ctx, tip[0], tip[1], lw * 1.8, lw * 1.8, { fill: color, lw: 2, seed: seed + 2, amp: 0.3 });
  };

  if (typeof module !== 'undefined' && typeof window === 'undefined') module.exports = Data; else globalThis.Data = Data;
})();
