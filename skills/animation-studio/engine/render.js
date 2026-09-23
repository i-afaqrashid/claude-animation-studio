// Renderer: drives headless Chrome over the DevTools protocol (zero npm dependencies).
// Run from the film project root (the folder containing index.html + score.js):
//   node engine/render.js stills 1.2 5 @drop     -> out/stills/t_*.png
//   node engine/render.js sheet 0 12 16          -> out/sheet.png (contact sheet of 16 frames in [0,12]s)
//   node engine/render.js board [t …]            -> out/board.png (labelled storyboard: every marker by default)
//   node engine/render.js clip <from> <to>       -> out/clip_<from>-<to>.mp4 (one section WITH sound, for quick previews)
//   node engine/render.js video [workers]        -> out/video.mp4 (silent, parallel Chrome workers)
//   node engine/render.js mux [name]             -> out/<name>.mp4 (video + out/music.wav, shareable H.264/AAC)
//   node engine/render.js check [name]           -> out/check-sheet.png + loudness report of the final file
//   node engine/render.js verify [name]          -> measures sound + picture at every sync marker of the final file
// Anywhere a time is expected: seconds (12.5), bar:beat from the score clock (8:2 = T(8, 2)),
// or a named marker from score.js `markers` with an optional offset in seconds (@drop, @drop-2, @drop+0.5).
const { spawn, execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const http = require('http');

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'out');
const SCORE = require(path.join(ROOT, 'score.js'));
const { FPS, DURATION } = SCORE;
if (!FPS || !DURATION) throw new Error('score.js must export FPS and DURATION');
const UTIL = require('./util');
const [FW, FH] = UTIL.formatSize ? UTIL.formatSize(SCORE.FORMAT) : [1920, 1080]; // frame size (16:9 unless the score says otherwise)
const PORTRAIT = FH > FW;
const thumb = (long) => (PORTRAIT ? `scale=-2:${long}` : `scale=${long}:-2`); // scale thumbnails by the long side
fs.mkdirSync(OUT, { recursive: true });

// ---------- times: seconds | bar:beat | @marker[±sec] ----------
const MARKERS = SCORE.markers || {};
const markerTime = (mk) => (typeof mk === 'number' ? mk : mk.t);
function parseTime(a) {
  const str = String(a).trim();
  let mt = /^@([A-Za-z_]\w*)([+-]\d*\.?\d+)?$/.exec(str);
  if (mt) {
    if (!(mt[1] in MARKERS)) throw new Error(`unknown marker @${mt[1]} (markers in score.js: ${Object.keys(MARKERS).join(', ') || 'none — add a markers object to SCORE'})`);
    return markerTime(MARKERS[mt[1]]) + (mt[2] ? parseFloat(mt[2]) : 0);
  }
  mt = /^(\d+):(\d*\.?\d+)$/.exec(str);
  if (mt) {
    if (typeof SCORE.T !== 'function') throw new Error(`${str}: bar:beat times need score.js to export T`);
    return SCORE.T(parseInt(mt[1], 10), parseFloat(mt[2]));
  }
  const t = Number(str);
  if (str === '' || !Number.isFinite(t)) throw new Error(`not a time: "${a}" (use seconds, bar:beat, or @marker)`);
  return t;
}
// "bar 8:2.5" for a time, from the score clock (if there is one)
function barBeat(t) {
  const c = SCORE.clock;
  if (!c || !c.beatPos) return '';
  const bpb = Math.round(c.BAR / c.BEAT) || 4, p = c.beatPos(t);
  const bar = Math.floor(p / bpb), beat = +(p - bar * bpb).toFixed(2);
  return p < 0 ? '' : `bar ${bar}:${beat}`;
}
const sectionAt = (t) => (SCORE.S ? (Object.entries(SCORE.S).find(([, [a, b]]) => t >= a && t < b) || [''])[0] : '');

function findChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const mac = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium', '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'];
  for (const p of mac) if (fs.existsSync(p)) return p;
  for (const bin of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser']) {
    try { return execFileSync('which', [bin]).toString().trim(); } catch (e) { /* next */ }
  }
  throw new Error('Chrome/Chromium not found. Set CHROME_PATH=/path/to/chrome');
}
const CHROME = findChrome();
const FFMPEG = process.env.FFMPEG_PATH || 'ffmpeg';
const FFPROBE = process.env.FFPROBE_PATH || 'ffprobe';

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.ttf': 'font/ttf', '.otf': 'font/otf', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.json': 'application/json' };
let PAGE = null;
// Serve over HTTP: Chrome refuses @font-face / FontFace loads from file:// URLs.
// Only files INSIDE the project folder are served (checked after resolving symlinks), read-only, localhost only.
const ROOT_REAL = fs.realpathSync(ROOT);
const inside = (p) => p === ROOT_REAL || p.startsWith(ROOT_REAL + path.sep);
function resolveSafe(url) {
  let rel;
  try { rel = decodeURIComponent(url.split('?')[0]); } catch (e) { return null; }
  if (rel.includes('\0')) return null;
  const f = path.resolve(ROOT_REAL, '.' + path.posix.normalize('/' + rel));
  if (!inside(f) || !fs.existsSync(f)) return null;
  const real = fs.realpathSync(f);
  if (!inside(real) || fs.statSync(real).isDirectory()) return null;
  return real;
}
function serve() {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      const f = (req.method === 'GET' || req.method === 'HEAD') ? resolveSafe(req.url) : null;
      if (!f) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      if (req.method === 'HEAD') return res.end();
      fs.createReadStream(f).pipe(res);
    });
    srv.listen(0, '127.0.0.1', () => { PAGE = `http://127.0.0.1:${srv.address().port}/index.html`; resolve(srv); });
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Every Chrome this script launches is tracked and killed on exit or failure — and ONLY those.
// Each Chrome runs in its own process group, so killing the group takes its helper
// processes (renderer, GPU, network) with it — nothing outside that group is ever touched.
const launched = new Set();
function killChrome(p) {
  try { process.kill(-p.pid, 'SIGKILL'); } catch (e) { try { p.kill('SIGKILL'); } catch (e2) { /* already gone */ } }
}
function cleanup() { for (const p of launched) killChrome(p); launched.clear(); }
process.on('exit', cleanup);
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { cleanup(); process.exit(130); });

// Chrome picks its own free debugging port (--remote-debugging-port=0) and writes it to
// <profile>/DevToolsActivePort, so the renderer never assumes any port is free.
async function launch() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'anim-chrome-'));
  const proc = spawn(CHROME, [
    '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${dir}`,
    '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--disable-extensions',
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows',
    '--force-device-scale-factor=1', '--window-size=1920,1080', 'about:blank',
  ], { stdio: 'ignore', detached: true });
  launched.add(proc);
  const portFile = path.join(dir, 'DevToolsActivePort');
  for (let i = 0; i < 200; i++) {
    if (proc.exitCode !== null) break;
    try {
      const port = parseInt(fs.readFileSync(portFile, 'utf8').split('\n')[0], 10);
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      const pg = list.find((x) => x.type === 'page');
      if (pg) return { proc, ws: pg.webSocketDebuggerUrl, dir };
    } catch (e) { /* not up yet */ }
    await sleep(100);
  }
  killChrome(proc);
  launched.delete(proc);
  throw new Error(`chrome did not start (${CHROME})`);
}

function cdp(wsUrl, tag) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    let id = 0;
    const pending = new Map();
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && pending.has(msg.id)) {
        const { res, rej } = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) rej(new Error(JSON.stringify(msg.error))); else res(msg.result);
      } else if (msg.method === 'Runtime.exceptionThrown') {
        const d = msg.params.exceptionDetails;
        console.error(`[${tag}] EXCEPTION`, d.exception ? d.exception.description : d.text);
      } else if (msg.method === 'Log.entryAdded') {
        const e = msg.params.entry;
        if (!/favicon/.test(e.url || '')) console.log(`[${tag}] LOG`, e.level, e.text, e.url || '');
      } else if (msg.method === 'Runtime.consoleAPICalled') {
        console.log(`[${tag}]`, msg.params.args.map((a) => a.value ?? a.description).join(' '));
      }
    };
    ws.onerror = (e) => reject(e);
    ws.onopen = () => resolve({
      send(method, params = {}) { return new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); }); },
      close() { ws.close(); },
    });
  });
}

async function evaluate(c, expr) {
  const r = await c.send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error((r.exceptionDetails.exception && r.exceptionDetails.exception.description) || r.exceptionDetails.text);
  return r.result.value;
}

async function openWorker(tag) {
  const { proc, ws, dir } = await launch();
  try {
    return await attach(proc, ws, dir, tag);
  } catch (e) {
    killChrome(proc);
    launched.delete(proc);
    throw e;
  }
}

async function attach(proc, ws, dir, tag) {
  const c = await cdp(ws, tag);
  await c.send('Runtime.enable');
  await c.send('Page.enable');
  await c.send('Log.enable');
  await c.send('Page.navigate', { url: PAGE + '?v=' + Date.now() });
  for (let i = 0; i < 300; i++) {
    try { if (await evaluate(c, 'window.READY === true')) break; } catch (e) { /* loading */ }
    await sleep(50);
  }
  if (!(await evaluate(c, 'window.READY === true'))) throw new Error('page never set window.READY — check the console errors above');
  return {
    c,
    close() {
      c.close();
      killChrome(proc);
      launched.delete(proc);
      // Chrome may still be flushing its temp profile for a moment after the kill: retry, never crash
      try { fs.rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }); } catch (e) { /* leftover temp dir is harmless */ }
    },
  };
}

async function grab(w, t, fmt = 'png') {
  const url = await evaluate(w.c, `window.renderAt(${t}, '${fmt}')`);
  return Buffer.from(url.slice(url.indexOf(',') + 1), 'base64');
}

// One video/mux render at a time per project folder (others get a clear message, not a collision).
const LOCK = path.join(OUT, '.render.lock');
function acquireLock() {
  try {
    fs.writeFileSync(LOCK, String(process.pid), { flag: 'wx' });
  } catch (e) {
    if (e.code !== 'EEXIST') throw e;
    const pid = parseInt(fs.readFileSync(LOCK, 'utf8'), 10);
    let alive = false;
    try { process.kill(pid, 0); alive = true; } catch (err) { alive = err.code === 'EPERM'; }
    if (alive && pid !== process.pid) throw new Error(`another render (pid ${pid}) is already running in this project folder: wait for it to finish, or render from a separate copy of the project`);
    fs.rmSync(LOCK, { force: true }); // stale lock from a crashed run
    return acquireLock();
  }
  process.on('exit', () => {
    try { if (parseInt(fs.readFileSync(LOCK, 'utf8'), 10) === process.pid) fs.rmSync(LOCK, { force: true }); } catch (e) { /* gone */ }
  });
}

function countFrames(file) {
  const out = execFileSync(FFPROBE, ['-v', 'error', '-select_streams', 'v:0', '-count_packets', '-show_entries', 'stream=nb_read_packets', '-of', 'csv=p=0', file]).toString().trim();
  return parseInt(out, 10);
}
const finalName = (arg) => path.join(OUT, `${arg || path.basename(ROOT)}.mp4`);

// Render frames [f0, f1) with parallel Chrome workers into ONE verified H.264 file.
// Each worker pipes its frames to its own ffmpeg (a segment); segments are joined losslessly.
async function renderRange(f0, f1, workers, dest, { fmt = 'png', crf = 14, preset = 'medium' } = {}) {
  const total = f1 - f0;
  workers = Math.max(1, Math.min(workers, total));
  const per = Math.ceil(total / workers);
  const segDir = path.join(OUT, `.segments-${process.pid}-${f0}`); // private to this run
  fs.mkdirSync(segDir, { recursive: true });
  process.on('exit', () => fs.rmSync(segDir, { recursive: true, force: true }));
  const t0 = Date.now();
  let done = 0;
  await Promise.all(Array.from({ length: workers }, async (_, k) => {
    const a = f0 + k * per, b = Math.min(f1, a + per);
    if (a >= b) return;
    const w = await openWorker('w' + k);
    const seg = path.join(segDir, `seg${String(k).padStart(2, '0')}.mp4`);
    const ff = spawn(FFMPEG, ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', fmt === 'jpeg' ? 'mjpeg' : 'png', '-i', '-',
      '-c:v', 'libx264', '-preset', preset, '-crf', String(crf), '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-g', '60', seg], { stdio: ['pipe', 'inherit', 'inherit'] });
    let ffExit = null;
    const ffDone = new Promise((r) => {
      ff.on('close', (c) => { ffExit = c ?? -1; r(ffExit); });
      ff.on('error', () => { ffExit = -1; r(-1); });
    });
    ff.stdin.on('error', () => { /* ffmpeg died; its exit code is reported below */ });
    for (let f = a; f < b; f++) {
      if (ffExit !== null) break; // ffmpeg is gone: stop feeding it
      const img = await grab(w, f / FPS, fmt);
      // wait for room in the pipe OR for ffmpeg to exit, whichever comes first (never hang)
      if (!ff.stdin.write(img)) await Promise.race([new Promise((r) => ff.stdin.once('drain', r)), ffDone]);
      if (++done % 60 === 0) {
        const el = (Date.now() - t0) / 1000;
        console.log(`${done}/${total} frames  ${(done / el).toFixed(1)} fps  eta ${((total - done) / (done / el)).toFixed(0)}s`);
      }
    }
    if (ffExit === null) ff.stdin.end();
    const code = await ffDone;
    w.close();
    if (code !== 0) throw new Error(`ffmpeg failed while encoding segment ${k} (exit code ${code})`);
  }));
  const list = fs.readdirSync(segDir).filter((f) => f.endsWith('.mp4')).sort().map((f) => `file '${path.join(segDir, f)}'`).join('\n');
  fs.writeFileSync(path.join(segDir, 'list.txt'), list);
  const tmp = path.join(segDir, 'joined.mp4');
  execFileSync(FFMPEG, ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', path.join(segDir, 'list.txt'), '-c', 'copy', tmp]);
  const frames = countFrames(tmp);
  if (frames !== total) throw new Error(`the encoded video has ${frames} frames, expected ${total}: a segment is missing or truncated`);
  fs.renameSync(tmp, dest); // only a verified file ever reaches its destination
  return { frames, secs: (Date.now() - t0) / 1000 };
}

// Storyboard: key frames drawn straight into one labelled sheet inside the page.
const BOARD_JS = `(async (items, cols) => {
  const src = document.getElementById('c');
  const tall = src.height > src.width;
  const tw = tall ? Math.round(640 * src.width / src.height) : 640, th = tall ? 640 : Math.round(640 * src.height / src.width);
  const lh = tall ? 70 : 44, pad = 14;
  const rows = Math.ceil(items.length / cols);
  const b = document.createElement('canvas');
  b.width = cols * tw + (cols + 1) * pad; b.height = rows * (th + lh) + (rows + 1) * pad;
  const x = b.getContext('2d');
  x.fillStyle = '#FFFFFF'; x.fillRect(0, 0, b.width, b.height);
  x.imageSmoothingQuality = 'high';
  items.forEach((it, i) => {
    window.renderAt(it.t, 'none');
    const cx = pad + (i % cols) * (tw + pad), cy = pad + Math.floor(i / cols) * (th + lh + pad);
    x.drawImage(src, cx, cy, tw, th);
    x.fillStyle = '#17171C'; x.font = '700 21px system-ui, -apple-system, Helvetica, Arial, sans-serif';
    x.fillText(it.name, cx + 2, cy + th + 29);
    const nw = it.name ? x.measureText(it.name + '   ').width : 0;
    x.fillStyle = '#6B6B76'; x.font = '500 19px system-ui, -apple-system, Helvetica, Arial, sans-serif';
    if (tall) x.fillText(it.info, cx + 2, cy + th + 57); // narrow tiles: info on its own line
    else x.fillText(it.info, cx + 2 + nw, cy + th + 29);
  });
  return b.toDataURL('image/png');
})`;

// ---------- verify: does the sound AND the picture hit every sync marker? ----------
// Reads the FINAL file (what viewers get): decodes the picture at 96x54 grey and the sound as mono.
// Picture: the frame with the biggest change near the marker (a cut, flash, stamp, pop…) must be the
// first frame at/after the marker (±1 frame). Sound: the steepest level rise must be within ±20 ms.
function verify(file) {
  const VW = PORTRAIT ? 2 * Math.round((48 * FW) / FH) : 96, VH = PORTRAIT ? 96 : 2 * Math.round((48 * FH) / FW), FS = VW * VH, AR = 48000;
  const synced = Object.entries(MARKERS).filter(([, mk]) => typeof mk === 'object' && mk.sync);
  if (!synced.length) {
    console.log('no sync markers in score.js. Add some, e.g.\n  markers: { drop: { t: T(8), sync: \'av\' } }   // av = sound + picture, a = sound only, v = picture only');
    return true;
  }
  const big = { maxBuffer: 1 << 30 };
  const vid = execFileSync(FFMPEG, ['-v', 'error', '-i', file, '-map', '0:v:0', '-vf', `scale=${VW}:${VH}:flags=area,format=gray`, '-f', 'rawvideo', '-pix_fmt', 'gray', '-'], big);
  const nF = Math.floor(vid.length / FS);
  let aud = null;
  const audioSrc = /video\.mp4$/.test(file) ? path.join(OUT, 'music.wav') : file;
  if (fs.existsSync(audioSrc)) {
    const raw = execFileSync(FFMPEG, ['-v', 'error', '-i', audioSrc, '-map', '0:a:0', '-ac', '1', '-ar', String(AR), '-f', 'f32le', '-'], big);
    aud = new Float32Array(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.length - (raw.length % 4)));
  }
  // the share of pixels (in %) that change by more than 20/255 (~8%) from the previous frame:
  // cuts, flashes, stamps and pops score high; fades, drifts and grain change every pixel only a
  // little per frame and score ~0
  const diff = (k) => {
    if (k < 1 || k >= nF) return 0;
    const a = (k - 1) * FS, b = k * FS;
    let n = 0;
    for (let i = 0; i < FS; i++) if (Math.abs(vid[b + i] - vid[a + i]) > 20) n++;
    return (100 * n) / FS;
  };
  function picture(t) {
    const k0 = Math.max(1, Math.floor((t - 0.25) * FPS)), k1 = Math.min(nF - 1, Math.ceil((t + 0.25) * FPS));
    const ds = [];
    for (let k = k0; k <= k1; k++) ds.push([k, diff(k)]);
    const [bk, bd] = ds.reduce((m, d) => (d[1] > m[1] ? d : m), [-1, -1]);
    const sorted = ds.map((d) => d[1]).sort((a, b) => a - b);
    const typical = sorted[Math.floor(sorted.length / 2)];
    return { frame: bk, clear: bd > 1 && bd >= 1.8 * typical + 0.2 };
  }
  function sound(t) {
    const hop = 120, win = 240; // 2.5 ms hops, 5 ms windows
    const s0 = Math.max(0, Math.floor((t - 0.15) * AR) - 4 * hop), s1 = Math.min(aud.length - win, Math.ceil((t + 0.15) * AR));
    const db = [];
    for (let s = s0; s < s1; s += hop) {
      let e = 0;
      for (let i = s; i < s + win; i++) e += aud[i] * aud[i];
      db.push([s, 10 * Math.log10(e / win + 1e-12)]);
    }
    let best = null;
    for (let k = 4; k < db.length; k++) {
      const before = Math.min(db[k - 4][1], db[k - 3][1], db[k - 2][1], db[k - 1][1]);
      const rise = db[k][1] - before;
      if (db[k][1] > -50 && (!best || rise > best.rise)) best = { t: db[k][0] / AR, rise };
    }
    return best && { t: best.t, clear: best.rise >= 6 };
  }
  const tol = 0.02;
  console.log(`verify ${path.relative(ROOT, file)}${aud && audioSrc !== file ? ' + out/music.wav' : ''}   (sound within ±${tol * 1000} ms, picture within ±1 frame)`);
  console.log('marker'.padEnd(14) + 'score'.padEnd(11) + 'sound'.padEnd(22) + 'picture');
  let bad = 0, unclear = 0;
  for (const [name, mk] of synced) {
    const t = mk.t;
    let line = name.padEnd(14) + `${t.toFixed(3)}s`.padEnd(11);
    if (t <= 0.05 || t >= DURATION - 0.05) { console.log(line + 'outside the film, skipped'); continue; }
    if (/a/.test(mk.sync)) {
      const a = aud && sound(t);
      if (!a) { line += '(no audio)'.padEnd(22); unclear++; } else {
        const d = Math.round((a.t - t) * 1000), ok = Math.abs(a.t - t) <= tol;
        const mark = !a.clear ? '?' : ok ? '✓' : '✗';
        if (mark === '✗') bad++; if (mark === '?') unclear++;
        line += `${a.t.toFixed(3)}s ${d >= 0 ? '+' : ''}${d}ms ${mark}`.padEnd(22);
      }
    } else line += '—'.padEnd(22);
    if (/v/.test(mk.sync)) {
      const v = picture(t), want = Math.ceil(t * FPS - 1e-6), df = v.frame - want;
      const mark = !v.clear ? '?' : Math.abs(df) <= 1 ? '✓' : '✗';
      if (mark === '✗') bad++; if (mark === '?') unclear++;
      line += `${(v.frame / FPS).toFixed(3)}s ${df >= 0 ? '+' : ''}${df}f ${mark}`;
    } else line += '—';
    console.log(line);
  }
  console.log(bad ? `✗ ${bad} measurement(s) out of sync: move the late side in score.js (never nudge one side by hand)`
    : `✓ in sync${unclear ? ` (${unclear} unclear: no distinct hit near that marker; make the moment a clear cut/flash/pop and a clear sound, or drop its sync flag)` : ''}`);
  return bad === 0;
}

async function main() {
  const [mode, ...args] = process.argv.slice(2);
  if (mode === 'mux' || mode === 'video') acquireLock();
  if (mode === 'mux' || mode === 'check' || mode === 'verify') {
    let file = finalName(args[0]);
    if (mode === 'verify') {
      if (!fs.existsSync(file) && !args[0]) file = path.join(OUT, 'video.mp4');
      if (!fs.existsSync(file)) throw new Error(`${file} not found: render (and mux) first`);
      if (!verify(file)) process.exitCode = 1;
      return;
    }
    if (mode === 'mux') {
      execFileSync(FFMPEG, ['-v', 'error', '-y', '-i', path.join(OUT, 'video.mp4'), '-i', path.join(OUT, 'music.wav'), '-map', '0:v', '-map', '1:a',
        '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-c:a', 'aac', '-b:a', '256k', '-shortest', file], { stdio: 'inherit' });
      const info = JSON.parse(execFileSync(FFPROBE, ['-v', 'error', '-show_entries', 'format=duration:stream=codec_type', '-of', 'json', file]).toString());
      const types = info.streams.map((x) => x.codec_type);
      const dur = parseFloat(info.format.duration);
      if (!types.includes('video') || !types.includes('audio')) throw new Error(`${file} is missing a stream (has: ${types.join(', ')})`);
      if (Math.abs(dur - DURATION) > 2 / FPS) throw new Error(`${file} lasts ${dur.toFixed(3)}s, expected ${DURATION.toFixed(3)}s`);
      console.log(`wrote ${file} (video + audio, ${dur.toFixed(2)}s verified)`);
    } else {
      const rows = Math.max(1, Math.ceil(DURATION / 2 / 6));
      execFileSync(FFMPEG, ['-v', 'error', '-y', '-i', file, '-vf', `fps=0.5,${thumb(480)},tile=6x${rows}:padding=4:color=white`, '-frames:v', '1', path.join(OUT, 'check-sheet.png')]);
      const r = require('child_process').spawnSync(FFMPEG, ['-hide_banner', '-nostats', '-i', file, '-af', 'ebur128=peak=true', '-f', 'null', '-'], { encoding: 'utf8' });
      const sum = r.stderr.slice(r.stderr.lastIndexOf('Summary:'));
      console.log('contact sheet (every 2s): out/check-sheet.png');
      console.log(sum.split('\n').filter((l) => /I:|LRA:|Peak:/.test(l)).map((l) => l.trim()).join('\n'));
    }
    return;
  }
  if (!['stills', 'sheet', 'board', 'clip', 'video'].includes(mode)) {
    console.log('usage: node engine/render.js stills|sheet|board|clip|video|mux|check|verify ...');
    return;
  }
  const times = mode === 'stills' || mode === 'board' ? args.map(parseTime) : null; // fail on a bad time BEFORE launching Chrome
  await serve();
  if (mode === 'stills') {
    const w = await openWorker('w0');
    fs.mkdirSync(path.join(OUT, 'stills'), { recursive: true });
    for (const t of times) {
      const t0 = Date.now();
      fs.writeFileSync(path.join(OUT, 'stills', `t_${t.toFixed(2).padStart(6, '0')}.png`), await grab(w, t));
      console.log('still', t.toFixed(3), Date.now() - t0 + 'ms');
    }
    w.close();
  } else if (mode === 'sheet') {
    const a = args[0] !== undefined ? parseTime(args[0]) : 0, b = args[1] !== undefined ? parseTime(args[1]) : DURATION;
    const n = parseInt(args[2] || '16', 10), cols = parseInt(args[3] || '4', 10);
    const w = await openWorker('w0');
    const dir = path.join(OUT, `.sheet-${process.pid}`);
    fs.mkdirSync(dir, { recursive: true });
    process.on('exit', () => fs.rmSync(dir, { recursive: true, force: true }));
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? a : a + ((b - a) * i) / (n - 1);
      fs.writeFileSync(path.join(dir, `f${String(i).padStart(3, '0')}.png`), await grab(w, t));
    }
    w.close();
    execFileSync(FFMPEG, ['-v', 'error', '-y', '-i', path.join(dir, 'f%03d.png'), '-vf', `${thumb(640)},tile=${cols}x${Math.ceil(n / cols)}:padding=6:color=white`, '-frames:v', '1', path.join(OUT, 'sheet.png')]);
    console.log('sheet written: out/sheet.png');
  } else if (mode === 'board') {
    // default: every marker; else the middle of every section; else 12 frames across the film
    let items = times.map((t, i) => ({ t, name: args[i].startsWith('@') ? args[i] : '' }));
    if (!items.length) items = Object.entries(MARKERS).map(([k, mk]) => ({ t: markerTime(mk), name: '@' + k }));
    if (!items.length && SCORE.S) items = Object.entries(SCORE.S).map(([k, [a, b]]) => ({ t: (a + Math.min(b, DURATION)) / 2, name: k }));
    if (!items.length) items = Array.from({ length: 12 }, (_, i) => ({ t: (DURATION * (i + 0.5)) / 12, name: '' }));
    items = items.filter((it) => it.t >= 0 && it.t < DURATION).sort((p, q) => p.t - q.t);
    // a marker is drawn one frame AFTER its time, so hits (stamps, pops, cuts) are visible
    items = items.map((it) => {
      const t = it.name.startsWith('@') ? Math.min(DURATION - 1 / FPS, it.t + 1 / FPS) : it.t;
      return { t, name: it.name, info: [`${it.t.toFixed(2)}s`, barBeat(it.t), sectionAt(it.t)].filter(Boolean).join(' · ') };
    });
    const w = await openWorker('w0');
    const cols = PORTRAIT ? (items.length > 8 ? 6 : 4) : items.length > 9 ? 4 : 3;
    const url = await evaluate(w.c, `${BOARD_JS}(${JSON.stringify(items)}, ${cols})`);
    w.close();
    fs.writeFileSync(path.join(OUT, 'board.png'), Buffer.from(url.slice(url.indexOf(',') + 1), 'base64'));
    console.log(`board written: out/board.png (${items.length} frames)`);
  } else if (mode === 'clip') {
    // a section with sound: fast JPEG frames + the matching slice of out/music.wav
    if (args.length < 2) throw new Error('usage: node engine/render.js clip <from> <to> [workers]   e.g. clip @drop-2 @drop+3');
    const a = Math.max(0, parseTime(args[0])), b = Math.min(DURATION, parseTime(args[1]));
    if (!(b > a)) throw new Error(`clip range is empty: ${a.toFixed(2)}s → ${b.toFixed(2)}s`);
    const f0 = Math.ceil(a * FPS - 1e-6), f1 = Math.ceil(b * FPS - 1e-6);
    const workers = parseInt(args[2] || String(Math.max(2, os.cpus().length - 1)), 10);
    const name = `clip_${(f0 / FPS).toFixed(2)}-${(f1 / FPS).toFixed(2)}.mp4`;
    const silent = path.join(OUT, `.clip-${process.pid}.mp4`);
    process.on('exit', () => fs.rmSync(silent, { force: true }));
    const { frames, secs } = await renderRange(f0, f1, workers, silent, { fmt: 'jpeg', crf: 20, preset: 'veryfast' });
    const wav = path.join(OUT, 'music.wav');
    const dest = path.join(OUT, name);
    if (fs.existsSync(wav)) {
      execFileSync(FFMPEG, ['-v', 'error', '-y', '-i', silent, '-ss', String(f0 / FPS), '-t', String(frames / FPS), '-i', wav,
        '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', dest]);
    } else {
      fs.renameSync(silent, dest);
      console.log('(no out/music.wav yet: run node song.js for sound)');
    }
    console.log(`out/${name} done in ${secs.toFixed(1)}s (${frames} frames${fs.existsSync(wav) ? ', with sound' : ''})`);
  } else if (mode === 'video') {
    const workers = parseInt(args[0] || String(Math.max(2, os.cpus().length - 1)), 10);
    const { frames, secs } = await renderRange(0, Math.round(DURATION * FPS), workers, path.join(OUT, 'video.mp4'));
    console.log(`out/video.mp4 done in ${secs.toFixed(1)}s (${frames} frames verified)`);
  }
}
main().then(() => process.stdout.write('', () => process.exit(process.exitCode || 0))).catch((e) => { console.error(e); process.exit(1); });
