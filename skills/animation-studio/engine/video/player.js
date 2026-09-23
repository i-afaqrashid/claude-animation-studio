// Live preview WITH SOUND: plays out/music.wav and draws the film at the audio clock, so timing
// can be judged by eye and ear before a full render. Opened by `node engine/render.js preview`
// (a local page on a random port; the renderer injects this script into index.html).
//   Keys: space play/pause · ←/→ one beat (shift: one bar) · [ ] previous/next marker ·
//         L loop the section under the playhead · Home back to the start. Click/drag the timeline to seek.
//   Event strip: every timed list in score.js is a row of ticks; hover shows the event, click jumps to it.
//   Live reload: saving score.js / film.js reloads the page at the same moment; saving song.js (or score.js)
//   re-renders the music first. "⤓ clip" renders the loop (or the current section) as an MP4 with sound.
//   HQ: full-resolution drawing (the default half resolution plays more smoothly).
(function () {
  const S = globalThis.SCORE || {};
  const DUR = S.DURATION || 10, FPS = S.FPS || 30, clock = S.clock;
  const BEAT = (clock && clock.BEAT) || 0.5, BAR = (clock && clock.BAR) || 2;
  const markers = Object.entries(S.markers || {}).map(([name, mk]) => ({ name, t: typeof mk === 'number' ? mk : mk.t, sync: typeof mk === 'object' && !!mk.sync })).sort((a, b) => a.t - b.t);
  const sections = Object.entries(S.S || {}).map(([name, [a, b]]) => ({ name, a, b: Math.min(b, DUR) }));
  const COLORS = ['#E0703E', '#3FA89B', '#F2B84B', '#B79CFF', '#E8718D', '#6FA8DC', '#9BD17A', '#D9A8A0'];
  const label = (x) => [x.text, x.title, x.label, x.big, x.w, x.en, x.name, x.who].find((v) => typeof v === 'string') || '';
  const streams = Object.entries(S).filter(([k, v]) => !['chords', 'markers'].includes(k) && Array.isArray(v) && v.length > 0 && v.length < 400 && v.every((x) => x && typeof x === 'object' && typeof x.t === 'number'))
    .slice(0, 8).map(([name, arr], i) => ({ name, color: COLORS[i % COLORS.length], items: arr.map((x, j) => ({ t: x.t, text: label(x), j })) }));
  const saved = (() => { try { return JSON.parse(sessionStorage.getItem('pv') || 'null'); } catch (e) { return null; } })();
  let hq = !!(saved && saved.hq);

  const EV_H = Math.max(10, streams.length * 7 + 4);
  const PANEL = 142 + EV_H;
  document.head.insertAdjacentHTML('beforeend', `<style>
    html, body { margin: 0; height: 100%; background: #15151a; color: #e8e6e3; font: 14px system-ui, -apple-system, Helvetica, Arial, sans-serif; overflow: hidden; }
    #c { width: 100vw !important; height: calc(100vh - ${PANEL}px) !important; object-fit: contain; display: block; background: #0c0c10; }
    #pv { position: fixed; left: 0; right: 0; bottom: 0; height: ${PANEL}px; background: #1d1d24; border-top: 1px solid #2c2c36; user-select: none; }
    #pv-bar { display: flex; align-items: center; gap: 14px; height: 42px; padding: 0 14px; }
    #pv button { height: 30px; border: 0; border-radius: 8px; background: #34343f; color: #fff; font-size: 13px; cursor: pointer; padding: 0 10px; }
    #pv-play { width: 34px; background: #E0703E !important; font-size: 15px !important; }
    #pv-time { font-variant-numeric: tabular-nums; font-weight: 700; min-width: 128px; }
    #pv-where { color: #b9b6c4; min-width: 240px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 38vw; }
    #pv-fps { color: #8d8a99; } #pv-status { color: #F2B84B; }
    #pv label { color: #b9b6c4; font-size: 13px; cursor: pointer; }
    #pv-help { margin-left: auto; color: #6f6c7c; font-size: 12px; white-space: nowrap; }
    #pv-tl { display: block; width: 100%; height: ${100 + EV_H}px; cursor: pointer; }
    #pv-big { position: fixed; left: 50%; top: calc(50% - ${PANEL / 2}px); transform: translate(-50%, -50%); padding: 18px 30px; border-radius: 14px; background: rgba(224,112,62,0.95); color: #fff; font-size: 20px; font-weight: 800; cursor: pointer; box-shadow: 0 10px 40px rgba(0,0,0,0.4); }
  </style>`);
  const ui = document.createElement('div');
  ui.id = 'pv';
  ui.innerHTML = `<div id="pv-bar"><button id="pv-play" title="space">▶</button><span id="pv-time"></span><span id="pv-where"></span>
    <label><input type="checkbox" id="pv-hq"> HQ</label><button id="pv-clip" title="render the loop (or this section) as an MP4 with sound">⤓ clip</button>
    <span id="pv-fps"></span><span id="pv-status"></span>
    <span id="pv-help">space · ←/→ beat · shift bar · [ ] marker · L loop · click a tick to jump</span></div><canvas id="pv-tl"></canvas>`;
  document.body.appendChild(ui);
  const big = document.createElement('div');
  big.id = 'pv-big'; big.textContent = saved && saved.playing ? '▶  Resume (reloaded)' : '▶  Play with sound';
  document.body.appendChild(big);
  const $ = (id) => document.getElementById(id);
  const status = (s) => { $('pv-status').textContent = s; };
  $('pv-hq').checked = hq;
  $('pv-hq').addEventListener('change', (e) => { hq = e.target.checked; lastFrame = -1; });

  // ---------- audio clock (WebAudio: sample-accurate, seekable) ----------
  let actx = null, buf = null, src = null, startedAt = 0, offset = 0, playing = false, loop = saved && saved.loop ? saved.loop : null, peaks = null, wallStart = 0;
  const now = () => (playing ? Math.min(DUR, offset + (buf ? actx.currentTime - startedAt : (performance.now() - wallStart) / 1000)) : offset);
  function play() {
    if (playing) return;
    big.style.display = 'none';
    if (offset >= DUR - 0.05) offset = 0;
    if (buf) {
      actx.resume();
      src = actx.createBufferSource(); src.buffer = buf; src.connect(actx.destination);
      src.start(0, offset); startedAt = actx.currentTime;
    } else wallStart = performance.now();
    playing = true; $('pv-play').textContent = '❚❚';
  }
  function pause() {
    if (!playing) return;
    offset = now(); playing = false;
    if (src) { try { src.stop(); } catch (e) { /* already stopped */ } src = null; }
    $('pv-play').textContent = '▶';
  }
  function seek(t) {
    const was = playing;
    pause();
    offset = Math.max(0, Math.min(DUR, t));
    if (was) play();
  }
  async function loadAudio() {
    try {
      const r = await fetch('out/music.wav', { cache: 'no-store' });
      if (!r.ok) throw new Error('no out/music.wav yet (run: node song.js); playing silently');
      actx = new AudioContext();
      buf = await actx.decodeAudioData(await r.arrayBuffer());
      const ch = buf.getChannelData(0), n = 2000, step = Math.max(1, Math.floor(ch.length / n));
      peaks = new Float32Array(n);
      for (let i = 0; i < n; i++) { let m = 0; for (let j = i * step; j < Math.min(ch.length, (i + 1) * step); j += 8) m = Math.max(m, Math.abs(ch[j])); peaks[i] = m; }
    } catch (e) { status(String(e.message || e)); }
  }

  // ---------- where are we ----------
  let hover = null;
  function where(t) {
    if (hover) return `${hover.stream}[${hover.j}] ${hover.text ? `"${hover.text.slice(0, 40)}" ` : ''}@ ${hover.t.toFixed(2)}s`;
    const parts = [];
    if (clock && clock.beatPos) {
      const bpb = Math.round(BAR / BEAT) || 4, p = clock.beatPos(t);
      if (p >= 0) { const bar = Math.floor(p / bpb); parts.push(`bar ${bar}:${(p - bar * bpb).toFixed(1)}`); }
    }
    const sec = sections.find((s) => t >= s.a && t < s.b);
    if (sec) parts.push(sec.name);
    const mk = markers.filter((m) => t >= m.t && t - m.t < 0.4).pop();
    if (mk) parts.push('@' + mk.name);
    if (loop) parts.push(`⟲ ${loop.name}`);
    return parts.join('  ·  ');
  }

  // ---------- timeline: sections, bar lines, waveform, events, markers ----------
  const tl = $('pv-tl');
  const EV_Y = 88; // the event strip sits under the waveform
  function drawTimeline(t) {
    const dpr = window.devicePixelRatio || 1, w = tl.clientWidth, h = tl.clientHeight;
    if (tl.width !== w * dpr || tl.height !== h * dpr) { tl.width = w * dpr; tl.height = h * dpr; }
    const x = tl.getContext('2d');
    x.setTransform(dpr, 0, 0, dpr, 0, 0);
    x.fillStyle = '#16161c'; x.fillRect(0, 0, w, h);
    const X = (s) => (s / DUR) * w;
    sections.forEach((s, i) => {
      x.fillStyle = COLORS[i % COLORS.length] + '55'; x.fillRect(X(s.a), 0, X(s.b) - X(s.a), 20);
      x.fillStyle = '#e8e6e3'; x.font = '600 11px system-ui, sans-serif'; x.save(); x.beginPath(); x.rect(X(s.a), 0, X(s.b) - X(s.a) - 2, 20); x.clip(); x.fillText(s.name, X(s.a) + 5, 14); x.restore();
    });
    if (loop) { x.fillStyle = 'rgba(242,184,75,0.12)'; x.fillRect(X(loop.a), 20, X(loop.b) - X(loop.a), h - 20); }
    if (clock && clock.T) for (let b = 0; clock.T(b) < DUR; b++) { x.fillStyle = b % 4 ? '#26262f' : '#34343f'; x.fillRect(Math.round(X(clock.T(b))), 20, 1, h - 20); }
    if (peaks) {
      x.fillStyle = '#4a4a58';
      const mid = 52, amp = 26;
      for (let i = 0; i < w; i++) { const p = peaks[Math.min(peaks.length - 1, Math.floor((i / w) * peaks.length))]; x.fillRect(i, mid - p * amp, 1, Math.max(1, p * amp * 2)); }
    }
    streams.forEach((st, r) => {
      x.fillStyle = st.color;
      for (const it of st.items) x.fillRect(Math.round(X(it.t)), EV_Y + r * 7, 2, 5);
    });
    if (hover) { x.strokeStyle = '#fff'; x.strokeRect(Math.round(X(hover.t)) - 2, EV_Y + hover.row * 7 - 2, 6, 9); }
    const MY = EV_Y + EV_H + 2;
    x.font = '600 10px system-ui, sans-serif';
    let lastEnd = -1e9, row = 0;
    markers.forEach((m) => {
      const mx = X(m.t), lx = Math.min(w - 40, mx + 3);
      row = lx < lastEnd + 4 ? 1 - row : 0;
      x.fillStyle = m.sync ? '#F2B84B' : '#8d8a99'; x.fillRect(Math.round(mx), 20, 1.5, MY - 20 + 2);
      x.fillText(m.name, lx, MY + 10 + row * 11);
      if (!row) lastEnd = lx + x.measureText(m.name).width;
    });
    x.fillStyle = '#ffffff'; x.fillRect(Math.round(X(t)) - 1, 0, 2, h);
  }
  const eventAt = (e) => {
    const r = tl.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top, row = Math.floor((py - EV_Y + 1) / 7);
    if (row < 0 || row >= streams.length || py < EV_Y - 2) return null;
    let best = null;
    for (const it of streams[row].items) { const d = Math.abs((it.t / DUR) * r.width - px); if (d < 7 && (!best || d < best.d)) best = { ...it, d, row, stream: streams[row].name }; }
    return best;
  };
  const seekFromEvent = (e) => { const r = tl.getBoundingClientRect(); seek(((e.clientX - r.left) / r.width) * DUR); };
  let dragging = false;
  tl.addEventListener('pointerdown', (e) => { const ev = eventAt(e); if (ev) { seek(ev.t); return; } dragging = true; tl.setPointerCapture(e.pointerId); seekFromEvent(e); });
  tl.addEventListener('pointermove', (e) => { if (dragging) seekFromEvent(e); else hover = eventAt(e); });
  tl.addEventListener('pointerleave', () => { hover = null; });
  tl.addEventListener('pointerup', () => { dragging = false; });

  // ---------- controls ----------
  const toggle = () => (playing ? pause() : play());
  $('pv-play').addEventListener('click', toggle);
  big.addEventListener('click', play);
  window.addEventListener('keydown', (e) => {
    const t = now();
    if (e.code === 'Space') { e.preventDefault(); toggle(); }
    else if (e.key === 'ArrowRight') seek(t + (e.shiftKey ? BAR : BEAT));
    else if (e.key === 'ArrowLeft') seek(t - (e.shiftKey ? BAR : BEAT));
    else if (e.key === ']') { const m = markers.find((mk) => mk.t > t + 0.01); if (m) seek(m.t); }
    else if (e.key === '[') { const m = [...markers].reverse().find((mk) => mk.t < t - 0.25); seek(m ? m.t : 0); }
    else if (e.key === 'Home') seek(0);
    else if (e.key === 'l' || e.key === 'L') {
      const s = sections.find((sc) => t >= sc.a && t < sc.b);
      loop = loop || !s ? null : { ...s };
      if (loop && (t < loop.a || t >= loop.b)) seek(loop.a);
    }
  });
  // export the loop (or the current section) as a clip with sound, rendered by the preview server
  $('pv-clip').addEventListener('click', async () => {
    const t = now(), s = loop || sections.find((sc) => t >= sc.a && t < sc.b) || { a: Math.max(0, t - 2), b: Math.min(DUR, t + 3) };
    status(`rendering clip ${s.a.toFixed(2)}–${s.b.toFixed(2)}s…`);
    try {
      const r = await (await fetch('/__clip', { method: 'POST', body: JSON.stringify({ from: s.a, to: s.b }) })).json();
      if (r.ok) { status(''); $('pv-status').innerHTML = `✓ <a style="color:#F2B84B" href="${r.file}" download>${r.file}</a>`; } else status('clip failed: ' + r.error);
    } catch (e) { status('clip needs the preview server (node engine/render.js preview)'); }
  });
  // live reload: the server says when files changed (and re-renders the music when song.js / score.js did)
  try {
    const es = new EventSource('/__events');
    es.addEventListener('status', (e) => status(e.data));
    es.addEventListener('reload', () => { try { sessionStorage.setItem('pv', JSON.stringify({ t: now(), playing, loop, hq })); } catch (e) { /* private mode */ } location.reload(); });
  } catch (e) { /* no server events (opened as a file) */ }

  // ---------- draw loop: the film at the audio clock, quantized to its frame rate ----------
  let lastFrame = -1, fps = 0, lastTick = 0;
  function tick(ts) {
    if (lastTick && playing) { const d = ts - lastTick; fps = fps ? fps * 0.9 + (1000 / d) * 0.1 : 1000 / d; }
    lastTick = ts;
    let t = now();
    if (playing && loop && t >= loop.b) { seek(loop.a); t = now(); }
    if (playing && t >= DUR) { pause(); offset = DUR; t = DUR; }
    const f = Math.min(Math.round(DUR * FPS) - 1, Math.floor(t * FPS));
    if (window.READY && f !== lastFrame) { window.renderAt(f / FPS, 'none', hq ? 1 : 0.5); lastFrame = f; }
    $('pv-time').textContent = `${t.toFixed(2)}s / ${DUR.toFixed(2)}s`;
    $('pv-where').textContent = where(t);
    $('pv-fps').textContent = playing && fps ? `${Math.min(FPS, fps).toFixed(0)} fps${fps < FPS * 0.8 ? ' (the preview skips frames; the render never does)' : ''}` : '';
    drawTimeline(t);
    requestAnimationFrame(tick);
  }

  // start once the film is ready; #t=12.5 in the URL opens at that time (a reload keeps the moment)
  (async () => {
    const h0 = /t=([\d.]+)/.exec(location.hash);
    if (saved && typeof saved.t === 'number') offset = Math.max(0, Math.min(DUR, saved.t));
    else if (h0) offset = Math.max(0, Math.min(DUR, parseFloat(h0[1])));
    try { sessionStorage.removeItem('pv'); } catch (e) { /* private mode */ }
    await loadAudio();
    for (let i = 0; i < 600 && !window.READY; i++) await new Promise((r) => setTimeout(r, 50));
    requestAnimationFrame(tick);
    window.__pv = { play, pause, seek, now, get loop() { return loop; }, streams: streams.map((s) => s.name) };
    window.PREVIEW_READY = { audio: buf ? +buf.duration.toFixed(3) : null, markers: markers.length, sections: sections.length, streams: streams.length, film: !!window.READY };
  })();
})();
