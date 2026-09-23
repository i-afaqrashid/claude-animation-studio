// Brand kit tools.
//   node engine/render.js brand              -> checks brand.json and draws out/brand.png (colours, fonts, logo, CTA, claims)
//   node engine/render.js brand-from <url>   -> reads a real website and writes a draft brand.json (+ assets/logo.*, assets/fonts/*)
// brand.json: { name, tagline, url, colors: { primary, secondary, ink, bg, muted, surface, onPrimary, success },
//   fonts: { display: { family, file, weight }, body: { family, file } }, logo, cta: { text, url, phone },
//   languages: ['en', 'ur'], tone, claims: { allowed: [...], forbidden: [...] }, notes }
// Studio.loadBrand() (boot.js) applies it to every film automatically; render.js warns when a film says a forbidden claim.

const EXTRACT_JS = `(() => {
  const meta = (n) => { const e = document.querySelector('meta[name="' + n + '"],meta[property="' + n + '"]'); return e ? e.content : ''; };
  const abs = (u) => { try { return u ? new URL(u, location.href).href : null; } catch (e) { return null; } };
  const hex = (c) => { const m = /rgba?\\(([^)]+)\\)/.exec(c || ''); if (!m) return null; const p = m[1].split(',').map((v) => parseFloat(v)); if (p.length > 3 && p[3] < 0.5) return null; return '#' + p.slice(0, 3).map((v) => Math.round(v).toString(16).padStart(2, '0')).join(''); };
  const bg = {}, fg = {}, accent = {};
  const add = (o, c, w) => { const h = hex(c); if (h) o[h] = (o[h] || 0) + w; };
  const vw = innerWidth, vh = Math.max(innerHeight, document.documentElement.scrollHeight);
  for (const el of document.querySelectorAll('body, body *')) {
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || parseFloat(cs.opacity) < 0.3) continue;
    const area = Math.min(r.width, vw) * Math.min(r.height, vh);
    add(bg, cs.backgroundColor, area / 1e4);
    const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join('');
    if (own) add(fg, cs.color, own.length);
    if (/^(A|BUTTON)$/.test(el.tagName) || /btn|button|cta/i.test(el.className || '')) { add(accent, cs.backgroundColor, 20 + area / 2e3); add(accent, cs.color, 5); }
    if (cs.borderTopWidth !== '0px') add(accent, cs.borderTopColor, 1);
  }
  const top = (o, n) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n);
  const fontOf = (sel) => { const e = document.querySelector(sel); return e ? getComputedStyle(e).fontFamily : null; };
  const imgs = [...document.querySelectorAll('img')];
  const logos = imgs.filter((e) => /logo|brand/i.test([e.alt, e.className, e.id, e.src].join(' '))).map((e) => abs(e.currentSrc || e.src));
  const header = document.querySelector('header img, nav img, a[href="/"] img, .logo img');
  if (header) logos.unshift(abs(header.currentSrc || header.src));
  const icons = [...document.querySelectorAll('link[rel*="icon"]')].map((l) => ({ href: abs(l.href), sizes: (l.sizes && l.sizes.value) || '', rel: l.rel }));
  const texts = (sel, n) => [...new Set([...document.querySelectorAll(sel)].map((e) => e.textContent.replace(/\\s+/g, ' ').trim()).filter((t) => t && t.length < 60))].slice(0, n);
  return {
    url: location.href, title: document.title, description: meta('description') || meta('og:description'), siteName: meta('og:site_name'),
    themeColor: meta('theme-color'), ogImage: abs(meta('og:image')), lang: document.documentElement.lang || '',
    bg: top(bg, 8), fg: top(fg, 6), accent: top(accent, 10),
    fonts: { body: fontOf('body'), heading: fontOf('h1') || fontOf('h2'), button: fontOf('button') || fontOf('a') },
    logos: [...new Set(logos.filter(Boolean))].slice(0, 5), icons,
    ctas: texts('a[class*="btn"], a[class*="button"], button, [role="button"]', 10), headings: texts('h1, h2', 8),
  };
})()`;

const BRAND_SHEET_JS = `(async () => {
  const b = Studio.brand;
  if (!b) return null;
  const W = 1600, H = 1000, c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  const f = (spec, fb) => (spec && spec.family ? '"' + spec.family + '", ' + fb : fb);
  const disp = b.fonts && (b.fonts.display || b.fonts.body), body = b.fonts && (b.fonts.body || b.fonts.display);
  x.fillStyle = '#FFFFFF'; x.fillRect(0, 0, W, H);
  x.fillStyle = '#16161B'; x.font = '800 54px ' + f(disp, 'system-ui'); x.fillText(b.name || 'brand', 60, 100);
  x.fillStyle = '#5E5E6A'; x.font = '500 26px ' + f(body, 'system-ui'); x.fillText((b.tagline || '').slice(0, 80), 60, 146);
  const bgc = (b.colors && (b.colors.bg || b.colors.surface)) || '#F2F2F2';
  x.fillStyle = bgc; x.fillRect(1060, 40, 500, 250);
  if (b.logoImg) { const k = Math.min(440 / b.logoImg.width, 200 / b.logoImg.height); x.drawImage(b.logoImg, 1310 - b.logoImg.width * k / 2, 165 - b.logoImg.height * k / 2, b.logoImg.width * k, b.logoImg.height * k); }
  else { x.fillStyle = '#999'; x.font = '600 22px system-ui'; x.fillText('no logo', 1250, 170); }
  Object.entries(b.colors || {}).forEach(([k, v], i) => {
    const cx = 60 + (i % 8) * 185, cy = 330 + Math.floor(i / 8) * 190;
    x.fillStyle = v; x.fillRect(cx, cy, 160, 110); x.strokeStyle = '#DDD'; x.lineWidth = 2; x.strokeRect(cx, cy, 160, 110);
    x.fillStyle = '#222'; x.font = '700 19px system-ui'; x.fillText(k, cx, cy + 138); x.fillStyle = '#777'; x.font = '500 17px monospace'; x.fillText(v, cx, cy + 162);
  });
  let y = 560 + Math.floor(Object.keys(b.colors || {}).length / 9) * 190;
  x.fillStyle = '#16161B'; x.font = '700 64px ' + f(disp, 'system-ui'); x.fillText('Aa Bb Cc 123 — ' + ((disp && disp.family) || 'system-ui'), 60, y);
  x.font = '400 30px ' + f(body, 'system-ui'); x.fillText('The quick brown fox jumps over the lazy dog. ' + ((body && body.family) || ''), 60, y + 56);
  y += 130;
  if (b.cta) { const t = [b.cta.text, b.cta.phone, b.cta.url].filter(Boolean).join('  ·  '); x.font = '800 26px ' + f(body, 'system-ui'); const w = x.measureText(t).width + 60; x.fillStyle = (b.colors && b.colors.primary) || '#333'; x.beginPath(); x.roundRect(60, y - 40, w, 60, 30); x.fill(); x.fillStyle = (b.colors && b.colors.onPrimary) || '#FFF'; x.fillText(t, 90, y); }
  y += 70;
  const claims = b.claims || {};
  x.font = '600 20px system-ui';
  x.fillStyle = '#2F8A4E'; x.fillText('allowed: ' + ((claims.allowed || []).join(' · ') || '—'), 60, y);
  x.fillStyle = '#C8412B'; x.fillText('never say: ' + ((claims.forbidden || []).join(' · ') || '—'), 60, y + 34);
  return c.toDataURL('image/png');
})()`;

// colour helpers (Node side)
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const lum = (h) => { const [r, g, b] = rgb(h).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const sat = (h) => { const [r, g, b] = rgb(h).map((v) => v / 255); const mx = Math.max(r, g, b), mn = Math.min(r, g, b); return mx === 0 ? 0 : (mx - mn) / mx; };
const dist = (a, b) => { const p = rgb(a), q = rgb(b); return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]); };
const contrast = (a, b) => { const [l1, l2] = [lum(a), lum(b)].sort((u, v) => v - u); return (l1 + 0.05) / (l2 + 0.05); };

module.exports = async function brandTool(C, mode, args) {
  const { fs, path, ROOT, OUT } = C;
  if (mode === 'brand') {
    const file = path.join(ROOT, 'brand.json');
    if (!fs.existsSync(file)) { console.log('no brand.json here. Create one (see references/workflow.md) or run: node engine/render.js brand-from https://example.com'); return; }
    const b = JSON.parse(fs.readFileSync(file, 'utf8'));
    const problems = [];
    for (const [k, v] of Object.entries(b.colors || {})) if (!/^#[0-9a-fA-F]{6}$/.test(v)) problems.push(`colors.${k} = ${v} is not a #rrggbb colour`);
    for (const [k, f] of Object.entries(b.fonts || {})) if (f && f.file && !fs.existsSync(path.join(ROOT, f.file))) problems.push(`fonts.${k}.file ${f.file} is missing`);
    if (b.logo && !fs.existsSync(path.join(ROOT, b.logo))) problems.push(`logo ${b.logo} is missing`);
    const c = b.colors || {};
    if (c.primary && c.onPrimary && contrast(c.primary, c.onPrimary) < 3) problems.push(`onPrimary on primary has contrast ${contrast(c.primary, c.onPrimary).toFixed(1)}:1 (< 3:1, hard to read)`);
    if (c.ink && c.bg && contrast(c.ink, c.bg) < 4.5) problems.push(`ink on bg has contrast ${contrast(c.ink, c.bg).toFixed(1)}:1 (< 4.5:1)`);
    await C.serve();
    const w = await C.openWorker('brand');
    const url = await C.evaluate(w.c, BRAND_SHEET_JS);
    w.close();
    if (url) fs.writeFileSync(path.join(OUT, 'brand.png'), Buffer.from(url.slice(url.indexOf(',') + 1), 'base64'));
    console.log(`brand "${b.name || '?'}": ${Object.keys(c).length} colours, fonts ${Object.values(b.fonts || {}).map((f) => f.family).join(' + ') || 'system'}, logo ${b.logo || 'none'}, ${(b.claims && b.claims.forbidden || []).length} forbidden claims`);
    console.log(problems.length ? `⚠ ${problems.join('\n⚠ ')}` : '✓ brand.json looks right');
    if (url) console.log('brand sheet: out/brand.png');
    return;
  }

  // ---------- brand-from <url> ----------
  const target = args.find((a) => /^https?:\/\//.test(a));
  if (!target) throw new Error('usage: node engine/render.js brand-from https://example.com');
  const out = path.join(ROOT, 'brand.json');
  if (fs.existsSync(out) && !args.includes('--force')) throw new Error('brand.json already exists (add --force to replace it)');
  const w = await C.openWorker('site', target, { external: true, device: { width: 1366, height: 900, deviceScaleFactor: 1, mobile: false } });
  const info = await C.evaluate(w.c, EXTRACT_JS);
  w.close();
  // palette: background = the biggest area; ink = the most-used text colour; primary = the most saturated accent
  const bgs = info.bg.map(([h]) => h), fgs = info.fg.map(([h]) => h);
  const bgc = bgs[0] || (info.themeColor && /^#/.test(info.themeColor) ? info.themeColor : '#FFFFFF');
  const ink = fgs.find((h) => contrast(h, bgc) >= 4.5) || (lum(bgc) > 0.5 ? '#111111' : '#F5F5F5');
  const pool = [...info.accent.map(([h, wgt]) => [h, wgt * 3]), ...info.bg.map(([h, wgt]) => [h, wgt]), ...info.fg.map(([h, wgt]) => [h, wgt * 0.3])];
  const saturated = [];
  for (const [h] of pool.sort((a, b) => b[1] - a[1])) if (sat(h) > 0.35 && lum(h) > 0.03 && lum(h) < 0.9 && !saturated.some((s) => dist(s, h) < 60)) saturated.push(h);
  const primary = saturated[0] || (info.themeColor && /^#[0-9a-f]{6}$/i.test(info.themeColor) ? info.themeColor : ink);
  const secondary = saturated[1] || primary;
  const muted = fgs.find((h) => h !== ink && dist(h, primary) > 60 && contrast(h, bgc) >= 2.5 && contrast(h, bgc) < 7) || (lum(bgc) > 0.5 ? '#7A7A7A' : '#9A9A9A');
  const colors = { primary, secondary, ink, bg: bgc, muted, onPrimary: contrast('#FFFFFF', primary) >= contrast('#111111', primary) ? '#FFFFFF' : '#111111' };
  if (bgs[1] && dist(bgs[1], bgc) > 20) colors.surface = bgs[1];
  // fonts: first family of the body / heading stacks; try Google Fonts for the files
  const first = (stack) => (stack || '').split(',')[0].replace(/["']/g, '').trim();
  const bodyFam = first(info.fonts.body), headFam = first(info.fonts.heading) || bodyFam;
  const fonts = {};
  const assets = path.join(ROOT, 'assets');
  fs.mkdirSync(path.join(assets, 'fonts'), { recursive: true });
  async function googleFont(fam, weight) {
    if (!fam || /^(system-ui|-apple-system|ui-|sans-serif|serif|monospace|arial|helvetica|times)/i.test(fam)) return null;
    for (const wt of [...new Set([weight, 700, 600, 500, 400])]) { // not every family has every weight
      try {
        const css = await (await fetch(`https://fonts.googleapis.com/css2?family=${encodeURIComponent(fam)}:wght@${wt}`, { headers: { 'User-Agent': 'Mozilla/4.0' } })).text(); // an old UA gets .ttf files
        const m = /url\((https:[^)]+\.ttf)\)/.exec(css);
        if (!m) continue;
        const buf = Buffer.from(await (await fetch(m[1])).arrayBuffer());
        const rel = `assets/fonts/${fam.replace(/\s+/g, '')}-${wt}.ttf`;
        fs.writeFileSync(path.join(ROOT, rel), buf);
        return { file: rel, weight: wt };
      } catch (e) { /* next weight */ }
    }
    return null;
  }
  if (headFam) { const g = await googleFont(headFam, 800); fonts.display = { family: headFam, weight: g ? g.weight : 800, file: g ? g.file : undefined }; }
  if (bodyFam) { const g = await googleFont(bodyFam, 400); fonts.body = { family: bodyFam, weight: g ? g.weight : 400, file: g ? g.file : undefined }; }
  for (const f of Object.values(fonts)) if (!f.file) delete f.file;
  // logo: a header/logo image, else the biggest icon, else og:image
  let logo = null;
  const cands = [...info.logos, ...info.icons.sort((a, b) => (parseInt(b.sizes, 10) || 0) - (parseInt(a.sizes, 10) || 0)).map((i) => i.href), info.ogImage].filter(Boolean);
  for (const u of cands) {
    try {
      const r = await fetch(u);
      if (!r.ok) continue;
      const type = r.headers.get('content-type') || '';
      const ext = /svg/.test(type) || /\.svg(\?|$)/.test(u) ? 'svg' : /png/.test(type) ? 'png' : /jpe?g/.test(type) ? 'jpg' : /webp/.test(type) ? 'webp' : /icon/.test(type) ? 'ico' : 'png';
      if (ext === 'ico') continue;
      fs.writeFileSync(path.join(assets, `logo.${ext}`), Buffer.from(await r.arrayBuffer()));
      logo = `assets/logo.${ext}`;
      break;
    } catch (e) { /* next */ }
  }
  const name = info.siteName || (info.title || '').split(/[|–—:-]/)[0].trim() || new URL(info.url).hostname;
  const brand = {
    name, tagline: info.headings[0] || info.description || '', url: info.url, colors, fonts, logo: logo || undefined,
    cta: { text: info.ctas[0] || '', url: info.url }, languages: [info.lang ? info.lang.slice(0, 2) : 'en'],
    tone: '', claims: { allowed: [], forbidden: [] },
    notes: `draft read from ${info.url} on ${new Date().toISOString().slice(0, 10)}: check every value, fill in tone and claims. Headings seen: ${info.headings.join(' | ')}. CTAs seen: ${info.ctas.join(' | ')}`,
  };
  fs.writeFileSync(out, JSON.stringify(brand, null, 2) + '\n');
  console.log(`wrote brand.json for "${name}"`);
  console.log(`  colours: ${Object.entries(colors).map(([k, v]) => `${k} ${v}`).join(' · ')}`);
  console.log(`  fonts:   ${Object.values(fonts).map((f) => `${f.family}${f.file ? ' (' + f.file + ')' : ' (not on Google Fonts: add the file yourself)'}`).join(' + ') || 'system'}`);
  console.log(`  logo:    ${logo || 'none found'}`);
  console.log('  → check it, fill in tone + claims, then: node engine/render.js brand');
};
