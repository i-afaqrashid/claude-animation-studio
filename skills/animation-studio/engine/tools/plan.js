// node engine/render.js plan  -> out/plan.md: a one-page treatment of the film, generated from score.js,
// for the user to approve BEFORE the full render (and to re-check after changes):
// format and length, a bar map of sections with their events, the named moments, every word the film
// shows (a checklist of claims to verify), the cast and the brand rules.
module.exports = async function plan(C) {
  const { fs, path, ROOT, OUT, SCORE, DURATION, FPS, FW, FH, MARKERS } = C;
  const clock = SCORE.clock;
  const name = path.basename(ROOT);
  const bb = (t) => C.barBeat(t).replace('bar ', '') || '';
  const lines = [];
  const bpm = clock && clock.BEAT ? Math.round(60 / clock.BEAT) : null;
  lines.push(`# ${name}: plan`, '');
  lines.push(`**Format** ${SCORE.FORMAT || '16:9'} (${FW}×${FH}) · **length** ${DURATION.toFixed(1)}s · ${FPS} fps${bpm ? ` · **${bpm} BPM**, bar = ${(clock.BAR).toFixed(2)}s` : ''}`, '');
  // every list in the score whose items carry a time: the events
  const streams = Object.entries(SCORE).filter(([, v]) => Array.isArray(v) && v.length && v.every((x) => x && typeof x === 'object' && typeof x.t === 'number'));
  const textOf = (x) => [x.text, x.title, x.label, x.big, x.w, x.en, x.name].find((v) => typeof v === 'string') || '';
  if (SCORE.S) {
    lines.push('## Bar map', '', '| section | time | bars | what happens |', '|---|---|---|---|');
    for (const [sec, [a, b]] of Object.entries(SCORE.S)) {
      const inSec = streams.map(([k, arr]) => { const hits = arr.filter((x) => x.t >= a && x.t < Math.min(b, DURATION)); if (!hits.length) return ''; const words = hits.map(textOf).filter(Boolean).slice(0, 3).map((w) => `"${String(w).slice(0, 28)}"`).join(', '); return `${k} ×${hits.length}${words ? ` (${words})` : ''}`; }).filter(Boolean).join('; ');
      lines.push(`| **${sec}** | ${a.toFixed(1)}–${Math.min(b, DURATION).toFixed(1)}s | ${bb(a)} → ${bb(Math.min(b, DURATION) - 0.001)} | ${inSec || '—'} |`);
    }
    lines.push('');
  }
  if (Object.keys(MARKERS).length) {
    lines.push('## Named moments', '', '| marker | time | bar:beat | checked by verify |', '|---|---|---|---|');
    for (const [k, m] of Object.entries(MARKERS)) { const t = typeof m === 'number' ? m : m.t; lines.push(`| @${k} | ${t.toFixed(2)}s | ${bb(t)} | ${typeof m === 'object' && m.sync ? m.sync : '—'} |`); }
    lines.push('');
  }
  // every string the film shows: from the score's data and film.js string literals
  const shown = new Map();
  const add = (s, where) => { s = String(s).trim(); if (s.length < 2 || !/[\p{L}]/u.test(s)) return; if (!shown.has(s)) shown.set(s, new Set()); shown.get(s).add(where); };
  const walk = (v, where, depth = 0) => { if (depth > 4 || v == null) return; if (typeof v === 'string') add(v, where); else if (Array.isArray(v)) v.forEach((x) => walk(x, where, depth + 1)); else if (typeof v === 'object') for (const [k, x] of Object.entries(v)) if (!['clock', 'chords', 'm', 'T', 'chordAt', 'S', 'markers'].includes(k) && typeof x !== 'function') walk(x, where, depth + 1); };
  const SKIP = ['FORMAT', 'HK', 'HOOK', 'SAFE', 'W', 'H', 'clock', 'chords', 'chordAt', 'm', 'T', 'S', 'markers', 'BEAT', 'BAR', 'FPS', 'DURATION', 'ev'];
  for (const [k, v] of Object.entries(SCORE)) if (!SKIP.includes(k)) walk(v, `score.${k}`);
  const html = fs.existsSync(path.join(ROOT, 'index.html')) ? fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8') : '';
  for (const m of html.matchAll(/<script\s+src="([^"]+)"/g)) {
    if (m[1].startsWith('engine/') || m[1] === 'score.js') continue;
    const src = fs.existsSync(path.join(ROOT, m[1])) ? fs.readFileSync(path.join(ROOT, m[1]), 'utf8') : '';
    for (const s of src.matchAll(/(['"`])((?:(?!\1)[^\\\n]|\\.){3,})\1/g)) {
      const str = s[2];
      if (/^[#.\d]|^(rgba?|hsla?)\(|px|^\w+$(?<!\w{2,}\s\w)|\.(png|jpg|svg|ttf|js|json)$|^(source-over|lighter|multiply|round|evenodd|center|left|right|middle|alphabetic|ltr|rtl|none|png|jpeg|stand|sit|happy|normal|wide|smile|grin|open|flat|closed|worried|up|neutral|wavy)$/.test(str)) continue;
      if (/\s/.test(str) || /[؀-ۿऀ-ॿ]/.test(str) || /^[A-Z][a-z]+[.!?]?$/.test(str)) add(str, m[1]);
    }
  }
  let brand = null;
  try { brand = JSON.parse(fs.readFileSync(path.join(ROOT, 'brand.json'), 'utf8')); } catch (e) { /* none */ }
  const forbidden = ((brand && brand.claims && brand.claims.forbidden) || []).map((f) => String(f).toLowerCase());
  lines.push('## Words on screen (check every claim)', '', 'Numbers, prices, names and promises must be true and approved.', '');
  for (const [s, where] of [...shown.entries()].sort((a, b) => /\d/.test(b[0]) - /\d/.test(a[0]))) {
    const bad = forbidden.find((f) => s.toLowerCase().includes(f));
    lines.push(`- [ ] ${bad ? '⛔ ' : /\d/.test(s) ? '🔢 ' : ''}"${s.replace(/\|/g, '\\|')}"  _(${[...where].join(', ')})_${bad ? `  **forbidden by brand.json: "${bad}"**` : ''}`);
  }
  lines.push('');
  // the cast, from the running film
  try {
    await C.serve();
    const w = await C.openWorker('plan');
    const cast = await C.evaluate(w.c, 'Object.keys(globalThis.CAST || {})');
    w.close();
    if (cast.length) lines.push('## Cast', '', cast.map((c) => `- ${c}`).join('\n'), '', 'See every character in 6 expressions: `node engine/render.js cast` → out/cast.png', '');
  } catch (e) { /* no browser: skip the cast */ }
  if (brand) {
    lines.push('## Brand', '', `${brand.name || ''}${brand.tagline ? ` · "${brand.tagline}"` : ''}`, '');
    if (brand.colors) lines.push(`Colours: ${Object.entries(brand.colors).map(([k, v]) => `${k} \`${v}\``).join(' · ')}`, '');
    if (brand.claims) lines.push(`Allowed claims: ${(brand.claims.allowed || []).join('; ') || '—'}`, '', `Never say: ${(brand.claims.forbidden || []).join('; ') || '—'}`, '');
  }
  lines.push('## Before the full render', '', '- [ ] story and bar map approved', '- [ ] every number and claim above verified', '- [ ] music measured (`levels.js`, -14 to -11 LUFS)', '- [ ] storyboard (`board`) and live preview (`preview`) seen by the user', '- [ ] visual QA (`qa`) and pacing (`pacing`) clean or accepted', '');
  fs.writeFileSync(path.join(OUT, 'plan.md'), lines.join('\n'));
  console.log(`wrote out/plan.md: ${Object.keys(SCORE.S || {}).length} sections, ${Object.keys(MARKERS).length} markers, ${shown.size} on-screen strings to check${forbidden.length ? `, ${forbidden.length} forbidden claims checked` : ''}`);
};
