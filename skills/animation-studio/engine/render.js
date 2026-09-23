// Renderer: drives headless Chrome over the DevTools protocol (zero npm dependencies).
// Run from the film project root (the folder containing index.html + score.js):
//   node engine/render.js stills 1.2 5 9.75     -> out/stills/t_*.png
//   node engine/render.js sheet 0 12 16          -> out/sheet.png (contact sheet of 16 frames in [0,12]s)
//   node engine/render.js video [workers]        -> out/video.mp4 (silent, parallel Chrome workers)
//   node engine/render.js mux [name]             -> out/<name>.mp4 (video + out/music.wav, shareable H.264/AAC)
//   node engine/render.js check [name]           -> out/check-sheet.png + loudness report of the final file
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
fs.mkdirSync(OUT, { recursive: true });

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

async function grab(w, t) {
  const url = await evaluate(w.c, `window.renderAt(${t}, 'png')`);
  return Buffer.from(url.slice(url.indexOf(',') + 1), 'base64');
}

function countFrames(file) {
  const out = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-count_packets', '-show_entries', 'stream=nb_read_packets', '-of', 'csv=p=0', file]).toString().trim();
  return parseInt(out, 10);
}
const finalName = (arg) => path.join(OUT, `${arg || path.basename(ROOT)}.mp4`);

async function main() {
  const [mode, ...args] = process.argv.slice(2);
  if (mode === 'mux' || mode === 'check') {
    const file = finalName(args[0]);
    if (mode === 'mux') {
      execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', path.join(OUT, 'video.mp4'), '-i', path.join(OUT, 'music.wav'), '-map', '0:v', '-map', '1:a',
        '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-c:a', 'aac', '-b:a', '256k', '-shortest', file], { stdio: 'inherit' });
      const info = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration:stream=codec_type', '-of', 'json', file]).toString());
      const types = info.streams.map((x) => x.codec_type);
      const dur = parseFloat(info.format.duration);
      if (!types.includes('video') || !types.includes('audio')) throw new Error(`${file} is missing a stream (has: ${types.join(', ')})`);
      if (Math.abs(dur - DURATION) > 2 / FPS) throw new Error(`${file} lasts ${dur.toFixed(3)}s, expected ${DURATION.toFixed(3)}s`);
      console.log(`wrote ${file} (video + audio, ${dur.toFixed(2)}s verified)`);
    } else {
      const rows = Math.max(1, Math.ceil(DURATION / 2 / 6));
      execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', file, '-vf', `fps=0.5,scale=480:-1,tile=6x${rows}:padding=4:color=white`, '-frames:v', '1', path.join(OUT, 'check-sheet.png')]);
      const r = require('child_process').spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-af', 'ebur128=peak=true', '-f', 'null', '-'], { encoding: 'utf8' });
      const sum = r.stderr.slice(r.stderr.lastIndexOf('Summary:'));
      console.log('contact sheet (every 2s): out/check-sheet.png');
      console.log(sum.split('\n').filter((l) => /I:|LRA:|Peak:/.test(l)).map((l) => l.trim()).join('\n'));
    }
    return;
  }
  await serve();
  if (mode === 'stills') {
    const w = await openWorker('w0');
    fs.mkdirSync(path.join(OUT, 'stills'), { recursive: true });
    for (const a of args) {
      const t = parseFloat(a);
      const t0 = Date.now();
      fs.writeFileSync(path.join(OUT, 'stills', `t_${t.toFixed(2).padStart(6, '0')}.png`), await grab(w, t));
      console.log('still', t, Date.now() - t0 + 'ms');
    }
    w.close();
  } else if (mode === 'sheet') {
    const [a = 0, b = DURATION, n = 16, cols = 4] = args.map(parseFloat);
    const w = await openWorker('w0');
    const dir = path.join(OUT, 'sheet');
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? a : a + ((b - a) * i) / (n - 1);
      fs.writeFileSync(path.join(dir, `f${String(i).padStart(3, '0')}.png`), await grab(w, t));
    }
    w.close();
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', path.join(dir, 'f%03d.png'), '-vf', `scale=640:-1,tile=${cols}x${Math.ceil(n / cols)}:padding=6:color=white`, '-frames:v', '1', path.join(OUT, 'sheet.png')]);
    console.log('sheet written: out/sheet.png');
  } else if (mode === 'video') {
    const workers = parseInt(args[0] || String(Math.max(2, os.cpus().length - 1)), 10);
    const total = Math.round(DURATION * FPS);
    const per = Math.ceil(total / workers);
    const segDir = path.join(OUT, 'segments');
    fs.rmSync(segDir, { recursive: true, force: true });
    fs.mkdirSync(segDir, { recursive: true });
    const t0 = Date.now();
    let done = 0;
    await Promise.all(Array.from({ length: workers }, async (_, k) => {
      const f0 = k * per, f1 = Math.min(total, f0 + per);
      if (f0 >= f1) return;
      const w = await openWorker('w' + k);
      const seg = path.join(segDir, `seg${String(k).padStart(2, '0')}.mp4`);
      const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
        '-c:v', 'libx264', '-preset', 'medium', '-crf', '14', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-g', '60', seg], { stdio: ['pipe', 'inherit', 'inherit'] });
      const ffDone = new Promise((r) => { ff.on('close', (c) => r(c)); ff.on('error', () => r(-1)); });
      ff.stdin.on('error', () => { /* ffmpeg died; its exit code is reported below */ });
      for (let f = f0; f < f1; f++) {
        const png = await grab(w, f / FPS);
        if (!ff.stdin.write(png)) await new Promise((r) => ff.stdin.once('drain', r));
        if (++done % 60 === 0) {
          const el = (Date.now() - t0) / 1000;
          console.log(`${done}/${total} frames  ${(done / el).toFixed(1)} fps  eta ${((total - done) / (done / el)).toFixed(0)}s`);
        }
      }
      ff.stdin.end();
      const code = await ffDone;
      w.close();
      if (code !== 0) throw new Error(`ffmpeg failed while encoding segment ${k} (exit code ${code})`);
    }));
    const list = fs.readdirSync(segDir).filter((f) => f.endsWith('.mp4')).sort().map((f) => `file '${path.join(segDir, f)}'`).join('\n');
    fs.writeFileSync(path.join(segDir, 'list.txt'), list);
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', path.join(segDir, 'list.txt'), '-c', 'copy', path.join(OUT, 'video.mp4')]);
    const frames = countFrames(path.join(OUT, 'video.mp4'));
    if (frames !== total) throw new Error(`out/video.mp4 has ${frames} frames, expected ${total}: a segment is missing or truncated`);
    console.log(`out/video.mp4 done in ${((Date.now() - t0) / 1000).toFixed(1)}s (${frames} frames verified)`);
  } else {
    console.log('usage: node engine/render.js stills|sheet|video|mux|check ...');
  }
}
main().then(() => process.stdout.write('', () => process.exit(0))).catch((e) => { console.error(e); process.exit(1); });
