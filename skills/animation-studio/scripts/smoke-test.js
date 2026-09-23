#!/usr/bin/env node
// End-to-end smoke test for the engine. Builds a throwaway 7s film in a temp folder and checks:
//   1. music (true peak under -1 dBTP) + parallel render + mux + check succeed (frames, streams, duration verified)
//   2. named markers: bad times fail fast, board + clip (with sound) work, verify passes on the real film
//      and FAILS when a marker is 100 ms off
//   3. an ffmpeg that crashes mid-stream makes the render FAIL cleanly (no hang, no leftover Chrome)
//   4. a second render in the same project folder is refused while the first one still succeeds
//   5. formats: --format 9:16 renders 1080x1920 frames; the app-promo example (UI kit) scores and draws
//   6. preview (headless self-test), cast sheet, clip --gif, an exact LUFS target, the Math.random warning
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
  // shorten the film: 7s keeps the test quick; the @land sync marker (4.5s) sits before the 1.6s fade-out
  const scorePath = path.join(proj, 'score.js');
  fs.writeFileSync(scorePath, fs.readFileSync(scorePath, 'utf8').replace(/const DURATION = [^;]+;/, 'const DURATION = T(2) + 2.5; // smoke test'));
  const { DURATION, FPS } = require(scorePath);
  const frames = Math.round(DURATION * FPS);

  // 1. happy path
  const song = run(['song.js']);
  pass('song.js writes out/music.wav', song.code === 0 && fs.existsSync(path.join(proj, 'out', 'music.wav')), song.code ? song.out.slice(-300) : '');
  const tp = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', path.join(proj, 'out', 'music.wav'), '-af', 'ebur128=peak=true', '-f', 'null', '-'], { encoding: 'utf8' });
  const peak = parseFloat((/Peak:\s+(-?[\d.]+|-inf)/.exec(tp.stderr.slice(tp.stderr.lastIndexOf('Summary:'))) || [])[1]);
  pass('master limiter keeps the true peak under -1 dBTP', peak <= -1.0, `${peak} dBTP`);
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

  // 2. named markers, board, clip, verify
  const badT = run(['engine/render.js', 'stills', '@nope'], { timeout: 30000 });
  pass('an unknown @marker fails fast with a clear message', badT.code !== 0 && /unknown marker @nope/.test(badT.out) && badT.secs < 10, `exit ${badT.code} in ${badT.secs.toFixed(1)}s`);
  const board = run(['engine/render.js', 'board']);
  pass('board → labelled storyboard of the markers', board.code === 0 && fs.existsSync(path.join(proj, 'out', 'board.png')), board.code ? board.out.slice(-300) : '');
  const clip = run(['engine/render.js', 'clip', '@land-0.5', '@land+0.5', '2', '--gif']);
  const clipFile = path.join(proj, 'out', 'clip_4.00-5.00.mp4');
  let clipOk = clip.code === 0 && fs.existsSync(clipFile) && fs.existsSync(clipFile.replace(/\.mp4$/, '.gif'));
  if (clipOk) { const p = probe(clipFile); clipOk = p.streams.some((x) => x.codec_type === 'audio') && Math.abs(parseFloat(p.format.duration) - 1) < 2 / FPS; }
  pass('clip @land-0.5 @land+0.5 --gif → 1s preview with sound + a GIF', clipOk, clip.code ? clip.out.slice(-300) : '');
  const ver = run(['engine/render.js', 'verify']);
  pass('verify: sound and picture hit @land', ver.code === 0 && /land .*✓.*✓/.test(ver.out) && /✓ in sync/.test(ver.out), ver.out.split('\n').filter((l) => /land|sync/.test(l)).join(' | '));
  const goodScore = fs.readFileSync(scorePath, 'utf8');
  fs.writeFileSync(scorePath, goodScore.replace("land: { t: ev.claudeLand, sync: 'av' }", "land: { t: ev.claudeLand + 0.1, sync: 'av' }"));
  const ver2 = run(['engine/render.js', 'verify']);
  fs.writeFileSync(scorePath, goodScore);
  pass('verify FAILS when a marker is 100 ms off', ver2.code === 1 && /✗/.test(ver2.out), `exit ${ver2.code}`);

  // 3. ffmpeg crashes mid-stream (after ~300 KB of PNG data): must fail fast, not hang
  const fake = path.join(tmp, 'crashing-ffmpeg.sh');
  fs.writeFileSync(fake, '#!/bin/sh\nhead -c 300000 > /dev/null\nexit 3\n', { mode: 0o755 });
  const before2 = chromePids();
  const crash = run(['engine/render.js', 'video', '2'], { env: { FFMPEG_PATH: fake }, timeout: 120000 });
  pass('crashing ffmpeg → render fails (no hang)', !crash.timedOut && crash.code !== 0 && /ffmpeg failed/.test(crash.out), crash.timedOut ? 'TIMED OUT (hang)' : `exit ${crash.code} in ${crash.secs.toFixed(1)}s`);
  await new Promise((r) => setTimeout(r, 1000));
  const leftover2 = [...chromePids()].filter((p) => !before2.has(p));
  pass('no Chrome processes left after a failed render', leftover2.length === 0, leftover2.length ? `leftover pids ${leftover2.join(',')}` : '');
  pass('failed render did not replace the good out/video.mp4', probe(path.join(proj, 'out', 'video.mp4')).streams.length === 1);

  // 4. two renders in the same folder: the second is refused, the first still succeeds
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

  // 5. formats + the UI kit example
  const pngSize = (f) => { const b = fs.readFileSync(f); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };
  const vert = path.join(tmp, 'vertical-film');
  const sv = spawnSync(process.execPath, [path.join(SKILL, 'scripts', 'new-project.js'), vert, '--format', '9:16'], { encoding: 'utf8' });
  const st = sv.status === 0 && spawnSync(process.execPath, ['engine/render.js', 'stills', '@land'], { cwd: vert, encoding: 'utf8' });
  const vf = path.join(vert, 'out', 'stills', 't_004.50.png');
  const vsize = fs.existsSync(vf) ? pngSize(vf) : [];
  pass('--format 9:16 → 1080x1920 frames', vsize[0] === 1080 && vsize[1] === 1920 && !/EXCEPTION/.test((st && st.stdout + st.stderr) || ''), vsize.join('x') || (st ? st.stdout + st.stderr : sv.stdout + sv.stderr).slice(-300));
  const promo = path.join(tmp, 'promo-film');
  const sp = spawnSync(process.execPath, [path.join(SKILL, 'scripts', 'new-project.js'), promo, '--from', 'app-promo'], { encoding: 'utf8' });
  const ps = sp.status === 0 && spawnSync(process.execPath, ['song.js'], { cwd: promo, encoding: 'utf8' });
  const pb = ps && ps.status === 0 && spawnSync(process.execPath, ['engine/render.js', 'board'], { cwd: promo, encoding: 'utf8' });
  const pbOut = pb ? pb.stdout + pb.stderr : '';
  pass('app-promo example: music + storyboard of every marker (UI kit, 9:16)', !!pb && pb.status === 0 && /board written: out\/board\.png \(9 frames\)/.test(pbOut) && !/EXCEPTION/.test(pbOut), pbOut.slice(-300) || (ps ? ps.stdout + ps.stderr : sp.stdout + sp.stderr).slice(-300));

  // 6. preview, cast, LUFS target, determinism warning (on the first smoke film)
  const pv = run(['engine/render.js', 'preview', '@land', '--check'], { timeout: 120000 });
  const pvState = /preview OK: (\{.*\})/.exec(pv.out);
  const pvj = pvState ? JSON.parse(pvState[1]) : {};
  pass('preview --check: the player decodes the music and draws the film', pv.code === 0 && pvj.film === true && Math.abs(pvj.audio - DURATION) < 0.05 && fs.existsSync(path.join(proj, 'out', 'preview.png')), pv.code ? pv.out.slice(-300) : JSON.stringify(pvj));
  const cast = run(['engine/render.js', 'cast']);
  pass('cast → audition sheet of the characters', cast.code === 0 && fs.existsSync(path.join(proj, 'out', 'cast.png')), cast.code ? cast.out.slice(-300) : '');
  const loud = run(['song.js'], { env: { LUFS: '-14' } });
  const lm = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', path.join(proj, 'out', 'music.wav'), '-af', 'ebur128', '-f', 'null', '-'], { encoding: 'utf8' });
  const li = parseFloat((/I:\s+(-?[\d.]+) LUFS/.exec(lm.stderr.slice(lm.stderr.lastIndexOf('Summary:'))) || [])[1]);
  pass('LUFS=-14 node song.js lands at -14 LUFS (measured by ffmpeg)', loud.code === 0 && Math.abs(li + 14) <= 0.3, `${li} LUFS`);
  const filmPath = path.join(proj, 'film.js'), goodFilm = fs.readFileSync(filmPath, 'utf8');
  fs.writeFileSync(filmPath, goodFilm.replace('draw(ctx, t) {', 'draw(ctx, t) {\n      const jitter = Math.random();'));
  const lint = run(['engine/render.js', 'stills', '1']);
  fs.writeFileSync(filmPath, goodFilm);
  pass('a film using Math.random() gets a determinism warning', /frames must be a pure function of t/.test(lint.out) && /film\.js:\d+/.test(lint.out), lint.out.slice(0, 200));

  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed${failed ? '' : ' — engine OK'}`);
  if (!failed) fs.rmSync(tmp, { recursive: true, force: true }); else console.log(`(kept ${tmp} for inspection)`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
