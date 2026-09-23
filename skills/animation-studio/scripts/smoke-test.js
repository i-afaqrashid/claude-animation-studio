#!/usr/bin/env node
// End-to-end smoke test for the engine. Builds a throwaway 4.5s film in a temp folder and checks:
//   1. music + parallel render + mux + check succeed (frames, streams, duration verified)
//   2. an ffmpeg that crashes mid-stream makes the render FAIL cleanly (no hang, no leftover Chrome)
//   3. a second render in the same project folder is refused while the first one still succeeds
// Usage: node <skill>/scripts/smoke-test.js        (takes ~2–4 minutes; needs Node 22+, ffmpeg, Chrome)
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn, spawnSync, execFileSync } = require('child_process');

const SKILL = path.join(__dirname, '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'anim-smoke-'));
const proj = path.join(tmp, 'smoke-film');
const results = [];
const pass = (name, ok, detail = '') => { results.push({ name, ok }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`); };

// Renderer Chrome processes use temp profiles named anim-chrome-*. A LEFTOVER is one whose parent died
// (re-parented to PID 1); Chrome belonging to another live render (e.g. another session) keeps a live parent.
function chromePids() {
  const r = spawnSync('pgrep', ['-f', 'anim-chrome-'], { encoding: 'utf8' });
  const pids = (r.stdout || '').split('\n').filter(Boolean).map(Number);
  return new Set(pids.filter((pid) => {
    const pp = spawnSync('ps', ['-o', 'ppid=', '-p', String(pid)], { encoding: 'utf8' }).stdout.trim();
    return pp === '1';
  }));
}
function run(args, { env = {}, timeout = 600000 } = {}) {
  const t0 = Date.now();
  const r = spawnSync(process.execPath, args, { cwd: proj, env: { ...process.env, ...env }, encoding: 'utf8', timeout });
  return { code: r.status, timedOut: r.error && r.error.code === 'ETIMEDOUT', out: (r.stdout || '') + (r.stderr || ''), secs: (Date.now() - t0) / 1000 };
}
const probe = (file) => JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration:stream=codec_type', '-of', 'json', file]).toString());

(async () => {
  console.log(`smoke test in ${tmp}`);
  const scaffold = spawnSync(process.execPath, [path.join(SKILL, 'scripts', 'new-project.js'), proj], { encoding: 'utf8' });
  pass('scaffold from template', scaffold.status === 0, scaffold.status === 0 ? '' : scaffold.stdout + scaffold.stderr);
  // shorten the film: 4.5s keeps the test quick
  const scorePath = path.join(proj, 'score.js');
  fs.writeFileSync(scorePath, fs.readFileSync(scorePath, 'utf8').replace(/const DURATION = [^;]+;/, 'const DURATION = T(2); // smoke test'));
  const { DURATION, FPS } = require(scorePath);
  const frames = Math.round(DURATION * FPS);

  // 1. happy path
  const song = run(['song.js']);
  pass('song.js writes out/music.wav', song.code === 0 && fs.existsSync(path.join(proj, 'out', 'music.wav')), song.code ? song.out.slice(-300) : '');
  const before = chromePids();
  const vid = run(['engine/render.js', 'video', '2']);
  pass('render video (2 workers)', vid.code === 0 && vid.out.includes(`(${frames} frames verified)`), vid.code ? vid.out.slice(-400) : `${vid.secs.toFixed(0)}s`);
  const mux = run(['engine/render.js', 'mux']);
  const final = path.join(proj, 'out', 'smoke-film.mp4');
  let muxOk = mux.code === 0 && fs.existsSync(final);
  if (muxOk) { const p = probe(final); const types = p.streams.map((x) => x.codec_type); muxOk = types.includes('video') && types.includes('audio') && Math.abs(parseFloat(p.format.duration) - DURATION) < 2 / FPS; }
  pass('mux → final MP4 has video + audio at the right duration', muxOk, mux.code ? mux.out.slice(-300) : '');
  const check = run(['engine/render.js', 'check']);
  pass('check → contact sheet + loudness', check.code === 0 && /I:\s+-?\d/.test(check.out) && fs.existsSync(path.join(proj, 'out', 'check-sheet.png')));
  const leftover1 = [...chromePids()].filter((p) => !before.has(p));
  pass('no Chrome processes left after a successful render', leftover1.length === 0, leftover1.length ? `leftover pids ${leftover1.join(',')}` : '');

  // 2. ffmpeg crashes mid-stream (after ~300 KB of PNG data): must fail fast, not hang
  const fake = path.join(tmp, 'crashing-ffmpeg.sh');
  fs.writeFileSync(fake, '#!/bin/sh\nhead -c 300000 > /dev/null\nexit 3\n', { mode: 0o755 });
  const before2 = chromePids();
  const crash = run(['engine/render.js', 'video', '2'], { env: { FFMPEG_PATH: fake }, timeout: 120000 });
  pass('crashing ffmpeg → render fails (no hang)', !crash.timedOut && crash.code !== 0 && /ffmpeg failed/.test(crash.out), crash.timedOut ? 'TIMED OUT (hang)' : `exit ${crash.code} in ${crash.secs.toFixed(1)}s`);
  await new Promise((r) => setTimeout(r, 1000));
  const leftover2 = [...chromePids()].filter((p) => !before2.has(p));
  pass('no Chrome processes left after a failed render', leftover2.length === 0, leftover2.length ? `leftover pids ${leftover2.join(',')}` : '');
  pass('failed render did not replace the good out/video.mp4', probe(path.join(proj, 'out', 'video.mp4')).streams.length === 1);

  // 3. two renders in the same folder: the second is refused, the first still succeeds
  const first = spawn(process.execPath, ['engine/render.js', 'video', '2'], { cwd: proj });
  let firstOut = '';
  first.stdout.on('data', (d) => (firstOut += d));
  first.stderr.on('data', (d) => (firstOut += d));
  const lock = path.join(proj, 'out', '.render.lock');
  for (let i = 0; i < 100 && !fs.existsSync(lock); i++) await new Promise((r) => setTimeout(r, 100));
  const second = run(['engine/render.js', 'video', '2'], { timeout: 60000 });
  pass('second render in the same folder is refused', second.code !== 0 && /already running in this project folder/.test(second.out), `exit ${second.code}`);
  const firstCode = await new Promise((r) => first.on('close', r));
  pass('first render still completes', firstCode === 0 && firstOut.includes(`(${frames} frames verified)`), firstCode ? firstOut.slice(-300) : '');
  pass('lock file removed afterwards', !fs.existsSync(lock));

  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed${failed ? '' : ' — engine OK'}`);
  if (!failed) fs.rmSync(tmp, { recursive: true, force: true }); else console.log(`(kept ${tmp} for inspection)`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
